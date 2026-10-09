import type { Card } from '../../kit/cards/deck';
import type { PromptButton, TableKit } from './types';

const EDGE = 16;

/** Centres of `n` evenly spaced columns across the felt. */
export function columnsX(k: TableKit, n: number) {
	const gap = Math.max(4, (k.w - n * k.cw) / (n + 1));
	const span = n * k.cw + (n - 1) * gap;
	const x0 = (k.w - span) / 2 + k.cw / 2;
	return Array.from({ length: n }, (_, i) => x0 + i * (k.cw + gap));
}

export const topRowY = (k: TableKit) => EDGE + k.ch / 2;
export const tableauY = (k: TableKit) => topRowY(k) + k.ch * 1.18;

/** Lay a column top-down, squeezing the spacing so it never runs off the bottom. Returns where the next card would go. */
export function layColumn(k: TableKit, cards: Card[], down: number, x: number, y: number, z: number, look: (c: Card, i: number) => { live?: boolean; glow?: string | null; raised?: boolean }) {
	const dd = k.ch * 0.11;
	const du = k.ch * 0.27;
	const up = cards.length - down;
	const want = down * dd + Math.max(0, up - 1) * du;
	const room = k.h - EDGE - k.ch / 2 - y;
	const squeeze = want > room && want > 0 ? room / want : 1;
	let at = y;
	cards.forEach((c, i) => {
		const face = i >= down;
		k.put(c, { x, y: at, rot: 0, face, z: z + i, ...look(c, i) });
		at += (face ? du : dd) * squeeze;
	});
	return at;
}

/** The card's look: live if tappable, raised if picked, teal if Rosie suggests it. */
export function cardLook(k: TableKit, c: Card) {
	const live = k.input.myTurn && k.input.playable.includes(c);
	return { live, raised: k.input.selected.includes(c), glow: live && k.input.suggested.includes(c) ? k.colours.teal : null };
}

export function patienceButtons(undo: boolean, extra: PromptButton[] = []): PromptButton[] {
	return [...extra, { id: 'undo', label: 'Undo', look: 'soft', do: { type: 'undo' }, disabled: !undo }, { id: 'resign', label: 'Give up', look: 'soft', do: { type: 'resign' } }];
}
