import { COLS, ROWS, START_LEN, type Death, type Difficulty, type Dir, type Point } from './types';

export type StepOk = {
	ok: true;
	snake: Point[];
	food: Point;
	score: number;
	ate: boolean;
	won: boolean;
};

export type StepDead = {
	ok: false;
	snake: Point[];
	food: Point;
	score: number;
	ate: false;
	won: false;
	cause: Death;
};

export type StepResult = StepOk | StepDead;

export function keyOf(point: Point) {
	return `${point.x}:${point.y}`;
}

export function same(a: Point, b: Point) {
	return a.x === b.x && a.y === b.y;
}

export function delta(dir: Dir): Point {
	if (dir === 'up') return { x: 0, y: -1 };
	if (dir === 'down') return { x: 0, y: 1 };
	if (dir === 'left') return { x: -1, y: 0 };
	return { x: 1, y: 0 };
}

export function opposite(a: Dir, b: Dir) {
	return (
		(a === 'up' && b === 'down') ||
		(a === 'down' && b === 'up') ||
		(a === 'left' && b === 'right') ||
		(a === 'right' && b === 'left')
	);
}

export function spawnSnake(): { snake: Point[]; dir: Dir } {
	const y = Math.floor(ROWS / 2);
	const headX = Math.floor(COLS / 2);
	const snake: Point[] = [];
	for (let i = START_LEN - 1; i >= 0; i -= 1) {
		snake.push({ x: headX - i, y });
	}
	return { snake, dir: 'right' };
}

export function occupied(snake: Point[]) {
	return new Set(snake.map(keyOf));
}

export function spawnFood(snake: Point[], rng = Math.random): Point | null {
	const used = occupied(snake);
	const free = COLS * ROWS - used.size;
	if (free <= 0) return null;
	let skip = Math.floor(rng() * free);
	for (let y = 0; y < ROWS; y += 1) {
		for (let x = 0; x < COLS; x += 1) {
			if (used.has(`${x}:${y}`)) continue;
			if (skip === 0) return { x, y };
			skip -= 1;
		}
	}
	return null;
}

export function tickMs(difficulty: Difficulty, score: number) {
	const base = { easy: 168, medium: 118, hard: 84 }[difficulty];
	const drop = { easy: 2.1, medium: 2.7, hard: 3.1 }[difficulty];
	const floor = { easy: 78, medium: 56, hard: 42 }[difficulty];
	return Math.max(floor, base - score * drop);
}

export function steerQueue(queue: Dir[], current: Dir, next: Dir) {
	const last = queue.at(-1) ?? current;
	if (next === last || opposite(last, next)) return queue;
	return [...queue, next].slice(-2);
}

export function step(snake: Point[], dir: Dir, food: Point, score: number): StepResult {
	const move = delta(dir);
	const head = snake.at(-1);
	if (!head) {
		return { ok: false, snake, food, score, ate: false, won: false, cause: 'self' };
	}
	const next = { x: head.x + move.x, y: head.y + move.y };
	if (next.x < 0 || next.y < 0 || next.x >= COLS || next.y >= ROWS) {
		return { ok: false, snake, food, score, ate: false, won: false, cause: 'wall' };
	}
	const ate = same(next, food);
	const body = ate ? snake : snake.slice(1);
	if (body.some((cell) => same(cell, next))) {
		return { ok: false, snake, food, score, ate: false, won: false, cause: 'self' };
	}
	const grown = [...body, next];
	if (ate && grown.length >= COLS * ROWS) {
		return { ok: true, snake: grown, food: next, score: score + 1, ate: true, won: true };
	}
	const nextFood = ate ? spawnFood(grown) : food;
	if (ate && !nextFood) {
		return { ok: true, snake: grown, food: next, score: score + 1, ate: true, won: true };
	}
	return {
		ok: true,
		snake: grown,
		food: nextFood ?? food,
		score: ate ? score + 1 : score,
		ate,
		won: false
	};
}

export function lerp(a: number, b: number, t: number) {
	return a + (b - a) * t;
}

export function lerpSnake(prev: Point[], curr: Point[], t: number): Point[] {
	if (!curr.length) return curr;
	if (!prev.length || t >= 1) return curr.map((cell) => ({ ...cell }));
	const padded =
		prev.length === curr.length ? prev : [...prev, prev.at(-1) ?? curr[0]];
	return curr.map((cell, i) => {
		const from = padded[i] ?? padded.at(-1) ?? cell;
		return { x: lerp(from.x, cell.x, t), y: lerp(from.y, cell.y, t) };
	});
}

export function asDir(value: unknown): Dir | null {
	return value === 'up' || value === 'down' || value === 'left' || value === 'right' ? value : null;
}

export function asPoint(value: unknown): Point | null {
	if (!value || typeof value !== 'object') return null;
	const src = value as Partial<Point>;
	const x = src.x;
	const y = src.y;
	if (!Number.isInteger(x) || !Number.isInteger(y) || x === undefined || y === undefined) return null;
	if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return null;
	return { x, y };
}
