import { chooseAiCell } from './ai';
import { playDraw, playMark, playSelect, playWash, playWin } from './audio';
import { applyMove, cloneBoard, createEmptyBoard, emptyCells, getStatus, isValidMove, opponent } from './engine';
import { peekSaved, peekTtt, scoresFor, writeSaved, type SavedMatch } from './persist';
import { persistTttPlay, recordTttScore, tttPlay } from './settings.svelte';
import type { Board, Difficulty, GameMode, GameStatus, Player, Screen } from './types';

export class TttSession {
	screen = $state<Screen>('menu');
	mode = $state<GameMode>(peekTtt().mode);
	difficulty = $state<Difficulty>(peekTtt().difficulty);
	board = $state(createEmptyBoard());
	current = $state<Player>(1);
	starter = $state<Player>(1);
	status = $state<GameStatus>({ type: 'playing' });
	scores = $state({ 1: 0, 2: 0 });
	aiThinking = $state(false);
	hover = $state<[number, number] | null>(null);
	selected = $state<[number, number]>([1, 1]);
	washing = $state(false);
	erasing = $state(false);
	gridHidden = $state(false);
	sketching = $state(false);
	gridToken = $state(1);
	private turnToken = 0;

	busy = $derived(
		this.washing ||
			this.gridHidden ||
			this.sketching ||
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
		this.washing = false;
		this.erasing = false;
		this.gridHidden = false;
		this.sketching = false;
		writeSaved(null);
		this.resetRound(false);
		this.gridToken = Math.floor(Math.random() * 0x7fffffff);
		void this.sketchBoard(this.turnToken);
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
		this.washing = false;
		this.erasing = false;
		this.gridHidden = false;
		this.sketching = false;
		this.hover = null;
		this.selected = [1, 1];
		this.screen = 'play';
		tttPlay.mode = saved.mode;
		tttPlay.difficulty = saved.difficulty;
		persistTttPlay();
		if (this.mode === 'ai' && this.current === 2) void this.runAiTurn();
		return true;
	}

	backToMenu() {
		this.turnToken += 1;
		this.aiThinking = false;
		this.washing = false;
		this.erasing = false;
		this.gridHidden = false;
		this.sketching = false;
		this.persistLive();
		this.screen = 'menu';
	}

	resetRound(advanceStarter = true) {
		if (advanceStarter) this.starter = opponent(this.starter);
		this.board = createEmptyBoard();
		this.current = this.starter;
		this.status = { type: 'playing' };
		this.aiThinking = false;
		this.hover = null;
		this.selected = [1, 1];
		writeSaved(null);
	}

	rematch() {
		if (this.screen !== 'play') return;
		if (this.washing || this.sketching || this.gridHidden) return;
		this.turnToken += 1;
		this.aiThinking = false;
		this.hover = null;
		void this.washAway(this.turnToken, true);
	}

	setHover(cell: [number, number] | null) {
		if (this.busy || (this.mode === 'ai' && this.current === 2)) return;
		this.hover = cell;
		if (cell) this.selected = cell;
	}

	nudge(dr: number, dc: number) {
		if (this.busy) return;
		const [row, col] = this.selected;
		this.selected = [(row + dr + 3) % 3, (col + dc + 3) % 3];
		this.hover = this.selected;
	}

	async playSelected() {
		await this.playCell(this.selected[0], this.selected[1]);
	}

	async playCell(row: number, col: number) {
		if (this.washing || this.aiThinking || this.status.type !== 'playing' || this.screen !== 'play') {
			return;
		}
		if (this.mode === 'ai' && this.current === 2) return;
		if (!isValidMove(this.board, row, col)) return;
		await this.mark(row, col, this.current);
		if (this.status.type === 'playing' && this.mode === 'ai' && this.current === 2) {
			await this.runAiTurn();
		}
	}

