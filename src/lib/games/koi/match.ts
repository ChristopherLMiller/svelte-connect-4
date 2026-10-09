import { KINDS, nextRandom, type Kind } from './types';

export const SIZE = 8;
export const MOVES = 22;

/** 0 plain, 1 clears its row, 2 clears its column, 3 bursts the 3 × 3 around it, 4 the moon (any colour). */
export type Special = 0 | 1 | 2 | 3 | 4;
export const ROW: Special = 1;
export const COL: Special = 2;
export const BURST: Special = 3;
export const MOON: Special = 4;

export type Piece = { id: number; k: Kind | 0; s: Special };
export type Spot = { r: number; c: number };
export type Gone = Spot & { piece: Piece };
export type Blast = Spot & { s: Special; k: Kind | 0 };

export type Step = {
	chain: number;
	cleared: Gone[];
	created: Array<Spot & { piece: Piece }>;
	blasts: Blast[];
	/** New pieces dropped in from above, with how many rows above the pond each starts. */
	spawned: Array<Spot & { id: number; from: number }>;
	grid: Array<Piece | null>;
	points: number;
};

export type SwapResult = { ok: boolean; steps: Step[]; points: number; shuffled: boolean };

export type Match = {
	grid: Array<Piece | null>;
	rng: { seed: number };
	nextId: number;
	stage: number;
	score: number;
	stageScore: number;
	target: number;
	moves: number;
	kinds: number;
	bestChain: number;
	specials: number;
	over: boolean;
	cleared: boolean;
};

export const idx = (r: number, c: number) => r * SIZE + c;
export const get = (g: Match, r: number, c: number) => g.grid[idx(r, c)] ?? null;
const inside = (r: number, c: number) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;

export function stageGoal(stage: number) {
	return { target: 900 + (stage - 1) * 550 + Math.max(0, stage - 4) * 150, kinds: stage <= 2 ? 5 : 6 };
}

function fresh(g: Match, k: Kind | 0, s: Special = 0): Piece {
	g.nextId += 1;
	return { id: g.nextId, k, s };
}

function randomKind(g: Match): Kind {
	return KINDS[Math.floor(nextRandom(g.rng) * g.kinds)]!;
}

const sameKind = (a: Piece | null, b: Piece | null) => !!a && !!b && a.k !== 0 && a.k === b.k;

type Run = { cells: Spot[]; across: boolean };

function runs(g: Match): Run[] {
	const out: Run[] = [];
	for (let r = 0; r < SIZE; r += 1) {
		let start = 0;
		for (let c = 1; c <= SIZE; c += 1) {
			if (c < SIZE && sameKind(get(g, r, c), get(g, r, start))) continue;
			if (c - start >= 3 && get(g, r, start)?.k) out.push({ across: true, cells: Array.from({ length: c - start }, (_, i) => ({ r, c: start + i })) });
			start = c;
		}
	}
	for (let c = 0; c < SIZE; c += 1) {
		let start = 0;
		for (let r = 1; r <= SIZE; r += 1) {
			if (r < SIZE && sameKind(get(g, r, c), get(g, start, c))) continue;
			if (r - start >= 3 && get(g, start, c)?.k) out.push({ across: false, cells: Array.from({ length: r - start }, (_, i) => ({ r: start + i, c })) });
			start = r;
		}
	}
	return out;
}

function swapCells(g: Match, a: Spot, b: Spot) {
	const t = g.grid[idx(a.r, a.c)]!;
	g.grid[idx(a.r, a.c)] = g.grid[idx(b.r, b.c)]!;
	g.grid[idx(b.r, b.c)] = t;
}

const isSpecial = (p: Piece | null) => !!p && p.s !== 0;

/** Would swapping these two make something happen? */
export function swapWorks(g: Match, a: Spot, b: Spot) {
	const pa = get(g, a.r, a.c);
	const pb = get(g, b.r, b.c);
	if (!pa || !pb) return false;
	if (pa.s === MOON || pb.s === MOON) return true;
	if (isSpecial(pa) && isSpecial(pb)) return true;
	swapCells(g, a, b);
	const ok = runs(g).length > 0;
	swapCells(g, a, b);
	return ok;
}

