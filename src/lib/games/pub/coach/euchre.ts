import { ACE, KING, label, rankOf, suitOf, type Card, type Suit } from '../../kit/cards/deck';
import { chooseAction, strength } from '../ai';
import {
	effSuit,
	isLeft,
	isRight,
	ledSuitE,
	legalEuchre,
	partnerOf,
	power,
	teamOf,
	trickWinnerE,
	type EuchreAction,
	type EuchreState
} from '../rules/euchre';
import type { Advice, CoachButton } from './types';
import { counted, list, suitName, suitOne } from './words';

function holding(hand: Card[], trump: Suit) {
	const trumps = hand.filter((c) => effSuit(c, trump) === trump);
	const right = hand.some((c) => isRight(c, trump));
	const left = hand.some((c) => isLeft(c, trump));
	const aces = hand.filter((c) => effSuit(c, trump) !== trump && rankOf(c) === ACE).length;
	const bowers = right && left ? 'both bowers' : right ? 'the right bower' : left ? 'the left bower' : '';
	const count = right && left ? 2 : right || left ? 1 : 0;
	let trumpText = counted(trumps.length, 'trump');
	if (bowers) trumpText += trumps.length === count ? `, ${bowers}` : ` (including ${bowers})`;
	const parts = [trumpText];
	if (aces) parts.push(counted(aces, 'off-suit ace'));
	return list(parts);
}

function bestFive(hand: Card[], trump: Suit) {
	let drop = hand[0];
	let best = -Infinity;
	for (const d of hand) {
		const v = strength(
			hand.filter((c) => c !== d),
			trump
		);
		if (v > best) {
			best = v;
			drop = d;
		}
	}
	return hand.filter((c) => c !== drop);
}

function playWhy(s: EuchreState, seat: number, card: Card, names: string[]) {
	const trump = s.trump!;
	const led = ledSuitE(s);
	const makers = teamOf(s.maker!) === teamOf(seat);
	if (led === null) {
		if (isRight(card, trump)) return 'Lead the right bower: nothing can beat it, and it pulls trumps out of the other team’s hands.';
		if (effSuit(card, trump) === trump) return makers ? 'Lead trump to draw out the other team’s trumps, so your aces are safe later.' : 'Leading trump here clears the way for your partner’s cards.';
		const suit = suitOf(card);
		if (rankOf(card) === ACE) return `Lead your ace of ${suitName(suit)}: an ace outside trump usually wins the trick.`;
		const aceGone = s.played.some((p) => p.card === suit * 13 + ACE);
		if (rankOf(card) === KING && aceGone) return `The ace of ${suitName(suit)} is gone, so the ${label(card)} is the highest ${suitOne(suit)} left.`;
		if (rankOf(card) >= KING - 1) return `Lead the ${label(card)}: if your partner holds the ace of ${suitName(suit)}, your side wins it either way.`;
		return `Lead a low ${suitOne(suit)} and give your partner a chance to win it.`;
	}
	const winner = trickWinnerE(s);
	const winning = s.trick[winner]!;
	const partnerWinning = winner === partnerOf(seat);
	const beats = power(card, trump, led) > power(winning, trump, led);
	if (partnerWinning && !beats) return `Your partner ${names[winner]} is already winning this trick, so play your lowest card and save the good ones.`;
	if (beats && effSuit(card, trump) === trump && led !== trump) return `You're out of ${suitName(led)}, so trump it with the ${label(card)} and take the trick.`;
	if (beats) return `Take it with the ${label(card)}: the cheapest card you have that wins.`;
	return `You can't beat the ${label(winning)}, so throw away the card you'll miss least.`;
}

