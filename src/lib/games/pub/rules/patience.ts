import { isRed, rankOf, type Card } from '../../kit/cards/deck';

/** Patience ranks: ace 0 up to king 12. */
export const lowRank = (c: Card) => (rankOf(c) === 12 ? 0 : rankOf(c) + 1);
export const KING_LOW = 12;

/** Can `c` sit on `under` in a tableau built down in alternating colours. */
export const stacksAlt = (c: Card, under: Card) => lowRank(c) === lowRank(under) - 1 && isRed(c) !== isRed(under);

export const UNDO_LIMIT = 80;

export function pushPast<T>(past: T[], snap: T): T[] {
	const next = [...past, snap];
	return next.length > UNDO_LIMIT ? next.slice(next.length - UNDO_LIMIT) : next;
}

/** Parse a pile id: `t3` tableau, `f1` foundation, `c0` cell, `waste`. */
export function pileOf(id: string): { kind: 't' | 'f' | 'c' | 'waste'; i: number } {
	if (id === 'waste') return { kind: 'waste', i: 0 };
	return { kind: id[0] as 't' | 'f' | 'c', i: Number(id.slice(1)) };
}
