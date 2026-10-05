import { WINDOWS } from './levels';
import { COLS, LEAD, ROWS, type BestMap, type Difficulty } from './types';

/** A run is saved between serves: the window as it stands, the score and the candles left. */
export type SavedRun = {
	difficulty: Difficulty;
	level: number;
	kind: number[];
	hp: number[];
	score: number;
	lives: number;
};

export type ChapelPrefs = {
	difficulty: Difficulty;
	best: BestMap;
	/** Windows lit in a row per hour: the next window to play, and how far a new run may start. */
	reached: BestMap;
	saved: SavedRun | null;
};

const KEY = 'chapel-glass';
const CELLS = COLS * ROWS;

const blank = (): BestMap => ({ easy: 0, medium: 0, hard: 0 });

export const DEFAULT_CHAPEL: ChapelPrefs = {
	difficulty: 'medium',
	best: blank(),
	reached: blank(),
	saved: null
};

function asDifficulty(value: unknown): Difficulty {
	return value === 'easy' || value === 'hard' ? value : 'medium';
}

function asCount(value: unknown) {
	return Math.max(0, Math.floor(Number(value) || 0));
}

function asMap(value: unknown): BestMap {
	const src = (value && typeof value === 'object' ? value : {}) as Partial<BestMap>;
	return { easy: asCount(src.easy), medium: asCount(src.medium), hard: asCount(src.hard) };
}

function asCells(value: unknown, max: number): number[] | null {
	if (!Array.isArray(value) || value.length !== CELLS) return null;
	const cells: number[] = [];
	for (const cell of value) {
		if (!Number.isInteger(cell) || cell < 0 || cell > max) return null;
		cells.push(cell);
	}
	return cells;
}

function normalizeSaved(raw: unknown): SavedRun | null {
	if (!raw || typeof raw !== 'object') return null;
	const src = raw as Partial<Record<keyof SavedRun, unknown>>;
	const kind = asCells(src.kind, LEAD);
	const hp = asCells(src.hp, 2);
	const level = asCount(src.level);
	const lives = asCount(src.lives);
	if (!kind || !hp || level >= WINDOWS.length || lives < 1) return null;
	let left = 0;
	for (let i = 0; i < CELLS; i += 1) {
		const k = kind[i]!;
		if (k && k !== LEAD) {
			if (!hp[i]) return null;
			left += 1;
		}
	}
	if (!left) return null;
	return { difficulty: asDifficulty(src.difficulty), level, kind, hp, score: asCount(src.score), lives };
}

export function normalizeChapel(raw: unknown): ChapelPrefs {
	if (!raw || typeof raw !== 'object') return structuredClone(DEFAULT_CHAPEL);
	const src = raw as Partial<Record<keyof ChapelPrefs, unknown>>;
	return {
		difficulty: asDifficulty(src.difficulty),
		best: asMap(src.best),
		reached: asMap(src.reached),
		saved: normalizeSaved(src.saved)
	};
}

function read(): ChapelPrefs {
	if (typeof localStorage === 'undefined') return structuredClone(DEFAULT_CHAPEL);
	try {
		return normalizeChapel(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
	} catch {
		return structuredClone(DEFAULT_CHAPEL);
	}
}

let cache = read();

export function peekChapel(): ChapelPrefs {
	return cache;
}

export function writeChapel(patch: Partial<ChapelPrefs>) {
	cache = {
		...cache,
		...patch,
		saved: patch.saved === undefined ? cache.saved : patch.saved
	};
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(KEY, JSON.stringify(cache));
	} catch {
		// Storage full or blocked: keep playing from memory.
	}
}

export function writeBest(difficulty: Difficulty, score: number, unlocked: number) {
	const best = { ...cache.best };
	const reached = { ...cache.reached };
	if (score > best[difficulty]) best[difficulty] = score;
	if (unlocked > reached[difficulty]) reached[difficulty] = Math.min(unlocked, WINDOWS.length);
	writeChapel({ best, reached });
}

export function writeSaved(saved: SavedRun | null) {
	writeChapel({ saved });
}

export function peekSaved(): SavedRun | null {
	const saved = cache.saved;
	return saved ? { ...saved, kind: [...saved.kind], hp: [...saved.hp] } : null;
}
