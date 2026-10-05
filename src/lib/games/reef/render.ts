import { cellsOf, ghostY, type Game, type GameEvent } from './engine';
import { COLS, cssRgb, HIDDEN, KINDS, ROWS, SPECIES, type Kind } from './types';

type Mote = { x: number; y: number; vx: number; vy: number; life: number; age: number; size: number; rgb: string; wobble: number };
type Streak = { x: number; top: number; bottom: number; rgb: string; age: number };
type Snow = { x: number; y: number; speed: number; size: number; drift: number };

const SNOW = 34;
const MAX_MOTES = 420;
const STREAK_LIFE = 0.28;
const FLASH_LIFE = 0.32;

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + w, y, x + w, y + h, r);
	ctx.arcTo(x + w, y + h, x, y + h, r);
	ctx.arcTo(x, y + h, x, y, r);
	ctx.arcTo(x, y, x + w, y, r);
	ctx.closePath();
}

function canvasOf(w: number, h: number) {
	const c = document.createElement('canvas');
	c.width = Math.max(1, Math.ceil(w));
	c.height = Math.max(1, Math.ceil(h));
	return c;
}

/** Each species has its own markings so pieces read apart even without colour. */
function markings(ctx: CanvasRenderingContext2D, kind: Kind, s: number, light: string) {
	ctx.save();
	ctx.strokeStyle = light;
	ctx.fillStyle = light;
	ctx.lineCap = 'round';
	const c = s / 2;
	switch (kind) {
		case 1: {
			// Comb jelly: rows of beating cilia.
			ctx.globalAlpha = 0.55;
			ctx.lineWidth = Math.max(1, s * 0.05);
			for (let i = 0; i < 3; i += 1) {
				const y = s * (0.3 + i * 0.2);
				ctx.beginPath();
				ctx.moveTo(s * 0.22, y);
				ctx.lineTo(s * 0.78, y);
				ctx.stroke();
			}
			break;
		}
		case 2: {
			// Lanternfish: a line of photophores.
			ctx.globalAlpha = 0.85;
			for (let i = 0; i < 4; i += 1) {
				ctx.beginPath();
				ctx.arc(s * (0.26 + i * 0.16), s * (0.62 - Math.sin(i) * 0.08), s * 0.055, 0, Math.PI * 2);
				ctx.fill();
			}
			break;
		}
		case 3: {
			// Anemone: tentacles spreading from a mouth.
			ctx.globalAlpha = 0.55;
			ctx.lineWidth = Math.max(1, s * 0.045);
			for (let i = 0; i < 8; i += 1) {
				const a = (i / 8) * Math.PI * 2;
				ctx.beginPath();
				ctx.moveTo(c + Math.cos(a) * s * 0.08, c + Math.sin(a) * s * 0.08);
				ctx.quadraticCurveTo(c + Math.cos(a + 0.4) * s * 0.22, c + Math.sin(a + 0.4) * s * 0.22, c + Math.cos(a) * s * 0.32, c + Math.sin(a) * s * 0.32);
				ctx.stroke();
			}
			ctx.globalAlpha = 0.9;
			ctx.beginPath();
			ctx.arc(c, c, s * 0.07, 0, Math.PI * 2);
			ctx.fill();
			break;
		}
		case 4: {
			// Siphonophore: a chain of beads.
			ctx.globalAlpha = 0.75;
			for (let i = 0; i < 3; i += 1) {
				ctx.beginPath();
				ctx.arc(s * (0.3 + i * 0.2), s * (0.3 + i * 0.2), s * 0.075, 0, Math.PI * 2);
				ctx.fill();
			}
			break;
		}
		case 5: {
			// Fire jelly: a bell with rings.
			ctx.globalAlpha = 0.6;
			ctx.lineWidth = Math.max(1, s * 0.045);
			for (const r of [0.12, 0.22, 0.31]) {
				ctx.beginPath();
				ctx.arc(c, c, s * r, 0, Math.PI * 2);
				ctx.stroke();
			}
			break;
		}
		case 6: {
			// Sea sapphire: iridescent facets.
			ctx.globalAlpha = 0.5;
			ctx.lineWidth = Math.max(1, s * 0.04);
			ctx.beginPath();
			ctx.moveTo(c, s * 0.2);
			ctx.lineTo(s * 0.8, c);
			ctx.lineTo(c, s * 0.8);
			ctx.lineTo(s * 0.2, c);
			ctx.closePath();
			ctx.moveTo(c, s * 0.2);
			ctx.lineTo(c, s * 0.8);
			ctx.moveTo(s * 0.2, c);
			ctx.lineTo(s * 0.8, c);
			ctx.stroke();
			break;
		}
		case 7: {
			// Sea pen: a feathered quill.
			ctx.globalAlpha = 0.6;
			ctx.lineWidth = Math.max(1, s * 0.045);
			ctx.beginPath();
			ctx.moveTo(s * 0.25, s * 0.78);
			ctx.lineTo(s * 0.75, s * 0.22);
			for (let i = 1; i < 5; i += 1) {
				const t = i / 5;
				const x = s * (0.25 + 0.5 * t);
				const y = s * (0.78 - 0.56 * t);
				ctx.moveTo(x, y);
				ctx.lineTo(x - s * 0.12, y - s * 0.12);
				ctx.moveTo(x, y);
				ctx.lineTo(x + s * 0.12, y + s * 0.12);
			}
			ctx.stroke();
			break;
		}
	}
	ctx.restore();
}

