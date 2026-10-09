import { archPoint, CX, type TableDef } from '../../engine/def';
import { radial, TAU, vgrad, type Bulb, type Insert, type TableArt } from '../../engine/art';
import { MISSIONS, type SpaceState } from './rules';
import { ALIEN_Y, DIVERTER, LANES, UFO, WARP } from './def';

const CYAN = '#4af2ff';
const MAGENTA = '#ff3fd2';
const ORANGE = '#ff8a3a';
const YELLOW = '#ffe14a';
const VIOLET = '#9a6bff';
const DISPLAY = '"Orbitron", "Barlow Condensed", sans-serif';
const LABEL = '"Barlow Condensed", "Arial Narrow", sans-serif';
const PLANET = { x: CX, y: 20.3, r: 1.5 };

const up = -Math.PI / 2;
const ufoMid = UFO.map((t) => ({ x: (t.ax + t.bx) / 2 + 0.62, y: (t.ay + t.by) / 2 + 0.62 }));
const inserts: Insert[] = [
	...LANES.map((x, i) => ({ id: `lane${i}`, x, y: 5.4, r: 0.42, color: CYAN, label: 'STR'[i] })),
	...[0, 1, 2, 3, 4].map((i) => ({ id: `alien${i}`, x: 7.54 + i * 0.9, y: ALIEN_Y + 0.95, r: 0.3, color: MAGENTA, label: 'ALIEN'[i] })),
	...ufoMid.map((p, i) => ({ id: `ufo${i}`, x: p.x, y: p.y, r: 0.3, color: YELLOW, label: 'UFO'[i] })),
	{ id: 'lock0', x: 8.4, y: 16.4, r: 0.3, color: ORANGE, shape: 'diamond' },
	{ id: 'lock1', x: 10.2, y: 16.4, r: 0.3, color: ORANGE, shape: 'diamond' },
	{ id: 'extra', x: CX, y: 18.1, r: 0.45, color: YELLOW, label: 'EB' },
	{ id: 'arrow:loop', x: 3.6, y: 21.3, r: 0.42, color: CYAN, shape: 'arrow', turn: up - 0.6 },
	{ id: 'arrow:spinner', x: 2.3, y: 19.9, r: 0.36, color: VIOLET, shape: 'arrow', turn: up - 0.35 },
	{ id: 'arrow:ufo', x: ufoMid[1]!.x + 0.9, y: ufoMid[1]!.y + 0.9, r: 0.4, color: YELLOW, shape: 'arrow', turn: -2.36 },
	{ id: 'arrow:alien', x: CX, y: 15.9, r: 0.38, color: MAGENTA, shape: 'arrow', turn: up },
	{ id: 'arrow:warp', x: WARP.x, y: 16.4, r: 0.38, color: ORANGE, shape: 'arrow', turn: up },
	...MISSIONS.map((m, i) => ({ id: `mission${i}`, x: 6.8 + i, y: 23.0, r: 0.36, color: CYAN, label: m.name[0] })),
	{ id: 'nova', x: CX, y: 25.0, r: 0.55, color: MAGENTA, shape: 'star' },
	...[2, 3, 4, 5, 6].map((m, i) => ({ id: `mult${m}`, x: 7.3 + i, y: 30.9, r: 0.3, color: CYAN, label: `${m}×` })),
	{ id: 'kick', x: 1.1, y: 28.6, r: 0.38, color: CYAN, shape: 'arrow', turn: up },
	{ id: 'again', x: CX, y: 34.9, r: 0.5, color: YELLOW, label: 'SHOOT AGAIN', shape: 'pill' }
];

const bulbs: Bulb[] = [];
for (let deg = 196; deg <= 344; deg += 10) bulbs.push({ ...archPoint({ x: 10, y: 10, r: 9.6 }, deg, 9.05), color: bulbs.length % 2 ? CYAN : MAGENTA });

/** Seeded so the stars print the same every time. */
function stars(ctx: CanvasRenderingContext2D, u: number) {
	let seed = 7;
	const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
	for (let i = 0; i < 260; i += 1) {
		const x = rnd() * 20;
		const y = rnd() * 36;
		const r = (rnd() < 0.08 ? 0.07 : 0.035) * u;
		ctx.fillStyle = `rgba(${rnd() < 0.2 ? '255, 200, 240' : '220, 235, 255'}, ${0.35 + rnd() * 0.5})`;
		ctx.beginPath();
		ctx.arc(x * u, y * u, r, 0, TAU);
		ctx.fill();
	}
}

