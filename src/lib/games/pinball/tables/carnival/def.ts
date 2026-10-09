import { build, lower, shell, type TableDef } from '../../engine/def';
import { bankRoof, LANES_3, ORBIT_SPINNER, orbits, sideRamps, topLanes } from '../parts';

export const LANES = LANES_3;
export const ZELDA = { x: 6.4, y: 14.5 };
export const PHANTOM = { x: 9.3, y: 20.2, reach: 2.4 };
export const FATE_Y = 13.6;

export const carnivalDef: TableDef = build(
	{ walls: shell() },
	lower(),
	orbits(),
	topLanes(LANES),
	sideRamps({ id: 'train', color: '#7dff9a', ride: 'trainRide' }, { id: 'wheel', color: '#ffc24a', ride: 'wheelRide' }),
	{
		walls: bankRoof(7.6, 7.6 + 3 * 0.9 + 0.78, FATE_Y),
		bumpers: [
			{ x: 7.4, y: 8.3, r: 0.95, kick: 19, layer: 0 },
			{ x: 11.2, y: 8.3, r: 0.95, kick: 19, layer: 0 },
			{ x: 9.3, y: 10.6, r: 0.95, kick: 19, layer: 0 }
		],
		banks: [
			{
				id: 'fate',
				letters: 'FATE',
				layer: 0,
				targets: [0, 1, 2, 3].map((i) => ({ ax: 7.6 + i * 0.9, ay: FATE_Y, bx: 8.38 + i * 0.9, by: FATE_Y }))
			}
		],
		spinners: [{ id: 'mirror', ...ORBIT_SPINNER, layer: 0 }],
		holes: [
			{ id: 'zelda', x: ZELDA.x, y: ZELDA.y, r: 0.6, layer: 0, maxSpeed: 30, hold: 1.6, kind: 'saucer', eject: { vx: -0.4, vy: 10, jitter: 1.4 } }
		],
		movers: [{ id: 'phantom', r: 0.8, layer: 0, e: 0.75, at: { x: PHANTOM.x, y: PHANTOM.y } }]
	}
);
