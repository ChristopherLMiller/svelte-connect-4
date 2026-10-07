import { edgeEnds, sidesOf, topology, type Grid, type Topology } from './engine';
import { createMap, drawGlyph, mulberry32, paintChart, type ChartMap } from './map';
import { INK, INK_SOFT, type Chart, type Player } from './types';
import type { InkEvent } from './session.svelte';

type Layer = HTMLCanvasElement;
type Stroke = { edge: number; at: number };
type Reveal = { box: number; owner: Player; at: number; fx: number; fy: number };

/** Margin around the dots, in boxes. */
export const PAD = 0.42;
const LINE_MS = 190;
const REVEAL_MS = 950;
const SEPIA = '#3b2a1a';

function layer(w: number, h = w): Layer {
	const c = document.createElement('canvas');
	c.width = Math.max(1, Math.ceil(w));
	c.height = Math.max(1, Math.ceil(h));
	return c;
}

const hash = (k: number) => {
	let h = Math.imul(k ^ 0x5bd1e995, 2654435761);
	h ^= h >>> 15;
	return ((Math.imul(h, 2246822519) ^ (h >>> 13)) >>> 0) / 4294967296;
};

export class ChartRenderer {
	motion = true;
	warn = true;
	current: Player = 1;
	hover = -1;
	cursor = -1;
	/** Edge held under a finger or mouse, previewed until release. */
	press = -1;
	lastEdge = -1;

	private el: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private topo: Topology = topology(4);
	private grid: Grid | null = null;
	private map: ChartMap | null = null;
	private mapKey = '';
	private cell = 0;
	private pad = 0;
	private paper: Layer | null = null;
	private chart: Layer | null = null;
	private claimed: Layer | null = null;
	private strokes = new Map<number, Stroke>();
	private reveals: Reveal[] = [];
	/** Boxes whose reveal is still running, so the claimed layer skips them. */
	private pending = new Set<number>();

	constructor(el: HTMLCanvasElement) {
		this.el = el;
		this.ctx = el.getContext('2d')!;
	}

	setGrid(grid: Grid, chart: Chart, seed: number) {
		this.grid = grid;
		this.topo = topology(grid.n);
		this.strokes.clear();
		this.reveals = [];
		this.pending.clear();
		const key = `${chart}:${seed}:${grid.n}`;
		if (key !== this.mapKey) {
			this.mapKey = key;
			this.map = createMap(grid.n, chart, seed);
			this.chart = null;
		}
		if (this.cell) this.bake();
	}

	resize(cssW: number) {
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const w = Math.max(40, Math.round(cssW * dpr));
		const cell = w / (this.topo.n + PAD * 2);
		if (this.el.width !== w || this.el.height !== w) {
			this.el.width = w;
			this.el.height = w;
		}
		if (Math.abs(cell - this.cell) > 0.01 || !this.paper) {
			this.cell = cell;
			this.pad = cell * PAD;
			this.chart = null;
			this.bake();
		}
	}

	private bake() {
		if (!this.grid || !this.map || !this.cell) return;
		const w = this.el.width;
		this.paper = this.paintPaper(w);
		this.chart ??= paintChart(this.map, this.cell);
		this.claimed = layer(w);
		const g = this.claimed.getContext('2d')!;
		for (let b = 0; b < this.topo.B; b += 1) {
			const owner = this.grid.boxes[b] as Player | 0;
			if (owner && !this.pending.has(b)) this.paintBox(g, b, owner);
		}
	}

