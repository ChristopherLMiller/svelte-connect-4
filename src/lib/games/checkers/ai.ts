import { applyMove, countPieces, legalMoves, opponent, statusFor } from './engine';
import type { Board, Coord, Difficulty, Move, Player } from './types';

const DEPTH: Record<Difficulty, number> = { easy: 2, medium: 3, hard: 5 };

export function chooseAiMove(board: Board, player: Player, difficulty: Difficulty, onlyFrom?: Coord): Move | null {
	let moves = legalMoves(board, player);
	if (onlyFrom) {
		moves = moves.filter(
			(move) => move.from.r === onlyFrom.r && move.from.c === onlyFrom.c && move.captured.length
		);
	}
	if (!moves.length) return null;
	if (difficulty === 'easy') {
		const capture = moves.filter((move) => move.captured.length);
		const pool = capture.length && Math.random() < 0.7 ? capture : moves;
		return pool[Math.floor(Math.random() * pool.length)] ?? moves[0];
	}

	const ranked = moves.map((move) => ({
		move,
		score: minimax(applyMove(board, move), opponent(player), player, DEPTH[difficulty], Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, false)
	}));
	ranked.sort((a, b) => b.score - a.score);
	const best = ranked[0].score;
	const top = ranked.filter((row) => row.score === best);
	if (difficulty === 'medium' && ranked.length > 1 && ranked[1].score !== best && Math.random() < 0.18) {
		return ranked[1].move;
	}
	return top[Math.floor(Math.random() * top.length)]?.move ?? moves[0];
}

function evaluate(board: Board, ai: Player) {
	const you = countPieces(board, ai);
	const them = countPieces(board, opponent(ai));
	let score = (you.men - them.men) * 12 + (you.kings - them.kings) * 22;
	score += legalMoves(board, ai).length - legalMoves(board, opponent(ai)).length;
	for (let r = 0; r < 8; r += 1) {
		for (let c = 0; c < 8; c += 1) {
			const piece = board[r][c];
			if (!piece) continue;
			const center = 3.5 - Math.abs(r - 3.5) - Math.abs(c - 3.5);
			const sign = piece.player === ai ? 1 : -1;
			score += sign * center * (piece.king ? 0.6 : 0.35);
			if (!piece.king && piece.player === 1) score += sign * (7 - r) * 0.15;
			if (!piece.king && piece.player === 2) score += sign * r * 0.15;
		}
	}
	return score;
}

function minimax(
	board: Board,
	toMove: Player,
	ai: Player,
	depth: number,
	alpha: number,
	beta: number,
	maximizing: boolean
): number {
	const status = statusFor(board, toMove);
	if (status.type === 'won') return status.winner === ai ? 10_000 + depth : -10_000 - depth;
	if (depth <= 0) return evaluate(board, ai);
	const moves = legalMoves(board, toMove);
	if (!moves.length) return evaluate(board, ai);

	if (maximizing) {
		let best = Number.NEGATIVE_INFINITY;
		for (const move of order(moves)) {
			best = Math.max(best, minimax(applyMove(board, move), opponent(toMove), ai, depth - 1, alpha, beta, false));
			alpha = Math.max(alpha, best);
			if (beta <= alpha) break;
		}
		return best;
	}

	let worst = Number.POSITIVE_INFINITY;
	for (const move of order(moves)) {
		worst = Math.min(worst, minimax(applyMove(board, move), opponent(toMove), ai, depth - 1, alpha, beta, true));
		beta = Math.min(beta, worst);
		if (beta <= alpha) break;
	}
	return worst;
}

function order(moves: Move[]) {
	return moves.slice().sort((a, b) => b.captured.length - a.captured.length || Number(b.crown) - Number(a.crown));
}
