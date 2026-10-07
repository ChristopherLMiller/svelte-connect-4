import type { Difficulty, GameMode, ScorePair } from '../kit/prefs';

export type { Difficulty, GameMode, ScorePair };

/** Slate (the dark stones) opens the first game; the opener alternates after that. */
export const SLATE = 1;
export const QUARTZ = 2;

export type Player = 1 | 2;
export type Screen = 'menu' | 'play';

export type Garden = 'courtyard' | 'temple' | 'grand';
export const GARDENS: Garden[] = ['courtyard', 'temple', 'grand'];

export const GARDEN_INFO: Record<Garden, { name: string; size: number; blurb: string; tag: string }> = {
	courtyard: { name: 'Courtyard', size: 13, blurb: 'A small bed by the gate. Quick, tight games.', tag: '13 × 13' },
	temple: { name: 'Temple garden', size: 15, blurb: 'The classic bed, raked every morning.', tag: '15 × 15' },
	grand: { name: 'Grand garden', size: 19, blurb: 'Wide gravel and room to plan.', tag: '19 × 19' }
};

export type Season = 'spring' | 'autumn' | 'winter';
export const SEASONS: Season[] = ['spring', 'autumn', 'winter'];

export const SEASON_INFO: Record<Season, { name: string; blurb: string; hue: string }> = {
	spring: { name: 'Spring', blurb: 'Cherry blossom on the wind', hue: '#f4a7bb' },
	autumn: { name: 'Autumn', blurb: 'Maple leaves and long light', hue: '#e0603a' },
	winter: { name: 'Winter', blurb: 'Snow on the lantern roof', hue: '#cfe0ee' }
};

export type GameStatus =
	| { type: 'playing' }
	| { type: 'won'; winner: Player; line: number[] }
	| { type: 'draw' };

export const GLOW: Record<Player, string> = { 1: '#9fb8cf', 2: '#f2e3c2' };

export const nameOf = (player: Player, mode: GameMode) => (player === SLATE ? 'Slate' : mode === 'ai' ? 'The Monk' : 'Quartz');
export const opponent = (player: Player): Player => (player === SLATE ? QUARTZ : SLATE);
