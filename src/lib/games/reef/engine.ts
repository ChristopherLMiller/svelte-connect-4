import {
	COLS,
	HIDDEN,
	I,
	KINDS,
	LINES_PER_LEVEL,
	O,
	SPRINT_LINES,
	T,
	TOTAL,
	type Kind,
	type Mode
} from './types';

/** Spawn shapes as [x, y] in their SRS box, y down. */
const SHAPES: Record<Kind, Array<[number, number]>> = {
	1: [
		[0, 1],
		[1, 1],
		[2, 1],
		[3, 1]
	],
	2: [
		[1, 0],
		[2, 0],
		[1, 1],
		[2, 1]
	],
	3: [
		[1, 0],
		[0, 1],
		[1, 1],
		[2, 1]
	],
	4: [
		[1, 0],
		[2, 0],
		[0, 1],
		[1, 1]
	],
	5: [
		[0, 0],
		[1, 0],
		[1, 1],
		[2, 1]
	],
	6: [
		[0, 0],
		[0, 1],
		[1, 1],
		[2, 1]
	],
	7: [
		[2, 0],
		[0, 1],
		[1, 1],
		[2, 1]
	]
};

const BOX: Record<Kind, number> = { 1: 4, 2: 4, 3: 3, 4: 3, 5: 3, 6: 3, 7: 3 };

/** Cells for every kind and rotation, rotated clockwise inside the SRS box. */
const CELLS: Record<Kind, Array<Array<[number, number]>>> = Object.fromEntries(
	KINDS.map((kind) => {
		const n = BOX[kind];
		const states: Array<Array<[number, number]>> = [SHAPES[kind]];
		for (let r = 1; r < 4; r += 1) {
			states.push(kind === O ? SHAPES[kind] : states[r - 1]!.map(([x, y]) => [n - 1 - y, x] as [number, number]));
		}
		return [kind, states];
	})
) as Record<Kind, Array<Array<[number, number]>>>;

// SRS kick tables, written y-up as published; `kicks()` flips them for the y-down board.
const JLSTZ: Record<string, Array<[number, number]>> = {
	'0>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
	'1>0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
	'1>2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
	'2>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
	'2>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
	'3>2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
	'3>0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
	'0>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]
};

const IKICKS: Record<string, Array<[number, number]>> = {
	'0>1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
	'1>0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
	'1>2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
	'2>1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
	'2>3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
	'3>2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
	'3>0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
	'0>3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]
};

function kicks(kind: Kind, from: number, to: number) {
	if (kind === O) return [[0, 0]] as Array<[number, number]>;
	const table = kind === I ? IKICKS : JLSTZ;
	return table[`${from}>${to}`]!.map(([x, y]) => [x, -y] as [number, number]);
}

export function cellsOf(kind: Kind, rot: number) {
	return CELLS[kind][rot & 3]!;
}

export type Piece = { kind: Kind; rot: number; x: number; y: number };

export type ClearInfo = {
	rows: number[];
	count: number;
	tspin: 'none' | 'mini' | 'full';
	b2b: boolean;
	combo: number;
	perfect: boolean;
	points: number;
	label: string;
};

export type GameEvent =
	| { type: 'move' }
	| { type: 'rotate'; kick: number }
	| { type: 'land' }
	| { type: 'lock'; cells: Array<[number, number]>; kind: Kind }
	| { type: 'harddrop'; kind: Kind; cells: Array<[number, number]>; rows: number }
	| { type: 'clear'; info: ClearInfo }
	| { type: 'tspin'; mini: boolean }
	| { type: 'level'; level: number }
	| { type: 'hold'; kind: Kind }
	| { type: 'spawn'; kind: Kind }
	| { type: 'over' }
	| { type: 'done' };

export type Game = {
	mode: Mode;
	board: Uint8Array;
	piece: Piece | null;
	hold: Kind | 0;
	holdUsed: boolean;
	queue: Kind[];
	bag: Kind[];
	seed: number;
	score: number;
	lines: number;
	level: number;
	startLevel: number;
	combo: number;
	b2b: boolean;
	/** Seconds in play, for the sprint clock and the stats. */
	time: number;
	pieces: number;
	fall: number;
	lockTimer: number;
	lockResets: number;
	lowest: number;
	lastRotate: boolean;
	lastKick: number;
	/** Rows being dissolved and how long they have left before the stack settles. */
	clearing: { rows: number[]; left: number } | null;
	over: boolean;
	done: boolean;
	events: GameEvent[];
};

