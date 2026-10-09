import type { Card } from '../../kit/cards/deck';
import { lowRank, pileOf } from '../rules/patience';
import { applySpider, canDealS, linked, suitedFrom, targetsS, type SpiderAction, type SpiderState } from '../rules/spider';
import type { Difficulty } from '../types';
import { bestBy } from './shared';

type Move = { card: Card; to: string; col: number; index: number };

export type SpiderHint =
	| { kind: 'deal' }
	| { kind: 'stuck' }
	| { kind: 'reveal' | 'link' | 'fill'; card: Card; to: string; col: number; index: number; empties: boolean };

export function movesS(s: SpiderState): Move[] {
	const out: Move[] = [];
	s.tableau.forEach((col, i) => {
		for (let at = s.down[i]; at < col.length; at++) {
			if (!suitedFrom(col, at)) continue;
			for (const to of targetsS(s, col[at])) out.push({ card: col[at], to, col: i, index: at });
		}
	});
	return out;
}

/** The run sits on a card of its own suit already, so moving it would break a link. */
const onOwnSuit = (s: SpiderState, m: Move) => m.index > s.down[m.col] && linked(s.tableau[m.col][m.index], s.tableau[m.col][m.index - 1]);
const reveals = (s: SpiderState, m: Move) => m.index > 0 && m.index === s.down[m.col];
const destTop = (s: SpiderState, to: string) => {
	const col = s.tableau[pileOf(to).i];
	return col[col.length - 1];
};

/** Length of the same-suit run the card would end up heading. */
function runAfter(s: SpiderState, m: Move) {
	const col = s.tableau[pileOf(m.to).i];
	let n = s.tableau[m.col].length - m.index;
	for (let i = col.length - 1; i >= 0; i--) {
		const above = i === col.length - 1 ? m.card : col[i + 1];
		if (!linked(above, col[i])) break;
		n++;
	}
	return n;
}

/** Rosie's hint: only moves that turn a card over, add a same-suit link or let the deal happen, so following it always ends. */
export function spiderHint(s: SpiderState): SpiderHint {
	const moves = movesS(s).filter((m) => !onOwnSuit(s, m));
	const hint = (kind: 'reveal' | 'link' | 'fill', m: Move): SpiderHint => ({ kind, card: m.card, to: m.to, col: m.col, index: m.index, empties: m.index === 0 });
	const reveal = moves.filter((m) => reveals(s, m));
	if (reveal.length) {
		const m = bestBy(reveal, (x) => {
			const top = destTop(s, x.to);
			return (top === undefined ? -20 : 0) + (top !== undefined && linked(x.card, top) ? 6 : 0) - s.down[x.col] + runAfter(s, x) * 0.1;
		});
		return hint('reveal', m);
	}
	const link = moves.filter((m) => {
		const top = destTop(s, m.to);
		return top !== undefined && linked(m.card, top);
	});
	if (link.length) return hint('link', bestBy(link, (x) => runAfter(s, x) + (x.index === 0 ? 3 : 0)));
	if (canDealS(s)) return { kind: 'deal' };
	if (s.stock.length) {
		const fill = moves.filter((m) => destTop(s, m.to) === undefined);
		if (fill.length) {
			return hint(
				'fill',
				bestBy(fill, (x) => {
					const next = applySpider(s, { type: 'move', card: x.card, to: x.to });
					const useful = movesS(next).filter((m) => {
						const top = destTop(next, m.to);
						return !onOwnSuit(next, m) && (reveals(next, m) || (top !== undefined && linked(m.card, top)));
					});
					return useful.length * 10 + lowRank(x.card);
				})
			);
		}
	}
	return { kind: 'stuck' };
}

export function spiderHintAction(h: SpiderHint): SpiderAction {
	if (h.kind === 'deal') return { type: 'deal' };
	if (h.kind === 'stuck') return { type: 'resign' };
	return { type: 'move', card: h.card, to: h.to };
}

export function spiderAi(s: SpiderState, _seat: number, _difficulty: Difficulty, _random: () => number): SpiderAction {
	return spiderHintAction(spiderHint(s));
}