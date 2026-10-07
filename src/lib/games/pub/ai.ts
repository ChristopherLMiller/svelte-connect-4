import { ACE, KING, NINE, QUEEN, SPADES, HEARTS, euchreDeck, fullDeck, pipValue, rankOf, seededRandom, shuffle, suitOf, type Card, type Suit } from '../kit/cards/deck';
import { legalPegs, pegPoints, scoreHand, total, type CribAction, type CribState } from './rules/cribbage';
import { QUEEN_OF_SPADES, applyHearts, ledSuit, legalHearts, passDir, passTarget, pointsOf, type HeartsAction, type HeartsState } from './rules/hearts';
import { bestMelding, canBigGin, canKnockWith, deadwoodOf, type GinAction, type GinState } from './rules/gin';
import {
	applyEuchre,
	effSuit,
	isLeft,
	isRight,
	ledSuitE,
	legalEuchre,
	mayGoAlone,
	mustCall,
	partnerOf,
	power,
	sitsOut,
	teamOf,
	trickWinnerE,
	type EuchreAction,
	type EuchreState
} from './rules/euchre';
import type { Difficulty } from './types';

export type PubState = CribState | HeartsState | GinState | EuchreState;
export type PubAction = CribAction | HeartsAction | GinAction | EuchreAction;

export type AiRequest = { state: PubState; seat: number; difficulty: Difficulty; seed: number };

const pick = <T>(items: T[], random: () => number) => items[Math.floor(random() * items.length)];

function bestBy<T>(items: T[], score: (item: T) => number): T {
	let best = items[0];
	let bestScore = -Infinity;
	for (const item of items) {
		const v = score(item);
		if (v > bestScore) {
			bestScore = v;
			best = item;
		}
	}
	return best;
}

/** Sometimes a weaker player grabs a near-best option instead of the best. */
function humanish<T>(items: T[], score: (item: T) => number, difficulty: Difficulty, random: () => number): T {
	const ranked = items.map((item) => ({ item, v: score(item) })).sort((a, b) => b.v - a.v);
	const slip = difficulty === 'easy' ? 0.45 : difficulty === 'medium' ? 0.12 : 0;
	if (ranked.length > 1 && random() < slip) return ranked[1 + Math.floor(random() * Math.min(ranked.length - 1, difficulty === 'easy' ? 4 : 2))].item;
	return ranked[0].item;
}

/* ───────────── Cribbage ───────────── */

function cribGuess(thrown: Card[]) {
	const [a, b] = thrown;
	let v = 4;
	if (pipValue(a) + pipValue(b) === 15) v += 2;
	if (rankOf(a) === rankOf(b)) v += 2;
	const gap = Math.abs(((rankOf(a) + 1) % 13) - ((rankOf(b) + 1) % 13));
	if (gap === 1) v += 1;
	else if (gap === 2) v += 0.5;
	for (const c of thrown) if (pipValue(c) === 5) v += 1.5;
	if (suitOf(a) === suitOf(b)) v += 0.3;
	return v;
}

function cribDiscard(s: CribState, seat: number, difficulty: Difficulty, random: () => number): Card[] {
	const hand = s.hands[seat];
	const unseen = fullDeck().filter((c) => !hand.includes(c));
	const mine = seat === s.dealer;
	const cribWeight = difficulty === 'hard' ? 1 : difficulty === 'medium' ? 0.5 : 0;
	const options: Card[][] = [];
	for (let i = 0; i < hand.length; i++) for (let j = i + 1; j < hand.length; j++) options.push([hand[i], hand[j]]);
	return humanish(
		options,
		(thrown) => {
			const keep = hand.filter((c) => !thrown.includes(c));
			let sum = 0;
			for (const starter of unseen) sum += total(scoreHand(keep, starter, false));
			return sum / unseen.length + (mine ? 1 : -1) * cribGuess(thrown) * cribWeight;
		},
		difficulty,
		random
	);
}

