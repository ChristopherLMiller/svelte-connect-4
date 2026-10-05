import { COLS, KINDS, MAX_START, TOTAL, type Kind, type Mode } from './types';

/** A dive is saved whenever it pauses: the stack, the queue and the bag, so it resumes exactly. */
export type SavedDive = {
	mode: Mode;
	startLevel: number;
	board: number[];
	queue: Kind[];
	bag: Kind[];
	hold: Kind | 0;
	seed: number;
	score: number;
	lines: number;
	level: number;
	combo: number;
	b2b: boolean;
	time: number;
	pieces: number;
};

export type Handling = 'gentle' | 'standard' | 'swift';

export type ReefPrefs = {
	mode: Mode;
	startLevel: number;
	ghost: boolean;
	handling: Handling;
	bestScore: number;
	bestLines: number;
	bestDepth: number;
	/** Fastest 40 lines in milliseconds; 0 until one is finished. */
	bestSprint: number;
	saved: SavedDive | null;
};

const KEY = 'lumen-reef';

export const DEFAULT_REEF: ReefPrefs = {
	mode: 'marathon',
	startLevel: 1,
	ghost: true,
	handling: 'standard',
	bestScore: 0,
	bestLines: 0,
	bestDepth: 0,
	bestSprint: 0,
	saved: null
};

const asCount = (value: unknown) => Math.max(0, Math.floor(Number(value) || 0));
const asMode = (value: unknown): Mode => (value === 'sprint' ? 'sprint' : 'marathon');
const asStart = (value: unknown) => Math.min(MAX_START, Math.max(1, asCount(value) || 1));
const isKind = (value: unknown): value is Kind => KINDS.includes(value as Kind);

function asKinds(value: unknown, max: number): Kind[] | null {
	if (!Array.isArray(value) || value.length > max || !value.every(isKind)) return null;
	return value as Kind[];
}

function normalizeSaved(raw: unknown): SavedDive | null {
	if (!raw || typeof raw !== 'object') return null;
	const src = raw as Partial<Record<keyof SavedDive, unknown>>;
	const board = src.board;
	if (!Array.isArray(board) || board.length !== COLS * TOTAL) return null;
	if (!board.every((cell) => cell === 0 || isKind(cell))) return null;
	const queue = asKinds(src.queue, 8);
	const bag = asKinds(src.bag, 7);
	if (!queue || queue.length < 1 || !bag) return null;
	const mode = asMode(src.mode);
	const startLevel = mode === 'sprint' ? 1 : asStart(src.startLevel);
	return {
		mode,
		startLevel,
		board: board as number[],
		queue,
		bag,
		hold: isKind(src.hold) ? src.hold : 0,
		seed: asCount(src.seed) >>> 0,
		score: asCount(src.score),
		lines: asCount(src.lines),
		level: Math.max(startLevel, asCount(src.level)),
		combo: Math.max(-1, Math.floor(Number(src.combo) || -1)),
		b2b: src.b2b === true,
		time: Math.max(0, Number(src.time) || 0),
		pieces: asCount(src.pieces)
	};
}

export function normalizeReef(raw: unknown): ReefPrefs {
	if (!raw || typeof raw !== 'object') return structuredClone(DEFAULT_REEF);
	const src = raw as Partial<Record<keyof ReefPrefs, unknown>>;
	return {
		mode: asMode(src.mode),
		startLevel: asStart(src.startLevel),
		ghost: src.ghost !== false,
		handling: src.handling === 'gentle' || src.handling === 'swift' ? src.handling : 'standard',
		bestScore: asCount(src.bestScore),
		bestLines: asCount(src.bestLines),
		bestDepth: asCount(src.bestDepth),
		bestSprint: asCount(src.bestSprint),
		saved: normalizeSaved(src.saved)
	};
}

function read(): ReefPrefs {
	if (typeof localStorage === 'undefined') return structuredClone(DEFAULT_REEF);
	try {
		return normalizeReef(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
	} catch {
		return structuredClone(DEFAULT_REEF);
	}
}

let cache = read();

export function peekReef(): ReefPrefs {
	return cache;
}

export function writeReef(patch: Partial<ReefPrefs>) {
	cache = { ...cache, ...patch };
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(KEY, JSON.stringify(cache));
	} catch {
		// Storage full or blocked: keep playing from memory.
	}
}

export function peekSaved(): SavedDive | null {
	const saved = cache.saved;
	return saved ? structuredClone(saved) : null;
}
