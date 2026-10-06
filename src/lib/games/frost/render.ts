import { neighbours, rng, type Field } from './engine';
import { CRACK_HUE, FLAG, HIDDEN, OPEN } from './types';
import type { FieldEvent } from './session.svelte';

type Sprite = HTMLCanvasElement;
type Segment = { x1: number; y1: number; x2: number; y2: number; d: number; w: number };
type Mote = { x: number; y: number; vx: number; vy: number; life: number; age: number; size: number };

const MELT_MS = 280;
const RING_MS = 30;
/** Cells per millisecond the cracks race outward. */
const CRACK_SPEED = 0.024;
const HOLD_GRACE = 110;
const VARIANTS = 4;
const NUMERAL_FONT = '"Josefin Sans", Manrope, ui-sans-serif, sans-serif';

function canvas(w: number, h = w): Sprite {
	const c = document.createElement('canvas');
	c.width = Math.max(1, Math.ceil(w));
	c.height = Math.max(1, Math.ceil(h));
	return c;
}

function tilePath(g: CanvasRenderingContext2D, s: number) {
	const inset = Math.max(1, s * 0.035);
	g.beginPath();
	g.roundRect(inset, inset, s - inset * 2, s - inset * 2, s * 0.14);
}

function drawFrost(g: CanvasRenderingContext2D, s: number, seed: number) {
	const random = rng(seed);
	tilePath(g, s);
	const fill = g.createLinearGradient(0, 0, s, s);
	fill.addColorStop(0, '#f6fbff');
	fill.addColorStop(0.55, '#dcecf7');
	fill.addColorStop(1, '#bcd5e8');
	g.fillStyle = fill;
	g.fill();
	g.save();
	g.clip();
	for (let k = 0; k < 26; k += 1) {
		g.globalAlpha = 0.35 + random() * 0.55;
		g.fillStyle = random() < 0.7 ? '#ffffff' : '#a9c8de';
		g.beginPath();
		g.arc(random() * s, random() * s, s * (0.008 + random() * 0.02), 0, Math.PI * 2);
		g.fill();
	}
	g.globalAlpha = 0.4;
	g.strokeStyle = '#ffffff';
	g.lineWidth = Math.max(0.6, s * 0.018);
	g.lineCap = 'round';
	const ferns = 1 + Math.floor(random() * 2);
	for (let f = 0; f < ferns; f += 1) {
		let x = random() * s;
		let y = random() * s;
		let a = random() * Math.PI * 2;
		for (let k = 0; k < 5; k += 1) {
			const nx = x + Math.cos(a) * s * 0.11;
			const ny = y + Math.sin(a) * s * 0.11;
			g.beginPath();
			g.moveTo(x, y);
			g.lineTo(nx, ny);
			for (const side of [-1, 1]) {
				const b = a + side * 0.9;
				g.moveTo((x + nx) / 2, (y + ny) / 2);
				g.lineTo((x + nx) / 2 + Math.cos(b) * s * 0.06, (y + ny) / 2 + Math.sin(b) * s * 0.06);
			}
			g.stroke();
			x = nx;
			y = ny;
			a += (random() - 0.5) * 0.7;
		}
	}
	g.restore();
	g.globalAlpha = 1;
	g.lineWidth = Math.max(1, s * 0.03);
	tilePath(g, s);
	g.strokeStyle = 'rgba(255, 255, 255, 0.85)';
	g.save();
	g.clip();
	g.translate(s * 0.02, s * 0.02);
	tilePath(g, s);
	g.stroke();
	g.translate(-s * 0.05, -s * 0.05);
	tilePath(g, s);
	g.strokeStyle = 'rgba(70, 100, 140, 0.32)';
	g.stroke();
	g.restore();
}

