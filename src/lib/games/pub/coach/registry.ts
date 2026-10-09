import type { ExtraAction, ExtraKind, ExtraState } from '../rules/registry';
import { blackjackAdvice, blackjackReview } from './blackjack';
import { eightsAdvice, eightsReview } from './eights';
import { freeCellAdvice, freeCellReview } from './freecell';
import { goFishAdvice, goFishReview } from './gofish';
import { klondikeAdvice, klondikeReview } from './klondike';
import { kingsAdvice, kingsReview } from './kings';
import { pinochleAdvice, pinochleReview } from './pinochle';
import { rummyAdvice, rummyReview } from './rummy';
import { spiderAdvice, spiderReview } from './spider';
import { oldMaidAdvice, oldMaidReview } from './oldmaid';
import { ohHellAdvice, ohHellReview } from './ohhell';
import type { Advice } from './types';

type Coach<S, A> = {
	advise: (s: S, seat: number, names: string[], seed: number) => Advice;
	review: (s: S, seat: number, action: A, advice: Advice, names: string[]) => string | null;
};

const COACHES: { [K in ExtraKind]: Coach<Extract<ExtraState, { kind: K }>, never> } = {
	ohhell: { advise: ohHellAdvice, review: ohHellReview },
	eights: { advise: eightsAdvice, review: eightsReview },
	gofish: { advise: goFishAdvice, review: goFishReview },
	oldmaid: { advise: oldMaidAdvice, review: oldMaidReview },
	blackjack: { advise: blackjackAdvice, review: blackjackReview },
	kings: { advise: kingsAdvice, review: kingsReview },
	rummy: { advise: rummyAdvice, review: rummyReview },
	pinochle: { advise: pinochleAdvice, review: pinochleReview },
	klondike: { advise: klondikeAdvice, review: klondikeReview },
	freecell: { advise: freeCellAdvice, review: freeCellReview },
	spider: { advise: spiderAdvice, review: spiderReview }
};

export function coachFor(kind: ExtraKind): Coach<ExtraState, ExtraAction> {
	return COACHES[kind] as unknown as Coach<ExtraState, ExtraAction>;
}
