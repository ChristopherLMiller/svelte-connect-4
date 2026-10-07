import { JACK, fullDeck, lowRank, pipValue, rankOf, shuffle, suitOf, type Card } from '../../kit/cards/deck';

export type CribPhase = 'discard' | 'cut' | 'peg' | 'show' | 'over';

export type ScoreItem = { kind: 'fifteen' | 'pair' | 'run' | 'flush' | 'nobs' | 'heels'; cards: Card[]; points: number };

export type PegEvent = { seat: number; card: Card | null; count: number; points: number; why: string[] };

export type CribState = {
	kind: 'cribbage';
	target: number;
	scores: [number, number];
	/** Each player's previous total, for the back peg. */
	prev: [number, number];
	dealer: 0 | 1;
	handNo: number;
	phase: CribPhase;
	/** Cards still held (shrinks while pegging). */
	hands: [Card[], Card[]];
	/** The four kept cards, for the show. */
	kept: [Card[], Card[]];
	/** Two-card throws waiting to go to the crib. */
	thrown: [Card[] | null, Card[] | null];
	crib: Card[];
	starter: Card | null;
	stock: Card[];
	/** Pegging: the cards of the current count, in order. */
	pile: Array<{ seat: number; card: Card }>;
	/** Every card pegged this hand, for the table. */
	pegged: Array<{ seat: number; card: Card; run: number }>;
	run: number;
	count: number;
	turn: number;
	lastPlayer: number | null;
	/** Show steps: 0 pone's hand, 1 dealer's hand, 2 crib, 3 done. */
	showStep: number;
	lastPeg: PegEvent | null;
	/** Seat that just said go, cleared on the next play. */
	go: number | null;
	winner: number | null;
};

export type CribAction =
	| { type: 'discard'; seat: number; cards: Card[] }
	| { type: 'cut' }
	| { type: 'play'; card: Card }
	| { type: 'next' };

const other = (seat: number) => 1 - seat;

export function newCribbage(target = 121, dealer: 0 | 1 = Math.random() < 0.5 ? 0 : 1): CribState {
	return {
		kind: 'cribbage',
		target,
		scores: [0, 0],
		prev: [0, 0],
		dealer,
		handNo: 0,
		phase: 'over',
		hands: [[], []],
		kept: [[], []],
		thrown: [null, null],
		crib: [],
		starter: null,
		stock: fullDeck(),
		pile: [],
		pegged: [],
		run: 0,
		count: 0,
		turn: other(dealer),
		lastPlayer: null,
		showStep: 0,
		lastPeg: null,
		go: null,
		winner: null
	};
}

export function dealCribbage(s: CribState, random: () => number, first = false): CribState {
	const dealer = (first ? s.dealer : other(s.dealer)) as 0 | 1;
	const deck = shuffle(fullDeck(), random);
	const pone = other(dealer);
	const hands: [Card[], Card[]] = [[], []];
	for (let i = 0; i < 12; i++) hands[i % 2 === 0 ? pone : dealer].push(deck[i]);
	return {
		...s,
		dealer,
		handNo: s.handNo + 1,
		phase: 'discard',
		hands,
		kept: [[], []],
		thrown: [null, null],
		crib: [],
		starter: null,
		stock: deck.slice(12),
		pile: [],
		pegged: [],
		run: 0,
		count: 0,
		turn: pone,
		lastPlayer: null,
		showStep: 0,
		lastPeg: null,
		go: null
	};
}

/** Whose move it is, or null when the game is over. */
export function cribActor(s: CribState): number | null {
	switch (s.phase) {
		case 'discard':
			return s.thrown[other(s.dealer)] ? s.dealer : other(s.dealer);
		case 'cut':
			return other(s.dealer);
		case 'peg':
			return s.turn;
		case 'show':
			return null;
		default:
			return null;
	}
}

export function canPeg(s: CribState, seat: number) {
	return s.hands[seat].some((c) => s.count + pipValue(c) <= 31);
}

export function legalPegs(s: CribState): Card[] {
	return s.hands[s.turn].filter((c) => s.count + pipValue(c) <= 31);
}

