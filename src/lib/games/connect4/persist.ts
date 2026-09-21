import { COLS, ROWS, type Board, type Cell, type Difficulty, type GameMode, type Player } from './types';

export type ScorePair = { 1: number; 2: number };
export type Skin = 'classic' | 'protocol';

export type SavedGame = {
	mode: GameMode;
	difficulty: Difficulty;
	board: Board;
	current: Player;
	starter: Player;
	selectedCol: number;
};

export type Prefs = {
	sfxOn: boolean;
	musicOn: boolean;
	sfxVolume: number;
	musicVolume: number;
	skin: Skin;
	threatAlerts: boolean;
	musicTrack: number;
	mode: GameMode;
	difficulty: Difficulty;
	scores: {
		local: ScorePair;
		ai: Record<Difficulty, ScorePair>;
	};
	savedGame: SavedGame | null;
	updatedAt: number;
};

const DB_NAME = 'connect4-protocol';
const DB_VERSION = 1;
const STORE = 'kv';
const PREFS_KEY = 'prefs';
const CACHE_KEY = 'connect4-prefs';
const LEGACY_AUDIO = 'connect4-audio';
const LEGACY_SKIN = 'connect4-board-skin';

const pair = (): ScorePair => ({ 1: 0, 2: 0 });

export const DEFAULT_PREFS: Prefs = {
	sfxOn: true,
	musicOn: true,
	sfxVolume: 0.78,
	musicVolume: 0.42,
	skin: 'protocol',
	threatAlerts: true,
	musicTrack: 0,
	mode: 'local',
	difficulty: 'medium',
	scores: {
		local: pair(),
		ai: { easy: pair(), medium: pair(), hard: pair() }
	},
	savedGame: null,
	updatedAt: 0
};

function clamp(value: number) {
	return Math.min(1, Math.max(0, value));
}

function asPair(value: unknown): ScorePair {
	if (!value || typeof value !== 'object') return pair();
	const row = value as Partial<ScorePair>;
	return { 1: Number(row[1]) || 0, 2: Number(row[2]) || 0 };
}

function asPlayer(value: unknown): Player | null {
	return value === 1 || value === 2 ? value : null;
}

function asBoard(value: unknown): Board | null {
	if (!Array.isArray(value) || value.length !== ROWS) return null;
	const board: Board = [];
	for (const row of value) {
		if (!Array.isArray(row) || row.length !== COLS) return null;
		const next: Cell[] = [];
		for (const cell of row) {
			if (cell !== 0 && cell !== 1 && cell !== 2) return null;
			next.push(cell);
		}
		board.push(next);
	}
	return board;
}

export function boardHasMoves(board: Board) {
	return board.some((row) => row.some((cell) => cell !== 0));
}

export function countDiscs(board: Board) {
	let n = 0;
	for (const row of board) {
		for (const cell of row) if (cell !== 0) n += 1;
	}
	return n;
}

export function normalizeSavedGame(raw: unknown): SavedGame | null {
	if (!raw || typeof raw !== 'object') return null;
	const src = raw as Partial<SavedGame>;
	const board = asBoard(src.board);
	const current = asPlayer(src.current);
	const starter = asPlayer(src.starter);
	if (!board || !current || !starter || !boardHasMoves(board)) return null;
	const selected = Math.floor(Number(src.selectedCol));
	return {
		mode: src.mode === 'ai' ? 'ai' : 'local',
		difficulty: src.difficulty === 'easy' || src.difficulty === 'hard' ? src.difficulty : 'medium',
		board,
		current,
		starter,
		selectedCol: selected >= 0 && selected < COLS ? selected : 3
	};
}

export function normalizePrefs(raw: unknown): Prefs {
	const src = raw && typeof raw === 'object' ? (raw as Partial<Prefs>) : {};
	const scores = src.scores ?? DEFAULT_PREFS.scores;
	return {
		sfxOn: src.sfxOn !== false,
		musicOn: src.musicOn !== false,
		sfxVolume: clamp(src.sfxVolume ?? DEFAULT_PREFS.sfxVolume),
		musicVolume: clamp(src.musicVolume ?? DEFAULT_PREFS.musicVolume),
		skin: src.skin === 'classic' ? 'classic' : 'protocol',
		threatAlerts: src.threatAlerts !== false,
		musicTrack: Math.max(0, Math.floor(src.musicTrack ?? 0)),
		mode: src.mode === 'ai' ? 'ai' : 'local',
		difficulty: src.difficulty === 'easy' || src.difficulty === 'hard' ? src.difficulty : 'medium',
		scores: {
			local: asPair(scores.local),
			ai: {
				easy: asPair(scores.ai?.easy),
				medium: asPair(scores.ai?.medium),
				hard: asPair(scores.ai?.hard)
			}
		},
		savedGame: normalizeSavedGame(src.savedGame),
		updatedAt: Number(src.updatedAt) || 0
	};
}

