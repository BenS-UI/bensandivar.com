// SPA router for Blog + Playground overlays
// Pauses hero off home. Starts/Stops overlay scripts. A11y + deep links.

const routerState = {
  cache: {},        // { blog: string, playground: string }
  isOpen: false,
  active: null,     // 'blog' | 'playground' | null
  lastTrigger: null,
  sandbox: null     // animation/timer sandbox
};

const routes = {
  blog: {
    test: (p) => p === '/blog' || p === '/blog/' || p.endsWith('/blog.html'),
    url: '/blog.html',
    overlayId: 'blog-overlay',
    contentId: 'blog-overlay-content',
    prefetch: () => prefetch('blog'),
  },
  playground: {
    test: (p) => p === '/playground' || p === '/playground/' || p.endsWith('/buck-it.html'),
    url: '/buck-it.html',
    overlayId: 'playground-overlay',
    contentId: 'playground-overlay-content',
    prefetch: () => prefetch('playground'),
  }
};

function normalize(href) {
  try { const u = new URL(href, location.origin); return u.pathname + u.search + u.hash; }
  catch { return href; }
}
function sameOrigin(href) { try { return new URL(href, location.origin).origin === location.origin; } catch { return false; } }

async function prefetch(key) {
  if (routerState.cache[key]) return;
  try {
    const res = await fetch(routes[key].url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    routerState.cache[key] = await res.text();
  } catch (e) {
    console.warn(key + ' prefetch failed', e);
  }
}

function injectWithScripts(target, html, baseHref) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;

  const scripts = tpl.content.querySelectorAll('script');
  scripts.forEach((old) => {
    const s = document.createElement('script');
    for (const { name, value } of Array.from(old.attributes)) {
      if (name === 'src') {
        try { s.src = new URL(value, baseHref).href; } catch { s.src = value; }
      } else {
        s.setAttribute(name, value);
      }
    }
    if (old.textContent) s.textContent = old.textContent;
    old.replaceWith(s);
  });

  target.innerHTML = '';
  target.appendChild(tpl.content.cloneNode(true));
}

function beginSandbox() {
  // capture timers/RAF made during overlay init so we can kill them on close
  const oRAF = window.requestAnimationFrame;
  const oCAF = window.cancelAnimationFrame;
  const oSTO = window.setTimeout;
  const oCTO = window.clearTimeout;
  const oSIV = window.setInterval;
  const oCIV = window.clearInterval;

  const raf = [], sto = [], siv = [];
  window.requestAnimationFrame = (cb) => { const id = oRAF(cb); raf.push(id); return id; };
  window.cancelAnimationFrame = (id) => oCAF(id);
  window.setTimeout = (cb, t, ...a) => { const id = oSTO(cb, t, ...a); sto.push(id); return id; };
  window.clearTimeout = (id) => oCTO(id);
  window.setInterval = (cb, t, ...a) => { const id = oSIV(cb, t, ...a); siv.push(id); return id; };
  window.clearInterval = (id) => oCIV(id);

  return {
    stopAll() { raf.forEach(oCAF); sto.forEach(oCTO); siv.forEach(oCIV); },
    restore() {
      window.requestAnimationFrame = oRAF;
      window.cancelAnimationFrame = oCAF;
      window.setTimeout = oSTO;
      window.clearTimeout = oCTO;
      window.setInterval = oSIV;
      window.clearInterval = oCIV;
    }
  };
}

function getOverlayEls(key) {
  const { overlayId, contentId } = routes[key];
  const overlay = document.getElementById(overlayId);
  const content = document.getElementById(contentId);
  const card = overlay?.querySelector('.overlay-card');
  const closeBtn = overlay?.querySelector('.overlay-close');
  const backdrop = overlay?.querySelector('.overlay-backdrop');
  return { overlay, content, card, closeBtn, backdrop };
}

function markActiveLink(key, active) {
  const root = document.getElementById('navbar-slot') || document;
  const hrefs = {
    blog: ['/#blog', '/blog', '/blog.html'],
    playground: ['/#playground', '/playground', '/buck-it.html']
  };
  hrefs[key].forEach(h => {
    const a = root.querySelector(`a[href$="${h}"]`);
    if (!a) return;
    if (active) { a.classList.add('active'); a.setAttribute('aria-current', 'page'); }
    else { a.classList.remove('active'); a.removeAttribute('aria-current'); }
  });
}

function lockScroll(lock) { document.body.classList.toggle('overlay-open', !!lock); }

