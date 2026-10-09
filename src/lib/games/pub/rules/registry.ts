import { BLACKJACK_RULES, type BlackjackAction, type BlackjackState } from './blackjack';
import { EIGHTS_RULES, type EightsAction, type EightsState } from './eights';
import { FREECELL_RULES, type FreeCellAction, type FreeCellState } from './freecell';
import { GO_FISH_RULES, type GoFishAction, type GoFishState } from './gofish';
import { KLONDIKE_RULES, type KlondikeAction, type KlondikeState } from './klondike';
import { KINGS_RULES, type KingsAction, type KingsState } from './kings';
import { OLD_MAID_RULES, type OldMaidAction, type OldMaidState } from './oldmaid';
import { OH_HELL_RULES, type OhHellAction, type OhHellState } from './ohhell';
import { PINOCHLE_RULES, type PinochleAction, type PinochleState } from './pinochle';
import { RUMMY_RULES, type RummyAction, type RummyState } from './rummy';
import { SPIDER_RULES, type SpiderAction, type SpiderState } from './spider';
import type { RuleSet } from './types';

/** Tables added after the first five, each run through its own RuleSet. */
export type ExtraState = OhHellState | EightsState | GoFishState | OldMaidState | BlackjackState | KingsState | RummyState | PinochleState | KlondikeState | FreeCellState | SpiderState;
export type ExtraAction = OhHellAction | EightsAction | GoFishAction | OldMaidAction | BlackjackAction | KingsAction | RummyAction | PinochleAction | KlondikeAction | FreeCellAction | SpiderAction;
export type ExtraKind = ExtraState['kind'];

const RULES: { [K in ExtraKind]: RuleSet<Extract<ExtraState, { kind: K }>, never> } = {
	ohhell: OH_HELL_RULES as RuleSet<OhHellState, never>,
	eights: EIGHTS_RULES as RuleSet<EightsState, never>,
	gofish: GO_FISH_RULES as RuleSet<GoFishState, never>,
	oldmaid: OLD_MAID_RULES as RuleSet<OldMaidState, never>,
	blackjack: BLACKJACK_RULES as RuleSet<BlackjackState, never>,
	kings: KINGS_RULES as RuleSet<KingsState, never>,
	rummy: RUMMY_RULES as RuleSet<RummyState, never>,
	pinochle: PINOCHLE_RULES as RuleSet<PinochleState, never>,
	klondike: KLONDIKE_RULES as RuleSet<KlondikeState, never>,
	freecell: FREECELL_RULES as RuleSet<FreeCellState, never>,
	spider: SPIDER_RULES as RuleSet<SpiderState, never>
};

export const EXTRA_KINDS = Object.keys(RULES) as ExtraKind[];

export function rulesOf(kind: ExtraKind): RuleSet<ExtraState, ExtraAction> {
	return RULES[kind] as unknown as RuleSet<ExtraState, ExtraAction>;
}

export function isExtra(s: { kind: string }): s is ExtraState {
	return s.kind in RULES;
}
