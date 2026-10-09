import { KING, fullDeck, isRed, rankOf, shuffle, type Card } from '../../kit/cards/deck';
import type { RuleSet } from './types';

export const KINGS_TARGET = 3;
const HAND = 7;
/** Piles 0-3 are the sides (north, east, south, west); 4-7 the corners, for kings. */
export const SIDES = [0, 1, 2, 3];
export const CORNERS = [4, 5, 6, 7];

export type KingsState = {
	kind: 'kings';
	phase: 'play' | 'handOver' | 'over';
	handNo: number;
	dealer: number;
	hands: Card[][];
	stock: Card[];
	piles: Card[][];
	turn: number;
	/** Moves made this turn, so a blocked table can be spotted. */
	moves: number;
	/** Turns in a row that ended with no move and nothing to draw. */
	idle: number;
	/** The card drawn at the start of this turn. */
	drawn: Card | null;
	wins: number[];
	history: number[][];
	summary: { winner: number | null; left: number[] } | null;
	winners: number[];
};

export type KingsAction = { type: 'play'; card: Card; pile: number } | { type: 'move'; from: number; to: number } | { type: 'end' } | { type: 'next' };

export const isKing = (c: Card) => rankOf(c) === KING;
const lowRank = (c: Card) => (rankOf(c) === 12 ? 0 : rankOf(c) + 1);

/** Can `c` go on top of `pile`: one lower and the other colour, or a king into an empty corner. */
export function fits(s: KingsState, c: Card, pile: number) {
	const p = s.piles[pile];
	if (!p.length) return CORNERS.includes(pile) ? isKing(c) : true;
	const top = p[p.length - 1];
	return lowRank(c) === lowRank(top) - 1 && isRed(c) !== isRed(top);
}

/** Can the whole pile `from` be moved onto `to`. */
export function canMove(s: KingsState, from: number, to: number) {
	if (from === to || !SIDES.includes(from) || !s.piles[from].length) return false;
	const base = s.piles[from][0];
	if (!s.piles[to].length) return CORNERS.includes(to) && isKing(base);
	return fits(s, base, to);
}

export function legalKings(s: KingsState, seat = s.turn): KingsAction[] {
	if (s.phase !== 'play' || seat !== s.turn) return [];
	const out: KingsAction[] = [];
	for (const card of s.hands[seat]) for (let pile = 0; pile < 8; pile++) if (fits(s, card, pile)) out.push({ type: 'play', card, pile });
	for (const from of SIDES) for (let to = 0; to < 8; to++) if (canMove(s, from, to)) out.push({ type: 'move', from, to });
	return out;
}

function startTurn(s: KingsState, seat: number) {
	s.turn = seat;
	s.moves = 0;
	s.drawn = null;
	if (s.stock.length) {
		const c = s.stock.pop()!;
		s.hands[seat].push(c);
		s.drawn = c;
	}
}

function endHand(s: KingsState, winner: number | null) {
	s.phase = 'handOver';
	const left = s.hands.map((h) => h.length);
	s.summary = { winner, left };
	if (winner !== null) s.wins[winner]++;
	s.history = [...s.history, [0, 1].map((i) => (i === winner ? 1 : 0))];
	if (winner !== null && s.wins[winner] >= KINGS_TARGET) s.winners = [winner];
}

export function dealKings(s: KingsState, random: () => number): KingsState {
	const deck = shuffle(fullDeck(), random);
	const dealer = 1 - s.dealer;
	const hands = [deck.slice(0, HAND), deck.slice(HAND, HAND * 2)];
	const stock = deck.slice(HAND * 2);
	const piles: Card[][] = Array.from({ length: 8 }, () => []);
	for (const side of SIDES) {
		const c = stock.pop()!;
		if (isKing(c)) piles[CORNERS.find((k) => !piles[k].length)!].push(c);
		else piles[side].push(c);
	}
	const next: KingsState = { ...s, phase: 'play', handNo: s.handNo + 1, dealer, hands, stock, piles, idle: 0, summary: null };
	startTurn(next, 1 - dealer);
	return next;
}

export function newKings(dealer: number): KingsState {
	return {
		kind: 'kings',
		phase: 'over',
		handNo: 0,
		dealer: 1 - dealer,
		hands: [[], []],
		stock: [],
		piles: Array.from({ length: 8 }, () => []),
		turn: 0,
		moves: 0,
		idle: 0,
		drawn: null,
		wins: [0, 0],
		history: [],
		summary: null,
		winners: []
	};
}

export function applyKings(state: KingsState, action: KingsAction, random: () => number): KingsState {
	if (action.type === 'next' && state.phase === 'handOver') {
		if (state.winners.length) return { ...state, phase: 'over' };
		return dealKings(state, random);
	}
	if (state.phase !== 'play') return state;
	const seat = state.turn;
	if (action.type === 'play') {
		if (!state.hands[seat].includes(action.card) || action.pile < 0 || action.pile > 7 || !fits(state, action.card, action.pile)) return state;
		const s: KingsState = structuredClone(state);
		s.hands[seat] = s.hands[seat].filter((c) => c !== action.card);
		s.piles[action.pile].push(action.card);
		s.moves++;
		if (!s.hands[seat].length) endHand(s, seat);
		return s;
	}
	if (action.type === 'move') {
		if (!canMove(state, action.from, action.to)) return state;
		const s: KingsState = structuredClone(state);
		s.piles[action.to].push(...s.piles[action.from]);
		s.piles[action.from] = [];
		s.moves++;
		return s;
	}
	if (action.type === 'end') {
		const s: KingsState = structuredClone(state);
		s.idle = s.moves === 0 && !s.stock.length ? s.idle + 1 : 0;
		if (s.idle >= 2) {
			const [a, b] = s.hands.map((h) => h.length);
			endHand(s, a === b ? null : a < b ? 0 : 1);
			return s;
		}
		startTurn(s, 1 - seat);
		return s;
	}
	return state;
}

export function validKings(s: KingsState): boolean {
	const seen = new Set<Card>();
	for (const c of [...s.hands.flat(), ...s.stock, ...s.piles.flat()]) {
		if (!Number.isInteger(c) || c < 0 || c > 51 || seen.has(c)) return false;
		seen.add(c);
	}
	return seen.size === 52 && s.piles.length === 8 && s.hands.length === 2;
}

export const KINGS_RULES: RuleSet<KingsState, KingsAction> = {
	start: (_, random) => dealKings(newKings(Math.floor(random() * 2)), random),
	actor: (s) => (s.phase === 'play' ? s.turn : null),
	apply: applyKings,
	winners: (s) => s.winners,
	valid: validKings
};