function drawClear(g: CanvasRenderingContext2D, s: number, seed: number) {
	const random = rng(seed);
	tilePath(g, s);
	const fill = g.createLinearGradient(0, 0, s * 0.3, s);
	fill.addColorStop(0, '#2b5875');
	fill.addColorStop(0.6, '#1b3d56');
	fill.addColorStop(1, '#163348');
	g.fillStyle = fill;
	g.fill();
	g.save();
	g.clip();
	const shade = g.createLinearGradient(0, 0, 0, s * 0.35);
	shade.addColorStop(0, 'rgba(4, 14, 24, 0.35)');
	shade.addColorStop(1, 'rgba(4, 14, 24, 0)');
	g.fillStyle = shade;
	g.fillRect(0, 0, s, s);
	g.strokeStyle = 'rgba(200, 236, 255, 0.22)';
	g.lineWidth = Math.max(0.6, s * 0.012);
	const bubbles = 2 + Math.floor(random() * 4);
	for (let k = 0; k < bubbles; k += 1) {
		g.beginPath();
		g.arc(random() * s, random() * s, s * (0.015 + random() * 0.03), 0, Math.PI * 2);
		g.stroke();
	}
	g.strokeStyle = 'rgba(170, 220, 255, 0.08)';
	g.lineWidth = Math.max(0.6, s * 0.02);
	g.beginPath();
	const y = random() * s;
	g.moveTo(0, y);
	g.lineTo(s, y + (random() - 0.5) * s * 0.6);
	g.stroke();
	g.restore();
	tilePath(g, s);
	g.strokeStyle = 'rgba(150, 205, 235, 0.2)';
	g.lineWidth = Math.max(0.8, s * 0.02);
	g.stroke();
}

function drawNumeral(g: CanvasRenderingContext2D, s: number, n: number) {
	const hue = CRACK_HUE[n];
	const random = rng(n * 977);
	const cx = s / 2;
	const cy = s / 2;
	g.save();
	g.lineCap = 'round';
	g.lineJoin = 'round';
	g.globalAlpha = 0.32;
	g.strokeStyle = hue;
	g.lineWidth = Math.max(0.6, s * 0.016);
	for (let k = 0; k < n; k += 1) {
		let a = (k / n) * Math.PI * 2 + 0.4 + (random() - 0.5) * 0.4;
		let x = cx + Math.cos(a) * s * 0.06;
		let y = cy + Math.sin(a) * s * 0.06;
		g.beginPath();
		g.moveTo(x, y);
		for (let j = 0; j < 4; j += 1) {
			a += (random() - 0.5) * 0.8;
			x += Math.cos(a) * s * 0.095;
			y += Math.sin(a) * s * 0.095;
			g.lineTo(x, y);
			if (j === 1) {
				const b = a + (random() < 0.5 ? -1 : 1) * 0.9;
				g.lineTo(x + Math.cos(b) * s * 0.05, y + Math.sin(b) * s * 0.05);
				g.moveTo(x, y);
			}
		}
		g.stroke();
	}
	g.restore();
	g.save();
	g.font = `700 ${Math.round(s * 0.54)}px ${NUMERAL_FONT}`;
	g.textAlign = 'center';
	g.textBaseline = 'alphabetic';
	const m = g.measureText(String(n));
	const ascent = m.actualBoundingBoxAscent || s * 0.38;
	const descent = m.actualBoundingBoxDescent || 0;
	const by = cy + (ascent - descent) / 2;
	g.lineJoin = 'round';
	g.lineWidth = Math.max(1.5, s * 0.07);
	g.strokeStyle = 'rgba(4, 14, 26, 0.7)';
	g.strokeText(String(n), cx, by);
	g.shadowColor = hue;
	g.shadowBlur = s * 0.16;
	g.fillStyle = hue;
	g.fillText(String(n), cx, by);
	g.shadowBlur = 0;
	g.fillText(String(n), cx, by);
	g.restore();
}

