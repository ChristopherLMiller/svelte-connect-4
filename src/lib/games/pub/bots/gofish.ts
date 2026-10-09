import { countRank, ranksIn, targetsFor, type GoFishAction, type GoFishState } from '../rules/gofish';
import type { Difficulty } from '../types';
import { bestBy, pick } from './shared';

const MEMORY: Record<Difficulty, number> = { easy: 3, medium: 10, hard: Infinity };

/** Ranks each seat has shown it holds (by asking, or a lucky draw), from the last `memory` asks. */
export function shownRanks(s: GoFishState, memory = Infinity): Set<number>[] {
	const shown = [0, 1, 2, 3].map(() => new Set<number>());
	const from = Math.max(0, s.log.length - memory);
	s.log.forEach((e, i) => {
		if (e.got) shown[e.target].delete(e.rank);
		if (i < from) return;
		shown[e.seat].add(e.rank);
	});
	for (const b of s.books.flat()) shown.forEach((set) => set.delete(b));
	return shown;
}

/** Seats that just said "go fish" to this rank and haven't been seen to pick one up since. */
export function saidNo(s: GoFishState, rank: number, memory = Infinity): Set<number> {
	const no = new Set<number>();
	const from = Math.max(0, s.log.length - memory);
	s.log.forEach((e, i) => {
		if (i < from) return;
		if (e.rank === rank && !e.got) no.add(e.target);
		if (e.fished) no.delete(e.seat);
		if (e.got && e.rank === rank) no.delete(e.seat);
	});
	return no;
}

export type FishPlan = { target: number; rank: number; known: boolean };

export function fishPlan(s: GoFishState, seat: number, memory = Infinity): FishPlan {
	const mine = ranksIn(s.hands[seat]);
	const targets = targetsFor(s, seat);
	const shown = shownRanks(s, memory);
	const known = targets.flatMap((t) => mine.filter((r) => shown[t].has(r)).map((rank) => ({ target: t, rank })));
	if (known.length) {
		const best = bestBy(known, (k) => countRank(s.hands[seat], k.rank) * 10 + s.hands[k.target].length * 0.1);
		return { ...best, known: true };
	}
	const rank = bestBy(mine, (r) => countRank(s.hands[seat], r) * 10 - saidNo(s, r, memory).size * 3 + r * 0.01);
	const no = saidNo(s, rank, memory);
	const open = targets.filter((t) => !no.has(t));
	const target = bestBy(open.length ? open : targets, (t) => s.hands[t].length);
	return { target, rank, known: false };
}

export function goFishAi(s: GoFishState, seat: number, difficulty: Difficulty, random: () => number): GoFishAction {
	if (difficulty === 'easy' && random() < 0.4) return { type: 'ask', target: pick(targetsFor(s, seat), random), rank: pick(ranksIn(s.hands[seat]), random) };
	const plan = fishPlan(s, seat, MEMORY[difficulty]);
	return { type: 'ask', target: plan.target, rank: plan.rank };
}
