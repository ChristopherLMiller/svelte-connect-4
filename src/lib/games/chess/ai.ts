import { bookMoves } from './book';
import {
	BISHOP,
	FLAG_CAPTURE,
	FLAG_CASTLE,
	FLAG_EP,
	FLAG_PROMO,
	KING,
	KNIGHT,
	PAWN,
	Position,
	QUEEN,
	ROOK,
	SQUARES,
	uciOf,
	type Color
} from './engine';
import { ANALYST, opponentById, type Opponent, type StyleWeights } from './types';

export const MATE = 30000;
const INF = 32000;
const MAX_PLY = 96;
const MATE_BOUND = MATE - 200;

export type ThinkRequest = {
	kind: 'move';
	fen: string;
	moves: string[];
	opponent: string;
	/** Clock left for the side to move and its increment, if the game is timed. */
	clock?: { left: number; inc: number };
	seed: number;
};

export type AnalyseRequest = { kind: 'analyse'; fen: string; moves: string[]; timeMs: number; depth?: number };

export type AiRequest = ThinkRequest | AnalyseRequest;

export type AiResult = {
	move: string | null;
	/** Centipawns from white's view; mates are ±(MATE − plies). */
	score: number;
	depth: number;
	pv: string[];
	book: boolean;
	nodes: number;
	/** The best move the engine found, which a weaker opponent may decline to play. */
	best: string | null;
	resign?: boolean;
};

const TT_BITS = 19;
const TT_SIZE = 1 << TT_BITS;
const TT_MASK = TT_SIZE - 1;
const EXACT = 1;
const LOWER = 2;
const UPPER = 3;

let ttLo: Int32Array | null = null;
let ttHi: Int32Array;
let ttMove: Int32Array;
let ttScore: Int16Array;
let ttDepth: Int8Array;
let ttFlag: Uint8Array;
let ttOwner = '';

function ttEnsure(owner: string) {
	if (!ttLo) {
		ttLo = new Int32Array(TT_SIZE);
		ttHi = new Int32Array(TT_SIZE);
		ttMove = new Int32Array(TT_SIZE);
		ttScore = new Int16Array(TT_SIZE);
		ttDepth = new Int8Array(TT_SIZE);
		ttFlag = new Uint8Array(TT_SIZE);
	}
	if (owner !== ttOwner) {
		ttFlag.fill(0);
		ttOwner = owner;
	}
}

const toTT = (s: number, ply: number) => (s >= MATE_BOUND ? s + ply : s <= -MATE_BOUND ? s - ply : s);
const fromTT = (s: number, ply: number) => (s >= MATE_BOUND ? s - ply : s <= -MATE_BOUND ? s + ply : s);

const VALUE = [0, 100, 320, 330, 500, 900, 2000];
const KNIGHT_D = [33, 31, 18, 14, -14, -18, -31, -33];
const KING_D = [17, 16, 15, 1, -1, -15, -16, -17];
const DIAG_D = [17, 15, -15, -17];
const ORTH_D = [16, 1, -1, -16];
const PASSED = [0, 10, 15, 25, 45, 75, 120, 0];
const ATTACK_UNITS = [0, 0, 2, 2, 3, 5, 0];
const MOBILITY_BASE = [0, 0, 4, 6, 6, 12, 0];
const MOBILITY_MG = [0, 0, 4, 4, 2, 1, 0];
const MOBILITY_EG = [0, 0, 4, 4, 4, 2, 0];

type Ctx = {
	pos: Position;
	w: StyleWeights;
	/** Colour the style belongs to; the eval leans their way. */
	us: Color;
	qLimit: number;
	deadline: number;
	nodes: number;
	stopped: boolean;
	blind: boolean;
	moves: Int32Array;
	scores: Int32Array;
	sp: number;
	killers: Int32Array;
	history: Int32Array;
	rand: () => number;
};

const wPawnFiles = new Int8Array(8);
const bPawnFiles = new Int8Array(8);
const wPawnMin = new Int8Array(8);
const wPawnMax = new Int8Array(8);
const bPawnMin = new Int8Array(8);
const bPawnMax = new Int8Array(8);

