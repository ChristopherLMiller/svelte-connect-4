import { chooseAiMove } from '../src/lib/games/zengarden/ai';
import { Field, createBoard, fiveAt, replay, statusAfter, type Board } from '../src/lib/games/zengarden/engine';
import type { Difficulty, Player } from '../src/lib/games/zengarden/types';

let failures = 0;
function check(name: string, ok: boolean, detail = '') {
	if (!ok) failures += 1;
	console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

const N = 15;
const at = (r: number, c: number) => r * N + c;

function board(stones: Array<[number, number, Player]>): Board {
	const b = createBoard(N);
	for (const [r, c, p] of stones) b[at(r, c)] = p;
	return b;
}

{
	const b = board([
		[7, 3, 1],
		[7, 4, 1],
		[7, 5, 1],
		[7, 6, 1],
		[7, 7, 1]
	]);
	const line = fiveAt(b, N, at(7, 5));
	check('five in a row found', line?.length === 5 && line[0] === at(7, 3), JSON.stringify(line));
	const st = statusAfter(b, N, at(7, 7));
	check('status reports the winner', st.type === 'won' && st.winner === 1);
	const diag = board([
		[2, 10, 2],
		[3, 9, 2],
		[4, 8, 2],
		[5, 7, 2],
		[6, 6, 2],
		[7, 5, 2]
	]);
	check('overline counts in freestyle', fiveAt(diag, N, at(4, 8))?.length === 6);
	check('four is not five', fiveAt(board([[0, 0, 1], [0, 1, 1], [0, 2, 1], [0, 3, 1]]), N, at(0, 0)) === null);
}

{
	check('replay rejects a repeated cell', replay(N, [at(7, 7), at(7, 7)]) === null);
	check('replay rejects moves after a win', replay(N, [0, 20, 1, 21, 2, 22, 3, 23, 4, 24]) === null);
	const r = replay(N, [at(7, 7), at(7, 8)]);
	check('replay alternates', r?.board[at(7, 7)] === 1 && r?.board[at(7, 8)] === 2 && r.next === 1);
}

{
	const b = board([
		[7, 4, 1],
		[7, 5, 1],
		[7, 6, 1],
		[8, 8, 2]
	]);
	const f = new Field(N, b);
	const makers = f.fourMakers(1).sort((a, b) => a - b);
	check('four makers around an open three', makers.includes(at(7, 3)) && makers.includes(at(7, 7)), makers.join());
	f.place(at(7, 7), 1);
	const wins = f.winPoints(1).sort((a, b) => a - b);
	check('open four has two win points', wins.length === 2 && wins[0] === at(7, 3) && wins[1] === at(7, 8), wins.join());
	f.remove(at(7, 7));
	check('remove restores tallies', f.fours[1] === 0 && f.winPoints(1).length === 0);
}

{
	const b = board([
		[7, 4, 2],
		[7, 5, 2],
		[7, 6, 2],
		[7, 7, 2],
		[3, 3, 1],
		[4, 4, 1],
		[5, 5, 1]
	]);
	for (const level of ['easy', 'medium', 'hard'] as Difficulty[]) {
		const m = chooseAiMove(b, N, 2, level);
		check(`${level} takes the win`, m === at(7, 3) || m === at(7, 8), String(m));
	}
	const block = board([
		[7, 4, 1],
		[7, 5, 1],
		[7, 6, 1],
		[7, 7, 1],
		[7, 3, 2],
		[2, 2, 2]
	]);
	for (const level of ['medium', 'hard'] as Difficulty[]) {
		check(`${level} blocks a four`, chooseAiMove(block, N, 2, level) === at(7, 8));
	}
	const three = board([
		[7, 5, 1],
		[7, 6, 1],
		[7, 7, 1],
		[8, 8, 2],
		[6, 9, 2]
	]);
	const reply = chooseAiMove(three, N, 2, 'hard');
	check('hard answers an open three at an end', [at(7, 4), at(7, 8), at(7, 3), at(7, 9)].includes(reply), String(reply));
}

{
	// Slate to move with a four-three: a VCF the hard AI must find.
	const b = board([
		[7, 5, 1],
		[7, 6, 1],
		[7, 7, 1],
		[7, 4, 2],
		[5, 8, 1],
		[6, 8, 1],
		[9, 1, 2],
		[10, 1, 2],
		[11, 1, 2]
	]);
	const m = chooseAiMove(b, N, 1, 'hard');
	const after = [...b];
	after[m] = 1;
	const f = new Field(N, after);
	check('hard plays into a forced win', f.winPoints(1).length >= 1, String(m));
}

let slowest = 0;

function play(first: Difficulty, second: Difficulty, size: number): Player | 0 {
	let b = createBoard(size);
	let p: Player = 1;
	for (let k = 0; k < size * size; k += 1) {
		const t0 = performance.now();
		const m = chooseAiMove(b, size, p, p === 1 ? first : second);
		slowest = Math.max(slowest, performance.now() - t0);
		if (m < 0 || b[m]) throw new Error(`illegal ${m}`);
		b = [...b];
		b[m] = p;
		const st = statusAfter(b, size, m);
		if (st.type === 'won') return st.winner;
		if (st.type === 'draw') return 0;
		p = p === 1 ? 2 : 1;
	}
	return 0;
}

function series(strong: Difficulty, weak: Difficulty, games: number, size = 15) {
	let wins = 0;
	for (let g = 0; g < games; g += 1) {
		const strongFirst = g % 2 === 0;
		const winner = strongFirst ? play(strong, weak, size) : play(weak, strong, size);
		if ((strongFirst && winner === 1) || (!strongFirst && winner === 2)) wins += 1;
	}
	return wins;
}

{
	const w1 = series('medium', 'easy', 10);
	check('medium beats easy', w1 >= 8, `${w1}/10`);
	const w2 = series('hard', 'medium', 6);
	check('hard beats medium', w2 >= 4, `${w2}/6`);
}

{
	slowest = 0;
	const winner = play('hard', 'hard', 19);
	check('hard answers inside a second on the grand garden', slowest < 1300, `slowest ${Math.round(slowest)} ms, winner ${winner}`);
}

console.log(failures ? `\n${failures} failing` : '\nall good');
process.exit(failures ? 1 : 0);
