import { BURST, COL, MOON, ROW, SIZE, type Piece, type Special, type Spot, type Step } from './match';
import { centre, COLS, DEAD_Y, FIELD_H, FIELD_W, LAUNCH, planShot, rowLength, ROWS, type Point, type ShotResult } from './shooter';
import type { KoiEvent, KoiSession } from './session.svelte';
import { BLOOMS, KINDS, type Kind } from './types';

type Petal = { x: number; y: number; vx: number; vy: number; spin: number; a: number; age: number; life: number; size: number; color: string };
type Ring = { x: number; y: number; age: number; life: number; size: number; color: string };
type Sinker = { x: number; y: number; vy: number; vx: number; age: number; k: Kind };
type Ghost = { x: number; y: number; age: number; piece: Piece };
type Beam = { r: number; c: number; s: Special; age: number; color: string };

const MAX_PETALS = 360;
const TAU = Math.PI * 2;

function canvasOf(size: number) {
	const c = document.createElement('canvas');
	c.width = c.height = Math.max(1, Math.ceil(size));
	return c;
}

/** Each bloom has its own emblem so the six read apart without colour. */
function emblem(ctx: CanvasRenderingContext2D, k: Kind, s: number) {
	const c = s / 2;
	ctx.save();
	ctx.translate(c, c);
	ctx.fillStyle = 'rgba(255,255,255,0.92)';
	ctx.strokeStyle = 'rgba(255,255,255,0.92)';
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	const u = s * 0.3;
	switch (k) {
		case 1: {
			// Lotus: five pointed petals.
			for (let i = 0; i < 5; i += 1) {
				ctx.save();
				ctx.rotate((i / 5) * TAU);
				ctx.beginPath();
				ctx.moveTo(0, 0);
				ctx.quadraticCurveTo(u * 0.42, -u * 0.5, 0, -u);
				ctx.quadraticCurveTo(-u * 0.42, -u * 0.5, 0, 0);
				ctx.fill();
				ctx.restore();
			}
			break;
		}
		case 2: {
			// Ginkgo: a split fan on a stem.
			ctx.beginPath();
			ctx.moveTo(0, u * 0.55);
			ctx.lineTo(-u * 0.95, -u * 0.45);
			ctx.quadraticCurveTo(-u * 0.5, -u * 0.95, -u * 0.06, -u * 0.62);
			ctx.lineTo(0, -u * 0.35);
			ctx.lineTo(u * 0.06, -u * 0.62);
			ctx.quadraticCurveTo(u * 0.5, -u * 0.95, u * 0.95, -u * 0.45);
			ctx.closePath();
			ctx.fill();
			ctx.lineWidth = s * 0.045;
			ctx.beginPath();
			ctx.moveTo(0, u * 0.5);
			ctx.lineTo(0, u * 0.95);
			ctx.stroke();
			break;
		}
		case 3: {
			// Koi: a fish with a forked tail.
			ctx.rotate(-0.5);
			ctx.beginPath();
			ctx.ellipse(-u * 0.12, 0, u * 0.62, u * 0.34, 0, 0, TAU);
			ctx.fill();
			ctx.beginPath();
			ctx.moveTo(u * 0.4, 0);
			ctx.lineTo(u * 0.95, -u * 0.4);
			ctx.lineTo(u * 0.78, 0);
			ctx.lineTo(u * 0.95, u * 0.4);
			ctx.closePath();
			ctx.fill();
			break;
		}
		case 4: {
			// Lily pad: a disc with a wedge cut out and veins.
			ctx.beginPath();
			ctx.moveTo(0, 0);
			ctx.arc(0, 0, u * 0.85, -Math.PI / 2 + 0.38, -Math.PI / 2 - 0.38 + TAU);
			ctx.closePath();
			ctx.fill();
			ctx.globalCompositeOperation = 'destination-out';
			ctx.lineWidth = s * 0.03;
			for (let i = 0; i < 5; i += 1) {
				const a = -Math.PI / 2 + 0.9 + i * 1.12;
				ctx.beginPath();
				ctx.moveTo(0, 0);
				ctx.lineTo(Math.cos(a) * u * 0.7, Math.sin(a) * u * 0.7);
				ctx.stroke();
			}
			break;
		}
		case 5: {
			// Iris: three falls and a standard.
			for (let i = 0; i < 3; i += 1) {
				ctx.save();
				ctx.rotate((i / 3) * TAU + Math.PI);
				ctx.beginPath();
				ctx.ellipse(0, -u * 0.5, u * 0.3, u * 0.52, 0, 0, TAU);
				ctx.fill();
				ctx.restore();
			}
			ctx.globalCompositeOperation = 'destination-out';
			ctx.beginPath();
			ctx.arc(0, 0, u * 0.16, 0, TAU);
			ctx.fill();
			break;
		}
		case 6: {
			// Dragonfly: a long body and two pairs of wings.
			ctx.lineWidth = s * 0.07;
			ctx.beginPath();
			ctx.moveTo(0, -u * 0.8);
			ctx.lineTo(0, u * 0.95);
			ctx.stroke();
			for (const [y, w] of [
				[-u * 0.35, 0.95],
				[-u * 0.02, 0.8]
			] as const) {
				for (const side of [-1, 1]) {
					ctx.beginPath();
					ctx.ellipse(side * u * w * 0.5, y, u * w * 0.5, u * 0.17, side * -0.18, 0, TAU);
					ctx.fill();
				}
			}
			break;
		}
	}
	ctx.restore();
}

