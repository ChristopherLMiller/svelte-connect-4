import { KINDS, nextRandom, type Kind } from './types';

/** Blooms on an even row; odd rows sit half a bloom in and hold one fewer. */
export const COLS = 11;
export const ROWS = 14;
export const ROW_H = Math.sqrt(3) / 2;
export const FIELD_W = COLS;
/** Below this line a bloom has reached the lily pad and the pond is lost. */
export const DEAD_Y = 11.4;
export const LAUNCH = { x: COLS / 2, y: 12.6 };
export const FIELD_H = 13.5;
export const MAX_ANGLE = (78 * Math.PI) / 180;
/** Blooms touch a little before their centres are a full width apart, so shots near a gap still stick. */
const HIT = 0.84;
const STEP = 0.06;

export type Cell = [number, number];
export type Point = { x: number; y: number };
export type Placed = { r: number; c: number; k: Kind };

export type Shooter = {
	grid: Uint8Array;
	/** How many rows the far bank has crept down. */
	top: number;
	current: Kind;
	next: Kind;
	rng: { seed: number };
	stage: number;
	score: number;
	shots: number;
	misses: number;
	/** Shots without a pop before the bank creeps down a row. */
	allowance: number;
	streak: number;
	popped: number;
	over: boolean;
	cleared: boolean;
};

export type Plan = { path: Point[]; cell: Cell | null };

export type ShotResult = {
	plan: Plan;
	kind: Kind;
	popped: Placed[];
	dropped: Placed[];
	descended: boolean;
	points: number;
	bonus: number;
	over: boolean;
	cleared: boolean;
};

export const rowLength = (r: number) => (r & 1 ? COLS - 1 : COLS);
export const at = (g: Shooter, r: number, c: number) => g.grid[r * COLS + c] as Kind | 0;
const put = (g: Shooter, r: number, c: number, k: Kind | 0) => {
	g.grid[r * COLS + c] = k;
};
const valid = (r: number, c: number) => r >= 0 && r < ROWS && c >= 0 && c < rowLength(r);

export function centre(g: Pick<Shooter, 'top'>, r: number, c: number): Point {
	return { x: c + 0.5 + (r & 1 ? 0.5 : 0), y: 0.5 + (r + g.top) * ROW_H };
}

export function neighbours(r: number, c: number): Cell[] {
	const odd = r & 1;
	const list: Cell[] = odd
		? [
				[r, c - 1],
				[r, c + 1],
				[r - 1, c],
				[r - 1, c + 1],
				[r + 1, c],
				[r + 1, c + 1]
			]
		: [
				[r, c - 1],
				[r, c + 1],
				[r - 1, c - 1],
				[r - 1, c],
				[r + 1, c - 1],
				[r + 1, c]
			];
	return list.filter(([rr, cc]) => valid(rr, cc));
}

export function stageRules(stage: number) {
	return {
		rows: Math.min(10, 4 + Math.floor((stage + 1) / 2)),
		colors: Math.min(6, 3 + Math.floor(stage / 2)),
		allowance: Math.max(2, 7 - Math.floor((stage - 1) / 2)),
		/** Late ponds start with the far bank already crept in. */
		start: Math.min(2, Math.max(0, Math.floor((stage - 8) / 3)))
	};
}

export function present(g: Shooter): Kind[] {
	const seen = new Set<Kind>();
	for (const k of g.grid) if (k) seen.add(k as Kind);
	return KINDS.filter((k) => seen.has(k));
}

function draw(g: Shooter): Kind {
	const pool = present(g);
	const from = pool.length ? pool : KINDS.slice(0, stageRules(g.stage).colors);
	return from[Math.floor(nextRandom(g.rng) * from.length)]!;
}

