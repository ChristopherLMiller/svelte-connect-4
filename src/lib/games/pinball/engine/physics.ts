import { along, BALL_R, FIELD_W, pathLength, type Captive, type FlipperDef, type Layer, type Ramp, type Ride, type Side, type TableDef, type Wall } from './def';

/** One physics step; small enough that the fastest ball moves well under its radius. */
export const STEP = 1 / 720;
const MAX_SPEED = 78;
const FLIP_UP = 30;
const FLIP_DOWN = 17;
const FLIPPER_E = 0.28;
const BALL_E = 0.9;
/** A wireform: share of gravity along the wire, rolling drag per second, top speed, and top speed off the end. */
const RIDE_PULL = 0.7;
const RIDE_DRAG = 0.9;
const RIDE_MAX = 30;
const RIDE_EXIT = 24;
/** How quickly a ball on a disc picks up the disc's surface speed, per second. */
const DISC_GRIP = 2.4;
const CAPTIVE_E = 0.85;

export type BallState = 'free' | 'held' | 'riding' | 'gone';

export type Ball = {
	id: number;
	x: number;
	y: number;
	vx: number;
	vy: number;
	state: BallState;
	layer: Layer;
	/** Index of the ramp it's climbing, or -1. */
	ramp: number;
	/** Index of the ride it's on, and how far along. */
	ride: number;
	rideS: number;
	rideV: number;
	hidden: boolean;
	inside: Set<string>;
	/** Which side of each spinner it was last on. */
	sides: Map<string, number>;
	/** Spin, for drawing only. */
	roll: number;
};

export type Flipper = FlipperDef & { angle: number; omega: number; pressed: boolean };
export type MoverState = { x: number; y: number; vx: number; vy: number; solid: boolean };

type Box = { x0: number; x1: number; y0: number; y1: number };
type WallGeo = Wall & Box;
type RampGeo = {
	ramp: Ramp;
	segs: Array<{ ax: number; ay: number; dx: number; dy: number; len: number; s0: number }>;
	total: number;
	ride: number;
	mouth: { x: number; y: number; dx: number; dy: number; nx: number; ny: number };
};
type RideGeo = { ride: Ride; total: number };

export type World = {
	def: TableDef;
	walls: WallGeo[];
	ramps: RampGeo[];
	rides: RideGeo[];
	balls: Ball[];
	flippers: Flipper[];
	/** Drop targets per bank; true is standing. */
	drops: Record<string, boolean[]>;
	toggles: Record<string, boolean>;
	movers: Record<string, MoverState>;
	magnets: Record<string, boolean>;
	spin: Record<string, { angle: number; rate: number }>;
	/** Each disc's turn so far and its speed, which the rules may change. */
	discs: Record<string, { angle: number; rate: number }>;
	/** How far up its track each captive ball is, its speed, and the ball that last hit it. */
	captives: Record<string, { s: number; v: number; by: Ball | null }>;
	/** Where each aiming hole points right now. */
	aims: Record<string, number>;
	plunger: number;
	gravity: number;
	time: number;
	nextId: number;
	/** Per-object cooldowns so one contact makes one event. */
	cool: Map<string, number>;
};

export type PhysEvent =
	| { type: 'bumper'; i: number; ball: Ball }
	| { type: 'sling'; side: Side; ball: Ball }
	| { type: 'drop'; bank: string; i: number; ball: Ball }
	| { type: 'standup'; id: string; ball: Ball }
	| { type: 'spin'; id: string; spins: number; ball: Ball }
	| { type: 'enter'; id: string; ball: Ball }
	| { type: 'hole'; id: string; ball: Ball }
	| { type: 'rampEnter'; id: string; ball: Ball }
	| { type: 'rampBack'; id: string; ball: Ball }
	| { type: 'ramp'; id: string; ball: Ball }
	| { type: 'rideEnd'; id: string; ball: Ball }
	| { type: 'mover'; id: string; speed: number; ball: Ball }
	| { type: 'captive'; id: string; speed: number; ball: Ball }
	| { type: 'flip'; side: Side; speed: number; ball: Ball }
	| { type: 'knock'; speed: number; ball: Ball }
	| { type: 'clack'; speed: number; ball: Ball }
	| { type: 'drain'; ball: Ball }
	| { type: 'lost'; ball: Ball };

