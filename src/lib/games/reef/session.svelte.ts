import {
	createGame,
	flushClear,
	hardDrop,
	holdPiece,
	rotate,
	shift,
	tick,
	type ClearInfo,
	type Game,
	type GameEvent
} from './engine';
import { peekReef, peekSaved, writeReef } from './persist';
import { HANDLING, persistReefPrefs, recordMarathon, recordSprint, reefBest, reefPrefs } from './settings.svelte';
import {
	playClear,
	playDone,
	playHardDrop,
	playHold,
	playLand,
	playLevel,
	playLock,
	playMove,
	playOver,
	playPause,
	playReady,
	playRotate,
	playTspin,
	setDivePace
} from './audio';
import { COLS, depthOf, ROWS, SPRINT_LINES, TOTAL, type Kind, type Mode, type Screen, type Status } from './types';

const READY_MS = 1300;

export type Drawer = (now: number, dt: number) => void;
export type WellListener = (event: GameEvent) => void;
export type Action = 'left' | 'right' | 'soft' | 'cw' | 'ccw' | 'drop' | 'hold';

export class ReefSession {
	screen = $state<Screen>('menu');
	mode = $state<Mode>(peekReef().mode);
	status = $state<Status>({ type: 'ready' });
	score = $state(0);
	lines = $state(0);
	level = $state(1);
	combo = $state(-1);
	b2b = $state(false);
	hold = $state<Kind | 0>(0);
	holdUsed = $state(false);
	queue = $state<Kind[]>([]);
	time = $state(0);
	pieces = $state(0);
	startedBest = $state(0);
	/** The latest clear worth announcing, keyed so the HUD can replay its animation. */
	callout = $state<(ClearInfo & { id: number }) | null>(null);
	/** Counters the backdrop watches: any clear, and four-line clears (the whale). */
	bloom = $state(0);
	whale = $state(0);
	newBest = $state(false);
	/** How much of the well the stack fills, 0–1. */
	stack = $state(0);

	/** Plain object on purpose: the loop touches it every frame. */
	game: Game = createGame('marathon', 1);

	private raf = 0;
	private last = 0;
	private readyAt = 0;
	private soft = false;
	private dir: 'left' | 'right' | null = null;
	private held = { left: false, right: false };
	private repeatAt = 0;
	private calloutId = 0;
	private drawers = new Set<Drawer>();
	private listeners = new Set<WellListener>();

	depth = $derived(depthOf(this.level));
	best = $derived(Math.max(this.startedBest, this.score));
	high = $derived(this.mode === 'marathon' && this.score > this.startedBest && this.score > 0);
	left = $derived(Math.max(0, SPRINT_LINES - this.lines));

	start(mode: Mode = this.mode, startLevel = reefPrefs.startLevel) {
		this.mode = mode;
		reefPrefs.mode = mode;
		persistReefPrefs();
		this.startedBest = mode === 'marathon' ? reefBest.score : 0;
		this.load(createGame(mode, startLevel));
		writeReef({ saved: null });
	}

	resume() {
		const saved = peekSaved();
		if (!saved) return false;
		this.mode = saved.mode;
		reefPrefs.mode = saved.mode;
		persistReefPrefs();
		this.startedBest = saved.mode === 'marathon' ? reefBest.score : 0;
		this.load(
			createGame(saved.mode, saved.startLevel, {
				board: Uint8Array.from(saved.board),
				queue: saved.queue,
				bag: saved.bag,
				hold: saved.hold,
				seed: saved.seed,
				score: saved.score,
				lines: saved.lines,
				level: saved.level,
				combo: saved.combo,
				b2b: saved.b2b,
				time: saved.time,
				pieces: saved.pieces
			})
		);
		return true;
	}

	restart() {
		if (this.screen !== 'play') return;
		this.start(this.mode, this.game.startLevel);
	}

	backToMenu() {
		this.stash();
		this.stopLoop();
		this.release();
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
		playPause();
	}

	hide() {
		if (this.status.type === 'playing' || this.status.type === 'ready') this.togglePause();
		this.stash();
	}

	press(action: Action) {
		if (this.screen !== 'play') return;
		if (this.status.type !== 'playing') {
			if (action === 'left' || action === 'right') this.held[action] = true;
			if (action === 'soft') this.soft = true;
			return;
		}
		const game = this.game;
		switch (action) {
			case 'left':
			case 'right':
				this.held[action] = true;
				this.dir = action;
				this.repeatAt = performance.now() + HANDLING[reefPrefs.handling].das;
				shift(game, action === 'left' ? -1 : 1);
				break;
			case 'soft':
				this.soft = true;
				break;
			case 'cw':
			case 'ccw':
				rotate(game, action === 'cw' ? 1 : -1);
				break;
			case 'drop':
				hardDrop(game);
				break;
			case 'hold':
				holdPiece(game);
				break;
		}
		this.drain();
	}

	releaseAction(action: Action) {
		if (action === 'left' || action === 'right') {
			this.held[action] = false;
			if (this.dir === action) {
				const other = action === 'left' ? 'right' : 'left';
				this.dir = this.held[other] ? other : null;
				this.repeatAt = performance.now() + HANDLING[reefPrefs.handling].das;
			}
		}
		if (action === 'soft') this.soft = false;
	}

	/** Touch drags move a cell at a time without auto-repeat. */
	nudge(dx: number) {
		if (this.status.type !== 'playing') return;
		shift(this.game, dx);
		this.drain();
	}

