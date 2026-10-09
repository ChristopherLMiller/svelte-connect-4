import type { Blink, Game } from './game';
import type { TableDef } from './def';

export const TAU = Math.PI * 2;

export type InsertShape = 'round' | 'arrow' | 'pill' | 'star' | 'square' | 'diamond';
export type Insert = { id: string; x: number; y: number; r: number; color: string; label?: string; shape?: InsertShape; turn?: number; raised?: boolean };
export type Bulb = { x: number; y: number; color: string };
export type BumperStyle = 'carousel' | 'classic' | 'neon' | 'barrel' | 'shell' | 'shield' | 'wagon';

export type Theme = {
	/** Font for painted titles and big labels. */
	display: string;
	/** Font for small printed labels and score popups. */
	label: string;
	wood: [string, string];
	rail: string;
	railShine: string;
	guide: string;
	post: string;
	postCore: string;
	rubber: string;
	flipper: { body: string; rubber: string; pivot: string };
	insertOff: string;
	sling: { base: string; stripe: string };
	bumper: { style: BumperStyle; a: string; b: string; cap: string; ring: string; flash: string };
	target: { face: string; edge: string; ink: string };
	ramp: string;
	popup: { ink: string; big: string; stroke: string };
	spark: string;
	/** Bulb colour during multiball. */
	hot: [string, string];
	ball?: 'chrome' | 'brass';
	/** Colour of the general illumination under the plastics; warm white if unset. */
	gi?: string;
};

export type Helpers = {
	unit: number;
	label: (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string, font?: string) => void;
	glow: (color: string) => HTMLCanvasElement;
	/** Draw a glow sprite additively at field coordinates. */
	shine: (ctx: CanvasRenderingContext2D, color: string, x: number, y: number, size: number, alpha?: number) => void;
};

export type TableArt<S = unknown> = {
	theme: Theme;
	inserts: Insert[];
	bulbs: Bulb[];
	/** The printed playfield, under every part. */
	paint: (ctx: CanvasRenderingContext2D, def: TableDef, h: Helpers) => void;
	/** Printed on top of the static parts: plastics, decals. */
	paintOver?: (ctx: CanvasRenderingContext2D, def: TableDef, h: Helpers) => void;
	/** Moving toys, each frame, after targets and before flippers and balls. */
	toys?: (ctx: CanvasRenderingContext2D, g: Game<S>, t: number, h: Helpers, fx: ToyFx) => void;
	/** Above the balls on the playfield but under raised balls. */
	overlay?: (ctx: CanvasRenderingContext2D, g: Game<S>, t: number, h: Helpers, blink: Blink) => void;
	/** Printed on the raised layer under its ramps and rails: an upper playfield's floor. */
	paintUpper?: (ctx: CanvasRenderingContext2D, def: TableDef, h: Helpers) => void;
	/** Toys on the raised layer, each frame, under raised balls. */
	raised?: (ctx: CanvasRenderingContext2D, g: Game<S>, t: number, h: Helpers, fx: ToyFx) => void;
};

/** How recently each toy was hit, 1 fading to 0, for squish and flash. */
export type ToyFx = { hit: (id: string) => number };

export function canvasOf(w: number, h = w) {
	const c = document.createElement('canvas');
	c.width = Math.max(1, Math.ceil(w));
	c.height = Math.max(1, Math.ceil(h));
	return c;
}

export function glowSprite(color: string, size: number) {
	const c = canvasOf(size);
	const ctx = c.getContext('2d')!;
	const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
	g.addColorStop(0, color);
	g.addColorStop(0.25, color + 'aa');
	g.addColorStop(0.6, color + '33');
	g.addColorStop(1, color + '00');
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, size, size);
	return c;
}

/** Stripes fanning from a point, like a tent roof or sun rays. */
export function rays(ctx: CanvasRenderingContext2D, u: number, cx: number, cy: number, n: number, from: number, to: number, a: string, b: string) {
	for (let i = 0; i < n; i += 1) {
		const a0 = from + (i / n) * (to - from);
		const a1 = from + ((i + 1) / n) * (to - from);
		ctx.beginPath();
		ctx.moveTo(cx * u, cy * u);
		ctx.lineTo((cx + Math.cos(a0) * 60) * u, (cy + Math.sin(a0) * 60) * u);
		ctx.lineTo((cx + Math.cos(a1) * 60) * u, (cy + Math.sin(a1) * 60) * u);
		ctx.closePath();
		ctx.fillStyle = i % 2 ? a : b;
		ctx.fill();
	}
}

export function vgrad(ctx: CanvasRenderingContext2D, y0: number, y1: number, stops: Array<[number, string]>) {
	const g = ctx.createLinearGradient(0, y0, 0, y1);
	for (const [at, c] of stops) g.addColorStop(at, c);
	return g;
}

export function radial(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, stops: Array<[number, string]>) {
	const g = ctx.createRadialGradient(x, y, 0, x, y, r);
	for (const [at, c] of stops) g.addColorStop(at, c);
	return g;
}

export function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string | CanvasGradient) {
	ctx.fillStyle = fill;
	ctx.beginPath();
	ctx.arc(x, y, r, 0, TAU);
	ctx.fill();
}

/** A five-pointed star centred on x, y. */
export function starPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, inner = 0.45, points = 5, turn = -Math.PI / 2) {
	ctx.beginPath();
	for (let i = 0; i < points * 2; i += 1) {
		const a = turn + (i / (points * 2)) * TAU;
		const rr = i % 2 ? r * inner : r;
		if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
		else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
	}
	ctx.closePath();
}