export function findMove(g: Match): [Spot, Spot] | null {
	let best: [Spot, Spot] | null = null;
	let bestScore = -1;
	for (let r = 0; r < SIZE; r += 1) {
		for (let c = 0; c < SIZE; c += 1) {
			for (const [dr, dc] of [
				[0, 1],
				[1, 0]
			] as const) {
				const a = { r, c };
				const b = { r: r + dr, c: c + dc };
				if (!inside(b.r, b.c) || !swapWorks(g, a, b)) continue;
				const pa = get(g, a.r, a.c)!;
				const pb = get(g, b.r, b.c)!;
				let score = (pa.s ? 5 : 0) + (pb.s ? 5 : 0);
				if (!pa.s || !pb.s) {
					swapCells(g, a, b);
					for (const run of runs(g)) score += run.cells.length;
					swapCells(g, a, b);
				}
				// Lower moves keep the cascade going, so prefer them a little.
				score += r * 0.05;
				if (score > bestScore) {
					bestScore = score;
					best = [a, b];
				}
			}
		}
	}
	return best;
}

function fillClean(g: Match) {
	for (let r = 0; r < SIZE; r += 1) {
		for (let c = 0; c < SIZE; c += 1) {
			let k = randomKind(g);
			for (let tries = 0; tries < 12; tries += 1) {
				const left = c >= 2 && get(g, r, c - 1)?.k === k && get(g, r, c - 2)?.k === k;
				const up = r >= 2 && get(g, r - 1, c)?.k === k && get(g, r - 2, c)?.k === k;
				if (!left && !up) break;
				k = randomKind(g);
			}
			g.grid[idx(r, c)] = fresh(g, k);
		}
	}
}

/** Rearrange the pieces already on the board until there's a move and nothing matches by itself. */
export function shuffle(g: Match) {
	const pieces = g.grid.filter((p): p is Piece => !!p);
	for (let tries = 0; tries < 200; tries += 1) {
		for (let i = pieces.length - 1; i > 0; i -= 1) {
			const j = Math.floor(nextRandom(g.rng) * (i + 1));
			[pieces[i], pieces[j]] = [pieces[j]!, pieces[i]!];
		}
		pieces.forEach((p, i) => (g.grid[i] = p));
		if (!runs(g).length && findMove(g)) return;
	}
	do fillClean(g);
	while (!findMove(g));
}

export function createMatch(seed: number): Match {
	const goal = stageGoal(1);
	const g: Match = {
		grid: Array(SIZE * SIZE).fill(null),
		rng: { seed },
		nextId: 0,
		stage: 1,
		score: 0,
		stageScore: 0,
		target: goal.target,
		moves: MOVES,
		kinds: goal.kinds,
		bestChain: 0,
		specials: 0,
		over: false,
		cleared: false
	};
	do fillClean(g);
	while (!findMove(g));
	return g;
}

export function nextStage(g: Match) {
	g.stage += 1;
	const goal = stageGoal(g.stage);
	g.target = goal.target;
	g.kinds = goal.kinds;
	g.stageScore = 0;
	g.moves = MOVES;
	g.cleared = false;
}

function blastCells(s: Special, r: number, c: number): Spot[] {
	const out: Spot[] = [];
	if (s === ROW) for (let cc = 0; cc < SIZE; cc += 1) out.push({ r, c: cc });
	if (s === COL) for (let rr = 0; rr < SIZE; rr += 1) out.push({ r: rr, c });
	if (s === BURST) {
		for (let dr = -1; dr <= 1; dr += 1) for (let dc = -1; dc <= 1; dc += 1) if (inside(r + dr, c + dc)) out.push({ r: r + dr, c: c + dc });
	}
	return out;
}