function add(s: CribState, seat: number, points: number) {
	if (points <= 0 || s.winner !== null) return;
	s.prev[seat] = s.scores[seat];
	s.scores[seat] = Math.min(s.target, s.scores[seat] + points);
	if (s.scores[seat] >= s.target) {
		s.winner = seat;
		s.phase = 'over';
	}
}

/** Points for the card just added to a pegging pile. */
export function pegPoints(pile: Card[], count: number): { points: number; why: string[] } {
	let points = 0;
	const why: string[] = [];
	if (count === 15) {
		points += 2;
		why.push('fifteen for 2');
	}
	if (count === 31) {
		points += 2;
		why.push('thirty-one for 2');
	}
	const top = rankOf(pile[pile.length - 1]);
	let same = 1;
	for (let i = pile.length - 2; i >= 0 && rankOf(pile[i]) === top; i--) same++;
	if (same >= 2) {
		const pts = [0, 0, 2, 6, 12][same];
		points += pts;
		why.push(same === 2 ? 'a pair for 2' : same === 3 ? 'pair royal for 6' : 'double pair royal for 12');
	}
	for (let len = pile.length; len >= 3; len--) {
		const ranks = pile.slice(-len).map(lowRank).sort((a, b) => a - b);
		let ok = true;
		for (let i = 1; i < ranks.length; i++) if (ranks[i] !== ranks[i - 1] + 1) ok = false;
		if (ok) {
			points += len;
			why.push(`a run of ${len}`);
			break;
		}
	}
	return { points, why };
}

/** Every way a hand of four plus the starter scores in the show. */
export function scoreHand(hand: Card[], starter: Card, crib: boolean): ScoreItem[] {
	const all = [...hand, starter];
	const items: ScoreItem[] = [];
	const n = all.length;
	for (let mask = 1; mask < 1 << n; mask++) {
		const cards = all.filter((_, i) => mask & (1 << i));
		if (cards.length >= 2 && cards.reduce((t, c) => t + pipValue(c), 0) === 15) items.push({ kind: 'fifteen', cards, points: 2 });
	}
	for (let i = 0; i < n; i++) {
		for (let j = i + 1; j < n; j++) {
			if (rankOf(all[i]) === rankOf(all[j])) items.push({ kind: 'pair', cards: [all[i], all[j]], points: 2 });
		}
	}
	let best = 0;
	const runs: Card[][] = [];
	for (let mask = 1; mask < 1 << n; mask++) {
		const cards = all.filter((_, i) => mask & (1 << i));
		if (cards.length < 3 || cards.length < best) continue;
		const ranks = cards.map(lowRank).sort((a, b) => a - b);
		let ok = true;
		for (let i = 1; i < ranks.length; i++) if (ranks[i] !== ranks[i - 1] + 1) ok = false;
		if (!ok) continue;
		if (cards.length > best) {
			best = cards.length;
			runs.length = 0;
		}
		runs.push(cards.sort((a, b) => lowRank(a) - lowRank(b)));
	}
	for (const cards of runs) items.push({ kind: 'run', cards, points: cards.length });
	const suit = suitOf(hand[0]);
	if (hand.every((c) => suitOf(c) === suit)) {
		if (suitOf(starter) === suit) items.push({ kind: 'flush', cards: all, points: 5 });
		else if (!crib) items.push({ kind: 'flush', cards: hand.slice(), points: 4 });
	}
	for (const c of hand) {
		if (rankOf(c) === JACK && suitOf(c) === suitOf(starter)) items.push({ kind: 'nobs', cards: [c], points: 1 });
	}
	return items;
}

export const total = (items: ScoreItem[]) => items.reduce((t, i) => t + i.points, 0);

/** The show for the current step: whose cards, which cards, and the breakdown. */
export function showOf(s: CribState, step = s.showStep): { seat: number; cards: Card[]; crib: boolean; items: ScoreItem[] } | null {
	if (s.starter === null || step > 2) return null;
	const pone = other(s.dealer);
	if (step === 0) return { seat: pone, cards: s.kept[pone], crib: false, items: scoreHand(s.kept[pone], s.starter, false) };
	if (step === 1) return { seat: s.dealer, cards: s.kept[s.dealer], crib: false, items: scoreHand(s.kept[s.dealer], s.starter, false) };
	return { seat: s.dealer, cards: s.crib, crib: true, items: scoreHand(s.crib, s.starter, true) };
}

