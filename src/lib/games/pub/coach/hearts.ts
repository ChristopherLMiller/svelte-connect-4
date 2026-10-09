import { ACE, HEARTS, JACK, KING, QUEEN, SPADES, SUIT_SINGULAR, card as card_, label, rankOf, suitOf, type Card } from '../../kit/cards/deck';
import { chooseAction } from '../ai';
import { QUEEN_OF_SPADES, ledSuit, legalHearts, pointsOf, trickWinner, type HeartsAction, type HeartsState } from '../rules/hearts';
import type { Advice } from './types';
import { cards, plural, suitName, suitOne } from './words';

function passWhy(hand: Card[], pass: Card[]) {
	const lines: string[] = [];
	const lowSpades = hand.filter((c) => suitOf(c) === SPADES && rankOf(c) < QUEEN).length;
	if (pass.includes(QUEEN_OF_SPADES)) lines.push('The queen of spades costs 13 points, so passing it keeps it out of your tricks.');
	else if (hand.includes(QUEEN_OF_SPADES)) lines.push(`Keep the queen of spades: with ${plural(lowSpades, 'low spade')} to play first, you can stay out of trouble with it.`);
	const bigSpades = pass.filter((c) => suitOf(c) === SPADES && rankOf(c) > QUEEN);
	if (bigSpades.length) lines.push(`The ${cards(bigSpades)} can get stuck winning the trick the queen is thrown on.`);
	const bigHearts = pass.filter((c) => suitOf(c) === HEARTS && rankOf(c) >= JACK);
	if (bigHearts.length) lines.push(`High hearts like the ${cards(bigHearts)} tend to win tricks full of hearts.`);
	const left = hand.filter((c) => !pass.includes(c));
	for (const suit of [0, 1, 3] as const) {
		if (hand.some((c) => suitOf(c) === suit) && !left.some((c) => suitOf(c) === suit)) {
			lines.push(`It also empties your ${suitName(suit)}, so when someone leads them you can throw away points.`);
			break;
		}
	}
	if (!lines.length) lines.push('High cards win tricks, and winning tricks is how you collect points. Pass the highest ones.');
	return lines.slice(0, 3).join(' ');
}

function playWhy(s: HeartsState, seat: number, card: Card, names: string[]) {
	const led = ledSuit(s);
	const hand = s.hands[seat];
	const queenOut = !s.played.some((p) => p.card === QUEEN_OF_SPADES) && !s.trick.includes(QUEEN_OF_SPADES);
	const others = s.taking.filter((_, i) => i !== seat);
	if (s.taking[seat] > 0 && others.every((t) => t === 0) && s.trickNo >= 6) {
		return 'You’ve taken every point so far, so Rosie is going for the moon: win the rest and everyone else takes 26!';
	}
	const bigSpadesLeft = [KING, ACE].some((r) => !s.played.some((p) => p.card === card_(SPADES, r)) && !hand.includes(card_(SPADES, r)));
	const topSpade = Math.max(-1, ...s.trick.filter((c): c is Card => c !== null && suitOf(c) === SPADES).map(rankOf));
	if (card === QUEEN_OF_SPADES && bigSpadesLeft && (led === null || led === SPADES) && topSpade < QUEEN) {
		return 'A gamble: someone after you still holds the ace or king of spades and may have to play it and take the queen.';
	}
	if (led === null) {
		if (s.trickNo === 0) return 'The two of clubs always starts the first trick.';
		if (suitOf(card) === SPADES && rankOf(card) < QUEEN && queenOut && !hand.includes(QUEEN_OF_SPADES)) {
			return 'Leading a low spade is a classic move: it pushes the queen of spades out, and your low card won’t be the one that wins it.';
		}
		if (rankOf(card) <= 5) return `Lead a low ${SUIT_SINGULAR[suitOf(card)]}: someone will almost always play higher and take the trick instead of you.`;
		if (suitOf(card) === HEARTS) return 'Hearts are broken, so you may lead them. This one is unlikely to win the trick.';
		return `It's the safest lead in your hand: cards in this suit are still out there to beat it.`;
	}
	const inTrick = s.trick.filter((c): c is Card => c !== null);
	const points = inTrick.reduce((t, c) => t + pointsOf(c), 0);
	const lead = s.trick.map((c, i) => (c !== null && suitOf(c) === led ? i : -1)).filter((i) => i >= 0);
	const top = lead.reduce((best, i) => (rankOf(s.trick[i]!) > rankOf(s.trick[best]!) ? i : best), lead[0]);
	const high = s.trick[top]!;
	const last = inTrick.length === 3;
	const pts = points ? ` and its ${plural(points, 'point')}` : '';
	if (suitOf(card) !== led) {
		if (card === QUEEN_OF_SPADES) return `You have no ${suitName(led)}, so you can play anything. Drop the queen of spades on ${names[top]}'s trick!`;
		if (suitOf(card) === HEARTS) return `You have no ${suitName(led)}, so it's a free chance to get rid of a heart${rankOf(card) >= JACK ? ', and high hearts are the most dangerous' : ''}.`;
		if (suitOf(card) === SPADES && rankOf(card) >= KING && queenOut) return `You have no ${suitName(led)}. Throw away the ${label(card)}: high spades can get stuck catching the queen.`;
		return `You have no ${suitName(led)}, so throw away a high card you'd otherwise have to win a trick with later.`;
	}
	if (card === QUEEN_OF_SPADES && rankOf(high) > QUEEN) return `${names[top]} played the ${label(high)}, which beats her, so drop the queen of spades now: 13 points to them!`;
	if (rankOf(card) < rankOf(high)) return `Play under the ${label(high)} so ${names[top]} keeps the trick${pts}.`;
	if (s.trickNo === 0) return `Nobody may throw points on the first trick, so it's a safe time to get rid of a high ${suitOne(led)}.`;
	if (last && points === 0) return `You're last and there are no points in this trick, so it's a free chance to get rid of your ${label(card)}.`;
	const legal = legalHearts(s, seat);
	const highest = legal.every((c) => rankOf(c) <= rankOf(card));
	if (legal.every((c) => rankOf(c) > rankOf(high))) {
		if (last && highest) return `Every ${suitOne(led)} you hold beats the ${label(high)}, so you take this trick anyway. Get rid of your highest one.`;
		const lowest = legal.every((c) => rankOf(c) >= rankOf(card));
		if (!last && lowest) return `Every ${suitOne(led)} you hold beats the ${label(high)}, but the players after you may go higher. Your lowest one gives them the best chance to take it.`;
		if (!last && points === 0) return `Every ${suitOne(led)} you hold beats the ${label(high)}, and there are no points in it yet. Rosie spends a high one here, while the trick is still clean.`;
	}
	return `Rosie played this out a few dozen ways: taking the trick here costs you the least.`;
}