const centerDist = (sq: number) => Math.max(3 - (sq & 7), (sq & 7) - 4) + Math.max(3 - (sq >> 4), (sq >> 4) - 4);
const kingDist = (a: number, b: number) => Math.max(Math.abs((a & 7) - (b & 7)), Math.abs((a >> 4) - (b >> 4)));

/** Static evaluation in centipawns for the side to move. */
export function evaluate(pos: Position, w: StyleWeights, us: Color): number {
	const b = pos.board;
	if (pos.insufficientMaterial()) return 0;
	let mg = pos.mg[0] - pos.mg[1];
	let eg = pos.eg[0] - pos.eg[1];
	const phase = Math.min(24, pos.phase);

	wPawnFiles.fill(0);
	bPawnFiles.fill(0);
	wPawnMin.fill(8);
	bPawnMin.fill(8);
	wPawnMax.fill(-1);
	bPawnMax.fill(-1);
	let wBishops = 0;
	let bBishops = 0;
	let wMat = 0;
	let bMat = 0;
	let wPawns = 0;
	let bPawns = 0;
	for (let k = 0; k < 64; k += 1) {
		const sq = SQUARES[k];
		const p = b[sq];
		if (!p) continue;
		const f = sq & 7;
		const r = sq >> 4;
		if (p === PAWN) {
			wPawnFiles[f] += 1;
			if (r < wPawnMin[f]) wPawnMin[f] = r;
			if (r > wPawnMax[f]) wPawnMax[f] = r;
			wPawns += 1;
		} else if (p === -PAWN) {
			bPawnFiles[f] += 1;
			if (r < bPawnMin[f]) bPawnMin[f] = r;
			if (r > bPawnMax[f]) bPawnMax[f] = r;
			bPawns += 1;
		} else if (p > 0) {
			if (p === BISHOP) wBishops += 1;
			if (p !== KING) wMat += VALUE[p];
		} else {
			if (p === -BISHOP) bBishops += 1;
			if (p !== -KING) bMat += VALUE[-p];
		}
	}

	const wk = pos.king[0];
	const bk = pos.king[1];
	let wAttack = 0;
	let bAttack = 0;
	let wAttackers = 0;
	let bAttackers = 0;
	let mobMg = 0;
	let mobEg = 0;
	let pawnMg = 0;
	let pawnEg = 0;
	let passedEg = 0;
	let passedMg = 0;
	let rookMg = 0;
	let devMg = 0;

	for (let k = 0; k < 64; k += 1) {
		const sq = SQUARES[k];
		const p = b[sq];
		if (!p) continue;
		const color: Color = p > 0 ? 1 : -1;
		const type = p * color;
		const f = sq & 7;
		const r = sq >> 4;
		if (type === PAWN) {
			const own = color === 1 ? wPawnFiles : bPawnFiles;
			let s = 0;
			if (own[f] > 1) s -= 12;
			if ((f === 0 || !own[f - 1]) && (f === 7 || !own[f + 1])) s -= 14;
			let passed = true;
			for (let df = -1; df <= 1 && passed; df += 1) {
				const ff = f + df;
				if (ff < 0 || ff > 7) continue;
				if (color === 1 ? bPawnMax[ff] > r : bPawnMin[ff] < r) passed = false;
			}
			pawnMg += s * color;
			pawnEg += s * color;
			if (passed) {
				const adv = color === 1 ? r : 7 - r;
				let bonus = PASSED[adv];
				const ahead = sq + 16 * color;
				if (!(ahead & 0x88) && b[ahead]) bonus = bonus >> 1;
				const theirKing = color === 1 ? bk : wk;
				const ourKing = color === 1 ? wk : bk;
				const front = color === 1 ? 112 + f : f;
				const rule = Math.min(kingDist(theirKing, front), 5) - Math.min(kingDist(ourKing, front), 5);
				passedEg += (bonus + rule * adv * 2) * color;
				passedMg += (bonus >> 1) * color;
			}
			continue;
		}
		if (type === KING) continue;
		const theirKing = color === 1 ? bk : wk;
		let mob = 0;
		let hits = 0;
		if (type === KNIGHT) {
			for (let i = 0; i < 8; i += 1) {
				const t = sq + KNIGHT_D[i];
				if (t & 0x88) continue;
				if (b[t] * color <= 0) mob += 1;
				if (kingDist(t, theirKing) <= 1) hits += 1;
			}
		} else {
			const dirs = type === BISHOP ? DIAG_D : type === ROOK ? ORTH_D : null;
			for (let set = 0; set < 2; set += 1) {
				const ds = dirs ?? (set === 0 ? DIAG_D : ORTH_D);
				if (dirs && set === 1) break;
				for (let i = 0; i < 4; i += 1) {
					const d = ds[i];
					let t = sq + d;
					while (!(t & 0x88)) {
						const q = b[t];
						if (q * color > 0) break;
						mob += 1;
						if (kingDist(t, theirKing) <= 1) hits += 1;
						if (q) break;
						t += d;
					}
				}
			}
		}
		mob -= MOBILITY_BASE[type];
		mobMg += mob * MOBILITY_MG[type] * color;
		mobEg += mob * MOBILITY_EG[type] * color;
		if (hits) {
			if (color === 1) {
				wAttack += hits * ATTACK_UNITS[type];
				wAttackers += 1;
			} else {
				bAttack += hits * ATTACK_UNITS[type];
				bAttackers += 1;
			}
		}
		if (type === ROOK) {
			const own = color === 1 ? wPawnFiles : bPawnFiles;
			const their = color === 1 ? bPawnFiles : wPawnFiles;
			if (!own[f]) rookMg += (their[f] ? 10 : 22) * color;
			if ((color === 1 && r === 6) || (color === -1 && r === 1)) rookMg += 18 * color;
		}
		if ((type === KNIGHT || type === BISHOP) && r === (color === 1 ? 0 : 7)) devMg -= 14 * color;
	}

	const shield = (king: number, color: Color) => {
		const kf = king & 7;
		const kr = king >> 4;
		if (kr !== (color === 1 ? 0 : 7) && kr !== (color === 1 ? 1 : 6)) return -20;
		let s = 0;
		const own = color === 1 ? PAWN : -PAWN;
		for (let f = Math.max(0, kf - 1); f <= Math.min(7, kf + 1); f += 1) {
			const one = king + 16 * color + (f - kf);
			const two = one + 16 * color;
			if (!(one & 0x88) && b[one] === own) s += 12;
			else if (!(two & 0x88) && b[two] === own) s += 6;
			else s -= 10;
			if (!(color === 1 ? wPawnFiles : bPawnFiles)[f]) s -= 12;
		}
		return s;
	};
	const danger = (units: number, attackers: number) => (attackers < 2 ? 0 : Math.min(500, (units * units * attackers) / 6));
	const wSafety = shield(wk, 1);
	const bSafety = shield(bk, -1);
	const wDanger = danger(bAttack, bAttackers);
	const bDanger = danger(wAttack, wAttackers);
	const attackW = us === 1 ? w.kingAttack : w.kingSafety;
	const attackB = us === -1 ? w.kingAttack : w.kingSafety;
	let kingMg = (wSafety - bSafety) * w.kingSafety;
	kingMg += bDanger * attackW - wDanger * attackB;

	if (pos.fullmove <= 14) {
		const castled = (king: number, color: Color, rights: number) => {
			const home = color === 1 ? 4 : 116;
			if (king === home) return rights ? 0 : -25;
			return (king & 7) === 6 || (king & 7) === 2 || (king & 7) === 1 ? 15 : -10;
		};
		devMg += castled(wk, 1, pos.castling & 3) - castled(bk, -1, pos.castling & 12);
		if (b[3] !== QUEEN && devMg < -14) devMg -= 12;
		if (b[115] !== -QUEEN && devMg > 14) devMg += 12;
	}

	mg += mobMg * w.mobility + pawnMg * w.pawns + passedMg * w.passed + rookMg + kingMg + devMg * w.development;
	eg += mobEg * w.mobility + pawnEg * w.pawns + passedEg * w.passed;
	if (wBishops >= 2) {
		mg += 30 * w.bishops;
		eg += 50 * w.bishops;
	}
	if (bBishops >= 2) {
		mg -= 30 * w.bishops;
		eg -= 50 * w.bishops;
	}

	let score = (mg * phase + eg * (24 - phase)) / 24;

	const lead = wMat + wPawns * 100 - bMat - bPawns * 100;
	if (Math.abs(lead) > 150) score += (lead > 0 ? 1 : -1) * ((24 - phase) * 2 * w.trade);

	const strongWhite = score > 0;
	const strongMat = strongWhite ? wMat : bMat;
	const weakMat = strongWhite ? bMat : wMat;
	const strongPawns = strongWhite ? wPawns : bPawns;
	if (!strongPawns && strongMat - weakMat <= 330) score /= 8;
	else if (!strongPawns && strongMat < 500) score /= 4;
	if (!(strongWhite ? bPawns : wPawns) && weakMat <= 330 && strongMat >= 500) {
		const loser = strongWhite ? bk : wk;
		const winner = strongWhite ? wk : bk;
		const mop = centerDist(loser) * 12 + (7 - kingDist(loser, winner)) * 6;
		score += strongWhite ? mop : -mop;
	}

	return Math.round(score * pos.side) + 12;
}