function cellSprite(kind: Kind, s: number) {
	const sp = SPECIES[kind];
	const c = canvasOf(s, s);
	const ctx = c.getContext('2d')!;
	const pad = Math.max(1, s * 0.06);
	const r = s * 0.24;
	const body = ctx.createRadialGradient(s * 0.4, s * 0.36, s * 0.05, s / 2, s / 2, s * 0.7);
	body.addColorStop(0, sp.light);
	body.addColorStop(0.45, sp.base);
	body.addColorStop(1, sp.dark);
	rounded(ctx, pad, pad, s - pad * 2, s - pad * 2, r);
	ctx.fillStyle = body;
	ctx.fill();
	ctx.save();
	ctx.clip();
	markings(ctx, kind, s, sp.light);
	const sheen = ctx.createLinearGradient(0, pad, 0, s * 0.5);
	sheen.addColorStop(0, 'rgba(255,255,255,0.32)');
	sheen.addColorStop(1, 'rgba(255,255,255,0)');
	ctx.fillStyle = sheen;
	ctx.fillRect(0, 0, s, s * 0.5);
	ctx.restore();
	rounded(ctx, pad, pad, s - pad * 2, s - pad * 2, r);
	ctx.lineWidth = Math.max(1, s * 0.05);
	ctx.strokeStyle = `rgba(${cssRgb(kind)}, 0.95)`;
	ctx.stroke();
	return c;
}

function haloSprite(kind: Kind, s: number) {
	const size = s * 2.4;
	const c = canvasOf(size, size);
	const ctx = c.getContext('2d')!;
	const g = ctx.createRadialGradient(size / 2, size / 2, s * 0.2, size / 2, size / 2, size / 2);
	const rgb = cssRgb(kind);
	g.addColorStop(0, `rgba(${rgb}, 0.55)`);
	g.addColorStop(0.4, `rgba(${rgb}, 0.18)`);
	g.addColorStop(1, `rgba(${rgb}, 0)`);
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, size, size);
	return c;
}

function ghostSprite(kind: Kind, s: number) {
	const c = canvasOf(s, s);
	const ctx = c.getContext('2d')!;
	const pad = Math.max(1.5, s * 0.1);
	rounded(ctx, pad, pad, s - pad * 2, s - pad * 2, s * 0.22);
	ctx.fillStyle = `rgba(${cssRgb(kind)}, 0.08)`;
	ctx.fill();
	ctx.setLineDash([Math.max(2, s * 0.14), Math.max(2, s * 0.1)]);
	ctx.lineWidth = Math.max(1, s * 0.05);
	ctx.strokeStyle = `rgba(${cssRgb(kind)}, 0.55)`;
	ctx.stroke();
	return c;
}

