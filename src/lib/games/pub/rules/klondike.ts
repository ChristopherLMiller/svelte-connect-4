import { fullDeck, shuffle, suitOf, type Card } from '../../kit/cards/deck';
import type { Difficulty } from '../types';
import { KING_LOW, lowRank, pileOf, pushPast, stacksAlt } from './patience';
import type { RuleSet } from './types';

type Snap = { stock: Card[]; waste: Card[]; foundations: Card[][]; tableau: Card[][]; down: number[]; passes: number; idle: number };

export type KlondikeState = {
	kind: 'klondike';
	phase: 'play' | 'over';
	handNo: number;
	draw: number;
	/** How many times the waste may be turned back into the stock (null: any number). */
	redeals: number | null;
	passes: number;
	stock: Card[];
	waste: Card[];
	/** One per suit, in suit order. */
	foundations: Card[][];
	tableau: Card[][];
	/** Face-down cards at the bottom of each column. */
	down: number[];
	moves: number;
	/** Draws in a row with nothing else done, to spot a stuck game. */
	idle: number;
	past: Snap[];
	solved: boolean;
	winners: number[];
};

export type KlondikeAction = { type: 'draw' } | { type: 'move'; card: Card; to: string } | { type: 'auto' } | { type: 'undo' } | { type: 'resign' } | { type: 'next' };

const LEVEL: Record<Difficulty, { draw: number; redeals: number | null }> = {
	easy: { draw: 1, redeals: null },
	medium: { draw: 3, redeals: null },
	hard: { draw: 3, redeals: 2 }
};

export function dealKlondike(level: Difficulty, random: () => number): KlondikeState {
	const deck = shuffle(fullDeck(), random);
	const tableau: Card[][] = [];
	let at = 0;
	for (let i = 0; i < 7; i++) {
		tableau.push(deck.slice(at, at + i + 1));
		at += i + 1;
	}
	return {
		kind: 'klondike',
		phase: 'play',
		handNo: 1,
		...LEVEL[level],
		passes: 0,
		stock: deck.slice(at),
		waste: [],
		foundations: [[], [], [], []],
		tableau,
		down: tableau.map((c) => c.length - 1),
		moves: 0,
		idle: 0,
		past: [],
		solved: false,
		winners: []
	};
}

/** Where a card currently is: `waste`, `t3`, `f1`, with its index in that pile. */
export function locate(s: KlondikeState, c: Card): { pile: string; index: number } | null {
	if (s.waste[s.waste.length - 1] === c) return { pile: 'waste', index: s.waste.length - 1 };
	for (let i = 0; i < 7; i++) {
		const at = s.tableau[i].indexOf(c);
		if (at >= 0) return at >= s.down[i] ? { pile: `t${i}`, index: at } : null;
	}
	for (let i = 0; i < 4; i++) {
		const f = s.foundations[i];
		if (f[f.length - 1] === c) return { pile: `f${i}`, index: f.length - 1 };
	}
	return null;
}

export const canRecycle = (s: KlondikeState) => !s.stock.length && s.waste.length > 0 && (s.redeals === null || s.passes < s.redeals);
export const canDrawK = (s: KlondikeState) => s.phase === 'play' && (s.stock.length > 0 || canRecycle(s));

/** Every place the card (and anything on top of it) could go. */
export function targetsK(s: KlondikeState, c: Card): string[] {
	const from = locate(s, c);
	if (!from) return [];
	const out: string[] = [];
	const top = from.pile === 'waste' || from.pile.startsWith('f') || from.index === s.tableau[pileOf(from.pile).i].length - 1;
	if (top && !from.pile.startsWith('f')) {
		const f = suitOf(c);
		if (s.foundations[f].length === lowRank(c)) out.push(`f${f}`);
	}
	for (let i = 0; i < 7; i++) {
		if (from.pile === `t${i}`) continue;
		const col = s.tableau[i];
		if (!col.length ? lowRank(c) === KING_LOW : stacksAlt(c, col[col.length - 1])) out.push(`t${i}`);
	}
	return out;
}

