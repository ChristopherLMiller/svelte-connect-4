export type Color = 1 | -1;

export const PAWN = 1;
export const KNIGHT = 2;
export const BISHOP = 3;
export const ROOK = 4;
export const QUEEN = 5;
export const KING = 6;

export const FLAG_CAPTURE = 1;
export const FLAG_DOUBLE = 2;
export const FLAG_EP = 4;
export const FLAG_CASTLE = 8;
export const FLAG_PROMO = 16;

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const KNIGHT_D = [33, 31, 18, 14, -14, -18, -31, -33];
const KING_D = [17, 16, 15, 1, -1, -15, -16, -17];
const DIAG_D = [17, 15, -15, -17];
const ORTH_D = [16, 1, -1, -16];

/** The 64 real squares of the 0x88 board, a1 first. */
export const SQUARES: number[] = [];
for (let r = 0; r < 8; r += 1) for (let f = 0; f < 8; f += 1) SQUARES.push(r * 16 + f);

export const fileOf = (sq: number) => sq & 7;
export const rankOf = (sq: number) => sq >> 4;
export const sq88 = (file: number, rank: number) => rank * 16 + file;

export const moveFrom = (m: number) => m & 127;
export const moveTo = (m: number) => (m >> 7) & 127;
export const movePromo = (m: number) => (m >> 14) & 7;
export const moveFlags = (m: number) => m >>> 17;
export const encodeMove = (from: number, to: number, promo = 0, flags = 0) => from | (to << 7) | (promo << 14) | (flags << 17);

export function squareName(sq: number) {
	return 'abcdefgh'[sq & 7] + String((sq >> 4) + 1);
}

export function parseSquare(name: string) {
	const f = name.charCodeAt(0) - 97;
	const r = name.charCodeAt(1) - 49;
	if (f < 0 || f > 7 || r < 0 || r > 7) return -1;
	return r * 16 + f;
}

export function uciOf(m: number) {
	const promo = movePromo(m);
	return squareName(moveFrom(m)) + squareName(moveTo(m)) + (promo ? ' nbrq'[promo - 1] : '');
}

const CASTLE_MASK = new Int8Array(128).fill(15);
CASTLE_MASK[0] = 15 & ~2;
CASTLE_MASK[4] = 15 & ~3;
CASTLE_MASK[7] = 15 & ~1;
CASTLE_MASK[112] = 15 & ~8;
CASTLE_MASK[116] = 15 & ~12;
CASTLE_MASK[119] = 15 & ~4;

function mulberry(seed: number) {
	return () => {
		seed = (seed + 0x6d2b79f5) | 0;
		let t = seed;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return (t ^ (t >>> 14)) | 0;
	};
}

const rand = mulberry(0xc0ffee);
const Z_PIECE_LO = new Int32Array(13 * 128);
const Z_PIECE_HI = new Int32Array(13 * 128);
for (let i = 0; i < Z_PIECE_LO.length; i += 1) {
	Z_PIECE_LO[i] = rand();
	Z_PIECE_HI[i] = rand();
}
const Z_CASTLE_LO = Int32Array.from({ length: 16 }, () => rand());
const Z_CASTLE_HI = Int32Array.from({ length: 16 }, () => rand());
const Z_EP_LO = Int32Array.from({ length: 8 }, () => rand());
const Z_EP_HI = Int32Array.from({ length: 8 }, () => rand());
const Z_SIDE_LO = rand();
const Z_SIDE_HI = rand();

/** Material plus piece-square values, white's view with rank 8 first. */
const MG_VALUE = [0, 82, 337, 365, 477, 1025, 0];
const EG_VALUE = [0, 94, 281, 297, 512, 936, 0];
export const PHASE_WEIGHT = [0, 0, 1, 1, 2, 4, 0];

