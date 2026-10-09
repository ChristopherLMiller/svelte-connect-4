/** Table definitions, in field units with y pointing down the playfield. Every table is 20 × 36 and the ball is 0.9 across. */
export const FIELD_W = 20;
export const FIELD_H = 36;
export const BALL_R = 0.45;
/** Left and right halves of the lower playfield mirror about this line (the shooter lane sits outside it). */
export const MIRROR = 18.6;
export const CX = MIRROR / 2;

export type P = { x: number; y: number };
/** 0 is the playfield; 1 is anything raised: ramps, decks, an upper playfield. */
export type Layer = 0 | 1;
export type Side = 'left' | 'right';
export type WallKind = 'wall' | 'rubber' | 'guide' | 'rail' | 'gate' | 'sling';

export type Wall = {
	ax: number;
	ay: number;
	bx: number;
	by: number;
	/** Half-thickness: the wall is a capsule of this radius. */
	t: number;
	e: number;
	kind: WallKind;
	layer: Layer;
	/** One-way: only a ball on this side of the line (unit normal) is blocked. */
	nx?: number;
	ny?: number;
	/** Solid only while this toggle is on. */
	toggle?: string;
	/** Solid but painted by the table's own art. */
	hidden?: boolean;
	side?: Side;
	kick?: number;
};

export type Post = { x: number; y: number; r: number; e: number; layer: Layer; kind?: 'rubber' | 'metal' | 'peg' };
export type Bumper = { x: number; y: number; r: number; kick: number; layer: Layer };
export type FlipperDef = { id: string; side: Side; px: number; py: number; len: number; rb: number; rt: number; rest: number; up: number; layer: Layer };
export type Target = { ax: number; ay: number; bx: number; by: number };
/** Drop targets that fall when hit and stay down until the rules raise them. */
export type Bank = { id: string; targets: Target[]; layer: Layer; letters?: string };
/** A target that stays up and just counts hits. */
export type Standup = { id: string; ax: number; ay: number; bx: number; by: number; layer: Layer; label?: string };
/** A flag the ball passes through; it spins for longer the faster the ball was going. */
export type Spinner = { id: string; ax: number; ay: number; bx: number; by: number; layer: Layer };
export type SensorKind = 'rollover' | 'opto' | 'button';
export type Sensor = { id: string; x: number; y: number; r: number; layer: Layer; kind: SensorKind };
export type Eject = { vx: number; vy: number; jitter: number; x?: number; y?: number; layer?: Layer; ride?: string };
export type HoleKind = 'saucer' | 'scoop' | 'sink';
/**
 * A hole that aims: while it holds a ball its aim swings between two headings (radians, y down),
 * `rate` sweeps a second; a flipper press fires the ball that way at `speed`, or it fires itself after `wait`.
 */
export type Aim = { from: number; to: number; rate: number; speed: number; wait: number };
/** Saucers hold the ball where it lands; scoops and sinks swallow it and spit it out somewhere (or down a ride). */
export type Hole = { id: string; x: number; y: number; r: number; layer: Layer; maxSpeed: number; hold: number; eject: Eject; kind: HoleKind; toggle?: string; aim?: Aim };
/** A spinning disc set into the playfield, turning at `spin` radians a second: a ball on it is dragged round with it. */
export type Disc = { id: string; x: number; y: number; r: number; spin: number; layer: Layer };
/**
 * A ball trapped on a short track, resting at a and free to run up to b. The play ball knocks it up the
 * track; reaching b counts as a hit, and gravity rolls it back. The table walls the track in.
 */
export type Captive = { id: string; ax: number; ay: number; bx: number; by: number; layer: Layer };
/**
 * A ramp: a raised lane from a mouth on the playfield up to a ride or a deck. The first `rise` units
 * climb, pulling the ball back with `lift`, so a weak shot rolls back down.
 */
export type Ramp = { id: string; path: P[]; width: number; rise: number; lift: number; ride?: string; color: string };
/**
 * A wireform or tunnel: the ball follows the path, starting at `speed`. Open wireforms speed up downhill
 * and slow uphill (never below half `speed`); hidden tunnels run at a steady `speed`. The ball leaves with
 * the exit velocity, or with `carry` along the path's last heading at the speed it rode.
 */
