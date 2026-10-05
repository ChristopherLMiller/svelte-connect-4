import { parseWindow, WINDOWS } from './levels';
import {
	BALL_R,
	BEAM_H,
	BEAM_Y,
	CELL_H,
	CELL_W,
	COLS,
	FIELD_H,
	FIELD_W,
	GRID_X,
	GRID_Y,
	HUES,
	LEAD,
	ROWS,
	type Difficulty,
	type EffectKind,
	type RelicKind
} from './types';

export type Ball = {
	id: number;
	x: number;
	y: number;
	vx: number;
	vy: number;
	stuck: boolean;
	/** Where on the beam a stuck ball rests, relative to the beam centre. */
	offset: number;
};

export type Relic = { id: number; kind: RelicKind; x: number; y: number; age: number };

export type WorldEvent =
	| { type: 'pane'; index: number; hue: number; x: number; y: number; broken: boolean; combo: number; points: number; vx: number }
	| { type: 'lead'; x: number; y: number }
	| { type: 'wall'; x: number; y: number }
	| { type: 'beam'; x: number; rel: number }
	| { type: 'serve' }
	| { type: 'lost'; remaining: number }
	| { type: 'drop'; kind: RelicKind; x: number; y: number }
	| { type: 'relic'; kind: RelicKind; x: number; y: number }
	| { type: 'expire'; effect: EffectKind }
	| { type: 'cleared' };

export type Input = {
	/** Field x the pointer is steering toward, or null when the keyboard drives. */
	target: number | null;
	axis: -1 | 0 | 1;
};

export type World = {
	difficulty: Difficulty;
	level: number;
	kind: Uint8Array;
	hp: Uint8Array;
	/** The window as it was hung, so broken panes can be told from open air. */
	origin: Uint8Array;
	/** Strikes each pane took when new: 2 marks a thick double pane. */
	strength: Uint8Array;
	total: number;
	left: number;
	score: number;
	lives: number;
	combo: number;
	speed: number;
	beam: { x: number; w: number; vx: number };
	balls: Ball[];
	relics: Relic[];
	effects: Record<EffectKind, number>;
	events: WorldEvent[];
	/** Bumped whenever a pane changes so the renderer knows to repaint the glass. */
	glass: number;
	clearedSent: boolean;
	serial: number;
};

type Tuning = { speed: number; max: number; beam: number; lives: number; drop: number };

export const TUNING: Record<Difficulty, Tuning> = {
	easy: { speed: 430, max: 650, beam: 156, lives: 4, drop: 0.17 },
	medium: { speed: 500, max: 770, beam: 128, lives: 3, drop: 0.13 },
	hard: { speed: 575, max: 890, beam: 108, lives: 3, drop: 0.1 }
};

export const EFFECT_SECONDS: Record<EffectKind, number> = { lantern: 16, halo: 12, sunburst: 7 };
export const MAX_LIVES = 6;
const MAX_BALLS = 8;
const MAX_ANGLE = (62 * Math.PI) / 180;
const MIN_LIFT = 0.3;
const RELIC_FALL = 190;
const RELIC_R = 15;

const RELIC_WEIGHTS: Array<[RelicKind, number]> = [
	['lantern', 26],
	['triptych', 22],
	['halo', 18],
	['sunburst', 18],
	['candle', 8]
];

let ids = 0;

/** Windows quicken the light, easing out so window 500 is still playable. */
function ramp(level: number) {
	return 1 + 0.2 * (1 - Math.exp(-level / 30));
}

function baseSpeed(difficulty: Difficulty, level: number) {
	return TUNING[difficulty].speed * ramp(level);
}

function countBreakable(kind: Uint8Array) {
	let n = 0;
	for (const k of kind) if (k && k !== LEAD) n += 1;
	return n;
}

export function createWorld(
	difficulty: Difficulty,
	level = 0,
	carry?: { score: number; lives: number; kind?: Uint8Array; hp?: Uint8Array }
): World {
	const fresh = parseWindow(level);
	const kind = carry?.kind ?? fresh.kind.slice();
	const hp = carry?.hp ?? fresh.hp.slice();
	const world: World = {
		difficulty,
		level,
		kind,
		hp,
		origin: fresh.kind,
		strength: fresh.hp,
		total: countBreakable(fresh.kind),
		left: countBreakable(kind),
		score: carry?.score ?? 0,
		lives: carry?.lives ?? TUNING[difficulty].lives,
		combo: 0,
		speed: baseSpeed(difficulty, level),
		beam: { x: FIELD_W / 2, w: TUNING[difficulty].beam, vx: 0 },
		balls: [],
		relics: [],
		effects: { lantern: 0, halo: 0, sunburst: 0 },
		events: [],
		glass: 1,
		clearedSent: false,
		serial: ++ids
	};
	resetServe(world);
	return world;
}