function drawFlag(g: CanvasRenderingContext2D, s: number, dead = false) {
	g.save();
	g.lineCap = 'round';
	g.fillStyle = 'rgba(40, 60, 95, 0.22)';
	g.beginPath();
	g.ellipse(s * 0.5, s * 0.79, s * 0.26, s * 0.07, 0, 0, Math.PI * 2);
	g.fill();
	g.strokeStyle = dead ? '#7c7a78' : '#6b4a2f';
	g.lineWidth = Math.max(1.4, s * 0.065);
	g.beginPath();
	g.moveTo(s * 0.27, s * 0.8);
	g.lineTo(s * 0.73, s * 0.74);
	g.moveTo(s * 0.37, s * 0.69);
	g.lineTo(s * 0.63, s * 0.85);
	g.stroke();
	g.strokeStyle = dead ? '#9a9a98' : '#3b2a1d';
	g.lineWidth = Math.max(1, s * 0.045);
	g.beginPath();
	g.moveTo(s * 0.5, s * 0.78);
	g.lineTo(s * 0.5, s * 0.18);
	g.stroke();
	g.beginPath();
	g.moveTo(s * 0.52, s * 0.18);
	g.quadraticCurveTo(s * 0.68, s * 0.2, s * 0.86, s * 0.27);
	g.quadraticCurveTo(s * 0.7, s * 0.34, s * 0.52, s * 0.42);
	g.closePath();
	const cloth = g.createLinearGradient(s * 0.5, 0, s * 0.86, 0);
	cloth.addColorStop(0, dead ? '#a59a96' : '#ff7a48');
	cloth.addColorStop(1, dead ? '#857a76' : '#e8452a');
	g.fillStyle = cloth;
	g.fill();
	g.strokeStyle = dead ? 'rgba(60, 50, 50, 0.4)' : 'rgba(150, 40, 20, 0.55)';
	g.lineWidth = Math.max(0.6, s * 0.015);
	g.stroke();
	g.restore();
}

function drawHole(g: CanvasRenderingContext2D, s: number, seed: number, hit: boolean) {
	const random = rng(seed);
	const cx = s / 2;
	const cy = s / 2;
	const points: Array<[number, number]> = [];
	const n = 11;
	for (let k = 0; k < n; k += 1) {
		const a = (k / n) * Math.PI * 2 + random() * 0.3;
		const r = s * (0.27 + random() * 0.11);
		points.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
	}
	g.save();
	if (hit) {
		const warn = g.createRadialGradient(cx, cy, s * 0.2, cx, cy, s * 0.55);
		warn.addColorStop(0, 'rgba(255, 120, 80, 0.55)');
		warn.addColorStop(1, 'rgba(255, 120, 80, 0)');
		g.fillStyle = warn;
		g.fillRect(0, 0, s, s);
	}
	g.beginPath();
	points.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y)));
	g.closePath();
	const water = g.createRadialGradient(cx - s * 0.08, cy - s * 0.1, s * 0.02, cx, cy, s * 0.42);
	water.addColorStop(0, hit ? '#235a78' : '#14435c');
	water.addColorStop(0.55, hit ? '#0d2c40' : '#082232');
	water.addColorStop(1, '#020b12');
	g.fillStyle = water;
	g.fill();
	g.lineJoin = 'round';
	g.strokeStyle = hit ? '#ffb48f' : '#f2fbff';
	g.lineWidth = Math.max(1, s * (hit ? 0.06 : 0.045));
	g.stroke();
	g.clip();
	g.strokeStyle = 'rgba(170, 225, 255, 0.3)';
	g.lineWidth = Math.max(0.6, s * 0.016);
	for (const r of [0.12, 0.22]) {
		g.beginPath();
		g.ellipse(cx, cy + s * 0.02, s * r, s * r * 0.55, 0, Math.PI * 1.05, Math.PI * 1.95);
		g.stroke();
	}
	g.restore();
}

function drawAuger(g: CanvasRenderingContext2D, s: number) {
	const cx = s / 2;
	const cy = s / 2;
	g.save();
	g.fillStyle = 'rgba(235, 246, 255, 0.55)';
	g.beginPath();
	g.ellipse(cx, cy, s * 0.3, s * 0.26, 0, 0, Math.PI * 2);
	g.fill();
	const water = g.createRadialGradient(cx - s * 0.04, cy - s * 0.05, s * 0.01, cx, cy, s * 0.2);
	water.addColorStop(0, '#2a6a8c');
	water.addColorStop(1, '#04141f');
	g.fillStyle = water;
	g.beginPath();
	g.ellipse(cx, cy, s * 0.2, s * 0.17, 0, 0, Math.PI * 2);
	g.fill();
	g.strokeStyle = 'rgba(255, 255, 255, 0.8)';
	g.lineWidth = Math.max(1, s * 0.03);
	g.stroke();
	g.restore();
}

