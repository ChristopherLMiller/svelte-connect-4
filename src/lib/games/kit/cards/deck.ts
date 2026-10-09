/**
 * A card is an integer 0..51: suit * 13 + rank, rank 0 = two … 12 = ace.
 * Suits alternate colour in sort order: clubs, diamonds, spades, hearts.
 * Games with several decks add 52 per extra copy, so the face is always `id % 52`.
 */
export type Card = number;
export type Suit = 0 | 1 | 2 | 3;

export const CLUBS: Suit = 0;
export const DIAMONDS: Suit = 1;
export const SPADES: Suit = 2;
export const HEARTS: Suit = 3;

export const SUITS: Suit[] = [0, 1, 2, 3];
export const SUIT_GLYPH = ['♣', '♦', '♠', '♥'] as const;
export const SUIT_NAME = ['clubs', 'diamonds', 'spades', 'hearts'] as const;
export const SUIT_SINGULAR = ['club', 'diamond', 'spade', 'heart'] as const;
export const RANK_LABEL = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;
export const RANK_NAME = ['two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'jack', 'queen', 'king', 'ace'] as const;

export const TWO = 0;
export const NINE = 7;
export const TEN = 8;
export const JACK = 9;
export const QUEEN = 10;
export const KING = 11;
export const ACE = 12;

export const card = (suit: Suit, rank: number): Card => suit * 13 + rank;
export const suitOf = (c: Card): Suit => Math.floor((c % 52) / 13) as Suit;
/** The same face in the first deck. */
export const faceOf = (c: Card): Card => c % 52;
export const rankOf = (c: Card) => c % 13;
export const isRed = (c: Card) => suitOf(c) === DIAMONDS || suitOf(c) === HEARTS;
export const sameColour = (a: Suit, b: Suit) => (a === DIAMONDS || a === HEARTS) === (b === DIAMONDS || b === HEARTS);
export const partnerSuit = (s: Suit): Suit => ((s + 2) % 4) as Suit;

/** Ace low, 1..13, for cribbage runs and gin melds. */
export const lowRank = (c: Card) => (rankOf(c) + 1) % 13 + 1;
/** Pip value with ace = 1 and faces = 10 (cribbage counting, gin deadwood). */
export const pipValue = (c: Card) => Math.min(10, lowRank(c));

export const label = (c: Card) => `${RANK_LABEL[rankOf(c)]}${SUIT_GLYPH[suitOf(c)]}`;
export const longName = (c: Card) => `${RANK_NAME[rankOf(c)]} of ${SUIT_NAME[suitOf(c)]}`;

export const fullDeck = (): Card[] => Array.from({ length: 52 }, (_, i) => i);
export const euchreDeck = (): Card[] => fullDeck().filter((c) => rankOf(c) >= NINE);

export function isCard(value: unknown): value is Card {
	return Number.isInteger(value) && (value as number) >= 0 && (value as number) < 52;
}

/** Small fast seeded generator (mulberry32) so deals can be replayed from a seed. */
export function seededRandom(seed: number) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export const newSeed = () => Math.floor(Math.random() * 2 ** 31);

export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
	const out = items.slice();
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

/** Hand order for display: by suit (alternating colours), then rank; `suitOrder` overrides suit rank. */
export function sortHand(cards: Card[], options: { aceLow?: boolean; suitOrder?: Suit[]; key?: (c: Card) => number } = {}) {
	const order = options.suitOrder ?? SUITS;
	const rank = options.key ?? ((c: Card) => (options.aceLow ? lowRank(c) : rankOf(c)));
	return cards.slice().sort((a, b) => order.indexOf(suitOf(a)) - order.indexOf(suitOf(b)) || rank(a) - rank(b));
}
