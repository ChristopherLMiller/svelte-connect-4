import { archPoint, CX, type P, type TableDef } from '../../engine/def';
import { radial, TAU, vgrad, type Bulb, type Insert, type TableArt } from '../../engine/art';
import { RAMP_MOUTH } from '../parts';
import { keepOpen, QUESTS, type DragonState } from './rules';
import { DECK, DRAGON, GATE, KEEP, LAIR } from './def';

const EMBER = '#ffb84a';
const FIRE = '#ff3a2a';
const GOLD = '#ffe04a';
const STEEL = '#b8c4d0';
const MOSS = '#7ad46a';
const DISPLAY = '"Uncial Antiqua", Georgia, serif';
const LABEL = '"Barlow Condensed", "Arial Narrow", sans-serif';

const up = -Math.PI / 2;
const inserts: Insert[] = [
	...Array.from({ length: 8 }, (_, i) => ({ id: `hp${i}`, x: 7.0 + i * 0.55, y: 5.7, r: 0.2, color: FIRE, raised: true })),
	{ id: 'hoard0', x: 6.45, y: 3.6, r: 0.28, color: GOLD, raised: true },
	{ id: 'hoard1', x: 8.3, y: 1.85, r: 0.28, color: GOLD, raised: true },
	{ id: 'arrow:dragon', x: 10.4, y: 6.7, r: 0.36, color: FIRE, shape: 'arrow', turn: up - 0.7, raised: true },
	...Array.from({ length: 5 }, (_, i) => ({ id: `gate${i}`, x: 5.6 + i * 0.4, y: 17.35, r: 0.15, color: EMBER })),
	...[0, 1].map((i) => ({ id: `lock${i}`, x: 8.3 + i * 0.75, y: 15.7, r: 0.3, color: STEEL, label: 'L' })),
	{ id: 'arrow:bridge', x: RAMP_MOUTH.left.x, y: RAMP_MOUTH.left.y, r: 0.42, color: EMBER, shape: 'arrow', turn: up - 0.05 },
	{ id: 'arrow:tower', x: RAMP_MOUTH.right.x, y: RAMP_MOUTH.right.y, r: 0.42, color: FIRE, shape: 'arrow', turn: up + 0.05 },
	{ id: 'arrow:orbitL', x: 3.4, y: 21.1, r: 0.4, color: MOSS, shape: 'arrow', turn: up - 0.6 },
	{ id: 'arrow:orbitR', x: 15.2, y: 21.1, r: 0.4, color: MOSS, shape: 'arrow', turn: up + 0.6 },
	{ id: 'arrow:keep', x: KEEP.x, y: 18.3, r: 0.38, color: EMBER, shape: 'arrow', turn: up },
	...QUESTS.map((v, i) => {
		const a = Math.PI + 0.25 + (i / 5) * (Math.PI - 0.5);
		return { id: `quest${i}`, x: CX + Math.cos(a) * 2.3, y: 27.6 + Math.sin(a) * 1.3, r: 0.34, color: EMBER, label: v.name.replace(/^(Hold the |Climb the |The |Raid the )/, '')[0] };
	}),
	{ id: 'fire', x: CX, y: 27.2, r: 0.5, color: FIRE, shape: 'star' },
	...[2, 3, 4, 5, 6].map((m, i) => ({ id: `mult${m}`, x: 7.3 + i, y: 30.9, r: 0.3, color: GOLD, label: `${m}×` })),
	{ id: 'kick', x: 1.1, y: 28.6, r: 0.38, color: MOSS, shape: 'arrow', turn: up },
	{ id: 'again', x: CX, y: 34.9, r: 0.5, color: EMBER, label: 'SHOOT AGAIN', shape: 'pill' }
];

const bulbs: Bulb[] = [];
for (let deg = 196; deg <= 344; deg += 12) bulbs.push({ ...archPoint({ x: 10, y: 10, r: 9.6 }, deg, 9.05), color: bulbs.length % 2 ? EMBER : '#fff0c8' });