export function bloomSprite(k: Kind, s: number) {
	const canvas = canvasOf(s);
	const ctx = canvas.getContext('2d')!;
	const b = BLOOMS[k];
	const c = s / 2;
	const r = s * 0.46;
	const g = ctx.createRadialGradient(c - r * 0.35, c - r * 0.4, r * 0.1, c, c, r);
	g.addColorStop(0, b.light);
	g.addColorStop(0.45, b.base);
	g.addColorStop(1, b.dark);
	ctx.fillStyle = g;
	ctx.beginPath();
	ctx.arc(c, c, r, 0, TAU);
	ctx.fill();
	ctx.strokeStyle = 'rgba(255,255,255,0.45)';
	ctx.lineWidth = Math.max(1, s * 0.03);
	ctx.stroke();
	ctx.globalAlpha = 0.95;
	emblem(ctx, k, s);
	ctx.globalAlpha = 0.5;
	ctx.fillStyle = '#fff';
	ctx.beginPath();
	ctx.ellipse(c - r * 0.42, c - r * 0.5, r * 0.22, r * 0.12, -0.6, 0, TAU);
	ctx.fill();
	return canvas;
}

export function moonSprite(s: number) {
	const canvas = canvasOf(s);
	const ctx = canvas.getContext('2d')!;
	const c = s / 2;
	const r = s * 0.46;
	const g = ctx.createRadialGradient(c - r * 0.3, c - r * 0.3, r * 0.1, c, c, r);
	g.addColorStop(0, '#ffffff');
	g.addColorStop(0.6, '#dfe8ff');
	g.addColorStop(1, '#8d9bd6');
	ctx.fillStyle = g;
	ctx.beginPath();
	ctx.arc(c, c, r, 0, TAU);
	ctx.fill();
	const ring = ctx.createConicGradient(0, c, c);
	KINDS.forEach((k, i) => ring.addColorStop(i / KINDS.length, BLOOMS[k].base));
	ring.addColorStop(1, BLOOMS[1].base);
	ctx.strokeStyle = ring;
	ctx.lineWidth = s * 0.07;
	ctx.beginPath();
	ctx.arc(c, c, r - s * 0.035, 0, TAU);
	ctx.stroke();
	ctx.fillStyle = '#fffbe8';
	ctx.beginPath();
	ctx.arc(c, c, r * 0.5, 0, TAU);
	ctx.fill();
	ctx.globalCompositeOperation = 'destination-out';
	ctx.beginPath();
	ctx.arc(c + r * 0.22, c - r * 0.12, r * 0.42, 0, TAU);
	ctx.fill();
	return canvas;
}

export type DrawOptions = { motion: boolean; aim: 'full' | 'short' };