function dotSprite() {
	const c = canvasOf(32, 32);
	const ctx = c.getContext('2d')!;
	const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
	g.addColorStop(0, 'rgba(255,255,255,1)');
	g.addColorStop(0.25, 'rgba(255,255,255,0.6)');
	g.addColorStop(1, 'rgba(255,255,255,0)');
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, 32, 32);
	return c;
}

/** Tinted dot sprites, one per species, so motes never need per-draw colour work. */
function tintedDots(base: HTMLCanvasElement) {
	const out = new Map<string, HTMLCanvasElement>();
	for (const kind of KINDS) {
		const rgb = cssRgb(kind);
		const c = canvasOf(32, 32);
		const ctx = c.getContext('2d')!;
		ctx.drawImage(base, 0, 0);
		ctx.globalCompositeOperation = 'source-in';
		ctx.fillStyle = `rgb(${rgb})`;
		ctx.fillRect(0, 0, 32, 32);
		ctx.globalCompositeOperation = 'lighter';
		ctx.globalAlpha = 0.5;
		ctx.drawImage(base, 8, 8, 16, 16);
		out.set(rgb, c);
	}
	return out;
}

export class WellRenderer {
	private ctx: CanvasRenderingContext2D;
	private cell = 0;
	private dpr = 1;
	private width = 0;
	private height = 0;
	private cells = new Map<Kind, HTMLCanvasElement>();
	private halos = new Map<Kind, HTMLCanvasElement>();
	private ghosts = new Map<Kind, HTMLCanvasElement>();
	private dot = dotSprite();
	private dots = tintedDots(this.dot);
	private motes: Mote[] = [];
	private streaks: Streak[] = [];
	private snow: Snow[] = [];
	private flashes = new Map<number, number>();
	private time = 0;
	private shake = 0;

	constructor(private canvas: HTMLCanvasElement) {
		this.ctx = canvas.getContext('2d', { alpha: true })!;
		for (let i = 0; i < SNOW; i += 1) {
			this.snow.push({ x: Math.random(), y: Math.random(), speed: 0.01 + Math.random() * 0.025, size: 0.6 + Math.random() * 1.4, drift: Math.random() * Math.PI * 2 });
		}
	}

	resize(cssWidth: number, cssHeight: number) {
		const dpr = Math.min(2, window.devicePixelRatio || 1);
		const cell = Math.max(4, Math.floor((cssWidth / COLS) * dpr));
		if (cell === this.cell && dpr === this.dpr && this.width === cell * COLS) return;
		this.dpr = dpr;
		this.cell = cell;
		this.width = cell * COLS;
		this.height = cell * ROWS;
		this.canvas.width = this.width;
		this.canvas.height = this.height;
		this.canvas.style.aspectRatio = `${COLS} / ${ROWS}`;
		void cssHeight;
		for (const kind of KINDS) {
			this.cells.set(kind, cellSprite(kind, cell));
			this.halos.set(kind, haloSprite(kind, cell));
			this.ghosts.set(kind, ghostSprite(kind, cell));
		}
	}

	onEvent(event: GameEvent, game: Game, motion: boolean) {
		const s = this.cell;
		if (!s) return;
		switch (event.type) {
			case 'lock':
				for (const [x, y] of event.cells) this.flashes.set(y * COLS + x, FLASH_LIFE);
				break;
			case 'harddrop': {
				if (!motion || !event.rows) break;
				const rgb = cssRgb(event.kind);
				const columns = new Map<number, number>();
				for (const [x, y] of event.cells) columns.set(x, Math.min(columns.get(x) ?? Infinity, y));
				for (const [x, top] of columns) {
					this.streaks.push({ x, top: top - event.rows, bottom: top, rgb, age: 0 });
				}
				this.shake = Math.min(1, 0.3 + event.rows * 0.03);
				break;
			}
			case 'clear': {
				const per = motion ? (event.info.count === 4 ? 5 : 3) : 1;
				for (const row of event.info.rows) {
					for (let x = 0; x < COLS; x += 1) {
						const kind = game.board[row * COLS + x] as Kind;
						if (!kind) continue;
						const rgb = cssRgb(kind);
						for (let i = 0; i < per; i += 1) this.spawnMote(x, row - HIDDEN, rgb, motion);
					}
				}
				break;
			}
		}
	}

