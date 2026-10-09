import {
	createMatch,
	findMove,
	finishStage,
	idx,
	MOON,
	nextStage,
	SIZE,
	trySwap,
	type Match,
	type Piece,
	type Spot,
	type Step
} from './match';
import {
	centre,
	COLS,
	createShooter,
	DEAD_Y,
	fire,
	MAX_ANGLE,
	missesLeft,
	present,
	rowLength,
	ROWS,
	startStage,
	swapNext,
	type Point,
	type Shooter,
	type ShotResult
} from './shooter';
import { peekKoi, writeKoi } from './persist';
import { koiBest, koiPrefs, persistKoiPrefs, recordRun } from './settings.svelte';
import {
	playBonk,
	playBounce,
	playDescend,
	playLand,
	playLeap,
	playOver,
	playPause,
	playReady,
	playSelect,
	playShoot,
	playSpecial,
	playStage,
	playStep,
	playSwap,
	playSwapNext
} from './audio';
import { newSeed, type Kind, type Mode, type Screen, type Status } from './types';

const READY_MS = 1100;
const CLEARED_MS = 2200;
/** Field units per second for a bloom in flight. */
const FLIGHT_SPEED = 24;
const AIM_RATE = 1.7;
const SWAP_MS = 150;
const POP_MS = 170;
const HINT_MS = 6500;
const FALL_G = 70;

export type Drawer = (now: number, dt: number) => void;
export type KoiEvent =
	| { type: 'land'; result: ShotResult; top: number }
	| { type: 'bounce'; point: Point }
	| { type: 'step'; step: Step }
	| { type: 'bonk'; a: Spot; b: Spot }
	| { type: 'cleared' };
export type Listener = (event: KoiEvent) => void;
export type Splash = (x: number, y: number, strength: number) => void;

export type Flight = {
	path: Point[];
	/** Distance along the path so far, and its full length. */
	d: number;
	length: number;
	bounced: number;
	kind: Kind;
	result: ShotResult;
	top: number;
	point: Point;
};

export type Visual = { x: number; y: number; vy: number };

type Phase =
	| { type: 'idle' }
	| { type: 'swap'; until: number; back: boolean; a: Spot; b: Spot }
	| { type: 'pop'; until: number; step: Step }
	| { type: 'fall' };

export type Callout = { id: number; label: string; points: number; big: boolean };

export class KoiSession {
	screen = $state<Screen>('menu');
	mode = $state<Mode>(peekKoi().mode);
	status = $state<Status>({ type: 'ready' });
	score = $state(0);
	stage = $state(1);
	startedBest = $state(0);
	newBest = $state(false);
	callout = $state<Callout | null>(null);
	/** Counters the backdrop watches: a golden koi leaps on each tick of `leap`. */
	leap = $state(0);
	bonus = $state(0);

	/** Ripples. */
	misses = $state(0);
	allowance = $state(0);
	popped = $state(0);
	current = $state<Kind>(1);
	next = $state<Kind>(1);
	danger = $state(0);

	/** Currents. */
	moves = $state(0);
	stageScore = $state(0);
	target = $state(1);
	chain = $state(0);
	selected = $state<Spot | null>(null);
	cursor = $state<Spot | null>(null);

	shooter: Shooter = createShooter(1);
	match: Match = createMatch(1);
	/** What the pond shows, which trails the engine while a shot flies or a cascade plays. */
	view = new Uint8Array(ROWS * COLS);
	viewTop = 0;
	shownTop = 0;
	flight: Flight | null = null;
	aim = 0;
	display: Array<Piece | null> = [];
	visuals = new Map<number, Visual>();
	hint: [Spot, Spot] | null = null;
	calm = false;

	private phase: Phase = { type: 'idle' };
	private steps: Step[] = [];
	private pendingShuffle = false;
	private raf = 0;
	private last = 0;
	private readyAt = 0;
	private clearedAt = 0;
	private idleAt = 0;
	private turning: -1 | 0 | 1 = 0;
	private calloutId = 0;
	private drawers = new Set<Drawer>();
	private listeners = new Set<Listener>();
	private splashers = new Set<Splash>();

	best = $derived(Math.max(this.startedBest, this.score));
	high = $derived(this.score > this.startedBest && this.score > 0);

	start(mode: Mode = this.mode) {
		this.setMode(mode);
		if (mode === 'ripples') {
			this.shooter = createShooter(newSeed());
			writeKoi({ savedRipples: null });
		} else {
			this.match = createMatch(newSeed());
			writeKoi({ savedCurrents: null });
		}
		this.load();
	}

