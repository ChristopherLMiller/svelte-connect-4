import { asDifficulty, asMode, asPlayer, createGamePrefs, type GamePrefs } from '../kit/prefs';
import { validGrid } from './engine';
import { CHART_INFO, type Chart, type Difficulty, type GameMode, type Player } from './types';

/** Typed arrays are stored as plain arrays; JSON turns them into keyed objects. */
export type SavedMatch = {
	mode: GameMode;
	difficulty: Difficulty;
	chart: Chart;
	seed: number;
	edges: number[];
	boxes: number[];
	current: Player;
};

export type CartographerPrefs = GamePrefs<SavedMatch>;

export function asChart(value: unknown): Chart {
	return value === 'isle' || value === 'realm' ? value : 'coast';
}

function asOwners(value: unknown): number[] | null {
	if (!Array.isArray(value)) return null;
	const out: number[] = [];
	for (const cell of value) {
		if (cell !== 0 && cell !== 1 && cell !== 2) return null;
		out.push(cell);
	}
	return out;
}

function normalizeSaved(raw: unknown): SavedMatch | null {
	if (!raw || typeof raw !== 'object') return null;
	const src = raw as Partial<Record<keyof SavedMatch, unknown>>;
	const chart = asChart(src.chart);
	const edges = asOwners(src.edges);
	const boxes = asOwners(src.boxes);
	const current = asPlayer(src.current);
	const seed = Number(src.seed);
	if (!edges || !boxes || !current || !Number.isFinite(seed)) return null;
	if (!validGrid(CHART_INFO[chart].size, edges, boxes)) return null;
	return { mode: asMode(src.mode), difficulty: asDifficulty(src.difficulty), chart, seed: seed >>> 0, edges, boxes, current };
}

const store = createGamePrefs<SavedMatch>({
	key: 'cartographer',
	normalizeSaved,
	cloneSaved: (saved) => ({ ...saved, edges: [...saved.edges], boxes: [...saved.boxes] })
});

export const cartographerPrefs = store;
export const scoresFor = store.scoresFor;
export const writeSaved = store.writeSaved;
export const peekSaved = store.peekSaved;

export type CartView = {
	chart: Chart;
	/** Mark lines that would hand the other side a box. */
	warn: boolean;
	/** Charts finished, for the menu ledger. */
	charted: number;
};

const VIEW_KEY = 'cartographer-view';

export function readView(): CartView {
	const fallback: CartView = { chart: 'coast', warn: true, charted: 0 };
	if (typeof localStorage === 'undefined') return fallback;
	try {
		const raw = JSON.parse(localStorage.getItem(VIEW_KEY) ?? 'null') as Partial<Record<keyof CartView, unknown>> | null;
		if (!raw || typeof raw !== 'object') return fallback;
		return { chart: asChart(raw.chart), warn: raw.warn !== false, charted: Math.max(0, Math.floor(Number(raw.charted) || 0)) };
	} catch {
		return fallback;
	}
}

export function writeView(view: CartView) {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(VIEW_KEY, JSON.stringify(view));
	} catch {
		// Storage blocked: the choice still applies for this visit.
	}
}
