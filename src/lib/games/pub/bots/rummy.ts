import { rankOf, suitOf, type Card } from '../../kit/cards/deck';
import { canDiscard, canTake, fitsMeld, meldKind, rummyValue, type RummyAction, type RummyState } from '../rules/rummy';
import type { Difficulty } from '../types';
import { bestBy, pick } from './shared';

const ACE = 12;

/** Every set (whole rank group) and maximal run in a hand. */
export function meldsIn(hand: Card[]): Card[][] {
	const out: Card[][] = [];
	const byRank = new Map<number, Card[]>();
	for (const c of hand) byRank.set(rankOf(c), [...(byRank.get(rankOf(c)) ?? []), c]);
	for (const group of byRank.values()) if (group.length >= 3) out.push(group);
	for (let suit = 0; suit < 4; suit++) {
		const at = new Map<number, Card>();
		for (const c of hand) {
			if (suitOf(c) !== suit) continue;
			at.set(rankOf(c), c);
			if (rankOf(c) === ACE) at.set(-1, c);
		}
		let run: Card[] = [];
		for (let p = -1; p <= ACE + 1; p++) {
			const c = at.get(p);
			if (c !== undefined && !run.includes(c)) run.push(c);
			else {
				if (run.length >= 3) out.push(run);
				run = c !== undefined ? [c] : [];
			}
		}
	}
	return out.filter((m) => meldKind(m) !== null);
}

const points = (cards: Card[]) => cards.reduce((t, c) => t + rummyValue(c), 0);

/** Greedy best melding: the most points that can go down from these cards. */
export function meldPoints(hand: Card[]): { melds: Card[][]; points: number } {
	let left = hand.slice();
	const melds: Card[][] = [];
	for (;;) {
		const options = meldsIn(left);
		if (!options.length) break;
		const best = bestBy(options, points);
		melds.push(best);
		left = left.filter((c) => !best.includes(c));
	}
	return { melds, points: melds.reduce((t, m) => t + points(m), 0) };
}

/** How much a card is worth keeping: pairs and near-runs could become melds. */
export function keepScore(hand: Card[], c: Card) {
	const others = hand.filter((x) => x !== c);
	let v = 0;
	if (others.some((x) => rankOf(x) === rankOf(c))) v += 8;
	for (const x of others) {
		if (suitOf(x) !== suitOf(c)) continue;
		const gap = Math.abs(rankOf(x) - rankOf(c));
		const gapLow = rankOf(c) === ACE || rankOf(x) === ACE ? Math.abs((rankOf(x) === ACE ? -1 : rankOf(x)) - (rankOf(c) === ACE ? -1 : rankOf(c))) : gap;
		const g = Math.min(gap, gapLow);
		if (g === 1) v += 6;
		else if (g === 2) v += 3;
	}
	return v - rummyValue(c) * 0.4;
}

export type RummyPlan = { action: RummyAction; why: 'stock' | 'top' | 'deep' | 'must' | 'meld' | 'layoff' | 'discard'; gain?: number };

export function rummyPlan(s: RummyState, seat: number, difficulty: Difficulty): RummyPlan {
	const hand = s.hands[seat];
	if (s.phase === 'draw') {
		const base = meldPoints(hand).points;
		const top = s.discard.length - 1;
		let best: { index: number; gain: number } | null = null;
		const deepest = difficulty === 'easy' ? top : 0;
		for (let i = top; i >= deepest; i--) {
			if (!canTake(s, i)) continue;
			const taken = s.discard.slice(i);
			const after = meldPoints([...hand, ...taken]);
			const lays = taken.filter((c) => s.melds.some((m) => fitsMeld(m, c))).reduce((t, c) => t + rummyValue(c), 0);
			const melded = new Set(after.melds.flat());
			const stuck = taken.filter((c) => !melded.has(c)).reduce((t, c) => t + rummyValue(c), 0);
			const risk = s.stock.length < 8 ? 0.9 : difficulty === 'hard' ? 0.35 : 0.5;
			const gain = after.points - base + lays - stuck * risk;
			if (!best || gain > best.gain) best = { index: i, gain };
		}
		if (best && best.gain > (best.index === top ? 0 : 10)) return { action: { type: 'take', index: best.index }, why: best.index === top ? 'top' : 'deep', gain: best.gain };
		return { action: { type: 'draw' }, why: 'stock' };
	}
	if (s.must !== null) {
		const must = s.must;
		const withMust = meldsIn(hand).filter((m) => m.includes(must));
		if (withMust.length) return { action: { type: 'meld', cards: bestBy(withMust, points) }, why: 'must' };
		const set = hand.filter((c) => rankOf(c) === rankOf(must));
		if (set.length >= 3) return { action: { type: 'meld', cards: set }, why: 'must' };
		const at = s.melds.findIndex((m) => fitsMeld(m, must));
		if (at >= 0) return { action: { type: 'layoff', card: must, meld: at }, why: 'must' };
		const runs = smallRuns(hand, must);
		if (runs.length) return { action: { type: 'meld', cards: runs[0] }, why: 'must' };
	}
	const melds = meldsIn(hand);
	if (melds.length) return { action: { type: 'meld', cards: bestBy(melds, points) }, why: 'meld' };
	for (const c of hand) {
		const at = s.melds.findIndex((m) => fitsMeld(m, c));
		if (at >= 0) return { action: { type: 'layoff', card: c, meld: at }, why: 'layoff' };
	}
	const options = hand.filter((c) => canDiscard(s, c));
	return { action: { type: 'discard', card: bestBy(options, (c) => -keepScore(hand, c)) }, why: 'discard' };
}

/** Three-card runs through `c`, for when a maximal run would swallow it awkwardly. */
function smallRuns(hand: Card[], c: Card): Card[][] {
	const out: Card[][] = [];
	for (let i = 0; i < hand.length; i++)
		for (let j = i + 1; j < hand.length; j++) {
			const trio = [c, hand[i], hand[j]];
			if (!trio.slice(1).includes(c) && meldKind(trio) === 'run') out.push(trio);
		}
	return out;
}

export function rummyAi(s: RummyState, seat: number, difficulty: Difficulty, random: () => number): RummyAction {
	if (s.phase === 'meld' && difficulty === 'easy' && s.must === null) {
		const options = s.hands[seat].filter((c) => canDiscard(s, c));
		if (random() < 0.25 && options.length) return { type: 'discard', card: pick(options, random) };
	}
	return rummyPlan(s, seat, difficulty).action;
}
