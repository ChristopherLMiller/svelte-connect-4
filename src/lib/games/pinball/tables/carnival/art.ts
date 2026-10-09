import { along, archPoint, CX, type TableDef } from '../../engine/def';
import { RAMP_L } from '../parts';
import { disc, radial, rays, TAU, vgrad, type Bulb, type Helpers, type Insert, type TableArt } from '../../engine/art';
import type { Game } from '../../engine/game';
import { ATTRACTIONS, WHEEL_PRIZES, wheelAngle, type CarnivalState } from './rules';
import { LANES, PHANTOM, ZELDA } from './def';

const GOLD = '#ffc24a';
const RED = '#ff4b5c';
const GREEN = '#7dff9a';
const VIOLET = '#c48cff';
const CYAN = '#7fe8ff';
const PINK = '#ff5ad1';
const WHEEL = { x: CX, y: 24.4, r: 2.6 };
/** The Ghost Train's tunnel, over the wireform where it turns at the top of the ramp. */
const TUNNEL = { x: 2.75, y: 4.75 };
/** How long the tunnel's show runs after a ride, in seconds. */
const TRAIN_SHOW_S = 2.6;
const DISPLAY = '"Creepster", "Barlow Condensed", Impact, sans-serif';
const LABEL = '"Barlow Condensed", "Arial Narrow", sans-serif';

const up = -Math.PI / 2;
const inserts: Insert[] = [
	...LANES.map((x, i) => ({ id: `lane${i}`, x, y: 5.4, r: 0.42, color: GOLD, label: 'BOO'[i] })),
	...[0, 1, 2, 3].map((i) => ({ id: `fate${i}`, x: 7.99 + i * 0.9, y: 14.5, r: 0.32, color: RED, label: 'FATE'[i] })),
	{ id: 'lock0', x: 8.4, y: 15.6, r: 0.3, color: VIOLET, shape: 'diamond' },
	{ id: 'lock1', x: 10.2, y: 15.6, r: 0.3, color: VIOLET, shape: 'diamond' },
	{ id: 'extra', x: CX, y: 17.3, r: 0.45, color: GOLD, label: 'EB' },
	...[0, 1, 2, 3].map((i) => ({ id: `train${i}`, x: 3.95 + i * 0.43, y: 20.15, r: 0.17, color: GREEN })),
	{ id: 'arrow:train', x: 4.6, y: 18.5, r: 0.42, color: GREEN, shape: 'arrow', turn: up - 0.05 },
	{ id: 'arrow:wheel', x: 14.0, y: 18.5, r: 0.42, color: GOLD, shape: 'arrow', turn: up + 0.05 },
	{ id: 'arrow:orbitL', x: 3.4, y: 21.1, r: 0.4, color: CYAN, shape: 'arrow', turn: up - 0.6 },
	{ id: 'arrow:orbitR', x: 15.2, y: 21.1, r: 0.4, color: CYAN, shape: 'arrow', turn: up + 0.6 },
	{ id: 'arrow:phantom', x: CX, y: 21.9, r: 0.38, color: GREEN, shape: 'arrow', turn: up },
	{ id: 'arrow:zelda', x: ZELDA.x, y: 16.3, r: 0.38, color: VIOLET, shape: 'arrow', turn: up },
	...ATTRACTIONS.map((a, i) => {
		const ang = ((-150 + i * 60) * Math.PI) / 180;
		return { id: `attr${i}`, x: WHEEL.x + Math.cos(ang) * 2.05, y: WHEEL.y + Math.sin(ang) * 2.05, r: 0.36, color: GOLD, label: a.name[0] };
	}),
	{ id: 'wizard', x: CX, y: 27.75, r: 0.5, color: PINK, shape: 'star' },
	...[2, 3, 4, 5, 6].map((m, i) => ({ id: `mult${m}`, x: 7.3 + i, y: 30.9, r: 0.3, color: CYAN, label: `${m}×` })),
	{ id: 'kick', x: 1.1, y: 28.6, r: 0.38, color: CYAN, shape: 'arrow', turn: up },
	{ id: 'again', x: CX, y: 34.9, r: 0.5, color: GOLD, label: 'SHOOT AGAIN', shape: 'pill' }
];