function drawCross(g: CanvasRenderingContext2D, s: number) {
	g.save();
	g.lineCap = 'round';
	g.strokeStyle = 'rgba(30, 40, 60, 0.75)';
	g.lineWidth = Math.max(1.4, s * 0.06);
	g.beginPath();
	g.moveTo(s * 0.24, s * 0.24);
	g.lineTo(s * 0.76, s * 0.76);
	g.moveTo(s * 0.76, s * 0.24);
	g.lineTo(s * 0.24, s * 0.76);
	g.stroke();
	g.restore();
}

/**
 * Draws the lake on a 2D canvas. Sprites are baked once per cell size; frames only run
 * while something is moving (a melt wave, a flag, the crack), so an idle board costs nothing.
 */
export class FieldRenderer {
	private ctx: CanvasRenderingContext2D;
	private field: Field | null = null;
	private flip = false;
	private cols = 1;
	private rows = 1;
	private cell = 16;
	private dpr = 1;
	private frost: Sprite[] = [];
	private clear: Sprite[] = [];
	private numerals: Sprite[] = [];
	private flag: Sprite | null = null;
	private deadFlag: Sprite | null = null;
	private holes: Sprite[] = [];
	private hitHole: Sprite | null = null;
	private cross: Sprite | null = null;
	private auger: Sprite | null = null;
	private openAt = new Float64Array(0);
	private flagAt = new Float64Array(0);
	private holeAt = new Float64Array(0);
	private sparked = new Uint8Array(0);
	private motes: Mote[] = [];
	private cracks: Segment[] = [];
	private boomAt = 0;
	private winAt = 0;
	private nudgeAt = 0;
	private nudgeCells: number[] = [];
	private reach = 0;
	hover = -1;
	cursor = -1;
	press = -1;
	holdCell = -1;
	holdAt = 0;
	holdMs = 0;
	motion = true;
	paused = false;

	constructor(private el: HTMLCanvasElement) {
		const ctx = el.getContext('2d');
		if (!ctx) throw new Error('2d canvas unavailable');
		this.ctx = ctx;
	}

	/** Display columns and rows; a wide board turns on its side in a tall frame. */
	get shape() {
		return { cols: this.cols, rows: this.rows };
	}

	setField(field: Field, flip: boolean) {
		const resized = this.field?.total !== field.total || this.flip !== flip;
		this.field = field;
		this.flip = flip;
		this.cols = flip ? field.h : field.w;
		this.rows = flip ? field.w : field.h;
		if (resized || this.openAt.length !== field.total) {
			this.openAt = new Float64Array(field.total);
			this.flagAt = new Float64Array(field.total);
			this.holeAt = new Float64Array(field.total);
			this.sparked = new Uint8Array(field.total);
		}
		this.openAt.fill(0);
		this.flagAt.fill(0);
		this.holeAt.fill(0);
		this.sparked.fill(1);
		this.motes = [];
		this.cracks = [];
		this.boomAt = 0;
		this.winAt = 0;
		this.nudgeAt = 0;
	}

	resize(cssW: number) {
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const cell = Math.max(8, Math.floor((cssW * dpr) / this.cols));
		const changed = cell !== this.cell || dpr !== this.dpr;
		this.dpr = dpr;
		this.cell = cell;
		const w = cell * this.cols;
		const h = cell * this.rows;
		if (this.el.width !== w || this.el.height !== h) {
			this.el.width = w;
			this.el.height = h;
		}
		if (changed || !this.frost.length) this.bake();
	}

