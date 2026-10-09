import { shuffle, suitOf, type Card } from '../../kit/cards/deck';
import type { Difficulty } from '../types';
import { lowRank, pileOf, pushPast } from './patience';
import type { RuleSet } from './types';

type Snap = { stock: Card[]; tableau: Card[][]; down: number[]; done: Card[][] };

export type SpiderState = {
	kind: 'spider';
	phase: 'play' | 'over';
	handNo: number;
	suits: 1 | 2 | 4;
	stock: Card[];
	tableau: Card[][];
	/** Face-down cards at the bottom of each column. */
	down: number[];
	/** Finished king-to-ace runs, king first. */
	done: Card[][];
	moves: number;
	past: Snap[];
	solved: boolean;
	winners: number[];
};

export type SpiderAction = { type: 'move'; card: Card; to: string } | { type: 'deal' } | { type: 'undo' } | { type: 'resign' } | { type: 'next' };

const SUITS: Record<Difficulty, 1 | 2 | 4> = { easy: 1, medium: 2, hard: 4 };

/** The 104 card ids for a game with this many suits: spades first, then hearts, then the rest. */
export function spiderDeck(suits: 1 | 2 | 4): Card[] {
	const use = suits === 1 ? [2] : suits === 2 ? [2, 3] : [0, 1, 2, 3];
	const copies = 8 / suits;
	const out: Card[] = [];
	for (let k = 0; k < copies; k++) for (const suit of use) for (let r = 0; r < 13; r++) out.push(k * 52 + suit * 13 + r);
	return out;
}

export function dealSpider(level: Difficulty, random: () => number): SpiderState {
	const suits = SUITS[level];
	const deck = shuffle(spiderDeck(suits), random);
	const tableau: Card[][] = [];
	let at = 0;
	for (let i = 0; i < 10; i++) {
		const n = i < 4 ? 6 : 5;
		tableau.push(deck.slice(at, at + n));
		at += n;
	}
	return { kind: 'spider', phase: 'play', handNo: 1, suits, stock: deck.slice(at), tableau, down: tableau.map((c) => c.length - 1), done: [], moves: 0, past: [], solved: false, winners: [] };
}

/** Can `c` sit directly on `under`: one rank lower, any suit. */
export const fitsOn = (c: Card, under: Card) => lowRank(c) === lowRank(under) - 1;
/** Same suit and one lower: the link that lets cards move together. */
export const linked = (c: Card, under: Card) => fitsOn(c, under) && suitOf(c) === suitOf(under);

/** Where a face-up card that could be picked up sits. */
export function locateS(s: SpiderState, c: Card): { col: number; index: number } | null {
	for (let i = 0; i < 10; i++) {
		const at = s.tableau[i].indexOf(c);
		if (at >= 0) return at >= s.down[i] ? { col: i, index: at } : null;
	}
	return null;
}

/** Everything from `at` up is one same-suit run. */
export function suitedFrom(col: Card[], at: number) {
	for (let i = at + 1; i < col.length; i++) if (!linked(col[i], col[i - 1])) return false;
	return true;
}

/** Where the run topped by `c` could go: `t3` and so on. */
export function targetsS(s: SpiderState, c: Card): string[] {
	if (s.phase !== 'play') return [];
	const from = locateS(s, c);
	if (!from || !suitedFrom(s.tableau[from.col], from.index)) return [];
	const out: string[] = [];
	for (let i = 0; i < 10; i++) {
		if (i === from.col) continue;
		const col = s.tableau[i];
		if (col.length ? fitsOn(c, col[col.length - 1]) : from.index > 0) out.push(`t${i}`);
	}
	return out;
}

export const canDealS = (s: SpiderState) => s.phase === 'play' && s.stock.length > 0 && s.tableau.every((c) => c.length > 0);

/** Lift any finished king-to-ace run off the table and turn over what it uncovers. */
function clear(s: SpiderState) {
	s.tableau.forEach((col, i) => {
		if (col.length >= 13 && col.length - 13 >= s.down[i] && lowRank(col[col.length - 13]) === 12 && suitedFrom(col, col.length - 13)) {
			s.done.push(col.splice(col.length - 13));
		}
		if (col.length && s.down[i] >= col.length) s.down[i] = col.length - 1;
	});
	if (s.done.length === 8) {
		s.phase = 'over';
		s.solved = true;
		s.winners = [0];
	}
}

function snap(s: SpiderState): Snap {
	return structuredClone({ stock: s.stock, tableau: s.tableau, down: s.down, done: s.done });
}

export function applySpider(state: SpiderState, action: SpiderAction): SpiderState {
	if (state.phase !== 'play') return state;
	if (action.type === 'undo') {
		const prev = state.past[state.past.length - 1];
		if (!prev) return state;
		return { ...state, ...structuredClone(prev), past: state.past.slice(0, -1), moves: state.moves + 1 };
	}
	if (action.type === 'resign') return { ...state, phase: 'over', winners: [] };
	if (action.type === 'deal') {
		if (!canDealS(state)) return state;
		const s: SpiderState = structuredClone(state);
		s.past = pushPast(state.past, snap(state));
		for (const col of s.tableau) col.push(s.stock.pop()!);
		s.moves++;
		clear(s);
		return s;
	}
	if (action.type === 'move') {
		if (!targetsS(state, action.card).includes(action.to)) return state;
		const from = locateS(state, action.card)!;
		const s: SpiderState = structuredClone(state);
		s.past = pushPast(state.past, snap(state));
		s.tableau[pileOf(action.to).i].push(...s.tableau[from.col].splice(from.index));
		s.moves++;
		clear(s);
		return s;
	}
	return state;
}

export function validSpider(s: SpiderState): boolean {
	const all = [...s.stock, ...s.tableau.flat(), ...s.done.flat()];
	return all.length === 104 && new Set(all).size === 104 && s.tableau.length === 10 && s.down.every((d, i) => d >= 0 && (d < s.tableau[i].length || (d === 0 && !s.tableau[i].length)));
}

export const SPIDER_RULES: RuleSet<SpiderState, SpiderAction> = {
	start: (options, random) => dealSpider(options.difficulty ?? 'medium', random),
	actor: (s) => (s.phase === 'play' ? 0 : null),
	apply: applySpider,
	winners: (s) => s.winners,
	valid: validSpider
};
