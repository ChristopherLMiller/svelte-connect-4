import { HIT, MISS, SUNK, UNKNOWN, shipCells, type ShotResult } from './engine';
import { GLOW, type Player, type Weather } from './types';

export type Role = 'target' | 'fleet' | 'setup';

export type ShipDraw = {
	length: number;
	at: number;
	vertical: boolean;
	sunk: boolean;
	ghost?: boolean;
	lifted?: boolean;
	selected?: boolean;
};

export type SeaView = {
	role: Role;
	/** Whose ships these are: their lantern colour. */
	owner: Player;
	shots: number[];
	ships: ShipDraw[];
	hover: number;
	cursor: number;
	/** A person may act on this board right now. */
	active: boolean;
	preview: {
		cells: number[];
		ok: boolean;
		length: number;
		at: number;
		vertical: boolean;
	} | null;
};

/** Board units: a frame band round the chart carries the coordinates. */
const PAD = 0.78;

type Drop = {
	x: number;
	y: number;
	vx: number;
	vy: number;
	t0: number;
	life: number;
	size: number;
	kind: 'spray' | 'spark' | 'chip';
};
type Ring = {
	x: number;
	y: number;
	t0: number;
	life: number;
	max: number;
	warm: boolean;
};
type Flash = { x: number; y: number; t0: number; life: number; size: number };
type Shot = { index: number; result: ShotResult; t0: number; done: boolean };

const IMPACT = 760;
const AIM = 380;

function hash(n: number) {
	const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
	return x - Math.floor(x);
}

function sprite(size: number, paint: (g: CanvasRenderingContext2D, size: number) => void) {
	const c = document.createElement('canvas');
	c.width = c.height = size;
	const g = c.getContext('2d');
	if (g) paint(g, size);
	return c;
}

function radial(color: string, stops: Array<[number, number]>) {
	return sprite(128, (g, s) => {
		const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
		for (const [at, alpha] of stops) grad.addColorStop(at, color.replace('ALPHA', String(alpha)));
		g.fillStyle = grad;
		g.fillRect(0, 0, s, s);
	});
}

export class SeaRenderer {
	motion = true;
	weather: Weather = 'storm';
	onFire: (pan: number) => void = () => {};
	onImpact: (kind: ShotResult['kind'], pan: number) => void = () => {};

	private ctx: CanvasRenderingContext2D;
	private cssW = 0;
	private cssH = 0;
	private dpr = 1;
	private s = 1;
	private ox = 0;
	private oy = 0;
	private n = 10;
	private chart: HTMLCanvasElement | null = null;
	private fog: HTMLCanvasElement | null = null;
	private fogKey = '';
	private waves: CanvasPattern | null = null;
	private waveTile: HTMLCanvasElement | null = null;
	private ships = new Map<string, HTMLCanvasElement>();
	private glowGold = radial('rgba(255, 180, 80, ALPHA)', [
		[0, 1],
		[0.3, 0.5],
		[1, 0]
	]);
	private glowWhite = radial('rgba(235, 245, 255, ALPHA)', [
		[0, 1],
		[0.4, 0.35],
		[1, 0]
	]);
	private smoke = radial('rgba(40, 42, 48, ALPHA)', [
		[0, 0.55],
		[0.6, 0.2],
		[1, 0]
	]);
	private fogBlob = radial('rgba(150, 170, 186, ALPHA)', [
		[0, 0.55],
		[0.55, 0.28],
		[1, 0]
	]);
	private flame = sprite(64, (g, s) => {
		const grad = g.createRadialGradient(s / 2, s * 0.7, 0, s / 2, s * 0.7, s * 0.5);
		grad.addColorStop(0, 'rgba(255, 246, 200, 1)');
		grad.addColorStop(0.3, 'rgba(255, 190, 70, 0.95)');
		grad.addColorStop(0.65, 'rgba(230, 80, 30, 0.6)');
		grad.addColorStop(1, 'rgba(160, 30, 10, 0)');
		g.fillStyle = grad;
		g.beginPath();
		g.moveTo(s / 2, 0);
		g.bezierCurveTo(s * 0.85, s * 0.4, s * 0.95, s * 0.75, s / 2, s);
		g.bezierCurveTo(s * 0.05, s * 0.75, s * 0.15, s * 0.4, s / 2, 0);
		g.fill();
	});
	private drops: Drop[] = [];
	private rings: Ring[] = [];
	private flashes: Flash[] = [];
	private shot: Shot | null = null;
	private shakeT0 = -1;
	private shakeAmp = 0;
	private beamAngle = 0;

	constructor(private canvas: HTMLCanvasElement) {
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('2d canvas unavailable');
		this.ctx = ctx;
	}

	get cellPx() {
		return this.s;
	}

	setSize(n: number) {
		if (n === this.n) return;
		this.n = n;
		this.drops = [];
		this.rings = [];
		this.flashes = [];
		this.shot = null;
		if (this.cssW) this.layout();
	}

	resize(cssW: number, cssH: number) {
		this.cssW = cssW;
		this.cssH = cssH;
		this.dpr = Math.min(window.devicePixelRatio || 1, 2);
		this.canvas.width = Math.max(1, Math.round(cssW * this.dpr));
		this.canvas.height = Math.max(1, Math.round(cssH * this.dpr));
		this.layout();
	}

