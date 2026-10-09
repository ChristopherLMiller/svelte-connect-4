import { advance, createGame, flip, progressOf, pull, saveLeft, shake, type Game, type GameEvent, type Goal, type Phase } from './engine/game';
import { laneBall } from './engine/physics';
import { peekPinball, writePinball } from './persist';
import { pinballBest, pinballPrefs, persistPinballPrefs, recordGame } from './settings.svelte';
import { flipperSound, sound, stopSpeech, uiSound } from './sound/sfx';
import { setMusicHot, setTableMusic } from './audio';
import { tableOf } from './tables';
import type { AnySpec } from './tables/spec';
import { newSeed, type Difficulty, type Screen, type TableId } from './types';

const READY_MS = 800;

export type Status = { type: 'ready' } | { type: 'playing' } | { type: 'paused' } | { type: 'over' };
export type Drawer = (now: number, dt: number) => void;
export type Listener = (event: GameEvent) => void;
export type Callout = { id: number; text: string; sub?: string; big: boolean };
export type Tally = { bonus: number; count: number; mult: number; tilted: boolean };
export type ModeView = { name: string; left: number; seconds: number; hits: number; need: number };

export class PinballSession {
	screen = $state<Screen>('menu');
	status = $state<Status>({ type: 'ready' });
	table = $state<TableId>(peekPinball().table);
	difficulty = $state<Difficulty>(peekPinball().difficulty);
	phase = $state<Phase>('serve');
	score = $state(0);
	ball = $state(1);
	balls = $state(3);
	extra = $state(0);
	mult = $state(1);
	bonus = $state(0);
	kickback = $state(false);
	saving = $state(false);
	multiball = $state(false);
	hot = $state(false);
	warnings = $state(0);
	inPlay = $state(0);
	line = $state('');
	goals = $state<Goal[]>([]);
	mode = $state<ModeView | null>(null);
	callout = $state<Callout | null>(null);
	tally = $state<Tally | null>(null);
	startedBest = $state(0);
	newBest = $state(false);
	feat = $state(0);
	/** Counters the backdrop watches. */
	flash = $state(0);
	drained = $state(0);
	/** Ticks up on every scoring hit: the backdrop's lights throb along. */
	pulse = $state(0);

	spec: AnySpec = $state.raw(tableOf(peekPinball().table));
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	game: Game<any> = $state.raw(createGame(tableOf(peekPinball().table).rules, 'fair', 1));
	calm = false;

	private raf = 0;
	private last = 0;
	private readyAt = 0;
	private calloutId = 0;
	private goalsKey = '';
	private drawers = new Set<Drawer>();
	private listeners = new Set<Listener>();

	best = $derived(Math.max(this.startedBest, this.score));
	high = $derived(this.score > this.startedBest && this.score > 0);

	/** Pick a table on the menu: its music and colours follow. */
	choose(table: TableId) {
		if (this.screen === 'play') return;
		this.table = table;
		this.spec = tableOf(table);
		pinballPrefs.table = table;
		persistPinballPrefs();
		setTableMusic(table);
	}

	start(table: TableId = this.table, difficulty: Difficulty = this.difficulty) {
		this.setup(table, difficulty);
		this.game = createGame(this.spec.rules, difficulty, newSeed());
		writePinball({ saved: null });
		this.load();
	}

	canResume() {
		return !!peekPinball().saved;
	}

	savedTable() {
		return peekPinball().saved?.table ?? null;
	}

	resume() {
		const saved = peekPinball().saved;
		if (!saved) return false;
		this.setup(saved.table, saved.difficulty);
		this.game = createGame(this.spec.rules, saved.difficulty, saved.seed, saved.progress);
		this.load();
		return true;
	}

	restart() {
		if (this.screen === 'play') this.start(this.table, pinballPrefs.difficulty);
	}

