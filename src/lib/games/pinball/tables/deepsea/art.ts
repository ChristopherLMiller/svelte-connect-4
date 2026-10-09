import { archPoint, CX, type TableDef } from '../../engine/def';
import { radial, TAU, vgrad, type Bulb, type Insert, type TableArt } from '../../engine/art';
import { RAMP_MOUTH } from '../parts';
import { DIVES, gripped, type DeepseaState } from './rules';
import { BUMPERS, GROTTO, KRAKEN, LANES, PEARLS, TRENCH, WHIRLPOOL } from './def';

const TEAL = '#5affc8';
const CORAL = '#ff8a5a';
const PINK = '#ff5a8a';
const PEARL = '#f0f4ff';
const VIOLET = '#b07aff';
const DISPLAY = '"Cinzel", Georgia, serif';
const LABEL = '"Barlow Condensed", "Arial Narrow", sans-serif';

const up = -Math.PI / 2;
const inserts: Insert[] = [
	...LANES.map((x, i) => ({ id: `lane${i}`, x, y: 5.4, r: 0.42, color: TEAL, label: 'SEA'[i] })),
	...PEARLS.map((p, i) => ({ id: `pearl${i}`, x: p.x - 0.75, y: p.y, r: 0.28, color: PEARL })),
	{ id: 'extra', x: GROTTO.x - 1.3, y: GROTTO.y + 1.1, r: 0.38, color: TEAL, label: 'EB' },
	{ id: 'undertow', x: WHIRLPOOL.x, y: WHIRLPOOL.y + WHIRLPOOL.r + 0.65, r: 0.42, color: VIOLET, shape: 'diamond' },
	...Array.from({ length: 5 }, (_, i) => ({ id: `stir${i}`, x: CX - 1.8 + i * 0.9, y: 9.65, r: 0.22, color: PINK })),
	...[0, 1].map((i) => ({ id: `grab${i}`, x: CX - 0.5 + i, y: 22.8, r: 0.3, color: PINK, label: 'G' })),
	{ id: 'arrow:trench', x: TRENCH.x, y: TRENCH.y + 1.5, r: 0.42, color: TEAL, shape: 'arrow', turn: up - 0.1 },
	{ id: 'arrow:vent', x: RAMP_MOUTH.right.x, y: RAMP_MOUTH.right.y, r: 0.42, color: CORAL, shape: 'arrow', turn: up + 0.05 },
	{ id: 'arrow:orbitL', x: 3.4, y: 21.1, r: 0.4, color: VIOLET, shape: 'arrow', turn: up - 0.6 },
	{ id: 'arrow:orbitR', x: 15.2, y: 21.1, r: 0.4, color: VIOLET, shape: 'arrow', turn: up + 0.6 },
	{ id: 'arrow:kraken', x: CX, y: 23.8, r: 0.38, color: PINK, shape: 'arrow', turn: up },
	{ id: 'arrow:grotto', x: GROTTO.x, y: GROTTO.y + 1.45, r: 0.38, color: TEAL, shape: 'arrow', turn: up },
	...DIVES.map((v, i) => {
		const a = Math.PI + 0.25 + (i / 5) * (Math.PI - 0.5);
		return { id: `dive${i}`, x: CX + Math.cos(a) * 2.3, y: 27.6 + Math.sin(a) * 1.3, r: 0.34, color: TEAL, label: v.name.replace(/^(Sunken |Black |Pearl )/, '')[0] };
	}),
	{ id: 'deep', x: CX, y: 27.2, r: 0.5, color: VIOLET, shape: 'star' },
	...[2, 3, 4, 5, 6].map((m, i) => ({ id: `mult${m}`, x: 7.3 + i, y: 30.9, r: 0.3, color: CORAL, label: `${m}×` })),
	{ id: 'kick', x: 1.1, y: 28.6, r: 0.38, color: CORAL, shape: 'arrow', turn: up },
	{ id: 'again', x: CX, y: 34.9, r: 0.5, color: TEAL, label: 'SHOOT AGAIN', shape: 'pill' }
];

const bulbs: Bulb[] = [];
for (let deg = 196; deg <= 344; deg += 12) bulbs.push({ ...archPoint({ x: 10, y: 10, r: 9.6 }, deg, 9.05), color: bulbs.length % 2 ? TEAL : VIOLET });

function kelp(ctx: CanvasRenderingContext2D, u: number, x: number, y0: number, y1: number, sway: number) {
	ctx.beginPath();
	ctx.moveTo(x * u, y0 * u);
	for (let y = y0; y >= y1; y -= 0.4) ctx.lineTo((x + Math.sin(y * 0.9) * sway) * u, y * u);
	ctx.stroke();
}

