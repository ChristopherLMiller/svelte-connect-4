import { topology, type Topology } from './engine';
import type { Difficulty } from './types';

/**
 * Mercator, the rival cartographer.
 *
 * Easy grabs most boxes and otherwise wanders. Medium never misses a box and never hands one
 * over while a safe line remains, then gives away the smallest piece. Hard plays the endgame
 * properly: it reads the board as chains and loops, values them with an exact search over the
 * order they get opened, declines the last two boxes of a chain (four of a loop) when keeping
 * control is worth more, offers short chains so they can't be declined, and searches the last
 * safe lines to win the fight over who has to open the first long chain.
 */

type Comp = { loop: boolean; boxes: number[] };

type Board = {
	topo: Topology;
	drawn: Uint8Array;
	sides: Uint8Array;
};

function makeBoard(n: number, edges: ArrayLike<number>): Board {
	const topo = topology(n);
	const drawn = new Uint8Array(topo.E);
	for (let e = 0; e < topo.E; e += 1) drawn[e] = edges[e] ? 1 : 0;
	const sides = new Uint8Array(topo.B);
	for (let b = 0; b < topo.B; b += 1) {
		for (let s = 0; s < 4; s += 1) sides[b] += drawn[topo.boxEdges[b * 4 + s]];
	}
	return { topo, drawn, sides };
}

function draw(board: Board, e: number) {
	board.drawn[e] = 1;
	for (let k = 0; k < 2; k += 1) {
		const b = board.topo.edgeBoxes[e * 2 + k];
		if (b >= 0) board.sides[b] += 1;
	}
}

function erase(board: Board, e: number) {
	board.drawn[e] = 0;
	for (let k = 0; k < 2; k += 1) {
		const b = board.topo.edgeBoxes[e * 2 + k];
		if (b >= 0) board.sides[b] -= 1;
	}
}

function across(topo: Topology, e: number, b: number) {
	const a = topo.edgeBoxes[e * 2];
	return a === b ? topo.edgeBoxes[e * 2 + 1] : a;
}

function openSides(board: Board, b: number) {
	const out: number[] = [];
	for (let s = 0; s < 4; s += 1) {
		const e = board.topo.boxEdges[b * 4 + s];
		if (!board.drawn[e]) out.push(e);
	}
	return out;
}

function openList(board: Board) {
	const out: number[] = [];
	for (let e = 0; e < board.topo.E; e += 1) if (!board.drawn[e]) out.push(e);
	return out;
}

/** Edges that close a box right now. */
function takers(board: Board) {
	const out: number[] = [];
	for (let b = 0; b < board.topo.B; b += 1) {
		if (board.sides[b] === 3) {
			const e = openSides(board, b)[0];
			if (!out.includes(e)) out.push(e);
		}
	}
	return out;
}

/** Edges that neither close a box nor leave one with three sides. */
function safeList(board: Board) {
	const out: number[] = [];
	const { topo } = board;
	for (let e = 0; e < topo.E; e += 1) {
		if (board.drawn[e]) continue;
		const a = topo.edgeBoxes[e * 2];
		const b = topo.edgeBoxes[e * 2 + 1];
		if ((a < 0 || board.sides[a] < 2) && (b < 0 || board.sides[b] < 2)) out.push(e);
	}
	return out;
}

/** Chains and loops of two-sided boxes; boxes with fewer sides are joints and stay out. */
function components(board: Board): Comp[] {
	const { topo, sides } = board;
	const seen = new Uint8Array(topo.B);
	const comps: Comp[] = [];
	const linked = (b: number) =>
		openSides(board, b)
			.map((e) => across(topo, e, b))
			.filter((nb) => nb >= 0 && sides[nb] === 2);
	for (let start = 0; start < topo.B; start += 1) {
		if (sides[start] !== 2 || seen[start]) continue;
		let head = start;
		let prev = -1;
		// Walk to one end (or all the way round a loop).
		for (;;) {
			const next = linked(head).filter((nb) => nb !== prev);
			if (!next.length || next[0] === start) break;
			prev = head;
			head = next[0];
			if (head === start) break;
		}
		const boxes: number[] = [];
		let cur = head;
		prev = -1;
		let loop = false;
		for (;;) {
			boxes.push(cur);
			seen[cur] = 1;
			const next = linked(cur).filter((nb) => nb !== prev);
			const step = next.find((nb) => !seen[nb]);
			if (step === undefined) {
				loop = boxes.length >= 4 && next.includes(head) && linked(head).length === 2;
				break;
			}
			prev = cur;
			cur = step;
		}
		comps.push({ loop, boxes });
	}
	return comps;
}

