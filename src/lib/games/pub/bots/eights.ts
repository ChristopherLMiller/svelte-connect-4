import { suitOf, type Card, type Suit } from '../../kit/cards/deck';
import { canDraw, isEight, legalEights, penalty, type EightsAction, type EightsState } from '../rules/eights';
import type { Difficulty } from '../types';
import { bestBy, pick } from './shared';

/** The suit to name after an eight: the one you hold most of (high cards break ties). */
export function bestSuit(hand: Card[], avoid: Suit[] = []): Suit {
	const rest = hand.filter((c) => !isEight(c));
	return bestBy([0, 1, 2, 3] as Suit[], (suit) => {
		const mine = rest.filter((c) => suitOf(c) === suit);
		return mine.length * 10 + mine.reduce((t, c) => t + penalty(c), 0) * 0.05 + (avoid.includes(suit) ? 4 : 0);
	});
}

/** Score for playing a card: shed points, keep options, save the eights. */
export function eightsScore(s: EightsState, seat: number, c: Card, difficulty: Difficulty) {
	const hand = s.hands[seat];
	const next = (seat + 1) % 4;
	const nextShort = s.hands[next].length <= 2;
	if (isEight(c)) return nextShort && difficulty === 'hard' ? 5 : -40;
	const after = hand.filter((x) => x !== c);
	const follow = after.filter((x) => suitOf(x) === suitOf(c) || isEight(x)).length;
	let v = penalty(c) * 0.6 + follow * 2;
	if (difficulty === 'hard') {
		if (s.shy[next].includes(suitOf(c))) v += 4;
		const short = [0, 1, 2, 3].filter((i) => i !== seat && s.hands[i].length <= 2).some((i) => s.shy[i].includes(suitOf(c)));
		if (short) v += 2;
	}
	return v;
}

export function eightsAi(s: EightsState, seat: number, difficulty: Difficulty, random: () => number): EightsAction {
	if (s.phase === 'suit') {
		if (difficulty === 'easy' && random() < 0.35) return { type: 'suit', suit: Math.floor(random() * 4) as Suit };
		const next = (seat + 1) % 4;
		return { type: 'suit', suit: bestSuit(s.hands[seat], difficulty === 'hard' ? s.shy[next] : []) };
	}
	const legal = legalEights(s, seat);
	if (!legal.length) return canDraw(s) ? { type: 'draw' } : { type: 'pass' };
	if (difficulty === 'easy' && random() < 0.45) return { type: 'play', card: pick(legal, random) };
	return { type: 'play', card: bestBy(legal, (c) => eightsScore(s, seat, c, difficulty)) };
}
