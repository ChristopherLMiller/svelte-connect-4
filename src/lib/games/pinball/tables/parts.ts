import { arc, ARCH, curve, mirrorWall, mx, poly, wall, type Layer, type P, type Ramp, type Ride, type Sensor, type Wall } from '../engine/def';

/**
 * Pieces of playfield the tables share, all proven by the check bot: orbits up both sides, ramp
 * mouths either side of the centre with wireforms back to the inlanes, and top lanes under the arch.
 */

/** Inner wall of the left orbit: from its foot, curling up along the arch. */
const orbitInner: P[] = [{ x: 2.5, y: 16.2 }, ...arc(ARCH, 7.5, 180, 205)];
/** One-way, so a ball coming down the orbit is turned into play but a kickback can still go up. */
const deflector = { ax: 0.4, ay: 15.6, bx: 2.9, by: 20.4 };
const dlen = Math.hypot(deflector.bx - deflector.ax, deflector.by - deflector.ay);
const dn = { x: (deflector.by - deflector.ay) / dlen, y: -(deflector.bx - deflector.ax) / dlen };

export type OrbitSide = { deflector?: boolean; flap?: boolean };

/** The left orbit's walls; mirror them for the right. */
export function orbitSide(opts: OrbitSide = {}): Wall[] {
	const out: Wall[] = [...poly(orbitInner, { t: 0.13, e: 0.35, kind: 'guide' })];
	if (opts.deflector !== false) out.push({ ...deflector, t: 0.12, e: 0.45, kind: 'guide', layer: 0, nx: dn.x, ny: dn.y });
	// A flap inside the ramp mouth, so a near miss bounces off rather than rolling under.
	if (opts.flap !== false) out.push(wall({ x: 5.5, y: 17.3 }, { x: 5.4, y: 15.6 }, { t: 0.1, kind: 'guide' }));
	return out;
}

export function orbits(left: OrbitSide = {}, right: OrbitSide = left) {
	return {
		walls: [...orbitSide(left), ...orbitSide(right).map(mirrorWall)],
		posts: [
			{ x: 2.5, y: 16.2, r: 0.2, e: 0.5, layer: 0 as Layer, kind: 'metal' as const },
			{ x: mx(2.5), y: 16.2, r: 0.2, e: 0.5, layer: 0 as Layer, kind: 'metal' as const }
		],
		sensors: [
			{ id: 'orbitL', x: 1.45, y: 12.2, r: 0.7, layer: 0 as Layer, kind: 'opto' as const },
			{ id: 'orbitR', x: 17.15, y: 13.2, r: 0.7, layer: 0 as Layer, kind: 'opto' as const }
		] satisfies Sensor[]
	};
}

export const ORBIT_LABEL = { left: { x: 1.45, y: 13.4 }, right: { x: 17.15, y: 13.4 } };
/** Where a spinner sits across the right orbit. */
export const ORBIT_SPINNER = { ax: 16.25, ay: 14.6, bx: 18.05, by: 14.6 };
/** The same across the left orbit, under the sensor. */
export const ORBIT_SPINNER_L = { ax: 0.55, ay: 14.6, bx: 2.35, by: 14.6 };

export const RAMP_L: P[] = curve(
	[
		{ x: 4.6, y: 17.2 },
		{ x: 4.4, y: 13.2 },
		{ x: 4.0, y: 9.0 },
		{ x: 4.0, y: 6.4 }
	],
	4
);
export const RAMP_R: P[] = RAMP_L.map((p) => ({ x: mx(p.x), y: p.y }));

/** From the top of the left ramp, round the corner and down the side to the left inlane. */
export const RIDE_L: P[] = curve(
	[
		{ x: 4.0, y: 6.2 },
		{ x: 3.4, y: 4.5 },
		{ x: 2.1, y: 5.0 },
		{ x: 1.35, y: 8.0 },
		{ x: 1.35, y: 20.0 },
		{ x: 1.9, y: 23.6 },
		{ x: 2.6, y: 25.3 }
	],
	5
);
export const RIDE_R: P[] = RIDE_L.map((p) => ({ x: mx(p.x), y: p.y }));

/** Mouth of each ramp, for arrows and labels. */
export const RAMP_MOUTH = { left: { x: 4.6, y: 18.5 }, right: { x: mx(4.6), y: 18.5 } };

export type SideRamp = { id: string; color: string; ride?: string };

/** A ramp up either side of the centre, each with a wireform back to its inlane. Pass null to leave one out. */
export function sideRamps(left: SideRamp | null, right: SideRamp | null): { ramps: Ramp[]; rides: Ride[] } {
	const ramps: Ramp[] = [];
	const rides: Ride[] = [];
	for (const [spec, path, ridePath, vx] of [
		[left, RAMP_L, RIDE_L, 0.2],
		[right, RAMP_R, RIDE_R, -0.2]
	] as const) {
		if (!spec) continue;
		const rideId = spec.ride ?? `${spec.id}Ride`;
		ramps.push({ id: spec.id, path, width: 1.6, rise: 8, lift: 16, ride: rideId, color: spec.color });
		rides.push({ id: rideId, path: ridePath, speed: 16, exit: { vx, vy: 6, layer: 0 }, carry: true });
	}
	return { ramps, rides };
}

/** Rollover lanes under the arch, with guides between and either side. */
export function topLanes(xs: number[], y = 3.6) {
	const gap = xs.length > 1 ? xs[1]! - xs[0]! : 1.9;
	const guides = [...xs.map((x) => x - gap / 2), xs[xs.length - 1]! + gap / 2];
	return {
		walls: guides.map((x) => wall({ x, y: y - 1.2 }, { x, y: y + 1 }, { t: 0.13, e: 0.4, kind: 'guide' })),
		sensors: xs.map((x, i) => ({ id: `lane${i}`, x, y, r: 0.55, layer: 0 as Layer, kind: 'rollover' as const }))
	};
}

export const LANES_3 = [7.55, 9.45, 11.35];

/**
 * A shallow peaked roof just behind a row of drop targets facing the flippers: a ball landing on the
 * bank from above rolls off the ends, and one through a dropped slot bounces straight back.
 */
export function bankRoof(x0: number, x1: number, y: number): Wall[] {
	const mid = (x0 + x1) / 2;
	const opts: Partial<Wall> = { t: 0.1, e: 0.35, kind: 'guide' };
	return [wall({ x: x0 - 0.1, y: y - 0.25 }, { x: mid, y: y - 0.58 }, opts), wall({ x: mid, y: y - 0.58 }, { x: x1 + 0.1, y: y - 0.25 }, opts)];
}

/** A one-way gate across the foot of an orbit: balls come down, nothing goes back up. */
export function orbitGate(side: 'left' | 'right', y = 16.0): Wall {
	const [ax, bx] = side === 'left' ? [0.45, 2.5] : [mx(2.5), 18.15];
	return { ...wall({ x: ax, y }, { x: bx, y }, { t: 0.08, e: 0.3, kind: 'gate' }), nx: 0, ny: 1 };
}
