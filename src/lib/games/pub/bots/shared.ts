import { shuffle, type Card, type Suit } from '../../kit/cards/deck';
import type { Difficulty } from '../types';

export const pick = <T>(items: T[], random: () => number) => items[Math.floor(random() * items.length)];

export function bestBy<T>(items: T[], score: (item: T) => number): T {
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
export function humanish<T>(items: T[], score: (item: T) => number, difficulty: Difficulty, random: () => number): T {
	const ranked = items.map((item) => ({ item, v: score(item) })).sort((a, b) => b.v - a.v);
	const slip = difficulty === 'easy' ? 0.45 : difficulty === 'medium' ? 0.12 : 0;
	if (ranked.length > 1 && random() < slip) return ranked[1 + Math.floor(random() * Math.min(ranked.length - 1, difficulty === 'easy' ? 4 : 2))].item;
	return ranked[0].item;
}

export type Holder = { seat: number; need: number; voids: Set<Suit>; known: Card[] };

/** Deal unseen cards to the other players, respecting the suits they've shown out of. */
export function dealUnknown(unknown: Card[], holders: Holder[], random: () => number, suitOfCard: (c: Card) => Suit): Map<number, Card[]> | null {
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
