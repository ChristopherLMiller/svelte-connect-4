/**
 * Silverball table checks, for every table:
 *  - a bot plays whole games: balls never escape or sink into walls, nothing gets stuck, features get reached;
 *  - cradle: a ball caught on a raised flipper rolls away once the flipper drops;
 *  - pockets: balls dropped all over the playfield never come to rest anywhere but a flipper or hole;
 *  - rules: random shots fed straight to the rules reach modes, multiball and the wizard mode.
 *   npx tsx scripts/pinball-check.ts [games] [difficulty] [table]
 */
import { advance, createGame, flip, inject, pull, type AnyGame, type GameEvent, type TableRules } from '../src/lib/games/pinball/engine/game';
import { addBall, flipperTip, laneBall, stepWorld, type Ball } from '../src/lib/games/pinball/engine/physics';
import { BALL_R } from '../src/lib/games/pinball/engine/def';
import type { Difficulty, TableId } from '../src/lib/games/pinball/types';
import { carnivalRules } from '../src/lib/games/pinball/tables/carnival/rules';
import { woodrailRules } from '../src/lib/games/pinball/tables/woodrail/rules';
import { spaceRules } from '../src/lib/games/pinball/tables/space/rules';
import { pirateRules } from '../src/lib/games/pinball/tables/pirate/rules';
import { deepseaRules } from '../src/lib/games/pinball/tables/deepsea/rules';
import { dragonRules } from '../src/lib/games/pinball/tables/dragon/rules';
import { westernRules } from '../src/lib/games/pinball/tables/western/rules';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ALL: Partial<Record<TableId, TableRules<any>>> = {
	carnival: carnivalRules,
	woodrail: woodrailRules,
	space: spaceRules,
	pirate: pirateRules,
	deepsea: deepseaRules,
	dragon: dragonRules,
	western: westernRules
};

/** Cues each table's rules must be able to reach. */
const EXPECT: Record<TableId, string[]> = {
	carnival: ['modeStart', 'multiball', 'jackpot', 'superJackpot', 'wizard', 'extraBall', 'wheelSpin', 'wheelPrize', 'ghostTrain'],
	woodrail: ['lit', 'extraBall', 'special', 'mult'],
	space: ['modeStart', 'multiball', 'jackpot', 'wizard', 'extraBall'],
	pirate: ['modeStart', 'multiball', 'jackpot', 'superJackpot', 'wizard', 'extraBall'],
	deepsea: ['modeStart', 'multiball', 'jackpot', 'wizard', 'extraBall'],
	dragon: ['modeStart', 'multiball', 'jackpot', 'wizard'],
	western: ['modeStart', 'multiball', 'jackpot', 'wizard', 'extraBall']
};

const games = Number(process.argv[2] ?? 12);
const difficulty = (process.argv[3] ?? 'fair') as Difficulty;
const only = process.argv[4] as TableId | undefined;
const FRAME = 1 / 60;
let failures = 0;

function deepest(g: AnyGame) {
	let worst = 0;
	for (const b of g.world.balls) {
		if (b.state !== 'free') continue;
		for (const s of g.world.def.walls) {
			if (s.nx != null || s.layer !== b.layer || (s.toggle && !g.world.toggles[s.toggle])) continue;
			const dx = s.bx - s.ax;
			const dy = s.by - s.ay;
			let t = ((b.x - s.ax) * dx + (b.y - s.ay) * dy) / (dx * dx + dy * dy || 1);
			t = Math.max(0, Math.min(1, t));
			const d = Math.hypot(b.x - (s.ax + dx * t), b.y - (s.ay + dy * t));
			worst = Math.max(worst, s.t + BALL_R - d);
		}
		for (const p of g.world.def.posts) if (p.layer === b.layer) worst = Math.max(worst, p.r + BALL_R - Math.hypot(b.x - p.x, b.y - p.y));
	}
	return worst;
}