	backToMenu() {
		this.stash();
		this.release();
		this.stopLoop();
		stopSpeech();
		setMusicHot(false);
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
		this.release();
		this.stash();
		stopSpeech();
		uiSound(this.spec.sfx, 'pause');
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

	/* ---------- Controls ---------- */

	flipper(side: 'left' | 'right', on: boolean) {
		if (this.screen !== 'play') return;
		const g = this.game;
		const any = g.world.flippers.find((x) => x.side === side);
		if (!any) return;
		if (on && this.status.type !== 'playing') return;
		if (on !== any.pressed && !g.tilt.tilted) flipperSound(this.spec.sfx, side, on);
		flip(g, side, on);
	}

	plunger(on: boolean) {
		if (this.screen !== 'play') return;
		if (on) {
			if (this.status.type !== 'playing' || this.game.pulling || !laneBall(this.game.world)) return;
			uiSound(this.spec.sfx, 'pull');
			pull(this.game, true, []);
			return;
		}
		const out: GameEvent[] = [];
		pull(this.game, false, out);
		this.handle(out);
	}

	nudge(dir: -1 | 0 | 1) {
		if (this.screen !== 'play' || this.status.type !== 'playing') return;
		const out: GameEvent[] = [];
		shake(this.game, dir, out);
		this.handle(out);
		this.rumble(25);
	}

	/** Whether a press should draw the plunger rather than flip. */
	waitingToShoot() {
		const w = this.game.world;
		const lane = laneBall(w);
		return !!lane && w.balls.every((b) => b === lane || b.state === 'held');
	}

	/* ---------- Saving ---------- */

	stash() {
		if (this.screen !== 'play') return;
		const g = this.game;
		if (this.status.type === 'over' || g.phase === 'over') {
			writePinball({ saved: null });
			return;
		}
		writePinball({ saved: { table: this.table, difficulty: g.difficulty, seed: g.rng.seed, progress: progressOf(g) } });
	}

	private setup(table: TableId, difficulty: Difficulty) {
		this.table = table;
		this.spec = tableOf(table);
		this.difficulty = difficulty;
		pinballPrefs.table = table;
		pinballPrefs.difficulty = difficulty;
		persistPinballPrefs();
		setTableMusic(table);
		this.startedBest = pinballBest[table][difficulty].score;
		this.balls = this.spec.rules.balls;
	}

	private load() {
		this.screen = 'play';
		this.callout = null;
		this.tally = null;
		this.newBest = false;
		this.last = 0;
		this.goalsKey = '';
		this.mirror();
		this.ready();
		this.kick();
	}

	private ready() {
		this.status = { type: 'ready' };
		this.readyAt = performance.now() + READY_MS;
		this.last = 0;
		uiSound(this.spec.sfx, 'ready');
	}

	private release() {
		for (const f of this.game.world.flippers) f.pressed = false;
		this.game.pulling = false;
		this.game.world.plunger = 0;
	}

	private finish() {
		this.status = { type: 'over' };
		this.release();
		const g = this.game;
		this.feat = this.spec.feat.of(g);
		this.newBest = recordGame(this.table, g.difficulty, g.score, this.feat);
		writePinball({ saved: null });
		setMusicHot(false);
	}

	private rumble(pattern: number | number[]) {
		if (!pinballPrefs.rumble || typeof navigator === 'undefined' || !navigator.vibrate) return;
		try {
			navigator.vibrate(pattern);
		} catch {
			/* not allowed yet */
		}
	}

	private handle(events: GameEvent[]) {
		const p = this.spec.sfx;
		const opts = { voice: pinballPrefs.voice, lastBall: this.game.phase !== 'play' };
		for (const e of events) {
			sound(p, e, opts);
			switch (e.type) {
				case 'bumper':
					this.rumble(12);
					this.pulse += 1;
					break;
				case 'sling':
					this.rumble(10);
					this.pulse += 1;
					break;
				case 'ramp':
				case 'hole':
				case 'mover':
				case 'captive':
				case 'drop':
				case 'lane':
					this.pulse += 2;
					break;
				case 'cue':
					if (e.cue === 'jackpot' || e.cue === 'superJackpot' || e.cue === 'wizard' || e.cue === 'multiball') {
						this.flash += 1;
						this.rumble(e.cue === 'jackpot' ? [70, 40, 70] : [80, 40, 160]);
					} else if (e.cue === 'kickback') this.rumble(30);
					else if (e.cue === 'tilt') this.rumble([120, 60, 120]);
					break;
				case 'drain':
					if (opts.lastBall) {
						this.drained += 1;
						this.rumble(50);
					}
					break;
				case 'ballOver':
					this.tally = { bonus: e.bonus, count: e.count, mult: e.mult, tilted: e.tilted };
					break;
				case 'serve':
					this.tally = null;
					break;
				case 'message':
					this.callout = { id: ++this.calloutId, text: e.text, sub: e.sub, big: !!e.big };
					break;
				case 'over':
					this.finish();
					break;
			}
			for (const listener of this.listeners) listener(e);
		}
	}

	private mirror() {
		const g = this.game;
		const rules = this.spec.rules;
		this.phase = g.phase;
		this.score = g.score;
		this.ball = g.ball;
		this.extra = g.extra;
		this.mult = g.mult;
		this.bonus = g.bonus;
		this.kickback = g.kickback;
		this.saving = saveLeft(g) > 0 && g.phase === 'play';
		this.multiball = g.multiball;
		this.warnings = g.tilt.warnings;
		this.inPlay = g.world.balls.length + g.queue;
		const hot = this.spec.hot(g);
		if (hot !== this.hot) {
			this.hot = hot;
			setMusicHot(hot);
		}
		this.line = g.tilt.tilted ? 'Tilt' : rules.status(g);
		const goals = rules.goals(g);
		const key = JSON.stringify(goals);
		if (key !== this.goalsKey) {
			this.goalsKey = key;
			this.goals = goals;
		}
		const m = g.mode;
		if (!m) this.mode = null;
		else if (!this.mode || this.mode.name !== m.name || this.mode.hits !== m.hits || Math.ceil(this.mode.left) !== Math.ceil(m.left)) {
			this.mode = { name: m.name, left: m.left, seconds: m.seconds, hits: m.hits, need: m.need };
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
		if (this.status.type === 'ready' && now >= this.readyAt) this.status = { type: 'playing' };
		if (this.status.type === 'playing' && dt) {
			this.handle(advance(this.game, dt));
			this.mirror();
		}
		for (const draw of this.drawers) draw(now, this.status.type === 'playing' ? dt : 0);
		this.raf = requestAnimationFrame(this.frame);
	};
}
