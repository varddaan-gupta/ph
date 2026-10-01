# Predators Horizon

A neon survival shooter. Pure HTML, CSS, and JavaScript — no build step,
no dependencies, no bundler. Open `index.html` in a modern browser and
it runs.

**Developer:** Varddaan Gupta
**Version:** 0.1 (Layer 0 + Layer 1)

---

## What works right now

- **Public marketing site** (`index.html`) — hero with the banner logo,
  feature grid, lore section, CTA. Responsive.
- **Auth page** (`login.html`) — Sign In / New Operator tabs, existing
  operator dropdown, "Continue as Guest" button, form validation, and
  a shake animation on wrong credentials.
- **Persistent session** — sign in once, and returning to `index.html`
  and clicking "Enter the Game" skips the login page entirely.
- **Local save system** — every operator gets a save file in
  `localStorage` under `predatorshorizon.save.v1`. XP, coins, unlocks,
  loadout, stats, and history all persist.
- **Schema versioning** — the save file has a `schema` field and a
  `migrate()` function so future changes won't wipe player progress.
- **Remote adapter slot** — `PH.Store.adapter` can be swapped for a
  backend later without changing any call sites.

## What ships next (Message 2)

- The hub (`app.html`) with six rooms: Arsenal, Locker, Map Room,
  Terminal, Mirror, Door.
- The intro cinematic (style C — "Signal Acquired", skippable).
- The game canvas shell (`play.html`) with HUD chrome.
- The procedural icon engine (`js/icons.js`) so weapons, skins, and
  terrains are drawn from data rows, not image files.

---

## How to run

### Option A — double-click
Open `index.html` in Chrome, Edge, Firefox, or Safari.

**Note:** Some browsers restrict `localStorage` on `file://` URLs.
If you see a console warning about storage being unavailable, use
Option B instead.

### Option B — local server (recommended)
From the project folder, run one of:

```bash
# Python 3
python3 -m http.server 8080

# Node (if you have npx)
npx serve .

# PHP
php -S localhost:8080