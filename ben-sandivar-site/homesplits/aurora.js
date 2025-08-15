(() => {
  const root = document.getElementById('music');
  if (!root) return;

  const canvas = root.querySelector('#aurora');
  const layer = root.querySelector('.aurora-layer');
  const audio = root.querySelector('audio');
  if (!canvas || !layer || !audio) return;

  /** @type {CanvasRenderingContext2D} */
  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });

  // Offscreen buffer for blur and masking
  const bufferCanvas = document.createElement('canvas');
  /** @type {CanvasRenderingContext2D} */
  const bctx = bufferCanvas.getContext('2d', { alpha: true, desynchronized: true });

  // ---------------- Core state ----------------
  let acx, src, analyser, compressor;
  let raf = 0;
  let running = false;
  let hidden = false;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Reused buffers
  let td, fd;
  const spectrumBands = new Float32Array(50); // 50-band output
  const smoothBands = new Float32Array(50); // Smoothed values

  // Hi-DPI
  let dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));

  // Phase / timing
  const PHASE_MS = 45000; // 45s for gradient transition
  const LOOP_S = 600; // 10min loop for hue variation

  let startT = performance.now();
  let phaseT = performance.now();
  let mix = 0;

  let gradPrev = makePhase();
  let gradNext = makePhase();

  // Smooth lerp
  const lerp = (a, b, t) => a + (b - a) * t;

  // Resize handling
  const ro = new ResizeObserver(sizeCanvas);
  ro.observe(layer);

  window.addEventListener('resize', () => {
    const next = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    if (next !== dpr) { dpr = next; sizeCanvas(); }
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    hidden = document.hidden;
    if (hidden) stopDraw(); else maybeStart();
  }, { passive: true });

  audio.addEventListener('play', onPlay, { passive: true });
  audio.addEventListener('pause', onPause, { passive: true });
  audio.addEventListener('ended', onPause, { passive: true });

  if (reduced) return;

  sizeCanvas();

  // --------------- Audio graph ----------------
  function ensureGraph() {
    if (acx) return;
    acx = new (window.AudioContext || window.webkitAudioContext)();

    src = acx.createMediaElementSource(audio);
    analyser = acx.createAnalyser();
    compressor = acx.createDynamicsCompressor();

    analyser.fftSize = 2048; // Increased for better frequency resolution
    analyser.smoothingTimeConstant = 0.7;

    src.connect(analyser);
    analyser.connect(compressor);
    compressor.connect(acx.destination);

    td = new Uint8Array(analyser.fftSize);
    fd = new Uint8Array(analyser.frequencyBinCount);
  }

  // --------------- Geometry ----------------
  function sizeCanvas() {
    const r = layer.getBoundingClientRect();
    const w = Math.max(1, r.width | 0);
    const h = Math.max(1, r.height | 0);

    canvas.width = (w * dpr) | 0;
    canvas.height = (h * dpr) | 0;
    bufferCanvas.width = (w * dpr) | 0;
    bufferCanvas.height = (h * dpr) | 0;

    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // --------------- Phases / Colors ----------------
  function makePhase() {
    return {
      seed: Math.random() * 360,
      n: pickCount(),
      ang: (Math.random() * 6 - 3) * Math.PI / 180,
      offset: Math.random() * 1000
    };
  }

  function pickCount() {
    const r = Math.random();
    if (r < 0.7) return 4;
    if (r < 0.9) return 3;
    if (r < 0.97) return 5;
    return Math.random() < 0.5 ? 6 : 7;
  }

  function loopT() {
    const dt = (performance.now() - startT) / 1000;
    return (dt % LOOP_S) / LOOP_S;
  }

  function buildGradient(phase, tGlobal, w, h, intensity) {
    const drift = Math.sin(tGlobal * 2 * Math.PI / 1800) * (10 * Math.PI / 180);
    const ang = phase.ang + drift;

    const r = Math.hypot(w, h);
    const cx = w / 2, cy = h * 0.65;
    const x0 = cx - Math.cos(ang) * r / 2;
    const y0 = cy - Math.sin(ang) * r / 2;
    const x1 = cx + Math.cos(ang) * r / 2;
    const y1 = cy + Math.sin(ang) * r / 2;

    const g = bctx.createLinearGradient(x0, y0, x1, y1);
    const n = phase.n;

    for (let i = 0; i < n; i++) {
      const f = i / (n - 1 || 1);
      const hue = (phase.seed + i * (360 / n) +
                   36 * Math.sin(2 * Math.PI * (tGlobal / LOOP_S + phase.offset + i * 0.09))) % 360;
      // Modulate alpha with intensity (0–1)
      g.addColorStop(f, `hsla(${hue}, 92%, 55%, ${0.7 + 0.3 * intensity})`);
      if (i < n - 1) {
        const mid = f + (1 / (n - 1)) * 0.5;
        const hue2 = (hue + 24) % 360;
        g.addColorStop(mid, `hsla(${hue2}, 92%, 55%, ${0.7 + 0.3 * intensity})`);
      }
    }
    return g;
  }

  // --------------- Audio Analysis ----------------
  function computeSpectrumBands() {
    const nyq = acx.sampleRate / 2;
    const idx = hz => Math.min(fd.length - 1, Math.max(0, Math.round(fd.length * (hz / nyq))));

    // Define frequency ranges
    const bands = [];
    // Lows: 5 bands, 20–140 Hz (logarithmic spacing)
    const lowStart = Math.log10(20), lowEnd = Math.log10(140);
    for (let i = 0; i < 5; i++) {
      const f = Math.pow(10, lowStart + (i / 4) * (lowEnd - lowStart));
      const fNext = Math.pow(10, lowStart + ((i + 1) / 4) * (lowEnd - lowStart));
      bands.push({ lo: idx(f), hi: idx(fNext), scale: 0.6 }); // Undersensitive
    }
    // Mids: 15 bands, 300–2000 Hz
    const midStart = Math.log10(300), midEnd = Math.log10(2000);
    for (let i = 0; i < 15; i++) {
      const f = Math.pow(10, midStart + (i / 14) * (midEnd - midStart));
      const fNext = Math.pow(10, midStart + ((i + 1) / 14) * (midEnd - midStart));
      bands.push({ lo: idx(f), hi: idx(fNext), scale: 1.0 }); // Neutral
    }
    // Highs: 30 bands, 4000–12000 Hz
    const highStart = Math.log10(4000), highEnd = Math.log10(12000);
    for (let i = 0; i < 30; i++) {
      const f = Math.pow(10, highStart + (i / 29) * (highEnd - highStart));
      const fNext = Math.pow(10, highStart + ((i + 1) / 29) * (highEnd - highStart));
      bands.push({ lo: idx(f), hi: idx(fNext), scale: 1.8 }); // Hypersensitive
    }

    // Compute band energies
    for (let i = 0; i < 50; i++) {
      let sum = 0, count = 0;
      for (let j = bands[i].lo; j <= bands[i].hi; j++) {
        sum += fd[j];
        count++;
      }
      const avg = count ? (sum / count) / 255 : 0;
      spectrumBands[i] = lerp(smoothBands[i], avg * bands[i].scale, 0.25);
      smoothBands[i] = spectrumBands[i]; // Update smoothed value
    }
  }

  // --------------- Draw ----------------
  function draw() {
    if (!running) return;
    raf = requestAnimationFrame(draw);

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    // Update phase mix
    const now = performance.now();
    mix = (now - phaseT) / PHASE_MS;
    if (mix >= 1) {
      mix = 0;
      gradPrev = gradNext;
      gradNext = makePhase();
      phaseT = now;
    }

    // Audio data
    analyser.getByteTimeDomainData(td);
    analyser.getByteFrequencyData(fd);
    computeSpectrumBands(); // Update spectrumBands

    // RMS for overall energy
    let sum = 0;
    for (let i = 0; i < td.length; i++) {
      const v = (td[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / td.length);

    // Aggregate band energy for modulation
    let bassEnergy = 0, midEnergy = 0, highEnergy = 0;
    for (let i = 0; i < 5; i++) bassEnergy += spectrumBands[i];
    for (let i = 5; i < 20; i++) midEnergy += spectrumBands[i];
    for (let i = 20; i < 50; i++) highEnergy += spectrumBands[i];
    bassEnergy /= 5;
    midEnergy /= 15;
    highEnergy /= 30;
    const totalEnergy = 0.55 * bassEnergy + 0.35 * midEnergy + 0.10 * highEnergy;

    // Precompute
    const tL = loopT();
    const kx = 2 * Math.PI / Math.max(360, w);
    const ph = tL * 2 * Math.PI * 0.8;

    const baseAmp = h * (0.22 + 0.55 * Math.min(1, rms * 1.8));
    const maxRise = h * 0.50;

    // Column modulation with band influence
    const cols = 7;
    const colMod = (x) => {
      let v = 0;
      for (let c = 1; c <= cols; c++) {
        v += Math.sin((c * 0.28) * kx * x + ph * c * 0.33) / c;
      }
      // Modulate with high frequencies for flicker
      const bandIdx = Math.min(49, Math.floor((x / w) * 30) + 20); // Use high bands
      v *= (0.8 + 0.4 * spectrumBands[bandIdx]);
      return (v / cols) * 0.6 + 0.8;
    };

    // Build wave path
    const steps = 150;
    const path = new Path2D();
    path.moveTo(0, h);

    let topY = h;
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * w;
      const bandIdx = Math.min(49, Math.floor((x / w) * 50)); // Map x to band
      const bandValue = spectrumBands[bandIdx];

      const yWave =
        Math.sin(kx * x + ph) * (0.55 + 0.30 * midEnergy) +
        Math.sin(kx * 1.8 * x + ph * 1.15) * (0.30 + 0.30 * highEnergy) +
        Math.sin(kx * 3.4 * x + ph * 0.9) * (0.22 + 0.20 * bandValue);

      let rise = (baseAmp * (0.5 + 0.5 * yWave) * (0.70 + 0.50 * totalEnergy)) * colMod(x);
      rise = Math.min(rise, maxRise);
      const y = h - (h * 0.10 + rise);
      topY = Math.min(topY, y);
      path.lineTo(x, y);
    }
    path.lineTo(w, h);
    path.closePath();

    // Draw gradients on buffer
    bctx.clearRect(0, 0, w, h);
    // Modulate gradient intensity with total energy
    const intensity = Math.min(1, 0.5 + 0.5 * totalEnergy);
    const gPrev = buildGradient(gradPrev, now / 1000, w, h, intensity);
    const gNext = buildGradient(gradNext, now / 1000, w, h, intensity);

    const easeMix = 0.5 - 0.5 * Math.cos(Math.PI * mix);

    bctx.globalAlpha = 1 - easeMix;
    bctx.fillStyle = gPrev;
    bctx.fillRect(0, 0, w, h);

    bctx.globalAlpha = easeMix;
    bctx.fillStyle = gNext;
    bctx.fillRect(0, 0, w, h);

    bctx.globalAlpha = 1;

    // Apply wave shape mask
    bctx.globalCompositeOperation = 'destination-in';
    bctx.fill(path);

    bctx.globalCompositeOperation = 'source-over';

    // Final blur pass, modulated by high frequencies
    ctx.clearRect(0, 0, w, h);
    const blurRadius = 8 + 8 * highEnergy; // Dynamic blur
    ctx.filter = `blur(${blurRadius}px)`;
    ctx.drawImage(
      bufferCanvas,
      0, 0, bufferCanvas.width, bufferCanvas.height,
      0, 0, w, h
    );
    ctx.filter = 'none';
  }

  // --------------- Control ----------------
  function onPlay() {
    ensureGraph();
    if (acx.state === 'suspended') acx.resume().catch(() => {});
    maybeStart();
  }

  function onPause() {
    stopDraw();
    if (acx && acx.state === 'running') acx.suspend().catch(() => {});
  }

  function maybeStart() {
    if (running || hidden || reduced) return;
    running = true;
    startT = performance.now();
    raf = requestAnimationFrame(draw);
  }

  function stopDraw() {
    running = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  // --------------- Cleanup ----------------
  window.addEventListener('beforeunload', () => {
    stopDraw();
    ro.disconnect();
    try { src && src.disconnect(); } catch {}
    try { analyser && analyser.disconnect(); } catch {}
    try { compressor && compressor.disconnect(); } catch {}
    try { acx && acx.close(); } catch {}
  }, { passive: true });
})();