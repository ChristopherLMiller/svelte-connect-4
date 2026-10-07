import { Field, center, type Board } from './engine';
import type { Difficulty, Player } from './types';

const WIN = 1_000_000;

class Timeout extends Error {}

type Search = { deadline: number; nodes: number };

/**
 * Victory by continuous fours: every attacking stone makes a four, so each reply is
 * forced, until a double four (or a four the defender can't stop) lands. Returns the
 * first stone of such a sequence, or -1.
 */
function vcf(field: Field, att: Player, depth: number, budget: { nodes: number }): number {
	const def: Player = att === 1 ? 2 : 1;
	const now = field.winPoints(att);
	if (now.length) return now[0];
	if (depth <= 0 || budget.nodes <= 0) return -1;
	let moves = field.fourMakers(att);
	const threats = field.winPoints(def);
	if (threats.length > 1) return -1;
	if (threats.length === 1) moves = moves.filter((m) => m === threats[0]);
	if (moves.length > 1) moves.sort((a, b) => field.heat(b, att) - field.heat(a, att));
	for (const m of moves) {
		budget.nodes -= 1;
		field.place(m, att);
		const wins = field.winPoints(att);
		let found = false;
		if (wins.length >= 2 && !field.fours[def]) {
			found = true;
		} else if (wins.length === 1) {
			const block = wins[0];
			const theirFive = field.place(block, def);
			if (!theirFive && vcf(field, att, depth - 1, budget) >= 0) found = true;
			field.remove(block);
		}
		field.remove(m);
		if (found) return m;
		if (budget.nodes <= 0) break;
	}
	return -1;
}

function negamax(field: Field, depth: number, alpha: number, beta: number, me: Player, ply: number, width: number, search: Search): number {
	if ((++search.nodes & 1023) === 0 && performance.now() > search.deadline) throw new Timeout();
	const opp: Player = me === 1 ? 2 : 1;
	if (field.fours[me]) return WIN - ply;
	if (field.stones === field.cells.length) return 0;
	let moves: number[];
	if (field.fours[opp]) {
		moves = field.winPoints(opp);
		if (moves.length > 1) return -(WIN - ply - 1);
		if (depth <= 0 && ply > 10) return field.evaluate(me);
	} else {
		if (depth <= 0) return field.evaluate(me);
		moves = field.candidates(me, width);
	}
	let best = -Infinity;
	for (const m of moves) {
		field.place(m, me);
		const score = -negamax(field, depth - 1, -beta, -alpha, opp, ply + 1, Math.max(6, width - 2), search);
		field.remove(m);
		if (score > best) best = score;
		if (score > alpha) alpha = score;
		if (alpha >= beta) break;
	}
	return best;
}

function rank(field: Field, me: Player, moves: number[], depth: number, width: number, search: Search) {
	const opp: Player = me === 1 ? 2 : 1;
	const scored: Array<[number, number]> = [];
	let alpha = -Infinity;
	for (const m of moves) {
		field.place(m, me);
		const score = -negamax(field, depth - 1, -Infinity, -alpha + 1, opp, 1, width, search);
		field.remove(m);
		scored.push([m, score]);
		if (score > alpha) alpha = score;
	}
	return scored.sort((a, b) => b[1] - a[1]);
}

function pickWeighted<T>(items: T[], weight: (item: T, rank: number) => number) {
	const weights = items.map((item, k) => weight(item, k));
	let roll = Math.random() * weights.reduce((a, b) => a + b, 0);
	for (let k = 0; k < items.length; k += 1) {
		roll -= weights[k];
		if (roll <= 0) return items[k];
	}
	return items[0];
}

export function chooseAiMove(board: Board, size: number, me: Player, difficulty: Difficulty): number {
	const field = new Field(size, board);
	const opp: Player = me === 1 ? 2 : 1;
	if (!field.stones) {
		const mid = center(size);
		if (difficulty !== 'easy') return mid;
		const r = Math.floor(mid / size) + Math.round(Math.random() * 2 - 1);
		const c = (mid % size) + Math.round(Math.random() * 2 - 1);
		return r * size + c;
	}

	const winNow = field.winPoints(me);
	if (winNow.length) return winNow[0];
	const mustBlock = field.winPoints(opp);
	if (mustBlock.length && (difficulty !== 'easy' || Math.random() < 0.8)) return mustBlock[0];

	if (difficulty === 'easy') {
		const pool = field.candidates(me, 8);
		return pickWeighted(pool, (_, k) => Math.pow(0.55, k));
	}

	const ownVcf = vcf(field, me, difficulty === 'hard' ? 14 : 5, { nodes: difficulty === 'hard' ? 40000 : 3000 });
	if (ownVcf >= 0) return ownVcf;

	if (difficulty === 'medium') {
		const search: Search = { deadline: performance.now() + 700, nodes: 0 };
		try {
			const ranked = rank(field, me, field.candidates(me, 10), 2, 8, search);
			const [first, second] = ranked;
			if (second && second[1] > -WIN / 2 && first[1] < WIN / 2 && first[1] - second[1] < 250 && Math.random() < 0.2) return second[0];
			return first[0];
		} catch {
			return field.candidates(me, 1)[0];
		}
	}

	const deadline = performance.now() + 850;
	let roots = field.candidates(me, 14);
	const theirVcf = vcf(field, opp, 12, { nodes: 20000 });
	if (theirVcf >= 0) {
		const pool = [...new Set([theirVcf, ...field.fourMakers(me), ...field.candidates(me, 18)])];
		const safe = pool.filter((m) => {
			field.place(m, me);
			const stillLost = vcf(field, opp, 12, { nodes: 6000 }) >= 0;
			field.remove(m);
			return !stillLost;
		});
		if (safe.length) roots = safe.slice(0, 14);
	}

	let best = roots[0];
	for (let depth = 2; depth <= 8; depth += 1) {
		const search: Search = { deadline, nodes: 0 };
		try {
			const ranked = rank(field, me, roots, depth, 10, search);
			best = ranked[0][0];
			roots = ranked.map(([m]) => m);
			if (ranked[0][1] >= WIN / 2) break;
		} catch (error) {
			if (error instanceof Timeout) break;
			throw error;
		}
		if (performance.now() > deadline - 120) break;
	}
	return best;
}