function advancePeg(s: CribState, last: number) {
	const opp = other(last);
	if (s.hands[0].length === 0 && s.hands[1].length === 0) {
		if (s.count !== 31) {
			add(s, last, 1);
			if (s.lastPeg) {
				s.lastPeg.points += 1;
				s.lastPeg.why.push('last card for 1');
			}
		}
		if (s.winner === null) {
			s.phase = 'show';
			s.showStep = 0;
		}
		return;
	}
	if (s.count === 31) {
		s.count = 0;
		s.pile = [];
		s.run++;
		s.turn = s.hands[opp].length ? opp : last;
		return;
	}
	if (canPeg(s, opp)) {
		s.turn = opp;
		return;
	}
	if (canPeg(s, last)) {
		s.go = opp;
		s.turn = last;
		return;
	}
	s.go = opp;
	add(s, last, 1);
	if (s.lastPeg) {
		s.lastPeg.points += 1;
		s.lastPeg.why.push('a go for 1');
	}
	s.count = 0;
	s.pile = [];
	s.run++;
	s.turn = s.hands[opp].length ? opp : last;
}

export function applyCribbage(state: CribState, action: CribAction, random: () => number = Math.random): CribState {
	const s: CribState = structuredClone(state);
	if (s.winner !== null) return s;
	if (action.type === 'discard' && s.phase === 'discard') {
		const seat = action.seat;
		if (action.cards.length !== 2 || !action.cards.every((c) => s.hands[seat].includes(c)) || s.thrown[seat]) return state;
		s.thrown[seat] = action.cards.slice();
		s.hands[seat] = s.hands[seat].filter((c) => !action.cards.includes(c));
		if (s.thrown[0] && s.thrown[1]) {
			s.crib = [...s.thrown[0], ...s.thrown[1]];
			s.kept = [s.hands[0].slice(), s.hands[1].slice()];
			s.phase = 'cut';
		}
		return s;
	}
	if (action.type === 'cut' && s.phase === 'cut') {
		const at = 4 + Math.floor(random() * (s.stock.length - 8));
		s.starter = s.stock[at];
		s.stock = [...s.stock.slice(0, at), ...s.stock.slice(at + 1)];
		s.phase = 'peg';
		s.turn = other(s.dealer);
		s.lastPeg = null;
		if (rankOf(s.starter) === JACK) {
			add(s, s.dealer, 2);
			s.lastPeg = { seat: s.dealer, card: null, count: 0, points: 2, why: ['his heels for 2'] };
		}
		return s;
	}
	if (action.type === 'play' && s.phase === 'peg') {
		const seat = s.turn;
		if (!s.hands[seat].includes(action.card) || s.count + pipValue(action.card) > 31) return state;
		s.hands[seat] = s.hands[seat].filter((c) => c !== action.card);
		s.pile.push({ seat, card: action.card });
		s.pegged.push({ seat, card: action.card, run: s.run });
		s.count += pipValue(action.card);
		s.go = null;
		const { points, why } = pegPoints(
			s.pile.map((p) => p.card),
			s.count
		);
		s.lastPeg = { seat, card: action.card, count: s.count, points, why };
		add(s, seat, points);
		s.lastPlayer = seat;
		if (s.winner === null) advancePeg(s, seat);
		return s;
	}
	if (action.type === 'next' && s.phase === 'show') {
		const show = showOf(s);
		if (show) add(s, show.seat, total(show.items));
		if (s.winner !== null) return s;
		s.showStep++;
		if (s.showStep > 2) return dealCribbage(s, random);
		return s;
	}
	return state;
}

export function validCribbage(s: CribState): boolean {
	const seen = new Set<Card>();
	const cards = [...s.hands[0], ...s.hands[1], ...s.crib, ...s.stock, ...s.pegged.map((p) => p.card)];
	if (s.starter !== null) cards.push(s.starter);
	for (const t of s.thrown) if (t && s.phase === 'discard') cards.push(...t);
	for (const c of cards) {
		if (!Number.isInteger(c) || c < 0 || c > 51 || seen.has(c)) return false;
		seen.add(c);
	}
	return seen.size === 52 && s.scores.every((x) => x >= 0 && x <= s.target);
}
