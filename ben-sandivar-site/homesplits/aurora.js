(() => {
  const musicPlayer = document.getElementById('music');
  if (!musicPlayer) return;

  const auroraCanvas = musicPlayer.querySelector('#aurora');
  const auroraLayer  = musicPlayer.querySelector('.aurora-layer');
  const audio        = musicPlayer.querySelector('audio');
  if (!auroraCanvas || !auroraLayer || !audio) return;

  const ctx = auroraCanvas.getContext('2d');

  let acx, srcNode, analyser;
  let rafId = null, overlayOn = false;
  let auroraTimeout = null;
  let auroraManuallyOff = false;

  // Tempo tracking
  let tempoSaturation = 92;
  let lastPeakTime = 0;
  let tempoSamples = [];

  function ensureAudioGraph(){
    if (acx) return;
    acx = new (window.AudioContext || window.webkitAudioContext)();
    srcNode = acx.createMediaElementSource(audio);
    analyser = acx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.65;
    srcNode.connect(analyser);
    analyser.connect(acx.destination);
  }

  function sizeCanvas(){
    const r = auroraLayer.getBoundingClientRect();
    auroraCanvas.width  = Math.max(1, r.width|0);
    auroraCanvas.height = Math.max(1, r.height|0);
  }
  sizeCanvas();
  window.addEventListener('resize', sizeCanvas);

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
    const roll = Math.random();
    if (roll < 0.70) return 4;
    if (roll < 0.90) return 3;
    if (roll < 0.97) return 5;
    return Math.random() < 0.5 ? 6 : 7;
  }

  function loopT(){
    const dt=(performance.now()-t0)/1000;
    return (dt%LOOP_S)/LOOP_S;
  }

  function startAurora(){
    if (overlayOn) return;
    overlayOn = true;
    ensureAudioGraph();
    draw();
  }
  function stopAurora(){
    overlayOn = false;
    if (rafId){ cancelAnimationFrame(rafId); rafId=null; }
    auroraLayer.classList.remove('on');
    if (auroraTimeout) { clearTimeout(auroraTimeout); auroraTimeout = null; }
  }

  audio.addEventListener('play', () => {
    ensureAudioGraph();
    if (auroraTimeout) clearTimeout(auroraTimeout);
    if (auroraManuallyOff) {
      auroraTimeout = setTimeout(() => {
        auroraLayer.classList.add('on');
        startAurora();
      }, 15000);
    } else {
      auroraLayer.classList.add('on');
      startAurora();
    }
  });
  audio.addEventListener('pause', stopAurora);
  audio.addEventListener('ended', stopAurora);

  function bandAverages(arr){
    const nyq = acx.sampleRate/2;
    const idx = hz => Math.min(arr.length-1, Math.max(0, Math.round(arr.length*(hz/nyq)))); 
    const avg = (lo,hi)=>{ let s=0,c=0; for(let i=lo;i<=hi;i++){ s+=arr[i]; c++; } return c? s/c : 0; };
    return { bass: avg(idx(20),idx(140)), mid: avg(idx(300),idx(2000)), treb: avg(idx(4000),idx(12000)) };
  }
  const smooth = { bass:0, mid:0, treb:0 };
  const lerp = (a,b,t)=> a+(b-a)*t;

  function buildGradient(phase, tGlobal, w, h){
    const drift = Math.sin(tGlobal*2*Math.PI/1800) * (10*Math.PI/180);
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
      g.addColorStop(f, `hsla(${hue}, ${tempoSaturation}%, 55%, 0.96)`);
      if(i<n-1){
        const mid = f + (1/(n-1))*0.5;
        const hue2 = (hue + 24) % 360;
        g.addColorStop(mid, `hsla(${hue2}, ${tempoSaturation-4}%, 56%, 0.90)`);
      }
    }
    return g;
  }

  function draw(){
    if(!overlayOn) return;
    rafId=requestAnimationFrame(draw);
    sizeCanvas();

    const w=auroraCanvas.width, h=auroraCanvas.height;
    ctx.clearRect(0,0,w,h);

    const fd = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(fd);
    const bd = bandAverages(fd);

    smooth.bass = lerp(smooth.bass, bd.bass/255, 0.28);
    smooth.mid  = lerp(smooth.mid,  bd.mid/255,  0.24);
    smooth.treb = lerp(smooth.treb, bd.treb/255, 0.22);

    // Tempo saturation adjust
    const rms = (smooth.bass + smooth.mid + smooth.treb) / 3;
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
        tempoSaturation = 88 + Math.min(10, Math.max(-8, (bpm - 100) / 5));
      }
    }

    // phase crossfade
    const now = performance.now();
    let mix = (now - phaseStart) / PHASE_MS;
    if (mix >= 1){
      gradA = gradB;
      gradB = makePhase();
      phaseStart = now;
      mix = 0;
    }

    const tL = loopT();
    const kx = 2*Math.PI/Math.max(360,w);
    const ph = tL*2*Math.PI*0.8;
    const energy = 0.55*smooth.bass + 0.35*smooth.mid + 0.10*smooth.treb;
    const baseAmp = h * 0.22;
    const maxRise = h * 0.75; // 75% height max

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0,h);
    const steps=150;
    for(let i=0;i<=steps;i++){
      const x=(i/steps)*w;
      const yWave =
        Math.sin(kx*x + ph)            * (0.55 + 0.30*smooth.mid)  +
        Math.sin(kx*1.8*x + ph*1.15)   * (0.30 + 0.30*smooth.treb) +
        Math.sin(kx*3.4*x + ph*0.9)    * (0.22 + 0.20*smooth.treb);
      let rise = (baseAmp + energy*h*0.5*yWave);
      rise = Math.min(rise, maxRise);
      const y = h - (h*0.10 + rise);
      ctx.lineTo(x,y);
    }
    ctx.lineTo(w,h); ctx.closePath();
    ctx.clip();

    const gA = buildGradient(gradA, now/1000, w, h);
    const gB = buildGradient(gradB, now/1000, w, h);
    ctx.globalCompositeOperation='screen';
    ctx.globalAlpha = 1 - mix; ctx.fillStyle = gA; ctx.fillRect(0,0,w,h);
    ctx.globalAlpha = mix;     ctx.fillStyle = gB; ctx.fillRect(0,0,w,h);

    // fade to transparent at top
    const fade = ctx.createLinearGradient(0, 0, 0, h);
    fade.addColorStop(0.00, 'rgba(0,0,0,0)');
    fade.addColorStop(0.25, 'rgba(0,0,0,0.05)');
    fade.addColorStop(0.5, 'rgba(0,0,0,0.5)');
    fade.addColorStop(1.0, 'rgba(0,0,0,1)');
    ctx.globalCompositeOperation='destination-out';
    ctx.fillStyle=fade;
    ctx.fillRect(0,0,w,h);

    ctx.restore();
  }

  // Hover/tap fade-out
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

  window.aurora = {
    instant(){
      if (auroraTimeout) { clearTimeout(auroraTimeout); auroraTimeout = null; }
      auroraLayer.classList.add('on');
      startAurora();
    },
    off: stopAurora
  };
})();