const outline: P[] = [...DECK.top, ...DECK.right, { x: 12.1, y: 7.85 }, DECK.vRight[1]!, ...DECK.left];

function path(ctx: CanvasRenderingContext2D, u: number, pts: P[]) {
	ctx.beginPath();
	pts.forEach((p, i) => (i ? ctx.lineTo(p.x * u, p.y * u) : ctx.moveTo(p.x * u, p.y * u)));
	ctx.closePath();
}

function paint(ctx: CanvasRenderingContext2D, _def: TableDef, h: Parameters<TableArt['paint']>[2]) {
	const u = h.unit;
	const W = 20 * u;
	ctx.fillStyle = vgrad(ctx, 0, 37 * u, [
		[0, '#2a2420'],
		[0.5, '#1f1a18'],
		[1, '#120e0c']
	]);
	ctx.fillRect(0, 0, W, 37 * u);

	// Flagstones across the courtyard.
	ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
	ctx.lineWidth = 0.05 * u;
	for (let y = 0; y < 37; y += 1.2) {
		const shift = (Math.round(y / 1.2) % 2) * 0.9;
		ctx.beginPath();
		ctx.moveTo(0, y * u);
		ctx.lineTo(W, y * u);
		ctx.stroke();
		for (let x = -shift; x < 20; x += 1.8) {
			ctx.beginPath();
			ctx.moveTo(x * u, y * u);
			ctx.lineTo(x * u, (y + 1.2) * u);
			ctx.stroke();
		}
	}
	ctx.fillStyle = 'rgba(255, 184, 74, 0.05)';
	ctx.fillRect(0, 0, W, 37 * u);

	// Hanging banners down the orbits.
	for (const x of [1.45, 17.15]) {
		ctx.fillStyle = 'rgba(160, 30, 24, 0.45)';
		ctx.beginPath();
		ctx.moveTo((x - 0.55) * u, 16.8 * u);
		ctx.lineTo((x + 0.55) * u, 16.8 * u);
		ctx.lineTo((x + 0.55) * u, 21.2 * u);
		ctx.lineTo(x * u, 20.6 * u);
		ctx.lineTo((x - 0.55) * u, 21.2 * u);
		ctx.closePath();
		ctx.fill();
	}

	// The keep's arch, round the saucer and the portcullis.
	ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
	ctx.beginPath();
	ctx.arc(KEEP.x * u, KEEP.y * u, 1.05 * u, Math.PI, 0);
	ctx.lineTo((KEEP.x + 1.05) * u, (GATE.y + 0.4) * u);
	ctx.lineTo((KEEP.x - 1.05) * u, (GATE.y + 0.4) * u);
	ctx.closePath();
	ctx.fill();
	ctx.strokeStyle = 'rgba(200, 190, 170, 0.5)';
	ctx.lineWidth = 0.14 * u;
	ctx.stroke();

	// A shield crest in the middle.
	ctx.save();
	ctx.translate(CX * u, 20.6 * u);
	ctx.fillStyle = 'rgba(160, 30, 24, 0.3)';
	ctx.beginPath();
	ctx.moveTo(-1.1 * u, -1.1 * u);
	ctx.lineTo(1.1 * u, -1.1 * u);
	ctx.lineTo(1.1 * u, 0.2 * u);
	ctx.quadraticCurveTo(1.0 * u, 1.1 * u, 0, 1.6 * u);
	ctx.quadraticCurveTo(-1.0 * u, 1.1 * u, -1.1 * u, 0.2 * u);
	ctx.closePath();
	ctx.fill();
	ctx.strokeStyle = 'rgba(255, 224, 74, 0.4)';
	ctx.lineWidth = 0.08 * u;
	ctx.stroke();
	ctx.restore();

	h.label(ctx, 'THE KEEP', KEEP.x, KEEP.y - 1.5, 0.4, 'rgba(255, 224, 170, 0.85)', LABEL);
	h.label(ctx, 'BRIDGE', RAMP_MOUTH.left.x, 19.45, 0.4, 'rgba(255, 184, 74, 0.75)', LABEL);
	h.label(ctx, 'TOWER', RAMP_MOUTH.right.x, 19.45, 0.4, 'rgba(255, 90, 58, 0.8)', LABEL);
	h.label(ctx, 'LOCK', 8.68, 16.45, 0.28, 'rgba(184, 196, 208, 0.7)', LABEL);
	h.label(ctx, 'QUESTS', CX, 25.6, 0.34, 'rgba(255, 184, 74, 0.7)', LABEL);
	h.label(ctx, 'KICK', 1.1, 29.55, 0.34, 'rgba(122, 212, 106, 0.7)', LABEL);
	h.label(ctx, 'Dragon\u2019s Keep', CX, 29.35, 0.78, 'rgba(255, 184, 74, 0.45)', DISPLAY);
	for (const x of [1.45, 17.15]) {
		ctx.save();
		ctx.translate(x * u, 14.2 * u);
		ctx.rotate(x < CX ? -Math.PI / 2 : Math.PI / 2);
		h.label(ctx, 'JOUST', 0, 0, 0.42, 'rgba(122, 212, 106, 0.45)', LABEL);
		ctx.restore();
	}
}