	bake() {
		const s = this.cell;
		this.frost = Array.from({ length: VARIANTS }, (_, k) => {
			const c = canvas(s);
			drawFrost(c.getContext('2d')!, s, 101 + k * 31);
			return c;
		});
		this.clear = Array.from({ length: VARIANTS }, (_, k) => {
			const c = canvas(s);
			drawClear(c.getContext('2d')!, s, 503 + k * 17);
			return c;
		});
		this.numerals = Array.from({ length: 9 }, (_, n) => {
			const c = canvas(s);
			if (n) drawNumeral(c.getContext('2d')!, s, n);
			return c;
		});
		this.flag = canvas(s);
		drawFlag(this.flag.getContext('2d')!, s);
		this.deadFlag = canvas(s);
		drawFlag(this.deadFlag.getContext('2d')!, s, true);
		this.holes = Array.from({ length: VARIANTS }, (_, k) => {
			const c = canvas(s);
			drawHole(c.getContext('2d')!, s, 900 + k * 13, false);
			return c;
		});
		this.hitHole = canvas(s);
		drawHole(this.hitHole.getContext('2d')!, s, 77, true);
		this.cross = canvas(s);
		drawCross(this.cross.getContext('2d')!, s);
		this.auger = canvas(s);
		drawAuger(this.auger.getContext('2d')!, s);
		if (this.field?.over === 'lost' && this.boomAt) {
			this.buildCracks(this.field.hit);
			this.reach = Infinity;
		}
	}

	/** Display cell under a point in CSS pixels relative to the canvas, as a field index. */
	pick(x: number, y: number, cssW: number, cssH: number) {
		const field = this.field;
		if (!field) return -1;
		const dc = Math.floor((x / cssW) * this.cols);
		const dr = Math.floor((y / cssH) * this.rows);
		if (dc < 0 || dr < 0 || dc >= this.cols || dr >= this.rows) return -1;
		return this.flip ? dc * field.w + dr : dr * field.w + dc;
	}

	/** Field index → display column and row. */
	private place(i: number): [number, number] {
		const field = this.field!;
		const x = i % field.w;
		const y = (i - x) / field.w;
		return this.flip ? [y, x] : [x, y];
	}

	private centre(i: number): [number, number] {
		const [c, r] = this.place(i);
		return [(c + 0.5) * this.cell, (r + 0.5) * this.cell];
	}

	onEvent(event: FieldEvent, field: Field) {
		const now = performance.now();
		const motion = this.motion;
		switch (event.type) {
			case 'load':
				this.setField(field, this.flip);
				break;
			case 'open': {
				const { cells, dist } = event.step;
				for (let k = 0; k < cells.length; k += 1) {
					this.openAt[cells[k]] = motion ? now + dist[k] * RING_MS : 0;
					this.sparked[cells[k]] = motion ? 0 : 1;
				}
				break;
			}
			case 'boom': {
				const { cells, dist, hit } = event.step;
				this.boomAt = now;
				this.openAt[hit] = 0;
				this.holeAt[hit] = now;
				for (let k = 0; k < cells.length; k += 1) this.holeAt[cells[k]] = motion ? now + 380 + dist[k] * 55 : now;
				this.buildCracks(hit);
				if (!motion) this.reach = Infinity;
				break;
			}
			case 'flag':
				this.flagAt[event.cell] = event.on && motion ? now : 0;
				break;
			case 'nudge':
				this.nudgeAt = motion ? now : 0;
				this.nudgeCells = neighbours(field.w, field.h, event.cell).filter((j) => field.state[j] === HIDDEN);
				if (!motion) this.nudgeAt = now;
				break;
			case 'won': {
				this.winAt = now;
				const last = field.total;
				let k = 0;
				for (let i = 0; i < last; i += 1) {
					if (!field.mine[i]) continue;
					this.flagAt[i] = motion ? now + 200 + k * 26 : 0;
					k += 1;
				}
				break;
			}
		}
	}

