import { COLS, ROWS, type Board, type Difficulty, type Player } from './types';

const DEPTH: Record<Difficulty, number> = {
	easy: 2,
	medium: 4,
	hard: 6
};

const WINDOW_SCORE = [0, 1, 12, 70, 1_000_000];
const WIN = 900_000;
const ORDER = [3, 2, 4, 1, 5, 0, 6];

/** Every four-in-a-row window on the board as flat cell indices (row * COLS + col). */
const WINDOWS = (() => {
	const list: number[] = [];
	const add = (r: number, c: number, dr: number, dc: number) => {
		for (let i = 0; i < 4; i += 1) list.push((r + dr * i) * COLS + c + dc * i);
	};
	for (let r = 0; r < ROWS; r += 1) for (let c = 0; c < COLS - 3; c += 1) add(r, c, 0, 1);
	for (let c = 0; c < COLS; c += 1) for (let r = 0; r < ROWS - 3; r += 1) add(r, c, 1, 0);
	for (let r = 0; r < ROWS - 3; r += 1) for (let c = 0; c < COLS - 3; c += 1) add(r, c, 1, 1);
	for (let r = 3; r < ROWS; r += 1) for (let c = 0; c < COLS - 3; c += 1) add(r, c, -1, 1);
	return Int8Array.from(list);
})();

/** Mutable search position: flat cells plus the next open row per column (-1 when full). */
type Position = { cells: Int8Array; next: Int8Array };

function toPosition(board: Board): Position {
	const cells = new Int8Array(ROWS * COLS);
	const next = new Int8Array(COLS).fill(-1);
	for (let r = 0; r < ROWS; r += 1) {
		for (let c = 0; c < COLS; c += 1) {
			cells[r * COLS + c] = board[r][c];
			if (board[r][c] === 0) next[c] = r;
		}
	}
	return { cells, next };
}

function play(pos: Position, col: number, player: Player) {
	const row = pos.next[col];
	pos.cells[row * COLS + col] = player;
	pos.next[col] = row - 1;
}

function undo(pos: Position, col: number) {
	const row = pos.next[col] + 1;
	pos.cells[row * COLS + col] = 0;
	pos.next[col] = row;
}

export function chooseAiColumn(board: Board, player: Player, difficulty: Difficulty): number {
	const pos = toPosition(board);
	const valid = ORDER.filter((col) => pos.next[col] >= 0).sort((a, b) => a - b);
	if (valid.length === 0) return 0;

	const instant = findImmediate(pos, player, valid);
	if (instant !== null && difficulty !== 'easy') return instant;

	if (difficulty === 'easy' && Math.random() < 0.45) {
		return valid[Math.floor(Math.random() * valid.length)];
	}

	let bestCol = valid[0];
	let bestScore = Number.NEGATIVE_INFINITY;

	for (const col of ORDER) {
		if (pos.next[col] < 0) continue;
		play(pos, col, player);
		const score = minimax(pos, DEPTH[difficulty] - 1, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, false, player);
		undo(pos, col);
		const jitter = difficulty === 'easy' ? Math.random() * 18 : difficulty === 'medium' ? Math.random() * 4 : 0;
		const total = score + jitter;
		if (total > bestScore) {
			bestScore = total;
			bestCol = col;
		}
	}

	return bestCol;
}

function findImmediate(pos: Position, player: Player, valid: number[]): number | null {
	for (const who of [player, player === 1 ? 2 : 1] as Player[]) {
		for (const col of valid) {
			play(pos, col, who);
			const won = scoreBoard(pos.cells, who) >= WIN;
			undo(pos, col);
			if (won) return col;
		}
	}
	return null;
}

function minimax(pos: Position, depth: number, alpha: number, beta: number, maximizing: boolean, ai: Player): number {
	const score = scoreBoard(pos.cells, ai);
	if (depth === 0 || Math.abs(score) >= WIN) return score;

	const mover: Player = maximizing ? ai : ai === 1 ? 2 : 1;
	let value = maximizing ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
	let moved = false;

	for (const col of ORDER) {
		if (pos.next[col] < 0) continue;
		moved = true;
		play(pos, col, mover);
		const child = minimax(pos, depth - 1, alpha, beta, !maximizing, ai);
		undo(pos, col);
		if (maximizing) {
			if (child > value) value = child;
			if (value > alpha) alpha = value;
		} else {
			if (child < value) value = child;
			if (value < beta) beta = value;
		}
		if (alpha >= beta) break;
	}

	return moved ? value : 0;
}

function scoreBoard(cells: Int8Array, player: Player): number {
	const foe = player === 1 ? 2 : 1;
	let score = 0;

	for (let r = 0; r < ROWS; r += 1) {
		const cell = cells[r * COLS + 3];
		if (cell === player) score += 6;
		else if (cell === foe) score -= 6;
	}

	for (let w = 0; w < WINDOWS.length; w += 4) {
		let mine = 0;
		let theirs = 0;
		for (let i = 0; i < 4; i += 1) {
			const cell = cells[WINDOWS[w + i]];
			if (cell === player) mine += 1;
			else if (cell === foe) theirs += 1;
		}
		if (mine > 0 && theirs > 0) continue;
		if (mine === 4) score += WINDOW_SCORE[4];
		else if (theirs === 4) score -= WINDOW_SCORE[4];
		else if (mine > 0) score += WINDOW_SCORE[mine];
		else if (theirs === 3) score -= 90;
		else if (theirs > 0) score -= WINDOW_SCORE[theirs] * 0.9;
	}

	return score;
}
