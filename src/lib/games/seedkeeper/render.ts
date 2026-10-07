import { ownerOf, type Board, type SowResult } from './engine';
import type { Schedule } from './timing';
import { SIZE, STORE, type Player } from './types';

/** Board space: the slab is W × H units, one unit between neighbouring pits. */
export const W = 9.1;
export const H = 3.2;
const ROW: Record<Player, number> = { 1: 2.15, 2: 1.05 };
const PIT_R = 0.43;
const STORE_R = 0.47;
const STORE_HALF = 0.95;
const STORE_Y = 1.6;
const NUMERAL = 0.74;
const SEED_RX = 0.088;
const SEED_RY = 0.07;
const LIFT_Z = 0.62;

type Pos = { x: number; y: number; z: number };
type Track = { t0: number; t1: number; at: (t: number) => Pos };

type Seed = {
	id: number;
	kind: number;
	angle: number;
	pit: number;
	slot: number;
	tracks: Track[];
};

type Ripple = { x: number; y: number; t0: number; dur: number; color: string; size: number };
type Spark = { x: number; y: number; z: number; vx: number; vy: number; vz: number; t0: number; life: number; color: string; size: number };
type Floater = { text: string; x: number; y: number; t0: number; color: string };
type Due = { at: number; run: () => void };

export type BoardView = {
	current: Player;
	/** The mover can be steered by a person (not the AI, not mid-sowing). */
	human: boolean;
	legal: number[];
	hover: number;
	cursor: number;
	preview: SowResult | null;
	counts: boolean;
	ended: boolean;
	winner: 0 | Player;
};

/** Seeds: jade, amber, rose quartz, river slate, ivory bean, obsidian. */
const KINDS: Array<[string, string, string]> = [
	['#b8f0cf', '#4fae80', '#174c35'],
	['#ffe2a0', '#e2a03c', '#7a420c'],
	['#ffd9e1', '#e293a6', '#8a3d52'],
	['#d4e6f7', '#7ea6cf', '#2c4a6e'],
	['#fffaf0', '#e4d8b8', '#8f7f58'],
	['#9a93a6', '#3b3644', '#0e0c12']
];

export const GLOW_RGB: Record<Player, [number, number, number]> = { 1: [246, 196, 83], 2: [143, 195, 234] };

