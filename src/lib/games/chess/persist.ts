import { Position, START_FEN } from './engine';
import { OPPONENTS, TIME_CONTROLS, type Mode, type OpponentId, type Record3, type Side, type SideChoice, type TimeControl } from './types';

export type SavedGame = {
	mode: Mode;
	opponent: OpponentId;
	/** The human's colour against the AI. */
	human: Side;
	time: TimeControl;
	moves: string[];
	clocks: { w: number; b: number } | null;
};

export type ChessView = {
	mode: Mode;
	opponent: OpponentId;
	side: SideChoice;
	time: TimeControl;
	coords: boolean;
	hints: boolean;
	autoFlip: boolean;
	evalBar: boolean;
	records: Record<OpponentId, Record3>;
	hotseat: { w: number; b: number; d: number };
};

const KEY = 'chess';

const asMode = (v: unknown): Mode => (v === 'hotseat' ? 'hotseat' : 'ai');
const asSide = (v: unknown): Side => (v === 'b' ? 'b' : 'w');
const asChoice = (v: unknown): SideChoice => (v === 'b' || v === 'random' ? v : 'w');
const asTime = (v: unknown): TimeControl => (TIME_CONTROLS.includes(v as TimeControl) ? (v as TimeControl) : 'none');
const asOpponent = (v: unknown): OpponentId => (OPPONENTS.some((o) => o.id === v) ? (v as OpponentId) : 'wren');
const count = (v: unknown) => Math.max(0, Math.floor(Number(v) || 0));

function freshRecords(): Record<OpponentId, Record3> {
	return Object.fromEntries(OPPONENTS.map((o) => [o.id, { w: 0, d: 0, l: 0 }])) as Record<OpponentId, Record3>;
}

export function freshView(): ChessView {
	return {
		mode: 'ai',
		opponent: 'wren',
		side: 'w',
		time: 'none',
		coords: true,
		hints: true,
		autoFlip: false,
		evalBar: false,
		records: freshRecords(),
		hotseat: { w: 0, b: 0, d: 0 }
	};
}

function normalizeView(raw: unknown): ChessView {
	const base = freshView();
	if (!raw || typeof raw !== 'object') return base;
	const src = raw as Partial<Record<keyof ChessView, unknown>>;
	const records = freshRecords();
	const rawRecords = (src.records && typeof src.records === 'object' ? src.records : {}) as Record<string, Partial<Record3>>;
	for (const o of OPPONENTS) {
		const r = rawRecords[o.id];
		if (r) records[o.id] = { w: count(r.w), d: count(r.d), l: count(r.l) };
	}
	const hot = (src.hotseat && typeof src.hotseat === 'object' ? src.hotseat : {}) as Partial<ChessView['hotseat']>;
	return {
		mode: asMode(src.mode),
		opponent: asOpponent(src.opponent),
		side: asChoice(src.side),
		time: asTime(src.time),
		coords: src.coords !== false,
		hints: src.hints !== false,
		autoFlip: src.autoFlip === true,
		evalBar: src.evalBar === true,
		records,
		hotseat: { w: count(hot.w), b: count(hot.b), d: count(hot.d) }
	};
}

function normalizeSaved(raw: unknown): SavedGame | null {
	if (!raw || typeof raw !== 'object') return null;
	const src = raw as Partial<Record<keyof SavedGame, unknown>>;
	if (!Array.isArray(src.moves) || !src.moves.every((m) => typeof m === 'string')) return null;
	const pos = new Position(START_FEN);
	for (const uci of src.moves as string[]) {
		const m = pos.moveFromUci(uci);
		if (!m) return null;
		pos.make(m);
	}
	if (!pos.hasLegalMove()) return null;
	const time = asTime(src.time);
	const c = src.clocks as { w?: unknown; b?: unknown } | null | undefined;
	const clocks = time !== 'none' && c ? { w: Math.max(0, Number(c.w) || 0), b: Math.max(0, Number(c.b) || 0) } : null;
	if (clocks && (clocks.w <= 0 || clocks.b <= 0)) return null;
	return {
		mode: asMode(src.mode),
		opponent: asOpponent(src.opponent),
		human: asSide(src.human),
		time,
		moves: [...(src.moves as string[])],
		clocks
	};
}

type Stored = { view: ChessView; saved: SavedGame | null };

function read(): Stored {
	if (typeof localStorage === 'undefined') return { view: freshView(), saved: null };
	try {
		const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Stored> | null;
		return { view: normalizeView(raw?.view), saved: normalizeSaved(raw?.saved) };
	} catch {
		return { view: freshView(), saved: null };
	}
}

let cache: Stored | null = null;

function current() {
	return (cache ??= read());
}

function write() {
	if (typeof localStorage === 'undefined' || !cache) return;
	try {
		localStorage.setItem(KEY, JSON.stringify(cache));
	} catch {
		// Storage full or blocked: keep playing from memory.
	}
}

export function readView(): ChessView {
	cache = read();
	return structuredClone(cache.view);
}

export function writeView(view: ChessView) {
	current().view = structuredClone(view);
	write();
}

export function peekSaved(): SavedGame | null {
	const saved = current().saved;
	return saved ? structuredClone(saved) : null;
}

export function writeSaved(saved: SavedGame | null) {
	current().saved = saved ? structuredClone(saved) : null;
	write();
}
