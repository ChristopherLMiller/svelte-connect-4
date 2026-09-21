import { cloneBoard, createEmptyBoard } from './engine';
import type { Board, Cell, Difficulty, GameMode, Player, ScorePair } from './types';

export type SavedMatch = {
	mode: GameMode;
	difficulty: Difficulty;
	board: Board;
	current: Player;
	starter: Player;
};

export type TttPrefs = {
	mode: GameMode;
	difficulty: Difficulty;
	scores: {
		local: ScorePair;
		ai: Record<Difficulty, ScorePair>;
	};
	saved: SavedMatch | null;
};

const KEY = 'tictactoe-shore';
const pair = (): ScorePair => ({ 1: 0, 2: 0 });

export const DEFAULT_TTT: TttPrefs = {
	mode: 'local',
	difficulty: 'medium',
	scores: {
		local: pair(),
		ai: { easy: pair(), medium: pair(), hard: pair() }
	},
	saved: null
};

function asPlayer(value: unknown): Player | null {
	return value === 1 || value === 2 ? value : null;
}

function asBoard(value: unknown): Board | null {
	if (!Array.isArray(value) || value.length !== 3) return null;
	const board: Board = [];
	for (const row of value) {
		if (!Array.isArray(row) || row.length !== 3) return null;
		const next: Cell[] = [];
		for (const cell of row) {
			if (cell !== 0 && cell !== 1 && cell !== 2) return null;
			next.push(cell);
		}
		board.push(next);
	}
	return board;
}

function asPair(value: unknown): ScorePair {
	if (!value || typeof value !== 'object') return pair();
	const row = value as Partial<ScorePair>;
	return { 1: Number(row[1]) || 0, 2: Number(row[2]) || 0 };
}

export function normalizeTtt(raw: unknown): TttPrefs {
	if (!raw || typeof raw !== 'object') return structuredClone(DEFAULT_TTT);
	const src = raw as Partial<TttPrefs> & { scores?: Partial<TttPrefs['scores']> };
	const scores: Partial<TttPrefs['scores']> = src.scores ?? {};
	const ai: Partial<Record<Difficulty, ScorePair>> = scores.ai ?? {};
	return {
		mode: src.mode === 'ai' ? 'ai' : 'local',
		difficulty: src.difficulty === 'easy' || src.difficulty === 'hard' ? src.difficulty : 'medium',
		scores: {
			local: asPair(scores.local),
			ai: {
				easy: asPair(ai.easy),
				medium: asPair(ai.medium),
				hard: asPair(ai.hard)
			}
		},
		saved: normalizeSaved(src.saved)
	};
}

function normalizeSaved(raw: unknown): SavedMatch | null {
	if (!raw || typeof raw !== 'object') return null;
	const src = raw as Partial<SavedMatch>;
	const board = asBoard(src.board);
	const current = asPlayer(src.current);
	const starter = asPlayer(src.starter);
	if (!board || !current || !starter) return null;
	if (board.every((row) => row.every((cell) => cell === 0))) return null;
	return {
		mode: src.mode === 'ai' ? 'ai' : 'local',
		difficulty: src.difficulty === 'easy' || src.difficulty === 'hard' ? src.difficulty : 'medium',
		board,
		current,
		starter
	};
}

function read(): TttPrefs {
	if (typeof localStorage === 'undefined') return structuredClone(DEFAULT_TTT);
	try {
		return normalizeTtt(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
	} catch {
		return structuredClone(DEFAULT_TTT);
	}
}

let cache = read();

export function peekTtt(): TttPrefs {
	return cache;
}

export function writeTtt(patch: Partial<TttPrefs>) {
	cache = {
		...cache,
		...patch,
		scores: patch.scores ?? cache.scores,
		saved: patch.saved === undefined ? cache.saved : patch.saved
	};
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(KEY, JSON.stringify(cache));
}

export function scoresFor(mode: GameMode, difficulty: Difficulty): ScorePair {
	const src = mode === 'ai' ? cache.scores.ai[difficulty] : cache.scores.local;
	return { 1: src[1], 2: src[2] };
}

export function writeScores(mode: GameMode, difficulty: Difficulty, scores: ScorePair) {
	const next = structuredClone(cache.scores);
	if (mode === 'ai') next.ai[difficulty] = { 1: scores[1], 2: scores[2] };
	else next.local = { 1: scores[1], 2: scores[2] };
	writeTtt({ scores: next });
}

export function writeSaved(saved: SavedMatch | null) {
	writeTtt({ saved });
}

export function peekSaved(): SavedMatch | null {
	const saved = cache.saved;
	return saved ? { ...saved, board: cloneBoard(saved.board) } : null;
}

export function emptyBoard() {
	return createEmptyBoard();
}
