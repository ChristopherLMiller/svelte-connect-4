import type { PubAction, PubState } from '../ai';
import type { Variant } from '../types';
import { applyCribbage, cribActor, dealCribbage, newCribbage } from './cribbage';
import { applyEuchre, dealEuchre, euchreActor, newEuchre } from './euchre';
import { applyGin, dealGin, ginActor, newGin } from './gin';
import { applyHearts, dealHearts, heartsActor, newHearts } from './hearts';

export type TableOptions = { euchreTarget: number; stick: boolean };

export function startGame(variant: Variant, options: TableOptions, random: () => number): PubState {
	if (variant === 'cribbage') return dealCribbage(newCribbage(121, random() < 0.5 ? 0 : 1), random, true);
	if (variant === 'hearts') return dealHearts(newHearts(100), random);
	if (variant === 'gin') return dealGin(newGin(100, random() < 0.5 ? 0 : 1), random, false, true);
	return dealEuchre(newEuchre({ target: options.euchreTarget, stick: options.stick }, Math.floor(random() * 4)), random);
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
	}
}

export function isOver(state: PubState) {
	if (state.kind === 'cribbage') return state.winner !== null;
	return state.phase === 'over';
}

/** A pause the table moves past by itself (a finished trick on show). */
export function autoPhase(state: PubState) {
	return (state.kind === 'hearts' || state.kind === 'euchre') && state.phase === 'trick';
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
			return state.winner === null ? [] : [state.winner, state.winner + 2];
	}
}
