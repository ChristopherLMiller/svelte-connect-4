import { build, curve, lower, mirrorWall, mx, offset, shell, wall, type FlipperDef, type P, type TableDef, type Wall } from '../../engine/def';
import { ORBIT_SPINNER, orbitSide, sideRamps, topLanes } from '../parts';

/**
 * A modern pirate table with a third flipper. The left orbit is gone: its lane comes down the left wall
 * onto a flipper halfway up, so a ball sent round the right orbit drops back onto it for a shot at the
 * ship, the M·A·P bank or the treasure chest, a captive ball you smash up into the lid. The plank ramp
 * is on the right; the mast scoop in the middle hoists the ball up into the rum lanes.
 */
export const LANES = [10.7, 12.6, 14.5];
export const BUMPERS = [
	{ x: 9.0, y: 7.9 },
	{ x: 12.5, y: 7.7 },
	{ x: 10.8, y: 10.5 }
];
export const COVE = { x: 6.6, y: 14.2 };
export const MAST = { x: 9.3, y: 17.2 };
export const SHIP = { x: 5.4, y: 7.4, reach: 1.1, r: 0.9 };
export const UPPER: FlipperDef = { id: 'U', side: 'left', px: 1.3, py: 18.3, len: 2.3, rb: 0.38, rt: 0.2, rest: 0.55, up: -0.35, layer: 0 };

/** The M·A·P drop bank, on a slant across the middle, facing down and left toward all three flippers. */
const MAP_A = { x: 7.5, y: 10.9 };
const MAP_B = { x: 9.5, y: 12.3 };
const mapDir = { x: (MAP_B.x - MAP_A.x) / 3, y: (MAP_B.y - MAP_A.y) / 3 };
const mapLen = Math.hypot(MAP_B.x - MAP_A.x, MAP_B.y - MAP_A.y);
/** Behind the bank, up and right, away from the flippers. */
const mapBack = { x: ((MAP_B.y - MAP_A.y) / mapLen) * 0.28, y: (-(MAP_B.x - MAP_A.x) / mapLen) * 0.28 };
export const MAP_FACE = { x: -mapBack.x / 0.28, y: -mapBack.y / 0.28 };
export const MAP = [0, 1, 2].map((i) => ({
	ax: MAP_A.x + mapDir.x * (i + 0.08),
	ay: MAP_A.y + mapDir.y * (i + 0.08),
	bx: MAP_A.x + mapDir.x * (i + 0.92),
	by: MAP_A.y + mapDir.y * (i + 0.92)
}));

/** The treasure chest: a captive ball resting at the mouth of a short lane, the lid at the far end. */
export const CHEST = { ax: 11.3, ay: 14.9, bx: 12.1, by: 13.0 };
const chestPath: P[] = [
	{ x: CHEST.ax, y: CHEST.ay },
	{ x: CHEST.bx, y: CHEST.by }
];
const chestLen = Math.hypot(CHEST.bx - CHEST.ax, CHEST.by - CHEST.ay);
const chestT = { x: (CHEST.bx - CHEST.ax) / chestLen, y: (CHEST.by - CHEST.ay) / chestLen };
/** Where the lid sits, just past the captive ball's furthest reach. */
export const LID = { x: CHEST.bx + chestT.x * 0.62, y: CHEST.by + chestT.y * 0.62 };
const chestWalls: Wall[] = (() => {
	const reach = [chestPath[0]!, { x: LID.x + chestT.x * 0.1, y: LID.y + chestT.y * 0.1 }];
	const left = offset(reach, 0.58);
	const right = offset(reach, -0.58);
	const opts: Partial<Wall> = { t: 0.12, e: 0.3 };
	return [wall(left[0]!, left[1]!, opts), wall(right[0]!, right[1]!, opts), wall(left[1]!, right[1]!, opts)];
})();

