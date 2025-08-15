(() => {
  // ===== Targets =====
  const music  = document.getElementById('music');
  if (!music) return;

  const layer  = music.querySelector('.aurora-layer');
  const canvas = music.querySelector('#aurora');
  const audio  = music.querySelector('audio');
  if (!layer || !canvas || !audio) return;

  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });

  // ===== Tunables (from your superprompt) =====
  const VISIBLE_MIN_HZ = 40;
  const VISIBLE_MAX_HZ = 18000;
  const LOW_BANDS   = 3;
  const MID_BANDS   = 18;
  const HIGH_BANDS  = 27;

  const LOW_SMOOTH  = 0.16;
  const MID_SMOOTH  = 0.30;
  const HIGH_SMOOTH = 0.38;

  const FILL_ALPHA        = 0.98;  // inside shape
  const GLOBAL_BLUR_PX    = 2;     // blur on the whole aurora body
  const FEATHER_BLUR_PX   = 16;    // blur on the top-edge mask
  const FEATHER_START_OFF = 0.06;  // start feather just above crest (fraction of height)
  const FEATHER_SPREAD    = 0.22;
  const MAX_HEIGHT_FRAC   = 0.90;  // 90% of canvas height

  const PHASE_MS = 45000;          // color morph
  const LOOP_S   = 600;            // 10-min palette loop

  const FFT_SIZE = 2048;
  const SMOOTHING_TIME_CONSTANT = 0.72;

  // ===== Audio =====
  let acx, analyser, srcNode;
  function ensureAudio() {
    if (acx) return;
    acx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = acx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = SMOOTHING_TIME_CONSTANT;
    srcNode = acx.createMediaElementSource(audio);
    srcNode.connect(analyser);
    analyser.connect(acx.destination);
  }

  // ===== Canvas sizing =====
  function size() {
    const r = layer.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width  = Math.max(1, Math.round(r.width  * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
  }
  size();
  addEventListener('resize', size, { passive:true });

  // ===== Color Phases (10-min seamless loop with crossfade) =====
  let t0 = performance.now();
  let phaseStart = performance.now();

  const pickStops = () =>
    (Math.random()<0.7?4 : Math.random()<0.9?3 : Math.random()<0.97?5 : (Math.random()<0.5?6:7));

  const newPhase = () => ({
    seed: Math.random()*360,
    n: pickStops(),
    ang: (Math.random()*6 - 3) * Math.PI/180, // near-vertical slight tilt
    off: Math.random()*1000
  });

  let gradA = newPhase();
  let gradB = newPhase();

  function loopFrac() {
    const dt = (performance.now() - t0) / 1000;
    return (dt % LOOP_S) / LOOP_S;
  }

  function buildGradient(p, t, w, h){
    // slow drift to keep gradient alive, but not distracting
    const drift = Math.sin(t*2*Math.PI/1800) * (10*Math.PI/180);
    const ang = p.ang + drift;
    const r  = Math.hypot(w,h);
    const cx = w/2, cy = h*0.65;
    const x0 = cx - Math.cos(ang)*r/2, y0 = cy - Math.sin(ang)*r/2;
    const x1 = cx + Math.cos(ang)*r/2, y1 = cy + Math.sin(ang)*r/2;

    const g = ctx.createLinearGradient(x0,y0,x1,y1);
    const n = p.n;
    for(let i=0;i<n;i++){
      const f   = i/(n-1 || 1);
      const hue = (p.seed + i*(360/n) + 36*Math.sin(2*Math.PI*(loopFrac() + p.off + i*0.09))) % 360;
      // Bold, saturated, constant alpha inside the shape
      g.addColorStop(f, `hsla(${hue} 96% 56% / ${FILL_ALPHA})`);
      if(i<n-1){
        // soft micro-cross stop to keep transitions buttery
        const mid  = f + (1/(n-1))*0.5;
        const hue2 = (hue + 24) % 360;
        g.addColorStop(mid, `hsla(${hue2} 94% 55% / ${FILL_ALPHA})`);
      }
    }
    return g;
  }

  // ===== Band layout: zoomed musical range (48 bands total) =====
  let bands = null;
  function makeBands(){
    const nyq  = acx.sampleRate/2;
    // Ignore the very top (we explicitly cap at VISIBLE_MAX_HZ)
    const minHz = Math.max(20, VISIBLE_MIN_HZ);
    const maxHz = Math.min(VISIBLE_MAX_HZ, nyq*0.98);

    const bins = analyser.frequencyBinCount;
    const idx  = hz => Math.max(0, Math.min(bins-1, Math.round(bins * (hz/nyq))));

    const edgesLog = (min,max,nBands) => {
      const out=[min], r=Math.pow(max/min, nBands);
      let v=min;
      for(let i=0;i<nBands;i++){ v*=Math.pow(max/min,1/nBands); out.push(v); }
      return out;
    };

    const L = edgesLog( minHz,                     120,       LOW_BANDS); // 3
    const M = edgesLog( Math.max(120,minHz),       2500,      MID_BANDS); // 18
    const H = edgesLog( Math.max(2500,minHz),      maxHz,     HIGH_BANDS);// 27

    const edges = [...L, ...M.slice(1), ...H.slice(1)]; // contiguous

    bands = [];
    for (let i=0;i<edges.length-1;i++){
      const lo = idx(edges[i]);
      const hi = idx(edges[i+1]);

      // weights & smoothing per zone
      let weight, smoothA;
      if (i < LOW_BANDS) { weight = 0.35; smoothA = LOW_SMOOTH; }
      else if (i < LOW_BANDS + MID_BANDS) { weight = 1.00; smoothA = MID_SMOOTH; }
      else { weight = 1.20; smoothA = HIGH_SMOOTH; }

      bands.push({ lo, hi, weight, a:smoothA, s:0 });
    }
  }

  // Interpolate bands → continuous envelope [0..1] across width
  function bandAt(u){
    const N = bands.length; // 48
    const x = u*(N-1);
    const i = Math.floor(x);
    const t = x - i;

    const a = bands[Math.max(0, Math.min(N-1, i    ))].s;
    const b = bands[Math.max(0, Math.min(N-1, i + 1))].s;
    return a + (b - a) * t;
  }

  // Catmull–Rom → Bézier for vector-smooth crest (no angles)
  function smoothPathCR(ctx, pts, tension=0.5){
    ctx.moveTo(pts[0].x, pts[0].y);
    for(let i=0;i<pts.length-1;i++){
      const p0 = pts[Math.max(0, i-1)];
      const p1 = pts[i];
      const p2 = pts[Math.min(pts.length-1, i+1)];
      const p3 = pts[Math.min(pts.length-1, i+2)];
      const c1x = p1.x + (p2.x - p0.x) * (tension/6);
      const c1y = p1.y + (p2.y - p0.y) * (tension/6);
      const c2x = p2.x - (p3.x - p1.x) * (tension/6);
      const c2y = p2.y - (p3.y - p1.y) * (tension/6);
      ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p2.x, p2.y);
    }
  }

  // ===== Render =====
  let raf=null, running=false;
  function render(){
    if(!running) return;
    raf = requestAnimationFrame(render);

    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);

    // Color phase crossfade
    const now = performance.now();
    let mix = (now - phaseStart) / PHASE_MS;
    if (mix >= 1){ gradA = gradB; gradB = newPhase(); phaseStart = now; mix = 0; }

    // Audio pull
    const td = new Uint8Array(1024);
    analyser.getByteTimeDomainData(td);
    let sum = 0; for (let i=0;i<td.length;i++){ const v=(td[i]-128)/128; sum += v*v; }
    const rms = Math.sqrt(sum/td.length);

    const fd = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(fd);

    if (!bands) makeBands();

    // Per-band update (smoothed and weighted)
    for (let i=0;i<bands.length;i++){
      const b = bands[i];
      let s=0, c=0;
      for (let k=b.lo; k<=b.hi; k++){ s += fd[k]; c++; }
      const val = (c ? (s/c)/255 : 0) * b.weight;
      b.s += (val - b.s) * b.a;
    }

    // Envelope → crest points (bottom anchored, no gap)
    const N = 260;
    const pts = [];
    let crestY = h;

    // energy weighting (lows/mids/highs across your zones)
    const lowAvg  = avg(0, LOW_BANDS-1);
    const midAvg  = avg(LOW_BANDS, LOW_BANDS+MID_BANDS-1);
    const highAvg = avg(LOW_BANDS+MID_BANDS, bands.length-1);
    const energy  = 0.35*lowAvg + 0.45*midAvg + 0.20*highAvg;

    const maxRise = h * MAX_HEIGHT_FRAC;
    const baseAmp = h * (0.15 + 0.75 * Math.min(1, rms*1.8)) * (0.55 + 0.45*energy);

    for (let i=0;i<=N;i++){
      const u = i/N;
      const x = u*w;
      const env = Math.max(0, bandAt(u));
      let rise  = baseAmp * env;
      if (rise > maxRise) rise = maxRise;

      const y = h - rise; // baseline = bottom (no gap)
      crestY = Math.min(crestY, y);
      pts.push({ x, y });
    }

    // Clip aurora shape
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0,h);
    smoothPathCR(ctx, pts, 0.5);
    ctx.lineTo(w,h);
    ctx.closePath();
    ctx.clip();

    // Global body blur for the entire aurora
    ctx.filter = `blur(${GLOBAL_BLUR_PX}px)`;

    // Cross-faded gradient fill (bold colors, constant per-stop alpha)
    const gA = buildGradient(gradA, now/1000, w, h);
    const gB = buildGradient(gradB, now/1000, w, h);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 1 - mix; ctx.fillStyle = gA; ctx.fillRect(0,0,w,h);
    ctx.globalAlpha = mix;     ctx.fillStyle = gB; ctx.fillRect(0,0,w,h);

    // Subtle bloom to tie colors together
    ctx.filter = `blur(${GLOBAL_BLUR_PX + 8}px)`;
    ctx.globalAlpha = 0.18;    ctx.fillStyle = gA; ctx.fillRect(0,0,w,h);
    ctx.globalAlpha = 0.18*mix;ctx.fillStyle = gB; ctx.fillRect(0,0,w,h);

    // Feathered fade-to-transparent only at the TOP edge (glow-soft, no hard cut)
    const fade = ctx.createLinearGradient(0, 0, 0, h);
    const crest      = Math.max(0.04, crestY/h);
    const fadeStart  = Math.max(0, crest - FEATHER_START_OFF);
    const fadeEnd    = Math.min(1, fadeStart + FEATHER_SPREAD);
    fade.addColorStop(0.00, 'rgba(0,0,0,1)');
    fade.addColorStop(fadeStart, 'rgba(0,0,0,1)');
    fade.addColorStop((fadeStart+fadeEnd)/2, 'rgba(0,0,0,0.35)');
    fade.addColorStop(fadeEnd, 'rgba(0,0,0,0)');

    ctx.globalCompositeOperation = 'destination-out';
    ctx.filter = `blur(${FEATHER_BLUR_PX}px)`;
    ctx.globalAlpha = 1;
    ctx.fillStyle = fade;
    ctx.fillRect(0,0,w,h);

    // Restore
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();

    function avg(a,b){ let s=0,c=0; for(let i=a;i<=b;i++){ s+=bands[i].s; c++; } return c? s/c:0; }
  }

  // ===== Lifecycle (ALWAYS-ON WHEN AUDIO PLAYS — no delays, no hover rules) =====
  function start() {
    if (running) return;
    running = true;
    ensureAudio();
    if (!bands) makeBands();
    render();
  }
  function stop() {
    running = false;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  // Show the layer immediately; draw only while playing
  layer.classList.add('on');

  audio.addEventListener('play', async () => {
    ensureAudio();
    try { if (acx && acx.state === 'suspended') await acx.resume(); } catch {}
    start();
  });
  ['pause','ended','emptied','abort','stalled','suspend'].forEach(ev =>
    audio.addEventListener(ev, stop)
  );

  // Public hooks (kept minimal)
  window.aurora = {
    instant(){ start(); },
    off(){ stop(); } // keeps the last frame visible in the layer
  };
})();