const memo = new Map<string, number>();

/**
 * Net boxes for the player in control when the other side must open one of `parts` next.
 * Each part is a chain (positive length) or a loop (negative length).
 */
function control(parts: number[]): number {
	if (!parts.length) return 0;
	const key = parts.join(',');
	const hit = memo.get(key);
	if (hit !== undefined) return hit;
	let best = Infinity;
	for (let i = 0; i < parts.length; i += 1) {
		if (i > 0 && parts[i] === parts[i - 1]) continue;
		const rest = parts.slice(0, i).concat(parts.slice(i + 1));
		const after = control(rest);
		const size = Math.abs(parts[i]);
		const loop = parts[i] < 0;
		const take = size - after;
		const keep = loop ? size - 8 + after : size >= 3 ? size - 4 + after : -Infinity;
		best = Math.min(best, Math.max(take, keep));
	}
	if (memo.size > 50000) memo.clear();
	memo.set(key, best);
	return best;
}

function partsOf(comps: Comp[]) {
	return comps.map((c) => (c.loop ? -c.boxes.length : c.boxes.length)).sort((a, b) => a - b);
}

/** Value of a quiet board (nothing to take, nothing safe) for the side that must open. */
function openerValue(board: Board) {
	return -control(partsOf(components(board)));
}

/** Take everything on offer, returning the edges drawn so they can be undone. */
function grabAll(board: Board) {
	const drawnNow: number[] = [];
	let boxes = 0;
	for (;;) {
		const list = takers(board);
		if (!list.length) break;
		for (const e of list) {
			if (board.drawn[e]) continue;
			for (let k = 0; k < 2; k += 1) {
				const b = board.topo.edgeBoxes[e * 2 + k];
				if (b >= 0 && board.sides[b] === 3) boxes += 1;
			}
			draw(board, e);
			drawnNow.push(e);
		}
	}
	return { drawnNow, boxes };
}

function pick<T>(list: T[]): T {
	return list[Math.floor(Math.random() * list.length)];
}

function chooseCapture(board: Board): number {
	const list = takers(board);
	const capBoxes: number[] = [];
	for (let b = 0; b < board.topo.B; b += 1) if (board.sides[b] === 3) capBoxes.push(b);

	const { drawnNow, boxes } = grabAll(board);
	const quiet = safeList(board).length === 0;
	const rest = quiet ? control(partsOf(components(board))) : 0;
	for (let i = drawnNow.length - 1; i >= 0; i -= 1) erase(board, drawnNow[i]);
	if (!quiet || boxes === 0) return pick(list);

	const { topo } = board;
	// The last two boxes of a chain: ink the far side and hand them over as a pair.
	if (boxes === 2 && capBoxes.length === 1) {
		const b = capBoxes[0];
		const e = openSides(board, b)[0];
		const nb = across(topo, e, b);
		if (nb >= 0 && board.sides[nb] === 2) {
			const far = openSides(board, nb).find((x) => x !== e);
			if (far !== undefined && rest > 2) return far;
		}
	}
	// The last four of an opened loop: split them into two pairs.
	if (boxes === 4 && capBoxes.length === 2) {
		const [b1, b4] = capBoxes;
		const e1 = openSides(board, b1)[0];
		const b2 = across(topo, e1, b1);
		if (b2 >= 0 && board.sides[b2] === 2) {
			const mid = openSides(board, b2).find((x) => x !== e1);
			if (mid !== undefined) {
				const b3 = across(topo, mid, b2);
				if (b3 >= 0 && board.sides[b3] === 2) {
					const e3 = openSides(board, b3).find((x) => x !== mid);
					if (e3 !== undefined && across(topo, e3, b3) === b4 && rest > 4) return mid;
				}
			}
		}
	}
	return pick(list);
}

