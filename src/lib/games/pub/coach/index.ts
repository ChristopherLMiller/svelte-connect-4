import { seededRandom } from '../../kit/cards/deck';
import type { PubAction, PubState } from '../ai';
import type { CribAction } from '../rules/cribbage';
import type { EuchreAction } from '../rules/euchre';
import type { GinAction } from '../rules/gin';
import type { HeartsAction } from '../rules/hearts';
import type { ExtraAction } from '../rules/registry';
import type { SpadesAction } from '../rules/spades';
import { cribAdvice, cribReview } from './cribbage';
import { euchreAdvice, euchreReview } from './euchre';
import { ginAdvice, ginReview } from './gin';
import { heartsAdvice, heartsReview } from './hearts';
import { coachFor } from './registry';
import { spadesAdvice, spadesReview } from './spades';
import type { Advice, CoachRequest } from './types';

export type { Advice, CoachButton, CoachRequest } from './types';

export function advise(request: CoachRequest): Advice {
	const { state, seat, names } = request;
	const seed = Math.floor(seededRandom(request.seed)() * 1e9);
	switch (state.kind) {
		case 'cribbage':
			return cribAdvice(state, seat, names, seed);
		case 'hearts':
			return heartsAdvice(state, seat, names, seed);
		case 'gin':
			return ginAdvice(state, seat, names, seed);
		case 'euchre':
			return euchreAdvice(state, seat, names, seed);
		case 'spades':
			return spadesAdvice(state, seat, names, seed);
		default:
			return coachFor(state.kind).advise(state, seat, names, seed);
	}
}

/** A gentle note when a move was clearly weaker than the advice, or null. */
export function review(state: PubState, seat: number, action: PubAction, advice: Advice, names: string[]): string | null {
	switch (state.kind) {
		case 'cribbage':
			return cribReview(state, seat, action as CribAction, advice, names);
		case 'hearts':
			return heartsReview(state, seat, action as HeartsAction, advice);
		case 'gin':
			return ginReview(state, seat, action as GinAction, advice, names);
		case 'euchre':
			return euchreReview(state, seat, action as EuchreAction, advice);
		case 'spades':
			return spadesReview(state, seat, action as SpadesAction, advice, names);
		default:
			return coachFor(state.kind).review(state, seat, action as ExtraAction, advice, names);
	}
}

function same(a: unknown, b: unknown): boolean {
	if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x) => b.some((y) => same(x, y)));
	if (a && b && typeof a === 'object' && typeof b === 'object') {
		const ka = Object.keys(a);
		return ka.length === Object.keys(b).length && ka.every((k) => same((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
	}
	return a === b;
}

/** Does this move match the advice? */
export function followed(action: PubAction, advice: Advice) {
	const a = advice.action as Record<string, unknown>;
	const b = action as Record<string, unknown>;
	return Object.keys(a).every((k) => same(a[k], b[k]));
}