export type Emit = (event: PhysEvent) => void;

function box(ax: number, ay: number, bx: number, by: number, reach: number): Box {
	return { x0: Math.min(ax, bx) - reach, x1: Math.max(ax, bx) + reach, y0: Math.min(ay, by) - reach, y1: Math.max(ay, by) + reach };
}

export function createWorld(def: TableDef, gravity: number): World {
	const ramps: RampGeo[] = def.ramps.map((ramp) => {
		const segs: RampGeo['segs'] = [];
		let s0 = 0;
		for (let i = 1; i < ramp.path.length; i += 1) {
			const a = ramp.path[i - 1]!;
			const b = ramp.path[i]!;
			const len = Math.hypot(b.x - a.x, b.y - a.y) || 1e-6;
			segs.push({ ax: a.x, ay: a.y, dx: (b.x - a.x) / len, dy: (b.y - a.y) / len, len, s0 });
			s0 += len;
		}
		const first = segs[0]!;
		return {
			ramp,
			segs,
			total: s0,
			ride: ramp.ride ? def.rides.findIndex((r) => r.id === ramp.ride) : -1,
			mouth: { x: first.ax, y: first.ay, dx: first.dx, dy: first.dy, nx: -first.dy, ny: first.dx }
		};
	});
	return {
		def,
		walls: def.walls.map((w) => ({ ...w, ...box(w.ax, w.ay, w.bx, w.by, w.t + BALL_R) })),
		ramps,
		rides: def.rides.map((ride) => ({ ride, total: pathLength(ride.path) })),
		balls: [],
		flippers: def.flippers.map((f) => ({ ...f, angle: f.rest, omega: 0, pressed: false })),
		drops: Object.fromEntries(def.banks.map((b) => [b.id, b.targets.map(() => true)])),
		toggles: {},
		movers: Object.fromEntries(def.movers.map((m) => [m.id, { x: m.at.x, y: m.at.y, vx: 0, vy: 0, solid: true }])),
		magnets: Object.fromEntries(def.magnets.map((m) => [m.id, false])),
		spin: Object.fromEntries(def.spinners.map((s) => [s.id, { angle: 0, rate: 0 }])),
		discs: Object.fromEntries(def.discs.map((d) => [d.id, { angle: 0, rate: d.spin }])),
		captives: Object.fromEntries(def.captives.map((c) => [c.id, { s: 0, v: 0, by: null }])),
		aims: Object.fromEntries(def.holes.flatMap((h) => (h.aim ? [[h.id, h.aim.from]] : []))),
		plunger: 0,
		gravity,
		time: 0,
		nextId: 0,
		cool: new Map()
	};
}

export function addBall(w: World, x: number, y: number, vx = 0, vy = 0, layer: Layer = 0): Ball {
	const ball: Ball = { id: ++w.nextId, x, y, vx, vy, state: 'free', layer, ramp: -1, ride: -1, rideS: 0, rideV: 0, hidden: false, inside: new Set(), sides: new Map(), roll: 0 };
	w.balls.push(ball);
	return ball;
}

export function laneRest(w: World) {
	return { x: w.def.lane.x, y: w.def.lane.plungerY - BALL_R };
}

/** A ball sitting on the plunger, ready to shoot. */
export function laneBall(w: World) {
	const lane = w.def.lane;
	return w.balls.find((b) => b.state === 'free' && b.layer === 0 && b.x > lane.wall && b.y > lane.plungerY - 2.5 && Math.abs(b.vy) < 4) ?? null;
}

export function plungerTop(w: World) {
	return w.def.lane.plungerY + w.plunger * w.def.lane.travel;
}

/** Where a captive ball sits now, and the unit direction up its track. */
export function captiveAt(w: World, c: Captive) {
	const dx = c.bx - c.ax;
	const dy = c.by - c.ay;
	const len = Math.hypot(dx, dy) || 1e-6;
	const s = w.captives[c.id]!.s;
	return { x: c.ax + (dx / len) * s, y: c.ay + (dy / len) * s, tx: dx / len, ty: dy / len, len };
}

export function flipperTip(f: Flipper) {
	return { x: f.px + Math.cos(f.angle) * f.len, y: f.py + Math.sin(f.angle) * f.len };
}

