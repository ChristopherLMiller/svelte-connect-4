import type { Card } from '../../kit/cards/deck';
import { BJ_BETS, betOptions, canDouble, canSplit, cardValue, dealerHits, total, type BlackjackAction, type BlackjackState } from '../rules/blackjack';

export type BjMove = 'hit' | 'stand' | 'double' | 'split';
/** Which part of the strategy chart a decision came from. */
export type BjCase = 'pair' | 'soft' | 'hard';

const between = (up: number, lo: number, hi: number) => up >= lo && up <= hi;

/** Basic strategy for a shoe game: the chart every dealer would rather you didn't know. */
export function basicMove(cards: Card[], up: number, can: { double: boolean; split: boolean }): { move: BjMove; from: BjCase } {
	const t = total(cards);
	if (can.split && cards.length === 2) {
		const v = cardValue(cards[0]);
		const split =
			v === 11 || v === 8 || (v === 9 && (between(up, 2, 6) || up === 8 || up === 9)) || (v === 7 && between(up, 2, 7)) || (v === 6 && between(up, 2, 6)) || (v === 4 && between(up, 5, 6)) || ((v === 2 || v === 3) && between(up, 2, 7));
		if (split) return { move: 'split', from: 'pair' };
	}
	const dbl = (yes: boolean, otherwise: BjMove): BjMove => (yes && can.double ? 'double' : otherwise);
	if (t.soft && t.sum <= 21) {
		const s = t.sum;
		if (s >= 19) return { move: 'stand', from: 'soft' };
		if (s === 18) return { move: dbl(between(up, 3, 6), between(up, 2, 8) ? 'stand' : 'hit'), from: 'soft' };
		if (s === 17) return { move: dbl(between(up, 3, 6), 'hit'), from: 'soft' };
		if (s >= 15) return { move: dbl(between(up, 4, 6), 'hit'), from: 'soft' };
		return { move: dbl(between(up, 5, 6), 'hit'), from: 'soft' };
	}
	const s = t.sum;
	if (s >= 17) return { move: 'stand', from: 'hard' };
	if (s >= 13) return { move: between(up, 2, 6) ? 'stand' : 'hit', from: 'hard' };
	if (s === 12) return { move: between(up, 4, 6) ? 'stand' : 'hit', from: 'hard' };
	if (s === 11) return { move: dbl(up !== 11, 'hit'), from: 'hard' };
	if (s === 10) return { move: dbl(between(up, 2, 9), 'hit'), from: 'hard' };
	if (s === 9) return { move: dbl(between(up, 3, 6), 'hit'), from: 'hard' };
	return { move: 'hit', from: 'hard' };
}

export const upValue = (s: BlackjackState) => cardValue(s.dealer[0]);

export function playerMove(s: BlackjackState) {
	const h = s.hands[s.active];
	return basicMove(h.cards, upValue(s), { double: canDouble(s), split: canSplit(s) });
}

/** A steady bet: about a tenth of the stack, never more than you can afford. */
export function steadyBet(s: BlackjackState) {
	const options = betOptions(s);
	const want = s.chips >= 100 ? 10 : s.chips >= 50 ? 5 : BJ_BETS[0];
	return options.includes(want) ? want : options[0];
}

/** Seat 1 is Bert, who deals by the house rule. Seat 0 only plays here when Rosie is advising. */
export function blackjackAi(s: BlackjackState, seat: number): BlackjackAction {
	if (seat === 1) return dealerHits(s) ? { type: 'hit' } : { type: 'stand' };
	if (s.phase === 'bet') return { type: 'bet', amount: steadyBet(s) };
	return { type: playerMove(s).move };
}
