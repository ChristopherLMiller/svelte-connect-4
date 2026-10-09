import { SPADES, card as card_, label, rankOf, suitOf, type Card } from '../../kit/cards/deck';
import { chooseAction } from '../ai';
import { bidItems, bidTotal, nilSafe, type BidItem } from '../bots/spades';
import { contractOf, ledSuitS, legalSpades, partnerOfS, powerS, teamOfS, teamTricks, winningSeat, type SpadesAction, type SpadesState } from '../rules/spades';
import type { Advice, CoachButton } from './types';
import { cards, counted, list, plural, suitName, suitOne } from './words';

function itemText(item: BidItem) {
	switch (item.kind) {
		case 'trump':
			return `the ${label(item.cards[0])}`;
		case 'ace':
			return `the ${label(item.cards[0])}`;
		case 'king':
			return `the ${label(item.cards[0])}`;
		case 'queen':
			return `maybe the ${label(item.cards[0])}`;
		case 'length':
			return `your extra spades (${cards(item.cards)}) once the others run out`;
		case 'void':
			return 'having no cards in a suit, so you can trump it';
		case 'short':
			return `the lone ${label(item.cards[0])}, which leaves you free to trump that suit soon`;
	}
}

function bidWhy(s: SpadesState, seat: number, bid: number, names: string[]) {
	const hand = s.hands[seat];
	const partner = partnerOfS(seat);
	const pb = s.bids[partner];
	const partnerLine = pb === null ? `${names[partner]} bids after you, and your two bids add together.` : pb === 0 ? `${names[partner]} bid nil, so your bid is your side's whole contract.` : `${names[partner]} bid ${pb}, so together you'd need ${pb + bid} tricks.`;
	if (bid === 0) {
		return `Nil means promising to take no tricks at all: 100 points if you manage it, minus 100 if you don't. Your hand has no aces, no high spades and enough low cards to duck under every trick. ${partnerLine}`;
	}
	const items = bidItems(hand).filter((i) => i.value >= 0.4);
	const total = bidTotal(bidItems(hand));
	const sure = items.slice(0, 4).map(itemText);
	const counted_ = sure.length ? `Count the cards likely to win a trick: ${list(sure)}. That's about ${total.toFixed(1)} tricks.` : 'This hand has very few winners, but a bid of at least one is safer than nil here.';
	const spades = hand.filter((c) => suitOf(c) === SPADES).length;
	const trump = spades >= 4 ? ` Spades always win over other suits, and ${counted(spades, 'spade')} gives you plenty of trumping power.` : '';
	return `${counted_}${trump} ${partnerLine}`;
}

function playWhy(s: SpadesState, seat: number, c: Card, names: string[]) {
	const team = teamOfS(seat);
	const partner = partnerOfS(seat);
	const need = contractOf(s, team) - teamTricks(s, team);
	const clean = (p: number) => s.bids[p] === 0 && s.tricks[p] === 0;
	const led = ledSuitS(s);
	const hand = s.hands[seat];
	const gone = (x: Card) => s.played.some((p) => p.card === x) || hand.includes(x);
	const boss = (x: Card) => {
		for (let r = rankOf(x) + 1; r <= 12; r++) if (!gone(card_(suitOf(x), r))) return false;
		return true;
	};
	if (led === null) {
		if (clean(seat)) return 'You bid nil, so lead your lowest card: someone else will almost certainly play higher and take it.';
		if (clean(partner)) return `${names[partner]} bid nil. Lead high so you win the trick and they can safely play under you.`;
		if (need <= 0) return 'Your side has already made its bid. Any extra trick is a bag, and ten bags cost 100, so lead low and let others win.';
		if (boss(c)) {
			return suitOf(c) === SPADES
				? `Spades are trump and the ${label(c)} is the highest one left, so it can't lose. ${need > 1 ? `Your side still needs ${plural(need, 'trick')}.` : 'That should finish your bid.'}`
				: `The ${label(c)} is the highest ${suitOne(suitOf(c))} still out, so it should win a trick toward your bid as long as nobody can trump it.`;
		}
		const same = hand.filter((x) => suitOf(x) === suitOf(c)).length;
		const sideCounts = [0, 1, 3].map((x) => hand.filter((y) => suitOf(y) === x).length).filter((n) => n > 0);
		if (suitOf(c) !== SPADES && same <= Math.min(...sideCounts) && hand.some((x) => suitOf(x) === SPADES)) {
			return `Lead low from your short ${suitName(suitOf(c))}: once you've none left, you can trump that suit with a spade.`;
		}
		if (!s.spadesBroken && suitOf(c) !== SPADES) return 'A low lead gives nothing away. Spades can’t be led until someone has trumped with one.';
		return 'A low lead is safe: it gives nothing away while your partner and your high cards do the winning.';
	}
	const w = winningSeat(s)!;
	const top = s.trick[w]!;
	const beats = powerS(c, led) > powerS(top, led);
	const last = s.trick.filter((x) => x !== null).length === 3;
	const follows = suitOf(c) === led;
	if (clean(seat)) {
		if (!beats) return `You bid nil, so stay under: the ${label(c)} loses to the ${label(top)}. Getting rid of your highest safe card now makes later tricks easier to duck.`;
		return `Every card you can play beats the ${label(top)}, so your nil is in trouble. ${last ? 'You take it either way, so throw your highest card.' : 'Play your lowest winner and hope someone goes over it.'}`;
	}
	if (clean(partner) && beats) {
		return w === partner
			? `${names[partner]} bid nil and is winning this trick, which would break it. Overtake them with the ${label(c)}.`
			: `${names[partner]} bid nil and plays after you. Win the trick with a high card so they can safely play under it.`;
	}
	if (w === partner && !beats) return `${names[partner]} is already winning this trick, so save your good cards and play your lowest.`;
	if (clean(w) && !beats) return `${names[w]} bid nil and is winning this trick. Play under them so they're stuck with it and lose their 100.`;
	if (beats) {
		const why = need > 0 ? `Your side still needs ${plural(need, 'trick')}.` : '';
		if (!follows && suitOf(c) === SPADES) return `You have no ${suitName(led)}, so trump in with a spade: the ${label(c)} wins the trick. ${why}`.trim();
		if (last) return `You're last to play, so win with the cheapest card that does it: the ${label(c)}. ${why}`.trim();
		return `The ${label(c)} beats the ${label(top)}, and it's high enough that the players after you may not get over it. ${why}`.trim();
	}
	if (need <= 0) return `Your side has made its bid, so duck: an extra trick is a bag, and ten bags cost 100.`;
	if (!follows) return `You can't follow ${suitName(led)} and trumping isn't worth it here, so throw away a low card you don't need.`;
	return `You can't beat the ${label(top)}, so play your lowest ${suitOne(led)} and keep your good cards for later.`;
}