	private async runAiTurn() {
		const token = this.turnToken;
		this.aiThinking = true;
		this.hover = null;
		const [row, col] = chooseAiCell(this.board, 2, this.difficulty);
		const reduced =
			typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const hops = reduced ? 0 : this.difficulty === 'hard' ? 5 : 4;
		const open = emptyCells(this.board);
		let last: [number, number] | null = null;
		for (let i = 0; i < hops; i += 1) {
			if (token !== this.turnToken || this.screen !== 'play') {
				this.aiThinking = false;
				return;
			}
			const pool = open.filter(([r, c]) => !last || r !== last[0] || c !== last[1]);
			const pick = pool.length ? pool : open;
			const cursor = pick[Math.floor(Math.random() * pick.length)] ?? [row, col];
			last = cursor;
			this.hover = cursor;
			this.selected = cursor;
			playSelect();
			await wait(this.difficulty === 'hard' ? 300 + Math.random() * 90 : 240 + Math.random() * 80);
		}
		if (token !== this.turnToken || this.screen !== 'play' || this.status.type !== 'playing') {
			this.aiThinking = false;
			return;
		}
		this.hover = [row, col];
		this.selected = [row, col];
		await wait(reduced ? 80 : 560);
		if (token !== this.turnToken || this.screen !== 'play') {
			this.aiThinking = false;
			return;
		}
		this.aiThinking = false;
		this.hover = null;
		await this.mark(row, col, 2);
	}

	private async mark(row: number, col: number, player: Player) {
		const board = applyMove(this.board, row, col, player);
		this.board = board;
		playMark(player);
		const nextStatus = getStatus(board);
		this.status = nextStatus;
		this.selected = [row, col];

		if (nextStatus.type === 'won') {
			this.scores[nextStatus.winner] += 1;
			recordTttScore(this.mode, this.difficulty, { 1: this.scores[1], 2: this.scores[2] });
			writeSaved(null);
			playWin();
			return;
		}
		if (nextStatus.type === 'draw') {
			writeSaved(null);
			playDraw();
			return;
		}

		this.current = opponent(player);
		this.commitLive(board, this.current);
	}

	private async washAway(token: number, immediate = false) {
		const reduced =
			typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (!immediate) await wait(reduced ? 360 : 1100);
		if (token !== this.turnToken || this.screen !== 'play') return;
		this.washing = true;
		playWash();
		await wait(reduced ? 520 : 1650);
		if (token !== this.turnToken || this.screen !== 'play') {
			this.washing = false;
			return;
		}
		this.erasing = true;
		this.gridHidden = true;
		this.resetRound(true);
		await wait(reduced ? 280 : 480);
		if (token !== this.turnToken) {
			this.washing = false;
			this.erasing = false;
			this.gridHidden = false;
			return;
		}
		this.washing = false;
		this.erasing = false;
		await wait(reduced ? 450 : 1500);
		if (token !== this.turnToken || this.screen !== 'play') {
			this.gridHidden = false;
			return;
		}
		this.gridToken = Math.floor(Math.random() * 0x7fffffff);
		this.gridHidden = false;
		await this.sketchBoard(token);
	}

	private async sketchBoard(token: number) {
		this.sketching = true;
		playMark(1);
		const reduced =
			typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		await wait(reduced ? 120 : 420);
		if (token === this.turnToken && this.screen === 'play') playMark(1);
		await wait(reduced ? 80 : 780);
		if (token !== this.turnToken) {
			this.sketching = false;
			return;
		}
		this.sketching = false;
		if (this.mode === 'ai' && this.current === 2) void this.runAiTurn();
	}

	private persistLive() {
		writeSaved(this.captureSave());
	}

	private commitLive(board: Board, current: Player) {
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
		if (this.board.every((row) => row.every((cell) => cell === 0))) return null;
		return {
			mode: this.mode,
			difficulty: this.difficulty,
			board: cloneBoard(this.board),
			current: this.current,
			starter: this.starter
		};
	}
}

function wait(ms: number) {
	return new Promise((resolve) => window.setTimeout(resolve, ms));
}