// prettier-ignore
const PST_MG: number[][] = [
	[],
	[
		0, 0, 0, 0, 0, 0, 0, 0,
		50, 50, 50, 50, 50, 50, 50, 50,
		10, 10, 20, 30, 30, 20, 10, 10,
		5, 5, 10, 25, 25, 10, 5, 5,
		0, 0, 0, 20, 20, 0, 0, 0,
		5, -5, -10, 0, 0, -10, -5, 5,
		5, 10, 10, -20, -20, 10, 10, 5,
		0, 0, 0, 0, 0, 0, 0, 0
	],
	[
		-50, -40, -30, -30, -30, -30, -40, -50,
		-40, -20, 0, 0, 0, 0, -20, -40,
		-30, 0, 10, 15, 15, 10, 0, -30,
		-30, 5, 15, 20, 20, 15, 5, -30,
		-30, 0, 15, 20, 20, 15, 0, -30,
		-30, 5, 10, 15, 15, 10, 5, -30,
		-40, -20, 0, 5, 5, 0, -20, -40,
		-50, -40, -30, -30, -30, -30, -40, -50
	],
	[
		-20, -10, -10, -10, -10, -10, -10, -20,
		-10, 0, 0, 0, 0, 0, 0, -10,
		-10, 0, 5, 10, 10, 5, 0, -10,
		-10, 5, 5, 10, 10, 5, 5, -10,
		-10, 0, 10, 10, 10, 10, 0, -10,
		-10, 10, 10, 10, 10, 10, 10, -10,
		-10, 5, 0, 0, 0, 0, 5, -10,
		-20, -10, -10, -10, -10, -10, -10, -20
	],
	[
		0, 0, 0, 0, 0, 0, 0, 0,
		5, 10, 10, 10, 10, 10, 10, 5,
		-5, 0, 0, 0, 0, 0, 0, -5,
		-5, 0, 0, 0, 0, 0, 0, -5,
		-5, 0, 0, 0, 0, 0, 0, -5,
		-5, 0, 0, 0, 0, 0, 0, -5,
		-5, 0, 0, 0, 0, 0, 0, -5,
		0, 0, 0, 5, 5, 0, 0, 0
	],
	[
		-20, -10, -10, -5, -5, -10, -10, -20,
		-10, 0, 0, 0, 0, 0, 0, -10,
		-10, 0, 5, 5, 5, 5, 0, -10,
		-5, 0, 5, 5, 5, 5, 0, -5,
		0, 0, 5, 5, 5, 5, 0, -5,
		-10, 5, 5, 5, 5, 5, 0, -10,
		-10, 0, 5, 0, 0, 0, 0, -10,
		-20, -10, -10, -5, -5, -10, -10, -20
	],
	[
		-30, -40, -40, -50, -50, -40, -40, -30,
		-30, -40, -40, -50, -50, -40, -40, -30,
		-30, -40, -40, -50, -50, -40, -40, -30,
		-30, -40, -40, -50, -50, -40, -40, -30,
		-20, -30, -30, -40, -40, -30, -30, -20,
		-10, -20, -20, -20, -20, -20, -20, -10,
		20, 20, 0, 0, 0, 0, 20, 20,
		20, 30, 10, 0, 0, 10, 30, 20
	]
];

// prettier-ignore
const PST_EG_PAWN = [
	0, 0, 0, 0, 0, 0, 0, 0,
	80, 80, 80, 80, 80, 80, 80, 80,
	50, 50, 50, 50, 50, 50, 50, 50,
	30, 30, 30, 30, 30, 30, 30, 30,
	15, 15, 15, 15, 15, 15, 15, 15,
	5, 5, 5, 5, 5, 5, 5, 5,
	0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0
];

// prettier-ignore
const PST_EG_KING = [
	-50, -40, -30, -20, -20, -30, -40, -50,
	-30, -20, -10, 0, 0, -10, -20, -30,
	-30, -10, 20, 30, 30, 20, -10, -30,
	-30, -10, 30, 40, 40, 30, -10, -30,
	-30, -10, 30, 40, 40, 30, -10, -30,
	-30, -10, 20, 30, 30, 20, -10, -30,
	-30, -30, 0, 0, 0, 0, -30, -30,
	-50, -30, -30, -30, -30, -30, -30, -50
];