const bulbs: Bulb[] = [];
for (let deg = 196; deg <= 344; deg += 9) {
	const p = archPoint({ x: 10, y: 10, r: 9.6 }, deg, 9.05);
	bulbs.push({ ...p, color: [GOLD, RED, '#fff3d6'][bulbs.length % 3]! });
}

function paint(ctx: CanvasRenderingContext2D, def: TableDef, h: Parameters<TableArt['paint']>[2]) {
	const u = h.unit;
	const W = 20 * u;
	ctx.fillStyle = vgrad(ctx, 0, 37 * u, [
		[0, '#3b1550'],
		[0.45, '#2a103d'],
		[1, '#16081f']
	]);
	ctx.fillRect(0, 0, W, 37 * u);

	// Big-top canvas: stripes fanning down from the peak of the tent.
	rays(ctx, u, CX, -5, 22, Math.PI * 0.18, Math.PI * 0.82, 'rgba(170, 24, 60, 0.22)', 'rgba(255, 220, 190, 0.05)');
	ctx.fillStyle = vgrad(ctx, 4 * u, 21 * u, [
		[0, 'rgba(36, 14, 52, 0)'],
		[1, 'rgba(36, 14, 52, 1)']
	]);
	ctx.fillRect(0, 4 * u, W, 17 * u);
	ctx.fillStyle = '#24102f';
	ctx.fillRect(0, 21 * u, W, 16 * u);
	ctx.fillStyle = vgrad(ctx, 21 * u, 37 * u, [
		[0, 'rgba(36, 14, 52, 0)'],
		[1, 'rgba(10, 4, 16, 0.9)']
	]);
	ctx.fillRect(0, 21 * u, W, 16 * u);

	// A harvest moon behind the big wheel.
	ctx.fillStyle = radial(ctx, (WHEEL.x + 1.4) * u, (WHEEL.y - 1.2) * u, 5 * u, [
		[0, 'rgba(255, 214, 150, 0.22)'],
		[0.55, 'rgba(255, 180, 110, 0.08)'],
		[1, 'rgba(255, 180, 110, 0)']
	]);
	ctx.fillRect(0, 17 * u, W, 14 * u);
	ctx.save();
	ctx.strokeStyle = 'rgba(255, 194, 74, 0.22)';
	ctx.lineWidth = 0.07 * u;
	for (const rr of [WHEEL.r, WHEEL.r * 0.8]) {
		ctx.beginPath();
		ctx.arc(WHEEL.x * u, WHEEL.y * u, rr * u, 0, TAU);
		ctx.stroke();
	}
	ctx.restore();

	// Spotlight pooled under the bumpers.
	ctx.fillStyle = radial(ctx, CX * u, 9.4 * u, 6.5 * u, [
		[0, 'rgba(255, 190, 110, 0.16)'],
		[1, 'rgba(255, 190, 110, 0)']
	]);
	ctx.fillRect(0, 0, W, 18 * u);

	// The orbits: dark boardwalks with planks.
	for (const [x0, x1] of [
		[0.5, 2.4],
		[16.2, 18.1]
	] as const) {
		ctx.fillStyle = 'rgba(8, 4, 12, 0.5)';
		ctx.fillRect(x0 * u, 9 * u, (x1 - x0) * u, 8 * u);
		ctx.strokeStyle = 'rgba(120, 90, 60, 0.5)';
		ctx.lineWidth = 0.1 * u;
		for (let y = 9.4; y < 16.6; y += 0.6) {
			ctx.beginPath();
			ctx.moveTo((x0 + 0.2) * u, y * u);
			ctx.lineTo((x1 - 0.2) * u, y * u);
			ctx.stroke();
		}
	}
	for (const [x, text] of [
		[1.45, 'HALL OF MIRRORS'],
		[17.15, 'HALL OF MIRRORS']
	] as const) {
		ctx.save();
		ctx.translate(x * u, 13.4 * u);
		ctx.rotate(x < CX ? -Math.PI / 2 : Math.PI / 2);
		h.label(ctx, text, 0, 0, 0.5, 'rgba(127, 232, 255, 0.5)', LABEL);
		ctx.restore();
	}

	// The phantom's beat: a smear of ectoplasm along its path.
	ctx.strokeStyle = 'rgba(125, 255, 154, 0.12)';
	ctx.lineWidth = 1.1 * u;
	ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.moveTo((PHANTOM.x - PHANTOM.reach) * u, PHANTOM.y * u);
	ctx.lineTo((PHANTOM.x + PHANTOM.reach) * u, PHANTOM.y * u);
	ctx.stroke();

	// Madame Zelda's booth: a crystal-ball halo around the saucer.
	ctx.fillStyle = radial(ctx, ZELDA.x * u, ZELDA.y * u, 1.6 * u, [
		[0, 'rgba(196, 140, 255, 0.35)'],
		[1, 'rgba(196, 140, 255, 0)']
	]);
	ctx.fillRect((ZELDA.x - 1.6) * u, (ZELDA.y - 1.6) * u, 3.2 * u, 3.2 * u);
	ctx.strokeStyle = 'rgba(232, 200, 255, 0.45)';
	ctx.lineWidth = 0.06 * u;
	ctx.beginPath();
	ctx.arc(ZELDA.x * u, ZELDA.y * u, 1.05 * u, 0, TAU);
	ctx.stroke();
	h.label(ctx, 'ZELDA', ZELDA.x, ZELDA.y - 1.35, 0.46, 'rgba(232, 200, 255, 0.85)', LABEL);
	h.label(ctx, 'LOCK', 9.3, 15.62, 0.36, 'rgba(196, 140, 255, 0.75)', LABEL);
	h.label(ctx, 'TRAIN', 4.6, 19.45, 0.4, 'rgba(125, 255, 154, 0.7)', LABEL);
	h.label(ctx, 'WHEEL', 14.0, 19.45, 0.4, 'rgba(255, 194, 74, 0.7)', LABEL);
	h.label(ctx, 'KICK', 1.1, 29.55, 0.34, 'rgba(127, 232, 255, 0.7)', LABEL);
	h.label(ctx, 'HAUNTED CARNIVAL', CX, 29.35, 0.72, 'rgba(255, 194, 74, 0.38)', DISPLAY);

	// The shooter lane.
	const lane = def.lane;
	ctx.fillStyle = 'rgba(6, 3, 9, 0.6)';
	ctx.fillRect((lane.wall + 0.1) * u, 11.5 * u, (19.55 - lane.wall - 0.1) * u, 25 * u);
	ctx.strokeStyle = 'rgba(255, 194, 74, 0.35)';
	ctx.lineWidth = 0.1 * u;
	for (let k = 0; k < 4; k += 1) {
		const y = 24 + k * 1.3;
		ctx.beginPath();
		ctx.moveTo((lane.x - 0.35) * u, (y + 0.35) * u);
		ctx.lineTo(lane.x * u, y * u);
		ctx.lineTo((lane.x + 0.35) * u, (y + 0.35) * u);
		ctx.stroke();
	}
}

