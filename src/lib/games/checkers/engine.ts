import { playable, SIZE, type Board, type Cell, type Coord, type Move, type Piece, type Player } from './types';

const FWD: Record<Player, Coord[]> = {
	1: [
		{ r: -1, c: -1 },
		{ r: -1, c: 1 }
	],
	2: [
		{ r: 1, c: -1 },
		{ r: 1, c: 1 }
	]
};

const ALL: Coord[] = [
	{ r: -1, c: -1 },
	{ r: -1, c: 1 },
	{ r: 1, c: -1 },
	{ r: 1, c: 1 }
];

export function opponent(player: Player): Player {
	return player === 1 ? 2 : 1;
}

export function inBounds(r: number, c: number) {
	return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

export function cloneBoard(board: Board): Board {
	return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

export function emptyBoard(): Board {
	return Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => null as Cell));
}

export function setupBoard(): Board {
	const board = emptyBoard();
	let n1 = 0;
	let n2 = 0;
	for (let r = 0; r < SIZE; r += 1) {
		for (let c = 0; c < SIZE; c += 1) {
			if (!playable(r, c)) continue;
			if (r < 3) {
				board[r][c] = { id: `2-${n2++}`, player: 2, king: false };
			} else if (r > 4) {
				board[r][c] = { id: `1-${n1++}`, player: 1, king: false };
			}
		}
	}
	return board;
}

function dirsFor(piece: Piece) {
	return piece.king ? ALL : FWD[piece.player];
}

function kingRow(player: Player) {
	return player === 1 ? 0 : SIZE - 1;
}

function at(board: Board, r: number, c: number): Cell {
	return board[r]?.[c] ?? null;
}

function walkCaptures(
	board: Board,
	from: Coord,
	piece: Piece,
	seen: Set<string>,
	path: Coord[],
	captured: Coord[]
): Move[] {
	const hops: Move[] = [];
	for (const dir of dirsFor(piece)) {
		const mr = from.r + dir.r;
		const mc = from.c + dir.c;
		const lr = from.r + dir.r * 2;
		const lc = from.c + dir.c * 2;
		if (!inBounds(lr, lc) || !playable(lr, lc)) continue;
		const mid = at(board, mr, mc);
		const land = at(board, lr, lc);
		if (!mid || mid.player === piece.player || land || seen.has(`${mr}:${mc}`)) continue;
		const next = cloneBoard(board);
		next[from.r][from.c] = null;
		next[mr][mc] = null;
		const crowned = !piece.king && lr === kingRow(piece.player);
		const moved: Piece = { ...piece, king: piece.king || crowned };
		next[lr][lc] = moved;
		const landCoord = { r: lr, c: lc };
		const midCoord = { r: mr, c: mc };
		const nextPath = [...path, landCoord];
		const nextCaps = [...captured, midCoord];
		hops.push({
			from: path[0] ?? from,
			to: landCoord,
			path: nextPath,
			captured: nextCaps,
			crown: crowned
		});
		if (crowned) continue;
		hops.push(
			...walkCaptures(next, landCoord, moved, new Set(seen).add(`${mr}:${mc}`), nextPath, nextCaps)
		);
	}
	return hops;
}

function quietMoves(board: Board, from: Coord, piece: Piece): Move[] {
	const moves: Move[] = [];
	for (const dir of dirsFor(piece)) {
		const r = from.r + dir.r;
		const c = from.c + dir.c;
		if (!inBounds(r, c) || !playable(r, c) || at(board, r, c)) continue;
		const crown = !piece.king && r === kingRow(piece.player);
		const to = { r, c };
		moves.push({ from, to, path: [from, to], captured: [], crown });
	}
	return moves;
}

export function piecesOf(board: Board, player: Player) {
	const list: Array<{ piece: Piece; at: Coord }> = [];
	for (let r = 0; r < SIZE; r += 1) {
		for (let c = 0; c < SIZE; c += 1) {
			const piece = board[r][c];
			if (piece?.player === player) list.push({ piece, at: { r, c } });
		}
	}
	return list;
}

export function legalMoves(board: Board, player: Player): Move[] {
	const captures: Move[] = [];
	const quiets: Move[] = [];
	for (const { piece, at } of piecesOf(board, player)) {
		captures.push(...walkCaptures(board, at, piece, new Set(), [at], []));
		quiets.push(...quietMoves(board, at, piece));
	}
	return [...captures, ...quiets];
}

export function jumpingFrom(board: Board, player: Player) {
	const seen = new Set<string>();
	const list: Coord[] = [];
	for (const move of legalMoves(board, player)) {
		if (!move.captured.length) continue;
		const key = `${move.from.r}:${move.from.c}`;
		if (seen.has(key)) continue;
		seen.add(key);
		list.push(move.from);
	}
	return list;
}

export function movesFrom(board: Board, player: Player, from: Coord) {
	return legalMoves(board, player).filter((move) => move.from.r === from.r && move.from.c === from.c);
}

export function applyMove(board: Board, move: Move): Board {
	const next = cloneBoard(board);
	const piece = next[move.from.r][move.from.c];
	if (!piece) return next;
	next[move.from.r][move.from.c] = null;
	for (const cap of move.captured) next[cap.r][cap.c] = null;
	next[move.to.r][move.to.c] = { ...piece, king: piece.king || move.crown };
	return next;
}

export function countPieces(board: Board, player: Player) {
	let men = 0;
	let kings = 0;
	for (const { piece } of piecesOf(board, player)) {
		if (piece.king) kings += 1;
		else men += 1;
	}
	return { men, kings, total: men + kings };
}

export function statusFor(board: Board, toMove: Player) {
	const you = countPieces(board, toMove);
	const them = countPieces(board, opponent(toMove));
	if (you.total === 0 || legalMoves(board, toMove).length === 0) {
		return { type: 'won' as const, winner: opponent(toMove) };
	}
	if (them.total === 0) return { type: 'won' as const, winner: toMove };
	return { type: 'playing' as const };
}

export function sameMove(a: Move, b: Move) {
	return (
		a.from.r === b.from.r &&
		a.from.c === b.from.c &&
		a.to.r === b.to.r &&
		a.to.c === b.to.c &&
		a.captured.length === b.captured.length
	);
}
