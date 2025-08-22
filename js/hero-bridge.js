// Bridges route changes to your hero/nebula so it pauses off-home.
// Works with either a global API or the simple flag approach.

(function () {
  const bridge = {
    pause() {
      // Preferred: call your hero API if present
      if (window.hero && typeof window.hero.pause === 'function') return window.hero.pause();
      if (window.hero && typeof window.hero.setPaused === 'function') return window.hero.setPaused(true);
      if (window.hero && typeof window.hero.stop === 'function') return window.hero.stop();
      // Fallback: flag for your RAF loop to check
      window.isFluidActive = false;
      // Soft GPU hint: hide canvas if needed (does not stop RAF)
      const c = document.querySelector('#gl, canvas[data-hero], .hero canvas');
      if (c) c.style.visibility = 'hidden';
    },
    resume() {
      if (window.hero && typeof window.hero.resume === 'function') return window.hero.resume();
      if (window.hero && typeof window.hero.setPaused === 'function') return window.hero.setPaused(false);
      if (window.hero && typeof window.hero.start === 'function') return window.hero.start();
      window.isFluidActive = true;
      const c = document.querySelector('#gl, canvas[data-hero], .hero canvas');
      if (c) c.style.visibility = '';
    }
  };

  // Expose for router
  window.heroBridge = bridge;

  // Route sync: pause when not on home
  function onRoute(e) {
    const path = e.detail?.path || location.pathname + location.hash;
    const onHome = path === '/' || path === '' || path.startsWith('/#') || path.startsWith('#');
    if (onHome) bridge.resume(); else bridge.pause();
  }

  // Initial sync (components may not yet be mounted; router fires later)
  window.addEventListener('route:change', onRoute);
})();
