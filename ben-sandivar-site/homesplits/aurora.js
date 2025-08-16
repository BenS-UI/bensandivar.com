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
  const BAND_COUNT = 60;                         // 60 total bands
  const spectrumBands = new Float32Array(BAND_COUNT);
  const smoothBands   = new Float32Array(BAND_COUNT);

  // Hi-DPI
  let dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));

  // Color timing (shape is data-driven)
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

    analyser.fftSize = 2048;                  // good resolution, balanced CPU
    analyser.smoothingTimeConstant = 0.6;     // slightly quicker highs
    // Tighten analyzer window to lift quiet highs a bit
    analyser.minDecibels = -95;
    analyser.maxDecibels = -10;

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

  // ---------------- Frequency layout (relevant range only) ----------------
  // Trim to where modern music carries useful energy:
  // Lows:   32–180 Hz  (12 bands)
  // Mids:   180–3200 Hz (18 bands)
  // Highs:  3200–16000 Hz (30 bands)
  const LOW_CFG  = { f0: 32,   f1: 180,   count: 12, scale: 0.28 }; // very undersensitive
  const MID_CFG  = { f0: 180,  f1: 3200,  count: 18, scale: 1.25 }; // moderate boost
  const HIGH_CFG = { f0: 3200, f1: 16000, count: 30, scale: 2.8  }; // super-boosted

  function hzToIndex(hz) {
    const nyq = acx.sampleRate / 2;
    return Math.min(fd.length - 1, Math.max(0, Math.round(fd.length * (hz / nyq))));
  }

  function buildBands() {
    const specs = [];

    const pushLogRange = (cfg) => {
      const log0 = Math.log10(cfg.f0);
      const log1 = Math.log10(cfg.f1);
      for (let i = 0; i < cfg.count; i++) {
        const fA = Math.pow(10, log0 + (i / cfg.count) * (log1 - log0));
        const fB = Math.pow(10, log0 + ((i + 1) / cfg.count) * (log1 - log0));
        specs.push({ lo: hzToIndex(fA), hi: hzToIndex(fB), scale: cfg.scale });
      }
    };

    pushLogRange(LOW_CFG);
    pushLogRange(MID_CFG);
    pushLogRange(HIGH_CFG);
    return specs;
  }

  const BAND_SPECS = buildBands(); // 60 specs continuous, no gaps

  // ---------------- Audio Analysis: 60 bands with dynamic norm ----------------
  function percentile(arr, p) {
    if (!arr.length) return 0;
    const a = arr.slice().sort((x, y) => x - y);
    const idx = Math.min(a.length - 1, Math.max(0, Math.floor(p * (a.length - 1))));
    return a[idx];
  }

  function computeSpectrumBands() {
    const raw = new Array(BAND_COUNT);

    // Average bins per band, apply per-region scale
    for (let i = 0; i < BAND_COUNT; i++) {
      const { lo, hi, scale } = BAND_SPECS[i];
      let sum = 0, count = 0;
      for (let j = lo; j <= hi; j++) { sum += fd[j]; count++; }
      const avg = count ? (sum / count) / 255 : 0; // 0..1
      raw[i] = avg * scale;
    }

    // Dynamic normalization so highs light up even when bass is huge
    const p90 = Math.max(0.05, percentile(raw, 0.90));
    const norm = 1 / p90;

    for (let i = 0; i < BAND_COUNT; i++) {
      // Loudness tilt: boost highs perceptually more than lows
      const t = i / (BAND_COUNT - 1);                 // 0 (low) → 1 (high)
      const gamma = 0.95 - 0.30 * t;                  // highs get lower gamma → more lift
      const v = clamp01((raw[i] * norm));
      const shaped = Math.pow(v, gamma);
      spectrumBands[i] = lerp(smoothBands[i], shaped, 0.25); // temporal smoothing
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
    const v0 = spectrumBands[i0];
    const v1 = spectrumBands[i1];
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

    // Energy buckets (weighted toward highs)
    let lowE = 0, midE = 0, highE = 0;
    for (let i = 0; i < LOW_CFG.count; i++)          lowE  += spectrumBands[i];
    for (let i = LOW_CFG.count; i < LOW_CFG.count + MID_CFG.count; i++) midE += spectrumBands[i];
    for (let i = LOW_CFG.count + MID_CFG.count; i < BAND_COUNT; i++)    highE += spectrumBands[i];

    lowE  /= LOW_CFG.count;
    midE  /= MID_CFG.count;
    highE /= HIGH_CFG.count;

    const totalEnergy = clamp01(0.25 * lowE + 0.35 * midE + 0.40 * highE);

    // Build smooth band-driven curve (Catmull–Rom → cubic Bézier)
    const steps = 200; // more points = smoother curve
    const points = [];
    const baseAmpPx = h * 0.55;        // max visual amplitude
    const bottomPad = h * 0.10;
    const maxRise = h * 0.52;

    // Soft dynamics so quiet parts still move a bit
    const dyn = 0.20 + 0.80 * totalEnergy;

    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * w;
      let v = bandValueAt(x, w);                 // 0..1 after shaping
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

    // Final blur pass, modulated by highs
    ctx.clearRect(0, 0, w, h);
    const blurRadius = 8 + 8 * highE;
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
