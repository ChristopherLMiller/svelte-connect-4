import { cellCentre, type World, type WorldEvent } from './engine';
import {
	AMBER,
	BALL_R,
	BEAM_H,
	BEAM_Y,
	CELL_H,
	CELL_W,
	COLS,
	FIELD_H,
	FIELD_W,
	FLOOR_Y,
	GRID_X,
	GRID_Y,
	HUES,
	LEAD,
	OPAL,
	ROWS,
	RUBY,
	type Hue,
	type RelicKind,
	type Status
} from './types';

type Shard = {
	x: number;
	y: number;
	vx: number;
	vy: number;
	rot: number;
	spin: number;
	size: number;
	color: string;
	ground: number;
	landed: boolean;
	life: number;
};

type Spark = { x: number; y: number; vx: number; vy: number; life: number; color: string };
type Flash = { index: number; hue: number; age: number };

const LIGHT_RES = 0.5;
const SLANT = 0.22;
const MAX_SHARDS = 320;
const WIN_BOTTOM = GRID_Y + ROWS * CELL_H;
const MOON_X = FIELD_W * 0.3;
const MOON_Y = 30;
const BLOOM_DIV = 10;

const RELIC_COLOR: Record<RelicKind, string> = {
	lantern: '#ffd98a',
	triptych: '#93b3ff',
	halo: '#f4f8ff',
	sunburst: '#ff9a7a',
	candle: '#cba3ff'
};

function seeded(seed: number) {
	let s = seed >>> 0 || 1;
	return () => {
		s ^= s << 13;
		s ^= s >>> 17;
		s ^= s << 5;
		return ((s >>> 0) % 100000) / 100000;
	};
}

