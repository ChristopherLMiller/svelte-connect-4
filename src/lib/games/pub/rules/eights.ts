import { JACK, fullDeck, rankOf, shuffle, suitOf, type Card, type Suit } from '../../kit/cards/deck';
import type { RuleSet } from './types';

export const EIGHT = 6;
export const EIGHTS_TARGET = 100;
const HAND = 5;

export type EightsState = {
	kind: 'eights';
	phase: 'play' | 'suit' | 'handOver' | 'over';
	handNo: number;
	dealer: number;
	hands: Card[][];
	stock: Card[];
	/** Face up; the last card is on top. */
	discard: Card[];
	/** The suit to match: the top card's, or the one named with an eight. */
	suit: Suit;
	turn: number;
	/** Cards drawn this turn. */
	drew: number;
	/** Suits each seat has drawn on (couldn't match), cleared when they next play that suit. */
	shy: Suit[][];
	/** Seats that passed in a row because nothing could be drawn. */
	passes: number;
	scores: number[];
	history: number[][];
	summary: { out: number | null; points: number[] } | null;
	winners: number[];
};

export type EightsAction = { type: 'play'; card: Card } | { type: 'suit'; suit: Suit } | { type: 'draw' } | { type: 'pass' } | { type: 'next' };

export const isEight = (c: Card) => rankOf(c) === EIGHT;
export const top = (s: EightsState) => s.discard[s.discard.length - 1];

/** Penalty for a card left in hand: eights 50, court cards 10, aces 1, others their pips. */
export function penalty(c: Card) {
	const r = rankOf(c);
	if (r === EIGHT) return 50;
	if (r === 12) return 1;
	if (r >= JACK) return 10;
	return r + 2;
}

export function dealEights(s: EightsState, random: () => number): EightsState {
	const deck = shuffle(fullDeck(), random);
	const dealer = (s.dealer + 1) % 4;
	const hands = [0, 1, 2, 3].map((i) => deck.slice(i * HAND, i * HAND + HAND));
	let stock = deck.slice(HAND * 4);
	let start = stock.pop()!;
	while (isEight(start)) {
		stock = [start, ...stock];
		start = stock.pop()!;
	}
	return {
		...s,
		phase: 'play',
		handNo: s.handNo + 1,
		dealer,
		hands,
		stock,
		discard: [start],
		suit: suitOf(start),
		turn: (dealer + 1) % 4,
		drew: 0,
		shy: [[], [], [], []],
		passes: 0,
		summary: null
	};
}

export function newEights(dealer: number): EightsState {
	return {
		kind: 'eights',
		phase: 'over',
		handNo: 0,
		dealer: (dealer + 3) % 4,
		hands: [[], [], [], []],
		stock: [],
		discard: [],
		suit: 0,
		turn: 0,
		drew: 0,
		shy: [[], [], [], []],
		passes: 0,
		scores: [0, 0, 0, 0],
		history: [],
		summary: null,
		winners: []
	};
}

export const canPlay = (s: EightsState, c: Card) => isEight(c) || suitOf(c) === s.suit || rankOf(c) === rankOf(top(s));

export function legalEights(s: EightsState, seat = s.turn): Card[] {
	return s.phase === 'play' ? s.hands[seat].filter((c) => canPlay(s, c)) : [];
}

/** More cards can be drawn: from the stock, or by turning the discard pile over. */
export const canDraw = (s: EightsState) => s.stock.length > 0 || s.discard.length > 1;

function endHand(s: EightsState, out: number | null) {
	const points = s.hands.map((h) => h.reduce((t, c) => t + penalty(c), 0));
	s.summary = { out, points };
	s.scores = s.scores.map((v, i) => v + points[i]);
	s.history = [...s.history, points];
	s.phase = 'handOver';
	if (s.scores.some((v) => v >= EIGHTS_TARGET)) {
		const low = Math.min(...s.scores);
		s.winners = [0, 1, 2, 3].filter((i) => s.scores[i] === low);
	}
}

export function applyEights(state: EightsState, action: EightsAction, random: () => number = Math.random): EightsState {
	if (action.type === 'play' && state.phase === 'play') {
		const seat = state.turn;
		if (!state.hands[seat].includes(action.card) || !canPlay(state, action.card)) return state;
		const s: EightsState = structuredClone(state);
		s.hands[seat] = s.hands[seat].filter((c) => c !== action.card);
		s.discard.push(action.card);
		s.shy[seat] = s.shy[seat].filter((x) => x !== suitOf(action.card));
		s.passes = 0;
		s.drew = 0;
		if (!s.hands[seat].length) {
			s.suit = suitOf(action.card);
			endHand(s, seat);
			return s;
		}
		if (isEight(action.card)) {
			s.phase = 'suit';
			return s;
		}
		s.suit = suitOf(action.card);
		s.turn = (seat + 1) % 4;
		return s;
	}
	if (action.type === 'suit' && state.phase === 'suit') {
		if (![0, 1, 2, 3].includes(action.suit)) return state;
		return { ...state, suit: action.suit, phase: 'play', turn: (state.turn + 1) % 4 };
	}
	if (action.type === 'draw' && state.phase === 'play') {
		if (!canDraw(state)) return state;
		const s: EightsState = structuredClone(state);
		if (!s.stock.length) {
			const keep = s.discard.pop()!;
			s.stock = shuffle(s.discard, random);
			s.discard = [keep];
		}
		s.hands[s.turn].push(s.stock.pop()!);
		s.drew++;
		if (!s.shy[s.turn].includes(s.suit)) s.shy[s.turn].push(s.suit);
		return s;
	}
	if (action.type === 'pass' && state.phase === 'play') {
		if (canDraw(state) || legalEights(state).length) return state;
		const s: EightsState = structuredClone(state);
		s.passes++;
		s.drew = 0;
		if (s.passes >= 4) {
			endHand(s, null);
			return s;
		}
		s.turn = (s.turn + 1) % 4;
		return s;
	}
	if (action.type === 'next' && state.phase === 'handOver') {
		if (state.winners.length) return { ...state, phase: 'over' };
		return dealEights(state, random);
	}
	return state;
}

export function validEights(s: EightsState): boolean {
	const seen = new Set<Card>();
	for (const c of [...s.hands.flat(), ...s.stock, ...s.discard]) {
		if (!Number.isInteger(c) || c < 0 || c > 51 || seen.has(c)) return false;
		seen.add(c);
	}
	return seen.size === 52 && s.hands.length === 4 && s.discard.length > 0;
}

export const EIGHTS_RULES: RuleSet<EightsState, EightsAction> = {
	start: (_, random) => dealEights(newEights(Math.floor(random() * 4)), random),
	actor: (s) => (s.phase === 'play' || s.phase === 'suit' ? s.turn : null),
	apply: applyEights,
	winners: (s) => s.winners,
	valid: validEights
};