function drawScore(c: Ctx) {
	return c.pos.side === c.us ? -c.w.contempt : c.w.contempt;
}

function hasPieces(pos: Position, color: Color) {
	const b = pos.board;
	for (let k = 0; k < 64; k += 1) {
		const p = b[SQUARES[k]] * color;
		if (p > PAWN && p < KING) return true;
	}
	return false;
}

/** Tunnel vision: a distracted player overlooks long-range captures and backward moves near the root. */
function overlooked(c: Ctx, ply: number, m: number) {
	if (!c.blind || ply > 2) return false;
	const from = m & 127;
	const to = (m >> 7) & 127;
	const flags = m >>> 17;
	if (!(flags & FLAG_CAPTURE) || flags & FLAG_PROMO) return false;
	const type = Math.abs(c.pos.board[from]);
	const dist = kingDist(from, to);
	const mover: Color = c.pos.board[from] > 0 ? 1 : -1;
	const backward = ((to >> 4) - (from >> 4)) * mover < 0;
	if (ply === 1) return (type >= BISHOP && type <= QUEEN && dist >= 3) || (backward && type !== PAWN);
	return type >= BISHOP && type <= QUEEN && dist >= 4;
}

function orderMoves(c: Ctx, start: number, end: number, ttm: number, ply: number) {
	const b = c.pos.board;
	for (let i = start; i < end; i += 1) {
		const m = c.moves[i];
		const flags = m >>> 17;
		let s: number;
		if (m === ttm) s = 2_000_000;
		else if (flags & FLAG_CAPTURE) {
			const victim = flags & FLAG_EP ? PAWN : Math.abs(b[(m >> 7) & 127]);
			s = 1_000_000 + VALUE[victim] * 10 - VALUE[Math.abs(b[m & 127])] / 10;
		} else if (flags & FLAG_PROMO) s = 900_000 + ((m >> 14) & 7);
		else if (c.killers[ply * 2] === m) s = 800_000;
		else if (c.killers[ply * 2 + 1] === m) s = 700_000;
		else s = c.history[((m & 127) << 7) | ((m >> 7) & 127)];
		c.scores[i] = s;
	}
}

