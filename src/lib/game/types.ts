export const COLS = 7;
export const ROWS = 6;

export type Player = 1 | 2;
export type Cell = 0 | Player;
export type Board = Cell[][];

export type GameMode = 'local' | 'ai';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Screen = 'menu' | 'play';

export type WinResult = {
	winner: Player;
	cells: Array<[number, number]>;
};

export type GameStatus =
	| { type: 'playing' }
	| { type: 'won'; winner: Player; cells: Array<[number, number]> }
	| { type: 'draw' };

export type Piece = {
	id: number;
	player: Player;
	col: number;
	row: number;
	y: number;
	scaleX: number;
	scaleY: number;
	vy: number;
	settled: boolean;
	winning: boolean;
};

export type Layout = {
	cols: number;
	rows: number;
	pad: number;
	gap: number;
	cell: number;
	disc: number;
	sky: number;
	width: number;
	height: number;
};

export type FxKind = 'block' | 'win' | 'impact';

export type ThreatCell = {
	col: number;
	row: number;
};

export type FxBurst = {
	id: number;
	kind: FxKind;
	col: number;
	row: number;
	player: Player;
	impact?: number;
};
