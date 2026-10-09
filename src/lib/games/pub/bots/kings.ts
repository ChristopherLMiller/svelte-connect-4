import { rankOf, type Card } from '../../kit/cards/deck';
import { CORNERS, SIDES, fits, isKing, legalKings, type KingsAction, type KingsState } from '../rules/kings';
import type { Difficulty } from '../types';
import { bestBy } from './shared';

/** How many cards in hand could follow `c` once it's on top. */
function followers(hand: Card[], c: Card, s: KingsState, pile: number) {
	const trial: KingsState = { ...s, piles: s.piles.map((p, i) => (i === pile ? [...p, c] : p)) };
	return hand.filter((x) => x !== c && fits(trial, x, pile)).length;
}

export function kingsScore(s: KingsState, a: KingsAction, difficulty: Difficulty): number {
	const hand = s.hands[s.turn];
	if (a.type === 'move') return isKing(s.piles[a.from][0]) ? 90 : 80;
	if (a.type !== 'play') return 0;
	const corner = CORNERS.includes(a.pile);
	const empty = !s.piles[a.pile].length;
	if (corner && empty) return 100;
	if (!empty) return 50 + (difficulty === 'hard' ? followers(hand, a.card, s, a.pile) * 3 : 0) + rankOf(a.card) * 0.1;
	if (isKing(a.card)) return 5;
	const follow = followers(hand, a.card, s, a.pile);
	return 20 + (difficulty === 'easy' ? 0 : follow * 4 + rankOf(a.card) * 0.3);
}

export function kingsAi(s: KingsState, seat: number, difficulty: Difficulty, random: () => number): KingsAction {
	if (s.phase !== 'play') return { type: 'next' };
	let options = legalKings(s, seat);
	if (difficulty !== 'hard') {
		const sides = SIDES.filter((p) => !s.piles[p].length);
		if (sides.length && difficulty === 'easy') options = options.filter((a) => !(a.type === 'play' && sides.includes(a.pile) && isKing(a.card)));
	}
	if (!options.length) return { type: 'end' };
	if (difficulty === 'easy' && random() < 0.12) return { type: 'end' };
	return bestBy(options, (a) => kingsScore(s, a, difficulty));
}
