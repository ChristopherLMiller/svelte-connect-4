import { canvasOf, disc, glowSprite, radial, starPath, TAU, type Helpers, type Insert, type TableArt, type Theme } from './art';
import { BALL_R, FIELD_H, FIELD_W, offset, type P, type TableDef } from './def';
import { captiveAt, flipperTip, plungerTop, type Flipper } from './physics';
import type { AnyGame, Blink, GameEvent, Light } from './game';

type Spark = { x: number; y: number; vx: number; vy: number; age: number; life: number; color: string; size: number };
type Popup = { x: number; y: number; age: number; text: string; big: boolean };
/**
 * A light show running over the inserts and bulbs: a band sweeping the table, everything strobing,
 * a ring spreading from a hit, or the lights going out. Age starts below zero to queue one up.
 */
type Show = { kind: 'sweep' | 'strobe' | 'ring' | 'dark'; age: number; life: number; color: string | null; x: number; y: number; up: boolean };
/** A flasher dome firing: a big soft burst of light. */
type Flash = { x: number; y: number; color: string; age: number; life: number; size: number; strobe: boolean };

export type DrawOptions = { motion: boolean };
export type Scene = { game: AnyGame; status: { type: string } };

/** Cues that flare the whole table. */
const FLARES = new Set(['jackpot', 'superJackpot', 'multiball', 'wizard', 'modeDone', 'extraBall', 'special']);
/** Cues that sweep a band of light up the table. */
const SWEEPS = new Set(['modeStart', 'lit', 'lock', 'skill', 'kickback', 'saved', 'mult', 'combo', 'wheelSpin', 'wheelPrize', 'hurry']);
/** General illumination: lamps under the plastics and along the walls, always on, lit warm. */
const GI: P[] = [
	{ x: 1.3, y: 7.5 },
	{ x: 17.3, y: 7.5 },
	{ x: 1.2, y: 14 },
	{ x: 17.4, y: 14 },
	{ x: 1.2, y: 20.5 },
	{ x: 17.4, y: 20.5 },
	{ x: 4.4, y: 27.4 },
	{ x: 14.2, y: 27.4 },
	{ x: 2.2, y: 30.6 },
	{ x: 16.4, y: 30.6 },
	{ x: 6.4, y: 1.8 },
	{ x: 12.2, y: 1.8 }
];
/** Flasher domes in the top corners, fired on big shots. */
const FLASHERS: P[] = [
	{ x: 2.6, y: 4.6 },
	{ x: 16.0, y: 4.6 }
];

function ballSprite(px: number, brass: boolean) {
	const c = canvasOf(px);
	const ctx = c.getContext('2d')!;
	const r = px / 2;
	const g = ctx.createRadialGradient(r * 0.7, r * 0.62, r * 0.05, r, r, r);
	if (brass) {
		g.addColorStop(0, '#fffbe8');
		g.addColorStop(0.25, '#f3d58a');
		g.addColorStop(0.65, '#a67a2c');
		g.addColorStop(1, '#3a2508');
	} else {
		g.addColorStop(0, '#ffffff');
		g.addColorStop(0.22, '#e9ebf2');
		g.addColorStop(0.62, '#8c90a4');
		g.addColorStop(0.9, '#3a3d4c');
		g.addColorStop(1, '#22232c');
	}
	ctx.fillStyle = g;
	ctx.beginPath();
	ctx.arc(r, r, r * 0.98, 0, TAU);
	ctx.fill();
	ctx.globalCompositeOperation = 'source-atop';
	const warm = ctx.createLinearGradient(0, r * 1.2, 0, px);
	warm.addColorStop(0, 'rgba(255, 170, 80, 0)');
	warm.addColorStop(1, 'rgba(255, 150, 70, 0.35)');
	ctx.fillStyle = warm;
	ctx.fillRect(0, 0, px, px);
	return c;
}

export function tablePath(ctx: CanvasRenderingContext2D, def: TableDef, u: number, bottom = FIELD_H) {
	const a = def.arch;
	ctx.beginPath();
	ctx.moveTo(0.4 * u, bottom * u);
	ctx.lineTo(0.4 * u, a.y * u);
	ctx.arc(a.x * u, a.y * u, a.r * u, Math.PI, TAU);
	ctx.lineTo(19.6 * u, bottom * u);
	ctx.closePath();
}

function flipperPath(ctx: CanvasRenderingContext2D, f: Flipper, u: number) {
	const tip = flipperTip(f);
	const a = f.angle;
	const nx = -Math.sin(a);
	const ny = Math.cos(a);
	ctx.beginPath();
	ctx.arc(f.px * u, f.py * u, f.rb * u, a + Math.PI / 2, a - Math.PI / 2);
	ctx.lineTo((tip.x - nx * f.rt) * u, (tip.y - ny * f.rt) * u);
	ctx.arc(tip.x * u, tip.y * u, f.rt * u, a - Math.PI / 2, a + Math.PI / 2);
	ctx.closePath();
}

function linePath(ctx: CanvasRenderingContext2D, pts: P[], u: number) {
	ctx.beginPath();
	pts.forEach((p, i) => (i ? ctx.lineTo(p.x * u, p.y * u) : ctx.moveTo(p.x * u, p.y * u)));
}

export class TableRenderer {
	private ctx: CanvasRenderingContext2D;
	private width = 1;
	private height = 1;
	private unit = 1;
	private base: HTMLCanvasElement | null = null;
	private upper: HTMLCanvasElement | null = null;
	private glows = new Map<string, HTMLCanvasElement>();
	private ball: HTMLCanvasElement | null = null;
	private sparks: Spark[] = [];
	private popups: Popup[] = [];
	private bumperFlash: number[] = [];
	private slingFlash = { left: 0, right: 0 };
	private hits = new Map<string, number>();
	private flare = 0;
	private shows: Show[] = [];
	private flashes: Flash[] = [];
	private shake = 0;
	/** A brief dip in the general illumination, as when a big coil fires. */
	private brownout = 0;
	private trails = new Map<number, Array<{ x: number; y: number }>>();
	private clock = 0;
	private helpers: Helpers;

	constructor(
		private canvas: HTMLCanvasElement,
		private def: TableDef,
		private art: TableArt<unknown>
	) {
		this.ctx = canvas.getContext('2d')!;
		this.bumperFlash = def.bumpers.map(() => 0);
		this.helpers = this.makeHelpers();
	}

	private get theme(): Theme {
		return this.art.theme;
	}

	resize(cssWidth: number) {
		const dpr = Math.min(2, window.devicePixelRatio || 1);
		const width = Math.max(1, Math.round(cssWidth * dpr));
		const height = Math.max(1, Math.round((width * FIELD_H) / FIELD_W));
		if (width === this.width && height === this.height && this.base) return;
		this.width = this.canvas.width = width;
		this.height = this.canvas.height = height;
		this.unit = width / FIELD_W;
		this.glows.clear();
		this.helpers = this.makeHelpers();
		this.ball = ballSprite(Math.ceil(BALL_R * 2 * this.unit * 1.15), this.theme.ball === 'brass');
		this.repaint();
	}

