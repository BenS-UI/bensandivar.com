(() => {
  const musicPlayer = document.getElementById('music');
  if (!musicPlayer) return;

  const auroraCanvas = musicPlayer.querySelector('#aurora');
  const auroraLayer = musicPlayer.querySelector('.aurora-layer');
  const audio = musicPlayer.querySelector('audio');
  if (!auroraCanvas || !auroraLayer || !audio) return;

  const ctx = auroraCanvas.getContext('2d');

  let acx, srcNode, analyser;
  let rafId = null;
  let overlayOn = false;
  let auroraHasEverRun = false;
  let auroraManuallyOff = false;

  // Tempo tracking
  let tempoSaturation = 90;
  let lastPeakTime = 0;
  let tempoSamples = [];

  function ensureAudioGraph() {
    if (acx) return;
    acx = new (window.AudioContext || window.webkitAudioContext)();
    srcNode = acx.createMediaElementSource(audio);
    analyser = acx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.65;
    srcNode.connect(analyser);
    analyser.connect(acx.destination);
  }

  function sizeCanvas() {
    const r = auroraLayer.getBoundingClientRect();
    auroraCanvas.width = Math.max(1, r.width | 0);
    auroraCanvas.height = Math.max(1, r.height | 0);
  }
  sizeCanvas();
  window.addEventListener('resize', sizeCanvas);

  // Phase morph for gradient colors
  const LOOP_S = 600;
  const PHASE_MS = 45000;
  let t0 = performance.now();
  let phaseStart = performance.now();
  let gradA = makePhase();
  let gradB = makePhase();

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

  function loopT() {
    const dt = (performance.now() - t0) / 1000;
    return (dt % LOOP_S) / LOOP_S;
  }

  function startAurora() {
    if (overlayOn) return;
    overlayOn = true;
    auroraHasEverRun = true;
    auroraManuallyOff = false;
    ensureAudioGraph();
    draw();
  }
  function stopAurora() {
    overlayOn = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  // Aurora activation logic
  audio.addEventListener('play', () => {
    ensureAudioGraph();
    if (!auroraHasEverRun || auroraManuallyOff) {
      setTimeout(startAurora, 15000);
    } else {
      startAurora();
    }
  });
  audio.addEventListener('pause', stopAurora);

  function buildGradient(phase, tGlobal, w, h) {
    const drift = Math.sin(tGlobal * 2 * Math.PI / 1800) * (10 * Math.PI / 180);
    const ang = phase.ang + drift;

    const r = Math.hypot(w, h);
    const cx = w / 2, cy = h * 0.65;
    const x0 = cx - Math.cos(ang) * r / 2, y0 = cy - Math.sin(ang) * r / 2;
    const x1 = cx + Math.cos(ang) * r / 2, y1 = cy + Math.sin(ang) * r / 2;

    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    const n = phase.n;
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1 || 1);
      const hue = (phase.seed + i * (360 / n) + 36 * Math.sin(2 * Math.PI * (tGlobal / LOOP_S + phase.offset + i * 0.09))) % 360;
      g.addColorStop(f, `hsla(${hue}, ${tempoSaturation}%, 55%, 0.96)`);
      if (i < n - 1) {
        const mid = f + (1 / (n - 1)) * 0.5;
        const hue2 = (hue + 24) % 360;
        g.addColorStop(mid, `hsla(${hue2}, ${tempoSaturation - 2}%, 56%, 0.90)`);
      }
    }
    return g;
  }

  function draw() {
    if (!overlayOn) return;
    rafId = requestAnimationFrame(draw);
    sizeCanvas();

    const w = auroraCanvas.width, h = auroraCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const fd = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(fd);

    // Split into ~12 bands
    const bands = 12;
    const bandVals = [];
    const step = Math.floor(fd.length / bands);
    for (let b = 0; b < bands; b++) {
      let sum = 0;
      for (let i = b * step; i < (b + 1) * step; i++) sum += fd[i];
      bandVals[b] = sum / step / 255;
    }

    // Detect peaks for tempo (rough)
    const rms = bandVals.reduce((a, v) => a + v, 0) / bands;
    if (rms > 0.35 && performance.now() - lastPeakTime > 300) {
      lastPeakTime = performance.now();
      tempoSamples.push(lastPeakTime);
      if (tempoSamples.length > 8) tempoSamples.shift();
      if (tempoSamples.length > 2) {
        let intervals = [];
        for (let i = 1; i < tempoSamples.length; i++) {
          intervals.push(tempoSamples[i] - tempoSamples[i - 1]);
        }
        const avgInterval = intervals.reduce((a, v) => a + v, 0) / intervals.length;
        const bpm = 60000 / avgInterval;
        tempoSaturation = 85 + Math.min(10, Math.max(-8, (bpm - 100) / 5));
      }
    }

    // Gradient phase morph
    const now = performance.now();
    let mix = (now - phaseStart) / PHASE_MS;
    if (mix >= 1) {
      gradA = gradB;
      gradB = makePhase();
      phaseStart = now;
      mix = 0;
    }

    const tL = loopT();

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, h);

    const steps = 150;
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * w;
      const bandIndex = (i / steps) * (bands - 1);
      const low = Math.floor(bandIndex);
      const high = Math.ceil(bandIndex);
      const frac = bandIndex - low;
      const val = bandVals[low] * (1 - frac) + bandVals[high] * frac;

      let rise = val * h * 0.75;
      const y = h - (h * 0.10 + rise);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.clip();

    const gA = buildGradient(gradA, now / 1000, w, h);
    const gB = buildGradient(gradB, now / 1000, w, h);

    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 1 - mix;
    ctx.fillStyle = gA; ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = mix;
    ctx.fillStyle = gB; ctx.fillRect(0, 0, w, h);

    // Aurora fade-out at top
    const fade = ctx.createLinearGradient(0, 0, 0, h);
    fade.addColorStop(0.0, 'rgba(0,0,0,0)');
    fade.addColorStop(0.2, 'rgba(0,0,0,0.05)');
    fade.addColorStop(0.5, 'rgba(0,0,0,0.5)');
    fade.addColorStop(1.0, 'rgba(0,0,0,1)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, w, h);

    ctx.restore();
  }

  // Fade-out on interaction
  let hoverTimer;
  musicPlayer.addEventListener('mouseenter', () => {
    if (!overlayOn) return;
    hoverTimer = setTimeout(() => {
      auroraManuallyOff = true;
      stopAurora();
    }, 5000);
  });
  musicPlayer.addEventListener('mouseleave', () => {
    clearTimeout(hoverTimer);
  });
  musicPlayer.addEventListener('click', () => {
    if (overlayOn) {
      auroraManuallyOff = true;
      stopAurora();
    } else {
      startAurora();
    }
  });

})();