function pick(c: Ctx, i: number, end: number) {
	let best = i;
	for (let j = i + 1; j < end; j += 1) if (c.scores[j] > c.scores[best]) best = j;
	if (best !== i) {
		const m = c.moves[i];
		c.moves[i] = c.moves[best];
		c.moves[best] = m;
		const s = c.scores[i];
		c.scores[i] = c.scores[best];
		c.scores[best] = s;
	}
	return c.moves[i];
}

function tick(c: Ctx) {
	if ((++c.nodes & 1023) === 0 && performance.now() > c.deadline) c.stopped = true;
	return c.stopped;
}

function qsearch(c: Ctx, alpha: number, beta: number, ply: number, qply: number): number {
	if (tick(c)) return 0;
	const pos = c.pos;
	if (ply >= MAX_PLY - 1) return evaluate(pos, c.w, c.us);
	const inCheck = pos.inCheck();
	let best = -INF;
	let stand = 0;
	if (!inCheck) {
		stand = evaluate(pos, c.w, c.us);
		if (stand >= beta || qply >= c.qLimit) return stand;
		if (stand > alpha) alpha = stand;
		best = stand;
	} else if (qply >= c.qLimit + 4) return evaluate(pos, c.w, c.us);
	const start = c.sp;
	const end = pos.generate(c.moves, start, inCheck);
	c.sp = end;
	orderMoves(c, start, end, 0, ply);
	let legal = 0;
	for (let i = start; i < end; i += 1) {
		const m = pick(c, i, end);
		const flags = m >>> 17;
		if (!inCheck && !(flags & FLAG_PROMO)) {
			const victim = flags & FLAG_EP ? PAWN : Math.abs(pos.board[(m >> 7) & 127]);
			if (stand + VALUE[victim] + 200 < alpha) continue;
		}
		if (overlooked(c, ply, m)) continue;
		if (!pos.make(m)) continue;
		legal += 1;
		const s = -qsearch(c, -beta, -alpha, ply + 1, qply + 1);
		pos.unmake();
		if (c.stopped) break;
		if (s > best) {
			best = s;
			if (s > alpha) {
				alpha = s;
				if (s >= beta) break;
			}
		}
	}
	c.sp = start;
	if (inCheck && !legal && !c.stopped) {
		return pos.hasLegalMove() ? evaluate(pos, c.w, c.us) : -MATE + ply;
	}
	return best;
}

