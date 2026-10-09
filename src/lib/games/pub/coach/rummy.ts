import { label, rankOf } from '../../kit/cards/deck';
import { keepScore, meldPoints, meldsIn, rummyPlan } from '../bots/rummy';
import { fitsMeld, meldKind, orderMeld, rummyValue, type RummyAction, type RummyState } from '../rules/rummy';
import type { Advice } from './types';
import { list } from './words';

const ACE = 12;
const cardsText = (cards: number[]) => list(orderMeld(cards).map(label));
const meldValue = (cards: number[]) => {
	const low = meldKind(cards) === 'run' && cards.some((c) => rankOf(c) === 0);
	return cards.reduce((t, c) => t + rummyValue(c, low && rankOf(c) === ACE), 0);
};

export function meldName(s: RummyState, i: number, names: string[], viewer: number) {
	const m = s.melds[i];
	const whose = m.owner === viewer ? 'your' : `${names[m.owner]}'s`;
	return `${whose} ${m.kind} ${cardsText(m.cards)}`;
}

export function rummyAdvice(s: RummyState, seat: number, names: string[]): Advice {
	const plan = rummyPlan(s, seat, 'hard');
	const a = plan.action;
	const opp = names[1 - seat];
	const hand = s.hands[seat];
	if (a.type === 'draw') {
		const top = s.discard[s.discard.length - 1];
		return { action: a, cards: [], button: 'draw', spot: 'draw', title: 'Draw from the stock', why: `${top !== undefined ? `The ${label(top)} on the discard pile doesn’t make a meld with anything you hold` : 'The discard pile is empty'}, and digging deeper would saddle you with cards you can’t use. Take a fresh card from the stock.` };
	}
	if (a.type === 'take') {
		const taken = s.discard.slice(a.index);
		const after = meldPoints([...hand, ...taken]);
		const key = taken[0];
		const meld = after.melds.find((m) => m.includes(key));
		const uses = meld ? `it makes ${cardsText(meld)}` : 'it lays off on a meld already on the table';
		if (plan.why === 'top') return { action: a, cards: [key], button: null, spot: null, title: `Take the ${label(key)}`, why: `Take the ${label(key)} from the discard pile: ${uses}. Melded cards score for you.` };
		const extra = taken.slice(1);
		return {
			action: a,
			cards: [key],
			button: null,
			spot: null,
			title: `Take from the ${label(key)} up`,
			why: `In Rummy 500 you can dig into the discard pile. Take the ${label(key)} and every card above it (${cardsText(extra)}): ${uses}. The catch: the ${label(key)} must go down this turn. The extra cards are worth it here, they${after.melds.length > 1 ? ' make more melds too' : '’ll help later'}.`
		};
	}
	if (a.type === 'meld') {
		const v = meldValue(a.cards);
		const kind = meldKind(a.cards) === 'set' ? 'a set' : 'a run';
		const must = plan.why === 'must' && s.must !== null ? `You took the ${label(s.must)} from the pile, so it has to go down this turn. ` : '';
		return { action: a, cards: a.cards, button: 'meld', spot: null, title: `Meld ${cardsText(a.cards)}`, why: `${must}${cardsText(a.cards)} is ${kind} worth ${v}. Laying it down banks the points now; if ${opp} goes out first, cards still in your hand count against you.` };
	}
	if (a.type === 'layoff') {
		const m = s.melds[a.meld];
		const mine = m.owner === seat;
		return {
			action: a,
			cards: [a.card],
			button: null,
			spot: `meld-${a.meld}`,
			title: `Lay off the ${label(a.card)}`,
			why: `The ${label(a.card)} fits on ${meldName(s, a.meld, names, seat)}. ${mine ? 'Adding' : `Even on ${opp}’s meld, laying off`} scores ${rummyValue(a.card)} for you.`
		};
	}
	if (a.type === 'discard') {
		const loner = keepScore(hand, a.card) < 0;
		const why = loner
			? `The ${label(a.card)} doesn’t connect to anything: no pair, no near-run. ${rummyValue(a.card) >= 10 ? `At ${rummyValue(a.card)} points it would hurt if ${opp} went out, so let it go.` : 'Throw it and keep the cards that could still become melds.'}`
			: `Everything left is working towards a meld. The ${label(a.card)} is the least useful of them.`;
		return { action: a, cards: [a.card], button: 'discard', spot: null, title: `Discard the ${label(a.card)}`, why };
	}
	return { action: a, cards: [], button: null, spot: null, title: '', why: '' };
}

export function rummyReview(s: RummyState, seat: number, action: RummyAction, advice: Advice): string | null {
	const advised = advice.action as RummyAction;
	const hand = s.hands[seat];
	if (action.type === 'draw' && advised.type === 'take') {
		const key = s.discard[advised.index];
		if (advised.index < s.discard.length - 1) return `Digging down to the ${label(key)} in the discard pile would have put points on the table this turn.`;
		return `The ${label(key)} on top of the discard pile would have made a meld for you.`;
	}
	if (action.type === 'discard') {
		if (s.melds.some((m) => fitsMeld(m, action.card))) return `The ${label(action.card)} could have been laid off on the table for ${rummyValue(action.card)} points instead of thrown away.`;
		if (meldsIn(hand).some((m) => m.includes(action.card))) return `The ${label(action.card)} was part of a meld you could have laid down.`;
		if (advised.type === 'meld') return `You had a meld to lay down first: ${cardsText(advised.cards)}.`;
	}
	return null;
}
