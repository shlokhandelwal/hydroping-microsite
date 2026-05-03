# HydroPing Microsite — Project Context

A single-page promotional microsite for a fictional Hydro Flask × Fred Again × Charlie Puth campaign. Status: **complete**. This file exists as a reference for future contributors and as a template for similar zero-build vanilla projects.

---

## Stack

Vanilla **HTML + CSS + JS**. No framework, no bundler, no npm.

```
index.html     # full document, all sections inline
styles.css     # ~2.1k lines — fonts, tokens, sections in document order
script.js      # ~1.3k lines — IIFE, sections separated by /* ---- HEADER ---- */ blocks
Microsite Assets/   # all images, logos, fonts
screenshots/        # iteration captures
```

External dependencies (CDN, no install):
- **Phosphor Icons** — `<script src="https://unpkg.com/@phosphor-icons/web">`

## Run locally

```
python3 -m http.server 3000
# → http://localhost:3000
```

No build, no watch, no install. Edit a file, refresh the browser.

---

## Brand tokens (CSS variables)

```
--red:    #FF2D3F
--blue:   #00B7FF
--yellow: #FFE100
--black:  #000000
--white:  #FFFFFF
```

Section backgrounds are tagged with `data-bg="blue|white|red|black"` for easy scanning.

## Typography

- **Galano Grotesque** (all weights, in `Microsite Assets/HydroPing Fonts/`) — body, UI, nav, step labels, all general copy
- **LazyDog** — *display/accent only*: "PING IT ON", "FRED AGAIN", "CHARLIE PUTH". Never use it for body text.

## Iconography

Phosphor via CDN. Usage: `<i class="ph-fill ph-music-notes"></i>`. Weights: `ph-thin / ph-light / ph-regular / ph-bold / ph-fill / ph-duotone`. Browse at phosphoricons.com.

How-it-works step icons (all `ph-fill`):
| Step | Icon |
|---|---|
| 1 Make the beat | `ph-music-notes` |
| 2 Post on TikTok | `ph-tiktok-logo` |
| 3 Unlock a code | `ph-tag` |
| 4 Top 15 invited | `ph-ticket` |
| 5 Top 3 perform | `ph-microphone-stage` |

## Cursor

Custom dual-image cursor. Two `position:fixed` `<img>` in `<body>`, lerped to pointer at 0.28 in rAF; native cursor hidden via `body { cursor: none }`. Grab variant only shows during an *active bottle drag* — never on hover, never on click alone.

| Asset | When |
|---|---|
| `Cursor_Normal.png` | Default, always |
| `Cursor_BottleGrab.png` | Only while bottle is held/dragged |

---

## Asset map (all under `Microsite Assets/`)

| File | Used in |
|---|---|
| `Red HydroFlask Bottle.png` | Hero bottle, mini-game |
| `HydroPing Logomark + Wordmark.svg` | Hero / footer wordmark |
| `HydroFlask Logomark.svg` | Nav pill |
| `HydroFlask Logomark & Workmark.svg` | Full HF wordmark variant |
| `Cursor_Normal.png` / `Cursor_BottleGrab.png` | Custom cursor |
| `ticket-front.png` / `ticket-back.png` | Concert ticket faces (full designs — no HTML overlay) |
| `concert-photo-1..4.png` | Polaroid photos that rise after ticket flip |
| `Game Bottles/01..08.*` | Mini-game falling bottle skins |
| `Merch/01..06.png` | Merch grid items |
| `HydroPing Fonts/` | Galano Grotesque + LazyDog |

---

## Section map (in document order)

| # | ID | bg | Notes |
|---|---|---|---|
| 1 | `#hero` | blue | 3-col grid, draggable bottle, ping counter, sound toggle |
| 2 | `#how` | white | 5 step cards + scrolling strip |
| 3 | `#museum` | white | 2-row TikTok ticker, opposite directions, hover-pause |
| 4 | `#concert` | red | Scroll-driven 3D ticket flip + polaroid reveals |
| 5 | `#submit` | black | TikTok URL → random 10–25% discount code |
| 6 | `#game` | blue | Falling-bottle catch mini-game, 4 lanes |
| 7 | `#merch` | white | 6-tile merch grid (Alarm Tone card plays preview) |
| – | `footer` | black | Wordmark + nav + copy |

Headline copy live in the hero references **"Club Omnia in Las Vegas"** as the venue. Update both the hero eyebrow and the footer line if this changes.

---

## Hero — interaction contract

Layout: 3-column grid (left copy | center bottle | right copy), 100vh, blue radial gradient + dot-grid overlay.

