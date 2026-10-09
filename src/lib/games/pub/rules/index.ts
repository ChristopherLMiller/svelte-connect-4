import type { PubAction, PubState } from '../ai';
import type { Variant } from '../types';
import { applyCribbage, cribActor, dealCribbage, newCribbage } from './cribbage';
import { applyEuchre, dealEuchre, euchreActor, newEuchre } from './euchre';
import { applyGin, dealGin, ginActor, newGin } from './gin';
import { applyHearts, dealHearts, heartsActor, newHearts } from './hearts';
import { rulesOf, type ExtraAction, type ExtraKind } from './registry';
import { applySpades, dealSpades, newSpades, spadesActor } from './spades';
import type { TableOptions } from './types';

export type { TableOptions } from './types';

export function startGame(variant: Variant, options: TableOptions, random: () => number): PubState {
	if (variant === 'cribbage') return dealCribbage(newCribbage(121, random() < 0.5 ? 0 : 1), random, true);
	if (variant === 'hearts') return dealHearts(newHearts(100), random);
	if (variant === 'gin') return dealGin(newGin(100, random() < 0.5 ? 0 : 1), random, false, true);
	if (variant === 'spades') return dealSpades(newSpades(300, Math.floor(random() * 4)), random);
	if (variant === 'euchre') return dealEuchre(newEuchre({ target: options.euchreTarget, stick: options.stick }, Math.floor(random() * 4)), random);
	return rulesOf(variant as ExtraKind).start(options, random);
}

export function actorOf(state: PubState): number | null {
	switch (state.kind) {
		case 'cribbage':
			return cribActor(state);
		case 'hearts':
			return heartsActor(state);
		case 'gin':
			return ginActor(state);
		case 'euchre':
			return euchreActor(state);
		case 'spades':
			return spadesActor(state);
		default:
			return rulesOf(state.kind).actor(state);
	}
}

export function applyAction(state: PubState, action: PubAction, random: () => number = Math.random): PubState {
	switch (state.kind) {
		case 'cribbage':
			return applyCribbage(state, action as never, random);
		case 'hearts':
			return applyHearts(state, action as never, random);
		case 'gin':
			return applyGin(state, action as never, random);
		case 'euchre':
			return applyEuchre(state, action as never, random);
		case 'spades':
			return applySpades(state, action as never, random);
		default:
			return rulesOf(state.kind).apply(state, action as ExtraAction, random);
	}
}

export function isOver(state: PubState) {
	if (state.kind === 'cribbage') return state.winner !== null;
	return state.phase === 'over';
}

/** A pause the table moves past by itself (a finished trick on show). */
export function autoPhase(state: PubState) {
	switch (state.kind) {
		case 'hearts':
		case 'euchre':
		case 'spades':
			return state.phase === 'trick';
		case 'cribbage':
		case 'gin':
			return false;
		default:
			return rulesOf(state.kind).auto?.(state) ?? false;
	}
}

/** Seats that won, for records. Euchre and team games return every seat on the winning team. */
export function winnersOf(state: PubState): number[] {
	switch (state.kind) {
		case 'cribbage':
			return state.winner === null ? [] : [state.winner];
		case 'gin':
			return state.winner === null ? [] : [state.winner];
		case 'hearts':
			return state.winners;
		case 'euchre':
		case 'spades':
			return state.winner === null ? [] : [state.winner, state.winner + 2];
		default:
			return rulesOf(state.kind).winners(state);
	}
}
