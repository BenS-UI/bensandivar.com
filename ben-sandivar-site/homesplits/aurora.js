<script>
(() => {
  const musicPlayer = document.getElementById('music');
  if (!musicPlayer) return;

  const auroraCanvas = musicPlayer.querySelector('#aurora');
  const auroraLayer  = musicPlayer.querySelector('.aurora-layer');
  const audio        = musicPlayer.querySelector('audio');
  const shell        = musicPlayer.querySelector('.music-shell');
  if (!auroraCanvas || !auroraLayer || !audio || !shell) return;

  const ctx = auroraCanvas.getContext('2d');

  // Offscreen canvas for feathered TOP fade (blurred subtractive mask)
  const maskCanvas = document.createElement('canvas');
  const maskCtx = maskCanvas.getContext('2d');

  /* ---------------- Tunables ---------------- */
  const BASE_ALPHA = 0.97;      // overall fill opacity
  const EDGE_BLUR  = 110;       // px blur for the top fade (bigger = softer)
  const GLOW_BLUR  = 40;        // crest glow
  const GLOW_WIDTH = 22;        // crest glow thickness
  const LOW_WEIGHT = 0.45;      // lows are less reactive
  const MID_WEIGHT = 1.00;      // mids carry the body
  const SMOOTH_LERP = 0.28;     // temporal smoothing per band
  const HOVER_OFF_MS = 3000;    // hover inside player before hiding
  const AUTO_BACK_MS = 15000;   // come back after this if still playing
  /* ------------------------------------------ */

  /* ---------- Audio graph ---------- */
  let acx, srcNode, analyser;
  function ensureAudioGraph(){
    if (acx) return;
    acx = new (window.AudioContext || window.webkitAudioContext)();
    srcNode = acx.createMediaElementSource(audio);
    analyser = acx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.55;
    srcNode.connect(analyser);
    analyser.connect(acx.destination);
  }

  /* ---------- Sizing ---------- */
  function sizeCanvas(){
    const r = auroraLayer.getBoundingClientRect();
    const w = Math.max(1, r.width|0);
    const h = Math.max(1, r.height|0);
    if (auroraCanvas.width !== w) auroraCanvas.width = w;
    if (auroraCanvas.height !== h) auroraCanvas.height = h;
    if (maskCanvas.width !== w) maskCanvas.width = w;
    if (maskCanvas.height !== h) maskCanvas.height = h;
  }
  sizeCanvas();
  addEventListener('resize', sizeCanvas);

  /* ---------- 10-minute rainbow morph ---------- */
  const LOOP_S = 600;
  let t0 = performance.now();

  const PHASE_MS = 45000;
  let phaseStart = performance.now();
  let gradA = makePhase();
  let gradB = makePhase();

  function makePhase(){
    return {
      seed: Math.random()*360,
      n: (Math.random()<0.6?5:(Math.random()<0.85?3:7)), // 3 / 5 / 7 stops
      ang: (Math.random()*6-3) * Math.PI/180,
      offset: Math.random()*1000
    };
  }
  function loopT(){ const dt=(performance.now()-t0)/1000; return (dt%LOOP_S)/LOOP_S; }

  function buildGradient(phase, tGlobal, w, h){
    const drift = Math.sin(tGlobal*2*Math.PI/1800) * (8*Math.PI/180);
    const ang = phase.ang + drift;
    const r = Math.hypot(w,h), cx=w/2, cy=h*0.65;
    const x0=cx - Math.cos(ang)*r/2, y0=cy - Math.sin(ang)*r/2;
    const x1=cx + Math.cos(ang)*r/2, y1=cy + Math.sin(ang)*r/2;

    const g = ctx.createLinearGradient(x0,y0,x1,y1);
    const n = phase.n;
    for (let i=0;i<n;i++){
      const f = i/(n-1||1);
      const hue = (phase.seed + i*(360/n) + 36*Math.sin(2*Math.PI*(tGlobal/LOOP_S + phase.offset + i*0.09))) % 360;
      g.addColorStop(f, `hsl(${hue} 92% 55%)`);
      if (i<n-1){
        const mid = f + (1/(n-1))*0.5;
        const hue2 = (hue + 20) % 360;
        g.addColorStop(mid, `hsl(${hue2} 88% 56%)`);
      }
    }
    return g;
  }

  /* ---------- 12 bands: 3 lows + 9 mids ---------- */
  const lowBands = 3, midBands = 9, totalBands = lowBands + midBands;
  const LOW_MIN=20, LOW_MAX=200, MID_MIN=200, MID_MAX=8000;

  const fd = new Uint8Array(1024);
  const bandSmooth = new Array(totalBands).fill(0);

  function hzToIdx(hz, fftSize, sr){
    const nyq=sr/2; return Math.max(0, Math.min(Math.round((hz/nyq)*(fftSize/2)), (fftSize/2)-1));
  }
  function avgRange(lo, hi, arr){
    let s=0,c=0; for(let i=lo;i<=hi;i++){ s+=arr[i]; c++; } return c? (s/c)/255 : 0;
  }
  function computeBands(){
    analyser.getByteFrequencyData(fd);
    const sr=acx.sampleRate, fft=analyser.fftSize;

    const lows = [LOW_MIN, 60, 120, LOW_MAX];
    const mids = [200, 350, 500, 750, 1100, 1600, 2300, 3300, 4700, 8000];

    const tmp = [];
    for (let b=0;b<lowBands;b++){
      const v = avgRange(hzToIdx(lows[b],fft,sr), hzToIdx(lows[b+1],fft,sr), fd) * LOW_WEIGHT;
      tmp.push(v);
    }
    for (let b=0;b<midBands;b++){
      const v = avgRange(hzToIdx(mids[b],fft,sr), hzToIdx(mids[b+1],fft,sr), fd) * MID_WEIGHT;
      tmp.push(v);
    }
    for (let i=0;i<totalBands;i++){
      bandSmooth[i] += (tmp[i]-bandSmooth[i]) * SMOOTH_LERP; // temporal smooth
    }
    return bandSmooth;
  }

  /* ---------- Catmull–Rom (smooth curve; no angles) ---------- */
  function catmull(points, segs=36){
    if (points.length<2) return points;
    const out=[], pts=[points[0],...points,points[points.length-1]];
    for (let i=0;i<pts.length-3;i++){
      const p0=pts[i], p1=pts[i+1], p2=pts[i+2], p3=pts[i+3];
      for (let j=0;j<=segs;j++){
        const t=j/segs, t2=t*t, t3=t2*t;
        out.push({
          x:0.5*((2*p1.x)+(-p0.x+p2.x)*t + (2*p0.x-5*p1.x+4*p2.x-p3.x)*t2 + (-p0.x+3*p1.x-3*p2.x+p3.x)*t3),
          y:0.5*((2*p1.y)+(-p0.y+p2.y)*t + (2*p0.y-5*p1.y+4*p2.y-p3.y)*t2 + (-p0.y+3*p1.y-3*p2.y+p3.y)*t3)
        });
      }
    }
    return out;
  }

  /* ---------- Draw ---------- */
  let rafId=null, overlayOn=false;
  let showDelayTimer=null, autoBackTimer=null, hoverTimer=null;

  function startAurora(){
    if (overlayOn) return; overlayOn=true; ensureAudioGraph(); draw();
  }
  function stopAurora(){
    overlayOn=false;
    if (rafId){ cancelAnimationFrame(rafId); rafId=null; }
    auroraLayer.classList.remove('on');
    if (showDelayTimer){ clearTimeout(showDelayTimer); showDelayTimer=null; }
  }

  function draw(){
    if (!overlayOn) return;
    rafId = requestAnimationFrame(draw);
    sizeCanvas();

    const w=auroraCanvas.width, h=auroraCanvas.height;
    ctx.clearRect(0,0,w,h);

    // Color phase
    const now = performance.now();
    let mix = (now - phaseStart)/PHASE_MS;
    if (mix>=1){ gradA=gradB; gradB=makePhase(); phaseStart=now; mix=0; }
    const gA = buildGradient(gradA, now/1000, w, h);
    const gB = buildGradient(gradB, now/1000, w, h);

    // Band crest points (12 anchors → dense smooth curve)
    const bands = computeBands();
    const maxRise = 0.75*h, baseFloor = 0.08*h;

    const anchors = [];
    for (let i=0;i<totalBands;i++){
      const x = (i/(totalBands-1))*w;
      const v = bands[i];
      // neighbor blend for locality (pre-smooth)
      const left=bands[Math.max(0,i-1)], right=bands[Math.min(totalBands-1,i+1)];
      const local = v*0.7 + (left+right)*0.15;
      const rise = Math.min(maxRise, baseFloor + local*(maxRise-baseFloor));
      const y = h - (0.10*h + rise);
      anchors.push({x,y});
    }
    const crest = catmull(anchors, 40); // very smooth

    // Clip and fill under crest
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0,h);
    for (let i=0;i<crest.length;i++){ const p=crest[i]; ctx.lineTo(p.x,p.y); }
    ctx.lineTo(w,h); ctx.closePath(); ctx.clip();

    // Fill (screen) at 97% + light blur tie-in
    ctx.globalCompositeOperation='screen';
    ctx.globalAlpha = BASE_ALPHA*(1-mix); ctx.fillStyle=gA; ctx.fillRect(0,0,w,h);
    ctx.globalAlpha = BASE_ALPHA*mix;     ctx.fillStyle=gB; ctx.fillRect(0,0,w,h);

    ctx.globalAlpha = BASE_ALPHA*0.35;
    ctx.filter='blur(6px)'; ctx.fillStyle=gA; ctx.fillRect(0,0,w,h);
    ctx.globalAlpha = BASE_ALPHA*0.35*mix; ctx.fillStyle=gB; ctx.fillRect(0,0,w,h);
    ctx.filter='none'; ctx.globalAlpha=1;
    ctx.restore();

    // Crest glow (luminous edge)
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    ctx.shadowBlur = GLOW_BLUR;
    ctx.shadowColor = 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    for (let i=0;i<crest.length;i++){ const p=crest[i]; i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y); }
    ctx.lineWidth = GLOW_WIDTH;
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.stroke();
    ctx.restore();

    // TOP FADE: build "above crest" mask → heavy blur → destination-out
    maskCtx.clearRect(0,0,w,h);
    maskCtx.beginPath();
    maskCtx.moveTo(0,0); maskCtx.lineTo(w,0);
    for (let i=crest.length-1;i>=0;i--){ const p=crest[i]; maskCtx.lineTo(p.x,p.y); }
    maskCtx.closePath();
    maskCtx.fillStyle = '#000'; // opaque mask
    maskCtx.fill();

    ctx.save();
    ctx.globalCompositeOperation='destination-out';
    ctx.filter = `blur(${EDGE_BLUR}px)`; // feather the edge
    ctx.drawImage(maskCanvas, 0, 0);
    ctx.filter = 'none';
    ctx.restore();
  }

  /* ---------- Show/Hide policy ---------- */
  function scheduleShow(ms){
    if (showDelayTimer) clearTimeout(showDelayTimer);
    showDelayTimer = setTimeout(()=>{ auroraLayer.classList.add('on'); startAurora(); }, ms);
  }
  function manualOff(){
    stopAurora();
    if (autoBackTimer) clearTimeout(autoBackTimer);
    if (!audio.paused){
      autoBackTimer = setTimeout(()=>{ auroraLayer.classList.add('on'); startAurora(); }, AUTO_BACK_MS);
    }
  }

  // First user play / resume → wait 15s
  audio.addEventListener('play', ()=>{ ensureAudioGraph(); scheduleShow(1000); });
  audio.addEventListener('pause', ()=>{ stopAurora(); if (autoBackTimer){ clearTimeout(autoBackTimer); autoBackTimer=null; } });
  audio.addEventListener('ended', ()=>{ stopAurora(); if (autoBackTimer){ clearTimeout(autoBackTimer); autoBackTimer=null; } });

  // 3s hover INSIDE the player → hide; auto-return after 15s if still playing
  shell.addEventListener('pointerenter', () => {
    if (!overlayOn || !auroraLayer.classList.contains('on')) return;
    let t0 = performance.now();
    const reset = () => { t0 = performance.now(); };
    const tick = () => {
      if (!hoverTimer) return;
      if (performance.now()-t0 >= HOVER_OFF_MS){ clearInterval(hoverTimer); hoverTimer=null; manualOff(); }
    };
    if (hoverTimer) clearInterval(hoverTimer);
    hoverTimer = setInterval(tick, 120);
    shell.addEventListener('pointermove', reset, { passive:true, capture:true });
    const stop = () => { clearInterval(hoverTimer); hoverTimer=null;
      shell.removeEventListener('pointermove', reset, { capture:true });
      shell.removeEventListener('pointerleave', stop,  { capture:true });
    };
    shell.addEventListener('pointerleave', stop, { passive:true, capture:true });
  }, { passive:true });

  // Hooks for your player (next track autoplay → IMMEDIATE on)
  window.aurora = {
    instant(){
      if (showDelayTimer){ clearTimeout(showDelayTimer); showDelayTimer=null; }
      if (autoBackTimer){ clearTimeout(autoBackTimer); autoBackTimer=null; }
      auroraLayer.classList.add('on'); startAurora();
    },
    off(){ manualOff(); }
  };
  // Back-compat
  window.__auroraFadeIn  = () => window.aurora.instant();
  window.__auroraFadeOut = () => window.aurora.off();
})();
<script>