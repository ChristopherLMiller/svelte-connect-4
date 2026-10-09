import { archPoint, CX, type TableDef } from '../../engine/def';
import { radial, rays, TAU, vgrad, type Bulb, type Insert, type TableArt } from '../../engine/art';
import { RAMP_MOUTH } from '../parts';
import { BOUNTIES, vaultOpen, type WesternState } from './rules';
import { aiming } from '../../engine/game';
import { BUMPERS, LANES, MINE, OUTLAW_TARGETS, OUTLAWS, QUICK_DRAW, SALOON, TRAIN, VAULT } from './def';

const GOLD = '#ffd24a';
const RUST = '#ff4a2a';
const SAND = '#f0c890';
const SAGE = '#9ad46a';
const SKY = '#6ad0ff';
const DISPLAY = 'Rye, Georgia, serif';
const LABEL = '"Barlow Condensed", "Arial Narrow", sans-serif';

const up = -Math.PI / 2;
/** Out from each outlaw's face, toward the flippers. */
const face = (() => {
	const tg = OUTLAW_TARGETS[0]!;
	const dx = tg.bx - tg.ax;
	const dy = tg.by - tg.ay;
	const len = Math.hypot(dx, dy);
	return { x: -dy / len, y: dx / len };
})();
const MINE_MOUTH = MINE[0]!;
const inserts: Insert[] = [
	...LANES.map((x, i) => ({ id: `lane${i}`, x, y: 5.0, r: 0.4, color: GOLD, label: 'GUN'[i] })),
	...OUTLAWS.map((p, i) => ({ id: `outlaw${i}`, x: p.x + face.x * 0.8, y: p.y + face.y * 0.8, r: 0.28, color: RUST, shape: 'star' as const })),
	{ id: 'extra', x: SALOON.x + 1.35, y: SALOON.y + 0.9, r: 0.4, color: GOLD, label: 'EB' },
	...Array.from({ length: 6 }, (_, i) => ({ id: `dial${i}`, x: VAULT.x - 1.0 + i * 0.4, y: VAULT.y + 1.3, r: 0.15, color: GOLD })),
	...[0, 1].map((i) => ({ id: `job${i}`, x: VAULT.x - 1.45, y: VAULT.y - 0.45 + i * 0.9, r: 0.26, color: SAGE, label: '$' })),
	{ id: 'arrow:mine', x: MINE_MOUTH.x, y: MINE_MOUTH.y + 1.3, r: 0.42, color: SAND, shape: 'arrow', turn: up },
	{ id: 'arrow:rail', x: RAMP_MOUTH.right.x, y: RAMP_MOUTH.right.y, r: 0.42, color: GOLD, shape: 'arrow', turn: up + 0.05 },
	{ id: 'arrow:orbitL', x: 3.4, y: 21.1, r: 0.4, color: SKY, shape: 'arrow', turn: up - 0.6 },
	{ id: 'arrow:orbitR', x: 15.2, y: 21.1, r: 0.4, color: SKY, shape: 'arrow', turn: up + 0.6 },
	{ id: 'arrow:train', x: 6.9, y: 19.6, r: 0.38, color: RUST, shape: 'arrow', turn: up - 0.12 },
	{ id: 'arrow:saloon', x: SALOON.x, y: SALOON.y + 1.5, r: 0.38, color: GOLD, shape: 'arrow', turn: up },
	{ id: 'arrow:vault', x: VAULT.x, y: VAULT.y + 2.0, r: 0.36, color: SAGE, shape: 'arrow', turn: up },
	...BOUNTIES.map((v, i) => {
		const a = Math.PI + 0.25 + (i / 5) * (Math.PI - 0.5);
		return { id: `bounty${i}`, x: CX + Math.cos(a) * 2.3, y: 27.6 + Math.sin(a) * 1.3, r: 0.34, color: GOLD, label: v.name.replace(/^(Train |Cattle |Claim )/, '')[0] };
	}),
	{ id: 'noon', x: CX, y: 27.2, r: 0.5, color: RUST, shape: 'star' },
	...[2, 3, 4, 5, 6].map((m, i) => ({ id: `mult${m}`, x: 7.3 + i, y: 30.9, r: 0.3, color: SKY, label: `${m}×` })),
	{ id: 'kick', x: 1.1, y: 28.6, r: 0.38, color: SKY, shape: 'arrow', turn: up },
	{ id: 'again', x: CX, y: 34.9, r: 0.5, color: GOLD, label: 'SHOOT AGAIN', shape: 'pill' }
];