	private buildCracks(hit: number) {
		const random = rng(hit * 7919 + 13);
		const [ox, oy] = this.centre(hit);
		const s = this.cell;
		const W = this.cols * s;
		const H = this.rows * s;
		const longest = Math.hypot(W, H) * 0.7;
		const out: Segment[] = [];
		const grow = (x: number, y: number, a: number, d: number, budget: number, w: number, depth: number) => {
			let len = 0;
			while (len < budget) {
				a += (random() - 0.5) * 0.75;
				const step = s * (0.35 + random() * 0.4);
				const nx = x + Math.cos(a) * step;
				const ny = y + Math.sin(a) * step;
				out.push({ x1: x, y1: y, x2: nx, y2: ny, d: d + len, w });
				len += step;
				x = nx;
				y = ny;
				if (x < -s || y < -s || x > W + s || y > H + s) return;
				if (depth < 2 && random() < 0.13) {
					grow(x, y, a + (random() < 0.5 ? -1 : 1) * (0.5 + random() * 0.6), d + len, budget * (0.25 + random() * 0.3), w * 0.65, depth + 1);
				}
				w *= 0.985;
			}
		};
		const arms = 6 + Math.floor(random() * 3);
		for (let k = 0; k < arms; k += 1) {
			const a = (k / arms) * Math.PI * 2 + random() * 0.6;
			grow(ox, oy, a, 0, longest * (0.45 + random() * 0.55), Math.max(1, s * 0.07), 0);
		}
		this.cracks = out;
		this.reach = 0;
	}

