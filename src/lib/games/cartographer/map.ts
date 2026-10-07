import type { Chart } from './types';

export type Terrain = 'deep' | 'sea' | 'shoal' | 'beach' | 'plain' | 'forest' | 'hill' | 'peak';

export type Glyph =
	| 'serpent'
	| 'whale'
	| 'ship'
	| 'waves'
	| 'fish'
	| 'rocks'
	| 'rose'
	| 'lighthouse'
	| 'port'
	| 'village'
	| 'windmill'
	| 'wheat'
	| 'trees'
	| 'pines'
	| 'hills'
	| 'mine'
	| 'peaks'
	| 'castle'
	| 'dragon'
	| 'treasure'
	| 'tower'
	| 'tents';

export type ChartMap = {
	n: number;
	/** Samples per box side. */
	res: number;
	/** (n*res+1)² heights; 0 is the shoreline, land rises to 1, sea sinks to -1. */
	field: Float32Array;
	wet: Float32Array;
	terrain: Terrain[];
	glyph: Glyph[];
	/** Per box: a small tilt and mirror so repeated glyphs don't stamp. */
	tilt: Float32Array;
	mirror: boolean[];
};

const RES = 8;
const SEA_SHARE: Record<Chart, number> = { isle: 0.52, coast: 0.46, realm: 0.34 };

export function mulberry32(seed: number) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function makeNoise(seed: number) {
	const hash = (x: number, y: number) => {
		let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 2246822519);
		h = Math.imul(h ^ (h >>> 13), 1274126177);
		return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
	};
	const smooth = (t: number) => t * t * (3 - 2 * t);
	const value = (x: number, y: number) => {
		const xi = Math.floor(x);
		const yi = Math.floor(y);
		const fx = smooth(x - xi);
		const fy = smooth(y - yi);
		const a = hash(xi, yi);
		const b = hash(xi + 1, yi);
		const c = hash(xi, yi + 1);
		const d = hash(xi + 1, yi + 1);
		return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
	};
	return (x: number, y: number, octaves = 4) => {
		let sum = 0;
		let amp = 0.5;
		let freq = 1;
		for (let o = 0; o < octaves; o += 1) {
			sum += amp * (value(x * freq, y * freq) * 2 - 1);
			freq *= 2.03;
			amp *= 0.5;
		}
		return sum;
	};
}

