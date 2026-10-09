import { rankOf, shuffle, type Card } from '../../kit/cards/deck';
import type { Difficulty } from '../types';
import type { RuleSet } from './types';

export const BJ_HANDS = 10;
export const BJ_START = 100;
export const BJ_BETS = [5, 10, 25, 50];
const DECKS = 2;
const RESHUFFLE = 15;

export type BjHand = { cards: Card[]; bet: number; done: boolean; doubled: boolean; split: boolean };
export type BjResult = 'blackjack' | 'win' | 'push' | 'lose' | 'bust';
export type BjRules = { hitSoft17: boolean; payout: number };

export type BlackjackState = {
	kind: 'blackjack';
	phase: 'bet' | 'play' | 'dealer' | 'handOver' | 'over';
	handNo: number;
	rules: BjRules;
	shoe: Card[];
	/** Cards from finished hands, face down beside the shoe. */
	used: Card[];
	chips: number;
	hands: BjHand[];
	active: number;
	dealer: Card[];
	holeShown: boolean;
	summary: { results: BjResult[]; net: number; dealerBust: boolean } | null;
	/** Net chips won or lost each hand. */
	history: number[];
	/** Chips after each hand, for the ledger. */
	totals: number[];
	winners: number[];
};

export type BlackjackAction =
	| { type: 'bet'; amount: number }
	| { type: 'hit' }
	| { type: 'stand' }
	| { type: 'double' }
	| { type: 'split' }
	| { type: 'next' };

export const RULES_BY_LEVEL: Record<Difficulty, BjRules> = {
	easy: { hitSoft17: false, payout: 1.5 },
	medium: { hitSoft17: true, payout: 1.5 },
	hard: { hitSoft17: true, payout: 1.2 }
};

/** Blackjack value of one card: aces count 11 here, totals bring them down. */
export function cardValue(c: Card) {
	const r = rankOf(c);
	if (r === 12) return 11;
	if (r >= 8) return 10;
	return r + 2;
}

export function total(cards: Card[]) {
	let sum = 0;
	let aces = 0;
	for (const c of cards) {
		sum += cardValue(c);
		if (rankOf(c) === 12) aces++;
	}
	while (sum > 21 && aces) {
		sum -= 10;
		aces--;
	}
	return { sum, soft: aces > 0 };
}

export const isBlackjack = (cards: Card[], split = false) => !split && cards.length === 2 && total(cards).sum === 21;
export const handLabel = (cards: Card[], split = false) => {
	const t = total(cards);
	if (isBlackjack(cards, split)) return 'Blackjack';
	if (t.sum > 21) return `Bust ${t.sum}`;
	return `${t.soft && t.sum < 21 ? 'Soft ' : ''}${t.sum}`;
};

const committed = (s: BlackjackState) => s.hands.reduce((t, h) => t + h.bet, 0);

export function canDouble(s: BlackjackState) {
	const h = s.hands[s.active];
	return s.phase === 'play' && !!h && h.cards.length === 2 && s.chips - committed(s) >= h.bet;
}

export function canSplit(s: BlackjackState) {
	const h = s.hands[s.active];
	return s.phase === 'play' && s.hands.length === 1 && !!h && h.cards.length === 2 && cardValue(h.cards[0]) === cardValue(h.cards[1]) && s.chips - committed(s) >= h.bet;
}

export const betOptions = (s: BlackjackState) => BJ_BETS.filter((b) => b <= s.chips);

function draw(s: BlackjackState): Card {
	return s.shoe.pop()!;
}

function freshShoe(random: () => number) {
	return shuffle(
		Array.from({ length: 52 * DECKS }, (_, i) => i),
		random
	);
}

/** Dealer's rule: draw to 17, and on soft 17 too when the house says so. */
export function dealerHits(s: BlackjackState) {
	const t = total(s.dealer);
	return t.sum < 17 || (t.sum === 17 && t.soft && s.rules.hitSoft17);
}

function settle(s: BlackjackState) {
	const d = total(s.dealer);
	const dealerBj = isBlackjack(s.dealer);
	let net = 0;
	const results = s.hands.map((h): BjResult => {
		const t = total(h.cards);
		const bj = isBlackjack(h.cards, h.split);
		if (t.sum > 21) {
			net -= h.bet;
			return 'bust';
		}
		if (bj && !dealerBj) {
			net += Math.floor(h.bet * s.rules.payout);
			return 'blackjack';
		}
		if (dealerBj && !bj) {
			net -= h.bet;
			return 'lose';
		}
		if (bj && dealerBj) return 'push';
		if (d.sum > 21 || t.sum > d.sum) {
			net += h.bet;
			return 'win';
		}
		if (t.sum === d.sum) return 'push';
		net -= h.bet;
		return 'lose';
	});
	s.chips += net;
	s.holeShown = true;
	s.summary = { results, net, dealerBust: d.sum > 21 };
	s.history = [...s.history, net];
	s.totals = [...s.totals, s.chips];
	s.phase = 'handOver';
}

