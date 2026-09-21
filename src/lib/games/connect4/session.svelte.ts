import { chooseAiColumn } from './ai';
import { playBlock, playBounce, playDraw, playDrop, playHover, playInvalid, playWin } from './audio';
import {
	applyMove,
	cloneBoard,
	createEmptyBoard,
	findThreatCells,
	getNextRow,
	getStatus,
	getValidColumns,
	isBlockMove,
	isValidMove,
	opponent
} from './engine';
import { animateDrop } from './physics';
import { computeLayout, discY } from './layout';
import { persistSettings, playSettings } from './settings.svelte';
import {
	boardHasMoves,
	flushPrefs,
	peekPrefs,
	peekSavedGame,
	scoresFor,
	writeSavedGame,
	writeScores,
	type SavedGame
} from './persist';
import { COLS, ROWS, type Board, type Difficulty, type FxBurst, type GameMode, type GameStatus, type Piece, type Player, type Screen } from './types';

let nextPieceId = 1;

export class GameSession {
	screen = $state<Screen>('menu');
	mode = $state<GameMode>(peekPrefs().mode);
	difficulty = $state<Difficulty>(peekPrefs().difficulty);
	board = $state(createEmptyBoard());
	current = $state<Player>(1);
	starter = $state<Player>(1);
	status = $state<GameStatus>({ type: 'playing' });
	pieces = $state<Piece[]>([]);
	scores = $state({ 1: 0, 2: 0 });
	animating = $state(false);
	aiThinking = $state(false);
	hoverCol = $state<number | null>(null);
	selectedCol = $state(3);
	invalidCol = $state<number | null>(null);
	shake = $state(0);
	flash = $state(0);
	fx = $state<FxBurst[]>([]);
	private turnToken = 0;
	measureY: (row: number) => { startY: number; targetY: number } = () => ({ startY: 0, targetY: 180 });

	busy = $derived(this.animating || this.aiThinking || this.status.type !== 'playing');
	killShots = $derived(
		this.status.type === 'playing' && !this.animating ? findThreatCells(this.board, this.current) : []
	);
	dangerShots = $derived(
		this.status.type === 'playing' && !this.animating
			? findThreatCells(this.board, opponent(this.current))
			: []
	);

	bindMeasure(fn: (row: number) => { startY: number; targetY: number }) {
		this.measureY = fn;
		for (const piece of this.pieces) {
			if (!piece.settled) continue;
			const y = fn(piece.row).targetY;
			if (piece.y !== y) piece.y = y;
		}
	}

	start(mode: GameMode, difficulty: Difficulty = 'medium') {
		this.mode = mode;
		this.difficulty = difficulty;
		this.scores = scoresFor(mode, difficulty);
		this.starter = 1;
		this.screen = 'play';
		writeSavedGame(null);
		this.resetRound(false);
	}

	resume() {
		const saved = peekSavedGame();
		if (!saved) return false;
		this.turnToken += 1;
		this.mode = saved.mode;
		this.difficulty = saved.difficulty;
		this.scores = scoresFor(saved.mode, saved.difficulty);
		this.starter = saved.starter;
		this.board = cloneBoard(saved.board);
		this.current = saved.current;
		this.status = { type: 'playing' };
		this.pieces = piecesFromBoard(this.board);
		this.fx = [];
		this.animating = false;
		this.aiThinking = false;
		this.invalidCol = null;
		this.selectedCol = saved.selectedCol;
		this.hoverCol = null;
		this.shake = 0;
		this.flash = 0;
		this.screen = 'play';
		playSettings.mode = saved.mode;
		playSettings.difficulty = saved.difficulty;
		persistSettings();
		if (this.mode === 'ai' && this.current === 2) void this.runAiTurn();
		return true;
	}

	backToMenu() {
		this.turnToken += 1;
		this.aiThinking = false;
		this.animating = false;
		this.persistLive(true);
		this.screen = 'menu';
	}

