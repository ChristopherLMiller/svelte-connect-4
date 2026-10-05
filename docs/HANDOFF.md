# AI Arcade — handoff notes

Context for any agent picking this project up. Read this first, then the code it points at.

## What this is

**AI Arcade** (`package.json` name `arcade-protocol`) is a SvelteKit site that hosts a set of
browser games ("cabinets"). Every game is a classic given a strong sense of place and
material, with its own fonts, palette, WebGL backdrop, music, sound effects, How to play
guide, settings, saved progress and, where it fits, hotseat plus an AI opponent.

Repo: `github.com/ChristopherLMiller/svelte-connect-4`, branch `main`. Pushing to `main`
deploys (static build via `@sveltejs/adapter-static`, everything prerendered).

| id (folder / route) | Title | Classic | World |
|---|---|---|---|
| `connect4` | Connect 4 | Connect Four | Neon sci-fi arena, physics discs, 5 music "transmissions" |
| `tictactoe` | Tide & Cross | Tic-tac-toe | Wet sand on a sunny beach, tide washes the board |
| `wyrm` | Lantern Wyrm | Snake | Silk dragon in a night market, fireworks sky |
| `checkers` | Ashcourt | Checkers | Raku kiln yard at noon, oxblood glaze vs bone china |
| `reversi` | Eclipse | Reversi / Othello | Brass observatory, sun and moon discs, orrery backdrop |
| `breakout` | Chapel Glass | Breakout | Ruined cathedral, stained-glass panes (see below) |

## Commands

- `npm run dev` — Vite dev server on http://localhost:5173
- `npm run check` — `svelte-kit sync && svelte-check`; must report 0 errors and 0 warnings
- `npm run build` — static build into `build/`
- Release: commit the work, then `npm version patch` (or minor), then `git push --follow-tags`.
  The user always wants a version bump with a release commit. Commit message style:
  one plain sentence, e.g. "Add synth layers to every game, warmer master chain, and
  two-column settings dialogs." followed by the bare version commit `npm version` makes.

## Stack and conventions

- Svelte 5 runes only (`$state`, `$derived`, `$effect`, `$props`, `{@attach}`), SvelteKit 2,
  TypeScript, Vite 8. Tone.js 15 is the only runtime dependency.
- No prettier in the project. Tabs, single quotes, ~110 column lines; indent markup by hand.
- Comments only for constraints the code can't show. No "this does X" narration.
- Every animation has a `prefers-reduced-motion: reduce` fallback.
- Every game pauses CSS animations when the tab is hidden (`.look.quiet` pattern in `Page.svelte`).
- Performance matters a lot (the user tests on Android Chrome). Backdrop shaders are capped
  at 60 fps with `createPacer()` (`src/lib/gl/pace.ts`) and use a capped DPR (≤ 1.25).
  Gameplay loops run at display rate. A global FPS meter (`FpsMeter.svelte`) exists.
- Settings dialogs must fit the screen: `max-height: calc(100dvh - 40px); overflow-y: auto;
  overscroll-behavior: contain`. When a panel gets long, split it into two columns at
  `@media (min-width: 760px)` (see Connect 4 `SettingsPanel.svelte`, `EclSettings.svelte`).
- Copy style: short evocative lines in the game's voice ("The stalls do not yield").

## How a game plugs in

Games are discovered by globs; there is no central registry to edit.

- `src/lib/games/<id>/game.json` — manifest (`GameManifest` in `src/lib/games/manifests.ts`):
  title, genre, players, tagline, blurb, description, keywords, `theme` colour, `favicon`
  (in `static/`), `accent`, `glow`, `cabinet`, `order` (position in the hall).
- `<id>/preview.svelte` — static mini scene shown on the arcade cabinet tile in the hall.
  A game without a preview is hidden from the hall.
- `<id>/Layout.svelte` — loads fonts, calls `hydrate…()` and `setMusicStation('<id>')`,
  primes audio on pointerdown, sets the page background and focus colours.
- `<id>/Page.svelte` — the game: backdrop, menu or play stage, result overlay, settings, guide.
- `<id>/audio.ts` — exports `startMusic` / `stopMusic` (picked up by `src/lib/audio/station.ts`
  through a glob keyed by folder name) plus the game's `play…()` sound effects.