function drawPhantom(ctx: CanvasRenderingContext2D, u: number, x: number, y: number, r: number, squish: number, t: number, hot: string | null) {
	const px = x * u;
	const py = (y + Math.sin(t * 2.4) * 0.08) * u;
	const rr = r * u;
	ctx.save();
	ctx.globalCompositeOperation = 'lighter';
	ctx.globalAlpha = hot ? 0.85 : 0.5;
	ctx.fillStyle = radial(ctx, px, py, rr * 2.2, [
		[0, hot ?? GREEN],
		[1, 'rgba(0, 0, 0, 0)']
	]);
	ctx.fillRect(px - rr * 2.2, py - rr * 2.2, rr * 4.4, rr * 4.4);
	ctx.restore();
	ctx.save();
	ctx.translate(px, py);
	ctx.scale(1 + squish * 0.18, 1 - squish * 0.2);
	ctx.fillStyle = 'rgba(244, 248, 255, 0.94)';
	ctx.beginPath();
	ctx.arc(0, -rr * 0.12, rr * 0.92, Math.PI, TAU);
	const hem = rr * 0.95;
	ctx.lineTo(rr * 0.92, hem * 0.6);
	for (let k = 4; k > 0; k -= 1) {
		const x1 = -rr * 0.92 + ((k - 0.5) / 4) * rr * 1.84;
		const x2 = -rr * 0.92 + ((k - 1) / 4) * rr * 1.84;
		ctx.quadraticCurveTo(x1, hem + Math.sin(t * 6 + k) * 0.12 * rr, x2, hem * 0.6);
	}
	ctx.closePath();
	ctx.fill();
	ctx.fillStyle = '#1a0f24';
	const eye = squish > 0.4 ? 0.06 : 0.14;
	ctx.beginPath();
	ctx.ellipse(-rr * 0.32, -rr * 0.2, rr * 0.13, rr * eye, 0, 0, TAU);
	ctx.ellipse(rr * 0.32, -rr * 0.2, rr * 0.13, rr * eye, 0, 0, TAU);
	ctx.fill();
	ctx.beginPath();
	ctx.ellipse(0, rr * 0.22, rr * (0.12 + squish * 0.08), rr * (0.16 + squish * 0.12), 0, 0, TAU);
	ctx.fill();
	ctx.restore();
}

