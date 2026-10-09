import { CX, type TableDef } from '../../engine/def';
import { radial, starPath, TAU, vgrad, type Bulb, type Insert, type TableArt } from '../../engine/art';
import type { WoodrailState } from './rules';
import { BUMPERS, KICKOUT, LANES, MID_L, MID_R } from './def';

const TEAL = '#2bb3a6';
const CORAL = '#f2664e';
const MUSTARD = '#f2b632';
const BLUE = '#2f6fb3';
const CREAM = '#fff3d6';
const INK = '#3a2414';
const DISPLAY = '"Lobster", "Barlow Condensed", Georgia, serif';
const LABEL = '"Barlow Condensed", "Arial Narrow", sans-serif';

const inserts: Insert[] = [
	...LANES.map((x, i) => ({ id: `lane${i}`, x, y: 5.5, r: 0.46, color: MUSTARD, label: 'ABCD'[i] })),
	{ id: 'bumpers', x: CX, y: 13.4, r: 0.42, color: CORAL, label: '1000 LIT', shape: 'pill' },
	...[1, 2, 3, 4, 5].map((k, i) => {
		const a = Math.PI + 0.35 + (i / 4) * (Math.PI - 0.7);
		return { id: `kick${k}`, x: KICKOUT.x + Math.cos(a) * 1.55, y: KICKOUT.y + 0.2 + Math.sin(a) * 1.55, r: 0.3, color: TEAL, label: `${k * 3}` };
	}),
	{ id: 'special', x: KICKOUT.x, y: 17.4, r: 0.5, color: CORAL, label: 'SPECIAL', shape: 'pill' },
	{ id: 'sideL', x: 1.55, y: 13.8, r: 0.34, color: MUSTARD, shape: 'diamond' },
	{ id: 'sideR', x: 17.05, y: 13.8, r: 0.34, color: MUSTARD, shape: 'diamond' },
	{ id: 'double', x: 7.9, y: 24.0, r: 0.42, color: TEAL, label: '2×', shape: 'round' },
	{ id: 'triple', x: 10.7, y: 24.0, r: 0.42, color: TEAL, label: '3×', shape: 'round' },
	...Array.from({ length: 10 }, (_, i) => ({
		id: `bonus${i + 1}`,
		x: 7.4 + (i % 5) * 0.95,
		y: 28.4 + Math.floor(i / 5) * 1.0,
		r: 0.32,
		color: MUSTARD,
		label: `${i + 1}`
	})),
	{ id: 'again', x: CX, y: 34.9, r: 0.5, color: CORAL, label: 'SAME PLAYER SHOOTS AGAIN', shape: 'pill' }
];

const bulbs: Bulb[] = [
	...[20.6, 22.0].map((y) => ({ x: 0.9, y, color: MUSTARD })),
	...[20.6, 22.0].map((y) => ({ x: 17.7, y, color: MUSTARD }))
];

/** An atomic-age starburst: thin spikes of two lengths. */
function burst(ctx: CanvasRenderingContext2D, u: number, x: number, y: number, r: number, color: string, spikes = 8) {
	ctx.save();
	ctx.strokeStyle = color;
	ctx.lineCap = 'round';
	for (let i = 0; i < spikes * 2; i += 1) {
		const a = (i / (spikes * 2)) * TAU;
		const len = i % 2 ? r * 0.55 : r;
		ctx.lineWidth = (i % 2 ? 0.05 : 0.08) * u;
		ctx.beginPath();
		ctx.moveTo((x + Math.cos(a) * r * 0.15) * u, (y + Math.sin(a) * r * 0.15) * u);
		ctx.lineTo((x + Math.cos(a) * len) * u, (y + Math.sin(a) * len) * u);
		ctx.stroke();
	}
	ctx.restore();
}

/** A boomerang, the other emblem of the era. */
function boomerang(ctx: CanvasRenderingContext2D, u: number, x: number, y: number, s: number, turn: number, color: string) {
	ctx.save();
	ctx.translate(x * u, y * u);
	ctx.rotate(turn);
	ctx.scale(s * u, s * u);
	ctx.beginPath();
	ctx.moveTo(-1, 0.2);
	ctx.quadraticCurveTo(0, -0.9, 1, 0.2);
	ctx.quadraticCurveTo(0, -0.35, -1, 0.2);
	ctx.closePath();
	ctx.fillStyle = color;
	ctx.fill();
	ctx.restore();
}