	private layout() {
		const side = Math.min(this.cssW, this.cssH);
		this.s = side / (this.n + PAD * 2);
		this.ox = (this.cssW - side) / 2;
		this.oy = (this.cssH - side) / 2;
		this.ships.clear();
		this.fogKey = '';
		if (this.cssW && this.cssH) {
			this.buildChart();
			this.buildWaves();
		}
	}

	/** Centre of a cell in css pixels. */
	pointOf(index: number): [number, number] {
		const r = Math.floor(index / this.n);
		const c = index % this.n;
		return [this.ox + (PAD + c + 0.5) * this.s, this.oy + (PAD + r + 0.5) * this.s];
	}

	indexAt(px: number, py: number) {
		const c = Math.floor((px - this.ox) / this.s - PAD);
		const r = Math.floor((py - this.oy) / this.s - PAD);
		if (c < 0 || r < 0 || c >= this.n || r >= this.n) return -1;
		return r * this.n + c;
	}

	panOf(index: number) {
		return ((index % this.n) / Math.max(1, this.n - 1)) * 2 - 1;
	}

	busy(now: number) {
		return (this.shot !== null && !this.shot.done) || this.drops.length > 0 || this.flashes.some((f) => now < f.t0 + f.life);
	}

	/** Start the beam, the shell and the water's answer for one shot. */
	shoot(index: number, result: ShotResult, reduced: boolean) {
		const now = performance.now();
		if (reduced || !this.motion) {
			this.shot = { index, result, t0: now - IMPACT, done: true };
			this.onImpact(result.kind, this.panOf(index));
			return;
		}
		this.shot = { index, result, t0: now, done: false };
		this.onFire(this.panOf(index));
	}

	private buildChart() {
		const d = this.dpr;
		const W = this.canvas.width;
		const H = this.canvas.height;
		const c = document.createElement('canvas');
		c.width = W;
		c.height = H;
		const g = c.getContext('2d');
		if (!g) return;
		const s = this.s * d;
		const ox = this.ox * d;
		const oy = this.oy * d;
		const side = (this.n + PAD * 2) * s;
		const inner = PAD * s;

		g.save();
		g.shadowColor = 'rgba(0, 0, 0, 0.55)';
		g.shadowBlur = 18 * d;
		g.shadowOffsetY = 6 * d;
		g.fillStyle = '#2c1f16';
		g.beginPath();
		g.roundRect(ox, oy, side, side, s * 0.25);
		g.fill();
		g.restore();

		const wood = g.createLinearGradient(ox, oy, ox + side, oy + side);
		wood.addColorStop(0, '#5a3e2a');
		wood.addColorStop(0.5, '#3d2a1c');
		wood.addColorStop(1, '#4a3322');
		g.fillStyle = wood;
		g.beginPath();
		g.roundRect(ox, oy, side, side, s * 0.25);
		g.fill();
		g.save();
		g.clip();
		for (let k = 0; k < 90; k += 1) {
			const y = oy + hash(k * 3.1) * side;
			g.strokeStyle = `rgba(${hash(k) < 0.5 ? '20, 12, 6' : '120, 85, 55'}, ${0.12 + hash(k * 7) * 0.15})`;
			g.lineWidth = (0.5 + hash(k * 11)) * d;
			g.beginPath();
			g.moveTo(ox, y);
			g.bezierCurveTo(ox + side * 0.3, y + 3 * d, ox + side * 0.7, y - 3 * d, ox + side, y + hash(k * 5) * 4 * d);
			g.stroke();
		}
		g.restore();

		g.strokeStyle = 'rgba(214, 170, 96, 0.75)';
		g.lineWidth = 1.6 * d;
		g.beginPath();
		g.roundRect(ox + inner - 4 * d, oy + inner - 4 * d, this.n * s + 8 * d, this.n * s + 8 * d, 3 * d);
		g.stroke();
		for (const [cx, cy] of [
			[ox + inner / 2, oy + inner / 2],
			[ox + side - inner / 2, oy + inner / 2],
			[ox + inner / 2, oy + side - inner / 2],
			[ox + side - inner / 2, oy + side - inner / 2]
		]) {
			const brass = g.createRadialGradient(cx - s * 0.05, cy - s * 0.05, 0, cx, cy, s * 0.16);
			brass.addColorStop(0, '#fbe3a2');
			brass.addColorStop(0.6, '#b8863e');
			brass.addColorStop(1, '#5e3f18');
			g.fillStyle = brass;
			g.beginPath();
			g.arc(cx, cy, s * 0.14, 0, Math.PI * 2);
			g.fill();
		}

		const x0 = ox + inner;
		const y0 = oy + inner;
		const span = this.n * s;
		const sea = g.createRadialGradient(x0 + span * 0.5, y0 + span * 0.4, span * 0.1, x0 + span * 0.5, y0 + span * 0.5, span * 0.8);
		sea.addColorStop(0, '#1d4252');
		sea.addColorStop(0.6, '#123040');
		sea.addColorStop(1, '#0a1c28');
		g.fillStyle = sea;
		g.fillRect(x0, y0, span, span);

		g.strokeStyle = 'rgba(170, 215, 230, 0.13)';
		g.lineWidth = Math.max(1, d);
		g.beginPath();
		for (let k = 1; k < this.n; k += 1) {
			g.moveTo(x0 + k * s, y0);
			g.lineTo(x0 + k * s, y0 + span);
			g.moveTo(x0, y0 + k * s);
			g.lineTo(x0 + span, y0 + k * s);
		}
		g.stroke();

		g.fillStyle = 'rgba(232, 198, 130, 0.85)';
		g.textAlign = 'center';
		g.textBaseline = 'middle';
		g.font = `${Math.round(s * 0.42)}px 'IM Fell English', Georgia, serif`;
		for (let k = 0; k < this.n; k += 1) {
			g.fillText(String.fromCharCode(65 + k), x0 + (k + 0.5) * s, oy + inner * 0.48);
			g.fillText(String(k + 1), ox + inner * 0.48, y0 + (k + 0.5) * s);
		}

		const rose = { x: ox + side - inner * 0.5, y: oy + side - inner * 0.5 };
		g.save();
		g.translate(rose.x, rose.y);
		g.fillStyle = 'rgba(232, 198, 130, 0.5)';
		for (let k = 0; k < 4; k += 1) {
			g.rotate(Math.PI / 2);
			g.beginPath();
			g.moveTo(0, -inner * 0.36);
			g.lineTo(inner * 0.07, 0);
			g.lineTo(-inner * 0.07, 0);
			g.closePath();
			g.fill();
		}
		g.restore();
		this.chart = c;
	}

