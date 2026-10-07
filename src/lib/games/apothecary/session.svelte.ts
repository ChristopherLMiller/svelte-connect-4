import { canMove, createBrew, seedFrom, slide, spawn, topTier, type Merge, type Motion, type Spawn } from './engine';
import { peekSaved, writeApo, type Snapshot } from './persist';
import { apoPrefs, persistApoPrefs, recordProgress, recordStart, recordStone } from './settings.svelte';
import { playLand, playNewTier, playNudge, playOver, playPour, playSlide, playStart, playStone, playUndo } from './audio';
import { SLIDE_MS } from './render';
import { REFUND_TIER, STONE, UNDO_MAX, nOf, todayKey, type Board, type Dir, type Screen, type Status } from './types';

export type BrewEvent =
	| { type: 'load'; cells: number[]; n: number; spawns: Spawn[] }
	| { type: 'pour'; dir: Dir; motions: Motion[]; merges: Merge[]; spawn: Spawn | null; cells: number[] }
	| { type: 'undo'; cells: number[] }
	| { type: 'nudge'; dir: Dir };

export type BrewListener = (event: BrewEvent) => void;

const HISTORY = 6;

function freshSeed() {
	if (typeof crypto !== 'undefined' && crypto.getRandomValues) return crypto.getRandomValues(new Uint32Array(1))[0];
	return (Math.random() * 2 ** 32) >>> 0;
}

export class ApoSession {
	screen = $state<Screen>('menu');
	board = $state<Board>(apoPrefs.bench);
	date = $state('');
	n = $state(4);
	cells = $state.raw<number[]>(new Array(16).fill(0));
	score = $state(0);
	moves = $state(0);
	undos = $state(UNDO_MAX);
	status = $state<Status>({ type: 'playing' });
	kept = $state(false);
	newBest = $state(false);
	/** Points from the last pour, keyed so the HUD can float each one. */
	gain = $state({ id: 0, points: 0 });
	/** Bumps on every merge; the burner flares, harder for rarer tiers. */
	flare = $state({ id: 0, tier: 0 });
	/** A new highest tier this brew, for the toast. */
	discovery = $state({ id: 0, tier: 0 });

	private rng = 0;
	private history: Snapshot[] = [];
	private listeners = new Set<BrewListener>();

	top = $derived(topTier(this.cells));
	ended = $derived(this.status.type === 'over');
	/** Pours that can still be taken back, mirrored from the private history. */
	private steps = $state(0);
	canUndo = $derived(this.undos > 0 && this.steps > 0 && this.screen === 'play');

	start(board: Board = this.board) {
		this.board = board;
		if (board !== 'daily') {
			apoPrefs.bench = board;
			persistApoPrefs();
		}
		const date = board === 'daily' ? todayKey() : '';
		const n = nOf(board);
		const { brew, spawns } = createBrew(n, board === 'daily' ? seedFrom(`apothecary:${date}`) : freshSeed());
		this.setHistory([]);
		this.load(board, date, n, brew.cells, brew.rng, 0, 0, UNDO_MAX, false, spawns);
		recordStart(board, date);
		this.save();
		playStart();
	}

	/** Picks up the saved brew; a daily from an earlier day is dropped. */
	resume() {
		const saved = peekSaved();
		if (!saved) return false;
		if (saved.board === 'daily' && saved.date !== todayKey()) {
			writeApo({ saved: null });
			return false;
		}
		this.board = saved.board;
		if (saved.board !== 'daily') {
			apoPrefs.bench = saved.board;
			persistApoPrefs();
		}
		this.setHistory(saved.history);
		this.load(saved.board, saved.date, nOf(saved.board), saved.cells, saved.rng, saved.score, saved.moves, saved.undos, saved.kept, []);
		if (!canMove(this.cells, this.n)) this.status = { type: 'over' };
		playStart();
		return true;
	}

	restart() {
		if (this.screen !== 'play') return;
		this.start(this.board);
	}