- Routes `src/routes/[game]/` lazy-load `Page.svelte` / `Layout.svelte` by id and prerender
  one page per manifest. SEO, sitemap and the hall ticker all read the manifests.
- Shared UI with a per-game `tone` union that must be extended for a new game:
  `ArcadeTile.svelte`, `ArcadeExit.svelte`, `GuideShell.svelte` (tones: space, shore, night,
  ash, orrery, chapel).

Typical game folder: `types.ts`, `engine.ts` (pure rules), `persist.ts` (localStorage,
normalise everything read back), `settings.svelte.ts` (reactive prefs, panel/guide open
state), `session.svelte.ts` (a class holding game state as `$state` fields), `ai.ts` +
`ai.worker.ts` + `aiClient.ts` for board games, `components/` (Menu, Hud, Board, Result,
Settings, Guide, Icon, backdrop).

### The game kit (`src/lib/games/kit/`)

For two-player board games: `prefs.ts` (`createGamePrefs` — mode, difficulty, score table,
saved match), `panels.svelte.ts` (`createGamePanels` — reactive menu state and panel
toggles), `keys.ts` (`boardKeys` — keyboard handling for grid games), `aiClient.ts`
(worker client). Single-player games (Wyrm, Chapel Glass) keep their own simpler persist
with best scores per difficulty.

## Audio architecture (`src/lib/audio/`)

- `core.ts` — one `AudioContext`; three buses: **sfx**, **music**, **layers**, all into the
  master chain. Prefs: `sfxOn/sfxVolume`, `musicOn/musicVolume`, `layersOn/layersVolume`.
  `isLayeredScoreOn()` = music on OR layers on: a score keeps running (music bus muted) when
  only the layers are on. `sfxContext()` returns null when sound effects are off.
- `master.ts` — shared finishing chain: procedural convolver room, music chorus, analog
  oscillator drift (patches `createOscillator` to add random detune), glue compressor and a
  tanh soft clip. Per-station profiles: ARCADE (library, connect4), AMBIENT (default),
  CATHEDRAL (breakout).
- `station.ts` — `setMusicStation(id)` switches scores and master profile.
- `prefs.svelte.ts` — reactive `audioSettings`, `primeAudio()` (unlock on first gesture),
  `syncAudio()`, `persistAudio()`, `setLayersVolume()`.
- **Synth layers** (Tone.js, lazy `import('tone')` via `tone.ts`, bound to the native
  context): optional extra arrangement over each score, on the layers bus.
  - Connect 4: `games/connect4/toneLayer.ts`, one arrangement per music track.
  - Hall: `library/toneLayer.ts` (`library/score.ts` is the hall score).
  - Slow scores: `ambientLayers.ts` — `createAmbientLayers(id, stepSeconds, scale)` with an
    `ARRANGEMENTS[id]` entry (answer voice, drone, glints, echo). The score calls
    `layers.note(freq, t, step)` and `layers.bass(freq, t)` beside its own notes, and
    `layers.start(audio, fade)` / `layers.stop(audio, fade)` with the score.
- Music is plain Web Audio scheduled ahead (`schedule()` loop with ~0.28 s lookahead and a
  `setTimeout` of ~140 ms), each score owning a `stem` gain that fades in and out.

## Testing tips

- Browser testing through the Cursor browser tools works well. To reach app modules from the
  console, import the exact URLs the app loaded (`performance.getEntriesByType('resource')`);
  Vite serves edited modules with `?t=` and a bare import makes a second module instance.
- Tone.js offline renders need `new tone.OfflineContext(...)` + `tone.setContext`, not a raw
  `OfflineAudioContext`.
- Don't permanently change the user's audio prefs while testing; restore them afterwards.
- Emulate phones with `Emulation.setDeviceMetricsOverride` and clear it when done.

## Roadmap (agreed with the user)

Built in order; each new game goes through: rules + logic, AI (if any) in a worker,
session/settings/persistence, board and pieces, GPU backdrop and the standout moment,
sound and music (+ synth layers), guide/manifest/preview/icon/favicon, then checks
(60 fps, phone layout, reduced motion, `npm run check`).