	private buildWaves() {
		const size = Math.round(Math.max(96, this.s * 3.2) * this.dpr);
		const tile = sprite(size, (g, sz) => {
			for (let k = 0; k < 46; k += 1) {
				const x = hash(k * 1.7) * sz;
				const y = hash(k * 2.9) * sz;
				const w = sz * (0.05 + hash(k * 4.1) * 0.12);
				g.strokeStyle = `rgba(190, 230, 240, ${0.06 + hash(k * 6.3) * 0.12})`;
				g.lineWidth = Math.max(1, sz * 0.008);
				for (const dx of [-sz, 0, sz]) {
					for (const dy of [-sz, 0, sz]) {
						g.beginPath();
						g.moveTo(x + dx - w, y + dy);
						g.quadraticCurveTo(x + dx, y + dy - w * 0.35, x + dx + w, y + dy);
						g.stroke();
					}
				}
			}
		});
		this.waveTile = tile;
		this.waves = this.ctx.createPattern(tile, 'repeat');
	}

	private shipSprite(length: number, vertical: boolean, owner: Player, wreck: boolean) {
		const key = `${length}:${vertical ? 1 : 0}:${owner}:${wreck ? 1 : 0}`;
		const hit = this.ships.get(key);
		if (hit) return hit;
		const s = this.s * this.dpr;
		const W = Math.ceil(length * s);
		const H = Math.ceil(s);
		const flat = document.createElement('canvas');
		flat.width = W;
		flat.height = H;
		const g = flat.getContext('2d');
		if (!g) return flat;
		const cy = H / 2;
		const half = s * 0.3;
		const stern = s * 0.12;
		const bow = W - s * 0.04;
		g.save();
		g.shadowColor = 'rgba(0, 0, 0, 0.5)';
		g.shadowBlur = s * 0.12;
		g.shadowOffsetY = s * 0.06;
		const hull = new Path2D();
		hull.moveTo(stern + s * 0.08, cy - half);
		hull.lineTo(bow - s * 0.75, cy - half);
		hull.quadraticCurveTo(bow - s * 0.15, cy - half * 0.9, bow, cy);
		hull.quadraticCurveTo(bow - s * 0.15, cy + half * 0.9, bow - s * 0.75, cy + half);
		hull.lineTo(stern + s * 0.08, cy + half);
		hull.quadraticCurveTo(stern, cy + half, stern, cy + half * 0.6);
		hull.lineTo(stern, cy - half * 0.6);
		hull.quadraticCurveTo(stern, cy - half, stern + s * 0.08, cy - half);
		const wood = g.createLinearGradient(0, cy - half, 0, cy + half);
		wood.addColorStop(0, '#8a6038');
		wood.addColorStop(0.5, '#6b4728');
		wood.addColorStop(1, '#3f2a17');
		g.fillStyle = wood;
		g.fill(hull);
		g.restore();
		g.save();
		g.clip(hull);
		g.strokeStyle = 'rgba(30, 18, 8, 0.4)';
		g.lineWidth = Math.max(1, s * 0.015);
		for (let k = -2; k <= 2; k += 1) {
			g.beginPath();
			g.moveTo(stern, cy + k * half * 0.36);
			g.lineTo(bow, cy + k * half * 0.3);
			g.stroke();
		}
		g.restore();
		g.strokeStyle = '#c49a62';
		g.lineWidth = Math.max(1, s * 0.035);
		g.stroke(hull);
		g.strokeStyle = '#5a3d22';
		g.lineWidth = Math.max(1, s * 0.03);
		g.beginPath();
		g.moveTo(bow, cy);
		g.lineTo(Math.min(W, bow + s * 0.2), cy);
		g.stroke();

		const masts = length <= 2 ? [0.55] : Array.from({ length: length - 1 }, (_, k) => (k + 0.9) / length);
		for (const [k, m] of masts.entries()) {
			const x = stern + (bow - stern) * m;
			const yard = half * (1.5 - k * 0.12);
			g.strokeStyle = '#3a2614';
			g.lineWidth = Math.max(1.5, s * 0.05);
			g.beginPath();
			g.moveTo(x, cy - yard);
			g.lineTo(x, cy + yard);
			g.stroke();
			const sail = g.createLinearGradient(x - s * 0.1, 0, x + s * 0.14, 0);
			sail.addColorStop(0, '#efe3c8');
			sail.addColorStop(1, '#b9a985');
			g.fillStyle = sail;
			g.beginPath();
			g.ellipse(x + s * 0.06, cy, s * 0.09, yard * 0.92, 0, 0, Math.PI * 2);
			g.fill();
			g.fillStyle = '#2b1b0e';
			g.beginPath();
			g.arc(x, cy, s * 0.055, 0, Math.PI * 2);
			g.fill();
		}
		const lx = stern + s * 0.12;
		const lantern = g.createRadialGradient(lx, cy, 0, lx, cy, s * 0.22);
		const glow = GLOW[owner];
		lantern.addColorStop(0, '#fffbe8');
		lantern.addColorStop(0.25, glow);
		lantern.addColorStop(1, 'rgba(0, 0, 0, 0)');
		g.fillStyle = lantern;
		g.beginPath();
		g.arc(lx, cy, s * 0.22, 0, Math.PI * 2);
		g.fill();

		if (wreck) {
			g.globalCompositeOperation = 'source-atop';
			g.fillStyle = 'rgba(12, 16, 20, 0.68)';
			g.fillRect(0, 0, W, H);
			g.globalCompositeOperation = 'source-over';
			g.strokeStyle = 'rgba(255, 120, 50, 0.5)';
			g.lineWidth = Math.max(1, s * 0.02);
			for (let k = 0; k < length * 3; k += 1) {
				const x = stern + hash(k * 3.3 + length) * (bow - stern);
				const y = cy + (hash(k * 5.1) - 0.5) * half * 1.4;
				g.beginPath();
				g.moveTo(x, y);
				g.lineTo(x + (hash(k) - 0.5) * s * 0.3, y + (hash(k * 2) - 0.5) * s * 0.2);
				g.stroke();
			}
		}

		let out = flat;
		if (vertical) {
			out = document.createElement('canvas');
			out.width = H;
			out.height = W;
			const v = out.getContext('2d');
			if (v) {
				v.translate(H, 0);
				v.rotate(Math.PI / 2);
				v.drawImage(flat, 0, 0);
			}
		}
		this.ships.set(key, out);
		return out;
	}

