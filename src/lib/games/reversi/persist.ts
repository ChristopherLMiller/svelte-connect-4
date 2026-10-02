import { asDifficulty, asMode, asPlayer, createGamePrefs, type GamePrefs } from '../kit/prefs';
import type { Board, Difficulty, GameMode, Player } from './types';

/** Boards are stored as plain arrays; JSON turns typed arrays into keyed objects. */
export type SavedMatch = {
	mode: GameMode;
	difficulty: Difficulty;
	board: number[];
	current: Player;
};

export type EclipsePrefs = GamePrefs<SavedMatch>;

function asCells(value: unknown): number[] | null {
	if (!Array.isArray(value) || value.length !== 64) return null;
	const cells: number[] = [];
	for (const cell of value) {
		if (cell !== 0 && cell !== 1 && cell !== 2) return null;
		cells.push(cell);
	}
	return cells;
}

function normalizeSaved(raw: unknown): SavedMatch | null {
	if (!raw || typeof raw !== 'object') return null;
	const src = raw as Partial<Record<keyof SavedMatch, unknown>>;
	const board = asCells(src.board);
	const current = asPlayer(src.current);
	if (!board || !current) return null;
	return { mode: asMode(src.mode), difficulty: asDifficulty(src.difficulty), board, current };
}

const store = createGamePrefs<SavedMatch>({
	key: 'eclipse-orrery',
	normalizeSaved,
	cloneSaved: (saved) => ({ ...saved, board: [...saved.board] })
});

export const eclipsePrefs = store;
export const scoresFor = store.scoresFor;
export const writeSaved = store.writeSaved;
export const peekSaved = store.peekSaved;

export const boardToCells = (board: Board) => Array.from(board);
export const cellsToBoard = (cells: number[]): Board => Int8Array.from(cells);

const HINTS_KEY = 'eclipse-hints';

export function readHints(): boolean {
	if (typeof localStorage === 'undefined') return true;
	try {
		return localStorage.getItem(HINTS_KEY) !== 'off';
	} catch {
		return true;
	}
}

export function writeHints(on: boolean) {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(HINTS_KEY, on ? 'on' : 'off');
	} catch {
		// Storage blocked: the toggle still works for this visit.
	}
}

/** Moon and sun faces, or plain black (moves first) and white stones. */
export type PieceStyle = 'celestial' | 'classic';

const PIECES_KEY = 'eclipse-pieces';

export function readPieces(): PieceStyle {
	if (typeof localStorage === 'undefined') return 'celestial';
	try {
		return localStorage.getItem(PIECES_KEY) === 'classic' ? 'classic' : 'celestial';
	} catch {
		return 'celestial';
	}
}

export function writePieces(style: PieceStyle) {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(PIECES_KEY, style);
	} catch {
		// Storage blocked: the choice still applies for this visit.
	}
}