const bulbs: Bulb[] = [];
for (let deg = 196; deg <= 344; deg += 12) bulbs.push({ ...archPoint({ x: 10, y: 10, r: 9.6 }, deg, 9.05), color: bulbs.length % 2 ? GOLD : '#fff0c8' });

const TRACK = { x0: TRAIN.x - TRAIN.reach - 1.6, x1: TRAIN.x + TRAIN.reach + 1.6 };

function paint(ctx: CanvasRenderingContext2D, _def: TableDef, h: Parameters<TableArt['paint']>[2]) {
	const u = h.unit;
	const W = 20 * u;
	ctx.fillStyle = vgrad(ctx, 0, 37 * u, [
		[0, '#e8743a'],
		[0.3, '#c8582a'],
		[0.55, '#8a4a2a'],
		[1, '#3a2014']
	]);
	ctx.fillRect(0, 0, W, 37 * u);
	ctx.save();
	ctx.globalAlpha = 0.12;
	rays(ctx, u, CX, 9.6, 24, Math.PI, TAU, '#ffd24a', 'rgba(0, 0, 0, 0)');
	ctx.restore();
	ctx.fillStyle = radial(ctx, CX * u, 9.6 * u, 3.4 * u, [
		[0, 'rgba(255, 230, 140, 0.55)'],
		[1, 'rgba(255, 230, 140, 0)']
	]);
	ctx.fillRect(0, 0, W, 16 * u);

	// Mesas on the horizon.
	ctx.fillStyle = 'rgba(90, 36, 20, 0.55)';
	ctx.beginPath();
	ctx.moveTo(0, 13 * u);
	ctx.lineTo(2.5 * u, 13 * u);
	ctx.lineTo(3.2 * u, 11.6 * u);
	ctx.lineTo(5.6 * u, 11.6 * u);
	ctx.lineTo(6.2 * u, 13 * u);
	ctx.lineTo(13.4 * u, 13 * u);
	ctx.lineTo(14.0 * u, 11.0 * u);
	ctx.lineTo(15.4 * u, 11.0 * u);
	ctx.lineTo(16.4 * u, 13 * u);
	ctx.lineTo(W, 13 * u);
	ctx.lineTo(W, 14.2 * u);
	ctx.lineTo(0, 14.2 * u);
	ctx.closePath();
	ctx.fill();

	// Saguaros down the outlanes.
	ctx.strokeStyle = 'rgba(120, 180, 90, 0.4)';
	ctx.lineCap = 'round';
	for (const x of [1.0, 17.6]) {
		ctx.lineWidth = 0.3 * u;
		ctx.beginPath();
		ctx.moveTo(x * u, 24.5 * u);
		ctx.lineTo(x * u, 21.6 * u);
		ctx.stroke();
		ctx.lineWidth = 0.18 * u;
		ctx.beginPath();
		ctx.moveTo(x * u, 23.2 * u);
		ctx.lineTo((x - 0.45) * u, 23.2 * u);
		ctx.lineTo((x - 0.45) * u, 22.4 * u);
		ctx.moveTo(x * u, 22.8 * u);
		ctx.lineTo((x + 0.45) * u, 22.8 * u);
		ctx.lineTo((x + 0.45) * u, 22.0 * u);
		ctx.stroke();
	}

	// The railroad across the middle.
	ctx.fillStyle = 'rgba(70, 40, 20, 0.55)';
	for (let x = TRACK.x0; x <= TRACK.x1; x += 0.45) ctx.fillRect((x - 0.09) * u, (TRAIN.y - 0.7) * u, 0.18 * u, 1.4 * u);
	ctx.strokeStyle = 'rgba(200, 200, 210, 0.6)';
	ctx.lineWidth = 0.08 * u;
	for (const dy of [-0.42, 0.42]) {
		ctx.beginPath();
		ctx.moveTo(TRACK.x0 * u, (TRAIN.y + dy) * u);
		ctx.lineTo(TRACK.x1 * u, (TRAIN.y + dy) * u);
		ctx.stroke();
	}

	// A split-rail fence round the corral of bumpers.
	const cx = BUMPERS.reduce((sum, b) => sum + b.x, 0) / BUMPERS.length;
	const cy = BUMPERS.reduce((sum, b) => sum + b.y, 0) / BUMPERS.length;
	ctx.fillStyle = 'rgba(200, 150, 90, 0.12)';
	ctx.beginPath();
	ctx.ellipse(cx * u, cy * u, 2.6 * u, 2.1 * u, -0.3, 0, TAU);
	ctx.fill();
	ctx.strokeStyle = 'rgba(90, 50, 22, 0.85)';
	ctx.lineWidth = 0.12 * u;
	for (const k of [2.6, 2.85]) {
		ctx.beginPath();
		ctx.ellipse(cx * u, cy * u, k * u, (k - 0.5) * u, -0.3, 0, TAU);
		ctx.stroke();
	}
	ctx.fillStyle = 'rgba(90, 50, 22, 0.95)';
	for (let i = 0; i < 14; i++) {
		const a = (i / 14) * TAU;
		const px = 2.72 * Math.cos(a);
		const py = 2.22 * Math.sin(a);
		const x = cx + px * Math.cos(-0.3) - py * Math.sin(-0.3);
		const y = cy + px * Math.sin(-0.3) + py * Math.cos(-0.3);
		ctx.fillRect((x - 0.09) * u, (y - 0.2) * u, 0.18 * u, 0.4 * u);
	}

	// Saloon doors over the saucer.
	ctx.fillStyle = 'rgba(120, 70, 30, 0.6)';
	ctx.fillRect((SALOON.x - 1.0) * u, (SALOON.y - 1.15) * u, 2.0 * u, 0.32 * u);
	for (const dx of [-0.85, 0.15]) {
		ctx.strokeStyle = 'rgba(240, 200, 140, 0.45)';
		ctx.lineWidth = 0.06 * u;
		ctx.strokeRect((SALOON.x + dx) * u, (SALOON.y - 0.7) * u, 0.7 * u, 0.5 * u);
	}

	// The vault's ring.
	ctx.strokeStyle = 'rgba(180, 190, 200, 0.6)';
	ctx.lineWidth = 0.16 * u;
	ctx.beginPath();
	ctx.arc(VAULT.x * u, VAULT.y * u, 0.95 * u, 0, TAU);
	ctx.stroke();

	h.label(ctx, 'SALOON', SALOON.x, SALOON.y + 2.3, 0.4, 'rgba(255, 240, 200, 0.85)', LABEL);
	h.label(ctx, 'QUICK DRAW', SALOON.x, SALOON.y + 2.8, 0.3, 'rgba(255, 210, 74, 0.75)', LABEL);
	h.label(ctx, 'BANK', VAULT.x, VAULT.y - 1.45, 0.4, 'rgba(220, 240, 200, 0.85)', LABEL);
	h.label(ctx, 'MINE', MINE_MOUTH.x, MINE_MOUTH.y + 2.25, 0.4, 'rgba(240, 200, 140, 0.8)', LABEL);
	h.label(ctx, 'RAILROAD', RAMP_MOUTH.right.x, 19.45, 0.36, 'rgba(255, 210, 74, 0.8)', LABEL);
	h.label(ctx, 'WANTED', OUTLAWS[1]!.x + face.x * 1.55, OUTLAWS[1]!.y + face.y * 1.55, 0.3, 'rgba(255, 74, 42, 0.75)', LABEL);	h.label(ctx, 'BOUNTIES', CX, 25.6, 0.34, 'rgba(255, 210, 74, 0.7)', LABEL);
	h.label(ctx, 'KICK', 1.1, 29.55, 0.34, 'rgba(106, 208, 255, 0.7)', LABEL);
	h.label(ctx, 'High Noon Express', CX, 29.35, 0.66, 'rgba(255, 210, 74, 0.5)', DISPLAY);
	for (const x of [1.45, 17.15]) {
		ctx.save();
		ctx.translate(x * u, 14.2 * u);
		ctx.rotate(x < CX ? -Math.PI / 2 : Math.PI / 2);
		h.label(ctx, 'ROUND UP', 0, 0, 0.42, 'rgba(106, 208, 255, 0.45)', LABEL);
		ctx.restore();
	}
}