function readCache(): Prefs | null {
	if (typeof localStorage === 'undefined') return null;
	try {
		const raw = localStorage.getItem(CACHE_KEY);
		if (raw) return normalizePrefs(JSON.parse(raw));
	} catch {
		/* ignore */
	}
	try {
		const audioRaw = localStorage.getItem(LEGACY_AUDIO);
		const audio = audioRaw ? (JSON.parse(audioRaw) as Partial<Prefs>) : {};
		const skin = localStorage.getItem(LEGACY_SKIN);
		return normalizePrefs({
			...audio,
			skin: skin === 'classic' ? 'classic' : 'protocol'
		});
	} catch {
		return null;
	}
}

function writeCache(prefs: Prefs) {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(CACHE_KEY, JSON.stringify(prefs));
	} catch {
		/* quota / private mode */
	}
}

function openDb(): Promise<IDBDatabase | null> {
	if (typeof indexedDB === 'undefined') return Promise.resolve(null);
	return new Promise((resolve) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => resolve(null);
	});
}

async function idbGet(): Promise<Prefs | null> {
	const db = await openDb();
	if (!db) return null;
	return new Promise((resolve) => {
		try {
			const tx = db.transaction(STORE, 'readonly');
			const req = tx.objectStore(STORE).get(PREFS_KEY);
			req.onsuccess = () => {
				resolve(req.result ? normalizePrefs(req.result) : null);
				db.close();
			};
			req.onerror = () => {
				resolve(null);
				db.close();
			};
		} catch {
			db.close();
			resolve(null);
		}
	});
}

async function idbSet(prefs: Prefs) {
	const db = await openDb();
	if (!db) return;
	return new Promise<void>((resolve) => {
		try {
			const tx = db.transaction(STORE, 'readwrite');
			tx.objectStore(STORE).put(prefs, PREFS_KEY);
			tx.oncomplete = () => {
				db.close();
				resolve();
			};
			tx.onerror = () => {
				db.close();
				resolve();
			};
		} catch {
			db.close();
			resolve();
		}
	});
}

let memory = normalizePrefs(readCache() ?? DEFAULT_PREFS);
let saveTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<(prefs: Prefs) => void>();

function notify() {
	for (const listener of listeners) listener(memory);
}

export function onPrefs(listener: (prefs: Prefs) => void) {
	listeners.add(listener);
	listener(memory);
	return () => listeners.delete(listener);
}

export function peekPrefs(): Prefs {
	return memory;
}

export function peekSavedGame() {
	return memory.savedGame;
}

export function scoresFor(mode: GameMode, difficulty: Difficulty): ScorePair {
	return mode === 'ai' ? { ...memory.scores.ai[difficulty] } : { ...memory.scores.local };
}

export function writePrefs(patch: Partial<Prefs>) {
	memory = normalizePrefs({
		...memory,
		...patch,
		scores: patch.scores ?? memory.scores,
		savedGame: patch.savedGame === undefined ? memory.savedGame : patch.savedGame,
		updatedAt: Date.now()
	});
	writeCache(memory);
	notify();
	if (typeof window === 'undefined') return;
	if (saveTimer) clearTimeout(saveTimer);
	saveTimer = setTimeout(() => {
		saveTimer = null;
		void idbSet(memory);
	}, 160);
}

export function writeScores(mode: GameMode, difficulty: Difficulty, scores: ScorePair) {
	const next = {
		...memory.scores,
		local: mode === 'local' ? { 1: scores[1], 2: scores[2] } : memory.scores.local,
		ai: {
			...memory.scores.ai,
			...(mode === 'ai' ? { [difficulty]: { 1: scores[1], 2: scores[2] } } : {})
		}
	};
	writePrefs({ scores: next });
}

export function writeSavedGame(game: SavedGame | null) {
	writePrefs({ savedGame: game ? normalizeSavedGame(game) : null });
}

export async function hydratePrefs(): Promise<Prefs> {
	const fromDb = await idbGet();
	const fromCache = readCache();
	if (fromDb && fromCache) {
		memory = fromCache.updatedAt >= fromDb.updatedAt ? fromCache : fromDb;
	} else if (fromDb) {
		memory = fromDb;
	} else if (fromCache) {
		memory = fromCache;
	}
	writeCache(memory);
	void idbSet(memory);
	notify();
	return memory;
}

export function flushPrefs() {
	if (saveTimer) {
		clearTimeout(saveTimer);
		saveTimer = null;
	}
	void idbSet(memory);
}

export function onPrefsLifecycle() {
	if (typeof window === 'undefined') return () => undefined;
	const flush = () => flushPrefs();
	window.addEventListener('pagehide', flush);
	window.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'hidden') flush();
	});
	return () => {
		window.removeEventListener('pagehide', flush);
	};
}