/** Signed piece + 6 → square → value from that piece's owner's view. */
const SQ_MG = new Int16Array(13 * 128);
const SQ_EG = new Int16Array(13 * 128);
for (let type = 1; type <= 6; type += 1) {
	for (const sq of SQUARES) {
		const f = sq & 7;
		const r = sq >> 4;
		const whiteIdx = (7 - r) * 8 + f;
		const blackIdx = r * 8 + f;
		const egTable = type === PAWN ? PST_EG_PAWN : type === KING ? PST_EG_KING : PST_MG[type];
		SQ_MG[(type + 6) * 128 + sq] = MG_VALUE[type] + PST_MG[type][whiteIdx];
		SQ_EG[(type + 6) * 128 + sq] = EG_VALUE[type] + egTable[whiteIdx];
		SQ_MG[(-type + 6) * 128 + sq] = MG_VALUE[type] + PST_MG[type][blackIdx];
		SQ_EG[(-type + 6) * 128 + sq] = EG_VALUE[type] + egTable[blackIdx];
	}
}

const STACK = 8192;

export class Position {
	board = new Int8Array(128);
	side: Color = 1;
	castling = 0;
	ep = -1;
	halfmove = 0;
	fullmove = 1;
	/** King squares: [white, black]. */
	king = [4, 116];
	lo = 0;
	hi = 0;
	/** Material + piece-square totals per colour: [white, black]. */
	mg = [0, 0];
	eg = [0, 0];
	phase = 0;
	ply = 0;

	private uMove = new Int32Array(STACK);
	private uCaptured = new Int8Array(STACK);
	private uCastling = new Int8Array(STACK);
	private uEp = new Int16Array(STACK);
	private uHalf = new Int16Array(STACK);
	private uLo = new Int32Array(STACK);
	private uHi = new Int32Array(STACK);
	/** Key of the position at each ply since the start, for repetition. */
	histLo = new Int32Array(STACK + 1);
	histHi = new Int32Array(STACK + 1);

	constructor(fen = START_FEN) {
		this.load(fen);
	}

	load(fen: string) {
		const parts = fen.trim().split(/\s+/);
		if (parts.length < 4) throw new Error('bad fen');
		this.board.fill(0);
		this.lo = 0;
		this.hi = 0;
		this.mg = [0, 0];
		this.eg = [0, 0];
		this.phase = 0;
		const rows = parts[0].split('/');
		if (rows.length !== 8) throw new Error('bad fen');
		let kings = 0;
		for (let i = 0; i < 8; i += 1) {
			const rank = 7 - i;
			let file = 0;
			for (const ch of rows[i]) {
				if (ch >= '1' && ch <= '8') {
					file += Number(ch);
					continue;
				}
				const type = ' pnbrqk'.indexOf(ch.toLowerCase());
				if (type < 1 || file > 7) throw new Error('bad fen');
				const piece = ch === ch.toLowerCase() ? -type : type;
				const sq = rank * 16 + file;
				this.add(sq, piece);
				if (type === KING) {
					this.king[piece > 0 ? 0 : 1] = sq;
					kings += piece > 0 ? 1 : 16;
				}
				file += 1;
			}
			if (file !== 8) throw new Error('bad fen');
		}
		if (kings !== 17) throw new Error('bad fen');
		this.side = parts[1] === 'b' ? -1 : 1;
		if (this.side === -1) this.hashSide();
		this.castling = 0;
		if (parts[2].includes('K') && this.board[4] === KING && this.board[7] === ROOK) this.castling |= 1;
		if (parts[2].includes('Q') && this.board[4] === KING && this.board[0] === ROOK) this.castling |= 2;
		if (parts[2].includes('k') && this.board[116] === -KING && this.board[119] === -ROOK) this.castling |= 4;
		if (parts[2].includes('q') && this.board[116] === -KING && this.board[112] === -ROOK) this.castling |= 8;
		this.lo ^= Z_CASTLE_LO[this.castling];
		this.hi ^= Z_CASTLE_HI[this.castling];
		this.ep = -1;
		if (parts[3] !== '-') {
			const ep = parseSquare(parts[3]);
			if (ep >= 0 && this.epCapturable(ep)) {
				this.ep = ep;
				this.hashEp(ep);
			}
		}
		this.halfmove = Number(parts[4] ?? 0) || 0;
		this.fullmove = Math.max(1, Number(parts[5] ?? 1) || 1);
		this.ply = 0;
		this.histLo[0] = this.lo;
		this.histHi[0] = this.hi;
	}

	clone() {
		const p = new Position(this.fen());
		return p;
	}