| Element | Rule |
|---|---|
| Background | Radial `#90E4FF → #00B7FF → #007ACC`, 32px dot grid, red flash on ping (hue 0deg, opacity 0.15, glow 10px, 0.75s, flash radius 70%) |
| Bottle | Spawns at +15deg, parallax-tracks pointer, drag with grab cursor, auto-fall + ping on release. **Never scales** on press or ping. |
| Halo | Static white circle `clamp(440px, 70vh, 820px)`. **Never animates, never scales.** |
| Arcs | Two SVG arcs at 91% of halo size, base rotation 155deg, parallax-offset via JS. Always bottom-right / top-left. |
| Ripple | Single white ring, scale 1 → 2.9 over 1.1s ease-out. `z-index:1` (behind everything). |
| Ping counter | Increments per ping. Lives at top-right of bottle stage. |
| Left copy | "PING IT ON" in LazyDog with float-bob loop; rest in Galano. Left-aligned. |
| Right copy | "FRED AGAIN" / "CHARLIE PUTH" in LazyDog yellow + float-bob loop. Right-aligned. CTA button below. |
| Sound toggle | Bottom-right pill, mutes/unmutes Web Audio context. |

Ping audio is synthesized in Web Audio (no sample file): bandpass-filtered inharmonic partials with sharp attack and long exponential tail. A separate "stretch" oscillator modulates while the bottle is being dragged.

## Concert — ticket flip

Container `.concert` is the section (red bg). **Do not add `overflow:hidden`** to it — sticky positioning depends on the ancestor scroll context.

```
.concert
└── .ticket-track     (220vh — scroll runway)
    └── .ticket-stage (sticky, centered)
        ├── #ticket3d
        │   ├── img.ticket-face.ticket-front
        │   └── img.ticket-face.ticket-back  (rotateX(180deg) baseline)
        ├── .concert-presenting (label + title, rises after flip)
        └── .concert-photo .cp-1/.cp-2/.cp-3 (polaroids slide up)
```

- Ticket size: `min(1100px, 94vw)`, aspect `3196/1444` (matches PNG).
- Each face is a single `<img>` with `backface-visibility: hidden` — the PNGs are the entire design, no HTML overlay.
- Scroll progress 0→1 drives `rotateX(0 → 180deg)` on `#ticket3d`.
- After flip completes, `.concert-presenting` rises and polaroids slide up from below with offset rotations.
- Manual override exposed: `window.__setTicketFlip(progress)`.

**Screenshot hooks**: `?shot=front` or `?shot=back` sets `html[data-shot]` to render either face statically (also hides the custom cursor and the polaroid/presenting overlays). Useful for headless captures.

## Museum ticker

Two horizontal rows, opposite scroll directions, infinite loop via duplicated frames. Frame width 266px (5 visible at 1440px). Hover pauses the row (`animation-play-state: paused`). Videos are YouTube Shorts via `youtube-nocookie.com`, autoplay, muted, looped, no controls — 12 videos total (6 per row), each row's frames are duplicated inline for seamless wraparound.

## Submission

Validates a TikTok URL, generates a random 10–25% discount and a `PING-XXXXXX` code, reveals an unlocked card with copy button + confetti. No backend — purely client-side demo.

## Mini-game

4 lanes, bottles fall at increasing speed, click/tap to catch, 5 misses ends the run. Best score persisted in `localStorage`. START button overlays before first run.

---

## Screenshot workflow

Headless Chrome screenshots saved to `/screenshots`, naming `v[version]_YYYY-MM-DD_HH-MM-SS_[task].png`. After every visual task: capture → review against requirement → fix → only then mark task done.

```bash
SCREENSHOTS_DIR="$(pwd)/screenshots"
TIMESTAMP=$(date '+%Y-%m-%d_%H-%M-%S')
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --screenshot="${SCREENSHOTS_DIR}/v1_${TIMESTAMP}_task.png" \
  --window-size=1440,900 --no-sandbox --disable-gpu "http://localhost:3000" 2>/dev/null
```

For sections below the fold or behind `.reveal`: use a CDP script with scroll JS, or Playwright full-page + crop. For the concert ticket faces: append `?shot=front` / `?shot=back`.

---

## Standing constraints

- **Read and write only what the current task requires.** Don't touch sections outside scope.
- **No frameworks, no bundlers, no npm.** Three files (HTML/CSS/JS) unless a new file is genuinely justified.
- **Cursor swap is drag-only** — never on click alone.
- **Bottle and halo never scale** — size is fixed at all times.
- **`.concert` must not get `overflow:hidden`** — sticky depends on it.
- **LazyDog is display-only** — never use it for body copy.
- **Phosphor icons use the `ph-fill` weight** for the how-it-works circles.
