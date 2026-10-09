import { fullDeck, rankOf, shuffle, suitOf, type Card } from '../../kit/cards/deck';
import type { RuleSet } from './types';

export const RUMMY_TARGET = 500;
const HAND = 13;
const ACE = 12;

export type Meld = { cards: Card[]; kind: 'set' | 'run'; owner: number };

export type RummyState = {
	kind: 'rummy';
	phase: 'draw' | 'meld' | 'handOver' | 'over';
	handNo: number;
	dealer: number;
	hands: Card[][];
	stock: Card[];
	/** Face up and spread out; the last card is the newest. */
	discard: Card[];
	melds: Meld[];
	/** Every card each seat has put on the table, for scoring. */
	laid: Card[][];
	turn: number;
	/** The deepest card taken from the discard pile this turn: it must be melded before you discard. */
	must: Card | null;
	/** Cards taken from the discard pile this turn (can't be thrown straight back). */
	taken: Card[];
	scores: number[];
	history: number[][];
	summary: { out: number | null; table: number[]; hand: number[] } | null;
	winners: number[];
};

export type RummyAction =
	| { type: 'draw' }
	| { type: 'take'; index: number }
	| { type: 'meld'; cards: Card[] }
	| { type: 'layoff'; card: Card; meld: number }
	| { type: 'discard'; card: Card }
	| { type: 'next' };

/** Card value: aces 15, tens and court cards 10, the rest 5. */
export function rummyValue(c: Card, lowAce = false) {
	const r = rankOf(c);
	if (r === ACE) return lowAce ? 5 : 15;
	return r >= 8 ? 10 : 5;
}

/** Ranks of a run in order, with the ace low if that's the only way it works. */
function runRanks(cards: Card[]): number[] | null {
	if (cards.length < 3 || new Set(cards.map(suitOf)).size !== 1) return null;
	const ranks = cards.map(rankOf).sort((a, b) => a - b);
	const consecutive = (rs: number[]) => rs.every((r, i) => i === 0 || r === rs[i - 1] + 1);
	if (consecutive(ranks)) return ranks;
	if (ranks.includes(ACE)) {
		const low = ranks.map((r) => (r === ACE ? -1 : r)).sort((a, b) => a - b);
		if (consecutive(low)) return low;
	}
	return null;
}

export function meldKind(cards: Card[]): 'set' | 'run' | null {
	if (cards.length >= 3 && new Set(cards.map(rankOf)).size === 1) return 'set';
	return runRanks(cards) ? 'run' : null;
}

/** A run's cards in playing order (ace low where it sits low). */
export function orderMeld(cards: Card[]): Card[] {
	const ranks = runRanks(cards);
	if (!ranks) return cards.slice().sort((a, b) => suitOf(a) - suitOf(b));
	const low = ranks[0] === -1;
	return cards.slice().sort((a, b) => (low && rankOf(a) === ACE ? -1 : rankOf(a)) - (low && rankOf(b) === ACE ? -1 : rankOf(b)));
}

export const fitsMeld = (m: Meld, c: Card) => meldKind([...m.cards, c]) === m.kind;

/** An ace counts 5 when it sits low in a run (A-2-3). */
export function laidValue(s: RummyState, c: Card) {
	if (rankOf(c) !== ACE) return rummyValue(c);
	const m = s.melds.find((x) => x.cards.includes(c));
	return rummyValue(c, !!m && m.kind === 'run' && m.cards.some((x) => rankOf(x) === 0));
}

/** Can `c` be used at once: in a new meld from `pool`, or laid off on the table. */
export function usable(s: RummyState, c: Card, pool: Card[]) {
	if (s.melds.some((m) => fitsMeld(m, c))) return true;
	const same = pool.filter((x) => x !== c && rankOf(x) === rankOf(c));
	if (same.length >= 2) return true;
	const suited = new Set(pool.filter((x) => x !== c && suitOf(x) === suitOf(c)).map(rankOf));
	const has = (p: number) => p >= -1 && p <= ACE && suited.has(p === -1 ? ACE : p);
	const r = rankOf(c);
	return (r === ACE ? [ACE, -1] : [r]).some((p) => (has(p - 2) && has(p - 1)) || (has(p - 1) && has(p + 1)) || (has(p + 1) && has(p + 2)));
}

export function canTake(s: RummyState, index: number) {
	if (s.phase !== 'draw' || index < 0 || index >= s.discard.length) return false;
	const taken = s.discard.slice(index);
	return usable(s, s.discard[index], [...s.hands[s.turn], ...taken]);
}

function endHand(s: RummyState, out: number | null) {
	const table = [0, 1].map((i) => s.laid[i].reduce((t, c) => t + laidValue(s, c), 0));
	const hand = [0, 1].map((i) => s.hands[i].reduce((t, c) => t + rummyValue(c), 0));
	const points = [0, 1].map((i) => table[i] - hand[i]);
	s.scores = s.scores.map((v, i) => v + points[i]);
	s.history = [...s.history, points];
	s.summary = { out, table, hand };
	s.phase = 'handOver';
	if (s.scores.some((v) => v >= RUMMY_TARGET)) {
		const top = Math.max(...s.scores);
		s.winners = [0, 1].filter((i) => s.scores[i] === top);
	}
}