/** The deck: a stone platform with a fiery pit at the bottom. */
function paintUpper(ctx: CanvasRenderingContext2D, _def: TableDef, h: Parameters<TableArt['paint']>[2]) {
	const u = h.unit;
	ctx.save();
	ctx.translate(0.4 * u, 0.6 * u);
	path(ctx, u, outline);
	ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
	ctx.fill();
	ctx.restore();
	path(ctx, u, outline);
	ctx.fillStyle = vgrad(ctx, 0, 10 * u, [
		[0, '#5a4a3e'],
		[1, '#3a2e26']
	]);
	ctx.fill();
	ctx.save();
	ctx.clip();
	ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
	ctx.lineWidth = 0.04 * u;
	for (let y = 0.5; y < 10.5; y += 0.8) {
		ctx.beginPath();
		ctx.moveTo(5 * u, y * u);
		ctx.lineTo(13.5 * u, y * u);
		ctx.stroke();
		const shift = (Math.round(y / 0.8) % 2) * 0.6;
		for (let x = 5 + shift; x < 13.5; x += 1.2) {
			ctx.beginPath();
			ctx.moveTo(x * u, y * u);
			ctx.lineTo(x * u, (y + 0.8) * u);
			ctx.stroke();
		}
	}
	// Scorch marks under the dragon.
	ctx.fillStyle = radial(ctx, DRAGON.x * u, (DRAGON.y + 0.6) * u, 2.8 * u, [
		[0, 'rgba(0, 0, 0, 0.45)'],
		[1, 'rgba(0, 0, 0, 0)']
	]);
	ctx.fillRect(5 * u, 0, 9 * u, 8 * u);
	ctx.restore();
	path(ctx, u, outline);
	ctx.strokeStyle = 'rgba(220, 200, 170, 0.5)';
	ctx.lineWidth = 0.08 * u;
	ctx.stroke();

	ctx.fillStyle = radial(ctx, LAIR.x * u, LAIR.y * u, 0.7 * u, [
		[0, '#ff7a2a'],
		[0.45, '#7a1a08'],
		[1, '#1a0804']
	]);
	ctx.beginPath();
	ctx.arc(LAIR.x * u, LAIR.y * u, 0.6 * u, 0, TAU);
	ctx.fill();
	h.label(ctx, 'LAIR', LAIR.x - 1.3, LAIR.y - 0.1, 0.28, 'rgba(255, 184, 74, 0.7)', LABEL);
	h.label(ctx, 'SLAY THE DRAGON', 9.0, 6.35, 0.26, 'rgba(255, 90, 58, 0.75)', LABEL);
}

