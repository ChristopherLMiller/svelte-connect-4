import { COLS, ROWS, type Board, type Cell, type GameStatus, type Player, type ThreatCell, type WinResult } from './types';

export function createEmptyBoard(): Board {
	return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => 0 as Cell));
}

export function cloneBoard(board: Board): Board {
	return board.map((row) => row.slice()) as Board;
}

export function getNextRow(board: Board, col: number): number {
	if (col < 0 || col >= COLS) return -1;
	for (let row = ROWS - 1; row >= 0; row -= 1) {
		if (board[row][col] === 0) return row;
	}
	return -1;
}

export function isValidMove(board: Board, col: number): boolean {
	return getNextRow(board, col) !== -1;
}

export function getValidColumns(board: Board): number[] {
	const cols: number[] = [];
	for (let col = 0; col < COLS; col += 1) {
		if (isValidMove(board, col)) cols.push(col);
	}
	return cols;
}

export function applyMove(board: Board, col: number, player: Player): { board: Board; row: number } {
	const row = getNextRow(board, col);
	if (row === -1) {
		throw new Error(`Illegal move: column ${col} is full or out of range`);
	}
	const next = cloneBoard(board);
	next[row][col] = player;
	return { board: next, row };
}

const DIRECTIONS: Array<[number, number]> = [
	[0, 1],
	[1, 0],
	[1, 1],
	[1, -1]
];

export function findWin(board: Board): WinResult | null {
	for (let row = 0; row < ROWS; row += 1) {
		for (let col = 0; col < COLS; col += 1) {
			const player = board[row][col];
			if (player === 0) continue;

			for (const [dr, dc] of DIRECTIONS) {
				const cells: Array<[number, number]> = [[row, col]];
				for (let step = 1; step < 4; step += 1) {
					const r = row + dr * step;
					const c = col + dc * step;
					if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== player) {
						break;
					}
					cells.push([r, c]);
				}
				if (cells.length === 4) {
					return { winner: player, cells };
				}
			}
		}
	}
	return null;
}

export function isBoardFull(board: Board): boolean {
	return board[0].every((cell) => cell !== 0);
}

export function getStatus(board: Board): GameStatus {
	const win = findWin(board);
	if (win) return { type: 'won', winner: win.winner, cells: win.cells };
	if (isBoardFull(board)) return { type: 'draw' };
	return { type: 'playing' };
}

export function opponent(player: Player): Player {
	return player === 1 ? 2 : 1;
}

export function isWinningMove(board: Board, col: number, player: Player): boolean {
	if (!isValidMove(board, col)) return false;
	return findWin(applyMove(board, col, player).board)?.winner === player;
}

export function isBlockMove(board: Board, col: number, player: Player): boolean {
	return isWinningMove(board, col, opponent(player));
}

export function findThreatCells(board: Board, player: Player): ThreatCell[] {
	const cells: ThreatCell[] = [];
	for (const col of getValidColumns(board)) {
		if (!isWinningMove(board, col, player)) continue;
		const row = getNextRow(board, col);
		if (row !== -1) cells.push({ col, row });
	}
	return cells;
}