/** Flip when a ball is coming down onto a flipper, with a human-ish reaction. */
function bot(g: AnyGame, held: Record<string, number>) {
	for (const f of g.world.flippers) {
		const tip = flipperTip(f);
		const near = g.world.balls.some((b) => {
			if (b.state !== 'free' || b.layer !== f.layer || b.vy < -2) return false;
			const lo = Math.min(f.px, tip.x) - 0.6;
			const hi = Math.max(f.px, tip.x) + 0.6;
			return b.x > lo && b.x < hi && b.y > f.py - 2.6 && b.y < f.py + 1.4;
		});
		const key = f.side;
		const share = FRAME / g.world.flippers.filter((x) => x.side === key).length;
		if ((held[key] ?? 0) > 0) {
			held[key]! -= share;
			if (held[key]! <= 0) {
				flip(g, f.side, false);
				held[`${key}Rest`] = 0.3;
			}
		} else if ((held[`${key}Rest`] ?? 0) > 0) held[`${key}Rest`]! -= share;
		else if (near && Math.random() < 0.55) {
			flip(g, f.side, true);
			held[key] = 0.12 + Math.random() * 0.2;
		}
	}
}

function playGames(id: TableId, rules: TableRules<unknown>) {
	const seen = new Map<string, number>();
	const count = (key: string) => seen.set(key, (seen.get(key) ?? 0) + 1);
	let fails = 0;
	const fail = (msg: string) => {
		fails += 1;
		if (fails < 12) console.log(`  FAIL ${msg}`);
	};
	let frames = 0;
	let worstFrame = 0;
	let totalScore = 0;
	let totalTime = 0;
	let deepWorst = 0;
	let long = 0;
	const started = performance.now();
	for (let n = 0; n < games; n += 1) {
		const g = createGame(rules, difficulty, 1000 + n);
		const held: Record<string, number> = {};
		let pulling = 0;
		let simTime = 0;
		let still = 0;
		while (g.phase !== 'over' && simTime < 60 * 25) {
			if (laneBall(g.world) && !g.pulling && pulling <= 0 && (g.phase === 'serve' || Math.random() < 0.05)) {
				pull(g, true, []);
				pulling = 0.2 + Math.random() * 0.8;
			}
			if (g.pulling) {
				pulling -= FRAME;
				if (pulling <= 0) pull(g, false, []);
			}
			bot(g, held);
			const t0 = performance.now();
			const events: GameEvent[] = advance(g, FRAME);
			worstFrame = Math.max(worstFrame, performance.now() - t0);
			frames += 1;
			simTime += FRAME;
			for (const e of events) {
				if (e.type === 'enter' || e.type === 'standup') count(e.id);
				else if (e.type === 'hole' || e.type === 'ramp' || e.type === 'rampEnter' || e.type === 'mover' || e.type === 'captive' || e.type === 'spin' || e.type === 'rideEnd') count(`${e.type}:${e.id}`);
				else if (e.type === 'cue') count(`cue:${e.cue}`);
				else if (e.type === 'drop') count(`drop:${e.bank}`);
				else if (e.type === 'bumper' || e.type === 'sling' || e.type === 'drain' || e.type === 'eject') count(e.type);
				if (e.type === 'drain' && (e.ball.x < 2.4 || e.ball.x > 16.2)) count('side drain');
				if (e.type === 'lost') fail(`game ${n}: ball escaped at ${e.ball.x.toFixed(2)},${e.ball.y.toFixed(2)} layer ${e.ball.layer}`);
			}
			const lane = laneBall(g.world);
			const free = g.world.balls.filter((b) => b.state === 'free' && b !== lane);
			still = free.length && free.every((b) => Math.hypot(b.vx, b.vy) < 0.3) && !g.world.flippers.some((f) => f.pressed) ? still + FRAME : 0;
			if (still > 5) {
				fail(`game ${n}: ball stuck at ${free.map((b) => `${b.x.toFixed(2)},${b.y.toFixed(2)} L${b.layer}`).join('; ')}`);
				still = 0;
			}
			const deep = deepest(g);
			deepWorst = Math.max(deepWorst, deep);
			if (deep > 0.3) fail(`game ${n}: ball ${deep.toFixed(2)} deep in a wall near ${g.world.balls.filter((b) => b.state === 'free').map((b) => `${b.x.toFixed(2)},${b.y.toFixed(2)} L${b.layer} v${Math.hypot(b.vx, b.vy).toFixed(0)}`).join('; ')}`);
			if (!Number.isFinite(g.score)) fail(`game ${n}: score ${g.score}`);
		}
		if (g.phase !== 'over') long += 1;
		totalScore += g.score;
		totalTime += simTime;
	}
	const def = rules.def;
	const need = [
		'bumper',
		'sling',
		'drain',
		...def.sensors.map((s) => s.id),
		...def.holes.map((h) => `hole:${h.id}`),
		...def.ramps.map((r) => `ramp:${r.id}`),
		...def.movers.map((m) => `mover:${m.id}`),
		...def.captives.map((c) => `captive:${c.id}`),
		...def.spinners.map((s) => `spin:${s.id}`),
		...def.banks.map((b) => `drop:${b.id}`),
		...def.standups.map((s) => s.id)
	];
	const missing = need.filter((k) => !seen.get(k) && !(k === 'bumper' && !def.bumpers.length));
	const per = (k: string) => ((seen.get(k) ?? 0) / games).toFixed(1);
	console.log(
		`  play: ${games} ${difficulty} games, average ${Math.round(totalScore / games).toLocaleString()}, ${(totalTime / games / 60).toFixed(1)} min a game; ${long} still going at 25 min`
	);
	const drains = seen.get('drain') ?? 0;
	console.log(`  drains: ${(drains / games).toFixed(1)} a game, ${Math.round(((seen.get('side drain') ?? 0) / Math.max(1, drains)) * 100)}% down the outlanes`);
	console.log(`  per game: ${[...seen.keys()].sort().map((k) => `${k} ${per(k)}`).join(', ')}`);
	console.log(`  deepest contact ${deepWorst.toFixed(3)}, slowest frame ${worstFrame.toFixed(2)} ms, ${((performance.now() - started) / frames).toFixed(3)} ms a frame`);
	if (missing.length) {
		const weak = missing.filter((k) => k.startsWith('ramp:') || k.startsWith('hole:') || k.startsWith('spin:') || k.startsWith('lane'));
		console.log(`  ${weak.length === missing.length ? 'note' : 'FAIL'}: never reached ${missing.join(', ')}`);
		if (weak.length !== missing.length) fails += 1;
	}
	return fails;
}

