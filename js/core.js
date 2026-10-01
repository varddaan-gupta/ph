/* ═══════════════════════════════════════════════════════════════
   PREDATORS HORIZON — core.js
   Zero-dependency utilities, event bus, and DOM helpers.
   Must load first. Everything else depends on window.PH.
   ═══════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  /* ── Namespace ── */
  const PH = global.PH = global.PH || {};

  /* ═══════════════ MATH & RANDOM ═══════════════ */
  PH.math = {
    clamp: (v, min, max) => Math.max(min, Math.min(max, v)),
    lerp:  (a, b, t) => a + (b - a) * t,
    dist2: (x1, y1, x2, y2) => (x2 - x1) ** 2 + (y2 - y1) ** 2,
    dist:  (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
    rand:  (min, max) => min + Math.random() * (max - min),
    randInt: (min, max) => Math.floor(min + Math.random() * (max - min + 1)),
    pick:  (arr) => arr[Math.floor(Math.random() * arr.length)],
    shuffle: (arr) => {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    wrap: (v, m) => ((v % m) + m) % m,
    /* deterministic pseudo-random for procedural visuals */
    hash: (a, b = 0) => {
      const q = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
      return q - Math.floor(q);
    }
  };

  /* ═══════════════ STRING & FORMAT ═══════════════ */
  PH.format = {
    /* "2:07" from 127 seconds */
    time: (seconds) => {
      const s = Math.max(0, Math.floor(seconds));
      const m = Math.floor(s / 60);
      const r = s % 60;
      return m + ':' + String(r).padStart(2, '0');
    },
    /* "1.2k", "3.4M" */
    num: (n) => {
      const v = Math.round(n);
      if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
      if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
      if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
      return String(v);
    },
    /* coins with the ₡ symbol */
    coins: (n) => '₡' + PH.format.num(n),
    /* sanitize a callsign: uppercase, allowed chars only, trimmed, max 14 */
    callsign: (raw) => String(raw || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9 _-]/g, '')
      .replace(/\s+/g, ' ')
      .slice(0, 14),
    /* generate a guest callsign like "OPERATOR-7F3A" */
    guestCallsign: () => {
      const hex = '0123456789ABCDEF';
      let tag = '';
      for (let i = 0; i < 4; i++) tag += hex[Math.floor(Math.random() * 16)];
      return 'OPERATOR-' + tag;
    }
  };

  /* ═══════════════ DOM HELPERS ═══════════════ */
  PH.dom = {
    $:  (sel, root = document) => root.querySelector(sel),
    $$: (sel, root = document) => Array.from(root.querySelectorAll(sel)),
    on: (el, ev, fn, opts) => {
      if (!el) return () => {};
      el.addEventListener(ev, fn, opts);
      return () => el.removeEventListener(ev, fn, opts);
    },
    /* create element with optional class + innerHTML */
    el: (tag, cls, html) => {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (html != null) n.innerHTML = html;
      return n;
    },
    /* toggle a class based on a boolean */
    toggle: (el, cls, on) => {
      if (!el) return;
      el.classList.toggle(cls, !!on);
    },
    show: (el) => { if (el) el.classList.remove('u-hidden'); },
    hide: (el) => { if (el) el.classList.add('u-hidden'); },
    /* fade out then remove — used for intros and toasts */
    fadeOutRemove: (el, ms = 400) => {
      if (!el) return;
      el.style.transition = 'opacity ' + ms + 'ms ease';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), ms + 40);
    },
    /* safe HTML escape for user-supplied strings */
    escape: (s) => String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  };

  /* ═══════════════ EVENT BUS ═══════════════ */
  PH.bus = (function () {
    const handlers = Object.create(null);

    return {
      on(event, fn) {
        if (typeof fn !== 'function') return () => {};
        (handlers[event] = handlers[event] || []).push(fn);
        return () => this.off(event, fn);
      },
      off(event, fn) {
        const list = handlers[event];
        if (!list) return;
        const i = list.indexOf(fn);
        if (i >= 0) list.splice(i, 1);
      },
      emit(event, payload) {
        const list = handlers[event];
        if (!list || !list.length) return;
        /* copy so handlers can unsubscribe during emit */
        const snapshot = list.slice();
        for (const fn of snapshot) {
          try { fn(payload); }
          catch (err) { console.error('[PH.bus] handler error for "' + event + '"', err); }
        }
      },
      clear(event) {
        if (event) delete handlers[event];
        else for (const k in handlers) delete handlers[k];
      }
    };
  })();

  /* ═══════════════ STORAGE KEY CONSTANTS ═══════════════ */
  /* Centralized so we never typo a key across modules. */
  PH.KEYS = {
    SAVE: 'predatorshorizon.save.v1',
    SESSION: 'predatorshorizon.session.v1',
    LAUNCHES: 'predatorshorizon.launches.v1'
  };

  /* ═══════════════ LOCALSTORAGE WRAPPER ═══════════════ */
  /* Every read/write goes through here. If localStorage is
     unavailable (private mode, storage disabled), we degrade
     gracefully to in-memory so the app never crashes. */
  PH.ls = (function () {
    const memory = new Map();
    let available = false;

    try {
      const t = '__ph_test__';
      global.localStorage.setItem(t, '1');
      global.localStorage.removeItem(t);
      available = true;
    } catch (e) {
      available = false;
      console.warn('[PH.ls] localStorage unavailable — using in-memory fallback. Progress will not persist.');
    }

    return {
      available,

      get(key) {
        try {
          if (available) return global.localStorage.getItem(key);
          return memory.has(key) ? memory.get(key) : null;
        } catch (e) { return null; }
      },

      set(key, value) {
        try {
          if (available) global.localStorage.setItem(key, value);
          else memory.set(key, value);
          return true;
        } catch (e) {
          console.warn('[PH.ls] write failed for', key, e);
          return false;
        }
      },

      remove(key) {
        try {
          if (available) global.localStorage.removeItem(key);
          else memory.delete(key);
        } catch (e) { /* ignore */ }
      },

      /* JSON helpers — silently return fallback on parse error */
      getJSON(key, fallback = null) {
        const raw = this.get(key);
        if (raw == null) return fallback;
        try { return JSON.parse(raw); }
        catch (e) {
          console.warn('[PH.ls] corrupt JSON at', key, '— using fallback');
          return fallback;
        }
      },

      setJSON(key, obj) {
        try { return this.set(key, JSON.stringify(obj)); }
        catch (e) {
          console.warn('[PH.ls] cannot stringify for', key, e);
          return false;
        }
      }
    };
  })();

  /* ═══════════════ LAUNCH COUNTER ═══════════════ */
  /* Used by the intro cinematic to auto-skip after N launches. */
  PH.launches = {
    get() {
      const n = parseInt(PH.ls.get(PH.KEYS.LAUNCHES) || '0', 10);
      return isNaN(n) ? 0 : n;
    },
    increment() {
      const next = this.get() + 1;
      PH.ls.set(PH.KEYS.LAUNCHES, String(next));
      return next;
    },
    /* intro plays for the first N launches; after that it auto-skips
       unless the user manually re-enables it in settings. */
    shouldPlayIntro() {
      return this.get() < 5;
    }
  };

  /* ═══════════════ PAGE DETECTION ═══════════════ */
  /* main.js uses this to decide which module to boot. */
  PH.page = {
    current() {
      const path = (global.location.pathname || '').toLowerCase();
      if (path.endsWith('/login.html') || path.endsWith('login.html')) return 'login';
      if (path.endsWith('/app.html')   || path.endsWith('app.html'))   return 'app';
      if (path.endsWith('/play.html')  || path.endsWith('play.html'))  return 'play';
      /* index.html or any other path → public site */
      return 'public';
    },
    go(url) { global.location.href = url; },
    /* navigate with a tiny delay so callers can trigger
       a transition animation before the URL changes. */
    goAfter(url, ms = 0) {
      if (ms <= 0) { this.go(url); return; }
      setTimeout(() => this.go(url), ms);
    }
  };

  /* ═══════════════ READY HELPER ═══════════════ */
  PH.ready = function (fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  };

  /* ═══════════════ DEV FLAG ═══════════════ */
  /* Set to true during development to get verbose logs. */
  PH.DEV = false;
  PH.log = function () {
    if (PH.DEV) console.log.apply(console, ['[PH]'].concat(Array.prototype.slice.call(arguments)));
  };

})(window);