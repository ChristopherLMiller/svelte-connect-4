import { arc, ARCH, build, lower, shell, wall, type FlipperDef, type TableDef } from '../../engine/def';
import { bankRoof, LANES_3, ORBIT_SPINNER_L, orbits, topLanes } from '../parts';

/**
 * 1984: big drop-target banks and an upper flipper. The left orbit loops over the top and comes
 * down the right side onto the upper flipper, which fires at the U·F·O bank in the top left.
 */
export const LANES = LANES_3;
export const WARP = { x: 6.4, y: 14.5 };
export const ALIEN_Y = 13.6;
export const UPPER: FlipperDef = { id: 'U', side: 'right', px: 17.6, py: 19.7, len: 2.3, rb: 0.4, rt: 0.2, rest: Math.PI - 0.45, up: Math.PI + 0.3, layer: 0 };
export const DIVERTER = { a: { x: 18.15, y: 16.5 }, b: { x: 15.0, y: 18.8 } };

/** The U·F·O bank faces down and right, toward the upper flipper. */
const UFO_A = { x: 3.3, y: 8.4 };
const UFO_B = { x: 5.6, y: 6.1 };
const ufoDir = { x: (UFO_B.x - UFO_A.x) / 3, y: (UFO_B.y - UFO_A.y) / 3 };
/** Behind the bank, toward the arch. */
const back = { x: -0.25, y: -0.25 };
export const UFO = [0, 1, 2].map((i) => ({
	ax: UFO_A.x + ufoDir.x * i + ufoDir.x * 0.08,
	ay: UFO_A.y + ufoDir.y * i + ufoDir.y * 0.08,
	bx: UFO_A.x + ufoDir.x * (i + 1) - ufoDir.x * 0.08,
	by: UFO_A.y + ufoDir.y * (i + 1) - ufoDir.y * 0.08
}));

export const BUMPERS = [
	{ x: 8.8, y: 7.8 },
	{ x: 12.2, y: 7.4 },
	{ x: 10.9, y: 10.6 }
];

export const spaceDef: TableDef = build(
	{ walls: shell() },
	lower(),
	orbits({ flap: false }, { flap: false, deflector: false }),
	topLanes(LANES),
	{
		walls: [
			// The bank's backing plate and end caps, so a dropped target leaves a shallow recess.
			wall({ x: UFO_A.x + back.x, y: UFO_A.y + back.y }, { x: UFO_B.x + back.x, y: UFO_B.y + back.y }, { t: 0.12 }),
			wall(UFO_A, { x: UFO_A.x + back.x, y: UFO_A.y + back.y }, { t: 0.12 }),
			wall(UFO_B, { x: UFO_B.x + back.x, y: UFO_B.y + back.y }, { t: 0.12 }),
			// A roof from the top of the orbit wall to the back of the bank: no V for a ball to sit in.
			wall(arc(ARCH, 7.5, 205, 205)[0]!, { x: UFO_B.x + back.x, y: UFO_B.y + back.y }, { t: 0.12, kind: 'guide' }),
			...bankRoof(7.15, 11.53, ALIEN_Y),
			// Turns a ball coming down the right orbit out onto the middle of the upper flipper; its underside
			// sheds a ball flipped from near the pivot instead of letting it bounce straight back down.
			wall(DIVERTER.a, DIVERTER.b, { t: 0.1, e: 0.3, kind: 'guide' }),
			// From the wall onto the pivot's shoulder, so nothing can sit on top of the pivot.
			wall({ x: 18.12, y: 18.45 }, { x: UPPER.px - 0.28, y: UPPER.py - 0.3 }, { t: 0.1, kind: 'guide' })
		],
		posts: [
			{ x: UFO_A.x, y: UFO_A.y, r: 0.16, e: 0.4, layer: 0, kind: 'metal' },
			{ x: UFO_B.x, y: UFO_B.y, r: 0.16, e: 0.4, layer: 0, kind: 'metal' }
		],
		flippers: [UPPER],
		bumpers: BUMPERS.map((b) => ({ ...b, r: 0.95, kick: 19, layer: 0 as const })),
		banks: [
			{ id: 'alien', letters: 'ALIEN', layer: 0, targets: [0, 1, 2, 3, 4].map((i) => ({ ax: 7.15 + i * 0.9, ay: ALIEN_Y, bx: 7.93 + i * 0.9, by: ALIEN_Y })) },
			{ id: 'ufo', letters: 'UFO', layer: 0, targets: UFO }
		],
		spinners: [{ id: 'nebula', ...ORBIT_SPINNER_L, layer: 0 }],
		holes: [{ id: 'warp', x: WARP.x, y: WARP.y, r: 0.6, layer: 0, maxSpeed: 30, hold: 1.4, kind: 'scoop', eject: { vx: -0.4, vy: 10, jitter: 1.4 } }]
	}
);