/** Hold a flipper up, drop a ball onto it, let it settle, then let go: the ball must roll away. */
function cradle(rules: TableRules<unknown>) {
	let fails = 0;
	for (const side of ['left', 'right'] as const) {
		for (let k = 0; k < 6; k += 1) {
			const g = createGame(rules, 'fair', 50 + k);
			g.world.balls = [];
			g.phase = 'play';
			const f = g.world.flippers.find((x) => x.side === side && x.layer === 0)!;
			flip(g, side, true);
			for (let i = 0; i < 400; i += 1) stepWorld(g.world, () => {});
			const tip = flipperTip(f);
			const at = 0.15 + k * 0.14;
			const b = addBall(g.world, f.px + (tip.x - f.px) * at, f.py - 2.5);
			const steps = (s: number) => {
				for (let i = 0; i < s * 720; i += 1) stepWorld(g.world, () => {});
			};
			steps(2.5);
			flip(g, side, false);
			steps(2.5);
			const moving = Math.hypot(b.vx, b.vy) > 0.5;
			if (b.state === 'free' && !moving && b.y < f.py + 1) {
				fails += 1;
				console.log(`  FAIL cradle ${side} ${at.toFixed(2)}: ball rests at ${b.x.toFixed(2)},${b.y.toFixed(2)}`);
			}
		}
	}
	return fails;
}

/** Balls dropped across the playfield must never settle anywhere but a hole, a ramp or the drain. */
function pockets(rules: TableRules<unknown>) {
	let fails = 0;
	const spots = new Set<string>();
	for (let y = 2; y < 31; y += 1.1) {
		for (let x = 1; x < 18; x += 1.1) {
			const g = createGame(rules, 'fair', 9);
			g.world.balls = [];
			const b: Ball = addBall(g.world, x, y, (Math.random() - 0.5) * 4, 0);
			if (deepest(g) > 0) continue;
			let still = 0;
			for (let i = 0; i < 720 * 8 && b.state === 'free'; i += 1) {
				rules.move?.(g, 1 / 720);
				stepWorld(g.world, () => {});
				still = Math.hypot(b.vx, b.vy) < 0.2 ? still + 1 : 0;
				if (still > 720 * 2) break;
			}
			if (b.state === 'free' && still > 720 * 2 && b.y < 30) {
				const key = `${b.x.toFixed(1)},${b.y.toFixed(1)}`;
				if (!spots.has(key)) {
					spots.add(key);
					fails += 1;
					if (fails < 8) console.log(`  FAIL pocket: a ball dropped at ${x.toFixed(1)},${y.toFixed(1)} rests at ${key} L${b.layer}`);
				}
			}
		}
	}
	return fails;
}