	/** Repaint the printed playfield, e.g. once the poster fonts arrive. */
	repaint() {
		this.base = this.paintBase();
		this.upper = this.paintUpper();
	}

	clear() {
		this.sparks = [];
		this.popups = [];
		this.shows = [];
		this.flashes = [];
		this.trails.clear();
	}

	private show(kind: Show['kind'], life: number, opts: Partial<Omit<Show, 'kind' | 'life'>> = {}) {
		this.shows.push({ kind, life, age: 0, color: null, x: 9.3, y: 18, up: true, ...opts });
		if (this.shows.length > 24) this.shows.shift();
	}

	private fire(x: number, y: number, color: string, size = 9, life = 0.35, strobe = false) {
		this.flashes.push({ x, y, color, size, life, age: 0, strobe });
		if (this.flashes.length > 16) this.flashes.shift();
	}

	/** Every flasher at once, strobing: the big moments. */
	private fireAll(color: string, life: number) {
		for (const f of FLASHERS) this.fire(f.x, f.y, color, 14, life, true);
		this.fire(9.3, 30, color, 12, life, true);
	}

	private makeHelpers(): Helpers {
		const u = this.unit;
		return {
			unit: u,
			label: (ctx, text, x, y, size, color, font) => this.label(ctx, text, x, y, size, color, font),
			glow: (color) => this.glow(color),
			shine: (ctx, color, x, y, size, alpha = 1) => {
				const s = size * this.unit;
				ctx.save();
				ctx.globalCompositeOperation = 'lighter';
				ctx.globalAlpha = alpha;
				ctx.drawImage(this.glow(color), x * this.unit - s / 2, y * this.unit - s / 2, s, s);
				ctx.restore();
			}
		};
	}

	private glow(color: string) {
		let sprite = this.glows.get(color);
		if (!sprite) {
			sprite = glowSprite(color, 64);
			this.glows.set(color, sprite);
		}
		return sprite;
	}

	hit(id: string) {
		return this.hits.get(id) ?? 0;
	}

	onEvent(e: GameEvent, motion: boolean) {
		const t = this.theme;
		const [h1, h2] = t.hot;
		switch (e.type) {
			case 'bumper': {
				this.bumperFlash[e.i] = 1;
				const p = this.def.bumpers[e.i]!;
				this.brownout = Math.max(this.brownout, 0.35);
				if (!motion) break;
				this.burst(p.x + (e.ball.x - p.x) * 0.5, p.y + (e.ball.y - p.y) * 0.5, t.spark, 10, 9);
				this.show('ring', 0.5, { x: p.x, y: p.y, color: t.bumper.flash });
				this.fire(p.x, p.y, t.bumper.flash, 6, 0.18);
				break;
			}
			case 'sling':
				this.slingFlash[e.side] = 1;
				if (!motion) break;
				this.burst(e.ball.x, e.ball.y, '#ffffff', 6, 6);
				this.fire(e.side === 'left' ? 4.4 : 14.2, 27.6, t.spark, 7, 0.2);
				break;
			case 'drop':
				this.hits.set(`${e.bank}:${e.i}`, 1);
				if (!motion) break;
				this.burst(e.ball.x, e.ball.y, t.target.face, 8, 6);
				this.fire(e.ball.x, e.ball.y, t.target.face, 6, 0.25);
				break;
			case 'spin':
				if (motion) this.fire(e.ball.x, e.ball.y, t.spark, 5, 0.15 + Math.min(0.5, e.spins * 0.04));
				break;
			case 'captive':
				this.hits.set(e.id, 1);
				if (!motion) break;
				this.fire(e.ball.x, e.ball.y, t.target.face, 8, 0.3);
				break;
			case 'standup':
			case 'mover':
			case 'hole':
			case 'ramp':
			case 'enter':
				this.hits.set(e.id, 1);
				if (!motion) break;
				if (e.type === 'mover' || e.type === 'hole') {
					this.burst(e.ball.x, e.ball.y, t.spark, 12, 7);
					this.show('ring', 0.8, { x: e.ball.x, y: e.ball.y, color: h1 });
					this.fire(e.ball.x, e.ball.y, h1, 10, 0.4);
				} else if (e.type === 'ramp') {
					const side = e.ball.x < 9.3 ? FLASHERS[0]! : FLASHERS[1]!;
					this.fire(side.x, side.y, h1, 14, 0.5, true);
					this.show('sweep', 0.6, { color: h1 });
					this.shake = Math.max(this.shake, 0.3);
				} else if (e.type === 'standup') this.fire(e.ball.x, e.ball.y, t.target.face, 6, 0.25);
				else if (e.id.startsWith('orbit')) this.show('sweep', 0.5, { color: h2, up: false });
				break;
			case 'rideEnd':
				if (motion) this.fire(e.ball.x, e.ball.y, t.spark, 7, 0.3);
				break;
			case 'eject':
				this.brownout = Math.max(this.brownout, 0.6);
				break;
			case 'lane':
				if (e.done && motion) this.show('sweep', 0.7, { color: h2 });
				break;
			case 'launch':
				if (motion) this.show('sweep', 0.5, { up: true });
				break;
			case 'serve':
				if (motion) for (let k = 0; k < 2; k += 1) this.show('sweep', 0.7, { age: -k * 0.35, up: k % 2 === 0, color: k ? h2 : h1 });
				break;
			case 'cue':
				this.hits.set(`cue:${e.cue}`, 1);
				if (e.cue === 'tilt') {
					this.show('dark', 3);
					this.shake = 1.4;
					break;
				}
				if (e.cue === 'nudge' || e.cue === 'tiltWarn') {
					this.shake = Math.max(this.shake, e.cue === 'nudge' ? 0.7 : 1);
					break;
				}
				if (!motion) {
					if (FLARES.has(e.cue)) this.flare = 1;
					break;
				}
				if (FLARES.has(e.cue)) {
					const big = e.cue === 'multiball' || e.cue === 'wizard';
					this.flare = 1;
					this.shake = Math.max(this.shake, big ? 1.6 : 1);
					this.brownout = 1;
					for (const b of this.def.bumpers) this.burst(b.x, b.y, big ? h1 : h2, 10, 12);
					this.show('strobe', big ? 3 : 1.4, { color: big ? h1 : h2 });
					for (let k = 0; k < (big ? 4 : 2); k += 1) this.show('sweep', 0.6, { age: -k * 0.45, up: k % 2 === 0, color: k % 2 ? h1 : h2 });
					this.fireAll(big ? h1 : h2, big ? 2.4 : 1.2);
				} else if (SWEEPS.has(e.cue)) {
					this.show('sweep', 0.7, { color: h1 });
					if (e.cue === 'modeStart' || e.cue === 'lock') this.fireAll(h1, 0.8);
				} else if (e.cue === 'modeHit' || e.cue === 'jackpotLit') this.show('ring', 0.9, { color: h2 });
				break;
			case 'score':
				if (e.points >= 2500) this.popups.push({ x: e.x, y: e.y - 0.8, age: 0, text: `+${e.points.toLocaleString()}`, big: e.points >= 25000 });
				if (this.popups.length > 14) this.popups.shift();
				if (motion && e.points >= 25000) this.show('ring', 1, { x: e.x, y: e.y, color: h2 });
				break;
			case 'drain':
				this.trails.delete(e.ball.id);
				break;
			case 'ballOver':
				this.show('dark', e.tilted ? 2.2 : 1.6);
				break;
		}
	}

