// Intercept internal nav links for SPA.
// Routes: Blog overlay, Playground overlay, section hashes, home.
// Keeps aria-current on active overlay links.

(function () {
  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  function sameOriginHref(href) {
    try { return new URL(href, location.origin).origin === location.origin; } catch { return false; }
  }

  function init() {
    if (!window.router) { window.addEventListener('components:mounted', init, { once: true }); return; }

    const root = document.getElementById('navbar-slot') || document;
    const links = Array.from(root.querySelectorAll('a[href]'));

    links.forEach(a => {
      const href = a.getAttribute('href');
      if (!href || !sameOriginHref(href)) return;

      // Prefetch blog on hover/focus
      if (href.endsWith('/blog') || href.endsWith('/blog.html')) {
        a.addEventListener('mouseenter', window.router.prefetchBlog, { passive: true });
        a.addEventListener('focus', window.router.prefetchBlog, { passive: true });
      }

      a.addEventListener('click', (e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        window.router.navigate(href, { triggerEl: a });
      });
    });

    // Clear/set aria-current on route change
    window.addEventListener('route:change', (e) => {
      const path = e.detail?.path || location.pathname + location.hash;
      links.forEach(a => { a.classList.remove('active'); a.removeAttribute('aria-current'); });

      const setActive = (match) => {
        const link = links.find(a => (a.getAttribute('href') || '').endsWith(match));
        if (link) { link.classList.add('active'); link.setAttribute('aria-current', 'page'); }
      };

      if (path === '/blog') setActive('/blog');
      if (path === '/playground') setActive('/playground');
    });
  }

  ready(() => {
    // after navbar fragment is injected
    window.addEventListener('components:mounted', init, { once: true });
  });
})();
