import type { Mark, MoveRecord } from './session.svelte';
import type { Side } from './types';

export type BoardView = {
	board: Int8Array;
	bottom: Side;
	coords: boolean;
	hints: boolean;
	selected: number;
	targets: number[];
	last: { from: number; to: number } | null;
	check: number;
	cursor: number;
	hover: number;
	drag: { sq: number; x: number; y: number } | null;
	mark: { sq: number; kind: Mark } | null;
	/** Square of a king that has fallen (mate or resignation), and the winner's king. */
	fallen: { sq: number; winner: number } | null;
};

type Point = { x: number; y: number };

type Slide = { piece: number; from: number; to: number; start: number; dur: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; born: number; size: number; color: string; spin: number; kind: 'shard' | 'dust' | 'spark' };
type Fade = { piece: number; sq: number; start: number; dur: number };
type Ring = { sq: number; start: number; dur: number; color: string; reach: number };

const MARK_STYLE: Record<Mark, { fill: string; text: string }> = {
	book: { fill: '#a07a52', text: '' },
	best: { fill: '#4f9e68', text: '★' },
	good: { fill: '#6b8f7a', text: '✓' },
	inaccuracy: { fill: '#d8b443', text: '?!' },
	mistake: { fill: '#e0843a', text: '?' },
	blunder: { fill: '#d2473a', text: '??' }
};

// ── Procedural marble ────────────────────────────────────────────────────