	backToMenu() {
		this.screen = 'menu';
	}

	keepBrewing() {
		if (this.status.type !== 'stone') return;
		this.kept = true;
		this.status = { type: 'playing' };
		this.save();
	}

	pour(dir: Dir) {
		if (this.screen !== 'play' || this.status.type !== 'playing') return;
		const result = slide(this.cells, this.n, dir);
		if (!result.moved) {
			this.emit({ type: 'nudge', dir });
			playNudge();
			return;
		}
		const before = this.top;
		this.setHistory([...this.history, { cells: this.cells, rng: this.rng, score: this.score }].slice(-HISTORY));
		const dropped = spawn(result.cells, this.rng);
		this.rng = dropped.rng;
		this.cells = dropped.cells;
		this.score += result.gain;
		this.moves += 1;
		this.emit({ type: 'pour', dir, motions: result.motions, merges: result.merges, spawn: dropped.spawn, cells: dropped.cells });

		const best = result.merges.reduce((m, x) => Math.max(m, x.tier), 0);
		const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
		const moved = result.motions.filter((m) => m.from !== m.to).length;
		playLand(dir, moved, result.merges.length, calm ? 0 : SLIDE_MS / 1000);
		if (result.gain) {
			this.gain = { id: this.gain.id + 1, points: result.gain };
			this.flare = { id: this.flare.id + 1, tier: best };
			playPour(result.merges.length, best);
		} else {
			playSlide();
		}
		const top = this.top;
		if (top > before && top >= 4) {
			this.discovery = { id: this.discovery.id + 1, tier: top };
			if (top >= REFUND_TIER && this.undos < UNDO_MAX) this.undos += 1;
			if (top !== STONE) playNewTier(top);
		}
		this.newBest = recordProgress(this.board, this.date, this.score, top) || this.newBest;

		if (top >= STONE && !this.kept && before < STONE) {
			this.status = { type: 'stone' };
			recordStone();
			playStone();
		} else if (!canMove(this.cells, this.n)) {
			this.status = { type: 'over' };
			playOver();
		}
		this.save();
	}

	undo() {
		if (!this.canUndo || this.status.type === 'stone') return;
		const last = this.history.at(-1);
		if (!last) return;
		this.setHistory(this.history.slice(0, -1));
		this.cells = last.cells;
		this.rng = last.rng;
		this.score = last.score;
		this.moves = Math.max(0, this.moves - 1);
		this.undos -= 1;
		this.status = { type: 'playing' };
		this.emit({ type: 'undo', cells: last.cells });
		playUndo();
		this.save();
	}

	listen(listener: BrewListener) {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	/** The renderer asks for the current wells when it mounts mid-brew. */
	snapshot(): BrewEvent {
		return { type: 'load', cells: this.cells, n: this.n, spawns: [] };
	}

	private save() {
		if (this.status.type === 'over') {
			writeApo({ saved: null });
			return;
		}
		writeApo({
			saved: {
				board: this.board,
				date: this.date,
				cells: this.cells,
				rng: this.rng,
				score: this.score,
				moves: this.moves,
				undos: this.undos,
				history: this.history,
				kept: this.kept || this.status.type === 'stone'
			}
		});
	}

	private load(
		board: Board,
		date: string,
		n: number,
		cells: number[],
		rng: number,
		score: number,
		moves: number,
		undos: number,
		kept: boolean,
		spawns: Spawn[]
	) {
		this.board = board;
		this.date = date;
		this.n = n;
		this.cells = cells;
		this.rng = rng;
		this.score = score;
		this.moves = moves;
		this.undos = undos;
		this.kept = kept;
		this.newBest = false;
		this.status = { type: 'playing' };
		this.screen = 'play';
		this.emit({ type: 'load', cells, n, spawns });
	}

	private setHistory(history: Snapshot[]) {
		this.history = history;
		this.steps = history.length;
	}

	private emit(event: BrewEvent) {
		for (const listener of this.listeners) listener(event);
	}
}
