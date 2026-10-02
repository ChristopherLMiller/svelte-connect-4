import { chooseAiMoveAsync } from './aiClient';
import { playCorner, playDraw, playFlip, playPass, playPlace, playSelect, playWin } from './audio';
import { applyMove, counts, legalMoves, nextToMove, setupBoard, statusOf } from './engine';
import { boardToCells, cellsToBoard, peekSaved, scoresFor, writeSaved } from './persist';
import { eclPlay, persistEclPlay, recordEclScore } from './settings.svelte';
import { isCorner, MOON, SUN, type Board, type Difficulty, type FlipLine, type GameMode, type GameStatus, type Player, type Screen } from './types';

/** Pause after a disc is seated before the first neighbour turns. */
export const FLIP_LEAD_MS = 160;
/** Gap between neighbouring discs turning as the eclipse runs down a line. */
export const FLIP_STEP_MS = 95;
/** How long a single disc takes to turn over. */
export const FLIP_TURN_MS = 520;

export type Eclipse = {
	key: number;
	origin: number;
	player: Player;
	lines: FlipLine[];
};

export class EclSession {
	screen = $state<Screen>('menu');
	mode = $state<GameMode>(eclPlay.mode);
	difficulty = $state<Difficulty>(eclPlay.difficulty);
	board = $state.raw<Board>(setupBoard());
	current = $state<Player>(MOON);
	status = $state<GameStatus>({ type: 'playing' });
	scores = $state({ 1: 0, 2: 0 });
	aiThinking = $state(false);
	animating = $state(false);
	cursor = $state(19);
	hover = $state<number | null>(null);
	/** Square most recently played, for the brass pin. */
	lastMove = $state<number | null>(null);
	/** Turn delay per flipped square, in ms from the placement. */
	delays = $state.raw<Record<number, number>>({});
	eclipse = $state.raw<Eclipse | null>(null);
	/** Corner taken: drives the corona flare. */
	flare = $state.raw<{ key: number; index: number; player: Player } | null>(null);
	pass = $state.raw<{ key: number; player: Player } | null>(null);
	turnPulse = $state(0);
	private eclipseKey = 0;
	private turnToken = 0;

	moves = $derived(this.status.type === 'playing' ? legalMoves(this.board, this.current) : []);
	tally = $derived(counts(this.board));
	/** -1 all Moon, +1 all Sun. */
	balance = $derived((this.tally[2] - this.tally[1]) / Math.max(1, this.tally[1] + this.tally[2]));
	aiTurn = $derived(this.mode === 'ai' && this.current === SUN);
	busy = $derived(this.animating || this.aiThinking || this.status.type !== 'playing' || this.screen !== 'play');

	start(mode: GameMode, difficulty: Difficulty = 'medium') {
		this.turnToken += 1;
		this.mode = mode;
		this.difficulty = difficulty;
		this.scores = scoresFor(mode, difficulty);
		this.screen = 'play';
		writeSaved(null);
		this.resetRound();
	}

	resume() {
		const saved = peekSaved();
		if (!saved) return false;
		const board = cellsToBoard(saved.board);
		if (statusOf(board).type !== 'playing') {
			writeSaved(null);
			return false;
		}
		this.turnToken += 1;
		this.mode = saved.mode;
		this.difficulty = saved.difficulty;
		this.scores = scoresFor(saved.mode, saved.difficulty);
		this.clearFx();
		this.board = board;
		this.current = saved.current;
		this.status = { type: 'playing' };
		this.cursor = this.moves[0] ?? 19;
		this.screen = 'play';
		eclPlay.mode = saved.mode;
		eclPlay.difficulty = saved.difficulty;
		persistEclPlay();
		if (this.aiTurn) void this.runAiTurn();
		return true;
	}

	backToMenu() {
		this.turnToken += 1;
		this.aiThinking = false;
		this.animating = false;
		if (this.status.type === 'playing' && this.screen === 'play') this.save();
		this.screen = 'menu';
	}

	rematch() {
		if (this.screen !== 'play' || this.animating) return;
		this.turnToken += 1;
		this.resetRound();
	}

	setHover(index: number | null) {
		if (this.busy || this.aiTurn) return;
		this.hover = index;
		if (index !== null) this.cursor = index;
	}

	nudge(dr: number, dc: number) {
		if (this.busy || this.aiTurn) return;
		const r = ((this.cursor >> 3) + dr + 8) % 8;
		const c = ((this.cursor & 7) + dc + 8) % 8;
		this.cursor = r * 8 + c;
		this.hover = this.cursor;
		playSelect();
	}

