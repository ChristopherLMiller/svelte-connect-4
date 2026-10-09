import { isRed, suitOf, type Card } from '../../kit/cards/deck';
import { canAutoFC, targetsFC, type FreeCellAction, type FreeCellState } from '../rules/freecell';
import { lowRank, stacksAlt } from '../rules/patience';
import type { Difficulty } from '../types';
import { bestBy, pick } from './shared';

type Move = { card: Card; to: string };
type Node = { cells: number[]; tab: Card[][]; found: number[]; g: number; parent: Node | null; move: Move | null };

const NODE_LIMIT = 40000;
/** Moves past this and Rosie stops looking for a full solution and just tidies up. */
const GIVE_UP = 700;

const RED = [false, true, false, true];

function safe(found: number[], c: Card) {
	const r = lowRank(c);
	if (found[suitOf(c)] !== r) return false;
	if (r <= 1) return true;
	const red = isRed(c);
	return [0, 1, 2, 3].every((f) => RED[f] === red || found[f] >= r);
}

function settle(n: Node) {
	for (let again = true; again; ) {
		again = false;
		for (let i = 0; i < n.cells.length; i++) {
			const c = n.cells[i];
			if (c >= 0 && safe(n.found, c)) {
				n.found[suitOf(c)]++;
				n.cells[i] = -1;
				again = true;
			}
		}
		for (const col of n.tab) {
			const c = col[col.length - 1];
			if (c !== undefined && safe(n.found, c)) {
				n.found[suitOf(c)]++;
				col.pop();
				again = true;
			}
		}
	}
}

/** Same position regardless of which column is which: for pruning the search. */
const keyOf = (n: Node) => `${n.found.join('.')}|${n.cells.filter((c) => c >= 0).sort((a, b) => a - b).join('.')}|${n.tab.map((c) => c.join('.')).sort().join('/')}`;
/** Exact layout, since a plan's moves name columns and cells by position. */
const exactKey = (n: Node) => `${n.cells.join('.')}|${n.tab.map((c) => c.join('.')).join('/')}`;

function score(n: Node) {
	let home = 0;
	for (const f of n.found) home += f;
	let depth = 0;
	for (let suit = 0; suit < 4; suit++) {
		const want = n.found[suit];
		if (want >= 13) continue;
		for (const col of n.tab) {
			const at = col.findIndex((c) => suitOf(c) === suit && lowRank(c) === want);
			if (at >= 0) depth += col.length - 1 - at;
		}
	}
	let breaks = 0;
	for (const col of n.tab) for (let i = 1; i < col.length; i++) if (!stacksAlt(col[i], col[i - 1])) breaks++;
	const used = n.cells.filter((c) => c >= 0).length;
	const empty = n.tab.filter((c) => !c.length).length;
	return (52 - home) * 4 + depth * 2 + breaks * 1.5 + used - empty * 1.5;
}

function child(n: Node, move: Move, apply: (m: Node) => void): Node {
	const m: Node = { cells: n.cells.slice(), tab: n.tab.map((c) => c.slice()), found: n.found.slice(), g: n.g + 1, parent: n, move };
	apply(m);
	settle(m);
	return m;
}

function children(n: Node): Node[] {
	const out: Node[] = [];
	const free = n.cells.filter((c) => c < 0).length;
	const empties = n.tab.filter((c) => !c.length).length;
	const runMax = (toEmpty: boolean) => (free + 1) * 2 ** Math.max(0, empties - (toEmpty ? 1 : 0));
	const firstFree = n.cells.indexOf(-1);
	n.cells.forEach((c, i) => {
		if (c < 0) return;
		if (n.found[suitOf(c)] === lowRank(c))
			out.push(
				child(n, { card: c, to: `f${suitOf(c)}` }, (m) => {
					m.cells[i] = -1;
					m.found[suitOf(c)]++;
				})
			);
		let toEmpty = false;
		n.tab.forEach((col, j) => {
			if (col.length ? stacksAlt(c, col[col.length - 1]) : !toEmpty) {
				if (!col.length) toEmpty = true;
				out.push(
					child(n, { card: c, to: `t${j}` }, (m) => {
						m.cells[i] = -1;
						m.tab[j].push(c);
					})
				);
			}
		});
	});
	n.tab.forEach((col, i) => {
		if (!col.length) return;
		const top = col[col.length - 1];
		if (n.found[suitOf(top)] === lowRank(top))
			out.push(
				child(n, { card: top, to: `f${suitOf(top)}` }, (m) => {
					m.tab[i].pop();
					m.found[suitOf(top)]++;
				})
			);
		let start = col.length - 1;
		while (start > 0 && stacksAlt(col[start], col[start - 1])) start--;
		let toEmpty = false;
		n.tab.forEach((dst, j) => {
			if (j === i) return;
			if (dst.length) {
				const under = dst[dst.length - 1];
				for (let at = start; at < col.length; at++) {
					if (stacksAlt(col[at], under) && col.length - at <= runMax(false)) {
						out.push(
							child(n, { card: col[at], to: `t${j}` }, (m) => {
								m.tab[j].push(...m.tab[i].splice(at));
							})
						);
						break;
					}
				}
			} else if (!toEmpty) {
				toEmpty = true;
				const at = Math.max(start, col.length - runMax(true));
				if (at > 0)
					out.push(
						child(n, { card: col[at], to: `t${j}` }, (m) => {
							m.tab[j].push(...m.tab[i].splice(at));
						})
					);
				if (at !== col.length - 1 && col.length > 1)
					out.push(
						child(n, { card: top, to: `t${j}` }, (m) => {
							m.tab[j].push(m.tab[i].pop()!);
						})
					);
			}
		});
		if (firstFree >= 0)
			out.push(
				child(n, { card: top, to: `c${firstFree}` }, (m) => {
					m.cells[firstFree] = m.tab[i].pop()!;
				})
			);
	});
	return out;
}

