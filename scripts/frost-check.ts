import { chord, createDaily, createField, plant, reveal, serialise, solves, toggleFlag } from '../src/lib/games/frost/engine';
import { DAILY, LEVEL_INFO, LEVELS, OPEN } from '../src/lib/games/frost/types';

function assert(ok: unknown, message: string) {
	if (!ok) throw new Error(message);
}

for (const level of LEVELS) {
	const spec = LEVEL_INFO[level];
	let proved = 0;
	let worst = 0;
	let sum = 0;
	const runs = level === 'black' ? 20 : 60;
	for (let n = 0; n < runs; n += 1) {
		const field = createField(spec);
		const first = Math.floor(Math.random() * field.total);
		const t0 = performance.now();
		plant(field, first, (Math.random() * 2 ** 32) >>> 0, true, 4000);
		const dt = performance.now() - t0;
		worst = Math.max(worst, dt);
		sum += dt;
		if (field.guessFree) proved += 1;
		assert(!field.mine[first], 'first step must be safe');
		const step = reveal(field, first);
		assert(step?.kind === 'open', 'first step opens');
		assert(field.mine.reduce((a, b) => a + b, 0) === spec.mines, 'mine count');
	}
	console.log(`${level}: guess-free ${proved}/${runs}, avg ${(sum / runs).toFixed(0)} ms, worst ${worst.toFixed(0)} ms`);
}

{
	let solvedRaw = 0;
	const spec = LEVEL_INFO.black;
	const t0 = performance.now();
	for (let n = 0; n < 300; n += 1) {
		const field = createField(spec);
		plant(field, 200, n + 1, false);
		if (solves(field.mine, spec.w, spec.h, spec.mines, 200)) solvedRaw += 1;
	}
	console.log(`black raw solvable ${solvedRaw}/300, ${((performance.now() - t0) / 300).toFixed(2)} ms per solve`);
}

{
	const t0 = performance.now();
	const a = createDaily(DAILY, '2026-10-06');
	const b = createDaily(DAILY, '2026-10-06');
	const c = createDaily(DAILY, '2026-10-07');
	console.log(`daily in ${((performance.now() - t0) / 3).toFixed(0)} ms, guess-free ${a.guessFree}, opened ${a.opened}`);
	assert(serialise(a).state === serialise(b).state && serialise(a).mines.join() === serialise(b).mines.join(), 'daily is deterministic');
	assert(serialise(a).mines.join() !== serialise(c).mines.join(), 'daily changes by date');
	assert(a.state[a.start] === OPEN && a.count[a.start] === 0, 'daily starts from an open hole');
}

{
	const field = createField({ w: 5, h: 5, mines: 3 });
	plant(field, 12, 7, false);
	reveal(field, 12);
	const mines = [...field.mine.keys()].filter((i) => field.mine[i]);
	for (const m of mines) toggleFlag(field, m);
	for (let i = 0; i < field.total; i += 1) if (field.state[i] === OPEN && field.count[i]) chord(field, i);
	for (let i = 0; i < field.total; i += 1) if (!field.mine[i]) reveal(field, i);
	assert(field.over === 'won', 'clearing every safe cell wins');

	const lose = createField({ w: 9, h: 9, mines: 20 });
	plant(lose, 40, 7, false);
	reveal(lose, 40);
	const thin = [...lose.mine.keys()].find((i) => lose.mine[i])!;
	const step = reveal(lose, thin);
	assert(step?.kind === 'boom' && lose.over === 'lost', 'stepping on thin ice loses');
}

console.log('ok');