export type Ride = { id: string; path: P[]; speed: number; exit: { vx: number; vy: number; layer: Layer }; hidden?: boolean; carry?: boolean };
/** A toy the rules move about: a ghost, a ship, a dragon. Solid when the rules say so. */
export type Mover = { id: string; r: number; layer: Layer; e: number; at: P };
export type Magnet = { id: string; x: number; y: number; r: number; strength: number; layer: Layer };
export type Lane = { x: number; wall: number; plungerY: number; travel: number };

export type TableDef = {
	arch: { x: number; y: number; r: number };
	walls: Wall[];
	posts: Post[];
	bumpers: Bumper[];
	flippers: FlipperDef[];
	banks: Bank[];
	standups: Standup[];
	spinners: Spinner[];
	sensors: Sensor[];
	holes: Hole[];
	ramps: Ramp[];
	rides: Ride[];
	movers: Mover[];
	magnets: Magnet[];
	discs: Disc[];
	captives: Captive[];
	lane: Lane;
	drainY: number;
};

export const mx = (x: number) => MIRROR - x;
export const mp = (p: P): P => ({ x: mx(p.x), y: p.y });

export function wall(a: P, b: P, opts: Partial<Wall> = {}): Wall {
	return { ax: a.x, ay: a.y, bx: b.x, by: b.y, t: 0.12, e: 0.35, kind: 'wall', layer: 0, ...opts };
}

export function poly(points: P[], opts: Partial<Wall> = {}): Wall[] {
	const out: Wall[] = [];
	for (let i = 1; i < points.length; i += 1) out.push(wall(points[i - 1]!, points[i]!, opts));
	return out;
}

export function mirrorWall(w: Wall): Wall {
	const side = w.side === 'left' ? 'right' : w.side === 'right' ? 'left' : undefined;
	return { ...w, ax: mx(w.ax), bx: mx(w.bx), side, nx: w.nx == null ? undefined : -w.nx };
}

export function arc(c: P, r: number, fromDeg: number, toDeg: number, stepDeg = 5): P[] {
	const out: P[] = [];
	const n = Math.max(1, Math.round(Math.abs(toDeg - fromDeg) / stepDeg));
	for (let i = 0; i <= n; i += 1) {
		const a = ((fromDeg + ((toDeg - fromDeg) * i) / n) * Math.PI) / 180;
		out.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r });
	}
	return out;
}

export function archPoint(arch: TableDef['arch'], deg: number, r = arch.r): P {
	const a = (deg * Math.PI) / 180;
	return { x: arch.x + Math.cos(a) * r, y: arch.y + Math.sin(a) * r };
}

/** Points along a smooth curve through the given control points (Catmull-Rom). */
export function curve(points: P[], perSpan = 6): P[] {
	if (points.length < 3) return points.slice();
	const out: P[] = [points[0]!];
	for (let i = 0; i < points.length - 1; i += 1) {
		const p0 = points[Math.max(0, i - 1)]!;
		const p1 = points[i]!;
		const p2 = points[i + 1]!;
		const p3 = points[Math.min(points.length - 1, i + 2)]!;
		for (let k = 1; k <= perSpan; k += 1) {
			const t = k / perSpan;
			const t2 = t * t;
			const t3 = t2 * t;
			out.push({
				x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
				y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
			});
		}
	}
	return out;
}

/** Offset a polyline sideways; positive goes to the left of travel. */
export function offset(path: P[], d: number): P[] {
	return path.map((p, i) => {
		const a = path[Math.max(0, i - 1)]!;
		const b = path[Math.min(path.length - 1, i + 1)]!;
		const dx = b.x - a.x;
		const dy = b.y - a.y;
		const len = Math.hypot(dx, dy) || 1;
		return { x: p.x + (dy / len) * d, y: p.y - (dx / len) * d };
	});
}