function search(c: Ctx, depth: number, alpha: number, beta: number, ply: number, nullOk: boolean): number {
	if (tick(c)) return 0;
	const pos = c.pos;
	const pv = beta - alpha > 1;
	if (pos.halfmove >= 100 || pos.repeated() || pos.insufficientMaterial()) return drawScore(c);
	alpha = Math.max(alpha, -MATE + ply);
	beta = Math.min(beta, MATE - ply - 1);
	if (alpha >= beta) return alpha;
	const inCheck = pos.inCheck();
	if (inCheck) depth += 1;
	if (depth <= 0) return qsearch(c, alpha, beta, ply, 0);
	if (ply >= MAX_PLY - 1) return evaluate(pos, c.w, c.us);

	const idx = pos.lo & TT_MASK;
	let ttm = 0;
	if (ttFlag[idx] && ttLo![idx] === pos.lo && ttHi[idx] === pos.hi) {
		ttm = ttMove[idx];
		if (!pv && ttDepth[idx] >= depth && !(c.blind && ply <= 3)) {
			const s = fromTT(ttScore[idx], ply);
			const flag = ttFlag[idx];
			if (flag === EXACT || (flag === LOWER && s >= beta) || (flag === UPPER && s <= alpha)) return s;
		}
	}

	const staticEval = inCheck ? -INF : evaluate(pos, c.w, c.us);
	if (!pv && !inCheck && Math.abs(beta) < MATE_BOUND) {
		if (depth <= 3 && staticEval - 110 * depth >= beta) return staticEval;
		if (nullOk && depth >= 3 && staticEval >= beta && hasPieces(pos, pos.side)) {
			const r = 2 + (depth >> 2);
			pos.makeNull();
			const s = -search(c, depth - 1 - r, -beta, -beta + 1, ply + 1, false);
			pos.unmakeNull();
			if (c.stopped) return 0;
			if (s >= beta) return s >= MATE_BOUND ? beta : s;
		}
	}

	const start = c.sp;
	const end = pos.generate(c.moves, start, true);
	c.sp = end;
	orderMoves(c, start, end, ttm, ply);
	const origAlpha = alpha;
	let best = -INF;
	let bestMove = 0;
	let legal = 0;
	let skipped = 0;
	for (let i = start; i < end; i += 1) {
		const m = pick(c, i, end);
		if (overlooked(c, ply, m)) {
			skipped += 1;
			continue;
		}
		if (!pos.make(m)) continue;
		legal += 1;
		const flags = m >>> 17;
		const quiet = !(flags & (FLAG_CAPTURE | FLAG_PROMO));
		const givesCheck = pos.inCheck();
		let s: number;
		if (legal === 1) s = -search(c, depth - 1, -beta, -alpha, ply + 1, true);
		else {
			let r = 0;
			if (depth >= 3 && legal > 3 && quiet && !inCheck && !givesCheck) {
				r = 1 + (legal > 9 ? 1 : 0) + (depth > 6 ? 1 : 0);
				if (pv) r -= 1;
				if (m === c.killers[ply * 2] || m === c.killers[ply * 2 + 1]) r -= 1;
				if (r < 0) r = 0;
			}
			s = -search(c, depth - 1 - r, -alpha - 1, -alpha, ply + 1, true);
			if (s > alpha && r > 0) s = -search(c, depth - 1, -alpha - 1, -alpha, ply + 1, true);
			if (s > alpha && s < beta) s = -search(c, depth - 1, -beta, -alpha, ply + 1, true);
		}
		pos.unmake();
		if (c.stopped) {
			c.sp = start;
			return 0;
		}
		if (s > best) {
			best = s;
			bestMove = m;
			if (s > alpha) {
				alpha = s;
				if (s >= beta) {
					if (quiet) {
						if (c.killers[ply * 2] !== m) {
							c.killers[ply * 2 + 1] = c.killers[ply * 2];
							c.killers[ply * 2] = m;
						}
						const h = ((m & 127) << 7) | ((m >> 7) & 127);
						c.history[h] = Math.min(600_000, c.history[h] + depth * depth);
					}
					break;
				}
			}
		}
	}
	c.sp = start;
	if (!legal) {
		if (skipped) return staticEval === -INF ? 0 : staticEval;
		return inCheck ? -MATE + ply : drawScore(c);
	}
	if (!c.blind && (ttFlag[idx] === 0 || ttDepth[idx] <= depth + 1 || ttLo![idx] !== pos.lo)) {
		ttLo![idx] = pos.lo;
		ttHi[idx] = pos.hi;
		ttMove[idx] = bestMove;
		ttScore[idx] = toTT(best, ply);
		ttDepth[idx] = depth;
		ttFlag[idx] = best <= origAlpha ? UPPER : best >= beta ? LOWER : EXACT;
	}
	return best;
}