	private buildFog(shots: number[]) {
		const key = `${this.weather}:${shots.map((v) => (v ? 1 : 0)).join('')}`;
		if (key === this.fogKey && this.fog) return;
		this.fogKey = key;
		const d = this.dpr;
		const c = this.fog ?? document.createElement('canvas');
		c.width = this.canvas.width;
		c.height = this.canvas.height;
		const g = c.getContext('2d');
		if (!g) return;
		g.clearRect(0, 0, c.width, c.height);
		const s = this.s * d;
		const x0 = (this.ox + PAD * this.s) * d;
		const y0 = (this.oy + PAD * this.s) * d;
		g.save();
		g.beginPath();
		g.rect(x0, y0, this.n * s, this.n * s);
		g.clip();
		const density = this.weather === 'fog' ? 0.85 : this.weather === 'storm' ? 0.54 : 0.42;
		g.globalAlpha = density;
		for (let i = 0; i < shots.length; i += 1) {
			if (shots[i] !== UNKNOWN) continue;
			const r = Math.floor(i / this.n);
			const col = i % this.n;
			for (let k = 0; k < 2; k += 1) {
				const jx = (hash(i * 7 + k) - 0.5) * s * 0.5;
				const jy = (hash(i * 13 + k) - 0.5) * s * 0.5;
				const size = s * (1.7 + hash(i * 3 + k) * 0.6);
				g.drawImage(this.fogBlob, x0 + (col + 0.5) * s + jx - size / 2, y0 + (r + 0.5) * s + jy - size / 2, size, size);
			}
		}
		g.restore();
		this.fog = c;
	}

