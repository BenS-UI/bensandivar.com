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
  let reactivateTimer = null;

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
    auroraCanvas.width  = Math.max(1, r.width|0);
    auroraCanvas.height = Math.max(1, r.height|0);
  }
  sizeCanvas();
  window.addEventListener('resize', sizeCanvas);

  const LOOP_S = 600;
  let t0 = performance.now();

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

  function scheduleAuroraStart(delay=15000){
    if (auroraTimeout) clearTimeout(auroraTimeout);
    auroraTimeout = setTimeout(() => {
      auroraLayer.classList.add('on');
      startAurora();
    }, delay);
  }

  audio.addEventListener('play', () => {
    ensureAudioGraph();
    if (auroraManuallyOff) {
      scheduleAuroraStart(15000);
    } else {
      scheduleAuroraStart(15000);
    }
  });
  audio.addEventListener('pause', stopAurora);
  audio.addEventListener('ended', stopAurora);

  const lerp = (a,b,t)=> a+(b-a)*t;

  function draw(){
    if(!overlayOn) return;
    rafId=requestAnimationFrame(draw);
    sizeCanvas();

    const w=auroraCanvas.width, h=auroraCanvas.height;
    ctx.clearRect(0,0,w,h);

    // Get frequency data
    const fd = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(fd);

    // Split into ~12 bands
    const bands = 12;
    const bandVals = new Array(bands).fill(0);
    const step = Math.floor(fd.length / bands);
    for (let b = 0; b < bands; b++) {
      let sum = 0;
      for (let i = b*step; i < (b+1)*step; i++) sum += fd[i];
      bandVals[b] = sum / step / 255;
    }

    // Smooth curve from bands
    const smoothBands = [];
    for (let i = 0; i < bands; i++) {
      const prev = bandVals[i-1] || bandVals[i];
      const next = bandVals[i+1] || bandVals[i];
      smoothBands[i] = (prev + bandVals[i] + next) / 3;
    }

    const maxRise = h * 0.75;
    const baseHeight = h * 0.1;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0,h);
    const steps = 200;
    for (let i = 0; i <= steps; i++) {
      const pos = i / steps * (bands-1);
      const idx = Math.floor(pos);
      const frac = pos - idx;
      const val = lerp(smoothBands[idx], smoothBands[idx+1] || smoothBands[idx], frac);
      const rise = baseHeight + val * maxRise;
      ctx.lineTo((i/steps)*w, h - rise);
    }
    ctx.lineTo(w,h);
    ctx.closePath();
    ctx.clip();

    // Fixed opacity aurora fill
    const g = ctx.createLinearGradient(0,h,0,0);
    g.addColorStop(0, 'hsla(180,90%,55%,0.85)');
    g.addColorStop(1, 'hsla(260,90%,55%,0.85)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.fillRect(0,0,w,h);

    // Soft glow fade at top
    const fadeTop = ctx.createLinearGradient(0, 0, 0, h);
    fadeTop.addColorStop(0.0, 'rgba(0,0,0,0)');
    fadeTop.addColorStop(0.2, 'rgba(0,0,0,0.1)');
    fadeTop.addColorStop(0.5, 'rgba(0,0,0,0.7)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = fadeTop;
    ctx.fillRect(0,0,w,h);

    ctx.restore();
  }

  // Hover/tap deactivation after 3s, auto re-enable after 15s
  let hoverTimer;
  function triggerManualOff(){
    auroraManuallyOff = true;
    stopAurora();
    if (reactivateTimer) clearTimeout(reactivateTimer);
    reactivateTimer = setTimeout(() => {
      auroraManuallyOff = false;
      scheduleAuroraStart(15000);
    }, 3000); // start 15s after 3s wait
  }

  musicPlayer.addEventListener('mouseenter', () => {
    if (!overlayOn) return;
    hoverTimer = setTimeout(triggerManualOff, 3000);
  });
  musicPlayer.addEventListener('mouseleave', () => {
    clearTimeout(hoverTimer);
  });
  musicPlayer.addEventListener('wheel', () => {
    if (!overlayOn) return;
    hoverTimer = setTimeout(triggerManualOff, 3000);
  });
  musicPlayer.addEventListener('click', () => {
    if (overlayOn) triggerManualOff();
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
