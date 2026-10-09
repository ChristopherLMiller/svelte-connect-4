import { ACE, JACK, KING, QUEEN, RANK_LABEL, isRed, rankOf, suitOf, type Card, type Suit } from './deck';

export const CARD_W = 240;
export const CARD_H = 336;
/** Width over height of every card, for layout. */
export const CARD_RATIO = CARD_W / CARD_H;

const RED = '#b3262e';
const BLACK = '#1d1a18';
const BLUE = '#24427a';
const GOLD = '#d6a238';
const SKIN = '#f2dcc0';

export type BackStyle = {
	field: string;
	deep: string;
	line: string;
	crest: (ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) => void;
};

function suitPath(suit: Suit): Path2D {
	const p = new Path2D();
	if (suit === 1) {
		p.moveTo(0, -1);
		p.quadraticCurveTo(0.35, -0.42, 0.72, 0);
		p.quadraticCurveTo(0.35, 0.42, 0, 1);
		p.quadraticCurveTo(-0.35, 0.42, -0.72, 0);
		p.quadraticCurveTo(-0.35, -0.42, 0, -1);
	} else if (suit === 3) {
		p.moveTo(0, 0.95);
		p.bezierCurveTo(-0.3, 0.6, -0.95, 0.2, -0.92, -0.32);
		p.bezierCurveTo(-0.9, -0.82, -0.25, -0.98, 0, -0.52);
		p.bezierCurveTo(0.25, -0.98, 0.9, -0.82, 0.92, -0.32);
		p.bezierCurveTo(0.95, 0.2, 0.3, 0.6, 0, 0.95);
	} else if (suit === 2) {
		p.moveTo(0, -1);
		p.bezierCurveTo(0.3, -0.6, 0.95, -0.25, 0.92, 0.22);
		p.bezierCurveTo(0.9, 0.62, 0.38, 0.72, 0.1, 0.42);
		p.quadraticCurveTo(0.14, 0.78, 0.36, 1);
		p.lineTo(-0.36, 1);
		p.quadraticCurveTo(-0.14, 0.78, -0.1, 0.42);
		p.bezierCurveTo(-0.38, 0.72, -0.9, 0.62, -0.92, 0.22);
		p.bezierCurveTo(-0.95, -0.25, -0.3, -0.6, 0, -1);
	} else {
		p.arc(0, -0.48, 0.36, 0, Math.PI * 2);
		p.moveTo(-0.44 + 0.36, 0.1);
		p.arc(-0.44, 0.1, 0.36, 0, Math.PI * 2);
		p.moveTo(0.44 + 0.36, 0.1);
		p.arc(0.44, 0.1, 0.36, 0, Math.PI * 2);
		p.moveTo(-0.1, 0.1);
		p.quadraticCurveTo(-0.12, 0.78, -0.38, 1);
		p.lineTo(0.38, 1);
		p.quadraticCurveTo(0.12, 0.78, 0.1, 0.1);
		p.closePath();
	}
	return p;
}

let paths: Path2D[] | null = null;

export function drawPip(ctx: CanvasRenderingContext2D, suit: Suit, x: number, y: number, size: number, flip = false, colour?: string) {
	ctx.save();
	ctx.translate(x, y);
	if (flip) ctx.rotate(Math.PI);
	ctx.scale(size, size);
	ctx.fillStyle = colour ?? (suit === 1 || suit === 3 ? RED : BLACK);
	paths ??= [0, 1, 2, 3].map((s) => suitPath(s as Suit));
	ctx.fill(paths[suit]);
	ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + w, y, x + w, y + h, r);
	ctx.arcTo(x + w, y + h, x, y + h, r);
	ctx.arcTo(x, y + h, x, y, r);
	ctx.arcTo(x, y, x + w, y, r);
	ctx.closePath();
}

function hash(n: number) {
	const x = Math.sin(n * 127.1) * 43758.5453;
	return x - Math.floor(x);
}