	draw(now: number, view: SeaView) {
		const g = this.ctx;
		const d = this.dpr;
		const s = this.s * d;
		if (!this.chart) return;
		const t = now / 1000;
		const live = this.motion;
		const x0 = (this.ox + PAD * this.s) * d;
		const y0 = (this.oy + PAD * this.s) * d;
		const span = this.n * s;

		g.setTransform(1, 0, 0, 1, 0, 0);
		g.clearRect(0, 0, this.canvas.width, this.canvas.height);
		let shake = 0;
		if (this.shakeT0 >= 0 && live) {
			const k = (now - this.shakeT0) / 380;
			if (k < 1) shake = this.shakeAmp * (1 - k) * d;
			else this.shakeT0 = -1;
		}
		if (shake) g.translate((Math.random() - 0.5) * shake * 2, (Math.random() - 0.5) * shake * 2);
		g.drawImage(this.chart, 0, 0);

		g.save();
		g.beginPath();
		g.rect(x0, y0, span, span);
		g.clip();

		if (this.waves && this.waveTile) {
			const tile = this.waveTile.width;
			for (const [speed, alpha, flip] of [
				[18, 0.9, 1],
				[11, 0.6, -1]
			] as const) {
				const dx = live ? (t * speed * d * flip) % tile : 0;
				const dy = live ? (t * speed * 0.4 * d) % tile : 0;
				g.save();
				g.globalAlpha = alpha;
				g.translate(dx, dy);
				g.fillStyle = this.waves;
				g.fillRect(x0 - dx - tile, y0 - dy - tile, span + tile * 2, span + tile * 2);
				g.restore();
			}
		}

		for (const ring of this.rings) {
			const k = (now - ring.t0) / ring.life;
			if (k < 0 || k > 1) continue;
			g.strokeStyle = ring.warm ? `rgba(255, 170, 90, ${0.5 * (1 - k)})` : `rgba(210, 240, 250, ${0.55 * (1 - k)})`;
			g.lineWidth = Math.max(1, s * 0.04 * (1 - k));
			g.beginPath();
			g.ellipse(ring.x * d, ring.y * d, ring.max * k * s, ring.max * k * s * 0.8, 0, 0, Math.PI * 2);
			g.stroke();
		}
		this.rings = this.rings.filter((ring) => now < ring.t0 + ring.life);

		for (const ship of view.ships) this.drawShip(g, ship, view, now);

		for (let i = 0; i < view.shots.length; i += 1) {
			const v = view.shots[i];
			if (v === UNKNOWN) continue;
			const cx = x0 + ((i % this.n) + 0.5) * s;
			const cy = y0 + (Math.floor(i / this.n) + 0.5) * s;
			if (v === MISS) this.drawMiss(g, cx, cy, s, t, i, live);
			else if (v === HIT) this.drawFire(g, cx, cy, s, t, i, live, 1);
			else if (v === SUNK) this.drawEmbers(g, cx, cy, s, t, i, live);
		}

		if (view.role === 'target') {
			this.buildFog(view.shots);
			if (this.fog) {
				const drift = live ? Math.sin(t * 0.4) * 2 * d : 0;
				const breathe = live ? 0.92 + Math.sin(t * 0.7) * 0.08 : 1;
				g.save();
				g.globalAlpha = breathe;
				g.drawImage(this.fog, drift, drift * 0.5);
				g.restore();
			}
			if (live) {
				g.save();
				g.globalAlpha = this.weather === 'fog' ? 0.22 : 0.12;
				for (let k = 0; k < 3; k += 1) {
					const u = ((t * (0.012 + k * 0.006) + k * 0.37) % 1.4) - 0.2;
					const size = span * (0.55 + k * 0.15);
					g.drawImage(this.fogBlob, x0 + u * span - size / 2, y0 + span * (0.2 + k * 0.3) - size / 2, size, size * 0.6);
				}
				g.restore();
			}
		}

		this.drawBeam(g, view, now, x0, y0, span, s);
		this.drawPreview(g, view, x0, y0, s);
		this.drawReticle(g, view, now, x0, y0, s);
		this.drawShot(g, view, now, x0, y0, s);

		for (const f of this.flashes) {
			const k = (now - f.t0) / f.life;
			if (k < 0 || k > 1) continue;
			const size = f.size * s * (0.6 + k * 0.8);
			g.save();
			g.globalCompositeOperation = 'lighter';
			g.globalAlpha = (1 - k) * (1 - k);
			g.drawImage(this.glowGold, f.x * d - size / 2, f.y * d - size / 2, size, size);
			g.globalAlpha = (1 - k) ** 3;
			g.drawImage(this.glowWhite, f.x * d - size / 4, f.y * d - size / 4, size / 2, size / 2);
			g.restore();
		}
		this.flashes = this.flashes.filter((f) => now < f.t0 + f.life);

		const dt = 1 / 60;
		for (const p of this.drops) {
			const k = (now - p.t0) / p.life;
			if (k < 0) continue;
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			p.vy += (p.kind === 'spark' ? 120 : 340) * dt;
			const size = p.size * s * (p.kind === 'spray' ? 1 - k * 0.5 : 1 - k);
			if (p.kind === 'spark') {
				g.save();
				g.globalCompositeOperation = 'lighter';
				g.globalAlpha = 1 - k;
				g.drawImage(this.glowGold, p.x * d - size * 2, p.y * d - size * 2, size * 4, size * 4);
				g.restore();
			} else {
				g.fillStyle = p.kind === 'chip' ? `rgba(70, 45, 25, ${1 - k})` : `rgba(225, 245, 255, ${0.85 * (1 - k)})`;
				g.beginPath();
				g.arc(p.x * d, p.y * d, Math.max(0.5, size), 0, Math.PI * 2);
				g.fill();
			}
		}
		this.drops = this.drops.filter((p) => now < p.t0 + p.life);
		g.restore();
	}

