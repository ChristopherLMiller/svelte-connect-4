import { fullDeck, isRed, shuffle, suitOf, type Card } from '../../kit/cards/deck';
import type { Difficulty } from '../types';
import { lowRank, pileOf, pushPast, stacksAlt } from './patience';
import type { RuleSet } from './types';

type Snap = { cells: Array<Card | null>; foundations: Card[][]; tableau: Card[][] };

export type FreeCellState = {
	kind: 'freecell';
	phase: 'play' | 'over';
	handNo: number;
	cells: Array<Card | null>;
	foundations: Card[][];
	tableau: Card[][];
	moves: number;
	past: Snap[];
	solved: boolean;
	winners: number[];
};

export type FreeCellAction = { type: 'move'; card: Card; to: string } | { type: 'auto' } | { type: 'undo' } | { type: 'resign' } | { type: 'next' };

const CELLS: Record<Difficulty, number> = { easy: 5, medium: 4, hard: 3 };

export function dealFreeCell(level: Difficulty, random: () => number): FreeCellState {
	const deck = shuffle(fullDeck(), random);
	const tableau: Card[][] = Array.from({ length: 8 }, () => []);
	deck.forEach((c, i) => tableau[i % 8].push(c));
	const s: FreeCellState = { kind: 'freecell', phase: 'play', handNo: 1, cells: Array(CELLS[level]).fill(null), foundations: [[], [], [], []], tableau, moves: 0, past: [], solved: false, winners: [] };
	autoHome(s);
	return s;
}

/** Longest run that can move at once: one card per free cell, doubled for each empty column. */
export function maxRun(s: FreeCellState, toEmpty: boolean) {
	const free = s.cells.filter((c) => c === null).length;
	const empty = s.tableau.filter((c) => !c.length).length - (toEmpty ? 1 : 0);
	return (free + 1) * 2 ** Math.max(0, empty);
}

/** A card the table can't need any more: both other-colour cards one lower are home. */
export function safeHomeFC(s: { foundations: Card[][] }, c: Card) {
	const r = lowRank(c);
	if (s.foundations[suitOf(c)].length !== r) return false;
	if (r <= 1) return true;
	return [0, 1, 2, 3].filter((f) => isRed(f * 13) !== isRed(c)).every((f) => s.foundations[f].length >= r);
}

/** Send safe cards home automatically, the way most FreeCell tables do. Returns the cards moved. */
export function autoHome(s: { cells: Array<Card | null>; foundations: Card[][]; tableau: Card[][] }): Card[] {
	const moved: Card[] = [];
	for (let again = true; again; ) {
		again = false;
		for (let i = 0; i < s.cells.length; i++) {
			const c = s.cells[i];
			if (c !== null && safeHomeFC(s, c)) {
				s.foundations[suitOf(c)].push(c);
				s.cells[i] = null;
				moved.push(c);
				again = true;
			}
		}
		for (const col of s.tableau) {
			const c = col[col.length - 1];
			if (c !== undefined && safeHomeFC(s, c)) {
				s.foundations[suitOf(c)].push(col.pop()!);
				moved.push(c);
				again = true;
			}
		}
	}
	return moved;
}

export function locateFC(s: FreeCellState, c: Card): { pile: string; index: number } | null {
	const cell = s.cells.indexOf(c);
	if (cell >= 0) return { pile: `c${cell}`, index: 0 };
	for (let i = 0; i < 8; i++) {
		const at = s.tableau[i].indexOf(c);
		if (at >= 0) return { pile: `t${i}`, index: at };
	}
	return null;
}

/** The cards from index `at` to the top form a run that can move together. */
export function isRun(col: Card[], at: number) {
	for (let i = at + 1; i < col.length; i++) if (!stacksAlt(col[i], col[i - 1])) return false;
	return true;
}