function paper(ctx: CanvasRenderingContext2D, seed: number) {
	roundRect(ctx, 1, 1, CARD_W - 2, CARD_H - 2, 18);
	ctx.save();
	ctx.clip();
	const g = ctx.createRadialGradient(CARD_W / 2, CARD_H / 2, 40, CARD_W / 2, CARD_H / 2, CARD_H * 0.7);
	g.addColorStop(0, '#fbf5e8');
	g.addColorStop(1, '#ebdcc0');
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, CARD_W, CARD_H);
	for (let i = 0; i < 140; i++) {
		const x = hash(seed * 31 + i) * CARD_W;
		const y = hash(seed * 17 + i * 3.1) * CARD_H;
		ctx.fillStyle = `rgba(120, 90, 50, ${0.03 + hash(i + seed) * 0.05})`;
		ctx.fillRect(x, y, 1.5, 1.5);
	}
	ctx.restore();
	roundRect(ctx, 1, 1, CARD_W - 2, CARD_H - 2, 18);
	ctx.strokeStyle = 'rgba(80, 60, 40, 0.35)';
	ctx.lineWidth = 2;
	ctx.stroke();
}

function corner(ctx: CanvasRenderingContext2D, c: Card) {
	const suit = suitOf(c);
	const text = RANK_LABEL[rankOf(c)];
	ctx.fillStyle = isRed(c) ? RED : BLACK;
	ctx.font = `700 ${text.length > 1 ? 40 : 46}px Georgia, 'Times New Roman', serif`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'alphabetic';
	for (const flip of [false, true]) {
		ctx.save();
		if (flip) {
			ctx.translate(CARD_W, CARD_H);
			ctx.rotate(Math.PI);
		}
		ctx.fillText(text, 30, 52);
		drawPip(ctx, suit, 30, 76, 15);
		ctx.restore();
	}
}

const PIPS: Record<number, Array<[number, number]>> = {
	2: [[0.5, 0], [0.5, 1]],
	3: [[0.5, 0], [0.5, 0.5], [0.5, 1]],
	4: [[0, 0], [1, 0], [0, 1], [1, 1]],
	5: [[0, 0], [1, 0], [0.5, 0.5], [0, 1], [1, 1]],
	6: [[0, 0], [1, 0], [0, 0.5], [1, 0.5], [0, 1], [1, 1]],
	7: [[0, 0], [1, 0], [0.5, 0.25], [0, 0.5], [1, 0.5], [0, 1], [1, 1]],
	8: [[0, 0], [1, 0], [0.5, 0.25], [0, 0.5], [1, 0.5], [0.5, 0.75], [0, 1], [1, 1]],
	9: [[0, 0], [1, 0], [0, 1 / 3], [1, 1 / 3], [0.5, 0.5], [0, 2 / 3], [1, 2 / 3], [0, 1], [1, 1]],
	10: [[0, 0], [1, 0], [0.5, 1 / 6], [0, 1 / 3], [1, 1 / 3], [0, 2 / 3], [1, 2 / 3], [0.5, 5 / 6], [0, 1], [1, 1]]
};

function pips(ctx: CanvasRenderingContext2D, c: Card) {
	const count = rankOf(c) + 2;
	const suit = suitOf(c);
	const left = 76;
	const right = CARD_W - 76;
	const top = 70;
	const bottom = CARD_H - 70;
	for (const [fx, fy] of PIPS[count]) {
		drawPip(ctx, suit, left + (right - left) * fx, top + (bottom - top) * fy, 25, fy > 0.55);
	}
}

