(() => {
  // ===== Targets =====
  const music = document.getElementById('music');
  if (!music) return;

  const shell   = music.querySelector('.music-shell');
  const layer   = music.querySelector('.aurora-layer');
  const canvas  = music.querySelector('#aurora');
  const audio   = music.querySelector('audio');
  if (!shell || !layer || !canvas || !audio) return;

  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });

  // ===== Audio =====
  let acx, analyser, srcNode;
  function ensureAudio() {
    if (acx) return;
    acx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = acx.createAnalyser();
    analyser.fftSize = 2048;                    // 1024 bins
    analyser.smoothingTimeConstant = 0.72;      // silky
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

  // ===== Color phase (10-min seamless loop) =====
  const LOOP_S   = 600;
  const FILL_A   = 0.97;  // constant alpha inside shape
  const PHASE_MS = 45000;
  let t0 = performance.now();
  let phaseStart = performance.now();

  const pickN = () => (Math.random()<0.7?4:Math.random()<0.9?3:Math.random()<0.97?5:(Math.random()<0.5?6:7));
  const newPhase = () => ({ seed: Math.random()*360, n: pickN(), ang: (Math.random()*6-3)*Math.PI/180, off: Math.random()*1000 });
  let gradA = newPhase(), gradB = newPhase();

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
      const f=i/(n-1||1);
      const hue=(p.seed + i*(360/n) + 36*Math.sin(2*Math.PI*(t/LOOP_S + p.off + i*0.09)))%360;
      g.addColorStop(f,  `hsla(${hue} 92% 55% / ${FILL_A})`);
      if(i<n-1){
        const mid=f+(1/(n-1))*0.5;
        g.addColorStop(mid, `hsla(${(hue+24)%360} 88% 56% / ${Math.min(0.94,FILL_A)})`);
      }
    }
    return g;
  }

  // ===== Bands: 3 low / 9 mid / 12 high =====
  let bands = null;
  function makeBands(){
    const nyq  = acx.sampleRate/2;
    const bins = analyser.frequencyBinCount;
    const idx  = hz => Math.max(0, Math.min(bins-1, Math.round(bins*(hz/nyq))));

    const edgesLog = (min,max,n) => {
      const out=[min], r=Math.pow(max/min,1/n); let v=min;
      for(let i=0;i<n;i++){ v*=r; out.push(v); }
      return out;
    };

    const L = [20, 50, 80, 120];             // 3 low bands
    const M = edgesLog(120, 2400, 9);        // 9 mid bands
    const H = edgesLog(2400, 12000, 12);     // 12 high bands
    const edges = [...L, ...M.slice(1), ...H.slice(1)];

    bands = [];
    for (let i=0;i<edges.length-1;i++){
      const lo = idx(edges[i]), hi = idx(edges[i+1]);
      const weight  = (i<=2) ? 0.45 : (i<=2+9 ? 1.0 : 1.25);
      const smoothA = (i<=2) ? 0.18 : (i<=2+9 ? 0.30 : 0.36);
      bands.push({ lo, hi, weight, a:smoothA, s:0 });
    }
  }

  // interpolate 24 bands to a continuous envelope across width
  function bandAt(u){
    const N=bands.length; // 24
    const x=u*(N-1);
    const i=Math.floor(x);
    const t=x-i;
    const a=bands[Math.max(0,Math.min(N-1,i))].s;
    const b=bands[Math.max(0,Math.min(N-1,i+1))].s;
    return a+(b-a)*t;
  }

  // draw smooth curve via mid-point quadratic smoothing (no angles)
  function strokeSmooth(ctx, pts){
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i=1;i<pts.length-2;i++){
      const xc=(pts[i].x+pts[i+1].x)/2, yc=(pts[i].y+pts[i+1].y)/2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
    }
    const n=pts.length;
    ctx.quadraticCurveTo(pts[n-2].x, pts[n-2].y, pts[n-1].x, pts[n-1].y);
  }

  // ===== Render =====
  let raf=null, running=false;
  function render(){
    if(!running) return;
    raf=requestAnimationFrame(render);

    const w=canvas.width, h=canvas.height;
    ctx.clearRect(0,0,w,h);

    // time & color phase
    const now=performance.now();
    let mix=(now-phaseStart)/PHASE_MS;
    if(mix>=1){ gradA=gradB; gradB=newPhase(); phaseStart=now; mix=0; }

    // audio data
    const td=new Uint8Array(1024);
    analyser.getByteTimeDomainData(td);
    let sum=0; for(let i=0;i<td.length;i++){ const v=(td[i]-128)/128; sum+=v*v; }
    const rms=Math.sqrt(sum/td.length);

    const fd=new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(fd);

    if(!bands) makeBands();
    // update bands
    for(let i=0;i<bands.length;i++){
      const b=bands[i];
      let s=0,c=0;
      for(let k=b.lo;k<=b.hi;k++){ s+=fd[k]; c++; }
      const val = (c? (s/c)/255 : 0) * b.weight;
      b.s += (val - b.s)*b.a;
    }

    // envelope → points
    const baseEnergy = (0.45*avg(0,2) + 0.40*avg(3,11) + 0.15*avg(12,23));
    const baseAmp = h * (0.22 + 0.65 * Math.min(1, rms*1.8)) * (0.55 + 0.45*baseEnergy);
    const maxRise = h*0.75;

    const N = 220;
    const pts = [];
    let crestY=h;
    for(let i=0;i<=N;i++){
      const u=i/N;
      const x=u*w;
      const env = Math.max(0, bandAt(u)); // already smoothed & weighted
      let rise = baseAmp * env;
      if (rise>maxRise) rise=maxRise;
      const y = h - (h*0.10 + rise);
      crestY = Math.min(crestY, y);
      pts.push({x,y});
    }

    // clip shape
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0,h);
    strokeSmooth(ctx, pts);
    ctx.lineTo(w,h);
    ctx.closePath();
    ctx.clip();

    // fill with cross-faded gradients
    const gA=buildGradient(gradA, now/1000, w, h);
    const gB=buildGradient(gradB, now/1000, w, h);
    ctx.globalCompositeOperation='screen';
    ctx.globalAlpha=1-mix; ctx.fillStyle=gA; ctx.fillRect(0,0,w,h);
    ctx.globalAlpha=mix;   ctx.fillStyle=gB; ctx.fillRect(0,0,w,h);

    // gentle bloom to make the edge glow
    ctx.filter='blur(18px)';
    ctx.globalAlpha=0.28;  ctx.fillStyle=gA; ctx.fillRect(0,0,w,h);
    ctx.globalAlpha=0.28*mix; ctx.fillStyle=gB; ctx.fillRect(0,0,w,h);
    ctx.filter='none';
    ctx.globalAlpha=1;

    // ---- Feathered fade to transparent at the TOP (glow-like, no hard cut)
    const fade = ctx.createLinearGradient(0, 0, 0, h);
    const crest = Math.max(0.06, crestY/h);
    const start = Math.max(0, crest - 0.08);             // begin slightly above the crest
    const end   = Math.min(1, start + 0.22);             // wide, smooth feather
    fade.addColorStop(0.00, 'rgba(0,0,0,1)');
    fade.addColorStop(start, 'rgba(0,0,0,1)');
    fade.addColorStop((start+end)/2, 'rgba(0,0,0,0.35)');
    fade.addColorStop(end,   'rgba(0,0,0,0)');

    ctx.globalCompositeOperation='destination-out';
    ctx.filter='blur(16px)';                // <- the “glow” feather
    ctx.fillStyle=fade;
    ctx.fillRect(0,0,w,h);
    ctx.filter='none';
    ctx.globalCompositeOperation='source-over';

    ctx.restore();

    function avg(a,b){ let s=0,c=0; for(let i=a;i<=b;i++){ s+=bands[i].s; c++; } return c? s/c:0; }
  }

  // ===== Lifecycle (first-play delay, hover hide, auto return) =====
  let firstShown=false, runningTimer=null, reShow=null, hoverTimer=null, userHidden=false;

  function start() {
    if (running) return;
    running=true; ensureAudio(); if(!bands) makeBands(); render();
  }
  function stop() {
    running=false; if(raf){ cancelAnimationFrame(raf); raf=null; }
  }
  function showLayer(){ layer.classList.add('on'); }
  function hideLayer(){ layer.classList.remove('on'); }

  function showAfter(ms){
    clearTimeout(runningTimer);
    runningTimer=setTimeout(()=>{ showLayer(); start(); firstShown=true; userHidden=false; }, ms);
  }

  audio.addEventListener('play', () => {
    ensureAudio();
    clearTimeout(runningTimer); clearTimeout(reShow);
    if(!firstShown || userHidden) showAfter(1000); else { showLayer(); start(); }
  });
  ['pause','ended'].forEach(ev => audio.addEventListener(ev, () => {
    clearTimeout(runningTimer); clearTimeout(reShow); stop(); hideLayer();
  }));

  // Hover/touch hide after 2s, auto return after 5s
  const ARM_MS=2000, RETURN_MS=5000;
  function armHide(){
    if (audio.paused) return;
    clearTimeout(hoverTimer);
    hoverTimer=setTimeout(()=>{
      userHidden=true; stop(); hideLayer();
      clearTimeout(reShow);
      if(!audio.paused) reShow=setTimeout(()=> showAfter(0), RETURN_MS);
    }, ARM_MS);
  }
  function cancelHide(){ clearTimeout(hoverTimer); }

  shell.addEventListener('mouseenter', armHide);
  shell.addEventListener('mousemove', armHide);
  shell.addEventListener('mouseleave', cancelHide);
  shell.addEventListener('touchstart', () => {
    if (audio.paused) return;
    userHidden=true; stop(); hideLayer();
    clearTimeout(reShow);
    reShow=setTimeout(()=> showAfter(0), RETURN_MS);
  }, { passive:true });

  // Public: call on auto-next to avoid wait
  window.aurora = {
    instant(){ clearTimeout(runningTimer); clearTimeout(reShow); userHidden=false; firstShown=true; showLayer(); start(); },
    off(){ clearTimeout(runningTimer); clearTimeout(reShow); clearTimeout(hoverTimer); userHidden=false; stop(); hideLayer(); }
  };
})();