function drawGate(ctx: CanvasRenderingContext2D, u: number, open: boolean, squish: number, t: number) {
	ctx.save();
	ctx.translate((GATE.x + Math.sin(t * 60) * squish * 0.05) * u, GATE.y * u);
	const r = GATE.r;
	if (open) {
		ctx.strokeStyle = '#5a5a5a';
		ctx.lineWidth = 0.1 * u;
		for (const [x0, y0, x1, y1] of [
			[-0.6, 0.3, -0.1, 0.55],
			[0.15, 0.6, 0.65, 0.2],
			[-0.3, -0.1, 0.25, 0.3]
		]) {
			ctx.beginPath();
			ctx.moveTo(x0! * u, y0! * u);
			ctx.lineTo(x1! * u, y1! * u);
			ctx.stroke();
		}
		ctx.restore();
		return;
	}
	ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
	ctx.fillRect(-r * u + 0.1 * u, -r * u + 0.2 * u, 2 * r * u, 2 * r * u);
	ctx.strokeStyle = '#2a2a2a';
	ctx.lineWidth = 0.16 * u;
	ctx.strokeRect(-r * u, -r * u, 2 * r * u, 2 * r * u);
	ctx.strokeStyle = '#8a8a90';
	ctx.lineWidth = 0.1 * u;
	for (let k = -2; k <= 2; k += 1) {
		ctx.beginPath();
		ctx.moveTo(k * 0.3 * u, -r * u);
		ctx.lineTo(k * 0.3 * u, r * u);
		ctx.stroke();
	}
	for (let k = -1; k <= 1; k += 1) {
		ctx.beginPath();
		ctx.moveTo(-r * u, k * 0.4 * u);
		ctx.lineTo(r * u, k * 0.4 * u);
		ctx.stroke();
	}
	ctx.fillStyle = '#c4c4cc';
	for (let k = -2; k <= 2; k += 1) {
		ctx.beginPath();
		ctx.moveTo((k * 0.3 - 0.07) * u, r * u);
		ctx.lineTo((k * 0.3 + 0.07) * u, r * u);
		ctx.lineTo(k * 0.3 * u, (r + 0.18) * u);
		ctx.closePath();
		ctx.fill();
	}
	ctx.restore();
}

