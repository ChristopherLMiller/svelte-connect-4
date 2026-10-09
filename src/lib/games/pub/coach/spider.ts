import { label, suitOf, SUIT_NAME, SUIT_SINGULAR } from '../../kit/cards/deck';
import { movesS, spiderHint, spiderHintAction } from '../bots/spider';
import { pileOf } from '../rules/patience';
import { linked, type SpiderAction, type SpiderState } from '../rules/spider';
import type { Advice } from './types';

export function spiderAdvice(s: SpiderState): Advice {
	const h = spiderHint(s);
	const action = spiderHintAction(h);
	if (h.kind === 'deal') return { action, cards: [], button: null, spot: 'deal', title: 'Deal a row', why: `Nothing on the table turns a card over or builds a same-suit run. Deal a new row: one card onto every column (${s.stock.length / 10} deal${s.stock.length === 10 ? '' : 's'} left).` };
	if (h.kind === 'stuck')
		return { action, cards: [], button: 'resign', spot: null, title: 'No way forward', why: s.stock.length ? 'An empty column has to be filled before you can deal, and nothing can go there. Undo a few moves to try another line, or give up.' : 'The stock is used up and nothing on the table makes progress. Undo a few moves to try another line, or give up and deal again.' };
	const col = s.tableau[h.col];
	const n = col.length - h.index;
	const what = n > 2 ? `the ${label(h.card)} and the ${n - 1} cards on it` : n === 2 ? `the ${label(h.card)} and the card on it` : `the ${label(h.card)}`;
	const dest = s.tableau[pileOf(h.to).i];
	const top = dest[dest.length - 1];
	const onto = top === undefined ? 'into the empty column' : `onto the ${label(top)}`;
	let why = `Move ${what} ${onto}.`;
	if (h.kind === 'fill') why += ' You can’t deal while a column is empty, so put something in it first. A run that leaves a useful card on top is best.';
	else {
		if (h.kind === 'reveal') why += h.empties ? ' That clears the column.' : ` That turns over ${s.down[h.col] === 1 ? 'the last face-down card' : `one of the ${s.down[h.col]} face-down cards`} in that column.`;
		if (top !== undefined && linked(h.card, top)) why += ` Both are ${SUIT_NAME[suitOf(h.card)]}, so they’ll move as one from now on and count toward a full run.`;
		else if (h.kind === 'reveal' && top !== undefined && s.suits > 1) why += ' It’s a different suit, so they won’t move together, but the hidden card is worth it.';
	}
	return { action, cards: [h.card], button: null, spot: `to-${h.to}`, title: h.kind === 'fill' ? 'Fill the gap' : `Move the ${label(h.card)}`, why };
}

export function spiderReview(s: SpiderState, _seat: number, action: SpiderAction, advice: Advice): string | null {
	const advised = advice.action as SpiderAction;
	if (action.type === 'deal' && advised.type === 'move') return `There was a move on the table first: the ${label(advised.card)}. Use the table before dealing; a new row covers everything up.`;
	if (action.type === 'move' && s.suits > 1) {
		const dest = s.tableau[pileOf(action.to).i];
		const top = dest[dest.length - 1];
		const better = movesS(s).some((m) => {
			const under = s.tableau[pileOf(m.to).i].at(-1);
			return m.card === action.card && m.to !== action.to && under !== undefined && linked(m.card, under);
		});
		if (top !== undefined && !linked(action.card, top) && better) return `The ${label(action.card)} could have gone on a ${SUIT_SINGULAR[suitOf(action.card)]} instead. Same-suit runs are the ones that move together and clear.`;
	}
	return null;
}
