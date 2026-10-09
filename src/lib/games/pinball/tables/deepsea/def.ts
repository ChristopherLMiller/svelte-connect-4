import { build, lower, shell, type P, type TableDef } from '../../engine/def';
import { LANES_3, ORBIT_SPINNER, sideRamps, topLanes } from '../parts';

/**
 * The Abyss: open water, no orbit walls, so a ball sent up either side sweeps over the top and down the
 * other. A whirlpool turns in the middle of the table, dragging every ball that crosses it, with the kraken
 * lurking beyond it at the top. The trench scoop on the left tunnels under to the right side; the grotto
 * hides up by the vent.
 */
export const LANES = LANES_3;
export const KRAKEN = { x: 9.3, y: 7.0, reach: 1.8, r: 0.95 };
export const WHIRLPOOL = { x: 9.3, y: 13.8, r: 2.1 };
/** Calm and stirred speeds, radians a second; positive turns clockwise. */
export const SPIN = { calm: 2.6, stirred: 4.2 };
export const BUMPERS = [
	{ x: 5.7, y: 11.6 },
	{ x: 12.6, y: 11.2 },
	{ x: 4.3, y: 7.6 }
];
/** The undertow magnet sits in the eye of the whirlpool. */
export const UNDERTOW = { x: WHIRLPOOL.x, y: WHIRLPOOL.y, r: 1.1 };
export const GROTTO = { x: 12.5, y: 7.9 };
export const TRENCH = { x: 4.3, y: 16.0 };
/** The pearls stand up the right side, between the vent and the wall, facing the left flipper. */
export const PEARL_X = 15.86;
export const PEARLS = [0, 1, 2].map((i) => ({ x: PEARL_X, y: 9.8 + i * 1.0 }));

/** Under the playfield from the trench scoop to the top of the right side. */
const TUNNEL: P[] = [
	{ x: TRENCH.x, y: TRENCH.y },
	{ x: 9.3, y: 20.0 },
	{ x: 15.0, y: 16.0 },
	{ x: 17.15, y: 9.6 }
];

export const deepseaDef: TableDef = build(
	{ walls: shell() },
	lower(),
	topLanes(LANES),
	sideRamps(null, { id: 'vent', color: '#ff8a5a' }),
	{
		sensors: [
			{ id: 'orbitL', x: 1.3, y: 12.2, r: 0.8, layer: 0, kind: 'opto' },
			{ id: 'orbitR', x: 17.2, y: 13.2, r: 0.8, layer: 0, kind: 'opto' }
		],
		bumpers: BUMPERS.map((b) => ({ ...b, r: 0.95, kick: 19, layer: 0 as const })),
		standups: PEARLS.map((p, i) => ({ id: `pearl${i}`, ax: PEARL_X, ay: p.y - 0.42, bx: PEARL_X, by: p.y + 0.42, layer: 0 as const })),
		spinners: [{ id: 'current', ...ORBIT_SPINNER, layer: 0 }],
		rides: [{ id: 'trenchRun', path: TUNNEL, speed: 22, hidden: true, exit: { vx: 0, vy: 9, layer: 0 } }],
		holes: [
			{ id: 'grotto', x: GROTTO.x, y: GROTTO.y, r: 0.6, layer: 0, maxSpeed: 30, hold: 1.6, kind: 'saucer', eject: { vx: -3, vy: 9, jitter: 1.4 } },
			{ id: 'trench', x: TRENCH.x, y: TRENCH.y, r: 0.6, layer: 0, maxSpeed: 32, hold: 0.7, kind: 'scoop', eject: { vx: 0, vy: 0, jitter: 0, ride: 'trenchRun' } }
		],
		discs: [{ id: 'whirlpool', ...WHIRLPOOL, spin: SPIN.calm, layer: 0 }],
		magnets: [{ id: 'undertow', x: UNDERTOW.x, y: UNDERTOW.y, r: UNDERTOW.r, strength: 90, layer: 0 }],
		movers: [{ id: 'kraken', r: KRAKEN.r, layer: 0, e: 0.7, at: { x: KRAKEN.x, y: KRAKEN.y } }]
	}
);
