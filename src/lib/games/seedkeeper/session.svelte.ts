import { chooseAiMoveAsync } from './aiClient';
import { playAgain, playCapture, playDraw, playSelect, playStart, playTurn, playWin } from './audio';
import { createBoard, legalMoves, sow, statusOf, type Board, type SowResult } from './engine';
import { peekSaved, scoresFor, writeSaved } from './persist';
import { persistSeedPlay, persistSeedView, recordSeedScore, seedPlay, seedView } from './settings.svelte';
import { schedule, type Schedule } from './timing';
import { FIREFLY, HERON, SOWING_INFO, STORE, opponent, type Difficulty, type GameMode, type GameStatus, type Player, type Screen, type Sowing } from './types';

export type SowEvent =
	| { type: 'load'; board: Board }
	| { type: 'sow'; player: Player; pit: number; before: Board; result: SowResult; plan: Schedule; reduced: boolean };

export class SeedSession {
	screen = $state<Screen>('menu');
	mode = $state<GameMode>(seedPlay.mode);
	difficulty = $state<Difficulty>(seedPlay.difficulty);
	sowing = $state<Sowing>(seedView.sowing);
	/** The rules' board, ahead of the animation while seeds are in the air. */
	board = $state.raw<Board>(createBoard(SOWING_INFO[seedView.sowing].seeds));
	/** What the stones show right now; catches up as each sowing lands. */
	shown = $state.raw<Board>(createBoard(SOWING_INFO[seedView.sowing].seeds));
	current = $state<Player>(FIREFLY);
	status = $state<GameStatus>({ type: 'playing' });
	scores = $state({ 1: 0, 2: 0 });
	aiThinking = $state(false);
	animating = $state(false);
	hover = $state(-1);
	cursor = $state(0);
	showCursor = $state(false);
	lastPit = $state(-1);
	/** Sowings in a row by the same side this turn. */
	chain = $state(0);
	/** Bumps on every capture; the fireflies swarm. */
	flare = $state(0);
	/** Bumps when Old Heron (or Heron) captures; the heron strikes. */
	strike = $state(0);
	/** The capture landing right now, for the call line. */
	taking = $state<{ player: Player; taken: number } | null>(null);
	/** Bumps on every seed sown; the river ripples. */
	sown = $state(0);
	private opener: Player = FIREFLY;
	private token = 0;
	private listeners = new Set<(event: SowEvent) => void>();

	aiTurn = $derived(this.mode === 'ai' && this.current === HERON);
	ended = $derived(this.status.type !== 'playing');
	busy = $derived(this.animating || this.aiThinking || this.ended || this.screen !== 'play');
	moves = $derived(legalMoves(this.board, this.current));
	/** Share of all seeds already home in a store, 0..1. */
	gathered = $derived((this.shown[STORE[1]] + this.shown[STORE[2]]) / Math.max(1, SOWING_INFO[this.sowing].seeds * 12));

	listen(fn: (event: SowEvent) => void) {
		this.listeners.add(fn);
		return () => this.listeners.delete(fn);
	}

	private emit(event: SowEvent) {
		for (const fn of this.listeners) fn(event);
	}

	start(mode: GameMode, difficulty: Difficulty, sowing: Sowing) {
		this.mode = mode;
		this.difficulty = difficulty;
		this.sowing = sowing;
		this.scores = scoresFor(mode, difficulty);
		this.opener = FIREFLY;
		this.screen = 'play';
		writeSaved(null);
		this.fresh();
	}

	resume() {
		const saved = peekSaved();
		if (!saved) return false;
		if (statusOf(saved.board).type !== 'playing') {
			writeSaved(null);
			return false;
		}
		this.token += 1;
		this.mode = saved.mode;
		this.difficulty = saved.difficulty;
		this.sowing = saved.sowing;
		this.scores = scoresFor(saved.mode, saved.difficulty);
		this.board = saved.board;
		this.shown = saved.board;
		this.current = saved.current;
		this.status = { type: 'playing' };
		this.reset();
		this.screen = 'play';
		seedPlay.mode = saved.mode;
		seedPlay.difficulty = saved.difficulty;
		persistSeedPlay();
		this.emit({ type: 'load', board: this.board });
		playStart(SOWING_INFO[this.sowing].seeds);
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
		this.opener = opponent(this.opener);
		this.fresh();
	}

	private reset() {
		this.aiThinking = false;
		this.animating = false;
		this.hover = -1;
		this.lastPit = -1;
		this.chain = 0;
		this.taking = null;
		this.showCursor = false;
		this.cursor = this.current === FIREFLY ? 0 : 7;
	}