	fen() {
		const rows: string[] = [];
		for (let r = 7; r >= 0; r -= 1) {
			let row = '';
			let empty = 0;
			for (let f = 0; f < 8; f += 1) {
				const piece = this.board[r * 16 + f];
				if (!piece) {
					empty += 1;
					continue;
				}
				if (empty) row += String(empty);
				empty = 0;
				const ch = ' pnbrqk'[Math.abs(piece)];
				row += piece > 0 ? ch.toUpperCase() : ch;
			}
			if (empty) row += String(empty);
			rows.push(row);
		}
		let castle = '';
		if (this.castling & 1) castle += 'K';
		if (this.castling & 2) castle += 'Q';
		if (this.castling & 4) castle += 'k';
		if (this.castling & 8) castle += 'q';
		return `${rows.join('/')} ${this.side === 1 ? 'w' : 'b'} ${castle || '-'} ${this.ep >= 0 ? squareName(this.ep) : '-'} ${this.halfmove} ${this.fullmove}`;
	}

	private add(sq: number, piece: number) {
		this.board[sq] = piece;
		const i = (piece + 6) * 128 + sq;
		this.lo ^= Z_PIECE_LO[i];
		this.hi ^= Z_PIECE_HI[i];
		const c = piece > 0 ? 0 : 1;
		this.mg[c] += SQ_MG[i];
		this.eg[c] += SQ_EG[i];
		this.phase += PHASE_WEIGHT[piece > 0 ? piece : -piece];
	}

	private remove(sq: number) {
		const piece = this.board[sq];
		this.board[sq] = 0;
		const i = (piece + 6) * 128 + sq;
		this.lo ^= Z_PIECE_LO[i];
		this.hi ^= Z_PIECE_HI[i];
		const c = piece > 0 ? 0 : 1;
		this.mg[c] -= SQ_MG[i];
		this.eg[c] -= SQ_EG[i];
		this.phase -= PHASE_WEIGHT[piece > 0 ? piece : -piece];
	}

	private hashEp(ep: number) {
		this.lo ^= Z_EP_LO[ep & 7];
		this.hi ^= Z_EP_HI[ep & 7];
	}

	private hashSide() {
		this.lo ^= Z_SIDE_LO;
		this.hi ^= Z_SIDE_HI;
	}

	/** An en-passant square only counts when an enemy pawn stands ready to take. */
	private epCapturable(ep: number) {
		const side = this.side;
		const pawnSq = ep - 16 * side;
		for (const d of [-1, 1]) {
			const s = pawnSq + d;
			if (!(s & 0x88) && this.board[s] === side * PAWN) return true;
		}
		return false;
	}

	kingSq(color: Color) {
		return this.king[color === 1 ? 0 : 1];
	}

	attacked(sq: number, by: Color) {
		const b = this.board;
		if (by === 1) {
			if (!((sq - 15) & 0x88) && b[sq - 15] === PAWN) return true;
			if (!((sq - 17) & 0x88) && b[sq - 17] === PAWN) return true;
		} else {
			if (!((sq + 15) & 0x88) && b[sq + 15] === -PAWN) return true;
			if (!((sq + 17) & 0x88) && b[sq + 17] === -PAWN) return true;
		}
		const knight = KNIGHT * by;
		for (let i = 0; i < 8; i += 1) {
			const t = sq + KNIGHT_D[i];
			if (!(t & 0x88) && b[t] === knight) return true;
		}
		const king = KING * by;
		for (let i = 0; i < 8; i += 1) {
			const t = sq + KING_D[i];
			if (!(t & 0x88) && b[t] === king) return true;
		}
		const bishop = BISHOP * by;
		const rook = ROOK * by;
		const queen = QUEEN * by;
		for (let i = 0; i < 4; i += 1) {
			const d = DIAG_D[i];
			let t = sq + d;
			while (!(t & 0x88)) {
				const p = b[t];
				if (p) {
					if (p === bishop || p === queen) return true;
					break;
				}
				t += d;
			}
		}
		for (let i = 0; i < 4; i += 1) {
			const d = ORTH_D[i];
			let t = sq + d;
			while (!(t & 0x88)) {
				const p = b[t];
				if (p) {
					if (p === rook || p === queen) return true;
					break;
				}
				t += d;
			}
		}
		return false;
	}