function trapFocus(container, e) {
  const focusables = container.querySelectorAll([
    'a[href]','button:not([disabled])','textarea:not([disabled])','input:not([disabled])',
    'select:not([disabled])','[tabindex]:not([tabindex="-1"])'
  ].join(','));
  if (!focusables.length) return;
  const first = focusables[0], last = focusables[focusables.length - 1];
  if (e.key === 'Tab') {
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}

async function openOverlay(key, push = true, triggerEl = null) {
  const { overlay, content, card } = getOverlayEls(key);
  if (!overlay || !content) return;

  routerState.lastTrigger = triggerEl || document.activeElement;

  if (!routerState.cache[key]) await prefetch(key);

  // Only inject <main> contents from the page
  const html = routerState.cache[key] || '<main><section><h1>Loading…</h1></section></main>';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const main = doc.querySelector('main') || doc.body;

  // Sandbox: start, inject, then restore; this ensures blog GL starts only now
  routerState.sandbox = beginSandbox();
  injectWithScripts(content, main.innerHTML, new URL(routes[key].url, location.origin).href);
  setTimeout(() => routerState.sandbox?.restore(), 0);

  overlay.hidden = false;
  overlay.setAttribute('aria-hidden', 'false');
  routerState.isOpen = true;
  routerState.active = key;
  markActiveLink(key, true);
  lockScroll(true);

  // Pause hero
  window.isFluidActive = false;
  window.heroBridge && window.heroBridge.pause();

  // Focus + a11y
  setTimeout(() => (card || overlay).focus(), 0);
  const onClick = (e) => { if (e.target.closest('[data-overlay-dismiss]')) closeOverlay(false); };
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); closeOverlay(false); }
    else if (e.key === 'Tab') trapFocus(card || overlay, e);
  };
  overlay.addEventListener('click', onClick);
  overlay.addEventListener('keydown', onKey);
  overlay._cleanup = () => {
    overlay.removeEventListener('click', onClick);
    overlay.removeEventListener('keydown', onKey);
  };

  // History + events
  const targetPath = key === 'blog' ? '/blog' : '/playground';
  if (push && location.pathname !== targetPath) {
    history.pushState({ route: key }, '', targetPath);
  }
  window.dispatchEvent(new CustomEvent('route:change', { detail: { path: targetPath } }));
  window.dispatchEvent(new Event(key + ':open'));
}

function closeOverlay(fromPop) {
  if (!routerState.active) return;
  const { overlay, content } = getOverlayEls(routerState.active);
  if (!overlay) return;

  // Stop overlay timers/anims; clear DOM
  if (routerState.sandbox) {
    routerState.sandbox.stopAll();
    routerState.sandbox.restore();
    routerState.sandbox = null;
  }
  content.innerHTML = '';

  overlay._cleanup && overlay._cleanup();
  overlay.hidden = true;
  overlay.setAttribute('aria-hidden', 'true');
  markActiveLink(routerState.active, false);

  routerState.isOpen = false;
  routerState.active = null;
  lockScroll(false);

  // Resume hero
  window.isFluidActive = true;
  window.heroBridge && window.heroBridge.resume();

  if (!fromPop && location.pathname !== '/') {
    history.pushState({ route: 'home' }, '', '/');
  }
  window.dispatchEvent(new CustomEvent('route:change', { detail: { path: '/' } }));

  // Return focus
  if (routerState.lastTrigger && typeof routerState.lastTrigger.focus === 'function') {
    routerState.lastTrigger.focus();
  }
}

function navigate(href, { triggerEl } = {}) {
  if (!sameOrigin(href)) { location.href = href; return; }
  const path = normalize(href);

  // Overlay routes
  if (routes.blog.test(path)) return openOverlay('blog', true, triggerEl);
  if (routes.playground.test(path)) return openOverlay('playground', true, triggerEl);

  // Close overlay if open
  if (routerState.isOpen) closeOverlay(false);

  // Hash sections
  if (path.startsWith('/#') || path.startsWith('#')) {
    const id = path.replace(/^\/#/, '#');
    const el = document.querySelector(id);
    if (el) {
      history.pushState({ route: id }, '', id);
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.dispatchEvent(new CustomEvent('route:change', { detail: { path: id } }));
      return;
    }
  }

  // Root
  if (path === '/' || path === '') {
    if (location.pathname !== '/') history.pushState({ route: 'home' }, '', '/');
    window.dispatchEvent(new CustomEvent('route:change', { detail: { path: '/' } }));
    return;
  }

  // Fallback
  location.href = path;
}

function onPop() {
  const p = location.pathname;
  if (routes.blog.test(p)) {
    if (!routerState.isOpen) openOverlay('blog', false);
    return;
  }
  if (routes.playground.test(p)) {
    if (!routerState.isOpen) openOverlay('playground', false);
    return;
  }
  if (routerState.isOpen) {
    closeOverlay(true);
  } else {
    // handle hash deep links on back/forward
    const n = normalize(location.href);
    if (n.startsWith('/#') || n.startsWith('#')) {
      const id = n.replace(/^\/#/, '#');
      const el = document.querySelector(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    window.dispatchEvent(new CustomEvent('route:change', { detail: { path: n } }));
  }
}

// Expose
window.router = { navigate, prefetchBlog: () => prefetch('blog') };

// Init after fragments mount
window.addEventListener('components:mounted', () => {
  // Deep links
  const p = location.pathname;
  if (routes.blog.test(p)) return openOverlay('blog', false);
  if (routes.playground.test(p)) return openOverlay('playground', false);

  if (location.hash && location.pathname === '/') {
    const el = document.querySelector(location.hash);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  window.dispatchEvent(new CustomEvent('route:change', { detail: { path: normalize(location.href) } }));
});

window.addEventListener('popstate', onPop);