	playCursor() {
		return this.playSquare(this.cursor);
	}

	async playSquare(index: number) {
		if (this.busy || this.aiTurn) return;
		if (!this.moves.includes(index)) return;
		await this.enact(index, this.current);
	}

	private resetRound() {
		this.clearFx();
		this.board = setupBoard();
		this.current = MOON;
		this.status = { type: 'playing' };
		this.aiThinking = false;
		this.animating = false;
		this.cursor = 19;
		writeSaved(null);
		if (this.aiTurn) void this.runAiTurn();
	}

	private clearFx() {
		this.lastMove = null;
		this.delays = {};
		this.eclipse = null;
		this.flare = null;
		this.pass = null;
		this.hover = null;
	}

	private async runAiTurn() {
		const token = this.turnToken;
		this.aiThinking = true;
		this.hover = null;
		const reduced = prefersReduced();
		const board = this.board;
		const options = legalMoves(board, SUN);
		const thinking = chooseAiMoveAsync(board, SUN, this.difficulty);
		// The orrery hand drifts over a few candidates while the search runs.
		const glances = reduced ? 0 : Math.min(3, options.length);
		for (let i = 0; i < glances; i += 1) {
			if (token !== this.turnToken) return;
			this.cursor = options[Math.floor(Math.random() * options.length)];
			this.hover = this.cursor;
			await wait(220 + Math.random() * 90);
		}
		const index = await thinking;
		if (token !== this.turnToken || this.screen !== 'play' || this.status.type !== 'playing') {
			this.aiThinking = false;
			return;
		}
		if (index < 0) {
			this.aiThinking = false;
			return;
		}
		this.cursor = index;
		this.hover = index;
		await wait(reduced ? 40 : 260);
		if (token !== this.turnToken) return;
		this.aiThinking = false;
		this.hover = null;
		await this.enact(index, SUN);
	}

	private async enact(index: number, player: Player) {
		const result = applyMove(this.board, index, player);
		if (!result) return;
		const token = this.turnToken;
		const reduced = prefersReduced();
		const step = reduced ? 0 : FLIP_STEP_MS;
		const lead = reduced ? 0 : FLIP_LEAD_MS;
		this.animating = true;
		this.hover = null;

		const delays: Record<number, number> = {};
		let longest = 0;
		for (const line of result.lines) {
			line.forEach((cell, k) => (delays[cell] = lead + k * step));
			longest = Math.max(longest, line.length);
		}
		this.delays = delays;
		this.lastMove = index;
		this.board = result.board;
		this.eclipseKey += 1;
		this.eclipse = { key: this.eclipseKey, origin: index, player, lines: result.lines };
		playPlace(player);
		for (let k = 0; k < longest; k += 1) playFlip(player, k, (lead + k * step) / 1000);
		if (isCorner(index)) {
			this.flare = { key: this.eclipseKey, index, player };
			playCorner(player);
		}

		await wait(reduced ? 60 : lead + (longest - 1) * step + FLIP_TURN_MS);
		if (token !== this.turnToken) return;
		this.animating = false;

		const next = nextToMove(result.board, player);
		if (next === null) {
			this.finish(statusOf(result.board));
			return;
		}
		if (next === player) {
			const key = this.eclipseKey;
			this.pass = { key, player: player === MOON ? SUN : MOON };
			playPass();
			window.setTimeout(() => {
				if (this.pass?.key === key) this.pass = null;
			}, 2200);
		}
		this.current = next;
		this.turnPulse += 1;
		if (!this.moves.includes(this.cursor)) this.cursor = this.moves[0] ?? this.cursor;
		this.save();
		if (this.aiTurn) void this.runAiTurn();
	}

	private finish(status: GameStatus) {
		this.status = status;
		writeSaved(null);
		if (status.type === 'won') {
			this.scores[status.winner] += 1;
			recordEclScore(this.mode, this.difficulty, { 1: this.scores[1], 2: this.scores[2] });
			playWin(status.winner);
		} else {
			playDraw();
		}
	}

	private save() {
		writeSaved({
			mode: this.mode,
			difficulty: this.difficulty,
			board: boardToCells(this.board),
			current: this.current
		});
	}
}

function prefersReduced() {
	return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function wait(ms: number) {
	return new Promise((resolve) => window.setTimeout(resolve, ms));
}
