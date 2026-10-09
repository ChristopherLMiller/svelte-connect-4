import { fullDeck, lowRank, pipValue, shuffle, suitOf, type Card } from '../../kit/cards/deck';

export type GinPhase = 'firstUp' | 'draw' | 'discard' | 'handOver' | 'over';

export type Melding = { melds: Card[][]; deadwood: Card[]; points: number };

export type GinResult = {
	kind: 'knock' | 'gin' | 'bigGin' | 'undercut' | 'void';
	knocker: number | null;
	winner: number | null;
	points: number;
	knockerMeld: Melding | null;
	defenderMeld: Melding | null;
	layoffs: Card[];
	/** Knocker's melds after the defender's layoffs, for the table. */
	extended: Card[][];
};

export type GinState = {
	kind: 'gin';
	target: number;
	scores: [number, number];
	/** Hands won, for the 25-point line bonus at the end. */
	boxes: [number, number];
	dealer: 0 | 1;
	handNo: number;
	phase: GinPhase;
	hands: [Card[], Card[]];
	stock: Card[];
	/** Top card is last. */
	discard: Card[];
	turn: number;
	/** The first upcard: 0 nobody passed yet, 1 pone passed, 2 dealer passed too. */
	firstPasses: number;
	/** A card just taken from the discard pile can't be thrown straight back. */
	tookUp: Card | null;
	/** Cards each seat has taken from the discard pile (public). */
	pickups: [Card[], Card[]];
	/** Cards each seat has thrown (public). */
	throws: [Card[], Card[]];
	result: GinResult | null;
	winner: number | null;
	/** Final bonuses once the game is decided. */
	final: { game: number; boxes: [number, number]; shutout: boolean; totals: [number, number] } | null;
	/** Each hand's outcome, for the chalk sheet. */
	history: Array<{ winner: number | null; points: number; kind: GinResult['kind'] }>;
};

export type GinAction =
	| { type: 'take' }
	| { type: 'pass' }
	| { type: 'draw' }
	| { type: 'discard'; card: Card }
	| { type: 'knock'; card: Card }
	| { type: 'bigGin' }
	| { type: 'next' };

const other = (seat: number) => 1 - seat;

/** Every possible meld (sets of 3–4, runs of 3+ in a suit, ace low) inside a hand. */
export function allMelds(cards: Card[]): Card[][] {
	const melds: Card[][] = [];
	const byRank = new Map<number, Card[]>();
	for (const c of cards) {
		const r = lowRank(c);
		byRank.set(r, [...(byRank.get(r) ?? []), c]);
	}
	for (const group of byRank.values()) {
		if (group.length >= 3) {
			if (group.length === 4) {
				melds.push(group.slice());
				for (let skip = 0; skip < 4; skip++) melds.push(group.filter((_, i) => i !== skip));
			} else melds.push(group.slice());
		}
	}
	for (let suit = 0; suit < 4; suit++) {
		const ranks = new Map<number, Card>();
		for (const c of cards) if (suitOf(c) === suit) ranks.set(lowRank(c), c);
		for (let start = 1; start <= 11; start++) {
			const run: Card[] = [];
			for (let r = start; r <= 13 && ranks.has(r); r++) {
				run.push(ranks.get(r)!);
				if (run.length >= 3) melds.push(run.slice());
			}
		}
	}
	return melds;
}

/** The arrangement of melds that leaves the least deadwood. */
export function bestMelding(cards: Card[]): Melding {
	const melds = allMelds(cards);
	const index = new Map(cards.map((c, i) => [c, i]));
	const masks = melds.map((m) => m.reduce((mask, c) => mask | (1 << index.get(c)!), 0));
	const values = cards.map(pipValue);
	const full = cards.reduce((t, c) => t + pipValue(c), 0);
	let best = { used: [] as number[], saved: 0 };
	const walk = (from: number, taken: number, used: number[], saved: number) => {
		if (saved > best.saved) best = { used: used.slice(), saved };
		for (let i = from; i < melds.length; i++) {
			if (masks[i] & taken) continue;
			let gain = 0;
			for (let b = 0; b < cards.length; b++) if (masks[i] & (1 << b)) gain += values[b];
			used.push(i);
			walk(i + 1, taken | masks[i], used, saved + gain);
			used.pop();
		}
	};
	walk(0, 0, [], 0);
	const chosen = best.used.map((i) => melds[i]);
	const inMeld = new Set(chosen.flat());
	const deadwood = cards.filter((c) => !inMeld.has(c));
	return { melds: chosen, deadwood, points: full - best.saved };
}

