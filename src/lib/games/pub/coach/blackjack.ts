import { RANK_NAME, rankOf } from '../../kit/cards/deck';
import { chooseAction } from '../ai';
import { basicMove, upValue, type BjMove } from '../bots/blackjack';
import { canDouble, canSplit, cardValue, total, type BlackjackAction, type BlackjackState } from '../rules/blackjack';
import type { Advice } from './types';

const upName = (v: number) => (v === 11 ? 'an ace' : v === 10 ? 'a ten-card' : v === 8 ? 'an 8' : `a ${v}`);
const weak = (up: number) => up >= 2 && up <= 6;

const MOVE_TITLE: Record<BjMove, string> = { hit: 'Hit', stand: 'Stand', double: 'Double down', split: 'Split' };

function moveWhy(s: BlackjackState, move: BjMove): string {
	const h = s.hands[s.active];
	const t = total(h.cards);
	const up = upValue(s);
	const upText = `Bert shows ${upName(up)}`;
	const bust = weak(up) ? `${upText}, a weak card: he has to draw to 17 and busts often from there` : `${upText}, a strong card: he’ll usually finish on 17 or better`;
	if (move === 'split') {
		const v = cardValue(h.cards[0]);
		if (v === 11) return 'Always split aces. Two hands starting on 11 each beat one clumsy soft 12.';
		if (v === 8) return 'Always split eights. A pair of eights is 16, the worst total in the game. Two hands starting on 8 do much better.';
		return `A pair of ${RANK_NAME[rankOf(h.cards[0])]}s is a poor total, and ${bust}. Splitting makes two hands, each with a fair start, against a dealer likely to stumble.`;
	}
	if (move === 'double') {
		if (t.soft) return `A soft ${t.sum} can’t bust with one more card, and ${bust}. Double your bet and take exactly one card.`;
		return `${t.sum} is a great total to draw to: any ten-card makes ${t.sum + 10}. ${up <= 9 && up !== 11 ? `${upText}, so you’re the favourite.` : ''} Double your bet and take exactly one card.`.replace(/\s+/g, ' ');
	}
	if (move === 'stand') {
		if (t.sum >= 17 && !t.soft) return `${t.sum} is strong enough. ${t.sum === 21 ? 'You can’t do better.' : t.sum === 20 ? 'Anything but an ace would bust you.' : `Anything bigger than a ${21 - t.sum} would bust you.`}`;
		if (t.soft) return `Soft ${t.sum} is a good hand. ${up >= 9 ? 'Drawing is more likely to spoil it than help, so stand.' : `${upText}, so stand and make him beat it.`}`;
		return `${t.sum} isn’t much, but one more card risks busting, and ${bust}. Stand and let him take the risk.`;
	}
	if (t.soft) return `A soft ${t.sum} can’t bust with one more card: the ace drops to 1 if it has to. Take a card and try to improve.`;
	if (t.sum <= 11) return `With ${t.sum} you can’t bust with one more card, so take one.`;
	if (weak(up)) return `${t.sum} against ${upName(up)} is a close call, but hitting wins slightly more often. Only a ten-card can bust you.`;
	return `${t.sum} won’t win by itself. ${upText}, so he’ll likely finish on 17 or more. Take a card, even though it might bust you.`;
}

export function blackjackAdvice(s: BlackjackState, seat: number, _names: string[], seed: number): Advice {
	const action = chooseAction({ state: s, seat, difficulty: 'hard', seed }) as BlackjackAction;
	if (action.type === 'bet') {
		return {
			action,
			cards: [],
			button: `bet-${action.amount}`,
			spot: null,
			title: `Bet ${action.amount}`,
			why: `Even perfect play leaves the house a small edge, so no betting system beats it. Keep your bets steady, about a tenth of your ${s.chips} chips, and you’ll see out all ten hands.`
		};
	}
	if (action.type === 'hit' || action.type === 'stand' || action.type === 'double' || action.type === 'split') {
		return { action, cards: [], button: action.type, spot: null, title: MOVE_TITLE[action.type], why: moveWhy(s, action.type) };
	}
	return { action, cards: [], button: null, spot: null, title: '', why: '' };
}

export function blackjackReview(s: BlackjackState, _seat: number, action: BlackjackAction, advice: Advice): string | null {
	const advised = advice.action as BlackjackAction;
	if (action.type === 'bet' && advised.type === 'bet') {
		if (action.amount >= advised.amount * 3 && action.amount * 3 > s.chips) return `That’s a big slice of your stack on one hand. A bad run could end your night early.`;
		return null;
	}
	if (advised.type === action.type || s.phase !== 'play') return null;
	const h = s.hands[s.active];
	const t = total(h.cards);
	const up = upValue(s);
	const chart = basicMove(h.cards, up, { double: canDouble(s), split: canSplit(s) });
	const hand = `${t.soft ? 'soft ' : ''}${t.sum}`;
	if (action.type === 'hit' && chart.move === 'stand') return `Basic strategy stands on ${hand} against ${upName(up)}. ${weak(up) ? 'Let Bert bust first.' : 'The extra card busts you too often.'}`;
	if (action.type === 'stand' && chart.move === 'hit') return `Basic strategy hits ${hand} against ${upName(up)}. Standing there loses more often than drawing.`;
	if (action.type === 'stand' && chart.move === 'double') return `That was a chance to double: ${hand} against ${upName(up)} is in your favour.`;
	if (chart.move === 'split') return `Basic strategy splits that pair against ${upName(up)}.`;
	if (action.type === 'split') return `Basic strategy doesn’t split that pair against ${upName(up)}.`;
	if (action.type === 'double') return `Doubling ${hand} against ${upName(up)} puts more chips in when you’re not the favourite.`;
	return null;
}