function hash2(x: number, y: number) {
	let h = (x * 374761393 + y * 668265263) | 0;
	h = Math.imul(h ^ (h >>> 13), 1274126177);
	return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function valueNoise(x: number, y: number) {
	const xi = Math.floor(x);
	const yi = Math.floor(y);
	const xf = x - xi;
	const yf = y - yi;
	const u = xf * xf * (3 - 2 * xf);
	const v = yf * yf * (3 - 2 * yf);
	const a = hash2(xi, yi);
	const b = hash2(xi + 1, yi);
	const c = hash2(xi, yi + 1);
	const d = hash2(xi + 1, yi + 1);
	return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x: number, y: number, octaves = 4) {
	let sum = 0;
	let amp = 0.5;
	let f = 1;
	for (let i = 0; i < octaves; i += 1) {
		sum += valueNoise(x * f, y * f) * amp;
		f *= 2.03;
		amp *= 0.5;
	}
	return sum;
}

let marbleCache: HTMLCanvasElement | null = null;

/** An 8×8 slab: warm Carrara for light squares, veined verde antico for dark; bottom-left is dark. */
function marble(): HTMLCanvasElement {
	if (marbleCache) return marbleCache;
	const R = 640;
	const canvas = document.createElement('canvas');
	canvas.width = R;
	canvas.height = R;
	const ctx = canvas.getContext('2d')!;
	const img = ctx.createImageData(R, R);
	const data = img.data;
	for (let py = 0; py < R; py += 1) {
		for (let px = 0; px < R; px += 1) {
			const x = (px / R) * 8;
			const y = (py / R) * 8;
			const col = Math.floor(x);
			const row = Math.floor(y);
			const dark = (col + (7 - row)) % 2 === 0;
			const o = hash2(col * 7 + 3, row * 13 + 1) * 40;
			const t = fbm(x * 1.1 + o, y * 1.1 - o);
			const vein = Math.pow(1 - Math.abs(Math.sin((x * 0.8 + y * 0.45 + o) * 2.1 + t * 6)), 16);
			const fine = Math.pow(1 - Math.abs(Math.sin((x * 0.3 - y * 0.9 + o) * 5.3 + fbm(x * 2.4, y * 2.4 + o) * 8)), 40);
			const cloud = fbm(x * 2.6 + o, y * 2.6 + o * 0.5, 3);
			let r: number;
			let g: number;
			let b: number;
			if (dark) {
				const base = 0.78 + cloud * 0.5;
				r = 22 * base;
				g = 40 * base;
				b = 34 * base;
				const lift = vein * 0.55 + fine * 0.3;
				r += (188 - r) * lift;
				g += (206 - g) * lift;
				b += (192 - b) * lift;
				if (hash2(px * 3 + 11, py * 5 + 7) > 0.9988) {
					r = 214;
					g = 176;
					b = 96;
				}
			} else {
				const base = 0.93 + cloud * 0.12;
				r = 238 * base;
				g = 231 * base;
				b = 216 * base;
				const sink = vein * 0.42 + fine * 0.22;
				r += (128 - r) * sink;
				g += (130 - g) * sink;
				b += (136 - b) * sink;
			}
			const i = (py * R + px) * 4;
			data[i] = Math.min(255, r);
			data[i + 1] = Math.min(255, g);
			data[i + 2] = Math.min(255, b);
			data[i + 3] = 255;
		}
	}
	ctx.putImageData(img, 0, 0);
	marbleCache = canvas;
	return canvas;
}

// ── Carved pieces ────────────────────────────────────────────────────────

/** Profiles in a 100-unit square, base resting at y = 92. */
function piecePath(type: number): Path2D {
	const p = new Path2D();
	const plinth = (w: number, top: number) => {
		p.roundRect(50 - w / 2, 84, w, 9, 3);
		p.roundRect(50 - w / 2 + 6, top, w - 12, 85 - top, 3);
	};
	switch (type) {
		case 1: {
			plinth(52, 79);
			p.moveTo(35, 80);
			p.bezierCurveTo(38, 70, 43, 64, 43, 58);
			p.lineTo(57, 58);
			p.bezierCurveTo(57, 64, 62, 70, 65, 80);
			p.closePath();
			p.ellipse(50, 57, 13, 3.8, 0, 0, Math.PI * 2);
			p.moveTo(61.5, 44);
			p.arc(50, 44, 11.5, 0, Math.PI * 2);
			break;
		}
		case 2: {
			plinth(58, 78);
			p.moveTo(30, 79);
			p.lineTo(71, 79);
			p.bezierCurveTo(72, 66, 68, 56, 67, 44);
			p.bezierCurveTo(66, 30, 60, 21, 50, 17);
			p.lineTo(48, 8);
			p.lineTo(41, 16);
			p.bezierCurveTo(34, 18, 28, 26, 24, 35);
			p.bezierCurveTo(20, 41, 20, 47, 24, 50);
			p.bezierCurveTo(28, 53, 33, 51, 37, 48);
			p.bezierCurveTo(41, 46, 45, 46, 47, 49);
			p.bezierCurveTo(42, 57, 33, 66, 30, 79);
			p.closePath();
			break;
		}
		case 3: {
			plinth(54, 79);
			p.moveTo(34, 80);
			p.bezierCurveTo(38, 71, 43, 66, 43, 60);
			p.lineTo(57, 60);
			p.bezierCurveTo(57, 66, 62, 71, 66, 80);
			p.closePath();
			p.ellipse(50, 59, 14, 3.8, 0, 0, Math.PI * 2);
			p.ellipse(50, 54, 10, 2.8, 0, 0, Math.PI * 2);
			p.moveTo(50, 19);
			p.bezierCurveTo(63, 28, 65, 41, 58, 52);
			p.lineTo(42, 52);
			p.bezierCurveTo(35, 41, 37, 28, 50, 19);
			p.closePath();
			p.moveTo(54, 15);
			p.arc(50, 15, 4, 0, Math.PI * 2);
			break;
		}
		case 4: {
			plinth(60, 78);
			p.moveTo(31, 79);
			p.lineTo(35, 47);
			p.lineTo(65, 47);
			p.lineTo(69, 79);
			p.closePath();
			p.roundRect(29, 42, 42, 7, 2);
			p.moveTo(28, 43);
			p.lineTo(28, 24);
			p.lineTo(37, 24);
			p.lineTo(37, 31);
			p.lineTo(45.5, 31);
			p.lineTo(45.5, 24);
			p.lineTo(54.5, 24);
			p.lineTo(54.5, 31);
			p.lineTo(63, 31);
			p.lineTo(63, 24);
			p.lineTo(72, 24);
			p.lineTo(72, 43);
			p.closePath();
			break;
		}
		case 5: {
			plinth(60, 78);
			p.moveTo(32, 79);
			p.bezierCurveTo(37, 66, 43, 58, 43, 48);
			p.lineTo(57, 48);
			p.bezierCurveTo(57, 58, 63, 66, 68, 79);
			p.closePath();
			p.ellipse(50, 48, 14, 3.6, 0, 0, Math.PI * 2);
			p.ellipse(50, 43.5, 11, 2.7, 0, 0, Math.PI * 2);
			p.moveTo(37, 42);
			p.lineTo(29, 22);
			p.lineTo(41, 32);
			p.lineTo(50, 15);
			p.lineTo(59, 32);
			p.lineTo(71, 22);
			p.lineTo(63, 42);
			p.closePath();
			break;
		}
		case 6: {
			plinth(60, 78);
			p.moveTo(31, 79);
			p.bezierCurveTo(36, 66, 42, 58, 42, 48);
			p.lineTo(58, 48);
			p.bezierCurveTo(58, 58, 64, 66, 69, 79);
			p.closePath();
			p.ellipse(50, 48, 14.5, 3.6, 0, 0, Math.PI * 2);
			p.ellipse(50, 43.5, 11.5, 2.7, 0, 0, Math.PI * 2);
			p.moveTo(37, 42);
			p.bezierCurveTo(32, 33, 38, 26, 50, 26);
			p.bezierCurveTo(62, 26, 68, 33, 63, 42);
			p.closePath();
			p.rect(47, 7, 6, 21);
			p.rect(41, 12.5, 18, 5.5);
			break;
		}
	}
	return p;
}

const pathCache = new Map<number, Path2D>();
const getPath = (type: number) => {
	let p = pathCache.get(type);
	if (!p) pathCache.set(type, (p = piecePath(type)));
	return p;
};

function gold(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
	const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
	g.addColorStop(0, '#fff2c0');
	g.addColorStop(0.45, '#e2b558');
	g.addColorStop(1, '#8a5f1e');
	ctx.fillStyle = g;
	ctx.beginPath();
	ctx.arc(x, y, r, 0, Math.PI * 2);
	ctx.fill();
}

/** Renders one carved piece into a square sprite `px` device pixels across. */
export function renderSprite(piece: number, px: number) {
	const canvas = document.createElement('canvas');
	canvas.width = px;
	canvas.height = px;
	const ctx = canvas.getContext('2d')!;
	const white = piece > 0;
	const type = Math.abs(piece);
	const k = px / 100;
	ctx.scale(k, k);
	const path = getPath(type);
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';
	ctx.lineWidth = 4.4;
	ctx.strokeStyle = white ? 'rgba(66,44,24,0.92)' : 'rgba(8,5,3,0.95)';
	ctx.stroke(path);

	const body = ctx.createLinearGradient(22, 0, 78, 0);
	if (white) {
		body.addColorStop(0, '#fffaf0');
		body.addColorStop(0.35, '#f1e6cc');
		body.addColorStop(0.75, '#d3c19c');
		body.addColorStop(1, '#a8916a');
	} else {
		body.addColorStop(0, '#6b5648');
		body.addColorStop(0.3, '#3d2f27');
		body.addColorStop(0.75, '#211814');
		body.addColorStop(1, '#0f0b09');
	}
	ctx.fillStyle = body;
	ctx.fill(path);

	ctx.save();
	ctx.globalCompositeOperation = 'source-atop';
	const vertical = ctx.createLinearGradient(0, 8, 0, 94);
	vertical.addColorStop(0, white ? 'rgba(255,255,255,0.22)' : 'rgba(255,220,170,0.14)');
	vertical.addColorStop(0.6, 'rgba(0,0,0,0)');
	vertical.addColorStop(1, white ? 'rgba(60,36,10,0.28)' : 'rgba(0,0,0,0.4)');
	ctx.fillStyle = vertical;
	ctx.fillRect(0, 0, 100, 100);
	const sheen = ctx.createRadialGradient(36, 30, 2, 36, 34, 30);
	sheen.addColorStop(0, white ? 'rgba(255,255,255,0.5)' : 'rgba(255,226,180,0.28)');
	sheen.addColorStop(1, 'rgba(255,255,255,0)');
	ctx.fillStyle = sheen;
	ctx.fillRect(0, 0, 100, 100);
	ctx.restore();

	const carve = white ? 'rgba(90,62,34,0.55)' : 'rgba(0,0,0,0.7)';
	const lift = white ? 'rgba(255,255,255,0.55)' : 'rgba(255,214,160,0.22)';
	const line = (draw: () => void, color: string, width: number) => {
		ctx.strokeStyle = color;
		ctx.lineWidth = width;
		ctx.beginPath();
		draw();
		ctx.stroke();
	};
	line(() => {
		ctx.moveTo(26, 84.5);
		ctx.lineTo(74, 84.5);
	}, carve, 1.3);
	if (type === 1) {
		line(() => ctx.ellipse(50, 57, 12, 3, 0, 0, Math.PI), carve, 1.2);
		line(() => ctx.arc(50, 44, 8.5, Math.PI * 1.1, Math.PI * 1.45), lift, 1.6);
	} else if (type === 2) {
		ctx.fillStyle = white ? '#3a2614' : '#e7cf9a';
		ctx.beginPath();
		ctx.ellipse(37, 29, 2.4, 1.8, -0.4, 0, Math.PI * 2);
		ctx.fill();
		ctx.beginPath();
		ctx.ellipse(25.5, 44, 1.6, 1.2, 0, 0, Math.PI * 2);
		ctx.fill();
		for (let i = 0; i < 6; i += 1) {
			const t = i / 5;
			line(
				() => {
					ctx.moveTo(52 + t * 12, 20 + t * 34);
					ctx.quadraticCurveTo(58 + t * 10, 24 + t * 34, 61 + t * 7, 26 + t * 36);
				},
				carve,
				1.1
			);
		}
		line(() => {
		ctx.moveTo(33, 50);
		ctx.quadraticCurveTo(40, 46, 46, 49);
	}, carve, 1.2);
		line(() => {
		ctx.moveTo(30, 24);
		ctx.quadraticCurveTo(36, 18, 44, 18);
	}, lift, 1.4);
	} else if (type === 3) {
		line(() => {
		ctx.moveTo(56, 27);
		ctx.lineTo(47, 39);
	}, white ? 'rgba(80,50,24,0.85)' : 'rgba(0,0,0,0.95)', 3);
		line(() => ctx.ellipse(50, 59, 13, 3, 0, 0, Math.PI), carve, 1.2);
		gold(ctx, 50, 15, 3.6);
	} else if (type === 4) {
		line(() => {
		ctx.moveTo(31, 45);
		ctx.lineTo(69, 45);
	}, carve, 1.2);
		for (const y of [57, 68])
			line(
				() => {
					ctx.moveTo(34, y);
					ctx.lineTo(66, y);
				},
				carve,
				0.9
			);
		for (const [x, y] of [
			[50, 62],
			[42, 73],
			[58, 73],
			[44, 52],
			[56, 52]
		])
			line(() => {
		ctx.moveTo(x, y - 5);
		ctx.lineTo(x, y);
	}, carve, 0.9);
	} else if (type === 5) {
		line(() => ctx.ellipse(50, 48, 13, 2.8, 0, 0, Math.PI), carve, 1.2);
		for (const [x, y, r] of [
			[29, 21, 3.4],
			[50, 13, 3.9],
			[71, 21, 3.4],
			[40.5, 31, 2.4],
			[59.5, 31, 2.4]
		])
			gold(ctx, x, y, r);
		line(() => {
		ctx.moveTo(38, 39);
		ctx.lineTo(62, 39);
	}, lift, 1.1);
	} else if (type === 6) {
		line(() => ctx.ellipse(50, 48, 13.5, 2.8, 0, 0, Math.PI), carve, 1.2);
		ctx.save();
		ctx.beginPath();
		ctx.rect(46.5, 6.5, 7, 22);
		ctx.rect(40.5, 12, 19, 6.5);
		ctx.clip();
		const g = ctx.createLinearGradient(40, 0, 60, 0);
		g.addColorStop(0, '#fff0bb');
		g.addColorStop(0.5, '#d9a84a');
		g.addColorStop(1, '#7c5418');
		ctx.fillStyle = g;
		ctx.fillRect(40, 6, 20, 23);
		ctx.restore();
		line(() => {
		ctx.moveTo(39, 36);
		ctx.quadraticCurveTo(50, 31, 61, 36);
	}, carve, 1.1);
	}
	return canvas;
}

// ── Renderer ─────────────────────────────────────────────────────────────

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

function bounceOut(t: number) {
	const n = 7.5625;
	const d = 2.75;
	if (t < 1 / d) return n * t * t;
	if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
	if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
	return n * (t -= 2.625 / d) * t + 0.984375;
}

export class BoardRenderer {
	motion = true;
	private ctx: CanvasRenderingContext2D;
	private dpr = 1;
	private width = 0;
	private height = 0;
	private size = 0;
	private frame = 0;
	private sq = 0;
	private ox = 0;
	private oy = 0;
	private texture: HTMLCanvasElement | null = null;
	private textureKey = '';
	private sprites = new Map<string, HTMLCanvasElement>();
	private slides: Slide[] = [];
	private fades: Fade[] = [];
	private rings: Ring[] = [];
	private particles: Particle[] = [];
	private promos: Array<{ sq: number; piece: number; start: number }> = [];
	private topple: { sq: number; start: number; dur: number; hit: boolean } | null = null;
	private lastNow = 0;
	onImpact: ((kind: 'topple') => void) | null = null;

	constructor(private canvas: HTMLCanvasElement) {
		this.ctx = canvas.getContext('2d')!;
	}

	get squarePx() {
		return this.sq;
	}

	resize(width: number, height: number) {
		this.dpr = Math.min(2, window.devicePixelRatio || 1);
		this.width = width;
		this.height = height;
		this.canvas.width = Math.round(width * this.dpr);
		this.canvas.height = Math.round(height * this.dpr);
		this.size = Math.min(width, height);
		this.frame = Math.max(10, Math.round(this.size * 0.045));
		this.sq = (this.size - this.frame * 2) / 8;
		this.ox = (width - this.size) / 2 + this.frame;
		this.oy = (height - this.size) / 2 + this.frame;
		this.textureKey = '';
		this.sprites.clear();
	}

	private colRow(sq: number, bottom: Side) {
		const f = sq & 7;
		const r = sq >> 4;
		return bottom === 'w' ? { col: f, row: 7 - r } : { col: 7 - f, row: r };
	}

	center(sq: number, bottom: Side): Point {
		const { col, row } = this.colRow(sq, bottom);
		return { x: this.ox + (col + 0.5) * this.sq, y: this.oy + (row + 0.5) * this.sq };
	}

	squareAt(x: number, y: number, bottom: Side) {
		const col = Math.floor((x - this.ox) / this.sq);
		const row = Math.floor((y - this.oy) / this.sq);
		if (col < 0 || col > 7 || row < 0 || row > 7) return -1;
		return bottom === 'w' ? (7 - row) * 16 + col : row * 16 + (7 - col);
	}

	private sprite(piece: number) {
		const px = Math.max(16, Math.round(this.sq * this.dpr));
		const key = `${piece}:${px}`;
		let s = this.sprites.get(key);
		if (!s) this.sprites.set(key, (s = renderSprite(piece, px)));
		return s;
	}

	private buildTexture(bottom: Side, coords: boolean) {
		const key = `${this.size}:${this.dpr}:${bottom}:${coords}`;
		if (key === this.textureKey && this.texture) return this.texture;
		const d = this.dpr;
		const S = Math.round(this.size * d);
		const c = this.texture ?? document.createElement('canvas');
		c.width = S;
		c.height = S;
		const ctx = c.getContext('2d')!;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, S, S);
		const F = this.frame * d;
		const inner = S - F * 2;

		const wood = ctx.createLinearGradient(0, 0, S, S);
		wood.addColorStop(0, '#5a3720');
		wood.addColorStop(0.5, '#3b2414');
		wood.addColorStop(1, '#24150b');
		ctx.fillStyle = wood;
		ctx.beginPath();
		ctx.roundRect(0, 0, S, S, F * 0.5);
		ctx.fill();
		ctx.save();
		ctx.globalAlpha = 0.18;
		for (let i = 0; i < 70; i += 1) {
			const y = hash2(i, 3) * S;
			ctx.strokeStyle = i % 2 ? '#1a0e06' : '#8a5a34';
			ctx.lineWidth = (0.5 + hash2(i, 9) * 1.5) * d;
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.bezierCurveTo(S * 0.3, y + (hash2(i, 5) - 0.5) * 30 * d, S * 0.7, y - (hash2(i, 6) - 0.5) * 30 * d, S, y);
			ctx.stroke();
		}
		ctx.restore();
		ctx.strokeStyle = 'rgba(255,220,160,0.25)';
		ctx.lineWidth = 1.2 * d;
		ctx.beginPath();
		ctx.roundRect(1 * d, 1 * d, S - 2 * d, S - 2 * d, F * 0.5);
		ctx.stroke();
		const bevel = ctx.createLinearGradient(0, 0, 0, S);
		bevel.addColorStop(0, 'rgba(255,230,190,0.16)');
		bevel.addColorStop(1, 'rgba(0,0,0,0.25)');
		ctx.fillStyle = bevel;
		ctx.fillRect(0, 0, S, S);

		ctx.fillStyle = '#1a0f07';
		ctx.fillRect(F - 3 * d, F - 3 * d, inner + 6 * d, inner + 6 * d);
		const inlay = ctx.createLinearGradient(F, F, F + inner, F + inner);
		inlay.addColorStop(0, '#f6d98e');
		inlay.addColorStop(0.5, '#b8873a');
		inlay.addColorStop(1, '#f0cf80');
		ctx.strokeStyle = inlay;
		ctx.lineWidth = 1.6 * d;
		ctx.strokeRect(F - 2.2 * d, F - 2.2 * d, inner + 4.4 * d, inner + 4.4 * d);
		ctx.strokeRect(F * 0.42, F * 0.42, S - F * 0.84, S - F * 0.84);

		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = 'high';
		ctx.drawImage(marble(), F, F, inner, inner);
		const cell = inner / 8;
		ctx.strokeStyle = 'rgba(30,22,14,0.35)';
		ctx.lineWidth = Math.max(1, 0.8 * d);
		for (let i = 1; i < 8; i += 1) {
			ctx.beginPath();
			ctx.moveTo(F + i * cell, F);
			ctx.lineTo(F + i * cell, F + inner);
			ctx.moveTo(F, F + i * cell);
			ctx.lineTo(F + inner, F + i * cell);
			ctx.stroke();
		}
		const shade = ctx.createRadialGradient(F + inner * 0.35, F + inner * 0.3, inner * 0.1, F + inner / 2, F + inner / 2, inner * 0.78);
		shade.addColorStop(0, 'rgba(255,236,200,0.08)');
		shade.addColorStop(0.7, 'rgba(0,0,0,0)');
		shade.addColorStop(1, 'rgba(0,0,0,0.3)');
		ctx.fillStyle = shade;
		ctx.fillRect(F, F, inner, inner);

		if (coords) {
			ctx.fillStyle = 'rgba(244,218,160,0.82)';
			ctx.font = `600 ${Math.round(F * 0.56)}px 'Cormorant Garamond', Georgia, serif`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			for (let i = 0; i < 8; i += 1) {
				const file = bottom === 'w' ? 'abcdefgh'[i] : 'hgfedcba'[i];
				const rank = bottom === 'w' ? String(8 - i) : String(i + 1);
				ctx.fillText(file, F + (i + 0.5) * cell, S - F / 2);
				ctx.fillText(rank, F / 2, F + (i + 0.5) * cell);
			}
		}
		this.texture = c;
		this.textureKey = key;
		return c;
	}

	snap() {
		this.slides = [];
		this.fades = [];
		this.promos = [];
		this.rings = [];
		this.particles = [];
		this.topple = null;
	}

	/** Animates a move that has just been applied to the displayed board. */
	move(record: MoveRecord, bottom: Side, reduced: boolean, now = performance.now()) {
		this.slides = [];
		this.fades = [];
		this.promos = [];
		this.topple = null;
		if (!this.motion || reduced) return;
		const a = this.center(record.from, bottom);
		const b = this.center(record.to, bottom);
		const dist = Math.hypot(b.x - a.x, b.y - a.y) / Math.max(1, this.sq);
		const dur = Math.min(380, 200 + dist * 32);
		this.slides.push({ piece: record.piece, from: record.from, to: record.to, start: now, dur });
		if (record.castle) {
			const kingside = (record.to & 7) === 6;
			const rookFrom = kingside ? record.to + 1 : record.to - 2;
			const rookTo = kingside ? record.to - 1 : record.to + 1;
			this.slides.push({ piece: record.piece > 0 ? 4 : -4, from: rookFrom, to: rookTo, start: now + 90, dur: dur + 40 });
			this.dust(rookTo, bottom, now + dur + 130, 8);
			this.dust(record.to, bottom, now + dur, 8);
		}
		if (record.captured) {
			this.fades.push({ piece: record.captured, sq: record.capturedAt, start: now + dur * 0.85, dur: 420 });
			this.shatter(record.capturedAt, record.captured, bottom, now + dur * 0.85);
		}
		if (record.promo) {
			this.promos.push({ sq: record.to, piece: record.piece, start: now + dur });
			this.rings.push({ sq: record.to, start: now + dur, dur: 900, color: '255,214,120', reach: 1.6 });
			const c = this.center(record.to, bottom);
			for (let i = 0; i < 18; i += 1) {
				const ang = (i / 18) * Math.PI * 2;
				this.particles.push({
					x: c.x,
					y: c.y,
					vx: Math.cos(ang) * this.sq * 0.6,
					vy: Math.sin(ang) * this.sq * 0.4 - this.sq * 1.2,
					life: 1100,
					born: now + dur,
					size: this.sq * 0.05,
					color: '255,224,150',
					spin: 0,
					kind: 'spark'
				});
			}
		}
	}

	/** A king falls on mate or resignation. */
	fall(sq: number, reduced: boolean, delay = 450, now = performance.now()) {
		this.topple = !this.motion || reduced ? null : { sq, start: now + delay, dur: 1100, hit: false };
	}

	private dust(sq: number, bottom: Side, at: number, n: number) {
		const c = this.center(sq, bottom);
		for (let i = 0; i < n; i += 1) {
			const ang = Math.PI + (i / (n - 1)) * Math.PI;
			this.particles.push({
				x: c.x + Math.cos(ang) * this.sq * 0.25,
				y: c.y + this.sq * 0.38,
				vx: Math.cos(ang) * this.sq * 0.5,
				vy: -Math.abs(Math.sin(ang)) * this.sq * 0.15,
				life: 650,
				born: at,
				size: this.sq * (0.06 + Math.random() * 0.05),
				color: '210,196,170',
				spin: 0,
				kind: 'dust'
			});
		}
	}

	private shatter(sq: number, piece: number, bottom: Side, at: number) {
		const c = this.center(sq, bottom);
		const color = piece > 0 ? '236,224,196' : '52,40,32';
		for (let i = 0; i < 16; i += 1) {
			const ang = Math.random() * Math.PI * 2;
			const speed = this.sq * (0.8 + Math.random() * 1.6);
			this.particles.push({
				x: c.x + (Math.random() - 0.5) * this.sq * 0.3,
				y: c.y + (Math.random() - 0.3) * this.sq * 0.4,
				vx: Math.cos(ang) * speed,
				vy: Math.sin(ang) * speed * 0.6 - this.sq * 1.4,
				life: 700 + Math.random() * 300,
				born: at,
				size: this.sq * (0.04 + Math.random() * 0.06),
				color,
				spin: (Math.random() - 0.5) * 12,
				kind: 'shard'
			});
		}
		this.rings.push({ sq, start: at, dur: 520, color: '255,240,210', reach: 0.9 });
		this.dust(sq, bottom, at, 6);
	}

	busy(now: number) {
		return (
			this.slides.some((s) => now < s.start + s.dur) ||
			this.fades.some((f) => now < f.start + f.dur) ||
			this.promos.some((p) => now < p.start + 500) ||
			this.rings.some((r) => now < r.start + r.dur) ||
			this.particles.length > 0 ||
			(this.topple !== null && now < this.topple.start + this.topple.dur + 100)
		);
	}

	draw(now: number, view: BoardView) {
		const ctx = this.ctx;
		const d = this.dpr;
		const dt = Math.min(0.05, Math.max(0, (now - this.lastNow) / 1000));
		this.lastNow = now;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		if (!this.size) return;
		ctx.setTransform(d, 0, 0, d, 0, 0);
		const bx = this.ox - this.frame;
		const by = this.oy - this.frame;
		ctx.save();
		ctx.shadowColor = 'rgba(0,0,0,0.6)';
		ctx.shadowBlur = this.size * 0.05;
		ctx.shadowOffsetY = this.size * 0.02;
		ctx.drawImage(this.buildTexture(view.bottom, view.coords), bx, by, this.size, this.size);
		ctx.restore();
		const sq = this.sq;
		const corner = (s: number) => {
			const c = this.center(s, view.bottom);
			return { x: c.x - sq / 2, y: c.y - sq / 2 };
		};

		if (view.last) {
			for (const s of [view.last.from, view.last.to]) {
				const p = corner(s);
				ctx.fillStyle = 'rgba(232,186,92,0.3)';
				ctx.fillRect(p.x, p.y, sq, sq);
			}
		}
		if (view.selected >= 0) {
			const p = corner(view.selected);
			const g = ctx.createRadialGradient(p.x + sq / 2, p.y + sq / 2, sq * 0.1, p.x + sq / 2, p.y + sq / 2, sq * 0.72);
			g.addColorStop(0, 'rgba(255,224,150,0.55)');
			g.addColorStop(1, 'rgba(255,200,110,0.18)');
			ctx.fillStyle = g;
			ctx.fillRect(p.x, p.y, sq, sq);
		}
		if (view.check >= 0) {
			const c = this.center(view.check, view.bottom);
			const pulse = this.motion ? 0.75 + Math.sin(now / 180) * 0.25 : 1;
			const g = ctx.createRadialGradient(c.x, c.y, sq * 0.05, c.x, c.y, sq * 0.62);
			g.addColorStop(0, `rgba(255,70,40,${0.75 * pulse})`);
			g.addColorStop(0.55, `rgba(200,30,20,${0.4 * pulse})`);
			g.addColorStop(1, 'rgba(160,20,10,0)');
			ctx.fillStyle = g;
			ctx.fillRect(c.x - sq / 2, c.y - sq / 2, sq, sq);
		}
		if (view.fallen) {
			const c = this.center(view.fallen.winner, view.bottom);
			const pulse = this.motion ? 0.8 + Math.sin(now / 420) * 0.2 : 1;
			const g = ctx.createRadialGradient(c.x, c.y, sq * 0.05, c.x, c.y, sq * 0.75);
			g.addColorStop(0, `rgba(255,220,130,${0.6 * pulse})`);
			g.addColorStop(1, 'rgba(255,200,100,0)');
			ctx.fillStyle = g;
			ctx.fillRect(c.x - sq * 0.75, c.y - sq * 0.75, sq * 1.5, sq * 1.5);
		}
		if (view.hover >= 0 && view.targets.includes(view.hover)) {
			const p = corner(view.hover);
			ctx.fillStyle = 'rgba(255,236,190,0.16)';
			ctx.fillRect(p.x, p.y, sq, sq);
		}
		if (view.hints) {
			for (const t of view.targets) {
				const c = this.center(t, view.bottom);
				if (view.board[t] || this.isEpTarget(view, t)) {
					ctx.strokeStyle = 'rgba(214,168,74,0.75)';
					ctx.lineWidth = sq * 0.07;
					ctx.beginPath();
					ctx.arc(c.x, c.y, sq * 0.44, 0, Math.PI * 2);
					ctx.stroke();
				} else {
					const dark = ((t >> 4) + (t & 7)) % 2 === 0;
					ctx.fillStyle = dark ? 'rgba(240,214,150,0.42)' : 'rgba(28,20,10,0.38)';
					ctx.beginPath();
					ctx.arc(c.x, c.y, sq * 0.14, 0, Math.PI * 2);
					ctx.fill();
					ctx.strokeStyle = 'rgba(230,190,100,0.55)';
					ctx.lineWidth = Math.max(1, sq * 0.025);
					ctx.stroke();
				}
			}
		}

		const slidingTo = new Set<number>();
		for (const s of this.slides) if (now < s.start + s.dur) slidingTo.add(s.to);
		const promoting = new Map<number, { piece: number; t: number }>();
		for (const p of this.promos) {
			const t = (now - p.start) / 500;
			if (t < 1) promoting.set(p.sq, { piece: p.piece, t: clamp01(t) });
		}

		for (const f of this.fades) {
			const t = (now - f.start) / f.dur;
			if (t >= 1) continue;
			const c = this.center(f.sq, view.bottom);
			const k = clamp01(t);
			ctx.save();
			ctx.globalAlpha = 1 - k;
			ctx.translate(c.x, c.y + sq * 0.42);
			ctx.rotate((f.piece > 0 ? 1 : -1) * k * 0.4);
			ctx.scale(1 + k * 0.15, 1 + k * 0.15);
			ctx.drawImage(this.sprite(f.piece), -sq / 2, -sq * 0.92, sq, sq);
			ctx.restore();
		}

		const drawPiece = (piece: number, x: number, y: number, lift = 0, alpha = 1) => {
			ctx.save();
			ctx.globalAlpha = alpha;
			const shadow = ctx.createRadialGradient(x + sq * 0.05 + lift * sq * 0.1, y + sq * 0.4, 1, x + sq * 0.05, y + sq * 0.4, sq * (0.34 + lift * 0.1));
			shadow.addColorStop(0, `rgba(0,0,0,${0.42 - lift * 0.15})`);
			shadow.addColorStop(1, 'rgba(0,0,0,0)');
			ctx.fillStyle = shadow;
			ctx.beginPath();
			ctx.ellipse(x + sq * 0.05 + lift * sq * 0.1, y + sq * 0.4, sq * (0.36 + lift * 0.08), sq * 0.12, 0, 0, Math.PI * 2);
			ctx.fill();
			const scale = 1 + lift * 0.08;
			ctx.drawImage(this.sprite(piece), x - (sq * scale) / 2, y - sq * 0.5 * scale - lift * sq * 0.12, sq * scale, sq * scale);
			ctx.restore();
		};

		for (let r = 0; r < 8; r += 1) {
			for (let f = 0; f < 8; f += 1) {
				const rowRank = view.bottom === 'w' ? 7 - r : r;
				const file = view.bottom === 'w' ? f : 7 - f;
				const s = rowRank * 16 + file;
				const piece = view.board[s];
				if (!piece) continue;
				if (slidingTo.has(s)) continue;
				if (view.drag && view.drag.sq === s) {
					const c = this.center(s, view.bottom);
					drawPiece(piece, c.x, c.y, 0, 0.3);
					continue;
				}
				if (view.fallen && view.fallen.sq === s) continue;
				const c = this.center(s, view.bottom);
				const promo = promoting.get(s);
				if (promo) {
					drawPiece(promo.piece, c.x, c.y, 0, 1 - promo.t);
					drawPiece(piece, c.x, c.y, 0, promo.t);
				} else drawPiece(piece, c.x, c.y);
			}
		}

		for (const s of this.slides) {
			const t = (now - s.start) / s.dur;
			if (t >= 1) continue;
			const k = easeInOut(clamp01(t));
			const a = this.center(s.from, view.bottom);
			const b = this.center(s.to, view.bottom);
			const lift = Math.sin(clamp01(t) * Math.PI) * 0.8;
			drawPiece(s.piece, a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, lift);
		}

		const fallenSq = view.fallen?.sq ?? -1;
		if (fallenSq >= 0 && view.board[fallenSq]) {
			const piece = view.board[fallenSq];
			const c = this.center(fallenSq, view.bottom);
			let angle = 1.38;
			if (this.topple && this.topple.sq === fallenSq) {
				const t = clamp01((now - this.topple.start) / this.topple.dur);
				angle = 1.38 * bounceOut(t);
				if (t >= 0.36 && !this.topple.hit) {
					this.topple.hit = true;
					this.rings.push({ sq: fallenSq, start: now, dur: 700, color: '255,200,150', reach: 1.4 });
					this.dust(fallenSq, view.bottom, now, 12);
					this.onImpact?.('topple');
				}
			}
			const dir = piece > 0 ? 1 : -1;
			ctx.save();
			const pivotX = c.x + dir * sq * 0.28;
			const pivotY = c.y + sq * 0.42;
			const shadow = ctx.createRadialGradient(c.x + dir * sq * 0.3 * (angle / 1.38), pivotY, 1, c.x + dir * sq * 0.3, pivotY, sq * 0.6);
			shadow.addColorStop(0, 'rgba(0,0,0,0.4)');
			shadow.addColorStop(1, 'rgba(0,0,0,0)');
			ctx.fillStyle = shadow;
			ctx.beginPath();
			ctx.ellipse(c.x + dir * sq * 0.35 * (angle / 1.38), pivotY - sq * 0.02, sq * (0.36 + 0.3 * (angle / 1.38)), sq * 0.14, 0, 0, Math.PI * 2);
			ctx.fill();
			ctx.translate(pivotX, pivotY);
			ctx.rotate(dir * angle);
			ctx.drawImage(this.sprite(piece), -sq / 2 - dir * sq * 0.28, -sq * 0.92, sq, sq);
			ctx.restore();
		}

		for (const ring of this.rings) {
			const t = (now - ring.start) / ring.dur;
			if (t < 0 || t >= 1) continue;
			const c = this.center(ring.sq, view.bottom);
			ctx.strokeStyle = `rgba(${ring.color},${(1 - t) * 0.7})`;
			ctx.lineWidth = sq * 0.06 * (1 - t);
			ctx.beginPath();
			ctx.ellipse(c.x, c.y + sq * 0.3, sq * ring.reach * (0.2 + t * 0.8), sq * ring.reach * (0.07 + t * 0.3), 0, 0, Math.PI * 2);
			ctx.stroke();
		}
		this.rings = this.rings.filter((r) => now < r.start + r.dur);

		for (const p of this.particles) {
			const age = now - p.born;
			if (age < 0) continue;
			const t = age / p.life;
			if (t >= 1) continue;
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			if (p.kind === 'shard') p.vy += this.sq * 5.5 * dt;
			else if (p.kind === 'spark') p.vy += this.sq * 0.6 * dt;
			else {
				p.vx *= 0.94;
				p.vy *= 0.94;
			}
			ctx.save();
			ctx.globalAlpha = p.kind === 'dust' ? (1 - t) * 0.45 : 1 - t * t;
			if (p.kind === 'shard') {
				ctx.translate(p.x, p.y);
				ctx.rotate(age * 0.001 * p.spin);
				ctx.fillStyle = `rgb(${p.color})`;
				ctx.beginPath();
				ctx.moveTo(-p.size, -p.size * 0.4);
				ctx.lineTo(p.size * 0.8, -p.size * 0.7);
				ctx.lineTo(p.size * 0.3, p.size * 0.8);
				ctx.closePath();
				ctx.fill();
			} else if (p.kind === 'spark') {
				const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
				g.addColorStop(0, `rgba(${p.color},1)`);
				g.addColorStop(1, `rgba(${p.color},0)`);
				ctx.fillStyle = g;
				ctx.fillRect(p.x - p.size * 3, p.y - p.size * 3, p.size * 6, p.size * 6);
			} else {
				ctx.fillStyle = `rgb(${p.color})`;
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.size * (1 + t * 1.5), 0, Math.PI * 2);
				ctx.fill();
			}
			ctx.restore();
		}
		this.particles = this.particles.filter((p) => now < p.born + p.life);

		if (view.mark) {
			const c = this.center(view.mark.sq, view.bottom);
			const style = MARK_STYLE[view.mark.kind];
			const r = sq * 0.19;
			const x = c.x + sq / 2 - r * 0.7;
			const y = c.y - sq / 2 + r * 0.7;
			ctx.save();
			ctx.shadowColor = 'rgba(0,0,0,0.5)';
			ctx.shadowBlur = 4;
			ctx.fillStyle = style.fill;
			ctx.beginPath();
			ctx.arc(x, y, r, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
			ctx.strokeStyle = 'rgba(255,255,255,0.85)';
			ctx.lineWidth = Math.max(1, r * 0.12);
			ctx.stroke();
			ctx.fillStyle = '#fff';
			if (view.mark.kind === 'book') {
				ctx.beginPath();
				ctx.moveTo(x, y - r * 0.35);
				ctx.lineTo(x - r * 0.55, y - r * 0.5);
				ctx.lineTo(x - r * 0.55, y + r * 0.4);
				ctx.lineTo(x, y + r * 0.55);
				ctx.lineTo(x + r * 0.55, y + r * 0.4);
				ctx.lineTo(x + r * 0.55, y - r * 0.5);
				ctx.closePath();
				ctx.fill();
				ctx.strokeStyle = style.fill;
				ctx.lineWidth = Math.max(1, r * 0.1);
				ctx.beginPath();
				ctx.moveTo(x, y - r * 0.35);
				ctx.lineTo(x, y + r * 0.55);
				ctx.stroke();
			} else {
				ctx.font = `700 ${Math.round(r * (style.text.length > 1 ? 0.95 : 1.2))}px system-ui, sans-serif`;
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				ctx.fillText(style.text, x, y + r * 0.06);
			}
		}

		if (view.cursor >= 0) {
			const p = corner(view.cursor);
			ctx.strokeStyle = 'rgba(255,222,150,0.95)';
			ctx.lineWidth = Math.max(2, sq * 0.05);
			ctx.setLineDash([sq * 0.16, sq * 0.1]);
			ctx.strokeRect(p.x + sq * 0.05, p.y + sq * 0.05, sq * 0.9, sq * 0.9);
			ctx.setLineDash([]);
		}

		if (view.drag) {
			const piece = view.board[view.drag.sq];
			if (piece) {
				const over = this.squareAt(view.drag.x, view.drag.y, view.bottom);
				if (over >= 0 && view.targets.includes(over)) {
					const p = corner(over);
					ctx.strokeStyle = 'rgba(255,226,160,0.8)';
					ctx.lineWidth = sq * 0.05;
					ctx.strokeRect(p.x + sq * 0.03, p.y + sq * 0.03, sq * 0.94, sq * 0.94);
				}
				drawPiece(piece, view.drag.x, view.drag.y - sq * 0.1, 1);
			}
		}

		const flicker = this.motion ? Math.sin(now / 130) * 0.5 + Math.sin(now / 57 + 1.3) * 0.3 + Math.sin(now / 331) * 0.2 : 0;
		const glow = ctx.createRadialGradient(bx + this.size * 0.2, by - this.size * 0.15, 0, bx + this.size * 0.2, by - this.size * 0.15, this.size * 1.1);
		glow.addColorStop(0, `rgba(255,190,110,${0.1 + flicker * 0.025})`);
		glow.addColorStop(1, 'rgba(255,190,110,0)');
		ctx.fillStyle = glow;
		ctx.fillRect(bx, by, this.size, this.size);

		if (this.topple && now > this.topple.start + this.topple.dur + 200) this.topple = null;
	}

	private isEpTarget(view: BoardView, t: number) {
		if (view.selected < 0) return false;
		const piece = view.board[view.selected];
		return Math.abs(piece) === 1 && (t & 7) !== (view.selected & 7) && !view.board[t];
	}
}
