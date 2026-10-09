import { SUIT_NAME, SUIT_SINGULAR, label, type Card, type Suit } from '../../kit/cards/deck';

export function list(items: string[]) {
	if (items.length <= 1) return items.join('');
	return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export const cards = (cs: Card[]) => list(cs.map(label));

const NUMBER = ['no', 'one', 'two', 'three', 'four', 'five', 'six'];
export const say = (n: number) => NUMBER[n] ?? `${n}`;

export const plural = (n: number, word: string, many = `${word}s`) => `${n === 0 ? 'no' : n} ${n === 1 ? word : many}`;

/** Plural with small numbers spelled out: "two trumps", "one ace". */
export const counted = (n: number, word: string, many = `${word}s`) => `${say(n)} ${n === 1 ? word : many}`;

export const suitName = (s: Suit) => SUIT_NAME[s];
export const suitOne = (s: Suit) => SUIT_SINGULAR[s];