function paint(ctx: CanvasRenderingContext2D, _def: TableDef, h: Parameters<TableArt['paint']>[2]) {
	const u = h.unit;
	const W = 20 * u;
	ctx.fillStyle = vgrad(ctx, 0, 37 * u, [
		[0, '#0b3a4a'],
		[0.45, '#06223a'],
		[1, '#030c1c']
	]);
	ctx.fillRect(0, 0, W, 37 * u);

	// Light shafts from the surface.
	ctx.save();
	ctx.globalCompositeOperation = 'lighter';
	for (const [x, w] of [
		[4, 1.4],
		[9, 2.2],
		[14.5, 1.6]
	] as const) {
		ctx.fillStyle = vgrad(ctx, 0, 24 * u, [
			[0, 'rgba(120, 220, 255, 0.12)'],
			[1, 'rgba(120, 220, 255, 0)']
		]);
		ctx.beginPath();
		ctx.moveTo((x - w * 0.3) * u, 0);
		ctx.lineTo((x + w * 0.3) * u, 0);
		ctx.lineTo((x + w + 2) * u, 24 * u);
		ctx.lineTo((x - w + 2) * u, 24 * u);
		ctx.closePath();
		ctx.fill();
	}
	ctx.restore();

	// Glowing plankton.
	let seed = 7;
	const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
	for (let i = 0; i < 90; i += 1) {
		const x = rnd() * 20;
		const y = 2 + rnd() * 33;
		ctx.fillStyle = `rgba(${rnd() < 0.5 ? '90, 255, 200' : '176, 122, 255'}, ${0.15 + rnd() * 0.3})`;
		ctx.beginPath();
		ctx.arc(x * u, y * u, (0.03 + rnd() * 0.05) * u, 0, TAU);
		ctx.fill();
	}

	// Kelp up the outlanes.
	ctx.lineWidth = 0.14 * u;
	ctx.lineCap = 'round';
	ctx.strokeStyle = 'rgba(60, 160, 90, 0.35)';
	for (const [x, top] of [
		[0.9, 22],
		[1.6, 24],
		[17.0, 23],
		[17.7, 21]
	] as const)
		kelp(ctx, u, x, 31, top, 0.25);

	// A sand bed at the bottom with a sunken anchor.
	ctx.fillStyle = vgrad(ctx, 30 * u, 36 * u, [
		[0, 'rgba(200, 170, 110, 0)'],
		[1, 'rgba(200, 170, 110, 0.18)']
	]);
	ctx.fillRect(0, 30 * u, W, 6 * u);

	// The sea floor sucked down round the whirlpool.
	ctx.fillStyle = radial(ctx, WHIRLPOOL.x * u, WHIRLPOOL.y * u, (WHIRLPOOL.r + 1.4) * u, [
		[0.55, 'rgba(176, 122, 255, 0.22)'],
		[1, 'rgba(176, 122, 255, 0)']
	]);
	ctx.fillRect((WHIRLPOOL.x - WHIRLPOOL.r - 1.4) * u, (WHIRLPOOL.y - WHIRLPOOL.r - 1.4) * u, (WHIRLPOOL.r + 1.4) * 2 * u, (WHIRLPOOL.r + 1.4) * 2 * u);

	// The grotto: a coral arch round the saucer.
	ctx.fillStyle = radial(ctx, GROTTO.x * u, GROTTO.y * u, 1.8 * u, [
		[0, 'rgba(255, 138, 90, 0.3)'],
		[1, 'rgba(255, 138, 90, 0)']
	]);
	ctx.fillRect((GROTTO.x - 1.8) * u, (GROTTO.y - 1.8) * u, 3.6 * u, 3.6 * u);
	ctx.strokeStyle = 'rgba(255, 138, 90, 0.55)';
	ctx.lineWidth = 0.12 * u;
	ctx.beginPath();
	ctx.arc(GROTTO.x * u, GROTTO.y * u, 1.0 * u, Math.PI * 1.05, Math.PI * 1.95);
	ctx.stroke();

	// The kraken's lair: a dark hollow under the arch.
	ctx.fillStyle = radial(ctx, KRAKEN.x * u, KRAKEN.y * u, (KRAKEN.reach + 2) * u, [
		[0, 'rgba(10, 0, 12, 0.55)'],
		[0.6, 'rgba(255, 90, 138, 0.08)'],
		[1, 'rgba(255, 90, 138, 0)']
	]);
	ctx.fillRect((KRAKEN.x - KRAKEN.reach - 2) * u, (KRAKEN.y - 3) * u, (KRAKEN.reach + 2) * 2 * u, 6 * u);

	// The reef: coral fans behind the bumpers.
	ctx.strokeStyle = 'rgba(255, 138, 90, 0.3)';
	ctx.lineWidth = 0.1 * u;
	ctx.lineCap = 'round';
	for (const b of BUMPERS) {
		for (let k = 0; k < 5; k += 1) {
			const a = Math.PI * (1.1 + k * 0.2);
			ctx.beginPath();
			ctx.moveTo(b.x * u, (b.y + 0.4) * u);
			ctx.quadraticCurveTo((b.x + Math.cos(a) * 0.9) * u, (b.y + Math.sin(a) * 0.4) * u, (b.x + Math.cos(a) * 1.5) * u, (b.y + Math.sin(a) * 1.5) * u);
			ctx.stroke();
		}
	}

	// The trench: a crevice falling away under the left scoop.
	ctx.fillStyle = radial(ctx, TRENCH.x * u, TRENCH.y * u, 1.7 * u, [
		[0, 'rgba(0, 0, 0, 0.7)'],
		[0.6, 'rgba(0, 20, 30, 0.35)'],
		[1, 'rgba(0, 20, 30, 0)']
	]);
	ctx.fillRect((TRENCH.x - 1.7) * u, (TRENCH.y - 1.7) * u, 3.4 * u, 3.4 * u);
	ctx.strokeStyle = 'rgba(90, 255, 200, 0.4)';
	ctx.lineWidth = 0.06 * u;
	for (const k of [-1, 1]) {
		ctx.beginPath();
		ctx.moveTo((TRENCH.x + k * 0.9) * u, (TRENCH.y - 1.3) * u);
		ctx.lineTo((TRENCH.x + k * 0.6) * u, (TRENCH.y + 0.9) * u);
		ctx.stroke();
	}

	h.label(ctx, 'GROTTO', GROTTO.x, GROTTO.y - 1.4, 0.42, 'rgba(255, 180, 140, 0.85)', LABEL);
	h.label(ctx, 'TRENCH', TRENCH.x, TRENCH.y + 2.4, 0.4, 'rgba(90, 255, 200, 0.75)', LABEL);
	h.label(ctx, 'VENT', RAMP_MOUTH.right.x, 19.45, 0.4, 'rgba(255, 138, 90, 0.75)', LABEL);
	h.label(ctx, 'PEARLS', PEARLS[0]!.x - 0.75, PEARLS[0]!.y - 0.8, 0.3, 'rgba(240, 244, 255, 0.7)', LABEL);
	h.label(ctx, 'WHIRLPOOL', WHIRLPOOL.x, WHIRLPOOL.y + WHIRLPOOL.r + 1.35, 0.34, 'rgba(176, 122, 255, 0.75)', LABEL);
	h.label(ctx, 'WAKE THE KRAKEN', CX, 10.3, 0.28, 'rgba(255, 90, 138, 0.7)', LABEL);
	h.label(ctx, 'DIVES', CX, 25.6, 0.34, 'rgba(90, 255, 200, 0.7)', LABEL);
	h.label(ctx, 'KICK', 1.1, 29.55, 0.34, 'rgba(255, 138, 90, 0.7)', LABEL);
	h.label(ctx, 'The Abyss', CX, 29.35, 0.8, 'rgba(176, 122, 255, 0.45)', DISPLAY);
	for (const x of [1.3, 17.2]) {
		ctx.save();
		ctx.translate(x * u, 15.6 * u);
		ctx.rotate(x < CX ? -Math.PI / 2 : Math.PI / 2);
		h.label(ctx, 'OVER THE TOP', 0, 0, 0.38, 'rgba(176, 122, 255, 0.45)', LABEL);
		ctx.restore();
	}
}