export function createMap(n: number, chart: Chart, seed: number): ChartMap {
	const rng = mulberry32(seed ^ 0x9e3779b9);
	const lift = makeNoise(seed);
	const damp = makeNoise(seed ^ 0x51ed27);
	const side = n * RES + 1;
	const raw = new Float32Array(side * side);
	const wet = new Float32Array(side * side);
	const cx = 0.5 + (rng() - 0.5) * 0.2;
	const cy = 0.5 + (rng() - 0.5) * 0.2;
	const angle = rng() * Math.PI * 2;
	const dx = Math.cos(angle);
	const dy = Math.sin(angle);
	const scale = 2.2 + n * 0.12;

	for (let j = 0; j < side; j += 1) {
		for (let i = 0; i < side; i += 1) {
			const u = i / (side - 1);
			const v = j / (side - 1);
			const d = Math.hypot(u - cx, v - cy);
			const f = lift(u * scale + 11.3, v * scale + 4.7, 5);
			let h: number;
			if (chart === 'isle') h = f * 0.55 + 0.62 - d * 1.5;
			else if (chart === 'coast') h = f * 0.7 + ((u - 0.5) * dx + (v - 0.5) * dy) * 1.4;
			else h = f * 0.85 + 0.5 - d * 0.9;
			raw[j * side + i] = h;
			wet[j * side + i] = damp(u * 3.1 + 2.1, v * 3.1 + 7.9, 3);
		}
	}

	const sorted = Float32Array.from(raw).sort();
	const sea = sorted[Math.floor(sorted.length * SEA_SHARE[chart])];
	const top = sorted[sorted.length - 1] - sea || 1;
	const bottom = sea - sorted[0] || 1;
	const field = new Float32Array(side * side);
	for (let k = 0; k < raw.length; k += 1) {
		const h = raw[k] - sea;
		field[k] = h >= 0 ? h / top : h / bottom;
	}

	const terrain: Terrain[] = [];
	const heights: number[] = [];
	for (let r = 0; r < n; r += 1) {
		for (let c = 0; c < n; c += 1) {
			let sum = 0;
			let count = 0;
			let wetSum = 0;
			let seaBits = 0;
			let landBits = 0;
			for (let y = 0; y <= RES; y += 2) {
				for (let x = 0; x <= RES; x += 2) {
					const k = (r * RES + y) * side + c * RES + x;
					sum += field[k];
					wetSum += wet[k];
					count += 1;
					if (field[k] < 0) seaBits += 1;
					else landBits += 1;
				}
			}
			const h = sum / count;
			const w = wetSum / count;
			heights.push(h);
			let t: Terrain;
			if (h < -0.4) t = 'deep';
			else if (h < -0.12) t = 'sea';
			else if (h < 0 || landBits < count * 0.35) t = 'shoal';
			else if (seaBits > 0 && h < 0.3) t = 'beach';
			else if (h > 0.62) t = 'peak';
			else if (h > 0.4) t = 'hill';
			else if (w > 0.04) t = 'forest';
			else t = 'plain';
			terrain.push(t);
		}
	}

	const glyph = terrain.map((t) => pick(t, rng));
	const boxes = terrain.map((_, i) => i);
	const deepest = boxes.filter((i) => terrain[i] === 'deep' || terrain[i] === 'sea').sort((a, b) => heights[a] - heights[b]);
	if (deepest.length >= 3) glyph[deepest[0]] = 'serpent';
	if (deepest.length >= 6) glyph[deepest[Math.floor(deepest.length / 2)]] = 'rose';
	const land = boxes.filter((i) => heights[i] >= 0 && terrain[i] !== 'shoal');
	const crown = land.filter((i) => terrain[i] === 'hill' || terrain[i] === 'plain').sort((a, b) => heights[b] - heights[a]);
	if (crown.length) glyph[crown[0]] = 'castle';
	const peaks = land.filter((i) => terrain[i] === 'peak').sort((a, b) => heights[b] - heights[a]);
	if (n >= 6 && peaks.length >= 2) glyph[peaks[0]] = 'dragon';
	const shore = land.filter((i) => terrain[i] === 'beach');
	if (shore.length) glyph[shore[Math.floor(rng() * shore.length)]] = 'lighthouse';
	const hoard = land.filter((i) => glyph[i] !== 'castle' && glyph[i] !== 'dragon' && glyph[i] !== 'lighthouse');
	if (hoard.length) glyph[hoard[Math.floor(rng() * hoard.length)]] = 'treasure';

	const tilt = new Float32Array(n * n);
	const mirror: boolean[] = [];
	for (let i = 0; i < n * n; i += 1) {
		tilt[i] = (rng() - 0.5) * 0.16;
		mirror.push(rng() < 0.5);
	}
	return { n, res: RES, field, wet, terrain, glyph, tilt, mirror };
}

const POOL: Record<Terrain, [Glyph, number][]> = {
	deep: [['whale', 3], ['ship', 3], ['waves', 3], ['serpent', 0.4]],
	sea: [['ship', 4], ['waves', 3], ['fish', 2], ['whale', 1]],
	shoal: [['waves', 3], ['rocks', 2], ['fish', 2], ['ship', 1]],
	beach: [['port', 3], ['lighthouse', 1], ['tents', 1], ['village', 1]],
	plain: [['village', 3], ['windmill', 3], ['wheat', 3], ['tents', 1]],
	forest: [['trees', 4], ['pines', 3], ['tower', 1]],
	hill: [['hills', 4], ['mine', 2], ['tower', 2]],
	peak: [['peaks', 1]]
};

function pick(t: Terrain, rng: () => number): Glyph {
	const pool = POOL[t];
	let total = 0;
	for (const [, w] of pool) total += w;
	let roll = rng() * total;
	for (const [g, w] of pool) {
		roll -= w;
		if (roll <= 0) return g;
	}
	return pool[0][0];
}