	inCheck(color: Color = this.side) {
		return this.attacked(this.kingSq(color), color === 1 ? -1 : 1);
	}

	/** Pseudo-legal moves into `out` from index `n`; returns the new length. */
	generate(out: Int32Array | number[], n: number, quiets = true) {
		const b = this.board;
		const side = this.side;
		for (let k = 0; k < 64; k += 1) {
			const sq = SQUARES[k];
			const piece = b[sq];
			if (piece * side <= 0) continue;
			const type = piece * side;
			if (type === PAWN) {
				const fwd = 16 * side;
				const lastRank = side === 1 ? 7 : 0;
				const startRank = side === 1 ? 1 : 6;
				const one = sq + fwd;
				if (!(one & 0x88) && !b[one]) {
					if (one >> 4 === lastRank) {
						out[n++] = encodeMove(sq, one, QUEEN, FLAG_PROMO);
						if (quiets) {
							out[n++] = encodeMove(sq, one, KNIGHT, FLAG_PROMO);
							out[n++] = encodeMove(sq, one, ROOK, FLAG_PROMO);
							out[n++] = encodeMove(sq, one, BISHOP, FLAG_PROMO);
						}
					} else if (quiets) {
						out[n++] = encodeMove(sq, one);
						if (sq >> 4 === startRank && !b[one + fwd]) out[n++] = encodeMove(sq, one + fwd, 0, FLAG_DOUBLE);
					}
				}
				for (const d of [fwd - 1, fwd + 1]) {
					const to = sq + d;
					if (to & 0x88) continue;
					if (b[to] * side < 0) {
						if (to >> 4 === lastRank) {
							out[n++] = encodeMove(sq, to, QUEEN, FLAG_PROMO | FLAG_CAPTURE);
							if (quiets) {
								out[n++] = encodeMove(sq, to, KNIGHT, FLAG_PROMO | FLAG_CAPTURE);
								out[n++] = encodeMove(sq, to, ROOK, FLAG_PROMO | FLAG_CAPTURE);
								out[n++] = encodeMove(sq, to, BISHOP, FLAG_PROMO | FLAG_CAPTURE);
							}
						} else out[n++] = encodeMove(sq, to, 0, FLAG_CAPTURE);
					} else if (to === this.ep) out[n++] = encodeMove(sq, to, 0, FLAG_EP | FLAG_CAPTURE);
				}
				continue;
			}
			if (type === KNIGHT || type === KING) {
				const dirs = type === KNIGHT ? KNIGHT_D : KING_D;
				for (let i = 0; i < 8; i += 1) {
					const to = sq + dirs[i];
					if (to & 0x88) continue;
					const t = b[to];
					if (t * side > 0) continue;
					if (t) out[n++] = encodeMove(sq, to, 0, FLAG_CAPTURE);
					else if (quiets) out[n++] = encodeMove(sq, to);
				}
				continue;
			}
			if (type !== ROOK) n = this.slide(out, n, sq, DIAG_D, quiets);
			if (type !== BISHOP) n = this.slide(out, n, sq, ORTH_D, quiets);
		}
		if (quiets) n = this.castles(out, n);
		return n;
	}

	private slide(out: Int32Array | number[], n: number, sq: number, dirs: number[], quiets: boolean) {
		const b = this.board;
		const side = this.side;
		for (let i = 0; i < 4; i += 1) {
			const d = dirs[i];
			let to = sq + d;
			while (!(to & 0x88)) {
				const t = b[to];
				if (t) {
					if (t * side < 0) out[n++] = encodeMove(sq, to, 0, FLAG_CAPTURE);
					break;
				}
				if (quiets) out[n++] = encodeMove(sq, to);
				to += d;
			}
		}
		return n;
	}