export const deadwoodOf = (cards: Card[]) => bestMelding(cards).points;

function fits(meld: Card[], c: Card) {
	const ranks = meld.map(lowRank);
	const isSet = ranks.every((r) => r === ranks[0]);
	if (isSet) return meld.length < 4 && lowRank(c) === ranks[0];
	if (suitOf(c) !== suitOf(meld[0])) return false;
	const lo = Math.min(...ranks);
	const hi = Math.max(...ranks);
	return lowRank(c) === lo - 1 || lowRank(c) === hi + 1;
}

/** The defender's best melds plus every card they can lay off onto the knocker's melds. */
export function defend(cards: Card[], knockerMelds: Card[][]): { melding: Melding; layoffs: Card[]; extended: Card[][] } {
	const melds = allMelds(cards);
	let best: { melding: Melding; layoffs: Card[]; extended: Card[][] } | null = null;
	const consider = (chosen: Card[][]) => {
		const used = new Set(chosen.flat());
		let loose = cards.filter((c) => !used.has(c));
		const extended = knockerMelds.map((m) => m.slice());
		const layoffs: Card[] = [];
		let changed = true;
		while (changed) {
			changed = false;
			for (const c of loose) {
				const target = extended.find((m) => fits(m, c));
				if (target) {
					target.push(c);
					target.sort((a, b) => lowRank(a) - lowRank(b));
					layoffs.push(c);
					loose = loose.filter((x) => x !== c);
					changed = true;
					break;
				}
			}
		}
		const points = loose.reduce((t, c) => t + pipValue(c), 0);
		if (!best || points < best.melding.points) best = { melding: { melds: chosen.slice(), deadwood: loose, points }, layoffs, extended };
	};
	const walk = (from: number, taken: Set<Card>, chosen: Card[][]) => {
		consider(chosen);
		for (let i = from; i < melds.length; i++) {
			if (melds[i].some((c) => taken.has(c))) continue;
			const next = new Set(taken);
			for (const c of melds[i]) next.add(c);
			chosen.push(melds[i]);
			walk(i + 1, next, chosen);
			chosen.pop();
		}
	};
	walk(0, new Set(), []);
	return best!;
}

export function newGin(target = 100, dealer: 0 | 1 = Math.random() < 0.5 ? 0 : 1): GinState {
	return {
		kind: 'gin',
		target,
		scores: [0, 0],
		boxes: [0, 0],
		dealer,
		handNo: 0,
		phase: 'over',
		hands: [[], []],
		stock: fullDeck(),
		discard: [],
		turn: other(dealer),
		firstPasses: 0,
		tookUp: null,
		pickups: [[], []],
		throws: [[], []],
		result: null,
		winner: null,
		final: null,
		history: []
	};
}

export function dealGin(s: GinState, random: () => number, sameDealer = false, first = false): GinState {
	const dealer = (first || sameDealer ? s.dealer : other(s.dealer)) as 0 | 1;
	const deck = shuffle(fullDeck(), random);
	const pone = other(dealer);
	const hands: [Card[], Card[]] = [[], []];
	for (let i = 0; i < 20; i++) hands[i % 2 === 0 ? pone : dealer].push(deck[i]);
	return {
		...s,
		dealer,
		handNo: s.handNo + 1,
		phase: 'firstUp',
		hands,
		discard: [deck[20]],
		stock: deck.slice(21),
		turn: pone,
		firstPasses: 0,
		tookUp: null,
		pickups: [[], []],
		throws: [[], []],
		result: null
	};
}

export function ginActor(s: GinState): number | null {
	return s.phase === 'firstUp' || s.phase === 'draw' || s.phase === 'discard' ? s.turn : null;
}

/** Can the seat knock by throwing this card? */
export function canKnockWith(s: GinState, card: Card) {
	if (s.phase !== 'discard' || card === s.tookUp) return false;
	const rest = s.hands[s.turn].filter((c) => c !== card);
	return deadwoodOf(rest) <= 10;
}

export function canBigGin(s: GinState) {
	return s.phase === 'discard' && s.hands[s.turn].length === 11 && deadwoodOf(s.hands[s.turn]) === 0;
}

