import { isRed, type Card } from '../../kit/cards/deck';
import { canAuto, canDrawK, locate, movesK, type KlondikeAction, type KlondikeState } from '../rules/klondike';
import { lowRank, pileOf } from '../rules/patience';
import type { Difficulty } from '../types';
import { bestBy, pick } from './shared';

export type KHint =
	| { kind: 'auto' }
	| { kind: 'draw' }
	| { kind: 'recycle' }
	| { kind: 'stuck' }
	| { kind: 'safe' | 'reveal' | 'king' | 'waste' | 'foundation'; card: Card; to: string; from: string; reveals: boolean };

/** A foundation move nothing in the tableau could still want: both other-colour cards one lower are home. */
export function safeHome(s: KlondikeState, c: Card) {
	const r = lowRank(c);
	if (r <= 1) return true;
	const others = [0, 1, 2, 3].filter((f) => isRed(f * 13) !== isRed(c));
	return others.every((f) => s.foundations[f].length >= r);
}

/** Draws that would just go round the same cards again. */
function drawingIsStale(s: KlondikeState) {
	const cycle = Math.ceil((s.stock.length + s.waste.length) / s.draw) + 1;
	return s.idle > cycle;
}

/** Rosie's hint: only moves that make progress, so following it can never loop. */
export function klondikeHint(s: KlondikeState): KHint {
	if (canAuto(s)) return { kind: 'auto' };
	const moves = movesK(s)
		.filter((m) => !m.from.startsWith('f'))
		.map((m) => {
			const src = pileOf(m.from);
			const at = src.kind === 't' ? locate(s, m.card)!.index : -1;
			const reveals = src.kind === 't' && at > 0 && at === s.down[src.i];
			return { ...m, reveals, downs: src.kind === 't' ? s.down[src.i] : 0 };
		});
	const home = moves.filter((m) => m.to.startsWith('f'));
	const safe = home.filter((m) => safeHome(s, m.card));
	if (safe.length) {
		const m = bestBy(safe, (x) => (x.reveals ? 10 + x.downs : 0) - lowRank(x.card) * 0.1);
		return { kind: 'safe', card: m.card, to: m.to, from: m.from, reveals: m.reveals };
	}
	const reveal = moves.filter((m) => m.reveals);
	if (reveal.length) {
		const m = bestBy(reveal, (x) => x.downs * 2 + (x.to.startsWith('f') ? 1 : 0) + (x.to.startsWith('t') && s.tableau[pileOf(x.to).i].length ? 0.5 : 0));
		return { kind: 'reveal', card: m.card, to: m.to, from: m.from, reveals: true };
	}
	const waste = moves.filter((m) => m.from === 'waste' && m.to.startsWith('t'));
	if (waste.length) {
		const m = bestBy(waste, (x) => (s.tableau[pileOf(x.to).i].length ? 1 : 0));
		return { kind: lowRank(m.card) === 12 ? 'king' : 'waste', card: m.card, to: m.to, from: m.from, reveals: false };
	}
	if (home.length) {
		const m = home[0];
		return { kind: 'foundation', card: m.card, to: m.to, from: m.from, reveals: false };
	}
	if (canDrawK(s) && !drawingIsStale(s)) return { kind: s.stock.length ? 'draw' : 'recycle' };
	return { kind: 'stuck' };
}

export function hintAction(h: KHint): KlondikeAction {
	if (h.kind === 'auto') return { type: 'auto' };
	if (h.kind === 'draw' || h.kind === 'recycle') return { type: 'draw' };
	if (h.kind === 'stuck') return { type: 'resign' };
	return { type: 'move', card: h.card, to: h.to };
}

export function klondikeAi(s: KlondikeState, _seat: number, difficulty: Difficulty, random: () => number): KlondikeAction {
	const h = klondikeHint(s);
	if (difficulty === 'easy' && h.kind !== 'stuck' && h.kind !== 'auto' && random() < 0.3) {
		const home = movesK(s).filter((m) => m.to.startsWith('f'));
		if (home.length) {
			const m = pick(home, random);
			return { type: 'move', card: m.card, to: m.to };
		}
	}
	return hintAction(h);
}