function fill(g: Shooter) {
	const { rows, colors } = stageRules(g.stage);
	const pool = KINDS.slice(0, colors);
	g.grid.fill(0);
	for (let r = 0; r < rows; r += 1) {
		for (let c = 0; c < rowLength(r); c += 1) {
			const near = neighbours(r, c)
				.map(([rr, cc]) => at(g, rr, cc))
				.filter((k): k is Kind => k !== 0);
			const roll = nextRandom(g.rng);
			const k = near.length && roll < 0.5 ? near[Math.floor(nextRandom(g.rng) * near.length)]! : pool[Math.floor(nextRandom(g.rng) * pool.length)]!;
			put(g, r, c, k);
		}
	}
	for (const k of pool) {
		if (g.grid.includes(k)) continue;
		const r = Math.floor(nextRandom(g.rng) * rows);
		put(g, r, Math.floor(nextRandom(g.rng) * rowLength(r)), k);
	}
}

export function startStage(g: Shooter, stage: number) {
	g.stage = stage;
	g.top = stageRules(stage).start;
	g.misses = 0;
	g.streak = 0;
	g.cleared = false;
	g.allowance = stageRules(stage).allowance;
	fill(g);
	g.current = draw(g);
	g.next = draw(g);
}

export function createShooter(seed: number): Shooter {
	const g: Shooter = {
		grid: new Uint8Array(ROWS * COLS),
		top: 0,
		current: 1,
		next: 1,
		rng: { seed },
		stage: 1,
		score: 0,
		shots: 0,
		misses: 0,
		allowance: 7,
		streak: 0,
		popped: 0,
		over: false,
		cleared: false
	};
	startStage(g, 1);
	return g;
}

function blocked(g: Shooter, x: number, y: number) {
	const approx = Math.round((y - 0.5) / ROW_H - g.top);
	for (let r = approx - 1; r <= approx + 1; r += 1) {
		if (r < 0 || r >= ROWS) continue;
		const shift = r & 1 ? 0.5 : 0;
		const c0 = Math.round(x - 0.5 - shift);
		for (let c = c0 - 1; c <= c0 + 1; c += 1) {
			if (!valid(r, c) || !at(g, r, c)) continue;
			const p = centre(g, r, c);
			if ((p.x - x) ** 2 + (p.y - y) ** 2 < HIT * HIT) return true;
		}
	}
	return false;
}

function snap(g: Shooter, x: number, y: number): Cell | null {
	let best: Cell | null = null;
	let bestD = Infinity;
	for (let r = 0; r < ROWS; r += 1) {
		for (let c = 0; c < rowLength(r); c += 1) {
			if (at(g, r, c)) continue;
			const p = centre(g, r, c);
			const d = (p.x - x) ** 2 + (p.y - y) ** 2;
			if (d >= bestD || d > 2.4) continue;
			if (r !== 0 && !neighbours(r, c).some(([rr, cc]) => at(g, rr, cc))) continue;
			best = [r, c];
			bestD = d;
		}
	}
	return best;
}

/** Trace a shot from the lily pad: bounce off the banks, stop on the first bloom or the far bank. */
export function planShot(g: Shooter, angle: number, limit = Infinity): Plan {
	const a = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, angle));
	let dx = Math.sin(a);
	const dy = -Math.cos(a);
	let x = LAUNCH.x;
	let y = LAUNCH.y;
	const path: Point[] = [{ x, y }];
	const ceiling = 0.5 + g.top * ROW_H;
	let travelled = 0;
	for (let i = 0; i < 4000; i += 1) {
		x += dx * STEP;
		y += dy * STEP;
		travelled += STEP;
		if (x < 0.5) {
			x = 1 - x;
			dx = -dx;
			path.push({ x: 0.5, y });
		} else if (x > FIELD_W - 0.5) {
			x = 2 * (FIELD_W - 0.5) - x;
			dx = -dx;
			path.push({ x: FIELD_W - 0.5, y });
		}
		if (travelled >= limit) {
			path.push({ x, y });
			return { path, cell: null };
		}
		if (y <= ceiling || blocked(g, x, y)) {
			const cell = snap(g, x, Math.max(y, ceiling));
			path.push(cell ? centre(g, cell[0], cell[1]) : { x, y });
			return { path, cell };
		}
	}
	return { path, cell: null };
}

