// Intercept internal nav links and route via SPA.
// Marks Blog link active when overlay is open.

(function () {
  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else { fn(); }
  }

  function isSameOriginHref(href) {
    try { return new URL(href, location.origin).origin === location.origin; }
    catch { return false; }
  }

  function init() {
    const root = document.getElementById('navbar-slot') || document;
    const links = Array.from(root.querySelectorAll('a[href]'));

    if (!window.router) {
      // Wait for router if not ready yet
      window.addEventListener('spa:ready', init, { once: true });
      return;
    }

    links.forEach(a => {
      const href = a.getAttribute('href');
      if (!href || !isSameOriginHref(href)) return;

      // Prefetch blog on hover/focus
      if (window.router.isBlogHref(href)) {
        a.addEventListener('mouseenter', window.router.prefetchBlog, { passive: true });
        a.addEventListener('focus', window.router.prefetchBlog, { passive: true });
      }

      a.addEventListener('click', (e) => {
        // Left-click, no modifiers
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        window.router.navigate(href, { triggerEl: a });
      });
    });

    // Update aria-current on route changes
    window.addEventListener('route:change', (e) => {
      const path = e.detail?.path || location.pathname + location.hash;

      // Clear all
      links.forEach(a => { a.classList.remove('active'); a.removeAttribute('aria-current'); });

      // Blog active when open
      const blogLink = links.find(a => window.router.isBlogHref(a.getAttribute('href') || ''));
      if ((path === '/blog' || path.endsWith('/blog.html')) && blogLink) {
        blogLink.classList.add('active');
        blogLink.setAttribute('aria-current', 'page');
      }

      // You can add per-section aria-current here if desired.
    });
  }

  ready(() => {
    // Run after fragments mount to ensure navbar exists
    window.addEventListener('components:mounted', init, { once: true });
    // If already mounted, run now
    if (document.getElementById('navbar-slot')?.children.length) init();
  });
})();