function cribPeg(s: CribState, seat: number, difficulty: Difficulty, random: () => number): Card {
	const legal = legalPegs(s);
	if (difficulty === 'easy' && random() < 0.4) return pick(legal, random);
	const pile = s.pile.map((p) => p.card);
	const riskWeight = difficulty === 'hard' ? 1 : 0.5;
	return bestBy(legal, (c) => {
		const count = s.count + pipValue(c);
		let v = pegPoints([...pile, c], count).points * 3;
		let risk = 0;
		if (count === 5 || count === 21) risk += 1.6;
		if (count >= 11 && count <= 14) risk += 0.5;
		if (count >= 22 && count <= 30) risk -= 0.3;
		if (s.count === 0 && pipValue(c) === 5) risk += 1;
		if (s.count === 0 && pipValue(c) < 5) risk -= 0.4;
		if (s.hands[seat].filter((x) => rankOf(x) === rankOf(c)).length === 1) risk += 0.2;
		v -= risk * riskWeight;
		v += pipValue(c) * 0.02 * (difficulty === 'hard' ? 1 : 0);
		return v;
	});
}

function cribAi(s: CribState, seat: number, difficulty: Difficulty, random: () => number): CribAction {
	if (s.phase === 'discard') return { type: 'discard', seat, cards: cribDiscard(s, seat, difficulty, random) };
	if (s.phase === 'cut') return { type: 'cut' };
	return { type: 'play', card: cribPeg(s, seat, difficulty, random) };
}

/* ───────────── Shared: sampling hidden hands ───────────── */

type Holder = { seat: number; need: number; voids: Set<Suit>; known: Card[] };

function deal(unknown: Card[], holders: Holder[], random: () => number, suitOfCard: (c: Card) => Suit): Map<number, Card[]> | null {
	for (let attempt = 0; attempt < 30; attempt++) {
		const cards = shuffle(unknown, random);
		const out = new Map<number, Card[]>(holders.map((h) => [h.seat, h.known.slice()]));
		const room = new Map(holders.map((h) => [h.seat, h.need - h.known.length]));
		let ok = true;
		const strict = attempt < 24;
		for (const c of cards) {
			const options = holders.filter((h) => room.get(h.seat)! > 0 && (!strict || !h.voids.has(suitOfCard(c))));
			if (!options.length) {
				ok = false;
				break;
			}
			const tight = options.filter((h) => h.voids.size > 0);
			const h = pick(tight.length && random() < 0.5 ? tight : options, random);
			out.get(h.seat)!.push(c);
			room.set(h.seat, room.get(h.seat)! - 1);
		}
		if (ok) return out;
	}
	return null;
}

/* ───────────── Hearts ───────────── */

function heartsPass(s: HeartsState, seat: number, difficulty: Difficulty): Card[] {
	const hand = s.hands[seat];
	if (difficulty === 'easy') return hand.slice().sort((a, b) => rankOf(b) - rankOf(a)).slice(0, 3);
	const spades = hand.filter((c) => suitOf(c) === SPADES);
	const lowSpades = spades.filter((c) => rankOf(c) < QUEEN).length;
	const keepQueen = difficulty === 'hard' && lowSpades >= 4;
	const danger = (c: Card) => {
		const suit = suitOf(c);
		const r = rankOf(c);
		const count = hand.filter((x) => suitOf(x) === suit).length;
		let v = r;
		if (c === QUEEN_OF_SPADES) v += keepQueen ? -20 : 30;
		if (suit === SPADES && (r === ACE || r === KING) && !keepQueen) v += lowSpades >= 4 ? 2 : 20;
		if (suit === SPADES && r < QUEEN) v -= 8;
		if (suit === HEARTS) v += 3;
		if (difficulty === 'hard' && count <= 2 && suit !== SPADES) v += 6 - count * 2;
		return v;
	};
	return hand
		.slice()
		.sort((a, b) => danger(b) - danger(a))
		.slice(0, 3);
}

