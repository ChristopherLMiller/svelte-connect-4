import { SIZE, type Board, type Cell, type GameStatus, type Player } from './types';

const LINES: Array<Array<[number, number]>> = [
	[
		[0, 0],
		[0, 1],
		[0, 2]
	],
	[
		[1, 0],
		[1, 1],
		[1, 2]
	],
	[
		[2, 0],
		[2, 1],
		[2, 2]
	],
	[
		[0, 0],
		[1, 0],
		[2, 0]
	],
	[
		[0, 1],
		[1, 1],
		[2, 1]
	],
	[
		[0, 2],
		[1, 2],
		[2, 2]
	],
	[
		[0, 0],
		[1, 1],
		[2, 2]
	],
	[
		[0, 2],
		[1, 1],
		[2, 0]
	]
];

export function createEmptyBoard(): Board {
	return Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => 0 as Cell));
}

export function cloneBoard(board: Board): Board {
	return board.map((row) => row.slice());
}

export function opponent(player: Player): Player {
	return player === 1 ? 2 : 1;
}

export function isValidMove(board: Board, row: number, col: number) {
	return row >= 0 && row < SIZE && col >= 0 && col < SIZE && board[row][col] === 0;
}

export function emptyCells(board: Board): Array<[number, number]> {
	const cells: Array<[number, number]> = [];
	for (let row = 0; row < SIZE; row += 1) {
		for (let col = 0; col < SIZE; col += 1) {
			if (board[row][col] === 0) cells.push([row, col]);
		}
	}
	return cells;
}

export function applyMove(board: Board, row: number, col: number, player: Player): Board {
	const next = cloneBoard(board);
	next[row][col] = player;
	return next;
}

export function getStatus(board: Board): GameStatus {
	for (const line of LINES) {
		const [a, b, c] = line;
		const mark = board[a[0]][a[1]];
		if (mark !== 0 && mark === board[b[0]][b[1]] && mark === board[c[0]][c[1]]) {
			return { type: 'won', winner: mark, cells: line };
		}
	}
	if (emptyCells(board).length === 0) return { type: 'draw' };
	return { type: 'playing' };
}

export function boardHasMoves(board: Board) {
	return board.some((row) => row.some((cell) => cell !== 0));
}
