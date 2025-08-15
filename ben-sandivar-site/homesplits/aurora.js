/* AURORA v1.0 — brand-new, self-contained visualizer
   Wiring:
     - Expects in DOM (inside #music): .aurora-layer > canvas#aurora, and one <audio>.
     - No other site scripts required. No timers/UX logic. Audio-reactive only.

   Behavior:
     - Start on audio.play, stop on pause/ended.
     - Queries ONLY: #music, .aurora-layer, #aurora, and the <audio> inside #music.
     - Bail if any missing.
*/

(() => {
  // ---- Constants (quick tuning) ----
  const VISIBLE_MIN_HZ = 40;
  const VISIBLE_MAX_HZ = 18000;
  const LOW_BANDS = 3;
  const MID_BANDS = 18;
  const HIGH_BANDS = 27;

  const LOW_SMOOTH = 0.16;
  const MID_SMOOTH = 0.30;
  const HIGH_SMOOTH = 0.38;

  const FILL_ALPHA = 0.98;
  const GLOBAL_BLUR_PX = 2;
  const FEATHER_BLUR_PX = 16;
  const FEATHER_START_OFFSET = 0.06;
  const FEATHER_SPREAD = 0.22;
  const MAX_HEIGHT_FRAC = 0.90;

  const PHASE_MS = 45000;  // color morph time
  const LOOP_S = 600;      // 10-min loop

  const FFT_SIZE = 2048;
  const SMOOTHING_TIME_CONSTANT = 0.72;

  // Weights: keep lows calmer, mids/ highs more present.
  const WEIGHT_LOW  = 0.7;
  const WEIGHT_MID  = 1.0;
  const WEIGHT_HIGH = 1.1;

  // ---- DOM targets (strict) ----
  const root   = document.getElementById('music');
  if (!root) return;

  const layer  = root.querySelector('.aurora-layer');
  const canvas = root.querySelector('#aurora');
  const audio  = root.querySelector('audio');

  if (!layer || !canvas || !audio) return;

  // ---- Canvas setup ----
  const ctx = canvas.getContext('2d', { desynchronized: true, alpha: true });
  if (!ctx) return;

  let running = false;
  let rafId = 0;

  // DPR-aware sizing (cap at 2 for perf)
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resizeCanvas();
  // Optional: observe size changes if the layout is fluid
  const ro = new ResizeObserver(resizeCanvas);
  ro.observe(canvas);

  // ---- Audio nodes (lazy) ----
  let audioCtx = null;
  let analyser = null;
  let source   = null;

  let freqBins = null; // Uint8Array
  let timeDomain = null; // Uint8Array

  // Band model
  let bands = []; // {loHz, hiHz, loBin, hiBin, weight, smooth, s}

  function makeLogEdges(minHz, maxHz, count) {
    const edges = new Array(count + 1);
    const logMin = Math.log(minHz);
    const logMax = Math.log(maxHz);
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      edges[i] = Math.exp(logMin + (logMax - logMin) * t);
    }
    return edges;
  }

  function buildBands(sampleRate) {
    // Visible clamp
    const minHz = VISIBLE_MIN_HZ;
    const maxHz = Math.min(VISIBLE_MAX_HZ, sampleRate * 0.5 * 0.85); // ignore top ~15% of Nyquist

    const lows = makeLogEdges(40, 120, LOW_BANDS);
    const mids = makeLogEdges(120, 2500, MID_BANDS);
    const highs = makeLogEdges(2500, maxHz, HIGH_BANDS);

    const triples = [
      { edges: lows,  weight: WEIGHT_LOW,  smooth: LOW_SMOOTH },
      { edges: mids,  weight: WEIGHT_MID,  smooth: MID_SMOOTH },
      { edges: highs, weight: WEIGHT_HIGH, smooth: HIGH_SMOOTH },
    ];

    const result = [];
    const nyquist = sampleRate / 2;
    const binCount = FFT_SIZE / 2;

    for (const { edges, weight, smooth } of triples) {
      for (let i = 0; i < edges.length - 1; i++) {
        const lo = edges[i];
        const hi = edges[i + 1];
        const loBin = Math.max(0, Math.floor((lo / nyquist) * binCount));
        const hiBin = Math.min(binCount - 1, Math.ceil((hi / nyquist) * binCount));
        if (hiBin <= loBin) continue;
        result.push({ loHz: lo, hiHz: hi, loBin, hiBin, weight, smooth, s: 0 });
      }
    }
    return result;
  }

  // ---- Color system (phase cross-fade + 10-min hue loop) ----
  // Simple seeded PRNG for stable gradients per phase
  function PRNG(seed) {
    let s = seed >>> 0;
    return function rnd() {
      // xorshift32
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17; s >>>= 0;
      s ^= s << 5;  s >>>= 0;
      return (s >>> 0) / 0xFFFFFFFF;
    };
  }

  function makeGradient(ctx, w, h, phaseIndex, baseHueDeg) {
    const rnd = PRNG(0xA11CE ^ phaseIndex);
    // 3–7 stops
    const stopCount = 3 + Math.floor(rnd() * 5);
    // Orientation: pick slight angle
    const angle = rnd() * Math.PI * 2;
    const x0 = w * (0.5 + 0.45 * Math.cos(angle));
    const y0 = h * (0.5 + 0.45 * Math.sin(angle));
    const x1 = w - x0;
    const y1 = h - y0;
    const g = ctx.createLinearGradient(x0, y0, x1, y1);

    for (let i = 0; i < stopCount; i++) {
      const t = i / (stopCount - 1);
      // Bold saturation (90–100%), lightness (50–60%), slight hue drift per stop
      const hue = (baseHueDeg + (rnd() * 60 - 30) + t * 90) % 360;
      const sat = 90 + rnd() * 10;
      const light = 50 + rnd() * 10;
      g.addColorStop(t, `hsla(${hue}, ${sat}%, ${light}%, ${FILL_ALPHA})`);
    }
    return g;
  }

  const startEpoch = performance.now();

  function gradientPhases(w, h) {
    const now = performance.now();
    const loopT = ((now - startEpoch) / 1000) % LOOP_S;
    const baseHue = (loopT / LOOP_S) * 360; // 0–360 over 10 minutes

    const phase = Math.floor((now - startEpoch) / PHASE_MS);
    const phaseT = ((now - startEpoch) % PHASE_MS) / PHASE_MS; // 0..1

    const gradA = makeGradient(ctx, w, h, phase, baseHue);
    const gradB = makeGradient(ctx, w, h, phase + 1, (baseHue + 20) % 360);

    return { gradA, gradB, mix: phaseT };
  }

  // ---- Envelope & curve ----
  // Sample envelope across width with linear interp between band means.
  function sampleEnvelopeAcrossWidth(bands, samples) {
    const N = bands.length;
    const arr = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const t = (i / (samples - 1)) * (N - 1);
      const i0 = Math.floor(t);
      const i1 = Math.min(N - 1, i0 + 1);
      const f = t - i0;
      const v = bands[i0].s * (1 - f) + bands[i1].s * f;
      arr[i] = v;
    }
    return arr;
  }

  // Catmull-Rom → cubic Bézier
  function catmullRomToBezier(ctx, pts) {
    if (pts.length < 2) return;
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;

      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;

      ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p2.x, p2.y);
    }
  }

  // ---- RMS + band energy driver ----
  function computeRMS(td) {
    let sum = 0;
    const mid = 128;
    for (let i = 0; i < td.length; i++) {
      const v = (td[i] - mid) / 128; // -1..1
      sum += v * v;
    }
    const rms = Math.sqrt(sum / td.length); // 0..~1
    return Math.min(1, rms * 1.5);
  }

  // ---- Rendering loop ----
  function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function render() {
    if (!running || !analyser) return;

    analyser.getByteFrequencyData(freqBins);
    analyser.getByteTimeDomainData(timeDomain);

    // Per-band mean, normalize, weight, smooth
    for (let i = 0; i < bands.length; i++) {
      const b = bands[i];
      let sum = 0;
      let count = 0;
      for (let k = b.loBin; k <= b.hiBin; k++) {
        sum += freqBins[k];
        count++;
      }
      const mean = count ? sum / (count * 255) : 0; // 0..1
      const v = mean * b.weight;
      b.s += (v - b.s) * b.smooth;
    }

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    // Envelope samples across width
    const SAMPLES = Math.max(64, Math.floor(w / 8)); // smooth enough
    const env = sampleEnvelopeAcrossWidth(bands, SAMPLES);

    // Amplitude driver: mix RMS and band energy
    let bandAvg = 0;
    for (let i = 0; i < bands.length; i++) bandAvg += bands[i].s;
    bandAvg /= bands.length;

    const rms = computeRMS(timeDomain);
    const energy = Math.min(1, 0.6 * bandAvg + 0.4 * rms);

    const maxRise = h * MAX_HEIGHT_FRAC;
    const baseAmp = Math.min(maxRise, (0.12 * h) + energy * maxRise);

    // Build crest points (bottom-anchored)
    const pts = [];
    let crestY = h;
    for (let i = 0; i < SAMPLES; i++) {
      const x = (i / (SAMPLES - 1)) * w;
      const rise = baseAmp * env[i];
      const y = Math.max(0, h - rise); // bottom-anchored
      if (y < crestY) crestY = y;
      pts.push({ x, y });
    }

    // Gradients (phase cross-fade)
    const { gradA, gradB, mix } = gradientPhases(w, h);

    // Draw shape
    clearCanvas();
    ctx.save();
    ctx.filter = `blur(${GLOBAL_BLUR_PX}px)`;

    // Path: bottom-left → crest → bottom-right → close
    ctx.beginPath();
    // Bottom edge
    ctx.moveTo(0, h);
    // Smooth crest
    catmullRomToBezier(ctx, pts);
    // Down to bottom-right and close
    ctx.lineTo(w, h);
    ctx.closePath();

    // Fill A
    ctx.globalAlpha = (1 - mix);
    ctx.fillStyle = gradA;
    ctx.fill();

    // Fill B (cross-fade)
    ctx.globalAlpha = mix;
    ctx.fillStyle = gradB;
    ctx.fill();

    ctx.restore();

    // Top-edge feather (destination-out)
    // Start a bit above crest, fade over a vertical band
    const startY = Math.max(0, crestY - FEATHER_START_OFFSET * h);
    const endY = Math.min(h, startY + FEATHER_SPREAD * h);

    const feather = ctx.createLinearGradient(0, startY, 0, endY);
    feather.addColorStop(0, 'rgba(0,0,0,1)');
    feather.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.filter = `blur(${FEATHER_BLUR_PX}px)`;
    ctx.fillStyle = feather;
    ctx.fillRect(0, startY, w, endY - startY);
    ctx.restore();

    // Keep going while playing
    rafId = requestAnimationFrame(render);
  }

  function start() {
    if (running) return;
    running = true;
    rafId = requestAnimationFrame(render);
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    clearCanvas();
  }

  // ---- Audio wiring on first gesture (play) ----
  async function ensureAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = SMOOTHING_TIME_CONSTANT;

    source = audioCtx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);

    freqBins = new Uint8Array(analyser.frequencyBinCount);
    timeDomain = new Uint8Array(analyser.fftSize);

    bands = buildBands(audioCtx.sampleRate);
  }

  // ---- Events (drive only from audio) ----
  audio.addEventListener('play', async () => {
    await ensureAudio();
    try { await audioCtx.resume(); } catch (_) {}
    start();
  }, { passive: true });

  audio.addEventListener('pause', () => {
    stop();
  }, { passive: true });

  audio.addEventListener('ended', () => {
    stop();
  }, { passive: true });

  // If src changes and autoplay triggers play, the 'play' handler handles it.

  // ---- Public tiny hooks (optional) ----
  window.aurora = {
    instant: () => {
      if (!audio.paused) {
        ensureAudio().then(() => {
          audioCtx.resume().then(() => start());
        });
      }
    },
    off: () => {
      stop();
    }
  };
})();
