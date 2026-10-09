import type { Progress } from './engine/game';
import { TABLE_IDS, type Difficulty, type TableId } from './types';

export type SavedGame = { table: TableId; difficulty: Difficulty; seed: number; progress: Progress<unknown> };
export type Best = { score: number; feat: number };
export type Bests = Record<TableId, Record<Difficulty, Best>>;

export type PinballPrefs = {
	table: TableId;
	difficulty: Difficulty;
	rumble: boolean;
	voice: boolean;
	best: Bests;
	played: number;
	saved: SavedGame | null;
};

const KEY = 'silverball';

const emptyBests = (): Bests =>
	Object.fromEntries(TABLE_IDS.map((id) => [id, { kind: { score: 0, feat: 0 }, fair: { score: 0, feat: 0 }, wicked: { score: 0, feat: 0 } }])) as Bests;

export const DEFAULT_PINBALL: PinballPrefs = {
	table: 'carnival',
	difficulty: 'fair',
	rumble: true,
	voice: true,
	best: emptyBests(),
	played: 0,
	saved: null
};

const count = (value: unknown) => Math.max(0, Math.floor(Number(value) || 0));
const isDifficulty = (value: unknown): value is Difficulty => value === 'kind' || value === 'fair' || value === 'wicked';
const isTable = (value: unknown): value is TableId => TABLE_IDS.includes(value as TableId);

function normalizeBest(raw: unknown): Best {
	const src = (raw ?? {}) as Partial<Record<keyof Best, unknown>>;
	return { score: count(src.score), feat: count(src.feat) };
}

function normalizeSaved(raw: unknown): SavedGame | null {
	if (!raw || typeof raw !== 'object') return null;
	const src = raw as Partial<Record<keyof SavedGame, unknown>>;
	if (!isTable(src.table) || !isDifficulty(src.difficulty)) return null;
	const p = (src.progress ?? null) as Partial<Record<keyof Progress<unknown>, unknown>> | null;
	if (!p || typeof p !== 'object') return null;
	const ball = count(p.ball);
	if (ball < 1 || ball > 5) return null;
	const lanes: Record<string, boolean[]> = {};
	if (p.lanes && typeof p.lanes === 'object') {
		for (const [k, v] of Object.entries(p.lanes as Record<string, unknown>)) if (Array.isArray(v)) lanes[k] = v.map(Boolean);
	}
	return {
		table: src.table,
		difficulty: src.difficulty,
		seed: count(src.seed) >>> 0,
		progress: {
			score: count(p.score),
			ball,
			extra: Math.min(3, count(p.extra)),
			mult: Math.max(1, count(p.mult)),
			bonus: count(p.bonus),
			lanes,
			kickback: p.kickback === true,
			s: p.s ?? null
		}
	};
}

export function normalizePinball(raw: unknown): PinballPrefs {
	const out = structuredClone(DEFAULT_PINBALL);
	if (!raw || typeof raw !== 'object') return out;
	const src = raw as Partial<Record<keyof PinballPrefs, unknown>>;
	const best = (src.best ?? {}) as Partial<Record<TableId, Partial<Record<Difficulty, unknown>>>>;
	for (const id of TABLE_IDS) {
		const b = best[id] ?? {};
		out.best[id] = { kind: normalizeBest(b.kind), fair: normalizeBest(b.fair), wicked: normalizeBest(b.wicked) };
	}
	out.table = isTable(src.table) ? src.table : 'carnival';
	out.difficulty = isDifficulty(src.difficulty) ? src.difficulty : 'fair';
	out.rumble = src.rumble !== false;
	out.voice = src.voice !== false;
	out.played = count(src.played);
	out.saved = normalizeSaved(src.saved);
	return out;
}

function read(): PinballPrefs {
	if (typeof localStorage === 'undefined') return structuredClone(DEFAULT_PINBALL);
	try {
		return normalizePinball(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
	} catch {
		return structuredClone(DEFAULT_PINBALL);
	}
}

let cache = read();

export function peekPinball(): PinballPrefs {
	return cache;
}

export function writePinball(patch: Partial<PinballPrefs>) {
	cache = { ...cache, ...patch };
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(KEY, JSON.stringify(cache));
	} catch {
		// Storage full or blocked: keep playing from memory.
	}
}
