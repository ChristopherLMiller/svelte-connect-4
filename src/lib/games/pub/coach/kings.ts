import { label } from '../../kit/cards/deck';
import { chooseAction } from '../ai';
import { CORNERS, fits, isKing, legalKings, type KingsAction, type KingsState } from '../rules/kings';
import type { Advice } from './types';

export const PILE_NAME = ['the top pile', 'the right pile', 'the bottom pile', 'the left pile', 'the top-right corner', 'the bottom-right corner', 'the bottom-left corner', 'the top-left corner'];

const topOf = (s: KingsState, pile: number) => s.piles[pile][s.piles[pile].length - 1];

export function kingsAdvice(s: KingsState, seat: number, _names: string[], seed: number): Advice {
	const action = chooseAction({ state: s, seat, difficulty: 'hard', seed }) as KingsAction;
	if (action.type === 'end') {
		return {
			action,
			cards: [],
			button: 'end',
			spot: null,
			title: 'End your turn',
			why: s.hands[seat].length ? 'Nothing in your hand fits on any pile, and no pile can move onto another. End your turn: you’ll draw a fresh card next time.' : 'You’re done.'
		};
	}
	if (action.type === 'move') {
		const base = s.piles[action.from][0];
		const why = !s.piles[action.to].length
			? `The ${label(base)} heads ${PILE_NAME[action.from]}, and kings belong in the corners. Moving the whole pile frees ${PILE_NAME[action.from]} for any card from your hand.`
			: `The ${label(base)} at the bottom of ${PILE_NAME[action.from]} fits on the ${label(topOf(s, action.to))}. Moving the whole pile across empties a side spot, and you can put any card there.`;
		return { action, cards: [base], button: null, spot: `pile-${action.to}`, title: `Move ${PILE_NAME[action.from]}`, why };
	}
	if (action.type === 'play') {
		const { card, pile } = action;
		let why: string;
		if (CORNERS.includes(pile) && !s.piles[pile].length) why = `Kings can only start a corner. Put the ${label(card)} there and it becomes a new pile to build on.`;
		else if (!s.piles[pile].length) {
			const after: KingsState = { ...s, piles: s.piles.map((p, i) => (i === pile ? [card] : p)) };
			const next = s.hands[seat].filter((c) => c !== card && fits(after, c, pile));
			why = `${PILE_NAME[pile][0].toUpperCase()}${PILE_NAME[pile].slice(1)} is empty, so any card can go there.${next.length ? ` The ${label(card)} is a good choice: your ${next.map(label).join(' and ')} can follow it.` : ` A high card like the ${label(card)} gives you the most room to build down.`}`;
		} else {
			const top = topOf(s, pile);
			why = `The ${label(card)} goes on the ${label(top)}: one lower, and the other colour.`;
			const more = legalKings(s, seat).filter((a) => a.type === 'play' && a.card !== card).length;
			if (more) why += ' Every card you get rid of brings you closer to going out. Keep playing while you can.';
		}
		if (isKing(card) && !CORNERS.includes(pile)) why = `All four corners are full, so this king goes on an empty side.`;
		return { action, cards: [card], button: null, spot: `pile-${pile}`, title: `Play the ${label(card)}`, why };
	}
	return { action, cards: [], button: null, spot: null, title: '', why: '' };
}

export function kingsReview(s: KingsState, seat: number, action: KingsAction, advice: Advice): string | null {
	const advised = advice.action as KingsAction;
	if (action.type === 'end' && advised.type !== 'end') {
		const n = legalKings(s, seat).length;
		return `You still had ${n === 1 ? 'a move' : 'moves'} to make. ${advised.type === 'play' ? `The ${label(advised.card)} could have gone on ${PILE_NAME[advised.pile]}.` : 'A pile could have moved.'} Every card left in your hand slows you down.`;
	}
	if (action.type === 'play' && advised.type === 'play' && !s.piles[action.pile].length && !CORNERS.includes(action.pile) && advised.pile !== action.pile && s.piles[advised.pile].length) {
		return `Filling an empty side spot with a card that could have gone on a pile wastes the spot. Play onto piles first, then fill the gaps.`;
	}
	return null;
}
