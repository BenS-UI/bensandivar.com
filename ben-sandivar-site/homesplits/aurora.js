// aurora.js — instant start, no fades, steady look, 2px final blur
(() => {
  const musicPlayer = document.getElementById('music');
  if (!musicPlayer) return;

  const auroraCanvas = musicPlayer.querySelector('#aurora');
  const auroraLayer  = musicPlayer.querySelector('.aurora-layer') || musicPlayer; // size fallback
  const audio        = musicPlayer.querySelector('audio');
  if (!auroraCanvas || !audio) return;

  // Visible context
  const ctx = auroraCanvas.getContext('2d', { alpha: true, desynchronized: true });

  // Offscreen buffer for final blur
  const buf = document.createElement('canvas');
  const btx = buf.getContext('2d', { alpha: true, desynchronized: true });

  // ---------- Audio ----------
  let acx, srcNode, analyser;
  function ensureAudioGraph() {
    if (acx) return;
    acx = new (window.AudioContext || window.webkitAudioContext)();
    srcNode  = acx.createMediaElementSource(audio);
    analyser = acx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.65;
    srcNode.connect(analyser);
    analyser.connect(acx.destination);
    td = new Uint8Array(analyser.fftSize);
    fd = new Uint8Array(analyser.frequencyBinCount);
  }

  // ---------- Sizing / DPR ----------
  let dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  function sizeCanvas() {
    const r = auroraLayer.getBoundingClientRect();
    const w = Math.max(1, r.width  | 0);
    const h = Math.max(1, r.height | 0);

    auroraCanvas.width = (w * dpr) | 0;
    auroraCanvas.height = (h * dpr) | 0;
    buf.width = (w * dpr) | 0;
    buf.height = (h * dpr) | 0;

    auroraCanvas.style.width = w + 'px';
    auroraCanvas.style.height = h + 'px';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    btx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  sizeCanvas();
  new ResizeObserver(sizeCanvas).observe(auroraLayer);
  window.addEventListener('resize', () => {
    const next = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    if (next !== dpr) { dpr = next; sizeCanvas(); }
  }, { passive: true });

  // ---------- Timing / Phase (no crossfade) ----------
  const LOOP_S = 600;
  let t0 = performance.now();

  function loopT() {
    const dt = (performance.now() - t0) / 1000;
    return (dt % LOOP_S) / LOOP_S;
  }

  function makePhase() {
    return {
      seed: Math.random() * 360,
      n: pickCount(),
      ang: (Math.random() * 6 - 3) * Math.PI / 180,
      offset: Math.random() * 1000
    };
  }
  function pickCount() {
    const roll = Math.random();
    if (roll < 0.70) return 4;
    if (roll < 0.90) return 3;
    if (roll < 0.97) return 5;
    return Math.random() < 0.5 ? 6 : 7;
  }

  // Single phase only — no 45s blending, no “restart” feel
  let phase = makePhase();

  function buildGradient(phase, tGlobal, w, h) {
    const drift = Math.sin(tGlobal * 2 * Math.PI / 1800) * (10 * Math.PI / 180);
    const ang   = phase.ang + drift;

    const r  = Math.hypot(w, h);
    const cx = w / 2, cy = h * 0.65;
    const x0 = cx - Math.cos(ang) * r / 2, y0 = cy - Math.sin(ang) * r / 2;
    const x1 = cx + Math.cos(ang) * r / 2, y1 = cy + Math.sin(ang) * r / 2;

    const g  = btx.createLinearGradient(x0, y0, x1, y1);
    const n  = phase.n;

    for (let i = 0; i < n; i++) {
      const f   = i / (n - 1 || 1);
      const hue = (phase.seed + i * (360 / n) +
                  36 * Math.sin(2 * Math.PI * (tGlobal / LOOP_S + phase.offset + i * 0.09))) % 360;
      g.addColorStop(f, `hsla(${hue} 92% 55% / 0.96)`);
      if (i < n - 1) {
        const mid  = f + (1 / (n - 1)) * 0.5;
        const hue2 = (hue + 24) % 360;
        g.addColorStop(mid, `hsla(${hue2} 88% 56% / 0.90)`);
      }
    }
    return g;
  }

  // ---------- Audio buffers ----------
  let td, fd;
  const smooth = { bass: 0, mid: 0, treb: 0 };
  const lerp = (a, b, t) => a + (b - a) * t;

  // ---------- Draw ----------
  let rafId = 0;
  function draw() {
    rafId = requestAnimationFrame(draw);

    const w = auroraCanvas.clientWidth;
    const h = auroraCanvas.clientHeight;

    // draw to buffer first
    btx.clearRect(0, 0, w, h);

    // audio pull
    analyser.getByteTimeDomainData(td);
    analyser.getByteFrequencyData(fd);

    // rms
    let sum = 0;
    for (let i = 0; i < td.length; i++) {
      const v = (td[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / td.length);

    // bands
    const nyq = acx.sampleRate / 2;
    const idx = hz => Math.min(fd.length - 1, Math.max(0, Math.round(fd.length * (hz / nyq))));
    const avg = (lo, hi) => {
      let s = 0, c = 0;
      for (let i = lo; i <= hi; i++) { s += fd[i]; c++; }
      return c ? s / c : 0;
    };
    const bd = { bass: avg(idx(20), idx(140)), mid: avg(idx(300), idx(2000)), treb: avg(idx(4000), idx(12000)) };
    smooth.bass = lerp(smooth.bass, bd.bass / 255, 0.28);
    smooth.mid  = lerp(smooth.mid,  bd.mid  / 255, 0.24);
    smooth.treb = lerp(smooth.treb, bd.treb / 255, 0.22);

    // wave params
    const tL = loopT();
    const kx = 2 * Math.PI / Math.max(360, w);
    const ph = tL * 2 * Math.PI * 0.8;

    const energy  = 0.55 * smooth.bass + 0.35 * smooth.mid + 0.10 * smooth.treb;
    const baseAmp = h * (0.22 + 0.55 * Math.min(1, rms * 1.8));
    const maxRise = h * 0.50;

    // column modulation
    const cols = 7;
    const colMod = (x) => {
      let v = 0;
      for (let c = 1; c <= cols; c++) v += Math.sin((c * 0.28) * kx * x + ph * c * 0.33) / c;
      return (v / cols) * 0.6 + 0.8;
    };

    // build wave path
    const steps = 150;
    const path  = new Path2D();
    path.moveTo(0, h);

    let topY = h;
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * w;
      const yWave =
        Math.sin(kx * x + ph)            * (0.55 + 0.30 * smooth.mid)  +
        Math.sin(kx * 1.8 * x + ph*1.15) * (0.30 + 0.30 * smooth.treb) +
        Math.sin(kx * 3.4 * x + ph*0.9 ) * (0.22 + 0.20 * smooth.treb);

      let rise = (baseAmp * (0.5 + 0.5 * yWave) * (0.70 + 0.50 * energy)) * colMod(x);
      rise = Math.min(rise, maxRise);
      const y = h - (h * 0.10 + rise);
      topY = Math.min(topY, y);
      path.lineTo(x, y);
    }
    path.lineTo(w, h);
    path.closePath();

    // paint gradient (single phase, no crossfade)
    const now = performance.now();
    const g = buildGradient(phase, now / 1000, w, h);

    btx.globalCompositeOperation = 'source-over';
    btx.fillStyle = g;
    btx.fillRect(0, 0, w, h);

    // mask to wave
    btx.globalCompositeOperation = 'destination-in';
    btx.fill(path);

    // atmospheric fade
    const fade = btx.createLinearGradient(0, 0, 0, h);
    const fadeEnd = Math.max(0.28, (topY / h) - 0.02);
    fade.addColorStop(0.00, 'rgba(0,0,0,1)');
    fade.addColorStop(fadeEnd, 'rgba(0,0,0,0)');
    btx.globalCompositeOperation = 'destination-out';
    btx.fillStyle = fade;
    btx.fillRect(0, 0, w, h);

    // reset buffer comp
    btx.globalCompositeOperation = 'source-over';

    // ----- FINAL 2px BLUR to screen -----
    ctx.clearRect(0, 0, w, h);
    ctx.filter = 'blur(2px)';       // true final blur in CSS px
    ctx.drawImage(buf, 0, 0, buf.width, buf.height, 0, 0, w, h);
    ctx.filter = 'none';
  }

  // ---------- Control (no delays, no fades, no suspend) ----------
  function start() {
    if (rafId) return;
    ensureAudioGraph();
    if (acx.state === 'suspended') acx.resume().catch(() => {});
    rafId = requestAnimationFrame(draw);
  }
  function stop() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    // keep last frame on canvas; no fade out
  }

  audio.addEventListener('play',  start, { passive: true });
  audio.addEventListener('pause', stop,  { passive: true });
  audio.addEventListener('ended', stop,  { passive: true });

})();