export class PondRenderer {
	private ctx: CanvasRenderingContext2D;
	private sprites = new Map<Kind, HTMLCanvasElement>();
	private moon: HTMLCanvasElement | null = null;
	private spriteSize = 0;
	private unit = 1;
	private petals: Petal[] = [];
	private rings: Ring[] = [];
	private sinkers: Sinker[] = [];
	private ghosts: Ghost[] = [];
	private beams: Beam[] = [];
	private shake = 0;
	private clock = 0;
	width = 0;
	height = 0;

	constructor(private canvas: HTMLCanvasElement) {
		this.ctx = canvas.getContext('2d')!;
	}

	/** Field size in board units for each mode. */
	static field(mode: 'ripples' | 'currents') {
		return mode === 'ripples' ? { w: FIELD_W, h: FIELD_H } : { w: SIZE, h: SIZE };
	}

	resize(cssWidth: number, fieldW: number) {
		const dpr = Math.min(2, window.devicePixelRatio || 1);
		const width = Math.max(1, Math.round(cssWidth * dpr));
		const unit = width / fieldW;
		const ratio = this.canvas.clientHeight / Math.max(1, this.canvas.clientWidth);
		const height = Math.max(1, Math.round(width * ratio));
		if (width === this.width && height === this.height) return;
		this.width = this.canvas.width = width;
		this.height = this.canvas.height = height;
		this.unit = unit;
		const size = Math.ceil(unit * 1.04);
		if (size !== this.spriteSize) {
			this.spriteSize = size;
			for (const k of KINDS) this.sprites.set(k, bloomSprite(k, size));
			this.moon = moonSprite(size);
		}
	}

	clear() {
		this.petals = [];
		this.rings = [];
		this.sinkers = [];
		this.ghosts = [];
		this.beams = [];
	}

	onEvent(event: KoiEvent, session: KoiSession, motion: boolean) {
		switch (event.type) {
			case 'land':
				this.landed(event.result, event.top, motion);
				break;
			case 'bounce':
				if (motion) this.rings.push({ x: event.point.x, y: event.point.y, age: 0, life: 0.35, size: 0.6, color: 'rgba(255,255,255,0.7)' });
				break;
			case 'step':
				this.stepped(event.step, motion);
				break;
			case 'bonk':
				if (motion) this.shake = 0.18;
				break;
			case 'cleared':
				if (motion && session.mode === 'currents') {
					for (let i = 0; i < 40; i += 1) this.burstPetals(Math.random() * SIZE, Math.random() * SIZE, KINDS[i % 6]!, 1);
				}
				break;
		}
	}

	private burstPetals(x: number, y: number, k: Kind, n: number) {
		const color = BLOOMS[k].base;
		for (let i = 0; i < n && this.petals.length < MAX_PETALS; i += 1) {
			const a = Math.random() * TAU;
			const v = 1.6 + Math.random() * 3.2;
			this.petals.push({
				x,
				y,
				vx: Math.cos(a) * v,
				vy: Math.sin(a) * v - 1.2,
				spin: (Math.random() - 0.5) * 9,
				a: Math.random() * TAU,
				age: 0,
				life: 0.7 + Math.random() * 0.5,
				size: 0.12 + Math.random() * 0.12,
				color
			});
		}
	}

	private landed(result: ShotResult, top: number, motion: boolean) {
		const at = { top };
		for (const p of result.popped) {
			const c = centre(at, p.r, p.c);
			if (motion) {
				this.burstPetals(c.x, c.y, p.k, 6);
				this.rings.push({ x: c.x, y: c.y, age: 0, life: 0.55, size: 1.3, color: BLOOMS[p.k].light });
			}
		}
		for (const d of result.dropped) {
			const c = centre(at, d.r, d.c);
			this.sinkers.push({ x: c.x, y: c.y, vx: (Math.random() - 0.5) * 1.2, vy: -1 - Math.random() * 1.5, age: 0, k: d.k });
		}
		if (!result.popped.length && result.plan.cell && motion) {
			const c = centre(at, result.plan.cell[0], result.plan.cell[1]);
			this.rings.push({ x: c.x, y: c.y, age: 0, life: 0.4, size: 0.9, color: 'rgba(255,255,255,0.55)' });
		}
	}