function heartsHeuristic(s: HeartsState, seat: number, legal: Card[]): Card {
	const led = ledSuit(s);
	const queenOut = !s.played.some((p) => p.card === QUEEN_OF_SPADES);
	if (legal.length === 1) return legal[0];
	if (led === null) {
		const hand = s.hands[seat];
		const holdsQueen = hand.includes(QUEEN_OF_SPADES);
		return bestBy(legal, (c) => {
			const suit = suitOf(c);
			const count = hand.filter((x) => suitOf(x) === suit).length;
			let v = -rankOf(c) - count * 0.6;
			if (suit === SPADES && queenOut && !holdsQueen && rankOf(c) < QUEEN) v += 6;
			if (suit === SPADES && rankOf(c) >= QUEEN) v -= 20;
			if (suit === HEARTS) v -= 4;
			return v;
		});
	}
	const inTrick = s.trick.filter((c): c is Card => c !== null);
	const high = Math.max(...inTrick.filter((c) => suitOf(c) === led).map(rankOf));
	const points = inTrick.reduce((t, c) => t + pointsOf(c), 0);
	const last = inTrick.length === 3;
	if (suitOf(legal[0]) === led && legal.every((c) => suitOf(c) === led)) {
		const under = legal.filter((c) => rankOf(c) < high);
		if (led === SPADES && legal.includes(QUEEN_OF_SPADES) && high > rankOf(QUEEN_OF_SPADES)) return QUEEN_OF_SPADES;
		if (under.length) return bestBy(under, (c) => (c === QUEEN_OF_SPADES ? -50 : rankOf(c)));
		if (last && points === 0) return bestBy(legal, (c) => (c === QUEEN_OF_SPADES ? -50 : rankOf(c)));
		return bestBy(legal, (c) => (c === QUEEN_OF_SPADES ? -50 : rankOf(c) * (led === SPADES ? -1 : 1)));
	}
	return bestBy(legal, (c) => {
		if (c === QUEEN_OF_SPADES) return 100;
		if (suitOf(c) === SPADES && rankOf(c) > QUEEN && queenOut) return 60 + rankOf(c);
		if (suitOf(c) === HEARTS) return 30 + rankOf(c);
		return rankOf(c);
	});
}

function heartsRollout(s: HeartsState, seat: number): number {
	let state = s;
	let guard = 0;
	while (state.phase !== 'handOver' && state.phase !== 'over' && guard++ < 80) {
		if (state.phase === 'trick') {
			state = applyHearts(state, { type: 'next' });
			continue;
		}
		const legal = legalHearts(state);
		state = applyHearts(state, { type: 'play', card: heartsHeuristic(state, state.turn, legal) });
	}
	const taking = state.taking;
	const moon = taking.findIndex((p) => p === 26);
	if (moon >= 0) return moon === seat ? -26 : 26;
	return taking[seat];
}

function heartsSample(s: HeartsState, seat: number, random: () => number): HeartsState | null {
	const voids = [0, 1, 2, 3].map(() => new Set<Suit>());
	for (const p of s.played) if (suitOf(p.card) !== p.led) voids[p.seat].add(p.led);
	const seen = new Set<Card>([...s.hands[seat], ...s.played.map((p) => p.card)]);
	const known = new Map<number, Card[]>();
	const dir = passDir(s.handNo);
	if (dir !== 3 && s.phase !== 'pass' && s.passing[seat]) {
		const to = passTarget(seat, dir);
		const still = s.passing[seat]!.filter((c) => !seen.has(c));
		known.set(to, still);
		for (const c of still) seen.add(c);
	}
	const unknown = fullDeck().filter((c) => !seen.has(c));
	const holders: Holder[] = [0, 1, 2, 3]
		.filter((i) => i !== seat)
		.map((i) => ({ seat: i, need: s.hands[i].length, voids: voids[i], known: known.get(i) ?? [] }));
	const hands = deal(unknown, holders, random, suitOf);
	if (!hands) return null;
	return { ...s, hands: s.hands.map((h, i) => (i === seat ? h.slice() : hands.get(i)!)) };
}