	private spawnMote(x: number, y: number, rgb: string, motion: boolean) {
		if (this.motes.length >= MAX_MOTES) this.motes.shift();
		this.motes.push({
			x: x + Math.random(),
			y: y + Math.random(),
			vx: (Math.random() - 0.5) * 1.2,
			vy: motion ? -(2.5 + Math.random() * 4.5) : 0,
			life: motion ? 1.6 + Math.random() * 1.4 : 0.6,
			age: 0,
			size: 0.18 + Math.random() * 0.3,
			rgb,
			wobble: Math.random() * Math.PI * 2
		});
	}

	draw(game: Game, dt: number, opts: { ghost: boolean; motion: boolean; active: boolean }) {
		const { ctx, cell: s, width, height } = this;
		if (!s) return;
		const motion = opts.motion;
		this.time += motion ? dt : 0;
		const t = this.time;

		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';
		ctx.clearRect(0, 0, width, height);

		let oy = 0;
		if (this.shake > 0) {
			oy = this.shake * s * 0.12;
			this.shake = Math.max(0, this.shake - dt * 6);
		}
		ctx.translate(0, oy);

		// Faint column guides in the water.
		ctx.fillStyle = 'rgba(120, 200, 255, 0.035)';
		for (let x = 1; x < COLS; x += 1) ctx.fillRect(x * s - 0.5, 0, 1, height);

		if (motion) this.drawSnow(dt);

		const board = game.board;
		const clearing = game.clearing;
		const clearT = clearing ? Math.max(0, clearing.left) / 0.34 : 0;
		const clearRows = clearing ? clearing.rows : null;

		// Halos first, additively, so the stack glows as one living mass.
		ctx.globalCompositeOperation = 'lighter';
		for (let y = HIDDEN; y < HIDDEN + ROWS; y += 1) {
			const dy = (y - HIDDEN) * s;
			const fading = clearRows?.includes(y);
			for (let x = 0; x < COLS; x += 1) {
				const kind = board[y * COLS + x] as Kind;
				if (!kind) continue;
				const wave = motion ? 0.5 + 0.5 * Math.sin(t * 1.3 - y * 0.42 + x * 0.18) : 0.6;
				let a = 0.22 + wave * 0.28;
				if (fading) a = 0.9 * clearT + 0.1;
				const flash = this.flashes.get(y * COLS + x);
				if (flash) a += flash * 1.4;
				ctx.globalAlpha = Math.min(1, a);
				ctx.drawImage(this.halos.get(kind)!, x * s - s * 0.7, dy - s * 0.7);
			}
		}

		ctx.globalCompositeOperation = 'source-over';
		for (let y = HIDDEN; y < HIDDEN + ROWS; y += 1) {
			const dy = (y - HIDDEN) * s;
			const fading = clearRows?.includes(y);
			for (let x = 0; x < COLS; x += 1) {
				const kind = board[y * COLS + x] as Kind;
				if (!kind) continue;
				if (fading) {
					ctx.globalAlpha = clearT;
					ctx.drawImage(this.cells.get(kind)!, x * s, dy);
					continue;
				}
				const wave = motion ? 0.5 + 0.5 * Math.sin(t * 1.3 - y * 0.42 + x * 0.18) : 0.6;
				ctx.globalAlpha = 0.72 + wave * 0.28;
				ctx.drawImage(this.cells.get(kind)!, x * s, dy);
			}
		}

		if (clearRows && clearT > 0) {
			ctx.globalCompositeOperation = 'lighter';
			for (const row of clearRows) {
				if (row < HIDDEN) continue;
				const dy = (row - HIDDEN) * s;
				const g = ctx.createLinearGradient(0, dy, 0, dy + s);
				const a = Math.min(1, clearT * 1.6) * 0.7;
				g.addColorStop(0, 'rgba(180, 255, 255, 0)');
				g.addColorStop(0.5, `rgba(200, 255, 255, ${a})`);
				g.addColorStop(1, 'rgba(180, 255, 255, 0)');
				ctx.globalAlpha = 1;
				ctx.fillStyle = g;
				ctx.fillRect(0, dy - s * 0.3, width, s * 1.6);
			}
		}

		for (const [key, left] of this.flashes) {
			const next = left - dt;
			if (next <= 0) this.flashes.delete(key);
			else this.flashes.set(key, next);
		}

		this.drawStreaks(dt);

		const p = game.piece;
		if (p && opts.active) {
			const cells = cellsOf(p.kind, p.rot);
			if (opts.ghost) {
				const gy = ghostY(game);
				if (gy !== p.y) {
					ctx.globalCompositeOperation = 'source-over';
					ctx.globalAlpha = 1;
					const sprite = this.ghosts.get(p.kind)!;
					for (const [cx, cy] of cells) {
						const y = gy + cy - HIDDEN;
						if (y >= 0) ctx.drawImage(sprite, (p.x + cx) * s, y * s);
					}
				}
			}
			const pulse = motion ? 0.5 + 0.5 * Math.sin(t * 4) : 0.5;
			ctx.globalCompositeOperation = 'lighter';
			ctx.globalAlpha = 0.55 + pulse * 0.25;
			const halo = this.halos.get(p.kind)!;
			for (const [cx, cy] of cells) {
				const y = p.y + cy - HIDDEN;
				if (y >= -1) ctx.drawImage(halo, (p.x + cx) * s - s * 0.7, y * s - s * 0.7);
			}
			ctx.globalCompositeOperation = 'source-over';
			ctx.globalAlpha = 1;
			const sprite = this.cells.get(p.kind)!;
			for (const [cx, cy] of cells) {
				const y = p.y + cy - HIDDEN;
				if (y >= 0) ctx.drawImage(sprite, (p.x + cx) * s, y * s);
			}
		}

		this.drawMotes(dt, motion);

		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';
	}

