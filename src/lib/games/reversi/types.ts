import type { Difficulty, GameMode, ScorePair } from '../kit/prefs';

export type { Difficulty, GameMode, ScorePair };

export const SIZE = 8;

/** Moon moves first. */
export const MOON = 1;
export const SUN = 2;

export type Player = 1 | 2;
export type Cell = 0 | Player;
/** Row-major, 64 cells. */
export type Board = Int8Array;
export type Screen = 'menu' | 'play';

export type GameStatus =
	| { type: 'playing' }
	| { type: 'won'; winner: Player }
	| { type: 'draw' };

/** Discs turned by one move, grouped by direction and ordered outward from the placed disc. */
export type FlipLine = number[];

export type MoveResult = {
	board: Board;
	lines: FlipLine[];
	flipped: number;
};

export const nameOf = (player: Player) => (player === MOON ? 'Moon' : 'Sun');
export const opponent = (player: Player): Player => (player === MOON ? SUN : MOON);
export const rowOf = (index: number) => index >> 3;
export const colOf = (index: number) => index & 7;
export const at = (r: number, c: number) => r * SIZE + c;
export const isCorner = (index: number) => index === 0 || index === 7 || index === 56 || index === 63;
