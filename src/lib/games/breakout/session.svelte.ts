import { createWorld, isLastWindow, resetServe, serve, stepWorld, type Input, type World, type WorldEvent } from './engine';
import { chapterOf, CHAPTERS, parseWindow, WINDOWS } from './levels';
import { peekChapel, peekSaved, writeSaved } from './persist';
import { chapelBest, chapelPlay, persistChapelPlay, recordChapelRun } from './settings.svelte';
import {
	playBeam,
	playCrack,
	playDrop,
	playExpire,
	playFizzle,
	playLead,
	playLit,
	playLost,
	playOver,
	playPane,
	playPause,
	playRelic,
	playServe,
	playWall,
	playWon
} from './audio';
import { HUES, LEAD, type Difficulty, type EffectKind, type Screen, type Status } from './types';

const STEP = 1 / 240;
const CLEAR_HOLD = 3400;

export type Drawer = (now: number, dt: number) => void;
export type FieldListener = (event: WorldEvent) => void;

export class ChapelSession {
	screen = $state<Screen>('menu');
	difficulty = $state<Difficulty>(peekChapel().difficulty);
	status = $state<Status>({ type: 'serve' });
	score = $state(0);
	lives = $state(3);
	level = $state(0);
	combo = $state(0);
	startedBest = $state(0);
	bonus = $state(0);
	/** Whole seconds left on each blessing, for the HUD. */
	effects = $state<Record<EffectKind, number>>({ lantern: 0, halo: 0, sunburst: 0 });
	/** Share of this window's panes broken, and the average colour they released. */
	lit = $state(0);
	tint = $state<[number, number, number]>([1, 0.78, 0.5]);
	pulse = $state(0);
	flashHue = $state(2);

	/** Plain object on purpose: the physics touches it 240 times a second. */
	world: World = createWorld('medium');
	input: Input = { target: null, axis: 0 };

	private held = { left: false, right: false };
	private resumeTo: 'serve' | 'playing' = 'serve';
	private raf = 0;
	private last = 0;
	private acc = 0;
	private clearedAt = 0;
	private drawers = new Set<Drawer>();
	private listeners = new Set<FieldListener>();

	best = $derived(Math.max(this.startedBest, this.score));
	high = $derived(this.score > this.startedBest && this.score > 0);
	windowName = $derived(WINDOWS[this.level]?.name ?? '');
	chapter = $derived(CHAPTERS[chapterOf(this.level)]!);
	windows = WINDOWS.length;
	private startedAt = 0;

	start(difficulty: Difficulty = this.difficulty, level = 0) {
		this.difficulty = difficulty;
		chapelPlay.difficulty = difficulty;
		persistChapelPlay();
		this.startedBest = chapelBest[difficulty];
		this.startedAt = Math.max(0, Math.min(level, WINDOWS.length - 1));
		this.load(createWorld(difficulty, this.startedAt));
		writeSaved(null);
		this.stash();
	}

	resume() {
		const saved = peekSaved();
		if (!saved) return false;
		this.difficulty = saved.difficulty;
		chapelPlay.difficulty = saved.difficulty;
		persistChapelPlay();
		this.startedBest = chapelBest[saved.difficulty];
		this.startedAt = CHAPTERS[chapterOf(saved.level)]!.start;
		this.load(
			createWorld(saved.difficulty, saved.level, {
				score: saved.score,
				lives: saved.lives,
				kind: Uint8Array.from(saved.kind),
				hp: Uint8Array.from(saved.hp)
			})
		);
		return true;
	}

	restart() {
		if (this.screen !== 'play') return;
		this.start(this.difficulty, this.startedAt);
	}

	backToMenu() {
		this.stash();
		this.stopLoop();
		this.screen = 'menu';
	}

	/** Serve from the beam, or hurry the interlude after a lit window. */
	launch() {
		if (this.screen !== 'play') return;
		if (this.status.type === 'serve') {
			if (serve(this.world)) this.status = { type: 'playing' };
			this.drain();
			return;
		}
		if (this.status.type === 'cleared' && performance.now() - this.clearedAt > 900) this.advance();
	}

	togglePause() {
		if (this.screen !== 'play') return;
		const type = this.status.type;
		if (type === 'paused') {
			this.status = { type: this.resumeTo };
			this.last = 0;
			return;
		}
		if (type !== 'playing' && type !== 'serve') return;
		this.resumeTo = type;
		this.status = { type: 'paused' };
		this.stash();
		playPause();
	}

	/** Tab hidden: hold the vigil rather than lose a ball in the dark. */
	hide() {
		if (this.status.type === 'playing') this.togglePause();
		this.stash();
	}

	steerTo(x: number | null) {
		this.input.target = x;
	}

	hold(side: 'left' | 'right', down: boolean) {
		this.held[side] = down;
		const axis = (this.held.right ? 1 : 0) - (this.held.left ? 1 : 0);
		this.input.axis = axis as -1 | 0 | 1;
		if (axis !== 0) this.input.target = null;
	}

	addDrawer(draw: Drawer) {
		this.drawers.add(draw);
		this.kick();
		return () => this.drawers.delete(draw);
	}