/** The prize wheel round the clock, with a pointer at the top and bulbs on the rim that chase while it spins. */
function drawWheel(ctx: CanvasRenderingContext2D, u: number, g: Game<CarnivalState>, t: number, h: Helpers, landed: number) {
	const s = g.s;
	// The renderer passes t = 0 for reduced motion: show where the wheel will stop.
	const a = t === 0 && s.spin ? s.spin.to : wheelAngle(s, g.time);
	const n = WHEEL_PRIZES.length;
	const x = WHEEL.x * u;
	const y = WHEEL.y * u;
	const r0 = 1.0 * u;
	const r1 = 1.62 * u;
	const spinning = !!s.spin;
	for (let i = 0; i < n; i += 1) {
		const p = WHEEL_PRIZES[i]!;
		const a0 = a + (i / n) * TAU;
		const a1 = a + ((i + 1) / n) * TAU;
		const won = !spinning && s.wheelLast === i && landed > 0;
		ctx.globalAlpha = won ? 0.6 + 0.4 * Math.abs(Math.sin(t * 18)) : spinning ? 0.9 : 0.6;
		ctx.fillStyle = i % 2 ? p.color : shade(p.color);
		ctx.beginPath();
		ctx.arc(x, y, r1, a0, a1);
		ctx.arc(x, y, r0, a1, a0, true);
		ctx.closePath();
		ctx.fill();
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate((a0 + a1) / 2 + Math.PI / 2);
		ctx.globalAlpha = 1;
		h.label(ctx, p.label, 0, -1.31, p.label.length > 3 ? 0.2 : 0.26, '#1a0822', LABEL);
		ctx.restore();
	}
	ctx.globalAlpha = 1;
	ctx.strokeStyle = '#e0b04a';
	ctx.lineWidth = 0.06 * u;
	for (let i = 0; i < n; i += 1) {
		const k = a + (i / n) * TAU;
		ctx.beginPath();
		ctx.moveTo(x + Math.cos(k) * r0, y + Math.sin(k) * r0);
		ctx.lineTo(x + Math.cos(k) * r1, y + Math.sin(k) * r1);
		ctx.stroke();
	}
	for (const rr of [r0, r1]) {
		ctx.beginPath();
		ctx.arc(x, y, rr, 0, TAU);
		ctx.stroke();
	}
	// The pointer.
	ctx.fillStyle = '#ffd34a';
	ctx.strokeStyle = '#3a2410';
	ctx.lineWidth = 0.04 * u;
	ctx.beginPath();
	ctx.moveTo(x, y - r1 + 0.12 * u);
	ctx.lineTo(x - 0.22 * u, y - r1 - 0.3 * u);
	ctx.lineTo(x + 0.22 * u, y - r1 - 0.3 * u);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	// Rim bulbs.
	const bulbs = 16;
	for (let i = 0; i < bulbs; i += 1) {
		const k = a * 0.5 + (i / bulbs) * TAU;
		const bx = WHEEL.x + Math.cos(k) * WHEEL.r;
		const by = WHEEL.y + Math.sin(k) * WHEEL.r;
		const step = Math.floor(t * (spinning ? 18 : 4));
		const on = landed > 0 ? Math.sin(t * 20) > 0 : (step + i) % (spinning ? 2 : 4) === 0;
		const color = i % 2 ? GOLD : RED;
		disc(ctx, bx * u, by * u, 0.11 * u, on ? '#fff6d8' : color);
		if (on) h.shine(ctx, color, bx, by, 1.3, 0.9);
	}
	if (spinning) h.shine(ctx, GOLD, WHEEL.x, WHEEL.y, 6, 0.25 + 0.15 * Math.sin(t * 12));
	if (landed > 0) h.shine(ctx, WHEEL_PRIZES[Math.max(0, s.wheelLast)]!.color, WHEEL.x, WHEEL.y, 8, landed * 0.8);
}