	private stepped(step: Step, motion: boolean) {
		for (const gone of step.cleared) {
			if (step.created.some((m) => m.r === gone.r && m.c === gone.c)) continue;
			this.ghosts.push({ x: gone.c, y: gone.r, age: 0, piece: gone.piece });
			if (motion && gone.piece.k) this.burstPetals(gone.c + 0.5, gone.r + 0.5, gone.piece.k, 3);
		}
		for (const b of step.blasts) {
			const color = b.k ? BLOOMS[b.k].light : '#ffffff';
			this.beams.push({ r: b.r, c: b.c, s: b.s, age: 0, color });
			if (motion) this.shake = Math.max(this.shake, b.s === MOON ? 0.3 : 0.14);
		}
		if (motion) {
			for (const m of step.created) this.rings.push({ x: m.c + 0.5, y: m.r + 0.5, age: 0, life: 0.5, size: 1.4, color: 'rgba(255,255,255,0.8)' });
		}
	}

	private tick(dt: number) {
		this.clock += dt;
		this.shake = Math.max(0, this.shake - dt);
		for (const p of this.petals) {
			p.age += dt;
			p.vx *= 1 - dt * 2.2;
			p.vy = p.vy * (1 - dt * 2.2) + dt * 3.2;
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			p.a += p.spin * dt;
		}
		this.petals = this.petals.filter((p) => p.age < p.life);
		for (const r of this.rings) r.age += dt;
		this.rings = this.rings.filter((r) => r.age < r.life);
		for (const s of this.sinkers) {
			s.age += dt;
			s.vy += dt * 14;
			s.x += s.vx * dt;
			s.y += s.vy * dt;
		}
		this.sinkers = this.sinkers.filter((s) => s.age < 1.1);
		for (const g of this.ghosts) g.age += dt;
		this.ghosts = this.ghosts.filter((g) => g.age < 0.3);
		for (const b of this.beams) b.age += dt;
		this.beams = this.beams.filter((b) => b.age < 0.45);
	}

	private bloom(k: Kind | 0, s: Special, x: number, y: number, scale = 1, alpha = 1) {
		const ctx = this.ctx;
		const sprite = s === MOON ? this.moon : k ? this.sprites.get(k) : null;
		if (!sprite) return;
		const size = this.spriteSize * scale;
		ctx.globalAlpha = alpha;
		ctx.drawImage(sprite, x * this.unit - size / 2, y * this.unit - size / 2, size, size);
		ctx.globalAlpha = 1;
	}

	private effects() {
		const ctx = this.ctx;
		const u = this.unit;
		for (const r of this.rings) {
			const t = r.age / r.life;
			ctx.globalAlpha = (1 - t) * 0.8;
			ctx.strokeStyle = r.color;
			ctx.lineWidth = Math.max(1, u * 0.06 * (1 - t));
			ctx.beginPath();
			ctx.arc(r.x * u, r.y * u, u * r.size * (0.35 + t * 0.65), 0, TAU);
			ctx.stroke();
		}
		for (const p of this.petals) {
			const t = p.age / p.life;
			ctx.globalAlpha = 1 - t * t;
			ctx.fillStyle = p.color;
			ctx.save();
			ctx.translate(p.x * u, p.y * u);
			ctx.rotate(p.a);
			ctx.beginPath();
			ctx.ellipse(0, 0, p.size * u, p.size * u * 0.45, 0, 0, TAU);
			ctx.fill();
			ctx.restore();
		}
		ctx.globalAlpha = 1;
	}

	/* ---------- Ripples ---------- */

	drawShooter(session: KoiSession, dt: number, opts: DrawOptions) {
		const ctx = this.ctx;
		const u = this.unit;
		this.tick(dt);
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, this.width, this.height);
		const g = session.shooter;
		const top = session.shownTop;
		const at = { top };
		const playing = session.status.type === 'playing';

