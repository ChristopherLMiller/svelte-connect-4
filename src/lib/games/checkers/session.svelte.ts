import { chooseAiMove } from './ai';
import { playCrown, playFall, playSelect, playStep, playWin } from './audio';
import {
	applyMove,
	cloneBoard,
	jumpingFrom,
	legalMoves,
	movesFrom,
	opponent,
	setupBoard,
	statusFor
} from './engine';
import { peekSaved, scoresFor, writeSaved, type SavedMatch } from './persist';
import { persistAshPlay, recordAshScore, ashPlay } from './settings.svelte';
import type { Coord, Difficulty, Fall, GameMode, GameStatus, Ghost, Move, Player, Scorch, Screen } from './types';
import { playable, same, SIZE } from './types';

export class AshSession {
	screen = $state<Screen>('menu');
	mode = $state<GameMode>(ashPlay.mode);
	difficulty = $state<Difficulty>(ashPlay.difficulty);
	board = $state(setupBoard());
	current = $state<Player>(1);
	starter = $state<Player>(1);
	status = $state<GameStatus>({ type: 'playing' });
	scores = $state({ 1: 0, 2: 0 });
	aiThinking = $state(false);
	cursor = $state<Coord>({ r: 5, c: 0 });
	selected = $state<Coord | null>(null);
	chaining = $state<Coord | null>(null);
	hover = $state<Coord | null>(null);
	ghost = $state<Ghost | null>(null);
	hidden = $state<string[]>([]);
	falls = $state<Fall[]>([]);
	scorches = $state<Scorch[]>([]);
	lastMove = $state<{ from: Coord; to: Coord } | null>(null);
	heat = $state(0);
	kindle = $state(0);
	turnPulse = $state(0);
	animating = $state(false);
	fallKey = 0;
	scorchKey = 0;
	private turnToken = 0;

	jumpers = $derived.by(() => {
		if (this.chaining) return [this.chaining];
		return jumpingFrom(this.board, this.current);
	});
	mustTake = $derived(this.jumpers.length > 0);
	options = $derived.by(() => {
		if (!this.selected) return [] as Move[];
		const moves = movesFrom(this.board, this.current, this.selected);
		if (this.chaining) return moves.filter((move) => move.captured.length);
		return moves;
	});
	busy = $derived(
		this.animating ||
			this.aiThinking ||
			this.status.type !== 'playing' ||
			this.screen !== 'play'
	);

	start(mode: GameMode, difficulty: Difficulty = 'medium') {
		this.turnToken += 1;
		this.mode = mode;
		this.difficulty = difficulty;
		this.scores = scoresFor(mode, difficulty);
		this.starter = 1;
		this.screen = 'play';
		writeSaved(null);
		this.resetRound(false);
	}

	resume() {
		const saved = peekSaved();
		if (!saved) return false;
		this.turnToken += 1;
		this.mode = saved.mode;
		this.difficulty = saved.difficulty;
		this.scores = scoresFor(saved.mode, saved.difficulty);
		this.starter = saved.starter;
		this.board = cloneBoard(saved.board);
		this.current = saved.current;
		this.status = { type: 'playing' };
		this.aiThinking = false;
		this.animating = false;
		this.ghost = null;
		this.hidden = [];
		this.falls = [];
		this.scorches = [];
		this.lastMove = null;
		this.selected = null;
		this.chaining = null;
		this.hover = null;
		this.heat = 0;
		this.kindle = 0;
		this.cursor = { r: saved.current === 1 ? 5 : 2, c: 0 };
		this.screen = 'play';
		ashPlay.mode = saved.mode;
		ashPlay.difficulty = saved.difficulty;
		persistAshPlay();
		if (this.mode === 'ai' && this.current === 2) void this.runAiTurn();
		return true;
	}

	backToMenu() {
		this.turnToken += 1;
		this.aiThinking = false;
		this.animating = false;
		this.persistLive();
		this.screen = 'menu';
	}