/** Move a toy; its speed is worked out from the step so the ball bounces off it properly. */
export function moveMover(w: World, id: string, x: number, y: number, h: number) {
	const m = w.movers[id];
	if (!m) return;
	m.vx = h > 0 ? (x - m.x) / h : 0;
	m.vy = h > 0 ? (y - m.y) / h : 0;
	m.x = x;
	m.y = y;
}

export function startRide(w: World, b: Ball, id: string) {
	const index = w.rides.findIndex((r) => r.ride.id === id);
	if (index < 0) return;
	const r = w.rides[index]!.ride;
	b.state = 'riding';
	b.ride = index;
	b.rideS = 0;
	b.rideV = r.hidden ? r.speed : Math.max(r.speed * 0.7, Math.min(r.speed * 1.3, Math.hypot(b.vx, b.vy)));
	b.ramp = -1;
	b.hidden = !!r.hidden;
}

/** Shove every ball on the table: the player nudging the cabinet. */
export function nudge(w: World, dx: number, dy: number) {
	for (const b of w.balls) {
		if (b.state !== 'free' || b.x > w.def.lane.wall) continue;
		b.vx += dx;
		b.vy += dy;
	}
}

export function raiseBank(w: World, id: string) {
	const bank = w.drops[id];
	if (bank) w.drops[id] = bank.map(() => true);
}

function ready(w: World, key: string, gap: number) {
	const until = w.cool.get(key) ?? 0;
	if (w.time < until) return false;
	w.cool.set(key, w.time + gap);
	return true;
}

/**
 * Push the ball out of a contact and bounce it; returns the closing speed, or 0 when there was none.
 * Friction scales with how hard the ball hits; a ball resting or rolling against a surface feels none.
 */
function resolve(b: Ball, nx: number, ny: number, depth: number, e: number, svx = 0, svy = 0, mu = 0.06) {
	b.x += nx * depth;
	b.y += ny * depth;
	const rvx = b.vx - svx;
	const rvy = b.vy - svy;
	const vn = rvx * nx + rvy * ny;
	if (vn >= 0) return 0;
	const tx = rvx - vn * nx;
	const ty = rvy - vn * ny;
	const tl = Math.hypot(tx, ty);
	const grip = tl > 1e-6 && vn < -1 ? Math.min(1, (mu * (1 + e) * -vn) / tl) : 0;
	b.vx -= (1 + e) * vn * nx + tx * grip;
	b.vy -= (1 + e) * vn * ny + ty * grip;
	return -vn;
}

function segContact(b: Ball, ax: number, ay: number, bx: number, by: number, reach: number) {
	const dx = bx - ax;
	const dy = by - ay;
	const len2 = dx * dx + dy * dy;
	let t = len2 ? ((b.x - ax) * dx + (b.y - ay) * dy) / len2 : 0;
	t = t < 0 ? 0 : t > 1 ? 1 : t;
	const ox = b.x - (ax + dx * t);
	const oy = b.y - (ay + dy * t);
	const d2 = ox * ox + oy * oy;
	if (d2 >= reach * reach) return null;
	const d = Math.sqrt(d2) || 1e-6;
	return { nx: ox / d, ny: oy / d, depth: reach - d };
}

function circleContact(b: Ball, x: number, y: number, reach: number) {
	const ox = b.x - x;
	const oy = b.y - y;
	const d2 = ox * ox + oy * oy;
	if (d2 >= reach * reach) return null;
	const d = Math.sqrt(d2) || 1e-6;
	return { nx: ox / d, ny: oy / d, depth: reach - d };
}

function moveFlippers(w: World, h: number) {
	for (const f of w.flippers) {
		const target = f.pressed ? f.up : f.rest;
		const diff = target - f.angle;
		if (!diff) {
			f.omega = 0;
			continue;
		}
		const rate = f.pressed ? FLIP_UP : FLIP_DOWN;
		const move = Math.sign(diff) * Math.min(Math.abs(diff), rate * h);
		f.angle += move;
		f.omega = move / h;
	}
}

