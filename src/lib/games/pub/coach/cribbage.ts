import { fullDeck, label, pipValue, rankOf, suitOf, type Card } from '../../kit/cards/deck';
import { chooseAction, cribGuess } from '../ai';
import { pegPoints, scoreHand, total, type CribAction, type CribState, type ScoreItem } from '../rules/cribbage';
import type { Advice } from './types';
import { cards, list, plural, say } from './words';

/** What four kept cards score on their own, before any starter. */
function keepScore(keep: Card[]): ScoreItem[] {
	const items = scoreHand(keep.slice(0, 3), keep[3], false).filter((i) => i.kind !== 'flush' && i.kind !== 'nobs');
	if (keep.every((c) => suitOf(c) === suitOf(keep[0]))) items.push({ kind: 'flush', cards: keep, points: 4 });
	return items;
}

export function describe(items: ScoreItem[]) {
	const n = (kind: ScoreItem['kind']) => items.filter((i) => i.kind === kind);
	const parts: string[] = [];
	const fifteens = n('fifteen').length;
	if (fifteens) parts.push(fifteens === 1 ? 'a fifteen' : `${say(fifteens)} fifteens`);
	const pairs = n('pair').length;
	if (pairs) parts.push(pairs === 1 ? 'a pair' : pairs === 3 ? 'three of a kind' : pairs === 6 ? 'four of a kind' : `${say(pairs)} pairs`);
	const runs = n('run');
	if (runs.length) parts.push(runs.length === 1 ? `a run of ${say(runs[0].cards.length)}` : `${say(runs.length)} runs of ${say(runs[0].cards.length)}`);
	if (n('flush').length) parts.push('a flush');
	if (n('nobs').length) parts.push('his nobs');
	return `${list(parts)} (${plural(total(items), 'point')})`;
}

function averageWith(keep: Card[], hand: Card[]) {
	const starters = fullDeck().filter((c) => !hand.includes(c));
	let sum = 0;
	for (const st of starters) sum += total(scoreHand(keep, st, false));
	return sum / starters.length;
}

function throwValue(s: CribState, seat: number, thrown: Card[]) {
	const hand = s.hands[seat];
	const keep = hand.filter((c) => !thrown.includes(c));
	const avg = averageWith(keep, hand);
	return { keep, avg, value: avg + (seat === s.dealer ? 1 : -1) * cribGuess(thrown) };
}

function cribHelp(thrown: Card[]) {
	const [a, b] = thrown;
	const out: string[] = [];
	if (rankOf(a) === rankOf(b)) out.push('they’re a pair');
	if (pipValue(a) + pipValue(b) === 15) out.push('they make fifteen');
	if (thrown.some((c) => pipValue(c) === 5)) out.push('fives are the best crib cards');
	const gap = Math.abs(((rankOf(a) + 1) % 13) - ((rankOf(b) + 1) % 13));
	if (gap === 1 && rankOf(a) !== rankOf(b)) out.push('they sit next to each other for a run');
	return out;
}

function pegWhy(s: CribState, seat: number, card: Card, opp: string): { title: string; why: string } {
	const legal = s.hands[seat].filter((c) => s.count + pipValue(c) <= 31);
	const count = s.count + pipValue(card);
	const scored = pegPoints([...s.pile.map((p) => p.card), card], count);
	if (scored.points) {
		return { title: `Play the ${label(card)} for ${scored.points}`, why: `That makes ${list(scored.why)}. The count goes to ${count}.` };
	}
	const title = `Play the ${label(card)}`;
	const lines: string[] = [];
	if (s.count === 0) {
		if (pipValue(card) < 5) lines.push(`Leading a card under 5 means ${opp} can't reach 15 with a single card.`);
		else if (legal.some((c) => pipValue(c) === 5)) lines.push(`Don't lead your 5: ${opp}'s tens and face cards would make 15 for 2.`);
		else lines.push(`It's the safest lead you have. Try not to lead a 5, since so many cards are worth 10.`);
	}
	const risky = (n: number) => n === 5 || n === 21;
	if (s.count > 0 && !risky(count) && legal.some((c) => risky(s.count + pipValue(c)))) {
		lines.push(`It avoids leaving the count at 5 or 21, where any ten-card would score for ${opp}.`);
	}
	if (count >= 22 && count < 31) lines.push(`With the count at ${count}, ${opp} may not be able to play at all and will have to say Go.`);
	if (!lines.length) lines.push(`It takes the count to ${count} without handing ${opp} an easy fifteen, 31 or run.`);
	return { title, why: lines.join(' ') };
}

