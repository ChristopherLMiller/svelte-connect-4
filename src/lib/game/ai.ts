import { applyMove, getValidColumns, opponent } from './engine';
import { COLS, ROWS, type Board, type Cell, type Difficulty, type Player } from './types';

const DEPTH: Record<Difficulty, number> = {
	easy: 2,
	medium: 4,
	hard: 6
};

const WINDOW_SCORE = [0, 1, 12, 70, 1_000_000];

export function chooseAiColumn(board: Board, player: Player, difficulty: Difficulty): number {
	const valid = getValidColumns(board);
	if (valid.length === 0) return 0;

	const instant = findImmediate(board, player, valid);
	if (instant !== null && difficulty !== 'easy') return instant;

	if (difficulty === 'easy' && Math.random() < 0.45) {
		return valid[Math.floor(Math.random() * valid.length)];
	}

	let bestCol = valid[0];
	let bestScore = Number.NEGATIVE_INFINITY;
	const ordered = orderColumns(valid);

	for (const col of ordered) {
		const next = applyMove(board, col, player).board;
		const score = minimax(next, DEPTH[difficulty] - 1, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, false, player);
		const jitter = difficulty === 'easy' ? Math.random() * 18 : difficulty === 'medium' ? Math.random() * 4 : 0;
		const total = score + jitter;
		if (total > bestScore) {
			bestScore = total;
			bestCol = col;
		}
	}

	return bestCol;
}

function findImmediate(board: Board, player: Player, valid: number[]): number | null {
	for (const col of valid) {
		if (scoreBoard(applyMove(board, col, player).board, player) >= 900_000) return col;
	}
	const foe = opponent(player);
	for (const col of valid) {
		if (scoreBoard(applyMove(board, col, foe).board, foe) >= 900_000) return col;
	}
	return null;
}

function minimax(
	board: Board,
	depth: number,
	alpha: number,
	beta: number,
	maximizing: boolean,
	ai: Player
): number {
	const score = scoreBoard(board, ai);
	if (depth === 0 || Math.abs(score) >= 900_000) return score;

	const valid = orderColumns(getValidColumns(board));
	if (valid.length === 0) return 0;

	if (maximizing) {
		let value = Number.NEGATIVE_INFINITY;
		for (const col of valid) {
			value = Math.max(value, minimax(applyMove(board, col, ai).board, depth - 1, alpha, beta, false, ai));
			alpha = Math.max(alpha, value);
			if (alpha >= beta) break;
		}
		return value;
	}

	const foe = opponent(ai);
	let value = Number.POSITIVE_INFINITY;
	for (const col of valid) {
		value = Math.min(value, minimax(applyMove(board, col, foe).board, depth - 1, alpha, beta, true, ai));
		beta = Math.min(beta, value);
		if (alpha >= beta) break;
	}
	return value;
}

function orderColumns(cols: number[]): number[] {
	return [...cols].sort((a, b) => Math.abs(a - 3) - Math.abs(b - 3));
}

function scoreBoard(board: Board, player: Player): number {
	const foe = opponent(player);
	let score = 0;

	for (let row = 0; row < ROWS; row += 1) {
		if (board[row][3] === player) score += 6;
		else if (board[row][3] === foe) score -= 6;
	}

	for (let row = 0; row < ROWS; row += 1) {
		for (let col = 0; col < COLS - 3; col += 1) {
			score += scoreWindow([board[row][col], board[row][col + 1], board[row][col + 2], board[row][col + 3]], player, foe);
		}
	}

	for (let col = 0; col < COLS; col += 1) {
		for (let row = 0; row < ROWS - 3; row += 1) {
			score += scoreWindow([board[row][col], board[row + 1][col], board[row + 2][col], board[row + 3][col]], player, foe);
		}
	}

	for (let row = 0; row < ROWS - 3; row += 1) {
		for (let col = 0; col < COLS - 3; col += 1) {
			score += scoreWindow(
				[board[row][col], board[row + 1][col + 1], board[row + 2][col + 2], board[row + 3][col + 3]],
				player,
				foe
			);
		}
	}

	for (let row = 3; row < ROWS; row += 1) {
		for (let col = 0; col < COLS - 3; col += 1) {
			score += scoreWindow(
				[board[row][col], board[row - 1][col + 1], board[row - 2][col + 2], board[row - 3][col + 3]],
				player,
				foe
			);
		}
	}

	return score;
}

function scoreWindow(window: Cell[], player: Player, foe: Player): number {
	const mine = window.filter((cell) => cell === player).length;
	const theirs = window.filter((cell) => cell === foe).length;
	const empty = window.filter((cell) => cell === 0).length;

	if (mine > 0 && theirs > 0) return 0;
	if (mine === 4) return WINDOW_SCORE[4];
	if (theirs === 4) return -WINDOW_SCORE[4];
	if (mine > 0 && empty === 4 - mine) return WINDOW_SCORE[mine];
	if (theirs === 3 && empty === 1) return -90;
	if (theirs > 0 && empty === 4 - theirs) return -WINDOW_SCORE[theirs] * 0.9;
	return 0;
}
