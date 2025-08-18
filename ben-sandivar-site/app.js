/* app.js — core engine, seeding, history, IO, render loop (no DOM slider deps) */

(() => {
  // ---------- Utilities ----------
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const hexToRgb = (hex) => {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(s => s + s).join('') : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };

  // ---------- Fluid (Stable Fluids) ----------
  class Fluid {
    constructor({ baseFactor = 90, iter = 20, dpr = 1 } = {}) {
      this.baseFactor = baseFactor;
      this.iter = iter;
      this.dpr = dpr;
      this.W = 0; this.H = 0; this.N = 0;
      this._allocForN(2); // tiny initial buffers
    }
    IX(x, y) { return x + y * (this.N + 2); }
    _allocForN(Nv = this.N) {
      this.N = Nv;
      const s = (this.N + 2) * (this.N + 2);
      this.u = new Float32Array(s);
      this.v = new Float32Array(s);
      this.u0 = new Float32Array(s);
      this.v0 = new Float32Array(s);
      this.dR = new Float32Array(s);
      this.dG = new Float32Array(s);
      this.dB = new Float32Array(s);
      this.dR0 = new Float32Array(s);
      this.dG0 = new Float32Array(s);
      this.dB0 = new Float32Array(s);
    }
    _pickGrid() {
      const area = (this.W / this.dpr) * (this.H / this.dpr);
      const target = Math.sqrt(area / 150000);
      return clamp(Math.floor(this.baseFactor * target), 90, 384) | 0;
    }
    setBaseFactor(f) {
      this.baseFactor = f | 0;
      const n = this._pickGrid();
      if (n !== this.N) this._resampleTo(n);
    }
    resize(W, H) {
      this.W = W; this.H = H;
      const n = this._pickGrid();
      if (this.N === 0) { this._allocForN(n); this.clearDye(); }
      else if (n !== this.N) this._resampleTo(n);
    }
    _resampleTo(newN) {
      const oldN = this.N;
      const oIX = (x, y) => x + y * (oldN + 2);
      const oR = this.dR, oG = this.dG, oB = this.dB;
      this._allocForN(newN);
      const N = this.N;
      for (let j = 1; j <= N; j++) {
        const y = ((j) / (N + 1)) * (oldN + 1);
        const y0 = Math.floor(y), y1 = Math.min(oldN, y0 + 1);
        const ty = y - y0;
        for (let i = 1; i <= N; i++) {
          const x = ((i) / (N + 1)) * (oldN + 1);
          const x0 = Math.floor(x), x1 = Math.min(oldN, x0 + 1);
          const tx = x - x0;
          const i00 = oIX(x0, y0), i10 = oIX(x1, y0), i01 = oIX(x0, y1), i11 = oIX(x1, y1);
          const r = (1 - tx) * (1 - ty) * oR[i00] + tx * (1 - ty) * oR[i10] + (1 - tx) * ty * oR[i01] + tx * ty * oR[i11];
          const g = (1 - tx) * (1 - ty) * oG[i00] + tx * (1 - ty) * oG[i10] + (1 - tx) * ty * oG[i01] + tx * ty * oG[i11];
          const b = (1 - tx) * (1 - ty) * oB[i00] + tx * (1 - ty) * oB[i10] + (1 - tx) * ty * oB[i01] + tx * ty * oB[i11];
          const id = this.IX(i, j);
          this.dR[id] = r; this.dG[id] = g; this.dB[id] = b;
        }
      }
      this.u.fill(0); this.v.fill(0); this.u0.fill(0); this.v0.fill(0);
    }
    clearDye() { this.dR.fill(2); this.dG.fill(4); this.dB.fill(8); }
    setCell(i, j, [r, g, b]) { const id = this.IX(i, j); this.dR[id] = r; this.dG[id] = g; this.dB[id] = b; }

    set_bnd(b, x) {
      const N = this.N, IX = this.IX.bind(this);
      for (let i = 1; i <= N; i++) {
        x[IX(0, i)] = b === 1 ? -x[IX(1, i)] : x[IX(1, i)];
        x[IX(N + 1, i)] = b === 1 ? -x[IX(N, i)] : x[IX(N, i)];
        x[IX(i, 0)] = b === 2 ? -x[IX(i, 1)] : x[IX(i, 1)];
        x[IX(i, N + 1)] = b === 2 ? -x[IX(i, N)] : x[IX(i, N)];
      }
      x[IX(0, 0)] = .5 * (x[IX(1, 0)] + x[IX(0, 1)]);
      x[IX(0, this.N + 1)] = .5 * (x[IX(1, this.N + 1)] + x[IX(0, this.N)]);
      x[IX(this.N + 1, 0)] = .5 * (x[IX(this.N, 0)] + x[IX(this.N + 1, 1)]);
      x[IX(this.N + 1, this.N + 1)] = .5 * (x[IX(this.N, this.N + 1)] + x[IX(this.N + 1, this.N)]);
    }
    lin_solve(b, x, x0, a, c) {
      const N = this.N, IX = this.IX.bind(this), it = this.iter, cR = 1 / c;
      for (let k = 0; k < it; k++) {
        for (let j = 1; j <= N; j++)
          for (let i = 1; i <= N; i++)
            x[IX(i, j)] = (x0[IX(i, j)] + a * (x[IX(i - 1, j)] + x[IX(i + 1, j)] + x[IX(i, j - 1)] + x[IX(i, j + 1)])) * cR;
        this.set_bnd(b, x);
      }
    }
    diffuse(b, x, x0, dif, dt) {
      const a = dt * dif * this.N * this.N;
      this.lin_solve(b, x, x0, a, 1 + 4 * a);
    }
    advect(b, d, d0, u, v, dt) {
      const N = this.N, IX = this.IX.bind(this);
      const dt0 = dt * N;
      for (let j = 1; j <= N; j++) {
        for (let i = 1; i <= N; i++) {
          let x = i - dt0 * u[IX(i, j)], y = j - dt0 * v[IX(i, j)];
          if (x < .5) x = .5; if (x > N + .5) x = N + .5;
          if (y < .5) y = .5; if (y > N + .5) y = N + .5;
          const i0 = x | 0, i1 = i0 + 1, j0 = y | 0, j1 = j0 + 1;
          const s1 = x - i0, s0 = 1 - s1, t1 = y - j0, t0 = 1 - t1;
          d[IX(i, j)] =
            s0 * (t0 * d0[IX(i0, j0)] + t1 * d0[IX(i0, j1)]) +
            s1 * (t0 * d0[IX(i1, j0)] + t1 * d0[IX(i1, j1)]);
        }
      }
      this.set_bnd(b, d);
    }
    project(u, v, p, div) {
      const N = this.N, IX = this.IX.bind(this);
      for (let j = 1; j <= N; j++) for (let i = 1; i <= N; i++) {
        div[IX(i, j)] = -.5 * (u[IX(i + 1, j)] - u[IX(i - 1, j)] + v[IX(i, j + 1)] - v[IX(i, j - 1)]) / N;
        p[IX(i, j)] = 0;
      }
      this.set_bnd(0, div); this.set_bnd(0, p);
      this.lin_solve(0, p, div, 1, 4);
      for (let j = 1; j <= N; j++) for (let i = 1; i <= N; i++) {
        u[IX(i, j)] -= .5 * N * (p[IX(i + 1, j)] - p[IX(i - 1, j)]);
        v[IX(i, j)] -= .5 * N * (p[IX(i, j + 1)] - p[IX(i, j - 1)]);
      }
      this.set_bnd(1, u); this.set_bnd(2, v);
    }
    vel_step(visc, dt) {
      const { u, v, u0, v0 } = this;
      for (let i = 0; i < u.length; i++) { u[i] += u0[i]; v[i] += v0[i]; u0[i] = 0; v0[i] = 0; }
      this.diffuse(1, this.u0, this.u, visc, dt);
      this.diffuse(2, this.v0, this.v, visc, dt);
      this.project(this.u0, this.v0, this.u, this.v);
      this.advect(1, this.u, this.u0, this.u0, this.v0, dt);
      this.advect(2, this.v, this.v0, this.u0, this.v0, dt);
      this.project(this.u, this.v, this.u0, this.v0);
    }
    dens_step(diff, dt) {
      this.diffuse(0, this.dR0, this.dR, diff, dt);
      this.diffuse(0, this.dG0, this.dG, diff, dt);
      this.diffuse(0, this.dB0, this.dB, diff, dt);
      this.advect(0, this.dR, this.dR0, this.u, this.v, dt);
      this.advect(0, this.dG, this.dG0, this.u, this.v, dt);
      this.advect(0, this.dB, this.dB0, this.u, this.v, dt);
    }
    gridFromPx(px, py) {
      return [
        clamp((px / this.W) * (this.N + 2), 1, this.N),
        clamp((py / this.H) * (this.N + 2), 1, this.N)
      ];
    }
    drawTo(ctx) {
      const W = this.W, H = this.H, N = this.N, IX = this.IX.bind(this);
      const img = ctx.createImageData(W, H), p = img.data;
      const sx = N / W, sy = N / H;
      let k = 0;
      for (let y = 0; y < H; y++) {
        const gy = clamp((y * sy + 1) | 0, 1, N);
        for (let x = 0; x < W; x++) {
          const gx = clamp((x * sx + 1) | 0, 1, N), id = IX(gx, gy);
          p[k++] = clamp(this.dR[id], 0, 255) | 0;
          p[k++] = clamp(this.dG[id], 0, 255) | 0;
          p[k++] = clamp(this.dB[id], 0, 255) | 0;
          p[k++] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    }
  }

  // ---------- Bucket namespace ----------
  const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });

  const Bucket = window.Bucket = {
    DPR,
    canvas, ctx,
    fluid: new Fluid({ baseFactor: 90, iter: 20, dpr: DPR }),
    params: {
      speed: 1.5,      // 0..4
      strength: 24,    // 0..60
      size: 120,       // px
      viscosity: 0.0008,
      diffusion: 0.0005,
      baseFactor: 90   // resolution factor (UI slider later)
    },
    colors: {
      // initial palette
      base: ['#0b3a7a', '#1aa4ff', '#00ffd1'],
      pour: hexToRgb('#1aa4ff')
    },
    state: {
      tool: 'blender',
      holding: false,
      button: 0,       // 0 left, 2 right
      spinSign: 1,     // +1 CW, -1 CCW
      x: 0, y: 0,
      px: NaN, py: NaN,
      timeSec: 0
    },
    setTool(name) { this.state.tool = name; },
    setBaseFactor(v) { this.params.baseFactor = v|0; this.fluid.setBaseFactor(this.params.baseFactor); },
    setPourHex(hex) { this.colors.pour = hexToRgb(hex); },
    onResize,
    seedDefault,
    generateLayout
  };

  // ---------- Resize ----------
  function onResize() {
    const W = Math.floor(window.innerWidth * DPR);
    const H = Math.floor(window.innerHeight * DPR);
    canvas.width = W; canvas.height = H;
    Bucket.fluid.resize(W, H);
    // If first-time seed or after big resize without history
    if (!history.length) seedDefault();
    drawImmediate();
  }
  window.addEventListener('resize', onResize);

  // ---------- Seeding ----------
  function seedDefault() { generateLayout('stream', Bucket.colors.base); resetHistory(); }
  function generateLayout(kind, colorsHex) {
    const f = Bucket.fluid;
    const cols = colorsHex.map(hexToRgb);
    const N = f.N, cx = (N + 2) / 2, cy = (N + 2) / 2, rMax = Math.hypot(N, N) / 2;
    f.clearDye();

    const set = (i, j, c) => f.setCell(i, j, c);

    if (kind === 'stream') {
      for (let j = 1; j <= N; j++) for (let i = 1; i <= N; i++) {
        if (Math.random() < 0.015) {
          const c = Math.random() < 0.5 ? cols[1 % cols.length] : cols[2 % cols.length];
          set(i, j, c);
        }
      }
      const amp = N * 0.06, freq = 0.09;
      for (let j = 1; j <= N; j++) {
        const mid = Math.floor(N * 0.45 + Math.sin(j * freq) * amp);
        const w = Math.floor(N * 0.05 + (Math.sin(j * 0.03) * 0.5 + 0.5) * N * 0.015);
        for (let i = Math.max(1, mid - w); i <= Math.min(N, mid + w); i++) {
          const t = (i - (mid - w)) / (2 * w + 1);
          const c0 = cols[1], c1 = cols[2];
          set(i, j, [
            Math.floor(lerp(c0[0], c1[0], t)),
            Math.floor(lerp(c0[1], c1[1], t)),
            Math.floor(lerp(c0[2], c1[2], t)),
          ]);
        }
      }
      return;
    }
    if (kind === 'split') {
      for (let j = 1; j <= N; j++) for (let i = 1; i <= N; i++)
        set(i, j, (i <= N / 2) ? cols[0] : cols[1 % cols.length]);
      return;
    }
    if (kind === 'squares') {
      const k = cols.length, g = Math.ceil(Math.sqrt(k)), w = Math.ceil(N / g), h = Math.ceil(N / g);
      for (let j = 1; j <= N; j++) for (let i = 1; i <= N; i++) {
        const gx = Math.min(g - 1, Math.floor((i - 1) / w));
        const gy = Math.min(g - 1, Math.floor((j - 1) / h));
        const idx = (gy * g + gx) % k; set(i, j, cols[idx]);
      }
      return;
    }
    if (kind === 'sectors') {
      const k = cols.length;
      for (let j = 1; j <= N; j++) for (let i = 1; i <= N; i++) {
        const a = Math.atan2(j - cy, i - cx), idx = (((a + Math.PI) / (2 * Math.PI)) * k) | 0;
        set(i, j, cols[idx % k]);
      }
      return;
    }
    if (kind === 'rings') {
      const k = cols.length;
      for (let j = 1; j <= N; j++) for (let i = 1; i <= N; i++) {
        const r = Math.hypot(i - cx, j - cy), idx = (Math.floor((r / rMax) * k)) % k;
        set(i, j, cols[idx]);
      }
      return;
    }
    if (kind === 'spiral') {
      const k = cols.length, wind = 3.0;
      for (let j = 1; j <= N; j++) for (let i = 1; i <= N; i++) {
        const dx = i - cx, dy = j - cy, r = Math.hypot(dx, dy) / rMax, a = Math.atan2(dy, dx);
        const t = a + wind * r * 2 * Math.PI, idx = (((t + Math.PI) / (2 * Math.PI)) * k) | 0;
        set(i, j, cols[idx % k]);
      }
      return;
    }
    if (kind === 'blotches' || kind === 'voronoi') {
      const k = cols.length, seeds = [];
      for (let n = 0; n < k; n++) seeds.push({ x: 1 + Math.random() * N, y: 1 + Math.random() * N, c: n });
      for (let j = 1; j <= N; j++) for (let i = 1; i <= N; i++) {
        let best = -1, bd = 1e9;
        for (const s of seeds) {
          const dx = i - s.x, dy = j - s.y, d = dx * dx + dy * dy;
          if (d < bd) { bd = d; best = s.c; }
        }
        set(i, j, cols[best]);
      }
      return;
    }
    if (kind === 'stripes-v' || kind === 'stripes-h') {
      const k = cols.length, vertical = (kind === 'stripes-v');
      for (let j = 1; j <= N; j++) for (let i = 1; i <= N; i++) {
        const t = vertical ? i : j, idx = Math.floor((t / N) * k) % k; set(i, j, cols[idx]);
      }
      return;
    }
  }

  // ---------- History ----------
  const history = [];
  const redoStack = [];
  const MAXH = 24;
  function snap() {
    const f = Bucket.fluid;
    return { r: new Float32Array(f.dR), g: new Float32Array(f.dG), b: new Float32Array(f.dB) };
  }
  function restore(s) {
    const f = Bucket.fluid;
    f.dR.set(s.r); f.dG.set(s.g); f.dB.set(s.b);
  }
  function resetHistory() { history.length = 0; redoStack.length = 0; history.push(snap()); }
  function pushHistory() { history.push(snap()); if (history.length > MAXH) history.shift(); redoStack.length = 0; }
  function undo() { if (history.length < 2) return; const cur = history.pop(); redoStack.push(cur); restore(history[history.length - 1]); }
  function redo() { if (!redoStack.length) return; const s = redoStack.pop(); restore(s); history.push(snap()); }

  // ---------- Draw ----------
  function drawImmediate() { Bucket.fluid.drawTo(ctx); }

  // ---------- Mouse / Touch ----------
  function startHold(px, py, btn) {
    const s = Bucket.state;
    s.spinSign = (btn === 2 ? -1 : 1);
    s.button = btn;
    if (!s.holding) pushHistory();
    s.holding = true;
    s.px = s.x = px; s.py = s.y = py;
  }
  function stopHold() {
    const s = Bucket.state;
    if (s.holding) { s.holding = false; pushHistory(); }
  }

  canvas.addEventListener('mousedown', (e) => {
    const px = e.offsetX * DPR, py = e.offsetY * DPR;
    if (e.button === 0) startHold(px, py, 0);
    else if (e.button === 2) { e.preventDefault(); startHold(px, py, 2); }
  });
  window.addEventListener('mouseup', (e) => { if (e.button === 0 || e.button === 2) stopHold(); });
  canvas.addEventListener('mousemove', (e) => {
    const px = e.offsetX * DPR, py = e.offsetY * DPR;
    const s = Bucket.state;
    if (s.holding) { s.px = s.x; s.py = s.y; }
    else { s.px = px; s.py = py; }
    s.x = px; s.y = py;
  });
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  // Touch
  canvas.addEventListener('touchstart', (e) => {
    const t = e.touches[0]; const r = canvas.getBoundingClientRect();
    startHold((t.clientX - r.left) * DPR, (t.clientY - r.top) * DPR, 0);
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchend', stopHold, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    const t = e.touches[0]; const r = canvas.getBoundingClientRect();
    const s = Bucket.state;
    const px = (t.clientX - r.left) * DPR, py = (t.clientY - r.top) * DPR;
    if (s.holding) { s.px = s.x; s.py = s.y; }
    s.x = px; s.y = py;
    e.preventDefault();
  }, { passive: false });

  // ---------- Buttons ----------
  document.getElementById('newBtn').addEventListener('click', () => { seedDefault(); });
  document.getElementById('undoBtn').addEventListener('click', undo);
  document.getElementById('redoBtn').addEventListener('click', redo);

  // Snapshot (hi-res temp 200)
  function withHighRes(tempFactor, action) {
    const prev = Bucket.params.baseFactor;
    Bucket.setBaseFactor(tempFactor);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        action(() => {
          Bucket.setBaseFactor(prev);
          // let it settle
          requestAnimationFrame(() => requestAnimationFrame(() => {}));
        });
      })
    );
  }
  function quickJpg(done) {
    canvas.toBlob((blob) => {
      const a = document.createElement('a');
      const t = new Date(), pad = (n) => String(n).padStart(2, '0');
      a.href = URL.createObjectURL(blob);
      a.download = `bucket-${t.getFullYear()}${pad(t.getMonth() + 1)}${pad(t.getDate())}-${pad(t.getHours())}${pad(t.getMinutes())}${pad(t.getSeconds())}.jpg`;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
      done && done();
    }, 'image/jpeg', 0.92);
  }
  document.getElementById('snapshotBtn').addEventListener('click', () => withHighRes(200, (done) => quickJpg(done)));

  // Simple export (PNG) for now; full dialog comes in ui.js
  function simpleExport(done) {
    canvas.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'bucket-export.png';
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
      done && done();
    }, 'image/png');
  }
  document.getElementById('exportBtn').addEventListener('click', () => withHighRes(200, (done) => simpleExport(done)));

  // Settings button: cycle resolution presets for now (UI sliders will replace this)
  document.getElementById('settingsBtn').addEventListener('click', () => {
    const seq = [90, 128, 160, 200];
    const i = seq.indexOf(Bucket.params.baseFactor);
    Bucket.setBaseFactor(seq[(i + 1) % seq.length]);
  });

  // Welcome card
  const welcome = document.getElementById('welcome');
  const closeWelcome = document.getElementById('closeWelcome');
  if (welcome && closeWelcome) {
    closeWelcome.addEventListener('click', () => welcome.classList.add('hidden'));
    // show once per session
    if (sessionStorage.getItem('bucketWelcomed')) welcome.classList.add('hidden');
    else sessionStorage.setItem('bucketWelcomed', '1');
  }

  // ---------- Loop ----------
  let last = performance.now();
  function step(now) {
    const f = Bucket.fluid;
    const s = Bucket.state;
    const p = Bucket.params;

    const dt = Math.min(0.033, (now - last) / 1000);
    last = now; s.timeSec += dt;

    // Tool application (defined in tools.js)
    if (window.BucketTools && typeof window.BucketTools.apply === 'function') {
      window.BucketTools.apply(Bucket, dt);
    }

    f.vel_step(p.viscosity, dt);
    f.dens_step(p.diffusion, dt);
    f.drawTo(ctx);
    requestAnimationFrame(step);
  }

  // ---------- Init ----------
  onResize();
  seedDefault();
  requestAnimationFrame(step);

})();
