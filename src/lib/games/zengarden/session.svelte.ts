import { chooseAiMoveAsync } from './aiClient';
import { playDraw, playLift, playSelect, playStart, playThreat, playTurn, playWin } from './audio';
import { Field, center, createBoard, replay, statusAfter, type Board } from './engine';
import { peekSaved, scoresFor, writeSaved } from './persist';
import { persistZenPlay, persistZenView, recordZenScore, zenPlay, zenView } from './settings.svelte';
import { GARDEN_INFO, QUARTZ, SLATE, opponent, type Difficulty, type GameMode, type GameStatus, type Garden, type Player, type Screen } from './types';

export type ZenEvent =
	| { type: 'load'; board: Board; size: number; lifted: Array<{ index: number; player: Player }> }
	| { type: 'place'; index: number; player: Player; reduced: boolean };

/** How long a stone takes to fall, settle and send its ripple out before play moves on. */
export const DROP_MS = 430;

export class ZenSession {
	screen = $state<Screen>('menu');
	mode = $state<GameMode>(zenPlay.mode);
	difficulty = $state<Difficulty>(zenPlay.difficulty);
	garden = $state<Garden>(zenView.garden);
	board = $state.raw<Board>(createBoard(GARDEN_INFO[zenView.garden].size));
	moves = $state.raw<number[]>([]);
	first = $state<Player>(SLATE);
	current = $state<Player>(SLATE);
	status = $state<GameStatus>({ type: 'playing' });
	scores = $state({ 1: 0, 2: 0 });
	aiThinking = $state(false);
	animating = $state(false);
	hover = $state(-1);
	cursor = $state(0);
	showCursor = $state(false);
	/** Bumps on every stone placed; the pond ripples. */
	placed = $state(0);
	/** Bumps when a five is made; the wind gusts through the garden. */
	gust = $state(0);
	private token = 0;
	private listeners = new Set<(event: ZenEvent) => void>();

	size = $derived(GARDEN_INFO[this.garden].size);
	aiTurn = $derived(this.mode === 'ai' && this.current === QUARTZ && this.status.type === 'playing');
	ended = $derived(this.status.type !== 'playing');
	busy = $derived(this.animating || this.aiThinking || this.ended || this.screen !== 'play');
	last = $derived(this.moves.length ? this.moves[this.moves.length - 1] : -1);
	/** Points where a stone would finish five, per colour. */
	threats = $derived.by(() => {
		if (this.status.type !== 'playing') return { 1: [] as number[], 2: [] as number[] };
		const field = new Field(this.size, this.board);
		return { 1: field.winPoints(1), 2: field.winPoints(2) };
	});
	canUndo = $derived.by(() => {
		if (this.busy || this.aiTurn || !this.moves.length) return false;
		if (this.mode === 'local') return true;
		return this.moves.length >= (this.first === QUARTZ ? 3 : 1);
	});
	/** 0..1, how full the bed is; the light moves on as the game goes. */
	progress = $derived(Math.min(1, this.moves.length / Math.max(1, this.size * this.size * 0.35)));

	listen(fn: (event: ZenEvent) => void) {
		this.listeners.add(fn);
		return () => this.listeners.delete(fn);
	}

	private emit(event: ZenEvent) {
		for (const fn of this.listeners) fn(event);
	}

	start(mode: GameMode, difficulty: Difficulty, garden: Garden) {
		this.mode = mode;
		this.difficulty = difficulty;
		this.garden = garden;
		this.scores = scoresFor(mode, difficulty);
		this.first = SLATE;
		this.screen = 'play';
		writeSaved(null);
		this.fresh();
	}

	resume() {
		const saved = peekSaved();
		if (!saved) return false;
		const game = replay(GARDEN_INFO[saved.garden].size, saved.moves, saved.first);
		if (!game || game.status.type !== 'playing') {
			writeSaved(null);
			return false;
		}
		this.token += 1;
		this.mode = saved.mode;
		this.difficulty = saved.difficulty;
		this.garden = saved.garden;
		this.scores = scoresFor(saved.mode, saved.difficulty);
		this.first = saved.first;
		this.moves = saved.moves;
		this.board = game.board;
		this.current = game.next;
		this.status = { type: 'playing' };
		this.reset();
		this.screen = 'play';
		zenPlay.mode = saved.mode;
		zenPlay.difficulty = saved.difficulty;
		persistZenPlay();
		this.emit({ type: 'load', board: this.board, size: this.size, lifted: [] });
		playStart();
		if (this.aiTurn) void this.runAi();
		return true;
	}

	backToMenu() {
		this.token += 1;
		this.aiThinking = false;
		this.animating = false;
		if (this.screen === 'play' && this.status.type === 'playing') this.save();
		this.screen = 'menu';
	}

	rematch() {
		if (this.screen !== 'play') return;
		this.first = opponent(this.first);
		this.fresh();
	}

