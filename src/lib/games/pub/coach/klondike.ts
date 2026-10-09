import { label, type Card } from '../../kit/cards/deck';
import { hintAction, klondikeHint } from '../bots/klondike';
import { locate, movesK, type KlondikeAction, type KlondikeState } from '../rules/klondike';
import { pileOf } from '../rules/patience';
import type { Advice } from './types';

export const placeName = (s: KlondikeState, to: string) => {
	const p = pileOf(to);
	if (p.kind === 'f') return 'its foundation';
	const col = s.tableau[p.i];
	return col.length ? `the ${label(col[col.length - 1])}` : 'the empty column';
};

const runText = (s: KlondikeState, c: Card) => {
	const at = locate(s, c);
	if (!at || !at.pile.startsWith('t')) return `the ${label(c)}`;
	const n = s.tableau[pileOf(at.pile).i].length - at.index;
	return n > 1 ? `the ${label(c)} and the ${n - 1} card${n > 2 ? 's' : ''} on it` : `the ${label(c)}`;
};

export function klondikeAdvice(s: KlondikeState): Advice {
	const h = klondikeHint(s);
	const action = hintAction(h);
	if (h.kind === 'auto') return { action, cards: [], button: 'auto', spot: null, title: 'Finish it', why: 'Every card is face up and the stock is empty, so the game is won. Sit back while they fly home.' };
	if (h.kind === 'draw') return { action, cards: [], button: null, spot: 'draw', title: 'Turn the stock', why: `Nothing on the table can move usefully right now. Turn ${s.draw === 1 ? 'a card' : 'three cards'} from the stock to see what comes up.` };
	if (h.kind === 'recycle') return { action, cards: [], button: null, spot: 'draw', title: 'Turn the pile over', why: `The stock is empty. Turn the waste back over and go through it again${s.redeals !== null ? ` (${s.redeals - s.passes} turn${s.redeals - s.passes === 1 ? '' : 's'} left)` : ''}: moves you’ve made since may have opened up new places for those cards.` };
	if (h.kind === 'stuck') return { action, cards: [], button: 'resign', spot: null, title: 'No moves left', why: 'I’ve looked everywhere: nothing can move, and going through the stock again won’t change that. Undo a few moves to try another line, or give up and deal again.' };
	const to = placeName(s, h.to);
	const base = h.to.startsWith('f') ? `Send the ${label(h.card)} up to its foundation.` : `Move ${runText(s, h.card)} onto ${to}.`;
	let why: string;
	if (h.kind === 'safe') why = `${base} ${h.reveals ? 'That turns over a hidden card too. ' : ''}It’s safe: nothing left on the table could need it to build on.`;
	else if (h.kind === 'reveal') {
		const col = pileOf(h.from).i;
		why = `${base} That turns over ${s.down[col] === 1 ? 'the last face-down card' : `one of the ${s.down[col]} face-down cards`} in that column. Uncovering hidden cards is how you win at Klondike.`;
	} else if (h.kind === 'king') why = `${base} Only a king can start an empty column, and getting cards out of the waste opens up the stock.`;
	else if (h.kind === 'waste') why = `${base} Using the waste card means the stock has one card fewer to get through.`;
	else why = `${base} Every card on a foundation is one closer to the finish.`;
	return { action, cards: [h.card], button: null, spot: `to-${h.to}`, title: h.to.startsWith('f') ? `Send the ${label(h.card)} home` : `Move the ${label(h.card)}`, why };
}

export function klondikeReview(s: KlondikeState, _seat: number, action: KlondikeAction, advice: Advice): string | null {
	const advised = advice.action as KlondikeAction;
	if (action.type === 'draw' && advised.type === 'move') {
		const reveal = movesK(s).some((m) => m.card === advised.card && m.to === advised.to);
		return reveal ? `There was a move on the table first: the ${label(advised.card)}. Use the table before turning the stock.` : null;
	}
	if (action.type === 'move' && action.to.startsWith('f') && advised.type === 'move' && !advised.to.startsWith('f')) return `Sending cards home too early can leave you nothing to build on. The ${label(advised.card)} move uncovered more.`;
	return null;
}
