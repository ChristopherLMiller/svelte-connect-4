import { archPoint, CX, type TableDef } from '../../engine/def';
import { radial, TAU, vgrad, type Bulb, type Insert, type TableArt } from '../../engine/art';
import { RAMP_MOUTH } from '../parts';
import { VOYAGES, type PirateState } from './rules';
import { BUMPERS, CHEST, COVE, LANES, LID, MAP, MAP_FACE, MAST, SHIP, UPPER } from './def';

const GOLD = '#ffcf5a';
const RED = '#ff4a3a';
const SEA = '#5ad1ff';
const JADE = '#7affd4';
const BONE = '#f4e6c4';
const DISPLAY = '"Pirata One", "Barlow Condensed", Georgia, serif';
const LABEL = '"Barlow Condensed", "Arial Narrow", sans-serif';

const up = -Math.PI / 2;
const inserts: Insert[] = [
	...LANES.map((x, i) => ({ id: `lane${i}`, x, y: 5.4, r: 0.42, color: GOLD, label: 'RUM'[i] })),
	...MAP.map((tg, i) => ({ id: `map${i}`, x: (tg.ax + tg.bx) / 2 + MAP_FACE.x * 0.75, y: (tg.ay + tg.by) / 2 + MAP_FACE.y * 0.75, r: 0.3, color: RED, label: 'MAP'[i] })),
	{ id: 'extra', x: COVE.x - 1.35, y: COVE.y + 1.6, r: 0.42, color: GOLD, label: 'EB' },
	...Array.from({ length: 10 }, (_, i) => ({ id: `hull${i}`, x: SHIP.x - 1.8 + i * 0.4, y: 9.35, r: 0.16, color: RED })),
	...Array.from({ length: 4 }, (_, i) => ({ id: `chest${i}`, x: CHEST.ax - 1.3 + i * 0.4, y: CHEST.ay + 1.1 - i * 0.2, r: 0.18, color: GOLD })),
	{ id: 'arrow:plank', x: RAMP_MOUTH.right.x, y: RAMP_MOUTH.right.y, r: 0.42, color: GOLD, shape: 'arrow', turn: up + 0.05 },
	{ id: 'arrow:mast', x: MAST.x, y: MAST.y + 1.5, r: 0.42, color: SEA, shape: 'arrow', turn: up },
	{ id: 'arrow:chest', x: CHEST.ax - 0.55, y: CHEST.ay + 1.75, r: 0.38, color: GOLD, shape: 'arrow', turn: up + 0.4 },
	{ id: 'arrow:orbitR', x: 15.2, y: 21.1, r: 0.4, color: JADE, shape: 'arrow', turn: up + 0.6 },
	{ id: 'arrow:ship', x: SHIP.x, y: 10.45, r: 0.36, color: RED, shape: 'arrow', turn: up },
	{ id: 'arrow:cove', x: COVE.x, y: COVE.y + 1.5, r: 0.38, color: GOLD, shape: 'arrow', turn: up },
	{ id: 'wreck', x: SHIP.x, y: 5.3, r: 0.4, color: JADE, label: 'WRECK', shape: 'pill' },
	...VOYAGES.map((v, i) => {
		const a = Math.PI + 0.25 + (i / 5) * (Math.PI - 0.5);
		return { id: `voyage${i}`, x: CX + Math.cos(a) * 2.3, y: 27.6 + Math.sin(a) * 1.3, r: 0.34, color: GOLD, label: v.name.replace(/^(Walk the |Crow.s )/, '')[0] };
	}),
	{ id: 'locker', x: CX, y: 27.2, r: 0.5, color: JADE, shape: 'star' },
	...[2, 3, 4, 5, 6].map((m, i) => ({ id: `mult${m}`, x: 7.3 + i, y: 30.9, r: 0.3, color: SEA, label: `${m}×` })),
	{ id: 'kick', x: 1.1, y: 28.6, r: 0.38, color: SEA, shape: 'arrow', turn: up },
	{ id: 'again', x: CX, y: 34.9, r: 0.5, color: GOLD, label: 'SHOOT AGAIN', shape: 'pill' }
];