/** A darker stripe of the same colour for alternate wheel segments. */
function shade(hex: string) {
	const v = parseInt(hex.slice(1), 16);
	const k = (c: number) => Math.round(c * 0.72);
	return `rgb(${k(v >> 16)}, ${k((v >> 8) & 255)}, ${k(v & 255)})`;
}

function drawClock(ctx: CanvasRenderingContext2D, u: number, s: CarnivalState, t: number) {
	const x = WHEEL.x * u;
	const y = WHEEL.y * u;
	const r = 0.95 * u;
	const midnight = s.midnight || s.wizard;
	disc(ctx, x, y, r, midnight ? '#e9ffe6' : '#f1e3c4');
	ctx.strokeStyle = '#7a5a26';
	ctx.lineWidth = 0.1 * u;
	ctx.beginPath();
	ctx.arc(x, y, r, 0, TAU);
	ctx.stroke();
	ctx.strokeStyle = '#3a2410';
	ctx.lineWidth = 0.05 * u;
	for (let i = 0; i < 12; i += 1) {
		const a = (i / 12) * TAU;
		ctx.beginPath();
		ctx.moveTo(x + Math.cos(a) * r * 0.76, y + Math.sin(a) * r * 0.76);
		ctx.lineTo(x + Math.cos(a) * r * 0.92, y + Math.sin(a) * r * 0.92);
		ctx.stroke();
	}
	// The hour hand creeps toward midnight with each lock, and spins once it strikes.
	const hour = midnight ? t * 6 : ((10 + s.locks) / 12) * TAU;
	const hand = (a: number, len: number, width: number) => {
		ctx.lineWidth = width * u;
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.lineTo(x + Math.sin(a) * len * r, y - Math.cos(a) * len * r);
		ctx.stroke();
	};
	ctx.strokeStyle = '#2a1608';
	ctx.lineCap = 'round';
	hand(hour, 0.55, 0.11);
	hand(midnight ? t * 1.3 : 0, 0.82, 0.07);
}

const RAMP_LEN = RAMP_L.reduce((sum, p, i) => (i ? sum + Math.hypot(p.x - RAMP_L[i - 1]!.x, p.y - RAMP_L[i - 1]!.y) : 0), 0);

/** Bulbs up both rails of the Ghost Train ramp: a lazy crawl, racing up the ramp when it's lit or just ridden. */
function drawRampChase(ctx: CanvasRenderingContext2D, u: number, h: Helpers, t: number, show: number, lit: boolean) {
	const n = 9;
	const fast = show > 0 || lit;
	const step = Math.floor(t * (fast ? 14 : 3));
	for (let i = 0; i < n; i += 1) {
		const p = along(RAMP_L, 0.5 + (i / (n - 1)) * (RAMP_LEN - 1));
		const on = t === 0 ? i % 2 === 0 : (step - i + n * 4) % (fast ? 3 : 5) === 0;
		for (const side of [-1, 1]) {
			const x = p.x - p.dy * 0.86 * side;
			const y = p.y + p.dx * 0.86 * side;
			disc(ctx, x * u, y * u, 0.09 * u, on ? '#eaffef' : 'rgba(40, 90, 56, 0.9)');
			if (on && fast) h.shine(ctx, GREEN, x, y, 1.2, 0.8);
		}
	}
}

