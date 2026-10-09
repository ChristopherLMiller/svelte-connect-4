import { fullDeck, rankOf, shuffle, suitOf, type Card, type Suit } from '../../kit/cards/deck';
import type { RuleSet } from './types';

export type OhHellPhase = 'bid' | 'play' | 'trick' | 'handOver' | 'over';
export type OhHellPlayed = { seat: number; card: Card; led: Suit; trick: number };

export type OhHellState = {
	kind: 'ohhell';
	phase: OhHellPhase;
	/** 1-based; hand n deals `handSize(n)` cards. */
	handNo: number;
	dealer: number;
	hands: Card[][];
	/** The card turned up after the deal; its suit is trump. */
	upcard: Card;
	bids: Array<number | null>;
	trick: Array<Card | null>;
	leader: number;
	turn: number;
	trickNo: number;
	tricks: number[];
	played: OhHellPlayed[];
	lastWinner: number | null;
	scores: number[];
	/** Points scored each hand, per seat. */
	history: number[][];
	summary: { made: boolean[]; points: number[] } | null;
	winners: number[];
};

export type OhHellAction = { type: 'bid'; bid: number } | { type: 'play'; card: Card } | { type: 'next' };

export const OH_HELL_HANDS = 7;
export const handSize = (handNo: number) => OH_HELL_HANDS + 1 - handNo;
export const trumpOf = (s: OhHellState) => suitOf(s.upcard);

export function dealOhHell(s: OhHellState, random: () => number): OhHellState {
	const deck = shuffle(fullDeck(), random);
	const handNo = s.handNo + 1;
	const n = handSize(handNo);
	const dealer = (s.dealer + 1) % 4;
	const first = (dealer + 1) % 4;
	return {
		...s,
		phase: 'bid',
		handNo,
		dealer,
		hands: [0, 1, 2, 3].map((i) => deck.slice(i * n, i * n + n)),
		upcard: deck[n * 4],
		bids: [null, null, null, null],
		trick: [null, null, null, null],
		leader: first,
		turn: first,
		trickNo: 0,
		tricks: [0, 0, 0, 0],
		played: [],
		lastWinner: null,
		summary: null
	};
}

export function newOhHell(dealer: number): OhHellState {
	return {
		kind: 'ohhell',
		phase: 'over',
		handNo: 0,
		dealer: (dealer + 3) % 4,
		hands: [[], [], [], []],
		upcard: 0,
		bids: [null, null, null, null],
		trick: [null, null, null, null],
		leader: 0,
		turn: 0,
		trickNo: 0,
		tricks: [0, 0, 0, 0],
		played: [],
		lastWinner: null,
		scores: [0, 0, 0, 0],
		history: [],
		summary: null,
		winners: []
	};
}

export const ledSuitO = (s: OhHellState): Suit | null => (s.trick[s.leader] === null ? null : suitOf(s.trick[s.leader]!));

export function legalOhHell(s: OhHellState, seat = s.turn): Card[] {
	const hand = s.hands[seat];
	const led = ledSuitO(s);
	if (led === null) return hand;
	const follow = hand.filter((c) => suitOf(c) === led);
	return follow.length ? follow : hand;
}

export function powerO(c: Card, led: Suit, trump: Suit) {
	if (suitOf(c) === trump) return 100 + rankOf(c);
	if (suitOf(c) === led) return 50 + rankOf(c);
	return rankOf(c);
}

export function winningSeatO(s: OhHellState): number | null {
	const led = ledSuitO(s);
	if (led === null) return null;
	const trump = trumpOf(s);
	let best = s.leader;
	for (let i = 0; i < 4; i++) {
		const c = s.trick[i];
		if (c !== null && powerO(c, led, trump) > powerO(s.trick[best]!, led, trump)) best = i;
	}
	return best;
}

/** The bid the dealer may not make, so that not everyone can succeed. */
export function hookBid(s: OhHellState): number | null {
	if (s.phase !== 'bid' || s.turn !== s.dealer) return null;
	const sum = s.bids.reduce<number>((t, b) => t + (b ?? 0), 0);
	const n = handSize(s.handNo);
	return n - sum >= 0 ? n - sum : null;
}

export function bidOptions(s: OhHellState): number[] {
	const n = handSize(s.handNo);
	const hook = hookBid(s);
	return Array.from({ length: n + 1 }, (_, i) => i).filter((b) => b !== hook);
}

export const ohHellPoints = (bid: number, took: number) => (bid === took ? 10 + bid : 0);

export function applyOhHell(state: OhHellState, action: OhHellAction, random: () => number = Math.random): OhHellState {
	if (action.type === 'bid' && state.phase === 'bid') {
		if (!bidOptions(state).includes(action.bid)) return state;
		const s: OhHellState = structuredClone(state);
		s.bids[s.turn] = action.bid;
		if (s.bids.every((b) => b !== null)) {
			s.phase = 'play';
			s.turn = s.leader;
		} else s.turn = (s.turn + 1) % 4;
		return s;
	}
	if (action.type === 'play' && state.phase === 'play') {
		const seat = state.turn;
		if (!legalOhHell(state, seat).includes(action.card)) return state;
		const s: OhHellState = structuredClone(state);
		const led = ledSuitO(s) ?? suitOf(action.card);
		s.hands[seat] = s.hands[seat].filter((c) => c !== action.card);
		s.trick[seat] = action.card;
		s.played.push({ seat, card: action.card, led, trick: s.trickNo });
		if (s.trick.every((c) => c !== null)) {
			s.lastWinner = winningSeatO(s);
			s.phase = 'trick';
		} else s.turn = (seat + 1) % 4;
		return s;
	}
	if (action.type === 'next' && state.phase === 'trick') {
		const s: OhHellState = structuredClone(state);
		const w = s.lastWinner!;
		s.tricks[w]++;
		s.trick = [null, null, null, null];
		s.trickNo++;
		s.leader = w;
		s.turn = w;
		if (s.trickNo < handSize(s.handNo)) {
			s.phase = 'play';
			return s;
		}
		const points = s.bids.map((b, i) => ohHellPoints(b!, s.tricks[i]));
		s.summary = { made: s.bids.map((b, i) => b === s.tricks[i]), points };
		s.scores = s.scores.map((v, i) => v + points[i]);
		s.history = [...s.history, points];
		s.phase = 'handOver';
		if (s.handNo >= OH_HELL_HANDS) {
			const top = Math.max(...s.scores);
			s.winners = [0, 1, 2, 3].filter((i) => s.scores[i] === top);
		}
		return s;
	}
	if (action.type === 'next' && state.phase === 'handOver') {
		if (state.winners.length) return { ...state, phase: 'over' };
		return dealOhHell(state, random);
	}
	return state;
}

export function validOhHell(s: OhHellState): boolean {
	const seen = new Set<Card>();
	for (const c of [...s.hands.flat(), ...s.played.map((p) => p.card), s.upcard]) {
		if (!Number.isInteger(c) || c < 0 || c > 51 || seen.has(c)) return false;
		seen.add(c);
	}
	return s.handNo >= 1 && s.handNo <= OH_HELL_HANDS && s.hands.length === 4;
}

export const OH_HELL_RULES: RuleSet<OhHellState, OhHellAction> = {
	start: (_, random) => dealOhHell(newOhHell(Math.floor(random() * 4)), random),
	actor: (s) => (s.phase === 'bid' || s.phase === 'play' ? s.turn : null),
	apply: applyOhHell,
	winners: (s) => s.winners,
	valid: validOhHell,
	auto: (s) => s.phase === 'trick'
};