export function isLastWindow(level: number) {
	return level >= WINDOWS.length - 1;
}

/** One ball resting on the beam; relics and blessings are swept away. */
export function resetServe(world: World) {
	world.balls = [{ id: ++ids, x: world.beam.x, y: BEAM_Y - BALL_R - 1, vx: 0, vy: 0, stuck: true, offset: 0 }];
	world.relics = [];
	world.effects = { lantern: 0, halo: 0, sunburst: 0 };
	world.combo = 0;
	world.speed = baseSpeed(world.difficulty, world.level);
}

function beamWidth(world: World) {
	const base = TUNING[world.difficulty].beam;
	return world.effects.lantern > 0 ? base * 1.5 : base;
}

function liveSpeed(world: World) {
	return world.effects.halo > 0 ? world.speed * 0.7 : world.speed;
}

export function serve(world: World) {
	let launched = false;
	for (const ball of world.balls) {
		if (!ball.stuck) continue;
		const lean = Math.max(-1, Math.min(1, ball.offset / (world.beam.w / 2)));
		const angle = lean * 0.5 + (Math.random() - 0.5) * 0.3;
		const speed = liveSpeed(world);
		ball.stuck = false;
		ball.vx = Math.sin(angle) * speed;
		ball.vy = -Math.cos(angle) * speed;
		launched = true;
	}
	if (launched) world.events.push({ type: 'serve' });
	return launched;
}

function pickRelic(world: World): RelicKind {
	const pool = RELIC_WEIGHTS.filter(([kind]) => kind !== 'candle' || world.lives < MAX_LIVES - 1);
	const total = pool.reduce((sum, [, w]) => sum + w, 0);
	let roll = Math.random() * total;
	for (const [kind, w] of pool) {
		roll -= w;
		if (roll <= 0) return kind;
	}
	return 'lantern';
}

function cellRect(index: number) {
	const c = index % COLS;
	const r = Math.floor(index / COLS);
	const x0 = GRID_X + c * CELL_W;
	const y0 = GRID_Y + r * CELL_H;
	return { x0, y0, x1: x0 + CELL_W, y1: y0 + CELL_H, c, r };
}

function solid(world: World, c: number, r: number) {
	if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return false;
	return world.kind[r * COLS + c] !== 0;
}

function strike(world: World, index: number, ball: Ball, pierce: boolean) {
	const k = world.kind[index]!;
	const { x0, y0 } = cellRect(index);
	const cx = x0 + CELL_W / 2;
	const cy = y0 + CELL_H / 2;
	if (k === LEAD) {
		world.events.push({ type: 'lead', x: ball.x, y: ball.y });
		return;
	}
	world.hp[index] = pierce ? 0 : Math.max(0, world.hp[index]! - 1);
	world.glass += 1;
	if (world.hp[index]! > 0) {
		world.events.push({ type: 'pane', index, hue: k, x: cx, y: cy, broken: false, combo: world.combo, points: 0, vx: ball.vx });
		return;
	}
	world.kind[index] = 0;
	world.left -= 1;
	world.combo += 1;
	const mult = Math.min(8, 1 + Math.floor((world.combo - 1) / 3));
	const points = (HUES[k]?.points ?? 10) * mult;
	world.score += points;
	world.events.push({ type: 'pane', index, hue: k, x: cx, y: cy, broken: true, combo: world.combo, points, vx: ball.vx });
	if (world.relics.length < 3 && Math.random() < TUNING[world.difficulty].drop) {
		const kind = pickRelic(world);
		world.relics.push({ id: ++ids, kind, x: cx, y: cy, age: 0 });
		world.events.push({ type: 'drop', kind, x: cx, y: cy });
	}
}

function settleSpeed(ball: Ball, speed: number) {
	const mag = Math.hypot(ball.vx, ball.vy) || 1;
	ball.vx = (ball.vx / mag) * speed;
	ball.vy = (ball.vy / mag) * speed;
	// Never let the ball skate almost flat; it would take an age to come back down.
	if (Math.abs(ball.vy) < speed * MIN_LIFT) {
		const sy = ball.vy < 0 ? -1 : 1;
		ball.vy = sy * speed * MIN_LIFT;
		const sx = ball.vx < 0 ? -1 : 1;
		ball.vx = sx * Math.sqrt(speed * speed - ball.vy * ball.vy);
	}
}

