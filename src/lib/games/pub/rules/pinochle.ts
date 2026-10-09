import { rankOf, shuffle, suitOf, type Card, type Suit } from '../../kit/cards/deck';
import type { RuleSet } from './types';

export const PINOCHLE_TARGET = 150;
export const MIN_BID = 20;
/** Nine through ace, two of each: ids `k*52 + suit*13 + rank`. */
export const PINOCHLE_DECK: Card[] = [0, 1].flatMap((k) => [0, 1, 2, 3].flatMap((suit) => [7, 8, 9, 10, 11, 12].map((r) => k * 52 + suit * 13 + r)));

const NINE = 7;
const TEN = 8;
const JACK = 9;
const QUEEN = 10;
const KING = 11;
const ACE = 12;

/** Trick order: A, 10, K, Q, J, 9. */
export const rankP = (c: Card) => [0, 0, 0, 0, 0, 0, 0, 0, 4, 1, 2, 3, 5][rankOf(c)];
export const isCounter = (c: Card) => [ACE, TEN, KING].includes(rankOf(c));
export const teamOf = (seat: number) => seat % 2;

export type MeldItem = { name: string; points: number; cards: Card[] };

export type PinochleState = {
	kind: 'pinochle';
	phase: 'bid' | 'trump' | 'meld' | 'play' | 'trick' | 'handOver' | 'over';
	handNo: number;
	dealer: number;
	hands: Card[][];
	bids: Array<number | 'pass' | null>;
	high: number | null;
	bidder: number | null;
	turn: number;
	trump: Suit | null;
	melds: MeldItem[][];
	trick: Array<Card | null>;
	leader: number;
	trickNo: number;
	played: Array<{ seat: number; card: Card; led: Suit; trick: number }>;
	/** Counters taken by each team (aces, tens, kings, and the last trick). */
	counters: number[];
	tricksWon: number[];
	lastWinner: number | null;
	scores: number[];
	history: number[][];
	summary: { meld: number[]; counters: number[]; points: number[]; made: boolean } | null;
	winners: number[];
};

export type PinochleAction = { type: 'bid'; bid: number } | { type: 'pass' } | { type: 'trump'; suit: Suit } | { type: 'play'; card: Card } | { type: 'next' };

export const powerP = (c: Card, led: Suit, trump: Suit | null) => (suitOf(c) === trump ? 100 + rankP(c) : suitOf(c) === led ? rankP(c) : -1);

/** Copies of a face in a hand, as card ids. */
function copies(hand: Card[], suit: number, rank: number) {
	return hand.filter((c) => suitOf(c) === suit && rankOf(c) === rank);
}

export function meldOf(hand: Card[], trump: Suit): MeldItem[] {
	const items: MeldItem[] = [];
	const n = (suit: number, rank: number) => copies(hand, suit, rank).length;
	const take = (suit: number, rank: number, k: number) => copies(hand, suit, rank).slice(0, k);
	const runN = Math.min(...[ACE, TEN, KING, QUEEN, JACK].map((r) => n(trump, r)));
	if (runN) items.push({ name: runN === 2 ? 'Double run' : 'Run', points: runN === 2 ? 150 : 15, cards: [ACE, TEN, KING, QUEEN, JACK].flatMap((r) => take(trump, r, runN)) });
	for (let suit = 0; suit < 4; suit++) {
		const pairs = Math.min(n(suit, KING), n(suit, QUEEN)) - (suit === trump ? runN : 0);
		if (pairs > 0) {
			const royal = suit === trump;
			items.push({ name: `${pairs === 2 ? 'Two ' : ''}${royal ? 'royal marriage' : 'marriage'}${pairs === 2 ? 's' : ''}`, points: pairs * (royal ? 4 : 2), cards: [...take(suit, KING, pairs), ...take(suit, QUEEN, pairs)] });
		}
	}
	const dix = n(trump, NINE);
	if (dix) items.push({ name: dix === 2 ? 'Two dix' : 'Dix', points: dix, cards: take(trump, NINE, dix) });
	const around: Array<[number, string, number, number]> = [
		[ACE, 'aces', 10, 100],
		[KING, 'kings', 8, 80],
		[QUEEN, 'queens', 6, 60],
		[JACK, 'jacks', 4, 40]
	];
	for (const [rank, name, one, two] of around) {
		const k = Math.min(...[0, 1, 2, 3].map((s) => n(s, rank)));
		if (k) items.push({ name: k === 2 ? `Double ${name} around` : `${name[0].toUpperCase()}${name.slice(1)} around`, points: k === 2 ? two : one, cards: [0, 1, 2, 3].flatMap((s) => take(s, rank, k)) });
	}
	const pin = Math.min(n(2, QUEEN), n(1, JACK));
	if (pin) items.push({ name: pin === 2 ? 'Double pinochle' : 'Pinochle', points: pin === 2 ? 30 : 4, cards: [...take(2, QUEEN, pin), ...take(1, JACK, pin)] });
	return items;
}

