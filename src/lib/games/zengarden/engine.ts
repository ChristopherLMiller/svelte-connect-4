import type { GameStatus, Player } from './types';

/** Row-major, `size * size` cells: 0 empty, 1 slate, 2 quartz. */
export type Board = number[];

const DIRS: Array<[number, number]> = [
	[0, 1],
	[1, 0],
	[1, 1],
	[1, -1]
];

export function createBoard(size: number): Board {
	return new Array(size * size).fill(0);
}

export const center = (size: number) => ((size - 1) / 2) * size + (size - 1) / 2;

/** The longest run through `index` of its own colour, if it reaches five. */
export function fiveAt(board: Board, size: number, index: number): number[] | null {
	const player = board[index];
	if (!player) return null;
	const r = Math.floor(index / size);
	const c = index % size;
	let best: number[] | null = null;
	for (const [dr, dc] of DIRS) {
		const run = [index];
		for (const sign of [1, -1]) {
			let rr = r + dr * sign;
			let cc = c + dc * sign;
			while (rr >= 0 && rr < size && cc >= 0 && cc < size && board[rr * size + cc] === player) {
				if (sign > 0) run.push(rr * size + cc);
				else run.unshift(rr * size + cc);
				rr += dr * sign;
				cc += dc * sign;
			}
		}
		if (run.length >= 5 && (!best || run.length > best.length)) best = run;
	}
	return best;
}

export function statusAfter(board: Board, size: number, index: number): GameStatus {
	const line = fiveAt(board, size, index);
	if (line) return { type: 'won', winner: board[index] as Player, line };
	return board.includes(0) ? { type: 'playing' } : { type: 'draw' };
}

/** Rebuild a game from its moves, alternating from `first`; null if any move is illegal or follows a win. */
export function replay(size: number, moves: number[], first: Player = 1): { board: Board; status: GameStatus; next: Player } | null {
	const board = createBoard(size);
	let status: GameStatus = { type: 'playing' };
	let player: Player = first;
	for (const move of moves) {
		if (status.type !== 'playing') return null;
		if (!Number.isInteger(move) || move < 0 || move >= board.length || board[move]) return null;
		board[move] = player;
		status = statusAfter(board, size, move);
		player = player === 1 ? 2 : 1;
	}
	return { board, status, next: player };
}

type Geometry = {
	/** Five cell indices per window. */
	cells: Int16Array;
	count: number;
	/** Windows containing each cell, as offsets into `list`. */
	start: Int32Array;
	list: Int32Array;
	/** Cells within two steps of each cell (Chebyshev), excluding itself. */
	ringStart: Int32Array;
	ring: Int32Array;
};

const geometryCache = new Map<number, Geometry>();

function geometry(size: number): Geometry {
	const hit = geometryCache.get(size);
	if (hit) return hit;
	const windows: number[] = [];
	for (let r = 0; r < size; r += 1) {
		for (let c = 0; c < size; c += 1) {
			for (const [dr, dc] of DIRS) {
				const er = r + dr * 4;
				const ec = c + dc * 4;
				if (er < 0 || er >= size || ec < 0 || ec >= size) continue;
				for (let k = 0; k < 5; k += 1) windows.push((r + dr * k) * size + c + dc * k);
			}
		}
	}
	const count = windows.length / 5;
	const per: number[][] = Array.from({ length: size * size }, () => []);
	for (let w = 0; w < count; w += 1) for (let k = 0; k < 5; k += 1) per[windows[w * 5 + k]].push(w);
	const start = new Int32Array(size * size + 1);
	for (let i = 0; i < size * size; i += 1) start[i + 1] = start[i] + per[i].length;
	const list = new Int32Array(start[size * size]);
	per.forEach((ws, i) => list.set(ws, start[i]));

	const rings: number[][] = [];
	for (let r = 0; r < size; r += 1) {
		for (let c = 0; c < size; c += 1) {
			const near: number[] = [];
			for (let dr = -2; dr <= 2; dr += 1) {
				for (let dc = -2; dc <= 2; dc += 1) {
					if (!dr && !dc) continue;
					const rr = r + dr;
					const cc = c + dc;
					if (rr >= 0 && rr < size && cc >= 0 && cc < size) near.push(rr * size + cc);
				}
			}
			rings.push(near);
		}
	}
	const ringStart = new Int32Array(size * size + 1);
	for (let i = 0; i < size * size; i += 1) ringStart[i + 1] = ringStart[i] + rings[i].length;
	const ring = new Int32Array(ringStart[size * size]);
	rings.forEach((near, i) => ring.set(near, ringStart[i]));

	const geo = { cells: Int16Array.from(windows), count, start, list, ringStart, ring };
	geometryCache.set(size, geo);
	return geo;
}

/** Window weights by stones of one colour in an otherwise empty run of five. */
const WEIGHT = [0, 1, 12, 110, 1400, 0];

/**
 * A board with running tallies per run of five, so placing and lifting a stone only
 * touches the twenty-odd windows through that cell. Used by the AI and the threat hints.
 */