const RAMP: [number, [number, number, number]][] = [
	[-1, [92, 128, 138]],
	[-0.45, [124, 158, 160]],
	[-0.12, [158, 189, 182]],
	[-0.001, [190, 209, 190]],
	[0, [226, 207, 160]],
	[0.08, [214, 206, 150]],
	[0.3, [196, 199, 136]],
	[0.5, [196, 174, 124]],
	[0.7, [170, 152, 128]],
	[1, [214, 206, 196]]
];

function ramp(h: number): [number, number, number] {
	for (let i = 1; i < RAMP.length; i += 1) {
		if (h <= RAMP[i][0]) {
			const [h0, a] = RAMP[i - 1];
			const [h1, b] = RAMP[i];
			const t = h1 === h0 ? 0 : (h - h0) / (h1 - h0);
			return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
		}
	}
	return RAMP[RAMP.length - 1][1];
}

/** Paints the whole hidden chart, `px` device pixels per box, into a fresh canvas. */
export function paintChart(map: ChartMap, px: number): HTMLCanvasElement {
	const { n, res, field, wet } = map;
	const side = n * res + 1;
	const small = document.createElement('canvas');
	small.width = side;
	small.height = side;
	const sctx = small.getContext('2d')!;
	const image = sctx.createImageData(side, side);
	const grain = mulberry32(side * 7919);
	for (let k = 0; k < field.length; k += 1) {
		const h = field[k];
		let [r, g, b] = ramp(h);
		if (h > 0.05 && h < 0.55 && wet[k] > 0) {
			const f = Math.min(1, wet[k] * 4) * 0.6;
			r += (138 - r) * f;
			g += (162 - g) * f;
			b += (108 - b) * f;
		}
		const speck = (grain() - 0.5) * 10;
		image.data[k * 4] = r + speck;
		image.data[k * 4 + 1] = g + speck;
		image.data[k * 4 + 2] = b + speck;
		image.data[k * 4 + 3] = 255;
	}
	sctx.putImageData(image, 0, 0);

	const size = Math.round(n * px);
	const out = document.createElement('canvas');
	out.width = size;
	out.height = size;
	const ctx = out.getContext('2d')!;
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = 'high';
	const step = size / (side - 1);
	ctx.drawImage(small, -step / 2, -step / 2, size + step, size + step);

	const contours: [number, string, number][] = [
		[-0.34, 'rgba(60, 84, 92, 0.22)', 0.7],
		[-0.2, 'rgba(60, 84, 92, 0.3)', 0.8],
		[-0.09, 'rgba(60, 84, 92, 0.42)', 0.9],
		[0.0, 'rgba(70, 48, 26, 0.85)', 1.6],
		[0.45, 'rgba(110, 82, 52, 0.22)', 0.7]
	];
	ctx.lineCap = 'round';
	for (const [level, colour, width] of contours) {
		ctx.strokeStyle = colour;
		ctx.lineWidth = Math.max(0.6, width * (px / 60));
		ctx.beginPath();
		trace(field, side, level, step, ctx);
		ctx.stroke();
	}
	return out;
}

function trace(field: Float32Array, side: number, level: number, step: number, ctx: CanvasRenderingContext2D) {
	const at = (i: number, j: number) => field[j * side + i] - level;
	const lerp = (a: number, b: number) => a / (a - b);
	for (let j = 0; j < side - 1; j += 1) {
		for (let i = 0; i < side - 1; i += 1) {
			const a = at(i, j);
			const b = at(i + 1, j);
			const c = at(i + 1, j + 1);
			const d = at(i, j + 1);
			const pts: number[] = [];
			if (a < 0 !== b < 0) pts.push(i + lerp(a, b), j);
			if (b < 0 !== c < 0) pts.push(i + 1, j + lerp(b, c));
			if (c < 0 !== d < 0) pts.push(i + 1 - lerp(c, d), j + 1);
			if (d < 0 !== a < 0) pts.push(i, j + 1 - lerp(d, a));
			for (let p = 0; p + 3 < pts.length; p += 4) {
				ctx.moveTo(pts[p] * step, pts[p + 1] * step);
				ctx.lineTo(pts[p + 2] * step, pts[p + 3] * step);
			}
		}
	}
}

const PAPER = 'rgba(241, 228, 196, 0.92)';