export function cribAdvice(s: CribState, seat: number, names: string[], seed: number): Advice {
	const action = chooseAction({ state: s, seat, difficulty: 'hard', seed }) as CribAction;
	const opp = names[1 - seat];
	if (action.type === 'discard') {
		const { keep, avg } = throwValue(s, seat, action.cards);
		const items = keepScore(keep);
		const lines: string[] = [];
		if (total(items)) lines.push(`Keeping ${cards(keep)} already scores ${describe(items)} before the starter is cut.`);
		else lines.push(`${cards(keep)} don't score together yet, but they give the starter card the best chance to help.`);
		lines.push(`On average this hand is worth about ${avg.toFixed(1)} points once the starter turns.`);
		const help = cribHelp(action.cards);
		if (seat === s.dealer) lines.push(`It's your crib, so those two still score for you${help.length ? `, and ${list(help)}` : ''}.`);
		else if (help.length) lines.push(`It's ${opp}'s crib. This throw gives them a little, but the cards you keep are worth more.`);
		else lines.push(`It's ${opp}'s crib, so throw cards that don't help each other: no fives, no pairs, nothing that adds to 15.`);
		return { action, cards: action.cards, button: 'confirm', spot: null, title: `Throw the ${label(action.cards[0])} and ${label(action.cards[1])}`, why: lines.join(' ') };
	}
	if (action.type === 'cut') {
		return {
			action,
			cards: [],
			button: 'cut',
			spot: 'cut',
			title: 'Cut the deck',
			why: `The cut turns up the starter: a fifth card that counts in both hands and the crib. If it's a jack, the dealer pegs 2 for "his heels".`
		};
	}
	if (action.type === 'play') {
		const { title, why } = pegWhy(s, seat, action.card, opp);
		return { action, cards: [action.card], button: null, spot: null, title, why };
	}
	return { action, cards: [], button: null, spot: null, title: '', why: '' };
}

export function cribReview(s: CribState, seat: number, action: CribAction, advice: Advice, names: string[]): string | null {
	const opp = names[1 - seat];
	const advised = advice.action as CribAction;
	if (action.type === 'discard' && advised.type === 'discard') {
		const mine = throwValue(s, seat, action.cards);
		const best = throwValue(s, seat, advised.cards);
		if (best.value - mine.value < 1.5) return null;
		const lines: string[] = [];
		if (best.avg > mine.avg) lines.push(`Keeping ${cards(mine.keep)} averages about ${mine.avg.toFixed(1)} points; ${cards(best.keep)} would have averaged ${best.avg.toFixed(1)}.`);
		else if (seat === s.dealer) lines.push(`Your hand averages a little more this way, but the ${cards(advised.cards)} would have been worth more in your own crib.`);
		else lines.push(`Your hand averages a little more this way, but the ${cards(action.cards)} give ${opp}'s crib a lot to work with.`);
		if (seat !== s.dealer && action.cards.some((c) => pipValue(c) === 5)) lines.push(`A 5 in ${opp}'s crib is a gift: any ten-card makes fifteen with it.`);
		else if (seat !== s.dealer && rankOf(action.cards[0]) === rankOf(action.cards[1])) lines.push(`Throwing a pair into ${opp}'s crib hands them 2 points for free.`);
		return lines.join(' ');
	}
	if (action.type === 'play' && advised.type === 'play' && action.card !== advised.card) {
		const pile = s.pile.map((p) => p.card);
		const got = pegPoints([...pile, action.card], s.count + pipValue(action.card)).points;
		const best = pegPoints([...pile, advised.card], s.count + pipValue(advised.card));
		if (best.points > got) return `The ${label(advised.card)} would have pegged ${best.points} (${list(best.why)}).`;
		const count = s.count + pipValue(action.card);
		const advisedCount = s.count + pipValue(advised.card);
		if ((count === 5 || count === 21) && advisedCount !== 5 && advisedCount !== 21) {
			return `That leaves the count at ${count}: any ten-card lets ${opp} make ${count === 5 ? 'fifteen' : '31'} for 2.`;
		}
		if (s.count === 0 && pipValue(action.card) === 5) return `Leading a 5 is risky: ${opp} makes fifteen with any ten, jack, queen or king.`;
	}
	return null;
}