function heartsAi(s: HeartsState, seat: number, difficulty: Difficulty, random: () => number): HeartsAction {
	if (s.phase === 'pass') return { type: 'pass', seat, cards: heartsPass(s, seat, difficulty) };
	const legal = legalHearts(s, seat);
	if (legal.length === 1) return { type: 'play', card: legal[0] };
	if (difficulty === 'easy') {
		return { type: 'play', card: random() < 0.45 ? pick(legal, random) : heartsHeuristic(s, seat, legal) };
	}
	if (difficulty === 'medium') return { type: 'play', card: heartsHeuristic(s, seat, legal) };
	const totals = new Map<Card, number>(legal.map((c) => [c, 0]));
	const samples = 28;
	for (let k = 0; k < samples; k++) {
		const world = heartsSample(s, seat, random);
		if (!world) continue;
		for (const c of legal) {
			const next = applyHearts(world, { type: 'play', card: c });
			totals.set(c, totals.get(c)! + heartsRollout(next, seat));
		}
	}
	return { type: 'play', card: bestBy(legal, (c) => -totals.get(c)!) };
}

/* ───────────── Gin rummy ───────────── */

function bestDiscard(hand: Card[], banned: Card | null, danger: (c: Card) => number) {
	const options = hand.filter((c) => c !== banned);
	return bestBy(options, (c) => -deadwoodOf(hand.filter((x) => x !== c)) * 10 + pipValue(c) * 0.5 - danger(c));
}

function ginAi(s: GinState, seat: number, difficulty: Difficulty, random: () => number): GinAction {
	const hand = s.hands[seat];
	const opp = 1 - seat;
	const danger = (c: Card) => {
		if (difficulty !== 'hard') return 0;
		let d = 0;
		for (const p of s.pickups[opp]) {
			if (rankOf(p) === rankOf(c)) d += 4;
			if (suitOf(p) === suitOf(c) && Math.abs(rankOf(p) - rankOf(c)) <= 2) d += 3;
		}
		for (const t of s.throws[opp]) if (rankOf(t) === rankOf(c)) d -= 1.5;
		return d;
	};
	if (s.phase === 'firstUp' || s.phase === 'draw') {
		const up = s.discard[s.discard.length - 1];
		if (up === undefined) return { type: 'draw' };
		const withUp = [...hand, up];
		const melded = bestMelding(withUp).melds.some((m) => m.includes(up));
		const now = deadwoodOf(hand);
		const after = Math.min(...hand.map((d) => deadwoodOf(withUp.filter((x) => x !== d))));
		let take = melded || (difficulty === 'hard' && after <= now - 4 && pipValue(up) <= 4);
		if (difficulty === 'easy' && random() < 0.3) take = !take && pipValue(up) <= 5;
		if (s.phase === 'firstUp') return take ? { type: 'take' } : { type: 'pass' };
		return take ? { type: 'take' } : { type: 'draw' };
	}
	if (canBigGin(s)) return { type: 'bigGin' };
	let card = bestDiscard(hand, s.tookUp, danger);
	if (difficulty === 'easy' && random() < 0.35) {
		const loose = bestMelding(hand).deadwood.filter((c) => c !== s.tookUp);
		if (loose.length) card = pick(loose, random);
	}
	const rest = hand.filter((c) => c !== card);
	const dw = deadwoodOf(rest);
	if (canKnockWith(s, card)) {
		const limit = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 10 : s.stock.length > 18 ? 6 : 10;
		if (dw === 0 || dw <= limit) return { type: 'knock', card };
	}
	return { type: 'discard', card };
}

/* ───────────── Euchre ───────────── */

function cardValue(c: Card, trump: Suit) {
	if (isRight(c, trump)) return 3.2;
	if (isLeft(c, trump)) return 2.6;
	if (effSuit(c, trump) === trump) return [1.0, 1.1, 0, 1.4, 1.7, 2.1][rankOf(c) - NINE];
	if (rankOf(c) === ACE) return 1.1;
	if (rankOf(c) === KING) return 0.35;
	return 0;
}