	private paintPaper(w: number): Layer {
		const out = layer(w);
		const g = out.getContext('2d')!;
		const random = mulberry32(w * 31 + this.topo.n);
		const base = g.createRadialGradient(w * 0.45, w * 0.4, w * 0.1, w / 2, w / 2, w * 0.78);
		base.addColorStop(0, '#f4e7c6');
		base.addColorStop(0.7, '#ead6a8');
		base.addColorStop(1, '#d4b680');
		g.fillStyle = base;
		g.fillRect(0, 0, w, w);
		for (let k = 0; k < 900; k += 1) {
			g.fillStyle = random() < 0.5 ? 'rgba(120, 86, 40, 0.06)' : 'rgba(255, 250, 230, 0.12)';
			const s = 0.6 + random() * 2.2;
			g.fillRect(random() * w, random() * w, s, s);
		}
		for (let k = 0; k < 5; k += 1) {
			const x = random() * w;
			const y = random() * w;
			const r = w * (0.05 + random() * 0.12);
			const stain = g.createRadialGradient(x, y, r * 0.2, x, y, r);
			stain.addColorStop(0, 'rgba(160, 112, 52, 0.07)');
			stain.addColorStop(0.85, 'rgba(160, 112, 52, 0.04)');
			stain.addColorStop(1, 'rgba(140, 96, 40, 0)');
			g.fillStyle = stain;
			g.beginPath();
			g.arc(x, y, r, 0, Math.PI * 2);
			g.fill();
		}
		const rx = w * (0.65 + random() * 0.25);
		const ry = w * (0.62 + random() * 0.3);
		g.strokeStyle = 'rgba(120, 78, 36, 0.12)';
		g.lineWidth = w * 0.006;
		g.beginPath();
		g.arc(rx, ry, w * 0.09, 0.3, Math.PI * 1.85);
		g.stroke();
		g.lineWidth = w * 0.002;
		g.beginPath();
		g.arc(rx, ry, w * 0.083, 0, Math.PI * 2);
		g.stroke();

		const { n } = this.topo;
		const s = this.cell;
		const p = this.pad;
		g.strokeStyle = 'rgba(96, 70, 40, 0.13)';
		g.lineWidth = Math.max(1, s * 0.01);
		g.setLineDash([s * 0.04, s * 0.08]);
		g.beginPath();
		for (let k = 0; k <= n; k += 1) {
			g.moveTo(p, p + k * s);
			g.lineTo(p + n * s, p + k * s);
			g.moveTo(p + k * s, p);
			g.lineTo(p + k * s, p + n * s);
		}
		g.stroke();
		g.setLineDash([]);
		return out;
	}

	private boxRect(b: number): [number, number, number] {
		const { n } = this.topo;
		return [this.pad + (b % n) * this.cell, this.pad + Math.floor(b / n) * this.cell, this.cell];
	}

	private paintBox(g: CanvasRenderingContext2D, b: number, owner: Player, glyphAlpha = 1, grow = 1) {
		if (!this.chart || !this.map) return;
		const [x, y, s] = this.boxRect(b);
		const sx = x - this.pad;
		const sy = y - this.pad;
		g.drawImage(this.chart, sx, sy, s, s, x, y, s, s);
		g.fillStyle = INK_SOFT[owner];
		g.globalAlpha = 0.13;
		g.fillRect(x, y, s, s);
		g.globalAlpha = 0.28;
		g.strokeStyle = INK[owner];
		g.lineWidth = Math.max(1, s * 0.012);
		g.strokeRect(x + s * 0.07, y + s * 0.07, s * 0.86, s * 0.86);
		g.globalAlpha = glyphAlpha;
		drawGlyph(g, this.map.glyph[b], x + s / 2, y + s / 2 + s * 0.02, s * 0.94 * grow, INK[owner], this.map.tilt[b], this.map.mirror[b]);
		g.globalAlpha = 1;
	}

	onEvent(event: InkEvent, grid: Grid, now = performance.now()) {
		this.grid = grid;
		if (event.type !== 'line') return;
		this.lastEdge = event.edge;
		if (!this.motion) {
			if (this.claimed) {
				const g = this.claimed.getContext('2d')!;
				for (const b of event.closed) this.paintBox(g, b, event.player);
			}
			return;
		}
		this.strokes.set(event.edge, { edge: event.edge, at: now });
		const [c1, r1, c2, r2] = edgeEnds(this.topo, event.edge);
		const fx = (c1 + c2) / 2;
		const fy = (r1 + r2) / 2;
		event.closed.forEach((box, k) => {
			this.pending.add(box);
			this.reveals.push({ box, owner: event.player, at: now + LINE_MS * 0.7 + k * 120, fx, fy });
		});
	}

	/** Nearest edge to a point in CSS pixels, or -1 when nothing is close. */
	pick(x: number, y: number, cssW: number) {
		const { n, H } = this.topo;
		const unit = cssW / (n + PAD * 2);
		const gx = x / unit - PAD;
		const gy = y / unit - PAD;
		if (gx < -0.45 || gy < -0.45 || gx > n + 0.45 || gy > n + 0.45) return -1;
		const clamp = (v: number, hi: number) => Math.max(0, Math.min(hi, v));
		const hr = clamp(Math.round(gy), n);
		const hc = clamp(Math.floor(gx), n - 1);
		const hd = Math.abs(gy - hr) + Math.max(0, hc - gx, gx - hc - 1);
		const vc = clamp(Math.round(gx), n);
		const vr = clamp(Math.floor(gy), n - 1);
		const vd = Math.abs(gx - vc) + Math.max(0, vr - gy, gy - vr - 1);
		const h = hr * n + hc;
		const v = H + vr * (n + 1) + vc;
		const edges = this.grid?.edges;
		let [best, dist, other, otherDist] = hd <= vd ? [h, hd, v, vd] : [v, vd, h, hd];
		if (edges?.[best] && !edges[other] && otherDist < 0.5) [best, dist] = [other, otherDist];
		return dist < 0.5 ? best : -1;
	}

