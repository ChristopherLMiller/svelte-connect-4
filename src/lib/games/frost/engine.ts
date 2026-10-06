import { FLAG, HIDDEN, OPEN, type Spec } from './types';

export type Field = {
	w: number;
	h: number;
	total: number;
	mines: number;
	mine: Uint8Array;
	count: Uint8Array;
	state: Uint8Array;
	planted: boolean;
	opened: number;
	flags: number;
	over: 'live' | 'won' | 'lost';
	/** The thin patch that gave way, or -1. */
	hit: number;
	/** The pre-drilled hole a daily survey starts from, or -1. */
	start: number;
	/** True when the solver proved the board can be cleared without a guess. */
	guessFree: boolean;
};

export type Step =
	| { kind: 'open'; origin: number; cells: number[]; dist: number[] }
	| { kind: 'boom'; origin: number; hit: number; cells: number[]; dist: number[] };

export function rng(seed: number) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function hashString(text: string) {
	let h = 2166136261;
	for (let i = 0; i < text.length; i += 1) {
		h ^= text.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

export function neighbours(w: number, h: number, i: number, out: number[] = []) {
	out.length = 0;
	const x = i % w;
	const y = (i - x) / w;
	for (let dy = -1; dy <= 1; dy += 1) {
		const ny = y + dy;
		if (ny < 0 || ny >= h) continue;
		for (let dx = -1; dx <= 1; dx += 1) {
			if (!dx && !dy) continue;
			const nx = x + dx;
			if (nx < 0 || nx >= w) continue;
			out.push(ny * w + nx);
		}
	}
	return out;
}

export function createField(spec: Spec): Field {
	const total = spec.w * spec.h;
	return {
		w: spec.w,
		h: spec.h,
		total,
		mines: Math.min(spec.mines, total - 1),
		mine: new Uint8Array(total),
		count: new Uint8Array(total),
		state: new Uint8Array(total),
		planted: false,
		opened: 0,
		flags: 0,
		over: 'live',
		hit: -1,
		start: -1,
		guessFree: false
	};
}

function countAll(w: number, h: number, mine: Uint8Array, count: Uint8Array) {
	const near: number[] = [];
	for (let i = 0; i < mine.length; i += 1) {
		let n = 0;
		for (const j of neighbours(w, h, i, near)) n += mine[j];
		count[i] = n;
	}
}

function scatter(w: number, h: number, mines: number, keepClear: Set<number>, random: () => number) {
	const pool: number[] = [];
	for (let i = 0; i < w * h; i += 1) if (!keepClear.has(i)) pool.push(i);
	const mine = new Uint8Array(w * h);
	for (let k = 0; k < mines; k += 1) {
		const pick = k + Math.floor(random() * (pool.length - k));
		const swap = pool[k];
		pool[k] = pool[pick];
		pool[pick] = swap;
		mine[pool[k]] = 1;
	}
	return mine;
}

function safeZone(w: number, h: number, mines: number, first: number) {
	const zone = new Set([first, ...neighbours(w, h, first)]);
	return w * h - zone.size >= mines ? zone : new Set([first]);
}

/**
 * Plants the mines after the first step so it always opens ground. With `noGuess`, boards are
 * redrawn until the solver clears them from that step; past `budgetMs` the last draw is kept.
 */
export function plant(field: Field, first: number, seed: number, noGuess: boolean, budgetMs = 1200) {
	const random = rng(seed);
	const zone = safeZone(field.w, field.h, field.mines, first);
	const t0 = Date.now();
	let mine = scatter(field.w, field.h, field.mines, zone, random);
	let proved = noGuess && solves(mine, field.w, field.h, field.mines, first);
	while (noGuess && !proved && Date.now() - t0 < budgetMs) {
		mine = scatter(field.w, field.h, field.mines, zone, random);
		proved = solves(mine, field.w, field.h, field.mines, first);
	}
	field.mine = mine;
	countAll(field.w, field.h, field.mine, field.count);
	field.planted = true;
	field.guessFree = proved;
}

/** Same lake for everyone on a given date: guess-free, opened from a drilled hole near the centre. */
export function createDaily(spec: Spec, dateKey: string) {
	const random = rng(hashString(`frostline:${dateKey}`));
	const field = createField(spec);
	const { w, h } = field;
	const cx = (w - 1) / 2;
	const cy = (h - 1) / 2;
	const count = new Uint8Array(w * h);
	let fallback: { mine: Uint8Array; start: number } | null = null;
	for (let attempt = 0; attempt < 4000; attempt += 1) {
		const mine = scatter(w, h, field.mines, new Set(), random);
		countAll(w, h, mine, count);
		let start = -1;
		let bestD = Infinity;
		for (let i = 0; i < w * h; i += 1) {
			if (mine[i] || count[i]) continue;
			const d = Math.hypot((i % w) - cx, Math.floor(i / w) - cy) + random() * 0.5;
			if (d < bestD) {
				bestD = d;
				start = i;
			}
		}
		if (start < 0) continue;
		fallback ??= { mine, start };
		if (solves(mine, w, h, field.mines, start)) {
			fallback = { mine, start };
			field.guessFree = true;
			break;
		}
	}
	if (!fallback) {
		plant(field, Math.floor(h / 2) * w + Math.floor(w / 2), hashString(dateKey), false);
		field.start = Math.floor(h / 2) * w + Math.floor(w / 2);
	} else {
		field.mine = fallback.mine;
		countAll(w, h, field.mine, field.count);
		field.planted = true;
		field.start = fallback.start;
	}
	reveal(field, field.start);
	return field;
}

/** Breadth-first opening; `dist` is the ring each cell sits in from where the ice was struck. */
function flood(field: Field, seeds: number[], origin: number, cells: number[], dist: number[]) {
	const { w, h, state, count, mine } = field;
	const queue: number[] = [];
	const depth: number[] = [];
	const near: number[] = [];
	const ox = origin % w;
	const oy = Math.floor(origin / w);
	for (const s of seeds) {
		if (state[s] !== HIDDEN || mine[s]) continue;
		state[s] = OPEN;
		field.opened += 1;
		queue.push(s);
		depth.push(Math.max(Math.abs((s % w) - ox), Math.abs(Math.floor(s / w) - oy)));
	}
	for (let head = 0; head < queue.length; head += 1) {
		const i = queue[head];
		cells.push(i);
		dist.push(depth[head]);
		if (count[i]) continue;
		for (const j of neighbours(w, h, i, near)) {
			if (state[j] !== HIDDEN || mine[j]) continue;
			state[j] = OPEN;
			field.opened += 1;
			queue.push(j);
			depth.push(depth[head] + 1);
		}
	}
}

function settle(field: Field) {
	if (field.over !== 'live' || field.opened < field.total - field.mines) return;
	field.over = 'won';
	for (let i = 0; i < field.total; i += 1) if (field.mine[i]) field.state[i] = FLAG;
	field.flags = field.mines;
}

function burst(field: Field, origin: number, hit: number): Step {
	field.over = 'lost';
	field.hit = hit;
	field.state[hit] = OPEN;
	const { w } = field;
	const cells: number[] = [];
	const dist: number[] = [];
	const hx = hit % w;
	const hy = Math.floor(hit / w);
	for (let i = 0; i < field.total; i += 1) {
		if (!field.mine[i] || i === hit) continue;
		cells.push(i);
		dist.push(Math.hypot((i % w) - hx, Math.floor(i / w) - hy));
	}
	return { kind: 'boom', origin, hit, cells, dist };
}

export function reveal(field: Field, i: number): Step | null {
	if (field.over !== 'live' || !field.planted || field.state[i] !== HIDDEN) return null;
	if (field.mine[i]) return burst(field, i, i);
	const cells: number[] = [];
	const dist: number[] = [];
	flood(field, [i], i, cells, dist);
	settle(field);
	return { kind: 'open', origin: i, cells, dist };
}

/** Striking a number whose flags are all placed opens the rest of its neighbours. */
export function chord(field: Field, i: number): Step | null {
	if (field.over !== 'live' || field.state[i] !== OPEN || !field.count[i]) return null;
	const near = neighbours(field.w, field.h, i);
	let flagged = 0;
	const hidden: number[] = [];
	for (const j of near) {
		if (field.state[j] === FLAG) flagged += 1;
		else if (field.state[j] === HIDDEN) hidden.push(j);
	}
	if (flagged !== field.count[i] || !hidden.length) return null;
	const wrong = hidden.find((j) => field.mine[j]);
	if (wrong !== undefined) return burst(field, i, wrong);
	const cells: number[] = [];
	const dist: number[] = [];
	flood(field, hidden, i, cells, dist);
	settle(field);
	return { kind: 'open', origin: i, cells, dist };
}

/** Returns the cell's new state, or null when it can't be flagged. */
export function toggleFlag(field: Field, i: number) {
	if (field.over !== 'live') return null;
	const s = field.state[i];
	if (s === OPEN) return null;
	field.state[i] = s === FLAG ? HIDDEN : FLAG;
	field.flags += s === FLAG ? -1 : 1;
	return field.state[i];
}

/** Open cells whose hidden neighbours exactly match what's left: the board can flag them for you. */
export function flagsAround(field: Field, i: number) {
	const out: number[] = [];
	if (field.state[i] !== OPEN || !field.count[i]) return out;
	const near = neighbours(field.w, field.h, i);
	const shut = near.filter((j) => field.state[j] !== OPEN);
	if (shut.length !== field.count[i]) return out;
	for (const j of shut) if (field.state[j] === HIDDEN) out.push(j);
	return out;
}

/**
 * Logic-only sweep from `start`: single-cell rules, pairwise overlap rules, then the global
 * mine count. True when every safe cell can be opened without guessing.
 */
export function solves(mine: Uint8Array, w: number, h: number, mines: number, start: number) {
	const total = w * h;
	const count = new Uint8Array(total);
	countAll(w, h, mine, count);
	if (mine[start]) return false;
	// 0 unknown, 1 open, 2 known mine
	const known = new Uint8Array(total);
	const near: number[] = [];
	let opened = 0;
	let flagged = 0;
	const goal = total - mines;
	const stack: number[] = [];

	const open = (i: number) => {
		if (known[i]) return;
		known[i] = 1;
		opened += 1;
		stack.push(i);
		while (stack.length) {
			const c = stack.pop()!;
			if (count[c]) continue;
			for (const j of neighbours(w, h, c, near)) {
				if (known[j]) continue;
				known[j] = 1;
				opened += 1;
				stack.push(j);
			}
		}
	};
	const markMine = (i: number) => {
		if (known[i]) return;
		known[i] = 2;
		flagged += 1;
	};

	open(start);
	type Rule = { cells: number[]; need: number };
	const ruleNear: number[] = [];

	while (opened < goal) {
		let progress = false;
		const rules: Rule[] = [];
		const byCell = new Map<number, number[]>();
		for (let i = 0; i < total; i += 1) {
			if (known[i] !== 1 || !count[i]) continue;
			const cells: number[] = [];
			let need = count[i];
			for (const j of neighbours(w, h, i, ruleNear)) {
				if (known[j] === 2) need -= 1;
				else if (!known[j]) cells.push(j);
			}
			if (!cells.length) continue;
			if (need === 0) {
				for (const j of cells) open(j);
				progress = true;
			} else if (need === cells.length) {
				for (const j of cells) markMine(j);
				progress = true;
			} else {
				const id = rules.length;
				rules.push({ cells, need });
				for (const j of cells) {
					const list = byCell.get(j);
					if (list) list.push(id);
					else byCell.set(j, [id]);
				}
			}
		}
		if (progress) continue;

		const seen = new Set<number>();
		for (let a = 0; a < rules.length && !progress; a += 1) {
			const A = rules[a];
			seen.clear();
			for (const cell of A.cells) {
				for (const b of byCell.get(cell) ?? []) {
					if (b === a || seen.has(b)) continue;
					seen.add(b);
					const B = rules[b];
					const onlyA = A.cells.filter((c) => !B.cells.includes(c));
					const onlyB = B.cells.filter((c) => !A.cells.includes(c));
					const dn = B.need - A.need;
					if (!onlyA.length && dn === 0 && onlyB.length) {
						for (const c of onlyB) if (!known[c]) open(c);
						progress = true;
					} else if (onlyB.length && dn === onlyB.length) {
						for (const c of onlyB) markMine(c);
						for (const c of onlyA) if (!known[c]) open(c);
						progress = true;
					}
					if (progress) break;
				}
				if (progress) break;
			}
		}
		if (progress) continue;

		const left = mines - flagged;
		let unknown = 0;
		for (let i = 0; i < total; i += 1) if (!known[i]) unknown += 1;
		if (left === 0 && unknown) {
			for (let i = 0; i < total; i += 1) if (!known[i]) open(i);
			continue;
		}
		return false;
	}
	return true;
}

export type SavedCore = { mines: number[]; state: string };

export function serialise(field: Field): SavedCore {
	const mines: number[] = [];
	for (let i = 0; i < field.total; i += 1) if (field.mine[i]) mines.push(i);
	return { mines, state: Array.from(field.state).join('') };
}

export function restore(spec: Spec, core: SavedCore, start: number, guessFree: boolean): Field | null {
	const field = createField(spec);
	if (core.state.length !== field.total || core.mines.length !== field.mines) return null;
	for (const i of core.mines) {
		if (!Number.isInteger(i) || i < 0 || i >= field.total) return null;
		field.mine[i] = 1;
	}
	countAll(field.w, field.h, field.mine, field.count);
	field.planted = true;
	for (let i = 0; i < field.total; i += 1) {
		const s = Number(core.state[i]);
		if (s === OPEN && field.mine[i]) return null;
		field.state[i] = s === OPEN || s === FLAG ? s : HIDDEN;
		if (s === OPEN) field.opened += 1;
		if (s === FLAG) field.flags += 1;
	}
	field.start = start;
	field.guessFree = guessFree;
	return field;
}