/** Feed random shots straight to the rules and see how far a game can get. */
function progress(id: TableId, rules: TableRules<unknown>) {
	const seen = new Map<string, number>();
	const def = rules.def;
	const dummy = (): Ball => ({ id: -1, x: 9, y: 15, vx: 0, vy: 0, state: 'free', layer: 0, ramp: -1, ride: -1, rideS: 0, rideV: 0, hidden: false, inside: new Set(), sides: new Map(), roll: 0 });
	type Shot = () => Parameters<typeof inject>[1];
	const shots: Shot[] = [
		...def.sensors.map((s) => () => ({ type: 'enter' as const, id: s.id, ball: { ...dummy(), x: s.x, y: s.y, vy: 3 } })),
		...def.holes.map((h) => () => ({ type: 'hole' as const, id: h.id, ball: dummy() })),
		...def.ramps.map((r) => () => ({ type: 'ramp' as const, id: r.id, ball: dummy() })),
		...def.movers.map((m) => () => ({ type: 'mover' as const, id: m.id, speed: 8, ball: dummy() })),
		...def.captives.map((c) => () => ({ type: 'captive' as const, id: c.id, speed: 8, ball: dummy() })),
		...def.spinners.map((s) => () => ({ type: 'spin' as const, id: s.id, spins: 6, ball: dummy() })),
		...def.standups.map((s) => () => ({ type: 'standup' as const, id: s.id, ball: dummy() })),
		...def.bumpers.map((_, i) => () => ({ type: 'bumper' as const, i, ball: dummy() }))
	];
	for (const bank of def.banks) {
		bank.targets.forEach((_, i) =>
			shots.push(() => ({ type: 'drop' as const, bank: bank.id, i, ball: dummy() }))
		);
	}
	const RUNS = 8;
	for (let run = 0; run < RUNS; run += 1) {
		const g = createGame(rules, 'fair', 77 + run);
		for (let t = 0; t < 6000 && g.phase !== 'over'; t += 1) {
			if (g.phase !== 'play') {
				advance(g, 0.35);
				if (g.phase === 'serve' && laneBall(g.world)) {
					pull(g, true, []);
					pull(g, false, []);
				}
				continue;
			}
			const make = shots[Math.floor(Math.random() * shots.length)]!;
			const e = make();
			if (e.type === 'hole') {
				const toggle = def.holes.find((h) => h.id === e.id)?.toggle;
				if (toggle && !g.world.toggles[toggle]) continue;
			}
			if (e.type === 'drop') {
				const up = g.world.drops[e.bank]!;
				if (!up[e.i]) continue;
				up[e.i] = false;
			}
			for (const out of [...inject(g, e), ...advance(g, 0.35)]) {
				if (out.type === 'cue') seen.set(out.cue, (seen.get(out.cue) ?? 0) + 1);
			}
			// Keep one ball alive so timers run and the game carries on.
			if (!g.world.balls.some((b) => b.state === 'free' && b.x < g.world.def.lane.wall)) {
				if (g.phase === 'play') addBall(g.world, 9.3, 20);
			}
			const free = g.world.balls.filter((b) => b.state === 'free');
			free.forEach((b, i) => {
				if (i > 0 && Math.random() < 0.08) {
					b.state = 'gone';
					for (const out of inject(g, { type: 'drain', ball: b })) if (out.type === 'cue') seen.set(out.cue, (seen.get(out.cue) ?? 0) + 1);
				} else if (b.y > 28) ((b.y = 20), (b.vy = -5));
			});
			g.world.balls = g.world.balls.filter((b) => b.state !== 'gone');
		}
	}
	const report = [...seen.keys()].sort().map((k) => `${k} ${((seen.get(k) ?? 0) / RUNS).toFixed(1)}`);
	console.log(`  rules: ${report.join(', ')}`);
	const missing = EXPECT[id].filter((k) => !seen.get(k));
	if (missing.length) console.log(`  FAIL rules never reached: ${missing.join(', ')}`);
	return missing.length;
}

for (const [id, rules] of Object.entries(ALL) as Array<[TableId, TableRules<unknown>]>) {
	if (only && id !== only) continue;
	console.log(`${id}`);
	failures += cradle(rules);
	failures += pockets(rules);
	failures += progress(id, rules);
	failures += playGames(id, rules);
}
console.log(failures ? `${failures} failures` : 'all good');
process.exit(failures ? 1 : 0);
