import { legalMoves } from './engine';
import { opponent, type Board, type Difficulty, type Player } from './types';

/** Squares from each cell outward in all eight directions, edges excluded. */
const RAYS: number[][][] = Array.from({ length: 64 }, (_, i) => {
	const r0 = i >> 3;
	const c0 = i & 7;
	const rays: number[][] = [];
	for (let dr = -1; dr <= 1; dr += 1) {
		for (let dc = -1; dc <= 1; dc += 1) {
			if (!dr && !dc) continue;
			const ray: number[] = [];
			for (let r = r0 + dr, c = c0 + dc; r >= 0 && r < 8 && c >= 0 && c < 8; r += dr, c += dc) ray.push(r * 8 + c);
			if (ray.length > 1) rays.push(ray);
		}
	}
	return rays;
});

// Classic positional weights: corners prized, the squares that give corners away punished.
const WEIGHTS = new Int16Array([
	120, -20, 20, 5, 5, 20, -20, 120,
	-20, -40, -5, -5, -5, -5, -40, -20,
	20, -5, 15, 3, 3, 15, -5, 20,
	5, -5, 3, 3, 3, 3, -5, 5,
	5, -5, 3, 3, 3, 3, -5, 5,
	20, -5, 15, 3, 3, 15, -5, 20,
	-20, -40, -5, -5, -5, -5, -40, -20,
	120, -20, 20, 5, 5, 20, -20, 120
]);

const CORNERS = [0, 7, 56, 63];
/** For each corner, the X and C squares whose penalty lapses once the corner is taken. */
const NEAR: Record<number, number[]> = { 0: [1, 8, 9], 7: [6, 15, 14], 56: [48, 57, 49], 63: [55, 62, 54] };

const WIN = 100_000;

class Search {
	nodes = 0;
	deadline = Infinity;
	stopped = false;
	private stack: number[] = [];
	readonly board: Board;

	constructor(board: Board) {
		this.board = board;
	}

	/** Places `player` at `sq`, returning how many discs flipped; flipped squares go on the undo stack. */
	play(sq: number, player: Player): number {
		const b = this.board;
		const foe = opponent(player);
		let flipped = 0;
		for (const ray of RAYS[sq]) {
			let k = 0;
			while (k < ray.length && b[ray[k]] === foe) k += 1;
			if (k > 0 && k < ray.length && b[ray[k]] === player) {
				for (let j = 0; j < k; j += 1) {
					b[ray[j]] = player;
					this.stack.push(ray[j]);
				}
				flipped += k;
			}
		}
		if (flipped) {
			b[sq] = player;
			this.stack.push(flipped);
		}
		return flipped;
	}

	undo(sq: number, player: Player) {
		const b = this.board;
		const foe = opponent(player);
		const n = this.stack.pop()!;
		for (let j = 0; j < n; j += 1) b[this.stack.pop()!] = foe;
		b[sq] = 0;
	}

	legal(sq: number, player: Player): boolean {
		const b = this.board;
		if (b[sq]) return false;
		const foe = opponent(player);
		for (const ray of RAYS[sq]) {
			let k = 0;
			while (k < ray.length && b[ray[k]] === foe) k += 1;
			if (k > 0 && k < ray.length && b[ray[k]] === player) return true;
		}
		return false;
	}

	moves(player: Player): number[] {
		const out: number[] = [];
		for (let i = 0; i < 64; i += 1) if (this.legal(i, player)) out.push(i);
		return out;
	}

	mobility(player: Player): number {
		let n = 0;
		for (let i = 0; i < 64; i += 1) if (this.legal(i, player)) n += 1;
		return n;
	}

	empties(): number {
		let n = 0;
		for (let i = 0; i < 64; i += 1) if (!this.board[i]) n += 1;
		return n;
	}

	discDiff(player: Player): number {
		let d = 0;
		for (let i = 0; i < 64; i += 1) {
			if (this.board[i] === player) d += 1;
			else if (this.board[i]) d -= 1;
		}
		return d;
	}

	/** Heuristic value from `player`'s side. */
	evaluate(player: Player): number {
		const b = this.board;
		const foe = opponent(player);
		let pos = 0;
		let frontier = 0;
		for (let i = 0; i < 64; i += 1) {
			const v = b[i];
			if (!v) continue;
			let w = WEIGHTS[i];
			if (w < 0) {
				for (const corner of CORNERS) if (b[corner] && NEAR[corner].includes(i)) w = 4;
			}
			const sign = v === player ? 1 : -1;
			pos += sign * w;
			for (const ray of RAYS[i]) {
				if (!b[ray[0]]) {
					frontier -= sign;
					break;
				}
			}
		}
		const mine = this.mobility(player);
		const theirs = this.mobility(foe);
		const mob = mine + theirs ? (100 * (mine - theirs)) / (mine + theirs + 2) : 0;
		let corners = 0;
		for (const c of CORNERS) corners += b[c] === player ? 1 : b[c] === foe ? -1 : 0;
		const empty = this.empties();
		const late = empty < 14 ? (14 - empty) * 1.5 * this.discDiff(player) : 0;
		return pos + mob * 0.9 + frontier * 6 + corners * 40 + late;
	}