/** The tunnel mouth: a skull over doors that burst open, a ghost flying out, as the train comes through. */
function drawTunnel(ctx: CanvasRenderingContext2D, u: number, h: Helpers, t: number, age: number, lit: boolean) {
	const show = age < TRAIN_SHOW_S ? 1 - age / TRAIN_SHOW_S : 0;
	const open = show > 0 ? Math.min(1, age / 0.12) * Math.min(1, (TRAIN_SHOW_S - age) / 0.5) : 0;
	const { x, y } = TUNNEL;
	const glow = Math.max(show, lit ? 0.35 + 0.25 * Math.sin(t * 6) : 0);
	if (glow > 0) h.shine(ctx, GREEN, x, y, 4.2, glow * 0.85);

	ctx.fillStyle = '#2a1236';
	ctx.strokeStyle = '#b98d3e';
	ctx.lineWidth = 0.07 * u;
	ctx.beginPath();
	ctx.moveTo((x - 0.85) * u, (y + 0.6) * u);
	ctx.lineTo((x - 0.85) * u, (y - 0.3) * u);
	ctx.arc(x * u, (y - 0.3) * u, 0.85 * u, Math.PI, TAU);
	ctx.lineTo((x + 0.85) * u, (y + 0.6) * u);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();

	const mouth = () => {
		ctx.beginPath();
		ctx.moveTo((x - 0.5) * u, (y + 0.6) * u);
		ctx.lineTo((x - 0.5) * u, (y - 0.2) * u);
		ctx.arc(x * u, (y - 0.2) * u, 0.5 * u, Math.PI, TAU);
		ctx.lineTo((x + 0.5) * u, (y + 0.6) * u);
		ctx.closePath();
	};
	mouth();
	ctx.fillStyle = glow > 0 ? radial(ctx, x * u, y * u, 0.9 * u, [
		[0, `rgba(190, 255, 205, ${0.4 + glow * 0.6})`],
		[1, 'rgba(20, 70, 34, 1)']
	]) : '#07030a';
	ctx.fill();
	// The doors swing back to the jambs as the train comes through.
	ctx.save();
	mouth();
	ctx.clip();
	const leaf = 0.5 * (1 - open * 0.85);
	ctx.fillStyle = '#5a1e30';
	ctx.fillRect((x - 0.5) * u, (y - 0.75) * u, leaf * u, 1.4 * u);
	ctx.fillRect((x + 0.5 - leaf) * u, (y - 0.75) * u, leaf * u, 1.4 * u);
	ctx.strokeStyle = 'rgba(20, 6, 12, 0.7)';
	ctx.lineWidth = 0.04 * u;
	for (let k = 1; k < 3; k += 1) {
		ctx.beginPath();
		ctx.moveTo((x - 0.5) * u, (y - 0.7 + k * 0.45) * u);
		ctx.lineTo((x - 0.5 + leaf) * u, (y - 0.7 + k * 0.45) * u);
		ctx.moveTo((x + 0.5 - leaf) * u, (y - 0.7 + k * 0.45) * u);
		ctx.lineTo((x + 0.5) * u, (y - 0.7 + k * 0.45) * u);
		ctx.stroke();
	}
	ctx.restore();

	// The skull over the arch; its eyes blaze when the train goes by.
	const sy = y - 1.18;
	disc(ctx, x * u, sy * u, 0.3 * u, '#efe6d2');
	ctx.fillStyle = '#efe6d2';
	ctx.fillRect((x - 0.16) * u, (sy + 0.15) * u, 0.32 * u, 0.2 * u);
	const eye = show > 0 && (t === 0 || Math.sin(t * 22) > -0.3) ? RED : '#1a0822';
	disc(ctx, (x - 0.11) * u, (sy - 0.02) * u, 0.08 * u, eye);
	disc(ctx, (x + 0.11) * u, (sy - 0.02) * u, 0.08 * u, eye);
	if (eye === RED) {
		h.shine(ctx, RED, x - 0.11, sy - 0.02, 0.9, 0.9);
		h.shine(ctx, RED, x + 0.11, sy - 0.02, 0.9, 0.9);
	}
	h.label(ctx, 'GHOST TRAIN', x, y + 0.88, 0.3, 'rgba(125, 255, 154, 0.85)', LABEL);

	if (show > 0 && t !== 0) {
		ctx.save();
		ctx.globalAlpha = show;
		drawPhantom(ctx, u, x + Math.sin(age * 5) * 0.25, y - 0.1 - age * 1.6, 0.42, 0, t, GREEN);
		ctx.restore();
	}
}

