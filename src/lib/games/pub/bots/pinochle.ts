import { rankOf, suitOf, type Card, type Suit } from '../../kit/cards/deck';
import { MIN_BID, isCounter, legalPinochle, meldOf, meldPoints, mustBid, powerP, rankP, teamOf, winningSeatP, type PinochleAction, type PinochleState } from '../rules/pinochle';
import type { Difficulty } from '../types';
import { bestBy, pick } from './shared';

const ACE = 12;
const TEN = 8;
/** What a partner usually brings: some meld and a share of the counters. */
export const PARTNER_SHARE = 12;

export type TrumpPlan = { suit: Suit; meld: number; length: number; tricks: number; total: number };

/** Value of a hand with each suit as trump: meld plus the counters it should take. */
export function trumpPlans(hand: Card[]): TrumpPlan[] {
	return ([0, 1, 2, 3] as Suit[]).map((suit) => {
		const meld = meldPoints(meldOf(hand, suit));
		const length = hand.filter((c) => suitOf(c) === suit).length;
		const aces = hand.filter((c) => rankOf(c) === ACE && suitOf(c) !== suit).length;
		const tens = hand.filter((c) => rankOf(c) === TEN).length;
		const tricks = Math.max(0, length - 3) * 1.5 + aces * 1.2 + tens * 0.4 + hand.filter((c) => suitOf(c) === suit && rankOf(c) === ACE).length;
		return { suit, meld, length, tricks, total: meld + tricks };
	});
}

export const bestTrump = (hand: Card[]) => bestBy(trumpPlans(hand), (p) => p.total + p.length * 0.8);

export function bidLimit(s: PinochleState, seat: number, difficulty: Difficulty) {
	const plan = bestTrump(s.hands[seat]);
	const partner = s.bids[(seat + 2) % 4];
	const lift = typeof partner === 'number' && difficulty !== 'easy' ? 4 : 0;
	return Math.floor(plan.total + PARTNER_SHARE + lift - (difficulty === 'hard' ? 0 : 2));
}

function playCard(s: PinochleState, seat: number, difficulty: Difficulty, random: () => number): Card {
	const legal = legalPinochle(s, seat);
	if (difficulty === 'easy' && random() < 0.3) return pick(legal, random);
	const trump = s.trump;
	const lead = s.trick[s.leader];
	const low = (cards: Card[]) => bestBy(cards, (c) => -(rankP(c) + (isCounter(c) ? 6 : 0) + (suitOf(c) === trump ? 10 : 0)));
	if (lead === null) {
		const aces = legal.filter((c) => rankOf(c) === ACE && suitOf(c) !== trump);
		if (aces.length) return aces[0];
		const bidTeam = s.bidder !== null && teamOf(s.bidder) === teamOf(seat);
		const trumps = legal.filter((c) => suitOf(c) === trump);
		if (bidTeam && trumps.length >= 4) return bestBy(trumps, (c) => rankP(c));
		const plain = legal.filter((c) => suitOf(c) !== trump && !isCounter(c));
		return low(plain.length ? plain : legal);
	}
	const led = suitOf(lead);
	const w = winningSeatP(s)!;
	const top = s.trick[w]!;
	const last = s.trick.filter((c) => c !== null).length === 3;
	const partnerWins = teamOf(w) === teamOf(seat);
	const winners = legal.filter((c) => powerP(c, led, trump) > powerP(top, led, trump));
	const safe = partnerWins && (last || rankOf(top) === ACE || (suitOf(top) === trump && suitOf(lead) !== trump));
	if (partnerWins && (safe || !winners.length)) {
		const counters = legal.filter((c) => isCounter(c) && !(suitOf(c) === trump && rankOf(c) === ACE));
		if (counters.length && (safe || difficulty !== 'hard')) return bestBy(counters, (c) => (rankOf(c) === TEN ? 3 : rankOf(c) === ACE ? 2 : 1) - (suitOf(c) === trump ? 5 : 0));
		return low(legal);
	}
	if (winners.length) {
		if (last) return bestBy(winners, (c) => -powerP(c, led, trump) + (isCounter(c) ? 3 : 0));
		return bestBy(winners, (c) => powerP(c, led, trump));
	}
	return low(legal);
}

export function pinochleAi(s: PinochleState, seat: number, difficulty: Difficulty, random: () => number): PinochleAction {
	if (s.phase === 'bid') {
		const next = s.high === null ? MIN_BID : s.high + 1;
		const limit = bidLimit(s, seat, difficulty) + (difficulty === 'easy' ? Math.floor(random() * 7) - 3 : 0);
		if (mustBid(s)) return { type: 'bid', bid: next };
		const partner = (seat + 2) % 4;
		if (difficulty !== 'easy' && s.bidder === null && s.high !== null && s.bids[partner] === s.high && limit < next + 3) return { type: 'pass' };
		return next <= limit ? { type: 'bid', bid: next } : { type: 'pass' };
	}
	if (s.phase === 'trump') return { type: 'trump', suit: bestTrump(s.hands[seat]).suit };
	if (s.phase === 'play') return { type: 'play', card: playCard(s, seat, difficulty, random) };
	return { type: 'next' };
}