export function targetsFC(s: FreeCellState, c: Card): string[] {
	const from = locateFC(s, c);
	if (!from) return [];
	const out: string[] = [];
	const src = pileOf(from.pile);
	const n = src.kind === 'c' ? 1 : s.tableau[src.i].length - from.index;
	if (src.kind === 't' && !isRun(s.tableau[src.i], from.index)) return [];
	if (n === 1 && s.foundations[suitOf(c)].length === lowRank(c)) out.push(`f${suitOf(c)}`);
	for (let i = 0; i < 8; i++) {
		if (from.pile === `t${i}`) continue;
		const col = s.tableau[i];
		if (col.length ? stacksAlt(c, col[col.length - 1]) && n <= maxRun(s, false) : n <= maxRun(s, true) && !(src.kind === 't' && from.index === 0)) out.push(`t${i}`);
	}
	if (n === 1 && src.kind === 't') {
		const free = s.cells.indexOf(null);
		if (free >= 0) out.push(`c${free}`);
	}
	return out;
}

/** Every column runs high to low, so everything can go home. */
export const canAutoFC = (s: FreeCellState) => s.phase === 'play' && s.tableau.every((col) => col.every((c, i) => i === 0 || lowRank(c) < lowRank(col[i - 1])));

function snap(s: FreeCellState): Snap {
	return structuredClone({ cells: s.cells, foundations: s.foundations, tableau: s.tableau });
}

function finish(s: FreeCellState) {
	if (s.foundations.every((f) => f.length === 13)) {
		s.phase = 'over';
		s.solved = true;
		s.winners = [0];
	}
}

export function applyFreeCell(state: FreeCellState, action: FreeCellAction): FreeCellState {
	if (state.phase !== 'play') return state;
	if (action.type === 'undo') {
		const prev = state.past[state.past.length - 1];
		if (!prev) return state;
		return { ...state, ...structuredClone(prev), past: state.past.slice(0, -1), moves: state.moves + 1 };
	}
	if (action.type === 'resign') return { ...state, phase: 'over', winners: [] };
	if (action.type === 'auto') {
		if (!canAutoFC(state)) return state;
		const s: FreeCellState = structuredClone(state);
		s.past = pushPast(state.past, snap(state));
		const all = [...s.tableau.flat(), ...s.cells.filter((c): c is Card => c !== null)];
		for (const c of all) s.foundations[suitOf(c)].push(c);
		s.foundations = s.foundations.map((f) => f.sort((a, b) => lowRank(a) - lowRank(b)));
		s.tableau = s.tableau.map(() => []);
		s.cells = s.cells.map(() => null);
		s.moves++;
		finish(s);
		return s;
	}
	if (action.type === 'move') {
		if (!targetsFC(state, action.card).includes(action.to)) return state;
		const from = locateFC(state, action.card)!;
		const s: FreeCellState = structuredClone(state);
		s.past = pushPast(state.past, snap(state));
		const src = pileOf(from.pile);
		let moving: Card[];
		if (src.kind === 'c') {
			moving = [s.cells[src.i]!];
			s.cells[src.i] = null;
		} else {
			moving = s.tableau[src.i].slice(from.index);
			s.tableau[src.i] = s.tableau[src.i].slice(0, from.index);
		}
		const dst = pileOf(action.to);
		if (dst.kind === 'f') s.foundations[dst.i].push(...moving);
		else if (dst.kind === 'c') s.cells[dst.i] = moving[0];
		else s.tableau[dst.i].push(...moving);
		autoHome(s);
		s.moves++;
		finish(s);
		return s;
	}
	return state;
}

export function validFreeCell(s: FreeCellState): boolean {
	const all = [...s.cells.filter((c): c is Card => c !== null), ...s.foundations.flat(), ...s.tableau.flat()];
	return all.length === 52 && new Set(all).size === 52 && s.tableau.length === 8 && s.cells.length >= 3;
}

export const FREECELL_RULES: RuleSet<FreeCellState, FreeCellAction> = {
	start: (options, random) => dealFreeCell(options.difficulty ?? 'medium', random),
	actor: (s) => (s.phase === 'play' ? 0 : null),
	apply: applyFreeCell,
	winners: (s) => s.winners,
	valid: validFreeCell
};
