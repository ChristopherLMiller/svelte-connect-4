export type Mode = 'ripples' | 'currents';
export type Screen = 'menu' | 'play';
export type Status = { type: 'ready' } | { type: 'playing' } | { type: 'paused' } | { type: 'cleared' } | { type: 'over' };

/** Bloom kinds 1–6; 0 is open water. */
export type Kind = 1 | 2 | 3 | 4 | 5 | 6;
export const KINDS: Kind[] = [1, 2, 3, 4, 5, 6];

export type Bloom = {
	name: string;
	base: string;
	light: string;
	dark: string;
};

export const BLOOMS: Record<Kind, Bloom> = {
	1: { name: 'Lotus', base: '#ff6f9f', light: '#ffd3e2', dark: '#9c2350' },
	2: { name: 'Ginkgo', base: '#ffc93c', light: '#fff0b3', dark: '#9a6a00' },
	3: { name: 'Koi', base: '#ff6a2b', light: '#ffd0b5', dark: '#992f07' },
	4: { name: 'Lily pad', base: '#4fc46a', light: '#cdf5d6', dark: '#1d6a32' },
	5: { name: 'Iris', base: '#9b72ff', light: '#e2d6ff', dark: '#4b2aa6' },
	6: { name: 'Dragonfly', base: '#38a9ff', light: '#cbe9ff', dark: '#11598f' }
};

/** mulberry32: small, fast, and its whole state is one number we can save. */
export function nextRandom(state: { seed: number }) {
	state.seed = (state.seed + 0x6d2b79f5) >>> 0;
	let t = state.seed;
	t = Math.imul(t ^ (t >>> 15), t | 1);
	t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const newSeed = () => Math.floor(Math.random() * 2 ** 31) >>> 0;
