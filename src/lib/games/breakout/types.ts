/** Field units: everything in the engine and renderer is laid out on this logical canvas. */
export const FIELD_W = 832;
export const FIELD_H = 920;

export const COLS = 13;
export const ROWS = 13;
export const CELL_W = 60;
export const CELL_H = 28;
export const GRID_X = (FIELD_W - COLS * CELL_W) / 2;
export const GRID_Y = 72;

export const BEAM_Y = 816;
export const BEAM_H = 18;
export const FLOOR_Y = 854;
export const BALL_R = 9;

/** Pane kinds. 1–6 are glass colours; LEAD is iron tracery that never breaks. */
export const OPAL = 1;
export const AMBER = 2;
export const EMERALD = 3;
export const COBALT = 4;
export const RUBY = 5;
export const VIOLET = 6;
export const LEAD = 7;

export type Difficulty = 'easy' | 'medium' | 'hard';
export type Screen = 'menu' | 'play';
export type RelicKind = 'lantern' | 'triptych' | 'halo' | 'sunburst' | 'candle';
export type EffectKind = 'lantern' | 'halo' | 'sunburst';

export type Status =
	| { type: 'serve' }
	| { type: 'playing' }
	| { type: 'paused' }
	| { type: 'cleared' }
	| { type: 'over' }
	| { type: 'won' };

export type BestMap = Record<Difficulty, number>;

export type Hue = {
	name: string;
	base: string;
	light: string;
	dark: string;
	rgb: [number, number, number];
	points: number;
};

export const HUES: Record<number, Hue> = {
	[OPAL]: { name: 'opal', base: '#cdd8e6', light: '#f4f8ff', dark: '#6f7c93', rgb: [0.86, 0.9, 1], points: 10 },
	[AMBER]: { name: 'amber', base: '#e8a23a', light: '#ffd98a', dark: '#83470f', rgb: [1, 0.72, 0.3], points: 15 },
	[EMERALD]: { name: 'emerald', base: '#1f9a5c', light: '#7ff0b0', dark: '#0a4528', rgb: [0.3, 0.92, 0.58], points: 20 },
	[COBALT]: { name: 'cobalt', base: '#2b5ad0', light: '#93b3ff', dark: '#0f245c', rgb: [0.4, 0.58, 1], points: 25 },
	[RUBY]: { name: 'ruby', base: '#c8243c', light: '#ff8c9c', dark: '#5a0b18', rgb: [1, 0.36, 0.44], points: 30 },
	[VIOLET]: { name: 'violet', base: '#7b3dcc', light: '#cba3ff', dark: '#31145e', rgb: [0.72, 0.5, 1], points: 40 }
};

export const HOURS: Record<Difficulty, { name: string; short: string }> = {
	easy: { name: 'Vespers', short: 'Evening' },
	medium: { name: 'Compline', short: 'Night' },
	hard: { name: 'Nocturns', short: 'Midnight' }
};
