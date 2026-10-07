import { JACK, NINE, TEN, euchreDeck, partnerSuit, rankOf, shuffle, suitOf, type Card, type Suit } from '../../kit/cards/deck';

export type EuchrePhase = 'farmer' | 'bid1' | 'bid2' | 'discard' | 'defend' | 'play' | 'trick' | 'handOver' | 'over';

export type EuchreOptions = { target: number; stick: boolean };

export type EuchreState = {
	kind: 'euchre';
	target: number;
	stick: boolean;
	/** Team 0 is seats 0 and 2, team 1 is seats 1 and 3. */
	scores: [number, number];
	dealer: number;
	handNo: number;
	phase: EuchrePhase;
	hands: Card[][];
	/** kitty[0] is the upcard; the rest stay face down. */
	kitty: Card[];
	upcard: Card;
	/** Turned down in round two, or picked up by the dealer. */
	upTaken: boolean;
	turn: number;
	trump: Suit | null;
	maker: number | null;
	/** The maker plays alone; their partner sits out. */
	alone: boolean;
	/** A defender playing alone against a loner. */
	defender: number | null;
	/** Seats that have passed in the current bidding round. */
	passes: number;
	/** Seats offered the defend-alone choice so far. */
	defendAsked: number;
	trick: Array<Card | null>;
	leader: number;
	trickNo: number;
	tricks: number[];
	played: Array<{ seat: number; card: Card; led: Suit; trick: number }>;
	lastWinner: number | null;
	/** Seat that swapped a farmer's hand this deal. */
	farmed: number | null;
	summary: { team: number; points: number; why: string } | null;
	winner: number | null;
	/** Everyone passed twice and the deal moved on. */
	thrownIn: boolean;
};

export type EuchreAction =
	| { type: 'farmer'; swap: boolean }
	| { type: 'order'; alone: boolean }
	| { type: 'call'; suit: Suit; alone: boolean }
	| { type: 'pass' }
	| { type: 'discard'; card: Card }
	| { type: 'defend'; alone: boolean }
	| { type: 'play'; card: Card }
	| { type: 'next' };

export const teamOf = (seat: number) => seat % 2;
export const partnerOf = (seat: number) => (seat + 2) % 4;

/** Effective suit: the left bower belongs to trump. */
export function effSuit(c: Card, trump: Suit | null): Suit {
	if (trump !== null && rankOf(c) === JACK && suitOf(c) === partnerSuit(trump)) return trump;
	return suitOf(c);
}

export function isRight(c: Card, trump: Suit | null) {
	return trump !== null && rankOf(c) === JACK && suitOf(c) === trump;
}

export function isLeft(c: Card, trump: Suit | null) {
	return trump !== null && rankOf(c) === JACK && suitOf(c) === partnerSuit(trump);
}

/** Strength within a trick: trump beats the led suit beats everything else. */
export function power(c: Card, trump: Suit | null, led: Suit | null) {
	if (isRight(c, trump)) return 200;
	if (isLeft(c, trump)) return 199;
	const s = effSuit(c, trump);
	if (s === trump) return 100 + rankOf(c);
	if (s === led) return 50 + rankOf(c);
	return rankOf(c) - 20;
}

export const isFarmer = (hand: Card[]) => hand.filter((c) => rankOf(c) === NINE || rankOf(c) === TEN).length >= 3;

export function sitsOut(s: EuchreState, seat: number) {
	if (s.alone && s.maker !== null && seat === partnerOf(s.maker)) return true;
	if (s.defender !== null && seat === partnerOf(s.defender)) return true;
	return false;
}

function nextSeat(s: EuchreState, seat: number) {
	let n = (seat + 1) % 4;
	for (let i = 0; i < 4 && sitsOut(s, n); i++) n = (n + 1) % 4;
	return n;
}

export function newEuchre(options: EuchreOptions, dealer = Math.floor(Math.random() * 4)): EuchreState {
	return {
		kind: 'euchre',
		target: options.target,
		stick: options.stick,
		scores: [0, 0],
		dealer: (dealer + 3) % 4,
		handNo: 0,
		phase: 'over',
		hands: [[], [], [], []],
		kitty: [],
		upcard: 0,
		upTaken: false,
		turn: 0,
		trump: null,
		maker: null,
		alone: false,
		defender: null,
		passes: 0,
		defendAsked: 0,
		trick: [null, null, null, null],
		leader: 0,
		trickNo: 0,
		tricks: [0, 0, 0, 0],
		played: [],
		lastWinner: null,
		farmed: null,
		summary: null,
		winner: null,
		thrownIn: false
	};
}

