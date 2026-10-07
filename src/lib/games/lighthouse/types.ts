import type { Difficulty, GameMode, ScorePair } from '../kit/prefs';

export type { Difficulty, GameMode, ScorePair };

export const NORTH = 1;
export const SOUTH = 2;

export type Player = 1 | 2;
export type Screen = 'menu' | 'setup' | 'play';

export type Sea = 'cove' | 'channel' | 'ocean';
export const SEAS: Sea[] = ['cove', 'channel', 'ocean'];

export type ShipInfo = { name: string; length: number };

export const SEA_INFO: Record<Sea, { name: string; size: number; blurb: string; tag: string; ships: ShipInfo[] }> = {
	cove: {
		name: 'Smugglers’ cove',
		size: 8,
		blurb: 'A tight inlet and four hulls. Quick, close fights.',
		tag: '8 × 8',
		ships: [
			{ name: 'Brigantine', length: 4 },
			{ name: 'Schooner', length: 3 },
			{ name: 'Sloop', length: 3 },
			{ name: 'Cutter', length: 2 }
		]
	},
	channel: {
		name: 'The channel',
		size: 10,
		blurb: 'The classic waters: five ships between the lights.',
		tag: '10 × 10',
		ships: [
			{ name: 'Galleon', length: 5 },
			{ name: 'Brigantine', length: 4 },
			{ name: 'Schooner', length: 3 },
			{ name: 'Sloop', length: 3 },
			{ name: 'Cutter', length: 2 }
		]
	},
	ocean: {
		name: 'Open sea',
		size: 12,
		blurb: 'Wide dark water and six hulls to hunt.',
		tag: '12 × 12',
		ships: [
			{ name: 'Galleon', length: 5 },
			{ name: 'Brigantine', length: 4 },
			{ name: 'Barque', length: 4 },
			{ name: 'Schooner', length: 3 },
			{ name: 'Sloop', length: 3 },
			{ name: 'Cutter', length: 2 }
		]
	}
};

export const lengthsOf = (sea: Sea) => SEA_INFO[sea].ships.map((ship) => ship.length);

export type Weather = 'storm' | 'fog' | 'moon';
export const WEATHERS: Weather[] = ['storm', 'fog', 'moon'];

export const WEATHER_INFO: Record<Weather, { name: string; blurb: string; hue: string }> = {
	storm: {
		name: 'Storm',
		blurb: 'Rain, lightning and heavy swell',
		hue: '#7fa8d6'
	},
	fog: { name: 'Fog', blurb: 'Thick banks and the foghorn', hue: '#b9c4c8' },
	moon: {
		name: 'Moonlit',
		blurb: 'Calm water under a full moon',
		hue: '#f2deaa'
	}
};

export type GameStatus = { type: 'playing' } | { type: 'won'; winner: Player };

export const GLOW: Record<Player, string> = { 1: '#ffc65a', 2: '#7fe0d0' };

export const nameOf = (player: Player, mode: GameMode) =>
	player === NORTH ? (mode === 'ai' ? 'You' : 'North Light') : mode === 'ai' ? 'The Wrecker' : 'South Light';

export const opponent = (player: Player): Player => (player === NORTH ? SOUTH : NORTH);