export function heartsAdvice(s: HeartsState, seat: number, names: string[], seed: number): Advice {
	const action = chooseAction({ state: s, seat, difficulty: 'hard', seed }) as HeartsAction;
	if (action.type === 'pass') {
		return { action, cards: action.cards, button: 'confirm', spot: null, title: `Pass the ${cards(action.cards)}`, why: passWhy(s.hands[seat], action.cards) };
	}
	if (action.type === 'play') {
		return { action, cards: [action.card], button: null, spot: null, title: `Play the ${label(action.card)}`, why: playWhy(s, seat, action.card, names) };
	}
	return { action, cards: [], button: null, spot: null, title: '', why: '' };
}

function wins(s: HeartsState, seat: number, card: Card) {
	const trick = s.trick.slice();
	trick[seat] = card;
	const lead = ledSuit(s);
	if (lead === null) return false;
	return trickWinner(trick, s.leader) === seat;
}

export function heartsReview(s: HeartsState, seat: number, action: HeartsAction, advice: Advice): string | null {
	const advised = advice.action as HeartsAction;
	if (action.type === 'pass' && advised.type === 'pass') {
		const hand = s.hands[seat];
		const kept = hand.filter((c) => !action.cards.includes(c));
		const lowSpades = kept.filter((c) => suitOf(c) === SPADES && rankOf(c) < QUEEN).length;
		if (kept.includes(QUEEN_OF_SPADES) && advised.cards.includes(QUEEN_OF_SPADES) && lowSpades < 3) {
			return `Holding the queen of spades with ${lowSpades ? `only ${plural(lowSpades, 'low spade')}` : 'no low spades'} to hide behind is risky: you may be forced to take her.`;
		}
		const avg = (cs: Card[]) => cs.reduce((t, c) => t + rankOf(c), 0) / cs.length;
		if (avg(advised.cards) - avg(action.cards) >= 4) return 'Low cards are your friends in Hearts: they let you duck under tricks. Pass your high cards instead.';
		return null;
	}
	if (action.type === 'play' && advised.type === 'play' && action.card !== advised.card) {
		const led = ledSuit(s);
		if (led === null) return null;
		const hand = s.hands[seat];
		const inTrick = s.trick.filter((c): c is Card => c !== null);
		const points = inTrick.reduce((t, c) => t + pointsOf(c), 0);
		if (suitOf(action.card) !== led && hand.includes(QUEEN_OF_SPADES) && action.card !== QUEEN_OF_SPADES && advised.card === QUEEN_OF_SPADES) {
			return `With no ${suitName(led)} you could have dropped the queen of spades on someone else's trick.`;
		}
		if (wins(s, seat, action.card) && !wins(s, seat, advised.card)) {
			if (action.card === QUEEN_OF_SPADES) return `The ${label(advised.card)} would have ducked under and kept the queen of spades out of your tricks.`;
			if (points > 0) return `The ${label(advised.card)} would have ducked under, leaving ${plural(points, 'point')} for someone else.`;
		}
	}
	return null;
}