function ace(ctx: CanvasRenderingContext2D, c: Card) {
	const suit = suitOf(c);
	ctx.save();
	ctx.globalAlpha = 0.18;
	ctx.strokeStyle = GOLD;
	ctx.lineWidth = 3;
	for (let i = 0; i < 2; i++) {
		ctx.beginPath();
		ctx.ellipse(CARD_W / 2, CARD_H / 2, 70 + i * 12, 92 + i * 12, 0, 0, Math.PI * 2);
		ctx.stroke();
	}
	ctx.restore();
	drawPip(ctx, suit, CARD_W / 2, CARD_H / 2, suit === 2 ? 64 : 52);
	if (suit === 2) {
		ctx.save();
		ctx.strokeStyle = GOLD;
		ctx.lineWidth = 3;
		ctx.beginPath();
		for (const s of [-1, 1]) {
			ctx.moveTo(CARD_W / 2 + s * 30, CARD_H / 2 + 50);
			ctx.bezierCurveTo(CARD_W / 2 + s * 90, CARD_H / 2 + 60, CARD_W / 2 + s * 90, CARD_H / 2 - 40, CARD_W / 2 + s * 60, CARD_H / 2 - 70);
		}
		ctx.stroke();
		ctx.restore();
	}
}

/** Half a double-headed court figure, drawn upright in the top half; the caller mirrors it. */
function courtHalf(ctx: CanvasRenderingContext2D, rank: number, suit: Suit) {
	const cx = CARD_W / 2;
	const robeA = suit === 1 || suit === 3 ? RED : BLUE;
	const robeB = suit === 1 || suit === 3 ? BLUE : RED;
	ctx.lineWidth = 2.2;
	ctx.strokeStyle = BLACK;
	ctx.lineJoin = 'round';

	ctx.beginPath();
	ctx.moveTo(cx - 70, 168);
	ctx.quadraticCurveTo(cx - 66, 118, cx - 30, 108);
	ctx.lineTo(cx + 30, 108);
	ctx.quadraticCurveTo(cx + 66, 118, cx + 70, 168);
	ctx.closePath();
	ctx.fillStyle = robeA;
	ctx.fill();
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(cx - 18, 108);
	ctx.lineTo(cx - 8, 168);
	ctx.lineTo(cx + 8, 168);
	ctx.lineTo(cx + 18, 108);
	ctx.closePath();
	ctx.fillStyle = GOLD;
	ctx.fill();
	ctx.stroke();
	for (let i = 0; i < 4; i++) {
		ctx.beginPath();
		ctx.arc(cx, 120 + i * 12, 2.6, 0, Math.PI * 2);
		ctx.fillStyle = robeB;
		ctx.fill();
	}
	ctx.beginPath();
	ctx.moveTo(cx - 60, 140);
	ctx.quadraticCurveTo(cx - 40, 130, cx - 26, 150);
	ctx.moveTo(cx + 60, 140);
	ctx.quadraticCurveTo(cx + 40, 130, cx + 26, 150);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(cx - 34, 112);
	ctx.quadraticCurveTo(cx, 126, cx + 34, 112);
	ctx.lineTo(cx + 30, 104);
	ctx.quadraticCurveTo(cx, 114, cx - 30, 104);
	ctx.closePath();
	ctx.fillStyle = '#f6efe0';
	ctx.fill();
	ctx.stroke();

	if (rank === QUEEN) {
		ctx.beginPath();
		ctx.moveTo(cx - 24, 70);
		ctx.quadraticCurveTo(cx - 40, 96, cx - 34, 112);
		ctx.lineTo(cx + 34, 112);
		ctx.quadraticCurveTo(cx + 40, 96, cx + 24, 70);
		ctx.closePath();
		ctx.fillStyle = suit === 2 || suit === 0 ? '#3b2618' : '#c98a3a';
		ctx.fill();
		ctx.stroke();
	}
	ctx.beginPath();
	ctx.ellipse(cx, 80, 19, 24, 0, 0, Math.PI * 2);
	ctx.fillStyle = SKIN;
	ctx.fill();
	ctx.stroke();
	ctx.fillStyle = BLACK;
	ctx.beginPath();
	ctx.arc(cx - 7, 78, 1.8, 0, Math.PI * 2);
	ctx.arc(cx + 7, 78, 1.8, 0, Math.PI * 2);
	ctx.fill();
	ctx.beginPath();
	ctx.moveTo(cx, 80);
	ctx.lineTo(cx - 2, 88);
	ctx.lineTo(cx + 1, 89);
	ctx.moveTo(cx - 5, 95);
	ctx.quadraticCurveTo(cx, 97, cx + 5, 95);
	ctx.lineWidth = 1.4;
	ctx.stroke();
	ctx.lineWidth = 2.2;

	if (rank === KING) {
		ctx.beginPath();
		ctx.moveTo(cx - 18, 88);
		ctx.quadraticCurveTo(cx - 20, 112, cx, 116);
		ctx.quadraticCurveTo(cx + 20, 112, cx + 18, 88);
		ctx.quadraticCurveTo(cx, 98, cx - 18, 88);
		ctx.fillStyle = '#7a5a3a';
		ctx.fill();
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(cx - 22, 64);
		ctx.lineTo(cx - 24, 40);
		ctx.lineTo(cx - 12, 52);
		ctx.lineTo(cx, 34);
		ctx.lineTo(cx + 12, 52);
		ctx.lineTo(cx + 24, 40);
		ctx.lineTo(cx + 22, 64);
		ctx.closePath();
		ctx.fillStyle = GOLD;
		ctx.fill();
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(cx + 52, 160);
		ctx.lineTo(cx + 52, 52);
		ctx.moveTo(cx + 42, 140);
		ctx.lineTo(cx + 62, 140);
		ctx.lineWidth = 3;
		ctx.stroke();
	} else if (rank === QUEEN) {
		ctx.beginPath();
		ctx.moveTo(cx - 20, 62);
		ctx.quadraticCurveTo(cx - 14, 46, cx, 50);
		ctx.quadraticCurveTo(cx + 14, 46, cx + 20, 62);
		ctx.quadraticCurveTo(cx, 56, cx - 20, 62);
		ctx.fillStyle = GOLD;
		ctx.fill();
		ctx.stroke();
		for (const x of [-12, 0, 12]) {
			ctx.beginPath();
			ctx.arc(cx + x, 50 - (x === 0 ? 4 : 0), 3, 0, Math.PI * 2);
			ctx.fillStyle = robeA;
			ctx.fill();
		}
		ctx.save();
		ctx.translate(cx + 48, 128);
		for (let i = 0; i < 5; i++) {
			ctx.beginPath();
			ctx.ellipse(Math.cos((i / 5) * Math.PI * 2) * 7, Math.sin((i / 5) * Math.PI * 2) * 7, 6, 4, (i / 5) * Math.PI * 2, 0, Math.PI * 2);
			ctx.fillStyle = robeA;
			ctx.fill();
			ctx.stroke();
		}
		ctx.beginPath();
		ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
		ctx.fillStyle = GOLD;
		ctx.fill();
		ctx.moveTo(0, 8);
		ctx.lineTo(-4, 36);
		ctx.stroke();
		ctx.restore();
	} else {
		ctx.beginPath();
		ctx.moveTo(cx - 24, 70);
		ctx.quadraticCurveTo(cx - 26, 46, cx, 46);
		ctx.quadraticCurveTo(cx + 30, 46, cx + 30, 64);
		ctx.lineTo(cx - 24, 70);
		ctx.closePath();
		ctx.fillStyle = robeB;
		ctx.fill();
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(cx + 24, 56);
		ctx.bezierCurveTo(cx + 50, 40, cx + 60, 30, cx + 56, 16);
		ctx.bezierCurveTo(cx + 46, 34, cx + 36, 44, cx + 20, 52);
		ctx.fillStyle = GOLD;
		ctx.fill();
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(cx - 52, 162);
		ctx.lineTo(cx - 52, 40);
		ctx.lineWidth = 3;
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(cx - 52, 40);
		ctx.lineTo(cx - 62, 56);
		ctx.lineTo(cx - 52, 64);
		ctx.lineTo(cx - 42, 56);
		ctx.closePath();
		ctx.fillStyle = '#9aa0a6';
		ctx.fill();
		ctx.lineWidth = 2;
		ctx.stroke();
	}
	drawPip(ctx, suit, cx - 44, 100, 11);
}