	resetRound(advanceStarter = true) {
		this.turnToken += 1;
		if (advanceStarter) this.starter = opponent(this.starter);
		this.board = createEmptyBoard();
		this.current = this.starter;
		this.status = { type: 'playing' };
		this.pieces = [];
		this.fx = [];
		this.animating = false;
		this.aiThinking = false;
		this.invalidCol = null;
		this.selectedCol = 3;
		this.hoverCol = null;
		this.shake = 0;
		this.flash = 0;
		writeSavedGame(null);

		if (this.mode === 'ai' && this.current === 2) {
			void this.runAiTurn();
		}
	}

	setHover(col: number | null) {
		if (this.busy || (this.mode === 'ai' && this.current === 2)) return;
		this.hoverCol = col;
		if (col !== null) this.selectedCol = col;
	}

	nudgeSelection(delta: number) {
		if (this.busy) return;
		this.selectedCol = (this.selectedCol + delta + 7) % 7;
		this.hoverCol = this.selectedCol;
	}

	async playSelected() {
		await this.playColumn(this.selectedCol);
	}

	async playColumn(col: number) {
		if (this.animating || this.status.type !== 'playing') return;
		if (this.mode === 'ai' && this.current === 2) return;

		if (!isValidMove(this.board, col)) {
			this.flashInvalid(col);
			return;
		}

		await this.drop(col, this.current);

		if (this.status.type === 'playing' && this.mode === 'ai' && this.current === 2) {
			await this.runAiTurn();
		}
	}

	private async runAiTurn() {
		const token = this.turnToken;
		this.aiThinking = true;
		this.hoverCol = null;
		const col = chooseAiColumn(this.board, 2, this.difficulty);
		const reduced =
			typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		if (reduced) {
			const thinkFor = this.difficulty === 'hard' ? 520 : this.difficulty === 'medium' ? 380 : 260;
			await wait(thinkFor);
		} else {
			const valid = getValidColumns(this.board);
			const hops = this.difficulty === 'hard' ? 7 : this.difficulty === 'medium' ? 5 : 4;
			let cursor = valid[Math.floor(Math.random() * Math.max(1, valid.length))] ?? col;
			for (let i = 0; i < hops; i += 1) {
				if (token !== this.turnToken || this.screen !== 'play') {
					this.aiThinking = false;
					return;
				}
				if (valid.length > 0) {
					const step = 1 + Math.floor(Math.random() * Math.max(1, valid.length - 1));
					cursor = valid[(valid.indexOf(cursor) + step) % valid.length] ?? col;
				}
				this.hoverCol = cursor;
				this.selectedCol = cursor;
				playHover();
				await wait(150 + Math.random() * 80);
			}
			this.hoverCol = col;
			this.selectedCol = col;
			playHover();
			await wait(this.difficulty === 'hard' ? 520 : this.difficulty === 'medium' ? 420 : 320);
		}

		if (token !== this.turnToken || this.screen !== 'play' || this.status.type !== 'playing') {
			this.aiThinking = false;
			return;
		}
		this.selectedCol = col;
		this.aiThinking = false;
		this.hoverCol = null;
		await this.drop(col, 2);
	}

