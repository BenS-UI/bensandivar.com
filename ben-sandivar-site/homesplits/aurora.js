(() => {
  // ===== DOM targets =====
  const music  = document.getElementById('music');
  if (!music) return;
  const shell  = music.querySelector('.music-shell');
  const layer  = music.querySelector('.aurora-layer');
  const canvas = music.querySelector('#aurora');
  const audio  = music.querySelector('audio');
  if (!shell || !layer || !canvas || !audio) return;

  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });

  // ===== Tunables (from superprompt) =====
  const CFG = {
    VISIBLE_MIN_HZ: 40,
    VISIBLE_MAX_HZ: 18000,
    LOW_BANDS: 3,
    MID_BANDS: 18,
    HIGH_BANDS: 27,
    LOW_SMOOTH: 0.16,
    MID_SMOOTH: 0.30,
    HIGH_SMOOTH: 0.38,
    FILL_ALPHA: 0.98,
    GLOBAL_BLUR_PX: 2,
    FEATHER_BLUR_PX: 16,
    FEATHER_START_OFFSET: 0.06, // above crest (fraction of height)
    FEATHER_SPREAD: 0.22,
    MAX_HEIGHT_FRAC: 0.90,
    PHASE_MS: 45000,
    LOOP_S: 600,                // 10-min palette loop
    FIRST_DELAY_MS: 15000,
    AUTONEXT_DELAY_MS: 0,
    HOVER_HIDE_MS: 3000,
    RETURN_SHOW_MS: 15000,
    FFT_SIZE: 2048,
    SMOOTHING_TIME_CONSTANT: 0.72,
  };

  // ===== Audio graph =====
  let acx, analyser, srcNode;
  function ensureAudio() {
    if (acx) return;
    acx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = acx.createAnalyser();
    analyser.fftSize = CFG.FFT_SIZE;
    analyser.smoothingTimeConstant = CFG.SMOOTHING_TIME_CONSTANT;
    srcNode = acx.createMediaElementSource(audio);
    srcNode.connect(analyser);
    analyser.connect(acx.destination);
  }

  // ===== Canvas sizing (DPR aware) =====
  function size() {
    const r = layer.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width  = Math.max(1, Math.round(r.width  * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
  }
  size();
  addEventListener('resize', size, { passive: true });

  // ===== Color phasing (seamless, cross-faded) =====
  const LOOP_S = CFG.LOOP_S;
  const FILL_A = CFG.FILL_ALPHA;
  let t0 = performance.now();

  const pickStops = () =>
    (Math.random()<0.7?4:Math.random()<0.9?3:Math.random()<0.97?5:(Math.random()<0.5?6:7));

  const newPhase = () => ({
    seed: Math.random() * 360,
    n: pickStops(),
    ang: (Math.random() * 6 - 3) * Math.PI / 180,
    off: Math.random() * 1000,
  });

  let gradA = newPhase(), gradB = newPhase();
  let phaseStart = performance.now();

  function loopFrac() {
    const dt = (performance.now() - t0) / 1000;
    return (dt % LOOP_S) / LOOP_S;
  }

  function buildGradient(p, t, w, h){
    const drift = Math.sin(t*2*Math.PI/1800) * (10*Math.PI/180);
    const ang = p.ang + drift;
    const r = Math.hypot(w,h);
    const cx=w/2, cy=h*0.65;
    const x0=cx - Math.cos(ang)*r/2, y0=cy - Math.sin(ang)*r/2;
    const x1=cx + Math.cos(ang)*r/2, y1=cy + Math.sin(ang)*r/2;

    const g = ctx.createLinearGradient(x0,y0,x1,y1);
    const n=p.n;
    for(let i=0;i<n;i++){
      const f = i/(n-1 || 1);
      const hue = (p.seed + i*(360/n) + 36*Math.sin(2*Math.PI*(loopFrac() + p.off + i*0.09))) % 360;
      g.addColorStop(f,  `hsla(${hue} 96% 56% / ${FILL_A})`);
      if(i<n-1){
        const mid = f + (1/(n-1))*0.5;
        g.addColorStop(mid, `hsla(${(hue+24)%360} 94% 58% / ${FILL_A})`);
      }
    }
    return g;
  }

  // ===== Bands (zoomed range 40–18k, 48 bands) =====
  let bands = null; // {lo,hi,weight,a,s}
  function logEdges(minHz, maxHz, nBands){
    const out = [minHz];
    const r = Math.pow(maxHz/minHz, 1/nBands);
    let v = minHz;
    for(let i=0;i<nBands;i++){ v*=r; out.push(v); }
    return out; // length nBands+1
  }
  function makeBands(){
    const nyq = acx.sampleRate/2;
    const bins = analyser.frequencyBinCount;
    const idx = hz => Math.max(0, Math.min(bins-1, Math.round(bins * (hz/nyq))));

    const L = logEdges(CFG.VISIBLE_MIN_HZ, 120, CFG.LOW_BANDS);          // 3
    const M = logEdges(120, 2500, CFG.MID_BANDS);                        // 18
    const H = logEdges(2500, Math.min(CFG.VISIBLE_MAX_HZ, nyq*0.95), CFG.HIGH_BANDS); // 27
    const edges = [...L, ...M.slice(1), ...H.slice(1)]; // contiguous

    bands = [];
    const total = CFG.LOW_BANDS + CFG.MID_BANDS + CFG.HIGH_BANDS;
    for (let i=0;i<total;i++){
      const lo = idx(edges[i]), hi = idx(edges[i+1]);
      const isLow  = i < CFG.LOW_BANDS;
      const isMid  = i >= CFG.LOW_BANDS && i < CFG.LOW_BANDS + CFG.MID_BANDS;
      const weight = isLow ? 0.45 : (isMid ? 1.0 : 1.25);
      const a      = isLow ? CFG.LOW_SMOOTH : (isMid ? CFG.MID_SMOOTH : CFG.HIGH_SMOOTH);
      bands.push({ lo, hi, weight, a, s:0 });
    }
  }

  // Interpolate band strengths across width (linear across band index)
  function bandAt(u){
    const N=bands.length;
    const x = u*(N-1);
    const i = Math.floor(x);
    const t = x - i;
    const a = bands[Math.max(0,Math.min(N-1,i))].s;
    const b = bands[Math.max(0,Math.min(N-1,i+1))].s;
    return a + (b - a) * t;
  }

  // Catmull–Rom → Bézier (smooth, vector-like)
  function pathCatRom(ctx, pts, tension=0.5){
    ctx.moveTo(pts[0].x, pts[0].y);
    for(let i=0;i<pts.length-1;i++){
      const p0 = pts[Math.max(0,i-1)];
      const p1 = pts[i];
      const p2 = pts[Math.min(pts.length-1,i+1)];
      const p3 = pts[Math.min(pts.length-1,i+2)];
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

    // crossfade palette phase
    const now = performance.now();
    let mix = (now - phaseStart) / CFG.PHASE_MS;
    if (mix >= 1){ gradA = gradB; gradB = newPhase(); phaseStart = now; mix = 0; }

    // audio samples
    const td = new Uint8Array(1024);
    analyser.getByteTimeDomainData(td);
    let sum=0; for(let i=0;i<td.length;i++){ const v=(td[i]-128)/128; sum+=v*v; }
    const rms = Math.sqrt(sum/td.length);

    const fd = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(fd);

    if (!bands) makeBands();

    // update bands (zoomed range only)
    for (let b of bands){
      let s=0,c=0;
      for(let k=b.lo;k<=b.hi;k++){ s+=fd[k]; c++; }
      const v = (c? (s/c)/255 : 0) * b.weight;   // 0..~1.25
      b.s += (v - b.s) * b.a;                    // smoothed
    }

    // energy mix → amplitude
    const lowAvg  = avg(0, CFG.LOW_BANDS-1);
    const midAvg  = avg(CFG.LOW_BANDS, CFG.LOW_BANDS+CFG.MID_BANDS-1);
    const highAvg = avg(CFG.LOW_BANDS+CFG.MID_BANDS, bands.length-1);
    const bandEnergy = 0.25*lowAvg + 0.50*midAvg + 0.25*highAvg;

    const ampMax = h * CFG.MAX_HEIGHT_FRAC;        // 90% height
    const baseAmp = ampMax * Math.min(1, 0.35 + 0.65*(0.6*bandEnergy + 0.4*rms));

    // envelope → smooth crest points (bottom anchored; no gap)
    const N = 260;
    const pts = [];
    let crestY = h;
    for(let i=0;i<=N;i++){
      const u = i/N;
      const x = u*w;
      const env = Math.min(1, Math.max(0, bandAt(u)));
      const rise = Math.min(ampMax, baseAmp * env);
      const y = h - rise;     // bottom → up
      crestY = Math.min(crestY, y);
      pts.push({x,y});
    }

    // clip aurora shape
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0,h);
    pathCatRom(ctx, pts, 0.5);
    ctx.lineTo(w,h);
    ctx.closePath();
    ctx.clip();

    // FULL BODY FILL (bold, constant alpha) + 2px global blur
    ctx.filter = `blur(${CFG.GLOBAL_BLUR_PX}px)`;
    const gA = buildGradient(gradA, now/1000, w, h);
    const gB = buildGradient(gradB, now/1000, w, h);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 1 - mix; ctx.fillStyle = gA; ctx.fillRect(0,0,w,h);
    ctx.globalAlpha = mix;     ctx.fillStyle = gB; ctx.fillRect(0,0,w,h);
    ctx.globalAlpha = 1;

    // TOP-EDGE FEATHER (glow-like, no hard cut)
    const fade = ctx.createLinearGradient(0, 0, 0, h);
    const crest = Math.max(0.02, crestY/h); // 0 top .. 1 bottom
    const start = Math.max(0, crest - CFG.FEATHER_START_OFFSET);
    const end   = Math.min(1, start + CFG.FEATHER_SPREAD);
    fade.addColorStop(0.00, 'rgba(0,0,0,1)');
    fade.addColorStop(start, 'rgba(0,0,0,1)');
    fade.addColorStop((start+end)/2, 'rgba(0,0,0,0.35)');
    fade.addColorStop(end,   'rgba(0,0,0,0)');

    ctx.globalCompositeOperation = 'destination-out';
    ctx.filter = `blur(${CFG.FEATHER_BLUR_PX}px)`;
    ctx.fillStyle = fade;
    ctx.fillRect(0,0,w,h);

    // restore state
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();

    function avg(a,b){ let s=0,c=0; for(let i=a;i<=b;i++){ s+=bands[i].s; c++; } return c? s/c:0; }
  }

  // ===== Lifecycle (delays, hover-hide, auto-return) =====
  let firstShown=false, runningTimer=null, reShow=null, hoverTimer=null, userHidden=false;

  function start() {
    if (running) return;
    running=true; ensureAudio(); if(!bands) makeBands(); render();
  }
  function stop() { running=false; if(raf){ cancelAnimationFrame(raf); raf=null; } }
  function showLayer(){ layer.classList.add('on'); }
  function hideLayer(){ layer.classList.remove('on'); }

  function showAfter(ms){
    clearTimeout(runningTimer);
    runningTimer=setTimeout(()=>{ showLayer(); start(); firstShown=true; userHidden=false; }, ms);
  }

  audio.addEventListener('play', async () => {
    ensureAudio();
    try { if (acx.state === 'suspended') await acx.resume(); } catch {}
    clearTimeout(runningTimer); clearTimeout(reShow);
    if(!firstShown || userHidden) showAfter(CFG.FIRST_DELAY_MS);
    else { showLayer(); start(); }                       // auto-next = instant
  });
  ['pause','ended'].forEach(ev => audio.addEventListener(ev, () => {
    clearTimeout(runningTimer); clearTimeout(reShow); stop(); hideLayer();
  }));

  // Hover/touch intent → hide after 3s; auto-return after 15s
  function armHide(){
    if (audio.paused) return;
    clearTimeout(hoverTimer);
    hoverTimer=setTimeout(()=>{
      userHidden=true; stop(); hideLayer();
      clearTimeout(reShow);
      if(!audio.paused) reShow=setTimeout(()=> showAfter(0), CFG.RETURN_SHOW_MS);
    }, CFG.HOVER_HIDE_MS);
  }
  function cancelHide(){ clearTimeout(hoverTimer); }

  shell.addEventListener('mouseenter', armHide);
  shell.addEventListener('mousemove', armHide);
  shell.addEventListener('mouseleave', cancelHide);
  shell.addEventListener('touchstart', () => {
    if (audio.paused) return;
    userHidden=true; stop(); hideLayer();
    clearTimeout(reShow);
    reShow=setTimeout(()=> showAfter(0), CFG.RETURN_SHOW_MS);
  }, { passive:true });

  // Public hooks
  window.aurora = {
    instant(){ // call on auto-next
      clearTimeout(runningTimer); clearTimeout(reShow);
      userHidden=false; firstShown=true; showLayer(); start();
    },
    off(){
      clearTimeout(runningTimer); clearTimeout(reShow); clearTimeout(hoverTimer);
      userHidden=false; stop(); hideLayer();
    }
  };
})();
