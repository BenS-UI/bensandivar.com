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
  const maskCanvas = document.createElement('canvas');
  const maskCtx = maskCanvas.getContext('2d');

  const BASE_ALPHA = 0.92;
  const EDGE_BLUR  = 180;
  const GLOW_BLUR  = 90;
  const GLOW_WIDTH = 28;
  const LOW_WEIGHT = 0.45;
  const MID_WEIGHT = 1.0;
  const SMOOTH_LERP = 0.25;

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

  function sizeCanvas(){
    const r = auroraLayer.getBoundingClientRect();
    auroraCanvas.width = maskCanvas.width = Math.max(1, r.width|0);
    auroraCanvas.height = maskCanvas.height = Math.max(1, r.height|0);
  }
  sizeCanvas();
  addEventListener('resize', sizeCanvas);

  const PHASE_MS = 45000;
  let gradA = makePhase();
  let gradB = makePhase();
  let phaseStart = performance.now();

  function makePhase(){
    return { seed: Math.random()*360, n: 4, ang: (Math.random()*6-3) * Math.PI/180 };
  }

  function buildGradient(phase, tGlobal, w, h){
    const ang = phase.ang;
    const r = Math.hypot(w,h), cx=w/2, cy=h*0.65;
    const x0=cx - Math.cos(ang)*r/2, y0=cy - Math.sin(ang)*r/2;
    const x1=cx + Math.cos(ang)*r/2, y1=cy + Math.sin(ang)*r/2;
    const g = ctx.createLinearGradient(x0,y0,x1,y1);
    const n = phase.n;
    for (let i=0;i<n;i++){
      const f = i/(n-1||1);
      const hue = (phase.seed + i*(360/n)) % 360;
      g.addColorStop(f, `hsla(${hue}, 95%, 60%, 1)`);
    }
    return g;
  }

  const lowBands = 3, midBands = 9, totalBands = lowBands + midBands;
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
    const lows = [20, 60, 120, 200];
    const mids = [200, 350, 500, 750, 1100, 1600, 2300, 3300, 4700, 8000];
    const tmp = [];
    for (let b=0;b<lowBands;b++) tmp.push(avgRange(hzToIdx(lows[b],fft,sr), hzToIdx(lows[b+1],fft,sr), fd) * LOW_WEIGHT);
    for (let b=0;b<midBands;b++) tmp.push(avgRange(hzToIdx(mids[b],fft,sr), hzToIdx(mids[b+1],fft,sr), fd) * MID_WEIGHT);
    for (let i=0;i<totalBands;i++) bandSmooth[i] += (tmp[i]-bandSmooth[i]) * SMOOTH_LERP;
    return bandSmooth;
  }

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

  let rafId=null, overlayOn=false;
  function startAurora(){ if (overlayOn) return; overlayOn=true; ensureAudioGraph(); draw(); }
  function stopAurora(){ overlayOn=false; if (rafId){ cancelAnimationFrame(rafId); rafId=null; } auroraLayer.classList.remove('on'); }

  function draw(){
    if (!overlayOn) return;
    rafId = requestAnimationFrame(draw);
    sizeCanvas();
    const w=auroraCanvas.width, h=auroraCanvas.height;
    ctx.clearRect(0,0,w,h);

    const now = performance.now();
    let mix = (now - phaseStart)/PHASE_MS;
    if (mix>=1){ gradA=gradB; gradB=makePhase(); phaseStart=now; mix=0; }
    const gA = buildGradient(gradA, now/1000, w, h);
    const gB = buildGradient(gradB, now/1000, w, h);

    const bands = computeBands();
    const maxRise = 0.75*h, baseFloor = 0.08*h;
    const anchors = [];
    for (let i=0;i<totalBands;i++){
      const x = (i/(totalBands-1))*w;
      const v = bands[i];
      const left=bands[Math.max(0,i-1)], right=bands[Math.min(totalBands-1,i+1)];
      const local = v*0.7 + (left+right)*0.15;
      const rise = Math.min(maxRise, baseFloor + local*(maxRise-baseFloor));
      anchors.push({x, y: h - (0.10*h + rise)});
    }
    const crest = catmull(anchors, 40);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0,h);
    crest.forEach(p=>ctx.lineTo(p.x,p.y));
    ctx.lineTo(w,h); ctx.closePath(); ctx.clip();

    ctx.globalCompositeOperation='screen';
    ctx.globalAlpha = BASE_ALPHA*(1-mix); ctx.fillStyle=gA; ctx.fillRect(0,0,w,h);
    ctx.globalAlpha = BASE_ALPHA*mix; ctx.fillStyle=gB; ctx.fillRect(0,0,w,h);

    ctx.filter='blur(100px)';
    ctx.globalAlpha = 0.7;
    ctx.fillStyle=gA; ctx.fillRect(0,0,w,h);
    ctx.fillStyle=gB; ctx.fillRect(0,0,w,h);
    ctx.filter='none';
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation='lighter';
    ctx.shadowBlur = GLOW_BLUR;
    ctx.shadowColor = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    crest.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
    ctx.lineWidth = GLOW_WIDTH;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.stroke();
    ctx.restore();

    maskCtx.clearRect(0,0,w,h);
    maskCtx.beginPath();
    maskCtx.moveTo(0,0); maskCtx.lineTo(w,0);
    for (let i=crest.length-1;i>=0;i--) maskCtx.lineTo(crest[i].x, crest[i].y);
    maskCtx.closePath();
    maskCtx.fillStyle = '#000';
    maskCtx.fill();

    ctx.save();
    ctx.globalCompositeOperation='destination-out';
    ctx.filter = `blur(${EDGE_BLUR}px)`;
    ctx.drawImage(maskCanvas, 0, 0);
    ctx.filter = 'none';
    ctx.restore();
  }

  audio.addEventListener('play', ()=>{ ensureAudioGraph(); setTimeout(()=>{ auroraLayer.classList.add('on'); startAurora(); }, 15000); });
  audio.addEventListener('pause', stopAurora);
  audio.addEventListener('ended', stopAurora);
  window.aurora = { instant(){ auroraLayer.classList.add('on'); startAurora(); }, off(){ stopAurora(); } };
})();
</script>