	resetRound(advanceStarter = true) {
		if (advanceStarter) this.starter = opponent(this.starter);
		this.board = setupBoard();
		this.current = this.starter;
		this.status = { type: 'playing' };
		this.aiThinking = false;
		this.animating = false;
		this.ghost = null;
		this.hidden = [];
		this.falls = [];
		this.scorches = [];
		this.lastMove = null;
		this.heat = 0;
		this.kindle = 0;
		this.selected = null;
		this.chaining = null;
		this.hover = null;
		this.cursor = { r: this.current === 1 ? 5 : 2, c: 0 };
		writeSaved(null);
		if (this.mode === 'ai' && this.current === 2) void this.runAiTurn();
	}

	rematch() {
		if (this.screen !== 'play') return;
		if (this.animating) return;
		this.turnToken += 1;
		this.aiThinking = false;
		this.resetRound(true);
	}

	setHover(cell: Coord | null) {
		if (this.busy || (this.mode === 'ai' && this.current === 2)) return;
		this.hover = cell;
		if (cell) this.cursor = cell;
	}

	nudge(dr: number, dc: number) {
		if (this.busy) return;
		let r = this.cursor.r;
		let c = this.cursor.c;
		for (let i = 0; i < SIZE * SIZE; i += 1) {
			r = (r + dr + SIZE) % SIZE;
			c = (c + dc + SIZE) % SIZE;
			if (playable(r, c)) {
				this.cursor = { r, c };
				this.hover = this.cursor;
				playSelect();
				return;
			}
		}
	}

	async playCursor() {
		await this.playSquare(this.cursor.r, this.cursor.c);
	}

	async playSquare(r: number, c: number) {
		if (this.busy || (this.mode === 'ai' && this.current === 2)) return;
		const at = { r, c };
		const dest = this.options
			.filter((move) => same(move.to, at))
			.sort((a, b) => b.captured.length - a.captured.length)[0];
		if (dest) {
			await this.enact(dest);
			return;
		}
		if (this.chaining) return;
		if (this.selected && same(this.selected, at)) {
			this.selected = null;
			playSelect();
			return;
		}
		const piece = this.board[r][c];
		if (piece?.player === this.current && this.canSelect(at)) {
			this.selected = at;
			this.cursor = at;
			playSelect();
			return;
		}
		if (this.selected && !this.chaining) {
			this.selected = null;
			playSelect();
		}
	}

	private canSelect(at: Coord) {
		if (this.chaining) return same(this.chaining, at);
		return movesFrom(this.board, this.current, at).length > 0;
	}

	private async runAiTurn() {
		const token = this.turnToken;
		this.aiThinking = true;
		this.hover = null;
		if (!this.chaining) this.selected = null;
		const reduced = prefersReduced();
		const glance = reduced ? 0 : this.difficulty === 'hard' ? 4 : 3;
		const legal = this.chaining
			? movesFrom(this.board, 2, this.chaining).filter((move) => move.captured.length)
			: legalMoves(this.board, 2);
		let last: Coord | null = null;
		for (let i = 0; i < glance; i += 1) {
			if (token !== this.turnToken || this.screen !== 'play') {
				this.aiThinking = false;
				return;
			}
			const pool = legal.filter((move) => !last || !same(move.from, last));
			const pick = (pool.length ? pool : legal)[Math.floor(Math.random() * (pool.length || legal.length))];
			if (pick) {
				last = pick.from;
				this.hover = pick.from;
				this.cursor = pick.from;
				playSelect();
			}
			await wait(this.difficulty === 'hard' ? 220 + Math.random() * 80 : 180 + Math.random() * 70);
		}
		const move = this.chaining
			? chooseAiMove(this.board, 2, this.difficulty, this.chaining)
			: chooseAiMove(this.board, 2, this.difficulty);
		if (!move || token !== this.turnToken || this.screen !== 'play' || this.status.type !== 'playing') {
			this.aiThinking = false;
			return;
		}
		this.hover = move.from;
		this.cursor = move.from;
		await wait(reduced ? 60 : 280);
		if (token !== this.turnToken || this.screen !== 'play') {
			this.aiThinking = false;
			return;
		}
		this.aiThinking = false;
		this.hover = null;
		await this.enact(move);
	}

