import { HEARTS, QUEEN, SPADES, CLUBS, card, fullDeck, rankOf, shuffle, suitOf, type Card, type Suit } from '../../kit/cards/deck';

export type HeartsPhase = 'pass' | 'play' | 'trick' | 'handOver' | 'over';

export const QUEEN_OF_SPADES = card(SPADES, QUEEN);
export const TWO_OF_CLUBS = card(CLUBS, 0);
/** Left, right, across, hold. */
export const PASS_NAMES = ['left', 'right', 'across', 'hold'] as const;

export type Played = { seat: number; card: Card; led: Suit; trick: number };

export type HeartsState = {
	kind: 'hearts';
	target: number;
	scores: number[];
	/** Points taken this hand so far. */
	taking: number[];
	handNo: number;
	phase: HeartsPhase;
	hands: Card[][];
	passing: Array<Card[] | null>;
	/** Cards each seat received in the pass, to show which ones are new. */
	received: Card[][];
	trick: Array<Card | null>;
	leader: number;
	turn: number;
	trickNo: number;
	heartsBroken: boolean;
	/** Cards won, per seat. */
	won: Card[][];
	played: Played[];
	lastWinner: number | null;
	/** Hand summary once the thirteenth trick is taken. */
	summary: { points: number[]; moon: number | null } | null;
	winners: number[];
	/** Points scored each hand, for the chalk sheet. */
	history: number[][];
};

export type HeartsAction = { type: 'pass'; seat: number; cards: Card[] } | { type: 'play'; card: Card } | { type: 'next' };

export const pointsOf = (c: Card) => (suitOf(c) === HEARTS ? 1 : c === QUEEN_OF_SPADES ? 13 : 0);

export function passDir(handNo: number) {
	return (handNo - 1) % 4;
}

export function passTarget(seat: number, dir: number) {
	return dir === 0 ? (seat + 1) % 4 : dir === 1 ? (seat + 3) % 4 : (seat + 2) % 4;
}

export function newHearts(target = 100): HeartsState {
	return {
		kind: 'hearts',
		target,
		scores: [0, 0, 0, 0],
		taking: [0, 0, 0, 0],
		handNo: 0,
		phase: 'over',
		hands: [[], [], [], []],
		passing: [null, null, null, null],
		received: [[], [], [], []],
		trick: [null, null, null, null],
		leader: 0,
		turn: 0,
		trickNo: 0,
		heartsBroken: false,
		won: [[], [], [], []],
		played: [],
		lastWinner: null,
		summary: null,
		winners: [],
		history: []
	};
}

function holderOfTwo(hands: Card[][]) {
	return hands.findIndex((h) => h.includes(TWO_OF_CLUBS));
}

export function dealHearts(s: HeartsState, random: () => number): HeartsState {
	const deck = shuffle(fullDeck(), random);
	const hands = [0, 1, 2, 3].map((i) => deck.slice(i * 13, i * 13 + 13));
	const handNo = s.handNo + 1;
	const hold = passDir(handNo) === 3;
	const leader = holderOfTwo(hands);
	return {
		...s,
		handNo,
		phase: hold ? 'play' : 'pass',
		hands,
		passing: [null, null, null, null],
		received: [[], [], [], []],
		trick: [null, null, null, null],
		leader,
		turn: leader,
		trickNo: 0,
		heartsBroken: false,
		taking: [0, 0, 0, 0],
		won: [[], [], [], []],
		played: [],
		lastWinner: null,
		summary: null
	};
}

export function heartsActor(s: HeartsState): number | null {
	if (s.phase === 'pass') {
		const seat = s.passing.findIndex((p) => p === null);
		return seat < 0 ? null : seat;
	}
	if (s.phase === 'play') return s.turn;
	return null;
}

export function ledSuit(s: HeartsState): Suit | null {
	const lead = s.trick[s.leader];
	return lead === null ? null : suitOf(lead);
}