function court(ctx: CanvasRenderingContext2D, c: Card) {
	const rank = rankOf(c);
	const suit = suitOf(c);
	const x = 52;
	const y = 30;
	const w = CARD_W - 104;
	const h = CARD_H - 60;
	ctx.save();
	ctx.beginPath();
	ctx.rect(x, y, w, h);
	ctx.clip();
	ctx.fillStyle = '#f7eedb';
	ctx.fillRect(x, y, w, h);
	ctx.translate(0, 0);
	ctx.save();
	ctx.beginPath();
	ctx.rect(x, y, w, h / 2);
	ctx.clip();
	ctx.translate(0, 0);
	courtHalf(ctx, rank, suit);
	ctx.restore();
	ctx.save();
	ctx.beginPath();
	ctx.rect(x, y + h / 2, w, h / 2);
	ctx.clip();
	ctx.translate(CARD_W, CARD_H);
	ctx.rotate(Math.PI);
	courtHalf(ctx, rank, suit);
	ctx.restore();
	ctx.restore();
	ctx.strokeStyle = isRed(c) ? RED : BLACK;
	ctx.lineWidth = 2;
	ctx.strokeRect(x, y, w, h);
	ctx.beginPath();
	ctx.moveTo(x, CARD_H / 2);
	ctx.lineTo(x + w, CARD_H / 2);
	ctx.lineWidth = 1.2;
	ctx.stroke();
}