1. **Eclipse (Reversi)** — done (v1.3.0).
2. **Chapel Glass (Breakout)** — done, see below.
3. **Frostline (Minesweeper)** — sweeping a frozen lake at dawn. Numbers are crack patterns
   in the ice, flags are ice-fishing flags, mines are thin ice. A wrong step sends cracks
   racing through an ice shader and the tile plunges into dark water; clearing a region melts
   frost outward. Safe first click, optional no-guess boards (generator checked by a
   solver), daily seeded board, best times per difficulty. Solo. Effort low–medium.
4. **Cartographer (Dots and Boxes)** — rival mapmakers inking borders on parchment by
   candlelight. Each closed box fills with a tiny ink illustration (sea serpent, mountain,
   village) so the finished board is a map. AI understands chains and the double-cross.
   Hotseat-friendly. Effort low–medium.
5. **Apothecary (2048)** — an alchemist's bench; tiles are glass vials and merging pours
   them into a richer colour (liquid shader), rare tiers glow and vapour. Swipe/arrows, undo,
   best score, "brew of the day" seeded mode. Effort low.
6. **Seedkeeper (Mancala / Kalah)** — carved river stones on a mossy bank at dusk,
   fireflies, water sounds. Seeds sown one by one with a clack; captures ripple light.
   Minimax AI. Gentle, good for younger players. Effort low.
7. **Lumen Reef (falling blocks, Tetris-style)** — done, see below. Added by the user's request; theme picked
   by the agent. Stacking living coral in the midnight zone of the deep sea. Each piece is a
   different bioluminescent species (cyan comb jelly, magenta anemone, gold lanternfish,
   green siphonophore…), glowing softly against black water. A cleared line dissolves into
   a drifting plankton bloom that rises out of the well; a four-line clear sends a whale
   silhouette gliding past with a low song. Levels are depth: each one sinks the well
   deeper, the water darkens and the glow brightens, with a depth gauge in the HUD.
   Music: slow sonar pings and whale-song pads whose pulse tightens as the drop speed
   rises. Modern rules (7-bag, hold, ghost piece, wall kicks, lock delay), marathon and a
   40-line sprint, best per mode. Effort medium–high (real-time, big polish surface).

Worth doing later: **Zen Garden** (Gomoku on raked gravel, threat-search AI),
**Lighthouse** (Battleship in fog, probability-map AI, pass-the-device hotseat),
**Chess** (flagship, biggest job).

## Chapel Glass (Breakout) — design

Folder `src/lib/games/breakout/`, route `/breakout`, station `breakout`, storage key
`chapel-glass`, guide/tile tone `chapel`, `order: 6`.

**World.** A ruined cathedral at nightfall whose windows were bricked up long ago. The whole
field is an old wall of warm, weathered ashlar. Each window's outline (the union of its
non-air cells) has a chamfered stone surround, and inside it every brick is an opaque stone
painted in a faded colour (ruby, cobalt, emerald, amber, violet, opal) with worn stencil work.
Knocking a stone out uncovers the backlit stained glass behind it, which glows, blooms and
throws a coloured shaft into the nave. Thick panes are gilded stones (with a bullseye roundel
in the glass behind); `#` cells are carved stone tracery that never breaks. The
paddle is a carved oak beam with brass caps; the ball is a mote of candlelight with a soft
trail.

**Standout moment.** Each broken pane releases its colour: a slanted shaft of coloured
light falls from where the pane was to the stone floor and leaves a pool of colour there.
The shafts accumulate, so the dark nave fills with light as the window is cleared. Shards
tinkle down and skitter on the flagstones. The WebGL backdrop (nave arches, columns,
moonlit high windows, dust in the beams) brightens and takes on the colours broken so far.

**Play.**
- Windows are data: `breakout/windows/*.json`, one **chapter** per file, played in file-name
  order (`{ "chapter", "blurb", "windows": [{ "name", "map": [13-char rows, ≤ 13 rows] }] }`).
  `levels.ts` globs them into `WINDOWS` and `CHAPTERS`; nothing else needs touching to add more.
  Glyphs: `o a g b r v` panes (uppercase = thick, two hits), `#` iron, `.` air.
