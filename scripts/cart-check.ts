import { chooseAiMove } from '../src/lib/games/cartographer/ai';
import { createGrid, play, statusOf, tally, topology, validGrid } from '../src/lib/games/cartographer/engine';
import type { Difficulty, Player } from '../src/lib/games/cartographer/types';

let failures = 0;
function check(name: string, ok: boolean, detail = '') {
	if (!ok) failures += 1;
	console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

{
	const topo = topology(2);
	check('topology 2x2 edges', topo.E === 12 && topo.H === 6 && topo.B === 4);
	let grid = createGrid(2);
	const box0 = [0, 2, 6, 7];
	let closed: number[] = [];
	for (const e of box0) {
		const r = play(grid, e, 1)!;
		grid = r.grid;
		closed = r.closed;
	}
	check('closing box 0', closed.length === 1 && closed[0] === 0 && grid.boxes[0] === 1);
	check('redraw rejected', play(grid, 0, 2) === null);
	check('valid grid', validGrid(2, grid.edges, grid.boxes));
	const shared = createGrid(2);
	let g2 = shared;
	for (const e of [0, 6, 2, 1, 3, 8]) g2 = play(g2, e, 1)!.grid;
	const double = play(g2, 7, 2)!;
	check('one line closes two boxes', double.closed.length === 2, `closed ${double.closed}`);
}

function match(n: number, a: Difficulty, b: Difficulty) {
	let grid = createGrid(n);
	let current: Player = 1;
	let slowest = 0;
	let moves = 0;
	while (statusOf(grid).type === 'playing') {
		const t0 = performance.now();
		const e = chooseAiMove(n, grid.edges, current === 1 ? a : b);
		slowest = Math.max(slowest, performance.now() - t0);
		const r = play(grid, e, current);
		if (!r) throw new Error(`illegal move ${e}`);
		grid = r.grid;
		moves += 1;
		if (!r.closed.length) current = current === 1 ? 2 : 1;
	}
	return { score: tally(grid), slowest, moves, edges: topology(n).E };
}

for (const n of [4, 6, 8]) {
	for (const [a, b] of [
		['hard', 'easy'],
		['hard', 'medium'],
		['medium', 'easy']
	] as Array<[Difficulty, Difficulty]>) {
		let wins = 0;
		let draws = 0;
		let slow = 0;
		const games = n === 8 ? 16 : 30;
		for (let g = 0; g < games; g += 1) {
			const first = g % 2 === 0;
			const r = match(n, first ? a : b, first ? b : a);
			if (r.moves !== r.edges) check(`game ${n}x${n} complete`, false);
			const mine = first ? r.score[1] : r.score[2];
			const theirs = first ? r.score[2] : r.score[1];
			if (mine > theirs) wins += 1;
			else if (mine === theirs) draws += 1;
			slow = Math.max(slow, r.slowest);
		}
		console.log(`${n}x${n} ${a} vs ${b}: ${wins}/${games} wins, ${draws} draws, slowest move ${slow.toFixed(1)} ms`);
		check(`${a} beats ${b} on ${n}x${n}`, wins > games * 0.6);
		check(`moves fast on ${n}x${n}`, slow < 900, `${slow.toFixed(0)} ms`);
	}
}

console.log(failures ? `${failures} failures` : 'all good');