function commonest(g: Match): Kind | 0 {
	const counts = new Map<Kind, number>();
	for (const p of g.grid) if (p?.k) counts.set(p.k, (counts.get(p.k) ?? 0) + 1);
	let best: Kind | 0 = 0;
	let n = 0;
	for (const [k, v] of counts) if (v > n) [best, n] = [k, v];
	return best;
}

/** Clear the marked cells, setting off any specials among them, and return what went. */
function sweep(g: Match, marked: Map<number, number>, step: Step, keep: Set<number>) {
	const queue = [...marked.keys()];
	for (let i = 0; i < queue.length; i += 1) {
		const id = queue[i]!;
		if (keep.has(id)) continue;
		const p = g.grid[id];
		if (!p || !p.s) continue;
		const r = Math.floor(id / SIZE);
		const c = id % SIZE;
		let cells: Spot[];
		if (p.s === MOON) {
			const k = commonest(g);
			cells = [];
			g.grid.forEach((q, j) => {
				if (q && q.k === k && k) cells.push({ r: Math.floor(j / SIZE), c: j % SIZE });
			});
			step.blasts.push({ r, c, s: MOON, k });
		} else {
			cells = blastCells(p.s, r, c);
			step.blasts.push({ r, c, s: p.s, k: p.k });
		}
		for (const cell of cells) {
			const j = idx(cell.r, cell.c);
			if (marked.has(j) || keep.has(j) || !g.grid[j]) continue;
			marked.set(j, 1);
			queue.push(j);
		}
	}
	let extra = 0;
	for (const [id, from] of marked) {
		if (keep.has(id)) continue;
		const p = g.grid[id];
		if (!p) continue;
		step.cleared.push({ r: Math.floor(id / SIZE), c: id % SIZE, piece: p });
		if (from === 1) extra += 1;
		g.grid[id] = null;
	}
	return extra;
}

function settle(g: Match, step: Step) {
	for (let c = 0; c < SIZE; c += 1) {
		let write = SIZE - 1;
		for (let r = SIZE - 1; r >= 0; r -= 1) {
			const p = get(g, r, c);
			if (!p) continue;
			g.grid[idx(write, c)] = p;
			if (write !== r) g.grid[idx(r, c)] = null;
			write -= 1;
		}
		const missing = write + 1;
		for (let r = write; r >= 0; r -= 1) {
			const p = fresh(g, randomKind(g));
			g.grid[idx(r, c)] = p;
			step.spawned.push({ r, c, id: p.id, from: missing });
		}
	}
	step.grid = g.grid.slice();
}

const RUN_POINTS = (n: number) => (n >= 5 ? 100 + (n - 5) * 30 : n === 4 ? 60 : 30);

/** Make specials from this wave's runs and mark everything that clears. */
function wave(g: Match, found: Run[], prefer: Spot[], step: Step) {
	const marked = new Map<number, number>();
	const keep = new Set<number>();
	const used = new Set<Run>();
	let points = 0;
	const claim = (cell: Spot, piece: Piece) => {
		const id = idx(cell.r, cell.c);
		if (keep.has(id)) return;
		const old = g.grid[id];
		if (old) step.cleared.push({ ...cell, piece: old });
		keep.add(id);
		step.created.push({ ...cell, piece });
	};
	const pick = (cells: Spot[]) => cells.find((cell) => prefer.some((p) => p.r === cell.r && p.c === cell.c)) ?? cells[Math.floor(cells.length / 2)]!;

	for (const run of found) for (const cell of run.cells) marked.set(idx(cell.r, cell.c), 0);

	for (const a of found) {
		if (!a.across || used.has(a)) continue;
		for (const b of found) {
			if (b.across || used.has(b)) continue;
			const cross = a.cells.find((x) => b.cells.some((y) => y.r === x.r && y.c === x.c));
			if (!cross || a.cells.length >= 5 || b.cells.length >= 5) continue;
			used.add(a);
			used.add(b);
			const k = get(g, cross.r, cross.c)!.k;
			claim(cross, fresh(g, k, BURST));
			points += 90;
			break;
		}
	}
	for (const run of found) {
		if (used.has(run)) continue;
		const n = run.cells.length;
		points += RUN_POINTS(n);
		if (n >= 5) claim(pick(run.cells), fresh(g, 0, MOON));
		else if (n === 4) {
			const cell = pick(run.cells);
			claim(cell, fresh(g, get(g, cell.r, cell.c)!.k, run.across ? ROW : COL));
		}
	}
	const extra = sweep(g, marked, step, keep);
	for (const made of step.created) g.grid[idx(made.r, made.c)] = made.piece;
	g.specials += step.created.length;
	return points + extra * 10;
}