const bulbs: Bulb[] = [];
for (let deg = 196; deg <= 344; deg += 12) bulbs.push({ ...archPoint({ x: 10, y: 10, r: 9.6 }, deg, 9.05), color: bulbs.length % 2 ? GOLD : '#fff0c8' });

function paint(ctx: CanvasRenderingContext2D, _def: TableDef, h: Parameters<TableArt['paint']>[2]) {
	const u = h.unit;
	const W = 20 * u;
	ctx.fillStyle = vgrad(ctx, 0, 37 * u, [
		[0, '#0d3a4e'],
		[0.5, '#0a2c3e'],
		[1, '#061a26']
	]);
	ctx.fillRect(0, 0, W, 37 * u);

	// Swell lines across the sea.
	ctx.strokeStyle = 'rgba(90, 209, 255, 0.12)';
	ctx.lineWidth = 0.06 * u;
	for (let y = 2; y < 36; y += 0.9) {
		ctx.beginPath();
		for (let x = 0; x <= 20; x += 0.5) {
			const yy = y + Math.sin(x * 1.3 + y) * 0.15;
			if (x === 0) ctx.moveTo(x * u, yy * u);
			else ctx.lineTo(x * u, yy * u);
		}
		ctx.stroke();
	}

	// The reef: pale coral under the bumpers.
	const reef = { x: (BUMPERS[0]!.x + BUMPERS[1]!.x) / 2, y: (BUMPERS[0]!.y + BUMPERS[2]!.y) / 2 };
	ctx.fillStyle = radial(ctx, reef.x * u, reef.y * u, 3.6 * u, [
		[0, 'rgba(255, 140, 120, 0.2)'],
		[0.7, 'rgba(255, 140, 120, 0.06)'],
		[1, 'rgba(255, 140, 120, 0)']
	]);
	ctx.fillRect((reef.x - 3.6) * u, (reef.y - 3.6) * u, 7.2 * u, 7.2 * u);

	// A parchment chart under the M·A·P bank, with a dotted route to X.
	ctx.save();
	ctx.translate(((MAP[1]!.ax + MAP[1]!.bx) / 2 + MAP_FACE.x * 1.6) * u, ((MAP[1]!.ay + MAP[1]!.by) / 2 + MAP_FACE.y * 1.6) * u);
	ctx.rotate(Math.atan2(MAP_FACE.y, MAP_FACE.x) - Math.PI / 2);
	ctx.fillStyle = 'rgba(244, 230, 196, 0.16)';
	ctx.fillRect(-1.5 * u, -2.2 * u, 3.0 * u, 4.4 * u);
	ctx.strokeStyle = 'rgba(244, 230, 196, 0.3)';
	ctx.lineWidth = 0.05 * u;
	ctx.strokeRect(-1.5 * u, -2.2 * u, 3.0 * u, 4.4 * u);
	ctx.setLineDash([0.16 * u, 0.16 * u]);
	ctx.strokeStyle = 'rgba(255, 74, 58, 0.5)';
	ctx.lineWidth = 0.07 * u;
	ctx.beginPath();
	ctx.moveTo(-1.1 * u, 1.8 * u);
	ctx.bezierCurveTo(-0.6 * u, 0, 0.8 * u, 0.9 * u, 0.4 * u, -1.6 * u);
	ctx.stroke();
	ctx.setLineDash([]);
	ctx.restore();

	// The mast: a spar up from the scoop with rigging fanned off it.
	ctx.strokeStyle = 'rgba(176, 138, 74, 0.55)';
	ctx.lineWidth = 0.22 * u;
	ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.moveTo(MAST.x * u, (MAST.y - 0.7) * u);
	ctx.lineTo(MAST.x * u, 13.6 * u);
	ctx.stroke();
	ctx.strokeStyle = 'rgba(244, 230, 196, 0.22)';
	ctx.lineWidth = 0.04 * u;
	for (const dx of [-1.4, -0.8, 0.8, 1.4]) {
		ctx.beginPath();
		ctx.moveTo(MAST.x * u, 13.8 * u);
		ctx.lineTo((MAST.x + dx) * u, (MAST.y - 0.2) * u);
		ctx.stroke();
	}
	ctx.fillStyle = 'rgba(176, 138, 74, 0.5)';
	ctx.fillRect((MAST.x - 0.5) * u, 13.3 * u, 1.0 * u, 0.4 * u);

	// The treasure chest: a gilded box round the captive ball's lane, the lid at the top.
	{
		const a = Math.atan2(CHEST.by - CHEST.ay, CHEST.bx - CHEST.ax);
		const len = Math.hypot(LID.x - CHEST.ax, LID.y - CHEST.ay);
		ctx.save();
		ctx.translate(CHEST.ax * u, CHEST.ay * u);
		ctx.rotate(a);
		ctx.fillStyle = 'rgba(90, 52, 20, 0.85)';
		ctx.fillRect(-0.2 * u, -0.85 * u, (len + 0.5) * u, 1.7 * u);
		ctx.strokeStyle = GOLD;
		ctx.lineWidth = 0.08 * u;
		ctx.strokeRect(-0.2 * u, -0.85 * u, (len + 0.5) * u, 1.7 * u);
		for (const k of [0.35, 0.7]) {
			ctx.beginPath();
			ctx.moveTo((len + 0.3) * k * u, -0.85 * u);
			ctx.lineTo((len + 0.3) * k * u, 0.85 * u);
			ctx.stroke();
		}
		ctx.restore();
	}

	// A compass rose up the right orbit, by its spinner.
	ctx.save();
	ctx.translate(17.15 * u, 11.0 * u);
	for (let i = 0; i < 8; i += 1) {
		ctx.rotate(TAU / 8);
		ctx.fillStyle = i % 2 ? 'rgba(244, 230, 196, 0.25)' : 'rgba(255, 207, 90, 0.45)';
		ctx.beginPath();
		ctx.moveTo(0, -(i % 2 ? 0.55 : 0.85) * u);
		ctx.lineTo(0.14 * u, 0);
		ctx.lineTo(-0.14 * u, 0);
		ctx.closePath();
		ctx.fill();
	}
	ctx.restore();

	// Skull Rock round the cove.
	ctx.fillStyle = radial(ctx, COVE.x * u, COVE.y * u, 1.8 * u, [
		[0, 'rgba(244, 230, 196, 0.3)'],
		[1, 'rgba(244, 230, 196, 0)']
	]);
	ctx.fillRect((COVE.x - 1.8) * u, (COVE.y - 1.8) * u, 3.6 * u, 3.6 * u);
	ctx.fillStyle = 'rgba(244, 230, 196, 0.4)';
	for (const dx of [-0.42, 0.42]) {
		ctx.beginPath();
		ctx.arc((COVE.x + dx) * u, (COVE.y - 0.95) * u, 0.24 * u, 0, TAU);
		ctx.fill();
	}

	// The ship's channel, where she sails and sinks.
	ctx.fillStyle = 'rgba(122, 255, 212, 0.08)';
	ctx.beginPath();
	ctx.ellipse(SHIP.x * u, SHIP.y * u, (SHIP.reach + 1.4) * u, 1.3 * u, 0, 0, TAU);
	ctx.fill();

	h.label(ctx, 'THE COVE', COVE.x, COVE.y - 1.6, 0.42, 'rgba(244, 230, 196, 0.85)', LABEL);
	h.label(ctx, 'PLANK', RAMP_MOUTH.right.x, 19.45, 0.4, 'rgba(255, 207, 90, 0.75)', LABEL);
	h.label(ctx, 'MAST', MAST.x, MAST.y + 2.45, 0.4, 'rgba(90, 209, 255, 0.75)', LABEL);
	h.label(ctx, 'SINK HER', SHIP.x, 10.15, 0.3, 'rgba(255, 74, 58, 0.7)', LABEL);
	h.label(ctx, 'TREASURE', CHEST.ax - 0.5, CHEST.ay + 2.6, 0.3, 'rgba(255, 207, 90, 0.75)', LABEL);
	h.label(ctx, 'VOYAGES', CX, 25.6, 0.34, 'rgba(255, 207, 90, 0.7)', LABEL);
	h.label(ctx, 'KICK', 1.1, 29.55, 0.34, 'rgba(90, 209, 255, 0.7)', LABEL);
	h.label(ctx, 'Dead Man\u2019s Tide', CX, 29.35, 0.8, 'rgba(255, 207, 90, 0.42)', DISPLAY);
	// The third flipper's throw, printed under it.
	ctx.fillStyle = 'rgba(255, 207, 90, 0.12)';
	ctx.beginPath();
	ctx.moveTo(UPPER.px * u, UPPER.py * u);
	ctx.arc(UPPER.px * u, UPPER.py * u, (UPPER.len + 0.4) * u, UPPER.up, UPPER.rest);
	ctx.closePath();
	ctx.fill();
	for (const [x, text] of [
		[1.25, 'BROADSIDE'],
		[17.15, 'ROUND THE HORN']
	] as const) {
		ctx.save();
		ctx.translate(x * u, (x < CX ? 10.6 : 14.2) * u);
		ctx.rotate(x < CX ? -Math.PI / 2 : Math.PI / 2);
		h.label(ctx, text, 0, 0, 0.42, 'rgba(122, 255, 212, 0.45)', LABEL);
		ctx.restore();
	}
}

