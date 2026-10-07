import { asDifficulty, asMode, asPlayer, createGamePrefs, type GamePrefs } from '../kit/prefs';
import { replay } from './engine';
import { GARDEN_INFO, type Difficulty, type GameMode, type Garden, type Player, type Season } from './types';

export type SavedMatch = {
	mode: GameMode;
	difficulty: Difficulty;
	garden: Garden;
	first: Player;
	moves: number[];
};

export type ZenPrefs = GamePrefs<SavedMatch>;

export function asGarden(value: unknown): Garden {
	return value === 'courtyard' || value === 'grand' ? value : 'temple';
}

export function asSeason(value: unknown): Season {
	return value === 'autumn' || value === 'winter' ? value : 'spring';
}

function normalizeSaved(raw: unknown): SavedMatch | null {
	if (!raw || typeof raw !== 'object') return null;
	const src = raw as Partial<Record<keyof SavedMatch, unknown>>;
	const garden = asGarden(src.garden);
	const first = asPlayer(src.first) ?? 1;
	if (!Array.isArray(src.moves) || !src.moves.length) return null;
	const moves = src.moves.map(Number);
	const game = replay(GARDEN_INFO[garden].size, moves, first);
	if (!game || game.status.type !== 'playing') return null;
	return { mode: asMode(src.mode), difficulty: asDifficulty(src.difficulty), garden, first, moves };
}

const store = createGamePrefs<SavedMatch>({
	key: 'zengarden',
	normalizeSaved,
	cloneSaved: (saved) => ({ ...saved, moves: [...saved.moves] })
});

export const zenPrefs = store;
export const scoresFor = store.scoresFor;
export const writeSaved = store.writeSaved;
export const peekSaved = store.peekSaved;

export type ZenView = {
	garden: Garden;
	season: Season;
	/** Mark every point where a stone would finish five. */
	warn: boolean;
	/** A soft ghost stone under the pointer before you place. */
	ghost: boolean;
	/** Games finished, for the menu tally. */
	raked: number;
};

const VIEW_KEY = 'zengarden-view';

export function readView(): ZenView {
	const fallback: ZenView = { garden: 'temple', season: 'spring', warn: true, ghost: true, raked: 0 };
	if (typeof localStorage === 'undefined') return fallback;
	try {
		const raw = JSON.parse(localStorage.getItem(VIEW_KEY) ?? 'null') as Partial<Record<keyof ZenView, unknown>> | null;
		if (!raw || typeof raw !== 'object') return fallback;
		return {
			garden: asGarden(raw.garden),
			season: asSeason(raw.season),
			warn: raw.warn !== false,
			ghost: raw.ghost !== false,
			raked: Math.max(0, Math.floor(Number(raw.raked) || 0))
		};
	} catch {
		return fallback;
	}
}

export function writeView(view: ZenView) {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(VIEW_KEY, JSON.stringify(view));
	} catch {
		// Storage blocked: the choice still applies for this visit.
	}
}