class Heap {
	items: Array<{ f: number; n: Node }> = [];
	push(f: number, n: Node) {
		const a = this.items;
		a.push({ f, n });
		let i = a.length - 1;
		while (i > 0) {
			const p = (i - 1) >> 1;
			if (a[p].f <= a[i].f) break;
			[a[p], a[i]] = [a[i], a[p]];
			i = p;
		}
	}
	pop(): Node | undefined {
		const a = this.items;
		if (!a.length) return undefined;
		const top = a[0];
		const last = a.pop()!;
		if (a.length) {
			a[0] = last;
			let i = 0;
			for (;;) {
				const l = i * 2 + 1;
				const r = l + 1;
				let m = i;
				if (l < a.length && a[l].f < a[m].f) m = l;
				if (r < a.length && a[r].f < a[m].f) m = r;
				if (m === i) break;
				[a[m], a[i]] = [a[i], a[m]];
				i = m;
			}
		}
		return top.n;
	}
}

const toNode = (s: FreeCellState): Node => ({ cells: s.cells.map((c) => (c === null ? -1 : c)), tab: s.tableau.map((c) => c.slice()), found: s.foundations.map((f) => f.length), g: 0, parent: null, move: null });

/** The next move on a known winning line from each position. */
const PLAN = new Map<string, Move>();

/** Search for a winning line and remember every step of it. Returns false if none turned up. */
function solve(s: FreeCellState): boolean {
	const root = toNode(s);
	const seen = new Set<string>([keyOf(root)]);
	const open = new Heap();
	open.push(score(root), root);
	for (let expanded = 0; expanded < NODE_LIMIT; expanded++) {
		const n = open.pop();
		if (!n) return false;
		if (n.found.every((f) => f === 13)) {
			if (PLAN.size > 20000) PLAN.clear();
			for (let at: Node | null = n; at?.parent; at = at.parent) PLAN.set(exactKey(at.parent), at.move!);
			return true;
		}
		for (const c of children(n)) {
			const k = keyOf(c);
			if (seen.has(k)) continue;
			seen.add(k);
			open.push(score(c) + c.g * 0.25, c);
		}
	}
	return false;
}

export type FcHint = { kind: 'auto' } | { kind: 'stuck' } | { kind: 'move'; card: Card; to: string; solved: boolean };

export function freeCellHint(s: FreeCellState): FcHint {
	if (canAutoFC(s)) return { kind: 'auto' };
	const key = exactKey(toNode(s));
	let next = PLAN.get(key);
	if (!next && s.moves < GIVE_UP && solve(s)) next = PLAN.get(key);
	if (next && targetsFC(s, next.card).includes(next.to)) return { kind: 'move', ...next, solved: true };
	const root = toNode(s);
	const options = children(root).filter((c) => c.move && targetsFC(s, c.move.card).includes(c.move.to) && (c.found.reduce((a, b) => a + b, 0) > root.found.reduce((a, b) => a + b, 0) || s.moves < GIVE_UP));
	if (!options.length) return { kind: 'stuck' };
	const best = bestBy(options, (c) => -score(c));
	return { kind: 'move', ...best.move!, solved: false };
}

export function fcHintAction(h: FcHint): FreeCellAction {
	if (h.kind === 'auto') return { type: 'auto' };
	if (h.kind === 'stuck') return { type: 'resign' };
	return { type: 'move', card: h.card, to: h.to };
}

export function freeCellAi(s: FreeCellState, _seat: number, difficulty: Difficulty, random: () => number): FreeCellAction {
	if (difficulty === 'easy' && random() < 0.2) {
		const home = s.tableau.flatMap((col) => (col.length ? [col[col.length - 1]] : [])).filter((c) => targetsFC(s, c).some((t) => t.startsWith('f')));
		if (home.length) {
			const c = pick(home, random);
			return { type: 'move', card: c, to: `f${suitOf(c)}` };
		}
	}
	return fcHintAction(freeCellHint(s));
}