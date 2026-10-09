import { build, curve, lower, shell, type Aim, type P, type Ramp, type TableDef } from '../../engine/def';
import { LANES_3, ORBIT_SPINNER, orbits, RIDE_L, sideRamps, topLanes } from '../parts';

/**
 * Wild West: the express runs a long track right across the top under the gun lanes. The mine is a
 * ramp straight up the middle whose cart track swings over the corral of bumpers on the left and down
 * to the left inlane; the railroad ramp is up the right. Outlaws stand in a row on the right, the
 * bank vault beside them, and the saloon down on the left.
 */
export const LANES = LANES_3;
export const TRAIN = { x: 9.3, y: 6.7, reach: 3.6, r: 0.85 };
export const BUMPERS = [
	{ x: 4.9, y: 10.5 },
	{ x: 7.2, y: 9.6 },
	{ x: 6.5, y: 12.1 }
];
export const SALOON = { x: 5.0, y: 15.3 };
/** The saloon six-shooter swings between the corral and the outlaws until a flipper fires it. */
export const QUICK_DRAW: Aim = { from: -1.3, to: 0.05, rate: 0.7, speed: 26, wait: 5 };
export const VAULT = { x: 12.3, y: 10.6 };
/** The outlaws, a diagonal row facing the left flipper, from the vault down toward the middle. */
const OUTLAW_A = { x: 10.6, y: 16.0 };
const OUTLAW_B = { x: 12.8, y: 14.5 };
const odir = { x: (OUTLAW_B.x - OUTLAW_A.x) / 3, y: (OUTLAW_B.y - OUTLAW_A.y) / 3 };
export const OUTLAW_TARGETS = [0, 1, 2].map((i) => ({
	ax: OUTLAW_A.x + odir.x * (i + 0.08),
	ay: OUTLAW_A.y + odir.y * (i + 0.08),
	bx: OUTLAW_A.x + odir.x * (i + 0.92),
	by: OUTLAW_A.y + odir.y * (i + 0.92)
}));
export const OUTLAWS = OUTLAW_TARGETS.map((tg) => ({ x: (tg.ax + tg.bx) / 2, y: (tg.ay + tg.by) / 2 }));

/** Straight up the middle. */
export const MINE: P[] = [
	{ x: 9.3, y: 17.6 },
	{ x: 9.3, y: 13.4 },
	{ x: 9.3, y: 9.8 }
];
/** The cart track: off the top of the mine ramp, left over the corral, and down the left side. */
const CART: P[] = curve(
	[{ x: 9.3, y: 9.6 }, { x: 8.6, y: 8.0 }, { x: 6.0, y: 7.7 }, { x: 3.0, y: 8.4 }, { x: 1.6, y: 10.6 }, ...RIDE_L.filter((p) => p.y > 12)],
	4
);
const mine: Ramp = { id: 'mine', path: MINE, width: 1.6, rise: 6, lift: 16, ride: 'cart', color: '#d49a5a' };

export const westernDef: TableDef = build(
	{ walls: shell() },
	lower(),
	orbits({ flap: false }, {}),
	topLanes(LANES),
	sideRamps(null, { id: 'rail', color: '#ffd24a' }),
	{
		ramps: [mine],
		rides: [{ id: 'cart', path: CART, speed: 15, exit: { vx: 0.2, vy: 6, layer: 0 }, carry: true }],
		bumpers: BUMPERS.map((b) => ({ ...b, r: 0.95, kick: 19, layer: 0 as const })),
		standups: OUTLAW_TARGETS.map((tg, i) => ({ id: `outlaw${i}`, ...tg, layer: 0 as const })),
		spinners: [{ id: 'dial', ...ORBIT_SPINNER, layer: 0 }],
		holes: [
			{ id: 'saloon', x: SALOON.x, y: SALOON.y, r: 0.6, layer: 0, maxSpeed: 30, hold: 1.6, kind: 'saucer', eject: { vx: 0.6, vy: 10, jitter: 1.4 }, aim: QUICK_DRAW },
			{ id: 'vault', x: VAULT.x, y: VAULT.y, r: 0.6, layer: 0, maxSpeed: 30, hold: 1.6, kind: 'scoop', toggle: 'vault', eject: { vx: -0.6, vy: 10, jitter: 1.4 } }
		],
		movers: [{ id: 'train', r: TRAIN.r, layer: 0, e: 0.7, at: { x: TRAIN.x, y: TRAIN.y } }]
	}
);
