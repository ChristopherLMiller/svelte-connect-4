export type Level = 'shore' | 'lake' | 'black';
export type Screen = 'menu' | 'play';
export type Status =
	| { type: 'ready' }
	| { type: 'playing' }
	| { type: 'paused' }
	| { type: 'won' }
	| { type: 'lost' };

export type Spec = { w: number; h: number; mines: number };

export const LEVELS: Level[] = ['shore', 'lake', 'black'];

export const LEVEL_INFO: Record<Level, Spec & { name: string; tag: string; body: string }> = {
	shore: {
		w: 9,
		h: 9,
		mines: 10,
		name: 'Shore ice',
		tag: 'Close to land',
		body: 'Nine by nine, ten thin patches. The ice is thick near the reeds.'
	},
	lake: {
		w: 16,
		h: 16,
		mines: 40,
		name: 'Open lake',
		tag: 'Out past the jetty',
		body: 'Sixteen square, forty soft spots. The old fishing grounds.'
	},
	black: {
		w: 30,
		h: 16,
		mines: 99,
		name: 'Black ice',
		tag: 'Over the deep channel',
		body: 'Thirty by sixteen, ninety-nine places where the water waits.'
	}
};

/** The daily survey is always an open lake, guess-free, started from a drilled hole. */
export const DAILY: Spec = { w: 16, h: 16, mines: 40 };

/** Cell state: frosted, opened, or marked with a tip-up flag. */
export const HIDDEN = 0;
export const OPEN = 1;
export const FLAG = 2;

/** Crack colours for counts 1–8, legible on clear dark ice. */
export const CRACK_HUE = ['', '#9fe9ff', '#7ff0c4', '#ffb58a', '#c9a8ff', '#ff8aa8', '#ffe08a', '#f4fbff', '#b7c4d6'];

export function todayKey(date = new Date()) {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

export function formatClock(ms: number) {
	const total = Math.max(0, ms) / 1000;
	const m = Math.floor(total / 60);
	const s = total - m * 60;
	return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`;
}

export function formatPrecise(ms: number) {
	const total = Math.max(0, ms) / 1000;
	const m = Math.floor(total / 60);
	const s = total - m * 60;
	return `${m}:${s < 10 ? '0' : ''}${s.toFixed(2)}`;
}
