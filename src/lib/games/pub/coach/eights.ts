import { SUIT_GLYPH, label, rankOf, suitOf, type Card } from '../../kit/cards/deck';
import { chooseAction } from '../ai';
import { bestSuit } from '../bots/eights';
import { isEight, legalEights, penalty, top, type EightsAction, type EightsState } from '../rules/eights';
import type { Advice } from './types';
import { counted, list, suitName, suitOne } from './words';

const wanted = (s: EightsState) => (isEight(top(s)) ? `the ${suitName(s.suit)} that were called` : `the ${label(top(s))}`);

function playWhy(s: EightsState, seat: number, c: Card, names: string[]) {
	const hand = s.hands[seat];
	const legal = legalEights(s, seat);
	const next = (seat + 1) % 4;
	const t = top(s);
	if (isEight(c)) {
		const others = legal.filter((x) => !isEight(x));
		if (!others.length) return `Nothing else matches ${wanted(s)}, but eights are wild: play it and you get to name the next suit.`;
		return `${names[next]} is down to ${counted(s.hands[next].length, 'card')}, so it's time to spend the eight and pick a suit they can't follow.`;
	}
	const why: string[] = [];
	const called = isEight(t) ? `${suitName(s.suit)}, the suit that was called` : `the ${label(t)}`;
	const matches = suitOf(c) === s.suit ? `it's a ${suitOne(s.suit)}, matching ${called}` : `it matches the ${label(t)} by number and switches the suit to ${suitName(suitOf(c))}`;
	why.push(`The ${label(c)} works because ${matches}.`);
	const after = hand.filter((x) => x !== c);
	const follow = after.filter((x) => suitOf(x) === suitOf(c) && !isEight(x)).length;
	if (penalty(c) >= 10) why.push(`It's worth ${penalty(c)} if you're caught holding it, so it's a good one to shed early.`);
	if (follow >= 2) why.push(`You still hold ${counted(follow, suitOne(suitOf(c)), suitName(suitOf(c)))}, so you can follow it up next time.`);
	if (s.shy[next].includes(suitOf(c))) why.push(`${names[next]} had to draw on ${suitName(suitOf(c))} earlier, so they may be out of them.`);
	if (hand.some(isEight)) why.push('Keep your eight back for when nothing else fits.');
	return why.join(' ');
}

export function eightsAdvice(s: EightsState, seat: number, names: string[], seed: number): Advice {
	const action = chooseAction({ state: s, seat, difficulty: 'hard', seed }) as EightsAction;
	const hand = s.hands[seat];
	if (action.type === 'suit') {
		const count = (x: number) => hand.filter((c) => suitOf(c) === x && !isEight(c)).length;
		const n = count(action.suit);
		const longest = [0, 1, 2, 3].every((x) => x === action.suit || count(x) < n);
		const next = (seat + 1) % 4;
		const shy = s.shy[next].includes(action.suit) ? ` ${names[next]} drew on ${suitName(action.suit)} before, so they may be stuck.` : '';
		return {
			action,
			cards: [],
			button: `suit-${action.suit}`,
			spot: null,
			title: `Name ${suitName(action.suit)}`,
			why: n ? `You hold ${counted(n, suitOne(action.suit), suitName(action.suit))}, ${longest ? 'more than any other suit' : 'as many as any other suit'}, so you're likely to have a card to play next turn.${shy}` : `Only eights left, so any suit will do. Pick one the next player may be short of.${shy}`
		};
	}
	if (action.type === 'draw') {
		return {
			action,
			cards: [],
			button: 'draw',
			spot: 'draw',
			title: 'Draw a card',
			why: `Nothing in your hand matches ${wanted(s)}, and you have no eight. Draw until you find something you can play.`
		};
	}
	if (action.type === 'pass') return { action, cards: [], button: 'pass', spot: null, title: 'Pass', why: 'The stock and the discard pile are both used up and nothing matches, so you have to pass.' };
	if (action.type === 'play') return { action, cards: [action.card], button: null, spot: null, title: `Play the ${label(action.card)}`, why: playWhy(s, seat, action.card, names) };
	return { action, cards: [], button: null, spot: null, title: '', why: '' };
}

export function eightsReview(s: EightsState, seat: number, action: EightsAction, advice: Advice): string | null {
	const advised = advice.action as EightsAction;
	const hand = s.hands[seat];
	if (action.type === 'suit') {
		const best = bestSuit(hand);
		const n = (x: number) => hand.filter((c) => suitOf(c) === x && !isEight(c)).length;
		if (n(best) - n(action.suit) >= 2) return `${n(action.suit) ? `You only hold ${counted(n(action.suit), suitOne(action.suit), suitName(action.suit))}` : `You hold no ${suitName(action.suit)}`}. Naming ${suitName(best)} ${SUIT_GLYPH[best]} would have kept your options open.`;
		return null;
	}
	if (action.type === 'draw' && advised.type === 'play') return `You could have played the ${label(advised.card)} instead of drawing. Every card you draw is one more to get rid of.`;
	if (action.type === 'play' && advised.type === 'play' && isEight(action.card) && !isEight(advised.card)) {
		const others = legalEights(s, seat).filter((c) => !isEight(c));
		return `Eights are wild, so they're best saved for when nothing else fits. ${list(others.slice(0, 2).map(label))} would have matched.`;
	}
	if (action.type === 'play' && advised.type === 'play' && !isEight(action.card) && penalty(advised.card) - penalty(action.card) >= 6 && rankOf(advised.card) !== rankOf(action.card)) {
		return `Shedding the ${label(advised.card)} first would cut your penalty if someone goes out soon.`;
	}
	return null;
}
