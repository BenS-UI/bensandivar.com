// Simple SPA router + Blog overlay loader
// Assumes navbar is injected into #navbar-slot (homesplits/navbar.html).
// Leaves all home sections in DOM. Only overlays the blog.

const state = {
  cachedBlogHTML: null,
  lastTrigger: null,
  isOpen: false,
};

// Utility: run scripts from an HTML string (resolves relative src)
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

// Resolve internal link to a path we handle
function normalizeHref(href) {
  try {
    const u = new URL(href, window.location.origin);
    return u.pathname + u.search + u.hash;
  } catch {
    return href;
  }
}

function isBlogHref(href) {
  const path = normalizeHref(href);
  return path === '/blog' || path === '/blog/' || path.endsWith('/blog.html');
}

async function prefetchBlog() {
  if (state.cachedBlogHTML) return;
  try {
    const res = await fetch('/blog.html', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    state.cachedBlogHTML = text;
  } catch (e) {
    console.warn('Blog prefetch failed', e);
  }
}

function getOverlayEls() {
  const overlay = document.getElementById('blog-overlay');
  const content = document.getElementById('blog-overlay-content');
  const card = overlay?.querySelector('.overlay-card');
  const closeBtn = overlay?.querySelector('.overlay-close');
  const backdrop = overlay?.querySelector('.overlay-backdrop');
  return { overlay, content, card, closeBtn, backdrop };
}

function markBlogActive(active) {
  const root = document.getElementById('navbar-slot') || document;
  const links = root.querySelectorAll('a[href]');
  links.forEach((a) => {
    if (isBlogHref(a.getAttribute('href'))) {
      if (active) {
        a.classList.add('active');
        a.setAttribute('aria-current', 'page');
      } else {
        a.classList.remove('active');
        a.removeAttribute('aria-current');
      }
    }
  });
}

function lockScroll(lock) {
  document.body.classList.toggle('overlay-open', !!lock);
}

function trapFocus(container, e) {
  const focusables = container.querySelectorAll([
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(','));
  if (!focusables.length) return;

  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  if (e.key === 'Tab') {
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }
}

async function openBlogOverlay(pushState = true, triggerEl = null) {
  const { overlay, content, card, closeBtn, backdrop } = getOverlayEls();
  if (!overlay || !content) return;

  state.lastTrigger = triggerEl || document.activeElement;

  if (!state.cachedBlogHTML) {
    await prefetchBlog();
  }

  // Extract <main> content if present; fallback to whole body
  let htmlToUse = state.cachedBlogHTML || '<section class="coming-soon-content"><h1>Blog Coming Soon</h1></section>';
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlToUse, 'text/html');
    const main = doc.querySelector('main') || doc.body;
    // Inject and execute any inline scripts that belong to the blog page
    injectHTMLWithScripts(content, main.innerHTML, new URL('/blog.html', window.location.origin).href);
  } catch {
    content.innerHTML = htmlToUse;
  }

  overlay.hidden = false;
  overlay.setAttribute('aria-hidden', 'false');
  state.isOpen = true;
  markBlogActive(true);
  lockScroll(true);
  window.isFluidActive = (false); // pause fluid if you gate it in app.js

  // Focus management
  setTimeout(() => {
    (card || overlay).focus();
  }, 0);

  // Close handlers
  const dismiss = (e) => {
    if (e.type === 'click' && e.target.closest('[data-overlay-dismiss]')) {
      closeBlogOverlay();
    }
  };
  overlay.addEventListener('click', dismiss);

  const onKey = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeBlogOverlay();
    } else if (e.key === 'Tab') {
      trapFocus(card || overlay, e);
    }
  };
  overlay.addEventListener('keydown', onKey);

  overlay._cleanup = () => {
    overlay.removeEventListener('click', dismiss);
    overlay.removeEventListener('keydown', onKey);
  };

  if (pushState) {
    const url = '/blog';
    if (location.pathname !== url) history.pushState({ route: 'blog' }, '', url);
  }
}

function closeBlogOverlay(popState = false) {
  const { overlay } = getOverlayEls();
  if (!overlay || overlay.hidden) return;

  overlay._cleanup && overlay._cleanup();
  overlay.hidden = true;
  overlay.setAttribute('aria-hidden', 'true');
  state.isOpen = false;
  markBlogActive(false);
  lockScroll(false);
  window.isFluidActive = (true); // resume fluid if gated

  if (state.lastTrigger && typeof state.lastTrigger.focus === 'function') {
    state.lastTrigger.focus();
  }

  if (!popState) {
    const url = '/';
    if (location.pathname !== url) history.pushState({ route: 'home' }, '', url);
  }
}

function handlePopState() {
  // If user navigates back from /blog, close overlay
  if (location.pathname === '/blog' || location.pathname.endsWith('/blog.html')) {
    if (!state.isOpen) openBlogOverlay(false);
  } else if (state.isOpen) {
    closeBlogOverlay(true);
  }
}

// Intercept Blog link clicks after navbar is mounted
function wireNavIntercepts() {
  const root = document.getElementById('navbar-slot') || document;
  const links = root.querySelectorAll('a[href]');
  links.forEach((a) => {
    const href = a.getAttribute('href');
    if (!href) return;
    if (isBlogHref(href)) {
      // Prefetch on hover
      a.addEventListener('mouseenter', prefetchBlog, { passive: true });
      a.addEventListener('focus', prefetchBlog, { passive: true });

      a.addEventListener('click', (e) => {
        // Only intercept left-click without modifiers, same origin
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        openBlogOverlay(true, a);
      });
    }
  });
}

// Boot
window.addEventListener('components:mounted', () => {
  wireNavIntercepts();
  // Deep link: open overlay if landing on /blog
  if (location.pathname === '/blog' || location.pathname.endsWith('/blog.html')) {
    openBlogOverlay(false);
  }
});

window.addEventListener('popstate', handlePopState);
