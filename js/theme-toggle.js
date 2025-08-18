/* =========================================================
   GLOBAL THEME TOGGLER
   Sets data-theme="light|dark" on <body>, persists choice,
   and respects OS preference on first visit.
   ========================================================= */
(() => {
  const STORAGE_KEY = 'site-theme';
  const body = document.body;

  // Create the toggle button if the page doesn't include it yet.
  let toggleContainer = document.querySelector('.theme-toggle-container');
  if (!toggleContainer) {
    toggleContainer = document.createElement('div');
    toggleContainer.className = 'theme-toggle-container';
    toggleContainer.innerHTML = `
      <button id="theme-toggle" aria-pressed="false" aria-label="Toggle theme">
        <span class="theme-icon" data-light="☾" data-dark="☀">☾</span>
      </button>
    `;
    document.body.appendChild(toggleContainer);
  }

  const btn = document.getElementById('theme-toggle');
  const ico = btn?.querySelector('.theme-icon');

  function apply(theme){
    body.setAttribute('data-theme', theme);
    btn?.setAttribute('aria-pressed', String(theme === 'dark'));
    if (ico) ico.textContent = (theme === 'dark') ? (ico.dataset.dark || '☀') : (ico.dataset.light || '☾');
  }

  // Initial theme: storage > OS preference
  let theme = localStorage.getItem(STORAGE_KEY);
  if (!theme) {
    theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  apply(theme);

  // Toggle on click
  btn?.addEventListener('click', () => {
    theme = (body.getAttribute('data-theme') === 'dark') ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEY, theme);
    apply(theme);
  });

  // Optional: reflect OS changes if user hasn’t overridden
  if (!localStorage.getItem(STORAGE_KEY) && window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e) => apply(e.matches ? 'dark' : 'light');
    mq.addEventListener ? mq.addEventListener('change', onChange) : mq.addListener(onChange);
  }
})();