function rgba(hex: string, alpha: number) {
	const n = parseInt(hex.slice(1), 16);
	return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function channels(hex: string) {
	const n = parseInt(hex.slice(1), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
}

/** Blend two hex colours, then scale the brightness (1 = unchanged). */
function mix(a: string, b: string, t: number, bright = 1, alpha = 1) {
	const ca = channels(a);
	const cb = channels(b);
	const c = ca.map((v, i) => Math.max(0, Math.min(255, Math.round((v + (cb[i]! - v) * t) * bright))));
	return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;
}

const STONE = '#8c7d68';
const TONES = [
	[150, 128, 96],
	[160, 140, 104],
	[136, 120, 98],
	[168, 142, 100],
	[142, 128, 108],
	[154, 130, 92],
	[128, 114, 96],
	[158, 122, 88]
] as const;

function tone(t: readonly number[], k: number) {
	return `rgb(${Math.min(255, Math.round(t[0]! * k))}, ${Math.min(255, Math.round(t[1]! * k))}, ${Math.min(255, Math.round(t[2]! * k))})`;
}

/** One weathered wall stone; its joint is the mortar left showing around it. */
function ashlar(ctx: CanvasRenderingContext2D, rand: () => number, x: number, y: number, w: number, h: number, light: number) {
	const t = TONES[Math.floor(rand() * TONES.length)]!;
	const k = light * (0.84 + rand() * 0.26);
	const sx = x + 1.3;
	const sy = y + 1.3;
	const sw = w - 2.6;
	const sh = h - 2.6;
	const body = ctx.createLinearGradient(0, sy, 0, sy + sh);
	body.addColorStop(0, tone(t, k * 1.1));
	body.addColorStop(1, tone(t, k * 0.8));
	ctx.fillStyle = body;
	ctx.beginPath();
	ctx.roundRect(sx, sy, sw, sh, 3);
	ctx.fill();

	ctx.save();
	ctx.clip();
	for (let i = 0; i < 3; i += 1) {
		const bx = sx + rand() * sw;
		const by = sy + rand() * sh;
		const br = 8 + rand() * 26;
		const blot = ctx.createRadialGradient(bx, by, 0, bx, by, br);
		blot.addColorStop(0, rand() > 0.5 ? 'rgba(255, 240, 210, 0.08)' : 'rgba(20, 14, 8, 0.16)');
		blot.addColorStop(1, 'rgba(0, 0, 0, 0)');
		ctx.fillStyle = blot;
		ctx.fillRect(bx - br, by - br, br * 2, br * 2);
	}
	const grains = Math.round((sw * sh) / 70);
	for (let i = 0; i < grains; i += 1) {
		ctx.fillStyle = rand() > 0.55 ? 'rgba(255, 244, 220, 0.09)' : 'rgba(0, 0, 0, 0.14)';
		const d = 0.6 + rand() * 1.2;
		ctx.fillRect(sx + rand() * sw, sy + rand() * sh, d, d);
	}
	if (rand() < 0.5) {
		// The mason's claw-tool marks, still faintly there.
		ctx.strokeStyle = 'rgba(0, 0, 0, 0.07)';
		ctx.lineWidth = 0.8;
		ctx.beginPath();
		const slope = (rand() - 0.5) * 1.4;
		for (let tx = sx - sh; tx < sx + sw; tx += 3 + rand() * 3) {
			ctx.moveTo(tx, sy);
			ctx.lineTo(tx + sh * slope, sy + sh);
		}
		ctx.stroke();
	}
	if (rand() < 0.25) {
		const gx = sx + rand() * sw;
		const gw = 6 + rand() * 14;
		const stain = ctx.createLinearGradient(0, sy, 0, sy + sh);
		stain.addColorStop(0, 'rgba(24, 20, 12, 0.3)');
		stain.addColorStop(1, 'rgba(24, 20, 12, 0)');
		ctx.fillStyle = stain;
		ctx.fillRect(gx, sy, gw, sh);
	}
	ctx.restore();

	ctx.fillStyle = 'rgba(255, 238, 205, 0.16)';
	ctx.fillRect(sx + 2, sy, sw - 4, 1.2);
	ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
	ctx.fillRect(sx + 2, sy + sh - 2, sw - 4, 2);
	ctx.fillRect(sx + sw - 1.5, sy + 2, 1.5, sh - 4);
	if (rand() < 0.3) {
		ctx.fillStyle = '#1d1813';
		const cx = rand() < 0.5 ? sx : sx + sw;
		const cy = rand() < 0.5 ? sy : sy + sh;
		const s = 3 + rand() * 6;
		ctx.beginPath();
		ctx.moveTo(cx, cy);
		ctx.lineTo(cx + (cx === sx ? s : -s), cy);
		ctx.lineTo(cx, cy + (cy === sy ? s * 0.8 : -s * 0.8));
		ctx.closePath();
		ctx.fill();
	}
}

/** Separable box blur in place; canvas filters are missing in Safari. */
function boxBlur(image: ImageData, radius: number) {
	const { width: w, height: h, data } = image;
	const copy = new Uint8ClampedArray(data.length);
	const span = radius * 2 + 1;
	const pass = (src: Uint8ClampedArray, dst: Uint8ClampedArray, lines: number, length: number, stride: number, step: number) => {
		for (let line = 0; line < lines; line += 1) {
			const base = line * stride;
			for (let ch = 0; ch < 4; ch += 1) {
				let sum = 0;
				for (let i = -radius; i <= radius; i += 1) sum += src[base + Math.min(length - 1, Math.max(0, i)) * step + ch]!;
				for (let i = 0; i < length; i += 1) {
					dst[base + i * step + ch] = sum / span;
					const out = Math.max(0, i - radius);
					const inn = Math.min(length - 1, i + radius + 1);
					sum += src[base + inn * step + ch]! - src[base + out * step + ch]!;
				}
			}
		}
	};
	pass(data, copy, h, w, w * 4, 4);
	pass(copy, data, w, h, 4, w * 4);
}

function layer(w: number, h: number) {
	const canvas = document.createElement('canvas');
	canvas.width = Math.max(1, w);
	canvas.height = Math.max(1, h);
	const ctx = canvas.getContext('2d')!;
	return { canvas, ctx };
}

/** Draws the nave floor, the window and everything that moves, on one 2D canvas. */
export class FieldRenderer {
	calm = false;
	private ctx: CanvasRenderingContext2D;
	private scale = 1;
	private pxW = 1;
	private pxH = 1;
	private stone = layer(1, 1);
	private light = layer(1, 1);
	private glass = layer(1, 1);
	private blocks = layer(1, 1);
	private art = layer(1, 1);
	private frame = layer(1, 1);
	private winPx = 1;
	private bloomMid = layer(1, 1);
	private bloom = layer(1, 1);
	private wash = layer(1, 1);
	private bloomDirty = true;
	private ballSprite = layer(1, 1);
	private glassKey = '';
	private glassSeen: Uint8Array | null = null;
	private hpSeen: Uint8Array | null = null;
	private lightSerial = -1;
	/** Shafts in one column overlap almost exactly, so a full column must not burn to white. */
	private columnWeight = new Float32Array(COLS).fill(1);
	private shards: Shard[] = [];
	private sparks: Spark[] = [];
	private flashes: Flash[] = [];
	private trails = new Map<number, Array<{ x: number; y: number }>>();
	private litGlow = 0;

	constructor(private canvas: HTMLCanvasElement) {
		this.ctx = canvas.getContext('2d', { alpha: false })!;
	}

	resize(cssW: number) {
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const pxW = Math.max(1, Math.min(1500, Math.round(cssW * dpr)));
		const pxH = Math.round((pxW * FIELD_H) / FIELD_W);
		if (pxW === this.pxW && pxH === this.pxH) return;
		this.pxW = pxW;
		this.pxH = pxH;
		this.canvas.width = pxW;
		this.canvas.height = pxH;
		this.scale = pxW / FIELD_W;
		this.stone = layer(pxW, pxH);
		this.light = layer(Math.round(pxW * LIGHT_RES), Math.round(pxH * LIGHT_RES));
		this.winPx = Math.ceil((WIN_BOTTOM + 12) * this.scale);
		this.glass = layer(pxW, this.winPx);
		this.blocks = layer(pxW, this.winPx);
		this.art = layer(pxW, this.winPx);
		this.frame = layer(pxW, this.winPx);
		this.bloomMid = layer(Math.ceil(pxW / 3), Math.ceil(this.winPx / 3));
		this.bloom = layer(Math.ceil(pxW / BLOOM_DIV), Math.ceil(this.winPx / BLOOM_DIV));
		this.wash = layer(26, 14);
		this.bloomDirty = true;
		this.paintStone();
		this.paintBallSprite();
		this.glassKey = '';
		this.lightSerial = -1;
	}

	event(event: WorldEvent) {
		if (event.type === 'pane') {
			if (event.broken) {
				this.addShaft(event.index, event.hue);
				this.flashes.push({ index: event.index, hue: event.hue, age: 0 });
				if (!this.calm) this.burst(event.x, event.y, event.hue, event.vx);
			} else if (!this.calm) {
				this.spray(event.x, event.y, HUES[event.hue]!.light, 5);
			}
		} else if (!this.calm && event.type === 'lead') {
			this.spray(event.x, event.y, '#b8a88c', 6);
		} else if (!this.calm && event.type === 'beam') {
			this.spray(event.x, BEAM_Y, '#ffd98a', 5, -1);
		} else if (!this.calm && event.type === 'relic') {
			this.spray(event.x, BEAM_Y, RELIC_COLOR[event.kind], 14, -1);
		}
	}

	draw(world: World, status: Status, now: number, dt: number) {
		const ctx = this.ctx;
		this.syncGlass(world);
		this.syncLight(world);

		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.globalCompositeOperation = 'source-over';
		ctx.globalAlpha = 1;
		ctx.drawImage(this.stone.canvas, 0, 0);
		ctx.drawImage(this.glass.canvas, 0, 0);
		ctx.drawImage(this.blocks.canvas, 0, 0);
		ctx.drawImage(this.frame.canvas, 0, 0);

		const target = status.type === 'cleared' || status.type === 'won' ? 1 : 0;
		this.litGlow += (target - this.litGlow) * (1 - Math.exp(-dt * 2.2));
		ctx.globalCompositeOperation = 'lighter';
		ctx.globalAlpha = this.calm ? 1 : 0.92 + 0.08 * Math.sin(now / 1400);
		ctx.drawImage(this.light.canvas, 0, 0, this.pxW, this.pxH);
		if (this.litGlow > 0.01) {
			ctx.globalAlpha = this.litGlow * (0.7 + (this.calm ? 0 : 0.3 * Math.sin(now / 420)));
			ctx.drawImage(this.light.canvas, 0, 0, this.pxW, this.pxH);
		}
		this.syncBloom();
		const winH = this.winPx;
		const halo = 18 * this.scale;
		ctx.globalAlpha = 0.55 + this.litGlow * 0.3;
		ctx.drawImage(this.bloom.canvas, -halo, -halo, this.pxW + halo * 2, winH + halo * 2);
		// The window's colours thrown faintly onto the wall and floor below.
		ctx.globalAlpha = 0.3 + this.litGlow * 0.15;
		ctx.drawImage(this.wash.canvas, -this.pxW * 0.15, winH, this.pxW * 1.3, this.pxH - winH);
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';

		ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
		this.drawFlashes(dt);
		this.drawShadows(world);
		for (const relic of world.relics) this.drawRelic(relic.kind, relic.x, relic.y, relic.age);
		this.drawBeam(world, now);
		this.drawBalls(world, now);
		this.drawShards(dt);
		this.drawSparks(dt);

		if (status.type === 'paused' || status.type === 'over') {
			ctx.fillStyle = 'rgba(6, 6, 12, 0.42)';
			ctx.fillRect(0, 0, FIELD_W, FIELD_H);
		}
		if (this.litGlow > 0.01) {
			const wash = ctx.createRadialGradient(FIELD_W / 2, GRID_Y + 160, 40, FIELD_W / 2, GRID_Y + 160, 620);
			wash.addColorStop(0, `rgba(255, 226, 160, ${0.22 * this.litGlow})`);
			wash.addColorStop(1, 'rgba(255, 226, 160, 0)');
			ctx.globalCompositeOperation = 'lighter';
			ctx.fillStyle = wash;
			ctx.fillRect(0, 0, FIELD_W, FIELD_H);
			ctx.globalCompositeOperation = 'source-over';
		}
	}

	private paintStone() {
		const { ctx } = this.stone;
		ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
		const rand = seeded(7);

		// Old dressed limestone: courses of uneven height, long and short stones, worn arrises.
		ctx.fillStyle = '#1d1813';
		ctx.fillRect(0, 0, FIELD_W, FLOOR_Y);
		const plinth = FLOOR_Y - 18;
		for (let y = -8, row = 0; y < plinth; row += 1) {
			const h = Math.min(30 + rand() * 26, plinth - y);
			let x = -rand() * 120;
			while (x < FIELD_W) {
				const w = 64 + rand() * 120;
				ashlar(ctx, rand, x, y, w, h, 1 - (y / FLOOR_Y) * 0.25);
				x += w;
			}
			y += h;
		}
		const base = ctx.createLinearGradient(0, plinth, 0, FLOOR_Y);
		base.addColorStop(0, '#8a7c66');
		base.addColorStop(0.25, '#6a5e4d');
		base.addColorStop(0.6, '#4a4136');
		base.addColorStop(1, '#2a241d');
		ctx.fillStyle = base;
		ctx.fillRect(0, plinth, FIELD_W, FLOOR_Y - plinth);
		ctx.fillStyle = 'rgba(255, 236, 200, 0.18)';
		ctx.fillRect(0, plinth, FIELD_W, 1.2);

		// Night: cool from above, a little warmth from the candles below.
		const night = ctx.createLinearGradient(0, 0, 0, FLOOR_Y);
		night.addColorStop(0, 'rgba(8, 8, 20, 0.66)');
		night.addColorStop(0.5, 'rgba(10, 9, 18, 0.52)');
		night.addColorStop(1, 'rgba(14, 10, 8, 0.4)');
		ctx.fillStyle = night;
		ctx.fillRect(0, 0, FIELD_W, FLOOR_Y);
		const candle = ctx.createRadialGradient(FIELD_W / 2, FLOOR_Y + 40, 20, FIELD_W / 2, FLOOR_Y + 40, 520);
		candle.addColorStop(0, 'rgba(255, 170, 90, 0.12)');
		candle.addColorStop(1, 'rgba(255, 170, 90, 0)');
		ctx.fillStyle = candle;
		ctx.fillRect(0, 0, FIELD_W, FLOOR_Y);

		// Flagstones running toward the far wall.
		const floor = ctx.createLinearGradient(0, FLOOR_Y, 0, FIELD_H);
		floor.addColorStop(0, '#1c1b22');
		floor.addColorStop(1, '#0c0b10');
		ctx.fillStyle = floor;
		ctx.fillRect(0, FLOOR_Y, FIELD_W, FIELD_H - FLOOR_Y);
		ctx.fillStyle = 'rgba(255, 228, 190, 0.09)';
		ctx.fillRect(0, FLOOR_Y, FIELD_W, 1.5);
		ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
		ctx.lineWidth = 1.2;
		for (const dy of [12, 28, 48]) {
			ctx.beginPath();
			ctx.moveTo(0, FLOOR_Y + dy);
			ctx.lineTo(FIELD_W, FLOOR_Y + dy);
			ctx.stroke();
		}
		const vx = FIELD_W / 2;
		const vy = FLOOR_Y - 520;
		for (let x = -FIELD_W; x <= FIELD_W * 2; x += 84) {
			ctx.beginPath();
			const t = (FLOOR_Y - vy) / (FIELD_H - vy);
			ctx.moveTo(vx + (x - vx) * t, FLOOR_Y);
			ctx.lineTo(x, FIELD_H);
			ctx.stroke();
		}

		const vignette = ctx.createRadialGradient(FIELD_W / 2, FIELD_H * 0.42, FIELD_W * 0.3, FIELD_W / 2, FIELD_H * 0.5, FIELD_W * 0.95);
		vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
		vignette.addColorStop(1, 'rgba(0, 0, 0, 0.32)');
		ctx.fillStyle = vignette;
		ctx.fillRect(0, 0, FIELD_W, FIELD_H);
	}

	private paintBallSprite() {
		const size = Math.ceil(72 * this.scale);
		this.ballSprite = layer(size, size);
		const { ctx } = this.ballSprite;
		const c = size / 2;
		const glow = ctx.createRadialGradient(c, c, 0, c, c, c);
		glow.addColorStop(0, 'rgba(255, 240, 200, 0.75)');
		glow.addColorStop(0.18, 'rgba(255, 214, 140, 0.4)');
		glow.addColorStop(0.5, 'rgba(255, 190, 110, 0.1)');
		glow.addColorStop(1, 'rgba(255, 190, 110, 0)');
		ctx.fillStyle = glow;
		ctx.fillRect(0, 0, size, size);
		const r = BALL_R * this.scale;
		const core = ctx.createRadialGradient(c - r * 0.3, c - r * 0.35, r * 0.1, c, c, r);
		core.addColorStop(0, '#ffffff');
		core.addColorStop(0.45, '#fff0c8');
		core.addColorStop(1, '#f2b45a');
		ctx.fillStyle = core;
		ctx.beginPath();
		ctx.arc(c, c, r, 0, Math.PI * 2);
		ctx.fill();
	}

	private syncGlass(world: World) {
		const key = `${world.serial}`;
		if (key !== this.glassKey || !this.glassSeen || !this.hpSeen) {
			this.glassKey = key;
			this.paintArt(world);
			this.paintFrame(world);
			for (const { ctx, canvas } of [this.glass, this.blocks]) {
				ctx.setTransform(1, 0, 0, 1, 0, 0);
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
			}
			for (let i = 0; i < world.kind.length; i += 1) this.paintCell(world, i);
			this.glassSeen = Uint8Array.from(world.kind);
			this.hpSeen = Uint8Array.from(world.hp);
			this.bloomDirty = true;
			return;
		}
		const seen = this.glassSeen;
		const hp = this.hpSeen;
		for (let i = 0; i < world.kind.length; i += 1) {
			if (seen[i] === world.kind[i] && hp[i] === world.hp[i]) continue;
			const x0 = GRID_X + (i % COLS) * CELL_W;
			const y0 = GRID_Y + Math.floor(i / COLS) * CELL_H;
			this.glass.ctx.clearRect(x0, y0, CELL_W, CELL_H);
			this.blocks.ctx.clearRect(x0, y0, CELL_W, CELL_H);
			this.paintCell(world, i);
			seen[i] = world.kind[i]!;
			hp[i] = world.hp[i]!;
			this.bloomDirty = true;
		}
	}

	private paintCell(world: World, index: number) {
		const k = world.kind[index]!;
		const was = world.origin[index]!;
		const x0 = GRID_X + (index % COLS) * CELL_W;
		const y0 = GRID_Y + Math.floor(index / COLS) * CELL_H;
		if (k === LEAD) this.paintTracery(x0, y0);
		else if (k) this.paintBlock(world, index, x0, y0, HUES[k]!);
		else if (was && was !== LEAD) {
			const ctx = this.glass.ctx;
			const s = this.scale;
			const px = Math.floor(x0 * s);
			const py = Math.floor(y0 * s);
			const pw = Math.ceil((x0 + CELL_W) * s) - px;
			const ph = Math.ceil((y0 + CELL_H) * s) - py;
			ctx.save();
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.drawImage(this.art.canvas, px, py, pw, ph, px, py, pw, ph);
			ctx.restore();
		}
	}

	/** The masonry that bricks up the window: painted stone, with the glass's light leaking at the joints. */
	private paintBlock(world: World, index: number, x0: number, y0: number, hue: Hue) {
		const ctx = this.blocks.ctx;
		const rand = seeded(index * 977 + world.level * 131 + 3);
		const thick = world.strength[index] === 2;
		ctx.fillStyle = mix('#1d1813', hue.light, 0.3);
		ctx.fillRect(x0, y0, CELL_W, CELL_H);

		const bx = x0 + 1.4;
		const by = y0 + 1.4;
		const bw = CELL_W - 2.8;
		const bh = CELL_H - 2.8;
		const k = (thick ? 0.48 : 0.58) * (0.92 + rand() * 0.14);
		const body = ctx.createLinearGradient(0, by, 0, by + bh);
		body.addColorStop(0, mix(hue.base, STONE, 0.42, k * 1.14));
		body.addColorStop(1, mix(hue.base, STONE, 0.42, k * 0.8));
		ctx.fillStyle = body;
		ctx.beginPath();
		ctx.roundRect(bx, by, bw, bh, 2);
		ctx.fill();

		ctx.save();
		ctx.clip();
		// Centuries of wear: the paint has rubbed back to bare stone in places.
		for (let i = 0; i < 3; i += 1) {
			const wx = bx + (rand() < 0.5 ? rand() * 12 : bw - rand() * 12);
			const wy = by + rand() * bh;
			const wr = 4 + rand() * 9;
			const worn = ctx.createRadialGradient(wx, wy, 0, wx, wy, wr);
			worn.addColorStop(0, mix(STONE, '#000000', 0, 0.62, 0.7));
			worn.addColorStop(1, mix(STONE, '#000000', 0, 0.62, 0));
			ctx.fillStyle = worn;
			ctx.fillRect(wx - wr, wy - wr, wr * 2, wr * 2);
		}
		for (let i = 0; i < 26; i += 1) {
			ctx.fillStyle = rand() > 0.5 ? 'rgba(255, 240, 215, 0.1)' : 'rgba(0, 0, 0, 0.16)';
			const d = 0.6 + rand() * 1.1;
			ctx.fillRect(bx + rand() * bw, by + rand() * bh, d, d);
		}
		ctx.strokeStyle = 'rgba(0, 0, 0, 0.14)';
		ctx.lineWidth = 0.6;
		ctx.beginPath();
		for (let i = 0; i < 3; i += 1) {
			const cx = bx + rand() * bw;
			const cy = by + rand() * bh;
			ctx.moveTo(cx, cy);
			ctx.lineTo(cx + (rand() - 0.5) * 14, cy + (rand() - 0.5) * 8);
		}
		ctx.stroke();

		const ink = mix(hue.light, '#f0dcae', 0.5, 0.75, 0.42);
		ctx.strokeStyle = ink;
		ctx.fillStyle = ink;
		ctx.lineWidth = 1;
		const cx = x0 + CELL_W / 2;
		const cy = y0 + CELL_H / 2;
		const motif = thick ? -1 : rand() < 0.35 ? Math.floor(rand() * 3) : -2;
		if (motif === 0) {
			for (const [qx, qy] of [[-4, 0], [4, 0], [0, -4], [0, 4]] as const) {
				ctx.beginPath();
				ctx.arc(cx + qx, cy + qy, 3.6, 0, Math.PI * 2);
				ctx.stroke();
			}
		} else if (motif === 1) {
			ctx.beginPath();
			for (let x = bx + 4; x < bx + bw - 6; x += 8) {
				ctx.moveTo(x, cy + 3);
				ctx.lineTo(x + 4, cy - 3);
				ctx.lineTo(x + 8, cy + 3);
			}
			ctx.stroke();
		} else if (motif === 2) {
			for (const dx of [-14, 0, 14]) {
				ctx.beginPath();
				ctx.moveTo(cx + dx, cy - 4);
				ctx.lineTo(cx + dx + 3, cy);
				ctx.lineTo(cx + dx, cy + 4);
				ctx.lineTo(cx + dx - 3, cy);
				ctx.closePath();
				ctx.fill();
			}
		} else if (motif === -1) {
			// Thick blocks are heavier dressed stones, banded with gilt.
			ctx.strokeStyle = 'rgba(214, 172, 86, 0.6)';
			ctx.strokeRect(bx + 3.5, by + 3.5, bw - 7, bh - 7);
			ctx.beginPath();
			ctx.arc(cx, cy, 5, 0, Math.PI * 2);
			ctx.stroke();
			ctx.fillStyle = 'rgba(214, 172, 86, 0.55)';
			ctx.beginPath();
			ctx.arc(cx, cy, 1.8, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.restore();

		ctx.fillStyle = 'rgba(255, 238, 210, 0.2)';
		ctx.fillRect(bx + 1, by, bw - 2, 1.2);
		ctx.fillStyle = 'rgba(255, 238, 210, 0.08)';
		ctx.fillRect(bx, by + 1, 1, bh - 2);
		ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
		ctx.fillRect(bx + 1, by + bh - 1.8, bw - 2, 1.8);
		ctx.fillRect(bx + bw - 1.4, by + 1, 1.4, bh - 2);
		if (thick && world.hp[index] === 1) this.paintCrack(bx, by, bw, bh, rand);
	}

	/** `#` cells: carved stone mullions that stay put. */
	private paintTracery(x0: number, y0: number) {
		const ctx = this.blocks.ctx;
		ctx.fillStyle = '#1d1813';
		ctx.fillRect(x0, y0, CELL_W, CELL_H);
		const stone = ctx.createLinearGradient(0, y0, 0, y0 + CELL_H);
		stone.addColorStop(0, '#7e7262');
		stone.addColorStop(0.45, '#625747');
		stone.addColorStop(1, '#3a332a');
		ctx.fillStyle = stone;
		ctx.fillRect(x0 + 0.8, y0 + 0.8, CELL_W - 1.6, CELL_H - 1.6);
		ctx.fillStyle = 'rgba(255, 240, 215, 0.22)';
		ctx.fillRect(x0 + 1, y0 + 1, CELL_W - 2, 1.2);
		ctx.fillRect(x0 + 4, y0 + CELL_H / 2 - 2.5, CELL_W - 8, 1.2);
		ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
		ctx.fillRect(x0 + 4, y0 + CELL_H / 2 + 1.5, CELL_W - 8, 1.6);
		ctx.fillRect(x0 + 1, y0 + CELL_H - 2.2, CELL_W - 2, 1.6);
	}

	/**
	 * The hidden stained glass for the whole window, painted once per window. Each cell is
	 * cut into four pieces by leads whose ends are shared with the neighbouring cells, so the
	 * leading runs on unbroken across the window as the blocks come out.
	 */
	private paintArt(world: World) {
		const { ctx, canvas } = this.art;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
		const seed = world.level * 7.31 + 0.5;
		const h = (a: number, b: number, c: number) => {
			const v = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719 + seed) * 43758.5453;
			return v - Math.floor(v);
		};
		const pane = (c: number, r: number) => {
			if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return 0;
			const k = world.origin[r * COLS + c]!;
			return k === LEAD ? 0 : k;
		};
		for (let i = 0; i < world.origin.length; i += 1) {
			const c = i % COLS;
			const r = Math.floor(i / COLS);
			const k = pane(c, r);
			if (!k) continue;
			const hue = HUES[k]!;
			const rand = seeded(i * 613 + world.level * 97 + 11);
			const x0 = GRID_X + c * CELL_W;
			const y0 = GRID_Y + r * CELL_H;
			const x1 = x0 + CELL_W;
			const y1 = y0 + CELL_H;
			const top = { x: x0 + CELL_W * (0.25 + 0.5 * h(c, r, 1)), y: y0 };
			const bottom = { x: x0 + CELL_W * (0.25 + 0.5 * h(c, r + 1, 1)), y: y1 };
			const left = { x: x0, y: y0 + CELL_H * (0.25 + 0.5 * h(c, r, 2)) };
			const right = { x: x1, y: y0 + CELL_H * (0.25 + 0.5 * h(c + 1, r, 2)) };
			const d = (bottom.x - top.x) / CELL_H;
			const e = (right.y - left.y) / CELL_W;
			const py = (left.y + e * (top.x - x0)) / (1 - e * d) - (e * d * y0) / (1 - e * d);
			const centre = { x: top.x + d * (py - y0), y: py };
			const pieces = [
				[{ x: x0, y: y0 }, top, centre, left],
				[top, { x: x1, y: y0 }, right, centre],
				[centre, right, { x: x1, y: y1 }, bottom],
				[left, centre, bottom, { x: x0, y: y1 }]
			];
			const near = Math.min(1, Math.hypot(x0 + CELL_W / 2 - MOON_X, (y0 - MOON_Y) * 1.3) / 640);
			const bright = (1.12 - 0.3 * near) * (0.94 + rand() * 0.12) * (k === OPAL ? 0.8 : 1);
			const others = [pane(c - 1, r), pane(c + 1, r), pane(c, r - 1), pane(c, r + 1)].filter((n) => n && n !== k);
			for (const piece of pieces) {
				let shade = hue;
				if (rand() < 0.14) shade = HUES[others.length ? others[Math.floor(rand() * others.length)]! : k === AMBER ? RUBY : AMBER]!;
				const t = rand();
				const core = t < 0.5 ? mix(shade.base, shade.light, 0.15 + t * 0.7, bright) : mix(shade.base, shade.dark, (t - 0.5) * 0.7, bright);
				const a = piece[0]!;
				const b = piece[2]!;
				const fill = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
				fill.addColorStop(0, mix(shade.base, shade.light, 0.55, bright));
				fill.addColorStop(0.5, core);
				fill.addColorStop(1, mix(shade.base, shade.dark, 0.45, bright));
				ctx.fillStyle = fill;
				ctx.beginPath();
				ctx.moveTo(piece[0]!.x, piece[0]!.y);
				for (const p of piece.slice(1)) ctx.lineTo(p.x, p.y);
				ctx.closePath();
				ctx.fill();
			}

			ctx.save();
			ctx.beginPath();
			ctx.rect(x0, y0, CELL_W, CELL_H);
			ctx.clip();
			for (let s = 0; s < 5; s += 1) {
				const sy = y0 + rand() * CELL_H;
				ctx.strokeStyle = rand() > 0.45 ? `rgba(255, 255, 255, ${0.06 + rand() * 0.1})` : `rgba(0, 0, 0, ${0.08 + rand() * 0.12})`;
				ctx.lineWidth = 0.8 + rand() * 2;
				ctx.beginPath();
				ctx.moveTo(x0 - 4, sy);
				ctx.quadraticCurveTo(x0 + CELL_W / 2, sy + (rand() - 0.5) * 10, x1 + 4, sy + (rand() - 0.5) * 12);
				ctx.stroke();
			}
			if (world.strength[i] === 2) {
				const cx = x0 + CELL_W / 2;
				const cy = y0 + CELL_H / 2;
				const ring = ctx.createRadialGradient(cx, cy, 0, cx, cy, 11);
				ring.addColorStop(0, '#fff6dc');
				ring.addColorStop(0.3, mix(hue.light, '#ffffff', 0.3, 1));
				ring.addColorStop(1, mix(hue.base, hue.light, 0.3, bright));
				ctx.fillStyle = ring;
				ctx.beginPath();
				ctx.arc(cx, cy, 11, 0, Math.PI * 2);
				ctx.fill();
				ctx.strokeStyle = '#0d0b10';
				ctx.lineWidth = 2;
				ctx.stroke();
			}
			ctx.restore();

			ctx.strokeStyle = '#0d0b10';
			ctx.lineWidth = 2.2;
			ctx.lineJoin = 'round';
			ctx.beginPath();
			ctx.moveTo(top.x, top.y);
			ctx.lineTo(bottom.x, bottom.y);
			ctx.moveTo(left.x, left.y);
			ctx.lineTo(right.x, right.y);
			ctx.rect(x0, y0, CELL_W, CELL_H);
			ctx.stroke();
			ctx.strokeStyle = 'rgba(200, 196, 220, 0.14)';
			ctx.lineWidth = 0.6;
			ctx.stroke();
		}
	}

	/** A chamfered stone surround tracing the outline of the bricked-up window. */
	private paintFrame(world: World) {
		const { ctx, canvas } = this.frame;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
		const inside = (c: number, r: number) => c >= 0 && c < COLS && r >= 0 && r < ROWS && world.origin[r * COLS + c]! !== 0;
		const T = 7;
		const edges: Array<[number, number, number, number, number, number]> = [];
		for (let r = 0; r < ROWS; r += 1) {
			for (let c = 0; c < COLS; c += 1) {
				if (!inside(c, r)) continue;
				const x0 = GRID_X + c * CELL_W;
				const y0 = GRID_Y + r * CELL_H;
				const l = inside(c - 1, r) ? 0 : T;
				const rt = inside(c + 1, r) ? 0 : T;
				const up = inside(c, r - 1) ? 0 : T;
				const dn = inside(c, r + 1) ? 0 : T;
				if (!inside(c, r - 1)) edges.push([x0 - l, y0 - T, CELL_W + l + rt, T, 0, -1]);
				if (!inside(c, r + 1)) edges.push([x0 - l, y0 + CELL_H, CELL_W + l + rt, T, 0, 1]);
				if (!inside(c - 1, r)) edges.push([x0 - T, y0 - up, T, CELL_H + up + dn, -1, 0]);
				if (!inside(c + 1, r)) edges.push([x0 + CELL_W, y0 - up, T, CELL_H + up + dn, 1, 0]);
			}
		}
		ctx.fillStyle = '#121010';
		for (const [x, y, w, h] of edges) ctx.fillRect(x - 1.5, y - 1.5, w + 3, h + 3);
		for (const [x, y, w, h, nx, ny] of edges) {
			const g = nx ? ctx.createLinearGradient(nx < 0 ? x + w : x, 0, nx < 0 ? x : x + w, 0) : ctx.createLinearGradient(0, ny < 0 ? y + h : y, 0, ny < 0 ? y : y + h);
			g.addColorStop(0, ny > 0 || nx > 0 ? '#3e362c' : '#4a4134');
			g.addColorStop(0.45, ny < 0 ? '#8b7d67' : '#706452');
			g.addColorStop(1, '#4e4538');
			ctx.fillStyle = g;
			ctx.fillRect(x, y, w, h);
		}
		ctx.fillStyle = 'rgba(8, 8, 18, 0.35)';
		for (const [x, y, w, h] of edges) ctx.fillRect(x, y, w, h);
	}

	/** Blur the lit glass by shrinking it twice; drawn back up additively it bleeds light. */
	private syncBloom() {
		if (!this.bloomDirty) return;
		this.bloomDirty = false;
		const mid = this.bloomMid;
		const low = this.bloom;
		mid.ctx.setTransform(1, 0, 0, 1, 0, 0);
		mid.ctx.clearRect(0, 0, mid.canvas.width, mid.canvas.height);
		mid.ctx.drawImage(this.glass.canvas, 0, 0, mid.canvas.width, mid.canvas.height);
		low.ctx.setTransform(1, 0, 0, 1, 0, 0);
		low.ctx.clearRect(0, 0, low.canvas.width, low.canvas.height);
		low.ctx.drawImage(mid.canvas, 0, 0, low.canvas.width, low.canvas.height);
		const image = low.ctx.getImageData(0, 0, low.canvas.width, low.canvas.height);
		boxBlur(image, 2);
		boxBlur(image, 2);
		low.ctx.putImageData(image, 0, 0);
		const wash = this.wash;
		wash.ctx.setTransform(1, 0, 0, 1, 0, 0);
		wash.ctx.clearRect(0, 0, wash.canvas.width, wash.canvas.height);
		wash.ctx.drawImage(low.canvas, 0, 0, wash.canvas.width, wash.canvas.height);
	}

	private paintCrack(x: number, y: number, w: number, h: number, rand: () => number) {
		const ctx = this.glass.ctx;
		ctx.save();
		ctx.beginPath();
		ctx.rect(x, y, w, h);
		ctx.clip();
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
		ctx.lineWidth = 1;
		const cx = x + w * (0.3 + rand() * 0.4);
		const cy = y + h * (0.3 + rand() * 0.4);
		for (let i = 0; i < 5; i += 1) {
			const a = (i / 5) * Math.PI * 2 + rand() * 0.8;
			const len = 10 + rand() * 18;
			ctx.beginPath();
			ctx.moveTo(cx, cy);
			const mx = cx + Math.cos(a) * len * 0.5 + (rand() - 0.5) * 4;
			const my = cy + Math.sin(a) * len * 0.5 + (rand() - 0.5) * 4;
			ctx.lineTo(mx, my);
			ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
			ctx.stroke();
		}
		ctx.restore();
	}

	private syncLight(world: World) {
		if (this.lightSerial === world.serial) return;
		this.lightSerial = world.serial;
		const { ctx, canvas } = this.light;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		const counts = new Array<number>(COLS).fill(0);
		for (let i = 0; i < world.origin.length; i += 1) {
			const k = world.origin[i]!;
			if (k && k !== LEAD) counts[i % COLS] += 1;
		}
		for (let c = 0; c < COLS; c += 1) this.columnWeight[c] = 1.4 / Math.max(1.4, counts[c]! ** 0.75);
		for (let i = 0; i < world.origin.length; i += 1) {
			const k = world.origin[i]!;
			if (k && k !== LEAD && !world.kind[i]) this.addShaft(i, k);
		}
	}

	private shaftPath(ctx: CanvasRenderingContext2D, index: number) {
		const { x, y } = cellCentre(index);
		const top = y;
		const bottom = FLOOR_Y + 18;
		const shift = (bottom - top) * SLANT;
		ctx.beginPath();
		ctx.moveTo(x - 24, top);
		ctx.lineTo(x + 24, top);
		ctx.lineTo(x + shift + 46, bottom);
		ctx.lineTo(x + shift - 46, bottom);
		ctx.closePath();
		return { x, top, bottom, shift };
	}

	private addShaft(index: number, hue: number) {
		const { ctx } = this.light;
		const color = HUES[hue]!.light;
		const body = HUES[hue]!.base;
		const weight = this.columnWeight[index % COLS]!;
		ctx.setTransform(this.scale * LIGHT_RES, 0, 0, this.scale * LIGHT_RES, 0, 0);
		ctx.globalCompositeOperation = 'lighter';
		const { x, top, bottom, shift } = this.shaftPath(ctx, index);
		const beam = ctx.createLinearGradient(x, top, x + shift, bottom);
		beam.addColorStop(0, rgba(body, 0.24 * weight));
		beam.addColorStop(0.55, rgba(body, 0.09 * weight));
		beam.addColorStop(1, rgba(body, 0.12 * weight));
		ctx.fillStyle = beam;
		ctx.fill();
		ctx.save();
		ctx.translate(x + shift, FLOOR_Y + 26);
		ctx.scale(1, 0.26);
		const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, 64);
		pool.addColorStop(0, rgba(color, 0.34 * weight));
		pool.addColorStop(1, rgba(color, 0));
		ctx.fillStyle = pool;
		ctx.fillRect(-64, -64, 128, 128);
		ctx.restore();
		ctx.globalCompositeOperation = 'source-over';
	}

	private drawFlashes(dt: number) {
		const ctx = this.ctx;
		for (let i = this.flashes.length - 1; i >= 0; i -= 1) {
			const flash = this.flashes[i]!;
			flash.age += dt;
			const life = this.calm ? 0.3 : 1.1;
			if (flash.age >= life) {
				this.flashes.splice(i, 1);
				continue;
			}
			const fade = 1 - flash.age / life;
			const color = HUES[flash.hue]!.light;
			ctx.globalCompositeOperation = 'lighter';
			const { x, top, bottom, shift } = this.shaftPath(ctx, flash.index);
			const beam = ctx.createLinearGradient(x, top, x + shift, bottom);
			beam.addColorStop(0, rgba(color, 0.5 * fade * fade));
			beam.addColorStop(1, rgba(color, 0.12 * fade));
			ctx.fillStyle = beam;
			ctx.fill();
			if (flash.age < 0.18) {
				const c = flash.index % COLS;
				const r = Math.floor(flash.index / COLS);
				ctx.fillStyle = `rgba(255, 250, 235, ${0.8 * (1 - flash.age / 0.18)})`;
				ctx.fillRect(GRID_X + c * CELL_W + 2, GRID_Y + r * CELL_H + 2, CELL_W - 4, CELL_H - 4);
			}
			ctx.globalCompositeOperation = 'source-over';
		}
	}

	private drawShadows(world: World) {
		const ctx = this.ctx;
		ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
		ctx.beginPath();
		ctx.ellipse(world.beam.x + 8, FLOOR_Y + 16, world.beam.w * 0.5, 6, 0, 0, Math.PI * 2);
		ctx.fill();
	}

	private drawBeam(world: World, now: number) {
		const ctx = this.ctx;
		const { x, w } = world.beam;
		const left = x - w / 2;
		if (world.effects.lantern > 0) {
			const pulse = this.calm ? 1 : 0.8 + 0.2 * Math.sin(now / 160);
			const halo = ctx.createRadialGradient(x, BEAM_Y + BEAM_H / 2, 4, x, BEAM_Y + BEAM_H / 2, w * 0.7);
			halo.addColorStop(0, `rgba(255, 210, 120, ${0.28 * pulse})`);
			halo.addColorStop(1, 'rgba(255, 210, 120, 0)');
			ctx.globalCompositeOperation = 'lighter';
			ctx.fillStyle = halo;
			ctx.fillRect(x - w, BEAM_Y - w * 0.6, w * 2, w * 1.2);
			ctx.globalCompositeOperation = 'source-over';
		}
		const oak = ctx.createLinearGradient(0, BEAM_Y, 0, BEAM_Y + BEAM_H);
		oak.addColorStop(0, '#a06a3a');
		oak.addColorStop(0.45, '#6a3e1c');
		oak.addColorStop(1, '#3a200e');
		ctx.fillStyle = oak;
		ctx.beginPath();
		ctx.roundRect(left, BEAM_Y, w, BEAM_H, 7);
		ctx.fill();
		ctx.strokeStyle = 'rgba(30, 14, 4, 0.45)';
		ctx.lineWidth = 1;
		for (const fy of [0.38, 0.62]) {
			ctx.beginPath();
			ctx.moveTo(left + 14, BEAM_Y + BEAM_H * fy);
			ctx.bezierCurveTo(left + w * 0.35, BEAM_Y + BEAM_H * (fy - 0.12), left + w * 0.65, BEAM_Y + BEAM_H * (fy + 0.12), left + w - 14, BEAM_Y + BEAM_H * fy);
			ctx.stroke();
		}
		ctx.fillStyle = 'rgba(255, 228, 180, 0.35)';
		ctx.fillRect(left + 8, BEAM_Y + 1.5, w - 16, 1.5);
		for (const capX of [left, left + w - 15]) {
			const brass = ctx.createLinearGradient(0, BEAM_Y, 0, BEAM_Y + BEAM_H);
			brass.addColorStop(0, '#fbe3a0');
			brass.addColorStop(0.5, '#c08d34');
			brass.addColorStop(1, '#6e4a16');
			ctx.fillStyle = brass;
			ctx.beginPath();
			ctx.roundRect(capX, BEAM_Y - 1, 15, BEAM_H + 2, 5);
			ctx.fill();
			ctx.fillStyle = '#3e2a0c';
			ctx.beginPath();
			ctx.arc(capX + 7.5, BEAM_Y + BEAM_H / 2, 1.8, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	private drawBalls(world: World, now: number) {
		const ctx = this.ctx;
		const pierce = world.effects.sunburst > 0;
		const slow = world.effects.halo > 0;
		const live = new Set<number>();
		const sprite = this.ballSprite.canvas;
		const size = sprite.width / this.scale;
		for (const ball of world.balls) {
			live.add(ball.id);
			let trail = this.trails.get(ball.id);
			if (!trail) {
				trail = [];
				this.trails.set(ball.id, trail);
			}
			if (ball.stuck || this.calm) trail.length = 0;
			else {
				trail.push({ x: ball.x, y: ball.y });
				if (trail.length > 10) trail.shift();
			}
			ctx.globalCompositeOperation = 'lighter';
			for (let i = 0; i < trail.length; i += 1) {
				const p = trail[i]!;
				const f = (i + 1) / trail.length;
				ctx.fillStyle = pierce ? `rgba(255, 120, 90, ${0.16 * f})` : `rgba(255, 210, 140, ${0.13 * f})`;
				ctx.beginPath();
				ctx.arc(p.x, p.y, BALL_R * (0.35 + 0.6 * f), 0, Math.PI * 2);
				ctx.fill();
			}
			if (pierce) {
				const flare = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, 34);
				flare.addColorStop(0, 'rgba(255, 120, 80, 0.55)');
				flare.addColorStop(1, 'rgba(255, 80, 60, 0)');
				ctx.fillStyle = flare;
				ctx.fillRect(ball.x - 34, ball.y - 34, 68, 68);
			}
			ctx.drawImage(sprite, ball.x - size / 2, ball.y - size / 2, size, size);
			ctx.globalCompositeOperation = 'source-over';
			if (slow) {
				ctx.strokeStyle = `rgba(240, 246, 255, ${this.calm ? 0.7 : 0.5 + 0.25 * Math.sin(now / 200)})`;
				ctx.lineWidth = 1.5;
				ctx.beginPath();
				ctx.ellipse(ball.x, ball.y - BALL_R - 5, BALL_R * 0.9, 3, 0, 0, Math.PI * 2);
				ctx.stroke();
			}
		}
		for (const id of this.trails.keys()) if (!live.has(id)) this.trails.delete(id);
	}

	private drawRelic(kind: RelicKind, x: number, y: number, age: number) {
		const ctx = this.ctx;
		const color = RELIC_COLOR[kind];
		ctx.globalCompositeOperation = 'lighter';
		const glow = ctx.createRadialGradient(x, y, 0, x, y, 30);
		glow.addColorStop(0, rgba(color, 0.4));
		glow.addColorStop(1, rgba(color, 0));
		ctx.fillStyle = glow;
		ctx.fillRect(x - 30, y - 30, 60, 60);
		ctx.globalCompositeOperation = 'source-over';
		ctx.save();
		ctx.translate(x, y);
		ctx.scale(this.calm ? 1 : Math.max(0.3, Math.abs(Math.cos(age * 2.6))), 1);
		ctx.fillStyle = '#16131e';
		ctx.beginPath();
		ctx.arc(0, 0, 15, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = color;
		ctx.lineWidth = 2.4;
		ctx.stroke();
		ctx.fillStyle = color;
		ctx.strokeStyle = color;
		ctx.lineWidth = 1.8;
		drawGlyph(ctx, kind);
		ctx.restore();
	}

	private burst(x: number, y: number, hue: number, vx: number) {
		const colors = HUES[hue]!;
		const paint = mix(colors.base, STONE, 0.42, 0.6);
		const rubble = mix(STONE, '#000000', 0, 0.62);
		for (let i = 0; i < 10; i += 1) {
			if (this.shards.length >= MAX_SHARDS) this.shards.shift();
			this.shards.push({
				x: x + (Math.random() - 0.5) * CELL_W * 0.8,
				y: y + (Math.random() - 0.5) * CELL_H * 0.6,
				vx: (Math.random() - 0.5) * 240 + vx * 0.12,
				vy: -60 - Math.random() * 160,
				rot: Math.random() * Math.PI * 2,
				spin: (Math.random() - 0.5) * 14,
				size: 4 + Math.random() * 6,
				color: Math.random() < 0.45 ? paint : rubble,
				ground: FLOOR_Y + 6 + Math.random() * 56,
				landed: false,
				life: 1
			});
		}
		this.spray(x, y, '#cbbb9e', 5);
		this.spray(x, y, colors.light, 4);
	}

	private spray(x: number, y: number, color: string, count: number, lift = 0) {
		for (let i = 0; i < count; i += 1) {
			const a = lift < 0 ? -Math.PI / 2 + (Math.random() - 0.5) * 2.2 : Math.random() * Math.PI * 2;
			const speed = 80 + Math.random() * 200;
			this.sparks.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 1, color });
		}
		if (this.sparks.length > 200) this.sparks.splice(0, this.sparks.length - 200);
	}

	private drawShards(dt: number) {
		const ctx = this.ctx;
		for (let i = this.shards.length - 1; i >= 0; i -= 1) {
			const s = this.shards[i]!;
			if (!s.landed || s.vy !== 0) {
				s.vy += 1500 * dt;
				s.x += s.vx * dt;
				s.y += s.vy * dt;
				s.rot += s.spin * dt;
				if (s.y >= s.ground && s.vy > 0) {
					s.y = s.ground;
					if (!s.landed) {
						s.landed = true;
						s.vy = -s.vy * 0.25;
						s.vx *= 0.5;
						s.spin *= 0.4;
						if (Math.abs(s.vy) < 30) s.vy = 0;
					} else {
						s.vy = 0;
						s.spin = 0;
					}
				}
			} else {
				s.vx *= Math.exp(-dt * 8);
				s.x += s.vx * dt;
			}
			s.life -= dt * (s.landed ? 0.45 : 0.12);
			if (s.life <= 0) {
				this.shards.splice(i, 1);
				continue;
			}
			ctx.globalAlpha = Math.min(1, s.life * 2) * 0.9;
			ctx.fillStyle = s.color;
			ctx.save();
			ctx.translate(s.x, s.y);
			ctx.rotate(s.rot);
			ctx.beginPath();
			ctx.moveTo(-s.size * 0.5, s.size * 0.35);
			ctx.lineTo(s.size * 0.55, s.size * 0.2);
			ctx.lineTo(-s.size * 0.05, -s.size * 0.55);
			ctx.closePath();
			ctx.fill();
			ctx.restore();
		}
		ctx.globalAlpha = 1;
	}

	private drawSparks(dt: number) {
		const ctx = this.ctx;
		ctx.globalCompositeOperation = 'lighter';
		for (let i = this.sparks.length - 1; i >= 0; i -= 1) {
			const p = this.sparks[i]!;
			p.life -= dt * 2.4;
			if (p.life <= 0) {
				this.sparks.splice(i, 1);
				continue;
			}
			p.vy += 500 * dt;
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			ctx.fillStyle = rgba(p.color, p.life * 0.9);
			ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
		}
		ctx.globalCompositeOperation = 'source-over';
	}
}

/** Relic emblems, centred on 0,0 inside a 15 px medallion. */
export function drawGlyph(ctx: CanvasRenderingContext2D, kind: RelicKind) {
	switch (kind) {
		case 'lantern':
			ctx.fillRect(-4, -4, 8, 9);
			ctx.fillRect(-5.5, -7, 11, 2.2);
			ctx.fillRect(-5.5, 5, 11, 2);
			ctx.beginPath();
			ctx.moveTo(0, -7);
			ctx.lineTo(0, -10);
			ctx.stroke();
			break;
		case 'triptych':
			for (const ox of [-6, 0, 6]) {
				const h = ox === 0 ? 11 : 8;
				ctx.beginPath();
				ctx.moveTo(ox - 2.2, 6);
				ctx.lineTo(ox - 2.2, 6 - h + 3);
				ctx.lineTo(ox, 6 - h);
				ctx.lineTo(ox + 2.2, 6 - h + 3);
				ctx.lineTo(ox + 2.2, 6);
				ctx.closePath();
				ctx.fill();
			}
			break;
		case 'halo':
			ctx.beginPath();
			ctx.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2);
			ctx.stroke();
			ctx.beginPath();
			ctx.arc(0, 0, 2, 0, Math.PI * 2);
			ctx.fill();
			break;
		case 'sunburst':
			ctx.beginPath();
			ctx.arc(0, 0, 3.6, 0, Math.PI * 2);
			ctx.fill();
			for (let i = 0; i < 8; i += 1) {
				const a = (i / 8) * Math.PI * 2;
				ctx.beginPath();
				ctx.moveTo(Math.cos(a) * 5.5, Math.sin(a) * 5.5);
				ctx.lineTo(Math.cos(a) * 9.5, Math.sin(a) * 9.5);
				ctx.stroke();
			}
			break;
		case 'candle':
			ctx.fillRect(-2.6, -1, 5.2, 9);
			ctx.beginPath();
			ctx.moveTo(0, -9);
			ctx.quadraticCurveTo(3.5, -4, 0, -2.4);
			ctx.quadraticCurveTo(-3.5, -4, 0, -9);
			ctx.fill();
			break;
	}
}
