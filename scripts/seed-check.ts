import { chooseAiMove } from '../src/lib/games/seedkeeper/ai';
import { createBoard, legalMoves, sow, sowPath, statusOf, totalSeeds, validBoard, type Board } from '../src/lib/games/seedkeeper/engine';
import type { Difficulty, Player } from '../src/lib/games/seedkeeper/types';

let failures = 0;
function check(name: string, ok: boolean, detail = '') {
	if (!ok) failures += 1;
	console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

{
	const board = createBoard(4);
	check('fresh board', totalSeeds(board) === 48 && board[6] === 0 && board[13] === 0);
	const r = sow(board, 2, 1)!;
	check('pit 2 with 4 lands in store and sows again', r.extra && r.path.join() === '3,4,5,6', r.path.join());
	check('rival pits rejected', sow(board, 8, 1) === null && sow(board, 6, 1) === null);
	const r2 = sow(r.board, 5, 1)!;
	check('sowing passes own store into rival row', r2.path.join() === '6,7,8,9,10' && !r2.extra, r2.path.join());
}

{
	const board: Board = [0, 0, 0, 0, 0, 13, 0, 1, 1, 1, 1, 1, 1, 0];
	const path = sowPath(board, 5, 1);
	check('long lap skips the rival store', !path.includes(13) && path.length === 13, path.join());
	const heron: Board = [1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 13, 0];
	check('Heron skips Firefly store', !sowPath(heron, 12, 2).includes(6));
}

{
	const board: Board = [1, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 5, 2, 0];
	const r = sow(board, 0, 1)!;
	check('empty own pit captures opposite', r.capture?.pit === 1 && r.capture.opposite === 11 && r.capture.taken === 6, JSON.stringify(r.capture));
	check('captured seeds in store', r.board[6] === 6 && r.board[1] === 0 && r.board[11] === 0);
}

{
	const board: Board = [1, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 0, 2, 0];
	const r = sow(board, 0, 1)!;
	check('no capture when the opposite pit is empty', r.capture === null && r.board[1] === 1);
	check('Firefly row empty sweeps Heron leftovers home', !r.finished || r.sweep.length > 0);
}

{
	const board: Board = [0, 0, 0, 0, 0, 1, 10, 3, 0, 0, 0, 0, 0, 9];
	const r = sow(board, 5, 1)!;
	check('last move ends the game', r.finished && !r.extra);
	check('sweep moves rival leftovers to rival store', r.board[13] === 12 && r.sweep.length === 1, JSON.stringify(r.sweep));
	check('status after sweep', statusOf(r.board).type === 'won');
	check('valid board accepted', validBoard(r.board, 2) === false && validBoard(createBoard(3), 3));
}

{
	const board: Board = [0, 0, 0, 0, 1, 0, 20, 0, 0, 0, 0, 0, 3, 20];
	const pick = chooseAiMove(board, 1, 'hard');
	check('Elder takes the capture or the store', pick === 4, `picked ${pick}`);
}

for (const [a, b] of [
	['hard', 'easy'],
	['hard', 'medium'],
	['medium', 'easy']
] as [Difficulty, Difficulty][]) {
	let wins = 0;
	const games = 10;
	for (let g = 0; g < games; g += 1) {
		let board = createBoard(4);
		const strong: Player = g % 2 ? 1 : 2;
		let mover: Player = 1;
		for (let guard = 0; guard < 400; guard += 1) {
			if (!legalMoves(board, mover).length) break;
			const pit = chooseAiMove(board, mover, mover === strong ? a : b);
			const r = sow(board, pit, mover)!;
			board = r.board;
			if (r.finished) break;
			if (!r.extra) mover = mover === 1 ? 2 : 1;
		}
		const s = statusOf(board);
		if (s.type === 'won' && s.winner === strong) wins += 1;
		if (totalSeeds(board) !== 48) check('seeds conserved', false);
	}
	check(`${a} beats ${b}`, wins >= games * 0.6, `${wins}/${games}`);
}

{
	const started = performance.now();
	chooseAiMove(createBoard(6), 1, 'hard');
	const ms = performance.now() - started;
	check('Elder answers inside a second on a harvest board', ms < 1000, `${ms.toFixed(0)} ms`);
}

console.log(failures ? `\n${failures} failing` : '\nall good');
process.exit(failures ? 1 : 0);
