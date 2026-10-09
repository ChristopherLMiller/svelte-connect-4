import { label, rankOf, suitOf, type Card } from '../../kit/cards/deck';
import { chooseAction } from '../ai';
import { PARTNER_SHARE, bestTrump, bidLimit, trumpPlans } from '../bots/pinochle';
import { isCounter, legalPinochle, meldOf, powerP, teamOf, winningSeatP, type PinochleAction, type PinochleState } from '../rules/pinochle';
import type { Advice } from './types';
import { list, suitName } from './words';

const ACE = 12;

function meldText(hand: Card[], suit: number) {
	const items = meldOf(hand, suit as 0 | 1 | 2 | 3);
	return items.length ? list(items.map((i) => `${i.name.toLowerCase()} (${i.points})`)) : 'no meld';
}

function playWhy(s: PinochleState, seat: number, c: Card, names: string[]) {
	const trump = s.trump!;
	const lead = s.trick[s.leader];
	const legal = legalPinochle(s, seat);
	const partner = names[(seat + 2) % 4];
	if (lead === null) {
		if (rankOf(c) === ACE && suitOf(c) !== trump) return `Lead your aces early: the ${label(c)} is the top card in ${suitName(suitOf(c))} and should win, with a counter in it.`;
		if (suitOf(c) === trump) return `Your side has the bid and you hold plenty of trump. Leading the ${label(c)} pulls the other side’s trumps so your winners stay safe.`;
		return `Nothing here is a sure winner, so lead a low card that isn’t worth a point. The ${label(c)} gives nothing away.`;
	}
	const led = suitOf(lead);
	const w = winningSeatP(s)!;
	const top = s.trick[w]!;
	const forced = legal.length < s.hands[seat].length;
	const rule = forced ? (suitOf(c) === led ? 'You must follow suit, and beat the winning card if you can. ' : suitOf(c) === trump ? 'You can’t follow suit, so you must trump. ' : '') : '';
	if (teamOf(w) === teamOf(seat)) {
		if (isCounter(c)) return `${rule}${partner} is winning this trick, so give them a counter: the ${label(c)} is worth a point to your side.`;
		return `${rule}${partner} is winning, but you have no counters to spare. Play low.`;
	}
	if (powerP(c, led, trump) > powerP(top, led, trump)) return `${rule}The ${label(c)} wins the trick${s.trick.filter((x) => x !== null).length === 3 ? ', and you’re last to play, so it’s safe' : ''}. Take it and the counters in it.`;
	return `${rule}You can’t beat the ${label(top)}, so throw your least valuable card. The ${label(c)} ${isCounter(c) ? 'is the cheapest you have' : 'isn’t worth a point'}.`;
}

export function pinochleAdvice(s: PinochleState, seat: number, names: string[], seed: number): Advice {
	const action = chooseAction({ state: s, seat, difficulty: 'hard', seed }) as PinochleAction;
	const hand = s.hands[seat];
	if (action.type === 'bid' || action.type === 'pass') {
		const plan = bestTrump(hand);
		const limit = bidLimit(s, seat, 'hard');
		const base = `With ${suitName(plan.suit)} as trump your meld is ${plan.meld} (${meldText(hand, plan.suit)}), and your cards should take about ${Math.round(plan.tricks)} counters. Your partner usually adds around ${PARTNER_SHARE}, so this hand is worth about ${limit}.`;
		if (action.type === 'pass') return { action, cards: [], button: 'pass', spot: null, title: 'Pass', why: `${base} ${s.high === null ? `That’s short of the minimum bid of 20` : `The bidding is already at ${s.high}`}, so let it go.` };
		return { action, cards: [], button: `bid-${action.bid}`, spot: null, title: `Bid ${action.bid}`, why: s.high === null && s.bids.filter((b) => b === 'pass').length === 3 ? `Everyone else passed, so you must bid. ${base}` : `${base} That’s enough to bid ${action.bid}.` };
	}
	if (action.type === 'trump') {
		const plans = trumpPlans(hand).sort((a, b) => b.total - a.total);
		const p = plans.find((x) => x.suit === action.suit)!;
		return { action, cards: hand.filter((c) => suitOf(c) === action.suit), button: `trump-${action.suit}`, spot: null, title: `Name ${suitName(action.suit)}`, why: `${suitName(action.suit)[0].toUpperCase()}${suitName(action.suit).slice(1)} give you ${p.meld} in meld (${meldText(hand, action.suit)}) and ${p.length} trumps to win tricks with. No other suit adds up to as much.` };
	}
	if (action.type === 'play') return { action, cards: [action.card], button: null, spot: null, title: `Play the ${label(action.card)}`, why: playWhy(s, seat, action.card, names) };
	return { action, cards: [], button: null, spot: null, title: '', why: '' };
}

export function pinochleReview(s: PinochleState, seat: number, action: PinochleAction, advice: Advice, names: string[]): string | null {
	const advised = advice.action as PinochleAction;
	if (action.type === 'bid' && advised.type === 'pass') return `That bid is more than the hand looks worth. If your side falls short, you lose the whole bid.`;
	if (action.type === 'trump' && advised.type === 'trump') {
		const plans = trumpPlans(s.hands[seat]);
		const a = plans.find((p) => p.suit === action.suit)!;
		const b = plans.find((p) => p.suit === advised.suit)!;
		if (b.total - a.total >= 4) return `${suitName(advised.suit)[0].toUpperCase()}${suitName(advised.suit).slice(1)} would have been worth about ${Math.round(b.total - a.total)} more between meld and tricks.`;
		return null;
	}
	if (action.type !== 'play' || advised.type !== 'play' || s.trump === null) return null;
	const lead = s.trick[s.leader];
	if (lead === null) {
		if (rankOf(advised.card) === ACE && suitOf(advised.card) !== s.trump && isCounter(action.card) && rankOf(action.card) !== ACE) return `Leading a counter that can be beaten hands points to the other side. The ${label(advised.card)} was a sure winner.`;
		return null;
	}
	const w = winningSeatP(s)!;
	if (teamOf(w) === teamOf(seat) && isCounter(advised.card) && !isCounter(action.card)) return `${names[(seat + 2) % 4]} was winning that trick. Giving them a counter adds a point for your side.`;
	if (teamOf(w) !== teamOf(seat) && isCounter(action.card) && !isCounter(advised.card)) return `The other side was winning that trick, so the ${label(action.card)} handed them a point.`;
	return null;
}
