import { ACE, JACK, KING, QUEEN, SPADES, card, fullDeck, rankOf, suitOf, type Card, type Suit } from '../../kit/cards/deck';
import {
	applySpades,
	contractOf,
	ledSuitS,
	legalSpades,
	partnerOfS,
	powerS,
	scoreTeam,
	teamOfS,
	teamTricks,
	winningSeat,
	type SpadesAction,
	type SpadesState
} from '../rules/spades';
import type { Difficulty } from '../types';
import { bestBy, dealUnknown, pick, type Holder } from './shared';

export type BidItem = { cards: Card[]; value: number; kind: 'ace' | 'king' | 'queen' | 'trump' | 'length' | 'void' | 'short' };

/** Likely tricks in a hand, card by card, so the coach can explain the count. */
export function bidItems(hand: Card[]): BidItem[] {
	const items: BidItem[] = [];
	const bySuit = (s: Suit) => hand.filter((c) => suitOf(c) === s).sort((a, b) => rankOf(b) - rankOf(a));
	const spades = bySuit(SPADES);
	const n = spades.length;
	const has = (s: Suit, r: number) => hand.includes(card(s, r));
	if (has(SPADES, ACE)) items.push({ cards: [card(SPADES, ACE)], value: 1, kind: 'trump' });
	if (has(SPADES, KING)) items.push({ cards: [card(SPADES, KING)], value: n >= 2 ? 0.9 : 0.4, kind: 'trump' });
	if (has(SPADES, QUEEN)) items.push({ cards: [card(SPADES, QUEEN)], value: n >= 3 ? 0.7 : 0.2, kind: 'trump' });
	if (has(SPADES, JACK) && n >= 4) items.push({ cards: [card(SPADES, JACK)], value: 0.4, kind: 'trump' });
	const honours = spades.filter((c) => rankOf(c) >= JACK).length;
	const extra = Math.max(0, n - 3 - Math.max(0, honours - 2));
	if (extra > 0) items.push({ cards: spades.slice(-extra), value: extra * 0.8, kind: 'length' });
	for (const s of [0, 1, 3] as Suit[]) {
		const suit = bySuit(s);
		const len = suit.length;
		if (len === 0) {
			if (n >= 2) items.push({ cards: [], value: n >= 4 ? 1 : 0.7, kind: 'void' });
			continue;
		}
		const ace = has(s, ACE);
		const king = has(s, KING);
		if (ace) items.push({ cards: [card(s, ACE)], value: len <= 6 ? 1 : 0.6, kind: 'ace' });
		if (king) items.push({ cards: [card(s, KING)], value: ace ? (len <= 5 ? 0.9 : 0.4) : len >= 2 && len <= 5 ? 0.6 : 0.2, kind: 'king' });
		if (has(s, QUEEN) && len >= 3 && len <= 4) items.push({ cards: [card(s, QUEEN)], value: ace || king ? 0.5 : 0.25, kind: 'queen' });
		if (len === 1 && !ace && n >= 3) items.push({ cards: suit, value: 0.5, kind: 'short' });
	}
	return items;
}

export const bidTotal = (items: BidItem[]) => items.reduce((t, i) => t + i.value, 0);

/** A hand with no way to stop winning a trick shouldn't go nil. */
export function nilSafe(hand: Card[]) {
	const spades = hand.filter((c) => suitOf(c) === SPADES);
	if (spades.length > 3 || spades.some((c) => rankOf(c) >= JACK)) return false;
	if (hand.some((c) => rankOf(c) === ACE)) return false;
	for (const s of [0, 1, 3] as Suit[]) {
		const suit = hand.filter((c) => suitOf(c) === s);
		const low = suit.filter((c) => rankOf(c) <= 5).length;
		if (suit.some((c) => rankOf(c) === KING) && suit.length <= 3) return false;
		if (suit.length >= 3 && low === 0) return false;
	}
	return bidTotal(bidItems(hand)) < 1.6;
}

function chooseBid(s: SpadesState, seat: number, difficulty: Difficulty, random: () => number) {
	const hand = s.hands[seat];
	const est = bidTotal(bidItems(hand));
	const partnerNil = s.bids[partnerOfS(seat)] === 0;
	if (difficulty !== 'easy' && !partnerNil && nilSafe(hand)) return 0;
	const noise = difficulty === 'easy' ? (random() - 0.5) * 2.4 : difficulty === 'medium' ? (random() - 0.5) * 0.8 : 0;
	return Math.max(1, Math.min(13, Math.round(est + noise)));
}

/** Low cards first, and spades only when nothing else is lower. */
const cheap = (c: Card) => (suitOf(c) === SPADES ? 20 : 0) + rankOf(c);

