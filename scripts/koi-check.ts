/**
 * Koi Pond engine checks: bots play both modes and every state is checked as they go.
 *   npx tsx scripts/koi-check.ts [games]
 */
import { createMatch, findMove, finishStage, nextStage, SIZE, trySwap, type Match } from '../src/lib/games/koi/match';
import { at, centre, COLS, createShooter, fire, MAX_ANGLE, neighbours, planShot, present, rowLength, ROWS, startStage, type Shooter } from '../src/lib/games/koi/shooter';

const games = Number(process.argv[2] ?? 30);
let failures = 0;
const fail = (msg: string) => {
	failures += 1;
	if (failures < 20) console.log('FAIL', msg);
};

function anchoredAll(g: Shooter) {
	const seen = new Set<number>();
	const stack: Array<[number, number]> = [];
	for (let c = 0; c < rowLength(0); c += 1) if (at(g, 0, c)) stack.push([0, c]);
	while (stack.length) {
		const [r, c] = stack.pop()!;
		const id = r * COLS + c;
		if (seen.has(id)) continue;
		seen.add(id);
		for (const [rr, cc] of neighbours(r, c)) if (at(g, rr, cc)) stack.push([rr, cc]);
	}
	for (let r = 0; r < ROWS; r += 1) for (let c = 0; c < rowLength(r); c += 1) if (at(g, r, c) && !seen.has(r * COLS + c)) return false;
	return true;
}

function bestAngle(g: Shooter) {
	let best = 0;
	let bestScore = -Infinity;
	for (let i = 0; i <= 64; i += 1) {
		const a = -MAX_ANGLE + (2 * MAX_ANGLE * i) / 64;
		const plan = planShot(g, a);
		if (!plan.cell) continue;
		const [r, c] = plan.cell;
		let same = 0;
		for (const [rr, cc] of neighbours(r, c)) if (at(g, rr, cc) === g.current) same += 1;
		const score = same * 10 - centre(g, r, c).y;
		if (score > bestScore) {
			bestScore = score;
			best = a;
		}
	}
	return best;
}

let stagesCleared = 0;
let shotTotal = 0;
let slowestPlan = 0;
for (let n = 0; n < games; n += 1) {
	const g = createShooter(1000 + n);
	let shots = 0;
	while (!g.over && shots < 600) {
		const t0 = performance.now();
		const angle = bestAngle(g) + (Math.random() - 0.5) * 0.09;
		slowestPlan = Math.max(slowestPlan, (performance.now() - t0) / 65);
		const result = fire(g, angle);
		shots += 1;
		if (!anchoredAll(g)) fail(`shooter ${n}: blooms left adrift after shot ${shots}`);
		if (result.popped.length && result.popped.length < 3) fail(`shooter ${n}: popped fewer than three`);
		if (!g.over && !g.cleared && !present(g).includes(g.current)) fail(`shooter ${n}: current colour not on the board`);
		if (g.cleared) {
			stagesCleared += 1;
			startStage(g, g.stage + 1);
		}
	}
	shotTotal += shots;
	if (!g.over) fail(`shooter ${n}: still going after 600 shots`);
}
console.log(`ripples: ${games} games, ${stagesCleared} stages cleared, ${(shotTotal / games).toFixed(0)} shots a game, plan ${slowestPlan.toFixed(2)} ms`);

function checkBoard(g: Match, label: string) {
	const ids = new Set<number>();
	for (const p of g.grid) {
		if (!p) return fail(`${label}: hole in the board`);
		if (ids.has(p.id)) return fail(`${label}: duplicate id`);
		ids.add(p.id);
		if (p.s === 4 ? p.k !== 0 : p.k < 1 || p.k > 6) fail(`${label}: bad piece ${JSON.stringify(p)}`);
	}
}

let stages = 0;
let swaps = 0;
let slowest = 0;
let specials = 0;
let longest = 0;
for (let n = 0; n < games; n += 1) {
	const g = createMatch(2000 + n);
	checkBoard(g, `match ${n} start`);
	let guard = 0;
	while (!g.over && guard < 2000) {
		guard += 1;
		const move = findMove(g);
		if (!move) {
			fail(`match ${n}: no move on a live board`);
			break;
		}
		const t0 = performance.now();
		const result = trySwap(g, move[0], move[1]);
		slowest = Math.max(slowest, performance.now() - t0);
		if (!result.ok) {
			fail(`match ${n}: hinted move refused`);
			break;
		}
		swaps += 1;
		longest = Math.max(longest, result.steps.length);
		for (const step of result.steps) if (step.grid.length !== SIZE * SIZE || step.grid.some((p) => !p)) fail(`match ${n}: step left holes`);
		checkBoard(g, `match ${n} swap ${swaps}`);
		if (g.cleared) {
			stages += 1;
			finishStage(g);
			nextStage(g);
		}
	}
	specials += g.specials;
}
console.log(`currents: ${games} games, ${(stages / games).toFixed(1)} stages a game, ${swaps} swaps, ${specials} specials made, longest cascade ${longest}, slowest swap ${slowest.toFixed(2)} ms`);
console.log(failures ? `${failures} failures` : 'all good');
process.exit(failures ? 1 : 0);
