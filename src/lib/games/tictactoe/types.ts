export const SIZE = 3;

export type Player = 1 | 2;
export type Cell = 0 | Player;
export type Board = Cell[][];

export type GameMode = 'local' | 'ai';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Screen = 'menu' | 'play';

export type GameStatus =
	| { type: 'playing' }
	| { type: 'won'; winner: Player; cells: Array<[number, number]> }
	| { type: 'draw' };

export type ScorePair = { 1: number; 2: number };
