import type { Dir } from './types';

/** `cells[r * n + c]` is a tier (value 2^tier), 0 when the well is empty. */
export type Brew = { n: number; cells: number[]; rng: number; score: number };

export type Motion = { from: number; to: number; tier: number; merged: boolean };
export type Merge = { cell: number; tier: number };
export type Spawn = { cell: number; tier: number };

export type Slide = {
	cells: number[];
	motions: Motion[];
	merges: Merge[];
	gain: number;
	moved: boolean;
};

/** mulberry32 as a pure step so the generator state can live in saves and undo. */
export function nextRandom(state: number): [number, number] {
	const s = (state + 0x6d2b79f5) >>> 0;
	let t = s;
	t = Math.imul(t ^ (t >>> 15), t | 1);
	t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
	return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s];
}

export function seedFrom(text: string) {
	let h = 2166136261;
	for (let i = 0; i < text.length; i += 1) {
		h ^= text.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

/** The wells of one row or column, ordered from the side the vials slide toward. */
function line(n: number, dir: Dir, k: number) {
	const out: number[] = [];
	for (let i = 0; i < n; i += 1) {
		if (dir === 'left') out.push(k * n + i);
		else if (dir === 'right') out.push(k * n + (n - 1 - i));
		else if (dir === 'up') out.push(i * n + k);
		else out.push((n - 1 - i) * n + k);
	}
	return out;
}

export function slide(cells: number[], n: number, dir: Dir): Slide {
	const next = new Array<number>(n * n).fill(0);
	const motions: Motion[] = [];
	const merges: Merge[] = [];
	let gain = 0;
	let moved = false;
	for (let k = 0; k < n; k += 1) {
		const wells = line(n, dir, k);
		let slot = 0;
		let open = -1;
		for (const from of wells) {
			const tier = cells[from];
			if (!tier) continue;
			if (open >= 0 && next[wells[open]] === tier) {
				const to = wells[open];
				next[to] = tier + 1;
				gain += 2 ** (tier + 1);
				merges.push({ cell: to, tier: tier + 1 });
				motions.push({ from, to, tier, merged: true });
				const partner = motions.find((m) => m.to === to && !m.merged);
				if (partner) partner.merged = true;
				open = -1;
				moved = true;
				continue;
			}
			const to = wells[slot];
			next[to] = tier;
			motions.push({ from, to, tier, merged: false });
			if (to !== from) moved = true;
			open = slot;
			slot += 1;
		}
	}
	return { cells: next, motions, merges, gain, moved };
}

/** Drops a fresh vial in a random empty well: rainwater nine times in ten, otherwise brine. */
export function spawn(cells: number[], rng: number): { cells: number[]; rng: number; spawn: Spawn | null } {
	const empty: number[] = [];
	for (let i = 0; i < cells.length; i += 1) if (!cells[i]) empty.push(i);
	if (!empty.length) return { cells, rng, spawn: null };
	const [a, s1] = nextRandom(rng);
	const [b, s2] = nextRandom(s1);
	const cell = empty[Math.floor(a * empty.length)];
	const tier = b < 0.9 ? 1 : 2;
	const out = cells.slice();
	out[cell] = tier;
	return { cells: out, rng: s2, spawn: { cell, tier } };
}

export function createBrew(n: number, seed: number): { brew: Brew; spawns: Spawn[] } {
	let cells = new Array<number>(n * n).fill(0);
	let rng = seed >>> 0;
	const spawns: Spawn[] = [];
	for (let k = 0; k < 2; k += 1) {
		const step = spawn(cells, rng);
		cells = step.cells;
		rng = step.rng;
		if (step.spawn) spawns.push(step.spawn);
	}
	return { brew: { n, cells, rng, score: 0 }, spawns };
}

export function canMove(cells: number[], n: number) {
	for (let r = 0; r < n; r += 1) {
		for (let c = 0; c < n; c += 1) {
			const t = cells[r * n + c];
			if (!t) return true;
			if (c + 1 < n && cells[r * n + c + 1] === t) return true;
			if (r + 1 < n && cells[(r + 1) * n + c] === t) return true;
		}
	}
	return false;
}

export function topTier(cells: number[]) {
	let top = 0;
	for (const t of cells) if (t > top) top = t;
	return top;
}

export function validCells(cells: unknown, n: number): cells is number[] {
	return (
		Array.isArray(cells) &&
		cells.length === n * n &&
		cells.every((t) => Number.isInteger(t) && t >= 0 && t <= 18) &&
		cells.some((t) => t > 0)
	);
}
