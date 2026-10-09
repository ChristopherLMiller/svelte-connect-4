import { label, pipValue, rankOf, suitOf, type Card } from '../../kit/cards/deck';
import { chooseAction } from '../ai';
import { bestMelding, canKnockWith, deadwoodOf, type GinAction, type GinState } from '../rules/gin';
import type { Advice } from './types';
import { cards } from './words';

function takeWhy(hand: Card[], up: Card) {
	const melds = bestMelding([...hand, up]).melds;
	const meld = melds.find((m) => m.includes(up));
	if (meld) return `It completes a meld: ${cards(meld)}.`;
	const now = deadwoodOf(hand);
	const after = Math.min(...hand.map((d) => deadwoodOf([...hand, up].filter((x) => x !== d))));
	return `Swapping it in drops your deadwood from ${now} to ${after}.`;
}

function linked(c: Card, picks: Card[]) {
	return picks.find((p) => rankOf(p) === rankOf(c) || (suitOf(p) === suitOf(c) && Math.abs(rankOf(p) - rankOf(c)) <= 2)) ?? null;
}

export function ginAdvice(s: GinState, seat: number, names: string[], seed: number): Advice {
	const action = chooseAction({ state: s, seat, difficulty: 'hard', seed }) as GinAction;
	const opp = names[1 - seat];
	const hand = s.hands[seat];
	const up = s.discard[s.discard.length - 1];
	const base = { cards: [] as Card[], button: null, spot: null } as const;
	switch (action.type) {
		case 'take':
			return { ...base, action, button: 'take', spot: 'take', title: `Take the ${label(up)}`, why: takeWhy(hand, up) };
		case 'pass':
			return { ...base, action, button: 'pass', title: `Pass on the ${label(up)}`, why: `It doesn't fit any of your melds. If ${opp} passes too, you'll draw from the stock.` };
		case 'draw':
			return {
				...base,
				action,
				button: 'draw',
				spot: 'draw',
				title: 'Draw from the stock',
				why: `The ${label(up)} doesn't help your hand, and taking it would show ${opp} what you're collecting.`
			};
		case 'bigGin':
			return { ...base, action, button: 'bigGin', title: 'Big gin!', why: 'All eleven cards are in melds. Lay them down for a 31-point bonus plus whatever deadwood is left in their hand.' };
		case 'knock': {
			const rest = hand.filter((c) => c !== action.card);
			const dw = deadwoodOf(rest);
			if (dw === 0) {
				return {
					...base,
					action,
					cards: [action.card],
					button: 'knock',
					title: `Gin! Knock with the ${label(action.card)}`,
					why: `Every other card is in a meld. ${opp} can't lay off on a gin, and you get a 25-point bonus. Tap Knock, then the ${label(action.card)}.`
				};
			}
			return {
				...base,
				action,
				cards: [action.card],
				button: 'knock',
				title: `Knock with the ${label(action.card)}`,
				why: `Throwing it face down leaves ${dw} deadwood. That's 10 or less, so you may end the hand now. ${opp} lays off what they can onto your melds; you score the difference unless they match you. Tap Knock, then the card.`
			};
		}
		case 'discard': {
			const card = action.card;
			const rest = hand.filter((c) => c !== card);
			const dw = deadwoodOf(rest);
			const loose = bestMelding(hand).deadwood;
			const lines: string[] = [];
			if (loose.includes(card)) lines.push(`It isn't part of any meld${pipValue(card) >= 8 ? `, and at ${pipValue(card)} points it's costly to get caught holding` : ''}.`);
			else lines.push('Breaking this meld costs the least of anything in your hand.');
			const bigger = loose.filter((c) => c !== s.tookUp && pipValue(c) > pipValue(card));
			for (const c of bigger) {
				const p = linked(c, s.pickups[1 - seat]);
				if (p !== null) {
					lines.push(`Rosie wouldn't throw the ${label(c)}: ${opp} took the ${label(p)} earlier, so it may fit their meld.`);
					break;
				}
			}
			const knockable = hand.some((c) => canKnockWith(s, c));
			if (knockable) lines.push(`You could knock, but it's early and ${opp} might undercut you. A lower count is safer.`);
			else lines.push(`That leaves ${dw} deadwood${dw <= 10 ? '' : '; you can knock once it’s 10 or less'}.`);
			return { ...base, action, cards: [card], title: `Throw the ${label(card)}`, why: lines.join(' ') };
		}
	}
	return { ...base, action, title: '', why: '' };
}

export function ginReview(s: GinState, seat: number, action: GinAction, advice: Advice, names: string[]): string | null {
	const advised = advice.action as GinAction;
	const opp = names[1 - seat];
	const hand = s.hands[seat];
	const up = s.discard[s.discard.length - 1];
	if (advised.type === 'knock' && action.type === 'discard') {
		const dw = deadwoodOf(hand.filter((c) => c !== advised.card));
		return dw === 0 ? `You had gin! Knocking with the ${label(advised.card)} was worth a 25-point bonus.` : `You could have knocked with ${dw} deadwood and ended the hand ahead.`;
	}
	if (advised.type === 'take' && action.type !== 'take' && up !== undefined) {
		const meld = bestMelding([...hand, up]).melds.find((m) => m.includes(up));
		if (meld) return `The ${label(up)} would have completed ${cards(meld)}.`;
	}
	if (action.type === 'take' && advised.type !== 'take' && up !== undefined) {
		const melded = bestMelding([...hand, up]).melds.some((m) => m.includes(up));
		if (!melded) return `The ${label(up)} didn't fit your hand, and now ${opp} knows you're interested in it.`;
	}
	if (action.type === 'discard' && advised.type === 'discard' && action.card !== advised.card) {
		const mine = deadwoodOf(hand.filter((c) => c !== action.card));
		const best = deadwoodOf(hand.filter((c) => c !== advised.card));
		if (mine - best >= 5) {
			const meld = bestMelding(hand).melds.find((m) => m.includes(action.card));
			return meld ? `Throwing the ${label(action.card)} broke up ${cards(meld)}: your deadwood is ${mine} instead of ${best}.` : `Your deadwood is ${mine} now; throwing the ${label(advised.card)} would have left ${best}.`;
		}
	}
	return null;
}
