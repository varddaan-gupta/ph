/* ═══════════════════════════════════════════════════════════════
   PREDATORS HORIZON — intro.js
   Boot cinematic. Style C: "Signal Acquired".
   Plays once on first navigation to app.html, then auto-skips
   after the first few launches. Skippable with any key or click.
   Depends on: core.js, icons.js
   ═══════════════════════════════════════════════════════════════ */

(function (PH) {
  'use strict';

  /* Total duration of the intro in milliseconds. Each beat below
     is defined in the timeline function. Skipping jumps to the
     end immediately. */
  const INTRO_DURATION_MS = 3200;

  /* The text sequence that types out during the intro. Each entry
     has a start time (ms from intro start) and the line to show. */
  const SEQUENCE = [
    { at: 200,  text: 'SIGNAL ACQUIRED' },
    { at: 900,  text: 'OPERATOR CLEARANCE VERIFIED' },
    { at: 1600, text: 'ENTERING PREDATORS HORIZON' }
  ];

  /* ═══════════════════════════════════════════════════════════
     MARKUP
     Built once and appended to <body> on demand.
     ═══════════════════════════════════════════════════════════ */
  function buildIntroEl() {
    const el = PH.dom.el('div', 'intro', '');

    el.innerHTML =
      '<div class="intro__static"></div>' +
      '<div class="intro__scanline"></div>' +

      '<div class="intro__stage">' +
        '<div class="intro__reticle">' +
          /* reticle svg: crosshair with a gap */
          '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round">' +
            '<circle cx="50" cy="50" r="34" opacity="0.5"/>' +
            '<circle cx="50" cy="50" r="42" opacity="0.25" stroke-dasharray="4 6"/>' +
            '<line x1="50" y1="4"  x2="50" y2="20"/>' +
            '<line x1="50" y1="80" x2="50" y2="96"/>' +
            '<line x1="4"  y1="50" x2="20" y2="50"/>' +
            '<line x1="80" y1="50" x2="96" y2="50"/>' +
            '<circle cx="50" cy="50" r="3" fill="currentColor" stroke="none"/>' +
          '</svg>' +
        '</div>' +

        '<div class="intro__line" id="introLine"></div>' +

        /* logo: square monogram */
        '<img class="intro__logo" id="introLogo" src="assets/logo/logo.svg" alt="">' +
      '</div>' +

      '<div class="intro__skip">Press Any Key to Skip</div>' +
      '<div class="intro__progress"><i id="introProgress"></i></div>';

    return el;
  }

  /* ═══════════════════════════════════════════════════════════
     PLAYER
     Runs the intro. Returns a Promise that resolves when the
     intro finishes (either by timeline completion or by skip).
     ═══════════════════════════════════════════════════════════ */
  function play(opts = {}) {
    return new Promise((resolve) => {
      const el = buildIntroEl();
      document.body.appendChild(el);

      const lineEl = el.querySelector('#introLine');
      const logoEl = el.querySelector('#introLogo');
      const progEl = el.querySelector('#introProgress');

      let startTime = performance.now();
      let raf = 0;
      let finished = false;
      let lineIdx = 0;

      /* ── Progress bar: fill from 0 to 100% over INTRO_DURATION_MS ── */
      function tickProgress(now) {
        const t = now - startTime;
        const pct = Math.min(1, t / INTRO_DURATION_MS);
        progEl.style.width = (pct * 100) + '%';
        if (pct < 1) raf = requestAnimationFrame(tickProgress);
      }
      raf = requestAnimationFrame(tickProgress);

      /* ── Text sequence: type out each line ── */
      function typeLine(index) {
        if (finished || index >= SEQUENCE.length) return;
        const entry = SEQUENCE[index];
        const delay = entry.at - (performance.now() - startTime);
        setTimeout(() => {
          if (finished) return;
          /* type character by character */
          let i = 0;
          lineEl.classList.add('is-on');
          lineEl.textContent = '';
          const caret = document.createElement('span');
          caret.className = 'caret';
          lineEl.appendChild(caret);
          const typeTimer = setInterval(() => {
            if (finished) { clearInterval(typeTimer); return; }
            if (i < entry.text.length) {
              lineEl.insertBefore(document.createTextNode(entry.text[i]), caret);
              i++;
            } else {
              clearInterval(typeTimer);
              /* pause, then continue to the next line */
              setTimeout(() => typeLine(index + 1), 220);
            }
          }, 26);
        }, Math.max(0, delay));
      }
      typeLine(0);

      /* ── Logo reveal: at 1800ms, fade the logo in ── */
      setTimeout(() => {
        if (finished) return;
        logoEl.classList.add('is-on');
      }, 1800);

      /* ── Finish handler ── */
      function finish() {
        if (finished) return;
        finished = true;
        cancelAnimationFrame(raf);
        el.classList.add('is-out');
        setTimeout(() => {
          el.remove();
          resolve();
        }, 420);
        cleanupListeners();
      }

      /* ── Skip handler: any key or click ── */
      function onKey(e) {
        /* Ignore modifier-only presses so we don't swallow shortcuts
           that a user might be holding when the intro starts. */
        if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return;
        finish();
      }
      function onClick() { finish(); }

      function cleanupListeners() {
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('mousedown', onClick);
        window.removeEventListener('touchstart', onClick);
      }
      window.addEventListener('keydown', onKey, { once: false });
      window.addEventListener('mousedown', onClick, { once: false });
      window.addEventListener('touchstart', onClick, { once: false, passive: true });

      /* ── Auto-finish when the timeline completes ── */
      setTimeout(() => {
        if (finished) return;
        /* After the last line has typed out, hold for a beat, then
           fade the logo out and end. */
        setTimeout(finish, 500);
      }, INTRO_DURATION_MS);
    });
  }

  /* ═══════════════════════════════════════════════════════════
     PUBLIC API
     ═══════════════════════════════════════════════════════════ */
  PH.Intro = {
    /* Should the intro play on this launch? */
    shouldPlay() {
      /* Auto-skip after the first few launches. */
      return PH.launches.shouldPlayIntro();
    },

    /* Play the intro. Always returns a Promise. Resolves when the
       intro finishes. Safe to call multiple times. */
    play,

    /* Convenience: play only if shouldPlay() is true, otherwise
       resolve immediately. */
    playIfNeeded() {
      if (this.shouldPlay()) return this.play();
      return Promise.resolve();
    }
  };

})(window.PH);