	private async enact(move: Move) {
		const token = this.turnToken;
		const source = cloneBoard(this.board);
		const piece = source[move.from.r][move.from.c];
		if (!piece) return;
		this.animating = true;
		this.selected = null;
		this.hover = null;
		this.hidden = [piece.id];
		this.ghost = { id: piece.id, player: piece.player, king: piece.king, r: move.from.r, c: move.from.c };
		const hops = move.path.slice(1);
		const reduced = prefersReduced();
		const hopMs = reduced ? 40 : 380;
		await wait(reduced ? 0 : 32);
		for (let i = 0; i < hops.length; i += 1) {
			if (token !== this.turnToken) {
				this.animating = false;
				return;
			}
			const hop = hops[i];
			const flying: Ghost | null = this.ghost;
			if (!flying) return;
			this.ghost = { ...flying, r: hop.r, c: hop.c };
			playStep(piece.player);
			await wait(hopMs);
			const capAt = move.captured[i];
			if (capAt) {
				const taken = source[capAt.r][capAt.c];
				if (taken) {
					this.hidden = [...this.hidden, taken.id];
					this.fallKey += 1;
					this.falls = [
						...this.falls,
						{ id: taken.id, player: taken.player, king: taken.king, r: capAt.r, c: capAt.c, key: this.fallKey }
					];
					this.scorchKey += 1;
					const scorchId = this.scorchKey;
					this.scorches = [...this.scorches, { r: capAt.r, c: capAt.c, id: scorchId }];
					this.heat += 1;
					playFall(taken.player);
					window.setTimeout(() => {
						this.scorches = this.scorches.filter((mark) => mark.id !== scorchId);
					}, reduced ? 80 : 720);
					await wait(reduced ? 40 : 160);
				}
			}
		}
		if (move.crown && this.ghost) {
			this.ghost = { ...this.ghost, king: true };
			this.kindle += 1;
			playCrown(piece.player);
			await wait(reduced ? 80 : 420);
		}
		if (token !== this.turnToken) {
			this.animating = false;
			return;
		}
		const next = applyMove(source, move);
		this.board = next;
		this.lastMove = { from: move.from, to: move.to };
		this.ghost = null;
		this.hidden = [];
		window.setTimeout(() => {
			this.falls = this.falls.filter((fall) => fall.key > this.fallKey - 6);
		}, 720);
		const nextStatus = statusFor(next, opponent(piece.player));
		this.status = nextStatus;
		this.animating = false;
		if (nextStatus.type === 'won') {
			this.chaining = null;
			this.scores[nextStatus.winner] += 1;
			recordAshScore(this.mode, this.difficulty, { 1: this.scores[1], 2: this.scores[2] });
			writeSaved(null);
			playWin(nextStatus.winner);
			return;
		}
		const more = move.captured.length
			? movesFrom(next, piece.player, move.to).filter((hop) => hop.captured.length)
			: [];
		if (more.length) {
			this.chaining = move.to;
			this.selected = move.to;
			this.cursor = move.to;
			this.current = piece.player;
			this.turnPulse += 1;
			this.commitLive(next, this.current);
			if (this.mode === 'ai' && this.current === 2) void this.runAiTurn();
			return;
		}
		this.chaining = null;
		this.current = opponent(piece.player);
		this.cursor = { r: this.current === 1 ? 5 : 2, c: this.cursor.c };
		this.selected = null;
		this.turnPulse += 1;
		this.commitLive(next, this.current);
		if (this.mode === 'ai' && this.current === 2) void this.runAiTurn();
	}

	private persistLive() {
		writeSaved(this.captureSave());
	}

	private commitLive(board: ReturnType<typeof setupBoard>, current: Player) {
		writeSaved({
			mode: this.mode,
			difficulty: this.difficulty,
			board: cloneBoard(board),
			current,
			starter: this.starter
		});
	}

	private captureSave(): SavedMatch | null {
		if (this.status.type !== 'playing' || this.screen !== 'play') return null;
		return {
			mode: this.mode,
			difficulty: this.difficulty,
			board: cloneBoard(this.board),
			current: this.current,
			starter: this.starter
		};
	}
}

function prefersReduced() {
	return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function wait(ms: number) {
	return new Promise((resolve) => window.setTimeout(resolve, ms));
}