export function strength(hand: Card[], trump: Suit) {
	let v = 0;
	let trumps = 0;
	for (const c of hand) {
		v += cardValue(c, trump);
		if (effSuit(c, trump) === trump) trumps++;
	}
	if (trumps >= 2) {
		for (let s = 0; s < 4; s++) {
			if (s !== trump && !hand.some((c) => effSuit(c, trump) === s)) v += 0.6;
		}
	}
	for (let s = 0; s < 4; s++) {
		if (s === trump) continue;
		const suit = hand.filter((c) => effSuit(c, trump) === s);
		if (suit.some((c) => rankOf(c) === KING) && suit.some((c) => rankOf(c) === ACE)) v += 0.4;
	}
	return v;
}

function bestFive(hand: Card[], trump: Suit) {
	const drop = bestBy(hand, (d) => strength(hand.filter((c) => c !== d), trump));
	return { hand: hand.filter((c) => c !== drop), drop };
}

function euchreHeuristic(s: EuchreState, seat: number, legal: Card[]): Card {
	if (legal.length === 1) return legal[0];
	const trump = s.trump!;
	const led = ledSuitE(s);
	const makers = teamOf(s.maker!) === teamOf(seat);
	if (led === null) {
		const right = legal.find((c) => isRight(c, trump));
		if (makers && right) return right;
		const trumps = legal.filter((c) => effSuit(c, trump) === trump);
		if (makers && seat === s.maker && trumps.length >= 2) return bestBy(trumps, (c) => power(c, trump, null));
		const offAces = legal.filter((c) => effSuit(c, trump) !== trump && rankOf(c) === ACE);
		if (offAces.length) return offAces[0];
		const off = legal.filter((c) => effSuit(c, trump) !== trump);
		if (off.length) return bestBy(off, (c) => -rankOf(c));
		return bestBy(legal, (c) => -power(c, trump, null));
	}
	const played = [0, 1, 2, 3].filter((i) => s.trick[i] !== null);
	const winner = trickWinnerE(s);
	const winPower = power(s.trick[winner]!, trump, led);
	const partnerWinning = winner === partnerOf(seat);
	const active = [0, 1, 2, 3].filter((i) => !sitsOut(s, i)).length;
	const last = played.length === active - 1;
	const cheapest = (cards: Card[]) => bestBy(cards, (c) => -power(c, trump, led));
	if (partnerWinning && (last || winPower >= 112 || winPower >= 62)) return cheapest(legal);
	const winners = legal.filter((c) => power(c, trump, led) > winPower);
	if (winners.length) return last ? cheapest(winners) : bestBy(winners, (c) => (effSuit(c, trump) === led ? power(c, trump, led) : -power(c, trump, led)));
	return cheapest(legal);
}

function euchreRollout(s: EuchreState, seat: number): number {
	let state = s;
	let guard = 0;
	while (state.phase === 'play' || state.phase === 'trick') {
		if (guard++ > 40) break;
		if (state.phase === 'trick') {
			const next = applyEuchre(state, { type: 'next' });
			if (next.phase === 'handOver') {
				const team = teamOf(seat);
				const mine = next.tricks.reduce((t, n, i) => t + (teamOf(i) === team ? n : 0), 0);
				return mine + (mine >= 3 ? 2 : 0) + (mine === 5 ? 1 : 0);
			}
			state = next;
			continue;
		}
		const legal = legalEuchre(state);
		state = applyEuchre(state, { type: 'play', card: euchreHeuristic(state, state.turn, legal) });
	}
	return 0;
}

function euchreSample(s: EuchreState, seat: number, random: () => number): EuchreState | null {
	const trump = s.trump;
	const voids = [0, 1, 2, 3].map(() => new Set<Suit>());
	for (const p of s.played) if (effSuit(p.card, trump) !== p.led) voids[p.seat].add(p.led);
	const seen = new Set<Card>([...s.hands[seat], ...s.played.map((p) => p.card)]);
	const known = new Map<number, Card[]>();
	const pickedUp = trump === suitOf(s.upcard);
	if (seat === s.dealer && pickedUp) seen.add(s.kitty[0]);
	else if (pickedUp && !seen.has(s.upcard) && !sitsOut(s, s.dealer)) {
		known.set(s.dealer, [s.upcard]);
		seen.add(s.upcard);
	} else if (!pickedUp) seen.add(s.upcard);
	const unknown = euchreDeck().filter((c) => !seen.has(c));
	const holders: Holder[] = [0, 1, 2, 3]
		.filter((i) => i !== seat && !sitsOut(s, i))
		.map((i) => ({ seat: i, need: s.hands[i].length, voids: voids[i], known: known.get(i) ?? [] }));
	const hidden = unknown.length - holders.reduce((t, h) => t + h.need - h.known.length, 0);
	if (hidden > 0) holders.push({ seat: 9, need: hidden, voids: new Set(), known: [] });
	const hands = deal(unknown, holders, random, (c) => effSuit(c, trump));
	if (!hands) return null;
	return { ...s, hands: s.hands.map((h, i) => (i === seat || sitsOut(s, i) ? h.slice() : hands.get(i)!)) };
}