	private drawSnow(dt: number) {
		const { ctx, width, height, dot } = this;
		ctx.globalCompositeOperation = 'lighter';
		for (const f of this.snow) {
			f.y += f.speed * dt;
			f.drift += dt * 0.6;
			if (f.y > 1.02) {
				f.y = -0.02;
				f.x = Math.random();
			}
			const x = (f.x + Math.sin(f.drift) * 0.01) * width;
			const size = f.size * this.dpr * 2.2;
			ctx.globalAlpha = 0.16;
			ctx.drawImage(dot, x - size / 2, f.y * height - size / 2, size, size);
		}
	}

	private drawStreaks(dt: number) {
		const { ctx, cell: s } = this;
		if (!this.streaks.length) return;
		ctx.globalCompositeOperation = 'lighter';
		ctx.globalAlpha = 1;
		this.streaks = this.streaks.filter((st) => {
			st.age += dt;
			const k = 1 - st.age / STREAK_LIFE;
			if (k <= 0) return false;
			const top = (st.top - HIDDEN) * s;
			const bottom = (st.bottom - HIDDEN) * s;
			const g = this.ctx.createLinearGradient(0, top, 0, bottom);
			g.addColorStop(0, `rgba(${st.rgb}, 0)`);
			g.addColorStop(1, `rgba(${st.rgb}, ${0.4 * k})`);
			ctx.fillStyle = g;
			ctx.fillRect(st.x * s + s * 0.18, Math.max(0, top), s * 0.64, bottom - Math.max(0, top));
			return true;
		});
	}

	private drawMotes(dt: number, motion: boolean) {
		const { ctx, cell: s } = this;
		if (!this.motes.length) return;
		ctx.globalCompositeOperation = 'lighter';
		this.motes = this.motes.filter((m) => {
			m.age += dt;
			if (m.age >= m.life) return false;
			if (motion) {
				m.wobble += dt * 3;
				m.x += (m.vx + Math.sin(m.wobble) * 0.6) * dt;
				m.vy *= 1 - dt * 0.35;
				m.y += m.vy * dt;
			}
			const k = m.age / m.life;
			const a = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
			const size = m.size * s * (1.6 - k * 0.6);
			ctx.globalAlpha = Math.max(0, a) * 0.95;
			ctx.drawImage(this.dots.get(m.rgb)!, m.x * s - size / 2, m.y * s - size / 2, size, size);
			return true;
		});
	}

	clear() {
		this.motes = [];
		this.streaks = [];
		this.flashes.clear();
	}
}
