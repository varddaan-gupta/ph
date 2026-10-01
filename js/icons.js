/* ═══════════════════════════════════════════════════════════════
   PREDATORS HORIZON — icons.js
   Procedural SVG icon engine. Every weapon, skin, and terrain
   icon is composed from primitives at runtime — no image files.
   Depends on: core.js
   ═══════════════════════════════════════════════════════════════ */

(function (PH) {
  'use strict';

  /* ═══════════════════════════════════════════════════════════
     DATA TABLES
     One row per item. Adding a new weapon/skin/terrain means
     adding one row here — never touching a renderer.
     ═══════════════════════════════════════════════════════════ */

  /* ── WEAPONS ──
     shape:   which SVG body to draw
     accent:  primary color (falls back to palette red if omitted)
     glyph:   short symbol shown on the icon */
  const WEAPONS = [
    { id: 0,  key: 'kinetic-rifle',     name: 'Kinetic Rifle',     shape: 'rifle',     accent: '#ff3a3a', glyph: '◆', tier: 1, cost: 0,     dps: 180, desc: 'Reliable. Free. Always loaded.' },
    { id: 1,  key: 'pulse-smg',         name: 'Pulse SMG',         shape: 'smg',       accent: '#ff5a5a', glyph: '▦', tier: 1, cost: 400,   dps: 163, desc: 'Rapid fire. Low damage per shot.' },
    { id: 2,  key: 'scatter-shot',      name: 'Scatter Shot',      shape: 'shotgun',   accent: '#ff8a3a', glyph: '✣', tier: 1, cost: 900,   dps: 155, desc: 'Five pellets in a cone.' },
    { id: 3,  key: 'rail-sniper',       name: 'Rail Sniper',       shape: 'sniper',    accent: '#ffe27a', glyph: '╋', tier: 2, cost: 1600,  dps: 124, desc: 'Pierces everything in a line.' },
    { id: 4,  key: 'plasma-burst',      name: 'Plasma Burst',      shape: 'pistol',    accent: '#ff78f0', glyph: '✦', tier: 2, cost: 2400,  dps: 117, desc: 'Big plasma orbs, slight homing.' },
    { id: 5,  key: 'singularity-cannon',name: 'Singularity Cannon',shape: 'cannon',    accent: '#b791ff', glyph: '●', tier: 3, cost: 3200,  dps: 87,  desc: 'Slow orb with splash damage.' },
    { id: 6,  key: 'rocket-launcher',   name: 'Rocket Launcher',   shape: 'launcher',  accent: '#ff8a5b', glyph: '▲', tier: 3, cost: 4200,  dps: 63,  desc: 'Homing rocket, big explosion.' },
    { id: 7,  key: 'gravity-well',      name: 'Gravity Well',      shape: 'orb',       accent: '#9c7cff', glyph: '◎', tier: 3, cost: 5200,  dps: 26,  desc: 'Pulls enemies, damages over time.' },
    { id: 8,  key: 'arc-beam',          name: 'Arc Beam',          shape: 'beam',      accent: '#8ee4ff', glyph: '≡', tier: 4, cost: 6400,  dps: 189, desc: 'Instant hitscan beam.' },
    { id: 9,  key: 'chain-lightning',   name: 'Chain Lightning',   shape: 'tesla',     accent: '#ffe27a', glyph: '⚡', tier: 4, cost: 7800,  dps: 63,  desc: 'Arcs between up to 5 enemies.' },
    { id: 10, key: 'proximity-mines',   name: 'Proximity Mines',   shape: 'drum',      accent: '#ff5fa7', glyph: '◈', tier: 4, cost: 9200,  dps: 164, desc: 'Drops mines that detonate on contact.' },
    { id: 11, key: 'flak-burster',      name: 'Flak Burster',      shape: 'flak',      accent: '#ffa06b', glyph: '✺', tier: 5, cost: 11000, dps: 57,  desc: 'Explodes into a cloud of shrapnel.' }
  ];

  /* ── SKINS ──
     shape: which silhouette to draw
     body:  the armor fill color
     accent: the glow/highlight color
     visor: shape of the eye slit */
  const SKINS = [
    { id: 0,  key: 'vanguard',    name: 'Vanguard',    shape: 'assault', body: '#dfe7ff', accent: '#8ee4ff', visor: 'bar',    tier: 1, cost: 0,     desc: 'Standard issue. Pale blue plate.' },
    { id: 1,  key: 'spectre',     name: 'Spectre',     shape: 'stealth', body: '#1a1420', accent: '#b791ff', visor: 'ghost',  tier: 1, cost: 300,   desc: 'Semi-transparent ghost plate.' },
    { id: 2,  key: 'raptor',      name: 'Raptor',      shape: 'scout',   body: '#17291f', accent: '#7dffcf', visor: 'beak',   tier: 1, cost: 600,   desc: 'Hunter green, feathered silhouette.' },
    { id: 3,  key: 'titan',       name: 'Titan',       shape: 'heavy',   body: '#3b1822', accent: '#ff4d7a', visor: 'slit',   tier: 2, cost: 900,   desc: 'Deep crimson heavy plate.' },
    { id: 4,  key: 'nova',        name: 'Nova',        shape: 'assault', body: '#30210b', accent: '#ffd76b', visor: 'star',   tier: 2, cost: 1200,  desc: 'Golden core, star-shaped visor.' },
    { id: 5,  key: 'phantom',     name: 'Phantom',     shape: 'stealth', body: '#24152f', accent: '#ff78f0', visor: 'hollow', tier: 2, cost: 1600,  desc: 'Violet glitch artifacts.' },
    { id: 6,  key: 'warden',      name: 'Warden',      shape: 'heavy',   body: '#c8ced8', accent: '#ffffff', visor: 'single', tier: 2, cost: 2000,  desc: 'Polished white plate, silver trim.' },
    { id: 7,  key: 'inferno',     name: 'Inferno',     shape: 'heavy',   body: '#35170d', accent: '#ff8a5b', visor: 'bar',    tier: 3, cost: 2500,  desc: 'Charred orange, ember vents.' },
    { id: 8,  key: 'frostbite',   name: 'Frostbite',   shape: 'scout',   body: '#0b2430', accent: '#8ee4ff', visor: 'slit',   tier: 3, cost: 3000,  desc: 'Frost veins, cold white visor.' },
    { id: 9,  key: 'venom',       name: 'Venom',       shape: 'scout',   body: '#132b16', accent: '#9dff5b', visor: 'slit',   tier: 3, cost: 3600,  desc: 'Acid-green drip lines.' },
    { id: 10, key: 'solaris',     name: 'Solaris',     shape: 'assault', body: '#3a2a00', accent: '#ffea00', visor: 'star',   tier: 3, cost: 4200,  desc: 'Solar corona glow.' },
    { id: 11, key: 'abyss',       name: 'Abyss',       shape: 'stealth', body: '#060614', accent: '#6a5aff', visor: 'hollow', tier: 4, cost: 5000,  desc: 'Vacuum-energy lines. No visor.' },
    { id: 12, key: 'chrome',      name: 'Chrome',      shape: 'assault', body: '#c8ced8', accent: '#ff5a5a', visor: 'bar',    tier: 4, cost: 6000,  desc: 'Mirror polish.' },
    { id: 13, key: 'crimson',     name: 'Crimson',     shape: 'heavy',   body: '#2b0510', accent: '#ff2d6a', visor: 'single', tier: 4, cost: 7200,  desc: 'Blood-red heavy plate.' },
    { id: 14, key: 'quantum',     name: 'Quantum',     shape: 'stealth', body: '#1a0b38', accent: '#c86fff', visor: 'ghost',  tier: 5, cost: 8600,  desc: 'Probability-fracture plating.' },
    { id: 15, key: 'singularity', name: 'Singularity', shape: 'assault', body: '#05050f', accent: '#ff5fa7', visor: 'star',   tier: 5, cost: 10000, desc: 'Glowing accretion ring.' }
  ];

  /* ── TERRAINS ──
     layout: how the tile thumbnail is composed
     ground: base fill for the ground plane
     lines:  accent color for road/grid lines */
  const TERRAINS = [
    { id: 0, key: 'city-blocks',   name: 'City Blocks',   layout: 'grid',    ground: '#0d0d10', lines: '#ff3a3a', tier: 1, cost: 0,     desc: 'Dense neon city. Tight sightlines.' },
    { id: 1, key: 'endless-city',  name: 'Endless City',  layout: 'grid',    ground: '#0a0a0d', lines: '#ff5a5a', tier: 1, cost: 500,   desc: 'Infinite streets. No exit.' },
    { id: 2, key: 'caverns',       name: 'Caverns',       layout: 'blobs',   ground: '#0d0a14', lines: '#b791ff', tier: 2, cost: 1200,  desc: 'Crystal caverns. Close quarters.' },
    { id: 3, key: 'neon-docks',    name: 'Neon Docks',    layout: 'stripes', ground: '#0a0d12', lines: '#8ee4ff', tier: 2, cost: 2000,  desc: 'Harbor district. Water lanes.' },
    { id: 4, key: 'orbital-ring',  name: 'Orbital Ring',  layout: 'rings',   ground: '#0d0d14', lines: '#ffffff', tier: 3, cost: 3200,  desc: 'Space station ring interior.' },
    { id: 5, key: 'ash-flats',     name: 'Ash Flats',     layout: 'cracks',  ground: '#12100d', lines: '#ff8a5b', tier: 3, cost: 4600,  desc: 'Cracked ash desert. Long sightlines.' },
    { id: 6, key: 'data-spire',    name: 'Data Spire',    layout: 'circuit', ground: '#0a0d0f', lines: '#7dffcf', tier: 4, cost: 6400,  desc: 'Monolithic server complex.' },
    { id: 7, key: 'void-trench',   name: 'Void Trench',   layout: 'trench',  ground: '#080509', lines: '#ff5fa7', tier: 5, cost: 9000,  desc: 'Deep space trench. Nothing below.' }
  ];

  /* ═══════════════════════════════════════════════════════════
     SVG PRIMITIVE HELPERS
     Small functions that return SVG strings.
     ═══════════════════════════════════════════════════════════ */

  /* Wrap content in an SVG element with consistent viewBox and
     a subtle glow filter. size defaults to 100 (viewBox units). */
  function svgWrap(size, content, opts = {}) {
    const filterId = 'glow_' + Math.random().toString(36).slice(2, 8);
    const glowOpacity = opts.glow != null ? opts.glow : 0.6;
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '" ' +
      'class="ph-svg" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' +
      '<defs>' +
        '<filter id="' + filterId + '" x="-50%" y="-50%" width="200%" height="200%">' +
          '<feGaussianBlur stdDeviation="' + (opts.blur || 1.6) + '" result="b"/>' +
          '<feMerge>' +
            '<feMergeNode in="b"/>' +
            '<feMergeNode in="SourceGraphic"/>' +
          '</feMerge>' +
        '</filter>' +
      '</defs>' +
      content +
      '</svg>'
    );
  }

  /* ── WEAPON SHAPES ──
     Each shape draws inside a 0..100 box, centered around (50, 50).
     Silhouette-first: solid body in iron, accent stripe, glow tip. */
  const weaponShapes = {

    rifle: (a) => (
      '<rect x="14" y="42" width="72" height="12" rx="2" fill="#2a2422" stroke="' + a + '" stroke-width="1.2"/>' +
      '<rect x="14" y="42" width="72" height="3" fill="' + a + '" opacity="0.85"/>' +
      '<rect x="34" y="54" width="14" height="10" rx="1" fill="#1a1616" stroke="' + a + '" stroke-width="0.8"/>' +
      '<rect x="24" y="36" width="20" height="6" rx="1" fill="#1a1616" stroke="' + a + '" stroke-width="0.8"/>' +
      '<circle cx="24" cy="48" r="3.5" fill="' + a + '" opacity="0.9"/>' +
      '<rect x="86" y="44" width="6" height="8" rx="1" fill="' + a + '"/>'
    ),

    smg: (a) => (
      '<rect x="20" y="44" width="60" height="11" rx="2" fill="#2a2422" stroke="' + a + '" stroke-width="1.2"/>' +
      '<rect x="20" y="44" width="60" height="3" fill="' + a + '" opacity="0.85"/>' +
      '<rect x="42" y="55" width="10" height="14" rx="1" fill="#1a1616" stroke="' + a + '" stroke-width="0.8"/>' +
      '<rect x="30" y="38" width="14" height="6" rx="1" fill="#1a1616" stroke="' + a + '" stroke-width="0.8"/>' +
      '<rect x="80" y="46" width="8" height="7" rx="1" fill="' + a + '"/>'
    ),

    shotgun: (a) => (
      '<rect x="12" y="40" width="76" height="10" rx="2" fill="#2a2422" stroke="' + a + '" stroke-width="1.2"/>' +
      '<rect x="12" y="50" width="76" height="8" rx="2" fill="#2a2422" stroke="' + a + '" stroke-width="1.2"/>' +
      '<rect x="12" y="40" width="76" height="3" fill="' + a + '" opacity="0.85"/>' +
      '<rect x="12" y="50" width="76" height="3" fill="' + a + '" opacity="0.85"/>' +
      '<rect x="34" y="58" width="16" height="8" rx="1" fill="#1a1616" stroke="' + a + '" stroke-width="0.8"/>' +
      '<circle cx="88" cy="45" r="3" fill="' + a + '"/>' +
      '<circle cx="88" cy="54" r="3" fill="' + a + '"/>'
    ),

    sniper: (a) => (
      '<rect x="8" y="46" width="84" height="8" rx="2" fill="#2a2422" stroke="' + a + '" stroke-width="1.2"/>' +
      '<rect x="8" y="46" width="84" height="2.5" fill="' + a + '" opacity="0.9"/>' +
      '<rect x="30" y="38" width="24" height="8" rx="1" fill="#1a1616" stroke="' + a + '" stroke-width="0.8"/>' +
      '<rect x="40" y="54" width="12" height="9" rx="1" fill="#1a1616" stroke="' + a + '" stroke-width="0.8"/>' +
      '<circle cx="16" cy="50" r="4" fill="' + a + '" opacity="0.85"/>' +
      '<rect x="88" y="47" width="6" height="6" rx="1" fill="' + a + '"/>'
    ),

    pistol: (a) => (
      '<rect x="30" y="44" width="40" height="12" rx="2" fill="#2a2422" stroke="' + a + '" stroke-width="1.2"/>' +
      '<rect x="30" y="44" width="40" height="3" fill="' + a + '" opacity="0.85"/>' +
      '<rect x="36" y="56" width="12" height="16" rx="1" fill="#1a1616" stroke="' + a + '" stroke-width="0.8"/>' +
      '<circle cx="64" cy="50" r="4" fill="' + a + '" opacity="0.9"/>'
    ),

    cannon: (a) => (
      '<rect x="18" y="42" width="56" height="16" rx="3" fill="#2a2422" stroke="' + a + '" stroke-width="1.2"/>' +
      '<rect x="18" y="42" width="56" height="3" fill="' + a + '" opacity="0.85"/>' +
      '<circle cx="76" cy="50" r="7" fill="#1a1616" stroke="' + a + '" stroke-width="1.2"/>' +
      '<circle cx="76" cy="50" r="3.5" fill="' + a + '" opacity="0.9"/>' +
      '<rect x="34" y="58" width="14" height="12" rx="1" fill="#1a1616" stroke="' + a + '" stroke-width="0.8"/>'
    ),

    launcher: (a) => (
      '<rect x="14" y="38" width="72" height="18" rx="4" fill="#2a2422" stroke="' + a + '" stroke-width="1.2"/>' +
      '<rect x="14" y="38" width="72" height="4" fill="' + a + '" opacity="0.85"/>' +
      '<rect x="30" y="56" width="16" height="12" rx="1" fill="#1a1616" stroke="' + a + '" stroke-width="0.8"/>' +
      '<circle cx="86" cy="47" r="5" fill="' + a + '" opacity="0.9"/>' +
      '<path d="M84 44 L94 47 L84 50 Z" fill="#fff" opacity="0.5"/>'
    ),

    orb: (a) => (
      '<circle cx="50" cy="50" r="22" fill="#1a1616" stroke="' + a + '" stroke-width="1.2"/>' +
      '<circle cx="50" cy="50" r="14" fill="none" stroke="' + a + '" stroke-width="1" opacity="0.7"/>' +
      '<circle cx="50" cy="50" r="6" fill="' + a + '"/>' +
      '<ellipse cx="50" cy="50" rx="26" ry="10" fill="none" stroke="' + a + '" stroke-width="1" opacity="0.5"/>'
    ),

    beam: (a) => (
      '<rect x="20" y="44" width="52" height="12" rx="2" fill="#2a2422" stroke="' + a + '" stroke-width="1.2"/>' +
      '<rect x="20" y="44" width="52" height="3" fill="' + a + '" opacity="0.85"/>' +
      '<rect x="70" y="46" width="10" height="8" rx="1" fill="' + a + '" opacity="0.95"/>' +
      '<rect x="34" y="56" width="12" height="11" rx="1" fill="#1a1616" stroke="' + a + '" stroke-width="0.8"/>'
    ),

    tesla: (a) => (
      '<rect x="16" y="46" width="60" height="10" rx="2" fill="#2a2422" stroke="' + a + '" stroke-width="1.2"/>' +
      '<rect x="16" y="46" width="60" height="2.5" fill="' + a + '" opacity="0.85"/>' +
      '<rect x="34" y="56" width="12" height="11" rx="1" fill="#1a1616" stroke="' + a + '" stroke-width="0.8"/>' +
      '<path d="M76 40 Q82 50 76 60 Q88 50 76 40 Z" fill="' + a + '" opacity="0.8"/>' +
      '<path d="M84 42 Q88 50 84 58 Q94 50 84 42 Z" fill="#fff" opacity="0.6"/>'
    ),

    drum: (a) => (
      '<rect x="20" y="40" width="48" height="20" rx="3" fill="#2a2422" stroke="' + a + '" stroke-width="1.2"/>' +
      '<rect x="20" y="40" width="48" height="4" fill="' + a + '" opacity="0.85"/>' +
      '<circle cx="68" cy="50" r="9" fill="#1a1616" stroke="' + a + '" stroke-width="1.2"/>' +
      '<circle cx="68" cy="50" r="5" fill="' + a + '" opacity="0.9"/>' +
      '<rect x="30" y="60" width="12" height="9" rx="1" fill="#1a1616" stroke="' + a + '" stroke-width="0.8"/>'
    ),

    flak: (a) => (
      '<rect x="22" y="42" width="52" height="16" rx="4" fill="#2a2422" stroke="' + a + '" stroke-width="1.2"/>' +
      '<rect x="22" y="42" width="52" height="3" fill="' + a + '" opacity="0.85"/>' +
      '<circle cx="80" cy="50" r="6" fill="' + a + '" opacity="0.9"/>' +
      '<path d="M78 44 L84 46 L86 50 L84 54 L78 56 L76 50 Z" fill="#fff" opacity="0.45"/>' +
      '<rect x="34" y="58" width="14" height="11" rx="1" fill="#1a1616" stroke="' + a + '" stroke-width="0.8"/>'
    )
  };

  /* ── SKIN SHAPES ──
     Bust portrait silhouette inside a 0..100 box.
     Head centered around (50, 32), shoulders span y=55..100. */
  const skinShapes = {

    /* Shared base: shoulders + neck. */
    _torso(body, accent) {
      return (
        '<path d="M22 100 L22 76 Q22 62 36 60 L44 58 L56 58 L64 60 Q78 62 78 76 L78 100 Z" ' +
          'fill="' + body + '" stroke="' + accent + '" stroke-width="1.2"/>' +
        '<path d="M46 58 L46 52 L54 52 L54 58 Z" fill="' + body + '" stroke="' + accent + '" stroke-width="1"/>'
      );
    },

    /* Shared base: helmet dome. */
    _helmet(body, accent) {
      return (
        '<path d="M32 34 Q32 16 50 16 Q68 16 68 34 L68 44 Q68 52 50 52 Q32 52 32 44 Z" ' +
          'fill="' + body + '" stroke="' + accent + '" stroke-width="1.4"/>'
      );
    },

    /* Visor variants. */
    _visorBar(accent) {
      return '<rect x="38" y="30" width="24" height="4" rx="1" fill="' + accent + '"/>';
    },
    _visorSingle(accent) {
      return '<rect x="36" y="31" width="28" height="3" rx="1" fill="' + accent + '"/>';
    },
    _visorSlit(accent) {
      return '<rect x="40" y="30" width="20" height="2.5" rx="1" fill="' + accent + '"/>';
    },
    _visorStar(accent) {
      return (
        '<path d="M50 26 L53 32 L59 32 L54 36 L56 42 L50 38 L44 42 L46 36 L41 32 L47 32 Z" ' +
          'fill="' + accent + '"/>'
      );
    },
    _visorGhost(accent) {
      return (
        '<rect x="38" y="30" width="24" height="4" rx="1" fill="' + accent + '" opacity="0.55"/>' +
        '<rect x="34" y="30" width="24" height="4" rx="1" fill="' + accent + '" opacity="0.28"/>'
      );
    },
    _visorHollow(accent) {
      return (
        '<circle cx="42" cy="32" r="2.5" fill="' + accent + '" opacity="0.6"/>' +
        '<circle cx="58" cy="32" r="2.5" fill="' + accent + '" opacity="0.6"/>'
      );
    },
    _visorBeak(accent) {
      return (
        '<path d="M42 30 L58 30 L54 36 L46 36 Z" fill="' + accent + '"/>' +
        '<path d="M50 34 L52 40 L48 40 Z" fill="' + accent + '" opacity="0.7"/>'
      );
    },

    _makeShape(style, visorFn, body, accent) {
      const base = skinShapes._torso(body, accent) + skinShapes._helmet(body, accent);
      let extra = '';
      if (style === 'heavy') {
        extra =
          '<path d="M14 100 L14 74 Q14 60 26 56 L34 54 L36 58 L24 76 L24 100 Z" fill="' + body + '" stroke="' + accent + '" stroke-width="1.2"/>' +
          '<path d="M86 100 L86 74 Q86 60 74 56 L66 54 L64 58 L76 76 L76 100 Z" fill="' + body + '" stroke="' + accent + '" stroke-width="1.2"/>' +
          '<rect x="40" y="52" width="20" height="8" rx="2" fill="' + body + '" stroke="' + accent + '" stroke-width="1"/>';
      } else if (style === 'scout') {
        extra =
          '<path d="M26 100 L26 78 Q26 66 36 62 L44 60 L44 100 Z" fill="' + body + '" stroke="' + accent + '" stroke-width="1.2"/>' +
          '<path d="M74 100 L74 78 Q74 66 64 62 L56 60 L56 100 Z" fill="' + body + '" stroke="' + accent + '" stroke-width="1.2"/>';
      } else if (style === 'stealth') {
        extra =
          '<path d="M30 60 Q22 62 20 74 L20 100 L34 100 L34 66 Z" fill="' + accent + '" opacity="0.18" stroke="' + accent + '" stroke-width="0.8"/>' +
          '<path d="M70 60 Q78 62 80 74 L80 100 L66 100 L66 66 Z" fill="' + accent + '" opacity="0.18" stroke="' + accent + '" stroke-width="0.8"/>';
      }
      return base + extra + visorFn(accent);
    }
  };

  /* ── TERRAIN SHAPES ──
     Top-down abstract thumbnails. Each layout is a different
     pattern of lines and blocks drawn over a ground fill. */
  const terrainShapes = {

    grid: (ground, lines) => {
      let out = '<rect width="100" height="100" fill="' + ground + '"/>';
      for (let x = 12; x <= 88; x += 16) {
        out += '<line x1="' + x + '" y1="0" x2="' + x + '" y2="100" stroke="' + lines + '" stroke-width="0.6" opacity="0.55"/>';
      }
      for (let y = 12; y <= 88; y += 16) {
        out += '<line x1="0" y1="' + y + '" x2="100" y2="' + y + '" stroke="' + lines + '" stroke-width="0.6" opacity="0.55"/>';
      }
      /* a few glowing blocks */
      for (let i = 0; i < 6; i++) {
        const x = 8 + PH.math.hash(i, 1) * 76;
        const y = 8 + PH.math.hash(i, 2) * 76;
        const w = 6 + PH.math.hash(i, 3) * 10;
        out += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + w + '" fill="' + lines + '" opacity="0.35"/>';
      }
      return out;
    },

    blobs: (ground, lines) => {
      let out = '<rect width="100" height="100" fill="' + ground + '"/>';
      for (let i = 0; i < 8; i++) {
        const cx = 12 + PH.math.hash(i, 10) * 76;
        const cy = 12 + PH.math.hash(i, 20) * 76;
        const r  = 6  + PH.math.hash(i, 30) * 10;
        out += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + lines + '" opacity="0.22"/>';
        out += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r - 3) + '" fill="' + lines + '" opacity="0.45"/>';
      }
      return out;
    },

    stripes: (ground, lines) => {
      let out = '<rect width="100" height="100" fill="' + ground + '"/>';
      for (let i = 0; i < 8; i++) {
        const y = 8 + i * 12;
        out += '<rect x="0" y="' + y + '" width="100" height="4" fill="' + lines + '" opacity="' + (0.15 + i * 0.04) + '"/>';
      }
      /* water reflection */
      out += '<rect x="0" y="52" width="100" height="2" fill="#ffffff" opacity="0.4"/>';
      return out;
    },

    rings: (ground, lines) => {
      let out = '<rect width="100" height="100" fill="' + ground + '"/>';
      for (let r = 8; r <= 46; r += 8) {
        out += '<circle cx="50" cy="50" r="' + r + '" fill="none" stroke="' + lines + '" stroke-width="0.8" opacity="' + (0.6 - r * 0.01) + '"/>';
      }
      out += '<circle cx="50" cy="50" r="3" fill="' + lines + '"/>';
      return out;
    },

    cracks: (ground, lines) => {
      let out = '<rect width="100" height="100" fill="' + ground + '"/>';
      for (let i = 0; i < 7; i++) {
        const y = 10 + i * 12;
        out += '<path d="M0 ' + y + ' Q25 ' + (y - 4) + ' 50 ' + y + ' T100 ' + y + '" fill="none" stroke="' + lines + '" stroke-width="0.9" opacity="0.7"/>';
      }
      return out;
    },

    circuit: (ground, lines) => {
      let out = '<rect width="100" height="100" fill="' + ground + '"/>';
      /* orthogonal circuit paths */
      const paths = [
        'M8 20 H50 V40 H92',
        'M8 50 H30 V80 H60 V50 H92',
        'M8 80 H70 V60 H92',
        'M50 8 V30 H80 V50'
      ];
      for (const p of paths) {
        out += '<path d="' + p + '" fill="none" stroke="' + lines + '" stroke-width="0.9" opacity="0.75"/>';
      }
      /* nodes */
      for (let i = 0; i < 6; i++) {
        const x = 10 + PH.math.hash(i, 5) * 80;
        const y = 10 + PH.math.hash(i, 6) * 80;
        out += '<circle cx="' + x + '" cy="' + y + '" r="2" fill="' + lines + '"/>';
      }
      return out;
    },

    trench: (ground, lines) => {
      let out = '<rect width="100" height="100" fill="' + ground + '"/>';
      /* central trench */
      out += '<rect x="38" y="0" width="24" height="100" fill="#000000" opacity="0.6"/>';
      out += '<line x1="38" y1="0" x2="38" y2="100" stroke="' + lines + '" stroke-width="1.2" opacity="0.85"/>';
      out += '<line x1="62" y1="0" x2="62" y2="100" stroke="' + lines + '" stroke-width="1.2" opacity="0.85"/>';
      /* distant filaments */
      for (let i = 0; i < 5; i++) {
        const x = 10 + i * 18;
        out += '<line x1="' + x + '" y1="10" x2="' + x + '" y2="30" stroke="' + lines + '" stroke-width="0.5" opacity="0.4"/>';
      }
      return out;
    }
  };

  /* ═══════════════════════════════════════════════════════════
     PUBLIC RENDERERS
     ═══════════════════════════════════════════════════════════ */

  /* Return the raw SVG string for a weapon icon. */
  function weaponSvg(weapon, opts = {}) {
    const w = typeof weapon === 'number' ? WEAPONS[weapon] : weapon;
    if (!w) return '';
    const shapeFn = weaponShapes[w.shape] || weaponShapes.rifle;
    const accent = w.accent || '#ff3a3a';
    const body = shapeFn(accent);
    const glow = '<circle cx="50" cy="50" r="30" fill="' + accent + '" opacity="' + (opts.radial != null ? opts.radial : 0.08) + '"/>';
    return svgWrap(100, glow + body, { glow: 0.7, blur: 1.8 });
  }

  /* Return the raw SVG string for a skin portrait. */
  function skinSvg(skin, opts = {}) {
    const s = typeof skin === 'number' ? SKINS[skin] : skin;
    if (!s) return '';
    const visorMap = {
      bar:    skinShapes._visorBar,
      single: skinShapes._visorSingle,
      slit:   skinShapes._visorSlit,
      star:   skinShapes._visorStar,
      ghost:  skinShapes._visorGhost,
      hollow: skinShapes._visorHollow,
      beak:   skinShapes._visorBeak
    };
    const visorFn = visorMap[s.visor] || skinShapes._visorBar;
    const body = skinShapes._makeShape(s.shape, visorFn, s.body, s.accent);
    const glow = '<circle cx="50" cy="50" r="40" fill="' + s.accent + '" opacity="' + (opts.radial != null ? opts.radial : 0.06) + '"/>';
    return svgWrap(100, glow + body, { glow: 0.5, blur: 1.4 });
  }

  /* Return the raw SVG string for a terrain thumbnail. */
  function terrainSvg(terrain, opts = {}) {
    const t = typeof terrain === 'number' ? TERRAINS[terrain] : terrain;
    if (!t) return '';
    const layoutFn = terrainShapes[t.layout] || terrainShapes.grid;
    const body = layoutFn(t.ground, t.lines);
    return svgWrap(100, body, { glow: 0.4, blur: 0.8 });
  }

  /* ═══════════════════════════════════════════════════════════
     DOM HELPERS
     Convenience for the hub UI: given an element, fill it with
     the SVG for a weapon/skin/terrain id.
     ═══════════════════════════════════════════════════════════ */

  function paintWeapon(el, weapon) {
    if (!el) return;
    el.innerHTML = weaponSvg(weapon);
  }
  function paintSkin(el, skin) {
    if (!el) return;
    el.innerHTML = skinSvg(skin);
  }
  function paintTerrain(el, terrain) {
    if (!el) return;
    el.innerHTML = terrainSvg(terrain);
  }

  /* ═══════════════════════════════════════════════════════════
     EXPORT
     ═══════════════════════════════════════════════════════════ */

  PH.Icons = {
    /* data */
    WEAPONS,
    SKINS,
    TERRAINS,

    /* lookups */
    weapon: (id) => WEAPONS.find(w => w.id === id) || WEAPONS[0],
    skin:   (id) => SKINS.find(s => s.id === id)     || SKINS[0],
    terrain:(id) => TERRAINS.find(t => t.id === id)  || TERRAINS[0],

    /* renderers */
    weaponSvg,
    skinSvg,
    terrainSvg,

    /* DOM painters */
    paintWeapon,
    paintSkin,
    paintTerrain
  };

})(window.PH);