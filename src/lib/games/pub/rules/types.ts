import type { Difficulty } from '../types';

export type TableOptions = { euchreTarget: number; stick: boolean; difficulty?: Difficulty };

/** Everything the table needs to run one game's rules. */
export type RuleSet<S, A> = {
	start: (options: TableOptions, random: () => number) => S;
	/** Whose move it is, or null while the table moves on by itself or waits for a "next". */
	actor: (s: S) => number | null;
	/** A new state, or the same object when the action isn't allowed. */
	apply: (s: S, action: A, random: () => number) => S;
	winners: (s: S) => number[];
	valid: (s: S) => boolean;
	/** A pause the table moves past by itself (a finished trick on show). */
	auto?: (s: S) => boolean;
};