/** A galleon seen from above: hull, deck, three masts with sails. Sinking tips it and sinks it into the swirl. */
function drawShip(ctx: CanvasRenderingContext2D, u: number, x: number, y: number, t: number, squish: number, sink: number, hot: string | null) {
	ctx.save();
	ctx.translate(x * u, (y + Math.sin(t * 1.8) * 0.05) * u);
	ctx.rotate(Math.sin(t * 1.1) * 0.05 + sink * 0.5);
	const s = (1 - sink * 0.45) * (1 + squish * 0.06);
	ctx.scale(s, s);
	ctx.globalAlpha = 1 - sink * 0.6;
	if (hot) {
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		ctx.fillStyle = radial(ctx, 0, 0, 2.2 * u, [
			[0, hot],
			[1, 'rgba(0, 0, 0, 0)']
		]);
		ctx.fillRect(-2.2 * u, -2.2 * u, 4.4 * u, 4.4 * u);
		ctx.restore();
	}
	const hull = (w: number, hgt: number) => {
		ctx.beginPath();
		ctx.moveTo(-w * u, 0);
		ctx.quadraticCurveTo(-w * 0.8 * u, -hgt * u, 0, -hgt * u);
		ctx.quadraticCurveTo(w * 1.1 * u, -hgt * u, w * 1.35 * u, 0);
		ctx.quadraticCurveTo(w * 1.1 * u, hgt * u, 0, hgt * u);
		ctx.quadraticCurveTo(-w * 0.8 * u, hgt * u, -w * u, 0);
		ctx.closePath();
	};
	ctx.fillStyle = '#3b2210';
	hull(1.15, 0.55);
	ctx.fill();
	ctx.fillStyle = '#8a5a2c';
	hull(1.0, 0.42);
	ctx.fill();
	ctx.strokeStyle = 'rgba(40, 20, 6, 0.6)';
	ctx.lineWidth = 0.03 * u;
	for (let k = -2; k <= 2; k += 1) {
		ctx.beginPath();
		ctx.moveTo(-0.9 * u, k * 0.08 * u);
		ctx.lineTo(1.2 * u, k * 0.08 * u);
		ctx.stroke();
	}
	for (const [mx, w] of [
		[-0.5, 0.42],
		[0.15, 0.5],
		[0.75, 0.36]
	] as const) {
		ctx.fillStyle = BONE;
		ctx.beginPath();
		ctx.ellipse(mx * u, 0, 0.1 * u, w * u, 0, 0, TAU);
		ctx.fill();
		ctx.fillStyle = '#2a1608';
		ctx.beginPath();
		ctx.arc(mx * u, 0, 0.06 * u, 0, TAU);
		ctx.fill();
	}
	ctx.fillStyle = '#111';
	ctx.fillRect(-0.95 * u, -0.08 * u, 0.22 * u, 0.16 * u);
	ctx.restore();
}