export function dealEuchre(s: EuchreState, random: () => number): EuchreState {
	const dealer = (s.dealer + 1) % 4;
	const deck = shuffle(euchreDeck(), random);
	const hands: Card[][] = [[], [], [], []];
	const pattern = [3, 2, 3, 2, 2, 3, 2, 3];
	let at = 0;
	for (let round = 0; round < 8; round++) {
		const seat = (dealer + 1 + round) % 4;
		for (let k = 0; k < pattern[round]; k++) hands[seat].push(deck[at++]);
	}
	const kitty = deck.slice(at);
	const next: EuchreState = {
		...s,
		dealer,
		handNo: s.handNo + 1,
		phase: 'bid1',
		hands,
		kitty,
		upcard: kitty[0],
		upTaken: false,
		turn: (dealer + 1) % 4,
		trump: null,
		maker: null,
		alone: false,
		defender: null,
		passes: 0,
		defendAsked: 0,
		trick: [null, null, null, null],
		leader: (dealer + 1) % 4,
		trickNo: 0,
		tricks: [0, 0, 0, 0],
		played: [],
		lastWinner: null,
		farmed: null,
		summary: null,
		thrownIn: false
	};
	const farmer = farmerSeat(next);
	if (farmer !== null) {
		next.phase = 'farmer';
		next.turn = farmer;
	}
	return next;
}

function farmerSeat(s: EuchreState): number | null {
	for (let i = 1; i <= 4; i++) {
		const seat = (s.dealer + i) % 4;
		if (isFarmer(s.hands[seat])) return seat;
	}
	return null;
}

export function euchreActor(s: EuchreState): number | null {
	if (s.phase === 'trick' || s.phase === 'handOver' || s.phase === 'over') return null;
	return s.turn;
}

/** Canadian loner: the dealer's partner can't go alone when ordering the dealer up. */
export function mayGoAlone(s: EuchreState, seat: number) {
	if (s.phase === 'bid1' && seat === partnerOf(s.dealer)) return false;
	return true;
}

export function mustCall(s: EuchreState) {
	return s.phase === 'bid2' && s.stick && s.turn === s.dealer;
}

export function ledSuitE(s: EuchreState): Suit | null {
	const lead = s.trick[s.leader];
	return lead === null ? null : effSuit(lead, s.trump);
}

export function legalEuchre(s: EuchreState, seat = s.turn): Card[] {
	const hand = s.hands[seat];
	const led = ledSuitE(s);
	if (led === null) return hand;
	const follow = hand.filter((c) => effSuit(c, s.trump) === led);
	return follow.length ? follow : hand;
}

export function trickWinnerE(s: EuchreState) {
	const led = ledSuitE(s);
	let best = -1;
	let bestPower = -Infinity;
	for (let i = 0; i < 4; i++) {
		const c = s.trick[i];
		if (c === null) continue;
		const p = power(c, s.trump, led);
		if (p > bestPower) {
			bestPower = p;
			best = i;
		}
	}
	return best;
}

function startPlay(s: EuchreState) {
	s.phase = 'play';
	s.leader = nextSeat(s, s.dealer);
	s.turn = s.leader;
}

function afterTrumpMade(s: EuchreState) {
	if (s.alone) {
		s.phase = 'defend';
		s.defendAsked = 0;
		s.turn = firstDefender(s);
		return;
	}
	startPlay(s);
}

function firstDefender(s: EuchreState) {
	for (let i = 1; i <= 4; i++) {
		const seat = (s.dealer + i) % 4;
		if (teamOf(seat) !== teamOf(s.maker!)) return seat;
	}
	return 0;
}

function score(s: EuchreState) {
	const makers = teamOf(s.maker!);
	const taken = s.tricks.reduce((t, n, seat) => t + (teamOf(seat) === makers ? n : 0), 0);
	let team = makers;
	let points = 0;
	let why = '';
	if (taken >= 3) {
		if (taken === 5) {
			points = s.alone ? 4 : 2;
			why = s.alone ? 'A loner, all five tricks' : 'March: all five tricks';
		} else {
			points = 1;
			why = s.alone ? 'Loner made, three or four tricks' : 'Made it';
		}
	} else {
		team = 1 - makers;
		points = s.defender !== null ? 4 : 2;
		why = s.defender !== null ? 'Euchred by a lone defender' : 'Euchred';
	}
	s.scores[team] += points;
	s.summary = { team, points, why };
	s.phase = 'handOver';
	if (s.scores[team] >= s.target) s.winner = team;
}

