import { applyMove, hasMove, legalMoves, setupBoard } from '../src/lib/games/reversi/engine';
import { opponent, type Board, type Player } from '../src/lib/games/reversi/types';

function perft(board: Board, player: Player, depth: number, passed = false): number {
	if (depth === 0) return 1;
	const moves = legalMoves(board, player);
	if (!moves.length) {
		if (passed || !hasMove(board, opponent(player))) return 1;
		return perft(board, opponent(player), depth - 1, true);
	}
	let total = 0;
	for (const move of moves) total += perft(applyMove(board, move, player)!.board, opponent(player), depth - 1);
	return total;
}

const expected = [4, 12, 56, 244, 1396, 8200, 55092, 390216];
let ok = true;
expected.forEach((want, i) => {
	const got = perft(setupBoard(), 1, i + 1);
	if (got !== want) ok = false;
	console.log(`depth ${i + 1}: ${got} ${got === want ? 'ok' : `expected ${want}`}`);
});
process.exit(ok ? 0 : 1);
