/* ═══════════════════════════════════════════════════════════════
   PREDATORS HORIZON — storage.js
   Save data model + local adapter. Remote adapter slot for later.
   Depends on: core.js
   ═══════════════════════════════════════════════════════════════ */

(function (PH) {
  'use strict';

  /* ═══════════════ SCHEMA VERSION ═══════════════ */
  /* Bump when the save shape changes. Migration logic below
     upgrades older saves in place rather than wiping them. */
  const SCHEMA_VERSION = 1;

  /* ═══════════════ DEFAULTS ═══════════════ */
  /* XP curve: total XP required to reach level N.
     Level 1 starts at 0. Each level costs 1.32× the previous. */
  function xpForLevel(level) {
    if (level <= 1) return 0;
    let total = 0;
    let cost = 120;
    for (let i = 2; i <= level; i++) {
      total += cost;
      cost = Math.round(cost * 1.32);
    }
    return total;
  }

  function blankOperator(name, opts = {}) {
    const now = Date.now();
    return {
      schema: SCHEMA_VERSION,
      id: opts.id || ('op_' + now.toString(36) + '_' + Math.random().toString(36).slice(2, 8)),
      name: name,
      pin: opts.pin || '',            /* empty string = no access code */
      guest: !!opts.guest,            /* true if created via "Continue as Guest" */
      created: now,
      lastSeen: now,

      /* ── Progression ── */
      xp: 0,
      credits: 750,                    /* starting purse */

      /* ── Unlocks & loadout ── */
      unlockedWeapons: [0],            /* index into WEAPONS table (see data layer) */
      unlockedSkins: [0],
      unlockedTerrains: [0],
      loadout: {
        weapons: [0],                  /* up to 8 slots */
        skin: 0,
        terrain: 0
      },

      /* ── Lifetime stats ── */
      stats: {
        runs: 0,
        kills: 0,
        deaths: 0,
        wins: 0,
        bestScore: 0,
        bestWave: 0,
        bestTime: 0,
        totalTime: 0,
        totalScore: 0,
        totalKills: 0,
        bossesKilled: 0,
        shotsFired: 0,
        damageDealt: 0,
        dashes: 0,
        pickups: 0,
        levelsCleared: 0
      },

      /* ── Endless mode record ── */
      endless: {
        bestWave: 0,
        bestScore: 0,
        bestLevel: 1,
        runs: 0
      },

      /* ── Campaign progress: { 1: { cleared, bestScore, bestTime, kills } } ── */
      levels: {},

      /* ── Awards earned (ids) ── */
      awards: [],

      /* ── Preferences ── */
      settings: {
        sfx: true,
        music: false,
        shake: 1,                      /* 0 = off, 2 = full */
        difficulty: 0,                 /* index into DIFFICULTIES */
        mode: 'large',                 /* 'large' | 'endless' */
        theme: 'city'                  /* 'city' | 'cave' */
      },

      /* ── Run history (most recent first, capped at 25) ── */
      history: []
    };
  }

  /* ═══════════════ SAVE FILE SHAPE ═══════════════ */
  /* A save file is a map of callsign → operator. */
  function blankSave() {
    return {
      schema: SCHEMA_VERSION,
      operators: {},
      lastOperator: null,              /* callsign of last active user */
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  /* ═══════════════ MIGRATIONS ═══════════════ */
  /* Add a case when SCHEMA_VERSION increments. Each migration
     receives the previous save and returns the upgraded one. */
  function migrate(save) {
    if (!save || typeof save !== 'object') return blankSave();
    let s = save;

    /* Example future migration:
       if (s.schema === 1) { upgrade; s.schema = 2; } */

    if (typeof s.schema !== 'number') s.schema = SCHEMA_VERSION;
    if (!s.operators) s.operators = {};
    if (!('lastOperator' in s)) s.lastOperator = null;
    return s;
  }

  /* ═══════════════ LOCAL ADAPTER ═══════════════ */
  /* Synchronous wrapper over PH.ls. Reads/writes the whole save
     blob atomically. For a save this size (<100 KB) that's fine. */
  const LocalAdapter = {
    name: 'local',

    load() {
      const raw = PH.ls.getJSON(PH.KEYS.SAVE, null);
      return migrate(raw || blankSave());
    },

    save(data) {
      data.updatedAt = Date.now();
      return PH.ls.setJSON(PH.KEYS.SAVE, data);
    },

    clear() {
      PH.ls.remove(PH.KEYS.SAVE);
    }
  };

  /* ═══════════════ REMOTE ADAPTER (STUB) ═══════════════ */
  /* When you're ready to move to a backend, implement this
     interface and set PH.Store.adapter = RemoteAdapter.
     All methods should return Promises to match the async shape. */
  const RemoteAdapter = {
    name: 'remote',
    async load() {
      throw new Error('[PH.Store] Remote adapter not implemented yet');
    },
    async save(data) {
      throw new Error('[PH.Store] Remote adapter not implemented yet');
    },
    async clear() {
      throw new Error('[PH.Store] Remote adapter not implemented yet');
    }
  };

  /* ═══════════════ PUBLIC STORE API ═══════════════ */
  const Store = PH.Store = {
    adapter: LocalAdapter,
    _cache: null,                    /* in-memory save, written through to adapter */
    current: null,                   /* operator object of the signed-in user */

    /* ── Load or return cached save ── */
    get() {
      if (!this._cache) this._cache = this.adapter.load();
      return this._cache;
    },

    /* ── Persist the current cache ── */
    flush() {
      if (!this._cache) return false;
      return this.adapter.save(this._cache);
    },

    /* ═══ OPERATOR LIFECYCLE ═══ */

    listOperators() {
      const save = this.get();
      return Object.keys(save.operators)
        .map(name => save.operators[name])
        .sort((a, b) => b.lastSeen - a.lastSeen);
    },

    getOperator(name) {
      if (!name) return null;
      return this.get().operators[name] || null;
    },

    hasOperator(name) {
      return !!this.get().operators[name];
    },

    /* Create a new operator. Returns { ok, operator?, error? }. */
    createOperator(rawName, pin = '', opts = {}) {
      const name = PH.format.callsign(rawName);

      if (name.length < 2) {
        return { ok: false, error: 'Callsign must be at least 2 characters.' };
      }
      if (this.hasOperator(name)) {
        return { ok: false, error: 'That callsign is already taken.' };
      }
      if (pin && pin.length > 8) {
        return { ok: false, error: 'Access code must be 8 characters or fewer.' };
      }

      const op = blankOperator(name, { pin, guest: opts.guest });
      const save = this.get();
      save.operators[name] = op;
      save.lastOperator = name;
      this._cache = save;
      this.flush();
      PH.bus.emit('operator:created', op);
      return { ok: true, operator: op };
    },

    /* Verify credentials. Returns { ok, operator?, error? }. */
    verifyOperator(name, pin = '') {
      const op = this.getOperator(PH.format.callsign(name));
      if (!op) return { ok: false, error: 'No operator with that callsign.' };
      if (op.pin && op.pin !== pin) return { ok: false, error: 'Incorrect access code.' };
      return { ok: true, operator: op };
    },

    /* Set the active operator in memory (does not persist session —
       session.js handles that separately). */
    setCurrent(name) {
      const op = this.getOperator(name);
      if (!op) return false;
      op.lastSeen = Date.now();
      this.current = op;
      const save = this.get();
      save.lastOperator = name;
      this.flush();
      PH.bus.emit('operator:current', op);
      return true;
    },

    /* Delete an operator permanently. */
    deleteOperator(name) {
      const save = this.get();
      if (!save.operators[name]) return false;
      delete save.operators[name];
      if (save.lastOperator === name) save.lastOperator = null;
      if (this.current && this.current.name === name) this.current = null;
      this._cache = save;
      this.flush();
      PH.bus.emit('operator:deleted', name);
      return true;
    },

    /* ═══ XP & ECONOMY ═══ */

    /* Level curve helpers (exposed for UI use). */
    xpForLevel: xpForLevel,
    levelInfo(xp) {
      let level = 1;
      while (level < 99 && xp >= xpForLevel(level + 1)) level++;
      const currentFloor = xpForLevel(level);
      const nextFloor = xpForLevel(level + 1);
      return {
        level,
        into:  xp - currentFloor,
        need:  nextFloor - currentFloor,
        total: xp,
        nextTotal: nextFloor
      };
    },

    /* Award XP. Returns { leveled, from, to, level }. */
    addXp(amount) {
      const op = this.current;
      if (!op || amount <= 0) return { leveled: false };
      const before = this.levelInfo(op.xp).level;
      op.xp += Math.round(amount);
      const after = this.levelInfo(op.xp).level;
      this.flush();
      PH.bus.emit('xp:gained', { amount, total: op.xp, leveled: after > before, from: before, to: after });
      return { leveled: after > before, from: before, to: after };
    },

    /* Award or spend coins. */
    addCredits(amount) {
      const op = this.current;
      if (!op || amount <= 0) return;
      op.credits += Math.round(amount);
      this.flush();
      PH.bus.emit('credits:gained', { amount, total: op.credits });
    },

    spendCredits(amount) {
      const op = this.current;
      if (!op || amount <= 0) return false;
      if (op.credits < amount) return false;
      op.credits -= Math.round(amount);
      this.flush();
      PH.bus.emit('credits:spent', { amount, total: op.credits });
      return true;
    },

    /* ═══ UNLOCKS ═══ */

    unlockWeapon(id, cost) {
      const op = this.current;
      if (!op || op.unlockedWeapons.includes(id)) return false;
      if (!this.spendCredits(cost)) return false;
      op.unlockedWeapons.push(id);
      this.flush();
      PH.bus.emit('weapon:unlocked', id);
      return true;
    },

    unlockSkin(id, cost) {
      const op = this.current;
      if (!op || op.unlockedSkins.includes(id)) return false;
      if (!this.spendCredits(cost)) return false;
      op.unlockedSkins.push(id);
      this.flush();
      PH.bus.emit('skin:unlocked', id);
      return true;
    },

    unlockTerrain(id, cost) {
      const op = this.current;
      if (!op || op.unlockedTerrains.includes(id)) return false;
      if (!this.spendCredits(cost)) return false;
      op.unlockedTerrains.push(id);
      this.flush();
      PH.bus.emit('terrain:unlocked', id);
      return true;
    },

    /* ═══ LOADOUT ═══ */

    equipWeapon(weaponId, slot) {
      const op = this.current;
      if (!op) return false;
      const s = PH.math.clamp(slot | 0, 0, 7);
      if (!op.unlockedWeapons.includes(weaponId)) return false;
      op.loadout.weapons[s] = weaponId;
      this.flush();
      PH.bus.emit('loadout:changed', op.loadout);
      return true;
    },

    unequipWeapon(weaponId) {
      const op = this.current;
      if (!op) return false;
      const i = op.loadout.weapons.indexOf(weaponId);
      if (i >= 0) op.loadout.weapons.splice(i, 1);
      this.flush();
      PH.bus.emit('loadout:changed', op.loadout);
      return true;
    },

    equipSkin(skinId) {
      const op = this.current;
      if (!op || !op.unlockedSkins.includes(skinId)) return false;
      op.loadout.skin = skinId;
      this.flush();
      PH.bus.emit('loadout:changed', op.loadout);
      return true;
    },

    equipTerrain(terrainId) {
      const op = this.current;
      if (!op || !op.unlockedTerrains.includes(terrainId)) return false;
      op.loadout.terrain = terrainId;
      this.flush();
      PH.bus.emit('loadout:changed', op.loadout);
      return true;
    },

    /* ═══ AWARDS ═══ */

    award(id) {
      const op = this.current;
      if (!op || op.awards.includes(id)) return false;
      op.awards.push(id);
      this.flush();
      PH.bus.emit('award:earned', id);
      return true;
    },

    hasAward(id) {
      return !!this.current && this.current.awards.includes(id);
    },

    /* ═══ RUN RECORDING ═══ */
    /* Called by the game layer when a run ends. Rolls stats and
       appends to history. Returns the reward summary. */
    recordRun(run) {
      const op = this.current;
      if (!op) return null;

      const stats = op.stats;
      stats.runs++;
      stats.kills       += run.kills || 0;
      stats.totalKills  += run.kills || 0;
      stats.totalTime   += run.time || 0;
      stats.totalScore  += run.score || 0;
      stats.shotsFired  += run.shots || 0;
      stats.damageDealt += run.damage || 0;
      stats.dashes      += run.dashes || 0;
      stats.pickups     += run.pickups || 0;
      stats.bossesKilled+= run.bosses || 0;

      if (run.score > stats.bestScore) stats.bestScore = run.score;
      if (run.wave  > stats.bestWave)  stats.bestWave  = run.wave;
      if (run.time  > stats.bestTime)  stats.bestTime  = run.time;
      if (run.died)  stats.deaths++;
      if (run.won)   stats.wins++;
      if (run.clearedLevel) stats.levelsCleared++;

      if (run.endless) {
        op.endless.runs++;
        if (run.wave  > op.endless.bestWave)  op.endless.bestWave  = run.wave;
        if (run.score > op.endless.bestScore) op.endless.bestScore = run.score;
        if (run.level > op.endless.bestLevel) op.endless.bestLevel = run.level;
      }

      if (run.level && run.won && !run.endless) {
        const prev = op.levels[run.level] || {};
        op.levels[run.level] = {
          cleared:   true,
          bestScore: Math.max(prev.bestScore || 0, run.score),
          bestTime:  Math.min(prev.bestTime || Infinity, run.time),
          kills:     Math.max(prev.kills || 0, run.kills)
        };
      }

      op.history.unshift({
        mode:       run.endless ? 'ENDLESS' : 'CAMPAIGN',
        level:      run.level || null,
        score:      run.score || 0,
        wave:       run.wave || 0,
        kills:      run.kills || 0,
        time:       Math.round(run.time || 0),
        won:        !!run.won,
        difficulty: run.difficulty || 0,
        date:       Date.now()
      });
      if (op.history.length > 25) op.history.length = 25;

      this.flush();
      return { stats: op.stats, endless: op.endless };
    },

    /* ═══ SESSION-ADJACENT HELPERS ═══ */

    lastOperatorName() {
      return this.get().lastOperator;
    },

    /* Wipe everything. Destructive; call from a confirm dialog. */
    wipeAll() {
      this.adapter.clear();
      this._cache = blankSave();
      this.current = null;
      PH.bus.emit('save:wiped');
    }
  };

})(window.PH);