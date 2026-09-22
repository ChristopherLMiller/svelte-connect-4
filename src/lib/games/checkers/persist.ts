import { cloneBoard } from './engine';
import type { Board, Difficulty, GameMode, Player, ScorePair } from './types';

export type SavedMatch = {
	mode: GameMode;
	difficulty: Difficulty;
	board: Board;
	current: Player;
	starter: Player;
};

export type CheckersPrefs = {
	mode: GameMode;
	difficulty: Difficulty;
	scores: {
		local: ScorePair;
		ai: Record<Difficulty, ScorePair>;
	};
	saved: SavedMatch | null;
};

const KEY = 'ashcourt-yard';
const pair = (): ScorePair => ({ 1: 0, 2: 0 });

export const DEFAULT_CHECKERS: CheckersPrefs = {
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
	if (!Array.isArray(value) || value.length !== 8) return null;
	const board: Board = [];
	for (let r = 0; r < 8; r += 1) {
		const row = value[r];
		if (!Array.isArray(row) || row.length !== 8) return null;
		const next: Board[number] = [];
		for (let c = 0; c < 8; c += 1) {
			const cell = row[c];
			if (cell === null || cell === undefined) {
				next.push(null);
				continue;
			}
			if (!cell || typeof cell !== 'object') return null;
			const piece = cell as { id?: unknown; player?: unknown; king?: unknown };
			if (typeof piece.id !== 'string') return null;
			if (piece.player !== 1 && piece.player !== 2) return null;
			next.push({ id: piece.id, player: piece.player, king: piece.king === true });
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

export function normalizeCheckers(raw: unknown): CheckersPrefs {
	if (!raw || typeof raw !== 'object') return structuredClone(DEFAULT_CHECKERS);
	const src = raw as Partial<CheckersPrefs> & { scores?: Partial<CheckersPrefs['scores']> };
	const scores: Partial<CheckersPrefs['scores']> = src.scores ?? {};
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
	return {
		mode: src.mode === 'ai' ? 'ai' : 'local',
		difficulty: src.difficulty === 'easy' || src.difficulty === 'hard' ? src.difficulty : 'medium',
		board,
		current,
		starter
	};
}

function read(): CheckersPrefs {
	if (typeof localStorage === 'undefined') return structuredClone(DEFAULT_CHECKERS);
	try {
		return normalizeCheckers(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
	} catch {
		return structuredClone(DEFAULT_CHECKERS);
	}
}

let cache = read();

export function peekCheckers(): CheckersPrefs {
	return cache;
}

export function writeCheckers(patch: Partial<CheckersPrefs>) {
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
	writeCheckers({ scores: next });
}

export function writeSaved(saved: SavedMatch | null) {
	writeCheckers({ saved });
}

export function peekSaved(): SavedMatch | null {
	const saved = cache.saved;
	return saved ? { ...saved, board: cloneBoard(saved.board) } : null;
}