function drawVault(ctx: CanvasRenderingContext2D, u: number, open: boolean, angle: number) {
	ctx.save();
	ctx.translate(VAULT.x * u, VAULT.y * u);
	if (open) {
		ctx.translate(0.85 * u, 0);
		ctx.scale(0.35, 1);
	}
	ctx.fillStyle = radial(ctx, -0.2 * u, -0.2 * u, 0.9 * u, [
		[0, '#d4dce4'],
		[1, '#6a7480']
	]);
	ctx.beginPath();
	ctx.arc(0, 0, 0.82 * u, 0, TAU);
	ctx.fill();
	ctx.strokeStyle = '#3a4048';
	ctx.lineWidth = 0.06 * u;
	ctx.stroke();
	ctx.rotate(angle);
	ctx.strokeStyle = '#2a3038';
	ctx.lineWidth = 0.09 * u;
	for (let k = 0; k < 3; k += 1) {
		const a = (k / 3) * TAU;
		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.lineTo(Math.cos(a) * 0.55 * u, Math.sin(a) * 0.55 * u);
		ctx.stroke();
	}
	ctx.fillStyle = '#2a3038';
	ctx.beginPath();
	ctx.arc(0, 0, 0.16 * u, 0, TAU);
	ctx.fill();
	ctx.restore();
}