	/** Would inking this edge hand the other side a box without closing one? */
	private gives(e: number) {
		const grid = this.grid;
		if (!grid) return false;
		let gives = false;
		for (let k = 0; k < 2; k += 1) {
			const b = this.topo.edgeBoxes[e * 2 + k];
			if (b < 0) continue;
			const sides = sidesOf(this.topo, grid.edges, b);
			if (sides === 3) return false;
			if (sides === 2) gives = true;
		}
		return gives;
	}

	private ends(e: number) {
		const [c1, r1, c2, r2] = edgeEnds(this.topo, e);
		const s = this.cell;
		const p = this.pad;
		const flipEnds = hash(e * 7 + 3) < 0.5;
		const ax = p + (flipEnds ? c2 : c1) * s;
		const ay = p + (flipEnds ? r2 : r1) * s;
		const bx = p + (flipEnds ? c1 : c2) * s;
		const by = p + (flipEnds ? r1 : r2) * s;
		const bow = (hash(e * 13 + 1) - 0.5) * s * 0.07;
		const mx = (ax + bx) / 2 + (by - ay === 0 ? 0 : bow);
		const my = (ay + by) / 2 + (bx - ax === 0 ? 0 : bow);
		return { ax, ay, bx, by, mx, my };
	}

	private inkLine(g: CanvasRenderingContext2D, e: number, colour: string, t: number) {
		const { ax, ay, bx, by, mx, my } = this.ends(e);
		const s = this.cell;
		const qx = ax + (mx - ax) * t;
		const qy = ay + (my - ay) * t;
		const mbx = mx + (bx - mx) * t;
		const mby = my + (by - my) * t;
		const ex = qx + (mbx - qx) * t;
		const ey = qy + (mby - qy) * t;
		const width = Math.max(2, s * 0.068);
		g.strokeStyle = colour;
		g.lineCap = 'round';
		g.lineWidth = width;
		g.beginPath();
		g.moveTo(ax, ay);
		g.quadraticCurveTo(qx, qy, ex, ey);
		g.stroke();
		g.globalAlpha = 0.35;
		g.lineWidth = width * 0.45;
		g.beginPath();
		g.moveTo(ax + width * 0.18, ay + width * 0.18);
		g.quadraticCurveTo(qx + width * 0.22, qy + width * 0.2, ex + width * 0.18, ey + width * 0.18);
		g.stroke();
		g.globalAlpha = 1;
		g.fillStyle = colour;
		g.beginPath();
		g.arc(ax, ay, width * 0.72, 0, Math.PI * 2);
		g.fill();
		if (t >= 1) {
			g.beginPath();
			g.arc(ex, ey, width * (0.58 + hash(e) * 0.3), 0, Math.PI * 2);
			g.fill();
		}
	}

	private ghost(g: CanvasRenderingContext2D, e: number, strong: boolean) {
		const { ax, ay, bx, by, mx, my } = this.ends(e);
		const s = this.cell;
		const colour = INK[this.current];
		g.save();
		g.strokeStyle = colour;
		g.lineCap = 'round';
		g.globalAlpha = strong ? 0.75 : 0.5;
		g.lineWidth = Math.max(2, s * 0.06);
		g.setLineDash([s * 0.07, s * 0.09]);
		g.beginPath();
		g.moveTo(ax, ay);
		g.quadraticCurveTo(mx, my, bx, by);
		g.stroke();
		g.setLineDash([]);
		if (this.warn && this.gives(e)) {
			const cx = (ax + bx) / 2;
			const cy = (ay + by) / 2;
			const r = s * 0.13;
			g.globalAlpha = 0.95;
			g.fillStyle = '#f6e8c4';
			g.strokeStyle = '#8a2a14';
			g.lineWidth = Math.max(1.5, s * 0.022);
			g.beginPath();
			g.moveTo(cx, cy - r);
			g.lineTo(cx + r * 0.95, cy + r * 0.7);
			g.lineTo(cx - r * 0.95, cy + r * 0.7);
			g.closePath();
			g.fill();
			g.stroke();
			g.fillStyle = '#8a2a14';
			g.fillRect(cx - r * 0.07, cy - r * 0.45, r * 0.14, r * 0.62);
			g.beginPath();
			g.arc(cx, cy + r * 0.38, r * 0.09, 0, Math.PI * 2);
			g.fill();
		}
		g.restore();
	}

