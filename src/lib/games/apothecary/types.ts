export type Bench = 'classic' | 'grand';
export type Board = Bench | 'daily';
export type Screen = 'menu' | 'play';
export type Dir = 'left' | 'right' | 'up' | 'down';

/** `stone` pauses on the first Philosopher's Stone; `kept` is brewing on past it. */
export type Status = { type: 'playing' } | { type: 'stone' } | { type: 'over' };

export const BENCHES: Bench[] = ['classic', 'grand'];

export const BENCH_INFO: Record<Bench, { n: number; name: string; tag: string; body: string }> = {
	classic: { n: 4, name: 'The bench', tag: 'Four by four', body: 'Sixteen wells in the old rack. Every pour counts.' },
	grand: { n: 5, name: 'The grand cabinet', tag: 'Five by five', body: 'Twenty-five wells. Room to dream of gold.' }
};

export const DAILY_N = 4;

/** The tier that ends a brew in triumph: 2^11 = 2048. */
export const STONE = 11;
export const UNDO_MAX = 3;
/** Distilling a new tier at or above this hands back a stopper. */
export const REFUND_TIER = 8;

export type Reagent = { name: string; color: string; note: string };

/** Index = tier (value 2^tier). */
export const REAGENTS: Reagent[] = [
	{ name: '', color: '#000000', note: '' },
	{ name: 'Rainwater', color: '#8fc8e8', note: 'Caught in a copper bowl' },
	{ name: 'Brine', color: '#cfe3d6', note: 'Sea salt, slowly dissolved' },
	{ name: 'Sulphur', color: '#e8c63a', note: 'Smells of struck matches' },
	{ name: 'Verdigris', color: '#2fb08a', note: 'Scraped from old roofs' },
	{ name: 'Cinnabar', color: '#d63a26', note: 'The red of dragon blood' },
	{ name: 'Woad', color: '#3354c8', note: 'Deep as a winter evening' },
	{ name: 'Quicksilver', color: '#c4ccd8', note: 'It will not sit still' },
	{ name: 'Aqua regia', color: '#f2821e', note: 'Dissolves even gold' },
	{ name: 'Vitriol', color: '#27d86a', note: 'Green fire in a bottle' },
	{ name: 'Aurum potabile', color: '#ffc83a', note: 'Drinkable gold' },
	{ name: "Philosopher's Stone", color: '#ff2450', note: 'The great work, complete' },
	{ name: 'Elixir of life', color: '#b46bff', note: 'Rumoured, never proven' },
	{ name: 'Quintessence', color: '#62ffe0', note: 'The fifth element' },
	{ name: 'Azoth', color: '#fff6e0', note: 'The universal solvent' },
	{ name: 'Prima materia', color: '#4a2a8a', note: 'What everything was before' },
	{ name: 'The void', color: '#20103a', note: 'Even the alchemists are silent' },
	{ name: 'Starlight', color: '#ffe8ff', note: 'Bottled at the end of time' },
	{ name: 'Beyond', color: '#ffffff', note: 'No one has seen this' }
];

export const MAX_TIER = REAGENTS.length - 1;

export function valueOf(tier: number) {
	return 2 ** tier;
}

export function reagentOf(tier: number) {
	return REAGENTS[Math.min(MAX_TIER, Math.max(0, tier))];
}

export function todayKey(date = new Date()) {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

export function nOf(board: Board) {
	return board === 'daily' ? DAILY_N : BENCH_INFO[board].n;
}