/** The rails either side of a ramp, on the raised layer. The mouth stays open. */
export function rampRails(ramp: Ramp): Wall[] {
	const half = ramp.width / 2;
	const opts: Partial<Wall> = { t: 0.1, e: 0.3, kind: 'rail', layer: 1 };
	const end = ramp.path[ramp.path.length - 1]!;
	const prev = ramp.path[ramp.path.length - 2]!;
	const left = offset(ramp.path, half);
	const right = offset(ramp.path, -half);
	// A stop across the far end, past where the ride picks the ball up.
	const dx = end.x - prev.x;
	const dy = end.y - prev.y;
	const len = Math.hypot(dx, dy) || 1;
	const capA = { x: left[left.length - 1]!.x + (dx / len) * 0.6, y: left[left.length - 1]!.y + (dy / len) * 0.6 };
	const capB = { x: right[right.length - 1]!.x + (dx / len) * 0.6, y: right[right.length - 1]!.y + (dy / len) * 0.6 };
	return [...poly([...left, capA], opts), ...poly([...right, capB], opts), wall(capA, capB, opts)];
}

export function pathLength(path: P[]) {
	let len = 0;
	for (let i = 1; i < path.length; i += 1) len += Math.hypot(path[i]!.x - path[i - 1]!.x, path[i]!.y - path[i - 1]!.y);
	return len;
}

/** Position and heading a distance along a polyline. */
export function along(path: P[], s: number) {
	let left = Math.max(0, s);
	for (let i = 1; i < path.length; i += 1) {
		const a = path[i - 1]!;
		const b = path[i]!;
		const len = Math.hypot(b.x - a.x, b.y - a.y);
		if (left <= len || i === path.length - 1) {
			const t = len ? Math.min(1, left / len) : 0;
			return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, dx: len ? (b.x - a.x) / len : 0, dy: len ? (b.y - a.y) / len : 1 };
		}
		left -= len;
	}
	const p = path[path.length - 1]!;
	return { x: p.x, y: p.y, dx: 0, dy: 1 };
}

export function sling(side: Side, a: P, b: P, c: P, kick: number): { walls: Wall[]; posts: Post[] } {
	const s = side === 'left' ? (p: P) => p : mp;
	const [pa, pb, pc] = [s(a), s(b), s(c)];
	return {
		walls: [
			wall(pa, pb, { e: 0.4 }),
			wall(pb, pc, { e: 0.4 }),
			wall(pa, pc, { t: 0.18, e: 0.6, kind: 'sling', side, kick })
		],
		posts: [pa, pb, pc].map((p) => ({ x: p.x, y: p.y, r: 0.3, e: 0.6, layer: 0 as Layer, kind: 'rubber' as const }))
	};
}

/** The outlane guard: from the side wall at y0 out to x at y1. */
export const OUT_GUARD = { y0: 22.4, x: 1.25, y1: 24.0 };

export type LowerOptions = {
	/** Flipper pivot (left side; the right mirrors). */
	pivot?: P;
	len?: number;
	slingKick?: number;
	/** How far in from the wall the inlane guide runs. */
	guideX?: number;
	/** Bottom of the outlane, where it turns into the drain. */
	outlaneY?: number;
};

/**
 * The lower playfield most tables share: slingshots, inlane guides that end inside the flipper
 * pivots (no pocket for a cradled ball to settle in), outlanes and flippers. Sensors: inL, inR, outL, outR.
 */