function settle(s: GinState, knocker: number, hand: Card[], big: boolean) {
	const defender = other(knocker);
	const km = bestMelding(hand);
	const gin = km.points === 0;
	let result: GinResult;
	if (gin) {
		const dm = bestMelding(s.hands[defender]);
		const points = (big ? 31 : 25) + dm.points;
		result = { kind: big ? 'bigGin' : 'gin', knocker, winner: knocker, points, knockerMeld: km, defenderMeld: dm, layoffs: [], extended: km.melds };
	} else {
		const d = defend(s.hands[defender], km.melds);
		if (d.melding.points <= km.points) {
			const points = km.points - d.melding.points + 25;
			result = { kind: 'undercut', knocker, winner: defender, points, knockerMeld: km, defenderMeld: d.melding, layoffs: d.layoffs, extended: d.extended };
		} else {
			const points = d.melding.points - km.points;
			result = { kind: 'knock', knocker, winner: knocker, points, knockerMeld: km, defenderMeld: d.melding, layoffs: d.layoffs, extended: d.extended };
		}
	}
	s.result = result;
	s.history = [...(s.history ?? []), { winner: result.winner, points: result.points, kind: result.kind }];
	s.scores[result.winner!] += result.points;
	s.boxes[result.winner!]++;
	s.phase = 'handOver';
	if (s.scores[result.winner!] >= s.target) {
		const w = result.winner!;
		const shutout = s.boxes[other(w)] === 0;
		const game = shutout ? 200 : 100;
		const boxes: [number, number] = [s.boxes[0] * 25, s.boxes[1] * 25];
		const totals: [number, number] = [s.scores[0] + boxes[0] + (w === 0 ? game : 0), s.scores[1] + boxes[1] + (w === 1 ? game : 0)];
		s.final = { game, boxes, shutout, totals };
		s.winner = w;
	}
}

export function applyGin(state: GinState, action: GinAction, random: () => number = Math.random): GinState {
	const s: GinState = structuredClone(state);
	const seat = s.turn;
	if (s.phase === 'firstUp') {
		if (action.type === 'take') {
			const c = s.discard.pop()!;
			s.hands[seat].push(c);
			s.pickups[seat].push(c);
			s.tookUp = c;
			s.phase = 'discard';
			return s;
		}
		if (action.type === 'pass') {
			s.firstPasses++;
			if (s.firstPasses === 1) s.turn = s.dealer;
			else {
				s.turn = other(s.dealer);
				s.phase = 'draw';
			}
			return s;
		}
		if (action.type === 'draw' && s.firstPasses === 2) s.phase = 'draw';
		else return state;
	}
	if (s.phase === 'draw') {
		if (action.type === 'draw' && s.stock.length) {
			s.hands[seat].push(s.stock.pop()!);
			s.tookUp = null;
			s.phase = 'discard';
			return s;
		}
		if (action.type === 'take' && s.discard.length) {
			const c = s.discard.pop()!;
			s.hands[seat].push(c);
			s.pickups[seat].push(c);
			s.tookUp = c;
			s.phase = 'discard';
			return s;
		}
		return state;
	}
	if (s.phase === 'discard') {
		if (action.type === 'bigGin' && canBigGin(s)) {
			settle(s, seat, s.hands[seat], true);
			return s;
		}
		if ((action.type === 'discard' || action.type === 'knock') && s.hands[seat].includes(action.card) && action.card !== s.tookUp) {
			if (action.type === 'knock' && !canKnockWith(s, action.card)) return state;
			s.hands[seat] = s.hands[seat].filter((c) => c !== action.card);
			s.discard.push(action.card);
			s.throws[seat].push(action.card);
			s.tookUp = null;
			if (action.type === 'knock') {
				settle(s, seat, s.hands[seat], false);
				return s;
			}
			if (s.stock.length <= 2) {
				s.result = { kind: 'void', knocker: null, winner: null, points: 0, knockerMeld: null, defenderMeld: null, layoffs: [], extended: [] };
				s.history = [...(s.history ?? []), { winner: null, points: 0, kind: 'void' }];
				s.phase = 'handOver';
				return s;
			}
			s.turn = other(seat);
			s.phase = 'draw';
			return s;
		}
		return state;
	}
	if (s.phase === 'handOver' && action.type === 'next') {
		if (s.winner !== null) {
			s.phase = 'over';
			return s;
		}
		return dealGin(s, random, s.result?.kind === 'void');
	}
	return state;
}

export function validGin(s: GinState): boolean {
	const seen = new Set<Card>();
	for (const c of [...s.hands[0], ...s.hands[1], ...s.stock, ...s.discard]) {
		if (!Number.isInteger(c) || c < 0 || c > 51 || seen.has(c)) return false;
		seen.add(c);
	}
	return seen.size === 52;
}