function sacrifice(board: Board, smart: boolean): number {
	const comps = components(board);
	if (!comps.length) return pick(openList(board));
	let chosen = comps[0];
	if (smart) {
		const parts = partsOf(comps);
		let best = Infinity;
		for (const comp of comps) {
			const size = comp.boxes.length;
			const own = comp.loop ? -size : size;
			const rest = parts.slice();
			rest.splice(rest.indexOf(own), 1);
			const after = control(rest);
			const take = size - after;
			const keep = comp.loop ? size - 8 + after : size >= 3 ? size - 4 + after : -Infinity;
			const cost = Math.max(take, keep);
			if (cost < best || (cost === best && size < chosen.boxes.length)) {
				best = cost;
				chosen = comp;
			}
		}
	} else {
		chosen = comps.reduce((a, b) => (b.boxes.length < a.boxes.length ? b : a));
	}
	const { topo } = board;
	const inside = (e: number) => chosen.boxes.includes(topo.edgeBoxes[e * 2]) && chosen.boxes.includes(topo.edgeBoxes[e * 2 + 1]);
	if (!chosen.loop && chosen.boxes.length === 2) {
		const mid = openSides(board, chosen.boxes[0]).find(inside);
		if (mid !== undefined) return mid;
	}
	if (chosen.loop) return pick(openSides(board, chosen.boxes[0]).filter(inside));
	const end = chosen.boxes[0];
	const outer = openSides(board, end).filter((e) => !inside(e));
	return pick(outer.length ? outer : openSides(board, end));
}

/** Search the last safe lines: whoever is left to open the first chain usually loses. */
function searchSafe(board: Board, safe: number[], budget: number): number | null {
	if (safe.length > 30) return null;
	const index = new Map(safe.map((e, i) => [e, i]));
	const table = new Map<number, number>();
	let nodes = 0;

	const value = (mask: number): number => {
		const hit = table.get(mask);
		if (hit !== undefined) return hit;
		nodes += 1;
		if (nodes > budget) throw new Error('budget');
		const now = safeList(board);
		let best: number;
		if (!now.length) {
			best = openerValue(board);
		} else {
			best = -Infinity;
			for (const e of now) {
				const bit = index.get(e);
				if (bit === undefined) continue;
				draw(board, e);
				const v = -value(mask | (1 << bit));
				erase(board, e);
				if (v > best) best = v;
			}
		}
		table.set(mask, best);
		return best;
	};

	try {
		let best = -Infinity;
		let moves: number[] = [];
		for (const e of safe) {
			draw(board, e);
			const v = -value(1 << index.get(e)!);
			erase(board, e);
			if (v > best) {
				best = v;
				moves = [e];
			} else if (v === best) {
				moves.push(e);
			}
		}
		return moves.length ? pick(moves) : null;
	} catch {
		return null;
	}
}

export function chooseAiMove(n: number, edges: ArrayLike<number>, difficulty: Difficulty): number {
	const board = makeBoard(n, edges);
	const open = openList(board);
	if (!open.length) return -1;
	const caps = takers(board);
	const safe = safeList(board);

	if (difficulty === 'easy') {
		if (caps.length && Math.random() < 0.72) return pick(caps);
		if (safe.length && Math.random() < 0.65) return pick(safe);
		return pick(open);
	}

	if (difficulty === 'medium') {
		if (caps.length) return pick(caps);
		if (safe.length) return pick(safe);
		return sacrifice(board, false);
	}

	if (caps.length) return chooseCapture(board);
	if (safe.length) {
		if (safe.length <= 18) {
			const found = searchSafe(board, safe, 120000);
			if (found !== null) return found;
		}
		return pick(safe);
	}
	return sacrifice(board, true);
}
