import type { Card, Suit } from '../../kit/cards/deck';
import { SEAT_GLOW } from '../types';
import type { LedgerModel, PromptButton, TableKit, ViewCtx } from './types';

type TrickLike = { trick: Array<Card | null>; leader: number; phase: string; lastWinner: number | null };
type Played = { seat: number; card: Card; led: Suit; trick: number };

/** The cards of the trick in front of each player, the winner glowing once it's complete. */
export function layTrick(k: TableKit, s: TrickLike) {
	const n = s.trick.length;
	for (let i = 0; i < n; i++) {
		const seat = (s.leader + i) % n;
		const c = s.trick[seat];
		if (c === null) continue;
		const spot = k.trickSpot(k.input.place(seat));
		k.put(c, { ...spot, rot: spot.rot + k.jitter(c, 6), face: true, z: 200 + i, glow: s.phase === 'trick' && s.lastWinner === seat ? k.colours.gold : null });
	}
}

/** Finished tricks stacked face down by whoever won them. */
export function layWonTricks(k: TableKit, played: Played[], trickNo: number, power: (c: Card, led: Suit) => number) {
	const taken = new Map<number, Card[][]>();
	for (let t = 0; t < trickNo; t++) {
		const plays = played.filter((p) => p.trick === t);
		if (!plays.length) continue;
		const led = plays[0].led;
		const best = plays.reduce((a, b) => (power(b.card, led) > power(a.card, led) ? b : a));
		taken.set(best.seat, [...(taken.get(best.seat) ?? []), plays.map((p) => p.card)]);
	}
	for (const [seat, tricks] of taken) {
		const spot = k.pileSpot(k.input.place(seat));
		tricks.forEach((trick, t) =>
			trick.forEach((c, i) =>
				k.put(c, { x: spot.x + (t % 7) * k.cw * 0.14, y: spot.y + Math.floor(t / 7) * k.ch * 0.18 + i * 1.5, rot: t % 2 ? 90 : 0, face: false, z: 40 + t * 5 + i, scale: k.pileScale })
			)
		);
	}
}

export function numberButtons(options: number[], max: number, zeroLabel = '0'): PromptButton[] {
	return Array.from({ length: max + 1 }, (_, n) => ({
		id: `bid-${n}`,
		label: n === 0 ? zeroLabel : `${n}`,
		look: 'num' as const,
		do: { type: 'bid', bid: n },
		disabled: !options.includes(n)
	}));
}

/** A chalk table with one column per seat. */
export function seatTable(v: ViewCtx, history: number[][], totals: number[], best: 'high' | 'low', seats = totals.length): LedgerModel['table'] {
	const pick = best === 'high' ? Math.max(...totals) : Math.min(...totals);
	return {
		head: Array.from({ length: seats }, (_, seat) => ({ text: v.names[seat], seat })),
		rows: history.slice(-8).map((row) => row.map((p) => (p ? `${p}` : '–'))),
		foot: totals.map((t) => ({ text: `${t}`, best: history.length > 0 && t === pick })),
		empty: 'No hands yet'
	};
}

export const glowOf = (seat: number) => SEAT_GLOW[seat];

export const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;