export const meldPoints = (items: MeldItem[]) => items.reduce((t, i) => t + i.points, 0);

export function winningSeatP(s: PinochleState): number | null {
	const lead = s.trick[s.leader];
	if (lead === null) return null;
	const led = suitOf(lead);
	let best = s.leader;
	for (let i = 1; i < 4; i++) {
		const seat = (s.leader + i) % 4;
		const c = s.trick[seat];
		if (c !== null && powerP(c, led, s.trump) > powerP(s.trick[best]!, led, s.trump)) best = seat;
	}
	return best;
}

/** Follow suit and beat the winning card if you can; if you can't follow, trump (and over-trump) if you can. */
export function legalPinochle(s: PinochleState, seat = s.turn): Card[] {
	if (s.phase !== 'play' || seat !== s.turn) return [];
	const hand = s.hands[seat];
	const lead = s.trick[s.leader];
	if (lead === null) return hand;
	const led = suitOf(lead);
	const top = s.trick[winningSeatP(s)!]!;
	const beat = (cards: Card[]) => cards.filter((c) => powerP(c, led, s.trump) > powerP(top, led, s.trump));
	const follow = hand.filter((c) => suitOf(c) === led);
	if (follow.length) {
		const b = beat(follow);
		return b.length ? b : follow;
	}
	const trumps = hand.filter((c) => suitOf(c) === s.trump);
	if (trumps.length) {
		const b = beat(trumps);
		return b.length ? b : trumps;
	}
	return hand;
}

export function bidOptionsP(s: PinochleState): number[] {
	const from = s.high === null ? MIN_BID : s.high + 1;
	return [from, from + 1, from + 2, from + 5];
}

/** The last player left in the auction can't pass if nobody has bid. */
export const mustBid = (s: PinochleState) => s.high === null && s.bids.filter((b) => b === 'pass').length === 3;

function nextBidder(s: PinochleState, from: number) {
	for (let i = 1; i <= 4; i++) {
		const p = (from + i) % 4;
		if (s.bids[p] !== 'pass') return p;
	}
	return from;
}

export function dealPinochle(s: PinochleState, random: () => number): PinochleState {
	const deck = shuffle(PINOCHLE_DECK, random);
	const dealer = (s.dealer + 1) % 4;
	return {
		...s,
		phase: 'bid',
		handNo: s.handNo + 1,
		dealer,
		hands: [0, 1, 2, 3].map((i) => deck.slice(i * 12, i * 12 + 12)),
		bids: [null, null, null, null],
		high: null,
		bidder: null,
		turn: (dealer + 1) % 4,
		trump: null,
		melds: [[], [], [], []],
		trick: [null, null, null, null],
		leader: 0,
		trickNo: 0,
		played: [],
		counters: [0, 0],
		tricksWon: [0, 0],
		lastWinner: null,
		summary: null
	};
}

export function newPinochle(dealer: number): PinochleState {
	return {
		kind: 'pinochle',
		phase: 'over',
		handNo: 0,
		dealer: (dealer + 3) % 4,
		hands: [[], [], [], []],
		bids: [null, null, null, null],
		high: null,
		bidder: null,
		turn: 0,
		trump: null,
		melds: [[], [], [], []],
		trick: [null, null, null, null],
		leader: 0,
		trickNo: 0,
		played: [],
		counters: [0, 0],
		tricksWon: [0, 0],
		lastWinner: null,
		scores: [0, 0],
		history: [],
		summary: null,
		winners: []
	};
}