export function lower(opts: LowerOptions = {}) {
	const pivot = opts.pivot ?? { x: 5.8, y: 32.4 };
	const len = opts.len ?? 2.9;
	const gx = opts.guideX ?? 1.8;
	const kick = opts.slingKick ?? 15;
	const guide = [
		{ x: gx, y: 25.6 },
		{ x: gx, y: 29.2 },
		{ x: pivot.x - 0.05, y: pivot.y - 0.35 }
	];
	const left = sling('left', { x: 3.4, y: 25.8 }, { x: 3.5, y: 28.4 }, { x: 5.7, y: 29.8 }, kick);
	const right = sling('right', { x: 3.4, y: 25.8 }, { x: 3.5, y: 28.4 }, { x: 5.7, y: 29.8 }, kick);
	const guideWalls = poly(guide, { t: 0.12, e: 0.35, kind: 'guide' });
	// A rubber angled off the side wall above the outlane turns a ball running down the wall back into play.
	// One-way, so a kickback firing up the outlane passes under it.
	const gx0 = 0.45;
	const glen = Math.hypot(OUT_GUARD.x - gx0, OUT_GUARD.y1 - OUT_GUARD.y0);
	guideWalls.push(
		wall({ x: gx0, y: OUT_GUARD.y0 }, { x: OUT_GUARD.x, y: OUT_GUARD.y1 }, { t: 0.14, e: 0.7, kind: 'rubber', nx: (OUT_GUARD.y1 - OUT_GUARD.y0) / glen, ny: -(OUT_GUARD.x - gx0) / glen })
	);
	const flippers: FlipperDef[] = [
		{ id: 'L', side: 'left', px: pivot.x, py: pivot.y, len, rb: 0.42, rt: 0.2, rest: 0.52, up: -0.42, layer: 0 },
		{ id: 'R', side: 'right', px: mx(pivot.x), py: pivot.y, len, rb: 0.42, rt: 0.2, rest: Math.PI - 0.52, up: Math.PI + 0.42, layer: 0 }
	];
	return {
		walls: [...guideWalls, ...guideWalls.map(mirrorWall), ...left.walls, ...right.walls],
		posts: [
			...left.posts,
			...right.posts,
			{ x: gx, y: 25.6, r: 0.26, e: 0.65, layer: 0 as Layer, kind: 'rubber' as const },
			{ x: mx(gx), y: 25.6, r: 0.26, e: 0.65, layer: 0 as Layer, kind: 'rubber' as const }
		],
		flippers,
		sensors: [
			{ id: 'inL', x: gx + 0.8, y: 27.6, r: 0.6, layer: 0 as Layer, kind: 'rollover' as const },
			{ id: 'inR', x: mx(gx + 0.8), y: 27.6, r: 0.6, layer: 0 as Layer, kind: 'rollover' as const },
			{ id: 'outL', x: gx - 0.7, y: 31, r: 0.55, layer: 0 as Layer, kind: 'rollover' as const },
			{ id: 'outR', x: mx(gx - 0.7), y: 31, r: 0.55, layer: 0 as Layer, kind: 'rollover' as const }
		]
	};
}

export const ARCH = { x: 10, y: 10, r: 9.6 };
export const LANE: Lane = { x: 18.9, wall: 18.2, plungerY: 35, travel: 1.1 };

/** The cabinet walls: left wall, top arch, right wall, the shooter lane and its one-way gate. */
export function shell(arch = ARCH, gateY = 12) {
	const points: P[] = [{ x: 0.4, y: 37.5 }, ...arc(arch, arch.r, 180, 360), { x: 19.6, y: 37.5 }];
	const gate = { ax: LANE.wall, ay: gateY, bx: 19.6, by: gateY - 1.4 };
	return [
		...poly(points, { t: 0.1, e: 0.32 }),
		wall({ x: LANE.wall, y: 37.5 }, { x: gate.ax, y: gate.ay }, { t: 0.14, e: 0.3 }),
		{ ...gate, t: 0.08, e: 0.3, kind: 'gate' as const, layer: 0 as Layer, nx: -Math.SQRT1_2, ny: -Math.SQRT1_2 }
	];
}

export function emptyDef(): TableDef {
	return {
		arch: ARCH,
		walls: [],
		posts: [],
		bumpers: [],
		flippers: [],
		banks: [],
		standups: [],
		spinners: [],
		sensors: [],
		holes: [],
		ramps: [],
		rides: [],
		movers: [],
		magnets: [],
		discs: [],
		captives: [],
		lane: LANE,
		drainY: FIELD_H + 0.8
	};
}

/** Merge partial definitions (shell, lower playfield, the table's own features) into one. */
export function build(...parts: Array<Partial<TableDef>>): TableDef {
	const def = emptyDef();
	for (const part of parts) {
		for (const [key, value] of Object.entries(part) as Array<[keyof TableDef, unknown]>) {
			if (Array.isArray(value)) (def[key] as unknown[]).push(...value);
			else if (value != null) (def as Record<string, unknown>)[key] = value;
		}
	}
	for (const ramp of def.ramps) def.walls.push(...rampRails(ramp));
	return def;
}