function rng(seed: number) {
	let s = seed | 0 || 1;
	return () => {
		s = (s + 0x6d2b79f5) | 0;
		let t = Math.imul(s ^ (s >>> 15), s | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function positionFrom(fen: string, moves: string[]) {
	const pos = new Position(fen);
	for (const uci of moves) {
		const m = pos.moveFromUci(uci);
		if (!m) break;
		pos.make(m);
	}
	return pos;
}

/** How natural a move looks to a club player, as a weight around 1. */
function naturalness(pos: Position, m: number, lastTo: number) {
	const from = m & 127;
	const to = (m >> 7) & 127;
	const flags = m >>> 17;
	const piece = pos.board[from];
	const color: Color = piece > 0 ? 1 : -1;
	const type = piece * color;
	const home = color === 1 ? 0 : 7;
	const opening = pos.fullmove <= 12;
	let p = 1;
	if (flags & FLAG_CAPTURE) {
		p *= 1.6;
		if (to === lastTo) p *= 1.5;
	}
	if (flags & FLAG_CASTLE) p *= opening ? 2 : 1.3;
	if (opening) {
		if ((type === KNIGHT || type === BISHOP) && from >> 4 === home) p *= 1.5;
		if (type === KING && !(flags & FLAG_CASTLE)) p *= 0.35;
		if (type === ROOK) p *= 0.6;
		if (type === QUEEN && pos.fullmove < 7) p *= 0.6;
		if (type === PAWN && ((from & 7) === 0 || (from & 7) === 7)) p *= 0.55;
		if (type === PAWN && ((from & 7) === 3 || (from & 7) === 4)) p *= 1.3;
	}
	if (!(flags & FLAG_CAPTURE) && type !== PAWN && ((to >> 4) - (from >> 4)) * color < 0) p *= 0.7;
	if (type >= BISHOP && type <= QUEEN && kingDist(from, to) >= 4) p *= 0.85;
	if (pos.make(m)) {
		if (pos.inCheck()) p *= 1.3;
		pos.unmake();
	}
	return p;
}

function makeCtx(pos: Position, opponent: Opponent, deadline: number, seed: number): Ctx {
	return {
		pos,
		w: opponent.style,
		us: pos.side,
		qLimit: opponent.strength.qDepth,
		deadline,
		nodes: 0,
		stopped: false,
		blind: false,
		moves: new Int32Array(MAX_PLY * 256),
		scores: new Int32Array(MAX_PLY * 256),
		sp: 0,
		killers: new Int32Array(MAX_PLY * 2),
		history: new Int32Array(128 * 128),
		rand: rng(seed)
	};
}

type RootLine = { move: number; score: number; exact: boolean };

/** Iterative deepening over the root moves, keeping a score for every move within `margin` of the best. */
function rootSearch(c: Ctx, rootMoves: number[], maxDepth: number, margin: number, softMs: number) {
	const pos = c.pos;
	let lines: RootLine[] = rootMoves.map((move) => ({ move, score: -INF, exact: false }));
	let depthDone = 0;
	const started = performance.now();
	for (let depth = 1; depth <= maxDepth; depth += 1) {
		const next: RootLine[] = [];
		let best = -INF;
		for (const line of lines) {
			const m = line.move;
			pos.make(m);
			let s: number;
			let exact = true;
			if (best === -INF) s = -search(c, depth - 1, -INF, INF, 1, true);
			else {
				const floor = best - margin;
				s = -search(c, depth - 1, -floor - 1, -floor, 1, true);
				if (s > floor && !c.stopped) s = -search(c, depth - 1, -INF, -floor, 1, true);
				else exact = false;
			}
			pos.unmake();
			if (c.stopped) break;
			next.push({ move: m, score: s, exact });
			if (s > best) best = s;
		}
		if (c.stopped) {
			if (next.length && next[0].score > -INF) {
				const seen = new Set(next.map((l) => l.move));
				const rest = lines.filter((l) => !seen.has(l.move));
				const merged = [...next, ...rest];
				const top = next.reduce((a, l) => (l.score > a.score ? l : a), next[0]);
				if (top.score > lines[0].score || depthDone === 0) lines = merged.sort((a, b) => b.score - a.score);
			}
			break;
		}
		lines = next.sort((a, b) => b.score - a.score);
		depthDone = depth;
		if (Math.abs(lines[0].score) >= MATE_BOUND && depth >= 4) break;
		if (performance.now() - started > softMs) break;
	}
	return { lines, depth: depthDone };
}

function principalVariation(pos: Position, first: number) {
	const pv: string[] = [uciOf(first)];
	let made = 0;
	if (!pos.make(first)) return pv;
	made += 1;
	const seen = new Set<string>([pos.key()]);
	for (let i = 0; i < 10; i += 1) {
		const idx = pos.lo & TT_MASK;
		if (!ttFlag[idx] || ttLo![idx] !== pos.lo || ttHi[idx] !== pos.hi) break;
		const m = ttMove[idx];
		if (!m || !pos.legalMoves().includes(m)) break;
		pv.push(uciOf(m));
		pos.make(m);
		made += 1;
		if (seen.has(pos.key())) break;
		seen.add(pos.key());
	}
	while (made--) pos.unmake();
	return pv;
}

function repertoireWeight(names: string[], rep: Record<string, number>) {
	let w = 0.15;
	for (const name of names) for (const [key, v] of Object.entries(rep)) if (name.startsWith(key)) w = Math.max(w, v);
	return w;
}

function bookChoice(pos: Position, opponent: Opponent, plies: number, rand: () => number) {
	if (plies >= opponent.strength.book) return null;
	const entries = bookMoves(pos);
	if (!entries.length) return null;
	const rep = pos.side === 1 ? opponent.white : opponent.black;
	const weighted = entries.map((e) => ({ e, w: e.weight * repertoireWeight(e.names, rep) ** 2 }));
	const total = weighted.reduce((a, x) => a + x.w, 0);
	let r = rand() * total;
	for (const x of weighted) {
		r -= x.w;
		if (r <= 0) return x.e.uci;
	}
	return weighted[weighted.length - 1].e.uci;
}

const resignStreak = new Map<string, number>();

export function think(req: AiRequest): AiResult {
	const pos = positionFrom(req.fen, req.moves);
	const plies = req.moves.length;
	const opponent = req.kind === 'move' ? opponentById(req.opponent) : ANALYST;
	const s = opponent.strength;
	const legal = pos.legalMoves();
	const empty: AiResult = { move: null, score: 0, depth: 0, pv: [], book: false, nodes: 0, best: null };
	if (!legal.length) return { ...empty, score: pos.inCheck() ? -MATE * pos.side : 0 };
	const rand = rng(req.kind === 'move' ? req.seed : 7);

	if (req.kind === 'move') {
		if (plies < 2) resignStreak.delete(opponent.id);
		const uci = bookChoice(pos, opponent, plies, rand);
		if (uci && pos.moveFromUci(uci)) return { ...empty, move: uci, best: uci, book: true };
	}

	let budget = req.kind === 'analyse' ? req.timeMs : s.timeMs;
	if (req.kind === 'move' && req.clock) {
		const { left, inc } = req.clock;
		budget = Math.min(budget, Math.max(60, left / 30 + inc * 0.7));
	}
	const maxDepth = req.kind === 'analyse' ? (req.depth ?? 40) : s.depth;
	const ctxOwner = req.kind === 'analyse' ? 'analyst' : opponent.id + (pos.side === 1 ? 'w' : 'b');
	ttEnsure(ctxOwner);
	const c = makeCtx(pos, opponent, performance.now() + budget, req.kind === 'move' ? req.seed : 1);
	c.blind = req.kind === 'move' && rand() < s.blind;

	let roots = legal;
	if (c.blind) {
		const seen = legal.filter((m) => !overlooked(c, 2, m));
		if (seen.length) roots = seen;
	}
	const margin = req.kind === 'analyse' ? 0 : s.margin;
	const { lines, depth } = rootSearch(c, roots, maxDepth, margin, budget * 0.55);
	const top = lines[0];
	const toWhite = (v: number) => v * pos.side;

	let chosen = top;
	if (req.kind === 'move' && s.temperature > 0 && !(top.score >= MATE_BOUND && s.depth >= 3)) {
		const lastTo = plies ? lastTarget(req.moves[plies - 1]) : -1;
		const pool = lines.filter((l) => l.exact && l.score >= top.score - margin);
		const weights = pool.map((l) => Math.exp((l.score - top.score) / s.temperature) * naturalness(pos, l.move, lastTo) ** s.human);
		const total = weights.reduce((a, b) => a + b, 0);
		let r = rand() * total;
		for (let i = 0; i < pool.length; i += 1) {
			r -= weights[i];
			if (r <= 0) {
				chosen = pool[i];
				break;
			}
		}
	}

	let resign = false;
	if (req.kind === 'move' && s.resigns) {
		const key = opponent.id;
		const streak = top.score < -900 && pos.canMate(pos.side === 1 ? -1 : 1) ? (resignStreak.get(key) ?? 0) + 1 : 0;
		resignStreak.set(key, streak);
		resign = streak >= 3;
	}

	return {
		move: uciOf(chosen.move),
		score: toWhite(top.score),
		depth,
		pv: c.blind ? [uciOf(top.move)] : principalVariation(pos, top.move),
		book: false,
		nodes: c.nodes,
		best: uciOf(top.move),
		resign
	};
}

function lastTarget(uci: string) {
	const f = uci.charCodeAt(2) - 97;
	const r = uci.charCodeAt(3) - 49;
	return r * 16 + f;
}

export function resetAi() {
	resignStreak.clear();
}