		// The far bank: a mossy stone lip the blooms hang from.
		const bank = (0.5 + top * 0.866) * u - u * 0.5;
		ctx.fillStyle = 'rgba(28, 74, 58, 0.55)';
		ctx.fillRect(0, 0, this.width, Math.max(0, bank));
		ctx.fillStyle = 'rgba(190, 236, 200, 0.35)';
		ctx.fillRect(0, Math.max(0, bank) - Math.max(1, u * 0.05), this.width, Math.max(1, u * 0.05));

		// The reed line: blooms crossing it reach the lily pad.
		const dead = DEAD_Y * u;
		ctx.save();
		ctx.strokeStyle = session.danger > 0.5 ? 'rgba(255, 120, 120, 0.7)' : 'rgba(255, 255, 255, 0.28)';
		ctx.setLineDash([u * 0.18, u * 0.22]);
		ctx.lineWidth = Math.max(1, u * 0.04);
		ctx.beginPath();
		ctx.moveTo(u * 0.2, dead);
		ctx.lineTo(this.width - u * 0.2, dead);
		ctx.stroke();
		ctx.restore();

		const grid = session.view;
		for (let r = 0; r < ROWS; r += 1) {
			for (let c = 0; c < rowLength(r); c += 1) {
				const k = grid[r * COLS + c] as Kind | 0;
				if (!k) continue;
				const p = centre(at, r, c);
				const sway = opts.motion ? Math.sin(this.clock * 1.4 + r * 0.9 + c * 0.6) * 0.025 : 0;
				this.bloom(k, 0, p.x + sway, p.y);
			}
		}

		if (playing && !session.flight) this.aimGuide(session, opts);

		for (const s of this.sinkers) this.bloom(s.k, 0, s.x, s.y, 1 - s.age * 0.35, Math.max(0, 1 - s.age / 1.1));

		const f = session.flight;
		if (f) this.bloom(f.kind, 0, f.point.x, f.point.y);