function euchreAi(s: EuchreState, seat: number, difficulty: Difficulty, random: () => number): EuchreAction {
	const hand = s.hands[seat];
	const noise = difficulty === 'easy' ? (random() - 0.5) * 3 : difficulty === 'medium' ? (random() - 0.5) * 1 : 0;
	const threshold = (difficulty === 'hard' ? 6.7 : 7.2) + noise;
	const aloneAt = difficulty === 'easy' ? 14 : difficulty === 'medium' ? 12 : 11.2;
	switch (s.phase) {
		case 'farmer':
			return { type: 'farmer', swap: difficulty !== 'easy' || random() < 0.6 };
		case 'bid1': {
			const trump = suitOf(s.upcard);
			const up = cardValue(s.upcard, trump);
			let v: number;
			if (seat === s.dealer) v = strength(bestFive([...hand, s.upcard], trump).hand, trump);
			else v = strength(hand, trump) + (seat === partnerOf(s.dealer) ? up * 0.55 : -up * 0.55);
			if (v >= threshold) {
				const alone = v >= aloneAt && hand.some((c) => isRight(c, trump)) && mayGoAlone(s, seat);
				return { type: 'order', alone };
			}
			return { type: 'pass' };
		}
		case 'bid2': {
			const banned = suitOf(s.upcard);
			const suits = ([0, 1, 2, 3] as Suit[]).filter((x) => x !== banned);
			const suit = bestBy(suits, (x) => strength(hand, x));
			const v = strength(hand, suit);
			if (v >= threshold || mustCall(s)) {
				const alone = v >= aloneAt && hand.some((c) => isRight(c, suit));
				return { type: 'call', suit, alone };
			}
			return { type: 'pass' };
		}
		case 'discard':
			return { type: 'discard', card: bestFive(hand, s.trump!).drop };
		case 'defend': {
			const v = strength(hand, s.trump!);
			const bar = difficulty === 'hard' ? 9 : difficulty === 'medium' ? 10 : 99;
			return { type: 'defend', alone: v >= bar };
		}
		default: {
			const legal = legalEuchre(s, seat);
			if (legal.length === 1) return { type: 'play', card: legal[0] };
			if (difficulty === 'easy' && random() < 0.4) return { type: 'play', card: pick(legal, random) };
			if (difficulty !== 'hard') return { type: 'play', card: euchreHeuristic(s, seat, legal) };
			const totals = new Map<Card, number>(legal.map((c) => [c, 0]));
			for (let k = 0; k < 40; k++) {
				const world = euchreSample(s, seat, random);
				if (!world) continue;
				for (const c of legal) totals.set(c, totals.get(c)! + euchreRollout(applyEuchre(world, { type: 'play', card: c }), seat));
			}
			return { type: 'play', card: bestBy(legal, (c) => totals.get(c)!) };
		}
	}
}

export function chooseAction(request: AiRequest): PubAction {
	const random = seededRandom(request.seed);
	const { state, seat, difficulty } = request;
	switch (state.kind) {
		case 'cribbage':
			return cribAi(state, seat, difficulty, random);
		case 'hearts':
			return heartsAi(state, seat, difficulty, random);
		case 'gin':
			return ginAi(state, seat, difficulty, random);
		case 'euchre':
			return euchreAi(state, seat, difficulty, random);
	}
}