	/** Returns true while anything is still animating. */
	draw(now: number): boolean {
		const field = this.field;
		if (!field || !this.frost.length) return false;
		const g = this.ctx;
		const s = this.cell;
		const motion = this.motion;
		let busy = false;
		g.setTransform(1, 0, 0, 1, 0, 0);
		g.clearRect(0, 0, this.el.width, this.el.height);
		g.fillStyle = '#0e2234';
		g.fillRect(0, 0, this.el.width, this.el.height);

		if (this.paused) {
			for (let i = 0; i < field.total; i += 1) {
				const [c, r] = this.place(i);
				g.drawImage(this.frost[(i * 7 + (i >> 3)) % VARIANTS], c * s, r * s);
			}
			return false;
		}

		const lost = field.over === 'lost';
		const nudge = this.nudgeAt && now - this.nudgeAt < 360 ? 1 - (now - this.nudgeAt) / 360 : 0;
		if (nudge) busy = true;

		for (let i = 0; i < field.total; i += 1) {
			const [c, r] = this.place(i);
			const x = c * s;
			const y = r * s;
			const v = (i * 7 + (i >> 3)) % VARIANTS;
			const state = field.state[i];

			if (state === OPEN && i !== field.hit) {
				const t0 = this.openAt[i];
				const p = !t0 ? 1 : Math.min(1, Math.max(0, (now - t0) / MELT_MS));
				g.drawImage(this.clear[v], x, y);
				if (i === field.start) g.drawImage(this.auger!, x, y);
				const n = field.count[i];
				if (n) {
					g.globalAlpha = p;
					g.drawImage(this.numerals[n], x, y);
					g.globalAlpha = 1;
				}
				if (p < 1) {
					busy = true;
					if (now >= t0 && !this.sparked[i]) {
						this.sparked[i] = 1;
						this.spark(x + s / 2, y + s / 2);
					}
					const grow = 1 + p * 0.22;
					g.globalAlpha = 1 - p;
					g.drawImage(this.frost[v], x + (s - s * grow) / 2, y + (s - s * grow) / 2, s * grow, s * grow);
					g.globalAlpha = 1;
				}
				if (this.press >= 0 && this.press === i && n) {
					g.fillStyle = 'rgba(255, 255, 255, 0.08)';
					g.fillRect(x, y, s, s);
				}
				continue;
			}

			if (i === field.hit) {
				g.drawImage(this.clear[v], x, y);
				g.drawImage(this.hitHole!, x, y);
				const age = now - this.holeAt[i];
				if (motion && age < 700) {
					busy = true;
					const p = age / 700;
					const k = 1 - p * 0.7;
					g.save();
					g.globalAlpha = 1 - p;
					g.translate(x + s / 2, y + s / 2 + p * s * 0.1);
					g.rotate(p * 0.25);
					g.drawImage(this.frost[v], (-s * k) / 2, (-s * k) / 2, s * k, s * k);
					g.restore();
				}
				if (motion && age < 2600) {
					busy = true;
					for (let ring = 0; ring < 3; ring += 1) {
						const q = ((age / 900 + ring / 3) % 1) * Math.min(1, age / 300);
						g.strokeStyle = `rgba(200, 236, 255, ${(1 - q) * 0.5 * (1 - age / 2600)})`;
						g.lineWidth = Math.max(1, s * 0.03);
						g.beginPath();
						g.ellipse(x + s / 2, y + s / 2, s * (0.12 + q * 0.3), s * (0.1 + q * 0.24), 0, 0, Math.PI * 2);
						g.stroke();
					}
				}
				continue;
			}

			const t0 = this.holeAt[i];
			if (lost && field.mine[i] && t0 && state !== FLAG) {
				if (now >= t0) {
					g.drawImage(this.frost[v], x, y);
					const p = motion ? Math.min(1, (now - t0) / 260) : 1;
					if (p < 1) busy = true;
					const k = 0.6 + p * 0.4;
					g.globalAlpha = p;
					g.drawImage(this.holes[v], x + (s - s * k) / 2, y + (s - s * k) / 2, s * k, s * k);
					g.globalAlpha = 1;
				} else {
					busy = true;
					g.drawImage(this.frost[v], x, y);
				}
				continue;
			}

			let lift = 0;
			if (nudge && this.nudgeCells.includes(i)) lift = nudge;
			const pressed = this.press === i && state === HIDDEN;
			if (pressed) {
				g.drawImage(this.frost[v], x + s * 0.04, y + s * 0.04, s * 0.92, s * 0.92);
				g.fillStyle = 'rgba(40, 80, 120, 0.12)';
				g.fillRect(x + s * 0.06, y + s * 0.06, s * 0.88, s * 0.88);
			} else {
				g.drawImage(this.frost[v], x, y);
			}
			if (this.hover === i && state !== OPEN && !pressed && field.over === 'live') {
				g.fillStyle = 'rgba(255, 255, 255, 0.28)';
				g.beginPath();
				g.roundRect(x + s * 0.04, y + s * 0.04, s * 0.92, s * 0.92, s * 0.14);
				g.fill();
			}
			if (lift) {
				g.fillStyle = `rgba(255, 170, 120, ${lift * 0.45})`;
				g.beginPath();
				g.roundRect(x + s * 0.04, y + s * 0.04, s * 0.92, s * 0.92, s * 0.14);
				g.fill();
			}
			if (state === FLAG) {
				const wrong = lost && !field.mine[i];
				const f0 = this.flagAt[i];
				if (f0 && now < f0) {
					busy = true;
					continue;
				}
				const p = f0 ? Math.min(1, (now - f0) / 240) : 1;
				if (p < 1) busy = true;
				const drop = (1 - p) * (1 - p) * s * 0.5;
				const squash = p < 1 ? 1 + Math.sin(p * Math.PI) * 0.08 : 1;
				g.drawImage(wrong ? this.deadFlag! : this.flag!, x, y - drop, s, s * squash);
				if (wrong) g.drawImage(this.cross!, x, y);
			}
		}

		if (this.cracks.length) {
			const age = now - this.boomAt;
			if (this.reach !== Infinity) {
				this.reach = motion ? age * this.cell * CRACK_SPEED : Infinity;
				if (this.cracks.some((seg) => seg.d > this.reach)) busy = true;
				else this.reach = Infinity;
			}
			this.drawCracks();
		}

		if (this.winAt) {
			const age = now - this.winAt;
			if (motion && age < 2200) {
				busy = true;
				const W = this.el.width;
				const H = this.el.height;
				const p = age / 2200;
				const pos = -0.4 + p * 1.8;
				const band = g.createLinearGradient(W * pos - W * 0.35, 0, W * pos + W * 0.35, H);
				band.addColorStop(0, 'rgba(255, 210, 160, 0)');
				band.addColorStop(0.5, `rgba(255, 214, 170, ${0.35 * Math.sin(p * Math.PI)})`);
				band.addColorStop(1, 'rgba(255, 210, 160, 0)');
				g.globalCompositeOperation = 'lighter';
				g.fillStyle = band;
				g.fillRect(0, 0, W, H);
				g.globalCompositeOperation = 'source-over';
			}
		}

		if (this.cursor >= 0 && this.cursor < field.total) {
			const [c, r] = this.place(this.cursor);
			g.strokeStyle = '#ff8a5a';
			g.lineWidth = Math.max(2, s * 0.07);
			g.beginPath();
			g.roundRect(c * s + s * 0.05, r * s + s * 0.05, s * 0.9, s * 0.9, s * 0.16);
			g.stroke();
		}

		if (this.holdCell >= 0 && this.holdCell < field.total) {
			const age = now - this.holdAt;
			const p = Math.min(1, (age - HOLD_GRACE) / (this.holdMs - HOLD_GRACE));
			if (p < 1) busy = true;
			if (p > 0) {
				const [c, r] = this.place(this.holdCell);
				const cx = c * s + s / 2;
				const cy = r * s + s / 2;
				g.lineCap = 'round';
				g.lineWidth = Math.max(2, s * 0.09);
				g.strokeStyle = 'rgba(29, 43, 71, 0.25)';
				g.beginPath();
				g.arc(cx, cy, s * 0.32, 0, Math.PI * 2);
				g.stroke();
				g.strokeStyle = '#ff6a3d';
				g.beginPath();
				g.arc(cx, cy, s * 0.32, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
				g.stroke();
				g.lineCap = 'butt';
			}
		}

		if (this.motes.length) {
			busy = true;
			this.drawMotes(now);
		}
		return busy;
	}

	private lastMote = 0;

	private spark(x: number, y: number) {
		if (this.motes.length > 260) return;
		const s = this.cell;
		for (let k = 0; k < 3; k += 1) {
			this.motes.push({
				x: x + (Math.random() - 0.5) * s * 0.7,
				y: y + (Math.random() - 0.5) * s * 0.7,
				vx: (Math.random() - 0.5) * s * 0.6,
				vy: -s * (0.4 + Math.random() * 0.8),
				life: 520 + Math.random() * 380,
				age: 0,
				size: s * (0.03 + Math.random() * 0.05)
			});
		}
	}

	private drawMotes(now: number) {
		const dt = this.lastMote ? Math.min(50, now - this.lastMote) : 16;
		this.lastMote = now;
		const g = this.ctx;
		g.globalCompositeOperation = 'lighter';
		g.fillStyle = '#ffffff';
		let alive = 0;
		for (const m of this.motes) {
			m.age += dt;
			if (m.age >= m.life) continue;
			m.x += (m.vx * dt) / 1000;
			m.y += (m.vy * dt) / 1000;
			m.vy *= 0.985;
			const p = m.age / m.life;
			g.globalAlpha = Math.sin(p * Math.PI) * 0.9;
			const r = m.size * (1 - p * 0.5);
			g.fillRect(m.x - r, m.y - r * 0.25, r * 2, r * 0.5);
			g.fillRect(m.x - r * 0.25, m.y - r, r * 0.5, r * 2);
			this.motes[alive++] = m;
		}
		this.motes.length = alive;
		if (!alive) this.lastMote = 0;
		g.globalAlpha = 1;
		g.globalCompositeOperation = 'source-over';
	}

	private drawCracks() {
		const g = this.ctx;
		const reach = this.reach;
		g.lineCap = 'round';
		for (const pass of [0, 1]) {
			g.strokeStyle = pass ? 'rgba(248, 253, 255, 0.92)' : 'rgba(6, 18, 30, 0.55)';
			for (const seg of this.cracks) {
				if (seg.d >= reach) continue;
				const len = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1);
				const t = Math.min(1, (reach - seg.d) / len);
				const off = pass ? 0 : seg.w * 0.9;
				g.lineWidth = pass ? seg.w : seg.w * 1.6;
				g.beginPath();
				g.moveTo(seg.x1 + off, seg.y1 + off);
				g.lineTo(seg.x1 + (seg.x2 - seg.x1) * t + off, seg.y1 + (seg.y2 - seg.y1) * t + off);
				g.stroke();
			}
		}
	}
}