function collideFlipper(w: World, b: Ball, f: Flipper, emit: Emit) {
	const tip = flipperTip(f);
	const dx = tip.x - f.px;
	const dy = tip.y - f.py;
	const len2 = dx * dx + dy * dy;
	let t = ((b.x - f.px) * dx + (b.y - f.py) * dy) / len2;
	t = t < 0 ? 0 : t > 1 ? 1 : t;
	const r = f.rb + (f.rt - f.rb) * t;
	const qx = f.px + dx * t;
	const qy = f.py + dy * t;
	const ox = b.x - qx;
	const oy = b.y - qy;
	const reach = r + BALL_R;
	const d2 = ox * ox + oy * oy;
	if (d2 >= reach * reach) return;
	const d = Math.sqrt(d2) || 1e-6;
	const nx = ox / d;
	const ny = oy / d;
	const cx = qx + nx * r - f.px;
	const cy = qy + ny * r - f.py;
	const speed = resolve(b, nx, ny, reach - d, FLIPPER_E, -f.omega * cy, f.omega * cx, 0.18);
	if (speed > 2 && ready(w, `f${f.id}`, 0.08)) emit({ type: 'flip', side: f.side, speed, ball: b });
}

function collide(w: World, b: Ball, emit: Emit) {
	const def = w.def;
	for (const s of w.walls) {
		if (s.layer !== b.layer || b.x < s.x0 || b.x > s.x1 || b.y < s.y0 || b.y > s.y1) continue;
		if (s.toggle && !w.toggles[s.toggle]) continue;
		if (s.nx != null && s.ny != null && (b.x - s.ax) * s.nx + (b.y - s.ay) * s.ny < 0) continue;
		const c = segContact(b, s.ax, s.ay, s.bx, s.by, s.t + BALL_R);
		if (!c) continue;
		const speed = resolve(b, c.nx, c.ny, c.depth, s.e, 0, 0, s.kind === 'rail' ? 0.01 : 0.06);
		if (s.kind === 'sling' && speed > 3.5 && ready(w, `s${s.side}`, 0.12)) {
			b.vx += c.nx * (s.kick ?? 15);
			b.vy += c.ny * (s.kick ?? 15);
			emit({ type: 'sling', side: s.side!, ball: b });
		} else if (speed > 6 && ready(w, `k${b.id}`, 0.06)) {
			emit({ type: s.kind === 'guide' || s.kind === 'rail' ? 'clack' : 'knock', speed, ball: b });
		}
	}
	for (const p of def.posts) {
		if (p.layer !== b.layer) continue;
		const c = circleContact(b, p.x, p.y, p.r + BALL_R);
		if (c) resolve(b, c.nx, c.ny, c.depth, p.e);
	}
	for (let i = 0; i < def.bumpers.length; i += 1) {
		const p = def.bumpers[i]!;
		if (p.layer !== b.layer) continue;
		const c = circleContact(b, p.x, p.y, p.r + BALL_R);
		if (!c) continue;
		resolve(b, c.nx, c.ny, c.depth, 0.5);
		const out = b.vx * c.nx + b.vy * c.ny;
		if (out < p.kick) {
			b.vx += c.nx * (p.kick - out);
			b.vy += c.ny * (p.kick - out);
		}
		if (ready(w, `b${i}`, 0.1)) emit({ type: 'bumper', i, ball: b });
	}
	for (const bank of def.banks) {
		if (bank.layer !== b.layer) continue;
		const up = w.drops[bank.id]!;
		for (let i = 0; i < bank.targets.length; i += 1) {
			if (!up[i]) continue;
			const tg = bank.targets[i]!;
			const c = segContact(b, tg.ax, tg.ay, tg.bx, tg.by, 0.1 + BALL_R);
			if (!c) continue;
			const speed = resolve(b, c.nx, c.ny, c.depth, 0.3);
			if (speed > 1.5) {
				up[i] = false;
				emit({ type: 'drop', bank: bank.id, i, ball: b });
			}
		}
	}
	for (const s of def.standups) {
		if (s.layer !== b.layer) continue;
		const c = segContact(b, s.ax, s.ay, s.bx, s.by, 0.12 + BALL_R);
		if (!c) continue;
		const speed = resolve(b, c.nx, c.ny, c.depth, 0.45);
		if (speed > 1.5 && ready(w, `u${s.id}`, 0.15)) emit({ type: 'standup', id: s.id, ball: b });
	}
	for (const m of def.movers) {
		const st = w.movers[m.id]!;
		if (!st.solid || m.layer !== b.layer) continue;
		const c = circleContact(b, st.x, st.y, m.r + BALL_R);
		if (!c) continue;
		const speed = resolve(b, c.nx, c.ny, c.depth, m.e, st.vx, st.vy);
		if (speed > 1 && ready(w, `m${m.id}`, 0.3)) emit({ type: 'mover', id: m.id, speed, ball: b });
	}
	for (const c of def.captives) {
		if (c.layer !== b.layer) continue;
		const at = captiveAt(w, c);
		const hit = circleContact(b, at.x, at.y, BALL_R * 2);
		if (!hit) continue;
		const st = w.captives[c.id]!;
		b.x += hit.nx * hit.depth;
		b.y += hit.ny * hit.depth;
		// The captive only moves along its track, so it takes the share of the blow along it.
		const along = hit.nx * at.tx + hit.ny * at.ty;
		const vn = (b.vx - st.v * at.tx) * hit.nx + (b.vy - st.v * at.ty) * hit.ny;
		if (vn >= 0) continue;
		const j = (-(1 + CAPTIVE_E) * vn) / (1 + along * along);
		b.vx += j * hit.nx;
		b.vy += j * hit.ny;
		st.v -= j * along;
		st.by = b;
		if (-vn > 6 && ready(w, `k${b.id}`, 0.06)) emit({ type: 'knock', speed: -vn, ball: b });
	}
	for (const f of w.flippers) if (f.layer === b.layer) collideFlipper(w, b, f, emit);
	if (b.layer === 0 && b.x > def.lane.wall) {
		const top = plungerTop(w);
		if (b.y + BALL_R > top) resolve(b, 0, -1, b.y + BALL_R - top, 0.2, 0, 0, 1);
	}
}