/** The kraken from above: a mantle with two eyes and eight arms that wave, or wrap the ball when it grabs. */
function drawKraken(ctx: CanvasRenderingContext2D, u: number, x: number, y: number, t: number, squish: number, awake: boolean, grip: boolean, hot: string | null) {
	ctx.save();
	ctx.translate(x * u, y * u);
	if (hot) {
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		ctx.fillStyle = radial(ctx, 0, 0, 2.4 * u, [
			[0, hot],
			[1, 'rgba(0, 0, 0, 0)']
		]);
		ctx.fillRect(-2.4 * u, -2.4 * u, 4.8 * u, 4.8 * u);
		ctx.restore();
	}
	ctx.lineCap = 'round';
	for (let k = 0; k < 8; k += 1) {
		const base = (k / 8) * TAU + Math.PI / 8;
		const reach = grip ? 0.9 : 1.6 + Math.sin(t * 2 + k) * 0.15;
		const curl = grip ? 2.2 : Math.sin(t * 2.4 + k * 1.3) * 0.8;
		ctx.beginPath();
		ctx.moveTo(Math.cos(base) * 0.5 * u, Math.sin(base) * 0.5 * u);
		const steps = 8;
		for (let i = 1; i <= steps; i += 1) {
			const f = i / steps;
			const a = base + curl * f * f;
			const r = 0.5 + (reach - 0.5) * f;
			ctx.lineTo(Math.cos(a) * r * u, Math.sin(a) * r * u);
		}
		ctx.strokeStyle = '#7a1e4a';
		ctx.lineWidth = 0.26 * u;
		ctx.stroke();
		ctx.strokeStyle = 'rgba(255, 160, 200, 0.45)';
		ctx.lineWidth = 0.08 * u;
		ctx.stroke();
	}
	const s = 1 + squish * 0.08;
	ctx.scale(s, s);
	ctx.fillStyle = radial(ctx, -0.2 * u, -0.25 * u, 1.1 * u, [
		[0, '#e0508a'],
		[0.6, '#9a2a5a'],
		[1, '#4a0f2a']
	]);
	ctx.beginPath();
	ctx.ellipse(0, 0, KRAKEN.r * u, KRAKEN.r * 0.9 * u, 0, 0, TAU);
	ctx.fill();
	for (const dx of [-0.35, 0.35]) {
		ctx.fillStyle = awake ? '#ffe04a' : '#f0e6c0';
		ctx.beginPath();
		ctx.ellipse(dx * u, 0.15 * u, 0.2 * u, awake ? 0.2 * u : 0.08 * u, 0, 0, TAU);
		ctx.fill();
		ctx.fillStyle = '#100';
		ctx.fillRect((dx - 0.03) * u, 0.02 * u, 0.06 * u, (awake ? 0.26 : 0.1) * u);
	}
	ctx.restore();
}

