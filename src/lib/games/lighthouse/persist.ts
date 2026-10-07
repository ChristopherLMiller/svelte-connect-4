import { asDifficulty, asMode, asPlayer, createGamePrefs, type GamePrefs } from '../kit/prefs';
import { replay, type Placement } from './engine';
import { SEA_INFO, lengthsOf, type Difficulty, type GameMode, type Player, type Sea, type Weather } from './types';

export type SavedMatch = {
	mode: GameMode;
	difficulty: Difficulty;
	sea: Sea;
	first: Player;
	chain: boolean;
	fleets: Record<Player, Placement[]>;
	shots: Array<[Player, number]>;
};

export type LightPrefs = GamePrefs<SavedMatch>;

export function asSea(value: unknown): Sea {
	return value === 'cove' || value === 'ocean' ? value : 'channel';
}

export function asWeather(value: unknown): Weather {
	return value === 'fog' || value === 'moon' ? value : 'storm';
}

function asFleet(value: unknown): Placement[] {
	if (!Array.isArray(value)) return [];
	return value.map((p) => ({
		at: Math.floor(Number(p?.at)),
		vertical: p?.vertical === true
	}));
}

function normalizeSaved(raw: unknown): SavedMatch | null {
	if (!raw || typeof raw !== 'object') return null;
	const src = raw as Partial<Record<keyof SavedMatch, unknown>>;
	const sea = asSea(src.sea);
	const first = asPlayer(src.first) ?? 1;
	const chain = src.chain === true;
	const rawFleets = (src.fleets && typeof src.fleets === 'object' ? src.fleets : {}) as Record<string, unknown>;
	const fleets = { 1: asFleet(rawFleets[1]), 2: asFleet(rawFleets[2]) };
	if (!Array.isArray(src.shots)) return null;
	const shots: Array<[Player, number]> = [];
	for (const shot of src.shots) {
		if (!Array.isArray(shot)) return null;
		const player = asPlayer(shot[0]);
		if (!player) return null;
		shots.push([player, Math.floor(Number(shot[1]))]);
	}
	const battle = replay(SEA_INFO[sea].size, lengthsOf(sea), fleets, shots, first, chain);
	if (!battle || battle.status.type !== 'playing') return null;
	return {
		mode: asMode(src.mode),
		difficulty: asDifficulty(src.difficulty),
		sea,
		first,
		chain,
		fleets,
		shots
	};
}

const store = createGamePrefs<SavedMatch>({
	key: 'lighthouse',
	normalizeSaved
});

export const lightPrefs = store;
export const scoresFor = store.scoresFor;
export const writeSaved = store.writeSaved;
export const peekSaved = store.peekSaved;

export type LightView = {
	sea: Sea;
	weather: Weather;
	/** A hit (or a sinking) earns another shot. */
	chain: boolean;
	/** Battles finished, for the menu tally. */
	fought: number;
	/** Ships sunk across every battle, for the menu tally. */
	wrecks: number;
};

const VIEW_KEY = 'lighthouse-view';

export function readView(): LightView {
	const fallback: LightView = {
		sea: 'channel',
		weather: 'storm',
		chain: false,
		fought: 0,
		wrecks: 0
	};
	if (typeof localStorage === 'undefined') return fallback;
	try {
		const raw = JSON.parse(localStorage.getItem(VIEW_KEY) ?? 'null') as Partial<Record<keyof LightView, unknown>> | null;
		if (!raw || typeof raw !== 'object') return fallback;
		return {
			sea: asSea(raw.sea),
			weather: asWeather(raw.weather),
			chain: raw.chain === true,
			fought: Math.max(0, Math.floor(Number(raw.fought) || 0)),
			wrecks: Math.max(0, Math.floor(Number(raw.wrecks) || 0))
		};
	} catch {
		return fallback;
	}
}

export function writeView(view: LightView) {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(VIEW_KEY, JSON.stringify(view));
	} catch {
		// Storage blocked: the choice still applies for this visit.
	}
}