function rgba([r, g, b]: [number, number, number], a: number) {
	return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function posOf(index: number): { x: number; y: number } {
	if (index < 6) return { x: 2.05 + index, y: ROW[1] };
	if (index === STORE[1]) return { x: 8.25, y: STORE_Y };
	if (index < STORE[2]) return { x: 7.05 - (index - 7), y: ROW[2] };
	return { x: 0.85, y: STORE_Y };
}

function slotOf(index: number, n: number): Pos {
	const store = index === STORE[1] || index === STORE[2];
	const cap = store ? 30 : 13;
	const layer = Math.floor(n / cap);
	const j = n % cap;
	const r = (store ? 0.085 : 0.093) * Math.sqrt(j + 0.35);
	const a = j * 2.39996 + layer * 1.1 + index * 0.7;
	const p = posOf(index);
	return store
		? { x: p.x + r * Math.cos(a) * 0.8, y: p.y + r * Math.sin(a) * 1.75, z: layer * 0.06 }
		: { x: p.x + r * Math.cos(a), y: p.y + r * Math.sin(a), z: layer * 0.06 };
}

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

const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const clamp01 = (u: number) => Math.max(0, Math.min(1, u));

export class BankRenderer {
	motion = true;
	onLand: (k: number, index: number, pan: number) => void = () => {};
	onLift: (count: number, pan: number) => void = () => {};

	private ctx: CanvasRenderingContext2D;
	private cssW = 0;
	private cssH = 0;
	private dpr = 1;
	private s = 1;
	private ox = 0;
	private oy = 0;
	private portrait = false;
	private slab: HTMLCanvasElement | null = null;
	private sprites: HTMLCanvasElement[] = [];
	private shadow: HTMLCanvasElement | null = null;
	private grain: HTMLCanvasElement | null = null;
	private seeds: Seed[] = [];
	private display: number[] = new Array(SIZE).fill(0);
	private ripples: Ripple[] = [];
	private sparks: Spark[] = [];
	private floaters: Floater[] = [];
	private due: Due[] = [];
	private nextId = 1;
	private busyUntil = 0;
	private flies = Array.from({ length: 9 }, (_, k) => ({ seed: hash(k + 3) * 100, phase: hash(k + 17) * 6.28 }));

	constructor(private canvas: HTMLCanvasElement) {
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('2d canvas unavailable');
		this.ctx = ctx;
	}

	/** Lay the board into a box of css pixels; tall boxes turn it on its side. */
	resize(cssW: number, cssH: number) {
		this.cssW = cssW;
		this.cssH = cssH;
		this.dpr = Math.min(window.devicePixelRatio || 1, 2);
		this.canvas.width = Math.max(1, Math.round(cssW * this.dpr));
		this.canvas.height = Math.max(1, Math.round(cssH * this.dpr));
		this.portrait = cssH > cssW * 1.05;
		const pad = 0.94;
		this.s = this.portrait ? Math.min((cssW * pad) / H, (cssH * pad) / W) : Math.min((cssW * pad) / W, (cssH * pad) / H);
		const bw = (this.portrait ? H : W) * this.s;
		const bh = (this.portrait ? W : H) * this.s;
		this.ox = (cssW - bw) / 2;
		this.oy = (cssH - bh) / 2;
		this.buildSprites();
		this.buildSlab();
	}

	/** Board units to css pixels. */
	screen(x: number, y: number): [number, number] {
		return this.portrait ? [this.ox + y * this.s, this.oy + (W - x) * this.s] : [this.ox + x * this.s, this.oy + y * this.s];
	}

	/** The pit or store under a css-pixel point, or -1. */
	indexAt(px: number, py: number) {
		let best = -1;
		let bestD = Infinity;
		for (let i = 0; i < SIZE; i += 1) {
			const p = posOf(i);
			const [sx, sy] = this.screen(p.x, p.y);
			const d = Math.hypot(px - sx, py - sy) / this.s;
			const reach = i === STORE[1] || i === STORE[2] ? STORE_HALF : PIT_R * 1.25;
			if (d < reach && d < bestD) {
				best = i;
				bestD = d;
			}
		}
		return best;
	}

	/** Where a pit sits on screen, for stereo pan and overlays. */
	panOf(index: number) {
		const p = posOf(index);
		const [sx] = this.screen(p.x, p.y);
		return (sx / Math.max(1, this.cssW)) * 2 - 1;
	}

	busy(now: number) {
		return now < this.busyUntil || this.due.length > 0;
	}

	load(board: Board) {
		this.seeds = [];
		this.due = [];
		this.ripples = [];
		this.sparks = [];
		this.floaters = [];
		this.busyUntil = 0;
		for (let i = 0; i < SIZE; i += 1) {
			for (let n = 0; n < board[i]; n += 1) this.seeds.push(this.makeSeed(i, n));
			this.display[i] = board[i];
		}
	}

	private makeSeed(pit: number, slot: number): Seed {
		const id = this.nextId++;
		return { id, kind: Math.floor(hash(id * 1.37) * KINDS.length), angle: hash(id * 7.1) * Math.PI, pit, slot, tracks: [] };
	}

	private settle(seed: Seed) {
		const now = performance.now();
		seed.tracks = seed.tracks.filter((track) => track.t1 > now);
	}

	private restPos(seed: Seed): Pos {
		return slotOf(seed.pit, seed.slot);
	}

	private posAt(seed: Seed, now: number): Pos {
		for (const track of seed.tracks) {
			if (now <= track.t1) return track.at(Math.max(now, track.t0));
		}
		return this.restPos(seed);
	}

	/** Script a sowing (and any capture and sweep after it) against the shared schedule. */
	sow(pit: number, player: Player, result: SowResult, plan: Schedule) {
		const t0 = performance.now();
		for (const seed of this.seeds) this.settle(seed);
		const from = posOf(pit);
		const lifted = this.seeds.filter((s) => s.pit === pit).sort((a, b) => b.slot - a.slot);
		const n = result.path.length;
		const counts = this.display.slice();
		counts[pit] = 0;
		const way = [from, ...result.path.map(posOf)];
		const arrive = (k: number) => t0 + plan.lift + k * plan.hop;
		const hand = (t: number): Pos => {
			if (t <= t0 + plan.lift) return { x: from.x, y: from.y, z: LIFT_Z * ease(clamp01((t - t0) / Math.max(1, plan.lift))) };
			const k = Math.min(n, Math.floor((t - t0 - plan.lift) / plan.hop));
			if (k >= n) return { ...way[n], z: LIFT_Z };
			const u = ease(clamp01((t - arrive(k)) / plan.hop));
			const a = way[k];
			const b = way[k + 1];
			return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), z: LIFT_Z + Math.sin(u * Math.PI) * 0.12 };
		};
		this.at(t0, () => {
			this.display[pit] = 0;
			this.onLift(lifted.length, this.panOf(pit));
			this.ripple(from.x, from.y, player === 1 ? '#ffe59a' : '#cfe6f7', 0.7, 500);
		});

		lifted.forEach((seed, k) => {
			const target = result.path[k];
			const slot = counts[target];
			counts[target] += 1;
			const start = this.restPos(seed);
			const dropAt = arrive(k + 1);
			const landAt = t0 + plan.landAt(k);
			const end = slotOf(target, slot);
			const orbit = (t: number) => {
				const left = Math.max(1, n - Math.min(n, Math.floor((t - t0 - plan.lift) / plan.hop)));
				const a = (k / n) * Math.PI * 2 + (t - t0) * 0.004;
				const r = Math.min(0.17, 0.05 + left * 0.012);
				return { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.8, z: Math.sin(a * 2 + k) * 0.04 };
			};
			seed.tracks.push({
				t0,
				t1: landAt,
				at: (t) => {
					if (t < t0 + plan.lift) {
						const u = ease(clamp01((t - t0) / Math.max(1, plan.lift)));
						const h = hand(t);
						const o = orbit(t);
						return { x: lerp(start.x, h.x + o.x, u), y: lerp(start.y, h.y + o.y, u), z: lerp(start.z, h.z + o.z, u) };
					}
					if (t < dropAt) {
						const h = hand(t);
						const o = orbit(t);
						return { x: h.x + o.x, y: h.y + o.y, z: h.z + o.z };
					}
					const h = hand(dropAt);
					const o = orbit(dropAt);
					const u = clamp01((t - dropAt) / Math.max(1, plan.fall));
					return { x: lerp(h.x + o.x, end.x, u), y: lerp(h.y + o.y, end.y, u), z: lerp(end.z, h.z + o.z, 1 - u * u) };
				}
			});
			const bounce = plan.lift ? 220 : 1;
			seed.tracks.push({
				t0: landAt,
				t1: landAt + bounce,
				at: (t) => {
					const u = clamp01((t - landAt) / bounce);
					return { x: end.x, y: end.y, z: end.z + Math.abs(Math.sin(u * Math.PI)) * 0.05 * (1 - u) };
				}
			});
			seed.pit = target;
			seed.slot = slot;
			this.at(landAt, () => {
				this.display[target] += 1;
				const p = posOf(target);
				this.onLand(k, target, this.panOf(target));
				this.ripple(p.x, p.y, target === STORE[player] ? (player === 1 ? '#ffe59a' : '#cfe6f7') : '#e8fff2', target === STORE[player] ? 1.2 : 0.65, 520);
				this.dust(end.x, end.y, 4, '#f8f2dc');
			});
		});

		let tail = t0 + plan.sowEnd;
		if (result.capture) {
			const { pit: cp, opposite: op } = result.capture;
			const store = STORE[player];
			const taken = [...this.seeds.filter((s) => s.pit === cp), ...this.seeds.filter((s) => s.pit === op)];
			const color = player === 1 ? '#ffe59a' : '#cfe6f7';
			const at = t0 + plan.captureAt;
			this.at(at, () => {
				const p = posOf(cp);
				const q = posOf(op);
				this.ripple(p.x, p.y, color, 4.2, 1300);
				this.ripple(q.x, q.y, color, 2.2, 900);
				this.burst(p.x, p.y, 14, color);
				this.burst(q.x, q.y, 10, color);
				this.display[cp] = 0;
				this.display[op] = 0;
			});
			this.fly(taken, store, at, plan.captureFly, plan.captureStagger, color, counts);
			tail = t0 + plan.captureEnd;
		}

		if (result.sweep.length) {
			const at = t0 + plan.sweepAt;
			let order = 0;
			const groups = result.sweep.map((s) => ({ ...s, seeds: this.seeds.filter((seed) => seed.pit === s.pit) }));
			for (const g of groups) {
				this.at(at, () => {
					this.display[g.pit] = 0;
				});
				const owner = ownerOf(g.pit) as Player;
				const color = owner === 1 ? '#ffe59a' : '#cfe6f7';
				this.fly(g.seeds, g.store, at, plan.sweepFly, plan.sweepStagger, color, counts, order);
				order += g.seeds.length;
			}
			tail = t0 + plan.end;
		}

		if (result.extra) {
			const p = posOf(STORE[player]);
			this.at(t0 + plan.sowEnd + 80, () => {
				this.floaters.push({ text: 'Sow again', x: p.x, y: p.y, t0: performance.now(), color: player === 1 ? '#ffe59a' : '#cfe6f7' });
				this.ring(p.x, p.y, player === 1 ? '#ffe59a' : '#cfe6f7');
			});
		}
		this.busyUntil = Math.max(tail, t0 + plan.end, result.extra ? t0 + plan.sowEnd + 1400 : 0) + 260;
	}

	private fly(group: Seed[], store: number, at: number, dur: number, stagger: number, color: string, counts: number[], offset = 0) {
		const home = posOf(store);
		group.forEach((seed, j) => {
			const order = Math.min(offset + j, 20);
			const start = slotOf(seed.pit, seed.slot);
			const slot = counts[store];
			counts[store] += 1;
			counts[seed.pit] = Math.max(0, counts[seed.pit] - 1);
			const end = slotOf(store, slot);
			const t0 = at + order * stagger;
			const t1 = t0 + dur * 0.8;
			const peak = 0.5 + 0.35 * Math.min(1, Math.abs(start.x - home.x) / 6);
			const bend = (hash(seed.id) - 0.5) * 0.5;
			seed.tracks.push({
				t0,
				t1,
				at: (t) => {
					const u = ease(clamp01((t - t0) / (t1 - t0)));
					const side = Math.sin(u * Math.PI) * bend;
					return { x: lerp(start.x, end.x, u), y: lerp(start.y, end.y, u) + side, z: lerp(start.z, end.z, u) + Math.sin(u * Math.PI) * peak };
				}
			});
			seed.pit = store;
			seed.slot = slot;
			for (let k = 1; k < 4; k += 1) {
				this.at(t0 + (t1 - t0) * (k / 4), () => {
					const p = this.posAt(seed, performance.now());
					this.sparks.push({ x: p.x, y: p.y, z: p.z, vx: 0, vy: 0, vz: -0.1, t0: performance.now(), life: 520, color, size: 0.05 });
				});
			}
			this.at(t1, () => {
				this.display[store] += 1;
				if (j % 3 === 0) this.onLand(Math.min(11, 4 + Math.floor(j / 3)), store, this.panOf(store));
				this.dust(end.x, end.y, 2, color);
			});
		});
	}

	private at(at: number, run: () => void) {
		this.due.push({ at, run });
		this.due.sort((a, b) => a.at - b.at);
	}

	private ripple(x: number, y: number, color: string, size: number, dur: number) {
		if (!this.motion) return;
		this.ripples.push({ x, y, t0: performance.now(), dur, color, size });
	}

	private dust(x: number, y: number, count: number, color: string) {
		if (!this.motion) return;
		const now = performance.now();
		for (let k = 0; k < count; k += 1) {
			const a = Math.random() * Math.PI * 2;
			const v = 0.25 + Math.random() * 0.35;
			this.sparks.push({ x, y, z: 0.02, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 0.4 + Math.random() * 0.4, t0: now, life: 380 + Math.random() * 200, color, size: 0.025 });
		}
	}

	private burst(x: number, y: number, count: number, color: string) {
		if (!this.motion) return;
		const now = performance.now();
		for (let k = 0; k < count; k += 1) {
			const a = Math.random() * Math.PI * 2;
			const v = 0.3 + Math.random() * 0.9;
			this.sparks.push({ x, y, z: 0.05, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 0.6 + Math.random() * 1.2, t0: now, life: 900 + Math.random() * 600, color, size: 0.045 });
		}
	}

	private ring(x: number, y: number, color: string) {
		if (!this.motion) return;
		const now = performance.now();
		for (let k = 0; k < 12; k += 1) {
			const a = (k / 12) * Math.PI * 2;
			this.sparks.push({ x: x + Math.cos(a) * 0.5, y: y + Math.sin(a) * 1.0, z: 0.2, vx: -Math.sin(a) * 0.6, vy: Math.cos(a) * 1.1, vz: 0.15, t0: now, life: 1000, color, size: 0.05 });
		}
	}

	private buildSprites() {
		const px = this.s * this.dpr;
		const w = Math.ceil(SEED_RX * 2 * px + 4);
		const h = Math.ceil(SEED_RY * 2 * px + 4);
		this.sprites = KINDS.map(([hi, mid, lo], k) => {
			const c = document.createElement('canvas');
			c.width = w;
			c.height = h;
			const g = c.getContext('2d')!;
			const rx = SEED_RX * px;
			const ry = SEED_RY * px;
			const grad = g.createRadialGradient(w / 2 - rx * 0.35, h / 2 - ry * 0.45, rx * 0.1, w / 2, h / 2, rx * 1.15);
			grad.addColorStop(0, hi);
			grad.addColorStop(0.45, mid);
			grad.addColorStop(1, lo);
			g.fillStyle = grad;
			g.beginPath();
			g.ellipse(w / 2, h / 2, rx, ry, 0, 0, Math.PI * 2);
			g.fill();
			if (k === 4) {
				g.strokeStyle = 'rgba(120, 90, 50, 0.45)';
				g.lineWidth = Math.max(1, px * 0.008);
				g.beginPath();
				g.ellipse(w / 2, h / 2, rx * 0.7, ry * 0.08, 0, 0, Math.PI * 2);
				g.stroke();
			}
			g.fillStyle = 'rgba(255, 255, 255, 0.75)';
			g.beginPath();
			g.ellipse(w / 2 - rx * 0.35, h / 2 - ry * 0.42, rx * 0.28, ry * 0.18, -0.4, 0, Math.PI * 2);
			g.fill();
			g.strokeStyle = 'rgba(0, 0, 0, 0.25)';
			g.lineWidth = 1;
			g.beginPath();
			g.ellipse(w / 2, h / 2, rx - 0.5, ry - 0.5, 0, 0, Math.PI * 2);
			g.stroke();
			return c;
		});
		const sc = document.createElement('canvas');
		const sw = Math.ceil(SEED_RX * 3 * px);
		sc.width = sw;
		sc.height = sw;
		const sg = sc.getContext('2d')!;
		const shade = sg.createRadialGradient(sw / 2, sw / 2, 0, sw / 2, sw / 2, sw / 2);
		shade.addColorStop(0, 'rgba(8, 12, 8, 0.55)');
		shade.addColorStop(0.55, 'rgba(8, 12, 8, 0.3)');
		shade.addColorStop(1, 'rgba(8, 12, 8, 0)');
		sg.fillStyle = shade;
		sg.fillRect(0, 0, sw, sw);
		this.shadow = sc;
	}

	private grainTile() {
		if (this.grain) return this.grain;
		const size = 192;
		const c = document.createElement('canvas');
		c.width = size;
		c.height = size;
		const g = c.getContext('2d')!;
		const img = g.createImageData(size, size);
		const rnd = mulberry(77);
		for (let i = 0; i < size * size; i += 1) {
			const r = rnd();
			let v = 128 + (rnd() - 0.5) * 34;
			if (r > 0.985) v = 220;
			else if (r > 0.965) v = 40;
			img.data[i * 4] = v;
			img.data[i * 4 + 1] = v;
			img.data[i * 4 + 2] = v;
			img.data[i * 4 + 3] = 255;
		}
		g.putImageData(img, 0, 0);
		this.grain = c;
		return c;
	}

	/** Trace a board-space rounded rectangle in screen space. */
	private roundRect(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, r: number) {
		const [ax, ay] = this.screen(x0, y0);
		const [bx, by] = this.screen(x1, y1);
		const left = Math.min(ax, bx);
		const top = Math.min(ay, by);
		g.beginPath();
		g.roundRect(left, top, Math.abs(bx - ax), Math.abs(by - ay), r * this.s);
	}

	private storePath(g: CanvasRenderingContext2D, index: number, grow = 0) {
		const p = posOf(index);
		const r = STORE_R + grow;
		this.roundRect(g, p.x - r, p.y - STORE_HALF - grow, p.x + r, p.y + STORE_HALF + grow, r);
	}

	private hollow(g: CanvasRenderingContext2D, index: number) {
		const s = this.s;
		const p = posOf(index);
		const [cx, cy] = this.screen(p.x, p.y);
		const store = index === STORE[1] || index === STORE[2];
		const r = (store ? STORE_R : PIT_R) * s;
		const trace = (grow: number) => {
			if (store) this.storePath(g, index, grow / s);
			else {
				g.beginPath();
				g.arc(cx, cy, r + grow, 0, Math.PI * 2);
			}
		};
		trace(r * 0.12);
		const lip = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
		lip.addColorStop(0, 'rgba(230, 240, 220, 0.28)');
		lip.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
		lip.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
		g.fillStyle = lip;
		g.fill();
		trace(0);
		const reach = store ? STORE_HALF * s : r;
		const inner = g.createRadialGradient(cx - r * 0.25, cy - r * 0.3, r * 0.1, cx, cy, reach * 1.1);
		inner.addColorStop(0, '#2d3229');
		inner.addColorStop(0.7, '#20251e');
		inner.addColorStop(1, '#13160f');
		g.fillStyle = inner;
		g.fill();
		g.save();
		trace(0);
		g.clip();
		g.globalAlpha = 0.18;
		g.fillStyle = g.createPattern(this.grainTile(), 'repeat')!;
		g.globalCompositeOperation = 'overlay';
		g.fill();
		g.globalCompositeOperation = 'source-over';
		g.globalAlpha = 1;
		const wall = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
		wall.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
		wall.addColorStop(0.45, 'rgba(0, 0, 0, 0)');
		wall.addColorStop(0.8, 'rgba(190, 210, 170, 0.06)');
		wall.addColorStop(1, 'rgba(220, 235, 200, 0.22)');
		g.lineWidth = r * 0.3;
		g.strokeStyle = wall;
		trace(0);
		g.stroke();
		g.restore();
	}

	private buildSlab() {
		const c = this.slab ?? document.createElement('canvas');
		c.width = this.canvas.width;
		c.height = this.canvas.height;
		const g = c.getContext('2d')!;
		g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
		g.clearRect(0, 0, this.cssW, this.cssH);
		const s = this.s;
		const [x0, y0] = this.screen(0, 0);
		const [x1, y1] = this.screen(W, H);
		const left = Math.min(x0, x1);
		const top = Math.min(y0, y1);
		const bw = Math.abs(x1 - x0);
		const bh = Math.abs(y1 - y0);

		g.save();
		g.shadowColor = 'rgba(0, 0, 0, 0.6)';
		g.shadowBlur = s * 0.4;
		g.shadowOffsetY = s * 0.14;
		this.roundRect(g, 0, 0, W, H, 0.6);
		g.fillStyle = '#4f564c';
		g.fill();
		g.restore();

		this.roundRect(g, 0, 0, W, H, 0.6);
		const base = g.createLinearGradient(left, top, left + bw * 0.4, top + bh * 1.4);
		base.addColorStop(0, '#7d8576');
		base.addColorStop(0.5, '#60695d');
		base.addColorStop(1, '#424a40');
		g.fillStyle = base;
		g.fill();

		g.save();
		this.roundRect(g, 0, 0, W, H, 0.6);
		g.clip();
		g.globalAlpha = 0.32;
		g.globalCompositeOperation = 'overlay';
		g.fillStyle = g.createPattern(this.grainTile(), 'repeat')!;
		g.fillRect(left, top, bw, bh);
		g.globalCompositeOperation = 'source-over';
		g.globalAlpha = 1;

		const rnd = mulberry(4021);
		for (let k = 0; k < 26; k += 1) {
			const x = left + rnd() * bw;
			const y = top + rnd() * bh;
			const r = s * (0.25 + rnd() * 0.7);
			const blot = g.createRadialGradient(x, y, 0, x, y, r);
			const light = rnd() > 0.5;
			blot.addColorStop(0, light ? 'rgba(200, 210, 185, 0.08)' : 'rgba(20, 28, 20, 0.1)');
			blot.addColorStop(1, 'rgba(0, 0, 0, 0)');
			g.fillStyle = blot;
			g.fillRect(x - r, y - r, r * 2, r * 2);
		}

		for (let k = 0; k < 9; k += 1) {
			const x = left + rnd() * bw;
			const y = top + rnd() * bh;
			const r = s * (0.04 + rnd() * 0.08);
			g.strokeStyle = 'rgba(214, 222, 150, 0.35)';
			g.lineWidth = s * 0.012;
			g.beginPath();
			g.arc(x, y, r, 0, Math.PI * 2);
			g.stroke();
			g.fillStyle = 'rgba(200, 210, 130, 0.14)';
			g.fill();
		}

		const sheen = g.createRadialGradient(left + bw * 0.25, top + bh * 0.1, 0, left + bw * 0.25, top + bh * 0.1, Math.max(bw, bh) * 0.7);
		sheen.addColorStop(0, 'rgba(255, 245, 220, 0.16)');
		sheen.addColorStop(1, 'rgba(255, 245, 220, 0)');
		g.fillStyle = sheen;
		g.fillRect(left, top, bw, bh);

		const edge = s * 0.18;
		g.lineWidth = edge;
		const bevel = g.createLinearGradient(left, top, left + bw, top + bh);
		bevel.addColorStop(0, 'rgba(230, 238, 215, 0.3)');
		bevel.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
		bevel.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
		g.strokeStyle = bevel;
		this.roundRect(g, 0, 0, W, H, 0.6);
		g.stroke();
		g.restore();

		g.save();
		g.lineCap = 'round';
		const wave = (dx: number, dy: number, color: string, width: number) => {
			g.beginPath();
			for (let k = 0; k <= 80; k += 1) {
				const x = 1.62 + (k / 80) * 5.86;
				const y = STORE_Y + Math.sin(x * 3.1) * 0.06;
				const [sx, sy] = this.screen(x, y);
				if (k === 0) g.moveTo(sx + dx, sy + dy);
				else g.lineTo(sx + dx, sy + dy);
			}
			g.strokeStyle = color;
			g.lineWidth = width;
			g.stroke();
		};
		wave(s * 0.012, s * 0.012, 'rgba(225, 235, 210, 0.22)', s * 0.035);
		wave(0, 0, 'rgba(18, 24, 16, 0.55)', s * 0.035);
		g.restore();

		for (let i = 0; i < SIZE; i += 1) this.hollow(g, i);

		const mossRnd = mulberry(913);
		const greens = ['#3f6b2c', '#5b8a33', '#78a83d', '#2f5524', '#9dc25a'];
		const perimeter = 2 * (W + H);
		for (let k = 0; k < 64; k += 1) {
			let d = mossRnd() * perimeter;
			let bx: number;
			let by: number;
			if (d < W) {
				bx = d;
				by = 0.05;
			} else if ((d -= W) < H) {
				bx = W - 0.05;
				by = d;
			} else if ((d -= H) < W) {
				bx = W - d;
				by = H - 0.05;
			} else {
				d -= W;
				bx = 0.05;
				by = H - d;
			}
			const corner = Math.min(Math.hypot(bx, by), Math.hypot(W - bx, by), Math.hypot(bx, H - by), Math.hypot(W - bx, H - by));
			if (corner > 2.2 && mossRnd() > 0.45) continue;
			const blobs = 5 + Math.floor(mossRnd() * 9);
			for (let b = 0; b < blobs; b += 1) {
				const mx = Math.max(0.12, Math.min(W - 0.12, bx + (mossRnd() - 0.5) * 0.5));
				const my = Math.max(0.12, Math.min(H - 0.12, by + (mossRnd() - 0.5) * 0.4));
				if (Math.hypot(mx - 0.6, my - 0.6) > 0.62 && mx < 0.6 && my < 0.6) continue;
				if (Math.hypot(mx - (W - 0.6), my - 0.6) > 0.62 && mx > W - 0.6 && my < 0.6) continue;
				if (Math.hypot(mx - 0.6, my - (H - 0.6)) > 0.62 && mx < 0.6 && my > H - 0.6) continue;
				if (Math.hypot(mx - (W - 0.6), my - (H - 0.6)) > 0.62 && mx > W - 0.6 && my > H - 0.6) continue;
				const [sx, sy] = this.screen(mx, my);
				g.fillStyle = greens[Math.floor(mossRnd() * greens.length)];
				g.globalAlpha = 0.55 + mossRnd() * 0.4;
				g.beginPath();
				g.arc(sx, sy, s * (0.025 + mossRnd() * 0.05), 0, Math.PI * 2);
				g.fill();
			}
			if (mossRnd() > 0.7) {
				const [sx, sy] = this.screen(Math.max(0.15, Math.min(W - 0.15, bx)), Math.max(0.15, Math.min(H - 0.15, by)));
				g.globalAlpha = 0.95;
				const petal = mossRnd() > 0.5 ? '#fdf6e3' : '#ffe27a';
				for (let p = 0; p < 5; p += 1) {
					const a = (p / 5) * Math.PI * 2;
					g.fillStyle = petal;
					g.beginPath();
					g.arc(sx + Math.cos(a) * s * 0.022, sy + Math.sin(a) * s * 0.022, s * 0.016, 0, Math.PI * 2);
					g.fill();
				}
				g.fillStyle = '#e8a33c';
				g.beginPath();
				g.arc(sx, sy, s * 0.012, 0, Math.PI * 2);
				g.fill();
			}
		}
		g.globalAlpha = 1;
		this.slab = c;
	}

	draw(now: number, view: BoardView) {
		const g = this.ctx;
		const s = this.s;
		const t = now / 1000;
		while (this.due.length && this.due[0].at <= now) this.due.shift()!.run();

		g.setTransform(1, 0, 0, 1, 0, 0);
		g.clearRect(0, 0, this.canvas.width, this.canvas.height);
		if (this.slab) g.drawImage(this.slab, 0, 0);
		g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

		const glow = GLOW_RGB[view.current];
		if (!view.ended) {
			const pulse = 0.75 + 0.25 * Math.sin(t * 2.2);
			g.save();
			g.globalCompositeOperation = 'lighter';
			for (let k = 0; k < 6; k += 1) {
				const p = posOf(view.current === 1 ? k : 7 + k);
				const [sx, sy] = this.screen(p.x, p.y);
				const r = s * 0.75;
				const wash = g.createRadialGradient(sx, sy, s * PIT_R * 0.8, sx, sy, r);
				wash.addColorStop(0, rgba(glow, 0.1 * pulse));
				wash.addColorStop(1, rgba(glow, 0));
				g.fillStyle = wash;
				g.fillRect(sx - r, sy - r, r * 2, r * 2);
			}
			g.restore();
			this.glowStore(STORE[view.current], glow, 0.22 + 0.1 * pulse);

			const travel = (t * 0.16) % 1;
			const dir = view.current === 1 ? travel : 1 - travel;
			const cx = 1.62 + dir * 5.86;
			const [sx, sy] = this.screen(cx, STORE_Y + Math.sin(cx * 3.1) * 0.06);
			const halo = g.createRadialGradient(sx, sy, 0, sx, sy, s * 0.35);
			halo.addColorStop(0, rgba(glow, 0.55));
			halo.addColorStop(1, rgba(glow, 0));
			g.save();
			g.globalCompositeOperation = 'lighter';
			g.fillStyle = halo;
			g.fillRect(sx - s * 0.35, sy - s * 0.35, s * 0.7, s * 0.7);
			g.restore();
		} else if (view.winner) {
			this.glowStore(STORE[view.winner], GLOW_RGB[view.winner], 0.45 + 0.2 * Math.sin(t * 3));
		}

		if (view.human) {
			for (const pit of view.legal) {
				const strong = pit === view.hover || pit === view.cursor;
				this.rimGlow(pit, glow, strong ? 0.9 : 0.25 + 0.12 * Math.sin(t * 3 + pit), strong);
			}
		}

		if (view.human && view.preview) this.drawTrail(view.preview, view, t);

		for (const r of this.ripples) {
			const u = (now - r.t0) / r.dur;
			if (u >= 1) continue;
			const [sx, sy] = this.screen(r.x, r.y);
			g.save();
			g.globalCompositeOperation = 'lighter';
			g.strokeStyle = r.color;
			g.globalAlpha = (1 - u) * (r.size > 2 ? 0.5 : 0.7);
			g.lineWidth = s * 0.04 * (1 - u * 0.6);
			g.beginPath();
			g.arc(sx, sy, s * (0.15 + u * r.size * 0.5), 0, Math.PI * 2);
			g.stroke();
			if (r.size > 2) {
				g.globalAlpha = (1 - u) * 0.25;
				g.beginPath();
				g.arc(sx, sy, s * (0.1 + u * r.size * 0.32), 0, Math.PI * 2);
				g.stroke();
			}
			g.restore();
		}
		this.ripples = this.ripples.filter((r) => now - r.t0 < r.dur);

		this.drawSeeds(now, view);

		const dt = 1 / 60;
		g.save();
		g.globalCompositeOperation = 'lighter';
		for (const p of this.sparks) {
			const u = (now - p.t0) / p.life;
			if (u >= 1) continue;
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			p.z = Math.max(0, p.z + p.vz * dt);
			p.vz -= 1.4 * dt;
			p.vx *= 0.97;
			p.vy *= 0.97;
			const [sx, sy0] = this.screen(p.x, p.y);
			const sy = sy0 - p.z * s;
			const r = s * p.size * (1 - u * 0.5);
			const halo = g.createRadialGradient(sx, sy, 0, sx, sy, r * 3);
			halo.addColorStop(0, p.color);
			halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
			g.globalAlpha = (1 - u) * 0.9;
			g.fillStyle = halo;
			g.fillRect(sx - r * 3, sy - r * 3, r * 6, r * 6);
		}
		g.restore();
		this.sparks = this.sparks.filter((p) => now - p.t0 < p.life);

		if (view.counts) this.drawCounts(view);

		for (const f of this.floaters) {
			const u = (now - f.t0) / 1300;
			if (u >= 1) continue;
			const [sx, sy] = this.screen(f.x, f.y);
			g.save();
			g.globalAlpha = Math.sin(Math.min(1, u * 1.2) * Math.PI);
			g.font = `italic 600 ${Math.round(s * 0.26)}px Fraunces, Georgia, serif`;
			g.textAlign = 'center';
			g.fillStyle = f.color;
			g.shadowColor = 'rgba(0, 0, 0, 0.7)';
			g.shadowBlur = s * 0.12;
			g.fillText(f.text, sx, sy - s * (0.3 + u * 0.6));
			g.restore();
		}
		this.floaters = this.floaters.filter((f) => now - f.t0 < 1300);

		if (this.motion) {
			this.drawLadybug(t);
			this.drawFlies(t);
		}
	}

	private glowStore(index: number, rgb: [number, number, number], strength: number) {
		const g = this.ctx;
		g.save();
		g.globalCompositeOperation = 'lighter';
		g.shadowColor = rgba(rgb, strength);
		g.shadowBlur = this.s * 0.5;
		g.strokeStyle = rgba(rgb, strength * 0.9);
		g.lineWidth = this.s * 0.035;
		this.storePath(g, index, 0.04);
		g.stroke();
		g.restore();
	}

	private rimGlow(index: number, rgb: [number, number, number], strength: number, strong: boolean) {
		const g = this.ctx;
		const p = posOf(index);
		const [sx, sy] = this.screen(p.x, p.y);
		g.save();
		g.globalCompositeOperation = 'lighter';
		g.shadowColor = rgba(rgb, strength);
		g.shadowBlur = this.s * (strong ? 0.45 : 0.25);
		g.strokeStyle = rgba(rgb, strength * (strong ? 0.95 : 0.6));
		g.lineWidth = this.s * (strong ? 0.045 : 0.025);
		g.beginPath();
		g.arc(sx, sy, this.s * (PIT_R + 0.04), 0, Math.PI * 2);
		g.stroke();
		if (strong) {
			const fill = g.createRadialGradient(sx, sy, 0, sx, sy, this.s * PIT_R);
			fill.addColorStop(0, rgba(rgb, 0.18));
			fill.addColorStop(1, rgba(rgb, 0));
			g.fillStyle = fill;
			g.fill();
		}
		g.restore();
	}

	/** Light every pit the hovered sowing would reach, brightest at the last seed. */
	private drawTrail(preview: SowResult, view: BoardView, t: number) {
		const g = this.ctx;
		const s = this.s;
		const glow = GLOW_RGB[view.current];
		const n = preview.path.length;
		const hits = new Map<number, number>();
		preview.path.forEach((index) => hits.set(index, (hits.get(index) ?? 0) + 1));
		g.save();
		g.globalCompositeOperation = 'lighter';
		let k = 0;
		for (const [index, count] of hits) {
			const p = posOf(index);
			const [sx, sy] = this.screen(p.x, p.y);
			const wave = 0.5 + 0.5 * Math.sin(t * 6 - k * 0.7);
			const r = s * (0.07 + 0.02 * wave + 0.015 * (count - 1));
			const dot = g.createRadialGradient(sx, sy, 0, sx, sy, r * 2.2);
			dot.addColorStop(0, rgba(glow, 0.8));
			dot.addColorStop(1, rgba(glow, 0));
			g.fillStyle = dot;
			g.fillRect(sx - r * 2.2, sy - r * 2.2, r * 4.4, r * 4.4);
			k += 1;
		}
		const last = preview.path[n - 1];
		const lp = posOf(last);
		const [lx, ly] = this.screen(lp.x, lp.y);
		g.strokeStyle = rgba(glow, 0.85);
		g.lineWidth = s * 0.03;
		g.setLineDash([s * 0.07, s * 0.05]);
		g.lineDashOffset = -t * s * 0.4;
		g.beginPath();
		if (last === STORE[1] || last === STORE[2]) this.storePath(g, last, 0.06);
		else g.arc(lx, ly, s * (PIT_R + 0.08), 0, Math.PI * 2);
		g.stroke();
		g.setLineDash([]);
		if (preview.capture) {
			const q = posOf(preview.capture.opposite);
			const [qx, qy] = this.screen(q.x, q.y);
			const pulse = 0.6 + 0.4 * Math.sin(t * 8);
			g.strokeStyle = `rgba(255, 140, 110, ${0.8 * pulse})`;
			g.shadowColor = 'rgba(255, 120, 90, 0.8)';
			g.shadowBlur = s * 0.3;
			g.lineWidth = s * 0.045;
			g.beginPath();
			g.arc(qx, qy, s * (PIT_R + 0.06), 0, Math.PI * 2);
			g.stroke();
		}
		g.restore();
		const label = preview.capture ? `Capture ${preview.capture.taken}` : preview.extra ? 'Sow again' : '';
		if (label) {
			const at = preview.capture ? posOf(preview.capture.opposite) : lp;
			const [tx, ty] = this.screen(at.x, at.y);
			g.save();
			g.font = `italic 600 ${Math.round(s * 0.2)}px Fraunces, Georgia, serif`;
			g.textAlign = 'center';
			g.fillStyle = preview.capture ? '#ffc2b0' : rgba(glow, 1);
			g.shadowColor = 'rgba(0, 0, 0, 0.85)';
			g.shadowBlur = s * 0.1;
			g.fillText(label, tx, ty - s * (PIT_R + 0.14));
			g.restore();
		}
	}

	private drawSeeds(now: number, view: BoardView) {
		const g = this.ctx;
		const s = this.s;
		const placed = this.seeds.map((seed) => ({ seed, p: this.posAt(seed, now) }));
		placed.sort((a, b) => a.p.z - b.p.z);
		const jiggle = view.human ? (view.hover >= 0 ? view.hover : view.cursor) : -1;
		const sw = this.shadow!.width / this.dpr;
		const aloft = placed.filter(({ p }) => p.z > 0.25);
		if (aloft.length) {
			let hx = 0;
			let hy = 0;
			let hz = 0;
			for (const { p } of aloft) {
				hx += p.x;
				hy += p.y;
				hz += p.z;
			}
			const [sx, sy] = this.screen(hx / aloft.length, hy / aloft.length);
			const lift = (hz / aloft.length) * s;
			const r = s * (0.45 + Math.min(0.3, aloft.length * 0.03));
			const wisp = g.createRadialGradient(sx, sy - lift, 0, sx, sy - lift, r);
			wisp.addColorStop(0, rgba(GLOW_RGB[view.current], 0.45));
			wisp.addColorStop(0.4, rgba(GLOW_RGB[view.current], 0.14));
			wisp.addColorStop(1, rgba(GLOW_RGB[view.current], 0));
			g.save();
			g.globalCompositeOperation = 'lighter';
			g.fillStyle = wisp;
			g.fillRect(sx - r, sy - lift - r, r * 2, r * 2);
			const pool = g.createRadialGradient(sx, sy, 0, sx, sy, s * 0.5);
			pool.addColorStop(0, rgba(GLOW_RGB[view.current], 0.16));
			pool.addColorStop(1, rgba(GLOW_RGB[view.current], 0));
			g.fillStyle = pool;
			g.fillRect(sx - s * 0.5, sy - s * 0.5, s, s);
			g.restore();
		}
		for (const { seed, p } of placed) {
			let x = p.x;
			let y = p.y;
			let z = p.z;
			if (seed.pit === jiggle && !seed.tracks.length) {
				z += 0.03 + 0.025 * Math.sin(now * 0.012 + seed.id);
				x += 0.008 * Math.sin(now * 0.02 + seed.id * 3);
			}
			const [sx, sy] = this.screen(x, y);
			const spread = 1 + z * 1.3;
			g.globalAlpha = Math.max(0.15, 0.9 - z * 0.7);
			g.drawImage(this.shadow!, sx - (sw * spread) / 2 + s * 0.02 + z * s * 0.12, sy - (sw * spread) / 2 + s * 0.03 + z * s * 0.1, sw * spread, sw * spread);
			g.globalAlpha = 1;
			const sprite = this.sprites[seed.kind];
			const w = sprite.width / this.dpr;
			const h = sprite.height / this.dpr;
			const lift = z * s;
			const angle = seed.angle + (this.portrait ? Math.PI / 2 : 0) + z * 4 * (hash(seed.id) - 0.5);
			g.save();
			g.translate(sx, sy - lift);
			g.rotate(angle);
			if (z > 0.2) {
				g.shadowColor = 'rgba(255, 230, 160, 0.55)';
				g.shadowBlur = s * 0.15 * Math.min(1, z);
			}
			g.drawImage(sprite, -w / 2, -h / 2, w, h);
			g.restore();
		}
	}

	private drawCounts(view: BoardView) {
		const g = this.ctx;
		const s = this.s;
		g.save();
		g.textAlign = 'center';
		g.textBaseline = 'middle';
		for (let i = 0; i < SIZE; i += 1) {
			const store = i === STORE[1] || i === STORE[2];
			const owner: Player = i <= STORE[1] ? 1 : 2;
			const p = posOf(i);
			const off = store ? STORE_HALF + 0.29 : NUMERAL;
			const [sx, sy] = this.screen(p.x, p.y + (owner === 1 ? off : -off));
			const n = this.display[i];
			const size = store ? 0.32 : 0.22;
			g.font = `${store ? 700 : 600} ${Math.round(s * size)}px Fraunces, Georgia, serif`;
			g.fillStyle = 'rgba(240, 248, 230, 0.28)';
			g.fillText(String(n), sx + s * 0.012, sy + s * 0.014);
			const active = !view.ended && owner === view.current;
			g.fillStyle = store ? (active ? rgba(GLOW_RGB[owner], 0.95) : 'rgba(22, 28, 20, 0.85)') : active && n ? 'rgba(18, 24, 16, 0.92)' : 'rgba(18, 24, 16, 0.6)';
			g.fillText(String(n), sx, sy);
		}
		g.restore();
	}

	/** A ladybird trundles along the near edge of the slab now and then. */
	private drawLadybug(t: number) {
		const cycle = 47;
		const k = Math.floor(t / cycle);
		const u = (t % cycle) / 16;
		if (u > 1) return;
		const dir = hash(k) > 0.5 ? 1 : -1;
		const along = dir > 0 ? 0.4 + u * (W - 0.8) : W - 0.4 - u * (W - 0.8);
		const wob = Math.sin(u * 40) * 0.015;
		const bx = along;
		const by = H - 0.16 + wob;
		const [sx, sy] = this.screen(bx, by);
		const [nx, ny] = this.screen(bx + dir * 0.1, by);
		const heading = Math.atan2(ny - sy, nx - sx);
		const g = this.ctx;
		const s = this.s;
		const r = s * 0.06;
		g.save();
		g.translate(sx, sy);
		g.rotate(heading);
		g.strokeStyle = '#120c08';
		g.lineWidth = Math.max(1, s * 0.008);
		for (let leg = 0; leg < 3; leg += 1) {
			const lx = (leg - 1) * r * 0.6;
			const step = Math.sin(t * 22 + leg * 2) * r * 0.25;
			for (const side of [-1, 1]) {
				g.beginPath();
				g.moveTo(lx, 0);
				g.lineTo(lx + step * side, side * r * 1.25);
				g.stroke();
			}
		}
		g.fillStyle = '#120c08';
		g.beginPath();
		g.arc(r * 0.85, 0, r * 0.5, 0, Math.PI * 2);
		g.fill();
		const shell = g.createRadialGradient(-r * 0.2, -r * 0.3, r * 0.1, 0, 0, r);
		shell.addColorStop(0, '#ff6a4a');
		shell.addColorStop(1, '#b3160c');
		g.fillStyle = shell;
		g.beginPath();
		g.ellipse(0, 0, r, r * 0.85, 0, 0, Math.PI * 2);
		g.fill();
		g.strokeStyle = '#120c08';
		g.beginPath();
		g.moveTo(-r, 0);
		g.lineTo(r * 0.6, 0);
		g.stroke();
		g.fillStyle = '#120c08';
		for (const [dx, dy] of [
			[-0.3, -0.45],
			[-0.3, 0.45],
			[0.25, -0.35],
			[0.25, 0.35],
			[-0.65, 0]
		]) {
			g.beginPath();
			g.arc(dx * r, dy * r, r * 0.16, 0, Math.PI * 2);
			g.fill();
		}
		g.fillStyle = 'rgba(255, 255, 255, 0.5)';
		g.beginPath();
		g.ellipse(-r * 0.2, -r * 0.35, r * 0.25, r * 0.12, -0.3, 0, Math.PI * 2);
		g.fill();
		g.restore();
	}

	/** A few fireflies drift over the stone, blinking. */
	private drawFlies(t: number) {
		const g = this.ctx;
		const s = this.s;
		g.save();
		g.globalCompositeOperation = 'lighter';
		for (const fly of this.flies) {
			const a = fly.seed;
			const x = W / 2 + Math.sin(t * 0.13 + a) * W * 0.48 + Math.sin(t * 0.41 + a * 2) * 0.4;
			const y = H / 2 + Math.sin(t * 0.17 + a * 1.7) * H * 0.62 + Math.cos(t * 0.53 + a) * 0.2;
			const blink = Math.max(0, Math.sin(t * 1.3 + fly.phase)) ** 3;
			if (blink < 0.02) continue;
			const [sx, sy] = this.screen(x, y);
			const r = s * 0.22;
			const halo = g.createRadialGradient(sx, sy, 0, sx, sy, r);
			halo.addColorStop(0, `rgba(230, 255, 140, ${0.75 * blink})`);
			halo.addColorStop(0.15, `rgba(200, 245, 110, ${0.35 * blink})`);
			halo.addColorStop(1, 'rgba(150, 220, 80, 0)');
			g.fillStyle = halo;
			g.fillRect(sx - r, sy - r, r * 2, r * 2);
		}
		g.restore();
	}
}