/** Move to the next unfinished hand, or let the dealer play. */
function advance(s: BlackjackState) {
	const next = s.hands.findIndex((h) => !h.done);
	if (next >= 0) {
		s.active = next;
		return;
	}
	s.holeShown = true;
	if (s.hands.every((h) => total(h.cards).sum > 21)) {
		settle(s);
		return;
	}
	s.phase = 'dealer';
	if (!dealerHits(s)) settle(s);
}

function finishHand(s: BlackjackState) {
	const h = s.hands[s.active];
	if (total(h.cards).sum >= 21) h.done = true;
}

export function newBlackjack(level: Difficulty, random: () => number): BlackjackState {
	return {
		kind: 'blackjack',
		phase: 'bet',
		handNo: 1,
		rules: RULES_BY_LEVEL[level],
		shoe: freshShoe(random),
		used: [],
		chips: BJ_START,
		hands: [],
		active: 0,
		dealer: [],
		holeShown: false,
		summary: null,
		history: [],
		totals: [],
		winners: []
	};
}

export function applyBlackjack(state: BlackjackState, action: BlackjackAction, random: () => number): BlackjackState {
	if (action.type === 'bet' && state.phase === 'bet') {
		if (!betOptions(state).includes(action.amount)) return state;
		const s: BlackjackState = structuredClone(state);
		if (s.shoe.length < RESHUFFLE) {
			s.shoe = freshShoe(random);
			s.used = [];
		}
		const cards = [draw(s), draw(s)];
		s.dealer = [draw(s), draw(s)];
		s.hands = [{ cards, bet: action.amount, done: false, doubled: false, split: false }];
		s.active = 0;
		s.holeShown = false;
		s.summary = null;
		s.phase = 'play';
		if (isBlackjack(s.dealer) || isBlackjack(cards)) settle(s);
		return s;
	}
	if (state.phase === 'play') {
		const s: BlackjackState = structuredClone(state);
		const h = s.hands[s.active];
		if (action.type === 'hit') {
			h.cards.push(draw(s));
			finishHand(s);
		} else if (action.type === 'stand') {
			h.done = true;
		} else if (action.type === 'double') {
			if (!canDouble(state)) return state;
			h.bet *= 2;
			h.doubled = true;
			h.cards.push(draw(s));
			h.done = true;
		} else if (action.type === 'split') {
			if (!canSplit(state)) return state;
			const aces = rankOf(h.cards[0]) === 12;
			const second: BjHand = { cards: [h.cards[1], draw(s)], bet: h.bet, done: aces, doubled: false, split: true };
			h.cards = [h.cards[0], draw(s)];
			h.split = true;
			h.done = aces;
			s.hands.push(second);
			finishHand(s);
		} else return state;
		if (h.done) advance(s);
		return s;
	}
	if (state.phase === 'dealer') {
		const s: BlackjackState = structuredClone(state);
		if (action.type === 'hit' && dealerHits(s)) s.dealer.push(draw(s));
		else if (action.type !== 'stand') return state;
		if (action.type === 'stand' || !dealerHits(s)) settle(s);
		return s;
	}
	if (action.type === 'next' && state.phase === 'handOver') {
		const s: BlackjackState = structuredClone(state);
		s.used = [...s.used, ...s.hands.flatMap((h) => h.cards), ...s.dealer];
		s.hands = [];
		s.dealer = [];
		s.summary = null;
		if (s.handNo >= BJ_HANDS || s.chips < BJ_BETS[0]) {
			s.phase = 'over';
			s.winners = s.chips > BJ_START ? [0] : [1];
			return s;
		}
		s.handNo++;
		s.phase = 'bet';
		return s;
	}
	return state;
}

export function validBlackjack(s: BlackjackState): boolean {
	const seen = new Set<Card>();
	for (const c of [...s.shoe, ...s.used, ...s.hands.flatMap((h) => h.cards), ...s.dealer]) {
		if (!Number.isInteger(c) || c < 0 || c >= 52 * DECKS || seen.has(c)) return false;
		seen.add(c);
	}
	return seen.size === 52 * DECKS && s.chips >= 0 && !!s.rules;
}

export const BLACKJACK_RULES: RuleSet<BlackjackState, BlackjackAction> = {
	start: (options, random) => newBlackjack(options.difficulty ?? 'medium', random),
	actor: (s) => (s.phase === 'bet' || s.phase === 'play' ? 0 : s.phase === 'dealer' ? 1 : null),
	apply: applyBlackjack,
	winners: (s) => s.winners,
	valid: validBlackjack
};