	private castles(out: Int32Array | number[], n: number) {
		const b = this.board;
		if (this.side === 1) {
			if (this.castling & 1 && !b[5] && !b[6] && !this.attacked(4, -1) && !this.attacked(5, -1) && !this.attacked(6, -1))
				out[n++] = encodeMove(4, 6, 0, FLAG_CASTLE);
			if (this.castling & 2 && !b[3] && !b[2] && !b[1] && !this.attacked(4, -1) && !this.attacked(3, -1) && !this.attacked(2, -1))
				out[n++] = encodeMove(4, 2, 0, FLAG_CASTLE);
		} else {
			if (this.castling & 4 && !b[117] && !b[118] && !this.attacked(116, 1) && !this.attacked(117, 1) && !this.attacked(118, 1))
				out[n++] = encodeMove(116, 118, 0, FLAG_CASTLE);
			if (
				this.castling & 8 &&
				!b[115] &&
				!b[114] &&
				!b[113] &&
				!this.attacked(116, 1) &&
				!this.attacked(115, 1) &&
				!this.attacked(114, 1)
			)
				out[n++] = encodeMove(116, 114, 0, FLAG_CASTLE);
		}
		return n;
	}

	/** Plays a pseudo-legal move; returns false (and takes it back) if it leaves the king in check. */
	make(m: number) {
		const from = m & 127;
		const to = (m >> 7) & 127;
		const promo = (m >> 14) & 7;
		const flags = m >>> 17;
		const ply = this.ply;
		const side = this.side;
		this.uMove[ply] = m;
		this.uCastling[ply] = this.castling;
		this.uEp[ply] = this.ep;
		this.uHalf[ply] = this.halfmove;
		this.uLo[ply] = this.lo;
		this.uHi[ply] = this.hi;
		const piece = this.board[from];
		let captured = 0;
		if (this.ep >= 0) this.hashEp(this.ep);
		if (flags & FLAG_EP) {
			const cap = to - 16 * side;
			captured = this.board[cap];
			this.remove(cap);
		} else if (this.board[to]) {
			captured = this.board[to];
			this.remove(to);
		}
		this.uCaptured[ply] = captured;
		this.remove(from);
		this.add(to, promo ? promo * side : piece);
		if (flags & FLAG_CASTLE) {
			if ((to & 7) === 6) {
				const rook = this.board[to + 1];
				this.remove(to + 1);
				this.add(to - 1, rook);
			} else {
				const rook = this.board[to - 2];
				this.remove(to - 2);
				this.add(to + 1, rook);
			}
		}
		if (piece * side === KING) this.king[side === 1 ? 0 : 1] = to;
		this.lo ^= Z_CASTLE_LO[this.castling];
		this.hi ^= Z_CASTLE_HI[this.castling];
		this.castling &= CASTLE_MASK[from] & CASTLE_MASK[to];
		this.lo ^= Z_CASTLE_LO[this.castling];
		this.hi ^= Z_CASTLE_HI[this.castling];
		this.ep = -1;
		this.halfmove = piece * side === PAWN || captured ? 0 : this.halfmove + 1;
		if (side === -1) this.fullmove += 1;
		this.side = side === 1 ? -1 : 1;
		this.hashSide();
		if (flags & FLAG_DOUBLE) {
			const ep = from + 16 * side;
			if (this.epCapturable(ep)) {
				this.ep = ep;
				this.hashEp(ep);
			}
		}
		this.ply = ply + 1;
		this.histLo[this.ply] = this.lo;
		this.histHi[this.ply] = this.hi;
		if (this.attacked(this.king[side === 1 ? 0 : 1], this.side)) {
			this.unmake();
			return false;
		}
		return true;
	}

	unmake() {
		const ply = (this.ply -= 1);
		const m = this.uMove[ply];
		const from = m & 127;
		const to = (m >> 7) & 127;
		const promo = (m >> 14) & 7;
		const flags = m >>> 17;
		const side = (this.side = this.side === 1 ? -1 : 1);
		const moved = this.board[to];
		this.remove(to);
		this.add(from, promo ? PAWN * side : moved);
		if (flags & FLAG_CASTLE) {
			if ((to & 7) === 6) {
				const rook = this.board[to - 1];
				this.remove(to - 1);
				this.add(to + 1, rook);
			} else {
				const rook = this.board[to + 1];
				this.remove(to + 1);
				this.add(to - 2, rook);
			}
		}
		const captured = this.uCaptured[ply];
		if (captured) this.add(flags & FLAG_EP ? to - 16 * side : to, captured);
		if (moved * side === KING) this.king[side === 1 ? 0 : 1] = from;
		this.castling = this.uCastling[ply];
		this.ep = this.uEp[ply];
		this.halfmove = this.uHalf[ply];
		this.lo = this.uLo[ply];
		this.hi = this.uHi[ply];
		if (side === -1) this.fullmove -= 1;
	}