	listen(listener: FieldListener) {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	stash() {
		if (this.screen !== 'play') return;
		const type = this.status.type;
		if (type === 'over' || type === 'won') {
			writeSaved(null);
			return;
		}
		const world = this.world;
		if (type === 'cleared') {
			if (isLastWindow(world.level)) {
				writeSaved(null);
				return;
			}
			const next = parseWindow(world.level + 1);
			writeSaved({
				difficulty: this.difficulty,
				level: world.level + 1,
				kind: Array.from(next.kind),
				hp: Array.from(next.hp),
				score: world.score,
				lives: world.lives
			});
			return;
		}
		writeSaved({
			difficulty: this.difficulty,
			level: world.level,
			kind: Array.from(world.kind),
			hp: Array.from(world.hp),
			score: world.score,
			lives: world.lives
		});
	}

	private load(world: World) {
		this.world = world;
		this.world.beam.x = this.input.target ?? this.world.beam.x;
		resetServe(this.world);
		this.status = { type: 'serve' };
		this.screen = 'play';
		this.bonus = 0;
		this.acc = 0;
		this.last = 0;
		this.mirror();
		this.lightUp();
		this.kick();
	}

	private advance() {
		if (this.status.type !== 'cleared') return;
		if (isLastWindow(this.world.level)) {
			this.status = { type: 'won' };
			recordChapelRun(this.difficulty, this.world.score, this.world.level + 1);
			writeSaved(null);
			playWon();
			return;
		}
		this.load(
			createWorld(this.difficulty, this.world.level + 1, { score: this.world.score, lives: this.world.lives })
		);
		this.stash();
	}

	private loseLife() {
		const world = this.world;
		world.lives -= 1;
		if (world.lives <= 0) {
			world.lives = 0;
			this.status = { type: 'over' };
			recordChapelRun(this.difficulty, world.score, world.level);
			writeSaved(null);
			playOver();
			return;
		}
		resetServe(world);
		this.status = { type: 'serve' };
		playLost();
		this.stash();
	}

	private windowLit() {
		const world = this.world;
		this.bonus = 500 * (1 + Math.min(world.level, 19)) + 250 * world.lives;
		world.score += this.bonus;
		world.balls = [];
		world.relics = [];
		this.status = { type: 'cleared' };
		this.clearedAt = performance.now();
		recordChapelRun(this.difficulty, world.score, world.level + 1);
		playLit();
		this.stash();
	}

	private lightUp() {
		const { origin, kind } = this.world;
		let broken = 0;
		let total = 0;
		const sum = [0, 0, 0];
		for (let i = 0; i < origin.length; i += 1) {
			const k = origin[i]!;
			if (!k || k === LEAD) continue;
			total += 1;
			if (kind[i]) continue;
			broken += 1;
			const rgb = HUES[k]!.rgb;
			sum[0] += rgb[0];
			sum[1] += rgb[1];
			sum[2] += rgb[2];
		}
		this.lit = total ? broken / total : 0;
		if (broken) this.tint = [sum[0]! / broken, sum[1]! / broken, sum[2]! / broken];
	}

	private drain() {
		const events = this.world.events;
		if (!events.length) return;
		this.world.events = [];
		let lostAll = false;
		let lit = false;
		for (const event of events) {
			for (const listener of this.listeners) listener(event);
			switch (event.type) {
				case 'pane':
					if (event.broken) {
						playPane(event.combo, event.x);
						this.pulse += 1;
						this.flashHue = event.hue;
					} else {
						playCrack(event.x);
					}
					break;
				case 'lead':
					playLead(event.x);
					break;
				case 'wall':
					playWall(event.x, event.y);
					break;
				case 'beam':
					playBeam(event.rel, event.x);
					break;
				case 'serve':
					playServe();
					break;
				case 'drop':
					playDrop();
					break;
				case 'relic':
					playRelic(event.kind);
					break;
				case 'expire':
					playExpire();
					break;
				case 'lost':
					if (event.remaining === 0) lostAll = true;
					else playFizzle();
					break;
				case 'cleared':
					lit = true;
					break;
			}
		}
		this.lightUp();
		if (lit) this.windowLit();
		else if (lostAll && this.status.type === 'playing') this.loseLife();
		this.mirror();
	}

	private mirror() {
		const world = this.world;
		this.score = world.score;
		this.lives = world.lives;
		this.level = world.level;
		this.combo = world.combo;
		for (const key of ['lantern', 'halo', 'sunburst'] as const) {
			const left = Math.ceil(world.effects[key]);
			if (this.effects[key] !== left) this.effects[key] = left;
		}
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
		if (type === 'playing' || type === 'serve') {
			this.acc += dt;
			while (this.acc >= STEP) {
				stepWorld(this.world, STEP, this.input);
				this.acc -= STEP;
				if (this.world.events.length) this.drain();
				const still = this.status.type;
				if (still !== 'playing' && still !== 'serve') {
					this.acc = 0;
					break;
				}
			}
			this.mirror();
		} else if (type === 'cleared' && now - this.clearedAt > CLEAR_HOLD) {
			this.advance();
		}
		for (const draw of this.drawers) draw(now, dt);
		this.raf = requestAnimationFrame(this.frame);
	};
}