function paint(ctx: CanvasRenderingContext2D, _def: TableDef, h: Parameters<TableArt['paint']>[2]) {
	const u = h.unit;
	const W = 20 * u;
	ctx.fillStyle = vgrad(ctx, 0, 37 * u, [
		[0, '#0b0730'],
		[0.5, '#120a3a'],
		[1, '#05031a']
	]);
	ctx.fillRect(0, 0, W, 37 * u);
	ctx.fillStyle = radial(ctx, 5 * u, 11 * u, 9 * u, [
		[0, 'rgba(154, 107, 255, 0.28)'],
		[1, 'rgba(154, 107, 255, 0)']
	]);
	ctx.fillRect(0, 0, W, 22 * u);
	ctx.fillStyle = radial(ctx, 15 * u, 6 * u, 7 * u, [
		[0, 'rgba(255, 63, 210, 0.18)'],
		[1, 'rgba(255, 63, 210, 0)']
	]);
	ctx.fillRect(0, 0, W, 16 * u);
	stars(ctx, u);

	// A perspective grid racing toward the horizon behind the flippers.
	const horizon = 24.6;
	ctx.save();
	ctx.beginPath();
	ctx.rect(0, horizon * u, W, 12 * u);
	ctx.clip();
	ctx.fillStyle = vgrad(ctx, horizon * u, 37 * u, [
		[0, 'rgba(255, 63, 210, 0.25)'],
		[1, 'rgba(20, 6, 40, 0)']
	]);
	ctx.fillRect(0, horizon * u, W, 12 * u);
	ctx.strokeStyle = 'rgba(255, 63, 210, 0.35)';
	ctx.lineWidth = 0.05 * u;
	for (let k = -10; k <= 10; k += 1) {
		ctx.beginPath();
		ctx.moveTo(CX * u, horizon * u);
		ctx.lineTo((CX + k * 2.2) * u, 37 * u);
		ctx.stroke();
	}
	for (let k = 1; k < 9; k += 1) {
		const y = horizon + Math.pow(k / 8, 2) * 12;
		ctx.beginPath();
		ctx.moveTo(0, y * u);
		ctx.lineTo(W, y * u);
		ctx.stroke();
	}
	ctx.restore();

	// A ringed planet.
	const p = PLANET;
	ctx.fillStyle = radial(ctx, (p.x - 0.7) * u, (p.y - 0.8) * u, p.r * 1.6 * u, [
		[0, '#ffb36b'],
		[0.5, '#c2457a'],
		[1, '#2a0f40']
	]);
	ctx.beginPath();
	ctx.arc(p.x * u, p.y * u, p.r * u, 0, TAU);
	ctx.fill();
	ctx.strokeStyle = 'rgba(255, 225, 74, 0.55)';
	ctx.lineWidth = 0.12 * u;
	ctx.beginPath();
	ctx.ellipse(p.x * u, p.y * u, p.r * 1.7 * u, p.r * 0.42 * u, -0.3, 0, TAU);
	ctx.stroke();

	// The orbits: lanes of light.
	for (const [x0, x1] of [
		[0.5, 2.4],
		[16.2, 18.1]
	] as const) {
		ctx.fillStyle = 'rgba(74, 242, 255, 0.08)';
		ctx.fillRect(x0 * u, 9 * u, (x1 - x0) * u, 7 * u);
		ctx.strokeStyle = 'rgba(74, 242, 255, 0.3)';
		ctx.lineWidth = 0.05 * u;
		for (let y = 9.4; y < 16; y += 0.8) {
			ctx.beginPath();
			ctx.moveTo((x0 + 0.3) * u, y * u);
			ctx.lineTo((x1 - 0.3) * u, (y + 0.3) * u);
			ctx.stroke();
		}
	}
	for (const [x, text] of [
		[1.45, 'HYPERSPACE'],
		[17.15, 'RETURN LANE']
	] as const) {
		ctx.save();
		ctx.translate(x * u, 12.6 * u);
		ctx.rotate(x < CX ? -Math.PI / 2 : Math.PI / 2);
		h.label(ctx, text, 0, 0, 0.46, 'rgba(74, 242, 255, 0.55)', LABEL);
		ctx.restore();
	}

	// The warp: a dark well with rings.
	for (let k = 4; k > 0; k -= 1) {
		ctx.strokeStyle = `rgba(255, 138, 58, ${0.12 * k})`;
		ctx.lineWidth = 0.06 * u;
		ctx.beginPath();
		ctx.arc(WARP.x * u, WARP.y * u, (0.7 + k * 0.28) * u, 0, TAU);
		ctx.stroke();
	}
	h.label(ctx, 'WARP', WARP.x, WARP.y - 1.6, 0.44, 'rgba(255, 138, 58, 0.85)', LABEL);
	h.label(ctx, 'LOCK', 9.3, 16.42, 0.34, 'rgba(255, 138, 58, 0.75)', LABEL);
	h.label(ctx, 'MISSIONS', CX, 22.1, 0.36, 'rgba(74, 242, 255, 0.7)', LABEL);
	h.label(ctx, 'SUPERNOVA', CX, 26.0, 0.32, 'rgba(255, 63, 210, 0.7)', LABEL);
	h.label(ctx, 'KICK', 1.1, 29.55, 0.34, 'rgba(74, 242, 255, 0.7)', LABEL);
	h.label(ctx, 'NOVA PATROL', CX, 29.35, 0.62, 'rgba(74, 242, 255, 0.4)', DISPLAY);
}

