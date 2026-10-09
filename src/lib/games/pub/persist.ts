import { validCribbage, type CribState } from './rules/cribbage';
import { validEuchre, type EuchreState } from './rules/euchre';
import { validGin, type GinState } from './rules/gin';
import { validHearts, type HeartsState } from './rules/hearts';
import { rulesOf, type ExtraKind, type ExtraState } from './rules/registry';
import { validSpades, type SpadesState } from './rules/spades';
import { DIFFICULTIES, VARIANTS, VARIANT_INFO, type Difficulty, type HotseatEuchre, type HotseatHearts, type Mode, type Variant } from './types';
import type { PubState } from './ai';

export type Record3 = { w: number; l: number };

export type SavedTable = {
	mode: Mode;
	difficulty: Difficulty;
	humans: boolean[];
	state: PubState;
};

export type VariantRecord = {
	ai: Record<Difficulty, Record3>;
	/** Pass-and-play games finished. */
	local: number;
	saved: SavedTable | null;
};

export type PubView = {
	variant: Variant;
	mode: Mode;
	difficulty: Difficulty;
	heartsPlayers: HotseatHearts;
	euchreSeats: HotseatEuchre;
	stick: boolean;
	euchreTarget: 5 | 10 | 11 | 15;
	/** Dim the cards you can't play. */
	hints: boolean;
	/** Rosie suggests and explains a move on your turn. */
	coach: boolean;
	/** How long the regulars linger over each card. */
	pace: 'brisk' | 'easy' | 'slow';
};

const VIEW_KEY = 'pub-view';
const recordKey = (variant: Variant) => `pub-${variant}`;

const count = (v: unknown) => Math.max(0, Math.floor(Number(v) || 0));

function read(key: string): unknown {
	if (typeof localStorage === 'undefined') return null;
	try {
		return JSON.parse(localStorage.getItem(key) ?? 'null');
	} catch {
		return null;
	}
}

function write(key: string, value: unknown) {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// Storage blocked or full: keep playing from memory.
	}
}

export function freshView(): PubView {
	return {
		variant: 'cribbage',
		mode: 'ai',
		difficulty: 'medium',
		heartsPlayers: 4,
		euchreSeats: 'partners',
		stick: true,
		euchreTarget: 10,
		hints: true,
		coach: true,
		pace: 'easy'
	};
}

export function readView(): PubView {
	const raw = read(VIEW_KEY) as Partial<Record<keyof PubView, unknown>> | null;
	const base = freshView();
	if (!raw || typeof raw !== 'object') return base;
	return {
		variant: VARIANTS.includes(raw.variant as Variant) ? (raw.variant as Variant) : base.variant,
		mode: raw.mode === 'local' ? 'local' : 'ai',
		difficulty: DIFFICULTIES.includes(raw.difficulty as Difficulty) ? (raw.difficulty as Difficulty) : base.difficulty,
		heartsPlayers: raw.heartsPlayers === 2 || raw.heartsPlayers === 3 ? raw.heartsPlayers : 4,
		euchreSeats: raw.euchreSeats === 'rivals' || raw.euchreSeats === 'four' ? raw.euchreSeats : 'partners',
		stick: raw.stick !== false,
		euchreTarget: raw.euchreTarget === 5 || raw.euchreTarget === 11 || raw.euchreTarget === 15 ? raw.euchreTarget : 10,
		hints: raw.hints !== false,
		coach: raw.coach !== false,
		pace: raw.pace === 'brisk' || raw.pace === 'slow' ? raw.pace : 'easy'
	};
}

export function writeView(view: PubView) {
	write(VIEW_KEY, view);
}

function validState(variant: Variant, state: unknown): state is PubState {
	if (!state || typeof state !== 'object') return false;
	const s = state as { kind?: unknown; phase?: unknown };
	if (s.kind !== variant || s.phase === 'over') return false;
	try {
		if (variant === 'cribbage') return validCribbage(state as CribState);
		if (variant === 'hearts') return validHearts(state as HeartsState);
		if (variant === 'gin') return validGin(state as GinState);
		if (variant === 'spades') return validSpades(state as SpadesState);
		if (variant === 'euchre') return validEuchre(state as EuchreState);
		return rulesOf(variant as ExtraKind).valid(state as ExtraState);
	} catch {
		return false;
	}
}

function asSaved(variant: Variant, raw: unknown): SavedTable | null {
	if (!raw || typeof raw !== 'object') return null;
	const src = raw as Partial<Record<keyof SavedTable, unknown>>;
	const seats = VARIANT_INFO[variant].players;
	if (!Array.isArray(src.humans) || src.humans.length !== seats || !src.humans.some((h) => h === true)) return null;
	if (!validState(variant, src.state)) return null;
	return {
		mode: src.mode === 'local' ? 'local' : 'ai',
		difficulty: DIFFICULTIES.includes(src.difficulty as Difficulty) ? (src.difficulty as Difficulty) : 'medium',
		humans: src.humans.map((h) => h === true),
		state: src.state
	};
}

export function readRecord(variant: Variant): VariantRecord {
	const raw = read(recordKey(variant)) as Partial<Record<keyof VariantRecord, unknown>> | null;
	const ai = (raw?.ai && typeof raw.ai === 'object' ? raw.ai : {}) as Partial<Record<Difficulty, Partial<Record3>>>;
	return {
		ai: {
			easy: { w: count(ai.easy?.w), l: count(ai.easy?.l) },
			medium: { w: count(ai.medium?.w), l: count(ai.medium?.l) },
			hard: { w: count(ai.hard?.w), l: count(ai.hard?.l) }
		},
		local: count(raw?.local),
		saved: asSaved(variant, raw?.saved)
	};
}

export function writeRecord(variant: Variant, record: VariantRecord) {
	write(recordKey(variant), record);
}
