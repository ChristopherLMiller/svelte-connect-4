import { build, lower, mx, shell, wall, type FlipperDef, type Post, type TableDef } from '../../engine/def';
import { topLanes } from '../parts';

/**
 * A 1962 woodrail with four flippers: a short pair at the foot with a wide gap and a post between them,
 * and a second pair halfway up the sides, fed by guides off the walls. Four top lanes, five pop bumpers,
 * a kick-out hole and two side targets. No orbits, no ramps, no toys.
 */
export const LANES = [6.45, 8.35, 10.25, 12.15];
export const KICKOUT = { x: 9.3, y: 15.4 };
export const BUMPERS = [
	{ x: 6.9, y: 8.4 },
	{ x: 11.7, y: 8.4 },
	{ x: 9.3, y: 11.0 },
	{ x: 6.4, y: 21.8 },
	{ x: 12.2, y: 21.8 }
];
export const CENTRE_POST = { x: 9.3, y: 33.9 };
/** The upper pair, out by the walls. */
export const MID_L: FlipperDef = { id: 'ML', side: 'left', px: 2.3, py: 18.8, len: 2.3, rb: 0.38, rt: 0.2, rest: 0.52, up: -0.42, layer: 0 };
export const MID_R: FlipperDef = { ...MID_L, id: 'MR', side: 'right', px: mx(MID_L.px), rest: Math.PI - 0.52, up: Math.PI + 0.42 };

const rubberPosts: Post[] = [
	{ x: 3.0, y: 10.6, r: 0.32, e: 0.7, layer: 0, kind: 'rubber' },
	{ x: mx(3.0), y: 10.6, r: 0.32, e: 0.7, layer: 0, kind: 'rubber' },
	{ x: 7.6, y: 14.2, r: 0.26, e: 0.6, layer: 0, kind: 'rubber' },
	{ x: mx(7.6), y: 14.2, r: 0.26, e: 0.6, layer: 0, kind: 'rubber' },
	{ ...CENTRE_POST, r: 0.38, e: 0.6, layer: 0, kind: 'rubber' }
];

/** Off each side wall onto the shoulder of the upper flipper's pivot: nothing gets behind it. */
const feeds = [
	wall({ x: 0.45, y: 16.4 }, { x: MID_L.px - 0.3, y: MID_L.py - 0.3 }, { t: 0.12, e: 0.35, kind: 'guide' }),
	wall({ x: mx(0.45), y: 16.4 }, { x: MID_R.px + 0.3, y: MID_R.py - 0.3 }, { t: 0.12, e: 0.35, kind: 'guide' })
];

export const woodrailDef: TableDef = build(
	{ walls: shell() },
	lower({ pivot: { x: 5.6, y: 32.4 }, len: 2.3, slingKick: 16 }),
	topLanes(LANES),
	{
		// The leftmost guide runs up to the arch, so a plunged ball drops into a lane: how hard you plunge picks which.
		walls: [...feeds, wall({ x: LANES[0]! - 0.95, y: 1.3 }, { x: LANES[0]! - 0.95, y: 2.5 }, { t: 0.13, e: 0.3, kind: 'guide' })],
		posts: rubberPosts,
		flippers: [MID_L, MID_R],
		bumpers: BUMPERS.map((b) => ({ ...b, r: 1.0, kick: 18, layer: 0 as const })),
		standups: [
			{ id: 'sideL', ax: 0.62, ay: 13.0, bx: 0.62, by: 14.6, layer: 0, label: 'D' },
			{ id: 'sideR', ax: 17.98, ay: 13.0, bx: 17.98, by: 14.6, layer: 0, label: 'B' }
		],
		holes: [
			{ id: 'kickout', x: KICKOUT.x, y: KICKOUT.y, r: 0.6, layer: 0, maxSpeed: 26, hold: 1.2, kind: 'saucer', eject: { vx: 0, vy: -9, jitter: 6 } }
		]
	}
);