	canResume(mode: Mode) {
		const prefs = peekKoi();
		return !!(mode === 'ripples' ? prefs.savedRipples : prefs.savedCurrents);
	}

	resume(mode: Mode = this.mode) {
		const prefs = peekKoi();
		if (mode === 'ripples') {
			const saved = prefs.savedRipples;
			if (!saved) return false;
			const g = createShooter(saved.seed);
			g.grid.set(saved.grid);
			Object.assign(g, {
				top: saved.top,
				current: saved.current,
				next: saved.next,
				stage: saved.stage,
				score: saved.score,
				shots: saved.shots,
				misses: saved.misses,
				allowance: saved.allowance,
				streak: saved.streak,
				popped: saved.popped
			});
			if (!present(g).length) startStage(g, g.stage + 1);
			this.shooter = g;
		} else {
			const saved = prefs.savedCurrents;
			if (!saved) return false;
			const g = createMatch(saved.seed);
			g.nextId = 0;
			g.grid = saved.grid.map(([k, s]) => ({ id: ++g.nextId, k: k as Kind | 0, s: s as Piece['s'] }));
			Object.assign(g, {
				stage: saved.stage,
				score: saved.score,
				stageScore: saved.stageScore,
				target: saved.target,
				moves: saved.moves,
				kinds: saved.kinds,
				bestChain: saved.bestChain,
				specials: saved.specials
			});
			if (!findMove(g)) return false;
			this.match = g;
		}
		this.setMode(mode);
		this.load();
		return true;
	}

	restart() {
		if (this.screen === 'play') this.start(this.mode);
	}

	backToMenu() {
		this.stash();
		this.stopLoop();
		this.turning = 0;
		this.screen = 'menu';
	}

	togglePause() {
		if (this.screen !== 'play') return;
		const type = this.status.type;
		if (type === 'paused') {
			this.ready();
			return;
		}
		if (type !== 'playing' && type !== 'ready') return;
		this.status = { type: 'paused' };
		this.turning = 0;
		this.stash();
		playPause();
	}

	hide() {
		if (this.status.type === 'playing' || this.status.type === 'ready') this.togglePause();
		this.stash();
	}

	addDrawer(draw: Drawer) {
		this.drawers.add(draw);
		this.kick();
		return () => this.drawers.delete(draw);
	}

