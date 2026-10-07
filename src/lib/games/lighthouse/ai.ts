import { HIT, MISS, SUNK, UNKNOWN, neighbours } from './engine';
import type { Difficulty } from './types';

export type AiView = {
	size: number;
	/** The attacker's chart of the rival's waters: UNKNOWN, MISS, HIT or SUNK per cell. */
	shots: number[];
	/** Lengths of the rival ships still afloat. */
	afloat: number[];
	difficulty: Difficulty;
};

const pick = <T>(list: T[], rand: () => number) => list[Math.floor(rand() * list.length)];

function open(shots: number[]) {
	const out: number[] = [];
	shots.forEach((s, i) => {
		if (s === UNKNOWN) out.push(i);
	});
	return out;
}

/** Unknown cells that continue a straight run of hits, or touch a lone hit. */
function targets(size: number, shots: number[]) {
	const hits = open(shots.map((s) => (s === HIT ? UNKNOWN : MISS)));
	const lined: number[] = [];
	const loose: number[] = [];
	for (const h of hits) {
		const r = Math.floor(h / size);
		const c = h % size;
		for (const [dr, dc] of [
			[0, 1],
			[1, 0]
		]) {
			const pr = r - dr;
			const pc = c - dc;
			if (pr >= 0 && pc >= 0 && shots[pr * size + pc] === HIT) continue;
			let er = r;
			let ec = c;
			while (er + dr < size && ec + dc < size && shots[(er + dr) * size + ec + dc] === HIT) {
				er += dr;
				ec += dc;
			}
			if (er === r && ec === c) continue;
			if (pr >= 0 && pc >= 0 && shots[pr * size + pc] === UNKNOWN) lined.push(pr * size + pc);
			const nr = er + dr;
			const nc = ec + dc;
			if (nr < size && nc < size && shots[nr * size + nc] === UNKNOWN) lined.push(nr * size + nc);
		}
		for (const n of neighbours(size, h)) if (shots[n] === UNKNOWN) loose.push(n);
	}
	return { hits, lined, loose };
}

/**
 * How many ways each unknown cell could hold a surviving ship. While hits are unresolved,
 * only placements through them count, weighted by how many hits they explain.
 */
export function density(size: number, shots: number[], afloat: number[]) {
	const score = new Float64Array(size * size);
	const unresolved = shots.some((s) => s === HIT);
	for (const length of afloat) {
		for (let vertical = 0; vertical < 2; vertical += 1) {
			const rows = vertical ? size - length + 1 : size;
			const cols = vertical ? size : size - length + 1;
			for (let r = 0; r < rows; r += 1) {
				for (let c = 0; c < cols; c += 1) {
					let covered = 0;
					let blocked = false;
					for (let k = 0; k < length; k += 1) {
						const s = shots[vertical ? (r + k) * size + c : r * size + c + k];
						if (s === MISS || s === SUNK) {
							blocked = true;
							break;
						}
						if (s === HIT) covered += 1;
					}
					if (blocked || covered === length) continue;
					if (unresolved && !covered) continue;
					const weight = covered ? 1 + covered * covered * 12 : 1;
					for (let k = 0; k < length; k += 1) {
						const i = vertical ? (r + k) * size + c : r * size + c + k;
						if (shots[i] === UNKNOWN) score[i] += weight;
					}
				}
			}
		}
	}
	return score;
}

function best(score: Float64Array, cells: number[], rand: () => number, bias?: (i: number) => number) {
	let top = -1;
	let out: number[] = [];
	for (const i of cells) {
		const v = score[i] + (bias ? bias(i) : 0);
		if (v > top + 1e-9) {
			top = v;
			out = [i];
		} else if (Math.abs(v - top) <= 1e-9) out.push(i);
	}
	return out.length ? pick(out, rand) : -1;
}

export function chooseShot(view: AiView, rand = Math.random): number {
	const { size, shots, afloat, difficulty } = view;
	const free = open(shots);
	if (!free.length) return -1;
	const { hits, lined, loose } = targets(size, shots);
	const shortest = Math.max(2, Math.min(...afloat, 99));
	const parity = (i: number) => (Math.floor(i / size) + (i % size)) % shortest === 0;

	if (difficulty === 'easy') {
		if (hits.length && loose.length && rand() < 0.6) return pick(loose, rand);
		return pick(free, rand);
	}

	if (difficulty === 'medium') {
		if (lined.length && rand() < 0.9) return pick(lined, rand);
		if (loose.length && rand() < 0.9) return pick(loose, rand);
		const even = free.filter(parity);
		return pick(even.length && rand() < 0.85 ? even : free, rand);
	}

	const score = density(size, shots, afloat);
	return best(score, free, rand, hits.length ? undefined : (i) => (parity(i) ? 0.5 : 0));
}
