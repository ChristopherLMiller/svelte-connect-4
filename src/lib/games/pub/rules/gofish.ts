import { fullDeck, rankOf, shuffle, type Card } from '../../kit/cards/deck';
import type { RuleSet } from './types';

const HAND = 5;

export type FishAsk = { seat: number; target: number; rank: number; got: number; fished: boolean; lucky: boolean; book: number | null };

export type GoFishState = {
	kind: 'gofish';
	phase: 'ask' | 'over';
	/** Always 1: one deal is the whole game. */
	handNo: number;
	hands: Card[][];
	stock: Card[];
	/** Ranks each seat has laid down as books of four. */
	books: number[][];
	turn: number;
	/** Every ask so far, oldest first: what the table has seen. */
	log: FishAsk[];
	/** The card just drawn by the asker (only they see it). */
	drawn: Card | null;
	winners: number[];
};

export type GoFishAction = { type: 'ask'; target: number; rank: number } | { type: 'next' };

export const ranksIn = (hand: Card[]) => [...new Set(hand.map(rankOf))].sort((a, b) => a - b);
export const countRank = (hand: Card[], rank: number) => hand.filter((c) => rankOf(c) === rank).length;
export const totalBooks = (s: GoFishState) => s.books.reduce((t, b) => t + b.length, 0);

/** Lay down any book of four; returns the rank booked. */
function layBooks(s: GoFishState, seat: number): number | null {
	let booked: number | null = null;
	for (const r of ranksIn(s.hands[seat])) {
		if (countRank(s.hands[seat], r) === 4) {
			s.hands[seat] = s.hands[seat].filter((c) => rankOf(c) !== r);
			s.books[seat] = [...s.books[seat], r];
			booked = r;
		}
	}
	return booked;
}

function finish(s: GoFishState) {
	s.phase = 'over';
	const most = Math.max(...s.books.map((b) => b.length));
	s.winners = [0, 1, 2, 3].filter((i) => s.books[i].length === most);
}

/** Move the turn on to someone who can ask, topping up empty hands from the stock. */
function settle(s: GoFishState, seat: number) {
	for (let i = 0; i < 4; i++) {
		const p = (seat + i) % 4;
		if (!s.hands[p].length && s.stock.length) {
			s.hands[p].push(s.stock.pop()!);
			layBooks(s, p);
		}
		if (s.hands[p].length) {
			s.turn = p;
			return;
		}
	}
	finish(s);
}

export function targetsFor(s: GoFishState, seat: number) {
	return [0, 1, 2, 3].filter((i) => i !== seat && s.hands[i].length > 0);
}

export function dealGoFish(random: () => number): GoFishState {
	const deck = shuffle(fullDeck(), random);
	const s: GoFishState = {
		kind: 'gofish',
		phase: 'ask',
		handNo: 1,
		hands: [0, 1, 2, 3].map((i) => deck.slice(i * HAND, i * HAND + HAND)),
		stock: deck.slice(HAND * 4),
		books: [[], [], [], []],
		turn: Math.floor(random() * 4),
		log: [],
		drawn: null,
		winners: []
	};
	for (let i = 0; i < 4; i++) layBooks(s, i);
	return s;
}

export function applyGoFish(state: GoFishState, action: GoFishAction): GoFishState {
	if (action.type !== 'ask' || state.phase !== 'ask') return state;
	const seat = state.turn;
	const { target, rank } = action;
	if (target === seat || !targetsFor(state, seat).includes(target) || !countRank(state.hands[seat], rank)) return state;
	const s: GoFishState = structuredClone(state);
	const given = s.hands[target].filter((c) => rankOf(c) === rank);
	const entry: FishAsk = { seat, target, rank, got: given.length, fished: false, lucky: false, book: null };
	s.drawn = null;
	if (given.length) {
		s.hands[target] = s.hands[target].filter((c) => rankOf(c) !== rank);
		s.hands[seat].push(...given);
		entry.book = layBooks(s, seat);
		s.log = [...s.log, entry];
		if (totalBooks(s) === 13) finish(s);
		else settle(s, seat);
		return s;
	}
	entry.fished = true;
	let again = false;
	if (s.stock.length) {
		const c = s.stock.pop()!;
		s.hands[seat].push(c);
		s.drawn = c;
		entry.lucky = again = rankOf(c) === rank;
		entry.book = layBooks(s, seat);
	}
	s.log = [...s.log, entry];
	if (totalBooks(s) === 13) finish(s);
	else settle(s, again ? seat : (seat + 1) % 4);
	return s;
}

export function validGoFish(s: GoFishState): boolean {
	const seen = new Set<Card>();
	for (const c of [...s.hands.flat(), ...s.stock]) {
		if (!Number.isInteger(c) || c < 0 || c > 51 || seen.has(c)) return false;
		seen.add(c);
	}
	return seen.size + totalBooks(s) * 4 === 52 && s.hands.length === 4 && s.books.length === 4;
}

export const GO_FISH_RULES: RuleSet<GoFishState, GoFishAction> = {
	start: (_, random) => dealGoFish(random),
	actor: (s) => (s.phase === 'ask' ? s.turn : null),
	apply: (s, a) => applyGoFish(s, a),
	winners: (s) => s.winners,
	valid: validGoFish
};
