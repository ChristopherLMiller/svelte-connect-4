export const COLS = 10;
export const ROWS = 20;
/** Rows above the visible well where pieces spawn. */
export const HIDDEN = 2;
export const TOTAL = ROWS + HIDDEN;

/** Piece kinds; 0 is open water. */
export const I = 1;
export const O = 2;
export const T = 3;
export const S = 4;
export const Z = 5;
export const J = 6;
export const L = 7;
export type Kind = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const KINDS: Kind[] = [I, O, T, S, Z, J, L];

export type Mode = 'marathon' | 'sprint';
export type Screen = 'menu' | 'play';
export type Status =
	| { type: 'ready' }
	| { type: 'playing' }
	| { type: 'paused' }
	| { type: 'over' }
	| { type: 'done' };

export const SPRINT_LINES = 40;
export const LINES_PER_LEVEL = 10;
export const MAX_START = 15;

export type Species = {
	name: string;
	creature: string;
	base: string;
	light: string;
	dark: string;
	rgb: [number, number, number];
};

export const SPECIES: Record<Kind, Species> = {
	[I]: { name: 'cyan', creature: 'Comb jelly', base: '#3fe9ff', light: '#c8fbff', dark: '#06505f', rgb: [0.25, 0.92, 1] },
	[O]: { name: 'gold', creature: 'Lanternfish', base: '#ffd34d', light: '#fff1b8', dark: '#6e4f06', rgb: [1, 0.83, 0.3] },
	[T]: { name: 'magenta', creature: 'Anemone', base: '#ff4fd8', light: '#ffc6f3', dark: '#650a52', rgb: [1, 0.32, 0.85] },
	[S]: { name: 'green', creature: 'Siphonophore', base: '#4dff8f', light: '#c6ffd9', dark: '#0b5a2a', rgb: [0.3, 1, 0.56] },
	[Z]: { name: 'coral', creature: 'Fire jelly', base: '#ff5a64', light: '#ffc2c6', dark: '#650f17', rgb: [1, 0.36, 0.4] },
	[J]: { name: 'blue', creature: 'Sea sapphire', base: '#5f7dff', light: '#c8d2ff', dark: '#142266', rgb: [0.38, 0.5, 1] },
	[L]: { name: 'amber', creature: 'Sea pen', base: '#ff9a3d', light: '#ffd8b0', dark: '#62300a', rgb: [1, 0.6, 0.24] }
};

/** "r, g, b" in 0–255 for canvas and CSS colour strings. */
export function cssRgb(kind: Kind) {
	return SPECIES[kind].rgb.map((v) => Math.round(v * 255)).join(', ');
}

/** Metres below the surface for a level: the midnight zone starts at a thousand. */
export function depthOf(level: number) {
	return 1000 + (level - 1) * 250;
}

/** How far down the gauge a level sits; it pegs at the trench, level 21. */
export function depthFraction(level: number) {
	return Math.min(1, (depthOf(level) - 1000) / 5000);
}

export function zoneOf(depth: number) {
	if (depth < 4000) return 'Midnight zone';
	if (depth < 6000) return 'Abyssal zone';
	return 'Hadal trench';
}
