import type { PubState } from '../ai';
import type { Lesson } from '../lessons';
import { isExtra, type ExtraKind, type ExtraState } from '../rules/registry';
import type { Variant } from '../types';
import { BLACKJACK_VIEW } from './blackjack';
import { EIGHTS_VIEW } from './eights';
import { FREECELL_VIEW } from './freecell';
import { GO_FISH_VIEW } from './gofish';
import { KLONDIKE_VIEW } from './klondike';
import { KINGS_VIEW } from './kings';
import { PINOCHLE_VIEW } from './pinochle';
import { RUMMY_VIEW } from './rummy';
import { SPIDER_VIEW } from './spider';
import { OLD_MAID_VIEW } from './oldmaid';
import { OH_HELL_VIEW } from './ohhell';
import type { GameView } from './types';

const VIEWS: { [K in ExtraKind]: GameView<Extract<ExtraState, { kind: K }>> } = {
	ohhell: OH_HELL_VIEW,
	eights: EIGHTS_VIEW,
	gofish: GO_FISH_VIEW,
	oldmaid: OLD_MAID_VIEW,
	blackjack: BLACKJACK_VIEW,
	kings: KINGS_VIEW,
	rummy: RUMMY_VIEW,
	pinochle: PINOCHLE_VIEW,
	klondike: KLONDIKE_VIEW,
	freecell: FREECELL_VIEW,
	spider: SPIDER_VIEW
};

/** The view for a table added after the first five, or null for those five. */
export function viewOf(s: PubState): GameView<PubState> | null {
	return isExtra(s) ? (VIEWS[s.kind] as unknown as GameView<PubState>) : null;
}

export function viewForVariant(variant: Variant): GameView<ExtraState> | null {
	return variant in VIEWS ? (VIEWS[variant as ExtraKind] as unknown as GameView<ExtraState>) : null;
}

export function extraLessons() {
	return Object.fromEntries(Object.entries(VIEWS).map(([k, v]) => [k, v.lesson])) as Record<ExtraKind, Lesson>;
}

export function extraTips() {
	return Object.fromEntries(Object.entries(VIEWS).map(([k, v]) => [k, v.tips])) as Record<ExtraKind, string[]>;
}