	private fresh() {
		this.token += 1;
		const board = createBoard(SOWING_INFO[this.sowing].seeds);
		this.board = board;
		this.shown = board;
		this.current = this.opener;
		this.status = { type: 'playing' };
		this.reset();
		this.emit({ type: 'load', board });
		playStart(SOWING_INFO[this.sowing].seeds);
		if (this.aiTurn) void this.runAi();
	}

	/** Whether a person may sow from this pit right now. */
	canSow(pit: number) {
		return !this.busy && !this.aiTurn && this.moves.includes(pit);
	}

	setHover(pit: number) {
		this.hover = this.canSow(pit) ? pit : -1;
	}

	choose(pit: number) {
		if (!this.canSow(pit)) return;
		void this.commit(pit, this.current);
	}

	sowCursor() {
		if (!this.showCursor || !this.moves.includes(this.cursor)) {
			this.showCursor = true;
			this.cursor = this.moves[0] ?? this.cursor;
			return;
		}
		this.choose(this.cursor);
	}

	/** Arrows walk along the mover's own row, in the direction it reads on screen. */
	moveCursor(dx: number) {
		if (this.busy || this.aiTurn || !this.moves.length) return;
		if (!this.showCursor || !this.moves.includes(this.cursor)) {
			this.showCursor = true;
			this.cursor = this.moves[0];
			playSelect();
			return;
		}
		const row = [...this.moves].sort((a, b) => (this.current === FIREFLY ? a - b : b - a));
		const at = row.indexOf(this.cursor);
		const next = row[Math.max(0, Math.min(row.length - 1, at + dx))];
		if (next !== this.cursor) {
			this.cursor = next;
			playSelect();
		}
	}

	private async commit(pit: number, player: Player) {
		const result = sow(this.board, pit, player);
		if (!result) return;
		const token = this.token;
		const reduced = prefersReduced();
		const plan = schedule(result, reduced);
		const before = this.board;
		this.board = result.board;
		this.lastPit = pit;
		this.hover = -1;
		this.animating = true;
		this.chain = result.extra ? this.chain + 1 : 0;
		this.emit({ type: 'sow', player, pit, before, result, plan, reduced });
		this.sown += result.path.length;

		if (result.capture) {
			await wait(plan.captureAt);
			if (token !== this.token) return;
			this.flare += 1;
			if (player === HERON) this.strike += 1;
			this.taking = { player, taken: result.capture.taken };
			playCapture(result.capture.taken);
			await wait(plan.end - plan.captureAt);
		} else {
			await wait(plan.end);
		}
		if (token !== this.token) return;
		this.taking = null;
		this.animating = false;
		this.shown = result.board;

		const status = statusOf(result.board);
		if (status.type !== 'playing') {
			this.finish(status);
			return;
		}
		if (result.extra) {
			playAgain(this.chain);
		} else {
			this.current = opponent(player);
			playTurn(this.current);
		}
		if (this.showCursor && !this.moves.includes(this.cursor)) this.cursor = this.moves[0] ?? this.cursor;
		this.save();
		if (this.aiTurn) void this.runAi();
	}

	private async runAi() {
		const token = this.token;
		this.aiThinking = true;
		const started = performance.now();
		const pit = await chooseAiMoveAsync(this.board, HERON, this.difficulty);
		if (token !== this.token || this.screen !== 'play') return;
		const pause = (prefersReduced() ? 150 : this.chain ? 420 : 720 + Math.random() * 380) - (performance.now() - started);
		if (pause > 0) await wait(pause);
		if (token !== this.token || this.screen !== 'play') return;
		this.aiThinking = false;
		if (pit < 0 || !this.board[pit]) return;
		void this.commit(pit, HERON);
	}

	private finish(status: GameStatus) {
		this.status = status;
		this.aiThinking = false;
		writeSaved(null);
		seedView.harvests += 1;
		persistSeedView();
		if (status.type === 'won') {
			this.scores[status.winner] += 1;
			recordSeedScore(this.mode, this.difficulty, { 1: this.scores[1], 2: this.scores[2] });
			playWin(status.winner === FIREFLY || this.mode === 'local');
		} else {
			playDraw();
		}
	}

	private save() {
		if (this.status.type !== 'playing') return;
		writeSaved({ mode: this.mode, difficulty: this.difficulty, sowing: this.sowing, board: [...this.board], current: this.current });
	}
}

function prefersReduced() {
	return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function wait(ms: number) {
	return new Promise((resolve) => window.setTimeout(resolve, ms));
}