	private drawShip(g: CanvasRenderingContext2D, ship: ShipDraw, view: SeaView, now: number) {
		const cells = shipCells(this.n, ship.length, {
			at: ship.at,
			vertical: ship.vertical
		});
		if (!cells) return;
		const d = this.dpr;
		const s = this.s * d;
		const img = this.shipSprite(ship.length, ship.vertical, view.owner, ship.sunk);
		const [cx0, cy0] = this.pointOf(ship.at);
		const x = cx0 * d - s / 2;
		const y = cy0 * d - s / 2;
		const t = now / 1000;
		const bob = this.motion && !ship.sunk ? Math.sin(t * 1.3 + ship.at) * s * 0.025 : 0;
		g.save();
		if (ship.ghost) g.globalAlpha = 0.35;
		else if (ship.sunk && view.role === 'target') g.globalAlpha = 0.9;
		if (ship.lifted) {
			g.globalAlpha = 0.6;
			g.shadowColor = 'rgba(0, 0, 0, 0.6)';
			g.shadowBlur = s * 0.4;
			g.shadowOffsetY = s * 0.2;
		}
		if (ship.selected) {
			g.shadowColor = GLOW[view.owner];
			g.shadowBlur = s * 0.35;
		}
		const sunkTilt = ship.sunk ? 0.04 : 0;
		const w = img.width;
		const h = img.height;
		g.translate(x + w / 2, y + h / 2 + bob);
		g.rotate(sunkTilt);
		g.drawImage(img, -w / 2, -h / 2);
		g.restore();
		if (!ship.sunk && !ship.ghost && this.motion) {
			const [sx, sy] = ship.vertical ? [x + s / 2, y + s * 0.08] : [x + s * 0.08, y + s / 2];
			g.strokeStyle = `rgba(220, 240, 250, ${0.18 + Math.sin(t * 2 + ship.at) * 0.06})`;
			g.lineWidth = Math.max(1, s * 0.03);
			g.beginPath();
			if (ship.vertical) {
				g.moveTo(sx - s * 0.25, sy - s * 0.05);
				g.quadraticCurveTo(sx, sy + s * 0.04, sx + s * 0.25, sy - s * 0.05);
			} else {
				g.moveTo(sx - s * 0.05, sy - s * 0.25);
				g.quadraticCurveTo(sx + s * 0.04, sy, sx - s * 0.05, sy + s * 0.25);
			}
			g.stroke();
		}
	}

	private drawMiss(g: CanvasRenderingContext2D, cx: number, cy: number, s: number, t: number, i: number, live: boolean) {
		const bob = live ? Math.sin(t * 2 + i) * s * 0.03 : 0;
		g.strokeStyle = 'rgba(200, 235, 245, 0.28)';
		g.lineWidth = Math.max(1, s * 0.025);
		g.beginPath();
		g.ellipse(cx, cy + s * 0.05, s * 0.3, s * 0.22, 0, 0, Math.PI * 2);
		g.stroke();
		g.fillStyle = 'rgba(0, 0, 0, 0.35)';
		g.beginPath();
		g.ellipse(cx, cy + s * 0.1, s * 0.13, s * 0.06, 0, 0, Math.PI * 2);
		g.fill();
		const buoy = g.createRadialGradient(cx - s * 0.04, cy - s * 0.06 + bob, 0, cx, cy + bob, s * 0.13);
		buoy.addColorStop(0, '#ffffff');
		buoy.addColorStop(0.6, '#d8dde0');
		buoy.addColorStop(1, '#8c979c');
		g.fillStyle = buoy;
		g.beginPath();
		g.arc(cx, cy + bob, s * 0.11, 0, Math.PI * 2);
		g.fill();
		g.fillStyle = '#c8402c';
		g.fillRect(cx - s * 0.11, cy + bob - s * 0.025, s * 0.22, s * 0.05);
	}

	private drawFire(g: CanvasRenderingContext2D, cx: number, cy: number, s: number, t: number, i: number, live: boolean, heat: number) {
		g.fillStyle = 'rgba(20, 12, 8, 0.75)';
		g.beginPath();
		g.ellipse(cx, cy + s * 0.04, s * 0.3, s * 0.24, hash(i) * 3, 0, Math.PI * 2);
		g.fill();
		if (live) {
			for (let k = 0; k < 4; k += 1) {
				const u = (t * 0.55 + k / 4 + hash(i * 3)) % 1;
				const size = s * (0.35 + u * 0.9);
				g.globalAlpha = (1 - u) * 0.8;
				g.drawImage(this.smoke, cx + u * s * 0.5 - size / 2 + Math.sin(u * 5 + i) * s * 0.08, cy - u * s * 0.9 - size / 2, size, size);
			}
			g.globalAlpha = 1;
		}
		g.save();
		g.globalCompositeOperation = 'lighter';
		const flick = live ? 0.8 + Math.sin(t * 13 + i) * 0.12 + Math.sin(t * 29 + i * 2) * 0.08 : 0.9;
		const glow = s * 1.3 * flick * heat;
		g.globalAlpha = 0.55;
		g.drawImage(this.glowGold, cx - glow / 2, cy - glow / 2, glow, glow);
		g.globalAlpha = 1;
		for (let k = 0; k < 3; k += 1) {
			const fx = cx + (k - 1) * s * 0.11;
			const h = s * (0.45 + 0.15 * Math.sin(t * (9 + k * 3) + i + k)) * flick * heat;
			const w = h * 0.55;
			g.drawImage(this.flame, fx - w / 2, cy + s * 0.12 - h, w, h);
		}
		g.restore();
	}

