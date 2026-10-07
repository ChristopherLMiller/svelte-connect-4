import type { Board } from './engine';
import type { Player, Season } from './types';

/** Board space: intersections sit one unit apart from (0, 0); the gravel runs MARGIN past them, then the frame. */
const MARGIN = 0.85;
const FRAME = 0.5;
const STONE_R = 0.44;
const DROP_FALL = 300;
const DROP_END = 430;
const FALL_Z = 2.4;

type Ripple = { x: number; y: number; t0: number; dur: number; reach: number; rings: number; strength: number };
type Grain = { x: number; y: number; z: number; vx: number; vy: number; vz: number; t0: number; life: number; color: string; size: number };
type Petal = { x: number; y: number; vx: number; vy: number; spin: number; spinV: number; size: number; color: string; t0: number; life: number; z: number };
type Lying = { x: number; y: number; angle: number; size: number; color: string; t0: number; life: number };
type Drop = { index: number; player: Player; t0: number };
type Lift = { index: number; player: Player; t0: number; dur: number };

export type GardenView = {
	current: Player;
	/** A person may place right now (not the AI, not mid-drop). */
	human: boolean;
	hover: number;
	cursor: number;
	ghost: boolean;
	last: number;
	threats: { 1: number[]; 2: number[] };
	warn: boolean;
	win: number[] | null;
	winner: 0 | Player;
};

const PALETTE: Record<Season, string[]> = {
	spring: ['#f9cfdb', '#f3a9bf', '#fde6ec', '#eea0b8'],
	autumn: ['#e2552d', '#f08a2c', '#c7362a', '#e9b13c', '#b8452a'],
	winter: ['#ffffff', '#eef4fb', '#dfe9f4']
};

function hash(n: number) {
	const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
	return x - Math.floor(x);
}

function mulberry(seed: number) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const clamp01 = (u: number) => Math.max(0, Math.min(1, u));
const easeOut = (u: number) => 1 - Math.pow(1 - u, 3);

function starPoints(n: number) {
	const edge = 3;
	const mid = (n - 1) / 2;
	const far = n - 1 - edge;
	if (n === 19) return [edge, mid, far].flatMap((r) => [edge, mid, far].map((c) => [r, c]));
	return [
		[edge, edge],
		[edge, far],
		[far, edge],
		[far, far],
		[mid, mid]
	];
}

export class GardenRenderer {
	motion = true;
	season: Season = 'spring';
	onLand: (index: number, player: Player, pan: number) => void = () => {};

	private ctx: CanvasRenderingContext2D;
	private cssW = 0;
	private cssH = 0;
	private dpr = 1;
	private s = 1;
	private ox = 0;
	private oy = 0;
	private n = 15;
	private board: Board = [];
	private bed: HTMLCanvasElement | null = null;
	private plain: HTMLCanvasElement | null = null;
	private still: HTMLCanvasElement | null = null;
	private stillDirty = true;
	/** The open gravel: the bed with a hole for every settled stone. */
	private gravel: Path2D | null = null;
	private sprites: Record<Player, HTMLCanvasElement[]> = { 1: [], 2: [] };
	private shadow: HTMLCanvasElement | null = null;
	private dapple: HTMLCanvasElement | null = null;
	private drops: Drop[] = [];
	private lifts: Lift[] = [];
	private ripples: Ripple[] = [];
	private grains: Grain[] = [];
	private petals: Petal[] = [];
	private lying: Lying[] = [];
	private winLine: number[] | null = null;
	private winT0 = 0;
	private winner: Player = 1;
	private sweepT0 = -1;
	private nextPetal = 0;
	private nextLying = 0;
	private busyUntil = 0;

	constructor(private canvas: HTMLCanvasElement) {
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('2d canvas unavailable');
		this.ctx = ctx;
	}

	/** Css pixels between neighbouring points. */
	get cellPx() {
		return this.s;
	}

	private get extent() {
		return this.n - 1 + 2 * (MARGIN + FRAME);
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
		const side = Math.min(this.cssW, this.cssH) * 0.98;
		this.s = side / this.extent;
		this.ox = (this.cssW - side) / 2;
		this.oy = (this.cssH - side) / 2;
		if (this.cssW && this.cssH) {
			this.buildSprites();
			this.buildBed();
			this.stillDirty = true;
		}
	}

	/** Board units (intersection (0, 0) at the origin) to css pixels. */
	screen(x: number, y: number): [number, number] {
		const off = MARGIN + FRAME;
		return [this.ox + (x + off) * this.s, this.oy + (y + off) * this.s];
	}

	private cellXY(index: number): [number, number] {
		return [index % this.n, Math.floor(index / this.n)];
	}

	/** The intersection under a css-pixel point, or -1 when it's off the gravel. */
	indexAt(px: number, py: number) {
		const off = MARGIN + FRAME;
		const x = (px - this.ox) / this.s - off;
		const y = (py - this.oy) / this.s - off;
		const c = Math.round(x);
		const r = Math.round(y);
		if (c < 0 || r < 0 || c >= this.n || r >= this.n) return -1;
		if (Math.hypot(x - c, y - r) > 0.62) return -1;
		return r * this.n + c;
	}

	panOf(index: number) {
		const [x] = this.cellXY(index);
		return (x / Math.max(1, this.n - 1)) * 2 - 1;
	}

	/** Where an intersection sits on the page, for tests and overlays. */
	pointOf(index: number): [number, number] {
		const [x, y] = this.cellXY(index);
		return this.screen(x, y);
	}

	busy(now: number) {
		return now < this.busyUntil || this.drops.length > 0 || this.lifts.length > 0;
	}