/** The diverter's plastic and the upper flipper's bay. */
function paintOver(ctx: CanvasRenderingContext2D, _def: TableDef, h: Parameters<TableArt['paint']>[2]) {
	const u = h.unit;
	ctx.save();
	ctx.beginPath();
	ctx.moveTo(DIVERTER.a.x * u, DIVERTER.a.y * u);
	ctx.lineTo(DIVERTER.b.x * u, DIVERTER.b.y * u);
	ctx.lineTo(DIVERTER.b.x * u, (DIVERTER.b.y - 0.5) * u);
	ctx.lineTo(DIVERTER.a.x * u, (DIVERTER.a.y - 0.9) * u);
	ctx.closePath();
	ctx.fillStyle = 'rgba(74, 242, 255, 0.22)';
	ctx.fill();
	ctx.restore();
	h.label(ctx, 'UPPER FLIPPER', 16.4, 21.3, 0.3, 'rgba(255, 225, 74, 0.6)', LABEL);
}

export const spaceArt: TableArt<SpaceState> = {
	theme: {
		display: DISPLAY,
		label: LABEL,
		wood: ['#06041a', '#100a30'],
		rail: '#8e96b8',
		railShine: 'rgba(200, 240, 255, 0.6)',
		guide: '#b6c4e6',
		post: '#e8ecff',
		postCore: '#4a3aa0',
		rubber: '#e8f6ff',
		flipper: { body: '#e8ecff', rubber: MAGENTA, pivot: CYAN },
		insertOff: 'rgba(14, 10, 46, 0.85)',
		sling: { base: '#1a1050', stripe: CYAN },
		bumper: { style: 'neon', a: CYAN, b: MAGENTA, cap: YELLOW, ring: CYAN, flash: CYAN },
		target: { face: MAGENTA, edge: '#3a0a40', ink: '#fff' },
		ramp: 'rgba(74, 242, 255, 0.2)',
		popup: { ink: '#e8f6ff', big: YELLOW, stroke: 'rgba(10, 4, 30, 0.85)' },
		spark: CYAN,
		hot: [CYAN, MAGENTA]
	},
	inserts,
	bulbs,
	paint,
	paintOver,
	toys(ctx, g, t, h, fx) {
		const u = h.unit;
		const s = g.s;
		// The warp vortex spins faster when it has something lit.
		const busy = s.lockLit || s.missionLit || s.superLit || s.novaLit || s.extraLit;
		ctx.save();
		ctx.translate(WARP.x * u, WARP.y * u);
		ctx.rotate(t * (busy ? 4 : 1.2));
		for (let k = 0; k < 3; k += 1) {
			ctx.rotate(TAU / 3);
			ctx.strokeStyle = busy ? 'rgba(255, 138, 58, 0.8)' : 'rgba(255, 138, 58, 0.35)';
			ctx.lineWidth = 0.08 * u;
			ctx.beginPath();
			ctx.arc(0.25 * u, 0, 0.55 * u, -1.2, 1.2);
			ctx.stroke();
		}
		ctx.restore();
		const warp = fx.hit('warp');
		if (warp > 0) h.shine(ctx, ORANGE, WARP.x, WARP.y, 4.4, warp);
		if (s.storm || s.nova) h.shine(ctx, s.nova ? MAGENTA : CYAN, PLANET.x, PLANET.y, 7, 0.25 + 0.15 * Math.sin(t * 5));
	}
};