- `01-the-nave.json` holds the 8 hand-drawn windows. Chapters 02–11 (120 windows) come from
  `scripts/chapel-windows.mjs`: seeded by file name, symmetric silhouettes (rose, arch,
  lancets, chalice, rood, wings…) × colour patterns × chapter palette, with thick glass and
  iron rising through the chapters, unsealing any trapped panes, and sorting each chapter
  easy → hard. To grow the game, add entries to `CHAPTERS` in the script (or hand-write a
  JSON file) and run `npm run windows`. `npm run windows:check` validates every file (widths,
  glyphs, unique names, no glass sealed in by iron) — run it after hand edits.
- Progress: `reached[hour]` is the first window not yet lit. A chapter opens once its first
  window is reached; the menu lets a run begin at any open chapter (`chosenChapter()`).
- Ball speed eases up with the window number (`ramp()` in `engine.ts`, max +20%) so very
  late windows stay playable; the clear bonus caps at window 20.
- Three difficulties named for the canonical hours: **Vespers** (easy), **Compline**
  (normal), **Nocturns** (hard) — ball speed, paddle width, lives, relic drop rate.
- Relics drop from some panes: **Lantern** (wider beam), **Triptych** (ball splits in
  three), **Halo** (slower ball), **Sunburst** (ball pierces panes for a while), **Candle**
  (extra life).
- Combo: panes broken without touching the beam raise the multiplier and the chime pitch.
- Controls: mouse/touch drag moves the beam, click/tap or Space serves; arrows/A-D move,
  P pauses, Esc to menu, ? opens the guide.
- Saves the run between serves (window, panes left, score, lives); best score per hour.

**Tech.** Fixed-step physics (sub-stepped so the ball never tunnels) in `engine.ts`, pure
and DOM-free. Canvas 2D for the field with offscreen layers (stone background, baked light
shafts, pane layer rebuilt only when panes change) and dynamic sprites (balls, trail, beam,
relics, shards) drawn each frame. WebGL nave backdrop in `components/ChapelNave.svelte`.
Physics emits events (pane broken, wall, beam, lost…) that the session drains to play
sounds and update the HUD.

**Sound.** Music: a minimalist organ piece (a nod to Philip Glass) — rolling arpeggios in
A minor over organ pedal, a formant "choir" that enters in later sections, a slow
plainchant line and tolling bells, in a long cathedral reverb (CATHEDRAL master profile).
Synth layers: glass answers, an organ-reed drone and bell glints (`ambientLayers.ts`,
`breakout` arrangement). Effects: glass shatter with tinkles and a chime that climbs a
pentatonic scale with the combo, stone taps, iron clank, relic bells, a low toll when a ball
is lost, a choir chord when a window is lit.

## Lumen Reef (falling blocks) — design

Folder `src/lib/games/reef/`, route `/reef`, station `reef` (ABYSS master profile, `reef`
synth-layer arrangement), storage key `lumen-reef`, guide/tile tone `reef`, `order: 7`.

**Rules** (`engine.ts`, pure and DOM-free): 10 × 20 well plus 2 hidden rows, SRS rotation
and kick tables, seeded 7-bag, 5-piece preview, hold once per piece, ghost, 0.5 s lock delay
with at most 15 move/turn resets, guideline gravity curve (held at level 20). Scoring:
100/300/500/800 × level for lines, T-spins by the three-corner rule (mini and full),
back-to-back ×1.5, combo bonus, perfect-clear bonus. A four-line clear is called a
**Lumen**. Cleared rows dissolve for `CLEAR_DELAY` before the stack settles. Marathon:
level = start level + lines / 10 (start at level 1–15). Sprint: 40 lines against the clock.
Depth = 1000 m + 250 m per level (`depthOf`); the gauge and backdrop peg at level 21.

**Session** (`session.svelte.ts`): rAF loop, DAS/ARR from the Key repeat setting
(`HANDLING`), a 1.3 s ready countdown, pause, stash/resume (the active piece goes back to
the front of the queue; a mid-dissolve save calls `flushClear` first). Opening settings or
the guide during play pauses the game. Bests: marathon score/lines/depth, sprint time in ms.

**Look.** `render.ts` draws the well on a 2D canvas: per-species cell sprites with their own
markings (comb jelly cilia, lanternfish photophores, anemone tentacles, siphonophore beads,
fire jelly rings, sea sapphire facets, sea pen quills), additive halos with a slow light wave
through the stack, dashed ghost, hard-drop streaks, lock flashes, rising plankton motes
from cleared rows, marine snow. `ReefAbyss.svelte` is the WebGL water (depth darkens it,
clears bloom it, a red blush when the stack is near the top). `ReefWhale.svelte` is an SVG
whale that glides across on every Lumen (it fades in place under reduced motion).