/** Up the mast inside the playfield, out over the crow's nest and down into the middle rum lane. */
const HOIST: P[] = curve(
	[
		{ x: MAST.x, y: MAST.y },
		{ x: 9.3, y: 9.0 },
		{ x: 10.0, y: 2.6 },
		{ x: 12.6, y: 2.0 }
	],
	5
);

export const pirateDef: TableDef = build(
	{ walls: shell() },
	lower(),
	topLanes(LANES),
	sideRamps(null, { id: 'plank', color: '#ffcf5a' }),
	{
		walls: [
			...orbitSide().map(mirrorWall),
			// The left orbit's inner wall makes a lane down onto the third flipper, fed only from round the top.
			...orbitSide({ deflector: false, flap: false }),
			// Off the left wall onto the shoulder of the third flipper's pivot, so nothing gets behind it.
			wall({ x: 0.45, y: 16.4 }, { x: UPPER.px - 0.27, y: UPPER.py - 0.3 }, { t: 0.12, e: 0.35, kind: 'guide' }),
			// The bank's backing plate and end caps.
			wall({ x: MAP_A.x + mapBack.x, y: MAP_A.y + mapBack.y }, { x: MAP_B.x + mapBack.x, y: MAP_B.y + mapBack.y }, { t: 0.12 }),
			wall(MAP_A, { x: MAP_A.x + mapBack.x, y: MAP_A.y + mapBack.y }, { t: 0.12 }),
			wall(MAP_B, { x: MAP_B.x + mapBack.x, y: MAP_B.y + mapBack.y }, { t: 0.12 }),
			...chestWalls
		],
		posts: [
			{ x: 2.5, y: 16.2, r: 0.2, e: 0.5, layer: 0, kind: 'metal' },
			{ x: mx(2.5), y: 16.2, r: 0.2, e: 0.5, layer: 0, kind: 'metal' },
			{ x: MAP_A.x, y: MAP_A.y, r: 0.16, e: 0.4, layer: 0, kind: 'metal' },
			{ x: MAP_B.x, y: MAP_B.y, r: 0.16, e: 0.4, layer: 0, kind: 'metal' }
		],
		sensors: [
			{ id: 'orbitL', x: 1.25, y: 11.6, r: 0.75, layer: 0, kind: 'opto' },
			{ id: 'orbitR', x: 17.15, y: 13.2, r: 0.7, layer: 0, kind: 'opto' }
		],
		flippers: [UPPER],
		bumpers: BUMPERS.map((b) => ({ ...b, r: 0.95, kick: 19, layer: 0 as const })),
		banks: [{ id: 'map', letters: 'MAP', layer: 0, targets: MAP }],
		captives: [{ id: 'chest', ...CHEST, layer: 0 }],
		spinners: [{ id: 'compass', ...ORBIT_SPINNER, layer: 0 }],
		rides: [{ id: 'hoist', path: HOIST, speed: 18, hidden: true, exit: { vx: 0, vy: 4, layer: 0 } }],
		holes: [
			{ id: 'cove', x: COVE.x, y: COVE.y, r: 0.6, layer: 0, maxSpeed: 30, hold: 1.6, kind: 'saucer', eject: { vx: -0.6, vy: 10, jitter: 1.4 } },
			{ id: 'mast', x: MAST.x, y: MAST.y, r: 0.6, layer: 0, maxSpeed: 32, hold: 0.9, kind: 'scoop', eject: { vx: 0, vy: 0, jitter: 0, ride: 'hoist' } },
			{ id: 'wreck', x: SHIP.x, y: SHIP.y, r: 0.7, layer: 0, maxSpeed: 28, hold: 1.4, kind: 'sink', toggle: 'wreck', eject: { vx: 0.4, vy: 12, jitter: 5 } }
		],
		movers: [{ id: 'ship', r: SHIP.r, layer: 0, e: 0.7, at: { x: SHIP.x, y: SHIP.y } }]
	}
);