	makeNull() {
		const ply = this.ply;
		this.uMove[ply] = 0;
		this.uEp[ply] = this.ep;
		this.uHalf[ply] = this.halfmove;
		this.uLo[ply] = this.lo;
		this.uHi[ply] = this.hi;
		this.uCastling[ply] = this.castling;
		if (this.ep >= 0) this.hashEp(this.ep);
		this.ep = -1;
		this.side = this.side === 1 ? -1 : 1;
		this.hashSide();
		this.halfmove += 1;
		this.ply = ply + 1;
		this.histLo[this.ply] = this.lo;
		this.histHi[this.ply] = this.hi;
	}

	unmakeNull() {
		const ply = (this.ply -= 1);
		this.side = this.side === 1 ? -1 : 1;
		this.ep = this.uEp[ply];
		this.halfmove = this.uHalf[ply];
		this.lo = this.uLo[ply];
		this.hi = this.uHi[ply];
	}

	legalMoves() {
		const buf: number[] = [];
		const n = this.generate(buf, 0, true);
		const out: number[] = [];
		for (let i = 0; i < n; i += 1) {
			if (this.make(buf[i])) {
				this.unmake();
				out.push(buf[i]);
			}
		}
		return out;
	}

	hasLegalMove() {
		const buf: number[] = [];
		const n = this.generate(buf, 0, true);
		for (let i = 0; i < n; i += 1) {
			if (this.make(buf[i])) {
				this.unmake();
				return true;
			}
		}
		return false;
	}

	/** Times the current position has stood on the board since the last irreversible move, this one included. */
	repetitions() {
		let count = 1;
		const stop = Math.max(0, this.ply - this.halfmove);
		for (let p = this.ply - 2; p >= stop; p -= 2) {
			if (this.histLo[p] === this.lo && this.histHi[p] === this.hi) count += 1;
		}
		return count;
	}

	/** Whether the current position already occurred earlier (search draws on the first repeat). */
	repeated() {
		const stop = Math.max(0, this.ply - this.halfmove);
		for (let p = this.ply - 2; p >= stop; p -= 2) {
			if (this.histLo[p] === this.lo && this.histHi[p] === this.hi) return true;
		}
		return false;
	}

	/** Neither side can ever mate: bare kings, a lone minor, or bishops all on one colour. */
	insufficientMaterial() {
		let minors = 0;
		let knights = 0;
		let light = 0;
		let dark = 0;
		for (let k = 0; k < 64; k += 1) {
			const sq = SQUARES[k];
			const t = Math.abs(this.board[sq]);
			if (!t || t === KING) continue;
			if (t === PAWN || t === ROOK || t === QUEEN) return false;
			minors += 1;
			if (t === KNIGHT) knights += 1;
			else if (((sq & 7) + (sq >> 4)) % 2) light += 1;
			else dark += 1;
		}
		if (minors <= 1) return true;
		return knights === 0 && (light === 0 || dark === 0);
	}

	/** Whether `color` still has anything that could ever deliver mate. */
	canMate(color: Color) {
		let minors = 0;
		for (let k = 0; k < 64; k += 1) {
			const p = this.board[SQUARES[k]] * color;
			if (p <= 0 || p === KING) continue;
			if (p === PAWN || p === ROOK || p === QUEEN) return true;
			minors += 1;
		}
		return minors >= 2;
	}

