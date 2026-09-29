import { asDifficulty, asMode, asPlayer, createGamePrefs, type GamePrefs } from '../kit/prefs';
import { cloneBoard } from './engine';
import type { Board, Cell, Difficulty, GameMode, Player } from './types';

export type SavedMatch = {
	mode: GameMode;
	difficulty: Difficulty;
	board: Board;
	current: Player;
	starter: Player;
};

export type TttPrefs = GamePrefs<SavedMatch>;

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

function normalizeSaved(raw: unknown): SavedMatch | null {
	if (!raw || typeof raw !== 'object') return null;
	const src = raw as Partial<SavedMatch>;
	const board = asBoard(src.board);
	const current = asPlayer(src.current);
	const starter = asPlayer(src.starter);
	if (!board || !current || !starter) return null;
	if (board.every((row) => row.every((cell) => cell === 0))) return null;
	return { mode: asMode(src.mode), difficulty: asDifficulty(src.difficulty), board, current, starter };
}

const store = createGamePrefs<SavedMatch>({
	key: 'tictactoe-shore',
	normalizeSaved,
	cloneSaved: (saved) => ({ ...saved, board: cloneBoard(saved.board) })
});

export const tttPrefs = store;
export const peekTtt = store.peek;
export const writeTtt = store.write;
export const scoresFor = store.scoresFor;
export const writeScores = store.writeScores;
export const writeSaved = store.writeSaved;
export const peekSaved = store.peekSaved;
