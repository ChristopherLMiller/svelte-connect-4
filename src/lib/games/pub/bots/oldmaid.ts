import { sourceOf, type OldMaidAction, type OldMaidState } from '../rules/oldmaid';
import type { Difficulty } from '../types';
import { pick } from './shared';

/** Every card in the hand you draw from is face down, so a guess is all anyone has. */
export function oldMaidAi(s: OldMaidState, _seat: number, _difficulty: Difficulty, random: () => number): OldMaidAction {
	return { type: 'draw', card: pick(s.hands[sourceOf(s)], random) };
}