/** The saloon six-shooter, cylinder over the saucer, barrel along `angle`; armed, it shows its line of fire. */
function drawGun(ctx: CanvasRenderingContext2D, u: number, angle: number, armed: boolean, loaded: boolean) {
	ctx.save();
	ctx.translate(SALOON.x * u, SALOON.y * u);
	ctx.rotate(angle);
	if (armed) {
		ctx.strokeStyle = 'rgba(255, 210, 74, 0.6)';
		ctx.lineWidth = 0.07 * u;
		ctx.setLineDash([0.25 * u, 0.25 * u]);
		ctx.beginPath();
		ctx.moveTo(1.9 * u, 0);
		ctx.lineTo(6.5 * u, 0);
		ctx.stroke();
		ctx.setLineDash([]);
	}
	ctx.globalAlpha = loaded ? 1 : 0.8;
	ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
	ctx.beginPath();
	ctx.roundRect(-0.6 * u, -0.2 * u, 2.5 * u, 0.7 * u, 0.2 * u);
	ctx.fill();
	ctx.fillStyle = '#6a3a1a';
	ctx.beginPath();
	ctx.moveTo(-0.35 * u, 0.1 * u);
	ctx.lineTo(-0.5 * u, 0.4 * u);
	ctx.quadraticCurveTo(-1.25 * u, 0.85 * u, -1.15 * u, 1.05 * u);
	ctx.lineTo(-0.7 * u, 1.05 * u);
	ctx.quadraticCurveTo(-0.3 * u, 0.6 * u, 0.05 * u, 0.32 * u);
	ctx.closePath();
	ctx.fill();
	const steel = vgrad(ctx, -0.3 * u, 0.3 * u, [
		[0, '#e4e8ec'],
		[0.5, '#9aa2aa'],
		[1, '#4a5058']
	]);
	ctx.fillStyle = steel;
	ctx.fillRect(0.3 * u, -0.14 * u, 1.55 * u, 0.28 * u);
	ctx.fillRect(1.72 * u, -0.24 * u, 0.1 * u, 0.12 * u);
	ctx.beginPath();
	ctx.roundRect(-0.62 * u, -0.3 * u, 1.05 * u, 0.6 * u, 0.12 * u);
	ctx.fill();
	ctx.beginPath();
	ctx.arc(0, 0, 0.5 * u, 0, TAU);
	ctx.fill();
	ctx.strokeStyle = '#2a3038';
	ctx.lineWidth = 0.05 * u;
	ctx.stroke();
	ctx.fillStyle = '#2a3038';
	for (let k = 0; k < 6; k += 1) {
		const a = (k / 6) * TAU + Math.PI / 6;
		ctx.beginPath();
		ctx.arc(Math.cos(a) * 0.36 * u, Math.sin(a) * 0.36 * u, 0.07 * u, 0, TAU);
		ctx.fill();
	}
	ctx.fillStyle = '#4a5058';
	ctx.fillRect(-0.85 * u, -0.1 * u, 0.3 * u, 0.2 * u);
	ctx.restore();
}