function makeCanvas() {
	const canvas = document.createElement('canvas');
	canvas.width = CARD_W;
	canvas.height = CARD_H;
	return canvas;
}

const faceCache = new Map<Card, string>();

/** Data URL for a card face, painted once per session. */
export function faceUrl(c: Card): string {
	c = c % 52;
	const hit = faceCache.get(c);
	if (hit) return hit;
	const canvas = makeCanvas();
	const ctx = canvas.getContext('2d')!;
	paper(ctx, c + 1);
	const rank = rankOf(c);
	if (rank === ACE) ace(ctx, c);
	else if (rank >= JACK) court(ctx, c);
	else pips(ctx, c);
	corner(ctx, c);
	const url = canvas.toDataURL('image/png');
	faceCache.set(c, url);
	return url;
}

const backCache = new Map<BackStyle, string>();

/** Data URL for a card back: a lattice field inside a gilt border around a crest. */
export function backUrl(style: BackStyle): string {
	const hit = backCache.get(style);
	if (hit) return hit;
	const canvas = makeCanvas();
	const ctx = canvas.getContext('2d')!;
	roundRect(ctx, 1, 1, CARD_W - 2, CARD_H - 2, 18);
	ctx.fillStyle = '#f4ead6';
	ctx.fill();
	roundRect(ctx, 12, 12, CARD_W - 24, CARD_H - 24, 10);
	ctx.save();
	ctx.clip();
	const g = ctx.createLinearGradient(0, 0, 0, CARD_H);
	g.addColorStop(0, style.field);
	g.addColorStop(1, style.deep);
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, CARD_W, CARD_H);
	ctx.strokeStyle = style.line;
	ctx.globalAlpha = 0.35;
	ctx.lineWidth = 1.5;
	for (let i = -CARD_H; i < CARD_W + CARD_H; i += 16) {
		ctx.beginPath();
		ctx.moveTo(i, 0);
		ctx.lineTo(i + CARD_H, CARD_H);
		ctx.moveTo(i, CARD_H);
		ctx.lineTo(i + CARD_H, 0);
		ctx.stroke();
	}
	ctx.globalAlpha = 1;
	ctx.restore();
	ctx.strokeStyle = style.line;
	ctx.lineWidth = 3;
	roundRect(ctx, 20, 20, CARD_W - 40, CARD_H - 40, 8);
	ctx.stroke();
	ctx.lineWidth = 1.2;
	roundRect(ctx, 26, 26, CARD_W - 52, CARD_H - 52, 6);
	ctx.stroke();
	style.crest(ctx, CARD_W / 2, CARD_H / 2, 70);
	const url = canvas.toDataURL('image/png');
	backCache.set(style, url);
	return url;
}