export function applyEuchre(state: EuchreState, action: EuchreAction, random: () => number = Math.random): EuchreState {
	const s: EuchreState = structuredClone(state);
	const seat = s.turn;
	switch (s.phase) {
		case 'farmer': {
			if (action.type !== 'farmer') return state;
			if (action.swap) {
				const low = s.hands[seat].filter((c) => rankOf(c) === NINE || rankOf(c) === TEN).slice(0, 3);
				const hidden = s.kitty.slice(1);
				s.hands[seat] = [...s.hands[seat].filter((c) => !low.includes(c)), ...hidden];
				s.kitty = [s.kitty[0], ...low];
				s.farmed = seat;
			}
			s.phase = 'bid1';
			s.turn = (s.dealer + 1) % 4;
			return s;
		}
		case 'bid1': {
			if (action.type === 'pass') {
				s.passes++;
				if (s.passes === 4) {
					s.phase = 'bid2';
					s.passes = 0;
					s.upTaken = true;
					s.turn = (s.dealer + 1) % 4;
				} else s.turn = (seat + 1) % 4;
				return s;
			}
			if (action.type !== 'order' || (action.alone && !mayGoAlone(s, seat))) return state;
			s.trump = suitOf(s.upcard);
			s.maker = seat;
			s.alone = action.alone;
			s.upTaken = true;
			if (s.alone && seat === partnerOf(s.dealer)) {
				afterTrumpMade(s);
				return s;
			}
			s.hands[s.dealer].push(s.upcard);
			s.kitty = s.kitty.slice(1);
			s.phase = 'discard';
			s.turn = s.dealer;
			return s;
		}
		case 'bid2': {
			if (action.type === 'pass') {
				if (mustCall(s)) return state;
				s.passes++;
				if (s.passes === 4) {
					s.thrownIn = true;
					const next = dealEuchre(s, random);
					next.thrownIn = true;
					return next;
				}
				s.turn = (seat + 1) % 4;
				return s;
			}
			if (action.type !== 'call' || action.suit === suitOf(s.upcard)) return state;
			s.trump = action.suit;
			s.maker = seat;
			s.alone = action.alone;
			afterTrumpMade(s);
			return s;
		}
		case 'discard': {
			if (action.type !== 'discard' || !s.hands[seat].includes(action.card)) return state;
			s.hands[seat] = s.hands[seat].filter((c) => c !== action.card);
			s.kitty = [action.card, ...s.kitty];
			afterTrumpMade(s);
			return s;
		}
		case 'defend': {
			if (action.type !== 'defend') return state;
			if (action.alone) {
				s.defender = seat;
				startPlay(s);
				return s;
			}
			s.defendAsked++;
			if (s.defendAsked >= 2) {
				startPlay(s);
				return s;
			}
			s.turn = partnerOf(seat);
			return s;
		}
		case 'play': {
			if (action.type !== 'play' || !legalEuchre(s, seat).includes(action.card)) return state;
			const led = ledSuitE(s) ?? effSuit(action.card, s.trump);
			s.hands[seat] = s.hands[seat].filter((c) => c !== action.card);
			s.trick[seat] = action.card;
			s.played.push({ seat, card: action.card, led, trick: s.trickNo });
			const playing = [0, 1, 2, 3].filter((i) => !sitsOut(s, i)).length;
			if (s.trick.filter((c) => c !== null).length === playing) {
				s.lastWinner = trickWinnerE(s);
				s.phase = 'trick';
			} else s.turn = nextSeat(s, seat);
			return s;
		}
		case 'trick': {
			if (action.type !== 'next') return state;
			const w = s.lastWinner!;
			s.tricks[w]++;
			s.trick = [null, null, null, null];
			s.trickNo++;
			if (s.trickNo === 5) {
				score(s);
				return s;
			}
			s.leader = w;
			s.turn = w;
			s.phase = 'play';
			return s;
		}
		case 'handOver': {
			if (action.type !== 'next') return state;
			if (s.winner !== null) {
				s.phase = 'over';
				return s;
			}
			return dealEuchre(s, random);
		}
	}
	return state;
}

export function validEuchre(s: EuchreState): boolean {
	const seen = new Set<Card>();
	const trickCards = s.trick.filter((c): c is Card => c !== null);
	const all = [...s.hands.flat(), ...s.kitty, ...trickCards, ...s.played.filter((p) => !trickCards.includes(p.card)).map((p) => p.card)];
	for (const c of all) {
		if (!Number.isInteger(c) || c < 0 || c > 51 || seen.has(c)) return false;
		seen.add(c);
	}
	return s.phase === 'over' || seen.size === 24;
}