	load(board: Board, size: number, lifted: Array<{ index: number; player: Player }> = []) {
		const now = performance.now();
		const resized = size !== this.n;
		const oldN = this.n;
		this.n = size;
		this.drops = [];
		this.winLine = null;
		this.grains = [];
		if (resized) {
			this.ripples = [];
			this.lifts = [];
			this.lying = [];
			if (this.cssW) this.layout();
		}
		if (lifted.length && this.motion && !resized) {
			const sweep = lifted.length > 2;
			if (sweep) this.sweepT0 = now;
			for (const stone of lifted) {
				const [x] = [stone.index % oldN];
				const delay = sweep ? (x / Math.max(1, oldN - 1)) * 620 : 0;
				this.lifts.push({ index: stone.index, player: stone.player, t0: now + delay, dur: 340 });
			}
			this.busyUntil = now + (sweep ? 1100 : 400);
		} else {
			this.lifts = [];
		}
		this.board = [...board];
		this.stillDirty = true;
	}

	place(index: number, player: Player, reduced: boolean) {
		const now = performance.now();
		const [x, y] = this.cellXY(index);
		if (!this.motion || reduced) {
			this.board[index] = player;
			this.stillDirty = true;
			this.ripples.push({ x, y, t0: now, dur: 700, reach: 0.9, rings: 1, strength: 0.6 });
			this.onLand(index, player, this.panOf(index));
			this.busyUntil = now + 720;
			return;
		}
		this.drops.push({ index, player, t0: now });
		this.busyUntil = now + DROP_END + 1400;
		window.setTimeout(() => this.land(index, player, x, y), DROP_FALL);
	}

	private land(index: number, player: Player, x: number, y: number) {
		const now = performance.now();
		this.onLand(index, player, this.panOf(index));
		this.ripples.push({ x, y, t0: now, dur: 1300, reach: 1.9, rings: 3, strength: 1 });
		const rand = mulberry(index * 31 + Math.floor(now));
		for (let k = 0; k < 18; k += 1) {
			const a = rand() * Math.PI * 2;
			const sp = 0.8 + rand() * 1.6;
			this.grains.push({
				x: x + Math.cos(a) * STONE_R * 0.9,
				y: y + Math.sin(a) * STONE_R * 0.9,
				z: 0.02,
				vx: Math.cos(a) * sp,
				vy: Math.sin(a) * sp,
				vz: 1.2 + rand() * 1.8,
				t0: now,
				life: 500 + rand() * 300,
				color: rand() < 0.5 ? '#efe7d6' : '#b9ad98',
				size: 0.025 + rand() * 0.03
			});
		}
	}

