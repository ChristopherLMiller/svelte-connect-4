export type Difficulty = 'kind' | 'fair' | 'wicked';
export type Screen = 'menu' | 'play';
export type TableId = 'carnival' | 'woodrail' | 'space' | 'pirate' | 'deepsea' | 'dragon' | 'western';

export const TABLE_IDS: TableId[] = ['carnival', 'woodrail', 'space', 'pirate', 'deepsea', 'dragon', 'western'];

export const DIFFICULTIES: Array<{ id: Difficulty; name: string; note: string }> = [
	{ id: 'kind', name: 'Kind', note: 'Long ball save, a gentler slope, slower toys, and the kickback relit every ball' },
	{ id: 'fair', name: 'Fair', note: 'Each table as built: a short ball save and one kickback a game' },
	{ id: 'wicked', name: 'Wicked', note: 'A steep table, quick toys, a twitchy tilt and almost no mercy' }
];

/** mulberry32: small, fast, and its whole state is one number we can save. */
export function nextRandom(state: { seed: number }) {
	state.seed = (state.seed + 0x6d2b79f5) >>> 0;
	let t = state.seed;
	t = Math.imul(t ^ (t >>> 15), t | 1);
	t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const newSeed = () => Math.floor(Math.random() * 2 ** 31) >>> 0;
