export type Scratch = {
	paths: string[];
	rotate: number;
	width: number;
	ox: number;
	oy: number;
};

export function rng(seed: number) {
	let a = (seed >>> 0) || 1;
	return () => {
		a = (Math.imul(a, 1664525) + 1013904223) >>> 0;
		return a / 4294967296;
	};
}

function between(roll: () => number, min: number, max: number) {
	return min + roll() * (max - min);
}

function pick(roll: () => number, min: number, max: number) {
	return between(roll, min, max);
}

function stroke(roll: () => number, pts: Array<[number, number]>, bow = 16) {
	if (pts.length < 2) return '';
	let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
	for (let i = 1; i < pts.length; i += 1) {
		const [x, y] = pts[i];
		const [px, py] = pts[i - 1];
		const dx = x - px;
		const dy = y - py;
		const len = Math.hypot(dx, dy) || 1;
		const nx = -dy / len;
		const ny = dx / len;
		const bowA = pick(roll, -bow, bow);
		const bowB = pick(roll, -bow, bow);
		const c1x = px + dx * 0.28 + nx * bowA;
		const c1y = py + dy * 0.28 + ny * bowA;
		const c2x = px + dx * 0.72 + nx * bowB;
		const c2y = py + dy * 0.72 + ny * bowB;
		d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`;
	}
	return d;
}

function scratchCross(roll: () => number): Scratch {
	const a: Array<[number, number]> = [
		[pick(roll, 16, 22), pick(roll, 16, 22)],
		[pick(roll, 48, 52), pick(roll, 48, 52)],
		[pick(roll, 78, 84), pick(roll, 78, 84)]
	];
	const b: Array<[number, number]> = [
		[pick(roll, 78, 84), pick(roll, 16, 22)],
		[pick(roll, 48, 52), pick(roll, 48, 52)],
		[pick(roll, 16, 22), pick(roll, 78, 84)]
	];
	return {
		paths: [stroke(roll, a, 3.2), stroke(roll, b, 3.2)],
		rotate: pick(roll, -5, 5),
		width: pick(roll, 5.8, 6.8),
		ox: pick(roll, -2, 2),
		oy: pick(roll, -2, 2)
	};
}

function scratchLoop(roll: () => number): Scratch {
	const cx = pick(roll, 48.4, 51.6);
	const cy = pick(roll, 48.4, 51.6);
	const rx = pick(roll, 29.5, 33.8);
	const ry = pick(roll, rx - 2.6, rx + 1.8);
	const start = pick(roll, -0.55, 0.7);
	const sweep = pick(roll, Math.PI * 1.88, Math.PI * 1.97);
	const segments = 6;
	const radii = Array.from({ length: segments + 1 }, () => ({
		x: rx * pick(roll, 0.94, 1.07),
		y: ry * pick(roll, 0.94, 1.07)
	}));

	const point = (index: number) => {
		const t = start + (index / segments) * sweep;
		const { x: prx, y: pry } = radii[index];
		return {
			t,
			x: cx + Math.cos(t) * prx,
			y: cy + Math.sin(t) * pry,
			tx: -Math.sin(t) * prx,
			ty: Math.cos(t) * pry
		};
	};

	const first = point(0);
	let d = `M${first.x.toFixed(1)},${first.y.toFixed(1)}`;
	for (let i = 0; i < segments; i += 1) {
		const a = point(i);
		const b = point(i + 1);
		const alpha = (4 / 3) * Math.tan((b.t - a.t) / 4);
		const c1x = a.x + a.tx * alpha + pick(roll, -1.4, 1.4);
		const c1y = a.y + a.ty * alpha + pick(roll, -1.4, 1.4);
		const c2x = b.x - b.tx * alpha + pick(roll, -1.4, 1.4);
		const c2y = b.y - b.ty * alpha + pick(roll, -1.4, 1.4);
		d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`;
	}

	return {
		paths: [d],
		rotate: pick(roll, -6, 6),
		width: pick(roll, 5.5, 6.7),
		ox: pick(roll, -1.8, 1.8),
		oy: pick(roll, -1.8, 1.8)
	};
}

export function scratchMark(player: 1 | 2, seed: number): Scratch {
	const roll = rng(seed);
	return player === 1 ? scratchCross(roll) : scratchLoop(roll);
}

export function scratchGrid(seed: number, size = 300) {
	const roll = rng(seed);
	return [
		groove(roll, true, size / 3, size),
		groove(roll, true, (size * 2) / 3, size),
		groove(roll, false, size / 3, size),
		groove(roll, false, (size * 2) / 3, size)
	];
}

function groove(roll: () => number, horizontal: boolean, at: number, size: number) {
	const steps = 3;
	const margin = pick(roll, 10, 16);
	const pts: Array<[number, number]> = [];
	for (let i = 0; i <= steps; i += 1) {
		const t = i / steps;
		const along = margin + t * (size - margin * 2) + pick(roll, -1.4, 1.4);
		const drift = at + pick(roll, -2.4, 2.4);
		pts.push(horizontal ? [along, drift] : [drift, along]);
	}
	return stroke(roll, pts, 4);
}
