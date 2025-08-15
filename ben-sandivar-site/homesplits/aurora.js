(() => {
  const musicPlayer = document.getElementById('music');
  if (!musicPlayer) return;

  const auroraCanvas = musicPlayer.querySelector('#aurora');
  const auroraLayer  = musicPlayer.querySelector('.aurora-layer');
  const audio        = musicPlayer.querySelector('audio');
  const shell        = musicPlayer.querySelector('.music-shell');
  if (!auroraCanvas || !auroraLayer || !audio || !shell) return;

  const ctx = auroraCanvas.getContext('2d');

  // Offscreen mask for FEATHERED TOP FADE (glow-like)
  const maskCanvas = document.createElement('canvas');
  const maskCtx = maskCanvas.getContext('2d');

  // ------- Audio graph -------
  let acx, srcNode, analyser;
  let rafId = null, overlayOn = false;
  let showDelayTimer = null, autoReactivateTimer = null, hoverTimer = null;

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

  // ------- Size -------
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
  window.addEventListener('resize', sizeCanvas);

  // ------- 10-min color loop -------
  const LOOP_S = 600;
  let t0 = performance.now();

  const PHASE_MS = 45000;
  let phaseStart = performance.now();
  let gradA = makePhase();
  let gradB = makePhase();

  function makePhase(){
    return {
      seed: Math.random()*360,
      n: pickCount(),
      ang: (Math.random()*6-3) * Math.PI/180,
      offset: Math.random()*1000
    };
  }
  function pickCount(){
    const r = Math.random();
    if (r < 0.50) return 5;
    if (r < 0.85) return 3;
    return 7;
  }
  function loopT(){
    const dt = (performance.now()-t0)/1000;
    return (dt%LOOP_S)/LOOP_S;
  }

  function buildGradient(phase, tGlobal, w, h){
    const drift = Math.sin(tGlobal*2*Math.PI/1800) * (8*Math.PI/180);
    const ang = phase.ang + drift;

    const r = Math.hypot(w,h);
    const cx=w/2, cy=h*0.65;
    const x0=cx - Math.cos(ang)*r/2, y0=cy - Math.sin(ang)*r/2;
    const x1=cx + Math.cos(ang)*r/2, y1=cy + Math.sin(ang)*r/2;

    const g = ctx.createLinearGradient(x0,y0,x1,y1);
    const n = phase.n;
    for(let i=0;i<n;i++){
      const f = i/(n-1 || 1);
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

  // ------- 12-band reactive shape (3 low, 9 mid) -------
  const lowBands = 3;
  const midBands = 9;
  const totalBands = lowBands + midBands;

  const LOW_MIN = 20,  LOW_MAX = 200;
  const MID_MIN = 200, MID_MAX = 8000;

  const LOW_WEIGHT = 0.45;
  const MID_WEIGHT = 1.0;

  const fd = new Uint8Array(1024);
  const bandSmooth = new Array(totalBands).fill(0);

  function hzToIndex(hz, fftSize, sampleRate){
    const nyq = sampleRate/2;
    const idx = Math.round((hz/nyq) * (fftSize/2));
    return Math.max(0, Math.min(idx, (fftSize/2)-1));
  }
  function computeBands(){
    analyser.getByteFrequencyData(fd);
    const sr = acx.sampleRate;
    const fft = analyser.fftSize;

    const idx = hz => hzToIndex(hz, fft, sr);
    const avg = (lo,hi)=>{
      let s=0,c=0;
      for(let i=lo;i<=hi;i++){ s+=fd[i]; c++; }
      return c ? (s/c)/255 : 0;
    };

    const bands = [];

    // 3 lows (log-ish)
    const lowEdges = [LOW_MIN, 60, 120, LOW_MAX];
    for (let b=0;b<lowBands;b++){
      const v = avg(idx(lowEdges[b]), idx(lowEdges[b+1])) * LOW_WEIGHT;
      bands.push(v);
    }

    // 9 mids (log-ish)
    const midEdges = [200, 350, 500, 750, 1100, 1600, 2300, 3300, 4700, 8000];
    for (let b=0;b<midBands;b++){
      const v = avg(idx(midEdges[b]), idx(midEdges[b+1])) * MID_WEIGHT;
      bands.push(v);
    }

    // Gentle temporal smooth
    for (let i=0;i<totalBands;i++){
      bandSmooth[i] += (bands[i] - bandSmooth[i]) * 0.28;
    }
    return bandSmooth;
  }

  // ------- Catmull–Rom spline (no angles, no straight segments) -------
  function catmullRomSpline(points, segmentsPerSpan = 18){
    if (points.length < 2) return points;
    const out = [];
    const pts = [points[0], ...points, points[points.length-1]];
    for (let i=0;i<pts.length-3;i++){
      const p0=pts[i], p1=pts[i+1], p2=pts[i+2], p3=pts[i+3];
      for (let j=0;j<=segmentsPerSpan;j++){
        const t=j/segmentsPerSpan, t2=t*t, t3=t2*t;
        const x = 0.5*((2*p1.x)+(-p0.x+p2.x)*t+(2*p0.x-5*p1.x+4*p2.x-p3.x)*t2+(-p0.x+3*p1.x-3*p2.x+p3.x)*t3);
        const y = 0.5*((2*p1.y)+(-p0.y+p2.y)*t+(2*p0.y-5*p1.y+4*p2.y-p3.y)*t2+(-p0.y+3*p1.y-3*p2.y+p3.y)*t3);
        out.push({x,y});
      }
    }
    return out;
  }

  // ------- Draw -------
  function startAurora(){
    if (overlayOn) return;
    overlayOn = true;
    ensureAudioGraph();
    draw();
  }
  function stopAurora(){
    overlayOn = false;
    if (rafId){ cancelAnimationFrame(rafId); rafId=null; }
    auroraLayer.classList.remove('on'); // CSS opacity fade
    if (showDelayTimer){ clearTimeout(showDelayTimer); showDelayTimer=null; }
  }

  function draw(){
    if (!overlayOn) return;
    rafId = requestAnimationFrame(draw);
    sizeCanvas();

    const w = auroraCanvas.width, h = auroraCanvas.height;
    ctx.clearRect(0,0,w,h);

    // Color morph crossfade
    const now = performance.now();
    let mix = (now - phaseStart) / PHASE_MS;
    if (mix >= 1){
      gradA = gradB; gradB = makePhase(); phaseStart = now; mix = 0;
    }
    const gA = buildGradient(gradA, now/1000, w, h);
    const gB = buildGradient(gradB, now/1000, w, h);

    // Band-driven crest points
    const bands = computeBands();

    const maxRise = 0.75 * h; // up to 75%
    const baseFloor = 0.08 * h;

    const pts = [];
    for (let i=0;i<totalBands;i++){
      const x = (i/(totalBands-1)) * w;
      const v = bands[i];
      const left  = bands[Math.max(0, i-1)];
      const right = bands[Math.min(totalBands-1, i+1)];
      const blended = (v*0.7 + (left+right)*0.15); // neighbor blend
      const rise = Math.min(maxRise, baseFloor + blended * (maxRise - baseFloor));
      const y = h - (0.10*h + rise);
      pts.push({x,y});
    }
    const crest = catmullRomSpline(pts, 20);

    // Fill area under crest
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0,h);
    for (let i=0;i<crest.length;i++){
      const p = crest[i];
      ctx.lineTo(p.x, p.y);
    }
    ctx.lineTo(w,h);
    ctx.closePath();
    ctx.clip();

    // 97% opacity fill + subtle tie-in blur
    const baseAlpha = 0.97;
    ctx.globalCompositeOperation='screen';
    ctx.globalAlpha = baseAlpha * (1 - mix);
    ctx.fillStyle = gA; ctx.fillRect(0,0,w,h);
    ctx.globalAlpha = baseAlpha * (mix);
    ctx.fillStyle = gB; ctx.fillRect(0,0,w,h);

    ctx.globalAlpha = baseAlpha * 0.35;
    ctx.filter = 'blur(4px)';
    ctx.fillStyle = gA; ctx.fillRect(0,0,w,h);
    ctx.globalAlpha = baseAlpha * 0.35 * mix;
    ctx.fillStyle = gB; ctx.fillRect(0,0,w,h);
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    ctx.restore();

    // ---------- TOP EDGE: GLOW + BLURRED FADE-OUT (no hard transition) ----------
    // 1) soft crest glow (subtle)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowBlur = 28;
    ctx.shadowColor = 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    for (let i=0;i<crest.length;i++){
      const p = crest[i];
      if (i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y);
    }
    ctx.lineWidth = 22;
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.stroke();
    ctx.restore();

    // 2) build area ABOVE crest into offscreen mask, then blur-erase it
    maskCtx.clearRect(0,0,w,h);
    maskCtx.beginPath();
    maskCtx.moveTo(0,0);
    maskCtx.lineTo(w,0);
    for (let i=crest.length-1;i>=0;i--){
      const p = crest[i];
      maskCtx.lineTo(p.x, p.y);
    }
    maskCtx.closePath();
    maskCtx.fillStyle = '#000'; // solid mask to subtract
    maskCtx.fill();

    // Blur-erase (destination-out) → perfectly feathered to transparent above crest
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.filter = 'blur(34px)'; // ← adjust softness of fade edge
    ctx.drawImage(maskCanvas, 0, 0);
    ctx.filter = 'none';
    ctx.restore();
  }

  // ------- Show/hide policy -------
  function scheduleShowAfter(ms){
    if (showDelayTimer) clearTimeout(showDelayTimer);
    showDelayTimer = setTimeout(() => {
      auroraLayer.classList.add('on');
      startAurora();
    }, ms);
  }

  function manualOff(){
    stopAurora();
    if (autoReactivateTimer) clearTimeout(autoReactivateTimer);
    if (!audio.paused){
      autoReactivateTimer = setTimeout(() => {
        auroraLayer.classList.add('on');
        startAurora();
      }, 15000);
    }
  }

  // First play/resume by user → wait 15s
  audio.addEventListener('play', () => { ensureAudioGraph(); scheduleShowAfter(15000); });
  audio.addEventListener('pause', () => { stopAurora(); if (autoReactivateTimer) { clearTimeout(autoReactivateTimer); autoReactivateTimer=null; } });
  audio.addEventListener('ended', () => { stopAurora(); if (autoReactivateTimer) { clearTimeout(autoReactivateTimer); autoReactivateTimer=null; } });

  // Hover inside player for 3s → turn off (then auto-reactivate after 15s if still playing)
  function startHoverWatch(){
    if (hoverTimer) return;
    let enteredAt = Date.now();
    hoverTimer = setInterval(() => {
      if (Date.now() - enteredAt >= 3000){
        clearInterval(hoverTimer); hoverTimer=null;
        manualOff();
      }
    }, 100);
    const reset = () => { enteredAt = Date.now(); };
    shell.addEventListener('pointermove', reset, { passive:true, capture:true });
    const stop = () => {
      clearInterval(hoverTimer); hoverTimer=null;
      shell.removeEventListener('pointermove', reset, { capture:true });
      shell.removeEventListener('pointerleave', stop,  { capture:true });
    };
    shell.addEventListener('pointerleave', stop, { passive:true, capture:true });
  }
  shell.addEventListener('pointerenter', () => {
    if (overlayOn && auroraLayer.classList.contains('on')) startHoverWatch();
  }, { passive:true });

  // Hooks for your player (autoplay next → instant on)
  window.aurora = {
    instant(){
      if (showDelayTimer){ clearTimeout(showDelayTimer); showDelayTimer=null; }
      if (autoReactivateTimer){ clearTimeout(autoReactivateTimer); autoReactivateTimer=null; }
      auroraLayer.classList.add('on');
      startAurora();
    },
    off(){ manualOff(); }
  };
  // Back-compat aliases
  window.__auroraFadeIn  = () => window.aurora.instant();
  window.__auroraFadeOut = () => window.aurora.off();
})();
