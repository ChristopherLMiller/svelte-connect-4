import { canMove, createBrew, nextRandom, slide, spawn } from '../src/lib/games/apothecary/engine';
import type { Dir } from '../src/lib/games/apothecary/types';

let failures = 0;
function expect(label: string, got: unknown, want: unknown) {
	const a = JSON.stringify(got);
	const b = JSON.stringify(want);
	if (a !== b) {
		failures += 1;
		console.log(`FAIL ${label}\n  got  ${a}\n  want ${b}`);
	} else console.log(`ok   ${label}`);
}

const row = (cells: number[], dir: Dir) => slide(cells, 4, dir);

expect('left merge pair', row([1, 1, 0, 0, ...Array(12).fill(0)], 'left').cells.slice(0, 4), [2, 0, 0, 0]);
expect('left no double merge', row([1, 1, 2, 0, ...Array(12).fill(0)], 'left').cells.slice(0, 4), [2, 2, 0, 0]);
expect('left four equal', row([1, 1, 1, 1, ...Array(12).fill(0)], 'left').cells.slice(0, 4), [2, 2, 0, 0]);
expect('right three equal', row([1, 1, 1, 0, ...Array(12).fill(0)], 'right').cells.slice(0, 4), [0, 0, 1, 2]);
expect('gap merge', row([2, 0, 0, 2, ...Array(12).fill(0)], 'left').cells.slice(0, 4), [3, 0, 0, 0]);
expect('gain', row([2, 2, 1, 1, ...Array(12).fill(0)], 'left').gain, 8 + 4);
expect('no move', row([1, 2, 3, 4, ...Array(12).fill(0)], 'left').moved, false);

const up = slide([1, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0], 4, 'up');
expect('up column', [up.cells[0], up.cells[4], up.cells[8], up.cells[12]], [2, 3, 0, 0]);
expect('up merges', up.merges, [
	{ cell: 0, tier: 2 },
	{ cell: 4, tier: 3 }
]);
expect(
	'motions all flagged',
	up.motions.map((m) => m.merged),
	[true, true, true, true]
);
const down = slide([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], 4, 'down');
expect('down merge', down.cells[12], 2);

expect('stuck', canMove([1, 2, 1, 2, 2, 1, 2, 1, 1, 2, 1, 2, 2, 1, 2, 1], 4), false);
expect('pair free', canMove([1, 1, 1, 2, 2, 1, 2, 1, 1, 2, 1, 2, 2, 1, 2, 1], 4), true);

const a = createBrew(4, 1234);
const b = createBrew(4, 1234);
expect('seeded start', a.brew.cells, b.brew.cells);
expect('two vials', a.brew.cells.filter(Boolean).length, 2);

let rng = 99;
let twos = 0;
for (let i = 0; i < 10000; i += 1) {
	const s = spawn(new Array(16).fill(0), rng);
	rng = s.rng;
	if (s.spawn?.tier === 1) twos += 1;
}
console.log('rainwater share', twos / 10000);
const [x] = nextRandom(0);
console.log('first random', x);

let moves = 0;
let brew = createBrew(4, 7).brew;
const dirs: Dir[] = ['left', 'down', 'right', 'up'];
const t0 = performance.now();
while (canMove(brew.cells, 4) && moves < 5000) {
	let done = false;
	for (const d of dirs) {
		const s = slide(brew.cells, 4, d);
		if (!s.moved) continue;
		const sp = spawn(s.cells, brew.rng);
		brew = { ...brew, cells: sp.cells, rng: sp.rng, score: brew.score + s.gain };
		done = true;
		break;
	}
	if (!done) break;
	moves += 1;
}
console.log('simple run', moves, 'moves, score', brew.score, 'top', Math.max(...brew.cells), `${(performance.now() - t0).toFixed(1)} ms`);

if (failures) {
	console.log(`${failures} failed`);
	process.exit(1);
}
console.log('all passed');
