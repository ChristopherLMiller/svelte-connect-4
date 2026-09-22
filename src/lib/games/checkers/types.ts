export const SIZE = 8;

export type Player = 1 | 2;
export type Coord = { r: number; c: number };
export type GameMode = 'local' | 'ai';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Screen = 'menu' | 'play';

export type Piece = {
	id: string;
	player: Player;
	king: boolean;
};

export type Cell = Piece | null;
export type Board = Cell[][];

export type Move = {
	from: Coord;
	to: Coord;
	path: Coord[];
	captured: Coord[];
	crown: boolean;
};

export type GameStatus =
	| { type: 'playing' }
	| { type: 'won'; winner: Player }
	| { type: 'draw' };

export type ScorePair = { 1: number; 2: number };

export type Ghost = {
	id: string;
	player: Player;
	king: boolean;
	r: number;
	c: number;
};

export type Fall = Ghost & { key: number };

export type Scorch = { r: number; c: number; id: number };

export function keyOf(coord: Coord) {
	return `${coord.r}:${coord.c}`;
}

export function same(a: Coord, b: Coord) {
	return a.r === b.r && a.c === b.c;
}

export function playable(r: number, c: number) {
	return (r + c) % 2 === 1;
}