export const LOCK_DELAY = 0.5;
export const MAX_RESETS = 15;
export const CLEAR_DELAY = 0.34;
export const PREVIEW = 5;

function random(game: Game) {
	game.seed = (game.seed + 0x6d2b79f5) >>> 0;
	let t = game.seed;
	t = Math.imul(t ^ (t >>> 15), t | 1);
	t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function draw(game: Game): Kind {
	if (!game.bag.length) {
		const bag = [...KINDS];
		for (let i = bag.length - 1; i > 0; i -= 1) {
			const j = Math.floor(random(game) * (i + 1));
			[bag[i], bag[j]] = [bag[j]!, bag[i]!];
		}
		game.bag = bag;
	}
	return game.bag.shift()!;
}

function refill(game: Game) {
	while (game.queue.length < PREVIEW) game.queue.push(draw(game));
}

/** Seconds per row at a level (the guideline curve, held at level 20). */
export function gravityOf(level: number) {
	const l = Math.min(20, Math.max(1, level));
	return Math.pow(0.8 - (l - 1) * 0.007, l - 1);
}

export type Restore = Partial<
	Pick<Game, 'score' | 'lines' | 'level' | 'combo' | 'b2b' | 'time' | 'pieces' | 'hold' | 'queue' | 'bag' | 'seed'>
> & { board?: Uint8Array };

export function createGame(mode: Mode, startLevel: number, restore: Restore = {}): Game {
	const start = mode === 'sprint' ? 1 : startLevel;
	const game: Game = {
		mode,
		board: restore.board ?? new Uint8Array(COLS * TOTAL),
		piece: null,
		hold: restore.hold ?? 0,
		holdUsed: false,
		queue: restore.queue ? [...restore.queue] : [],
		bag: restore.bag ? [...restore.bag] : [],
		seed: restore.seed ?? ((Math.random() * 4294967296) >>> 0),
		score: restore.score ?? 0,
		lines: restore.lines ?? 0,
		level: restore.level ?? start,
		startLevel: start,
		combo: restore.combo ?? -1,
		b2b: restore.b2b ?? false,
		time: restore.time ?? 0,
		pieces: restore.pieces ?? 0,
		fall: 0,
		lockTimer: 0,
		lockResets: 0,
		lowest: 0,
		lastRotate: false,
		lastKick: 0,
		clearing: null,
		over: false,
		done: false,
		events: []
	};
	refill(game);
	spawn(game);
	return game;
}

export function fits(board: Uint8Array, kind: Kind, rot: number, x: number, y: number) {
	for (const [cx, cy] of cellsOf(kind, rot)) {
		const bx = x + cx;
		const by = y + cy;
		if (bx < 0 || bx >= COLS || by < 0 || by >= TOTAL) return false;
		if (board[by * COLS + bx]) return false;
	}
	return true;
}

function grounded(game: Game) {
	const p = game.piece;
	return !!p && !fits(game.board, p.kind, p.rot, p.x, p.y + 1);
}

function spawnAs(game: Game, kind: Kind) {
	const piece: Piece = { kind, rot: 0, x: 3, y: kind === I ? -1 : 0 };
	if (!fits(game.board, kind, 0, piece.x, piece.y)) {
		game.piece = null;
		game.over = true;
		game.events.push({ type: 'over' });
		return;
	}
	if (fits(game.board, kind, 0, piece.x, piece.y + 1)) piece.y += 1;
	game.piece = piece;
	game.fall = 0;
	game.lockTimer = 0;
	game.lockResets = 0;
	game.lowest = piece.y;
	game.lastRotate = false;
	game.events.push({ type: 'spawn', kind });
}

function spawn(game: Game) {
	const kind = game.queue.shift()!;
	refill(game);
	game.holdUsed = false;
	spawnAs(game, kind);
}

/** A successful move or turn on the ground buys more time, up to a limit. */
function touched(game: Game) {
	const p = game.piece!;
	if (p.y > game.lowest) {
		game.lowest = p.y;
		game.lockResets = 0;
	}
	if (grounded(game) && game.lockResets < MAX_RESETS) {
		game.lockTimer = 0;
		game.lockResets += 1;
	}
}

export function shift(game: Game, dx: number) {
	const p = game.piece;
	if (!p || game.clearing || game.over) return false;
	if (!fits(game.board, p.kind, p.rot, p.x + dx, p.y)) return false;
	p.x += dx;
	game.lastRotate = false;
	touched(game);
	game.events.push({ type: 'move' });
	return true;
}

export function rotate(game: Game, dir: 1 | -1) {
	const p = game.piece;
	if (!p || game.clearing || game.over) return false;
	const to = (p.rot + dir + 4) & 3;
	const tests = kicks(p.kind, p.rot, to);
	for (let i = 0; i < tests.length; i += 1) {
		const [kx, ky] = tests[i]!;
		if (fits(game.board, p.kind, to, p.x + kx, p.y + ky)) {
			p.x += kx;
			p.y += ky;
			p.rot = to;
			game.lastRotate = true;
			game.lastKick = i;
			touched(game);
			game.events.push({ type: 'rotate', kick: i });
			return true;
		}
	}
	return false;
}

export function ghostY(game: Game) {
	const p = game.piece;
	if (!p) return 0;
	let y = p.y;
	while (fits(game.board, p.kind, p.rot, p.x, y + 1)) y += 1;
	return y;
}

export function hardDrop(game: Game) {
	const p = game.piece;
	if (!p || game.clearing || game.over) return;
	const to = ghostY(game);
	const rows = to - p.y;
	if (rows > 0) game.lastRotate = false;
	p.y = to;
	game.score += rows * 2;
	game.events.push({
		type: 'harddrop',
		kind: p.kind,
		rows,
		cells: cellsOf(p.kind, p.rot).map(([cx, cy]) => [p.x + cx, p.y + cy] as [number, number])
	});
	lock(game);
}

export function holdPiece(game: Game) {
	const p = game.piece;
	if (!p || game.holdUsed || game.clearing || game.over) return false;
	const swap = game.hold;
	game.hold = p.kind;
	game.events.push({ type: 'hold', kind: p.kind });
	if (swap) spawnAs(game, swap);
	else {
		const kind = game.queue.shift()!;
		refill(game);
		spawnAs(game, kind);
	}
	game.holdUsed = true;
	return true;
}

function occupied(board: Uint8Array, x: number, y: number) {
	return x < 0 || x >= COLS || y >= TOTAL || (y >= 0 && board[y * COLS + x] !== 0);
}

/** Three-corner rule; a mini unless both corners the T points at are filled (or it took the last kick). */
function tspinOf(game: Game, p: Piece): ClearInfo['tspin'] {
	if (p.kind !== T || !game.lastRotate) return 'none';
	const corners = [
		occupied(game.board, p.x, p.y),
		occupied(game.board, p.x + 2, p.y),
		occupied(game.board, p.x + 2, p.y + 2),
		occupied(game.board, p.x, p.y + 2)
	];
	if (corners.filter(Boolean).length < 3) return 'none';
	const front = [
		[0, 1],
		[1, 2],
		[2, 3],
		[3, 0]
	][p.rot & 3]!;
	if (corners[front[0]!] && corners[front[1]!]) return 'full';
	return game.lastKick === 4 ? 'full' : 'mini';
}

const LINE_POINTS = [0, 100, 300, 500, 800];
const TSPIN_POINTS = [400, 800, 1200, 1600];
const MINI_POINTS = [100, 200, 400];
const PERFECT_POINTS = [0, 800, 1200, 1800, 2000];
const NAMES = ['', 'Single', 'Double', 'Triple', 'Lumen'];

function lock(game: Game) {
	const p = game.piece!;
	const tspin = tspinOf(game, p);
	const cells: Array<[number, number]> = [];
	let above = true;
	for (const [cx, cy] of cellsOf(p.kind, p.rot)) {
		const x = p.x + cx;
		const y = p.y + cy;
		game.board[y * COLS + x] = p.kind;
		cells.push([x, y]);
		if (y >= HIDDEN) above = false;
	}
	game.piece = null;
	game.pieces += 1;
	game.events.push({ type: 'lock', cells, kind: p.kind });

	const rows: number[] = [];
	for (let y = 0; y < TOTAL; y += 1) {
		let full = true;
		for (let x = 0; x < COLS; x += 1) {
			if (!game.board[y * COLS + x]) {
				full = false;
				break;
			}
		}
		if (full) rows.push(y);
	}

	const level = game.level;
	const count = rows.length;
	let points = 0;
	if (tspin === 'full') points = TSPIN_POINTS[count]! * level;
	else if (tspin === 'mini') points = (MINI_POINTS[count] ?? 400) * level;
	else points = LINE_POINTS[count]! * level;

	if (count) {
		const hard = count === 4 || tspin !== 'none';
		const b2b = hard && game.b2b;
		if (b2b) points = Math.floor(points * 1.5);
		game.b2b = hard;
		game.combo += 1;
		if (game.combo > 0) points += 50 * game.combo * level;
		let perfect = true;
		for (let i = 0; i < game.board.length && perfect; i += 1) {
			if (game.board[i] && !rows.includes(Math.floor(i / COLS))) perfect = false;
		}
		if (perfect) points += PERFECT_POINTS[count]! * level;
		game.score += points;
		const label = [
			b2b ? 'Back-to-back' : '',
			tspin === 'full' ? 'T-spin' : tspin === 'mini' ? 'T-spin mini' : '',
			tspin !== 'none' ? NAMES[count]!.replace('Lumen', 'Quad') : NAMES[count]!
		]
			.filter(Boolean)
			.join(' ');
		game.events.push({
			type: 'clear',
			info: { rows, count, tspin, b2b, combo: game.combo, perfect, points, label }
		});
		game.clearing = { rows, left: CLEAR_DELAY };
		return;
	}

	game.combo = -1;
	if (tspin !== 'none') {
		game.score += points;
		game.events.push({ type: 'tspin', mini: tspin === 'mini' });
	}
	if (above) {
		game.over = true;
		game.events.push({ type: 'over' });
		return;
	}
	spawn(game);
}

/** Finish a dissolve at once, e.g. before saving mid-clear. */
export function flushClear(game: Game) {
	if (game.clearing) settle(game);
}

function settle(game: Game) {
	const rows = game.clearing!.rows;
	game.clearing = null;
	const keep: number[] = [];
	for (let y = 0; y < TOTAL; y += 1) if (!rows.includes(y)) keep.push(y);
	const next = new Uint8Array(COLS * TOTAL);
	let dest = TOTAL - 1;
	for (let k = keep.length - 1; k >= 0; k -= 1) {
		const y = keep[k]!;
		next.set(game.board.subarray(y * COLS, y * COLS + COLS), dest * COLS);
		dest -= 1;
	}
	game.board = next;
	game.lines += rows.length;

	if (game.mode === 'sprint') {
		if (game.lines >= SPRINT_LINES) {
			game.done = true;
			game.events.push({ type: 'done' });
			return;
		}
	} else {
		const level = game.startLevel + Math.floor(game.lines / LINES_PER_LEVEL);
		if (level > game.level) {
			game.level = level;
			game.events.push({ type: 'level', level });
		}
	}
	spawn(game);
}

/** One soft-drop row, for the moment Down is pressed. */
export function softStep(game: Game) {
	const p = game.piece;
	if (!p || game.over || game.done || game.clearing) return false;
	if (!fits(game.board, p.kind, p.rot, p.x, p.y + 1)) return false;
	p.y += 1;
	game.fall = 0;
	game.lastRotate = false;
	game.score += 1;
	if (p.y > game.lowest) {
		game.lowest = p.y;
		game.lockResets = 0;
		game.lockTimer = 0;
	}
	if (!fits(game.board, p.kind, p.rot, p.x, p.y + 1)) game.events.push({ type: 'land' });
	return true;
}

/** Advance time: line-clear dissolve, gravity and lock delay. */
export function tick(game: Game, dt: number, soft: boolean) {
	if (game.over || game.done) return;
	game.time += dt;
	if (game.clearing) {
		game.clearing.left -= dt;
		if (game.clearing.left <= 0) settle(game);
		return;
	}
	const p = game.piece;
	if (!p) return;
	const gravity = gravityOf(game.level);
	const interval = soft ? Math.max(gravity / 10, Math.min(0.1, gravity / 3)) : gravity;
	// Time banked at normal gravity must not cash in as a burst of soft-drop rows.
	if (game.fall > interval) game.fall = interval;
	game.fall += dt;
	while (game.fall >= interval) {
		if (!fits(game.board, p.kind, p.rot, p.x, p.y + 1)) {
			game.fall = 0;
			break;
		}
		game.fall -= interval;
		p.y += 1;
		game.lastRotate = false;
		if (soft) game.score += 1;
		if (p.y > game.lowest) {
			game.lowest = p.y;
			game.lockResets = 0;
			game.lockTimer = 0;
		}
		if (!fits(game.board, p.kind, p.rot, p.x, p.y + 1)) game.events.push({ type: 'land' });
	}
	if (grounded(game)) {
		game.lockTimer += dt;
		if (game.lockTimer >= LOCK_DELAY || game.lockResets >= MAX_RESETS) lock(game);
	} else {
		game.lockTimer = 0;
	}
}
