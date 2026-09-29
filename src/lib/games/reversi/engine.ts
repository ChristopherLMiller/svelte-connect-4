import { MOON, SUN, opponent, type Board, type FlipLine, type GameStatus, type MoveResult, type Player } from './types';

const DIRS: Array<[number, number]> = [
	[-1, -1],
	[-1, 0],
	[-1, 1],
	[0, -1],
	[0, 1],
	[1, -1],
	[1, 0],
	[1, 1]
];

export function setupBoard(): Board {
	const board = new Int8Array(64);
	board[27] = SUN;
	board[36] = SUN;
	board[28] = MOON;
	board[35] = MOON;
	return board;
}

export function cloneBoard(board: Board): Board {
	return new Int8Array(board);
}

/** Opponent discs that `player` would turn by placing at `index`, one line per direction. */
export function flipLines(board: Board, index: number, player: Player): FlipLine[] {
	if (board[index] !== 0) return [];
	const foe = opponent(player);
	const r0 = index >> 3;
	const c0 = index & 7;
	const lines: FlipLine[] = [];
	for (const [dr, dc] of DIRS) {
		let r = r0 + dr;
		let c = c0 + dc;
		const run: number[] = [];
		while (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r * 8 + c] === foe) {
			run.push(r * 8 + c);
			r += dr;
			c += dc;
		}
		if (run.length && r >= 0 && r < 8 && c >= 0 && c < 8 && board[r * 8 + c] === player) lines.push(run);
	}
	return lines;
}

export function isLegal(board: Board, index: number, player: Player): boolean {
	if (board[index] !== 0) return false;
	const foe = opponent(player);
	const r0 = index >> 3;
	const c0 = index & 7;
	for (const [dr, dc] of DIRS) {
		let r = r0 + dr;
		let c = c0 + dc;
		let seen = false;
		while (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r * 8 + c] === foe) {
			seen = true;
			r += dr;
			c += dc;
		}
		if (seen && r >= 0 && r < 8 && c >= 0 && c < 8 && board[r * 8 + c] === player) return true;
	}
	return false;
}

export function legalMoves(board: Board, player: Player): number[] {
	const moves: number[] = [];
	for (let i = 0; i < 64; i += 1) if (isLegal(board, i, player)) moves.push(i);
	return moves;
}

export function hasMove(board: Board, player: Player): boolean {
	for (let i = 0; i < 64; i += 1) if (isLegal(board, i, player)) return true;
	return false;
}

export function applyMove(board: Board, index: number, player: Player): MoveResult | null {
	const lines = flipLines(board, index, player);
	if (!lines.length) return null;
	const next = cloneBoard(board);
	next[index] = player;
	let flipped = 0;
	for (const line of lines) {
		for (const cell of line) next[cell] = player;
		flipped += line.length;
	}
	return { board: next, lines, flipped };
}

export function counts(board: Board): { 1: number; 2: number; empty: number } {
	let moon = 0;
	let sun = 0;
	for (let i = 0; i < 64; i += 1) {
		if (board[i] === MOON) moon += 1;
		else if (board[i] === SUN) sun += 1;
	}
	return { 1: moon, 2: sun, empty: 64 - moon - sun };
}

/** The game ends when neither side can move; most discs wins. */
export function statusOf(board: Board): GameStatus {
	if (hasMove(board, MOON) || hasMove(board, SUN)) return { type: 'playing' };
	const tally = counts(board);
	if (tally[1] === tally[2]) return { type: 'draw' };
	return { type: 'won', winner: tally[1] > tally[2] ? MOON : SUN };
}

/** Who moves after `player`: the opponent if they can, else `player` again, else nobody. */
export function nextToMove(board: Board, player: Player): Player | null {
	const foe = opponent(player);
	if (hasMove(board, foe)) return foe;
	if (hasMove(board, player)) return player;
	return null;
}