	private drawEmbers(g: CanvasRenderingContext2D, cx: number, cy: number, s: number, t: number, i: number, live: boolean) {
		g.save();
		g.globalCompositeOperation = 'lighter';
		const pulse = live ? 0.5 + Math.sin(t * 2.3 + i) * 0.2 : 0.5;
		const size = s * 0.7;
		g.globalAlpha = 0.35 * pulse;
		g.drawImage(this.glowGold, cx - size / 2, cy - size / 2, size, size);
		g.restore();
		if (!live) return;
		for (let k = 0; k < 2; k += 1) {
			const u = (t * 0.35 + k / 2 + hash(i * 5)) % 1;
			g.strokeStyle = `rgba(210, 240, 250, ${0.45 * (1 - u)})`;
			g.lineWidth = Math.max(1, s * 0.02);
			g.beginPath();
			g.arc(cx + (hash(i + k) - 0.5) * s * 0.5, cy + (hash(i * 2 + k) - 0.5) * s * 0.4, s * (0.03 + u * 0.06), 0, Math.PI * 2);
			g.stroke();
		}
	}

	private drawBeam(g: CanvasRenderingContext2D, view: SeaView, now: number, x0: number, y0: number, span: number, s: number) {
		if (!this.motion) return;
		const pivotX = x0 + span * 1.15;
		const pivotY = y0 - span * 0.25;
		let angle = Math.PI * 0.62 + Math.sin(now / 4200) * 0.38;
		let spread = 0.1;
		let strength = this.weather === 'fog' ? 0.2 : 0.13;
		const shot = this.shot;
		if (shot && view.role !== 'setup') {
			const k = (now - shot.t0) / IMPACT;
			if (k < 1.6) {
				const [tx, ty] = this.pointOf(shot.index);
				const target = Math.atan2(ty * this.dpr - pivotY, tx * this.dpr - pivotX);
				const ease = Math.min(1, k * (IMPACT / AIM));
				const e = ease * ease * (3 - 2 * ease);
				angle = this.beamAngle + (target - this.beamAngle) * e;
				spread = 0.1 - 0.05 * e;
				strength += 0.12 * e * (k < 1.2 ? 1 : (1.6 - k) / 0.4);
			}
		} else {
			this.beamAngle = angle;
		}
		const len = span * 1.9;
		g.save();
		g.globalCompositeOperation = 'lighter';
		const grad = g.createRadialGradient(pivotX, pivotY, span * 0.1, pivotX, pivotY, len);
		grad.addColorStop(0, `rgba(255, 236, 190, ${strength})`);
		grad.addColorStop(0.7, `rgba(255, 226, 170, ${strength * 0.5})`);
		grad.addColorStop(1, 'rgba(255, 220, 160, 0)');
		g.fillStyle = grad;
		g.beginPath();
		g.moveTo(pivotX, pivotY);
		g.arc(pivotX, pivotY, len, angle - spread, angle + spread);
		g.closePath();
		g.fill();
		g.restore();
		if (shot && view.role !== 'setup' && now - shot.t0 < IMPACT * 1.4) {
			const [tx, ty] = this.pointOf(shot.index);
			const k = Math.min(1, (now - shot.t0) / AIM);
			const size = s * (2.4 - k * 1.2);
			g.save();
			g.globalCompositeOperation = 'lighter';
			g.globalAlpha = 0.4 * k;
			g.drawImage(this.glowWhite, tx * this.dpr - size / 2, ty * this.dpr - size / 2, size, size);
			g.restore();
		}
	}

	private drawPreview(g: CanvasRenderingContext2D, view: SeaView, x0: number, y0: number, s: number) {
		const p = view.preview;
		if (!p || !p.cells.length) return;
		g.save();
		for (const cell of p.cells) {
			const cx = x0 + (cell % this.n) * s;
			const cy = y0 + Math.floor(cell / this.n) * s;
			g.fillStyle = p.ok ? 'rgba(255, 210, 120, 0.16)' : 'rgba(230, 70, 50, 0.24)';
			g.fillRect(cx + 1, cy + 1, s - 2, s - 2);
		}
		g.restore();
		if (p.ok)
			this.drawShip(
				g,
				{
					length: p.length,
					at: p.at,
					vertical: p.vertical,
					sunk: false,
					ghost: true
				},
				view,
				performance.now()
			);
	}