**Layout.** Wide screens use the same side-rail HUD as Chapel Glass. In the arena, hold and
next sit beside the well; on narrow portrait the rails slim down, and on tall phones
(arena `max-aspect-ratio: 5/8`) they become a strip above a full-width well. Coarse
pointers get a 7-button bar below the well, and gestures on the well itself: drag to move,
tap to turn, drag down for soft drop, flick down to hard drop, flick up to hold.

**Sound.** Music: D-minor pads under a slowly opening filter, sonar pings with echoes,
formant whale calls, a heartbeat pulse and droplets; `setDivePace(level)` shortens the
step from 0.36 s to 0.19 s and doubles the pulse at depth. Effects: bubbles for moves and
turns, coral clicks on lock, a whoosh and thump for hard drops, plankton sparkle for clears,
the whale song for a Lumen, sonar for level ups, game over and sprint finish.

## Status log

- v1.3.1 — synth layers on every game, warmer master chain, two-column settings.
- Chapel Glass — built and browser-tested (menu, play, window clear into window II, game
  over, phone, reduced motion, hall tile; 60 fps; music RMS matched to Lantern Wyrm).
  Notes for whoever tunes it next:
  - `World.kind`/`hp` are the live panes; `origin`/`strength` are the untouched layout and
    must never share an array with them (the lit share and thick-pane look read them).
  - Light shafts in one column overlap, so `render.ts` weights each by
    `columnWeight` (fewer panes in a column → brighter shafts).
  - Lead must never seal panes in; `npm run windows:check` enforces it.
  - Layout: on wide screens (`min-width: 960px` and `min-aspect-ratio: 3/2`) the HUD splits
    into side rails (`.hud { display: contents }` feeding the play-stage grid areas `lead`,
    `tally`, `ops`) so the window gets the full height. Narrower screens get a compact top
    strip. On tall screens the board pins to the top and the space below is a drag pad
    (pointer handlers live on `.pad` in `ChapelBoard.svelte`, not on the canvas).
  - Field is 832 × 920 units; the board CSS reads the aspect from `FIELD_W / FIELD_H`.
  - Window rendering (`render.ts`) layers, back to front: `stone` (wall + floor, on resize),
    `glass` (uncovered glass only), `blocks` (painted stones + tracery), `frame` (window
    surround), then additive shafts and bloom. `art` holds the full hidden glass, painted
    once per window; uncovering a cell copies its rect from `art` into `glass`. Each cell's
    leads end at points hashed per shared edge, so leading runs unbroken across cells.
    Bloom = `glass` shrunk to 1/10, box-blurred in JS (canvas filters are missing in Safari)
    and drawn back additively; rebuilt only when a cell changes.
  - Ideas not done yet: a pointed-arch top to the window in the field, unlit candle
    stubs in the HUD at zero lives, per-window tint of the stone, a daily seeded window.
- Lumen Reef — built and browser-tested (menu, marathon and sprint, Lumen with bloom and
  whale, game over, phone touch gestures and button bar, settings at 360 × 640, reduced
  motion, arcade tile; 60 fps). Engine checked with scripted cases (7-bag, T-spin double,
  kicks, lock delay, level up, sprint finish, top-out).
- Backdrop flair: Lumen Reef gained jellyfish, glowing currents, surface caustics and kelp;
  Chapel Glass gained stained-colour beams and floor pools, window halos, pane glints,
  incense, candle wheels and votive racks.
- Installable PWA: `static/site.webmanifest` asks for `fullscreen` (falls back to
  `standalone`); PNG and maskable icons are rendered from `favicon.svg` /
  `icon-maskable.svg`. `src/service-worker.ts` precaches the build, static files (minus
  share cards) and every prerendered page, so the arcade plays offline; navigations are
  network-first, Google Fonts are cached on first use. Because the viewport is
  `viewport-fit=cover`, every game's outer padding uses `max(…, env(safe-area-inset-*))`
  to stay clear of notches when fullscreen; new games must do the same.
- Next up: Frostline (Minesweeper).
