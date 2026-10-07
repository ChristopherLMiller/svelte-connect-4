import type { Difficulty, GameMode, ScorePair } from '../kit/prefs';

export type { Difficulty, GameMode, ScorePair };

/** Firefly sows from the near row and opens the first game. */
export const FIREFLY = 1;
export const HERON = 2;

export type Player = 1 | 2;
export type Screen = 'menu' | 'play';

/** Pits 0–5 are Firefly's (left to right), 6 its store, 7–12 Heron's (right to left), 13 its store. */
export const PITS = 6;
export const STORE: Record<Player, number> = { 1: 6, 2: 13 };
export const SIZE = 14;

export type Sowing = 'handful' | 'classic' | 'harvest';

export const SOWINGS: Sowing[] = ['handful', 'classic', 'harvest'];

export const SOWING_INFO: Record<Sowing, { name: string; seeds: number; blurb: string; tag: string }> = {
	handful: { name: 'A handful', seeds: 3, blurb: 'Three seeds a pit. Quick, sharp games.', tag: 'Short evening' },
	classic: { name: 'The old way', seeds: 4, blurb: 'Four seeds a pit, as the river elders play.', tag: 'Classic Kalah' },
	harvest: { name: 'A harvest', seeds: 6, blurb: 'Six seeds a pit. Long laps and big captures.', tag: 'Full baskets' }
};

export type GameStatus =
	| { type: 'playing' }
	| { type: 'won'; winner: Player }
	| { type: 'draw' };

export const GLOW: Record<Player, string> = { 1: '#f6c453', 2: '#8fc3ea' };
export const GLOW_SOFT: Record<Player, string> = { 1: '#ffe59a', 2: '#cfe6f7' };

export const nameOf = (player: Player, mode: GameMode) =>
	player === FIREFLY ? 'Firefly' : mode === 'ai' ? 'Old Heron' : 'Heron';
export const opponent = (player: Player): Player => (player === FIREFLY ? HERON : FIREFLY);
