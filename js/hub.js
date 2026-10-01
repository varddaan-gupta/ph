/* ═══════════════════════════════════════════════════════════════
   PREDATORS HORIZON — hub.js
   The safehouse: state machine, room rendering, transitions.
   Depends on: core.js, storage.js, session.js, icons.js, intro.js
   ═══════════════════════════════════════════════════════════════ */

(function (PH) {
  'use strict';

  /* ═══════════════════════════════════════════════════════════
     ROOM REGISTRY
     Six rooms. Each defines its sidebar icon, its title, and a
     render function that produces the room's inner HTML.
     ═══════════════════════════════════════════════════════════ */
  const ROOMS = [
    {
      id: 'door',
      label: 'Deploy',
      kicker: 'Mission Control',
      title: 'The Door',
      icon: '<path d="M3 21 h18 M5 21 V5 a2 2 0 0 1 2-2 h10 a2 2 0 0 1 2 2 v16 M12 12 v1"/>',
      render: renderDoor
    },
    {
      id: 'arsenal',
      label: 'Arsenal',
      kicker: 'Weapon Systems',
      title: 'The Arsenal',
      icon: '<path d="M3 12 h4 l2-4 l3 6 l3-4 l3 4 h4"/>',
      render: renderArsenal
    },
    {
      id: 'locker',
      label: 'Locker',
      kicker: 'Operator Skins',
      title: 'The Locker',
      icon: '<path d="M12 3 l8 4 v10 l-8 4 l-8-4 V7 z M4 7 l8 4 l8-4 M12 11 v10"/>',
      render: renderLocker
    },
    {
      id: 'maps',
      label: 'Maps',
      kicker: 'Terrain Selection',
      title: 'The Map Room',
      icon: '<path d="M3 6 l6-2 l6 2 l6-2 v14 l-6 2 l-6-2 l-6 2 z M9 4 v14 M15 6 v14"/>',
      render: renderMaps
    },
    {
      id: 'terminal',
      label: 'Terminal',
      kicker: 'Record & Log',
      title: 'The Terminal',
      icon: '<path d="M4 4 h16 v14 h-6 l-2 3 l-2-3 H4 z M8 9 h8 M8 13 h5"/>',
      render: renderTerminal
    },
    {
      id: 'mirror',
      label: 'Mirror',
      kicker: 'Operator Profile',
      title: 'The Mirror',
      icon: '<circle cx="12" cy="9" r="4"/><path d="M4 21 v-2 a6 6 0 0 1 6-6 h4 a6 6 0 0 1 6 6 v2"/>',
      render: renderMirror
    }
  ];

  /* ═══════════════════════════════════════════════════════════
     STATE
     ═══════════════════════════════════════════════════════════ */
  const Hub = PH.Hub = {
    currentRoom: 'door',
    els: {},
    _toastTimer: null,

    /* ═══ INIT ═══ */
    init() {
      this.els.sidebar = document.getElementById('sidebar');
      this.els.main    = document.getElementById('main');
      this.els.toast   = document.getElementById('toastLayer');
      this.els.credits = document.getElementById('topbarCredits');
      this.els.xpRing  = document.getElementById('xpRing');
      this.els.level   = document.getElementById('topbarLevel');
      this.els.name    = document.getElementById('topbarName');
      this.els.xpSub   = document.getElementById('topbarXpSub');

      this.renderSidebar();
      this.showRoom(this.currentRoom);

      /* Subscribe to progression events so the topbar auto-updates. */
      PH.bus.on('credits:gained', () => this.refreshTopbar());
      PH.bus.on('credits:spent',  () => this.refreshTopbar());
      PH.bus.on('xp:gained',      () => this.refreshTopbar());
      PH.bus.on('loadout:changed', () => this.showRoom(this.currentRoom));
    },

    /* ═══ SIDEBAR ═══ */
    renderSidebar() {
      const sb = this.els.sidebar;
      sb.innerHTML = '';

      ROOMS.forEach(room => {
        const btn = PH.dom.el('button', 'room-btn' + (room.id === this.currentRoom ? ' is-active' : ''));
        btn.dataset.room = room.id;
        btn.title = room.title;
        btn.innerHTML =
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
            room.icon +
          '</svg>' +
          '<span class="room-btn__label">' + room.label + '</span>' +
          (room.id === 'door' && this.hasPendingReward() ? '<span class="room-btn__badge">!</span>' : '');

        btn.addEventListener('click', () => this.showRoom(room.id));
        sb.appendChild(btn);
      });

      /* Sidebar footer: settings + sign out */
      const footer = PH.dom.el('div', 'hub__sidebar-footer');
      footer.innerHTML =
        '<button class="room-btn" title="Settings" data-sidebar-action="settings">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
            '<circle cx="12" cy="12" r="3"/>' +
            '<path d="M12 1 v3 M12 20 v3 M4.2 4.2 l2.1 2.1 M17.7 17.7 l2.1 2.1 M1 12 h3 M20 12 h3 M4.2 19.8 l2.1-2.1 M17.7 6.3 l2.1-2.1"/>' +
          '</svg>' +
          '<span class="room-btn__label">Setup</span>' +
        '</button>' +
        '<button class="room-btn" title="Sign Out" data-sidebar-action="signout">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M9 21 H5 a2 2 0 0 1-2-2 V5 a2 2 0 0 1 2-2 h4 M16 17 l5-5-5-5 M21 12 H9"/>' +
          '</svg>' +
          '<span class="room-btn__label">Exit</span>' +
        '</button>';

      footer.querySelectorAll('[data-sidebar-action]').forEach(b => {
        b.addEventListener('click', () => {
          const act = b.dataset.sidebarAction;
          if (act === 'settings') this.showRoom('mirror');
          if (act === 'signout') this.signOut();
        });
      });

      sb.appendChild(footer);
    },

    /* Highlight the active sidebar button without rebuilding it. */
    syncSidebar() {
      if (!this.els.sidebar) return;
      this.els.sidebar.querySelectorAll('.room-btn').forEach(b => {
        if (b.dataset.room) {
          b.classList.toggle('is-active', b.dataset.room === this.currentRoom);
        }
      });
    },

    /* ═══ ROOM NAVIGATION ═══ */
    showRoom(id) {
      const room = ROOMS.find(r => r.id === id);
      if (!room) return;

      /* If already on this room, still re-render (used after loadout changes). */
      this.currentRoom = id;
      this.syncSidebar();

      const main = this.els.main;
      main.style.opacity = '0';
      setTimeout(() => {
        main.innerHTML = room.render.call(this);
        this.wireRoom(id);
        main.style.opacity = '';
      }, 60);
    },

    /* ═══ ROOM: DOOR (Play) ═══ */
    wireRoom(id) {
      const main = this.els.main;
      const op = PH.Store.current;
      if (!op) return;

      /* General: unlock button handlers exist per-room below. */
      if (id === 'door')    this.wireDoor(main, op);
      if (id === 'arsenal') this.wireArsenal(main, op);
      if (id === 'locker')  this.wireLocker(main, op);
      if (id === 'maps')    this.wireMaps(main, op);
      if (id === 'terminal') this.wireTerminal(main, op);
      if (id === 'mirror')  this.wireMirror(main, op);
    },

    wireDoor(main, op) {
      const playBtn = main.querySelector('#doorPlayBtn');
      if (playBtn) {
        playBtn.addEventListener('click', () => this.launchMission());
      }
      const endlessBtn = main.querySelector('#doorEndlessBtn');
      if (endlessBtn) {
        endlessBtn.addEventListener('click', () => {
          op.settings.mode = 'endless';
          PH.Store.flush();
          this.launchMission();
        });
      }
      /* Loadout slot click: jump to Arsenal with the slot selected. */
      main.querySelectorAll('.loadout-slot').forEach(slot => {
        slot.addEventListener('click', () => {
          this.selectedSlot = parseInt(slot.dataset.slot, 10) || 0;
          this.showRoom('arsenal');
        });
      });
    },

    launchMission() {
      const op = PH.Store.current;
      if (!op) return;
      if (!op.loadout.weapons.length) {
        this.toast('Equip at least one weapon first.');
        this.showRoom('arsenal');
        return;
      }
      /* Little startup flourish, then navigate. */
      this.toast('Deploying…');
      setTimeout(() => PH.page.go('play.html'), 340);
    },

    /* ═══ ROOM: ARSENAL ═══ */
    wireArsenal(main, op) {
      main.querySelectorAll('.item-card[data-weapon]').forEach(card => {
        const wid = parseInt(card.dataset.weapon, 10);
        const weapon = PH.Icons.weapon(wid);
        const owned = op.unlockedWeapons.includes(wid);

        const unlockBtn = card.querySelector('[data-action="unlock"]');
        if (unlockBtn) {
          unlockBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!PH.Store.spendCredits(weapon.cost)) {
              this.toast('Not enough credits.');
              return;
            }
            op.unlockedWeapons.push(wid);
            PH.Store.flush();
            this.toast(weapon.name + ' unlocked');
            this.refreshTopbar();
            this.showRoom('arsenal');
          });
        }

        const equipBtn = card.querySelector('[data-action="equip"]');
        if (equipBtn) {
          equipBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const slot = this.selectedSlot || 0;
            if (!op.unlockedWeapons.includes(wid)) return;
            /* Remove from any other slot first so the same weapon isn't duped. */
            for (let i = 0; i < op.loadout.weapons.length; i++) {
              if (op.loadout.weapons[i] === wid) op.loadout.weapons.splice(i, 1);
            }
            op.loadout.weapons[slot] = wid;
            /* Trim trailing holes. */
            while (op.loadout.weapons.length && op.loadout.weapons[op.loadout.weapons.length - 1] == null) {
              op.loadout.weapons.pop();
            }
            PH.Store.flush();
            this.toast(weapon.name + ' equipped to slot ' + (slot + 1));
            this.showRoom('arsenal');
          });
        }

        const unequipBtn = card.querySelector('[data-action="unequip"]');
        if (unequipBtn) {
          unequipBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const i = op.loadout.weapons.indexOf(wid);
            if (i >= 0) op.loadout.weapons.splice(i, 1);
            PH.Store.flush();
            this.toast(weapon.name + ' unequipped');
            this.showRoom('arsenal');
          });
        }
      });

      /* Slot picker chips at the top */
      main.querySelectorAll('[data-slot-pick]').forEach(chip => {
        chip.addEventListener('click', () => {
          this.selectedSlot = parseInt(chip.dataset.slotPick, 10);
          this.showRoom('arsenal');
        });
      });
    },

    /* ═══ ROOM: LOCKER ═══ */
    wireLocker(main, op) {
      main.querySelectorAll('.item-card[data-skin]').forEach(card => {
        const sid = parseInt(card.dataset.skin, 10);
        const skin = PH.Icons.skin(sid);
        const owned = op.unlockedSkins.includes(sid);

        const unlockBtn = card.querySelector('[data-action="unlock"]');
        if (unlockBtn) {
          unlockBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!PH.Store.spendCredits(skin.cost)) {
              this.toast('Not enough credits.');
              return;
            }
            op.unlockedSkins.push(sid);
            PH.Store.flush();
            this.toast(skin.name + ' unlocked');
            this.refreshTopbar();
            this.showRoom('locker');
          });
        }

        const equipBtn = card.querySelector('[data-action="equip"]');
        if (equipBtn) {
          equipBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!op.unlockedSkins.includes(sid)) return;
            op.loadout.skin = sid;
            PH.Store.flush();
            this.toast(skin.name + ' equipped');
            this.showRoom('locker');
          });
        }
      });
    },

    /* ═══ ROOM: MAPS ═══ */
    wireMaps(main, op) {
      main.querySelectorAll('.item-card[data-terrain]').forEach(card => {
        const tid = parseInt(card.dataset.terrain, 10);
        const terrain = PH.Icons.terrain(tid);

        const unlockBtn = card.querySelector('[data-action="unlock"]');
        if (unlockBtn) {
          unlockBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!PH.Store.spendCredits(terrain.cost)) {
              this.toast('Not enough credits.');
              return;
            }
            op.unlockedTerrains.push(tid);
            PH.Store.flush();
            this.toast(terrain.name + ' unlocked');
            this.refreshTopbar();
            this.showRoom('maps');
          });
        }

        const equipBtn = card.querySelector('[data-action="equip"]');
        if (equipBtn) {
          equipBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!op.unlockedTerrains.includes(tid)) return;
            op.loadout.terrain = tid;
            op.settings.theme = terrain.key === 'caverns' || terrain.key === 'void-trench' ? 'cave' : 'city';
            PH.Store.flush();
            this.toast(terrain.name + ' selected');
            this.showRoom('maps');
          });
        }
      });
    },

    /* ═══ ROOM: TERMINAL ═══ */
    wireTerminal(main, op) {
      const wipe = main.querySelector('#terminalWipe');
      if (wipe) {
        wipe.addEventListener('click', () => {
          if (!confirm('Reset your run history? Stats and unlocks are kept.')) return;
          op.history = [];
          PH.Store.flush();
          this.toast('History cleared');
          this.showRoom('terminal');
        });
      }
    },

    /* ═══ ROOM: MIRROR ═══ */
    wireMirror(main, op) {
      /* Settings toggles */
      main.querySelectorAll('[data-toggle]').forEach(t => {
        t.addEventListener('click', () => {
          const key = t.dataset.toggle;
          op.settings[key] = !op.settings[key];
          t.classList.toggle('is-on', op.settings[key]);
          PH.Store.flush();
        });
      });

      /* Theme cycle */
      const cycle = main.querySelector('#settingTheme');
      if (cycle) {
        cycle.addEventListener('click', () => {
          op.settings.theme = op.settings.theme === 'city' ? 'cave' : 'city';
          PH.Store.flush();
          this.showRoom('mirror');
        });
      }

      /* Claim guest */
      const claim = main.querySelector('#claimGuestBtn');
      if (claim) {
        claim.addEventListener('click', () => this.promptClaimGuest());
      }

      /* Sign out */
      const out = main.querySelector('#mirrorSignOut');
      if (out) {
        out.addEventListener('click', () => this.signOut());
      }

      /* Wipe account */
      const wipe = main.querySelector('#mirrorWipe');
      if (wipe) {
        wipe.addEventListener('click', () => {
          if (!confirm('Permanently delete ' + op.name + '? All progress will be lost.')) return;
          PH.Store.deleteOperator(op.name);
          PH.Session.signOut();
          PH.page.go('index.html');
        });
      }
    },

    promptClaimGuest() {
      const op = PH.Store.current;
      if (!op || !op.guest) return;
      const newName = prompt('Choose a permanent callsign (2–14 chars):', op.name.replace('OPERATOR-', 'OP-'));
      if (newName == null) return;
      const res = PH.Session.claimGuest(newName, '');
      if (!res.ok) { this.toast(res.error || 'Could not claim account'); return; }
      this.toast('Account claimed: ' + res.operator.name);
      this.refreshTopbar();
      this.showRoom('mirror');
    },

    signOut() {
      if (!confirm('Sign out? Your progress is saved.')) return;
      PH.Session.signOut();
      PH.page.go('index.html');
    },

    /* ═══ TOPBAR ═══ */
    refreshTopbar() {
      const op = PH.Store.current;
      if (!op) return;

      if (this.els.credits) this.els.credits.textContent = PH.format.coins(op.credits);
      if (this.els.name)    this.els.name.textContent = op.name;

      const lvl = PH.Store.levelInfo(op.xp);
      if (this.els.level)  this.els.level.textContent = lvl.level;
      if (this.els.xpSub)  this.els.xpSub.textContent = lvl.into + ' / ' + lvl.need + ' XP';
      if (this.els.xpRing) {
        const pct = lvl.need ? lvl.into / lvl.need : 0;
        this.els.xpRing.style.strokeDashoffset = String(100 - pct * 100);
      }
    },

    /* ═══ TOASTS ═══ */
    toast(msg) {
      if (!this.els.toast) return;
      const el = PH.dom.el('div', 'toast', PH.dom.escape(msg));
      this.els.toast.appendChild(el);
      setTimeout(() => {
        el.classList.add('is-out');
        setTimeout(() => el.remove(), 260);
      }, 2400);
    },

    /* ═══ HELPERS ═══ */
    hasPendingReward() {
      const op = PH.Store.current;
      if (!op) return false;
      /* Heuristic: if the player has unlocked less than one full page of
         items but has credits to buy something, flag the door. Simple. */
      return op.credits >= 400 && op.unlockedWeapons.length < 3;
    },

    /* ═══════════════════════════════════════════════════════════
       ROOM RENDERERS
       Each returns an HTML string. Called by showRoom().
       ═══════════════════════════════════════════════════════════ */

    /* ── DOOR ── */
    /* (renderDoor is defined outside the object for brevity — see below.) */
  };

  /* ═══════════════════════════════════════════════════════════
     ROOM RENDER FUNCTIONS
     These are the module-level functions referenced by ROOMS.
     ═══════════════════════════════════════════════════════════ */

  function renderDoor() {
    const op = PH.Store.current;
    const loadout = op.loadout;
    const equippedSkin = PH.Icons.skin(loadout.skin);
    const equippedTerrain = PH.Icons.terrain(loadout.terrain || 0);

    /* Build loadout slot HTML */
    let slotsHtml = '';
    for (let i = 0; i < 8; i++) {
      const wid = loadout.weapons[i];
      const w = wid != null ? PH.Icons.weapon(wid) : null;
      const svg = w ? PH.Icons.weaponSvg(w, { radial: 0.05 }) : '';
      const cls = 'loadout-slot' + (w ? '' : ' is-empty');
      slotsHtml +=
        '<div class="' + cls + '" data-slot="' + i + '" title="' + (w ? w.name : 'Empty slot') + '">' +
          '<span class="loadout-slot__key">' + (i + 1) + '</span>' +
          (w ? '<div class="loadout-slot__svg">' + svg + '</div>' : '') +
        '</div>';
    }

    return (
      '<section class="room is-active" data-room="door">' +

        '<div class="door">' +

          /* ── Left: hero panel ── */
          '<div class="door__hero">' +
            '<div>' +
              '<div class="door__badge">Mission Ready</div>' +
              '<h2 class="door__title">Predator <span>01</span></h2>' +
              '<p class="door__lead">' +
                'The first breach. Learn the safehouse, learn the rhythm, ' +
                'and get out alive. Everything after this is worse.' +
              '</p>' +
            '</div>' +
            '<div class="door__cta">' +
              '<button class="ph-btn ph-btn--primary ph-btn--lg" id="doorPlayBtn">' +
                'Deploy' +
              '</button>' +
              '<button class="ph-btn ph-btn--ghost ph-btn--lg" id="doorEndlessBtn">' +
                'Endless Loop' +
              '</button>' +
            '</div>' +
          '</div>' +

          /* ── Right: current loadout ── */
          '<div class="door__panel">' +
            '<div class="door__panel-title">Current Loadout</div>' +
            '<div class="loadout-slots" style="margin-bottom:var(--s-5)">' +
              slotsHtml +
            '</div>' +

            '<div class="door__panel-title">Operator</div>' +
            '<div style="display:flex;gap:var(--s-4);align-items:center">' +
              '<div class="profile-avatar" style="width:64px;height:64px;border-color:' + equippedSkin.accent + '">' +
                PH.Icons.skinSvg(equippedSkin, { radial: 0.08 }) +
              '</div>' +
              '<div style="min-width:0">' +
                '<div style="font-family:var(--font-display);font-size:var(--fs-sm);letter-spacing:var(--ls-wide);text-transform:uppercase;color:var(--bone)">' +
                  PH.dom.escape(op.name) +
                '</div>' +
                '<div style="font-family:var(--font-mono);font-size:11px;color:var(--ash);margin-top:2px">' +
                  equippedSkin.name + ' · ' + equippedTerrain.name +
                '</div>' +
              '</div>' +
            '</div>' +

          '</div>' +

        '</div>' +

      '</section>'
    );
  }

  /* ── ARSENAL ── */
  function renderArsenal() {
    const op = PH.Store.current;
    const selectedSlot = this.selectedSlot || 0;

    /* Slot chips */
    let chipsHtml = '<div style="display:flex;gap:6px;margin-bottom:var(--s-5);flex-wrap:wrap">';
    for (let i = 0; i < 8; i++) {
      const wid = op.loadout.weapons[i];
      const w = wid != null ? PH.Icons.weapon(wid) : null;
      const isActive = i === selectedSlot;
      chipsHtml +=
        '<button class="ph-btn ' + (isActive ? 'ph-btn--primary' : 'ph-btn--ghost') + ' ph-btn--sm" data-slot-pick="' + i + '" ' +
        'style="min-width:44px;padding:6px 10px;font-size:11px">' +
          (i + 1) +
          (w ? ' <span style="opacity:0.7">· ' + w.glyph + '</span>' : '') +
        '</button>';
    }
    chipsHtml += '</div>';

    /* Weapons grid */
    const cards = PH.Icons.WEAPONS.map(w => {
      const owned = op.unlockedWeapons.includes(w.id);
      const equipped = op.loadout.weapons.includes(w.id);
      const canAfford = op.credits >= w.cost;
      const cls = 'item-card' +
        (owned ? '' : ' is-locked') +
        (equipped ? ' is-equipped' : '');
      const costCls = w.cost === 0 || owned ? 'is-owned' : (canAfford ? '' : 'is-poor');
      const costText = w.cost === 0 ? 'Free' : (owned ? 'Owned' : PH.format.coins(w.cost));

      let actionHtml = '';
      if (!owned) {
        actionHtml =
          '<button class="ph-btn ' + (canAfford ? 'ph-btn--primary' : '') + ' ph-btn--block ph-btn--sm" ' +
            'data-action="unlock" ' + (canAfford ? '' : 'disabled') + '>' +
            'Unlock' +
          '</button>';
      } else if (equipped) {
        actionHtml =
          '<button class="ph-btn ph-btn--ghost ph-btn--block ph-btn--sm" data-action="unequip">Unequip</button>';
      } else {
        actionHtml =
          '<button class="ph-btn ph-btn--primary ph-btn--block ph-btn--sm" data-action="equip">' +
            'Equip to Slot ' + (selectedSlot + 1) +
          '</button>';
      }

      return (
        '<div class="' + cls + '" data-weapon="' + w.id + '">' +
          '<div class="item-card__icon">' + PH.Icons.weaponSvg(w) + '</div>' +
          '<div class="item-card__name">' + w.name + '</div>' +
          '<div class="item-card__desc">' + w.desc + '</div>' +
          '<div class="item-card__meta">' +
            '<span class="item-card__tier">Tier ' + w.tier + ' · ' + w.dps + ' DPS</span>' +
            '<span class="item-card__cost ' + costCls + '">' + costText + '</span>' +
          '</div>' +
          '<div class="item-card__actions">' + actionHtml + '</div>' +
        '</div>'
      );
    }).join('');

    return (
      '<section class="room is-active" data-room="arsenal">' +
        '<div class="room__head">' +
          '<div class="room__title-wrap">' +
            '<div class="room__kicker">Weapon Systems</div>' +
            '<h2 class="room__title">The Arsenal</h2>' +
            '<p class="room__sub">' +
              'Twelve weapons. Kinetic rifles for reliability, gravity wells for control, ' +
              'rail snipers for the moment the boss stops moving. Pick a slot, then a weapon.' +
            '</p>' +
          '</div>' +
        '</div>' +

        '<div class="section-label" style="font-family:var(--font-display);font-size:11px;letter-spacing:var(--ls-wide);text-transform:uppercase;color:var(--ash);margin-bottom:var(--s-3)">' +
          'Assign to slot' +
        '</div>' +
        chipsHtml +

        '<div class="item-grid">' + cards + '</div>' +
      '</section>'
    );
  }

  /* ── LOCKER ── */
  function renderLocker() {
    const op = PH.Store.current;

    const cards = PH.Icons.SKINS.map(s => {
      const owned = op.unlockedSkins.includes(s.id);
      const equipped = op.loadout.skin === s.id;
      const canAfford = op.credits >= s.cost;
      const cls = 'item-card' +
        (owned ? '' : ' is-locked') +
        (equipped ? ' is-equipped' : '');
      const costCls = s.cost === 0 || owned ? 'is-owned' : (canAfford ? '' : 'is-poor');
      const costText = s.cost === 0 ? 'Free' : (owned ? 'Owned' : PH.format.coins(s.cost));

      let actionHtml = '';
      if (!owned) {
        actionHtml =
          '<button class="ph-btn ' + (canAfford ? 'ph-btn--primary' : '') + ' ph-btn--block ph-btn--sm" ' +
            'data-action="unlock" ' + (canAfford ? '' : 'disabled') + '>' +
            'Unlock' +
          '</button>';
      } else if (equipped) {
        actionHtml =
          '<button class="ph-btn ph-btn--ghost ph-btn--block ph-btn--sm" disabled>Equipped</button>';
      } else {
        actionHtml =
          '<button class="ph-btn ph-btn--primary ph-btn--block ph-btn--sm" data-action="equip">Equip</button>';
      }

      return (
        '<div class="' + cls + '" data-skin="' + s.id + '">' +
          '<div class="item-card__icon" style="background:radial-gradient(circle at 50% 40%, ' + s.accent + '22, transparent 70%), rgba(5,5,5,0.5)">' +
            PH.Icons.skinSvg(s) +
          '</div>' +
          '<div class="item-card__name">' + s.name + '</div>' +
          '<div class="item-card__desc">' + s.desc + '</div>' +
          '<div class="item-card__meta">' +
            '<span class="item-card__tier">Tier ' + s.tier + ' · ' + s.shape + '</span>' +
            '<span class="item-card__cost ' + costCls + '">' + costText + '</span>' +
          '</div>' +
          '<div class="item-card__actions">' + actionHtml + '</div>' +
        '</div>'
      );
    }).join('');

    return (
      '<section class="room is-active" data-room="locker">' +
        '<div class="room__head">' +
          '<div class="room__title-wrap">' +
            '<div class="room__kicker">Operator Skins</div>' +
            '<h2 class="room__title">The Locker</h2>' +
            '<p class="room__sub">' +
              'Sixteen silhouettes. Every one changes how you read on the field. ' +
              'Vanguard for a clean start. Singularity if you want to be seen coming.' +
            '</p>' +
          '</div>' +
        '</div>' +
        '<div class="item-grid">' + cards + '</div>' +
      '</section>'
    );
  }

  /* ── MAP ROOM ── */
  function renderMaps() {
    const op = PH.Store.current;

    const cards = PH.Icons.TERRAINS.map(t => {
      const owned = op.unlockedTerrains.includes(t.id);
      const equipped = op.loadout.terrain === t.id;
      const canAfford = op.credits >= t.cost;
      const cls = 'item-card' +
        (owned ? '' : ' is-locked') +
        (equipped ? ' is-equipped' : '');
      const costCls = t.cost === 0 || owned ? 'is-owned' : (canAfford ? '' : 'is-poor');
      const costText = t.cost === 0 ? 'Free' : (owned ? 'Owned' : PH.format.coins(t.cost));

      let actionHtml = '';
      if (!owned) {
        actionHtml =
          '<button class="ph-btn ' + (canAfford ? 'ph-btn--primary' : '') + ' ph-btn--block ph-btn--sm" ' +
            'data-action="unlock" ' + (canAfford ? '' : 'disabled') + '>' +
            'Unlock' +
          '</button>';
      } else if (equipped) {
        actionHtml =
          '<button class="ph-btn ph-btn--ghost ph-btn--block ph-btn--sm" disabled>Selected</button>';
      } else {
        actionHtml =
          '<button class="ph-btn ph-btn--primary ph-btn--block ph-btn--sm" data-action="equip">Select</button>';
      }

      return (
        '<div class="' + cls + '" data-terrain="' + t.id + '">' +
          '<div class="item-card__icon">' + PH.Icons.terrainSvg(t) + '</div>' +
          '<div class="item-card__name">' + t.name + '</div>' +
          '<div class="item-card__desc">' + t.desc + '</div>' +
          '<div class="item-card__meta">' +
            '<span class="item-card__tier">Tier ' + t.tier + '</span>' +
            '<span class="item-card__cost ' + costCls + '">' + costText + '</span>' +
          '</div>' +
          '<div class="item-card__actions">' + actionHtml + '</div>' +
        '</div>'
      );
    }).join('');

    return (
      '<section class="room is-active" data-room="maps">' +
        '<div class="room__head">' +
          '<div class="room__title-wrap">' +
            '<div class="room__kicker">Terrain Selection</div>' +
            '<h2 class="room__title">The Map Room</h2>' +
            '<p class="room__sub">' +
              'Where you fight changes how you fight. Tight city blocks reward ' +
              'close-range aggression. Ash flats reward patience and precision.' +
            '</p>' +
          '</div>' +
        '</div>' +
        '<div class="item-grid">' + cards + '</div>' +
      '</section>'
    );
  }

  /* ── TERMINAL ── */
  function renderTerminal() {
    const op = PH.Store.current;
    const s = op.stats;
    const lvl = PH.Store.levelInfo(op.xp);

    const statsRows = [
      ['Operator Level', lvl.level + ' (' + lvl.into + ' / ' + lvl.need + ' XP)'],
      ['Lifetime Runs', s.runs],
      ['Lifetime Kills', PH.format.num(s.totalKills)],
      ['Lifetime Score', PH.format.num(s.totalScore)],
      ['Best Score', PH.format.num(s.bestScore)],
      ['Best Wave', s.bestWave],
      ['Time Played', PH.format.time(s.totalTime)],
      ['Deaths', s.deaths],
      ['Campaign Wins', s.wins],
      ['Bosses Slain', s.bossesKilled],
      ['Shots Fired', PH.format.num(s.shotsFired)],
      ['Damage Dealt', PH.format.num(s.damageDealt)]
    ];

    const statRowsHtml = statsRows.map(([label, value]) =>
      '<div class="terminal-stat">' +
        '<span class="terminal-stat__label">' + label + '</span>' +
        '<span class="terminal-stat__value">' + value + '</span>' +
      '</div>'
    ).join('');

    /* Endless block */
    const endlessRows = [
      ['Best Wave', op.endless.bestWave],
      ['Best Score', PH.format.num(op.endless.bestScore)],
      ['Highest Loop', op.endless.bestLevel],
      ['Total Runs', op.endless.runs]
    ].map(([label, value]) =>
      '<div class="terminal-stat">' +
        '<span class="terminal-stat__label">' + label + '</span>' +
        '<span class="terminal-stat__value">' + value + '</span>' +
      '</div>'
    ).join('');

    /* History */
    const historyHtml = op.history.length
      ? op.history.slice(0, 10).map(h => {
          const when = new Date(h.date).toLocaleDateString();
          return (
            '<div class="history-row">' +
              '<div class="history-row__result' + (h.won ? '' : ' is-loss') + '">' +
                (h.won ? 'WIN' : 'LOSS') +
              '</div>' +
              '<div>' +
                '<div class="history-row__name">' + h.mode + (h.level ? ' · L' + h.level : '') + '</div>' +
                '<div class="history-row__meta">' + when + ' · ' + h.kills + ' kills · ' + PH.format.time(h.time) + '</div>' +
              '</div>' +
              '<div class="history-row__score">' + PH.format.num(h.score) + '</div>' +
            '</div>'
          );
        }).join('')
      : '<div class="empty">No runs recorded yet</div>';

    return (
      '<section class="room is-active" data-room="terminal">' +
        '<div class="room__head">' +
          '<div class="room__title-wrap">' +
            '<div class="room__kicker">Record & Log</div>' +
            '<h2 class="room__title">The Terminal</h2>' +
            '<p class="room__sub">' +
              'Everything the operator has done, and everything that has been done to them.' +
            '</p>' +
          '</div>' +
          '<div class="room__actions">' +
            '<button class="ph-btn ph-btn--ghost ph-btn--sm" id="terminalWipe">Clear History</button>' +
          '</div>' +
        '</div>' +

        '<div class="terminal-grid">' +
          '<div class="terminal-panel">' +
            '<div class="terminal-panel__title">Operator Statistics</div>' +
            statRowsHtml +
          '</div>' +

          '<div class="terminal-panel">' +
            '<div class="terminal-panel__title">Endless Loop</div>' +
            endlessRows +
          '</div>' +

          '<div class="terminal-panel" style="grid-column:1/-1">' +
            '<div class="terminal-panel__title">Recent Runs</div>' +
            historyHtml +
          '</div>' +
        '</div>' +
      '</section>'
    );
  }

  /* ── MIRROR ── */
  function renderMirror() {
    const op = PH.Store.current;
    const skin = PH.Icons.skin(op.loadout.skin);
    const lvl = PH.Store.levelInfo(op.xp);

    /* Awards */
    const awards = (PH.Icons && PH.Icons.AWARDS) || [];
    let awardsHtml = '';
    if (awards.length) {
      awardsHtml =
        '<div class="room__head" style="margin-top:var(--s-8)">' +
          '<div class="room__title-wrap">' +
            '<div class="room__kicker">Achievements</div>' +
            '<h2 class="room__title" style="font-size:22px">Awards</h2>' +
          '</div>' +
        '</div>' +
        '<div class="awards-grid">' +
          awards.map(a => {
            const earned = op.awards.includes(a.id);
            return (
              '<div class="award' + (earned ? ' is-earned' : '') + '">' +
                '<div class="award__icon">' + (earned ? a.icon : '?') + '</div>' +
                '<div>' +
                  '<div class="award__name">' + a.name + '</div>' +
                  '<div class="award__desc">' + a.desc + '</div>' +
                '</div>' +
              '</div>'
            );
          }).join('') +
        '</div>';
    } else {
      awardsHtml =
        '<div class="room__head" style="margin-top:var(--s-8)">' +
          '<div class="room__title-wrap">' +
            '<div class="room__kicker">Achievements</div>' +
            '<h2 class="room__title" style="font-size:22px">Awards</h2>' +
          '</div>' +
        '</div>' +
        '<div class="empty">Awards ship in Layer 3</div>';
    }

    return (
      '<section class="room is-active" data-room="mirror">' +
        '<div class="room__head">' +
          '<div class="room__title-wrap">' +
            '<div class="room__kicker">Operator Profile</div>' +
            '<h2 class="room__title">The Mirror</h2>' +
            '<p class="room__sub">' +
              'Who you are, what you\'ve unlocked, and every knob and dial you can turn.' +
            '</p>' +
          '</div>' +
          '<div class="room__actions">' +
            '<button class="ph-btn ph-btn--ghost ph-btn--sm" id="mirrorSignOut">Sign Out</button>' +
          '</div>' +
        '</div>' +

        '<div class="profile-grid">' +

          '<div class="profile-card">' +
            '<div class="profile-identity">' +
              '<div class="profile-avatar" style="border-color:' + skin.accent + '">' +
                PH.Icons.skinSvg(skin, { radial: 0.1 }) +
              '</div>' +
              '<div class="profile-info">' +
                '<div class="profile-name">' + PH.dom.escape(op.name) + '</div>' +
                '<div class="profile-tags">' +
                  (op.guest ? '<span class="profile-tag is-guest">Guest</span>' : '') +
                  '<span class="profile-tag">Level ' + lvl.level + '</span>' +
                  '<span class="profile-tag">' + skin.name + '</span>' +
                  '<span class="profile-tag">' + PH.format.coins(op.credits) + '</span>' +
                '</div>' +
              '</div>' +
            '</div>' +

            '<div style="margin-top:var(--s-5);padding-top:var(--s-5);border-top:var(--border-iron)">' +
              (op.guest
                ? '<p style="color:var(--warn);font-size:var(--fs-xs);letter-spacing:var(--ls-tight);margin-bottom:var(--s-4)">' +
                    'You\'re signed in as a guest. Claim your account to keep progress across browsers.' +
                  '</p>' +
                  '<button class="ph-btn ph-btn--primary ph-btn--block" id="claimGuestBtn">Claim Account</button>'
                : '<p style="color:var(--ash);font-size:var(--fs-xs);letter-spacing:var(--ls-tight)">' +
                    'Signed in with a full operator account.' +
                  '</p>'
              ) +
            '</div>' +
          '</div>' +

          '<div class="profile-card">' +
            '<div class="door__panel-title">Settings</div>' +

            '<div class="setting-row">' +
              '<div>' +
                '<div class="setting-row__label">Sound Effects</div>' +
                '<div class="setting-row__desc">Weapon fire, hits, UI feedback</div>' +
              '</div>' +
              '<button class="toggle' + (op.settings.sfx ? ' is-on' : '') + '" data-toggle="sfx"></button>' +
            '</div>' +

            '<div class="setting-row">' +
              '<div>' +
                '<div class="setting-row__label">Music</div>' +
                '<div class="setting-row__desc">Ambient arpeggio during runs</div>' +
              '</div>' +
              '<button class="toggle' + (op.settings.music ? ' is-on' : '') + '" data-toggle="music"></button>' +
            '</div>' +

            '<div class="setting-row">' +
              '<div>' +
                '<div class="setting-row__label">World Theme</div>' +
                '<div class="setting-row__desc">Currently: ' + op.settings.theme + '</div>' +
              '</div>' +
              '<button class="ph-btn ph-btn--ghost ph-btn--sm" id="settingTheme">Swap</button>' +
            '</div>' +

            '<div class="setting-row" style="border-bottom:none;padding-top:var(--s-6)">' +
              '<div>' +
                '<div class="setting-row__label" style="color:var(--danger)">Danger Zone</div>' +
                '<div class="setting-row__desc">Delete this operator permanently</div>' +
              '</div>' +
              '<button class="ph-btn ph-btn--ghost ph-btn--sm" id="mirrorWipe" style="border-color:var(--danger);color:var(--danger)">Delete</button>' +
            '</div>' +
          '</div>' +

        '</div>' +

        awardsHtml +

      '</section>'
    );
  }

  /* ═══ EXPOSE ROOM RENDERERS ═══ */
  /* The registry referenced renderDoor/renderArsenal/etc before they
     were declared — hoisting handles this for function declarations. */
  ROOMS.forEach(r => { /* no-op, just ensures the constant is retained */ });

})(window.PH);