function endHand(s: PinochleState) {
	const bidTeam = teamOf(s.bidder!);
	const meld = [0, 1].map((t) => (s.tricksWon[t] > 0 ? meldPoints(s.melds[t]) + meldPoints(s.melds[t + 2]) : 0));
	const points = [0, 1].map((t) => meld[t] + s.counters[t]);
	const made = points[bidTeam] >= s.high!;
	if (!made) points[bidTeam] = -s.high!;
	s.scores = s.scores.map((v, t) => v + points[t]);
	s.history = [...s.history, points];
	s.summary = { meld, counters: s.counters.slice(), points, made };
	s.phase = 'handOver';
	if (s.scores.some((v) => v >= PINOCHLE_TARGET)) {
		const [a, b] = s.scores;
		s.winners = a === b ? [bidTeam, bidTeam + 2] : a > b ? [0, 2] : [1, 3];
		if (a >= PINOCHLE_TARGET && b >= PINOCHLE_TARGET) s.winners = [bidTeam, bidTeam + 2];
	}
}

export function applyPinochle(state: PinochleState, action: PinochleAction, random: () => number): PinochleState {
	const seat = state.turn;
	if (action.type === 'next') {
		if (state.phase === 'meld') return { ...state, phase: 'play', turn: state.bidder!, leader: state.bidder! };
		if (state.phase === 'trick') {
			const s: PinochleState = structuredClone(state);
			const w = s.lastWinner!;
			s.trick = [null, null, null, null];
			s.leader = w;
			s.turn = w;
			s.trickNo++;
			s.phase = 'play';
			if (s.trickNo === 12) endHand(s);
			return s;
		}
		if (state.phase === 'handOver') return state.winners.length ? { ...state, phase: 'over' } : dealPinochle(state, random);
		return state;
	}
	if (state.phase === 'bid') {
		if (action.type === 'pass') {
			if (mustBid(state)) return state;
			const s: PinochleState = structuredClone(state);
			s.bids[seat] = 'pass';
			const left = [0, 1, 2, 3].filter((i) => s.bids[i] !== 'pass');
			if (left.length === 1 && s.high !== null) {
				s.bidder = left[0];
				s.turn = left[0];
				s.phase = 'trump';
				return s;
			}
			s.turn = nextBidder(s, seat);
			return s;
		}
		if (action.type === 'bid') {
			if (action.bid < (state.high === null ? MIN_BID : state.high + 1) || action.bid > 250) return state;
			const s: PinochleState = structuredClone(state);
			s.bids[seat] = action.bid;
			s.high = action.bid;
			const left = [0, 1, 2, 3].filter((i) => s.bids[i] !== 'pass');
			if (left.length === 1) {
				s.bidder = seat;
				s.phase = 'trump';
				return s;
			}
			s.turn = nextBidder(s, seat);
			return s;
		}
		return state;
	}
	if (state.phase === 'trump' && action.type === 'trump') {
		const s: PinochleState = structuredClone(state);
		s.trump = action.suit;
		s.melds = s.hands.map((h) => meldOf(h, action.suit));
		s.phase = 'meld';
		return s;
	}
	if (state.phase === 'play' && action.type === 'play') {
		if (!legalPinochle(state, seat).includes(action.card)) return state;
		const s: PinochleState = structuredClone(state);
		s.hands[seat] = s.hands[seat].filter((c) => c !== action.card);
		s.trick[seat] = action.card;
		const led = suitOf(s.trick[s.leader]!);
		s.played.push({ seat, card: action.card, led, trick: s.trickNo });
		if (s.trick.every((c) => c !== null)) {
			const w = winningSeatP(s)!;
			s.lastWinner = w;
			const t = teamOf(w);
			s.tricksWon[t]++;
			s.counters[t] += s.trick.filter((c) => isCounter(c!)).length + (s.trickNo === 11 ? 1 : 0);
			s.phase = 'trick';
			return s;
		}
		s.turn = (seat + 1) % 4;
		return s;
	}
	return state;
}

export function validPinochle(s: PinochleState): boolean {
	const all = [...s.hands.flat(), ...s.played.map((p) => p.card)];
	return new Set(all).size === all.length && all.every((c) => PINOCHLE_DECK.includes(c)) && s.scores.length === 2;
}

export const PINOCHLE_RULES: RuleSet<PinochleState, PinochleAction> = {
	start: (_, random) => dealPinochle(newPinochle(Math.floor(random() * 4)), random),
	actor: (s) => (s.phase === 'bid' || s.phase === 'trump' || s.phase === 'play' ? s.turn : null),
	apply: applyPinochle,
	winners: (s) => s.winners,
	valid: validPinochle,
	auto: (s) => s.phase === 'trick'
};