/** Resolves the ball against the glass. Returns true when it bounced. */
function collideGlass(world: World, ball: Ball, pierce: boolean) {
	const c0 = Math.floor((ball.x - BALL_R - GRID_X) / CELL_W);
	const c1 = Math.floor((ball.x + BALL_R - GRID_X) / CELL_W);
	const r0 = Math.floor((ball.y - BALL_R - GRID_Y) / CELL_H);
	const r1 = Math.floor((ball.y + BALL_R - GRID_Y) / CELL_H);
	if (c1 < 0 || r1 < 0 || c0 >= COLS || r0 >= ROWS) return false;

	let best = -1;
	let bestDepth = 0;
	let nx = 0;
	let ny = 0;
	for (let r = Math.max(0, r0); r <= Math.min(ROWS - 1, r1); r += 1) {
		for (let c = Math.max(0, c0); c <= Math.min(COLS - 1, c1); c += 1) {
			const index = r * COLS + c;
			const k = world.kind[index];
			if (!k) continue;
			const { x0, y0, x1, y1 } = cellRect(index);
			const px = Math.max(x0, Math.min(ball.x, x1));
			const py = Math.max(y0, Math.min(ball.y, y1));
			let dx = ball.x - px;
			let dy = ball.y - py;
			const d2 = dx * dx + dy * dy;
			if (d2 >= BALL_R * BALL_R) continue;
			if (pierce && k !== LEAD) {
				strike(world, index, ball, true);
				continue;
			}
			let d = Math.sqrt(d2);
			if (d < 1e-6) {
				// Centre inside the cell: push out along the side it entered from.
				const left = ball.x - x0;
				const right = x1 - ball.x;
				const top = ball.y - y0;
				const bottom = y1 - ball.y;
				const m = Math.min(left, right, top, bottom);
				dx = m === left ? -1 : m === right ? 1 : 0;
				dy = m === top ? -1 : m === bottom ? 1 : 0;
				d = 1;
			}
			let ux = dx / d;
			let uy = dy / d;
			if (ux !== 0 && uy !== 0) {
				// A corner tucked against a neighbour is really a flat face.
				if (solid(world, c + Math.sign(ux), r)) ux = 0;
				else if (solid(world, c, r + Math.sign(uy))) uy = 0;
				const n = Math.hypot(ux, uy) || 1;
				ux /= n;
				uy /= n;
			}
			const depth = BALL_R - Math.sqrt(d2);
			if (best < 0 || depth > bestDepth) {
				best = index;
				bestDepth = depth;
				nx = ux;
				ny = uy;
			}
		}
	}
	if (best < 0) return false;

	const dot = ball.vx * nx + ball.vy * ny;
	if (dot < 0) {
		ball.vx -= 2 * dot * nx;
		ball.vy -= 2 * dot * ny;
	}
	ball.x += nx * (bestDepth + 0.01);
	ball.y += ny * (bestDepth + 0.01);
	strike(world, best, ball, false);
	return true;
}

function catchRelic(world: World, relic: Relic) {
	world.events.push({ type: 'relic', kind: relic.kind, x: relic.x, y: relic.y });
	if (relic.kind === 'candle') {
		world.lives = Math.min(MAX_LIVES, world.lives + 1);
		return;
	}
	if (relic.kind === 'triptych') {
		const free = world.balls.filter((ball) => !ball.stuck);
		if (!free.length) serve(world);
		const sources = world.balls.filter((ball) => !ball.stuck).slice(0, 2);
		for (const source of sources) {
			for (const turn of [-0.42, 0.42]) {
				if (world.balls.length >= MAX_BALLS) break;
				const cos = Math.cos(turn);
				const sin = Math.sin(turn);
				const ball: Ball = {
					id: ++ids,
					x: source.x,
					y: source.y,
					vx: source.vx * cos - source.vy * sin,
					vy: source.vx * sin + source.vy * cos,
					stuck: false,
					offset: 0
				};
				settleSpeed(ball, liveSpeed(world));
				world.balls.push(ball);
			}
		}
		return;
	}
	world.effects[relic.kind] = EFFECT_SECONDS[relic.kind];
	if (relic.kind === 'halo') {
		for (const ball of world.balls) if (!ball.stuck) settleSpeed(ball, liveSpeed(world));
	}
}

function moveBeam(world: World, dt: number, input: Input) {
	const beam = world.beam;
	const goal = beamWidth(world);
	beam.w += (goal - beam.w) * (1 - Math.exp(-dt * 10));
	const half = beam.w / 2;
	const before = beam.x;
	if (input.axis !== 0) {
		const want = input.axis * 1050;
		beam.vx += (want - beam.vx) * (1 - Math.exp(-dt * 18));
		beam.x += beam.vx * dt;
	} else if (input.target != null) {
		beam.x += (input.target - beam.x) * (1 - Math.exp(-dt * 34));
		beam.vx = 0;
	} else {
		beam.vx *= Math.exp(-dt * 20);
		beam.x += beam.vx * dt;
	}
	beam.x = Math.max(half, Math.min(FIELD_W - half, beam.x));
	if (beam.x === half || beam.x === FIELD_W - half) beam.vx = 0;
	return beam.x - before;
}

