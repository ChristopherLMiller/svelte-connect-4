import { SPADES, fullDeck, rankOf, shuffle, suitOf, type Card, type Suit } from '../../kit/cards/deck';

export type SpadesPhase = 'bid' | 'play' | 'trick' | 'handOver' | 'over';

export type SpadesPlayed = { seat: number; card: Card; led: Suit; trick: number };

/** One team's hand: what they bid, what they took, and how it scored. */
export type SpadesTeamResult = {
	bid: number;
	took: number;
	made: boolean;
	points: number;
	bags: number;
	/** Bags rolled over ten this hand, each costing 100. */
	penalty: number;
	nils: Array<{ seat: number; made: boolean }>;
};

export type SpadesState = {
	kind: 'spades';
	target: number;
	/** Team totals: team 0 is seats 0 and 2, team 1 is seats 1 and 3. */
	scores: number[];
	bags: number[];
	handNo: number;
	dealer: number;
	phase: SpadesPhase;
	hands: Card[][];
	/** 0 is nil. */
	bids: Array<number | null>;
	trick: Array<Card | null>;
	leader: number;
	turn: number;
	trickNo: number;
	spadesBroken: boolean;
	/** Tricks won this hand, per seat. */
	tricks: number[];
	played: SpadesPlayed[];
	lastWinner: number | null;
	summary: SpadesTeamResult[] | null;
	winner: number | null;
	/** Points scored each hand, per team. */
	history: number[][];
};

export type SpadesAction = { type: 'bid'; bid: number } | { type: 'play'; card: Card } | { type: 'next' };

export const NIL_BONUS = 100;
export const BAG_LIMIT = 10;
export const FLOOR = -200;

export const teamOfS = (seat: number) => seat % 2;
export const partnerOfS = (seat: number) => (seat + 2) % 4;

export function newSpades(target = 300, dealer = 0): SpadesState {
	return {
		kind: 'spades',
		target,
		scores: [0, 0],
		bags: [0, 0],
		handNo: 0,
		dealer: (dealer + 3) % 4,
		phase: 'over',
		hands: [[], [], [], []],
		bids: [null, null, null, null],
		trick: [null, null, null, null],
		leader: 0,
		turn: 0,
		trickNo: 0,
		spadesBroken: false,
		tricks: [0, 0, 0, 0],
		played: [],
		lastWinner: null,
		summary: null,
		winner: null,
		history: []
	};
}

export function dealSpades(s: SpadesState, random: () => number): SpadesState {
	const deck = shuffle(fullDeck(), random);
	const dealer = (s.dealer + 1) % 4;
	const first = (dealer + 1) % 4;
	return {
		...s,
		handNo: s.handNo + 1,
		dealer,
		phase: 'bid',
		hands: [0, 1, 2, 3].map((i) => deck.slice(i * 13, i * 13 + 13)),
		bids: [null, null, null, null],
		trick: [null, null, null, null],
		leader: first,
		turn: first,
		trickNo: 0,
		spadesBroken: false,
		tricks: [0, 0, 0, 0],
		played: [],
		lastWinner: null,
		summary: null
	};
}

export function spadesActor(s: SpadesState): number | null {
	return s.phase === 'bid' || s.phase === 'play' ? s.turn : null;
}

export function ledSuitS(s: SpadesState): Suit | null {
	const lead = s.trick[s.leader];
	return lead === null ? null : suitOf(lead);
}

export function legalSpades(s: SpadesState, seat = s.turn): Card[] {
	const hand = s.hands[seat];
	const led = ledSuitS(s);
	if (led === null) {
		if (s.spadesBroken) return hand;
		const safe = hand.filter((c) => suitOf(c) !== SPADES);
		return safe.length ? safe : hand;
	}
	const follow = hand.filter((c) => suitOf(c) === led);
	return follow.length ? follow : hand;
}

/** Card strength within a trick: spades beat everything, then the led suit. */
export function powerS(c: Card, led: Suit) {
	if (suitOf(c) === SPADES) return 100 + rankOf(c);
	if (suitOf(c) === led) return 50 + rankOf(c);
	return rankOf(c);
}

export function trickWinnerS(trick: Array<Card | null>, leader: number) {
	const led = suitOf(trick[leader]!);
	let best = leader;
	for (let i = 0; i < 4; i++) {
		const c = trick[i];
		if (c !== null && powerS(c, led) > powerS(trick[best]!, led)) best = i;
	}
	return best;
}

/** The current winner of an unfinished trick, or null before the lead. */
export function winningSeat(s: SpadesState) {
	if (s.trick[s.leader] === null) return null;
	return trickWinnerS(s.trick, s.leader);
}