function collideBalls(w: World) {
	const live = w.balls.filter((b) => b.state === 'free');
	for (let i = 0; i < live.length; i += 1) {
		for (let j = i + 1; j < live.length; j += 1) {
			const a = live[i]!;
			const c = live[j]!;
			if (a.layer !== c.layer) continue;
			const ox = c.x - a.x;
			const oy = c.y - a.y;
			const d2 = ox * ox + oy * oy;
			const reach = BALL_R * 2;
			if (d2 >= reach * reach) continue;
			const d = Math.sqrt(d2) || 1e-6;
			const nx = ox / d;
			const ny = oy / d;
			const push = (reach - d) / 2;
			a.x -= nx * push;
			a.y -= ny * push;
			c.x += nx * push;
			c.y += ny * push;
			const vn = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
			if (vn >= 0) continue;
			const j2 = ((1 + BALL_E) / 2) * vn;
			a.vx += j2 * nx;
			a.vy += j2 * ny;
			c.vx -= j2 * nx;
			c.vy -= j2 * ny;
		}
	}
}

/** Ramp mouths, the climb, rolling back, and the hand-off to a ride at the top. */
function ramps(w: World, b: Ball, h: number, emit: Emit) {
	if (b.ramp < 0) {
		if (b.layer !== 0) return;
		for (let i = 0; i < w.ramps.length; i += 1) {
			const g = w.ramps[i]!;
			const m = g.mouth;
			const rx = b.x - m.x;
			const ry = b.y - m.y;
			const al = rx * m.dx + ry * m.dy;
			if (al < 0 || al > 0.7) continue;
			if (Math.abs(rx * m.nx + ry * m.ny) > g.ramp.width / 2 - 0.12) continue;
			if (b.vx * m.dx + b.vy * m.dy <= 0) continue;
			b.layer = 1;
			b.ramp = i;
			emit({ type: 'rampEnter', id: g.ramp.id, ball: b });
			return;
		}
		return;
	}
	const g = w.ramps[b.ramp]!;
	const m = g.mouth;
	if ((b.x - m.x) * m.dx + (b.y - m.y) * m.dy < -0.05) {
		b.layer = 0;
		b.ramp = -1;
		emit({ type: 'rampBack', id: g.ramp.id, ball: b });
		return;
	}
	let best = Infinity;
	let s = 0;
	let tx = 0;
	let ty = 0;
	for (const seg of g.segs) {
		let t = (b.x - seg.ax) * seg.dx + (b.y - seg.ay) * seg.dy;
		t = t < 0 ? 0 : t > seg.len ? seg.len : t;
		const ox = b.x - (seg.ax + seg.dx * t);
		const oy = b.y - (seg.ay + seg.dy * t);
		const d2 = ox * ox + oy * oy;
		if (d2 < best) {
			best = d2;
			s = seg.s0 + t;
			tx = seg.dx;
			ty = seg.dy;
		}
	}
	if (best > g.ramp.width * g.ramp.width) {
		b.layer = 0;
		b.ramp = -1;
		return;
	}
	if (s < g.ramp.rise) {
		b.vx -= tx * g.ramp.lift * h;
		b.vy -= ty * g.ramp.lift * h;
	}
	if (s >= g.total - 0.2) {
		b.ramp = -1;
		emit({ type: 'ramp', id: g.ramp.id, ball: b });
		if (g.ride >= 0 && b.state === 'free') startRide(w, b, w.rides[g.ride]!.ride.id);
	}
}