export class Field {
	readonly size: number;
	readonly cells: Int8Array;
	readonly geo: Geometry;
	/** Stones of each colour in each window. */
	private c1: Int8Array;
	private c2: Int8Array;
	/** Sum of window weights per colour. */
	readonly sum = [0, 0, 0];
	/** Windows one stone short of five, per colour. */
	readonly fours = [0, 0, 0];
	/** Stones within two steps, per cell. */
	readonly near: Int16Array;
	stones = 0;

	constructor(size: number, board?: Board) {
		this.size = size;
		this.geo = geometry(size);
		this.cells = new Int8Array(size * size);
		this.c1 = new Int8Array(this.geo.count);
		this.c2 = new Int8Array(this.geo.count);
		this.near = new Int16Array(size * size);
		if (board) board.forEach((p, i) => p && this.place(i, p as Player));
	}

	private value(w: number, sign: number) {
		const a = this.c1[w];
		const b = this.c2[w];
		if (a && !b) {
			this.sum[1] += WEIGHT[a] * sign;
			if (a === 4) this.fours[1] += sign;
		} else if (b && !a) {
			this.sum[2] += WEIGHT[b] * sign;
			if (b === 4) this.fours[2] += sign;
		}
	}

	/** Returns true when the stone completes five. */
	place(index: number, player: Player): boolean {
		const { start, list, ringStart, ring } = this.geo;
		this.cells[index] = player;
		this.stones += 1;
		let five = false;
		const mine = player === 1 ? this.c1 : this.c2;
		for (let k = start[index]; k < start[index + 1]; k += 1) {
			const w = list[k];
			this.value(w, -1);
			mine[w] += 1;
			if (mine[w] === 5) five = true;
			this.value(w, 1);
		}
		for (let k = ringStart[index]; k < ringStart[index + 1]; k += 1) this.near[ring[k]] += 1;
		return five;
	}

	remove(index: number) {
		const { start, list, ringStart, ring } = this.geo;
		const player = this.cells[index];
		const mine = player === 1 ? this.c1 : this.c2;
		for (let k = start[index]; k < start[index + 1]; k += 1) {
			const w = list[k];
			this.value(w, -1);
			mine[w] -= 1;
			this.value(w, 1);
		}
		for (let k = ringStart[index]; k < ringStart[index + 1]; k += 1) this.near[ring[k]] -= 1;
		this.cells[index] = 0;
		this.stones -= 1;
	}

	/** Empty cells that would complete five for `player`. */
	winPoints(player: Player): number[] {
		if (!this.fours[player]) return [];
		const mine = player === 1 ? this.c1 : this.c2;
		const theirs = player === 1 ? this.c2 : this.c1;
		const out: number[] = [];
		const { cells, count } = this.geo;
		for (let w = 0; w < count; w += 1) {
			if (mine[w] !== 4 || theirs[w]) continue;
			for (let k = 0; k < 5; k += 1) {
				const i = cells[w * 5 + k];
				if (!this.cells[i] && !out.includes(i)) out.push(i);
			}
		}
		return out;
	}

	/** Empty cells that turn some run into four for `player`. */
	fourMakers(player: Player): number[] {
		const mine = player === 1 ? this.c1 : this.c2;
		const theirs = player === 1 ? this.c2 : this.c1;
		const seen = new Uint8Array(this.cells.length);
		const out: number[] = [];
		const { cells, count } = this.geo;
		for (let w = 0; w < count; w += 1) {
			if (mine[w] !== 3 || theirs[w]) continue;
			for (let k = 0; k < 5; k += 1) {
				const i = cells[w * 5 + k];
				if (!this.cells[i] && !seen[i]) {
					seen[i] = 1;
					out.push(i);
				}
			}
		}
		return out;
	}

	/** How much a stone here would build for `player` and spoil for the other. */
	heat(index: number, player: Player): number {
		const { start, list } = this.geo;
		const mine = player === 1 ? this.c1 : this.c2;
		const theirs = player === 1 ? this.c2 : this.c1;
		let h = 0;
		for (let k = start[index]; k < start[index + 1]; k += 1) {
			const w = list[k];
			const a = mine[w];
			const b = theirs[w];
			if (!b) h += ATTACK[a];
			if (!a) h += DEFEND[b];
		}
		return h;
	}

	/** Empty cells near the stones, hottest first. */
	candidates(player: Player, width: number): number[] {
		const scored: Array<[number, number]> = [];
		for (let i = 0; i < this.cells.length; i += 1) {
			if (this.cells[i] || !this.near[i]) continue;
			scored.push([i, this.heat(i, player)]);
		}
		scored.sort((a, b) => b[1] - a[1]);
		return scored.slice(0, width).map(([i]) => i);
	}

	/** Static score from `player`'s side; the side to move gets a little extra for its tempo. */
	evaluate(player: Player): number {
		const other = player === 1 ? 2 : 1;
		return this.sum[player] * 1.15 - this.sum[other];
	}

	toBoard(): Board {
		return Array.from(this.cells);
	}
}

const ATTACK = [1, 6, 40, 420, 120000, 0];
const DEFEND = [0, 5, 32, 330, 60000, 0];