export function movesK(s: KlondikeState): Array<{ card: Card; to: string; from: string }> {
	const cards: Card[] = [];
	if (s.waste.length) cards.push(s.waste[s.waste.length - 1]);
	for (let i = 0; i < 7; i++) cards.push(...s.tableau[i].slice(s.down[i]));
	for (const f of s.foundations) if (f.length) cards.push(f[f.length - 1]);
	return cards.flatMap((card) => targetsK(s, card).map((to) => ({ card, to, from: locate(s, card)!.pile })));
}

export const canAuto = (s: KlondikeState) => s.phase === 'play' && !s.stock.length && !s.waste.length && s.down.every((d) => d === 0);

function snap(s: KlondikeState): Snap {
	return structuredClone({ stock: s.stock, waste: s.waste, foundations: s.foundations, tableau: s.tableau, down: s.down, passes: s.passes, idle: s.idle });
}

function finish(s: KlondikeState) {
	if (s.foundations.every((f) => f.length === 13)) {
		s.phase = 'over';
		s.solved = true;
		s.winners = [0];
	}
}

export function applyKlondike(state: KlondikeState, action: KlondikeAction): KlondikeState {
	if (state.phase !== 'play') return state;
	if (action.type === 'undo') {
		const prev = state.past[state.past.length - 1];
		if (!prev) return state;
		return { ...state, ...structuredClone(prev), past: state.past.slice(0, -1), moves: state.moves + 1 };
	}
	if (action.type === 'resign') return { ...state, phase: 'over', winners: [] };
	if (action.type === 'draw') {
		if (!canDrawK(state)) return state;
		const s: KlondikeState = structuredClone(state);
		s.past = pushPast(state.past, snap(state));
		if (s.stock.length) {
			for (let i = 0; i < s.draw && s.stock.length; i++) s.waste.push(s.stock.pop()!);
		} else {
			s.stock = s.waste.reverse();
			s.waste = [];
			s.passes++;
		}
		s.idle++;
		s.moves++;
		return s;
	}
	if (action.type === 'auto') {
		if (!canAuto(state)) return state;
		const s: KlondikeState = structuredClone(state);
		s.past = pushPast(state.past, snap(state));
		for (const col of s.tableau) for (const c of col) s.foundations[suitOf(c)].push(c);
		s.foundations = s.foundations.map((f) => f.sort((a, b) => lowRank(a) - lowRank(b)));
		s.tableau = s.tableau.map(() => []);
		s.moves++;
		finish(s);
		return s;
	}
	if (action.type === 'move') {
		if (!targetsK(state, action.card).includes(action.to)) return state;
		const from = locate(state, action.card)!;
		const s: KlondikeState = structuredClone(state);
		s.past = pushPast(state.past, snap(state));
		let moving: Card[];
		const src = pileOf(from.pile);
		if (src.kind === 'waste') moving = [s.waste.pop()!];
		else if (src.kind === 'f') moving = [s.foundations[src.i].pop()!];
		else {
			moving = s.tableau[src.i].slice(from.index);
			s.tableau[src.i] = s.tableau[src.i].slice(0, from.index);
			s.down[src.i] = Math.max(0, Math.min(s.down[src.i], s.tableau[src.i].length - 1));
		}
		const dst = pileOf(action.to);
		if (dst.kind === 'f') s.foundations[dst.i].push(...moving);
		else s.tableau[dst.i].push(...moving);
		s.idle = 0;
		s.moves++;
		finish(s);
		return s;
	}
	return state;
}

export function validKlondike(s: KlondikeState): boolean {
	const all = [...s.stock, ...s.waste, ...s.foundations.flat(), ...s.tableau.flat()];
	return all.length === 52 && new Set(all).size === 52 && s.tableau.length === 7 && s.down.length === 7;
}

export const KLONDIKE_RULES: RuleSet<KlondikeState, KlondikeAction> = {
	start: (options, random) => dealKlondike(options.difficulty ?? 'medium', random),
	actor: (s) => (s.phase === 'play' ? 0 : null),
	apply: applyKlondike,
	winners: (s) => s.winners,
	valid: validKlondike
};