	private ordered(player: Player, moves: number[], hint = -1): number[] {
		const foe = opponent(player);
		const scored = moves.map((sq) => {
			if (sq === hint) return { sq, s: 1e9 };
			this.play(sq, player);
			const s = WEIGHTS[sq] * 2 - this.mobility(foe) * 10;
			this.undo(sq, player);
			return { sq, s };
		});
		scored.sort((a, b) => b.s - a.s);
		return scored.map((x) => x.sq);
	}

	negamax(player: Player, depth: number, alpha: number, beta: number, passed: boolean): number {
		this.nodes += 1;
		if ((this.nodes & 1023) === 0 && performance.now() > this.deadline) this.stopped = true;
		if (this.stopped) return 0;
		const moves = this.moves(player);
		if (!moves.length) {
			if (passed) return this.final(player);
			return -this.negamax(opponent(player), depth, -beta, -alpha, true);
		}
		if (depth <= 0) return this.evaluate(player);
		const list = depth >= 3 ? this.ordered(player, moves) : moves;
		let best = -Infinity;
		for (const sq of list) {
			this.play(sq, player);
			const v = -this.negamax(opponent(player), depth - 1, -beta, -alpha, false);
			this.undo(sq, player);
			if (this.stopped) return 0;
			if (v > best) best = v;
			if (v > alpha) alpha = v;
			if (alpha >= beta) break;
		}
		return best;
	}

	/** Exact disc difference with perfect play to the end. */
	solve(player: Player, alpha: number, beta: number, passed: boolean): number {
		this.nodes += 1;
		if ((this.nodes & 4095) === 0 && performance.now() > this.deadline) this.stopped = true;
		if (this.stopped) return 0;
		const moves = this.moves(player);
		if (!moves.length) {
			if (passed) return this.final(player);
			return -this.solve(opponent(player), -beta, -alpha, true);
		}
		const list = moves.length > 2 ? this.ordered(player, moves) : moves;
		let best = -Infinity;
		for (const sq of list) {
			this.play(sq, player);
			const v = -this.solve(opponent(player), -beta, -alpha, false);
			this.undo(sq, player);
			if (this.stopped) return 0;
			if (v > best) best = v;
			if (v > alpha) alpha = v;
			if (alpha >= beta) break;
		}
		return best;
	}

	private final(player: Player): number {
		const d = this.discDiff(player);
		return d > 0 ? WIN + d : d < 0 ? -WIN + d : 0;
	}

	/** Best root move at a fixed depth, or null if time ran out mid-search. */
	root(player: Player, moves: number[], depth: number, exact: boolean, hint: number): { sq: number; score: number }[] | null {
		const list = this.ordered(player, moves, hint);
		const out: { sq: number; score: number }[] = [];
		let alpha = -Infinity;
		for (const sq of list) {
			this.play(sq, player);
			// Full window on every root move keeps scores comparable for the softer levels.
			const v = exact
				? -this.solve(opponent(player), -Infinity, -alpha + 1, false)
				: -this.negamax(opponent(player), depth - 1, -Infinity, Infinity, false);
			this.undo(sq, player);
			if (this.stopped) return null;
			out.push({ sq, score: v });
			if (exact && v > alpha) alpha = v;
		}
		out.sort((a, b) => b.score - a.score);
		return out;
	}
}

export type AiPlan = { depth: number; timeMs: number; exactAt: number; slack: number };

const PLANS: Record<Difficulty, AiPlan> = {
	easy: { depth: 1, timeMs: 200, exactAt: 0, slack: 45 },
	medium: { depth: 4, timeMs: 700, exactAt: 8, slack: 8 },
	hard: { depth: 12, timeMs: 900, exactAt: 12, slack: 0 }
};

/** Picks a square for `player`, or -1 if they have no legal move. */
export function chooseAiMove(board: Board, player: Player, difficulty: Difficulty): number {
	const moves = legalMoves(board, player);
	if (!moves.length) return -1;
	if (moves.length === 1) return moves[0];
	const plan = PLANS[difficulty];
	const search = new Search(new Int8Array(board));
	const start = performance.now();
	search.deadline = start + plan.timeMs;

	let ranked: { sq: number; score: number }[] | null = null;
	const empty = search.empties();
	if (plan.exactAt && empty <= plan.exactAt) {
		search.deadline = start + plan.timeMs * 3;
		ranked = search.root(player, moves, 0, true, -1);
	}
	if (!ranked) {
		search.stopped = false;
		search.deadline = start + plan.timeMs;
		let hint = -1;
		for (let depth = 1; depth <= plan.depth; depth += 1) {
			const result = search.root(player, moves, depth, false, hint);
			if (!result) break;
			ranked = result;
			hint = result[0].sq;
			if (performance.now() - start > plan.timeMs * 0.45) break;
		}
	}
	if (!ranked?.length) return moves[Math.floor(Math.random() * moves.length)];

	// Softer levels pick among moves within `slack` of the best, so they blunder like people do.
	const best = ranked[0].score;
	const pool = plan.slack ? ranked.filter((m) => m.score >= best - plan.slack && Math.abs(m.score) < WIN) : [];
	const pick = pool.length ? pool : ranked.filter((m) => m.score === best);
	return pick[Math.floor(Math.random() * pick.length)].sq;
}
