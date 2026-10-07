import type { GameStatus, Player } from './types';

/**
 * A square chart of n × n boxes between (n + 1)² dots. Edges are numbered horizontals first,
 * row by row (r = 0..n, c = 0..n-1), then verticals (r = 0..n-1, c = 0..n).
 */
export type Topology = {
	n: number;
	/** Number of horizontal edges; verticals start here. */
	H: number;
	E: number;
	B: number;
	/** Four edges per box: top, bottom, left, right. */
	boxEdges: Int16Array;
	/** Two boxes per edge, -1 where the edge is on the rim. */
	edgeBoxes: Int16Array;
};

/** `edges[e]` is the player who inked it (0 = blank); `boxes[b]` the player who closed it. */
export type Grid = {
	n: number;
	edges: Int8Array;
	boxes: Int8Array;
};

const cache = new Map<number, Topology>();

export function topology(n: number): Topology {
	const hit = cache.get(n);
	if (hit) return hit;
	const H = n * (n + 1);
	const E = H * 2;
	const B = n * n;
	const boxEdges = new Int16Array(B * 4);
	const edgeBoxes = new Int16Array(E * 2).fill(-1);
	for (let r = 0; r < n; r += 1) {
		for (let c = 0; c < n; c += 1) {
			const b = r * n + c;
			const sides = [r * n + c, (r + 1) * n + c, H + r * (n + 1) + c, H + r * (n + 1) + c + 1];
			for (let k = 0; k < 4; k += 1) {
				boxEdges[b * 4 + k] = sides[k];
				const e = sides[k];
				if (edgeBoxes[e * 2] < 0) edgeBoxes[e * 2] = b;
				else edgeBoxes[e * 2 + 1] = b;
			}
		}
	}
	const topo = { n, H, E, B, boxEdges, edgeBoxes };
	cache.set(n, topo);
	return topo;
}

/** Dot coordinates (column, row) at each end of an edge. */
export function edgeEnds(topo: Topology, e: number): [number, number, number, number] {
	const { n, H } = topo;
	if (e < H) {
		const r = Math.floor(e / n);
		const c = e % n;
		return [c, r, c + 1, r];
	}
	const k = e - H;
	const r = Math.floor(k / (n + 1));
	const c = k % (n + 1);
	return [c, r, c, r + 1];
}

export function isHorizontal(topo: Topology, e: number) {
	return e < topo.H;
}

export function createGrid(n: number): Grid {
	const topo = topology(n);
	return { n, edges: new Int8Array(topo.E), boxes: new Int8Array(topo.B) };
}

export function sidesOf(topo: Topology, edges: ArrayLike<number>, b: number) {
	let k = 0;
	for (let s = 0; s < 4; s += 1) if (edges[topo.boxEdges[b * 4 + s]]) k += 1;
	return k;
}

export type PlayResult = { grid: Grid; closed: number[] };

/** Ink an edge. Closing any box keeps the turn; the caller decides who moves next. */
export function play(grid: Grid, e: number, player: Player): PlayResult | null {
	const topo = topology(grid.n);
	if (e < 0 || e >= topo.E || grid.edges[e]) return null;
	const edges = grid.edges.slice();
	const boxes = grid.boxes.slice();
	edges[e] = player;
	const closed: number[] = [];
	for (let k = 0; k < 2; k += 1) {
		const b = topo.edgeBoxes[e * 2 + k];
		if (b >= 0 && sidesOf(topo, edges, b) === 4) {
			boxes[b] = player;
			closed.push(b);
		}
	}
	return { grid: { n: grid.n, edges, boxes }, closed };
}

export function tally(grid: Grid) {
	const out = { 1: 0, 2: 0 };
	for (const owner of grid.boxes) if (owner === 1 || owner === 2) out[owner] += 1;
	return out;
}

export function statusOf(grid: Grid): GameStatus {
	const t = tally(grid);
	if (t[1] + t[2] < grid.boxes.length) return { type: 'playing' };
	if (t[1] === t[2]) return { type: 'draw' };
	return { type: 'won', winner: t[1] > t[2] ? 1 : 2 };
}

export function openEdges(grid: Grid) {
	const out: number[] = [];
	for (let e = 0; e < grid.edges.length; e += 1) if (!grid.edges[e]) out.push(e);
	return out;
}

/** Rebuild box owners from saved edges and owners, rejecting anything inconsistent. */
export function validGrid(n: number, edges: ArrayLike<number>, boxes: ArrayLike<number>) {
	const topo = topology(n);
	if (edges.length !== topo.E || boxes.length !== topo.B) return false;
	for (let b = 0; b < topo.B; b += 1) {
		const done = sidesOf(topo, edges, b) === 4;
		if (done !== (boxes[b] === 1 || boxes[b] === 2)) return false;
	}
	return true;
}
