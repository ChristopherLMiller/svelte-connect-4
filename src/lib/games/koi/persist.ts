import { MOVES, SIZE, type Special } from './match';
import { COLS, ROWS } from './shooter';
import type { Kind, Mode } from './types';

export type SavedRipples = {
	grid: number[];
	top: number;
	current: Kind;
	next: Kind;
	seed: number;
	stage: number;
	score: number;
	shots: number;
	misses: number;
	allowance: number;
	streak: number;
	popped: number;
};

export type SavedCurrents = {
	/** Kind and special per cell. */
	grid: Array<[number, number]>;
	seed: number;
	stage: number;
	score: number;
	stageScore: number;
	target: number;
	moves: number;
	kinds: number;
	bestChain: number;
	specials: number;
};

export type Aim = 'full' | 'short';
export type Best = { score: number; stage: number };

export type KoiPrefs = {
	mode: Mode;
	aim: Aim;
	hints: boolean;
	ripples: Best;
	currents: Best & { chain: number };
	savedRipples: SavedRipples | null;
	savedCurrents: SavedCurrents | null;
};

const KEY = 'koi-pond';

export const DEFAULT_KOI: KoiPrefs = {
	mode: 'ripples',
	aim: 'full',
	hints: true,
	ripples: { score: 0, stage: 0 },
	currents: { score: 0, stage: 0, chain: 0 },
	savedRipples: null,
	savedCurrents: null
};

const count = (value: unknown) => Math.max(0, Math.floor(Number(value) || 0));
const isKind = (value: unknown): value is Kind => Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 6;

function normalizeRipples(raw: unknown): SavedRipples | null {
	if (!raw || typeof raw !== 'object') return null;
	const src = raw as Partial<Record<keyof SavedRipples, unknown>>;
	const grid = src.grid;
	if (!Array.isArray(grid) || grid.length !== ROWS * COLS || !grid.every((k) => k === 0 || isKind(k))) return null;
	if (!isKind(src.current) || !isKind(src.next)) return null;
	return {
		grid: grid as number[],
		top: Math.min(ROWS, count(src.top)),
		current: src.current,
		next: src.next,
		seed: count(src.seed) >>> 0,
		stage: Math.max(1, count(src.stage)),
		score: count(src.score),
		shots: count(src.shots),
		misses: count(src.misses),
		allowance: Math.max(1, count(src.allowance)),
		streak: count(src.streak),
		popped: count(src.popped)
	};
}

function normalizeCurrents(raw: unknown): SavedCurrents | null {
	if (!raw || typeof raw !== 'object') return null;
	const src = raw as Partial<Record<keyof SavedCurrents, unknown>>;
	const grid = src.grid;
	if (!Array.isArray(grid) || grid.length !== SIZE * SIZE) return null;
	const ok = grid.every(
		(cell) => Array.isArray(cell) && cell.length === 2 && Number.isInteger(cell[1]) && cell[1] >= 0 && cell[1] <= 4 && (cell[1] === 4 ? cell[0] === 0 : isKind(cell[0]))
	);
	if (!ok) return null;
	const moves = count(src.moves);
	if (!moves) return null;
	return {
		grid: grid as Array<[number, Special]>,
		seed: count(src.seed) >>> 0,
		stage: Math.max(1, count(src.stage)),
		score: count(src.score),
		stageScore: count(src.stageScore),
		target: Math.max(1, count(src.target)),
		moves: Math.min(MOVES, moves),
		kinds: Math.min(6, Math.max(3, count(src.kinds))),
		bestChain: count(src.bestChain),
		specials: count(src.specials)
	};
}

export function normalizeKoi(raw: unknown): KoiPrefs {
	if (!raw || typeof raw !== 'object') return structuredClone(DEFAULT_KOI);
	const src = raw as Partial<Record<keyof KoiPrefs, unknown>>;
	const ripples = (src.ripples ?? {}) as Partial<Best>;
	const currents = (src.currents ?? {}) as Partial<Best & { chain: number }>;
	return {
		mode: src.mode === 'currents' ? 'currents' : 'ripples',
		aim: src.aim === 'short' ? 'short' : 'full',
		hints: src.hints !== false,
		ripples: { score: count(ripples.score), stage: count(ripples.stage) },
		currents: { score: count(currents.score), stage: count(currents.stage), chain: count(currents.chain) },
		savedRipples: normalizeRipples(src.savedRipples),
		savedCurrents: normalizeCurrents(src.savedCurrents)
	};
}

function read(): KoiPrefs {
	if (typeof localStorage === 'undefined') return structuredClone(DEFAULT_KOI);
	try {
		return normalizeKoi(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
	} catch {
		return structuredClone(DEFAULT_KOI);
	}
}

let cache = read();

export function peekKoi(): KoiPrefs {
	return cache;
}

export function writeKoi(patch: Partial<KoiPrefs>) {
	cache = { ...cache, ...patch };
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(KEY, JSON.stringify(cache));
	} catch {
		// Storage full or blocked: keep playing from memory.
	}
}