function ride(w: World, b: Ball, h: number, emit: Emit) {
	const g = w.rides[b.ride]!;
	const r = g.ride;
	const here = along(r.path, b.rideS);
	if (!r.hidden) {
		b.rideV += (w.gravity * RIDE_PULL * here.dy - RIDE_DRAG * b.rideV) * h;
		b.rideV = Math.max(r.speed * 0.5, Math.min(RIDE_MAX, b.rideV));
	}
	b.rideS += b.rideV * h;
	const p = along(r.path, b.rideS);
	b.vx = p.dx * b.rideV;
	b.vy = p.dy * b.rideV;
	b.x = p.x;
	b.y = p.y;
	b.roll += (b.rideV * h) / BALL_R;
	if (b.rideS < g.total) return;
	b.state = 'free';
	b.hidden = false;
	b.ride = -1;
	b.layer = r.exit.layer;
	const out = Math.min(RIDE_EXIT, b.rideV);
	b.vx = r.carry ? p.dx * out : r.exit.vx;
	b.vy = r.carry ? p.dy * out : r.exit.vy;
	b.inside.clear();
	b.sides.clear();
	emit({ type: 'rideEnd', id: g.ride.id, ball: b });
}

function sense(w: World, b: Ball, emit: Emit) {
	const def = w.def;
	for (const s of def.sensors) {
		if (s.layer !== b.layer) continue;
		const dx = b.x - s.x;
		const dy = b.y - s.y;
		const inside = dx * dx + dy * dy < s.r * s.r;
		if (inside && !b.inside.has(s.id)) {
			b.inside.add(s.id);
			emit({ type: 'enter', id: s.id, ball: b });
			if (b.state !== 'free') return;
		} else if (!inside) b.inside.delete(s.id);
	}
	for (const hole of def.holes) {
		if (hole.layer !== b.layer || (hole.toggle && !w.toggles[hole.toggle])) continue;
		const dx = b.x - hole.x;
		const dy = b.y - hole.y;
		const inside = dx * dx + dy * dy < hole.r * hole.r;
		if (!inside) {
			b.inside.delete(hole.id);
			continue;
		}
		if (b.inside.has(hole.id)) continue;
		b.inside.add(hole.id);
		if (Math.hypot(b.vx, b.vy) > hole.maxSpeed) continue;
		b.state = 'held';
		b.x = hole.x;
		b.y = hole.y;
		b.vx = 0;
		b.vy = 0;
		b.hidden = hole.kind !== 'saucer';
		emit({ type: 'hole', id: hole.id, ball: b });
		return;
	}
	for (const sp of def.spinners) {
		if (sp.layer !== b.layer) continue;
		const dx = sp.bx - sp.ax;
		const dy = sp.by - sp.ay;
		const t = ((b.x - sp.ax) * dx + (b.y - sp.ay) * dy) / (dx * dx + dy * dy);
		if (t < -0.15 || t > 1.15) {
			b.sides.delete(sp.id);
			continue;
		}
		const side = Math.sign((b.x - sp.ax) * dy - (b.y - sp.ay) * dx);
		const prev = b.sides.get(sp.id);
		if (prev != null && side && side !== prev) {
			const speed = Math.hypot(b.vx, b.vy);
			const st = w.spin[sp.id]!;
			st.rate = Math.max(st.rate, speed * 2.4);
			emit({ type: 'spin', id: sp.id, spins: Math.max(1, Math.min(16, Math.round(speed / 3))), ball: b });
		}
		if (side) b.sides.set(sp.id, side);
	}
}

