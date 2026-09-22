export const COLS = 18;
export const ROWS = 14;
export const START_LEN = 4;

export type Point = { x: number; y: number };
export type Dir = 'up' | 'down' | 'left' | 'right';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Screen = 'menu' | 'play';
export type Death = 'wall' | 'self';

export type GameStatus =
	| { type: 'playing' }
	| { type: 'paused' }
	| { type: 'dead'; cause: Death }
	| { type: 'won' };

export type BestMap = Record<Difficulty, number>;