export function legalHearts(s: HeartsState, seat = s.turn): Card[] {
	const hand = s.hands[seat];
	const led = ledSuit(s);
	const first = s.trickNo === 0;
	if (led === null) {
		if (first) return hand.includes(TWO_OF_CLUBS) ? [TWO_OF_CLUBS] : hand;
		if (!s.heartsBroken) {
			const safe = hand.filter((c) => suitOf(c) !== HEARTS);
			if (safe.length) return safe;
		}
		return hand;
	}
	const follow = hand.filter((c) => suitOf(c) === led);
	if (follow.length) return follow;
	if (first) {
		const clean = hand.filter((c) => pointsOf(c) === 0);
		if (clean.length) return clean;
	}
	return hand;
}

export function trickWinner(trick: Array<Card | null>, leader: number) {
	const led = suitOf(trick[leader]!);
	let best = leader;
	for (let i = 0; i < 4; i++) {
		const c = trick[i];
		if (c !== null && suitOf(c) === led && rankOf(c) > rankOf(trick[best]!)) best = i;
	}
	return best;
}

export function applyHearts(state: HeartsState, action: HeartsAction, random: () => number = Math.random): HeartsState {
	const s: HeartsState = structuredClone(state);
	if (action.type === 'pass' && s.phase === 'pass') {
		const { seat, cards } = action;
		if (s.passing[seat] || cards.length !== 3 || new Set(cards).size !== 3 || !cards.every((c) => s.hands[seat].includes(c))) return state;
		s.passing[seat] = cards.slice();
		if (s.passing.every(Boolean)) {
			const dir = passDir(s.handNo);
			const next = s.hands.map((h, i) => h.filter((c) => !s.passing[i]!.includes(c)));
			for (let i = 0; i < 4; i++) {
				const to = passTarget(i, dir);
				next[to].push(...s.passing[i]!);
				s.received[to] = s.passing[i]!.slice();
			}
			s.hands = next;
			s.leader = holderOfTwo(next);
			s.turn = s.leader;
			s.phase = 'play';
		}
		return s;
	}
	if (action.type === 'play' && s.phase === 'play') {
		const seat = s.turn;
		if (!legalHearts(s, seat).includes(action.card)) return state;
		const led = ledSuit(s) ?? suitOf(action.card);
		s.hands[seat] = s.hands[seat].filter((c) => c !== action.card);
		s.trick[seat] = action.card;
		s.played.push({ seat, card: action.card, led, trick: s.trickNo });
		if (suitOf(action.card) === HEARTS) s.heartsBroken = true;
		if (s.trick.every((c) => c !== null)) {
			s.lastWinner = trickWinner(s.trick, s.leader);
			s.phase = 'trick';
		} else {
			s.turn = (seat + 1) % 4;
		}
		return s;
	}
	if (action.type === 'next' && s.phase === 'trick') {
		const w = s.lastWinner!;
		const cards = s.trick as Card[];
		s.won[w].push(...cards);
		s.taking[w] += cards.reduce((t, c) => t + pointsOf(c), 0);
		s.trick = [null, null, null, null];
		s.trickNo++;
		s.leader = w;
		s.turn = w;
		if (s.trickNo < 13) {
			s.phase = 'play';
			return s;
		}
		const moon = s.taking.findIndex((p) => p === 26);
		const points = moon >= 0 ? s.taking.map((_, i) => (i === moon ? 0 : 26)) : s.taking.slice();
		s.summary = { points, moon: moon >= 0 ? moon : null };
		s.scores = s.scores.map((v, i) => v + points[i]);
		s.history = [...(s.history ?? []), points];
		s.phase = 'handOver';
		if (s.scores.some((v) => v >= s.target)) {
			const low = Math.min(...s.scores);
			s.winners = s.scores.flatMap((v, i) => (v === low ? [i] : []));
		}
		return s;
	}
	if (action.type === 'next' && s.phase === 'handOver') {
		if (s.winners.length) {
			s.phase = 'over';
			return s;
		}
		return dealHearts(s, random);
	}
	return state;
}

export function validHearts(s: HeartsState): boolean {
	const seen = new Set<Card>();
	const cards = [...s.hands.flat(), ...s.won.flat(), ...s.trick.filter((c): c is Card => c !== null)];
	for (const c of cards) {
		if (!Number.isInteger(c) || c < 0 || c > 51 || seen.has(c)) return false;
		seen.add(c);
	}
	return s.phase === 'over' || seen.size === 52;
}