	draw(now: number): boolean {
		const grid = this.grid;
		if (!grid || !this.paper || !this.claimed || !this.chart) return false;
		const g = this.ctx;
		const s = this.cell;
		const p = this.pad;
		let busy = false;
		g.setTransform(1, 0, 0, 1, 0, 0);
		g.drawImage(this.paper, 0, 0);
		g.drawImage(this.claimed, 0, 0);

		const keep: Reveal[] = [];
		for (const rev of this.reveals) {
			const t = (now - rev.at) / REVEAL_MS;
			if (t < 0) {
				keep.push(rev);
				busy = true;
				continue;
			}
			if (t >= 1) {
				this.pending.delete(rev.box);
				this.paintBox(this.claimed.getContext('2d')!, rev.box, rev.owner);
				g.drawImage(this.claimed, 0, 0);
				continue;
			}
			keep.push(rev);
			busy = true;
			const [x, y] = this.boxRect(rev.box);
			const ox = p + rev.fx * s;
			const oy = p + rev.fy * s;
			const ease = 1 - (1 - t) ** 3;
			const radius = ease * s * 1.25;
			g.save();
			g.beginPath();
			g.rect(x, y, s, s);
			g.clip();
			g.beginPath();
			const seed = rev.box * 1.7;
			for (let k = 0; k <= 28; k += 1) {
				const a = (k / 28) * Math.PI * 2;
				const wob = 1 + 0.12 * Math.sin(a * 5 + seed) + 0.06 * Math.sin(a * 11 - seed * 2);
				const px = ox + Math.cos(a) * radius * wob;
				const py = oy + Math.sin(a) * radius * wob;
				if (k === 0) g.moveTo(px, py);
				else g.lineTo(px, py);
			}
			g.closePath();
			g.clip();
			const glyphT = Math.max(0, Math.min(1, (t - 0.35) / 0.5));
			this.paintBox(g, rev.box, rev.owner, glyphT, 1 + (1 - glyphT) * 0.12);
			g.restore();
			if (t < 0.7) {
				g.save();
				g.globalAlpha = (0.7 - t) * 0.5;
				g.fillStyle = INK[rev.owner];
				g.beginPath();
				g.rect(x, y, s, s);
				g.clip();
				g.beginPath();
				g.arc(ox, oy, radius * 0.98, 0, Math.PI * 2);
				g.arc(ox, oy, Math.max(0, radius * 0.86), 0, Math.PI * 2, true);
				g.fill();
				g.restore();
			}
		}
		this.reveals = keep;

		if (this.lastEdge >= 0 && grid.edges[this.lastEdge]) {
			const { ax, ay, bx, by, mx, my } = this.ends(this.lastEdge);
			g.save();
			g.strokeStyle = INK_SOFT[grid.edges[this.lastEdge] as Player];
			g.globalAlpha = 0.22;
			g.lineCap = 'round';
			g.lineWidth = s * 0.2;
			g.beginPath();
			g.moveTo(ax, ay);
			g.quadraticCurveTo(mx, my, bx, by);
			g.stroke();
			g.restore();
		}

		for (let e = 0; e < grid.edges.length; e += 1) {
			const owner = grid.edges[e] as Player | 0;
			if (!owner) continue;
			const stroke = this.strokes.get(e);
			let t = 1;
			if (stroke) {
				t = Math.min(1, (now - stroke.at) / LINE_MS);
				if (t >= 1) this.strokes.delete(e);
				else busy = true;
			}
			this.inkLine(g, e, INK[owner], 1 - (1 - t) ** 2);
		}

		const preview = this.press >= 0 ? this.press : this.cursor >= 0 ? this.cursor : this.hover;
		if (preview >= 0 && !grid.edges[preview]) this.ghost(g, preview, this.press >= 0);

		if (this.cursor >= 0) {
			const { ax, ay, bx, by } = this.ends(this.cursor);
			g.save();
			g.strokeStyle = 'rgba(59, 42, 26, 0.55)';
			g.lineWidth = Math.max(1.5, s * 0.02);
			g.setLineDash([s * 0.05, s * 0.05]);
			const x0 = Math.min(ax, bx) - s * 0.12;
			const y0 = Math.min(ay, by) - s * 0.12;
			g.beginPath();
			g.roundRect(x0, y0, Math.abs(bx - ax) + s * 0.24, Math.abs(by - ay) + s * 0.24, s * 0.12);
			g.stroke();
			g.restore();
		}

		const { n } = this.topo;
		const dot = Math.max(2.2, s * 0.055);
		g.fillStyle = SEPIA;
		for (let r = 0; r <= n; r += 1) {
			for (let c = 0; c <= n; c += 1) {
				const x = p + c * s;
				const y = p + r * s;
				g.beginPath();
				g.arc(x, y, dot, 0, Math.PI * 2);
				g.fill();
			}
		}
		g.fillStyle = 'rgba(255, 244, 214, 0.55)';
		for (let r = 0; r <= n; r += 1) {
			for (let c = 0; c <= n; c += 1) {
				g.beginPath();
				g.arc(p + c * s - dot * 0.3, p + r * s - dot * 0.3, dot * 0.32, 0, Math.PI * 2);
				g.fill();
			}
		}
		return busy;
	}
}
