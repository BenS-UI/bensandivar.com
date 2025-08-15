(() => {
  // Scope to the music section only
  const musicPlayer = document.getElementById('music');
  if (!musicPlayer) return;

  const auroraCanvas = musicPlayer.querySelector('#aurora');
  const auroraLayer  = musicPlayer.querySelector('.aurora-layer');
  const audio        = musicPlayer.querySelector('audio');
  const shell        = musicPlayer.querySelector('.music-shell');

  if (!auroraCanvas || !auroraLayer || !audio || !shell) return;

  const ctx = auroraCanvas.getContext('2d');

  // -------------------- Audio graph --------------------
  let acx, srcNode, analyser;
  let rafId = null, overlayOn = false;
  let showDelayTimer = null;
  let autoReactivateTimer = null;
  let hoverTimer = null;
  let lastManualOffAt = 0;

  function ensureAudioGraph() {
    if (acx) return;
    acx = new (window.AudioContext || window.webkitAudioContext)();
    srcNode = acx.createMediaElementSource(audio);
    analyser = acx.createAnalyser();
    analyser.fftSize = 2048;                     // more bins → nicer band stats
    analyser.smoothingTimeConstant = 0.55;       // keep it responsive, not jittery
    srcNode.connect(analyser);
    analyser.connect(acx.destination);
  }

  // -------------------- Sizing --------------------
  function sizeCanvas() {
    const r = auroraLayer.getBoundingClientRect();
    auroraCanvas.width  = Math.max(1, r.width | 0);
    auroraCanvas.height = Math.max(1, r.height | 0);
  }
  sizeCanvas();
  window.addEventListener('resize', sizeCanvas);

  // -------------------- 10-minute ultra-smooth color loop --------------------
  const LOOP_S = 600;
  let t0 = performance.now();

  const PHASE_MS = 45000; // long crossfades so color count shifts are silky
  let phaseStart = performance.now();
  let gradA = makePhase();
  let gradB = makePhase();

  function makePhase() {
    return {
      seed: Math.random() * 360,
      n: pickCount(),                               // 3/5/7 mainly
      ang: (Math.random() * 6 - 3) * Math.PI / 180, // almost vertical
      offset: Math.random() * 1000
    };
  }
  function pickCount() {
    const r = Math.random();
    if (r < 0.50) return 5;
    if (r < 0.85) return 3;
    return 7; // rarer
  }
  function loopT() {
    const dt = (performance.now() - t0) / 1000;
    return (dt % LOOP_S) / LOOP_S;
  }

  function buildGradient(phase, tGlobal, w, h) {
    // Very slow tiny rotation to keep it alive
    const drift = Math.sin(tGlobal * 2 * Math.PI / 1800) * (8 * Math.PI / 180);
    const ang = phase.ang + drift;

    const r = Math.hypot(w, h);
    const cx = w / 2, cy = h * 0.65;
    const x0 = cx - Math.cos(ang) * r / 2, y0 = cy - Math.sin(ang) * r / 2;
    const x1 = cx + Math.cos(ang) * r / 2, y1 = cy + Math.sin(ang) * r / 2;

    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    const n = phase.n;

    for (let i = 0; i < n; i++) {
      const f = (i) / (n - 1 || 1);
      // Bold neon hues, never pastel
      const hue = (phase.seed + i * (360 / n) + 36 * Math.sin(2 * Math.PI * (tGlobal / LOOP_S + phase.offset + i * 0.09))) % 360;
      g.addColorStop(f, `hsl(${hue} 92% 55%)`);
      // micro mid-stop to avoid hard edges when counts change
      if (i < n - 1) {
        const mid = f + (1 / (n - 1)) * 0.5;
        const hue2 = (hue + 20) % 360;
        g.addColorStop(mid, `hsl(${hue2} 88% 56%)`);
      }
    }
    return g;
  }

  // -------------------- Banding & smoothing --------------------
  // We’ll use **12 total bands** mapped to a *musical* range, per your ask:
  // - 3 LOW bands       (20–200 Hz)    → low sensitivity
  // - 9 MID bands       (200–8000 Hz)  → high sensitivity
  // (Highs >8 kHz get folded into the top mid band implicitly)
  //
  // Then we produce a smooth vector curve with Catmull–Rom spline across 12 points.

  const lowBands = 3;
  const midBands = 9;
  const totalBands = lowBands + midBands; // 12

  // Frequency boundaries (Hz)
  const LOW_MIN = 20, LOW_MAX = 200;
  const MID_MIN = 200, MID_MAX = 8000;

  // Weighting: keep lows tame, mids alive
  const LOW_WEIGHT = 0.45;
  const MID_WEIGHT = 1.0;

  // Catmull–Rom spline helper → returns dense x/y points from control points
  function catmullRomSpline(points, segmentsPerSpan = 16) {
    // points: [{x, y}, ...]
    if (points.length < 2) return points;

    const out = [];
    // Duplicate endpoints for C-R natural ends
    const pts = [
      points[0],
      ...points,
      points[points.length - 1]
    ];

    for (let i = 0; i < pts.length - 3; i++) {
      const p0 = pts[i], p1 = pts[i + 1], p2 = pts[i + 2], p3 = pts[i + 3];
      for (let j = 0; j <= segmentsPerSpan; j++) {
        const t = j / segmentsPerSpan;
        const t2 = t * t;
        const t3 = t2 * t;

        const x =
          0.5 * ((2 * p1.x) +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);

        const y =
          0.5 * ((2 * p1.y) +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

        out.push({ x, y });
      }
    }
    return out;
  }

  function hzToIndex(hz, fftSize, sampleRate) {
    const nyq = sampleRate / 2;
    const idx = Math.round((hz / nyq) * (fftSize / 2));
    return Math.max(0, Math.min(idx, (fftSize / 2) - 1));
  }

  // Compute 12 bands (3 low, 9 mid) with smoothing
  const fd = new Uint8Array(1024); // filled by analyser
  const bandSmooth = new Array(totalBands).fill(0);

  function computeBands() {
    analyser.getByteFrequencyData(fd);

    const sr = acx.sampleRate;
    const fft = analyser.fftSize;

    const idx = hz => hzToIndex(hz, fft, sr);
    const avg = (lo, hi) => {
      let s = 0, c = 0;
      for (let i = lo; i <= hi; i++) { s += fd[i]; c++; }
      return c ? (s / c) / 255 : 0;
    };

    const bands = [];

    // --- Lows: 3 bands from 20–200 Hz (log-ish spacing) ---
    const lowEdges = [LOW_MIN, 60, 120, LOW_MAX];
    for (let b = 0; b < lowBands; b++) {
      const lo = idx(lowEdges[b]);
      const hi = idx(lowEdges[b + 1]);
      const v = avg(lo, hi) * LOW_WEIGHT;
      bands.push(v);
    }

    // --- Mids: 9 bands from 200–8000 Hz (log-ish spacing) ---
    // Using rough musical-ish splits
    const midEdges = [200, 350, 500, 750, 1100, 1600, 2300, 3300, 4700, 8000];
    for (let b = 0; b < midBands; b++) {
      const lo = idx(midEdges[b]);
      const hi = idx(midEdges[b + 1]);
      const v = avg(lo, hi) * MID_WEIGHT;
      bands.push(v);
    }

    // Gentle temporal smoothing per band (keeps curve fluid but responsive)
    for (let i = 0; i < totalBands; i++) {
      bandSmooth[i] = bandSmooth[i] + (bands[i] - bandSmooth[i]) * 0.28;
    }

    return bandSmooth;
  }

  // -------------------- Draw --------------------
  function startAurora() {
    if (overlayOn) return;
    overlayOn = true;
    ensureAudioGraph();
    draw();
  }
  function stopAurora() {
    overlayOn = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    auroraLayer.classList.remove('on'); // CSS opacity fade out
    if (showDelayTimer) { clearTimeout(showDelayTimer); showDelayTimer = null; }
  }

  function draw() {
    if (!overlayOn) return;
    rafId = requestAnimationFrame(draw);
    sizeCanvas();

    const w = auroraCanvas.width, h = auroraCanvas.height;
    ctx.clearRect(0, 0, w, h);

    // ---------- Color crossfade (kept the same — reactivity is in the shape) ----------
    const now = performance.now();
    let mix = (now - phaseStart) / PHASE_MS;
    if (mix >= 1) {
      gradA = gradB;
      gradB = makePhase();
      phaseStart = now;
      mix = 0;
    }
    const gA = buildGradient(gradA, now / 1000, w, h);
    const gB = buildGradient(gradB, now / 1000, w, h);

    // ---------- Bands → smooth vector curve ----------
    const bands = computeBands();

    // Height budget: can reach up to 75% of container at loudest parts, never clip.
    const maxRise = 0.75 * h;
    const baseFloor = 0.08 * h;   // small base so silence isn't a knife edge

    // Map 12 bands to 12 control points across width
    const pts = [];
    for (let i = 0; i < totalBands; i++) {
      const x = (i / (totalBands - 1)) * w;

      // Emphasize mids for the "main body movement", low bands tamed already by weighting
      // Also give a little curvature variation using neighboring influence to avoid flatness
      const v = bands[i];
      const left  = bands[Math.max(0, i - 1)];
      const right = bands[Math.min(totalBands - 1, i + 1)];
      const blended = (v * 0.7 + (left + right) * 0.15);

      const rise = Math.min(maxRise, baseFloor + blended * (maxRise - baseFloor));
      const y = h - (0.10 * h + rise); // sit 10% above bottom
      pts.push({ x, y });
    }

    // Spline it (no sharp angles, no straight segments)
    const spline = catmullRomSpline(pts, 20);

    // ---------- Build a closed path from bottom → spline ----------
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let i = 0; i < spline.length; i++) {
      const p = spline[i];
      ctx.lineTo(p.x, p.y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.clip();

    // ---------- Fill with color (97% opacity) + ultra-smooth phase crossfade ----------
    ctx.globalCompositeOperation = 'screen';
    const baseAlpha = 0.97;          // as requested
    ctx.globalAlpha = baseAlpha * (1 - mix);
    ctx.fillStyle = gA; ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = baseAlpha * (mix);
    ctx.fillStyle = gB; ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;

    // Subtle tie-in blur (keeps it unified without washing it out)
    ctx.globalAlpha = baseAlpha * 0.35;
    ctx.filter = 'blur(4px)';
    ctx.fillStyle = gA; ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = baseAlpha * 0.35 * mix;
    ctx.fillStyle = gB; ctx.fillRect(0, 0, w, h);
    ctx.filter = 'none';
    ctx.globalAlpha = 1;

    // ---------- Top glow-like fade to transparent ----------
    // 1) soft glow along the crest
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowBlur = 24;
    ctx.shadowColor = 'rgba(255,255,255,0.25)';

    ctx.beginPath();
    // trace the crest (not closed)
    for (let i = 0; i < spline.length; i++) {
      const p = spline[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.lineWidth = 24;
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'source-over';

    // 2) vertical fade out mask at the very top (fire/aurora taper)
    //    adapt the fade length slightly to the current crest height
    let crestY = h;
    for (let i = 0; i < spline.length; i++) crestY = Math.min(crestY, spline[i].y);
    const crestPct = crestY / h;
    const fadeStartPct = Math.max(0.20, crestPct - 0.04); // start a bit below crest
    const fade = ctx.createLinearGradient(0, 0, 0, h);
    fade.addColorStop(0.00, 'rgba(0,0,0,1)');
    fade.addColorStop(fadeStartPct, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';

    ctx.restore();
  }

  // -------------------- Show/hide policy --------------------
  // First user play → wait 15s, then show
  // Autoplay next track → show immediately (music script can trigger aurora.instant())
  // Hover inside shell for 3s continuously → hide (manual off)
  // After manual off, if still playing → auto-reactivate in 15s

  function scheduleShowAfter(ms) {
    if (showDelayTimer) clearTimeout(showDelayTimer);
    showDelayTimer = setTimeout(() => {
      auroraLayer.classList.add('on'); // CSS fade-in (opacity)
      startAurora();
    }, ms);
  }

  function manualOff() {
    lastManualOffAt = Date.now();
    stopAurora(); // this also removes .on
    if (autoReactivateTimer) clearTimeout(autoReactivateTimer);
    if (!audio.paused) {
      autoReactivateTimer = setTimeout(() => {
        auroraLayer.classList.add('on');
        startAurora();
      }, 15000);
    }
  }

  // First play or resume by user → wait 15s
  audio.addEventListener('play', () => {
    ensureAudioGraph();
    scheduleShowAfter(15000);
  });
  audio.addEventListener('pause', () => {
    stopAurora();
    if (autoReactivateTimer) { clearTimeout(autoReactivateTimer); autoReactivateTimer = null; }
  });
  audio.addEventListener('ended', () => {
    stopAurora();
    if (autoReactivateTimer) { clearTimeout(autoReactivateTimer); autoReactivateTimer = null; }
  });

  // Hover inside shell for 3s to hide
  function startHoverWatch() {
    if (hoverTimer) return;
    let enteredAt = Date.now();
    hoverTimer = setInterval(() => {
      // 3s continuous hover
      if (Date.now() - enteredAt >= 3000) {
        clearInterval(hoverTimer); hoverTimer = null;
        manualOff();
      }
    }, 100);
    // reset the dwell whenever the pointer moves (still inside shell)
    const reset = () => { enteredAt = Date.now(); };
    shell.addEventListener('pointermove', reset, { passive: true, capture: true });
    // clean up on leave
    const stop = () => {
      clearInterval(hoverTimer); hoverTimer = null;
      shell.removeEventListener('pointermove', reset, { capture: true });
      shell.removeEventListener('pointerleave', stop, { capture: true });
    };
    shell.addEventListener('pointerleave', stop, { passive: true, capture: true });
  }
  shell.addEventListener('pointerenter', () => {
    // only matter if it's currently on; if off we don't want immediate off again
    if (overlayOn && auroraLayer.classList.contains('on')) startHoverWatch();
  }, { passive: true });

  // -------------------- Public hooks for autoplay / back-compat --------------------
  // Your player JS can call aurora.instant() when auto-advancing tracks.
  // Also keep legacy __auroraFadeIn/__auroraFadeOut working.
  window.aurora = {
    instant() { // immediate show; used on autoplay next
      if (showDelayTimer) { clearTimeout(showDelayTimer); showDelayTimer = null; }
      if (autoReactivateTimer) { clearTimeout(autoReactivateTimer); autoReactivateTimer = null; }
      auroraLayer.classList.add('on');
      startAurora();
    },
    off() {
      manualOff();
    }
  };
  window.__auroraFadeIn  = () => window.aurora.instant();
  window.__auroraFadeOut = () => window.aurora.off();
})();
