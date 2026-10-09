import { arc, ARCH, build, curve, lower, poly, shell, type FlipperDef, type P, type TableDef, type Wall } from '../../engine/def';
import { ORBIT_SPINNER, orbits, RAMP_R, RIDE_R, sideRamps } from '../parts';

/**
 * Dragon's Keep: a raised deck across the top, between the ramps, with its own flipper and the dragon
 * on it. The tower ramp lifts the ball up there; the lair at the bottom of the deck drops it back to
 * the right inlane. Below, a portcullis guards the keep.
 */
export const KEEP = { x: 6.4, y: 14.5 };
export const GATE = { x: 6.4, y: 16.0, r: 0.75 };
export const DRAGON = { x: 9.3, y: 3.5, reach: 1.7, r: 0.8 };
export const LAIR = { x: 9.6, y: 9.6 };
export const DECK_FLIPPER: FlipperDef = { id: 'D', side: 'right', px: 12.1, py: 7.4, len: 2.1, rb: 0.36, rt: 0.18, rest: Math.PI - 0.5, up: Math.PI + 0.45, layer: 1 };
export const BUMPERS = [
	{ x: 7.4, y: 11.8 },
	{ x: 11.2, y: 11.8 },
	{ x: 9.3, y: 13.7 }
];

const top = arc(ARCH, 9.45, 243, 288);
const TL = top[0]!;
const TR = top[top.length - 1]!;
/**
 * The deck's outline. The right wall runs down into an inlane that ends inside the flipper's pivot;
 * the left wall slopes into the drain past the flipper's tip, and a V under both funnels into the lair.
 */
export const DECK = {
	left: [{ x: 8.9, y: 8.7 }, { x: TL.x, y: 6.0 }, TL] as P[],
	top,
	right: [TR, { x: TR.x, y: 6.4 }, { x: 12.25, y: 7.05 }] as P[],
	vLeft: [{ x: 8.9, y: 8.7 }, { x: 9.6, y: 10.1 }] as P[],
	vRight: [{ x: 12.1, y: 7.85 }, { x: 9.6, y: 10.1 }] as P[]
};

const deck: Partial<Wall> = { t: 0.12, e: 0.35, kind: 'wall', layer: 1 };
const deckWalls: Wall[] = [
	...poly(DECK.left, deck),
	...poly(DECK.top, deck),
	...poly(DECK.right, deck),
	...poly(DECK.vLeft, { ...deck, kind: 'guide' }),
	...poly(DECK.vRight, { ...deck, kind: 'guide' })
];

/** Off the top of the tower ramp, over and down the deck's right wall onto its inlane. */
const LIFT: P[] = curve(
	[
		{ x: 14.6, y: 6.2 },
		{ x: 14.5, y: 4.0 },
		{ x: 13.4, y: 2.4 },
		{ x: 12.25, y: 2.4 }
	],
	5
);
const hoardTop = arc(ARCH, 9.1, 255, 262);
/** From the lair, across behind the tower ramp and down the right wireform to the inlane. */
const DROP: P[] = curve([{ x: LAIR.x, y: LAIR.y }, { x: 11.6, y: 9.9 }, { x: 14.8, y: 8.6 }, { x: 16.6, y: 9.4 }, ...RIDE_R.filter((p) => p.y > 11)], 4);

const ramps = sideRamps({ id: 'bridge', color: '#ffb84a' }, null);

export const dragonDef: TableDef = build(
	{ walls: shell() },
	lower(),
	orbits({ flap: false }, {}),
	ramps,
	{
		walls: deckWalls,
		ramps: [{ id: 'tower', path: RAMP_R, width: 1.6, rise: 8, lift: 16, ride: 'lift', color: '#ff5a3a' }],
		rides: [
			{ id: 'lift', path: LIFT, speed: 16, exit: { vx: -0.6, vy: 2, layer: 1 } },
			{ id: 'drop', path: DROP, speed: 14, exit: { vx: -0.2, vy: 6, layer: 0 }, carry: true }
		],
		flippers: [DECK_FLIPPER],
		bumpers: BUMPERS.map((b) => ({ ...b, r: 0.95, kick: 19, layer: 0 as const })),
		standups: [
			{ id: 'hoard0', ax: TL.x + 0.12, ay: 2.8, bx: TL.x + 0.12, by: 4.4, layer: 1 },
			{ id: 'hoard1', ax: hoardTop[0]!.x, ay: hoardTop[0]!.y, bx: hoardTop[hoardTop.length - 1]!.x, by: hoardTop[hoardTop.length - 1]!.y, layer: 1 }
		],
		spinners: [{ id: 'banner', ...ORBIT_SPINNER, layer: 0 }],
		holes: [
			{ id: 'keep', x: KEEP.x, y: KEEP.y, r: 0.6, layer: 0, maxSpeed: 30, hold: 1.6, kind: 'saucer', toggle: 'keep', eject: { vx: -0.4, vy: 10, jitter: 1.4 } },
			{ id: 'lair', x: LAIR.x, y: LAIR.y, r: 0.55, layer: 1, maxSpeed: 99, hold: 0.4, kind: 'sink', eject: { vx: 0, vy: 0, jitter: 0, ride: 'drop' } }
		],
		movers: [
			{ id: 'gate', r: GATE.r, layer: 0, e: 0.6, at: { x: GATE.x, y: GATE.y } },
			{ id: 'dragon', r: DRAGON.r, layer: 1, e: 0.75, at: { x: DRAGON.x, y: DRAGON.y } }
		]
	}
);