/** Carriages under and behind a ball riding the Ghost Train wireform. */
function drawCarriages(ctx: CanvasRenderingContext2D, u: number, g: Game<CarnivalState>) {
	for (const b of g.world.balls) {
		if (b.state !== 'riding' || b.ride < 0) continue;
		const geo = g.world.rides[b.ride];
		if (!geo || geo.ride.id !== 'trainRide') continue;
		for (let k = 2; k >= 0; k -= 1) {
			const at = b.rideS - k * 0.62;
			if (at < 0) continue;
			const p = along(geo.ride.path, at);
			ctx.save();
			ctx.translate(p.x * u, p.y * u);
			ctx.rotate(Math.atan2(p.dy, p.dx));
			ctx.fillStyle = k ? '#3a1450' : '#5a1e30';
			ctx.strokeStyle = GOLD;
			ctx.lineWidth = 0.04 * u;
			ctx.beginPath();
			ctx.roundRect(-0.28 * u, -0.2 * u, 0.56 * u, 0.4 * u, 0.08 * u);
			ctx.fill();
			ctx.stroke();
			ctx.fillStyle = GREEN;
			ctx.fillRect(-0.18 * u, -0.1 * u, 0.12 * u, 0.2 * u);
			ctx.fillRect(0.06 * u, -0.1 * u, 0.12 * u, 0.2 * u);
			ctx.restore();
		}
	}
}

export const carnivalArt: TableArt<CarnivalState> = {
	theme: {
		display: DISPLAY,
		label: LABEL,
		wood: ['#120914', '#1d0f22'],
		rail: '#b98d3e',
		railShine: 'rgba(255, 230, 160, 0.55)',
		guide: '#b9b4c6',
		post: '#f2ece0',
		postCore: '#8a7d6c',
		rubber: '#ede6d6',
		flipper: { body: '#f4ecd8', rubber: '#c4213d', pivot: '#e0b04a' },
		insertOff: 'rgba(30, 14, 40, 0.85)',
		sling: { base: '#e8d8b8', stripe: '#b3203a' },
		bumper: { style: 'carousel', a: '#c4213d', b: '#f2e2c0', cap: '#e0b04a', ring: '#e0b04a', flash: GOLD },
		target: { face: '#ff6a5a', edge: '#7a0c1c', ink: '#fff2dc' },
		ramp: 'rgba(125, 255, 154, 0.2)',
		popup: { ink: '#fff2c8', big: GOLD, stroke: 'rgba(30, 8, 30, 0.85)' },
		spark: GOLD,
		hot: [GREEN, VIOLET]
	},
	inserts,
	bulbs,
	paint,
	toys(ctx, g, t, h, fx) {
		const u = h.unit;
		const s = g.s;
		drawWheel(ctx, u, g, t, h, fx.hit('cue:wheelPrize'));
		drawClock(ctx, u, s, t);
		const m = g.world.movers.phantom;
		if (m) {
			const hot = s.wizard ? PINK : g.mode?.lit.includes('phantom') ? GOLD : null;
			drawPhantom(ctx, u, m.x, m.y, 0.8, fx.hit('phantom'), t, hot);
		}
		const zelda = fx.hit('zelda');
		if (zelda > 0) h.shine(ctx, VIOLET, ZELDA.x, ZELDA.y, 3.6, zelda);
	},
	raised(ctx, g, t, h) {
		const u = h.unit;
		const s = g.s;
		const age = g.time - s.trainAt;
		const lit = s.wizard || !!g.mode?.lit.includes('train') || s.jackpotLit.includes('train');
		drawRampChase(ctx, u, h, t, age < TRAIN_SHOW_S ? 1 : 0, lit);
		drawTunnel(ctx, u, h, t, age, lit);
		drawCarriages(ctx, u, g);
	}
};