export function dealRummy(s: RummyState, random: () => number): RummyState {
	const deck = shuffle(fullDeck(), random);
	const dealer = 1 - s.dealer;
	return {
		...s,
		phase: 'draw',
		handNo: s.handNo + 1,
		dealer,
		hands: [deck.slice(0, HAND), deck.slice(HAND, HAND * 2)],
		discard: [deck[HAND * 2]],
		stock: deck.slice(HAND * 2 + 1),
		melds: [],
		laid: [[], []],
		turn: 1 - dealer,
		must: null,
		taken: [],
		summary: null
	};
}

export function newRummy(dealer: number): RummyState {
	return {
		kind: 'rummy',
		phase: 'over',
		handNo: 0,
		dealer: 1 - dealer,
		hands: [[], []],
		stock: [],
		discard: [],
		melds: [],
		laid: [[], []],
		turn: 0,
		must: null,
		taken: [],
		scores: [0, 0],
		history: [],
		summary: null,
		winners: []
	};
}

export function applyRummy(state: RummyState, action: RummyAction, random: () => number): RummyState {
	const seat = state.turn;
	if (action.type === 'next' && state.phase === 'handOver') {
		if (state.winners.length) return { ...state, phase: 'over' };
		return dealRummy(state, random);
	}
	if (action.type === 'draw' && state.phase === 'draw') {
		if (!state.stock.length) return state;
		const s: RummyState = structuredClone(state);
		s.hands[seat].push(s.stock.pop()!);
		s.phase = 'meld';
		return s;
	}
	if (action.type === 'take' && canTake(state, action.index)) {
		const s: RummyState = structuredClone(state);
		const taken = s.discard.slice(action.index);
		s.discard = s.discard.slice(0, action.index);
		s.hands[seat].push(...taken);
		s.taken = taken;
		s.must = taken[0];
		s.phase = 'meld';
		return s;
	}
	if (state.phase !== 'meld') return state;
	if (action.type === 'meld') {
		const kind = meldKind(action.cards);
		if (!kind || !action.cards.every((c) => state.hands[seat].includes(c))) return state;
		if (state.must !== null && !action.cards.includes(state.must)) return state;
		const s: RummyState = structuredClone(state);
		s.hands[seat] = s.hands[seat].filter((c) => !action.cards.includes(c));
		s.melds.push({ cards: orderMeld(action.cards), kind, owner: seat });
		s.laid[seat].push(...action.cards);
		if (s.must !== null && action.cards.includes(s.must)) s.must = null;
		if (!s.hands[seat].length) endHand(s, seat);
		return s;
	}
	if (action.type === 'layoff') {
		const m = state.melds[action.meld];
		if (!m || !state.hands[seat].includes(action.card) || !fitsMeld(m, action.card)) return state;
		if (state.must !== null && action.card !== state.must) return state;
		const s: RummyState = structuredClone(state);
		s.hands[seat] = s.hands[seat].filter((c) => c !== action.card);
		s.melds[action.meld].cards = orderMeld([...m.cards, action.card]);
		s.laid[seat].push(action.card);
		if (s.must === action.card) s.must = null;
		if (!s.hands[seat].length) endHand(s, seat);
		return s;
	}
	if (action.type === 'discard') {
		if (!canDiscard(state, action.card)) return state;
		const s: RummyState = structuredClone(state);
		s.hands[seat] = s.hands[seat].filter((c) => c !== action.card);
		s.discard.push(action.card);
		s.must = null;
		s.taken = [];
		if (!s.hands[seat].length) endHand(s, seat);
		else if (!s.stock.length) endHand(s, null);
		else {
			s.turn = 1 - seat;
			s.phase = 'draw';
		}
		return s;
	}
	return state;
}

export function canDiscard(s: RummyState, c: Card) {
	if (s.phase !== 'meld' || s.must !== null || !s.hands[s.turn].includes(c)) return false;
	return !(s.taken.length === 1 && s.taken[0] === c && s.hands[s.turn].length > 1);
}

export function validRummy(s: RummyState): boolean {
	const seen = new Set<Card>();
	for (const c of [...s.hands.flat(), ...s.stock, ...s.discard, ...s.melds.flatMap((m) => m.cards)]) {
		if (!Number.isInteger(c) || c < 0 || c > 51 || seen.has(c)) return false;
		seen.add(c);
	}
	return seen.size === 52 && s.hands.length === 2;
}

export const RUMMY_RULES: RuleSet<RummyState, RummyAction> = {
	start: (_, random) => dealRummy(newRummy(Math.floor(random() * 2)), random),
	actor: (s) => (s.phase === 'draw' || s.phase === 'meld' ? s.turn : null),
	apply: applyRummy,
	winners: (s) => s.winners,
	valid: validRummy
};
