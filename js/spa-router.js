// SPA router + Blog overlay loader
// Exposes: window.router.navigate, prefetchBlog, isBlogHref, openBlogOverlay, closeBlogOverlay

const routerState = {
  cachedBlogHTML: null,
  isOpen: false,
  lastTrigger: null,
};

function normalizeHref(href) {
  try {
    const u = new URL(href, window.location.origin);
    return u.pathname + u.search + u.hash;
  } catch {
    return href;
  }
}

function isSameOrigin(href) {
  try { return new URL(href, location.origin).origin === location.origin; }
  catch { return false; }
}

function isBlogHref(href) {
  const p = normalizeHref(href);
  return p === '/blog' || p === '/blog/' || p.endsWith('/blog.html');
}

async function prefetchBlog() {
  if (routerState.cachedBlogHTML) return;
  try {
    const res = await fetch('/blog.html', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    routerState.cachedBlogHTML = await res.text();
  } catch (e) {
    console.warn('Blog prefetch failed', e);
  }
}

function els() {
  const overlay = document.getElementById('blog-overlay');
  const content = document.getElementById('blog-overlay-content');
  const card = overlay?.querySelector('.overlay-card');
  const closeBtn = overlay?.querySelector('.overlay-close');
  const backdrop = overlay?.querySelector('.overlay-backdrop');
  return { overlay, content, card, closeBtn, backdrop };
}

function injectHTMLWithScripts(target, html, baseHref) {
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

function markBlogActive(active) {
  const root = document.getElementById('navbar-slot') || document;
  const blogLink = Array.from(root.querySelectorAll('a[href]'))
    .find(a => isBlogHref(a.getAttribute('href') || ''));
  if (!blogLink) return;
  if (active) {
    blogLink.classList.add('active');
    blogLink.setAttribute('aria-current', 'page');
  } else {
    blogLink.classList.remove('active');
    blogLink.removeAttribute('aria-current');
  }
}

function lockScroll(lock) {
  document.body.classList.toggle('overlay-open', !!lock);
}

function trapFocus(container, e) {
  const focusables = container.querySelectorAll([
    'a[href]','button:not([disabled])','textarea:not([disabled])',
    'input:not([disabled])','select:not([disabled])','[tabindex]:not([tabindex="-1"])'
  ].join(','));
  if (!focusables.length) return;
  const first = focusables[0], last = focusables[focusables.length - 1];
  if (e.key === 'Tab') {
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}

async function openBlogOverlay(push = true, triggerEl = null) {
  const { overlay, content, card } = els();
  if (!overlay || !content) return;

  routerState.lastTrigger = triggerEl || document.activeElement;

  if (!routerState.cachedBlogHTML) await prefetchBlog();

  let html = routerState.cachedBlogHTML || '<section class="coming-soon-content"><h1>Blog Coming Soon</h1></section>';
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const main = doc.querySelector('main') || doc.body;
    injectHTMLWithScripts(content, main.innerHTML, new URL('/blog.html', location.origin).href);
  } catch {
    content.innerHTML = html;
  }

  overlay.hidden = false;
  overlay.setAttribute('aria-hidden', 'false');
  routerState.isOpen = true;
  markBlogActive(true);
  lockScroll(true);
  window.isFluidActive = false; // if you gate fluid sim

  setTimeout(() => (card || overlay).focus(), 0);

  const onClick = (e) => {
    if (e.target.closest('[data-overlay-dismiss]')) closeBlogOverlay();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); closeBlogOverlay(); }
    else if (e.key === 'Tab') trapFocus(card || overlay, e);
  };
  overlay.addEventListener('click', onClick);
  overlay.addEventListener('keydown', onKey);
  overlay._cleanup = () => {
    overlay.removeEventListener('click', onClick);
    overlay.removeEventListener('keydown', onKey);
  };

  if (push && location.pathname !== '/blog') {
    history.pushState({ route: 'blog' }, '', '/blog');
    window.dispatchEvent(new CustomEvent('route:change', { detail: { path: '/blog' } }));
  }
}

function closeBlogOverlay(fromPop = false) {
  const { overlay } = els();
  if (!overlay || overlay.hidden) return;

  overlay._cleanup && overlay._cleanup();
  overlay.hidden = true;
  overlay.setAttribute('aria-hidden', 'true');
  routerState.isOpen = false;
  markBlogActive(false);
  lockScroll(false);
  window.isFluidActive = true;

  if (routerState.lastTrigger && typeof routerState.lastTrigger.focus === 'function') {
    routerState.lastTrigger.focus();
  }

  if (!fromPop && location.pathname !== '/') {
    history.pushState({ route: 'home' }, '', '/');
    window.dispatchEvent(new CustomEvent('route:change', { detail: { path: '/' } }));
  }
}

function navigate(href, { triggerEl } = {}) {
  if (!isSameOrigin(href)) { window.location.href = href; return; }
  const path = normalizeHref(href);

  // Blog route
  if (isBlogHref(path)) { openBlogOverlay(true, triggerEl); return; }

  // Close overlay if open
  if (routerState.isOpen) closeBlogOverlay();

  // Section hashes
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

  // Home/root
  if (path === '/' || path === '') {
    if (location.pathname !== '/') {
      history.pushState({ route: 'home' }, '', '/');
      window.dispatchEvent(new CustomEvent('route:change', { detail: { path: '/' } }));
    }
    return;
  }

  // Fallback: hard nav
  window.location.href = path;
}

function handlePopState() {
  if (location.pathname === '/blog' || location.pathname.endsWith('/blog.html')) {
    if (!routerState.isOpen) openBlogOverlay(false);
  } else if (routerState.isOpen) {
    closeBlogOverlay(true);
  } else {
    window.dispatchEvent(new CustomEvent('route:change', { detail: { path: normalizeHref(location.href) } }));
  }
}

// Expose router
window.router = {
  navigate,
  prefetchBlog,
  isBlogHref,
  openBlogOverlay,
  closeBlogOverlay,
};

// Fire ready signal for scripts that wait on router
window.dispatchEvent(new Event('spa:ready'));

// Deep link + popstate
window.addEventListener('components:mounted', () => {
  if (location.pathname === '/blog' || location.pathname.endsWith('/blog.html')) {
    openBlogOverlay(false);
  } else {
    window.dispatchEvent(new CustomEvent('route:change', { detail: { path: normalizeHref(location.href) } }));
  }
});
window.addEventListener('popstate', handlePopState);