		this.launcher(session, opts);
		this.effects();
	}

	private aimGuide(session: KoiSession, opts: DrawOptions) {
		const ctx = this.ctx;
		const u = this.unit;
		const plan = planShot(session.shooter, session.aim, opts.aim === 'short' ? 4.2 : Infinity);
		const color = BLOOMS[session.current].light;
		ctx.fillStyle = color;
		const path = plan.path;
		const gap = 0.42;
		let next = 0.8 + (opts.motion ? (this.clock * 1.4) % gap : 0);
		let travelled = 0;
		for (let i = 1; i < path.length; i += 1) {
			const a = path[i - 1]!;
			const b = path[i]!;
			const seg = Math.hypot(b.x - a.x, b.y - a.y);
			while (next < travelled + seg) {
				const t = (next - travelled) / seg;
				ctx.globalAlpha = 0.75 * Math.max(0.15, 1 - next / 16);
				ctx.beginPath();
				ctx.arc((a.x + (b.x - a.x) * t) * u, (a.y + (b.y - a.y) * t) * u, u * 0.07, 0, TAU);
				ctx.fill();
				next += gap;
			}
			travelled += seg;
		}
		ctx.globalAlpha = 1;
		if (plan.cell) {
			const p = centre(session.shooter, plan.cell[0], plan.cell[1]);
			ctx.strokeStyle = color;
			ctx.globalAlpha = 0.6;
			ctx.lineWidth = Math.max(1, u * 0.05);
			ctx.setLineDash([u * 0.12, u * 0.1]);
			ctx.beginPath();
			ctx.arc(p.x * u, p.y * u, u * 0.44, 0, TAU);
			ctx.stroke();
			ctx.setLineDash([]);
			ctx.globalAlpha = 1;
			this.bloom(session.current, 0, p.x, p.y, 0.92, 0.5);
		} else {
			const end = path[path.length - 1]!;
			this.bloom(session.current, 0, end.x, end.y, 0.7, 0.45);
		}
	}

	private launcher(session: KoiSession, opts: DrawOptions) {
		const ctx = this.ctx;
		const u = this.unit;
		const { x, y } = LAUNCH;
		// The lily pad the shots leave from.
		ctx.save();
		ctx.translate(x * u, y * u);
		ctx.rotate(session.aim);
		const pad = ctx.createRadialGradient(0, 0, u * 0.2, 0, 0, u * 0.95);
		pad.addColorStop(0, '#6fd47f');
		pad.addColorStop(1, '#2f8a49');
		ctx.fillStyle = pad;
		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.arc(0, 0, u * 0.92, Math.PI / 2 + 0.28, Math.PI / 2 - 0.28 + TAU);
		ctx.closePath();
		ctx.fill();
		ctx.strokeStyle = 'rgba(220, 255, 220, 0.35)';
		ctx.lineWidth = Math.max(1, u * 0.03);
		for (let i = 0; i < 7; i += 1) {
			const a = Math.PI / 2 + 0.7 + i * 0.75;
			ctx.beginPath();
			ctx.moveTo(0, 0);
			ctx.lineTo(Math.cos(a) * u * 0.8, Math.sin(a) * u * 0.8);
			ctx.stroke();
		}
		// A pointer petal shows the aim even with the guide off.
		ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
		ctx.beginPath();
		ctx.moveTo(0, -u * 1.25);
		ctx.lineTo(u * 0.14, -u * 0.98);
		ctx.lineTo(-u * 0.14, -u * 0.98);
		ctx.closePath();
		ctx.fill();
		ctx.restore();

		if (!session.flight && session.status.type !== 'over') {
			const bob = opts.motion ? Math.sin(this.clock * 2.2) * 0.03 : 0;
			this.bloom(session.current, 0, x, y + bob);
		}
		// The next bloom waits on a smaller pad to the left.
		const nx = x - 2.2;
		const ny = y + 0.35;
		ctx.fillStyle = 'rgba(47, 138, 73, 0.85)';
		ctx.beginPath();
		ctx.arc(nx * u, ny * u, u * 0.5, 0, TAU);
		ctx.fill();
		this.bloom(session.next, 0, nx, ny, 0.7);
	}

	/** Which way from the lily pad a point on the canvas lies, as an aim angle. */
	aimAt(px: number, py: number): number | null {
		const x = px / this.unit - LAUNCH.x;
		const y = py / this.unit - LAUNCH.y;
		if (y > -0.2) return x < 0 ? -Math.PI / 2 : Math.PI / 2;
		return Math.atan2(x, -y);
	}

	/** True when a canvas point is on the waiting bloom (tap it to swap). */
	onNext(px: number, py: number) {
		const x = px / this.unit - (LAUNCH.x - 2.2);
		const y = py / this.unit - (LAUNCH.y + 0.35);
		return Math.hypot(x, y) < 0.75;
	}

	fieldPoint(p: Point) {
		return { x: (p.x * this.unit) / this.width, y: (p.y * this.unit) / this.height };
	}

	/* ---------- Currents ---------- */

	drawMatch(session: KoiSession, dt: number, opts: DrawOptions) {
		const ctx = this.ctx;
		const u = this.unit;
		this.tick(dt);
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, this.width, this.height);
		if (this.shake && opts.motion) {
			const k = this.shake * u * 0.25;
			ctx.translate((Math.random() - 0.5) * k, (Math.random() - 0.5) * k);
		}
		for (let r = 0; r < SIZE; r += 1) {
			for (let c = 0; c < SIZE; c += 1) {
				ctx.fillStyle = (r + c) & 1 ? 'rgba(255, 255, 255, 0.07)' : 'rgba(255, 255, 255, 0.13)';
				ctx.beginPath();
				ctx.roundRect(c * u + u * 0.04, r * u + u * 0.04, u * 0.92, u * 0.92, u * 0.2);
				ctx.fill();
			}
		}

		const hint = session.hint && opts.motion ? session.hint : null;
		const hintBob = hint ? Math.max(0, Math.sin(this.clock * 5)) * 0.08 : 0;
		const isHint = (r: number, c: number) => !!hint && hint.some((h) => h.r === r && h.c === c);

		ctx.save();
		ctx.beginPath();
		ctx.rect(0, 0, SIZE * u, SIZE * u);
		ctx.clip();

		for (const b of this.beams) {
			const t = b.age / 0.45;
			ctx.globalAlpha = (1 - t) * 0.7;
			ctx.fillStyle = b.color;
			if (b.s === ROW) ctx.fillRect(0, (b.r + 0.5 - 0.3 * (1 - t)) * u, SIZE * u, 0.6 * (1 - t) * u);
			else if (b.s === COL) ctx.fillRect((b.c + 0.5 - 0.3 * (1 - t)) * u, 0, 0.6 * (1 - t) * u, SIZE * u);
			else if (b.s === BURST) {
				ctx.beginPath();
				ctx.arc((b.c + 0.5) * u, (b.r + 0.5) * u, u * (0.6 + t * 1.4), 0, TAU);
				ctx.fill();
			} else if (b.s === MOON) {
				ctx.globalAlpha = (1 - t) * 0.35;
				ctx.fillRect(0, 0, SIZE * u, SIZE * u);
			}
		}
		ctx.globalAlpha = 1;

		for (let i = 0; i < session.display.length; i += 1) {
			const p = session.display[i];
			if (!p) continue;
			const v = session.visuals.get(p.id);
			const r = Math.floor(i / SIZE);
			const c = i % SIZE;
			const x = (v?.x ?? c) + 0.5;
			const y = (v?.y ?? r) + 0.5 - (isHint(r, c) ? hintBob : 0);
			this.bloom(p.k, p.s, x, y, 0.94);
			if (p.s && p.s !== MOON) this.mark(p.s, x, y, opts.motion);
		}
		for (const g of this.ghosts) {
			const t = g.age / 0.3;
			this.bloom(g.piece.k, g.piece.s, g.x + 0.5, g.y + 0.5, 0.94 + t * 0.35, 1 - t);
		}
		ctx.restore();

		const sel = session.selected;
		if (sel) this.cellRing(sel, '#ffffff', 0.08, opts.motion ? 1 + Math.sin(this.clock * 7) * 0.04 : 1);
		const cur = session.cursor;
		if (cur && (!sel || cur.r !== sel.r || cur.c !== sel.c)) this.cellRing(cur, 'rgba(255, 255, 255, 0.55)', 0.045, 1, true);

		this.effects();
	}

	private mark(s: Special, x: number, y: number, motion: boolean) {
		const ctx = this.ctx;
		const u = this.unit;
		const glow = motion ? 0.6 + Math.sin(this.clock * 4 + x + y) * 0.25 : 0.75;
		ctx.save();
		ctx.translate(x * u, y * u);
		ctx.strokeStyle = `rgba(255, 255, 255, ${glow})`;
		ctx.fillStyle = `rgba(255, 255, 255, ${glow})`;
		ctx.lineWidth = Math.max(1.5, u * 0.07);
		ctx.lineCap = 'round';
		if (s === ROW || s === COL) {
			if (s === COL) ctx.rotate(Math.PI / 2);
			for (const side of [-1, 1]) {
				ctx.beginPath();
				ctx.moveTo(side * u * 0.3, -u * 0.12);
				ctx.lineTo(side * u * 0.44, 0);
				ctx.lineTo(side * u * 0.3, u * 0.12);
				ctx.stroke();
			}
		} else if (s === BURST) {
			ctx.beginPath();
			ctx.arc(0, 0, u * 0.42, 0, TAU);
			ctx.setLineDash([u * 0.1, u * 0.09]);
			ctx.stroke();
		}
		ctx.restore();
	}

	private cellRing(spot: Spot, color: string, width: number, scale: number, dashed = false) {
		const ctx = this.ctx;
		const u = this.unit;
		ctx.save();
		ctx.strokeStyle = color;
		ctx.lineWidth = Math.max(1.5, u * width);
		if (dashed) ctx.setLineDash([u * 0.14, u * 0.1]);
		const size = u * 0.94 * scale;
		ctx.beginPath();
		ctx.roundRect((spot.c + 0.5) * u - size / 2, (spot.r + 0.5) * u - size / 2, size, size, u * 0.22);
		ctx.stroke();
		ctx.restore();
	}

	cellAt(px: number, py: number): Spot | null {
		const c = Math.floor(px / this.unit);
		const r = Math.floor(py / this.unit);
		return r >= 0 && r < SIZE && c >= 0 && c < SIZE ? { r, c } : null;
	}

	get cellSize() {
		return this.unit;
	}
}
