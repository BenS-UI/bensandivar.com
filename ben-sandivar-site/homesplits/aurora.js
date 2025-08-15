/* AURORA v1.0.1 — adds clear console warnings + state hook */
(() => {
  const log = (...a) => console.warn('[aurora]', ...a);

  const root = document.getElementById('music');
  if (!root) { log('Missing #music root.'); return; }

  const layer  = root.querySelector('.aurora-layer');
  if (!layer) { log('Missing .aurora-layer inside #music.'); return; }

  const canvas = root.querySelector('#aurora');
  if (!canvas) { log('Missing canvas#aurora inside #music.'); return; }

  const audio  = root.querySelector('audio');
  if (!audio) { log('Missing <audio> inside #music.'); return; }

  // --- unchanged core (shortened here for space): paste your existing v1.0 code ---
  // Keep all constants, resizing, bands, gradients, render(), start()/stop(), ensureAudio(), events…
  // TIP: keep this exact warning wrapper + the state hook below.

  // BEGIN pasted core
  // [PASTE the full v1.0 body from your file here with no behavior changes]
  // END pasted core

  // Lightweight state hook to debug from console
  window.aurora = window.aurora || {};
  Object.assign(window.aurora, {
    state() {
      return {
        hasRoot: !!root,
        hasLayer: !!layer,
        hasCanvas: !!canvas,
        hasAudio: !!audio,
        audioSrc: audio?.currentSrc || audio?.src || null,
        paused: audio?.paused,
      };
    }
  });
})();
