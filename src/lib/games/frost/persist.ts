import { LEVELS, type Level } from './types';

export type Board = Level | 'daily';

/** A survey in progress, saved whenever it pauses so it resumes exactly. */
export type SavedSurvey = {
	board: Board;
	/** The daily's date; empty for the regular lakes. */
	date: string;
	mines: number[];
	state: string;
	time: number;
	start: number;
	guessFree: boolean;
};

export type DailyRecord = { date: string; ms: number; won: boolean; tries: number };

export type FrostPrefs = {
	level: Level;
	/** Only deal boards the solver can clear without a guess. */
	sure: boolean;
	/** A long press (touch or mouse) plants a flag. */
	holdFlag: boolean;
	best: Record<Level, number>;
	played: Record<Level, number>;
	won: Record<Level, number>;
	daily: DailyRecord;
	/** Consecutive days with the dawn survey cleared, and the last one cleared. */
	streak: number;
	lastDaily: string;
	saved: SavedSurvey | null;
};

const KEY = 'frostline';

const zeroes = (): Record<Level, number> => ({ shore: 0, lake: 0, black: 0 });

export const DEFAULT_FROST: FrostPrefs = {
	level: 'shore',
	sure: true,
	holdFlag: true,
	best: zeroes(),
	played: zeroes(),
	won: zeroes(),
	daily: { date: '', ms: 0, won: false, tries: 0 },
	streak: 0,
	lastDaily: '',
	saved: null
};

const asCount = (value: unknown) => Math.max(0, Math.floor(Number(value) || 0));
const asLevel = (value: unknown): Level => (LEVELS.includes(value as Level) ? (value as Level) : 'shore');
const asDate = (value: unknown) => (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '');

function asTable(value: unknown) {
	const src = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
	const out = zeroes();
	for (const level of LEVELS) out[level] = asCount(src[level]);
	return out;
}

function normalizeSaved(raw: unknown): SavedSurvey | null {
	if (!raw || typeof raw !== 'object') return null;
	const src = raw as Partial<Record<keyof SavedSurvey, unknown>>;
	const board: Board | null = src.board === 'daily' ? 'daily' : LEVELS.includes(src.board as Level) ? (src.board as Level) : null;
	if (!board) return null;
	if (!Array.isArray(src.mines) || !src.mines.every((i) => Number.isInteger(i))) return null;
	if (typeof src.state !== 'string' || !/^[012]+$/.test(src.state)) return null;
	const date = asDate(src.date);
	if (board === 'daily' && !date) return null;
	return {
		board,
		date,
		mines: src.mines as number[],
		state: src.state,
		time: Math.max(0, Number(src.time) || 0),
		start: Number.isInteger(src.start) ? (src.start as number) : -1,
		guessFree: src.guessFree === true
	};
}

export function normalizeFrost(raw: unknown): FrostPrefs {
	if (!raw || typeof raw !== 'object') return structuredClone(DEFAULT_FROST);
	const src = raw as Partial<Record<keyof FrostPrefs, unknown>>;
	const daily = src.daily && typeof src.daily === 'object' ? (src.daily as Record<string, unknown>) : {};
	return {
		level: asLevel(src.level),
		sure: src.sure !== false,
		holdFlag: src.holdFlag !== false,
		best: asTable(src.best),
		played: asTable(src.played),
		won: asTable(src.won),
		daily: { date: asDate(daily.date), ms: asCount(daily.ms), won: daily.won === true, tries: asCount(daily.tries) },
		streak: asCount(src.streak),
		lastDaily: asDate(src.lastDaily),
		saved: normalizeSaved(src.saved)
	};
}

function read(): FrostPrefs {
	if (typeof localStorage === 'undefined') return structuredClone(DEFAULT_FROST);
	try {
		return normalizeFrost(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
	} catch {
		return structuredClone(DEFAULT_FROST);
	}
}

let cache = read();

export function peekFrost(): FrostPrefs {
	return cache;
}

export function writeFrost(patch: Partial<FrostPrefs>) {
	cache = { ...cache, ...patch };
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(KEY, JSON.stringify(cache));
	} catch {
		// Storage full or blocked: keep playing from memory.
	}
}

export function peekSaved(): SavedSurvey | null {
	const saved = cache.saved;
	return saved ? structuredClone(saved) : null;
}
