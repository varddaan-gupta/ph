/* ═══════════════════════════════════════════════════════════════
   PREDATORS HORIZON — session.js
   Who is currently signed in. Survives page navigation.
   Depends on: core.js, storage.js
   ═══════════════════════════════════════════════════════════════ */

(function (PH) {
  'use strict';

  /* A session is a small record stored separately from the save file:
       { name, started, lastActive, guest }
     It's the "remember me" flag. It does NOT hold credentials. */
  const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;   /* 30 days */

  const Session = PH.Session = {

    /* ── Read the raw session record ── */
    _read() {
      const s = PH.ls.getJSON(PH.KEYS.SESSION, null);
      if (!s || typeof s !== 'object') return null;
      if (!s.name || typeof s.started !== 'number') return null;
      /* expiry check */
      if (Date.now() - s.lastActive > SESSION_MAX_AGE_MS) {
        this._clearRaw();
        return null;
      }
      return s;
    },

    _write(record) {
      record.lastActive = Date.now();
      PH.ls.setJSON(PH.KEYS.SESSION, record);
    },

    _clearRaw() {
      PH.ls.remove(PH.KEYS.SESSION);
    },

    /* ── Public: is someone signed in AND does their save exist? ── */
    hasActiveSession() {
      const s = this._read();
      if (!s) return false;
      if (!PH.Store.hasOperator(s.name)) {
        /* Save was wiped but session lingered — clean up. */
        this._clearRaw();
        return false;
      }
      return true;
    },

    /* ── Public: the signed-in operator object, or null ── */
    currentOperator() {
      if (!this.hasActiveSession()) return null;
      const s = this._read();
      return PH.Store.getOperator(s.name);
    },

    currentName() {
      const s = this._read();
      return s ? s.name : null;
    },

    /* ═══ SIGN IN / SIGN UP / GUEST ═══ */

    /* Sign in with an existing operator. */
    signIn(rawName, pin = '') {
      const name = PH.format.callsign(rawName);
      const check = PH.Store.verifyOperator(name, pin);
      if (!check.ok) return check;

      PH.Store.setCurrent(name);
      this._write({
        name,
        started: Date.now(),
        lastActive: Date.now(),
        guest: !!check.operator.guest
      });
      PH.bus.emit('session:start', check.operator);
      return { ok: true, operator: check.operator };
    },

    /* Create a new operator and immediately sign in. */
    signUp(rawName, pin = '') {
      const created = PH.Store.createOperator(rawName, pin, { guest: false });
      if (!created.ok) return created;

      PH.Store.setCurrent(created.operator.name);
      this._write({
        name: created.operator.name,
        started: Date.now(),
        lastActive: Date.now(),
        guest: false
      });
      PH.bus.emit('session:start', created.operator);
      return { ok: true, operator: created.operator };
    },

    /* Create a guest operator and sign in. If the guest already has
       a session, this is a no-op that just refreshes it. */
    continueAsGuest() {
      const existing = this._read();
      if (existing && existing.guest && PH.Store.hasOperator(existing.name)) {
        const op = PH.Store.getOperator(existing.name);
        PH.Store.setCurrent(op.name);
        this._write(existing);
        return { ok: true, operator: op, resumed: true };
      }

      /* Generate a unique callsign. Collisions are essentially
         impossible (16^4 = 65,536 combos) but we guard anyway. */
      let name, tries = 0;
      do {
        name = PH.format.guestCallsign();
        tries++;
      } while (PH.Store.hasOperator(name) && tries < 20);

      const created = PH.Store.createOperator(name, '', { guest: true });
      if (!created.ok) return created;

      PH.Store.setCurrent(created.operator.name);
      this._write({
        name: created.operator.name,
        started: Date.now(),
        lastActive: Date.now(),
        guest: true
      });
      PH.bus.emit('session:start', created.operator);
      return { ok: true, operator: created.operator, guest: true };
    },

    /* Upgrade a guest to a full operator. Renames in place and
       migrates the save record. */
    claimGuest(rawName, pin = '') {
      const op = PH.Store.current;
      if (!op || !op.guest) return { ok: false, error: 'Not a guest account.' };

      const newName = PH.format.callsign(rawName);
      if (newName.length < 2) return { ok: false, error: 'Callsign must be at least 2 characters.' };
      if (PH.Store.hasOperator(newName)) return { ok: false, error: 'That callsign is already taken.' };

      const save = PH.Store.get();
      const oldName = op.name;
      op.name = newName;
      op.guest = false;
      op.pin = pin || '';
      delete save.operators[oldName];
      save.operators[newName] = op;
      save.lastOperator = newName;
      PH.Store._cache = save;
      PH.Store.flush();

      this._write({
        name: newName,
        started: Date.now(),
        lastActive: Date.now(),
        guest: false
      });

      PH.bus.emit('session:claimed', op);
      return { ok: true, operator: op };
    },

    /* Sign out. Does NOT delete the operator's data. */
    signOut() {
      const name = this.currentName();
      this._clearRaw();
      PH.Store.current = null;
      PH.bus.emit('session:end', name);
      return true;
    },

    /* ═══ NAVIGATION HELPERS ═══ */

    /* Where should "Enter the Game" take the user? */
    destinationForEntry() {
      if (this.hasActiveSession()) return 'app.html';
      return 'login.html';
    },

    /* Called by main.js on public site pages to wire the entry
       button(s) to the correct destination. */
    wireEntryButtons() {
      const dest = this.destinationForEntry();
      const btns = document.querySelectorAll('[data-nav="enter"], [data-nav="enter-btn"]');
      btns.forEach(b => {
        /* Only override href if it currently points at login.html —
           respect any custom links the author set. */
        const href = b.getAttribute('href') || '';
        if (href.indexOf('login.html') >= 0) {
          b.setAttribute('href', dest);
        }
      });
      PH.log('entry buttons wired to', dest);
    }
  };

  /* Expose a convenience for the intro to know if it should play. */
  PH.Session.shouldShowIntro = function () {
    return PH.launches.shouldPlayIntro();
  };

})(window.PH);