	private reset() {
		this.aiThinking = false;
		this.animating = false;
		this.hover = -1;
		this.showCursor = false;
		this.cursor = this.last >= 0 ? this.last : center(this.size);
	}

	private fresh() {
		this.token += 1;
		const lifted = this.moves.map((index) => ({ index, player: this.board[index] as Player })).filter((s) => s.player);
		this.board = createBoard(this.size);
		this.moves = [];
		this.current = this.first;
		this.status = { type: 'playing' };
		this.reset();
		this.emit({ type: 'load', board: this.board, size: this.size, lifted });
		playStart();
		if (this.aiTurn) void this.runAi();
	}

	canPlace(index: number) {
		return !this.busy && !this.aiTurn && index >= 0 && index < this.board.length && !this.board[index];
	}

	setHover(index: number) {
		this.hover = this.canPlace(index) ? index : -1;
	}

	choose(index: number) {
		if (!this.canPlace(index)) return;
		void this.commit(index, this.current);
	}

	placeCursor() {
		if (!this.showCursor) {
			this.showCursor = true;
			return;
		}
		this.choose(this.cursor);
	}

	moveCursor(dr: number, dc: number) {
		if (this.busy || this.aiTurn) return;
		if (!this.showCursor) {
			this.showCursor = true;
			playSelect();
			return;
		}
		const r = Math.max(0, Math.min(this.size - 1, Math.floor(this.cursor / this.size) + dr));
		const c = Math.max(0, Math.min(this.size - 1, (this.cursor % this.size) + dc));
		const next = r * this.size + c;
		if (next !== this.cursor) {
			this.cursor = next;
			playSelect();
		}
	}

	/** Take back the last turn: one stone in hotseat, your stone and the Monk's reply against the AI. */
	undo() {
		if (!this.canUndo) return;
		this.token += 1;
		const count = this.mode === 'ai' && this.board[this.last] === QUARTZ ? 2 : 1;
		const keep = this.moves.slice(0, Math.max(0, this.moves.length - count));
		const lifted = this.moves.slice(keep.length).map((index) => ({ index, player: this.board[index] as Player }));
		const game = replay(this.size, keep, this.first);
		if (!game) return;
		this.moves = keep;
		this.board = game.board;
		this.current = game.next;
		this.reset();
		this.emit({ type: 'load', board: this.board, size: this.size, lifted });
		playLift();
		this.save();
		if (!keep.length) writeSaved(null);
		if (this.aiTurn) void this.runAi();
	}

	private async commit(index: number, player: Player) {
		const token = this.token;
		const before = this.threats[player].length;
		const board = [...this.board];
		board[index] = player;
		this.board = board;
		this.moves = [...this.moves, index];
		this.hover = -1;
		if (this.showCursor) this.cursor = index;
		this.animating = true;
		const reduced = prefersReduced();
		this.emit({ type: 'place', index, player, reduced });
		this.placed += 1;
		await wait(reduced ? 120 : DROP_MS);
		if (token !== this.token) return;
		this.animating = false;

		const status = statusAfter(board, this.size, index);
		if (status.type !== 'playing') {
			this.finish(status);
			return;
		}
		this.current = opponent(player);
		if (this.threats[player].length > before) playThreat(player);
		else playTurn(this.current);
		this.save();
		if (this.aiTurn) void this.runAi();
	}

	private async runAi() {
		const token = this.token;
		this.aiThinking = true;
		const started = performance.now();
		const index = await chooseAiMoveAsync(this.board, this.size, QUARTZ, this.difficulty);
		if (token !== this.token || this.screen !== 'play') return;
		const pause = (prefersReduced() ? 150 : 520 + Math.random() * 420) - (performance.now() - started);
		if (pause > 0) await wait(pause);
		if (token !== this.token || this.screen !== 'play') return;
		this.aiThinking = false;
		if (index < 0 || this.board[index]) return;
		void this.commit(index, QUARTZ);
	}

	private finish(status: GameStatus) {
		this.status = status;
		this.aiThinking = false;
		writeSaved(null);
		zenView.raked += 1;
		persistZenView();
		if (status.type === 'won') {
			this.gust += 1;
			this.scores[status.winner] += 1;
			recordZenScore(this.mode, this.difficulty, { 1: this.scores[1], 2: this.scores[2] });
			playWin(status.winner === SLATE || this.mode === 'local');
		} else {
			playDraw();
		}
	}

	private save() {
		if (this.status.type !== 'playing' || !this.moves.length) return;
		writeSaved({ mode: this.mode, difficulty: this.difficulty, garden: this.garden, first: this.first, moves: [...this.moves] });
	}
}

function prefersReduced() {
	return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function wait(ms: number) {
	return new Promise((resolve) => window.setTimeout(resolve, ms));
}