function paint(ctx: CanvasRenderingContext2D, _def: TableDef, h: Parameters<TableArt['paint']>[2]) {
	const u = h.unit;
	const W = 20 * u;
	ctx.fillStyle = vgrad(ctx, 0, 37 * u, [
		[0, '#f6ead0'],
		[0.55, '#efdfbd'],
		[1, '#e2cc9e']
	]);
	ctx.fillRect(0, 0, W, 37 * u);

	// Two big colour fields, cut on a slant like a hi-fi cabinet.
	ctx.fillStyle = 'rgba(43, 179, 166, 0.28)';
	ctx.beginPath();
	ctx.moveTo(0, 6 * u);
	ctx.lineTo(W, 12 * u);
	ctx.lineTo(W, 20 * u);
	ctx.lineTo(0, 15 * u);
	ctx.closePath();
	ctx.fill();
	ctx.fillStyle = 'rgba(242, 102, 78, 0.2)';
	ctx.beginPath();
	ctx.moveTo(0, 19 * u);
	ctx.lineTo(W, 23 * u);
	ctx.lineTo(W, 27 * u);
	ctx.lineTo(0, 24 * u);
	ctx.closePath();
	ctx.fill();

	for (const [x, y, r, c] of [
		[3.4, 6.2, 1.6, 'rgba(242, 102, 78, 0.55)'],
		[15.6, 4.6, 1.2, 'rgba(47, 111, 179, 0.5)'],
		[2.6, 23.4, 1.1, 'rgba(47, 111, 179, 0.45)'],
		[16.0, 21.8, 1.4, 'rgba(242, 102, 78, 0.5)'],
		[CX, 20.4, 1.0, 'rgba(242, 182, 50, 0.7)']
	] as const) burst(ctx, u, x, y, r, c);
	boomerang(ctx, u, 5.2, 12.2, 1.1, -0.3, 'rgba(242, 182, 50, 0.55)');
	boomerang(ctx, u, 13.6, 13.2, 1.0, 0.4, 'rgba(43, 179, 166, 0.55)');
	boomerang(ctx, u, 4.2, 26.6, 0.8, 0.2, 'rgba(47, 111, 179, 0.4)');
	boomerang(ctx, u, 14.4, 26.6, 0.8, -0.2, 'rgba(47, 111, 179, 0.4)');

	// Rings printed under each pop bumper.
	for (const b of BUMPERS) {
		ctx.strokeStyle = 'rgba(58, 36, 20, 0.25)';
		ctx.lineWidth = 0.08 * u;
		ctx.beginPath();
		ctx.arc(b.x * u, b.y * u, 1.35 * u, 0, TAU);
		ctx.stroke();
	}

	// A swept arc printed under each upper flipper, showing its throw.
	for (const f of [MID_L, MID_R]) {
		ctx.fillStyle = 'rgba(47, 111, 179, 0.18)';
		ctx.beginPath();
		ctx.moveTo(f.px * u, f.py * u);
		ctx.arc(f.px * u, f.py * u, (f.len + 0.4) * u, Math.min(f.rest, f.up), Math.max(f.rest, f.up));
		ctx.closePath();
		ctx.fill();
	}

	// The kick-out hole's starburst.
	ctx.fillStyle = radial(ctx, KICKOUT.x * u, KICKOUT.y * u, 2.4 * u, [
		[0, 'rgba(242, 182, 50, 0.5)'],
		[1, 'rgba(242, 182, 50, 0)']
	]);
	ctx.fillRect((KICKOUT.x - 2.4) * u, (KICKOUT.y - 2.4) * u, 4.8 * u, 4.8 * u);
	starPath(ctx, KICKOUT.x * u, KICKOUT.y * u, 1.1 * u, 0.5, 8);
	ctx.fillStyle = 'rgba(242, 102, 78, 0.35)';
	ctx.fill();

	h.label(ctx, 'KICK-OUT · THOUSANDS', CX, 18.4, 0.36, 'rgba(58, 36, 20, 0.7)', LABEL);
	h.label(ctx, 'BONUS', CX, 27.5, 0.38, 'rgba(58, 36, 20, 0.65)', LABEL);
	h.label(ctx, 'DOUBLE BONUS', 1.55, 15.1, 0.28, 'rgba(58, 36, 20, 0.7)', LABEL);
	h.label(ctx, 'DOUBLE BONUS', 17.05, 15.1, 0.28, 'rgba(58, 36, 20, 0.7)', LABEL);
	h.label(ctx, 'Hi-Fi Holiday', CX, 25.9, 1.15, 'rgba(242, 102, 78, 0.85)', DISPLAY);
	h.label(ctx, 'SPELL A·B·C·D', CX, 6.6, 0.36, 'rgba(58, 36, 20, 0.6)', LABEL);
}

/** Lacquered wooden side rails, over everything printed. */
function paintOver(ctx: CanvasRenderingContext2D, _def: TableDef, h: Parameters<TableArt['paint']>[2]) {
	const u = h.unit;
	for (const x of [0, 19.7]) {
		const g = ctx.createLinearGradient(x * u, 0, (x + 0.3) * u, 0);
		g.addColorStop(0, '#5a3418');
		g.addColorStop(0.5, '#a8743c');
		g.addColorStop(1, '#5a3418');
		ctx.fillStyle = g;
		ctx.fillRect(x * u, 10 * u, 0.3 * u, 27 * u);
	}
}

export const woodrailArt: TableArt<WoodrailState> = {
	theme: {
		display: DISPLAY,
		label: LABEL,
		wood: ['#6a3e1c', '#9b6430'],
		rail: '#c9c6bd',
		railShine: 'rgba(255, 255, 255, 0.75)',
		guide: '#d6d3cb',
		post: '#f6efe0',
		postCore: '#c8352b',
		rubber: '#fbf6ea',
		flipper: { body: '#fbf6ea', rubber: '#c8352b', pivot: '#c9c6bd' },
		insertOff: 'rgba(120, 90, 60, 0.35)',
		sling: { base: '#f6efe0', stripe: TEAL },
		bumper: { style: 'classic', a: CORAL, b: CREAM, cap: BLUE, ring: '#c9c6bd', flash: MUSTARD },
		target: { face: MUSTARD, edge: '#8a5a10', ink: INK },
		ramp: 'rgba(43, 179, 166, 0.2)',
		popup: { ink: INK, big: CORAL, stroke: 'rgba(255, 243, 214, 0.9)' },
		spark: MUSTARD,
		hot: [CORAL, TEAL]
	},
	inserts,
	bulbs,
	paint,
	paintOver,
	toys(ctx, g, t, h, fx) {
		const kick = fx.hit('kickout');
		if (kick > 0) h.shine(ctx, MUSTARD, KICKOUT.x, KICKOUT.y, 4, kick);
		if (g.s.bumpersLit) for (const b of BUMPERS) h.shine(ctx, CORAL, b.x, b.y, 3, 0.25 + 0.1 * Math.sin(t * 4 + b.x));
	}
};