export const pirateArt: TableArt<PirateState> = {
	theme: {
		display: DISPLAY,
		label: LABEL,
		wood: ['#24140a', '#3a2412'],
		rail: '#b08a4a',
		railShine: 'rgba(255, 230, 170, 0.55)',
		guide: '#c4b8a0',
		post: '#f4e6c4',
		postCore: '#6a4a24',
		rubber: '#1b1b1b',
		flipper: { body: BONE, rubber: '#1b1b1b', pivot: '#b08a4a' },
		insertOff: 'rgba(6, 22, 32, 0.85)',
		sling: { base: '#2b1a0c', stripe: GOLD },
		bumper: { style: 'barrel', a: '#5a3818', b: '#b07a3a', cap: GOLD, ring: '#3a3a3a', flash: GOLD },
		target: { face: RED, edge: '#5a0a08', ink: BONE },
		ramp: 'rgba(255, 207, 90, 0.2)',
		popup: { ink: BONE, big: GOLD, stroke: 'rgba(6, 20, 30, 0.85)' },
		spark: GOLD,
		hot: [RED, GOLD],
		ball: 'brass'
	},
	inserts,
	bulbs,
	paint,
	toys(ctx, g, t, h, fx) {
		const u = h.unit;
		const s = g.s;
		const m = g.world.movers.ship;
		if (s.sunk) {
			// A whirlpool over the wreck.
			ctx.save();
			ctx.translate(SHIP.x * u, SHIP.y * u);
			for (let k = 0; k < 4; k += 1) {
				ctx.rotate(t * 1.5 + k);
				ctx.strokeStyle = `rgba(122, 255, 212, ${0.5 - k * 0.1})`;
				ctx.lineWidth = 0.07 * u;
				ctx.beginPath();
				ctx.arc(0, 0, (0.7 + k * 0.35) * u, 0, Math.PI * 1.2);
				ctx.stroke();
			}
			ctx.restore();
			drawShip(ctx, u, SHIP.x, SHIP.y, t, 0, 0.85, null);
		} else if (m) {
			const hot = s.locker ? JADE : g.mode?.lit.includes('ship') ? GOLD : s.shipHits >= 3 ? RED : null;
			drawShip(ctx, u, m.x, m.y, t, fx.hit('ship'), Math.min(0.3, s.shipHits * 0.04), hot);
		}
		const cove = fx.hit('cove');
		if (cove > 0) h.shine(ctx, GOLD, COVE.x, COVE.y, 3.6, cove);
		const chest = Math.max(fx.hit('chest'), fx.hit('cue:treasure'));
		if (chest > 0) h.shine(ctx, GOLD, LID.x, LID.y, 3.2, chest);
		const mast = Math.max(fx.hit('mast'), fx.hit('cue:hoist'));
		if (mast > 0) {
			h.shine(ctx, SEA, MAST.x, MAST.y, 3.4, mast);
			h.shine(ctx, SEA, MAST.x, 11.3, 2.4, mast * 0.8);
		}
	}
};
