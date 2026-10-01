/* ═══════════════════════════════════════════════════════════════
   PREDATORS HORIZON — main.js
   Page router + wiring. Runs on every page load.
   Depends on: core.js, storage.js, session.js, icons.js, intro.js, hub.js
   ═══════════════════════════════════════════════════════════════ */

(function (PH) {
  'use strict';

  /* ═══ PUBLIC SITE (index.html) ═══ */
  function bootPublic() {
    PH.log('boot: public site');
    PH.launches.increment();
    PH.Session.wireEntryButtons();

    document.querySelectorAll('[data-nav="enter-btn"]').forEach(btn => {
      btn.addEventListener('click', () => {
        PH.log('entry clicked — destination:', btn.getAttribute('href'));
      });
    });

    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href').slice(1);
        if (!id) return;
        const target = document.getElementById(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  /* ═══ LOGIN PAGE (login.html) ═══ */
  function bootLogin() {
    PH.log('boot: login');

    if (PH.Session.hasActiveSession()) {
      PH.log('active session found — skipping login');
      showRedirectNotice();
      return;
    }

    const form = document.getElementById('authForm');
    if (!form) return;

    const tabs = PH.dom.$$('.auth__tab');
    const panes = PH.dom.$$('.auth__pane');

    function activateTab(name) {
      tabs.forEach(t => t.classList.toggle('is-active', t.dataset.tab === name));
      panes.forEach(p => p.classList.toggle('is-active', p.dataset.pane === name));
      clearErrors();
      const pane = panes.find(p => p.dataset.pane === name);
      if (pane) {
        const first = pane.querySelector('input');
        if (first && window.matchMedia('(min-width: 900px)').matches) first.focus();
      }
    }

    tabs.forEach(t => t.addEventListener('click', () => activateTab(t.dataset.tab)));

    function clearErrors() {
      const a = document.getElementById('signinError');
      const b = document.getElementById('signupError');
      if (a) a.textContent = '';
      if (b) b.textContent = '';
    }
    function showError(pane, msg) {
      const el = document.getElementById(pane === 'signin' ? 'signinError' : 'signupError');
      if (el) el.textContent = msg;
    }

    const usersList = document.getElementById('usersList');
    const signinUser = document.getElementById('signinUser');

    function refreshUserList() {
      if (!usersList) return;
      const ops = PH.Store.listOperators();
      if (!ops.length) { usersList.classList.remove('is-open'); return; }
      usersList.innerHTML = '';
      ops.forEach(op => {
        const row = PH.dom.el('div', 'auth__user-option',
          '<span>' + PH.dom.escape(op.name) + '</span>' +
          '<small>' + (op.guest ? 'GUEST' : 'OPERATOR') + '</small>'
        );
        row.addEventListener('mousedown', (e) => {
          e.preventDefault();
          signinUser.value = op.name;
          usersList.classList.remove('is-open');
          const pin = document.getElementById('signinPin');
          if (pin && !op.pin) pin.placeholder = '(no code set)';
          if (pin && op.pin) pin.focus();
          else {
            const submitBtn = document.querySelector('[data-submit="signin"]');
            if (submitBtn) submitBtn.click();
          }
        });
        usersList.appendChild(row);
      });
    }

    if (signinUser && usersList) {
      signinUser.addEventListener('focus', () => {
        refreshUserList();
        if (usersList.children.length) usersList.classList.add('is-open');
      });
      signinUser.addEventListener('blur', () => {
        setTimeout(() => usersList.classList.remove('is-open'), 120);
      });
      signinUser.addEventListener('input', () => {
        refreshUserList();
        if (usersList.children.length) usersList.classList.add('is-open');
      });
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      clearErrors();
      const activePane = form.querySelector('.auth__pane.is-active');
      const mode = activePane ? activePane.dataset.pane : 'signin';

      if (mode === 'signin') {
        const name = document.getElementById('signinUser').value;
        const pin  = document.getElementById('signinPin').value;
        if (!name) { showError('signin', 'Enter a callsign.'); return; }
        const res = PH.Session.signIn(name, pin);
        if (!res.ok) { showError('signin', res.error); shakeForm(); return; }
        onAuthSuccess(res.operator);
      } else {
        const name = document.getElementById('signupUser').value;
        const pin  = document.getElementById('signupPin').value;
        if (!name) { showError('signup', 'Choose a callsign.'); return; }
        const res = PH.Session.signUp(name, pin);
        if (!res.ok) { showError('signup', res.error); shakeForm(); return; }
        onAuthSuccess(res.operator);
      }
    });

    const guestBtn = document.getElementById('guestBtn');
    if (guestBtn) {
      guestBtn.addEventListener('click', () => {
        clearErrors();
        const res = PH.Session.continueAsGuest();
        if (!res.ok) { showError('signin', res.error || 'Could not start guest session.'); return; }
        onAuthSuccess(res.operator);
      });
    }

    function onAuthSuccess() {
      const buttons = form.querySelectorAll('button');
      buttons.forEach(b => b.disabled = true);
      form.style.transition = 'opacity 240ms ease, transform 240ms ease';
      form.style.opacity = '0';
      form.style.transform = 'translateY(-8px)';
      PH.page.goAfter('app.html', 260);
    }

    function shakeForm() {
      const wrap = document.querySelector('.auth__form');
      if (!wrap) return;
      wrap.animate([
        { transform: 'translateX(0)' },
        { transform: 'translateX(-6px)' },
        { transform: 'translateX(6px)' },
        { transform: 'translateX(-4px)' },
        { transform: 'translateX(4px)' },
        { transform: 'translateX(0)' }
      ], { duration: 320, easing: 'ease-in-out' });
    }

    refreshUserList();
    const last = PH.Store.lastOperatorName();
    if (last && signinUser) {
      signinUser.value = last;
      const op = PH.Store.getOperator(last);
      const pin = document.getElementById('signinPin');
      if (pin && op && !op.pin) pin.placeholder = '(no code set)';
      if (pin && op && op.pin) setTimeout(() => pin.focus(), 240);
    } else {
      activateTab('signup');
    }
  }

  function showRedirectNotice() {
    const wrap = document.querySelector('.auth__form-wrap');
    if (!wrap) return;
    wrap.innerHTML =
      '<div class="auth__form" style="text-align:center">' +
        '<div class="auth__brand" style="justify-content:center">' +
          '<img src="assets/logo/logo.svg" alt="">' +
        '</div>' +
        '<h2 style="font-family:var(--font-display);letter-spacing:var(--ls-wide);text-transform:uppercase;margin-bottom:var(--s-3)">' +
          'Session Active' +
        '</h2>' +
        '<p style="color:var(--bone-dim);margin-bottom:var(--s-6)">' +
          'You\'re already signed in. Taking you to the safehouse…' +
        '</p>' +
        '<a href="app.html" class="ph-btn ph-btn--primary ph-btn--block ph-btn--lg">Enter Now</a>' +
        '<div style="margin-top:var(--s-4)">' +
          '<button type="button" class="ph-btn ph-btn--ghost ph-btn--sm" id="switchUserBtn">Sign In As Someone Else</button>' +
        '</div>' +
      '</div>';

    const switchBtn = document.getElementById('switchUserBtn');
    if (switchBtn) {
      switchBtn.addEventListener('click', () => {
        PH.Session.signOut();
        window.location.reload();
      });
    }
    setTimeout(() => PH.page.go('app.html'), 1400);
  }

  /* ═══ APP HUB (app.html) ═══ */
  function bootApp() {
    PH.log('boot: app hub');

    if (!PH.Session.hasActiveSession()) {
      PH.log('no active session — redirecting to login');
      PH.page.go('login.html');
      return;
    }

    const op = PH.Session.currentOperator();
    if (!op) { PH.page.go('login.html'); return; }
    PH.Store.current = op;

    /* Play the intro cinematic on first visit (or until launches threshold). */
    PH.Intro.playIfNeeded().then(() => {
      /* After intro: hand control to the hub. */
      PH.Hub.init();
      PH.Hub.refreshTopbar();
    });
  }

  /* ═══ PLAY PAGE (play.html) ═══ */
  function bootPlay() {
    PH.log('boot: play');

    if (!PH.Session.hasActiveSession()) {
      PH.page.go('login.html');
      return;
    }

    const op = PH.Session.currentOperator();
    if (!op) { PH.page.go('login.html'); return; }
    PH.Store.current = op;

    /* Fill in HUD chrome from the operator's current loadout. */
    const equipped = PH.Icons.weapon(op.loadout.weapons[0] != null ? op.loadout.weapons[0] : 0);
    const skin = PH.Icons.skin(op.loadout.skin);

    const nameEl = document.getElementById('stageOperator');
    if (nameEl) nameEl.textContent = op.name;

    const wnameEl = document.getElementById('hudWeaponName');
    if (wnameEl) wnameEl.textContent = equipped.name;

    const ammoEl = document.getElementById('hudWeaponAmmo');
    if (ammoEl) ammoEl.textContent = equipped.cost ? ('Focus · ' + equipped.cost) : 'Focus · Free';

    /* Static placeholder values — Layer 8 replaces these with live state. */
    const hpText = document.getElementById('hudHpText');
    const hpBar  = document.getElementById('hudHpBar');
    if (hpText) hpText.textContent = '260/260';
    if (hpBar)  hpBar.style.width = '100%';

    const fText = document.getElementById('hudFocusText');
    const fBar  = document.getElementById('hudFocusBar');
    if (fText) fText.textContent = '0/100';
    if (fBar)  fBar.style.width = '0%';

    const scoreEl = document.getElementById('hudScore');
    if (scoreEl) scoreEl.textContent = '0';

    /* Draw a simple minimap frame with the operator's initial position. */
    drawPlaceholderMinimap(skin.accent);

    /* Placeholder timer ticking up so the stage feels alive. */
    let t0 = performance.now();
    const timerEl = document.getElementById('hudTimer');
    function tick() {
      if (!timerEl || !document.body.contains(timerEl)) return;
      const s = (performance.now() - t0) / 1000;
      timerEl.textContent = PH.format.time(s);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    /* Placeholder canvas: just a soft gradient so the stage isn't blank. */
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      function resizeCanvas() {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        drawPlaceholderCanvas(ctx, canvas.width, canvas.height);
      }
      window.addEventListener('resize', resizeCanvas);
      resizeCanvas();
    }
  }

  function drawPlaceholderCanvas(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);

    /* Radial red glow behind the center */
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.6);
    g.addColorStop(0, 'rgba(139,26,26,0.35)');
    g.addColorStop(0.5, 'rgba(74,13,13,0.15)');
    g.addColorStop(1, 'rgba(5,5,5,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    /* A few procedural grid lines for texture */
    ctx.strokeStyle = 'rgba(255,58,58,0.08)';
    ctx.lineWidth = 1;
    const step = 64;
    ctx.beginPath();
    for (let x = 0; x <= w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let y = 0; y <= h; y += step) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();
  }

  function drawPlaceholderMinimap(accent) {
    const c = document.getElementById('hudMinimap');
    if (!c) return;
    const ctx = c.getContext('2d');
    const w = c.width, h = c.height;
    ctx.clearRect(0, 0, w, h);

    /* Grid */
    ctx.strokeStyle = 'rgba(139,26,26,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 20) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let y = 0; y <= h; y += 20) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();

    /* Player marker at center */
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.fillStyle = accent;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(6, 6);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /* ═══ BOOT ROUTER ═══ */
  PH.ready(function () {
    const page = PH.page.current();
    PH.log('routing — page:', page);

    switch (page) {
      case 'public': bootPublic(); break;
      case 'login':  bootLogin();  break;
      case 'app':    bootApp();    break;
      case 'play':   bootPlay();   break;
      default:       bootPublic();
    }

    window.PH = PH;
  });

})(window.PH);
