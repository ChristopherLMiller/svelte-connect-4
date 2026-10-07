import { PITS, SIZE, STORE, type GameStatus, type Player } from './types';

export type Board = number[];

export type Capture = { pit: number; opposite: number; taken: number };
export type Sweep = { pit: number; count: number; store: number };

export type SowResult = {
	board: Board;
	/** Every pit or store a seed landed in, in order. */
	path: number[];
	capture: Capture | null;
	/** Last seed landed in the sower's own store. */
	extra: boolean;
	/** One side ran dry; whatever was left went home to each owner's store. */
	sweep: Sweep[];
	finished: boolean;
};

export function createBoard(seeds: number): Board {
	const board = new Array<number>(SIZE).fill(seeds);
	board[STORE[1]] = 0;
	board[STORE[2]] = 0;
	return board;
}

export function pitsOf(player: Player): number[] {
	return player === 1 ? [0, 1, 2, 3, 4, 5] : [7, 8, 9, 10, 11, 12];
}

export function ownerOf(index: number): Player | 0 {
	if (index >= 0 && index < PITS) return 1;
	if (index > PITS && index < STORE[2]) return 2;
	return 0;
}

export const opposite = (pit: number) => 12 - pit;

export function isStore(index: number) {
	return index === STORE[1] || index === STORE[2];
}

export function legalMoves(board: Board, player: Player): number[] {
	return pitsOf(player).filter((pit) => board[pit] > 0);
}

/** Pits a sowing from `pit` would visit, without changing anything. */
export function sowPath(board: Board, pit: number, player: Player): number[] {
	const skip = STORE[player === 1 ? 2 : 1];
	const path: number[] = [];
	let at = pit;
	for (let left = board[pit]; left > 0; left -= 1) {
		at = (at + 1) % SIZE;
		if (at === skip) at = (at + 1) % SIZE;
		path.push(at);
	}
	return path;
}

function sideSum(board: Board, player: Player) {
	let sum = 0;
	for (const pit of pitsOf(player)) sum += board[pit];
	return sum;
}

/**
 * Kalah: lift every seed from one of your pits and sow them one by one counterclockwise,
 * skipping your rival's store. Last seed in your store sows again; last seed in an empty pit
 * of your own captures it with everything opposite. When either row empties, each side's
 * leftovers go to its owner.
 */
export function sow(board: Board, pit: number, player: Player): SowResult | null {
	if (ownerOf(pit) !== player || !board[pit]) return null;
	const next = board.slice();
	const path = sowPath(board, pit, player);
	next[pit] = 0;
	for (const at of path) next[at] += 1;
	const last = path[path.length - 1];
	const own = STORE[player];
	let capture: Capture | null = null;
	if (ownerOf(last) === player && next[last] === 1 && next[opposite(last)] > 0) {
		const opp = opposite(last);
		capture = { pit: last, opposite: opp, taken: next[opp] + 1 };
		next[own] += next[opp] + 1;
		next[opp] = 0;
		next[last] = 0;
	}
	const sweep: Sweep[] = [];
	const finished = sideSum(next, 1) === 0 || sideSum(next, 2) === 0;
	if (finished) {
		for (const side of [1, 2] as Player[]) {
			for (const p of pitsOf(side)) {
				if (!next[p]) continue;
				sweep.push({ pit: p, count: next[p], store: STORE[side] });
				next[STORE[side]] += next[p];
				next[p] = 0;
			}
		}
	}
	return { board: next, path, capture, extra: !finished && last === own, sweep, finished };
}

export function statusOf(board: Board): GameStatus {
	if (sideSum(board, 1) && sideSum(board, 2)) return { type: 'playing' };
	const a = board[STORE[1]] + sideSum(board, 1);
	const b = board[STORE[2]] + sideSum(board, 2);
	if (a === b) return { type: 'draw' };
	return { type: 'won', winner: a > b ? 1 : 2 };
}

export function totalSeeds(board: Board) {
	return board.reduce((sum, n) => sum + n, 0);
}

/** A saved board must have the right shape and seed count for its sowing. */
export function validBoard(board: unknown, seeds: number): board is Board {
	if (!Array.isArray(board) || board.length !== SIZE) return false;
	if (!board.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) return false;
	return totalSeeds(board as Board) === seeds * PITS * 2;
}