	private drawReticle(g: CanvasRenderingContext2D, view: SeaView, now: number, x0: number, y0: number, s: number) {
		if (!view.active || view.role !== 'target') return;
		const target = view.hover >= 0 ? view.hover : view.cursor;
		if (target < 0 || view.shots[target] !== UNKNOWN) return;
		const cx = x0 + ((target % this.n) + 0.5) * s;
		const cy = y0 + (Math.floor(target / this.n) + 0.5) * s;
		const pulse = this.motion ? 1 + Math.sin(now / 220) * 0.06 : 1;
		const r = s * 0.42 * pulse;
		g.save();
		g.globalCompositeOperation = 'lighter';
		g.globalAlpha = 0.35;
		g.drawImage(this.glowWhite, cx - s, cy - s, s * 2, s * 2);
		g.restore();
		g.strokeStyle = 'rgba(255, 214, 140, 0.95)';
		g.lineWidth = Math.max(1.5, s * 0.05);
		g.beginPath();
		g.arc(cx, cy, r, 0, Math.PI * 2);
		g.stroke();
		g.lineWidth = Math.max(1, s * 0.03);
		g.beginPath();
		for (const [dx, dy] of [
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1]
		]) {
			g.moveTo(cx + dx * r * 0.45, cy + dy * r * 0.45);
			g.lineTo(cx + dx * r * 1.25, cy + dy * r * 1.25);
		}
		g.stroke();
	}

	private drawShot(g: CanvasRenderingContext2D, view: SeaView, now: number, x0: number, y0: number, s: number) {
		const shot = this.shot;
		if (!shot || shot.done) return;
		const d = this.dpr;
		const [tx, ty] = this.pointOf(shot.index);
		const k = (now - shot.t0 - AIM) / (IMPACT - AIM);
		if (k >= 1) {
			shot.done = true;
			this.impact(shot, now);
			return;
		}
		if (k < 0) return;
		const fromBelow = view.role === 'target';
		const sx = this.ox + (this.n / 2 + PAD) * this.s;
		const sy = fromBelow ? this.oy + (this.n + PAD * 2) * this.s + this.s : this.oy - this.s;
		const x = sx + (tx - sx) * k;
		const y = sy + (ty - sy) * k;
		const lift = Math.sin(k * Math.PI) * this.s * 1.4;
		g.save();
		g.globalCompositeOperation = 'lighter';
		for (let j = 1; j <= 6; j += 1) {
			const kk = Math.max(0, k - j * 0.04);
			const px = sx + (tx - sx) * kk;
			const py = sy + (ty - sy) * kk - Math.sin(kk * Math.PI) * this.s * 1.4;
			const size = s * (0.35 - j * 0.04);
			g.globalAlpha = 0.5 - j * 0.07;
			g.drawImage(this.glowGold, px * d - size / 2, py * d - size / 2, size, size);
		}
		g.restore();
		g.fillStyle = 'rgba(0, 0, 0, 0.35)';
		g.beginPath();
		g.ellipse(x * d, y * d, s * 0.1, s * 0.05, 0, 0, Math.PI * 2);
		g.fill();
		const size = s * (0.18 + Math.sin(k * Math.PI) * 0.12);
		g.fillStyle = '#1c1c1e';
		g.beginPath();
		g.arc(x * d, (y - lift) * d, size / 2, 0, Math.PI * 2);
		g.fill();
		g.save();
		g.globalCompositeOperation = 'lighter';
		g.globalAlpha = 0.8;
		g.drawImage(this.glowGold, x * d - size, (y - lift) * d - size, size * 2, size * 2);
		g.restore();
	}

	private impact(shot: Shot, now: number) {
		const { result } = shot;
		const [x, y] = this.pointOf(shot.index);
		this.onImpact(result.kind, this.panOf(shot.index));
		const cs = this.s;
		if (result.kind === 'miss') {
			for (let k = 0; k < 22; k += 1) {
				const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
				const v = cs * (2 + Math.random() * 4.5);
				this.drops.push({
					x,
					y,
					vx: Math.cos(a) * v * 0.5,
					vy: Math.sin(a) * v,
					t0: now,
					life: 650 + Math.random() * 300,
					size: 0.035 + Math.random() * 0.04,
					kind: 'spray'
				});
			}
			for (let k = 0; k < 3; k += 1)
				this.rings.push({
					x,
					y,
					t0: now + k * 140,
					life: 1100,
					max: 0.9 + k * 0.3,
					warm: false
				});
			return;
		}
		const cells = result.kind === 'sunk' ? result.cells : [shot.index];
		const order = result.kind === 'sunk' ? [shot.index, ...cells.filter((c) => c !== shot.index)] : cells;
		order.forEach((cell, j) => {
			const [cx, cy] = this.pointOf(cell);
			const at = now + j * 130;
			this.flashes.push({
				x: cx,
				y: cy,
				t0: at,
				life: 650,
				size: result.kind === 'sunk' ? 3 : 2.4
			});
			for (let k = 0; k < 16; k += 1) {
				const a = Math.random() * Math.PI * 2;
				const v = cs * (1.5 + Math.random() * 3);
				this.drops.push({
					x: cx,
					y: cy,
					vx: Math.cos(a) * v,
					vy: Math.sin(a) * v - cs * 2,
					t0: at,
					life: 500 + Math.random() * 400,
					size: 0.05 + Math.random() * 0.05,
					kind: 'spark'
				});
			}
			for (let k = 0; k < 8; k += 1) {
				const a = Math.random() * Math.PI * 2;
				const v = cs * (1 + Math.random() * 2.5);
				this.drops.push({
					x: cx,
					y: cy,
					vx: Math.cos(a) * v,
					vy: Math.sin(a) * v - cs * 2.5,
					t0: at,
					life: 600 + Math.random() * 300,
					size: 0.04 + Math.random() * 0.03,
					kind: 'chip'
				});
			}
			this.rings.push({
				x: cx,
				y: cy,
				t0: at,
				life: 900,
				max: 1.2,
				warm: true
			});
		});
		if (result.kind === 'sunk') {
			for (const cell of cells) {
				const [cx, cy] = this.pointOf(cell);
				for (let k = 0; k < 2; k += 1)
					this.rings.push({
						x: cx,
						y: cy,
						t0: now + 500 + k * 300,
						life: 1500,
						max: 1.5,
						warm: false
					});
			}
		}
		this.shakeT0 = now;
		this.shakeAmp = result.kind === 'sunk' ? 6 : 3;
	}
}
