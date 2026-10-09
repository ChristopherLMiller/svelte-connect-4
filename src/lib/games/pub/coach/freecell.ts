import { label, suitOf, type Card } from '../../kit/cards/deck';
import { fcHintAction, freeCellHint } from '../bots/freecell';
import { locateFC, maxRun, type FreeCellAction, type FreeCellState } from '../rules/freecell';
import { lowRank, pileOf } from '../rules/patience';
import type { Advice } from './types';

const wantedNext = (s: FreeCellState, c: Card) => s.foundations[suitOf(c)].length === lowRank(c);

function moveWhy(s: FreeCellState, card: Card, to: string, solved: boolean): { title: string; why: string } {
	const from = locateFC(s, card)!;
	const src = pileOf(from.pile);
	const dst = pileOf(to);
	const col = src.kind === 't' ? s.tableau[src.i] : [];
	const n = src.kind === 't' ? col.length - from.index : 1;
	const what = n > 2 ? `the ${label(card)} and the ${n - 1} cards on it` : n === 2 ? `the ${label(card)} and the card on it` : `the ${label(card)}`;
	const under = src.kind === 't' && from.index > 0 ? col[from.index - 1] : null;
	const sure = solved ? '' : ' I can’t see a sure way through from here, so this just keeps things tidy.';
	if (dst.kind === 'f') return { title: `Send the ${label(card)} home`, why: `The ${label(card)} is next on its foundation. Cards on the foundations are out of the way for good.${sure}` };
	let why: string;
	if (dst.kind === 'c') why = `Park the ${label(card)} in a free cell.`;
	else {
		const onto = s.tableau[dst.i];
		why = `Move ${what} ${onto.length ? `onto the ${label(onto[onto.length - 1])}` : 'into the empty column'}.`;
		if (n > 1) why += ` A run that long can move because you have room for ${maxRun(s, !onto.length)} cards at once: one more than your empty free cells, doubled for each other empty column.`;
	}
	if (src.kind === 'c') why += ' That gets a free cell back, and free cells are what let you move runs.';
	else if (from.index === 0) why += dst.kind === 'c' ? ' That empties a column, which is worth more than the cell it costs.' : ' That empties a column, the most useful space on the table.';
	else if (under !== null && wantedNext(s, under)) why += ` That uncovers the ${label(under)}, which can go straight home.`;
	else if (under !== null) why += ` That gets at the ${label(under)} underneath.`;
	return { title: dst.kind === 'c' ? `Park the ${label(card)}` : `Move the ${label(card)}`, why: why + sure };
}

export function freeCellAdvice(s: FreeCellState): Advice {
	const h = freeCellHint(s);
	const action = fcHintAction(h);
	if (h.kind === 'auto') return { action, cards: [], button: 'auto', spot: null, title: 'Finish it', why: 'Every column already runs high to low, so nothing is in the way. Tap Finish to send everything home.' };
	if (h.kind === 'stuck') return { action, cards: [], button: 'resign', spot: null, title: 'No way forward', why: 'I can’t find a move that gets anywhere. Undo a few moves to try another line, or give up and deal again.' };
	const { title, why } = moveWhy(s, h.card, h.to, h.solved);
	return { action, cards: [h.card], button: null, spot: `to-${h.to}`, title, why };
}

export function freeCellReview(s: FreeCellState, _seat: number, action: FreeCellAction, advice: Advice): string | null {
	const advised = advice.action as FreeCellAction;
	if (action.type !== 'move' || advised.type !== 'move') return null;
	const free = s.cells.filter((c) => c === null).length;
	if (action.to.startsWith('c') && !advised.to.startsWith('c') && free <= 2) return `That used one of your last free cells. Moving the ${label(advised.card)} kept them open for later.`;
	return null;
}