/** A steam locomotive from above, nose toward the way it's heading, with a trail of smoke. */
function drawTrain(ctx: CanvasRenderingContext2D, u: number, x: number, y: number, dir: number, t: number, squish: number, hot: string | null) {
	ctx.save();
	ctx.translate(x * u, y * u);
	if (hot) {
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		ctx.fillStyle = radial(ctx, 0, 0, 2.0 * u, [
			[0, hot],
			[1, 'rgba(0, 0, 0, 0)']
		]);
		ctx.fillRect(-2 * u, -2 * u, 4 * u, 4 * u);
		ctx.restore();
	}
	ctx.scale(dir, 1);
	const s = 1 + squish * 0.08;
	ctx.scale(s, s);
	ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
	ctx.fillRect(-1.25 * u, -0.38 * u + 0.25 * u, 2.5 * u, 0.9 * u);
	ctx.fillStyle = '#5a2a1a';
	ctx.fillRect(-1.3 * u, -0.5 * u, 0.85 * u, 1.0 * u);
	ctx.fillStyle = '#2a2a30';
	ctx.beginPath();
	ctx.roundRect(-0.5 * u, -0.38 * u, 1.55 * u, 0.76 * u, 0.3 * u);
	ctx.fill();
	ctx.strokeStyle = GOLD;
	ctx.lineWidth = 0.05 * u;
	for (const bx of [-0.1, 0.4]) {
		ctx.beginPath();
		ctx.moveTo(bx * u, -0.38 * u);
		ctx.lineTo(bx * u, 0.38 * u);
		ctx.stroke();
	}
	ctx.fillStyle = RUST;
	ctx.beginPath();
	ctx.moveTo(1.05 * u, -0.42 * u);
	ctx.lineTo(1.35 * u, 0);
	ctx.lineTo(1.05 * u, 0.42 * u);
	ctx.closePath();
	ctx.fill();
	ctx.fillStyle = '#111';
	ctx.beginPath();
	ctx.arc(0.75 * u, 0, 0.17 * u, 0, TAU);
	ctx.fill();
	ctx.fillStyle = GOLD;
	ctx.beginPath();
	ctx.arc(1.0 * u, 0, 0.07 * u, 0, TAU);
	ctx.fill();
	for (let k = 0; k < 4; k += 1) {
		const age = (t * 1.2 + k / 4) % 1;
		ctx.fillStyle = `rgba(240, 235, 225, ${0.35 * (1 - age)})`;
		ctx.beginPath();
		ctx.arc((0.75 - age * 1.8) * u, -age * 0.4 * u, (0.18 + age * 0.35) * u, 0, TAU);
		ctx.fill();
	}
	ctx.restore();
}

export const westernArt: TableArt<WesternState> = {
	theme: {
		display: DISPLAY,
		label: LABEL,
		wood: ['#3a2010', '#5a3418'],
		rail: '#b08050',
		railShine: 'rgba(255, 220, 160, 0.55)',
		guide: '#c8b090',
		post: '#f0d8b0',
		postCore: '#6a3a1a',
		rubber: '#1a1410',
		flipper: { body: '#f0d8b0', rubber: '#1a1410', pivot: '#b08050' },
		insertOff: 'rgba(40, 20, 10, 0.85)',
		sling: { base: '#4a2a14', stripe: GOLD },
		bumper: { style: 'wagon', a: '#8a4a1a', b: '#d48a3a', cap: GOLD, ring: '#3a2010', flash: GOLD },
		target: { face: '#f0e0b8', edge: '#6a3a1a', ink: '#3a1a0a' },
		ramp: 'rgba(255, 210, 74, 0.2)',
		popup: { ink: '#fff0c8', big: GOLD, stroke: 'rgba(40, 20, 10, 0.85)' },
		spark: GOLD,
		hot: [RUST, GOLD],
		ball: 'brass'
	},
	inserts,
	bulbs,
	paint,
	toys(ctx, g, t, h, fx) {
		const u = h.unit;
		const s = g.s;
		drawVault(ctx, u, vaultOpen(s), g.world.spin.dial?.angle ?? 0);
		const m = g.world.movers.train;
		if (m) {
			const heading = Math.abs(m.vx) > 0.05 ? Math.sign(m.vx) : m.x < TRAIN.x ? 1 : -1;
			const hot = s.noon ? '#fff0c8' : s.rush ? RUST : g.mode?.lit.includes('train') ? GOLD : null;
			drawTrain(ctx, u, m.x, m.y, heading, t, fx.hit('train'), hot);
		}
		const gun = aiming(g);
		drawGun(ctx, u, g.world.aims.saloon ?? QUICK_DRAW.from, !!gun?.armed, !!gun);
		const saloon = fx.hit('saloon');
		if (saloon > 0) h.shine(ctx, GOLD, SALOON.x, SALOON.y, 3.6, saloon);
		const vault = fx.hit('vault');
		if (vault > 0) h.shine(ctx, SAGE, VAULT.x, VAULT.y, 3.6, vault);
	}
};
