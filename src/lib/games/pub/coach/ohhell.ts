import { ACE, card as card_, label, rankOf, suitOf, type Card } from '../../kit/cards/deck';
import { chooseAction } from '../ai';
import { ohItems, ohTotal, type OhItem } from '../bots/ohhell';
import { handSize, hookBid, ledSuitO, legalOhHell, powerO, trumpOf, winningSeatO, type OhHellAction, type OhHellState } from '../rules/ohhell';
import type { Advice } from './types';
import { cards, list, plural, suitName, suitOne } from './words';

function itemText(item: OhItem, trumpName: string) {
	switch (item.kind) {
		case 'trump':
			return `the ${label(item.cards[0])} (a high trump)`;
		case 'length':
			return `small trumps (${cards(item.cards)}) once a suit runs out`;
		case 'ace':
			return `the ${label(item.cards[0])}`;
		case 'king':
			return `maybe the ${label(item.cards[0])}`;
		case 'void':
			return `an empty suit you can trump with ${trumpName}`;
	}
}

function bidWhy(s: OhHellState, seat: number, bid: number) {
	const n = handSize(s.handNo);
	const trump = trumpOf(s);
	const items = ohItems(s.hands[seat], trump, n).filter((i) => i.value >= 0.35);
	const total = ohTotal(ohItems(s.hands[seat], trump, n));
	const parts = items.slice(0, 4).map((i) => itemText(i, suitName(trump)));
	const count = parts.length ? `Count the cards likely to win: ${list(parts)}. That's about ${total.toFixed(1)} of the ${plural(n, 'trick')}.` : `Nothing here is likely to win a trick, so promise none and then duck everything.`;
	const hook = hookBid(s);
	const dealer = hook !== null ? ` You deal, so you bid last and can't say ${hook}: the bids may never add up to exactly ${n}, so somebody has to miss.` : '';
	const sum = s.bids.reduce<number>((t, b) => t + (b ?? 0), 0);
	const table = s.bids.some((b) => b !== null) && hook === null ? ` The table has bid ${sum} so far${sum > n ? ', more than there are tricks, so expect a scramble' : sum < n - 1 ? ', so spare tricks will be going round' : ''}.` : '';
	return `${count}${dealer}${table} Only an exact bid scores: 10 plus the bid.${bid === 0 ? ' A zero bid made is still worth 10.' : ''}`.replace(/\s+/g, ' ').trim();
}

function playWhy(s: OhHellState, seat: number, c: Card, names: string[]) {
	const trump = trumpOf(s);
	const need = s.bids[seat]! - s.tricks[seat];
	const led = ledSuitO(s);
	const gone = (x: Card) => s.played.some((p) => p.card === x) || s.hands[seat].includes(x);
	const boss = (x: Card) => {
		for (let r = rankOf(x) + 1; r <= ACE; r++) if (!gone(card_(suitOf(x), r))) return false;
		return true;
	};
	const needLine =
		need > 0
			? `You still need ${plural(need, 'trick')}.`
			: need === 0
				? 'You have exactly what you bid, so every trick from here would spoil it.'
				: 'You’re already over your bid, so this hand can’t score for you now.';
	if (led === null) {
		if (need < 0) return `${needLine} Lead whatever you’d least like to be stuck with later.`;
		if (need === 0) return `${needLine} Lead your lowest card and let someone else win.`;
		if (boss(c)) return `The ${label(c)} is the highest ${suitOne(suitOf(c))} still out, so it should win.${suitOf(c) === trump ? '' : ` Unless someone has run out of ${suitName(suitOf(c))} and trumps it.`} ${needLine}`;
		if (rankOf(c) >= 9) return `The ${label(c)} has a fair chance of winning while the higher ${suitName(suitOf(c))} may still be sitting in other hands. ${needLine}`;
		return `Nothing in your hand is sure to win yet, so lead low and keep your strength for later. ${needLine}`;
	}
	const w = winningSeatO(s)!;
	const top = s.trick[w]!;
	const beats = powerO(c, led, trump) > powerO(top, led, trump);
	const last = s.trick.filter((x) => x !== null).length === 3;
	if (need > 0) {
		if (beats) {
			if (suitOf(c) === trump && led !== trump) return `You're out of ${suitName(led)}, so trump in: the ${label(c)} wins it unless someone trumps higher. ${needLine}`;
			if (last) return `You're last to play, so the ${label(c)} wins it as cheaply as possible. ${needLine}`;
			if (boss(c)) return `The ${label(c)} beats the ${label(top)}, and nothing higher in ${suitName(suitOf(c))} is still out. ${needLine}`;
			return `The ${label(c)} beats the ${label(top)}. Someone after you may go over it, but you need the trick and it's your best shot. ${needLine}`;
		}
		return `You can't beat the ${label(top)} that ${names[w]} played, so throw your least useful card. ${needLine}`;
	}
	if (!beats) return `${needLine} The ${label(c)} stays under the ${label(top)}, and it's the highest card you can lose with, which gets a dangerous card out of your hand.`;
	return `${needLine} Every card you hold wins this one, so ${last ? 'take it with your highest and keep low cards for later.' : 'play your lowest and hope someone goes over it.'}`;
}

