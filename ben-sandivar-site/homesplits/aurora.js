<script>
(() => {
  // ====== DOM ======
  const music = document.getElementById('music');
  if (!music) return;

  const shell        = music.querySelector('.music-shell');
  const auroraLayer  = music.querySelector('.aurora-layer');
  const canvas       = music.querySelector('#aurora');
  const audio        = music.querySelector('audio');
  if (!auroraLayer || !canvas || !audio) return;

  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });

  // ====== AUDIO GRAPH ======
  let acx, analyser, src;
  function ensureAudio() {
    if (acx) return;
    acx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = acx.createAnalyser();
    analyser.fftSize = 2048;               // 1024 bins
    analyser.smoothingTimeConstant = 0.72; // keep it fluid
    src = acx.createMediaElementSource(audio);
    src.connect(analyser);
    analyser.connect(acx.destination);
  }

  // ====== CANVAS SIZING ======
  function size() {
    const r = auroraLayer.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width  = Math.max(1, Math.round(r.width  * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
  }
  size();
  addEventListener('resize', size, { passive: true });

  // ====== COLOR PHASES (10-minute seamless loop) ======
  const LOOP_S   = 600;                  // 10 min
  const FILL_A   = 0.97;                 // constant ~97% opacity
  const PHASE_MS = 45000;                // long morph phases
  let t0 = performance.now();
  let phaseStart = performance.now();

  function phase() {
    return {
      seed: Math.random()*360,
      n: (Math.random()<0.7?4:Math.random()<0.9?3:Math.random()<0.97?5:(Math.random()<0.5?6:7)),
      ang: (Math.random()*6-3) * Math.PI/180, // slight tilt
      offset: Math.random()*1000
    };
  }
  let gradA = phase(), gradB = phase();

  function buildGradient(gp, tGlobal, w, h) {
    const drift = Math.sin(tGlobal*2*Math.PI/1800) * (10*Math.PI/180);
    const ang = gp.ang + drift;
    const r = Math.hypot(w,h);
    const cx=w/2, cy=h*0.65;
    const x0=cx - Math.cos(ang)*r/2, y0=cy - Math.sin(ang)*r/2;
    const x1=cx + Math.cos(ang)*r/2, y1=cy + Math.sin(ang)*r/2;

    const g = ctx.createLinearGradient(x0,y0,x1,y1);
    const n = gp.n;
    for (let i=0;i<n;i++){
      const f=i/(n-1||1);
      const hue = (gp.seed + i*(360/n) + 36*Math.sin(2*Math.PI*(tGlobal/LOOP_S + gp.offset + i*0.09))) % 360;
      g.addColorStop(f, `hsla(${hue} 92% 55% / ${FILL_A})`);
      if (i<n-1){
        const mid = f + (1/(n-1))*0.5;
        const hue2 = (hue + 24) % 360;
        g.addColorStop(mid, `hsla(${hue2} 88% 56% / ${Math.min(0.94, FILL_A)})`);
      }
    }
    return g;
  }

  // ====== BANDS (3 low, 9 mid, 12 high) ======
  // ranges picked so mids dominate visually, highs more sensitive
  let bandDefs = null;
  function makeBands() {
    const nyq = acx.sampleRate/2;
    const bins = analyser.frequencyBinCount;

    const idxFromHz = hz => Math.max(0, Math.min(bins-1, Math.round(bins*(hz/nyq))));

    const edgesLog = (min, max, n) => {
      const out = [];
      const r = Math.pow(max/min, 1/n);
      let v=min;
      out.push(v);
      for (let i=0;i<n;i++){ v *= r; out.push(v); }
      return out;
    };

    // Low:   20–120 Hz → 3 bands (low sensitivity)
    const L = [20, 50, 80, 120];
    // Mid:   120–2400 Hz → 9 log bands (main body)
    const M = edgesLog(120, 2400, 9);
    // High:  2400–12000 Hz → 12 log bands (high sensitivity)
    const H = edgesLog(2400, 12000, 12);

    const edges = [...L, ...M.slice(1), ...H.slice(1)]; // contiguous

    const bands = [];
    for (let i=0;i<edges.length-1;i++){
      const lo = idxFromHz(edges[i]);
      const hi = idxFromHz(edges[i+1]);
      let weight = 1;
      if (i<=2) weight = 0.4;                  // lows
      else if (i<=2+9) weight = 1.0;           // mids
      else weight = 1.25;                      // highs
      const smooth = 0;                         // placeholder
      bands.push({ lo, hi, weight, v:0, s:0 });
    }
    bandDefs = bands;
  }

  // ====== DRAW SHAPE ======
  let raf = null, running = false;

  function loopFrac() {
    const dt=(performance.now()-t0)/1000;
    return (dt%LOOP_S)/LOOP_S;
  }

  // sample band curve along x (0..1) by interpolating the 24 bands
  function sampleBands(u){
    const N = bandDefs.length; // 24
    const x = u*(N-1);
    const i = Math.floor(x);
    const t = x - i;
    const a = bandDefs[Math.max(0, Math.min(N-1, i    ))].s;
    const b = bandDefs[Math.max(0, Math.min(N-1, i + 1))].s;
    return a + (b-a)*t;
  }

  function draw() {
    if (!running) return;
    raf = requestAnimationFrame(draw);

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0,0,w,h);

    // === AUDIO DATA ===
    const td = new Uint8Array(1024);
    analyser.getByteTimeDomainData(td);
    let sum=0; for (let i=0;i<td.length;i++){ const v=(td[i]-128)/128; sum+=v*v; }
    const rms = Math.sqrt(sum/td.length);

    const fd = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(fd);

    // fill bandDefs
    if (!bandDefs) makeBands();
    const gammaL=0.9, gammaM=0.8, gammaH=0.75; // perceptual
    for (let i=0;i<bandDefs.length;i++){
      const b = bandDefs[i];
      let s=0,c=0;
      for (let k=b.lo;k<=b.hi;k++){ s += fd[k]; c++; }
      const raw = c ? (s/c)/255 : 0;

      // choose gamma by region
      const g = (i<=2) ? gammaL : (i<=2+9 ? gammaM : gammaH);
      const val = Math.pow(raw, g) * b.weight;

      // band smoothing: lows slower, highs faster
      const a = (i<=2) ? 0.18 : (i<=2+9 ? 0.30 : 0.36);
      b.v = val;
      b.s = b.s + (val - b.s) * a;
    }

    // === SHAPE CONSTRUCTION ===
    const energy = (0.45*avgRange(0,2) + 0.40*avgRange(3,11) + 0.15*avgRange(12,23));
    // base amplitude scaled by waveform rms and overall energy
    const baseAmp = h * (0.22 + 0.65 * Math.min(1, rms*1.8) ) * (0.55 + 0.45*energy);
    const maxRise = h * 0.75; // cap at 75% of height

    // subtle vertical “curtains”
    const tL = loopFrac();
    const ph = tL*2*Math.PI*0.8;
    const steps = 220; // dense to keep it silky
    const kx = 2*Math.PI/Math.max(360,w);

    // find highest crest for fade shaping
    let crestY = h;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0,h);

    for (let i=0;i<=steps;i++){
      const x = (i/steps) * w;
      const u = i/steps;

      // band envelope across width
      let bandEnv = sampleBands(u);

      // add gentle three-octave “curtains” modulation
      const curtains =
        Math.sin(kx*0.6*x + ph*0.7) * 0.50 +
        Math.sin(kx*1.1*x + ph*1.1) * 0.30 +
        Math.sin(kx*2.0*x + ph*1.6) * 0.20;

      // smooth envelope (no angles)
      const env = Math.max(0, bandEnv * (0.85 + 0.15*curtains));

      let rise = baseAmp * env;
      rise = Math.min(rise, maxRise);

      const y = h - (h*0.10 + rise);
      crestY = Math.min(crestY, y);

      ctx.lineTo(x, y);
    }
    ctx.lineTo(w,h);
    ctx.closePath();
    ctx.clip();

    // === COLOR FILL with PHASE CROSSFADE ===
    const now = performance.now();
    let mix = (now - phaseStart) / PHASE_MS;
    if (mix >= 1) { gradA = gradB; gradB = phase(); phaseStart = now; mix = 0; }

    const gA = buildGradient(gradA, now/1000, w, h);
    const gB = buildGradient(gradB, now/1000, w, h);

    // crisp fill
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 1 - mix; ctx.fillStyle = gA; ctx.fillRect(0,0,w,h);
    ctx.globalAlpha = mix;     ctx.fillStyle = gB; ctx.fillRect(0,0,w,h);

    // bloom pass (creates *glow* near the top edge)
    ctx.filter = 'blur(18px)';
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = gA; ctx.fillRect(0,0,w,h);
    ctx.globalAlpha = 0.28*mix;
    ctx.fillStyle = gB; ctx.fillRect(0,0,w,h);
    ctx.filter = 'none';
    ctx.globalAlpha = 1;

    // === SOFT FADE-TO-TRANSPARENT AT THE TOP (NO HARD EDGE) ===
    // Build a vertical alpha mask that starts slightly above the crest and
    // eases to full transparent toward the very top — then subtract it.
    const fade = ctx.createLinearGradient(0, 0, 0, h);
    const crestFrac = Math.max(0.08, crestY / h);          // where the edge currently sits
    const start = Math.max(0, crestFrac - 0.06);           // begin fade a little ABOVE the crest
    const end   = Math.max(start + 0.14, crestFrac + 0.10);// fade span
    fade.addColorStop(0,       'rgba(0,0,0,1)');
    fade.addColorStop(start,   'rgba(0,0,0,1)');
    fade.addColorStop((start+end)/2, 'rgba(0,0,0,0.35)');
    fade.addColorStop(end,     'rgba(0,0,0,0)');

    ctx.globalCompositeOperation = 'destination-out';
    ctx.filter = 'blur(14px)';           // << soft, glow-like fade
    ctx.fillStyle = fade;
    ctx.fillRect(0,0,w,h);
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';

    ctx.restore();

    // ---- helpers
    function avgRange(a,b){
      let s=0,c=0;
      for (let i=a;i<=b;i++){ s += bandDefs[i].s; c++; }
      return c? s/c : 0;
    }
  }

  // ====== LIFECYCLE (show/hide rules) ======
  let firstShown = false;
  let delayedOn  = null;
  let reShow     = null;
  let hoverTimer = null;
  let userHidden = false;

  function start() {
    if (running) return;
    running = true;
    ensureAudio();
    if (!bandDefs) makeBands();
    draw();
  }
  function stop() {
    running = false;
    if (raf) { cancelAnimationFrame(raf); raf=null; }
  }
  function showLayer() {
    auroraLayer.classList.add('on');
  }
  function hideLayer() {
    auroraLayer.classList.remove('on');
  }

  function showWithDelay(ms) {
    clearTimeout(delayedOn);
    delayedOn = setTimeout(() => { showLayer(); start(); firstShown = true; userHidden = false; }, ms);
  }

  // First play → wait 15s; next tracks should call window.aurora.instant()
  audio.addEventListener('play', () => {
    ensureAudio();
    clearTimeout(delayedOn);
    clearTimeout(reShow);
    if (!firstShown || userHidden) showWithDelay(15000);
    else { showLayer(); start(); }
  });

  // Pause/ended → hide immediately
  ['pause','ended'].forEach(ev => audio.addEventListener(ev, () => {
    clearTimeout(delayedOn); clearTimeout(reShow);
    stop(); hideLayer();
  }));

  // ====== HOVER/TAP HIDE (3s), then auto return after 15s if still playing ======
  const ARM_MS = 3000, RETURN_MS = 15000;

  function armHoverHide() {
    if (audio.paused) return;
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => {
      // hide smoothly to let user interact
      userHidden = true;
      stop(); hideLayer();
      clearTimeout(reShow);
      if (!audio.paused) reShow = setTimeout(() => { showWithDelay(0); }, RETURN_MS);
    }, ARM_MS);
  }
  function cancelHoverHide() {
    clearTimeout(hoverTimer);
  }

  shell.addEventListener('mouseenter', armHoverHide);
  shell.addEventListener('mousemove', armHoverHide);
  shell.addEventListener('mouseleave', cancelHoverHide);
  // Mobile: single tap hides, then auto return
  shell.addEventListener('touchstart', () => {
    if (audio.paused) return;
    userHidden = true;
    stop(); hideLayer();
    clearTimeout(reShow);
    reShow = setTimeout(() => { showWithDelay(0); }, RETURN_MS);
  }, { passive: true });

  // ====== PUBLIC API for your player ======
  // Call this on auto-advance (next track) to light up instantly (no 15s wait)
  window.aurora = {
    instant() {
      clearTimeout(delayedOn); clearTimeout(reShow);
      userHidden = false; firstShown = true;
      showLayer(); start();
    },
    off() {
      clearTimeout(delayedOn); clearTimeout(reShow); clearTimeout(hoverTimer);
      userHidden = false; firstShown = true;
      stop(); hideLayer();
    }
  };
})();
</script>
