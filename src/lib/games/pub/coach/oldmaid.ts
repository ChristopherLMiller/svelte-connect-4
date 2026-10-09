import { QUEEN, rankOf } from '../../kit/cards/deck';
import { chooseAction } from '../ai';
import { sourceOf, type OldMaidAction, type OldMaidState } from '../rules/oldmaid';
import type { Advice } from './types';
import { counted } from './words';

export function oldMaidAdvice(s: OldMaidState, seat: number, names: string[], seed: number): Advice {
	const action = chooseAction({ state: s, seat, difficulty: 'hard', seed }) as OldMaidAction;
	if (action.type !== 'draw') return { action, cards: [], button: null, spot: null, title: '', why: '' };
	const from = sourceOf(s, seat);
	const theirs = s.hands[from].length;
	const mine = s.hands[seat].length;
	const holdQueen = s.hands[seat].some((c) => rankOf(c) === QUEEN);
	const why = [`You can't see ${names[from]}'s cards, so any card is as good as another. I've just picked one.`];
	why.push(`If it matches ${mine === 1 ? 'your last card' : `any of your ${counted(mine, 'card')}`}, the pair goes straight down.`);
	if (holdQueen) why.push(`You're holding a queen. It might be the odd one out, so keep a straight face and hope someone draws it.`);
	else if (theirs > 1) why.push(`If ${names[from]} has the old maid, there's a 1 in ${theirs} chance of drawing it.`);
	else why.push(`It's ${names[from]}'s last card, so they'll be out once you take it.`);
	return { action, cards: [action.card], button: null, spot: null, title: `Draw from ${names[from]}`, why: why.join(' ') };
}

export function oldMaidReview(): string | null {
	return null;
}