export const deepseaArt: TableArt<DeepseaState> = {
	theme: {
		display: DISPLAY,
		label: LABEL,
		wood: ['#0a1a24', '#12283a'],
		rail: '#8aa8b8',
		railShine: 'rgba(200, 240, 255, 0.55)',
		guide: '#9ab8c4',
		post: '#d8f0ff',
		postCore: '#2a5a6a',
		rubber: '#141a1f',
		flipper: { body: PEARL, rubber: '#141a1f', pivot: '#8aa8b8' },
		insertOff: 'rgba(4, 16, 30, 0.85)',
		sling: { base: '#082436', stripe: TEAL },
		bumper: { style: 'shell', a: '#ff9a7a', b: '#ffd0b8', cap: PEARL, ring: '#2a5a6a', flash: TEAL },
		target: { face: PEARL, edge: '#5a6a8a', ink: '#06223a' },
		ramp: 'rgba(90, 255, 200, 0.2)',
		popup: { ink: PEARL, big: TEAL, stroke: 'rgba(3, 12, 28, 0.85)' },
		spark: TEAL,
		hot: [PINK, VIOLET],
		ball: 'chrome'
	},
	inserts,
	bulbs,
	paint,
	toys(ctx, g, t, h, fx) {
		const u = h.unit;
		const s = g.s;
		const m = g.world.movers.kraken;
		if (g.world.magnets.undertow) {
			ctx.save();
			ctx.translate(WHIRLPOOL.x * u, WHIRLPOOL.y * u);
			for (let k = 0; k < 4; k += 1) {
				ctx.rotate(-t * 3 - k);
				ctx.strokeStyle = `rgba(176, 122, 255, ${0.6 - k * 0.12})`;
				ctx.lineWidth = 0.07 * u;
				ctx.beginPath();
				ctx.arc(0, 0, (0.5 + k * 0.4) * u, 0, Math.PI * 1.3);
				ctx.stroke();
			}
			ctx.restore();
		}
		if (m) {
			const hot = s.deep ? VIOLET : s.attack || s.awake ? PINK : g.mode?.lit.includes('kraken') ? TEAL : null;
			drawKraken(ctx, u, m.x, m.y, t, fx.hit('kraken'), s.awake || s.attack, gripped(g), hot);
		}
		const grotto = fx.hit('grotto');
		if (grotto > 0) h.shine(ctx, TEAL, GROTTO.x, GROTTO.y, 3.6, grotto);
		const trench = Math.max(fx.hit('trench'), fx.hit('cue:trench'));
		if (trench > 0) h.shine(ctx, TEAL, TRENCH.x, TRENCH.y, 3.8, trench);
	}
};