	private burst(x: number, y: number, color: string, n: number, speed: number) {
		for (let i = 0; i < n; i += 1) {
			const a = Math.random() * TAU;
			const s = speed * (0.4 + Math.random() * 0.8);
			this.sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, age: 0, life: 0.35 + Math.random() * 0.35, color, size: 0.08 + Math.random() * 0.1 });
		}
		if (this.sparks.length > 240) this.sparks.splice(0, this.sparks.length - 240);
	}

	/* ---------- The printed playfield ---------- */

	private paintBase() {
		const u = this.unit;
		const def = this.def;
		const t = this.theme;
		const base = canvasOf(this.width, this.height);
		const ctx = base.getContext('2d')!;

		const wood = ctx.createLinearGradient(0, 0, this.width, 0);
		wood.addColorStop(0, t.wood[0]);
		wood.addColorStop(0.5, t.wood[1]);
		wood.addColorStop(1, t.wood[0]);
		ctx.fillStyle = wood;
		ctx.fillRect(0, 0, this.width, this.height);

		ctx.save();
		tablePath(ctx, def, u, FIELD_H + 1);
		ctx.clip();
		this.art.paint(ctx, def, this.helpers);

		// Shooter lane.
		const lane = def.lane;
		ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
		ctx.fillRect((lane.wall + 0.1) * u, 11.5 * u, (19.55 - lane.wall) * u, (FIELD_H - 11.5) * u);
		ctx.strokeStyle = t.railShine;
		ctx.globalAlpha = 0.4;
		ctx.lineWidth = 0.1 * u;
		for (let k = 0; k < 4; k += 1) {
			const y = 24 + k * 1.3;
			ctx.beginPath();
			ctx.moveTo((lane.x - 0.35) * u, (y + 0.35) * u);
			ctx.lineTo(lane.x * u, y * u);
			ctx.lineTo((lane.x + 0.35) * u, (y + 0.35) * u);
			ctx.stroke();
		}
		ctx.globalAlpha = 1;

		for (const m of def.magnets) {
			disc(ctx, m.x * u, m.y * u, 0.75 * u, radial(ctx, m.x * u, m.y * u, 0.75 * u, [[0, '#2a2f3a'], [0.7, '#4b5262'], [1, '#14161c']]));
		}

		// Holes.
		for (const hole of def.holes) {
			if (hole.layer) continue;
			const x = hole.x * u;
			const y = hole.y * u;
			const r = hole.r * u;
			disc(ctx, x, y, r * 1.25, 'rgba(0, 0, 0, 0.35)');
			disc(ctx, x, y, r, radial(ctx, x, y, r, [[0, '#000'], [0.72, '#0c0810'], [1, '#5c5266']]));
		}

		// Rollover buttons and lane switches.
		for (const s of def.sensors) {
			if (s.kind !== 'rollover' || s.layer) continue;
			const x = s.x * u;
			const y = s.y * u;
			ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
			ctx.beginPath();
			ctx.roundRect(x - 0.13 * u, y - 0.36 * u, 0.26 * u, 0.72 * u, 0.13 * u);
			ctx.fill();
			// The wire actuator: a bent blade standing up through the slot.
			ctx.strokeStyle = t.railShine;
			ctx.lineWidth = 0.06 * u;
			ctx.lineCap = 'round';
			ctx.beginPath();
			ctx.moveTo(x, y - 0.28 * u);
			ctx.quadraticCurveTo(x + 0.09 * u, y, x, y + 0.28 * u);
			ctx.stroke();
		}

		// Bumper bases.
		for (const b of def.bumpers) {
			if (b.layer) continue;
			disc(ctx, (b.x + 0.18) * u, (b.y + 0.28) * u, b.r * 1.08 * u, 'rgba(0, 0, 0, 0.45)');
			disc(ctx, b.x * u, b.y * u, b.r * u, '#2b2118');
		}

		// Slingshot plastics.
		for (const s of def.walls.filter((w) => w.kind === 'sling')) {
			const pts = [{ x: s.ax, y: s.ay }];
			const corner = def.walls.find((w) => w.kind === 'wall' && w.ax === s.ax && w.ay === s.ay && w.layer === s.layer);
			if (corner) pts.push({ x: corner.bx, y: corner.by });
			pts.push({ x: s.bx, y: s.by });
			ctx.save();
			linePath(ctx, pts, u);
			ctx.closePath();
			ctx.clip();
			ctx.fillStyle = t.sling.base;
			ctx.fillRect(0, 24 * u, this.width, 8 * u);
			ctx.fillStyle = t.sling.stripe;
			const dir = s.side === 'left' ? 1 : -1;
			for (let k = -6; k < 14; k += 1) {
				const x0 = (s.side === 'left' ? 2 : 11) + k * 0.7;
				ctx.beginPath();
				ctx.moveTo(x0 * u, 24 * u);
				ctx.lineTo((x0 + 0.35) * u, 24 * u);
				ctx.lineTo((x0 + 0.35 + 2.4 * dir) * u, 32 * u);
				ctx.lineTo((x0 + 2.4 * dir) * u, 32 * u);
				ctx.closePath();
				ctx.fill();
			}
			ctx.restore();
		}

		for (const ins of this.art.inserts) if (!ins.raised) this.insert(ctx, ins, 0);

		ctx.restore();

		this.paintWalls(ctx, 0);
		this.paintPosts(ctx, 0);

		// Spinner frames.
		for (const sp of def.spinners) {
			ctx.strokeStyle = t.rail;
			ctx.lineWidth = 0.12 * u;
			ctx.lineCap = 'round';
			for (const [x, y] of [
				[sp.ax, sp.ay],
				[sp.bx, sp.by]
			] as const) {
				disc(ctx, x * u, y * u, 0.12 * u, t.rail);
			}
		}

		this.art.paintOver?.(ctx, def, this.helpers);

		const vig = ctx.createRadialGradient(this.width / 2, this.height * 0.45, this.width * 0.3, this.width / 2, this.height * 0.5, this.height * 0.75);
		vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
		vig.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
		ctx.fillStyle = vig;
		ctx.fillRect(0, 0, this.width, this.height);
		return base;
	}

	private paintWalls(ctx: CanvasRenderingContext2D, layer: 0 | 1) {
		const u = this.unit;
		const t = this.theme;
		ctx.lineCap = 'round';
		for (const s of this.def.walls) {
			if (s.layer !== layer || s.hidden || s.kind === 'sling' || s.kind === 'gate' || s.toggle) continue;
			const metal = s.kind === 'guide' || s.kind === 'rail' ? t.guide : t.rail;
			ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
			ctx.lineWidth = s.t * 2 * u + 2;
			ctx.beginPath();
			ctx.moveTo(s.ax * u + 1, s.ay * u + 2);
			ctx.lineTo(s.bx * u + 1, s.by * u + 2);
			ctx.stroke();
			ctx.strokeStyle = s.kind === 'rubber' ? t.rubber : metal;
			ctx.lineWidth = s.t * 2 * u;
			ctx.beginPath();
			ctx.moveTo(s.ax * u, s.ay * u);
			ctx.lineTo(s.bx * u, s.by * u);
			ctx.stroke();
			if (s.kind !== 'rubber') {
				ctx.strokeStyle = t.railShine;
				ctx.lineWidth = Math.max(1, s.t * 0.6 * u);
				ctx.stroke();
			}
		}
	}

	private paintPosts(ctx: CanvasRenderingContext2D, layer: 0 | 1) {
		const u = this.unit;
		const t = this.theme;
		for (const p of this.def.posts) {
			if (p.layer !== layer) continue;
			disc(ctx, (p.x + 0.06) * u, (p.y + 0.1) * u, p.r * u, 'rgba(0, 0, 0, 0.4)');
			disc(ctx, p.x * u, p.y * u, p.r * u, p.kind === 'metal' ? t.rail : t.post);
			disc(ctx, p.x * u, p.y * u, p.r * 0.4 * u, t.postCore);
		}
	}

	/** Ramps, wireforms and anything else on the raised layer: drawn over the playfield balls. */
	private paintUpper() {
		const u = this.unit;
		const def = this.def;
		const t = this.theme;
		const c = canvasOf(this.width, this.height);
		const ctx = c.getContext('2d')!;
		this.art.paintUpper?.(ctx, def, this.helpers);
		for (const ins of this.art.inserts) if (ins.raised) this.insert(ctx, ins, 0);
		for (const ramp of def.ramps) {
			const left = offset(ramp.path, ramp.width / 2);
			const right = offset(ramp.path, -ramp.width / 2);
			const band = [...left, ...right.slice().reverse()];
			ctx.save();
			ctx.translate(0.35 * u, 0.5 * u);
			linePath(ctx, band, u);
			ctx.closePath();
			ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
			ctx.fill();
			ctx.restore();
			linePath(ctx, band, u);
			ctx.closePath();
			ctx.fillStyle = ramp.color + '40';
			ctx.fill();
			// Ribs across the plastic.
			ctx.strokeStyle = ramp.color + '55';
			ctx.lineWidth = 0.05 * u;
			for (let i = 1; i < left.length; i += 2) {
				ctx.beginPath();
				ctx.moveTo(left[i]!.x * u, left[i]!.y * u);
				ctx.lineTo(right[i]!.x * u, right[i]!.y * u);
				ctx.stroke();
			}
		}
		this.paintWalls(ctx, 1);
		this.paintPosts(ctx, 1);
		for (const ride of def.rides) {
			if (ride.hidden) continue;
			for (const d of [0.32, -0.32]) {
				const rail = offset(ride.path, d);
				ctx.save();
				ctx.translate(0.3 * u, 0.55 * u);
				linePath(ctx, rail, u);
				ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
				ctx.lineWidth = 0.1 * u;
				ctx.stroke();
				ctx.restore();
				linePath(ctx, rail, u);
				ctx.strokeStyle = t.guide;
				ctx.lineWidth = 0.09 * u;
				ctx.stroke();
				ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
				ctx.lineWidth = 0.03 * u;
				ctx.stroke();
			}
			// Hoops holding the two rails together.
			const l = offset(ride.path, 0.38);
			const r = offset(ride.path, -0.38);
			ctx.strokeStyle = t.guide;
			ctx.lineWidth = 0.05 * u;
			for (let i = 2; i < l.length; i += 4) {
				ctx.beginPath();
				ctx.moveTo(l[i]!.x * u, l[i]!.y * u);
				ctx.lineTo(r[i]!.x * u, r[i]!.y * u);
				ctx.stroke();
			}
		}
		return c;
	}

	private label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string, font = this.theme.label) {
		const u = this.unit;
		ctx.save();
		ctx.fillStyle = color;
		ctx.font = `${size * u}px ${font}`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(text, x * u, y * u);
		ctx.restore();
	}

	private insert(ctx: CanvasRenderingContext2D, ins: Insert, level: number, color = ins.color) {
		const u = this.unit;
		const x = ins.x * u;
		const y = ins.y * u;
		const r = ins.r * u;
		const lit = level > 0;
		ctx.save();
		if (lit) {
			const g = r * 5;
			ctx.globalCompositeOperation = 'lighter';
			ctx.globalAlpha = 0.55 * level;
			ctx.drawImage(this.glow(color), x - g / 2, y - g / 2, g, g);
			ctx.globalCompositeOperation = 'source-over';
			ctx.globalAlpha = level;
		} else ctx.globalAlpha = 0.9;
		ctx.fillStyle = lit ? color : this.theme.insertOff;
		ctx.strokeStyle = lit ? 'rgba(255, 255, 255, 0.7)' : color + '88';
		ctx.lineWidth = Math.max(1, 0.06 * u);
		ctx.beginPath();
		const shape = ins.shape ?? 'round';
		if (shape === 'arrow') {
			ctx.translate(x, y);
			ctx.rotate(ins.turn ?? 0);
			ctx.moveTo(r * 1.2, 0);
			ctx.lineTo(-r * 0.8, r * 0.9);
			ctx.lineTo(-r * 0.4, 0);
			ctx.lineTo(-r * 0.8, -r * 0.9);
			ctx.closePath();
		} else if (shape === 'pill') {
			const w = r * 4.4;
			ctx.roundRect(x - w / 2, y - r * 0.75, w, r * 1.5, r * 0.75);
		} else if (shape === 'star') starPath(ctx, x, y, r * 1.2, 0.45, 5, (ins.turn ?? 0) - Math.PI / 2);
		else if (shape === 'square') ctx.roundRect(x - r, y - r, r * 2, r * 2, r * 0.25);
		else if (shape === 'diamond') {
			ctx.moveTo(x, y - r * 1.2);
			ctx.lineTo(x + r, y);
			ctx.lineTo(x, y + r * 1.2);
			ctx.lineTo(x - r, y);
			ctx.closePath();
		} else ctx.arc(x, y, r, 0, TAU);
		ctx.fill();
		ctx.stroke();
		ctx.restore();
		if (ins.label) {
			const size = shape === 'pill' ? 0.46 : ins.label.length > 1 ? 0.4 : 0.52;
			this.label(ctx, ins.label, ins.x, ins.y + 0.03, size, lit ? '#1a0c10' : color + 'cc');
		}
	}

	/* ---------- Each frame ---------- */

	draw(scene: Scene, now: number, dt: number, opts: DrawOptions) {
		const ctx = this.ctx;
		const u = this.unit;
		const g = scene.game;
		const w = g.world;
		const motion = opts.motion;
		const paused = scene.status.type === 'paused' || scene.status.type === 'over';
		if (!paused) this.clock += dt;
		const t = motion ? this.clock : 0;
		this.decay(dt);
		const blink: Blink = (rate, phase = 0) => (motion ? Math.sin((t * rate + phase) * TAU) > 0 : true);

		ctx.setTransform(1, 0, 0, 1, 0, 0);
		if (motion && this.shake > 0.02 && !paused) {
			ctx.fillStyle = '#000';
			ctx.fillRect(0, 0, this.width, this.height);
			const k = this.shake * this.shake * 0.22 * u;
			ctx.setTransform(1, 0, 0, 1, (Math.random() - 0.5) * k, (Math.random() - 0.5) * k);
		}
		if (this.base) ctx.drawImage(this.base, 0, 0);

		const dark = paused ? 0 : this.darkness();
		const live = motion && !paused && !g.tilt.tilted;
		this.drawGI(ctx, u, g, t, dark, live);

		const lights = g.tilt.tilted ? {} : g.rules.lights(g, blink);
		const chase = Math.floor(t * 7);
		const lightUp = (raised: boolean) => {
			this.art.inserts.forEach((ins, i) => {
				if (!!ins.raised !== raised) return;
				const light: Light | undefined = lights[ins.id];
				let level = typeof light === 'number' ? light : (light?.level ?? 0);
				let color = typeof light === 'object' ? light.color : ins.color;
				level *= 1 - dark * 0.85;
				if (live) {
					const fx = this.showAt(ins.x, ins.y, i);
					if (fx.level > level) {
						level = fx.level;
						color = fx.color ?? ins.color;
					}
					if (level < 0.3 && (chase + i * 3) % 11 === 0) level = 0.3 * (1 - dark);
				}
				if (level > 0.02) this.insert(ctx, ins, Math.min(1, level), color);
			});
		};
		lightUp(false);

		this.drawBulbs(ctx, u, g, t, motion, paused, dark);
		if (live && this.shows.some((s) => s.kind === 'strobe' && s.age >= 0)) {
			const on = Math.floor(t * 12) % 2;
			this.bumperFlash = this.bumperFlash.map((v, i) => ((i + on) % 2 ? Math.max(v, 0.6) : v));
		}
		this.drawTargets(ctx, u, g, 0);
		this.drawBumpers(ctx, u, t);
		this.drawSlings(ctx, u);
		this.drawSpinners(ctx, u, g);
		this.drawDiscs(ctx, u, g);
		for (const m of this.def.magnets) if (w.magnets[m.id]) this.helpers.shine(ctx, '#7fd8ff', m.x, m.y, 3.4, 0.5 + 0.3 * Math.sin(t * 9));
		this.art.toys?.(ctx, g, t, this.helpers, { hit: (id) => this.hit(id) });
		this.drawPlunger(ctx, u, plungerTop(w));
		for (const f of w.flippers) if (f.layer === 0) this.drawFlipper(ctx, u, f, g.tilt.tilted);
		this.drawBalls(ctx, u, g, motion, 0);
		this.art.overlay?.(ctx, g, t, this.helpers, blink);
		if (this.upper) ctx.drawImage(this.upper, 0, 0);
		lightUp(true);
		this.drawTargets(ctx, u, g, 1);
		this.art.raised?.(ctx, g, t, this.helpers, { hit: (id) => this.hit(id) });
		for (const f of w.flippers) if (f.layer === 1) this.drawFlipper(ctx, u, f, g.tilt.tilted);
		this.drawBalls(ctx, u, g, motion, 1);
		this.drawEffects(ctx, u, dt);
		if (live) this.drawFlashes(ctx, u);
		if (this.flare > 0 && motion) {
			ctx.fillStyle = `rgba(255, 236, 190, ${this.flare * 0.16})`;
			ctx.fillRect(0, 0, this.width, this.height);
		}
		if (dark > 0.02 && motion) {
			ctx.fillStyle = `rgba(0, 0, 0, ${dark * 0.32})`;
			ctx.fillRect(0, 0, this.width, this.height);
		}
		if (g.tilt.tilted) {
			ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
			ctx.fillRect(0, 0, this.width, this.height);
			this.label(ctx, 'TILT', FIELD_W / 2, FIELD_H * 0.42, 3, '#ff4040', this.theme.display);
		}
	}

	private decay(dt: number) {
		const k = (v: number, rate: number) => Math.max(0, v - dt * rate);
		this.bumperFlash = this.bumperFlash.map((v) => k(v, 6));
		this.slingFlash.left = k(this.slingFlash.left, 7);
		this.slingFlash.right = k(this.slingFlash.right, 7);
		for (const [id, v] of this.hits) {
			const next = k(v, 2.2);
			if (next) this.hits.set(id, next);
			else this.hits.delete(id);
		}
		this.flare = k(this.flare, 2.5);
		this.shake = k(this.shake, 2.6);
		this.brownout = k(this.brownout, 5);
		for (const s of this.shows) s.age += dt;
		this.shows = this.shows.filter((s) => s.age < s.life);
		for (const f of this.flashes) f.age += dt;
		this.flashes = this.flashes.filter((f) => f.age < f.life);
	}

	/** How far the lights are out, 0 to 1. */
	private darkness() {
		let d = 0;
		for (const s of this.shows) {
			if (s.kind !== 'dark' || s.age < 0) continue;
			const p = s.age / s.life;
			d = Math.max(d, p < 0.15 ? p / 0.15 : p > 0.75 ? (1 - p) / 0.25 : 1);
		}
		return d;
	}

	/** The brightest show over a point, and its colour. */
	private showAt(x: number, y: number, i: number): { level: number; color: string | null } {
		let level = 0;
		let color: string | null = null;
		for (const s of this.shows) {
			if (s.age < 0 || s.kind === 'dark') continue;
			const p = s.age / s.life;
			let v = 0;
			if (s.kind === 'sweep') {
				const band = s.up ? 39 - p * 44 : -4 + p * 44;
				v = Math.max(0, 1 - Math.abs(y - band) / 2.4);
			} else if (s.kind === 'strobe') v = (Math.floor(s.age * 12) + i) % 2 ? 1 : 0.15;
			else {
				const r = p * 24;
				v = Math.max(0, 1 - Math.abs(Math.hypot(x - s.x, y - s.y) - r) / 1.8) * (1 - p);
			}
			if (v > level) {
				level = v;
				color = s.color;
			}
		}
		return { level, color };
	}

	private drawGI(ctx: CanvasRenderingContext2D, u: number, g: AnyGame, t: number, dark: number, live: boolean) {
		if (g.tilt.tilted) return;
		const warm = this.theme.gi ?? '#ffdcaa';
		const [h1, h2] = this.theme.hot;
		const level = (1 - dark) * (1 - this.brownout * 0.45);
		if (level < 0.03) return;
		const size = 6 * u;
		ctx.globalCompositeOperation = 'lighter';
		GI.forEach((p, i) => {
			const color = live && g.multiball ? (Math.floor(t * 4 + i) % 2 ? h1 : h2) : warm;
			const flicker = live ? 0.9 + 0.1 * Math.sin(t * 23 + i * 7) : 1;
			ctx.globalAlpha = 0.2 * level * flicker;
			ctx.drawImage(this.glow(color), p.x * u - size / 2, p.y * u - size / 2, size, size);
		});
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';
	}

	private drawFlashes(ctx: CanvasRenderingContext2D, u: number) {
		if (!this.flashes.length) return;
		ctx.globalCompositeOperation = 'lighter';
		for (const f of this.flashes) {
			const p = f.age / f.life;
			// Big flashes stay at three a second or slower.
			const on = f.strobe ? (Math.floor(f.age * 6) % 2 ? 0.35 : 1) : 1;
			ctx.globalAlpha = Math.max(0, (1 - p) * (1 - p)) * 0.8 * on;
			const s = f.size * u;
			ctx.drawImage(this.glow(f.color), f.x * u - s / 2, f.y * u - s / 2, s, s);
		}
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';
	}

	private drawBulbs(ctx: CanvasRenderingContext2D, u: number, g: AnyGame, t: number, motion: boolean, paused: boolean, dark: number) {
		const bulbs = this.art.bulbs;
		if (!bulbs.length) return;
		const glowSize = 1.7 * u;
		const [h1, h2] = this.theme.hot;
		const pops = Math.max(0, ...this.bumperFlash);
		ctx.globalCompositeOperation = 'lighter';
		bulbs.forEach((b, i) => {
			let level: number;
			let color = b.color;
			if (!motion) level = 0.7;
			else if (paused || g.tilt.tilted) level = 0.2;
			else if (g.multiball) {
				color = i % 2 ? h1 : h2;
				level = 0.35 + 0.65 * Math.abs(Math.sin(t * 9 + i * 1.7));
			} else if (g.phase === 'serve' || g.phase === 'tally') level = (Math.floor(t * 3) + i) % 2 ? 1 : 0.25;
			else if (g.mode) level = (Math.floor(t * 14) + i) % 2 ? 1 : 0.2;
			else level = (Math.floor(t * 10) - i) % 3 === 0 ? 1 : 0.35;
			if (motion && !paused) {
				const fx = this.showAt(b.x, b.y, i);
				if (fx.level > level) {
					level = fx.level;
					if (fx.color) color = fx.color;
				}
				level = Math.max(level * (1 - dark), pops * 0.9 * ((i % 2) ^ (Math.floor(t * 20) % 2)));
			}
			if (this.flare > 0) level = Math.max(level, this.flare);
			ctx.globalAlpha = level * 0.8;
			ctx.drawImage(this.glow(color), b.x * u - glowSize / 2, b.y * u - glowSize / 2, glowSize, glowSize);
		});
		ctx.globalCompositeOperation = 'source-over';
		ctx.globalAlpha = 1;
		for (const b of bulbs) disc(ctx, b.x * u, b.y * u, 0.15 * u, b.color);
	}

	private plate(ctx: CanvasRenderingContext2D, u: number, ax: number, ay: number, bx: number, by: number, depth: number, face: string, flash: number) {
		const dx = bx - ax;
		const dy = by - ay;
		const len = Math.hypot(dx, dy);
		ctx.save();
		ctx.translate(ax * u, ay * u);
		ctx.rotate(Math.atan2(dy, dx));
		ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
		ctx.fillRect(0.06 * u, -depth * 0.5 * u + 0.1 * u, len * u, depth * u);
		const grad = ctx.createLinearGradient(0, -depth * u, 0, depth * u);
		grad.addColorStop(0, '#ffffff');
		grad.addColorStop(0.35, face);
		grad.addColorStop(1, this.theme.target.edge);
		ctx.fillStyle = grad;
		ctx.fillRect(0, -depth * 0.5 * u, len * u, depth * u);
		if (flash > 0) {
			ctx.fillStyle = `rgba(255, 255, 255, ${flash * 0.7})`;
			ctx.fillRect(0, -depth * 0.5 * u, len * u, depth * u);
		}
		ctx.restore();
	}

	private drawTargets(ctx: CanvasRenderingContext2D, u: number, g: AnyGame, layer: 0 | 1) {
		const t = this.theme;
		for (const bank of this.def.banks) {
			if (bank.layer !== layer) continue;
			const up = g.world.drops[bank.id]!;
			bank.targets.forEach((tg, i) => {
				if (!up[i]) {
					ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
					ctx.lineWidth = 0.22 * u;
					ctx.beginPath();
					ctx.moveTo(tg.ax * u, tg.ay * u);
					ctx.lineTo(tg.bx * u, tg.by * u);
					ctx.stroke();
					return;
				}
				this.plate(ctx, u, tg.ax, tg.ay, tg.bx, tg.by, 0.34, t.target.face, this.hit(`${bank.id}:${i}`));
				const letter = bank.letters?.[i];
				if (letter) this.label(ctx, letter, (tg.ax + tg.bx) / 2, (tg.ay + tg.by) / 2, 0.36, t.target.ink);
			});
		}
		for (const s of this.def.standups) {
			if (s.layer !== layer) continue;
			this.plate(ctx, u, s.ax, s.ay, s.bx, s.by, 0.3, t.target.face, this.hit(s.id));
			if (s.label) this.label(ctx, s.label, (s.ax + s.bx) / 2, (s.ay + s.by) / 2, 0.32, t.target.ink);
		}
	}

	private drawSpinners(ctx: CanvasRenderingContext2D, u: number, g: AnyGame) {
		for (const sp of this.def.spinners) {
			const st = g.world.spin[sp.id]!;
			const open = Math.abs(Math.cos(st.angle));
			const mx = (sp.ax + sp.bx) / 2;
			const my = (sp.ay + sp.by) / 2;
			const dx = sp.bx - sp.ax;
			const dy = sp.by - sp.ay;
			const len = Math.hypot(dx, dy);
			ctx.save();
			ctx.translate(mx * u, my * u);
			ctx.rotate(Math.atan2(dy, dx));
			ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
			ctx.fillRect((-len / 2) * u, 0.05 * u, len * u, 0.5 * open * u);
			const grad = ctx.createLinearGradient(0, -0.3 * u, 0, 0.3 * u);
			grad.addColorStop(0, '#f4f4f8');
			grad.addColorStop(1, this.theme.target.face);
			ctx.fillStyle = grad;
			ctx.fillRect((-len / 2 + 0.08) * u, -0.25 * open * u, (len - 0.16) * u, Math.max(0.04, 0.5 * open) * u);
			ctx.strokeStyle = this.theme.rail;
			ctx.lineWidth = 0.06 * u;
			ctx.beginPath();
			ctx.moveTo((-len / 2) * u, 0);
			ctx.lineTo((len / 2) * u, 0);
			ctx.stroke();
			ctx.restore();
			if (st.rate > 20) this.helpers.shine(ctx, this.theme.spark, mx, my, 2.2, Math.min(0.6, st.rate / 200));
		}
	}

	/** Spinning discs: a dished plate with spiral vanes that turn with it. */
	private drawDiscs(ctx: CanvasRenderingContext2D, u: number, g: AnyGame) {
		const th = this.theme;
		for (const d of this.def.discs) {
			const st = g.world.discs[d.id]!;
			const x = d.x * u;
			const y = d.y * u;
			const r = d.r * u;
			disc(ctx, x, y, r, radial(ctx, x, y, r, [[0, 'rgba(0, 0, 0, 0.55)'], [0.75, 'rgba(0, 0, 0, 0.25)'], [1, 'rgba(255, 255, 255, 0.12)']]));
			ctx.save();
			ctx.translate(x, y);
			ctx.rotate(st.angle);
			ctx.strokeStyle = th.railShine;
			ctx.lineCap = 'round';
			ctx.lineWidth = 0.07 * u;
			const sign = Math.sign(st.rate) || 1;
			for (let k = 0; k < 5; k += 1) {
				ctx.rotate(TAU / 5);
				ctx.beginPath();
				ctx.moveTo(0, 0);
				ctx.quadraticCurveTo(r * 0.55, sign * r * 0.1, r * 0.92, sign * r * 0.5);
				ctx.stroke();
			}
			ctx.restore();
			ctx.strokeStyle = th.rail;
			ctx.lineWidth = 0.1 * u;
			ctx.beginPath();
			ctx.arc(x, y, r, 0, TAU);
			ctx.stroke();
			disc(ctx, x, y, 0.22 * u, th.rail);
		}
	}

	private drawBumpers(ctx: CanvasRenderingContext2D, u: number, t: number) {
		const th = this.theme.bumper;
		this.def.bumpers.forEach((b, i) => {
			const flash = this.bumperFlash[i]!;
			const x = b.x * u;
			const y = b.y * u;
			const r = b.r * u;
			if (flash > 0) {
				const s = r * 6 * flash;
				ctx.globalCompositeOperation = 'lighter';
				ctx.drawImage(this.glow(th.flash), x - s / 2, y - s / 2, s, s);
				ctx.globalCompositeOperation = 'source-over';
			}
			const cap = r * (0.86 - flash * 0.08);
			const lit = flash > 0.3;
			const turn = t * 0.6 + i;
			switch (th.style) {
				case 'carousel':
				case 'wagon': {
					const n = th.style === 'wagon' ? 8 : 10;
					for (let k = 0; k < n; k += 1) {
						ctx.fillStyle = k % 2 ? (lit ? '#fff4d8' : th.b) : lit ? th.flash : th.a;
						ctx.beginPath();
						ctx.moveTo(x, y);
						ctx.arc(x, y, cap, (th.style === 'wagon' ? 0 : turn) + (k / n) * TAU, (th.style === 'wagon' ? 0 : turn) + ((k + 1) / n) * TAU);
						ctx.closePath();
						ctx.fill();
					}
					ctx.strokeStyle = th.ring;
					ctx.lineWidth = (th.style === 'wagon' ? 0.2 : 0.12) * u;
					ctx.beginPath();
					ctx.arc(x, y, cap, 0, TAU);
					ctx.stroke();
					disc(ctx, x, y, r * 0.26, radial(ctx, x - r * 0.1, y - r * 0.12, r * 0.3, [[0, '#fff7d0'], [1, th.cap]]));
					break;
				}
				case 'classic': {
					disc(ctx, x, y, r * 0.98, lit ? '#ffffff' : th.b);
					ctx.strokeStyle = th.ring;
					ctx.lineWidth = 0.14 * u;
					ctx.beginPath();
					ctx.arc(x, y, r * 0.9, 0, TAU);
					ctx.stroke();
					disc(ctx, x, y, cap * 0.78, radial(ctx, x - r * 0.2, y - r * 0.25, cap, [[0, lit ? '#ffffff' : th.flash], [1, th.a]]));
					disc(ctx, x, y, r * 0.18, th.cap);
					break;
				}
				case 'neon': {
					disc(ctx, x, y, r * 0.95, '#0a0a18');
					for (const [rr, c] of [
						[0.88, th.a],
						[0.6, th.b]
					] as const) {
						ctx.strokeStyle = lit ? '#ffffff' : c;
						ctx.lineWidth = 0.1 * u;
						ctx.beginPath();
						ctx.arc(x, y, r * rr, 0, TAU);
						ctx.stroke();
					}
					this.helpers.shine(ctx, th.a, b.x, b.y, b.r * 2.6, lit ? 0.9 : 0.35);
					starPath(ctx, x, y, r * 0.32, 0.45, 4, turn);
					ctx.fillStyle = th.cap;
					ctx.fill();
					break;
				}
				case 'barrel': {
					disc(ctx, x, y, r * 0.95, radial(ctx, x - r * 0.3, y - r * 0.3, r * 1.2, [[0, lit ? '#f8d9a0' : th.b], [1, th.a]]));
					ctx.strokeStyle = th.ring;
					ctx.lineWidth = 0.11 * u;
					for (const rr of [0.92, 0.62]) {
						ctx.beginPath();
						ctx.arc(x, y, r * rr, 0, TAU);
						ctx.stroke();
					}
					ctx.strokeStyle = 'rgba(40, 20, 6, 0.6)';
					ctx.lineWidth = 0.04 * u;
					for (let k = 0; k < 8; k += 1) {
						const a = (k / 8) * TAU;
						ctx.beginPath();
						ctx.moveTo(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62);
						ctx.lineTo(x + Math.cos(a) * r * 0.92, y + Math.sin(a) * r * 0.92);
						ctx.stroke();
					}
					disc(ctx, x, y, r * 0.22, th.cap);
					break;
				}
				case 'shell': {
					for (let k = 0; k < 9; k += 1) {
						const a0 = -Math.PI / 2 + ((k - 4.5) / 9) * Math.PI * 1.7;
						const a1 = -Math.PI / 2 + ((k - 3.5) / 9) * Math.PI * 1.7;
						ctx.fillStyle = k % 2 ? (lit ? '#ffffff' : th.b) : lit ? th.flash : th.a;
						ctx.beginPath();
						ctx.moveTo(x, y + r * 0.55);
						ctx.arc(x, y + r * 0.1, cap, a0, a1);
						ctx.closePath();
						ctx.fill();
					}
					disc(ctx, x, y + r * 0.45, r * 0.22, th.cap);
					break;
				}
				case 'shield': {
					ctx.beginPath();
					ctx.moveTo(x - cap * 0.85, y - cap * 0.75);
					ctx.lineTo(x + cap * 0.85, y - cap * 0.75);
					ctx.lineTo(x + cap * 0.85, y + cap * 0.05);
					ctx.quadraticCurveTo(x + cap * 0.7, y + cap * 0.75, x, y + cap);
					ctx.quadraticCurveTo(x - cap * 0.7, y + cap * 0.75, x - cap * 0.85, y + cap * 0.05);
					ctx.closePath();
					ctx.fillStyle = lit ? th.flash : th.a;
					ctx.fill();
					ctx.strokeStyle = th.ring;
					ctx.lineWidth = 0.1 * u;
					ctx.stroke();
					ctx.fillStyle = th.b;
					ctx.fillRect(x - cap * 0.12, y - cap * 0.75, cap * 0.24, cap * 1.6);
					ctx.fillRect(x - cap * 0.85, y - cap * 0.2, cap * 1.7, cap * 0.24);
					disc(ctx, x, y - cap * 0.08, r * 0.18, th.cap);
					break;
				}
			}
		});
	}

	private drawSlings(ctx: CanvasRenderingContext2D, u: number) {
		for (const s of this.def.walls) {
			if (s.kind !== 'sling') continue;
			const flash = this.slingFlash[s.side!];
			ctx.strokeStyle = flash > 0 ? '#ffffff' : this.theme.rubber;
			ctx.lineWidth = s.t * 2 * u;
			ctx.lineCap = 'round';
			ctx.beginPath();
			const mx = (s.ax + s.bx) / 2;
			const my = (s.ay + s.by) / 2;
			const nx = s.side === 'left' ? 0.88 : -0.88;
			ctx.moveTo(s.ax * u, s.ay * u);
			ctx.quadraticCurveTo((mx + nx * flash * 0.5) * u, (my - 0.46 * flash * 0.5) * u, s.bx * u, s.by * u);
			ctx.stroke();
			if (flash > 0) this.helpers.shine(ctx, '#ffffff', mx, my, 3 * flash, 1);
		}
	}

	private drawPlunger(ctx: CanvasRenderingContext2D, u: number, top: number) {
		const lane = this.def.lane;
		const x0 = (lane.wall + 0.2) * u;
		const x1 = 19.45 * u;
		const bottom = FIELD_H * u;
		ctx.strokeStyle = '#8f8a9e';
		ctx.lineWidth = 0.08 * u;
		ctx.beginPath();
		const coils = 7;
		const span = bottom - (top + 0.4) * u;
		for (let k = 0; k <= coils * 2; k += 1) {
			const yy = (top + 0.4) * u + (span * k) / (coils * 2);
			const xx = k % 2 ? x1 - 0.2 * u : x0 + 0.2 * u;
			if (k === 0) ctx.moveTo(xx, yy);
			else ctx.lineTo(xx, yy);
		}
		ctx.stroke();
		const knob = ctx.createLinearGradient(x0, 0, x1, 0);
		knob.addColorStop(0, '#6b6676');
		knob.addColorStop(0.5, '#e9e4f0');
		knob.addColorStop(1, '#6b6676');
		ctx.fillStyle = knob;
		ctx.fillRect(x0, top * u, x1 - x0, 0.4 * u);
	}

	private drawFlipper(ctx: CanvasRenderingContext2D, u: number, f: Flipper, dead: boolean) {
		const fl = this.theme.flipper;
		ctx.save();
		ctx.translate(0.12 * u, 0.2 * u);
		flipperPath(ctx, f, u);
		ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
		ctx.fill();
		ctx.restore();
		flipperPath(ctx, f, u);
		ctx.fillStyle = dead ? '#777' : fl.body;
		ctx.fill();
		ctx.strokeStyle = fl.rubber;
		ctx.lineWidth = 0.13 * u;
		ctx.stroke();
		disc(ctx, f.px * u, f.py * u, 0.16 * u, fl.pivot);
	}

	private drawBalls(ctx: CanvasRenderingContext2D, u: number, g: AnyGame, motion: boolean, layer: 0 | 1) {
		const sprite = this.ball;
		if (!sprite) return;
		for (const c of this.def.captives) {
			if (c.layer !== layer) continue;
			const at = captiveAt(g.world, c);
			const size = BALL_R * 2 * u;
			disc(ctx, (at.x + 0.11) * u, (at.y + 0.18) * u, BALL_R * u * 0.95, 'rgba(0, 0, 0, 0.4)');
			ctx.drawImage(sprite, at.x * u - size / 2, at.y * u - size / 2, size, size);
		}
		for (const b of g.world.balls) {
			if (b.hidden) continue;
			const raised = b.layer === 1 || b.state === 'riding';
			if ((layer === 1) !== raised) continue;
			const size = BALL_R * 2 * u * (raised ? 1.14 : 1);
			const held = b.state === 'held';
			if (motion && !held) {
				let trail = this.trails.get(b.id);
				if (!trail) this.trails.set(b.id, (trail = []));
				trail.push({ x: b.x, y: b.y });
				if (trail.length > 6) trail.shift();
				const speed = Math.hypot(b.vx, b.vy);
				if (speed > 25) {
					trail.forEach((p, i) => {
						ctx.globalAlpha = ((i + 1) / trail.length) * 0.18 * Math.min(1, (speed - 25) / 25);
						ctx.drawImage(sprite, p.x * u - size / 2, p.y * u - size / 2, size, size);
					});
					ctx.globalAlpha = 1;
				}
			}
			const drop = raised ? 0.45 : 0.18;
			disc(ctx, (b.x + drop * 0.6) * u, (b.y + drop) * u, BALL_R * u * 0.95, raised ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.4)');
			const s = held ? size * 0.86 : size;
			ctx.drawImage(sprite, b.x * u - s / 2, b.y * u - s / 2, s, s);
		}
		if (layer === 1) {
			const live = new Set(g.world.balls.map((b) => b.id));
			for (const id of this.trails.keys()) if (!live.has(id)) this.trails.delete(id);
		}
	}

	private drawEffects(ctx: CanvasRenderingContext2D, u: number, dt: number) {
		const p = this.theme.popup;
		this.sparks = this.sparks.filter((s) => {
			s.age += dt;
			if (s.age >= s.life) return false;
			s.vx *= 1 - dt * 3;
			s.vy = s.vy * (1 - dt * 3) + dt * 8;
			s.x += s.vx * dt;
			s.y += s.vy * dt;
			ctx.globalAlpha = 1 - s.age / s.life;
			disc(ctx, s.x * u, s.y * u, s.size * u, s.color);
			return true;
		});
		ctx.globalAlpha = 1;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		this.popups = this.popups.filter((pop) => {
			pop.age += dt;
			if (pop.age > 0.9) return false;
			ctx.globalAlpha = 1 - pop.age / 0.9;
			ctx.font = `${(pop.big ? 0.8 : 0.55) * u}px ${this.theme.label}`;
			ctx.lineWidth = 0.12 * u;
			ctx.strokeStyle = p.stroke;
			const y = (pop.y - pop.age * 1.4) * u;
			ctx.strokeText(pop.text, pop.x * u, y);
			ctx.fillStyle = pop.big ? p.big : p.ink;
			ctx.fillText(pop.text, pop.x * u, y);
			return true;
		});
		ctx.globalAlpha = 1;
	}
}