/** Draws a box's glyph in `ink`, centred on (cx, cy) inside a box `s` pixels wide. */
export function drawGlyph(
	ctx: CanvasRenderingContext2D,
	glyph: Glyph,
	cx: number,
	cy: number,
	s: number,
	ink: string,
	tilt = 0,
	mirror = false
) {
	const u = s / 100;
	ctx.save();
	ctx.translate(cx, cy);
	ctx.rotate(tilt);
	ctx.scale(mirror ? -u : u, u);
	ctx.strokeStyle = ink;
	ctx.fillStyle = ink;
	ctx.lineWidth = Math.max(2.6, 1.1 / u);
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	GLYPHS[glyph](ctx);
	ctx.restore();
}

type Pen = (ctx: CanvasRenderingContext2D) => void;

const paper = (ctx: CanvasRenderingContext2D) => {
	const ink = ctx.fillStyle;
	ctx.fillStyle = PAPER;
	ctx.fill();
	ctx.fillStyle = ink;
	ctx.stroke();
};

const wave = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number) => {
	ctx.moveTo(x - w, y);
	ctx.quadraticCurveTo(x - w / 2, y - w * 0.55, x, y);
	ctx.quadraticCurveTo(x + w / 2, y - w * 0.55, x + w, y);
};

const house = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
	ctx.beginPath();
	ctx.moveTo(x - w / 2, y);
	ctx.lineTo(x - w / 2, y - h);
	ctx.lineTo(x, y - h - w * 0.55);
	ctx.lineTo(x + w / 2, y - h);
	ctx.lineTo(x + w / 2, y);
	ctx.closePath();
	paper(ctx);
	ctx.beginPath();
	ctx.moveTo(x - w / 2, y - h);
	ctx.lineTo(x + w / 2, y - h);
	ctx.stroke();
};

const conifer = (ctx: CanvasRenderingContext2D, x: number, y: number, h: number) => {
	ctx.beginPath();
	ctx.moveTo(x, y - h);
	ctx.lineTo(x + h * 0.32, y - h * 0.2);
	ctx.lineTo(x - h * 0.32, y - h * 0.2);
	ctx.closePath();
	paper(ctx);
	ctx.beginPath();
	ctx.moveTo(x, y - h * 0.2);
	ctx.lineTo(x, y);
	ctx.stroke();
};

const broadleaf = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
	ctx.beginPath();
	ctx.moveTo(x, y);
	ctx.lineTo(x, y - r * 0.9);
	ctx.stroke();
	ctx.beginPath();
	ctx.arc(x, y - r * 1.6, r, 0, Math.PI * 2);
	paper(ctx);
	ctx.beginPath();
	ctx.arc(x + r * 0.25, y - r * 1.5, r * 0.5, 0.2, 1.6);
	ctx.stroke();
};

const mountain = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
	ctx.beginPath();
	ctx.moveTo(x - w, y);
	ctx.lineTo(x - w * 0.15, y - h);
	ctx.lineTo(x, y - h * 0.92);
	ctx.lineTo(x + w * 0.1, y - h * 1.02);
	ctx.lineTo(x + w, y);
	ctx.closePath();
	paper(ctx);
	ctx.beginPath();
	for (let k = 1; k <= 4; k += 1) {
		const t = k / 5;
		const px = x + w * 0.1 + (w * 0.9) * t * 0.85;
		const py = y - h * 1.02 + h * t;
		ctx.moveTo(px, py);
		ctx.lineTo(px - w * 0.22, py + h * 0.22);
	}
	ctx.moveTo(x - w * 0.45, y - h * 0.55);
	ctx.lineTo(x - w * 0.3, y - h * 0.48);
	ctx.lineTo(x - w * 0.15, y - h * 0.6);
	ctx.lineTo(x + w * 0.05, y - h * 0.5);
	ctx.stroke();
};