function magnets(w: World, b: Ball, h: number) {
	for (const m of w.def.magnets) {
		if (!w.magnets[m.id] || m.layer !== b.layer) continue;
		const dx = m.x - b.x;
		const dy = m.y - b.y;
		const d = Math.hypot(dx, dy);
		if (d > m.r || d < 1e-4) continue;
		const pull = m.strength * (1 - (d / m.r) * 0.5);
		b.vx += (dx / d) * pull * h;
		b.vy += (dy / d) * pull * h;
		const damp = 1 - Math.min(0.9, 5 * h * (1 - d / m.r));
		b.vx *= damp;
		b.vy *= damp;
	}
}

function discs(w: World, b: Ball, h: number) {
	for (const d of w.def.discs) {
		if (d.layer !== b.layer) continue;
		const dx = b.x - d.x;
		const dy = b.y - d.y;
		if (dx * dx + dy * dy > d.r * d.r) continue;
		const rate = w.discs[d.id]!.rate;
		const k = Math.min(1, DISC_GRIP * h);
		b.vx += (-rate * dy - b.vx) * k;
		b.vy += (rate * dx - b.vy) * k;
	}
}

function captives(w: World, h: number, emit: Emit) {
	for (const c of w.def.captives) {
		const st = w.captives[c.id]!;
		const at = captiveAt(w, c);
		st.v += (w.gravity * at.ty - st.v * 0.6) * h;
		st.s += st.v * h;
		if (st.s < 0) {
			st.s = 0;
			st.v = st.v < 0 ? -st.v * 0.2 : st.v;
			if (Math.abs(st.v) < 0.5) st.v = 0;
		} else if (st.s > at.len) {
			st.s = at.len;
			if (st.v > 2 && st.by && ready(w, `c${c.id}`, 0.25)) emit({ type: 'captive', id: c.id, speed: st.v, ball: st.by });
			st.v = -Math.abs(st.v) * 0.35;
		}
	}
}

/** Advance the table by one fixed step. */
export function stepWorld(w: World, emit: Emit) {
	const h = STEP;
	w.time += h;
	moveFlippers(w, h);
	for (const id in w.spin) {
		const s = w.spin[id]!;
		s.angle += s.rate * h;
		s.rate = Math.max(0, s.rate * (1 - 1.1 * h) - 2 * h);
	}
	for (const id in w.discs) {
		const d = w.discs[id]!;
		d.angle += d.rate * h;
	}
	for (const hole of w.def.holes) {
		if (!hole.aim) continue;
		const a = hole.aim;
		w.aims[hole.id] = a.from + (a.to - a.from) * (0.5 - 0.5 * Math.cos(w.time * a.rate * Math.PI));
	}
	captives(w, h, emit);
	for (const b of w.balls) {
		if (b.state === 'riding') {
			ride(w, b, h, emit);
			continue;
		}
		if (b.state !== 'free') continue;
		b.vy += w.gravity * h;
		magnets(w, b, h);
		discs(w, b, h);
		const sp = Math.hypot(b.vx, b.vy);
		if (sp > MAX_SPEED) {
			b.vx *= MAX_SPEED / sp;
			b.vy *= MAX_SPEED / sp;
		}
		b.x += b.vx * h;
		b.y += b.vy * h;
		b.roll += (b.vy * h) / BALL_R;
		ramps(w, b, h, emit);
		if (b.state !== 'free') continue;
		collide(w, b, emit);
		if (b.state !== 'free') continue;
		sense(w, b, emit);
		if (b.state !== 'free') continue;
		if (b.y > w.def.drainY && b.layer === 0) {
			b.state = 'gone';
			emit({ type: 'drain', ball: b });
		} else if (b.x < 0 || b.x > FIELD_W || b.y < -0.5 || b.y > w.def.drainY + 2 || !Number.isFinite(b.x + b.y + b.vx + b.vy)) {
			b.state = 'gone';
			emit({ type: 'lost', ball: b });
		}
	}
	collideBalls(w);
	w.balls = w.balls.filter((b) => b.state !== 'gone');
}
