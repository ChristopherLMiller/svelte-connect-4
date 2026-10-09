import { ACE, KING, QUEEN, card, fullDeck, rankOf, suitOf, type Card, type Suit } from '../../kit/cards/deck';
import { applyOhHell, bidOptions, handSize, ledSuitO, legalOhHell, powerO, trumpOf, winningSeatO, type OhHellAction, type OhHellState } from '../rules/ohhell';
import type { Difficulty } from '../types';
import { bestBy, dealUnknown, pick, type Holder } from './shared';

export type OhItem = { cards: Card[]; value: number; kind: 'trump' | 'length' | 'ace' | 'king' | 'void' };

/** Likely tricks, card by card, so the coach can explain the count. */
export function ohItems(hand: Card[], trump: Suit, n: number): OhItem[] {
	const items: OhItem[] = [];
	const trumps = hand.filter((c) => suitOf(c) === trump).sort((a, b) => rankOf(b) - rankOf(a));
	const t = trumps.length;
	const has = (s: Suit, r: number) => hand.includes(card(s, r));
	if (has(trump, ACE)) items.push({ cards: [card(trump, ACE)], value: 1, kind: 'trump' });
	if (has(trump, KING)) items.push({ cards: [card(trump, KING)], value: t >= 2 ? 0.85 : 0.5, kind: 'trump' });
	if (has(trump, QUEEN)) items.push({ cards: [card(trump, QUEEN)], value: t >= 3 ? 0.6 : 0.25, kind: 'trump' });
	const low = trumps.filter((c) => rankOf(c) < QUEEN);
	const extra = Math.max(0, low.length - (n >= 5 ? 1 : 0));
	if (extra) items.push({ cards: low.slice(-extra), value: extra * (n >= 4 ? 0.45 : 0.3), kind: 'length' });
	for (const s of [0, 1, 2, 3] as Suit[]) {
		if (s === trump) continue;
		const suit = hand.filter((c) => suitOf(c) === s);
		if (!suit.length) {
			if (t && n >= 3) items.push({ cards: [], value: 0.4, kind: 'void' });
			continue;
		}
		if (has(s, ACE)) items.push({ cards: [card(s, ACE)], value: suit.length <= 3 ? 0.9 : 0.7, kind: 'ace' });
		if (has(s, KING) && suit.length >= 2 && suit.length <= 3 && n >= 4) items.push({ cards: [card(s, KING)], value: has(s, ACE) ? 0.6 : 0.35, kind: 'king' });
	}
	return items;
}

export const ohTotal = (items: OhItem[]) => items.reduce((t, i) => t + i.value, 0);

export function ohBid(s: OhHellState, seat: number, noise = 0) {
	const n = handSize(s.handNo);
	const est = ohTotal(ohItems(s.hands[seat], trumpOf(s), n)) + noise;
	const options = bidOptions(s);
	return bestBy(options, (b) => -Math.abs(b - est) - (b > est ? 0.01 : 0));
}

const cheap = (c: Card, trump: Suit) => (suitOf(c) === trump ? 20 : 0) + rankOf(c);

