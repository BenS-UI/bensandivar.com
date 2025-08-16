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

  // Bands (unchanged analysis)
  const BAND_COUNT = 60;
  const spectrumBands = new Float32Array(BAND_COUNT);
  const smoothBands   = new Float32Array(BAND_COUNT);
  let BAND_SPECS = null;

  // Hi-DPI
  let dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));

  // Color timing (unchanged)
  const PHASE_MS = 45000;
  const LOOP_S   = 600;

  let startT = performance.now();
  let phaseT = performance.now();
  let mix = 0;

  let gradPrev = makePhase();
  let gradNext = makePhase();

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp01 = v => Math.min(1, Math.max(0, v));
  const smoothstep = (e0, e1, x) => {
    const t = clamp01((x - e0) / (e1 - e0));
    return t * t * (3 - 2 * t);
  };
  const gauss = (x, m, s) => Math.exp(-0.5 * ((x - m) / s) ** 2);
  const softClip = x => Math.tanh(x);

  // ---------------- AURORA GATE (NEW) ----------------
  const SHOW_DELAY_MS = 10000; // 10s
  const HOVER_OFF_MS  = 1500;  // 1.5s

  let hasEverPlayed = false;
  let lastStopCause = 'none'; // 'pause' | 'ended' | 'hover' | 'none'
  let onRequested   = false;  // gate request to show
  let delayUntil    = 0;      // absolute time to allow showing

  // visual alpha (0..1)
  let alpha = 0;

  // hover timers + state (on the whole player window)
  const hoverArea = root.querySelector('.music-shell') || root;
  let hoverInside = false;
  let hoverOffTimer = 0;
  let hoverIdleTimer = 0;

  function requestOnImmediate() {
    onRequested = true;
    delayUntil = performance.now();
  }
  function requestOnWithDelay(ms) {
    onRequested = true;
    delayUntil = performance.now() + ms;
  }
  function requestOff(cause) {
    onRequested = false;
    lastStopCause = cause || 'none';
  }

  function scheduleHoverOff() {
    clearTimeout(hoverOffTimer);
    hoverOffTimer = window.setTimeout(() => {
      if (hoverInside) requestOff('hover');
    }, HOVER_OFF_MS);
  }
  function scheduleHoverIdleReenable() {
    clearTimeout(hoverIdleTimer);
    hoverIdleTimer = window.setTimeout(() => {
      if (!audio.paused) requestOnImmediate();
    }, SHOW_DELAY_MS);
  }

  // ---------------- Events ----------------
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

  // Hover gating
  hoverArea.addEventListener('mouseenter', () => {
    hoverInside = true;
    scheduleHoverOff();
    scheduleHoverIdleReenable();
  }, { passive: true });
  hoverArea.addEventListener('mousemove', () => {
    if (!hoverInside) return;
    scheduleHoverIdleReenable();
  }, { passive: true });
  hoverArea.addEventListener('mouseleave', () => {
    hoverInside = false;
    clearTimeout(hoverOffTimer);
    scheduleHoverIdleReenable();
  }, { passive: true });

  audio.addEventListener('play',    onAudioPlay, { passive: true });
  audio.addEventListener('playing', onAudioPlay, { passive: true });

  audio.addEventListener('pause', () => {
    requestOff('pause');
    if (!running) maybeStart();
    if (acx && acx.state === 'running') acx.suspend().catch(() => {});
  }, { passive: true });

  audio.addEventListener('ended', () => {
    requestOff('ended');
    if (!running) maybeStart();
    if (acx && acx.state === 'running') acx.suspend().catch(() => {});
  }, { passive: true });

  if (reduced) return;
  sizeCanvas();

  // --------------- Audio graph ----------------
  function ensureGraph() {
    if (acx) return;
    acx = new (window.AudioContext || window.webkitAudioContext)();

    src        = acx.createMediaElementSource(audio);
    analyser   = acx.createAnalyser();
    compressor = acx.createDynamicsCompressor();

    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.55;
    analyser.minDecibels = -95;
    analyser.maxDecibels = -10;

    src.connect(analyser);
    analyser.connect(compressor);
    compressor.connect(acx.destination);

    td = new Uint8Array(analyser.fftSize);
    fd = new Uint8Array(analyser.frequencyBinCount);

    BAND_SPECS = buildBands();
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

  // --------------- Phases / Colors (unchanged) ----------------
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

  // ---------------- Frequency layout (unchanged) ----------------
  const FMIN = 32;        // Hz
  const FMAX = 11000;     // Hz
  const LOW_COUNT  = 12;
  const MID_COUNT  = 18;
  const HIGH_COUNT = 30;

  function hzToIndex(hz) {
    const nyq = acx.sampleRate / 2;
    return Math.min(fd.length - 1, Math.max(0, Math.round(fd.length * (hz / nyq))));
  }
  function buildBands() {
    const specs = [];
    const log0 = Math.log(FMIN);
    const log1 = Math.log(FMAX);
    for (let i = 0; i < BAND_COUNT; i++) {
      const a = i / BAND_COUNT;
      const b = (i + 1) / BAND_COUNT;
      const fA = Math.exp(log0 + (log1 - log0) * a);
      const fB = Math.exp(log0 + (log1 - log0) * b);
      specs.push({ lo: hzToIndex(fA), hi: hzToIndex(fB), t: (i + 0.5) / BAND_COUNT });
    }
    return specs;
  }
  function weightForT(t) {
    let w = 0.28 + 0.72 * smoothstep(0.06, 0.32, t);
    const notch = 0.30 * gauss(t, 0.46, 0.16);
    w *= (1 - notch);
    const lift = smoothstep(0.55, 1.0, t) ** 0.85;
    w = w + (3.2 - w) * lift;
    return w;
  }

  // ---------------- Audio Analysis (unchanged) ----------------
  function percentile(arr, p) {
    const a = Array.from(arr).sort((x, y) => x - y);
    const idx = Math.min(a.length - 1, Math.max(0, Math.floor(p * (a.length - 1))));
    return a[idx] || 0;
  }
  function computeSpectrumBands() {
    if (!BAND_SPECS) BAND_SPECS = buildBands();

    const raw = new Float32Array(BAND_COUNT);

    for (let i = 0; i < BAND_COUNT; i++) {
      const { lo, hi, t } = BAND_SPECS[i];
      let sum = 0, count = 0;
      for (let j = lo; j <= hi; j++) { sum += fd[j]; count++; }
      const avg = count ? (sum / count) / 255 : 0;
      const w = weightForT(t);
      raw[i] = avg * w;
    }

    const p90 = Math.max(0.02, percentile(raw, 0.90));
    const inv = 1 / p90;

    for (let i = 0; i < BAND_COUNT; i++) {
      const t = (i + 0.5) / BAND_COUNT;
      const v = clamp01(raw[i] * inv);
      const gamma = 1.05 - 0.35 * t;
      const shaped = Math.pow(v, gamma);
      const alphaT = lerp(0.18, 0.28, t);
      spectrumBands[i] = lerp(smoothBands[i], shaped, alphaT);
      smoothBands[i]   = spectrumBands[i];
    }
  }
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
    if (w === 0 || h === 0) return;

    // Gate alpha progression
    const now = performance.now();
    const allowed = onRequested && now >= delayUntil && !hidden;
    const targetAlpha = allowed ? 1 : 0;
    const k = targetAlpha > alpha ? 0.08 : 0.10; // smooth in/out
    alpha += (targetAlpha - alpha) * k;
    if (alpha < 0.001) alpha = 0;
    if (alpha > 0.999) alpha = 1;

    // Update gradient phase mix (colors only)
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

    // Energy buckets
    let lowE = 0, midE = 0, highE = 0;
    for (let i = 0; i < LOW_COUNT; i++) lowE += spectrumBands[i];
    for (let i = LOW_COUNT; i < LOW_COUNT + MID_COUNT; i++) midE += spectrumBands[i];
    for (let i = LOW_COUNT + MID_COUNT; i < BAND_COUNT; i++) highE += spectrumBands[i];
    lowE  /= LOW_COUNT;
    midE  /= MID_COUNT;
    highE /= HIGH_COUNT;

    const totalEnergy = clamp01(0.15 * lowE + 0.30 * midE + 0.55 * highE);

    // Build smooth curve
    const steps = 220;
    const points = [];
    const bottomPad = h * 0.08;
    const baseAmpPx = h * 0.78;
    const dynCore   = 0.18 + 0.82 * totalEnergy;

    // Scale motion by alpha
    const vis = alpha;
    const dyn = dynCore * vis;

    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * w;
      let v = bandValueAt(x, w);
      v = softClip(v * 1.25);
      let rise = baseAmpPx * v * dyn;
      const y = h - (bottomPad + rise);
      points.push({ x, y });
    }

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
    path.lineTo(w, h);
    path.lineTo(0, h);
    path.closePath();

    // Draw gradients on buffer
    const intensityCore = clamp01(0.45 + 0.55 * totalEnergy);
    const intensity = intensityCore * vis;
    const gPrev = buildGradient(gradPrev, now / 1000, w, h, intensity);
    const gNext = buildGradient(gradNext, now / 1000, w, h, intensity);
    const easeMix = 0.5 - 0.5 * Math.cos(Math.PI * mix);

    bctx.clearRect(0, 0, w, h);
    bctx.globalAlpha = 1 - easeMix; bctx.fillStyle = gPrev; bctx.fillRect(0, 0, w, h);
    bctx.globalAlpha = easeMix;     bctx.fillStyle = gNext; bctx.fillRect(0, 0, w, h);
    bctx.globalAlpha = 1;

    // Apply wave shape mask
    bctx.globalCompositeOperation = 'destination-in';
    bctx.fill(path);
    bctx.globalCompositeOperation = 'source-over';

    // Final blur pass
    ctx.clearRect(0, 0, w, h);
    const blurRadius = (8 + 9 * highE) * (0.3 + 0.7 * vis);
    ctx.filter = `blur(${blurRadius}px)`;
    ctx.globalAlpha = vis;
    ctx.drawImage(
      bufferCanvas,
      0, 0, bufferCanvas.width, bufferCanvas.height,
      0, 0, w, h
    );
    ctx.filter = 'none';
    ctx.globalAlpha = 1;

    // Save CPU when fully off
    if (!onRequested && alpha === 0 && !hoverInside && (audio.paused || audio.ended)) {
      stopDraw();
    }
  }

  // --------------- Control ----------------
  function onAudioPlay() {
    ensureGraph();
    if (acx.state === 'suspended') acx.resume().catch(() => {});
    maybeStart();

    // Do not override a scheduled first-play delay with a later 'playing' event
    if (onRequested && performance.now() < delayUntil) {
      return;
    }

    if (!hasEverPlayed) {
      hasEverPlayed = true;
      requestOnWithDelay(SHOW_DELAY_MS);   // enforce 10s wait on first play
    } else {
      if (lastStopCause === 'pause' || lastStopCause === 'hover') {
        requestOnWithDelay(SHOW_DELAY_MS); // pause/resume: wait 10s
      } else if (lastStopCause === 'ended') {
        requestOnImmediate();              // back-to-back track: no wait
      } else {
        requestOnImmediate();              // default
      }
    }
    lastStopCause = 'none';
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

  // --------------- Init kick ----------------
  ensureGraph();
  // Start drawing only when needed

  // --------------- Cleanup ----------------
  window.addEventListener('beforeunload', () => {
    stopDraw();
    ro.disconnect();
    clearTimeout(hoverOffTimer);
    clearTimeout(hoverIdleTimer);
    try { src && src.disconnect(); } catch {}
    try { analyser && analyser.disconnect(); } catch {}
    try { compressor && compressor.disconnect(); } catch {}
    try { acx && acx.close(); } catch {}
  }, { passive: true });
})();
