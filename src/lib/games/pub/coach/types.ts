import type { Card } from '../../kit/cards/deck';
import type { PubAction, PubState } from '../ai';

/** Prompt buttons the coach can point at. Card moves point at cards instead. */
export type CoachButton =
	| 'confirm'
	| 'cut'
	| 'take'
	| 'pass'
	| 'draw'
	| 'knock'
	| 'bigGin'
	| 'order'
	| 'alone'
	| 'call-0'
	| 'call-1'
	| 'call-2'
	| 'call-3'
	| 'defend'
	| 'defend-alone'
	| 'swap'
	| 'keep'
	| `bid-${number}`
	| (string & {});

export type Advice = {
	action: PubAction;
	/** Cards to tap (both crib cards, all three passes, or the one card to play). */
	cards: Card[];
	button: CoachButton | null;
	/** A place on the felt to tap: the stock, the discard pile, the deck to cut, a column. */
	spot: string | null;
	title: string;
	why: string;
};

export type CoachRequest = { state: PubState; seat: number; names: string[]; seed: number };
