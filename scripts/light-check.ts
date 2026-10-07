import { chooseShot } from '../src/lib/games/lighthouse/ai';
import {
	HIT,
	MISS,
	SUNK,
	UNKNOWN,
	afloat,
	clampBow,
	createWaters,
	fire,
	fits,
	randomFleet,
	replay,
	shipCells,
	validFleet
} from '../src/lib/games/lighthouse/engine';
import { SEA_INFO, lengthsOf, type Difficulty } from '../src/lib/games/lighthouse/types';

function assert(ok: unknown, message: string) {
	if (!ok) {
		console.error('FAIL', message);
		process.exit(1);
	}
}

const lengths = lengthsOf('channel');

assert(shipCells(10, 3, { at: 7, vertical: false })?.join() === '7,8,9', 'cells right');
assert(shipCells(10, 3, { at: 8, vertical: false }) === null, 'off the edge');
assert(shipCells(10, 3, { at: 70, vertical: true })?.join() === '70,80,90', 'cells down');
assert(shipCells(10, 3, { at: 80, vertical: true }) === null, 'off the bottom');
assert(clampBow(10, 5, 9, false) === 5, 'clamp right');
assert(clampBow(10, 5, 95, true) === 55, 'clamp down');
assert(!fits(10, [3, 3], [{ at: 0, vertical: false }, null], 1, { at: 2, vertical: true }), 'overlap rejected');
assert(fits(10, [3, 3], [{ at: 0, vertical: false }, null], 1, { at: 10, vertical: false }), 'touching allowed');

for (let k = 0; k < 500; k += 1) {
	for (const sea of ['cove', 'channel', 'ocean'] as const) {
		const size = SEA_INFO[sea].size;
		const fleet = randomFleet(size, lengthsOf(sea), k % 2 === 0);
		assert(validFleet(size, lengthsOf(sea), fleet), `random fleet valid ${sea}`);
	}
}
assert(!validFleet(10, lengths, [{ at: 0, vertical: false }]), 'short fleet invalid');

const fleet = [
	{ at: 0, vertical: false },
	{ at: 20, vertical: false },
	{ at: 40, vertical: false },
	{ at: 60, vertical: false },
	{ at: 80, vertical: false }
];
const w = createWaters(10, lengths, fleet);
assert(fire(w, 9)?.kind === 'miss', 'miss');
assert(fire(w, 9) === null, 'repeat rejected');
assert(fire(w, 80)?.kind === 'hit', 'hit');
const sunk = fire(w, 81);
assert(sunk?.kind === 'sunk' && sunk.ship === 4 && sunk.cells.join() === '80,81', 'cutter sunk');
assert(w.shots[80] === SUNK && w.shots[81] === SUNK && w.shots[9] === MISS, 'chart marks');
assert(afloat(w) === 4, 'four afloat');

const fleets = { 1: fleet, 2: fleet };
const shots: Array<[1 | 2, number]> = [
	[1, 0],
	[2, 5],
	[1, 1]
];
assert(replay(10, lengths, fleets, shots, 1, false)?.next === 2, 'alternating replay');
assert(replay(10, lengths, fleets, shots, 1, true) === null, 'chain: a hit keeps the gun');
assert(replay(10, lengths, fleets, [[1, 0], [1, 1], [1, 9], [2, 0]], 1, true)?.next === 2, 'chain replay');
assert(replay(10, lengths, fleets, [[2, 0]], 1, false) === null, 'out of turn');

const all: Array<[1 | 2, number]> = [];
for (const [k, p] of fleet.entries()) for (let j = 0; j < lengths[k]; j += 1) all.push([1, p.at + j]);
const done = replay(10, lengths, fleets, all, 1, true);
assert(done?.status.type === 'won', 'sinking all wins');

function game(difficulty: Difficulty, seaSize = 10, seaLengths = lengths) {
	const target = createWaters(seaSize, seaLengths, randomFleet(seaSize, seaLengths));
	let n = 0;
	let slowest = 0;
	for (;;) {
		const t0 = performance.now();
		const afloatLengths = seaLengths.filter((_, k) => !target.sunk[k]);
		const i = chooseShot({ size: seaSize, shots: target.shots, afloat: afloatLengths, difficulty });
		slowest = Math.max(slowest, performance.now() - t0);
		assert(target.shots[i] === UNKNOWN, 'AI fires at open water');
		const r = fire(target, i);
		n += 1;
		if (r?.won) return { n, slowest };
		assert(n < seaSize * seaSize, 'AI finishes');
	}
}

const avg: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
let slow = 0;
const runs = 300;
for (const d of ['easy', 'medium', 'hard'] as const) {
	let total = 0;
	for (let k = 0; k < runs; k += 1) {
		const g = game(d);
		total += g.n;
		slow = Math.max(slow, g.slowest);
	}
	avg[d] = total / runs;
}
console.log('average shots to sink the channel fleet', avg, 'slowest move ms', slow.toFixed(1));
assert(avg.hard < avg.medium && avg.medium < avg.easy, 'difficulty ladder');
assert(avg.hard < 52, 'hard is sharp');

const ocean = lengthsOf('ocean');
let oceanSlow = 0;
for (let k = 0; k < 40; k += 1) oceanSlow = Math.max(oceanSlow, game('hard', 12, ocean).slowest);
assert(oceanSlow < 50, 'hard is quick on the open sea');

const chart = new Array(100).fill(UNKNOWN);
chart[44] = HIT;
chart[45] = HIT;
const follow = chooseShot({ size: 10, shots: chart, afloat: lengths, difficulty: 'hard' });
assert(follow === 43 || follow === 46, 'hard follows the line of hits');

console.log('all good');