/** Tricks a team must take this hand: the sum of its non-nil bids. */
export function contractOf(s: SpadesState, team: number) {
	return [team, team + 2].reduce((t, seat) => t + (s.bids[seat] ?? 0), 0);
}

/** Tricks counting toward a team's contract (a nil bidder's tricks only count as bags). */
export function teamTricks(s: SpadesState, team: number) {
	return [team, team + 2].reduce((t, seat) => t + (s.bids[seat] === 0 ? 0 : s.tricks[seat]), 0);
}

export function scoreTeam(s: SpadesState, team: number, bagsBefore: number): SpadesTeamResult {
	const seats = [team, team + 2];
	const bid = contractOf(s, team);
	const took = teamTricks(s, team);
	const nils = seats.filter((seat) => s.bids[seat] === 0).map((seat) => ({ seat, made: s.tricks[seat] === 0 }));
	const nilTricks = seats.reduce((t, seat) => t + (s.bids[seat] === 0 ? s.tricks[seat] : 0), 0);
	let points = 0;
	let bags = 0;
	const made = took >= bid;
	if (bid > 0) {
		if (made) {
			points += bid * 10;
			bags += took - bid;
		} else points -= bid * 10;
	} else bags += took;
	bags += nilTricks;
	points += bags;
	for (const n of nils) points += n.made ? NIL_BONUS : -NIL_BONUS;
	const penalty = Math.floor((bagsBefore + bags) / BAG_LIMIT);
	points -= penalty * 100;
	return { bid, took, made, points, bags, penalty, nils };
}

export function applySpades(state: SpadesState, action: SpadesAction, random: () => number = Math.random): SpadesState {
	if (action.type === 'bid' && state.phase === 'bid') {
		if (!Number.isInteger(action.bid) || action.bid < 0 || action.bid > 13) return state;
		const s: SpadesState = structuredClone(state);
		s.bids[s.turn] = action.bid;
		if (s.bids.every((b) => b !== null)) {
			s.phase = 'play';
			s.turn = s.leader;
		} else s.turn = (s.turn + 1) % 4;
		return s;
	}
	if (action.type === 'play' && state.phase === 'play') {
		const seat = state.turn;
		if (!legalSpades(state, seat).includes(action.card)) return state;
		const s: SpadesState = structuredClone(state);
		const led = ledSuitS(s) ?? suitOf(action.card);
		s.hands[seat] = s.hands[seat].filter((c) => c !== action.card);
		s.trick[seat] = action.card;
		s.played.push({ seat, card: action.card, led, trick: s.trickNo });
		if (suitOf(action.card) === SPADES) s.spadesBroken = true;
		if (s.trick.every((c) => c !== null)) {
			s.lastWinner = trickWinnerS(s.trick, s.leader);
			s.phase = 'trick';
		} else s.turn = (seat + 1) % 4;
		return s;
	}
	if (action.type === 'next' && state.phase === 'trick') {
		const s: SpadesState = structuredClone(state);
		const w = s.lastWinner!;
		s.tricks[w]++;
		s.trick = [null, null, null, null];
		s.trickNo++;
		s.leader = w;
		s.turn = w;
		if (s.trickNo < 13) {
			s.phase = 'play';
			return s;
		}
		const results = [0, 1].map((team) => scoreTeam(s, team, s.bags[team]));
		s.summary = results;
		s.scores = s.scores.map((v, team) => v + results[team].points);
		s.bags = s.bags.map((v, team) => (v + results[team].bags) % BAG_LIMIT);
		s.history = [...s.history, results.map((r) => r.points)];
		s.phase = 'handOver';
		const [a, b] = s.scores;
		if (a <= FLOOR && b > FLOOR) s.winner = 1;
		else if (b <= FLOOR && a > FLOOR) s.winner = 0;
		else if ((a >= s.target || b >= s.target) && a !== b) s.winner = a > b ? 0 : 1;
		return s;
	}
	if (action.type === 'next' && state.phase === 'handOver') {
		if (state.winner !== null) return { ...state, phase: 'over' };
		return dealSpades(state, random);
	}
	return state;
}

export function validSpades(s: SpadesState): boolean {
	const seen = new Set<Card>();
	const cards = [...s.hands.flat(), ...s.played.map((p) => p.card)];
	for (const c of cards) {
		if (!Number.isInteger(c) || c < 0 || c > 51 || seen.has(c)) return false;
		seen.add(c);
	}
	return s.phase === 'over' || seen.size === 52;
}
