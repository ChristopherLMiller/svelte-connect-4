import type { Card } from './deck';

/** Where one card sits on the table. x/y are its centre in px within the table. */
export type Placement = {
	id: Card;
	x: number;
	y: number;
	/** Degrees. */
	rot: number;
	face: boolean;
	z: number;
	/** Transition delay in ms, for staggered deals. */
	delay?: number;
	/** Can be tapped or dragged. */
	live?: boolean;
	/** Raised out of the hand (chosen for a discard or pass). */
	raised?: boolean;
	/** Faded: can't be played right now. */
	dim?: boolean;
	/** A coloured halo (winning card, scoring card). */
	glow?: string | null;
	scale?: number;
	/** Accessible name; face-down cards are announced as "card". */
	label?: string;
};

export type Fan = {
	cx: number;
	cy: number;
	/** Card width in px. */
	w: number;
	/** Max total spread in px. */
	span: number;
	/** Degrees between neighbours. */
	arc?: number;
	/** Rotation of the whole fan (90 for a left-side seat). */
	turn?: number;
	/** Max gap between card centres, as a fraction of card width. */
	gap?: number;
};

/** Centre positions for a fanned hand, curving gently like a held hand of cards. */
export function fan(count: number, f: Fan): Array<{ x: number; y: number; rot: number }> {
	if (count === 0) return [];
	const maxGap = f.w * (f.gap ?? 0.62);
	const step = count > 1 ? Math.min(maxGap, (f.span - f.w) / (count - 1)) : 0;
	const arc = f.arc ?? 3;
	const turn = ((f.turn ?? 0) * Math.PI) / 180;
	const out: Array<{ x: number; y: number; rot: number }> = [];
	for (let i = 0; i < count; i++) {
		const k = i - (count - 1) / 2;
		const along = k * step;
		const drop = Math.abs(k) * Math.abs(k) * f.w * 0.012 * (arc / 3);
		const lx = along;
		const ly = drop;
		out.push({
			x: f.cx + lx * Math.cos(turn) - ly * Math.sin(turn),
			y: f.cy + lx * Math.sin(turn) + ly * Math.cos(turn),
			rot: k * arc + (f.turn ?? 0)
		});
	}
	return out;
}

/** A neat stack with a slight thickness, for decks and won-trick piles. */
export function stack(count: number, x: number, y: number, w: number, rot = 0) {
	return Array.from({ length: count }, (_, i) => ({ x: x - i * w * 0.004, y: y - i * w * 0.006, rot }));
}