	private async drop(col: number, player: Player) {
		const token = this.turnToken;
		const blocked = isBlockMove(this.board, col, player);
		const row = getNextRow(this.board, col);
		if (row === -1) {
			this.flashInvalid(col);
			return;
		}

		const { board } = applyMove(this.board, col, player);
		this.board = board;
		this.commitMove(board, player);
		this.animating = true;
		this.hoverCol = null;

		const { startY, targetY } = this.measureY(row);
		const piece: Piece = {
			id: nextPieceId++,
			player,
			col,
			row,
			y: startY,
			scaleX: 1,
			scaleY: 1.08,
			vy: 40,
			settled: false,
			winning: false
		};
		this.pieces.push(piece);
		const live = this.pieces[this.pieces.length - 1];
		if (!live) return;
		playDrop();

		await animateDrop(
			startY,
			targetY,
			(frame) => {
				live.y = frame.y;
				live.vy = frame.vy;
				live.scaleX = frame.scaleX;
				live.scaleY = frame.scaleY;
				live.settled = frame.settled;
			},
			(impact) => {
				playBounce(impact);
				this.shake = Math.min(14, 4 + impact * 14);
				const reduced =
					typeof window !== 'undefined' &&
					window.matchMedia('(prefers-reduced-motion: reduce)').matches;
				if (reduced) return;
				this.flash = Math.min(1, 0.22 + impact * 0.9);
				this.spawnFx('impact', col, row, player, impact);
			}
		);

		if (token !== this.turnToken) return;

		live.y = targetY;
		live.scaleX = 1;
		live.scaleY = 1;
		live.vy = 0;
		live.settled = true;
		this.shake = 0;
		this.flash = Math.max(this.flash, 0.12);

		const nextStatus = getStatus(this.board);
		this.status = nextStatus;

		if (nextStatus.type === 'won') {
			const winning = new Set(nextStatus.cells.map(([r, c]) => `${r}:${c}`));
			for (const disc of this.pieces) {
				disc.winning = winning.has(`${disc.row}:${disc.col}`);
			}
			this.scores[nextStatus.winner] += 1;
			writeScores(this.mode, this.difficulty, { 1: this.scores[1], 2: this.scores[2] });
			writeSavedGame(null);
			flushPrefs();
			this.spawnFx('win', col, row, player);
			playWin();
		} else if (nextStatus.type === 'draw') {
			writeSavedGame(null);
			flushPrefs();
			playDraw();
		} else {
			if (blocked) {
				this.spawnFx('block', col, row, player);
				playBlock();
				this.shake = 10;
			}
			this.current = opponent(player);
		}

		this.animating = false;
	}

	private spawnFx(kind: FxBurst['kind'], col: number, row: number, player: Player, impact = 0) {
		const burst: FxBurst = { id: nextPieceId++, kind, col, row, player, impact };
		this.fx.push(burst);
		window.setTimeout(
			() => {
				this.fx = this.fx.filter((item) => item.id !== burst.id);
			},
			kind === 'impact' ? 520 : 1100
		);
	}

	private flashInvalid(col: number) {
		this.invalidCol = col;
		this.shake = 6;
		playInvalid();
		window.setTimeout(() => {
			if (this.invalidCol === col) this.invalidCol = null;
			this.shake = 0;
		}, 280);
	}

	private persistLive(flush = false) {
		writeSavedGame(this.captureSave());
		if (flush) flushPrefs();
	}

	private commitMove(board: Board, player: Player) {
		const nextStatus = getStatus(board);
		if (nextStatus.type !== 'playing') {
			writeSavedGame(null);
			flushPrefs();
			return;
		}
		writeSavedGame({
			mode: this.mode,
			difficulty: this.difficulty,
			board: cloneBoard(board),
			current: opponent(player),
			starter: this.starter,
			selectedCol: this.selectedCol
		});
		flushPrefs();
	}

	private captureSave(): SavedGame | null {
		if (this.status.type !== 'playing' || !boardHasMoves(this.board)) return null;
		return {
			mode: this.mode,
			difficulty: this.difficulty,
			board: cloneBoard(this.board),
			current: this.current,
			starter: this.starter,
			selectedCol: this.selectedCol
		};
	}
}

function piecesFromBoard(board: Board): Piece[] {
	const layout = computeLayout(960, 760);
	const pieces: Piece[] = [];
	for (let row = 0; row < ROWS; row += 1) {
		for (let col = 0; col < COLS; col += 1) {
			const player = board[row][col];
			if (player === 0) continue;
			pieces.push({
				id: nextPieceId++,
				player,
				col,
				row,
				y: discY(layout, row),
				scaleX: 1,
				scaleY: 1,
				vy: 0,
				settled: true,
				winning: false
			});
		}
	}
	return pieces;
}

function wait(ms: number) {
	return new Promise((resolve) => window.setTimeout(resolve, ms));
}