export function ohHellAdvice(s: OhHellState, seat: number, names: string[], seed: number): Advice {
	const action = chooseAction({ state: s, seat, difficulty: 'hard', seed }) as OhHellAction;
	if (action.type === 'bid') return { action, cards: [], button: `bid-${action.bid}`, spot: null, title: `Bid ${action.bid}`, why: bidWhy(s, seat, action.bid) };
	if (action.type === 'play') return { action, cards: [action.card], button: null, spot: null, title: `Play the ${label(action.card)}`, why: playWhy(s, seat, action.card, names) };
	return { action, cards: [], button: null, spot: null, title: '', why: '' };
}

export function ohHellReview(s: OhHellState, seat: number, action: OhHellAction, advice: Advice): string | null {
	const advised = advice.action as OhHellAction;
	if (action.type === 'bid' && advised.type === 'bid') {
		const est = Math.round(ohTotal(ohItems(s.hands[seat], trumpOf(s), handSize(s.handNo))));
		if (action.bid - est >= 2) return `Rosie counted about ${est} likely tricks. Bidding ${action.bid} means winning cards you may not have, and a miss scores nothing.`;
		if (est - action.bid >= 2) return `Rosie counted about ${est} likely tricks. With a bid of ${action.bid} you'll have to throw away good cards to avoid winning.`;
		return null;
	}
	if (action.type !== 'play' || advised.type !== 'play' || !legalOhHell(s, seat).includes(action.card)) return null;
	const led = ledSuitO(s);
	const trump = trumpOf(s);
	const need = s.bids[seat]! - s.tricks[seat];
	if (led === null) {
		const weight = (c: Card) => (suitOf(c) === trump ? 20 : 0) + rankOf(c);
		if (need === 0 && weight(action.card) - weight(advised.card) >= 4 && rankOf(action.card) >= 9) return `You'd already made your bid, so leading the ${label(action.card)} invites a trick you don't want. The ${label(advised.card)} was safer.`;
		if (need > 0 && rankOf(advised.card) === ACE && weight(action.card) < weight(advised.card)) return `You still needed tricks, and the ${label(advised.card)} was a likely winner to lead.`;
		return null;
	}
	const top = powerO(s.trick[winningSeatO(s)!]!, led, trump);
	const mine = powerO(action.card, led, trump) > top;
	const theirs = powerO(advised.card, led, trump) > top;
	if (need <= 0 && mine && !theirs) return `You'd already made your bid, so winning that trick puts you over. The ${label(advised.card)} would have stayed under.`;
	if (need > 0 && theirs && !mine) return `You still needed ${plural(need, 'trick')}, and the ${label(advised.card)} would have won this one.`;
	return null;
}