	private buildSprites() {
		const r = STONE_R * this.s * this.dpr;
		const size = Math.ceil(r * 2.4);
		const make = () => {
			const c = document.createElement('canvas');
			c.width = size;
			c.height = size;
			return c;
		};
		for (const player of [1, 2] as Player[]) {
			this.sprites[player] = [];
			for (let v = 0; v < 6; v += 1) {
				const canvas = make();
				const g = canvas.getContext('2d')!;
				const rand = mulberry(player * 100 + v * 7 + 3);
				const cx = size / 2;
				const cy = size / 2;
				const rx = r * (0.98 + rand() * 0.06);
				const ry = r * (0.9 + rand() * 0.06);
				g.save();
				g.translate(cx, cy);
				g.rotate(rand() * Math.PI);
				g.beginPath();
				g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
				g.restore();
				g.save();
				g.clip();
				const body = g.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.05, cx, cy, r * 1.05);
				if (player === 1) {
					body.addColorStop(0, '#7d8794');
					body.addColorStop(0.35, '#3b424b');
					body.addColorStop(0.8, '#15181c');
					body.addColorStop(1, '#08090b');
				} else {
					body.addColorStop(0, '#ffffff');
					body.addColorStop(0.4, '#f1ebdf');
					body.addColorStop(0.85, '#cbc1ae');
					body.addColorStop(1, '#a89d88');
				}
				g.fillStyle = body;
				g.fillRect(0, 0, size, size);
				for (let k = 0; k < 70; k += 1) {
					const a = rand() * Math.PI * 2;
					const d = Math.sqrt(rand()) * r;
					g.fillStyle = player === 1 ? `rgba(200, 215, 230, ${0.05 + rand() * 0.1})` : `rgba(150, 130, 110, ${0.04 + rand() * 0.08})`;
					g.beginPath();
					g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, (0.4 + rand() * 0.9) * this.dpr, 0, Math.PI * 2);
					g.fill();
				}
				if (player === 2) {
					g.lineCap = 'round';
					for (let k = 0; k < 2; k += 1) {
						g.strokeStyle = `rgba(${200 + rand() * 30}, ${170 + rand() * 30}, ${160 + rand() * 20}, 0.35)`;
						g.lineWidth = (0.6 + rand()) * this.dpr;
						g.beginPath();
						const a = rand() * Math.PI;
						g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
						g.bezierCurveTo(cx + (rand() - 0.5) * r, cy + (rand() - 0.5) * r, cx + (rand() - 0.5) * r, cy + (rand() - 0.5) * r, cx - Math.cos(a) * r, cy - Math.sin(a) * r);
						g.stroke();
					}
				} else {
					const rim = g.createRadialGradient(cx + r * 0.4, cy + r * 0.5, 0, cx + r * 0.4, cy + r * 0.5, r * 0.8);
					rim.addColorStop(0, 'rgba(120, 150, 175, 0.28)');
					rim.addColorStop(1, 'rgba(120, 150, 175, 0)');
					g.fillStyle = rim;
					g.fillRect(0, 0, size, size);
				}
				const spec = g.createRadialGradient(cx - r * 0.38, cy - r * 0.45, 0, cx - r * 0.38, cy - r * 0.45, r * 0.55);
				spec.addColorStop(0, player === 1 ? 'rgba(235, 245, 255, 0.55)' : 'rgba(255, 255, 255, 0.95)');
				spec.addColorStop(0.35, player === 1 ? 'rgba(220, 235, 250, 0.16)' : 'rgba(255, 255, 255, 0.35)');
				spec.addColorStop(1, 'rgba(255, 255, 255, 0)');
				g.fillStyle = spec;
				g.fillRect(0, 0, size, size);
				g.restore();
				this.sprites[player].push(canvas);
			}
		}
		const sh = make();
		const sg = sh.getContext('2d')!;
		const grad = sg.createRadialGradient(size / 2, size / 2, r * 0.2, size / 2, size / 2, r * 1.18);
		grad.addColorStop(0, 'rgba(30, 22, 12, 0.55)');
		grad.addColorStop(0.6, 'rgba(30, 22, 12, 0.3)');
		grad.addColorStop(1, 'rgba(30, 22, 12, 0)');
		sg.fillStyle = grad;
		sg.fillRect(0, 0, size, size);
		this.shadow = sh;

		const dp = document.createElement('canvas');
		dp.width = 192;
		dp.height = 192;
		const dg = dp.getContext('2d')!;
		const rand = mulberry(77);
		for (let k = 0; k < 60; k += 1) {
			const x = rand() * 192;
			const y = rand() * 192;
			const rr = 8 + rand() * 26;
			for (const [ox, oy] of [
				[0, 0],
				[192, 0],
				[-192, 0],
				[0, 192],
				[0, -192]
			]) {
				const leaf = dg.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rr);
				leaf.addColorStop(0, 'rgba(20, 30, 10, 0.5)');
				leaf.addColorStop(1, 'rgba(20, 30, 10, 0)');
				dg.fillStyle = leaf;
				dg.beginPath();
				dg.arc(x + ox, y + oy, rr, 0, Math.PI * 2);
				dg.fill();
			}
		}
		this.dapple = dp;
	}

	private buildBed() {
		const W = this.canvas.width;
		const H = this.canvas.height;
		const s = this.s * this.dpr;
		const ox = this.ox * this.dpr;
		const oy = this.oy * this.dpr;
		const ext = this.extent * s;
		const inner0 = FRAME * s;
		const innerW = ext - 2 * inner0;
		const rand = mulberry(this.n * 13 + 5);

		const plain = document.createElement('canvas');
		plain.width = W;
		plain.height = H;
		const pg = plain.getContext('2d')!;
		const gx = Math.floor(ox + inner0);
		const gy = Math.floor(oy + inner0);
		const gw = Math.ceil(innerW);
		if (gw > 0) {
			const img = pg.createImageData(gw, gw);
			const d = img.data;
			for (let i = 0; i < gw * gw; i += 1) {
				const px = i % gw;
				const py = (i / gw) | 0;
				const shade = 214 + (Math.random() - 0.5) * 34 + Math.sin(px * 0.013 + py * 0.007) * 4;
				const warm = Math.random() < 0.04 ? -30 * Math.random() : 0;
				d[i * 4] = shade + 4 + warm;
				d[i * 4 + 1] = shade - 1 + warm;
				d[i * 4 + 2] = shade - 14 + warm;
				d[i * 4 + 3] = 255;
			}
			pg.putImageData(img, gx, gy);
			for (let k = 0; k < gw * gw * 0.0016; k += 1) {
				const x = gx + rand() * gw;
				const y = gy + rand() * gw;
				const rr = (0.5 + rand() * 1.4) * this.dpr;
				const tone = 150 + rand() * 90;
				pg.fillStyle = `rgba(${tone + 10}, ${tone}, ${tone - 15}, 0.7)`;
				pg.beginPath();
				pg.ellipse(x, y, rr, rr * 0.8, rand() * 3, 0, Math.PI * 2);
				pg.fill();
				pg.fillStyle = 'rgba(255, 252, 240, 0.4)';
				pg.beginPath();
				pg.arc(x - rr * 0.3, y - rr * 0.3, rr * 0.4, 0, Math.PI * 2);
				pg.fill();
			}
			const vignette = pg.createRadialGradient(gx + gw / 2, gy + gw / 2, gw * 0.3, gx + gw / 2, gy + gw / 2, gw * 0.75);
			vignette.addColorStop(0, 'rgba(255, 248, 230, 0.06)');
			vignette.addColorStop(1, 'rgba(90, 70, 40, 0.22)');
			pg.fillStyle = vignette;
			pg.fillRect(gx, gy, gw, gw);
		}
		this.plain = plain;

		const bed = document.createElement('canvas');
		bed.width = W;
		bed.height = H;
		const g = bed.getContext('2d')!;
		g.save();
		g.shadowColor = 'rgba(0, 0, 0, 0.5)';
		g.shadowBlur = s * 0.6;
		g.shadowOffsetY = s * 0.25;
		g.fillStyle = '#2a1b12';
		g.beginPath();
		g.roundRect(ox, oy, ext, ext, s * 0.18);
		g.fill();
		g.restore();

		const wood = g.createLinearGradient(ox, oy, ox + ext, oy + ext);
		wood.addColorStop(0, '#6b4329');
		wood.addColorStop(0.5, '#4f2f1c');
		wood.addColorStop(1, '#3a2114');
		g.fillStyle = wood;
		g.beginPath();
		g.roundRect(ox, oy, ext, ext, s * 0.18);
		g.fill();
		g.save();
		g.beginPath();
		g.roundRect(ox, oy, ext, ext, s * 0.18);
		g.clip();
		for (let k = 0; k < 140; k += 1) {
			const horizontal = k % 2 === 0;
			const along = rand() * ext;
			const off = rand() * inner0;
			const side = rand() < 0.5 ? 0 : ext - inner0;
			g.strokeStyle = `rgba(${rand() < 0.5 ? '25, 12, 6' : '140, 95, 60'}, ${0.12 + rand() * 0.18})`;
			g.lineWidth = (0.5 + rand()) * this.dpr;
			g.beginPath();
			if (horizontal) {
				g.moveTo(ox + along - s * 2, oy + side + off);
				g.bezierCurveTo(ox + along, oy + side + off + rand() * 3, ox + along + s, oy + side + off - rand() * 3, ox + along + s * 3, oy + side + off);
			} else {
				g.moveTo(ox + side + off, oy + along - s * 2);
				g.bezierCurveTo(ox + side + off + rand() * 3, oy + along, ox + side + off - rand() * 3, oy + along + s, ox + side + off, oy + along + s * 3);
			}
			g.stroke();
		}
		g.restore();
		g.strokeStyle = 'rgba(255, 220, 170, 0.22)';
		g.lineWidth = this.dpr * 1.5;
		g.beginPath();
		g.roundRect(ox + this.dpr, oy + this.dpr, ext - 2 * this.dpr, ext - 2 * this.dpr, s * 0.17);
		g.stroke();
		for (const [cx, cy] of [
			[ox + inner0 / 2, oy + inner0 / 2],
			[ox + ext - inner0 / 2, oy + inner0 / 2],
			[ox + inner0 / 2, oy + ext - inner0 / 2],
			[ox + ext - inner0 / 2, oy + ext - inner0 / 2]
		]) {
			g.fillStyle = 'rgba(20, 10, 4, 0.55)';
			g.beginPath();
			g.arc(cx, cy, s * 0.07, 0, Math.PI * 2);
			g.fill();
			g.fillStyle = 'rgba(210, 170, 110, 0.5)';
			g.beginPath();
			g.arc(cx - s * 0.015, cy - s * 0.015, s * 0.035, 0, Math.PI * 2);
			g.fill();
		}

		g.drawImage(plain, 0, 0);
		g.save();
		g.beginPath();
		g.rect(gx, gy, gw, gw);
		g.clip();
		const inner = g.createLinearGradient(0, gy, 0, gy + s * 0.5);
		inner.addColorStop(0, 'rgba(40, 25, 10, 0.4)');
		inner.addColorStop(1, 'rgba(40, 25, 10, 0)');
		g.fillStyle = inner;
		g.fillRect(gx, gy, gw, s * 0.5);
		const innerL = g.createLinearGradient(gx, 0, gx + s * 0.35, 0);
		innerL.addColorStop(0, 'rgba(40, 25, 10, 0.3)');
		innerL.addColorStop(1, 'rgba(40, 25, 10, 0)');
		g.fillStyle = innerL;
		g.fillRect(gx, gy, s * 0.35, gw);

		const [x0, y0] = this.screen(0, 0).map((v) => v * this.dpr);
		const groove = (horizontal: boolean, at: number, depth: number, wobble: number) => {
			const w = s * (0.05 + depth * 0.05);
			const steps = Math.max(8, Math.round(gw / (6 * this.dpr)));
			const seed = rand() * 100;
			const pts: number[] = [];
			for (let k = 0; k <= steps; k += 1) {
				const u = k / steps;
				pts.push(Math.sin(u * 17 + seed) * wobble * this.dpr + Math.sin(u * 51 + seed * 2) * wobble * 0.4 * this.dpr);
			}
			for (const [shift, color] of [
				[-w * 0.35, `rgba(95, 75, 45, ${0.13 + depth * 0.6})`],
				[w * 0.35, `rgba(255, 252, 240, ${0.2 + depth * 0.5})`]
			] as const) {
				g.strokeStyle = color;
				g.lineWidth = w * 0.55;
				g.beginPath();
				for (let k = 0; k <= steps; k += 1) {
					const along = gx + (k / steps) * gw;
					const v = at + shift + pts[k];
					if (horizontal) {
						if (k) g.lineTo(along, v);
						else g.moveTo(along, v);
					} else {
						const yy = gy + (k / steps) * gw;
						if (k) g.lineTo(v, yy);
						else g.moveTo(v, yy);
					}
				}
				g.stroke();
			}
		};
		for (let y = gy + s * 0.12; y < gy + gw; y += s / 4) groove(true, y, 0.02, 1.1);
		for (let k = 0; k < this.n; k += 1) {
			groove(true, y0 + k * s, 0.6, 0.25);
			groove(false, x0 + k * s, 0.6, 0.25);
		}
		g.restore();
		for (const [r, c] of starPoints(this.n)) {
			const px = x0 + c * s;
			const py = y0 + r * s;
			g.fillStyle = 'rgba(40, 32, 26, 0.85)';
			g.beginPath();
			g.ellipse(px, py, s * 0.085, s * 0.07, 0.4, 0, Math.PI * 2);
			g.fill();
			g.fillStyle = 'rgba(255, 255, 255, 0.35)';
			g.beginPath();
			g.arc(px - s * 0.025, py - s * 0.025, s * 0.025, 0, Math.PI * 2);
			g.fill();
		}
		this.bed = bed;
	}

	/** Bed, raked rings and every settled stone, redrawn only when the stones change. */
	private buildStill(now: number) {
		if (!this.bed || !this.plain) return;
		if (!this.still || this.still.width !== this.canvas.width || this.still.height !== this.canvas.height) {
			this.still = document.createElement('canvas');
			this.still.width = this.canvas.width;
			this.still.height = this.canvas.height;
		}
		const g = this.still.getContext('2d')!;
		const s = this.s * this.dpr;
		g.clearRect(0, 0, this.still.width, this.still.height);
		g.drawImage(this.bed, 0, 0);
		const flying = new Set([...this.drops.map((d) => d.index), ...this.lifts.filter((l) => now < l.t0 + l.dur).map((l) => l.index)]);
		const settled: number[] = [];
		this.board.forEach((p, i) => p && !flying.has(i) && settled.push(i));
		for (const i of settled) {
			const [px, py] = this.pointOf(i).map((v) => v * this.dpr);
			g.save();
			g.beginPath();
			g.arc(px, py, s * 0.5, 0, Math.PI * 2);
			g.clip();
			g.drawImage(this.plain, 0, 0);
			g.restore();
			for (const [rr, a] of [
				[0.49, 0.5],
				[0.4, 0.25]
			]) {
				g.lineWidth = s * 0.03;
				g.strokeStyle = `rgba(95, 75, 45, ${a})`;
				g.beginPath();
				g.arc(px - s * 0.012, py - s * 0.012, s * rr, 0, Math.PI * 2);
				g.stroke();
				g.strokeStyle = `rgba(255, 252, 240, ${a})`;
				g.beginPath();
				g.arc(px + s * 0.012, py + s * 0.012, s * rr, 0, Math.PI * 2);
				g.stroke();
			}
		}
		for (const i of settled) this.paintStone(g, i, this.board[i] as Player, 0, 1, 1);
		const [gx, gy] = this.screen(-MARGIN, -MARGIN).map((v) => v * this.dpr);
		const gw = (this.n - 1 + 2 * MARGIN) * s;
		const holes = new Path2D();
		holes.rect(gx, gy, gw, gw);
		for (const i of settled) {
			const [px, py] = this.pointOf(i).map((v) => v * this.dpr);
			holes.moveTo(px + s * 0.47, py);
			holes.arc(px, py, s * 0.47, 0, Math.PI * 2);
		}
		this.gravel = holes;
		this.stillDirty = false;
	}

	private paintStone(g: CanvasRenderingContext2D, index: number, player: Player, z: number, alpha: number, squash: number) {
		const sprite = this.sprites[player][Math.floor(hash(index * 3.7) * 6)];
		if (!sprite || !this.shadow) return;
		const [px, py] = this.pointOf(index).map((v) => v * this.dpr);
		const s = this.s * this.dpr;
		const size = sprite.width;
		const scale = 1 + z * 0.13;
		g.save();
		g.globalAlpha = alpha * (1 - Math.min(0.7, z * 0.28));
		const so = s * (0.07 + z * 0.35);
		const ss = size * (1 + z * 0.25);
		g.drawImage(this.shadow, px - ss / 2 + so * 0.6, py - ss / 2 + so, ss, ss);
		g.restore();
		g.save();
		g.globalAlpha = alpha;
		g.translate(px, py - z * s * 0.55);
		g.scale(scale * (2 - squash), scale * squash);
		g.drawImage(sprite, -size / 2, -size / 2);
		g.restore();
	}

	draw(now: number, view: GardenView) {
		const g = this.ctx;
		const s = this.s * this.dpr;
		if (this.stillDirty) this.buildStill(now);
		g.setTransform(1, 0, 0, 1, 0, 0);
		g.clearRect(0, 0, this.canvas.width, this.canvas.height);
		if (!this.still) return;
		g.drawImage(this.still, 0, 0);

		const gxy = this.screen(-MARGIN, -MARGIN).map((v) => v * this.dpr);
		const gw = (this.n - 1 + 2 * MARGIN) * s;
		g.save();
		g.beginPath();
		g.rect(gxy[0], gxy[1], gw, gw);
		g.clip();

		if (this.dapple && this.motion) {
			const t = now / 1000;
			g.save();
			g.globalCompositeOperation = 'multiply';
			g.globalAlpha = 0.22;
			const tile = gw * 0.7;
			const dx = Math.sin(t * 0.11) * tile * 0.08 + Math.sin(t * 0.37) * tile * 0.012;
			const dy = Math.cos(t * 0.09) * tile * 0.06;
			for (let yy = -1; yy <= 2; yy += 1) {
				for (let xx = -1; xx <= 2; xx += 1) {
					g.drawImage(this.dapple, gxy[0] + xx * tile + dx - tile * 0.3, gxy[1] + yy * tile + dy - tile * 0.5, tile, tile);
				}
			}
			g.restore();
		}

		g.restore();
		g.save();
		if (this.gravel) g.clip(this.gravel, 'evenodd');
		this.drawRipples(g, now);
		this.drawLying(g, now);
		g.restore();

		this.drawSweep(g, now, gxy, gw);

		if (view.warn && view.human) this.drawThreats(g, now, view);

		if (view.human && view.ghost) {
			const at = view.hover >= 0 ? view.hover : view.cursor;
			if (at >= 0 && !this.board[at]) {
				const pulse = this.motion ? 0.42 + 0.08 * Math.sin(now / 260) : 0.45;
				this.paintStone(g, at, view.current, 0, pulse, 1);
			}
		}
		if (view.cursor >= 0) this.drawCursor(g, view.cursor, now, view.current);

		const t = now;
		this.drops = this.drops.filter((drop) => {
			const u = (t - drop.t0) / DROP_FALL;
			if (t - drop.t0 >= DROP_END) {
				this.board[drop.index] = drop.player;
				this.stillDirty = true;
				return false;
			}
			if (u < 1) {
				const z = FALL_Z * (1 - u * u);
				this.paintStone(g, drop.index, drop.player, z, clamp01(u * 3), 1);
			} else {
				const b = (t - drop.t0 - DROP_FALL) / (DROP_END - DROP_FALL);
				const squash = 1 - Math.sin(b * Math.PI) * 0.07;
				this.paintStone(g, drop.index, drop.player, Math.sin(b * Math.PI) * 0.08, 1, squash);
			}
			return true;
		});
		if (this.stillDirty) this.buildStill(now);

		this.lifts = this.lifts.filter((lift) => {
			if (t < lift.t0) {
				this.paintStone(g, lift.index, lift.player, 0, 1, 1);
				return true;
			}
			const u = (t - lift.t0) / lift.dur;
			if (u >= 1) {
				this.stillDirty = true;
				return false;
			}
			this.paintStone(g, lift.index, lift.player, easeOut(u) * 1.3, 1 - u, 1);
			return true;
		});

		if (view.last >= 0 && this.board[view.last] && !this.drops.length) {
			const [px, py] = this.pointOf(view.last).map((v) => v * this.dpr);
			const pulse = this.motion ? 0.75 + 0.25 * Math.sin(now / 420) : 1;
			g.fillStyle = `rgba(214, 64, 42, ${0.85 * pulse})`;
			g.beginPath();
			g.arc(px, py, s * 0.085, 0, Math.PI * 2);
			g.fill();
			g.fillStyle = `rgba(255, 200, 180, ${0.6 * pulse})`;
			g.beginPath();
			g.arc(px - s * 0.025, py - s * 0.025, s * 0.03, 0, Math.PI * 2);
			g.fill();
		}

		if (view.win && !this.winLine) {
			this.winLine = view.win;
			this.winner = view.winner || 1;
			this.winT0 = now;
			this.celebrate(now);
		}
		if (this.winLine) this.drawWin(g, now);

		this.drawGrains(g, now);
		this.drawPetals(g, now);
	}

	private drawRipples(g: CanvasRenderingContext2D, now: number) {
		const s = this.s * this.dpr;
		this.ripples = this.ripples.filter((r) => now - r.t0 < r.dur);
		for (const r of this.ripples) {
			const u = clamp01((now - r.t0) / r.dur);
			const [px, py] = this.screen(r.x, r.y).map((v) => v * this.dpr);
			for (let k = 0; k < r.rings; k += 1) {
				const lag = k * 0.16;
				const v = clamp01((u - lag) / (1 - lag));
				if (v <= 0) continue;
				const rad = s * (STONE_R + 0.08 + easeOut(v) * r.reach * (1 - k * 0.18));
				const a = (1 - v) * 0.55 * r.strength;
				g.lineWidth = s * 0.05 * (1 - v * 0.5);
				g.strokeStyle = `rgba(95, 75, 45, ${a})`;
				g.beginPath();
				g.arc(px - s * 0.015, py - s * 0.015, rad, 0, Math.PI * 2);
				g.stroke();
				g.strokeStyle = `rgba(255, 252, 240, ${a * 1.1})`;
				g.beginPath();
				g.arc(px + s * 0.015, py + s * 0.015, rad, 0, Math.PI * 2);
				g.stroke();
			}
		}
	}

	private drawThreats(g: CanvasRenderingContext2D, now: number, view: GardenView) {
		const s = this.s * this.dpr;
		const mover = view.current;
		const other: Player = mover === 1 ? 2 : 1;
		const pulse = this.motion ? 0.6 + 0.4 * Math.sin(now / 300) : 1;
		const mark = (index: number, color: string, dash: boolean) => {
			if (this.board[index]) return;
			const [px, py] = this.pointOf(index).map((v) => v * this.dpr);
			g.save();
			g.lineWidth = s * 0.06;
			g.strokeStyle = color.replace('A', String(0.85 * pulse));
			if (dash) g.setLineDash([s * 0.12, s * 0.08]);
			g.lineDashOffset = this.motion ? -now / 60 : 0;
			g.beginPath();
			g.arc(px, py, s * 0.34, 0, Math.PI * 2);
			g.stroke();
			g.restore();
		};
		for (const i of view.threats[other]) mark(i, 'rgba(220, 60, 40, A)', true);
		for (const i of view.threats[mover]) mark(i, 'rgba(240, 190, 80, A)', false);
	}

	private drawCursor(g: CanvasRenderingContext2D, index: number, now: number, player: Player) {
		const s = this.s * this.dpr;
		const [px, py] = this.pointOf(index).map((v) => v * this.dpr);
		const d = s * (0.46 + (this.motion ? Math.sin(now / 240) * 0.03 : 0));
		const arm = s * 0.16;
		g.save();
		g.strokeStyle = player === 1 ? 'rgba(40, 60, 85, 0.95)' : 'rgba(140, 95, 30, 0.95)';
		g.lineWidth = s * 0.06;
		g.lineCap = 'round';
		for (const [sx, sy] of [
			[-1, -1],
			[1, -1],
			[-1, 1],
			[1, 1]
		]) {
			g.beginPath();
			g.moveTo(px + sx * d, py + sy * (d - arm));
			g.lineTo(px + sx * d, py + sy * d);
			g.lineTo(px + sx * (d - arm), py + sy * d);
			g.stroke();
		}
		g.restore();
	}

	private drawSweep(g: CanvasRenderingContext2D, now: number, gxy: number[], gw: number) {
		if (this.sweepT0 < 0) return;
		const u = (now - this.sweepT0) / 900;
		if (u >= 1) {
			this.sweepT0 = -1;
			return;
		}
		const s = this.s * this.dpr;
		const x = gxy[0] - s + easeOut(u) * (gw + 2 * s);
		g.save();
		g.beginPath();
		g.rect(gxy[0], gxy[1], gw, gw);
		g.clip();
		const band = g.createLinearGradient(x - s * 1.6, 0, x + s * 0.3, 0);
		band.addColorStop(0, 'rgba(255, 250, 235, 0)');
		band.addColorStop(0.8, 'rgba(255, 250, 235, 0.35)');
		band.addColorStop(1, 'rgba(255, 250, 235, 0)');
		g.fillStyle = band;
		g.fillRect(x - s * 1.6, gxy[1], s * 1.9, gw);
		g.restore();
		g.save();
		g.shadowColor = 'rgba(0, 0, 0, 0.4)';
		g.shadowBlur = s * 0.3;
		g.shadowOffsetX = s * 0.1;
		g.fillStyle = '#7a5434';
		g.fillRect(x, gxy[1] - s * 0.2, s * 0.22, gw + s * 0.4);
		g.restore();
		g.fillStyle = '#5a3a22';
		for (let k = 0; k < 14; k += 1) {
			const yy = gxy[1] + (k + 0.5) * (gw / 14);
			g.fillRect(x - s * 0.12, yy - s * 0.03, s * 0.14, s * 0.06);
		}
		if (this.motion && Math.random() < 0.6) {
			this.grains.push({
				x: (x + s * 0.1) / s - (this.ox * this.dpr) / s - MARGIN - FRAME,
				y: (gxy[1] + Math.random() * gw) / s - (this.oy * this.dpr) / s - MARGIN - FRAME,
				z: 0.05,
				vx: 1.5 + Math.random(),
				vy: (Math.random() - 0.5) * 0.6,
				vz: 0.6 + Math.random(),
				t0: now,
				life: 400,
				color: '#efe7d6',
				size: 0.03
			});
		}
	}

	private celebrate(now: number) {
		if (!this.winLine) return;
		const colors = PALETTE[this.season];
		const rand = mulberry(Math.floor(now));
		this.winLine.forEach((index, k) => {
			const [x, y] = this.cellXY(index);
			this.ripples.push({ x, y, t0: now + k * 90, dur: 1800, reach: 2.6, rings: 3, strength: 1 });
			if (!this.motion) return;
			for (let j = 0; j < 10; j += 1) {
				const a = rand() * Math.PI * 2;
				const sp = 0.6 + rand() * 1.8;
				this.petals.push({
					x,
					y,
					vx: Math.cos(a) * sp,
					vy: Math.sin(a) * sp - 0.6,
					spin: rand() * 6,
					spinV: (rand() - 0.5) * 8,
					size: 0.12 + rand() * 0.1,
					color: colors[Math.floor(rand() * colors.length)],
					t0: now + k * 90 + 250,
					life: 2200 + rand() * 1400,
					z: 0.6 + rand() * 0.8
				});
			}
		});
		this.busyUntil = Math.max(this.busyUntil, now + 3600);
	}

	private drawWin(g: CanvasRenderingContext2D, now: number) {
		if (!this.winLine) return;
		const s = this.s * this.dpr;
		const t = now - this.winT0;
		const line = this.winLine;
		const pts = line.map((i) => this.pointOf(i).map((v) => v * this.dpr));
		const glowRGB = this.winner === 1 ? '150, 190, 230' : '255, 215, 140';
		line.forEach((_, k) => {
			const [px, py] = pts[k];
			const u = clamp01((t - k * 90) / 400);
			const pulse = this.motion ? 0.65 + 0.35 * Math.sin(now / 380 + k * 0.8) : 0.8;
			const glow = g.createRadialGradient(px, py, s * 0.2, px, py, s * 0.85);
			glow.addColorStop(0, `rgba(${glowRGB}, ${0.55 * u * pulse})`);
			glow.addColorStop(1, `rgba(${glowRGB}, 0)`);
			g.save();
			g.globalCompositeOperation = 'lighter';
			g.fillStyle = glow;
			g.fillRect(px - s, py - s, s * 2, s * 2);
			g.restore();
		});

		const [ax, ay] = pts[0];
		const [bx, by] = pts[pts.length - 1];
		const len = Math.hypot(bx - ax, by - ay);
		const dx = (bx - ax) / len;
		const dy = (by - ay) / len;
		const ext = s * 0.55;
		const sx = ax - dx * ext;
		const sy = ay - dy * ext;
		const total = len + ext * 2;
		const u = this.motion ? easeOut(clamp01((t - 350) / 650)) : 1;
		if (u > 0) {
			const nx = -dy;
			const ny = dx;
			const steps = 40;
			const reach = total * u;
			const rand = mulberry(line[0] * 7 + line.length);
			const widths = Array.from({ length: steps + 1 }, (_, k) => {
				const v = k / steps;
				const taper = Math.min(1, v * 6) * (v > 0.75 ? 1 - (v - 0.75) / 0.25 * 0.85 : 1);
				return s * 0.2 * taper * (0.85 + rand() * 0.3);
			});
			g.save();
			g.globalAlpha = 0.82;
			g.fillStyle = '#c8321f';
			g.beginPath();
			for (let k = 0; k <= steps; k += 1) {
				const d = Math.min(reach, (k / steps) * total);
				const w = widths[k] * (d / total <= u ? 1 : 0);
				const wob = Math.sin(k * 0.7) * s * 0.02;
				const x = sx + dx * d + nx * (w + wob);
				const y = sy + dy * d + ny * (w + wob);
				if (k) g.lineTo(x, y);
				else g.moveTo(x, y);
			}
			for (let k = steps; k >= 0; k -= 1) {
				const d = Math.min(reach, (k / steps) * total);
				const w = widths[k];
				const wob = Math.sin(k * 0.7) * s * 0.02;
				g.lineTo(sx + dx * d - nx * (w - wob), sy + dy * d - ny * (w - wob));
			}
			g.closePath();
			g.fill();
			g.globalAlpha = 0.5;
			g.strokeStyle = '#f1e4cf';
			g.lineCap = 'round';
			for (let k = 0; k < 5; k += 1) {
				const off = (rand() - 0.5) * s * 0.28;
				const from = total * (0.4 + rand() * 0.3);
				const to = Math.min(reach, total * (0.75 + rand() * 0.25));
				if (to <= from) continue;
				g.lineWidth = s * (0.01 + rand() * 0.02);
				g.beginPath();
				g.moveTo(sx + dx * from + nx * off, sy + dy * from + ny * off);
				g.lineTo(sx + dx * to + nx * off, sy + dy * to + ny * off);
				g.stroke();
			}
			g.restore();
		}

		const stamp = this.motion ? clamp01((t - 1050) / 260) : 1;
		if (stamp > 0) {
			const pop = this.motion ? 1 + Math.sin(stamp * Math.PI) * 0.25 : 1;
			const cx = bx + dx * s * 0.95 + -dy * s * 0.6;
			const cy = by + dy * s * 0.95 + dx * s * 0.6;
			const half = s * 0.42 * pop;
			g.save();
			g.translate(cx, cy);
			g.rotate(-0.12);
			g.globalAlpha = stamp * 0.92;
			g.shadowColor = 'rgba(0, 0, 0, 0.35)';
			g.shadowBlur = s * 0.2;
			g.fillStyle = '#b8261a';
			g.beginPath();
			g.roundRect(-half, -half, half * 2, half * 2, half * 0.18);
			g.fill();
			g.shadowBlur = 0;
			g.strokeStyle = '#f6e7d2';
			g.lineWidth = half * 0.08;
			g.strokeRect(-half * 0.78, -half * 0.78, half * 1.56, half * 1.56);
			g.fillStyle = '#f6e7d2';
			g.font = `700 ${half * 1.25}px "Shippori Mincho", "Hiragino Mincho ProN", serif`;
			g.textAlign = 'center';
			g.textBaseline = 'middle';
			g.fillText('勝', 0, half * 0.06);
			g.restore();
		}
	}

	private drawGrains(g: CanvasRenderingContext2D, now: number) {
		const s = this.s * this.dpr;
		this.grains = this.grains.filter((p) => now - p.t0 < p.life);
		for (const p of this.grains) {
			const t = Math.max(0, (now - p.t0) / 1000);
			const z = Math.max(0, p.z + p.vz * t - 6 * t * t);
			const x = p.x + p.vx * t * 0.5;
			const y = p.y + p.vy * t * 0.5;
			const [px, py] = this.screen(x, y).map((v) => v * this.dpr);
			g.fillStyle = p.color;
			g.globalAlpha = 1 - (now - p.t0) / p.life;
			g.beginPath();
			g.arc(px, py - z * s * 0.5, p.size * s, 0, Math.PI * 2);
			g.fill();
		}
		g.globalAlpha = 1;
	}

	private drawLying(g: CanvasRenderingContext2D, now: number) {
		if (!this.motion) return;
		if (now > this.nextLying) {
			this.nextLying = now + 5000 + Math.random() * 6000;
			if (this.lying.length < 7) {
				const colors = PALETTE[this.season];
				this.lying.push({
					x: -MARGIN * 0.6 + Math.random() * (this.n - 1 + MARGIN * 1.2),
					y: -MARGIN * 0.6 + Math.random() * (this.n - 1 + MARGIN * 1.2),
					angle: Math.random() * Math.PI,
					size: 0.12 + Math.random() * 0.06,
					color: colors[Math.floor(Math.random() * colors.length)],
					t0: now,
					life: 24000 + Math.random() * 16000
				});
			}
		}
		this.lying = this.lying.filter((l) => now - l.t0 < l.life);
		for (const l of this.lying) {
			const age = now - l.t0;
			const a = Math.min(1, age / 800) * Math.min(1, (l.life - age) / 1500);
			this.paintPetal(g, l.x, l.y, 0, l.angle, 1, l.size, l.color, a * 0.9);
		}
	}

	private paintPetal(g: CanvasRenderingContext2D, x: number, y: number, z: number, angle: number, flip: number, size: number, color: string, alpha: number) {
		const s = this.s * this.dpr;
		const [px, py] = this.screen(x, y).map((v) => v * this.dpr);
		const r = size * s;
		g.save();
		g.globalAlpha = alpha;
		g.translate(px, py - z * s * 0.5);
		g.rotate(angle);
		g.scale(Math.max(0.15, Math.abs(flip)), 1);
		g.fillStyle = color;
		g.beginPath();
		if (this.season === 'winter') {
			g.arc(0, 0, r * 0.45, 0, Math.PI * 2);
		} else if (this.season === 'autumn') {
			g.moveTo(0, -r);
			for (let k = 1; k <= 10; k += 1) {
				const a = -Math.PI / 2 + (k / 10) * Math.PI * 2;
				const rr = k % 2 ? r * 0.45 : r;
				g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
			}
		} else {
			g.moveTo(0, -r);
			g.quadraticCurveTo(r * 0.7, -r * 0.3, 0, r);
			g.quadraticCurveTo(-r * 0.7, -r * 0.3, 0, -r);
		}
		g.fill();
		if (this.season === 'spring') {
			g.fillStyle = 'rgba(255, 255, 255, 0.35)';
			g.beginPath();
			g.ellipse(-r * 0.12, -r * 0.2, r * 0.15, r * 0.4, 0, 0, Math.PI * 2);
			g.fill();
		}
		g.restore();
	}

	private drawPetals(g: CanvasRenderingContext2D, now: number) {
		if (this.motion && now > this.nextPetal) {
			this.nextPetal = now + (this.season === 'winter' ? 500 : 1300) + Math.random() * 1500;
			const colors = PALETTE[this.season];
			const span = this.n - 1 + 2 * MARGIN;
			this.petals.push({
				x: -MARGIN - 1,
				y: -MARGIN + Math.random() * span * 0.8,
				vx: 0.7 + Math.random() * 0.6,
				vy: 0.25 + Math.random() * 0.3,
				spin: Math.random() * 6,
				spinV: (Math.random() - 0.5) * 4,
				size: 0.11 + Math.random() * 0.07,
				color: colors[Math.floor(Math.random() * colors.length)],
				t0: now,
				life: ((span + 2) / 0.9) * 1000,
				z: 1.2
			});
		}
		this.petals = this.petals.filter((p) => now - p.t0 < p.life);
		for (const p of this.petals) {
			if (now < p.t0) continue;
			const t = (now - p.t0) / 1000;
			const x = p.x + p.vx * t + Math.sin(t * 1.3 + p.spin) * 0.25;
			const y = p.y + p.vy * t + Math.sin(t * 2.1 + p.spin * 2) * 0.12;
			const fade = Math.min(1, (p.life - (now - p.t0)) / 600);
			this.paintPetal(g, x, y, p.z, p.spin + t * p.spinV * 0.4, Math.cos(t * p.spinV + p.spin), p.size, p.color, 0.92 * fade);
		}
	}
}