	setSoft(on: boolean) {
		this.soft = on;
	}

	release() {
		this.held.left = false;
		this.held.right = false;
		this.dir = null;
		this.soft = false;
	}

	addDrawer(draw: Drawer) {
		this.drawers.add(draw);
		this.kick();
		return () => this.drawers.delete(draw);
	}

	listen(listener: WellListener) {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	stash() {
		if (this.screen !== 'play') return;
		const type = this.status.type;
		const game = this.game;
		if (type === 'over' || type === 'done' || game.over || game.done) {
			writeReef({ saved: null });
			return;
		}
		flushClear(game);
		game.events = [];
		const queue = game.piece ? [game.piece.kind, ...game.queue] : [...game.queue];
		writeReef({
			saved: {
				mode: game.mode,
				startLevel: game.startLevel,
				board: Array.from(game.board),
				queue: queue.slice(0, 8),
				bag: [...game.bag],
				hold: game.hold,
				seed: game.seed,
				score: game.score,
				lines: game.lines,
				level: game.level,
				combo: game.combo,
				b2b: game.b2b,
				time: game.time,
				pieces: game.pieces
			}
		});
	}

	private load(game: Game) {
		this.game = game;
		this.screen = 'play';
		this.callout = null;
		this.newBest = false;
		this.release();
		this.last = 0;
		this.mirror();
		this.ready();
		this.kick();
	}

	private ready() {
		this.status = { type: 'ready' };
		this.readyAt = performance.now() + READY_MS;
		this.last = 0;
		playReady();
	}

	private finish() {
		const game = this.game;
		if (game.done) {
			this.status = { type: 'done' };
			this.newBest = recordSprint(Math.round(game.time * 1000));
			playDone();
		} else {
			this.status = { type: 'over' };
			if (game.mode === 'marathon') recordMarathon(game.score, game.lines, game.level);
			playOver();
		}
		this.release();
		writeReef({ saved: null });
	}

	private drain() {
		const events = this.game.events;
		if (!events.length) return;
		this.game.events = [];
		let ended = false;
		for (const event of events) {
			for (const listener of this.listeners) listener(event);
			switch (event.type) {
				case 'move':
					playMove();
					break;
				case 'rotate':
					playRotate(event.kick);
					break;
				case 'land':
					playLand();
					break;
				case 'lock':
					playLock(event.cells.reduce((sum, [x]) => sum + x, 0) / event.cells.length);
					break;
				case 'harddrop':
					playHardDrop(event.rows);
					break;
				case 'hold':
					playHold();
					break;
				case 'tspin':
					playTspin(event.mini);
					this.callout = {
						id: ++this.calloutId,
						rows: [],
						count: 0,
						tspin: event.mini ? 'mini' : 'full',
						b2b: false,
						combo: -1,
						perfect: false,
						points: 0,
						label: event.mini ? 'T-spin mini' : 'T-spin'
					};
					break;
				case 'clear':
					playClear(event.info);
					this.bloom += 1;
					if (event.info.count === 4) this.whale += 1;
					if (event.info.count >= 2 || event.info.tspin !== 'none' || event.info.combo >= 2 || event.info.perfect) {
						this.callout = { ...event.info, id: ++this.calloutId };
					}
					break;
				case 'level':
					playLevel(event.level);
					setDivePace(event.level);
					break;
				case 'over':
				case 'done':
					ended = true;
					break;
			}
		}
		this.mirror();
		if (ended) this.finish();
	}

	private mirror() {
		const game = this.game;
		this.score = game.score;
		this.lines = game.lines;
		if (this.level !== game.level) setDivePace(game.level);
		this.level = game.level;
		this.combo = game.combo;
		this.b2b = game.b2b;
		this.pieces = game.pieces;
		this.time = game.time;
		if (this.hold !== game.hold) this.hold = game.hold;
		if (this.holdUsed !== game.holdUsed) this.holdUsed = game.holdUsed;
		let top = TOTAL;
		for (let i = 0; i < game.board.length; i += 1) {
			if (game.board[i]) {
				top = Math.floor(i / COLS);
				break;
			}
		}
		const stack = Math.min(1, (TOTAL - top) / ROWS);
		if (stack !== this.stack) this.stack = stack;
		if (this.queue.length !== game.queue.length || this.queue.some((k, i) => k !== game.queue[i])) {
			this.queue = [...game.queue];
		}
	}

	private repeat(now: number) {
		if (!this.dir || !this.held[this.dir] || now < this.repeatAt) return;
		const dx = this.dir === 'left' ? -1 : 1;
		const { arr } = HANDLING[reefPrefs.handling];
		if (arr === 0) {
			while (shift(this.game, dx));
			this.repeatAt = now + 1000;
			return;
		}
		while (now >= this.repeatAt) {
			if (!shift(this.game, dx)) {
				this.repeatAt = now + arr;
				break;
			}
			this.repeatAt += arr;
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
		if (type === 'ready' && now >= this.readyAt) {
			this.status = { type: 'playing' };
			if (this.held.left || this.held.right) {
				this.dir = this.held.right ? 'right' : 'left';
				this.repeatAt = now + HANDLING[reefPrefs.handling].das;
			}
		} else if (type === 'playing') {
			this.repeat(now);
			tick(this.game, dt, this.soft);
			this.drain();
			this.time = this.game.time;
		}
		for (const draw of this.drawers) draw(now, dt);
		this.raf = requestAnimationFrame(this.frame);
	};
}
