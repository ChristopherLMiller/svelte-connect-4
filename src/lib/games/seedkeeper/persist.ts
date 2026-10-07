import { asDifficulty, asMode, asPlayer, createGamePrefs, type GamePrefs } from '../kit/prefs';
import { validBoard } from './engine';
import { SOWING_INFO, type Difficulty, type GameMode, type Player, type Sowing } from './types';

export type SavedMatch = {
	mode: GameMode;
	difficulty: Difficulty;
	sowing: Sowing;
	board: number[];
	current: Player;
};

export type SeedkeeperPrefs = GamePrefs<SavedMatch>;

export function asSowing(value: unknown): Sowing {
	return value === 'handful' || value === 'harvest' ? value : 'classic';
}

function normalizeSaved(raw: unknown): SavedMatch | null {
	if (!raw || typeof raw !== 'object') return null;
	const src = raw as Partial<Record<keyof SavedMatch, unknown>>;
	const sowing = asSowing(src.sowing);
	const current = asPlayer(src.current);
	if (!current || !validBoard(src.board, SOWING_INFO[sowing].seeds)) return null;
	return { mode: asMode(src.mode), difficulty: asDifficulty(src.difficulty), sowing, board: [...src.board], current };
}

const store = createGamePrefs<SavedMatch>({
	key: 'seedkeeper',
	normalizeSaved,
	cloneSaved: (saved) => ({ ...saved, board: [...saved.board] })
});

export const seedkeeperPrefs = store;
export const scoresFor = store.scoresFor;
export const writeSaved = store.writeSaved;
export const peekSaved = store.peekSaved;

export type SeedView = {
	sowing: Sowing;
	/** Light the pits a sowing will reach before you commit. */
	trail: boolean;
	/** Numbers beside every pit. */
	counts: boolean;
	/** Games finished, for the menu tally. */
	harvests: number;
};

const VIEW_KEY = 'seedkeeper-view';

export function readView(): SeedView {
	const fallback: SeedView = { sowing: 'classic', trail: true, counts: true, harvests: 0 };
	if (typeof localStorage === 'undefined') return fallback;
	try {
		const raw = JSON.parse(localStorage.getItem(VIEW_KEY) ?? 'null') as Partial<Record<keyof SeedView, unknown>> | null;
		if (!raw || typeof raw !== 'object') return fallback;
		return {
			sowing: asSowing(raw.sowing),
			trail: raw.trail !== false,
			counts: raw.counts !== false,
			harvests: Math.max(0, Math.floor(Number(raw.harvests) || 0))
		};
	} catch {
		return fallback;
	}
}

export function writeView(view: SeedView) {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(VIEW_KEY, JSON.stringify(view));
	} catch {
		// Storage blocked: the choice still applies for this visit.
	}
}
