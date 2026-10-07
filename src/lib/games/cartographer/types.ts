import type { Difficulty, GameMode, ScorePair } from '../kit/prefs';

export type { Difficulty, GameMode, ScorePair };

/** Vermilion inks first. */
export const VERMILION = 1;
export const INDIGO = 2;

export type Player = 1 | 2;
export type Screen = 'menu' | 'play';

export type Chart = 'isle' | 'coast' | 'realm';

export const CHARTS: Chart[] = ['isle', 'coast', 'realm'];

export const CHART_INFO: Record<Chart, { name: string; size: number; blurb: string; tag: string }> = {
	isle: { name: 'An isle', size: 4, blurb: 'Sixteen squares. A quick survey before supper.', tag: 'Pocket chart' },
	coast: { name: 'A coast', size: 6, blurb: 'Thirty-six squares of headland, bay and forest.', tag: 'Sea chart' },
	realm: { name: 'A realm', size: 8, blurb: 'Sixty-four squares. Long chains, long night.', tag: 'Grand atlas' }
};

export type GameStatus =
	| { type: 'playing' }
	| { type: 'won'; winner: Player }
	| { type: 'draw' };

export const INK: Record<Player, string> = { 1: '#b3311d', 2: '#26407f' };
export const INK_SOFT: Record<Player, string> = { 1: '#d9583e', 2: '#4a6cb8' };

export const nameOf = (player: Player, mode: GameMode) =>
	player === VERMILION ? 'Vermilion' : mode === 'ai' ? 'Mercator' : 'Indigo';
export const opponent = (player: Player): Player => (player === VERMILION ? INDIGO : VERMILION);
