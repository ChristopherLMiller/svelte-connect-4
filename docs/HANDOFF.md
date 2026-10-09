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
| `reef` | Lumen Reef | Tetris | Bioluminescent coral in the midnight zone (see below) |
| `frost` | Frostline | Minesweeper | Frozen lake at dawn, crack numerals, fishing flags (see below) |
| `cartographer` | Cartographer | Dots and Boxes | Parchment by candlelight; closed squares reveal a hidden map (see below) |
| `apothecary` | Apothecary | 2048 | Alchemist's bench; glass vials that pour into richer reagents (see below) |
| `seedkeeper` | Seedkeeper | Mancala (Kalah) | Carved river stone at dusk, fireflies on every capture (see below) |
| `zengarden` | Zen Garden | Gomoku | Raked gravel in a temple garden through three seasons (see below) |
| `lighthouse` | Lighthouse | Battleship | Fogbound charts under a lighthouse on a stormy headland (see below) |
| `chess` | Chess | Chess | A candlelit grand hall after midnight, storm at the windows (see below) |

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
  A game without a preview is hidden from the hall. Board and backdrop only: no title,
  score, status or other HUD boxes (the cabinet marquee and card already name the game).
- `<id>/Layout.svelte` — loads fonts, calls `hydrate…()` and `setMusicStation('<id>')`,
  primes audio on pointerdown, sets the page background and focus colours.
- `<id>/Page.svelte` — the game: backdrop, menu or play stage, result overlay, settings, guide.
- `<id>/audio.ts` — exports `startMusic` / `stopMusic` (picked up by `src/lib/audio/station.ts`
  through a glob keyed by folder name) plus the game's `play…()` sound effects.
- Routes `src/routes/[game]/` lazy-load `Page.svelte` / `Layout.svelte` by id and prerender
  one page per manifest. SEO, sitemap and the hall ticker all read the manifests.
- Shared UI with a per-game `tone` union that must be extended for a new game:
  `ArcadeTile.svelte`, `ArcadeExit.svelte`, `GuideShell.svelte` (tones: space, shore, night,
  ash, orrery, chapel, reef, frost, ink, brew, moss, zen, beacon, regal).

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
  CATHEDRAL (breakout), ABYSS (reef), FROZEN (frost), STUDY (cartographer), CELLAR (apothecary),
  RIVERBANK (seedkeeper), TEMPLE (zengarden), HEADLAND (lighthouse), GRAND_HALL (chess),
  SNUG (pub).
- Hidden tabs: the context is never suspended (Safari only resumes inside a click or key
  press). `core.ts` stops the score on `visibilitychange` and restarts it on return, which
  also stops schedulers bursting out notes their throttled timers missed. The root layout
  unlocks audio on any pointer down or key press.
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
3. **Frostline (Minesweeper)** — done, see below.
4. **Cartographer (Dots and Boxes)** — done, see below.
5. **Apothecary (2048)** — done, see below.
6. **Seedkeeper (Mancala / Kalah)** — done, see below.
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

8. **Zen Garden (Gomoku)** — done, see below.
9. **Lighthouse (Battleship)** — done, see below.
10. **Chess** — done, see below.

Next batch (agreed order, picked at random by the user; one at a time with feedback after each):