function flood(g: Shooter, start: Cell, same: (k: Kind | 0) => boolean): Cell[] {
	const seen = new Set<number>([start[0] * COLS + start[1]]);
	const out: Cell[] = [start];
	for (let i = 0; i < out.length; i += 1) {
		const [r, c] = out[i]!;
		for (const [rr, cc] of neighbours(r, c)) {
			const id = rr * COLS + cc;
			if (seen.has(id) || !same(at(g, rr, cc))) continue;
			seen.add(id);
			out.push([rr, cc]);
		}
	}
	return out;
}

/** Blooms no longer joined to the far bank, which drift off when a pop cuts them loose. */
function adrift(g: Shooter): Placed[] {
	const anchored = new Set<number>();
	for (let c = 0; c < rowLength(0); c += 1) {
		if (!at(g, 0, c) || anchored.has(c)) continue;
		for (const [r, cc] of flood(g, [0, c], (k) => k !== 0)) anchored.add(r * COLS + cc);
	}
	const out: Placed[] = [];
	for (let r = 0; r < ROWS; r += 1) {
		for (let c = 0; c < rowLength(r); c += 1) {
			const k = at(g, r, c);
			if (k && !anchored.has(r * COLS + c)) out.push({ r, c, k });
		}
	}
	return out;
}

function reached(g: Shooter) {
	for (let r = ROWS - 1; r >= 0; r -= 1) {
		for (let c = 0; c < rowLength(r); c += 1) {
			if (at(g, r, c) && centre(g, r, c).y + 0.5 > DEAD_Y + 0.01) return true;
		}
	}
	return false;
}

export function stageBonus(g: Shooter) {
	return 400 + g.stage * 200 + Math.max(0, g.allowance - g.misses) * 50;
}

export function fire(g: Shooter, angle: number): ShotResult {
	const plan = planShot(g, angle);
	const kind = g.current;
	const result: ShotResult = { plan, kind, popped: [], dropped: [], descended: false, points: 0, bonus: 0, over: false, cleared: false };
	g.shots += 1;
	g.current = g.next;
	if (!plan.cell) {
		g.over = true;
		result.over = true;
		return result;
	}
	const [r, c] = plan.cell;
	put(g, r, c, kind);

	const group = flood(g, [r, c], (k) => k === kind);
	if (group.length >= 3) {
		for (const [gr, gc] of group) {
			result.popped.push({ r: gr, c: gc, k: kind });
			put(g, gr, gc, 0);
		}
		result.dropped = adrift(g);
		for (const d of result.dropped) put(g, d.r, d.c, 0);
		g.streak += 1;
		g.misses = 0;
		const lift = 1 + Math.min(g.streak - 1, 5) * 0.2;
		const n = result.dropped.length;
		result.points = Math.round((result.popped.length * 10 + n * 30 + n * n * 5) * lift);
		g.popped += result.popped.length + n;
	} else {
		g.streak = 0;
		g.misses += 1;
		if (g.misses >= g.allowance) {
			g.misses = 0;
			g.top += 1;
			result.descended = true;
		}
	}
	g.score += result.points;

	if (!present(g).length) {
		g.cleared = true;
		result.cleared = true;
		result.bonus = stageBonus(g);
		g.score += result.bonus;
		return result;
	}
	if (reached(g)) {
		g.over = true;
		result.over = true;
		return result;
	}
	const pool = present(g);
	if (!pool.includes(g.current)) g.current = draw(g);
	g.next = draw(g);
	return result;
}

export function swapNext(g: Shooter) {
	const k = g.current;
	g.current = g.next;
	g.next = k;
}

/** How many more misses before the bank creeps down. */
export const missesLeft = (g: Shooter) => g.allowance - g.misses;