/** The dragon from above: wings that beat, a tail behind, head toward the flippers, fire when hot. */
function drawDragon(ctx: CanvasRenderingContext2D, u: number, x: number, y: number, t: number, hit: number, angry: boolean) {
	ctx.save();
	ctx.translate(x * u, y * u);
	const beat = Math.sin(t * (angry ? 9 : 5));
	const s = 1 + hit * 0.1;
	ctx.scale(s, s);

	ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
	ctx.beginPath();
	ctx.ellipse(0.3 * u, 0.5 * u, 1.6 * u, 0.7 * u, 0, 0, TAU);
	ctx.fill();

	for (const side of [-1, 1]) {
		ctx.save();
		ctx.scale(side, 1);
		ctx.rotate(-0.2 + beat * 0.25);
		ctx.fillStyle = '#7a1a14';
		ctx.beginPath();
		ctx.moveTo(0.3 * u, -0.1 * u);
		ctx.quadraticCurveTo(1.2 * u, -1.3 * u, 2.1 * u, -0.9 * u);
		ctx.lineTo(1.8 * u, -0.3 * u);
		ctx.lineTo(1.5 * u, 0.1 * u);
		ctx.lineTo(1.1 * u, 0.1 * u);
		ctx.lineTo(0.7 * u, 0.35 * u);
		ctx.closePath();
		ctx.fill();
		ctx.strokeStyle = '#c43a24';
		ctx.lineWidth = 0.05 * u;
		for (const [ex, ey] of [
			[2.1, -0.9],
			[1.5, 0.1],
			[0.7, 0.35]
		]) {
			ctx.beginPath();
			ctx.moveTo(0.3 * u, -0.1 * u);
			ctx.lineTo(ex! * u, ey! * u);
			ctx.stroke();
		}
		ctx.restore();
	}

	ctx.strokeStyle = '#5a1410';
	ctx.lineWidth = 0.22 * u;
	ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.moveTo(0, -0.4 * u);
	ctx.quadraticCurveTo(0.6 * u * Math.sin(t * 1.5), -1.2 * u, -0.3 * u, -1.7 * u);
	ctx.stroke();

	ctx.fillStyle = radial(ctx, -0.1 * u, -0.1 * u, 0.7 * u, [
		[0, '#d4442a'],
		[1, '#6a140e']
	]);
	ctx.beginPath();
	ctx.ellipse(0, 0, 0.42 * u, 0.62 * u, 0, 0, TAU);
	ctx.fill();
	ctx.beginPath();
	ctx.ellipse(0, 0.7 * u, 0.26 * u, 0.32 * u, 0, 0, TAU);
	ctx.fill();
	ctx.fillStyle = angry ? GOLD : '#f0d080';
	for (const dx of [-0.12, 0.12]) {
		ctx.beginPath();
		ctx.arc(dx * u, 0.68 * u, 0.06 * u, 0, TAU);
		ctx.fill();
	}
	ctx.fillStyle = '#e8dcc0';
	for (const dx of [-0.2, 0.2]) {
		ctx.beginPath();
		ctx.moveTo(dx * u, 0.5 * u);
		ctx.lineTo(dx * 1.6 * u, 0.3 * u);
		ctx.lineTo(dx * 1.1 * u, 0.55 * u);
		ctx.closePath();
		ctx.fill();
	}

	const breath = Math.max(hit, angry ? 0.5 + 0.5 * Math.sin(t * 3) : 0);
	if (breath > 0.05) {
		ctx.globalCompositeOperation = 'lighter';
		ctx.fillStyle = radial(ctx, 0, 1.6 * u, 1.3 * u, [
			[0, `rgba(255, 224, 74, ${0.7 * breath})`],
			[0.5, `rgba(255, 90, 30, ${0.45 * breath})`],
			[1, 'rgba(255, 30, 0, 0)']
		]);
		ctx.beginPath();
		ctx.moveTo(-0.1 * u, 1.0 * u);
		ctx.lineTo(-0.9 * u, 2.6 * u);
		ctx.quadraticCurveTo(0, 3.0 * u, 0.9 * u, 2.6 * u);
		ctx.lineTo(0.1 * u, 1.0 * u);
		ctx.closePath();
		ctx.fill();
	}
	ctx.restore();
}

export const dragonArt: TableArt<DragonState> = {
	theme: {
		display: DISPLAY,
		label: LABEL,
		wood: ['#1e1410', '#2e2018'],
		rail: '#8a8a90',
		railShine: 'rgba(230, 230, 240, 0.55)',
		guide: '#a8a8b0',
		post: '#e8dcc0',
		postCore: '#5a4030',
		rubber: '#1a1a1a',
		flipper: { body: '#e8dcc0', rubber: '#1a1a1a', pivot: '#8a8a90' },
		insertOff: 'rgba(20, 14, 10, 0.85)',
		sling: { base: '#2a1a12', stripe: EMBER },
		bumper: { style: 'shield', a: '#8a1a14', b: '#d4442a', cap: GOLD, ring: '#4a4a50', flash: EMBER },
		target: { face: GOLD, edge: '#6a4a10', ink: '#2a1a08' },
		ramp: 'rgba(255, 184, 74, 0.2)',
		popup: { ink: '#fff0c8', big: EMBER, stroke: 'rgba(20, 10, 6, 0.85)' },
		spark: EMBER,
		hot: [FIRE, GOLD],
		ball: 'chrome'
	},
	inserts,
	bulbs,
	paint,
	paintUpper,
	toys(ctx, g, t, h, fx) {
		drawGate(ctx, h.unit, keepOpen(g.s), fx.hit('gate'), t);
		const keep = fx.hit('keep');
		if (keep > 0) h.shine(ctx, EMBER, KEEP.x, KEEP.y, 3.6, keep);
	},
	raised(ctx, g, t, h, fx) {
		const m = g.world.movers.dragon;
		if (!m) return;
		const s = g.s;
		drawDragon(ctx, h.unit, m.x, m.y, t, fx.hit('dragon'), s.siege || s.fire || s.hp <= 1);
	}
};
