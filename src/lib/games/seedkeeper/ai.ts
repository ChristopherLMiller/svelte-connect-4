import { legalMoves, sow, type Board } from './engine';
import { STORE, opponent, type Difficulty, type Player } from './types';

const WIN = 10000;

function score(board: Board, me: Player) {
	const them = opponent(me);
	let side = 0;
	for (let k = 0; k < 6; k += 1) side += board[me === 1 ? k : k + 7] - board[me === 1 ? k + 7 : k];
	return (board[STORE[me]] - board[STORE[them]]) * 4 + side;
}

/** Moves that sow again or capture first, so alpha-beta cuts sooner. */
function ordered(board: Board, player: Player) {
	const moves = legalMoves(board, player);
	const keyed = moves.map((pit) => {
		const r = sow(board, pit, player)!;
		const key = (r.extra ? 100 : 0) + (r.capture ? r.capture.taken * 4 : 0) + pit * 0.01;
		return { pit, r, key };
	});
	keyed.sort((a, b) => b.key - a.key);
	return keyed;
}

type Clock = { deadline: number; nodes: number; out: boolean };

function search(board: Board, mover: Player, me: Player, depth: number, alpha: number, beta: number, clock: Clock): number {
	clock.nodes += 1;
	if ((clock.nodes & 1023) === 0 && performance.now() > clock.deadline) clock.out = true;
	if (clock.out) return 0;
	const moves = ordered(board, mover);
	if (!moves.length || depth <= 0) return score(board, me);
	const maxing = mover === me;
	let best = maxing ? -Infinity : Infinity;
	for (const { r } of moves) {
		let value: number;
		if (r.finished) {
			const mine = r.board[STORE[me]];
			const theirs = r.board[STORE[opponent(me)]];
			value = mine === theirs ? 0 : (mine > theirs ? WIN : -WIN) + (mine - theirs);
		} else {
			// Sowing again is a free move: the same side searches on without losing a ply.
			const next = r.extra ? mover : opponent(mover);
			value = search(r.board, next, me, depth - (r.extra ? 0.5 : 1), alpha, beta, clock);
		}
		if (maxing) {
			if (value > best) best = value;
			if (best > alpha) alpha = best;
		} else {
			if (value < best) best = value;
			if (best < beta) beta = best;
		}
		if (alpha >= beta) break;
	}
	return best;
}

function rank(board: Board, me: Player, depth: number, clock: Clock) {
	return ordered(board, me).map(({ pit, r }) => {
		if (r.finished) {
			const diff = r.board[STORE[me]] - r.board[STORE[opponent(me)]];
			return { pit, value: diff === 0 ? 0 : (diff > 0 ? WIN : -WIN) + diff };
		}
		const next = r.extra ? me : opponent(me);
		return { pit, value: search(r.board, next, me, depth - 1, -Infinity, Infinity, clock) };
	});
}

/**
 * Old Heron. Fledgling looks one sowing ahead and often just grabs; Wader reads a few turns
 * and sometimes settles for second best; Elder deepens until its time runs out.
 */
export function chooseAiMove(board: Board, player: Player, difficulty: Difficulty): number {
	const moves = legalMoves(board, player);
	if (!moves.length) return -1;
	if (moves.length === 1) return moves[0];

	if (difficulty === 'easy') {
		if (Math.random() < 0.4) return moves[Math.floor(Math.random() * moves.length)];
		const clock = { deadline: Infinity, nodes: 0, out: false };
		const ranked = rank(board, player, 1, clock).sort((a, b) => b.value - a.value);
		return ranked[0].pit;
	}

	if (difficulty === 'medium') {
		const clock = { deadline: Infinity, nodes: 0, out: false };
		const ranked = rank(board, player, 4, clock).sort((a, b) => b.value - a.value);
		if (ranked.length > 1 && Math.random() < 0.2 && ranked[1].value > ranked[0].value - 8) return ranked[1].pit;
		return ranked[0].pit;
	}

	const deadline = performance.now() + 650;
	let best = moves[0];
	for (let depth = 2; depth <= 24; depth += 1) {
		const clock = { deadline, nodes: 0, out: false };
		const ranked = rank(board, player, depth, clock);
		if (clock.out) break;
		ranked.sort((a, b) => b.value - a.value);
		best = ranked[0].pit;
		if (Math.abs(ranked[0].value) >= WIN) break;
	}
	return best;
}
