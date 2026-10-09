import type { ExtraAction, ExtraKind, ExtraState } from '../rules/registry';
import type { Difficulty } from '../types';
import { blackjackAi } from './blackjack';
import { eightsAi } from './eights';
import { freeCellAi } from './freecell';
import { goFishAi } from './gofish';
import { klondikeAi } from './klondike';
import { kingsAi } from './kings';
import { oldMaidAi } from './oldmaid';
import { pinochleAi } from './pinochle';
import { rummyAi } from './rummy';
import { spiderAi } from './spider';
import { ohHellAi } from './ohhell';

type Bot<S> = (s: S, seat: number, difficulty: Difficulty, random: () => number) => ExtraAction;

const BOTS: { [K in ExtraKind]: Bot<Extract<ExtraState, { kind: K }>> } = {
	ohhell: ohHellAi,
	eights: eightsAi,
	gofish: goFishAi,
	oldmaid: oldMaidAi,
	blackjack: blackjackAi,
	kings: kingsAi,
	rummy: rummyAi,
	pinochle: pinochleAi,
	klondike: klondikeAi,
	freecell: freeCellAi,
	spider: spiderAi
};

export function botFor(kind: ExtraKind): Bot<ExtraState> {
	return BOTS[kind] as Bot<ExtraState>;
}