	san(m: number, legal = this.legalMoves()) {
		const from = m & 127;
		const to = (m >> 7) & 127;
		const promo = (m >> 14) & 7;
		const flags = m >>> 17;
		let out: string;
		if (flags & FLAG_CASTLE) out = (to & 7) === 6 ? 'O-O' : 'O-O-O';
		else {
			const type = Math.abs(this.board[from]);
			const capture = flags & FLAG_CAPTURE;
			if (type === PAWN) {
				out = (capture ? 'abcdefgh'[from & 7] + 'x' : '') + squareName(to) + (promo ? '=' + ' PNBRQ'[promo] : '');
			} else {
				let dis = '';
				const rivals = legal.filter(
					(o) => o !== m && ((o >> 7) & 127) === to && Math.abs(this.board[o & 127]) === type && !(o >>> 17 & FLAG_CASTLE)
				);
				if (rivals.length) {
					const sameFile = rivals.some((o) => ((o & 127) & 7) === (from & 7));
					const sameRank = rivals.some((o) => (o & 127) >> 4 === from >> 4);
					if (!sameFile) dis = 'abcdefgh'[from & 7];
					else if (!sameRank) dis = String((from >> 4) + 1);
					else dis = squareName(from);
				}
				out = ' PNBRQK'[type] + dis + (capture ? 'x' : '') + squareName(to);
			}
		}
		if (this.make(m)) {
			if (this.inCheck()) out += this.hasLegalMove() ? '+' : '#';
			this.unmake();
		}
		return out;
	}

	/** Finds the legal move written in standard algebraic notation, ignoring check marks and annotations. */
	moveFromSan(text: string) {
		const want = text.replace(/[+#!?]/g, '').replace(/0/g, 'O');
		const legal = this.legalMoves();
		for (const m of legal) {
			if (this.san(m, legal).replace(/[+#]/g, '') === want) return m;
		}
		const loose = /^([NBRQK])([a-h])?([1-8])?x?([a-h][1-8])$/.exec(want);
		if (!loose) return 0;
		const [, letter, file, rank, to] = loose;
		const type = ' PNBRQK'.indexOf(letter);
		const matches = legal.filter((m) => {
			const from = m & 127;
			if (Math.abs(this.board[from]) !== type || squareName((m >> 7) & 127) !== to) return false;
			if (file && 'abcdefgh'[from & 7] !== file) return false;
			return !rank || String((from >> 4) + 1) === rank;
		});
		return matches.length === 1 ? matches[0] : 0;
	}

	moveFromUci(text: string) {
		for (const m of this.legalMoves()) if (uciOf(m) === text) return m;
		return 0;
	}

	/** The key FIDE's repetition rule compares: en passant only counts when it is actually playable. */
	repetitionKey() {
		if (this.ep < 0) return `${this.lo}:${this.hi}`;
		const playable = this.legalMoves().some((m) => (m >>> 17) & FLAG_EP);
		if (playable) return `${this.lo}:${this.hi}`;
		return `${this.lo ^ Z_EP_LO[this.ep & 7]}:${this.hi ^ Z_EP_HI[this.ep & 7]}`;
	}

	key() {
		return `${this.lo}:${this.hi}`;
	}

	perft(depth: number): number {
		if (depth === 0) return 1;
		const buf: number[] = [];
		const n = this.generate(buf, 0, true);
		let total = 0;
		for (let i = 0; i < n; i += 1) {
			if (!this.make(buf[i])) continue;
			total += depth === 1 ? 1 : this.perft(depth - 1);
			this.unmake();
		}
		return total;
	}
}

export type Reason =
	| 'checkmate'
	| 'stalemate'
	| 'insufficient'
	| 'fivefold'
	| 'seventyfive'
	| 'threefold'
	| 'fifty'
	| 'agreement'
	| 'resign'
	| 'timeout'
	| 'timeout-draw';

export type Outcome = { winner: Color | 0; reason: Reason };

/** Game-ending states the rules impose without anyone claiming them. */
export function automaticOutcome(pos: Position, repetitions: number): Outcome | null {
	if (!pos.hasLegalMove()) {
		if (pos.inCheck()) return { winner: pos.side === 1 ? -1 : 1, reason: 'checkmate' };
		return { winner: 0, reason: 'stalemate' };
	}
	if (pos.insufficientMaterial()) return { winner: 0, reason: 'insufficient' };
	if (repetitions >= 5) return { winner: 0, reason: 'fivefold' };
	if (pos.halfmove >= 150) return { winner: 0, reason: 'seventyfive' };
	return null;
}

/** A draw the player to move may claim: threefold repetition or fifty moves without a capture or pawn move. */
export function claimable(pos: Position, repetitions: number): 'threefold' | 'fifty' | null {
	if (repetitions >= 3) return 'threefold';
	if (pos.halfmove >= 100) return 'fifty';
	return null;
}