	listen(listener: Listener) {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	/** The pond backdrop ripples where things happen; x and y are fractions of the viewport. */
	onSplash(splash: Splash) {
		this.splashers.add(splash);
		return () => this.splashers.delete(splash);
	}

	splash(x: number, y: number, strength: number) {
		for (const s of this.splashers) s(x, y, strength);
	}

	/* ---------- Ripples ---------- */

	setAim(angle: number) {
		this.aim = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, angle));
	}

	turn(dir: -1 | 0 | 1) {
		this.turning = dir;
	}

	shoot() {
		if (this.mode !== 'ripples' || this.status.type !== 'playing' || this.flight) return;
		const g = this.shooter;
		const kind = g.current;
		const top = g.top;
		this.view.set(g.grid);
		this.viewTop = top;
		const result = fire(g, this.aim);
		const path = result.plan.path;
		let length = 0;
		for (let i = 1; i < path.length; i += 1) length += Math.hypot(path[i]!.x - path[i - 1]!.x, path[i]!.y - path[i - 1]!.y);
		this.flight = { path, d: 0, length, bounced: 0, kind, result, top, point: { ...path[0]! } };
		this.current = g.current;
		this.next = g.next;
		playShoot();
	}

	swapBloom() {
		if (this.mode !== 'ripples' || this.status.type !== 'playing' || this.flight) return;
		swapNext(this.shooter);
		this.current = this.shooter.current;
		this.next = this.shooter.next;
		playSwapNext();
	}

	private fly(dt: number) {
		const f = this.flight;
		if (!f) return;
		f.d = this.calm ? f.length : Math.min(f.length, f.d + FLIGHT_SPEED * dt);
		let left = f.d;
		for (let i = 1; i < f.path.length; i += 1) {
			const a = f.path[i - 1]!;
			const b = f.path[i]!;
			const seg = Math.hypot(b.x - a.x, b.y - a.y);
			if (left <= seg || i === f.path.length - 1) {
				const t = seg ? Math.min(1, left / seg) : 1;
				f.point = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
				const bounces = i - 1;
				if (bounces > f.bounced && i < f.path.length - 1) {
					f.bounced = bounces;
					this.emit({ type: 'bounce', point: a });
					playBounce();
				}
				break;
			}
			left -= seg;
		}
		if (f.d >= f.length) this.land(f);
	}

	private land(f: Flight) {
		this.flight = null;
		const g = this.shooter;
		const r = f.result;
		this.emit({ type: 'land', result: r, top: f.top });
		playLand(r.kind, r.popped.length, r.dropped.length, g.streak);
		if (r.descended) playDescend();
		if (r.points) {
			const big = r.dropped.length >= 6 || r.popped.length >= 7;
			const label = r.dropped.length >= 10 ? 'Koi rush' : r.dropped.length >= 6 ? 'Big drift' : g.streak >= 3 ? `Streak ×${g.streak}` : r.dropped.length ? 'Drift' : '';
			if (label) this.callout = { id: ++this.calloutId, label, points: r.points, big };
			if (big) this.jump();
		}
		this.mirrorShooter();
		if (r.cleared) {
			this.view.fill(0);
			this.bonus = r.bonus;
			this.jump(false);
			startStage(g, g.stage + 1);
			this.clearStage();
			return;
		}
		this.view.set(g.grid);
		this.viewTop = g.top;
		if (r.over) this.finish();
	}

	private mirrorShooter() {
		const g = this.shooter;
		this.score = g.score;
		this.misses = missesLeft(g);
		this.allowance = g.allowance;
		this.popped = g.popped;
		this.current = g.current;
		this.next = g.next;
		let low = 0;
		for (let row = ROWS - 1; row >= 0 && !low; row -= 1) {
			for (let c = 0; c < rowLength(row); c += 1) {
				if (g.grid[row * COLS + c]) {
					low = centre(g, row, c).y;
					break;
				}
			}
		}
		this.danger = Math.max(0, Math.min(1, (low - DEAD_Y * 0.6) / (DEAD_Y * 0.35)));
	}

	/* ---------- Currents ---------- */

	pick(spot: Spot, keys = false) {
		if (this.mode !== 'currents' || this.status.type !== 'playing' || this.phase.type !== 'idle') return;
		this.cursor = keys ? spot : null;
		const sel = this.selected;
		if (sel && sel.r === spot.r && sel.c === spot.c) {
			this.selected = null;
			return;
		}
		if (sel && Math.abs(sel.r - spot.r) + Math.abs(sel.c - spot.c) === 1) {
			this.swap(sel, spot);
			return;
		}
		this.selected = spot;
		playSelect();
	}

	swap(a: Spot, b: Spot) {
		if (this.mode !== 'currents' || this.status.type !== 'playing' || this.phase.type !== 'idle') return;
		if (b.r < 0 || b.r >= SIZE || b.c < 0 || b.c >= SIZE) return;
		this.selected = null;
		this.hint = null;
		const g = this.match;
		const before = g.grid.slice();
		const result = trySwap(g, a, b);
		this.display = before;
		const ia = idx(a.r, a.c);
		const ib = idx(b.r, b.c);
		[this.display[ia], this.display[ib]] = [this.display[ib]!, this.display[ia]!];
		const now = performance.now();
		if (!result.ok) {
			this.phase = { type: 'swap', until: now + SWAP_MS, back: true, a, b };
			this.emit({ type: 'bonk', a, b });
			playBonk();
			return;
		}
		playSwap();
		this.moves = g.moves;
		this.steps = result.steps;
		this.pendingShuffle = result.shuffled;
		this.phase = { type: 'swap', until: now + SWAP_MS, back: false, a, b };
	}

	/** Keyboard: move the cursor, or swap the picked piece that way. */
	steer(dr: number, dc: number) {
		if (this.mode !== 'currents' || this.status.type !== 'playing') return;
		const at = this.cursor ?? { r: SIZE - 2, c: Math.floor(SIZE / 2) - 1 };
		const to = { r: Math.max(0, Math.min(SIZE - 1, at.r + dr)), c: Math.max(0, Math.min(SIZE - 1, at.c + dc)) };
		if (this.selected && this.phase.type === 'idle') {
			this.cursor = to;
			this.swap(this.selected, to);
			return;
		}
		this.cursor = to;
	}

	pickCursor() {
		if (!this.cursor) {
			this.cursor = { r: SIZE - 2, c: Math.floor(SIZE / 2) - 1 };
			return;
		}
		this.pick(this.cursor, true);
	}

	private advance(now: number, dt: number) {
		const phase = this.phase;
		if (phase.type === 'swap' && now >= phase.until) {
			if (phase.back) {
				const ia = idx(phase.a.r, phase.a.c);
				const ib = idx(phase.b.r, phase.b.c);
				[this.display[ia], this.display[ib]] = [this.display[ib]!, this.display[ia]!];
				this.phase = { type: 'fall' };
			} else this.nextStep(now);
		} else if (phase.type === 'pop' && now >= phase.until) {
			for (const s of phase.step.spawned) this.visuals.set(s.id, { x: s.c, y: this.calm ? s.r : s.r - s.from, vy: 0 });
			this.display = phase.step.grid.slice();
			this.phase = { type: 'fall' };
		} else if (phase.type === 'fall' && this.settled()) {
			if (this.steps.length) this.nextStep(now);
			else this.endMove();
		}
		this.moveVisuals(dt);
		if (phase.type === 'idle' && this.status.type === 'playing' && koiPrefs.hints && !this.hint && now >= this.idleAt) {
			this.hint = findMove(this.match);
		}
	}

	private nextStep(now: number) {
		const step = this.steps.shift();
		if (!step) {
			this.phase = { type: 'fall' };
			return;
		}
		const shown = this.display.slice();
		for (const gone of step.cleared) {
			const at = shown.findIndex((p) => p?.id === gone.piece.id);
			if (at >= 0) shown[at] = null;
		}
		for (const made of step.created) {
			shown[idx(made.r, made.c)] = made.piece;
			this.visuals.set(made.piece.id, { x: made.c, y: made.r, vy: 0 });
		}
		this.display = shown;
		this.chain = step.chain;
		this.score += step.points;
		this.stageScore = Math.min(this.target, this.stageScore + step.points);
		this.emit({ type: 'step', step });
		playStep(step.chain, step.cleared.length);
		if (step.blasts.length || step.created.length) playSpecial(step.blasts.length ? step.blasts[0]!.s : step.created[0]!.piece.s);
		if (step.chain === 4 || step.blasts.some((b) => b.s === MOON)) this.jump();
		if (step.chain >= 2) this.callout = { id: ++this.calloutId, label: `Current ×${step.chain}`, points: step.points, big: step.chain >= 4 };
		this.phase = { type: 'pop', until: now + (this.calm ? 60 : POP_MS), step };
	}

	private endMove() {
		const g = this.match;
		this.phase = { type: 'idle' };
		this.idleAt = performance.now() + HINT_MS;
		if (this.pendingShuffle) {
			this.pendingShuffle = false;
			this.display = g.grid.slice();
			this.callout = { id: ++this.calloutId, label: 'The current turns', points: 0, big: false };
			this.phase = { type: 'fall' };
			return;
		}
		this.display = g.grid.slice();
		this.mirrorMatch();
		if (g.cleared) {
			this.bonus = finishStage(g);
			this.score = g.score;
			this.jump(false);
			nextStage(g);
			this.clearStage();
			return;
		}
		if (g.over) this.finish();
	}

	private mirrorMatch() {
		const g = this.match;
		this.score = g.score;
		this.stage = g.stage;
		this.moves = g.moves;
		this.stageScore = Math.min(g.target, g.stageScore);
		this.target = g.target;
	}

	private settled() {
		for (let i = 0; i < this.display.length; i += 1) {
			const p = this.display[i];
			if (!p) continue;
			const v = this.visuals.get(p.id);
			if (!v || v.x !== i % SIZE || v.y !== Math.floor(i / SIZE)) return false;
		}
		return true;
	}

	private moveVisuals(dt: number) {
		const keep = new Set<number>();
		for (let i = this.display.length - 1; i >= 0; i -= 1) {
			const p = this.display[i];
			if (!p) continue;
			keep.add(p.id);
			const r = Math.floor(i / SIZE);
			const c = i % SIZE;
			let v = this.visuals.get(p.id);
			if (!v) {
				v = { x: c, y: r, vy: 0 };
				this.visuals.set(p.id, v);
			}
			if (this.calm) {
				v.x = c;
				v.y = r;
				v.vy = 0;
				continue;
			}
			const slide = 10 * dt;
			v.x = Math.abs(c - v.x) <= slide ? c : v.x + Math.sign(c - v.x) * slide;
			if (v.y < r) {
				v.vy += FALL_G * dt;
				v.y = Math.min(r, v.y + v.vy * dt);
				if (v.y === r) v.vy = 0;
			} else if (v.y > r) {
				v.y = Math.abs(r - v.y) <= slide ? r : v.y - slide;
				v.vy = 0;
			}
		}
		for (const id of this.visuals.keys()) if (!keep.has(id)) this.visuals.delete(id);
	}

	/* ---------- Shared ---------- */

	stash() {
		if (this.screen !== 'play') return;
		const ended = this.status.type === 'over';
		if (this.mode === 'ripples') {
			const g = this.shooter;
			if (ended || g.over) {
				writeKoi({ savedRipples: null });
				return;
			}
			writeKoi({
				savedRipples: {
					grid: Array.from(g.grid),
					top: g.top,
					current: g.current,
					next: g.next,
					seed: g.rng.seed,
					stage: g.stage,
					score: g.score,
					shots: g.shots,
					misses: g.misses,
					allowance: g.allowance,
					streak: g.streak,
					popped: g.popped
				}
			});
		} else {
			const g = this.match;
			if (ended || g.over) {
				writeKoi({ savedCurrents: null });
				return;
			}
			writeKoi({
				savedCurrents: {
					grid: g.grid.map((p) => [p?.k ?? 1, p?.s ?? 0] as [number, number]),
					seed: g.rng.seed,
					stage: g.stage,
					score: g.score,
					stageScore: g.stageScore,
					target: g.target,
					moves: g.moves,
					kinds: g.kinds,
					bestChain: g.bestChain,
					specials: g.specials
				}
			});
		}
	}

	private setMode(mode: Mode) {
		this.mode = mode;
		koiPrefs.mode = mode;
		persistKoiPrefs();
		this.startedBest = koiBest[mode].score;
	}

	private load() {
		this.screen = 'play';
		this.callout = null;
		this.newBest = false;
		this.flight = null;
		this.selected = null;
		this.cursor = null;
		this.hint = null;
		this.chain = 0;
		this.phase = { type: 'idle' };
		this.steps = [];
		this.pendingShuffle = false;
		this.turning = 0;
		this.last = 0;
		if (this.mode === 'ripples') {
			const g = this.shooter;
			this.view.set(g.grid);
			this.viewTop = g.top;
			this.shownTop = g.top;
			this.aim = 0;
			this.stage = g.stage;
			this.mirrorShooter();
		} else {
			this.display = this.match.grid.slice();
			this.visuals.clear();
			this.display.forEach((p, i) => p && this.visuals.set(p.id, { x: i % SIZE, y: Math.floor(i / SIZE), vy: 0 }));
			this.mirrorMatch();
		}
		this.ready();
		this.kick();
	}

	private ready() {
		this.status = { type: 'ready' };
		this.readyAt = performance.now() + READY_MS;
		this.last = 0;
		playReady();
	}

	private clearStage() {
		this.status = { type: 'cleared' };
		this.clearedAt = performance.now() + CLEARED_MS;
		this.selected = null;
		this.hint = null;
		this.emit({ type: 'cleared' });
		playStage();
		this.stash();
	}

	private nextAfterClear() {
		if (this.mode === 'ripples') {
			const g = this.shooter;
			this.view.set(g.grid);
			this.viewTop = g.top;
			this.shownTop = g.top;
			this.stage = g.stage;
			this.mirrorShooter();
		} else {
			this.mirrorMatch();
			this.chain = 0;
		}
		this.ready();
	}

	private finish() {
		this.status = { type: 'over' };
		this.turning = 0;
		const chain = this.mode === 'currents' ? this.match.bestChain : 0;
		this.newBest = recordRun(this.mode, this.score, this.stage, chain);
		playOver();
		writeKoi(this.mode === 'ripples' ? { savedRipples: null } : { savedCurrents: null });
	}

	private jump(sound = true) {
		this.leap += 1;
		if (sound) playLeap();
	}

	private emit(event: KoiEvent) {
		for (const listener of this.listeners) listener(event);
	}

	private kick() {
		if (typeof requestAnimationFrame === 'undefined' || this.raf || this.screen !== 'play') return;
		this.raf = requestAnimationFrame(this.frame);
	}

	private stopLoop() {
		if (this.raf) cancelAnimationFrame(this.raf);
		this.raf = 0;
	}

	private frame = (now: number) => {
		this.raf = 0;
		if (this.screen !== 'play') return;
		const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0;
		this.last = now;
		const type = this.status.type;
		if (type === 'ready' && now >= this.readyAt) {
			this.status = { type: 'playing' };
			this.idleAt = now + HINT_MS;
		} else if (type === 'cleared' && now >= this.clearedAt) {
			this.nextAfterClear();
		}
		if (type !== 'paused') {
			if (this.mode === 'ripples') {
				if (type === 'playing' && this.turning) this.setAim(this.aim + this.turning * AIM_RATE * dt);
				this.fly(dt);
				const ease = this.calm ? 1 : Math.min(1, dt * 6);
				this.shownTop += (this.viewTop - this.shownTop) * ease;
				if (Math.abs(this.viewTop - this.shownTop) < 0.002) this.shownTop = this.viewTop;
			} else this.advance(now, dt);
		}
		for (const draw of this.drawers) draw(now, type === 'paused' ? 0 : dt);
		this.raf = requestAnimationFrame(this.frame);
	};
}
