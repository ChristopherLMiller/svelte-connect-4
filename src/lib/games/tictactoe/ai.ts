import { applyMove, emptyCells, getStatus, opponent } from './engine';
import type { Board, Difficulty, Player } from './types';

export function chooseAiCell(board: Board, player: Player, difficulty: Difficulty): [number, number] {
	const open = emptyCells(board);
	if (open.length === 0) return [0, 0];

	const win = finishingCell(board, player);
	if (win) return win;

	const block = finishingCell(board, opponent(player));
	if (difficulty === 'easy') {
		if (block && Math.random() < 0.55) return block;
		return open[Math.floor(Math.random() * open.length)];
	}
	if (block) return block;

	const scored = open.map(([row, col]) => {
		const next = applyMove(board, row, col, player);
		return { row, col, score: minimax(next, opponent(player), player, false, 1) };
	});
	scored.sort((a, b) => b.score - a.score);

	const best = scored[0].score;
	const top = scored.filter((move) => move.score === best);

	if (difficulty === 'medium' && scored.length > 1 && scored[1].score !== best && Math.random() < 0.22) {
		return [scored[1].row, scored[1].col];
	}

	const pick = top[Math.floor(Math.random() * top.length)];
	return [pick.row, pick.col];
}

function finishingCell(board: Board, player: Player): [number, number] | null {
	for (const [row, col] of emptyCells(board)) {
		if (getStatus(applyMove(board, row, col, player)).type === 'won') return [row, col];
	}
	return null;
}

function minimax(board: Board, toMove: Player, ai: Player, maximizing: boolean, depth: number): number {
	const status = getStatus(board);
	if (status.type === 'won') return status.winner === ai ? 10 - depth : depth - 10;
	if (status.type === 'draw') return 0;

	const open = emptyCells(board);
	if (maximizing) {
		let best = Number.NEGATIVE_INFINITY;
		for (const [row, col] of open) {
			best = Math.max(best, minimax(applyMove(board, row, col, toMove), opponent(toMove), ai, false, depth + 1));
		}
		return best;
	}

	let worst = Number.POSITIVE_INFINITY;
	for (const [row, col] of open) {
		worst = Math.min(worst, minimax(applyMove(board, row, col, toMove), opponent(toMove), ai, true, depth + 1));
	}
	return worst;
}