function emptyStep(chain: number): Step {
	return { chain, cleared: [], created: [], blasts: [], spawned: [], grid: [], points: 0 };
}

function cascade(g: Match, prefer: Spot[], first: Step | null): Step[] {
	const steps: Step[] = [];
	let chain = first ? 1 : 0;
	if (first) {
		settle(g, first);
		steps.push(first);
	}
	for (let guard = 0; guard < 60; guard += 1) {
		const found = runs(g);
		if (!found.length) break;
		chain += 1;
		const step = emptyStep(chain);
		step.points = wave(g, found, chain === 1 ? prefer : [], step) * chain;
		settle(g, step);
		steps.push(step);
	}
	return steps;
}

export function trySwap(g: Match, a: Spot, b: Spot): SwapResult {
	const none: SwapResult = { ok: false, steps: [], points: 0, shuffled: false };
	if (g.over || g.cleared || g.moves <= 0) return none;
	if (!inside(a.r, a.c) || !inside(b.r, b.c) || Math.abs(a.r - b.r) + Math.abs(a.c - b.c) !== 1) return none;
	if (!swapWorks(g, a, b)) return none;

	const pa = get(g, a.r, a.c)!;
	const pb = get(g, b.r, b.c)!;
	swapCells(g, a, b);
	g.moves -= 1;

	let first: Step | null = null;
	if (pa.s === MOON || pb.s === MOON || (pa.s && pb.s)) {
		first = emptyStep(1);
		const marked = new Map<number, number>();
		const keep = new Set<number>();
		if (pa.s === MOON && pb.s === MOON) {
			g.grid.forEach((p, i) => p && marked.set(i, 1));
		} else if (pa.s === MOON || pb.s === MOON) {
			const moonAt = pa.s === MOON ? b : a;
			const other = pa.s === MOON ? pb : pa;
			first.cleared.push({ ...moonAt, piece: get(g, moonAt.r, moonAt.c)! });
			g.grid[idx(moonAt.r, moonAt.c)] = null;
			first.blasts.push({ ...moonAt, s: MOON, k: other.k });
			g.grid.forEach((p, i) => {
				if (p && p.k === other.k && p.s !== MOON) marked.set(i, 1);
			});
		} else {
			marked.set(idx(a.r, a.c), 0);
			marked.set(idx(b.r, b.c), 0);
		}
		first.points = 50 + sweep(g, marked, first, keep) * 10;
	}

	const steps = cascade(g, [a, b], first);
	const points = steps.reduce((sum, s) => sum + s.points, 0);
	g.score += points;
	g.stageScore += points;
	g.bestChain = Math.max(g.bestChain, steps.length);

	let shuffled = false;
	if (g.stageScore >= g.target) {
		g.cleared = true;
	} else if (g.moves <= 0) {
		g.over = true;
	} else if (!findMove(g)) {
		shuffle(g);
		shuffled = true;
	}
	return { ok: true, steps, points, shuffled };
}

/** Moves left over when a stage is beaten each pay this. */
export const MOVE_BONUS = 60;

export function finishStage(g: Match) {
	const bonus = g.moves * MOVE_BONUS;
	g.score += bonus;
	return bonus;
}