11. **Lamplight Pub** — built, see below. Cribbage, Hearts, Gin Rummy and Euchre behind one game picker, in a country
    pub at night. Builds the shared card kit (`src/lib/games/kit/cards/`). AI easy/medium/hard;
    hotseat with a privacy curtain between turns (like Lighthouse).
    Euchre (the user's local favourite): partners across, 24-card deck, bowers, going alone.
    Settings: stick the dealer on/off, game to 5/10/11/15. House rules always on: farmer's
    hand, Canadian loner, defending alone (4 points for euchring a loner). Score shown with
    the classic 6-and-4 card counters on the table.
Solitaire (the old Riverboat slot) is covered by the pub's Klondike, FreeCell and Spider, so it was dropped.
The user moved Koi Pond, Haunted Carnival and Nebula Drift to the front.

12. **Koi Pond** — Bubble shooter / match-3 — built, see below.
13. **Silverball** — Pinball parlour of seven tables (grew out of Haunted Carnival) — built, see below.
14. **Nebula Drift** — Asteroids, vector neon.
15. **Ice Rink** — Air hockey on a frozen pond at night; two-thumb hotseat on one phone.
16. **Stone Garden at Dusk** — Go (9/13/19, Japanese scoring, MCTS ladder, ink-wash territory).
17. **Casino terrace** — Yahtzee with physical dice.
18. **Pirate Cove** — Liar's Dice with bluffing regulars.
19. **Lost Temple** — Sokoban, curated levels.
20. **Embroidery** — Nonograms; solved puzzles stitch into a growing quilt.
21. **Paper Lanterns** — Sudoku with technique-rated generator.
22. **Honeycomb** — Hex.
23. **Caravanserai** — Backgammon.
24. **Runestones** — Nine Men's Morris.

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

## Frostline (Minesweeper) — design

Folder `src/lib/games/frost/`, route `/frost`, station `frost` (FROZEN master profile, `frost`
synth-layer arrangement), storage key `frostline`, guide/tile tone `frost`, `order: 8`.

**World.** Sweeping a frozen lake at dawn. Hidden cells are frost, opened cells are clear
ice, numbers are crack patterns (glowing numeral plus n faint radiating cracks), flags are
ice-fishing tip-up flags, mines are thin ice. A wrong step sends branching cracks racing
across the field from the hit (`CRACK_SPEED`), every thin patch plunges into dark water in
distance order, and the backdrop dims. Opening a region melts the frost outward ring by ring
(`MELT_MS`, `RING_MS`) with sparkle motes and timed tinkles. The sun rises with progress.

**Rules** (`engine.ts`, pure). Levels: Shore ice 9×9/10, Open lake 16×16/40, Black ice
30×16/99; daily 16×16/40. Mines are planted on the first step with the step and its
neighbours kept safe. "Sure footing" (on by default) redraws boards until `solves()` (single
cell rules, pairwise overlap rules, global mine count) clears them from the first step; on
Black ice that's ~25 tries, ~4 ms on average, so no worker. The daily (`createDaily`) is
seeded from the date, always guess-free, and starts from a pre-opened zero near the centre
marked by a drilled hole (auger sprite). `flood` records BFS rings for the melt; `burst`
lists every mine by distance for the loss. Chording on a satisfied number; win auto-flags.
`scripts/frost-check.ts` measures guess-free rates and timing and checks the daily and
chord/win/loss: `npx rolldown scripts/frost-check.ts --file /tmp/frost-check.mjs --platform node
&& node /tmp/frost-check.mjs`.

**Session and controls.** `FrostSession` keeps the non-reactive `Field` and mirrors counters
as `$state`; a 100 ms clock; saved survey resumes paused (a stale daily is dropped). Bests
per level, daily time/tries and a daily streak in `persist.ts`. Mouse: left digs (press and
release on the same cell), right flags, middle chords. Touch: tap digs, long press (380 ms)
flags, or the Digging/Flagging toggle swaps them. Keys: arrows/WASD cursor, Space/Enter dig,
F/E flag, P pause, N/R new lake, Esc menu, ? guide. Opening settings/guide pauses.

**Look.** `render.ts` bakes per-cell-size sprites and only draws while something animates.
Black ice transposes on tall screens. `FrostDawn.svelte` is the WebGL lake: dawn sky, hills
and pines, aurora (fades with dawn), shooting stars, a skein of geese, sun shafts, reflections,
snow drifts, spindrift, fishing shacks with stove smoke and lit windows, an angler at a hole,
glitter column, Voronoi crack spread on a loss, mist and diamond dust. People are SDF figures
(`skater()`, `dog()`, `angler()`): four skaters (one a pair, one with a dog) and a walker
towing a sled, moving in plane space so speed and size follow depth. Their blade and runner
marks are found analytically: for each pixel column, how long ago the figure crossed it.

**Sound.** D Lydian score: FM bells, a filtered triangle pad, sine bass, gusting wind and
the occasional "singing ice" chirp. Effects: crunch plus melt tinkles, flag thunk, crack and
plunge, thaw chord on a win.

## Cartographer (Dots and Boxes) — design

Folder `src/lib/games/cartographer/`, route `/cartographer`, station `cartographer` (STUDY
master profile, `cartographer` synth-layer arrangement), storage keys `cartographer` (kit
prefs) and `cartographer-view` (chart size, giveaway warning, charts drawn), tone `ink`,
`order: 9`.

**Rules** (`engine.ts`, pure). n × n boxes (isle 4, coast 6, realm 8). Edges are numbered
horizontals first (`r*n + c`), then verticals (`H + r*(n+1) + c`); `topology(n)` caches
box↔edge tables. Closing a box keeps the turn. Vermilion (1) opens the first sheet; the
opener alternates on each new sheet.

**AI** (`ai.ts`, in a worker). Easy grabs boxes most of the time and otherwise plays
loosely. Medium takes everything, then plays safe lines, then the cheapest sacrifice. Hard
decomposes the board into chains and loops, double-deals (leaves 2 of a chain or 4 of a
loop) when control pays, searches the last ≤ 18 safe moves with a memoised negamax on
the controlled value, and sacrifices with the hard-hearted handout. `scripts/cart-check.ts`:
`npx rolldown scripts/cart-check.ts --file /tmp/cart-check.mjs --platform node && node
/tmp/cart-check.mjs` (Hard beats Easy and Medium almost always; slowest move ~90 ms on 8×8).

**Look.** `map.ts` builds a hidden chart per seed: value-noise elevation shaped per chart
(island, coast, continent), sea level by quantile, terrain per box, and a glyph per box from
a terrain pool plus specials (serpent, compass rose, castle, dragon, lighthouse, treasure X).
`paintChart` paints it once as a soft watercolour with marching-squares coastline and
ripple contours. `render.ts` draws parchment, wobbly quill lines that grow in, a halo on the
last line, dashed previews in the current ink (with a red warning mark on giveaways), and
reveals each closed box with an inky radial wipe from the closing line, then commits it to
the claimed layer. Pointer: press previews the nearest line, slide to adjust, release inks.
`CartDesk.svelte` is the WebGL desk: walnut planks, flickering candle light with shadows,
a moth circling the flame with its giant shadow, inkwell that ripples on every line, quill,
brass compass whose needle swings to whoever is inking, coins, magnifier with a caustic
hot spot, loose notes, rolled chart and dividers on wide screens, moonlight through window
panes, dust motes, a breathing tabby, and a mouse every ~40 s that makes the cat open an eye.
The flame flares when squares close; the room warms on a win. Timed extras in the shader:
the cat wakes every 95 s, stretches and turns to a new angle; a gust every 53 s makes the
flame gutter, the notes flutter and the moth and motes drift; a spider drops on a thread
every 71 s. Wax pools in the candle dish with the share of lines inked (`burn` prop).

**Sound.** D Dorian consort: harpsichord arpeggios, lute bass, recorder phrases, candle
crackle. Effects: quill scratch per line, a pluck per claimed square that climbs with the
run, a soft turn pluck, parchment unroll on start, win, loss and draw cadences.

## Apothecary (2048) — design

Folder `src/lib/games/apothecary/`, route `/apothecary`, station `apothecary` (CELLAR master
profile, `apothecary` synth-layer arrangement), storage key `apothecary`, tone `brew`,
`order: 10`.

**Rules** (`engine.ts`, pure). Benches: classic 4 × 4, grand 5 × 5, and a daily 4 × 4 brew
seeded from the date (`seedFrom`, mulberry32 state kept in the save so a resumed brew draws
the same spawns). Cells hold tiers (value `2^tier`); 90% of spawns are tier 1. The
Philosopher's Stone is tier 11 (2048): the result overlay offers "Keep brewing". Three
stoppers (undos) per brew, with up to 6 snapshots kept; making a new reagent of tier ≥ 8
refunds one stopper. Reagent names, colours and notes live in `REAGENTS` (tiers 1–18).
`scripts/apo-check.ts`: `npx rolldown scripts/apo-check.ts --file /tmp/apo-check.mjs
--platform node && node /tmp/apo-check.mjs`.

**Look.** `render.ts` is one WebGL2 program: mode 0 draws the walnut rack with brass-ringed
wells, mode 1 draws instanced vials. Vial shape follows the tier (test tube, round flask,
conical, potion bulb, hex crystal); the liquid sloshes on slides, swirls from the old
colour to the new on a merge, and bubbles. Parchment labels come from a Canvas2D atlas
(Cinzel, repainted once the font loads). Tier ≥ 8 glows, ≥ 10 gives off vapour, ≥ 11 throws
sparks. `ApoLab.svelte` is the backdrop: stone wall, arched night window with moon and a
shooting star, a raven that blinks, turns and hops, tincture shelves, hanging herbs, a
grimoire whose runes take the brew colour and turn a page every 23 s, a candle, and an
alembic boiling in the colour of the rarest reagent. The burner flares with each merge and
rises with tension (a full rack); a salamander peeks from the flame every 37 s; golden
sparkles on a Stone; the room dims on game over.

**Sound.** A harmonic minor: harmonica drone, celesta figures, bubbling. Effects: slide,
pour (pitch climbs with the tier), new-reagent chime, Stone fanfare, undo, nudge (blocked
move), game over.

## Seedkeeper (Mancala / Kalah) — design

Folder `src/lib/games/seedkeeper/`, route `/seedkeeper`, station `seedkeeper` (RIVERBANK
master profile, `seedkeeper` synth-layer arrangement), storage keys `seedkeeper` and
`seedkeeper-view`, tone `moss`, `order: 10`.

**Rules** (`engine.ts`, pure). Board of 14: pits 0–5 are Firefly's, 6 her store, 7–12
Heron's (running right to left on screen), 13 his store; `opposite(i) = 12 - i`. Sowing
skips the rival store; last seed in your store sows again; last seed in an empty own pit
with seeds opposite captures both; when a side runs dry, each side's leftovers sweep home.
Sowings: handful 3, classic 4, harvest 6 seeds a pit. `sow()` returns the path, capture,
extra turn and sweep so the renderer can replay it. AI (`ai.ts`, worker): alpha-beta with
extra turns kept by the same mover, ordering extra-turn and capture moves first. Fledgling
is part random at depth 1, Wader depth 4 with slips, Elder iterative deepening to 650 ms.
`npx tsx scripts/seed-check.ts` (needs the sandbox off).

**Timing.** `timing.ts` builds one schedule per sowing (lift, hop per pit, capture, sweep,
end) that both the session waits on and the renderer animates, so state and motion line up.
`session.shown` is the board as drawn; it catches up when each sowing ends.

**Look.** `render.ts` (Canvas2D) pre-renders the carved stone slab with moss, lichen and a
wave channel, then draws seeds in phyllotaxis slots. A sowing lifts a glowing handful that
glides along the path and drops a seed per pit with a ripple and dust; captures burst both
pits and fly the seeds home; "Sow again" floats over the store. Trail preview on hover
shows the path, the last pit and any capture. On tall screens the board turns upright.
`SeedBank.svelte` is the WebGL backdrop: sky that darkens with the share of seeds gathered
(dusk → night), stars, shooting stars, birds, hills, a river with glitter, a jumping fish,
lily pads and a frog, a heron that strikes when Heron captures, a willow, mushrooms,
cattails, and fireflies that swarm on every capture.

**Sound.** G pentatonic kalimba with udu, shaker, crickets, frogs and a brook. Effects:
lift, a land clack per seed (higher in a store), capture, sow again, turn, win, draw.

## Zen Garden (Gomoku) — design

Folder `src/lib/games/zengarden/`, route `/zengarden`, station `zengarden` (TEMPLE master
profile, `zengarden` synth-layer arrangement), storage keys `zengarden` and
`zengarden-view` (garden, season, warn, ghost, raked), tone `zen`, `order: 11`.

**Rules** (`engine.ts`, pure). Freestyle gomoku: five or more in a line wins. Gardens:
courtyard 13, temple 15, grand 19. Slate opens the first game; the opener alternates on
rematch. `replay()` rebuilds and validates saved games. `Field` keeps per-window (runs of 5)
stone counts incrementally, so threat lookups (`winPoints`, `fourMakers`), move heat and the
evaluation are cheap. AI (`ai.ts`, worker): win now, block now; Novice is weighted-random
over the top candidates and misses some blocks; Adept runs a short VCF (victory by
continuous fours) then alpha-beta depth 2; Master runs a deep VCF, filters moves that let
the opponent's VCF through, then iterative-deepening alpha-beta to 850 ms.
`npx tsx scripts/zen-check.ts` (needs the sandbox off).

**Session.** Undo ("Rake back", U) takes back one stone in hotseat, or your stone and the
Monk's reply. `threats` (from `Field`) drive the red/gold rings when "Point out fours" is on.
`progress` (stones / 35 % of the bed) moves the light through the day.

**Look.** `render.ts` (Canvas2D) pre-renders a cedar frame, gravel grain and raked grooves
along the lines, and stone sprites; settled stones sit on a cached "still" layer with raked
rings round each. Stones drop with a squash, a gravel ripple (clipped to open gravel) and
grit. Leaf dapple drifts over the bed and season petals settle on it. A five glows, gets a
vermilion brushstroke and a 勝 seal stamp. Clearing the bed rakes the stones away in a sweep.
Touch on small points (< 30 px) aims first and places on a second tap.
`ZenGrounds.svelte` is the WebGL backdrop: season sky, ink-wash mountains with a pagoda,
an ochre temple wall, raked gravel with moss rocks, a koi pond that ripples on each stone,
a shishi-odoshi that knocks every 11 s (sound in sync), bamboo, a stone lantern, a great
tree (cherry blossom, maple or snowy plum), season particles that gust on a win.

**Sound.** D yo scale: koto, shakuhachi, singing bowls, drips, a warbler and a water loop.
Effects: stone on gravel (panned), wooden clappers for a new four, deer-scarer knock, rake
back, win, draw.

## Lighthouse (Battleship) — design

Folder `src/lib/games/lighthouse/`, route `/lighthouse`, station `lighthouse` (HEADLAND master
profile, `lighthouse` synth-layer arrangement), storage keys `lighthouse` (saved battle:
fleets + shot list, rebuilt and validated with `replay()`) and `lighthouse-view` (sea,
weather, chain, fought, wrecks), tone `beacon`, `order: 12`.

**Rules** (`engine.ts`, pure). Seas: cove 8×8 (4 ships), channel 10×10 (5), ocean 12×12 (6).
Ships run right or down from the bow, may touch, never overlap. `fire()` marks MISS / HIT,
and a ship's cells turn SUNK together. "Fire again on a hit" (`chain`, off by default)
keeps the gun on a hit. The opener alternates on rematch, and each side's last layout is
prefilled. AI (`ai.ts`, worker): Deckhand fires near a hit 60 % of the time, else at
random; Bosun extends lines of hits, then neighbours, then a parity hunt; Captain builds a
probability map of every placement of every afloat ship consistent with the shots (hits
weigh heavily) with a parity bias. On hard the Wrecker's own fleet is laid with gaps.
`npx tsx scripts/light-check.ts` (needs the sandbox off): average shots on the channel are
about 66 / 52 / 45.

**Session.** Screens are menu, setup and play. In setup, tap water to lay the selected
ship, tap a laid ship to turn it about its bow, drag to move it. R turns the ship;
Scatter and Clear do what they say. Hotseat shows a `curtain` before each setup and after
every change of gun; the arenas are `visibility: hidden` under it. `viewer` is whose
charts are on screen (target fog above or left, own fleet below or right). Each shot
emits a `shot` event; the board animates and the session waits `SHOT_MS` before
revealing. `flash` bumps on hits and `wreck` on sinkings for the backdrop.

**Look.** `render.ts` (Canvas2D) pre-renders a wood and brass chart frame with A–J / 1–n
labels and a compass rose, a wave tile, ship sprites (hull, masts, sails, a stern lantern
in the owner's glow, a dark wreck variant) and a fog layer cached by which cells are
known. Per frame: drifting waves, the lighthouse beam swinging over the chart (it aims at
the target during a shot), shell flight, spray or sparks and chips, fires on hits,
explosions chained along a sinking hull, embers and bubbles over wrecks, a brass reticle.
`Headland.svelte` is the WebGL backdrop: storm, fog or moonlit sky, lightning (random in
storm, plus a strike on every sinking, with thunder via `onthunder`), horizon ships, a
perspective sea with moon glitter, near swells, a bell buoy, a craggy headland with a red
and white lighthouse and rotating beam, spray, rain and fog veils. A win brings dawn, a
loss to the Wrecker greys it out. Page layout: two charts side by side, stacked when
the harbor is portrait (`@container (orientation: portrait)`); each chart is a size
container so the board and its label hug.

**Sound.** D Dorian shanty in 6/8: concertina, fiddle, frame drum, bell buoy, creaks,
surf (plus rain in storm, a foghorn in fog). Effects: cannon (panned), splash, hit,
sink, thunder, foghorn on a change of watch, place, rotate, win, lose.

## Chess — design

Folder `src/lib/games/chess/`, route `/chess`, station `chess` (GRAND_HALL master profile,
`chess` synth-layer arrangement), storage key `chess` (saved game as a SAN list replayed on
load, plus the view: mode, opponent, colour, clock, board toggles, ladder records), tone
`regal`, `order: 13`.

**Rules** (`engine.ts`, pure). 0x88 board, make/unmake, FEN, SAN in and out, castling,
en passant, promotion, check/mate/stalemate, insufficient material, the 50- and 75-move
rules and three- and fivefold repetition (the 75/5 ones end the game, the 50/3 ones are
claims). `npx tsx scripts/chess-check.ts` runs perft on the standard test positions.

**AI** (`ai.ts`, worker). Iterative deepening PVS with a transposition table, quiescence,
killers/history and a tapered eval whose weights come from each opponent's style. The
ladder is eight opponents from Pip (400) to the Count (2200); weaker ones search shallower,
blunder by sampling among near-best moves with a temperature, and miss captures now and
then. `book.ts` holds named openings each opponent favours; the HUD shows the opening name
until play leaves the book. The same worker serves the eval bar and the post-game review
(inaccuracy, mistake, blunder, with "Better was …"). `scripts/chess-ai-check.ts` plays
mini-tournaments between neighbouring rungs; each rung beat the one below.

**Session.** Optional clocks (1+0, 3+2, 5+3, 10+0) with flag fall, promotion picker, draw
offers (hotseat) and claims, two-tap resign, move list stepping, flip/auto-flip, PGN copy,
review mode and rematch with colours swapped. `flash` bumps on checks and mates and the
capture count drives `stir` for the backdrop.

**Look.** `render.ts` (Canvas2D): marble board with a carved gilt frame, sprite pieces,
drag or tap, sliding moves, captured-piece arcs, a toppling king on mate. `GrandHall.svelte`
is the WebGL backdrop: stone wall with arched rain windows (gust-driven rain sheets,
billowing velvet curtains, forked lightning every 5–17 s and on checks, with thunder via
`onthunder`), chandeliers that sway with the wind, and between the windows a portrait
whose eyes follow the pointer, the selected square or the last move (`gaze`), above a
marble fireplace with fbm flames, logs and sparks. Two silhouetted guests stand at each
hearth, sipping wine, leaning in and pointing on captures and checks, clapping on a win
and bowing their heads on a loss. Floor candelabras flank the board; embers and dust
motes drift. A win brings dawn, a loss snuffs the candles to smoke.

**Sound.** A slow piano nocturne in 6/8 (E-flat major, C minor middle section, rubato at
cadences) from additive piano voices; no noise beds (the user dislikes hiss). Effects:
move, capture, castle, check, promotion and start rolls, select, nudge, clock tick, draw
offer, win, lose, draw, flag fall, thunder.

## Lamplight Pub — design

Folder `src/lib/games/pub/`, route `/pub`, station `pub` (SNUG master profile, `pub`
synth-layer arrangement), storage keys `pub-view` (variant, mode, difficulty, hotseat seats,
stick, euchre length, hints, pace) and `pub-<variant>` (record per difficulty, local games
played, saved table), tone `tavern`, `order: 14`.

**Card kit** (`src/lib/games/kit/cards/`, shared with future card games). `deck.ts` (card =
suit × 13 + rank, rank 0 = two … 12 = ace; seeded shuffle, sorting), `faces.ts` (canvas-drawn
faces and backs cached as data URLs; `Path2D` built lazily so SSR works), `layout.ts`
(`fan`, `stack`, `Placement`), `CardLayer.svelte` (every card always placed, keyed by id;
CSS transforms animate deals, plays and flips; tap to pick, drag up past 0.7 card heights
to play).

**Rules** (`rules/*.ts`, pure, relative imports so `tsx` works). Seats run clockwise from
seat 0; table position = (seat − viewer + 4) % 4. Cribbage to 121 with go, last card, his
heels and nobs, a three-step show. Hearts with left/right/across/hold passing, no points on
the first trick, hearts broken, moon shooting, to 100. Gin with the first upcard offer,
knock at 10, gin 25, big gin 31, undercut 25, layoffs, void at two stock cards, game 100
(200 shutout) plus 25 a box. Euchre with bowers, stick the dealer (setting), game to
5/10/11/15, farmer's hand (three or more nines/tens may be swapped for the three hidden
kitty cards before bidding — our reading of the house rule), Canadian loner (the dealer's
partner can't order up alone), defend alone (4 for euchring a loner).
`npx tsx scripts/pub-check.ts N` runs scoring asserts and AI-vs-AI games (40 each: hard
beat easy 34/40 crib, 36/40 gin, 33/40 euchre, hearts 32 vs 78 points; hard beat medium
26/40 at euchre).

**AI** (`ai.ts`, worker). Cribbage throws by expected value over every starter; Gin by
deadwood and (hard) discard danger; Hearts and Euchre heuristics, with determinized Monte
Carlo on hard (void-aware sampling). Hard Hearts can take ~0.7 s a move.

**Session.** Gather → deal → live stages per hand, auto trick pause, pace setting,
privacy curtain whenever the next person to act isn't the one looking. Speech bubbles on
plates; `cheer` (29s, moons, gin, marches), `hush` (loners) and `stir` (points) drive the
backdrop. `PubPrompt` shows actions and hand summaries; `Ledger` shows the walnut peg
board, six-and-four counters (a face-down card slides over uncounted pips) or a chalk
scoresheet; it's a side column at ≥1100 px wide landscape, a "Scores" sheet otherwise.

**Look.** `Snug.svelte` (WebGL): oak beams with hanging tankards and a hanging oil lamp, an
inglenook with fbm flames, sparks and a dartboard on the chimney breast, a sleeping dog who
lifts his head on a cheer, a leaded diamond window with rain and a street lamp outside, a
bar with brass taps and a pint, pipe smoke and flagstones. Cheers flare the fire, loners
dim the room.

**Sound.** A gentle folk tune in 3/4 (D major, B minor B part): fiddle, concertina,
fingerpicked guitar and bodhrán; no noise beds. Effects: card, deal, pass, select, peg,
turn, knock, cheer, hush, win, lose.

**More tables.** Spades plus eleven more run through a generic pipeline: `rules/<game>.ts`
(a `RuleSet`), `bots/<game>.ts`, `coach/<game>.ts` (advice with a why, and a review of the
player's move) and `views/<game>.ts` (a `GameView`: glyph, tips, Rosie lesson, layout,
prompt, ledger, guide, tap/spot handling). Each is registered in `rules/registry.ts`,
`bots/registry.ts`, `coach/registry.ts` and `views/index.ts`. Games: Oh Hell, Crazy Eights,
Go Fish, Old Maid, Blackjack (two decks, ids 0–103), Kings Corner, Rummy 500, Pinochle
(48-card double deck), Klondike, FreeCell (best-first solver in `bots/freecell.ts`, cells
5/4/3 by level) and Spider (1/2/4 suits by level, deck ids from `spiderDeck`). Patience
layouts share `views/patience.ts`. Solitaire bots only make progress moves and resign when
stuck, so AI games always end. `npx tsx scripts/coach-check.ts N [--only=game] [--show]
[--lesson-seeds]` plays N games of each, checks every piece of advice is legal and its text
has no undefined/NaN/null, and finds a lesson seed that shows every concept.

## Koi Pond — design

Folder `src/lib/games/koi/`, route `/koi`, station `koi` (POND master profile, `koi`
synth-layer arrangement), storage key `koi-pond` (mode, aim guide full/short, hints, best
score/stage per mode plus longest Currents chain, one saved game per mode), tone `pond`,
`order: 15`.

**Two modes, one cabinet.** The menu picks between them; each keeps its own save, so
switching never loses a game.

- **Ripples** (bubble shooter, `shooter.ts`). Offset hex grid of blooms; the shot is planned
  as a path with wall bounces, snaps to the nearest free cell, pops groups of 3+ and drops
  anything no longer hanging from the reed line. Each miss uses up one of the stage's
  allowance; when it runs out the reed line sinks a row. Blooms crossing the bottom line end
  the game. `stageRules(stage)` sets rows, colours, allowance and how far down the stage
  starts. Only colours still on the board are dealt. Tap the next bloom to swap.
- **Currents** (match-3, `match.ts`). 8 × 8, 22 moves a stage, target from `stageGoal`.
  Four in a row makes a row/column current, an L or T a burst, five a moon (clears every
  bloom of the swapped kind); specials combine when swapped together. Unused moves pay
  `MOVE_BONUS` each. Dead boards reshuffle. A hint pulses after 6.5 s idle (setting).

`npx tsx scripts/koi-check.ts` has bots play 30 games of each and checks invariants
(connectivity after drops, no matches left standing, cascade and plan timings).

**Session.** `KoiSession` keeps the engine and a trailing view: Ripples flies the shot along
the planned path (bounce sounds at vertices), Currents runs swap → pop → fall phases with
per-piece visuals. Big plays (and every stage clear) send the golden koi leap
(`KoiLeap.svelte`) across the screen; every landing splashes ripples into the backdrop
through `onSplash`.

**Look.** `KoiWater.svelte` (WebGL): pebble bed, caustics, leaf dapples, five koi with
shadows, lily pads (two with lotus), drifting maple leaves and up to ten ripples from play;
it dims while paused and warms red when Ripples is near the line. Blooms are canvas sprites
(`bloomSprite` in `render.ts`): lotus, ginkgo, koi, lily pad, iris, dragonfly.

**Sound.** G-major pentatonic: hang drum wandering over soft keys and light bass, water
plops, a quieter section every fourth group of bars; no noise beds.

## Silverball (pinball parlour) — design

Folder `src/lib/games/pinball/`, route `/pinball`, station `pinball` (PARLOUR master
profile), storage key `silverball` (table, difficulty, rumble, voice, best score and feat per
table per difficulty, one saved game), `order: 16`. The user asked for "many styles" after
finding the first table boring, and for flippers that never trap a held ball.

**Layout.** `engine/` is shared by every table; each table is a folder under `tables/` with
`def.ts` (geometry), `rules.ts` (state machine), `art.ts` (canvas painting and toys) and
`index.ts` (the `TableSpec`: meta, backdrop GLSL, score, SFX palette, hot test, feat).
`tables/index.ts` is the registry; `tables/parts.ts` holds proven pieces (orbits, side ramps
with wireforms, top lanes, `bankRoof`); `tables/kit.ts` has loop and combo helpers.

**Engine.**
- `def.ts`: field 20 × 36, ball radius 0.45, right half mirrors the left about x = 9.3.
  Walls (one-way via `nx`/`ny`, `toggle`d, `kind` for looks), posts, bumpers, flippers (any
  layer), drop banks, standups, spinners, sensors, holes (saucer/scoop/sink, `toggle`,
  `eject.ride`, `aim`), ramps, rides (wireforms; `exit.layer` can be 1), movers, magnets,
  discs (spinning plates that drag balls round) and captives (a ball on a short track, hit
  by the play ball and rolling back under gravity; `captive` event when it reaches the end).
  An `aim` hole holds its ball while its angle sweeps (`world.aims`); a flipper press after
  `ready` fires it along the aim at `speed`, or it fires itself after `wait`. `aiming(g)`
  tells art and rules where it points.
  `lower()` builds slings, inlane guides that end inside the flipper pivots, outlanes and
  flippers; `shell()` the cabinet and shooter gate; `build()` merges parts and adds ramp rails.
- `physics.ts`: fixed steps, two layers (0 playfield, 1 raised), ramps lift balls to layer 1,
  rides carry them, movers have `solid`, magnets pull while on. Escaped/NaN balls are `lost`.
  Contact friction is Coulomb-style and only on real impacts (closing speed over 1): a flat
  per-step friction made balls crawl along guides and wireforms then speed up once free.
  Ramp rails (`kind: 'rail'`) are slicker than the rest, so a diagonal shot rattling up a
  ramp keeps its pace. Open rides pick up speed downhill with drag (`RIDE_*`); `carry` rides leave along their last
  heading at the speed they rode, so wireform returns reach the flippers without a lurch.
  `lower()` adds a one-way rubber off each side wall above the outlane (`OUT_GUARD`); the
  kickback passes under it. pinball-check prints the share of drains down the outlanes
  (aim: under about 30%).
- `game.ts`: serve, plunger (tap = 45%), ball save, kickback, skill shot, lane groups,
  combos, timed modes (`startMode`/`modeShot`), `multiball`, `extraBall`, nudge and tilt,
  holds (`rules.hold` returns seconds) and `grab()` for holding a ball outside a hole (the
  kraken). Rules get `event`, `hold`, `move` (every step), `tick` (every frame), and hooks for
  lanes, modes, multiball end and ball end. `nudgeStill` kicks a ball resting for 6 s.
- `render.ts`: printed playfield painted once per size, upper canvas for layer 1 (ramps,
  wireforms, `paintUpper` decks, raised inserts), then per frame lit inserts, bulbs, targets,
  bumpers, `art.toys`, flippers and balls per layer, then `art.raised`. Under reduced motion
  the clock is frozen at 0, so toys and blinks hold still. Light shows (`Show`: sweep, strobe,
  ring, dark) ride over the inserts and bulbs from events and cues; GI lamps glow under the
  plastics and dip on big coils; flasher domes fire on ramps and big cues (big strobes kept at
  3 Hz or slower); the table shakes on jackpots, nudges and tilt; unlit inserts chase. All of it
  is off under reduced motion. The backdrop adds searchlights and a chasing marquee in the
  table's colours and throbs on every hit (`session.pulse`). Modes beep a hurry-up for the last
  five seconds (`hurry` cue); every switch has a sound.

**Tables.**
- Haunted Carnival (fairground): ghost train and Ferris wheel ramps, Zelda saucer, F·A·T·E,
  Midnight multiball (one add-a-ball), six attractions (Ghost Train … Big Top) to the
  Witching Hour. Every wheel ramp spins the Big Wheel round the clock (`spinWheel`, paid in
  `tick` after 2.8 s): 25K, lock, kickback, bonus ×, spot F·A·T·E, 100K, extra ball, souls.
  Every train ramp plays the Ghost Train (`trainAt`, `ghostTrain` cue): the tunnel at the top
  left throws its doors open and lets a ghost out, carriages run under the ball along the
  wireform, the ramp's rail bulbs race, and four lamps under the ramp count rides to the
  extra ball. All of it is drawn in `raised`, above the wireforms.
- The user asked for every table to play differently, not reskins, so each has a structural
  gimmick of its own; only Haunted Carnival keeps the classic two ramps and two orbits.
- Hi-Fi Holiday (1962 woodrail): four flippers and no orbits. A short bottom pair with a
  wide gap and a centre post, plus a mid-field pair (`ML`/`MR`, fed by guides off the side
  walls). Five bumpers (three top, two low), rubber posts. Five balls, A·B·C·D lights
  bumpers then the Special, kick-out pays by count, side targets raise the multiplier;
  chimes and score reels.
- Nova Patrol (1984): U·F·O and A·L·I·E·N drop banks, upper flipper fed by the left orbit
  over a diverter (the right orbit is its return path, so it stays), Star Storm multiball,
  six missions to Supernova, a talking computer.
- Dead Man's Tide (pirate): three flippers. The gunwale flipper (`U`) sits on the left wall
  halfway up, fed by the left lane; the right orbit loops round onto it. The treasure chest
  is a captive ball (four smashes burst it: award plus bonus ×). Plank ramp on the right,
  bumpers top right, the galleon sailing the top left (sinks after 10/14/18 hits; ten hull
  lamps show the share broken; the wreck then opens for Plunder multiball), the cove saucer,
  the M·A·P bank facing the gunwale flipper, and the mast scoop whose hidden `hoist` ride
  lifts the ball to the top lanes. Six voyages to Davy Jones' Locker. Bots average about
  8 minutes and 8M, with a long tail; the hull counts and chest are the balance levers.
- The Abyss (deep sea): no orbits, open water. A whirlpool disc in the middle with three
  bumpers round it and the undertow magnet at its eye; it spins faster and reverses while
  the kraken is awake. Every half turn a ball rides pays a whirl (`tick` tracks the angle
  carried per ball); six whirls or orbit loops light an extra ball; Riptide mode wants
  whirls. The kraken lives top centre and grabs the ball once awake (`grab`); grotto saucer,
  trench scoop (hidden tunnel to the right), vent ramp, pearl standups. Six dives.
- Dragon's Keep: a layer-1 deck across the top between the ramps with its own right flipper
  (on the right button), the dragon and two hoard standups. The tower ramp's ride exits on
  the deck; balls off the deck fall into the lair and ride back to the right inlane. The
  portcullis (mover) guards the keep; smash it, lock two balls for Siege; six quests to
  Dragonfire. The left orbit has no flap here (it made a pocket against the gate).
- High Noon Express (Wild West): the train runs a long track across the top with station
  stops. Its sweep is capped at reach 3.6, because at 4.4 its rest spot made a pocket against
  the left orbit. The mine ramp goes straight up the middle and its `cart` ride carries the
  ball over the fenced corral of bumpers (top left) to the left inlane. A railroad ramp on
  the right, the vault scoop right of the mine (the dial spinner cracks it for bank jobs and
  Gold Rush), and a diagonal row of three outlaw standups. The saloon saucer is the Quick
  Draw: an `aim` hole whose six-shooter swings from the corral (-1.3 rad) to flat across at
  the outlaws; a flipper fires it, and an outlaw hit within 1.2 s pays a growing quick-draw
  bonus. The train can't be reached from the gun (a bumper is in the way). Six bounties
  (Train Robbery, Showdown…) to High Noon.

**Checks.** `npx tsx scripts/pinball-check.ts [games] [kind|fair|wicked] [table]` (needs to run
outside the sandbox). Per table: a cradle test (hold a flipper, drop a ball, let go, it must
roll away), a pocket grid (drop balls everywhere; nothing may rest), a rules fuzz (thousands
of injected switches; every `EXPECT` cue must be reachable) and bot games (fail on escapes,
a ball still for 5 s with no flipper held, or wall overlap over 0.3; unreached ramps, holes,
spinners and lanes are only notes). The cradle test uses the first layer-0 flipper on each
side, so `lower()` must come before any extra flippers in `build()`. The fuzz skips holes
whose toggle is shut, as the engine does.

**Sound.** `sound/score.ts` sequences each table's score (bars of chord, root and tune;
sections; lead/bass/comp voices; drum patterns) and crossfades on table change; `sfx.ts`
maps events through a per-table palette (bumper, ramp, drain and toy voices, own cues,
optional chimes and speech). Gunshots, cannon and crashes are pitched sweeps; no noise beds.

**Backdrops.** `Backdrop.svelte` wraps each table's `scene()` GLSL (ES 3.0, `s.y` up) with
shared noise helpers; `hot` eases in during multiballs and wizard modes.

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
- Frostline — built and browser-tested (menu, all levels, daily, sure footing, win and loss,
  Black ice flipped on tall screens, phone 390 × 844 play/pause/settings, reduced motion,
  hall tile; 60 fps). Awaiting user feedback. Open question: phone cells are small on Open
  lake (~23 px) and a square board leaves vertical space; pinch-zoom/pan could help.
- Frostline released as v1.5.0 after feedback (hold to flag, smoother ice, skaters and more).
- Cartographer — built and browser-tested (menu, hotseat claims, full game vs Master,
  result seal and "Admire the map", phone 390 × 844; 60 fps). Awaiting user feedback.
- Apothecary — built and browser-tested (menu, pours by keys and swipe, undo, every tier up
  to 65536 rendered, result overlay, desktop 1440 × 860, phone width, reduced motion; 60 fps).
  Awaiting user feedback.
- Apothecary feedback done (slide, jostle, SFX; hall previews show board + backdrop only).
- Seedkeeper — built and browser-tested (menu, hotseat to the harvest, captures vs Old
  Heron, result overlay, phone 390 × 800 with the board turned upright, reduced motion,
  hall tile; 60 fps median). Awaiting user feedback.
- Zen Garden — built and browser-tested (menu, games vs Master, hotseat win with brush and
  seal, undo, all three seasons, phone 390 × 800 with touch aim, reduced motion, hall tile;
  60 fps). Awaiting user feedback.
- Lighthouse — built and browser-tested (menu, setup by tap, drag, turn and scatter, a full
  battle lost to the Bosun, a hotseat battle on the cove through every curtain to the dawn
  win, storm, fog and moonlit, tablet portrait and phone 390 × 800, reduced motion, hall
  tile; 60 fps). Awaiting user feedback.
- Chess — built and browser-tested (menu and ladder, tap and drag moves, book openings,
  castling, en passant, promotion with underpromotion, mate with dawn, resign, flag fall,
  review, rematch as Black, hotseat, phone 390 × 844, reduced motion; 60 fps). Feedback so
  far: music rewritten twice (no hiss, now a piano nocturne); backdrop gained portraits,
  fireplaces, guests, candelabras, embers and a stronger storm. Awaiting more feedback.
- Lamplight Pub — built and browser-tested (menu, a hand of each game vs the regulars, a
  euchre game to the result, hotseat hearts through the curtain, phone 390 × 844 with the
  scores sheet, reduced motion; 60 fps). Awaiting user feedback.
- Lamplight Pub, all sixteen tables with Rosie's coaching and lessons — coach-check passes for
  every game; FreeCell and Spider lessons checked in the browser. Released as v1.8.0.
- Koi Pond — built and browser-tested (menu, Ripples aim/shoot/pop/drop/misses and resume,
  Currents select/swap/refill, keyboard play, phone 390 × 844, reduced motion, hall tile;
  ~56–60 fps). Not yet seen in the browser: the leap, stage clear, specials, game over.
  Awaiting user feedback.
- Haunted Carnival — built and browser-tested (menu, launch, Zelda saucer, flippers, pause,
  guide, settings, three drains to game over with new best, phone 390 × 844, reduced
  motion).
- Silverball — feedback ("flippers trap a held ball", "boring", "many styles?") turned the
  carnival into a seven-table parlour on a shared engine (see the design section). Every
  table passes pinball-check; every backdrop shader compiles; all seven playfields and the
  Dragon's Keep HUD were looked at in the browser. Not yet played by hand in the browser:
  the multiballs, wizard modes, the kraken grab and the dragon deck (bot only). Awaiting
  user feedback.
- Silverball feedback round ("too easy to lose it down the sides", "the wheel ramp does
  nothing", "far more lights and sounds", "balls stick on the ramps then speed up"): outlane
  guards, impact-only friction, gravity on wireforms, the Big Wheel prize spin, engine-wide
  light shows, GI, flashers, shake, a backdrop marquee, and sounds on every switch. Outlane
  share is now 15–28% across the tables (was about 40–60%). Bot check all good; seen in the
  browser (menu and Carnival in play); the wheel spin itself was only checked by the bot.
- Feedback round (Koi + pub):
  - Koi Ripples: a faint copy of the loaded bloom sits at the aim's landing spot.
  - Pub cards: `CardLayer` drops the shadow on any card sitting under a close overlap
    (`covered`), so stacks don't darken, and lifts moving cards above the rest (`flying`).
    `scripts/pub-cards-check.ts` (run with tsx) plays bot games through
    `layoutTable` and reports any card that vanishes or pops in; it prints nothing when
    clean. Fixed that way: gin defender melds vanishing (`defend` shared array) and Oh
    Hell's undealt deck (now a face-down stack).
  - Pub chips: views push declarative chips into `kit.chips` (`from`/`to` points,
    `gone` to sweep away); `Chips.svelte` throws them in on an arc. Only blackjack uses them
    so far (stake, double, payout, lost bets swept to Bert).
  - `GameView.double` (double-tap a card) and `GameView.autoStep` (one move every
    `AUTO_STEP_MS` while it returns an action). Klondike and FreeCell send a double-tapped
    card to its foundation and finish themselves once won; the Finish button is gone.
    FreeCell's rules skip the bulk `autoHome` once `canAutoFC` says the game can finish
    itself, so the finish plays out one card at a time through `autoStep`.