export function ohHeuristic(s: OhHellState, seat: number, legal: Card[]): Card {
	if (legal.length === 1) return legal[0];
	const trump = trumpOf(s);
	const need = s.bids[seat]! - s.tricks[seat];
	const led = ledSuitO(s);
	const lowest = () => bestBy(legal, (c) => -cheap(c, trump));
	const highest = () => bestBy(legal, (c) => cheap(c, trump));
	if (led === null) {
		if (need <= 0) return lowest();
		const gone = (c: Card) => s.played.some((p) => p.card === c) || s.hands[seat].includes(c);
		const boss = legal.filter((c) => {
			for (let r = rankOf(c) + 1; r <= ACE; r++) if (!gone(card(suitOf(c), r))) return false;
			return true;
		});
		const side = boss.filter((c) => suitOf(c) !== trump);
		if (side.length) return side[0];
		if (boss.length) return boss[0];
		return lowest();
	}
	const w = winningSeatO(s)!;
	const top = powerO(s.trick[w]!, led, trump);
	const last = s.trick.filter((c) => c !== null).length === 3;
	const winners = legal.filter((c) => powerO(c, led, trump) > top);
	const losers = legal.filter((c) => powerO(c, led, trump) < top);
	if (need > 0) {
		if (!winners.length) return lowest();
		if (last) return bestBy(winners, (c) => -powerO(c, led, trump));
		const inSuit = winners.filter((c) => suitOf(c) === led);
		return inSuit.length ? bestBy(inSuit, (c) => rankOf(c)) : bestBy(winners, (c) => -powerO(c, led, trump));
	}
	if (losers.length) return bestBy(losers, (c) => powerO(c, led, trump));
	return last ? highest() : bestBy(winners, (c) => -powerO(c, led, trump));
}

function rollout(s: OhHellState, seat: number): number {
	let state = s;
	let guard = 0;
	while (state.phase === 'play' || state.phase === 'trick') {
		if (guard++ > 60) break;
		if (state.phase === 'trick') {
			state = applyOhHell(state, { type: 'next' });
			continue;
		}
		state = applyOhHell(state, { type: 'play', card: ohHeuristic(state, state.turn, legalOhHell(state)) });
	}
	const pts = state.summary?.points ?? [0, 0, 0, 0];
	const others = pts.filter((_, i) => i !== seat);
	return pts[seat] - Math.max(...others) * 0.25;
}

function sample(s: OhHellState, seat: number, random: () => number): OhHellState | null {
	const voids = [0, 1, 2, 3].map(() => new Set<Suit>());
	for (const p of s.played) if (suitOf(p.card) !== p.led) voids[p.seat].add(p.led);
	const seen = new Set<Card>([...s.hands[seat], ...s.played.map((p) => p.card), s.upcard]);
	const unknown = fullDeck().filter((c) => !seen.has(c));
	const holders: Holder[] = [0, 1, 2, 3].filter((i) => i !== seat).map((i) => ({ seat: i, need: s.hands[i].length, voids: voids[i], known: [] }));
	const rest = unknown.length - holders.reduce((t, h) => t + h.need, 0);
	if (rest > 0) holders.push({ seat: 9, need: rest, voids: new Set(), known: [] });
	const hands = dealUnknown(unknown, holders, random, suitOf);
	if (!hands) return null;
	return { ...s, hands: s.hands.map((h, i) => (i === seat ? h.slice() : hands.get(i)!)) };
}

export function ohHellAi(s: OhHellState, seat: number, difficulty: Difficulty, random: () => number): OhHellAction {
	if (s.phase === 'bid') {
		const noise = difficulty === 'easy' ? (random() - 0.5) * 2.2 : difficulty === 'medium' ? (random() - 0.5) * 0.7 : 0;
		return { type: 'bid', bid: ohBid(s, seat, noise) };
	}
	const legal = legalOhHell(s, seat);
	if (legal.length === 1) return { type: 'play', card: legal[0] };
	if (difficulty === 'easy') return { type: 'play', card: random() < 0.4 ? pick(legal, random) : ohHeuristic(s, seat, legal) };
	if (difficulty === 'medium') return { type: 'play', card: ohHeuristic(s, seat, legal) };
	const totals = new Map<Card, number>(legal.map((c) => [c, 0]));
	for (let k = 0; k < 30; k++) {
		const world = sample(s, seat, random);
		if (!world) continue;
		for (const c of legal) totals.set(c, totals.get(c)! + rollout(applyOhHell(world, { type: 'play', card: c }), seat));
	}
	const h = ohHeuristic(s, seat, legal);
	return { type: 'play', card: bestBy(legal, (c) => totals.get(c)! + (c === h ? 0.5 : 0)) };
}
