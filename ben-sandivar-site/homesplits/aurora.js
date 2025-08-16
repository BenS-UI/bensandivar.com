(() => {
  const root = document.getElementById('music');
  if (!root) return;

  const canvas = root.querySelector('#aurora');
  const layer  = root.querySelector('.aurora-layer');
  const audio  = root.querySelector('audio');
  if (!canvas || !layer || !audio) return;

  /** @type {CanvasRenderingContext2D} */
  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });

  // Offscreen buffer for blur + masking
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
  const smoothBands   = new Float32Array(50); // temporal smoothing

  // Hi-DPI
  let dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));

  // Phase / timing for color only (shape is data-driven)
  const PHASE_MS = 45000;
  const LOOP_S   = 600;

  let startT = performance.now();
  let phaseT = performance.now();
  let mix = 0;

  let gradPrev = makePhase();
  let gradNext = makePhase();

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp01 = v => Math.min(1, Math.max(0, v));

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

  audio.addEventListener('play',  onPlay,  { passive: true });
  audio.addEventListener('pause', onPause, { passive: true });
  audio.addEventListener('ended', onPause, { passive: true });

  if (reduced) return;
  sizeCanvas();

  // --------------- Audio graph ----------------
  function ensureGraph() {
    if (acx) return;
    acx = new (window.AudioContext || window.webkitAudioContext)();

    src        = acx.createMediaElementSource(audio);
    analyser   = acx.createAnalyser();
    compressor = acx.createDynamicsCompressor();

    analyser.fftSize = 2048;           // good freq resolution
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
    const w = Math.max(1, r.width  | 0);
    const h = Math.max(1, r.height | 0);

    canvas.width        = (w * dpr) | 0;
    canvas.height       = (h * dpr) | 0;
    bufferCanvas.width  = (w * dpr) | 0;
    bufferCanvas.height = (h * dpr) | 0;

    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // --------------- Phases / Colors (background only) ----------------
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
      const hue =
        (phase.seed + i * (360 / n) +
         36 * Math.sin(2 * Math.PI * (tGlobal / LOOP_S + phase.offset + i * 0.09))) % 360;

      g.addColorStop(f,  `hsla(${hue}, 92%, 55%, ${0.7 + 0.3 * intensity})`);
      if (i < n - 1) {
        const mid = f + (1 / (n - 1)) * 0.5;
        const hue2 = (hue + 24) % 360;
        g.addColorStop(mid, `hsla(${hue2}, 92%, 55%, ${0.7 + 0.3 * intensity})`);
      }
    }
    return g;
  }

  // --------------- Audio Analysis: 50 bands ----------------
  function computeSpectrumBands() {
    const nyq = acx.sampleRate / 2;
    const idx = hz => Math.min(fd.length - 1, Math.max(0, Math.round(fd.length * (hz / nyq))));

    const bands = [];
    // Lows: 5 bands, 20–140 Hz (log)
    const lowStart = Math.log10(20), lowEnd = Math.log10(140);
    for (let i = 0; i < 5; i++) {
      const f  = Math.pow(10, lowStart + (i / 4) * (lowEnd - lowStart));
      const fN = Math.pow(10, lowStart + ((i + 1) / 4) * (lowEnd - lowStart));
      bands.push({ lo: idx(f), hi: idx(fN), scale: 0.7 }); // slightly undersensitive
    }
    // Mids: 15 bands, 300–2000 Hz (log)
    const midStart = Math.log10(300), midEnd = Math.log10(2000);
    for (let i = 0; i < 15; i++) {
      const f  = Math.pow(10, midStart + (i / 14) * (midEnd - midStart));
      const fN = Math.pow(10, midStart + ((i + 1) / 14) * (midEnd - midStart));
      bands.push({ lo: idx(f), hi: idx(fN), scale: 1.35 }); // boosted mids
    }
    // Highs: 30 bands, 4000–12000 Hz (log)
    const highStart = Math.log10(4000), highEnd = Math.log10(12000);
    for (let i = 0; i < 30; i++) {
      const f  = Math.pow(10, highStart + (i / 29) * (highEnd - highStart));
      const fN = Math.pow(10, highStart + ((i + 1) / 29) * (highEnd - highStart));
      bands.push({ lo: idx(f), hi: idx(fN), scale: 2.0 }); // super-boosted highs
    }

    // Compute band energies with temporal smoothing
    for (let i = 0; i < 50; i++) {
      const { lo, hi, scale } = bands[i];
      let sum = 0, count = 0;
      for (let j = lo; j <= hi; j++) { sum += fd[j]; count++; }
      const avg = count ? (sum / count) / 255 : 0;      // normalize 0..1
      const val = clamp01(avg * scale);
      spectrumBands[i] = lerp(smoothBands[i], val, 0.25); // temporal damping
      smoothBands[i]   = spectrumBands[i];
    }
  }

  // Interpolated band value at horizontal x (smooth across bands)
  function bandValueAt(x, w) {
    const n = spectrumBands.length;
    const scaled = clamp01(x / Math.max(1, w)) * (n - 1);
    const i0 = Math.floor(scaled);
    const i1 = Math.min(n - 1, i0 + 1);
    const t  = scaled - i0;

    // Per-band visual gain (matches analysis emphasis)
    const gain = (i) => {
      if (i < 5) return 1.0;       // lows
      if (i < 20) return 1.3;      // mids boosted
      return 1.9;                  // highs super boosted
    };

    const v0 = spectrumBands[i0] * gain(i0);
    const v1 = spectrumBands[i1] * gain(i1);

    // Linear interp between adjacent bands
    return clamp01(v0 * (1 - t) + v1 * t);
  }

  // --------------- Draw ----------------
  function draw() {
    if (!running) return;
    raf = requestAnimationFrame(draw);

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    // Update gradient phase mix (colors only)
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
    computeSpectrumBands();

    // Overall energy for visual modulation
    let bass = 0, mid = 0, high = 0;
    for (let i = 0; i < 5;  i++) bass += spectrumBands[i];
    for (let i = 5; i < 20; i++) mid  += spectrumBands[i];
    for (let i = 20; i < 50; i++) high += spectrumBands[i];
    bass /= 5; mid /= 15; high /= 30;

    const totalEnergy = 0.45 * bass + 0.35 * mid + 0.20 * high;

    // Build smooth band-driven curve (Catmull–Rom → cubic Bézier)
    const steps = 180; // more points = smoother curve
    const points = [];
    const baseAmpPx = h * 0.55;        // max visual amplitude
    const bottomPad = h * 0.10;
    const maxRise = h * 0.52;

    // Soft dynamic range control so quiet parts still move
    const dyn = 0.25 + 0.75 * clamp01(totalEnergy);

    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * w;
      // Interpolated, gain-weighted band value (0..1)
      let v = bandValueAt(x, w);

      // Gentle gamma to favor peaks while keeping floor
      v = Math.pow(v, 0.85);

      // Convert to pixels with global dynamics
      let rise = baseAmpPx * v * dyn;
      rise = Math.min(rise, maxRise);

      const y = h - (bottomPad + rise);
      points.push({ x, y });
    }

    // Catmull–Rom to Bézier
    const path = new Path2D();
    path.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
    // Close to bottom for mask fill
    path.lineTo(w, h);
    path.lineTo(0, h);
    path.closePath();

    // Draw gradients on buffer
    const intensity = clamp01(0.45 + 0.55 * totalEnergy);
    const gPrev = buildGradient(gradPrev, now / 1000, w, h, intensity);
    const gNext = buildGradient(gradNext, now / 1000, w, h, intensity);
    const easeMix = 0.5 - 0.5 * Math.cos(Math.PI * mix);

    bctx.clearRect(0, 0, w, h);
    bctx.globalAlpha = 1 - easeMix;
    bctx.fillStyle = gPrev; bctx.fillRect(0, 0, w, h);
    bctx.globalAlpha = easeMix;
    bctx.fillStyle = gNext; bctx.fillRect(0, 0, w, h);
    bctx.globalAlpha = 1;

    // Apply wave shape mask
    bctx.globalCompositeOperation = 'destination-in';
    bctx.fill(path);
    bctx.globalCompositeOperation = 'source-over';

    // Final blur pass, modulated a bit by highs
    ctx.clearRect(0, 0, w, h);
    const blurRadius = 8 + 8 * high;
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
