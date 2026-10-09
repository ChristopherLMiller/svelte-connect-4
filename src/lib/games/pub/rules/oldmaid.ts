import { QUEEN, card, fullDeck, rankOf, shuffle, type Card } from '../../kit/cards/deck';
import type { RuleSet } from './types';

/** The queen of clubs comes out, leaving one queen that can never pair. */
export const REMOVED = card(0, QUEEN);

export type MaidDraw = { seat: number; from: number; paired: boolean; out: number[] };

export type OldMaidState = {
	kind: 'oldmaid';
	phase: 'draw' | 'over';
	handNo: number;
	hands: Card[][];
	/** Pairs each seat has put down, two cards at a time. */
	pairs: Card[][];
	turn: number;
	last: MaidDraw | null;
	/** The card just drawn (only the drawer sees it). */
	drawn: Card | null;
	/** Seats in the order they ran out of cards. */
	out: number[];
	loser: number | null;
	winners: number[];
};

export type OldMaidAction = { type: 'draw'; card: Card } | { type: 'next' };

const active = (s: OldMaidState) => [0, 1, 2, 3].filter((i) => s.hands[i].length > 0);

/** The player you draw from: the next one round the table who still has cards. */
export function sourceOf(s: OldMaidState, seat = s.turn): number {
	for (let i = 1; i < 4; i++) {
		const p = (seat + i) % 4;
		if (s.hands[p].length) return p;
	}
	return seat;
}

function shedPairs(hand: Card[]) {
	const keep: Card[] = [];
	const pairs: Card[] = [];
	for (const c of hand) {
		const at = keep.findIndex((x) => rankOf(x) === rankOf(c));
		if (at >= 0) pairs.push(keep.splice(at, 1)[0], c);
		else keep.push(c);
	}
	return { keep, pairs };
}

function settle(s: OldMaidState, from: number) {
	for (let i = 0; i < 4; i++) if (!s.hands[i].length && !s.out.includes(i)) s.out = [...s.out, i];
	const left = active(s);
	if (left.length <= 1) {
		s.phase = 'over';
		s.loser = left[0] ?? null;
		s.winners = [0, 1, 2, 3].filter((i) => i !== s.loser);
		return;
	}
	for (let i = 0; i < 4; i++) {
		const p = (from + i) % 4;
		if (s.hands[p].length) {
			s.turn = p;
			return;
		}
	}
}

export function dealOldMaid(random: () => number): OldMaidState {
	const deck = shuffle(
		fullDeck().filter((c) => c !== REMOVED),
		random
	);
	const s: OldMaidState = {
		kind: 'oldmaid',
		phase: 'draw',
		handNo: 1,
		hands: [[], [], [], []],
		pairs: [[], [], [], []],
		turn: 0,
		last: null,
		drawn: null,
		out: [],
		loser: null,
		winners: []
	};
	deck.forEach((c, i) => s.hands[i % 4].push(c));
	for (let i = 0; i < 4; i++) {
		const { keep, pairs } = shedPairs(s.hands[i]);
		s.hands[i] = shuffle(keep, random);
		s.pairs[i] = pairs;
	}
	settle(s, Math.floor(random() * 4));
	return s;
}

export function applyOldMaid(state: OldMaidState, action: OldMaidAction, random: () => number): OldMaidState {
	if (action.type !== 'draw' || state.phase !== 'draw') return state;
	const seat = state.turn;
	const from = sourceOf(state);
	if (from === seat || !state.hands[from].includes(action.card)) return state;
	const s: OldMaidState = structuredClone(state);
	s.hands[from] = s.hands[from].filter((c) => c !== action.card);
	const mate = s.hands[seat].find((c) => rankOf(c) === rankOf(action.card));
	const paired = mate !== undefined;
	if (paired) {
		s.hands[seat] = s.hands[seat].filter((c) => c !== mate);
		s.pairs[seat] = [...s.pairs[seat], mate, action.card];
		s.drawn = null;
	} else {
		s.hands[seat] = shuffle([...s.hands[seat], action.card], random);
		s.drawn = action.card;
	}
	const before = s.out.length;
	settle(s, (seat + 1) % 4);
	s.last = { seat, from, paired, out: s.out.slice(before) };
	return s;
}

export function validOldMaid(s: OldMaidState): boolean {
	const seen = new Set<Card>();
	for (const c of [...s.hands.flat(), ...s.pairs.flat()]) {
		if (!Number.isInteger(c) || c < 0 || c > 51 || c === REMOVED || seen.has(c)) return false;
		seen.add(c);
	}
	return seen.size === 51 && s.hands.length === 4;
}

export const OLD_MAID_RULES: RuleSet<OldMaidState, OldMaidAction> = {
	start: (_, random) => dealOldMaid(random),
	actor: (s) => (s.phase === 'draw' ? s.turn : null),
	apply: applyOldMaid,
	winners: (s) => s.winners,
	valid: validOldMaid
};