export function spadesAdvice(s: SpadesState, seat: number, names: string[], seed: number): Advice {
	const action = chooseAction({ state: s, seat, difficulty: 'hard', seed }) as SpadesAction;
	if (action.type === 'bid') {
		return {
			action,
			cards: [],
			button: `bid-${action.bid}` as CoachButton,
			spot: null,
			title: action.bid === 0 ? 'Bid nil' : `Bid ${action.bid}`,
			why: bidWhy(s, seat, action.bid, names)
		};
	}
	if (action.type === 'play') {
		return { action, cards: [action.card], button: null, spot: null, title: `Play the ${label(action.card)}`, why: playWhy(s, seat, action.card, names) };
	}
	return { action, cards: [], button: null, spot: null, title: '', why: '' };
}

function wins(s: SpadesState, c: Card) {
	const led = ledSuitS(s);
	if (led === null) return false;
	const w = winningSeat(s)!;
	return powerS(c, led) > powerS(s.trick[w]!, led);
}

export function spadesReview(s: SpadesState, seat: number, action: SpadesAction, advice: Advice, names: string[]): string | null {
	const advised = advice.action as SpadesAction;
	if (action.type === 'bid' && advised.type === 'bid') {
		const hand = s.hands[seat];
		const est = Math.round(bidTotal(bidItems(hand)));
		if (action.bid === 0 && !nilSafe(hand)) {
			const risky = hand.filter((c) => rankOf(c) === 12 || (suitOf(c) === SPADES && rankOf(c) >= 9));
			return `Nil is risky with ${risky.length ? `the ${cards(risky.slice(0, 3))}` : 'this hand'}: a high card can be forced to win a trick, costing your side 100.`;
		}
		if (advised.bid === 0 || action.bid === 0) return null;
		if (action.bid - est >= 2) return `Rosie counted about ${est} likely tricks. Bidding ${action.bid} means finding extra ones, and falling short costs your side 10 points per trick bid.`;
		if (est - action.bid >= 2) return `Rosie counted about ${est} likely tricks. Bidding ${action.bid} means the extras only count as bags, and every ten bags cost 100.`;
		return null;
	}
	if (action.type !== 'play' || advised.type !== 'play' || action.card === advised.card) return null;
	if (!legalSpades(s, seat).includes(action.card)) return null;
	const team = teamOfS(seat);
	const partner = partnerOfS(seat);
	const need = contractOf(s, team) - teamTricks(s, team);
	const w = winningSeat(s);
	const mine = wins(s, action.card);
	const theirs = wins(s, advised.card);
	if (s.bids[seat] === 0 && s.tricks[seat] === 0 && mine && !theirs) return `You bid nil, and the ${label(action.card)} wins the trick. The ${label(advised.card)} would have stayed under.`;
	if (w === partner && mine && !theirs && s.bids[partner] !== 0) return `${names[partner]} was already winning that trick, so the ${label(action.card)} spent a good card for nothing.`;
	if (need <= 0 && mine && !theirs) return `Your side had already made its bid, so that trick is a bag. Ten bags cost 100.`;
	if (need > 0 && theirs && !mine && w !== partner) return `Your side still needed ${plural(need, 'trick')}, and the ${label(advised.card)} would have won this one.`;
	return null;
}
