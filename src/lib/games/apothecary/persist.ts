import { validCells } from './engine';
import { BENCHES, MAX_TIER, nOf, type Bench, type Board } from './types';

export type Snapshot = { cells: number[]; rng: number; score: number };

/** A brew in progress, saved after every pour. */
export type SavedBrew = {
	board: Board;
	/** The daily's date; empty for the regular benches. */
	date: string;
	cells: number[];
	rng: number;
	score: number;
	moves: number;
	undos: number;
	history: Snapshot[];
	/** Already made the Stone and chose to keep brewing. */
	kept: boolean;
};

export type DailyRecord = { date: string; score: number; top: number; tries: number };

export type ApoPrefs = {
	bench: Bench;
	best: Record<Bench, number>;
	top: Record<Bench, number>;
	played: Record<Bench, number>;
	stones: number;
	/** Highest tier ever brewed; the codex shows everything up to it. */
	discovered: number;
	daily: DailyRecord;
	saved: SavedBrew | null;
};

const KEY = 'apothecary';

const zeroes = (): Record<Bench, number> => ({ classic: 0, grand: 0 });

export const DEFAULT_APO: ApoPrefs = {
	bench: 'classic',
	best: zeroes(),
	top: zeroes(),
	played: zeroes(),
	stones: 0,
	discovered: 2,
	daily: { date: '', score: 0, top: 0, tries: 0 },
	saved: null
};

const asCount = (value: unknown) => Math.max(0, Math.floor(Number(value) || 0));
const asBench = (value: unknown): Bench => (BENCHES.includes(value as Bench) ? (value as Bench) : 'classic');
const asDate = (value: unknown) => (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '');
const asSeed = (value: unknown) => (Number.isInteger(value) ? (value as number) >>> 0 : null);

function asTable(value: unknown) {
	const src = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
	const out = zeroes();
	for (const bench of BENCHES) out[bench] = asCount(src[bench]);
	return out;
}

function asSnapshot(raw: unknown, n: number): Snapshot | null {
	if (!raw || typeof raw !== 'object') return null;
	const src = raw as Record<string, unknown>;
	const rng = asSeed(src.rng);
	if (!validCells(src.cells, n) || rng == null) return null;
	return { cells: src.cells, rng, score: asCount(src.score) };
}

function normalizeSaved(raw: unknown): SavedBrew | null {
	if (!raw || typeof raw !== 'object') return null;
	const src = raw as Partial<Record<keyof SavedBrew, unknown>>;
	const board: Board | null = src.board === 'daily' ? 'daily' : BENCHES.includes(src.board as Bench) ? (src.board as Bench) : null;
	if (!board) return null;
	const n = nOf(board);
	const core = asSnapshot(src, n);
	if (!core) return null;
	const date = asDate(src.date);
	if (board === 'daily' && !date) return null;
	const history = Array.isArray(src.history)
		? src.history.map((h) => asSnapshot(h, n)).filter((h): h is Snapshot => h != null).slice(-6)
		: [];
	return {
		board,
		date,
		...core,
		moves: asCount(src.moves),
		undos: Math.min(3, asCount(src.undos)),
		history,
		kept: src.kept === true
	};
}

export function normalizeApo(raw: unknown): ApoPrefs {
	if (!raw || typeof raw !== 'object') return structuredClone(DEFAULT_APO);
	const src = raw as Partial<Record<keyof ApoPrefs, unknown>>;
	const daily = src.daily && typeof src.daily === 'object' ? (src.daily as Record<string, unknown>) : {};
	return {
		bench: asBench(src.bench),
		best: asTable(src.best),
		top: asTable(src.top),
		played: asTable(src.played),
		stones: asCount(src.stones),
		discovered: Math.min(MAX_TIER, Math.max(2, asCount(src.discovered))),
		daily: { date: asDate(daily.date), score: asCount(daily.score), top: asCount(daily.top), tries: asCount(daily.tries) },
		saved: normalizeSaved(src.saved)
	};
}

function read(): ApoPrefs {
	if (typeof localStorage === 'undefined') return structuredClone(DEFAULT_APO);
	try {
		return normalizeApo(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
	} catch {
		return structuredClone(DEFAULT_APO);
	}
}

let cache = read();

export function peekApo(): ApoPrefs {
	return cache;
}

export function writeApo(patch: Partial<ApoPrefs>) {
	cache = { ...cache, ...patch };
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(KEY, JSON.stringify(cache));
	} catch {
		// Storage full or blocked: keep playing from memory.
	}
}

export function peekSaved(): SavedBrew | null {
	const saved = cache.saved;
	return saved ? structuredClone(saved) : null;
}
