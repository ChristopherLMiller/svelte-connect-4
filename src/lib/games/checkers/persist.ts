import { asDifficulty, asMode, asPlayer, createGamePrefs, type GamePrefs } from '../kit/prefs';
import { cloneBoard } from './engine';
import type { Board, Coord, Difficulty, GameMode, Player } from './types';

export type SavedMatch = {
	mode: GameMode;
	difficulty: Difficulty;
	board: Board;
	current: Player;
	/** Piece that must continue a multi-jump, if the match was saved mid-sequence. */
	chaining?: Coord | null;
	/** Plies since the last capture or man move. */
	idle?: number;
};

export type CheckersPrefs = GamePrefs<SavedMatch>;

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

function normalizeSaved(raw: unknown): SavedMatch | null {
	if (!raw || typeof raw !== 'object') return null;
	const src = raw as Partial<SavedMatch>;
	const board = asBoard(src.board);
	const current = asPlayer(src.current);
	if (!board || !current) return null;
	const chain = src.chaining;
	const chaining =
		chain && Number.isInteger(chain.r) && Number.isInteger(chain.c) && board[chain.r]?.[chain.c]?.player === current
			? { r: chain.r, c: chain.c }
			: null;
	return {
		mode: asMode(src.mode),
		difficulty: asDifficulty(src.difficulty),
		board,
		current,
		chaining,
		idle: Math.max(0, Math.floor(Number(src.idle) || 0))
	};
}

const store = createGamePrefs<SavedMatch>({
	key: 'ashcourt-yard',
	normalizeSaved,
	cloneSaved: (saved) => ({ ...saved, board: cloneBoard(saved.board) })
});

export const checkersPrefs = store;
export const peekCheckers = store.peek;
export const writeCheckers = store.write;
export const scoresFor = store.scoresFor;
export const writeScores = store.writeScores;
export const writeSaved = store.writeSaved;
export const peekSaved = store.peekSaved;
