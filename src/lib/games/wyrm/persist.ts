import { asDir, asPoint, occupied, spawnFood, spawnSnake } from './engine';
import type { BestMap, Difficulty, Dir, GameStatus, Point } from './types';

export type SavedRun = {
	difficulty: Difficulty;
	snake: Point[];
	dir: Dir;
	queue: Dir[];
	food: Point;
	score: number;
	paused: boolean;
};

export type WyrmPrefs = {
	difficulty: Difficulty;
	best: BestMap;
	last: number;
	saved: SavedRun | null;
};

const KEY = 'wyrm-night';

function blankBest(): BestMap {
	return { easy: 0, medium: 0, hard: 0 };
}

export const DEFAULT_WYRM: WyrmPrefs = {
	difficulty: 'medium',
	best: blankBest(),
	last: 0,
	saved: null
};

function asDifficulty(value: unknown): Difficulty {
	return value === 'easy' || value === 'hard' ? value : 'medium';
}

function asSnake(value: unknown): Point[] | null {
	if (!Array.isArray(value) || value.length < 2) return null;
	const snake: Point[] = [];
	const seen = new Set<string>();
	for (const item of value) {
		const point = asPoint(item);
		if (!point) return null;
		const key = `${point.x}:${point.y}`;
		if (seen.has(key)) return null;
		seen.add(key);
		snake.push(point);
	}
	return snake;
}

function asQueue(value: unknown): Dir[] {
	if (!Array.isArray(value)) return [];
	const next: Dir[] = [];
	for (const item of value) {
		const dir = asDir(item);
		if (dir) next.push(dir);
	}
	return next.slice(-2);
}

function normalizeSaved(raw: unknown): SavedRun | null {
	if (!raw || typeof raw !== 'object') return null;
	const src = raw as Partial<SavedRun>;
	const snake = asSnake(src.snake);
	const dir = asDir(src.dir);
	const food = asPoint(src.food);
	if (!snake || !dir || !food) return null;
	if (occupied(snake).has(`${food.x}:${food.y}`)) return null;
	const score = Math.max(0, Math.floor(Number(src.score) || 0));
	return {
		difficulty: asDifficulty(src.difficulty),
		snake,
		dir,
		queue: asQueue(src.queue),
		food,
		score,
		paused: src.paused === true
	};
}

export function normalizeWyrm(raw: unknown): WyrmPrefs {
	if (!raw || typeof raw !== 'object') return structuredClone(DEFAULT_WYRM);
	const src = raw as Partial<WyrmPrefs>;
	const best: Partial<BestMap> = src.best ?? {};
	return {
		difficulty: asDifficulty(src.difficulty),
		best: {
			easy: Math.max(0, Math.floor(Number(best.easy) || 0)),
			medium: Math.max(0, Math.floor(Number(best.medium) || 0)),
			hard: Math.max(0, Math.floor(Number(best.hard) || 0))
		},
		last: Math.max(0, Math.floor(Number(src.last) || 0)),
		saved: normalizeSaved(src.saved)
	};
}

function read(): WyrmPrefs {
	if (typeof localStorage === 'undefined') return structuredClone(DEFAULT_WYRM);
	try {
		return normalizeWyrm(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
	} catch {
		return structuredClone(DEFAULT_WYRM);
	}
}

let cache = read();

export function peekWyrm(): WyrmPrefs {
	return cache;
}

export function writeWyrm(patch: Partial<WyrmPrefs>) {
	cache = {
		...cache,
		...patch,
		best: patch.best ?? cache.best,
		saved: patch.saved === undefined ? cache.saved : patch.saved
	};
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(KEY, JSON.stringify(cache));
	} catch {
		/* quota / private mode */
	}
}

export function writeBest(difficulty: Difficulty, score: number) {
	const best = { ...cache.best };
	if (score > best[difficulty]) best[difficulty] = score;
	writeWyrm({ best, last: score });
}

export function writeSaved(saved: SavedRun | null) {
	writeWyrm({ saved });
}

export function peekSaved(): SavedRun | null {
	const saved = cache.saved;
	if (!saved) return null;
	return {
		...saved,
		snake: saved.snake.map((cell) => ({ ...cell })),
		queue: [...saved.queue],
		food: { ...saved.food }
	};
}

export function freshRun(difficulty: Difficulty) {
	const { snake, dir } = spawnSnake();
	const food = spawnFood(snake) ?? { x: snake.at(-1)!.x + 2, y: snake.at(-1)!.y };
	return { difficulty, snake, dir, queue: [] as Dir[], food, score: 0, paused: false };
}

export function liveStatus(paused: boolean): GameStatus {
	return paused ? { type: 'paused' } : { type: 'playing' };
}