const GLYPHS: Record<Glyph, Pen> = {
	waves(ctx) {
		ctx.beginPath();
		wave(ctx, -14, -12, 9);
		wave(ctx, 12, -4, 9);
		wave(ctx, -6, 10, 9);
		wave(ctx, 20, 18, 7);
		ctx.stroke();
	},
	fish(ctx) {
		ctx.beginPath();
		ctx.moveTo(-18, 0);
		ctx.quadraticCurveTo(0, -14, 14, 0);
		ctx.quadraticCurveTo(0, 14, -18, 0);
		ctx.moveTo(14, 0);
		ctx.lineTo(24, -8);
		ctx.lineTo(24, 8);
		ctx.closePath();
		paper(ctx);
		ctx.beginPath();
		ctx.arc(-9, -2, 1.6, 0, Math.PI * 2);
		ctx.fill();
		ctx.beginPath();
		wave(ctx, -10, 20, 7);
		wave(ctx, 10, 22, 6);
		ctx.stroke();
	},
	rocks(ctx) {
		ctx.beginPath();
		ctx.moveTo(-22, 8);
		ctx.lineTo(-14, -6);
		ctx.lineTo(-6, -2);
		ctx.lineTo(0, -12);
		ctx.lineTo(10, 0);
		ctx.lineTo(16, -4);
		ctx.lineTo(22, 8);
		ctx.closePath();
		paper(ctx);
		ctx.beginPath();
		wave(ctx, -12, 18, 8);
		wave(ctx, 10, 18, 8);
		ctx.stroke();
	},
	ship(ctx) {
		ctx.beginPath();
		ctx.moveTo(-26, 4);
		ctx.lineTo(26, 4);
		ctx.quadraticCurveTo(22, 16, 12, 16);
		ctx.lineTo(-14, 16);
		ctx.quadraticCurveTo(-24, 14, -26, 4);
		ctx.closePath();
		paper(ctx);
		ctx.beginPath();
		ctx.moveTo(0, 4);
		ctx.lineTo(0, -28);
		ctx.moveTo(-14, 4);
		ctx.lineTo(-14, -16);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(2, -24);
		ctx.quadraticCurveTo(18, -14, 2, 0);
		ctx.closePath();
		paper(ctx);
		ctx.beginPath();
		ctx.moveTo(-12, -14);
		ctx.quadraticCurveTo(-2, -7, -12, 1);
		ctx.closePath();
		paper(ctx);
		ctx.beginPath();
		ctx.moveTo(0, -28);
		ctx.lineTo(10, -31);
		ctx.lineTo(0, -33);
		ctx.fill();
		ctx.beginPath();
		wave(ctx, -18, 24, 7);
		wave(ctx, 8, 24, 7);
		ctx.stroke();
	},
	whale(ctx) {
		ctx.beginPath();
		ctx.moveTo(-26, 6);
		ctx.quadraticCurveTo(-24, -14, 0, -12);
		ctx.quadraticCurveTo(18, -10, 20, 4);
		ctx.quadraticCurveTo(26, 0, 30, -8);
		ctx.quadraticCurveTo(28, 4, 22, 10);
		ctx.quadraticCurveTo(0, 14, -26, 6);
		ctx.closePath();
		paper(ctx);
		ctx.beginPath();
		ctx.arc(-16, -2, 1.6, 0, Math.PI * 2);
		ctx.fill();
		ctx.beginPath();
		ctx.moveTo(-8, -14);
		ctx.quadraticCurveTo(-12, -24, -16, -28);
		ctx.moveTo(-8, -14);
		ctx.quadraticCurveTo(-4, -24, 0, -27);
		ctx.moveTo(-8, -14);
		ctx.lineTo(-8, -26);
		wave(ctx, -14, 20, 8);
		wave(ctx, 12, 20, 8);
		ctx.stroke();
	},
	serpent(ctx) {
		ctx.beginPath();
		ctx.moveTo(-30, 10);
		ctx.quadraticCurveTo(-24, -14, -16, 10);
		ctx.moveTo(-10, 10);
		ctx.quadraticCurveTo(-2, -18, 6, 10);
		ctx.moveTo(12, 10);
		ctx.quadraticCurveTo(16, -10, 20, -18);
		ctx.quadraticCurveTo(26, -26, 32, -18);
		ctx.lineTo(24, -14);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(26, -20, 1.6, 0, Math.PI * 2);
		ctx.fill();
		ctx.beginPath();
		for (const x of [-25, -21, -4, 0, 4]) {
			ctx.moveTo(x, -1);
			ctx.lineTo(x + 2, -7);
		}
		wave(ctx, -20, 20, 8);
		wave(ctx, 4, 20, 8);
		wave(ctx, 24, 18, 6);
		ctx.stroke();
	},
	rose(ctx) {
		const star = (r: number, w: number, turn: number) => {
			for (let k = 0; k < 4; k += 1) {
				const a = turn + (k * Math.PI) / 2;
				ctx.beginPath();
				ctx.moveTo(0, 0);
				ctx.lineTo(Math.cos(a - 0.5) * w, Math.sin(a - 0.5) * w);
				ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
				ctx.lineTo(Math.cos(a + 0.5) * w, Math.sin(a + 0.5) * w);
				ctx.closePath();
				paper(ctx);
				ctx.beginPath();
				ctx.moveTo(0, 0);
				ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
				ctx.lineTo(Math.cos(a + 0.5) * w, Math.sin(a + 0.5) * w);
				ctx.closePath();
				ctx.fill();
			}
		};
		ctx.beginPath();
		ctx.arc(0, 0, 22, 0, Math.PI * 2);
		ctx.stroke();
		star(20, 7, Math.PI / 4);
		star(32, 9, -Math.PI / 2);
		ctx.font = 'bold 13px serif';
		ctx.textAlign = 'center';
		ctx.fillText('N', 0, -35);
	},
	lighthouse(ctx) {
		ctx.beginPath();
		ctx.moveTo(-8, 22);
		ctx.lineTo(-5, -14);
		ctx.lineTo(5, -14);
		ctx.lineTo(8, 22);
		ctx.closePath();
		paper(ctx);
		ctx.beginPath();
		ctx.moveTo(-7, 10);
		ctx.lineTo(7, 10);
		ctx.moveTo(-6, -2);
		ctx.lineTo(6, -2);
		ctx.stroke();
		ctx.beginPath();
		ctx.rect(-6, -22, 12, 8);
		paper(ctx);
		ctx.beginPath();
		ctx.moveTo(-7, -22);
		ctx.lineTo(0, -29);
		ctx.lineTo(7, -22);
		ctx.closePath();
		ctx.fill();
		ctx.beginPath();
		for (const a of [-0.35, 0, 0.35]) {
			ctx.moveTo(10 * Math.cos(a), -18 + 10 * Math.sin(a));
			ctx.lineTo(28 * Math.cos(a), -18 + 28 * Math.sin(a));
			ctx.moveTo(-10 * Math.cos(a), -18 + 10 * Math.sin(a));
			ctx.lineTo(-28 * Math.cos(a), -18 + 28 * Math.sin(a));
		}
		ctx.moveTo(-24, 22);
		ctx.lineTo(24, 22);
		ctx.stroke();
	},
	port(ctx) {
		house(ctx, -14, 4, 12, 10);
		house(ctx, 0, 0, 13, 13);
		house(ctx, 14, 4, 11, 9);
		ctx.beginPath();
		ctx.moveTo(-26, 4);
		ctx.lineTo(26, 4);
		ctx.moveTo(4, 4);
		ctx.lineTo(4, 16);
		ctx.lineTo(24, 16);
		ctx.stroke();
		ctx.beginPath();
		for (const x of [8, 14, 20]) {
			ctx.moveTo(x, 16);
			ctx.lineTo(x, 21);
		}
		wave(ctx, -14, 18, 7);
		ctx.stroke();
	},
	village(ctx) {
		house(ctx, -15, 14, 12, 10);
		house(ctx, 15, 16, 11, 9);
		house(ctx, -2, 20, 11, 8);
		ctx.beginPath();
		ctx.moveTo(-6, 6);
		ctx.lineTo(-6, -12);
		ctx.lineTo(0, -26);
		ctx.lineTo(6, -12);
		ctx.lineTo(6, 6);
		ctx.closePath();
		paper(ctx);
		ctx.beginPath();
		ctx.moveTo(0, -26);
		ctx.lineTo(0, -33);
		ctx.moveTo(-3, -30);
		ctx.lineTo(3, -30);
		ctx.stroke();
	},
	windmill(ctx) {
		ctx.beginPath();
		ctx.moveTo(-9, 24);
		ctx.lineTo(-6, -6);
		ctx.lineTo(0, -12);
		ctx.lineTo(6, -6);
		ctx.lineTo(9, 24);
		ctx.closePath();
		paper(ctx);
		ctx.beginPath();
		ctx.rect(-2.5, 15, 5, 9);
		ctx.stroke();
		for (let k = 0; k < 4; k += 1) {
			const a = k * (Math.PI / 2) + 0.5;
			const ca = Math.cos(a);
			const sa = Math.sin(a);
			ctx.beginPath();
			ctx.moveTo(0, -8);
			ctx.lineTo(ca * 26, -8 + sa * 26);
			ctx.lineTo(ca * 26 - sa * 6, -8 + sa * 26 + ca * 6);
			ctx.lineTo(ca * 8 - sa * 6, -8 + sa * 8 + ca * 6);
			ctx.closePath();
			paper(ctx);
		}
		ctx.beginPath();
		ctx.arc(0, -8, 2, 0, Math.PI * 2);
		ctx.fill();
	},
	wheat(ctx) {
		ctx.beginPath();
		for (let row = -2; row <= 2; row += 1) {
			const y = row * 9;
			for (let x = -24; x <= 22; x += 6) {
				ctx.moveTo(x + row * 2, y + 3);
				ctx.lineTo(x + row * 2 + 2, y - 3);
			}
		}
		ctx.stroke();
		house(ctx, 14, -14, 12, 8);
	},
	trees(ctx) {
		broadleaf(ctx, -14, 4, 7);
		broadleaf(ctx, 10, 0, 8);
		broadleaf(ctx, -2, 22, 7);
		broadleaf(ctx, 20, 22, 6);
		broadleaf(ctx, -22, 24, 6);
	},
	pines(ctx) {
		conifer(ctx, -16, 6, 22);
		conifer(ctx, 2, 0, 26);
		conifer(ctx, 18, 8, 20);
		conifer(ctx, -6, 26, 20);
		conifer(ctx, 12, 28, 18);
	},
	hills(ctx) {
		for (const [x, y, w] of [
			[-14, 6, 14],
			[10, 2, 16],
			[0, 22, 13]
		]) {
			ctx.beginPath();
			ctx.moveTo(x - w, y);
			ctx.quadraticCurveTo(x, y - w * 1.4, x + w, y);
			paper(ctx);
			ctx.beginPath();
			for (let k = 1; k <= 3; k += 1) {
				const px = x + w * 0.2 * k;
				ctx.moveTo(px, y - w * 0.6 + k * 2.2);
				ctx.lineTo(px + 2, y - 1);
			}
			ctx.stroke();
		}
	},
	mine(ctx) {
		ctx.beginPath();
		ctx.moveTo(-26, 16);
		ctx.quadraticCurveTo(0, -30, 26, 16);
		paper(ctx);
		ctx.beginPath();
		ctx.moveTo(-8, 16);
		ctx.lineTo(-8, 2);
		ctx.quadraticCurveTo(0, -6, 8, 2);
		ctx.lineTo(8, 16);
		ctx.fill();
		ctx.beginPath();
		ctx.moveTo(-18, -14);
		ctx.lineTo(-4, -28);
		ctx.moveTo(-14, -28);
		ctx.quadraticCurveTo(-6, -26, -2, -20);
		ctx.moveTo(4, -28);
		ctx.lineTo(18, -14);
		ctx.moveTo(14, -28);
		ctx.quadraticCurveTo(6, -26, 2, -20);
		ctx.stroke();
	},
	peaks(ctx) {
		mountain(ctx, 10, 16, 18, 30);
		mountain(ctx, -10, 22, 16, 34);
	},
	castle(ctx) {
		ctx.beginPath();
		ctx.moveTo(-24, 22);
		ctx.lineTo(-24, -6);
		for (let x = -24; x < 24; x += 8) {
			ctx.lineTo(x, -12);
			ctx.lineTo(x + 4, -12);
			ctx.lineTo(x + 4, -6);
			ctx.lineTo(x + 8, -6);
		}
		ctx.lineTo(24, 22);
		ctx.closePath();
		paper(ctx);
		for (const x of [-20, 20]) {
			ctx.beginPath();
			ctx.rect(x - 6, -22, 12, 44);
			paper(ctx);
			ctx.beginPath();
			ctx.moveTo(x - 7, -22);
			ctx.lineTo(x, -32);
			ctx.lineTo(x + 7, -22);
			ctx.closePath();
			ctx.fill();
		}
		ctx.beginPath();
		ctx.moveTo(-6, 22);
		ctx.lineTo(-6, 10);
		ctx.quadraticCurveTo(0, 2, 6, 10);
		ctx.lineTo(6, 22);
		ctx.fill();
		ctx.beginPath();
		ctx.moveTo(0, -12);
		ctx.lineTo(0, -32);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(0, -32);
		ctx.lineTo(12, -28);
		ctx.lineTo(0, -24);
		ctx.fill();
	},
	dragon(ctx) {
		ctx.beginPath();
		ctx.moveTo(-28, 14);
		ctx.quadraticCurveTo(-12, 22, 0, 10);
		ctx.quadraticCurveTo(10, 0, 18, -6);
		ctx.lineTo(28, -8);
		ctx.lineTo(22, -2);
		ctx.quadraticCurveTo(12, 12, 0, 18);
		ctx.quadraticCurveTo(-16, 26, -28, 14);
		ctx.closePath();
		paper(ctx);
		ctx.beginPath();
		ctx.moveTo(-4, 10);
		ctx.lineTo(-14, -26);
		ctx.lineTo(-6, -16);
		ctx.lineTo(0, -28);
		ctx.lineTo(4, -14);
		ctx.lineTo(12, -22);
		ctx.lineTo(8, 2);
		ctx.closePath();
		paper(ctx);
		ctx.beginPath();
		ctx.moveTo(-28, 14);
		ctx.quadraticCurveTo(-36, 6, -30, 0);
		ctx.lineTo(-34, -2);
		ctx.moveTo(-30, 0);
		ctx.lineTo(-28, -4);
		ctx.moveTo(28, -8);
		ctx.quadraticCurveTo(32, -12, 36, -10);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(20, -6, 1.4, 0, Math.PI * 2);
		ctx.fill();
	},
	treasure(ctx) {
		ctx.setLineDash([3, 4]);
		ctx.beginPath();
		ctx.moveTo(-26, 22);
		ctx.quadraticCurveTo(-24, 0, -8, 6);
		ctx.quadraticCurveTo(6, 10, 4, -2);
		ctx.stroke();
		ctx.setLineDash([]);
		ctx.lineWidth *= 1.6;
		ctx.beginPath();
		ctx.moveTo(6, -18);
		ctx.lineTo(22, -2);
		ctx.moveTo(22, -18);
		ctx.lineTo(6, -2);
		ctx.stroke();
	},
	tower(ctx) {
		ctx.beginPath();
		ctx.moveTo(-8, 24);
		ctx.lineTo(-6, -12);
		ctx.lineTo(-9, -12);
		ctx.lineTo(-9, -20);
		ctx.lineTo(-5, -20);
		ctx.lineTo(-5, -16);
		ctx.lineTo(-1, -16);
		ctx.lineTo(-1, -20);
		ctx.lineTo(3, -20);
		ctx.lineTo(3, -16);
		ctx.lineTo(9, -16);
		ctx.lineTo(9, -20);
		ctx.lineTo(9, -12);
		ctx.lineTo(6, -12);
		ctx.lineTo(8, 24);
		ctx.closePath();
		paper(ctx);
		ctx.beginPath();
		ctx.rect(-2, -6, 4, 6);
		ctx.fill();
		ctx.beginPath();
		ctx.moveTo(-22, 24);
		ctx.lineTo(22, 24);
		ctx.stroke();
	},
	tents(ctx) {
		for (const [x, y, w] of [
			[-12, 12, 13],
			[12, 6, 11]
		]) {
			ctx.beginPath();
			ctx.moveTo(x - w, y);
			ctx.lineTo(x, y - w * 1.4);
			ctx.lineTo(x + w, y);
			ctx.closePath();
			paper(ctx);
			ctx.beginPath();
			ctx.moveTo(x, y - w * 1.4);
			ctx.lineTo(x - 3, y);
			ctx.moveTo(x, y - w * 1.4);
			ctx.lineTo(x, y - w * 1.4 - 6);
			ctx.stroke();
		}
		ctx.beginPath();
		ctx.moveTo(0, 26);
		ctx.lineTo(4, 20);
		ctx.lineTo(8, 26);
		ctx.stroke();
	}
};
