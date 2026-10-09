import { RANK_NAME, rankOf } from '../../kit/cards/deck';
import { chooseAction } from '../ai';
import { fishPlan, saidNo, shownRanks } from '../bots/gofish';
import { countRank, type GoFishAction, type GoFishState } from '../rules/gofish';
import type { Advice } from './types';
import { counted } from './words';

export const RANK_PLURAL = ['twos', 'threes', 'fours', 'fives', 'sixes', 'sevens', 'eights', 'nines', 'tens', 'jacks', 'queens', 'kings', 'aces'];

function lastAsk(s: GoFishState, seat: number, rank: number) {
	for (let i = s.log.length - 1; i >= 0; i--) if (s.log[i].seat === seat && s.log[i].rank === rank) return s.log.length - i;
	return null;
}

export function goFishAdvice(s: GoFishState, seat: number, names: string[], seed: number): Advice {
	const action = chooseAction({ state: s, seat, difficulty: 'hard', seed }) as GoFishAction;
	if (action.type !== 'ask') return { action, cards: [], button: null, spot: null, title: '', why: '' };
	const { target, rank } = action;
	const plan = fishPlan(s, seat);
	const have = countRank(s.hands[seat], rank);
	const who = names[target];
	const cards = s.hands[seat].filter((c) => rankOf(c) === rank);
	let why: string;
	if (plan.known) {
		const ago = lastAsk(s, target, rank);
		const when = ago === 1 ? 'just now' : ago !== null && ago <= 4 ? 'a moment ago' : 'earlier';
		why = `${who} asked for ${RANK_PLURAL[rank]} ${when}, so they must be holding at least one. You hold ${counted(have, RANK_NAME[rank], RANK_PLURAL[rank])} yourself, so ask them and they have to hand theirs over.`;
		if (have === 3) why += ' That would complete a book.';
	} else {
		const no = saidNo(s, rank);
		why = `Nobody has shown any ${RANK_PLURAL[rank]} yet. You hold ${counted(have, 'of them', 'of them')}, ${have > 1 ? 'your best chance at a book' : 'as good a guess as any'}.`;
		const n = s.hands[target].length;
		const tied = s.hands.some((h, i) => i !== seat && i !== target && h.length === n);
		why += tied ? ` ${who} has ${n} cards, as many as anyone, so is as likely as any to have one.` : ` ${who} has the most cards (${n}), so is likeliest to have one.`;
		if (no.size) why += ` Skip ${[...no].map((n) => names[n]).join(' and ')}: they said “go fish” for ${RANK_PLURAL[rank]} and haven't drawn since.`;
	}
	return { action, cards, button: `ask-${target}`, spot: null, title: `Ask ${who} for ${RANK_PLURAL[rank]}`, why };
}

export function goFishReview(s: GoFishState, seat: number, action: GoFishAction, advice: Advice, names: string[]): string | null {
	const advised = advice.action as GoFishAction;
	if (action.type !== 'ask' || advised.type !== 'ask') return null;
	const shown = shownRanks(s);
	if (shown[advised.target].has(advised.rank) && !shown[action.target].has(action.rank)) return `${names[advised.target]} had asked for ${RANK_PLURAL[advised.rank]}, so asking them was a sure thing.`;
	if (saidNo(s, action.rank).has(action.target)) return `${names[action.target]} already said “go fish” for ${RANK_PLURAL[action.rank]} and hasn't drawn since, so they can't have any.`;
	return null;
}