export function spadesHeuristic(s: SpadesState, seat: number, legal: Card[]): Card {
	if (legal.length === 1) return legal[0];
	const team = teamOfS(seat);
	const partner = partnerOfS(seat);
	const need = contractOf(s, team) - teamTricks(s, team);
	const clean = (p: number) => s.bids[p] === 0 && s.tricks[p] === 0;
	const nilMe = clean(seat);
	const nilPartner = clean(partner);
	const led = ledSuitS(s);
	const lowest = () => bestBy(legal, (c) => -cheap(c));
	const highest = () => bestBy(legal, (c) => cheap(c));

	if (led === null) {
		if (nilMe) return lowest();
		if (nilPartner) return bestBy(legal, (c) => (suitOf(c) === SPADES ? rankOf(c) - 6 : rankOf(c)));
		if (need > 0) {
			const gone = (c: Card) => s.played.some((p) => p.card === c);
			const boss = legal.filter((c) => {
				const suit = suitOf(c);
				for (let r = rankOf(c) + 1; r <= ACE; r++) if (!gone(card(suit, r)) && !s.hands[seat].includes(card(suit, r))) return false;
				return suit !== SPADES || s.spadesBroken;
			});
			const sideBoss = boss.filter((c) => suitOf(c) !== SPADES);
			if (sideBoss.length) return bestBy(sideBoss, (c) => rankOf(c));
			if (boss.length) return boss[0];
		}
		const side = legal.filter((c) => suitOf(c) !== SPADES);
		const pool = side.length ? side : legal;
		const count = (c: Card) => s.hands[seat].filter((x) => suitOf(x) === suitOf(c)).length;
		return bestBy(pool, (c) => -rankOf(c) - (need > 0 ? count(c) * 0.3 : 0));
	}

	const w = winningSeat(s)!;
	const top = powerS(s.trick[w]!, led);
	const played = s.trick.filter((c) => c !== null).length;
	const last = played === 3;
	const winners = legal.filter((c) => powerS(c, led) > top);
	const losers = legal.filter((c) => powerS(c, led) < top);
	const highestLoser = () => bestBy(losers, (c) => powerS(c, led));
	const cheapestWinner = () => bestBy(winners, (c) => -powerS(c, led));

	if (nilMe) {
		if (losers.length) return highestLoser();
		return last ? highest() : cheapestWinner();
	}
	if (nilPartner) {
		if (w === partner && winners.length) return cheapestWinner();
		if (s.trick[partner] === null && winners.length) return bestBy(winners, (c) => powerS(c, led));
	}
	if (w === partner) return lowest();
	if (clean(w) && losers.length) return highestLoser();
	if (need > 0 && winners.length) {
		if (last) return cheapestWinner();
		const inSuit = winners.filter((c) => suitOf(c) === led);
		return inSuit.length ? bestBy(inSuit, (c) => rankOf(c)) : cheapestWinner();
	}
	if (need <= 0 && losers.length) return highestLoser();
	if (need <= 0) return last ? highest() : lowest();
	return lowest();
}

/** Points the seat's team gains over the other team once the hand is played out. */
export function spadesMargin(s: SpadesState, seat: number) {
	const team = teamOfS(seat);
	const mine = scoreTeam(s, team, s.bags[team]).points;
	const theirs = scoreTeam(s, 1 - team, s.bags[1 - team]).points;
	return mine - theirs;
}

function rollout(s: SpadesState, seat: number): number {
	let state = s;
	let guard = 0;
	while (guard++ < 80) {
		if (state.phase === 'trick') {
			if (state.trickNo === 12) {
				const done = structuredClone(state);
				done.tricks[done.lastWinner!]++;
				return spadesMargin(done, seat);
			}
			state = applySpades(state, { type: 'next' });
			continue;
		}
		if (state.phase !== 'play') break;
		state = applySpades(state, { type: 'play', card: spadesHeuristic(state, state.turn, legalSpades(state)) });
	}
	return spadesMargin(state, seat);
}

function sample(s: SpadesState, seat: number, random: () => number): SpadesState | null {
	const voids = [0, 1, 2, 3].map(() => new Set<Suit>());
	for (const p of s.played) if (suitOf(p.card) !== p.led) voids[p.seat].add(p.led);
	const seen = new Set<Card>([...s.hands[seat], ...s.played.map((p) => p.card)]);
	const unknown = fullDeck().filter((c) => !seen.has(c));
	const holders: Holder[] = [0, 1, 2, 3].filter((i) => i !== seat).map((i) => ({ seat: i, need: s.hands[i].length, voids: voids[i], known: [] }));
	const hands = dealUnknown(unknown, holders, random, suitOf);
	if (!hands) return null;
	return { ...s, hands: s.hands.map((h, i) => (i === seat ? h.slice() : hands.get(i)!)) };
}

export function spadesAi(s: SpadesState, seat: number, difficulty: Difficulty, random: () => number): SpadesAction {
	if (s.phase === 'bid') return { type: 'bid', bid: chooseBid(s, seat, difficulty, random) };
	const legal = legalSpades(s, seat);
	if (legal.length === 1) return { type: 'play', card: legal[0] };
	if (difficulty === 'easy') return { type: 'play', card: random() < 0.4 ? pick(legal, random) : spadesHeuristic(s, seat, legal) };
	if (difficulty === 'medium') return { type: 'play', card: spadesHeuristic(s, seat, legal) };
	const totals = new Map<Card, number>(legal.map((c) => [c, 0]));
	for (let k = 0; k < 24; k++) {
		const world = sample(s, seat, random);
		if (!world) continue;
		for (const c of legal) totals.set(c, totals.get(c)! + rollout(applySpades(world, { type: 'play', card: c }), seat));
	}
	const heuristic = spadesHeuristic(s, seat, legal);
	return { type: 'play', card: bestBy(legal, (c) => totals.get(c)! + (c === heuristic ? 0.5 : 0)) };
}