/** Advances the world by `dt` seconds. Events pile up in `world.events` for the session. */
export function stepWorld(world: World, dt: number, input: Input) {
	const shift = moveBeam(world, dt, input);
	const beam = world.beam;
	const pierce = world.effects.sunburst > 0;
	const speed = liveSpeed(world);

	for (const ball of world.balls) {
		if (ball.stuck) {
			ball.offset = Math.max(-beam.w / 2 + BALL_R, Math.min(beam.w / 2 - BALL_R, ball.offset));
			ball.x = beam.x + ball.offset;
			ball.y = BEAM_Y - BALL_R - 1;
		}
	}

	const travel = speed * dt;
	const steps = Math.max(1, Math.ceil(travel / (BALL_R * 0.45)));
	const h = dt / steps;

	for (let s = 0; s < steps; s += 1) {
		for (let i = world.balls.length - 1; i >= 0; i -= 1) {
			const ball = world.balls[i]!;
			if (ball.stuck) continue;
			const prevY = ball.y;
			ball.x += ball.vx * h;
			ball.y += ball.vy * h;

			if (ball.x < BALL_R) {
				ball.x = BALL_R;
				ball.vx = Math.abs(ball.vx);
				world.events.push({ type: 'wall', x: ball.x, y: ball.y });
			} else if (ball.x > FIELD_W - BALL_R) {
				ball.x = FIELD_W - BALL_R;
				ball.vx = -Math.abs(ball.vx);
				world.events.push({ type: 'wall', x: ball.x, y: ball.y });
			}
			if (ball.y < BALL_R) {
				ball.y = BALL_R;
				ball.vy = Math.abs(ball.vy);
				world.events.push({ type: 'wall', x: ball.x, y: ball.y });
			}

			if (collideGlass(world, ball, pierce)) settleSpeed(ball, speed);

			const half = beam.w / 2;
			if (
				ball.vy > 0 &&
				prevY + BALL_R <= BEAM_Y + 6 &&
				ball.y + BALL_R >= BEAM_Y &&
				ball.y - BALL_R <= BEAM_Y + BEAM_H &&
				ball.x >= beam.x - half - BALL_R * 0.6 &&
				ball.x <= beam.x + half + BALL_R * 0.6
			) {
				const rel = Math.max(-1, Math.min(1, (ball.x - beam.x) / half));
				const angle = rel * MAX_ANGLE;
				world.speed = Math.min(TUNING[world.difficulty].max * ramp(world.level), world.speed * 1.012);
				const next = liveSpeed(world);
				ball.vx = Math.sin(angle) * next;
				ball.vy = -Math.cos(angle) * next;
				ball.y = BEAM_Y - BALL_R;
				world.combo = 0;
				world.events.push({ type: 'beam', x: ball.x, rel });
			}

			if (ball.y - BALL_R > FIELD_H) {
				world.balls.splice(i, 1);
				world.events.push({ type: 'lost', remaining: world.balls.length });
			}
		}
	}

	for (let i = world.relics.length - 1; i >= 0; i -= 1) {
		const relic = world.relics[i]!;
		relic.age += dt;
		relic.y += RELIC_FALL * dt;
		const half = beam.w / 2;
		if (
			relic.y + RELIC_R >= BEAM_Y &&
			relic.y - RELIC_R <= BEAM_Y + BEAM_H &&
			Math.abs(relic.x - beam.x) <= half + RELIC_R
		) {
			world.relics.splice(i, 1);
			catchRelic(world, relic);
			continue;
		}
		if (relic.y - RELIC_R > FIELD_H) world.relics.splice(i, 1);
	}

	for (const key of ['lantern', 'halo', 'sunburst'] as const) {
		if (world.effects[key] <= 0) continue;
		world.effects[key] = Math.max(0, world.effects[key] - dt);
		if (world.effects[key] === 0) {
			world.events.push({ type: 'expire', effect: key });
			if (key === 'halo') for (const ball of world.balls) if (!ball.stuck) settleSpeed(ball, liveSpeed(world));
		}
	}

	if (world.left <= 0 && !world.clearedSent) {
		world.clearedSent = true;
		world.events.push({ type: 'cleared' });
	}

	return shift;
}

export function cellCentre(index: number) {
	const { x0, y0 } = cellRect(index);
	return { x: x0 + CELL_W / 2, y: y0 + CELL_H / 2 };
}