export function euchreAdvice(s: EuchreState, seat: number, names: string[], seed: number): Advice {
	const action = chooseAction({ state: s, seat, difficulty: 'hard', seed }) as EuchreAction;
	const hand = s.hands[seat];
	const base = { cards: [] as Card[], spot: null } as const;
	const dealer = names[s.dealer];
	switch (action.type) {
		case 'farmer':
			return {
				...base,
				action,
				button: action.swap ? 'swap' : 'keep',
				title: action.swap ? 'Swap your farmer’s hand' : 'Keep your hand',
				why: 'Nines and tens are the weakest cards in euchre, so trading three of them for the hidden kitty cards can only help.'
			};
		case 'order': {
			const trump = suitOf(s.upcard);
			const mine = seat === s.dealer ? bestFive([...hand, s.upcard], trump) : hand;
			const lines = [`With ${suitName(trump)} as trump you'd hold ${holding(mine, trump)}. That's enough to win three tricks.`];
			if (seat === s.dealer) lines.unshift(`You'd add the ${label(s.upcard)} to your hand and bury your weakest card.`);
			else if (seat === partnerOf(s.dealer)) lines.push(`Your partner ${dealer} picks up the ${label(s.upcard)}, which helps your side too.`);
			if (action.alone) lines.push('Strong enough to go alone: take all five tricks yourself for 4 points.');
			return { ...base, action, button: action.alone ? 'alone' : 'order', title: action.alone ? 'Go alone!' : seat === s.dealer ? 'Pick it up' : 'Order it up', why: lines.join(' ') };
		}
		case 'call': {
			const lines = [`${suitName(action.suit)[0].toUpperCase()}${suitName(action.suit).slice(1)} is your best suit: you'd hold ${holding(hand, action.suit)}.`];
			if (s.phase === 'bid2' && s.stick && seat === s.dealer) lines.unshift('Everyone passed, and the dealer is stuck: you must name a suit.');
			if (action.alone) lines.push('Strong enough to go alone for 4 points.');
			return { ...base, action, button: `call-${action.suit}` as CoachButton, title: `Call ${suitName(action.suit)}${action.alone ? ', alone' : ''}`, why: lines.join(' ') };
		}
		case 'pass': {
			if (s.phase === 'bid1') {
				const trump = suitOf(s.upcard);
				const lines = [`In ${suitName(trump)} you'd only hold ${holding(hand, trump)}. You usually want three trumps, or two with a bower and an ace.`];
				if (teamOf(s.dealer) !== teamOf(seat)) lines.push(`Ordering it up would also hand ${dealer} the ${label(s.upcard)}.`);
				return { ...base, action, button: 'pass', title: 'Pass', why: lines.join(' ') };
			}
			return { ...base, action, button: 'pass', title: 'Pass', why: 'No suit gives you enough trumps to win three tricks. Let someone else name it.' };
		}
		case 'discard': {
			const c = action.card;
			const suit = effSuit(c, s.trump);
			const only = hand.filter((x) => effSuit(x, s.trump) === suit).length === 1 && suit !== s.trump;
			return {
				...base,
				action,
				cards: [c],
				button: null,
				title: `Bury the ${label(c)}`,
				why: only ? `It's your only ${suitOne(suit)}. Without it you can trump whenever ${suitName(suit)} are led.` : 'It’s the weakest card in your hand now that trump is set.'
			};
		}
		case 'defend':
			return {
				...base,
				action,
				button: action.alone ? 'defend-alone' : 'defend',
				title: action.alone ? 'Defend alone' : 'Play with your partner',
				why: action.alone ? 'Your trumps are strong enough to stop the loner by yourself, worth 4 points.' : 'Two defenders stop a loner far more often than one.'
			};
		case 'play':
			return { ...base, action, cards: [action.card], button: null, title: `Play the ${label(action.card)}`, why: playWhy(s, seat, action.card, names) };
	}
	return { ...base, action, button: null, title: '', why: '' };
}

export function euchreReview(s: EuchreState, seat: number, action: EuchreAction, advice: Advice): string | null {
	const advised = advice.action as EuchreAction;
	const hand = s.hands[seat];
	if (action.type === 'play' && advised.type === 'play' && action.card !== advised.card) {
		const trump = s.trump!;
		const led = ledSuitE(s);
		if (led === null) return null;
		const winner = trickWinnerE(s);
		const winning = power(s.trick[winner]!, trump, led);
		const mine = power(action.card, trump, led);
		if (winner === partnerOf(seat) && mine > winning) return 'Your partner already had that trick won. Save your strong cards for tricks your side still needs.';
		if (mine < winning && power(advised.card, trump, led) < mine && legalEuchre(s, seat).includes(advised.card)) {
			return `You couldn't win that trick, so it's better to throw your weakest card and keep the ${label(action.card)}.`;
		}
		return null;
	}
	if ((action.type === 'order' || action.type === 'call') && advised.type === 'pass') {
		const trump = action.type === 'order' ? suitOf(s.upcard) : action.suit;
		if (strength(hand, trump) < 5.5) return `That's a thin hand to call: if your side wins fewer than three tricks you're euchred and they score 2.`;
	}
	if (action.type === 'pass' && (advised.type === 'order' || advised.type === 'call')) {
		const trump = advised.type === 'order' ? suitOf(s.upcard) : advised.suit;
		if (strength(hand, trump) >= 8.5) return `That hand was strong enough to call: ${holding(hand, trump)} in ${suitName(trump)}.`;
	}
	return null;
}
