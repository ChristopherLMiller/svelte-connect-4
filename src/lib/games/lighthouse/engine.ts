import { opponent, type GameStatus, type Player } from './types';

/** Where a ship's bow sits and which way the hull runs (right, or down). */
export type Placement = { at: number; vertical: boolean };

/** What the attacker knows about each cell of the rival's waters. */
export const UNKNOWN = 0;
export const MISS = 1;
export const HIT = 2;
export const SUNK = 3;

export type Waters = {
	size: number;
	lengths: number[];
	fleet: Placement[];
	/** Ship number + 1 on each cell, 0 for open water. */
	cells: number[];
	shots: number[];
	hits: number[];
	sunk: boolean[];
};

export type ShotResult = {
	kind: 'miss' | 'hit' | 'sunk';
	ship: number;
	cells: number[];
	won: boolean;
};

export function shipCells(size: number, length: number, p: Placement): number[] | null {
	const r = Math.floor(p.at / size);
	const c = p.at % size;
	if (p.at < 0 || p.at >= size * size) return null;
	if (p.vertical ? r + length > size : c + length > size) return null;
	return Array.from({ length }, (_, k) => (p.vertical ? p.at + k * size : p.at + k));
}

/** A ship can sit at `p` without leaving the sea or overlapping the others already placed. */
export function fits(size: number, lengths: number[], fleet: Array<Placement | null>, ship: number, p: Placement): boolean {
	const cells = shipCells(size, lengths[ship], p);
	if (!cells) return false;
	const taken = new Set<number>();
	fleet.forEach((other, k) => {
		if (!other || k === ship) return;
		for (const cell of shipCells(size, lengths[k], other) ?? []) taken.add(cell);
	});
	return cells.every((cell) => !taken.has(cell));
}

/** Pull a bow back inside the sea so a hull of `length` fits from it. */
export function clampBow(size: number, length: number, at: number, vertical: boolean) {
	let r = Math.floor(at / size);
	let c = at % size;
	if (vertical) r = Math.min(r, size - length);
	else c = Math.min(c, size - length);
	return r * size + c;
}

export function validFleet(size: number, lengths: number[], fleet: unknown): fleet is Placement[] {
	if (!Array.isArray(fleet) || fleet.length !== lengths.length) return false;
	const placed: Placement[] = [];
	for (let k = 0; k < lengths.length; k += 1) {
		const raw = fleet[k] as Partial<Placement> | null;
		if (!raw || typeof raw !== 'object' || !Number.isInteger(raw.at)) return false;
		const p = { at: raw.at as number, vertical: raw.vertical === true };
		if (!fits(size, lengths, placed, k, p)) return false;
		placed.push(p);
	}
	return true;
}

/** Scatter a fleet at random; `apart` keeps hulls from touching side to side. */
export function randomFleet(size: number, lengths: number[], apart = false, rand = Math.random): Placement[] {
	for (let attempt = 0; attempt < 200; attempt += 1) {
		const fleet: Placement[] = [];
		const blocked = new Set<number>();
		let ok = true;
		for (let k = 0; k < lengths.length && ok; k += 1) {
			ok = false;
			for (let tries = 0; tries < 300; tries += 1) {
				const vertical = rand() < 0.5;
				const at = clampBow(size, lengths[k], Math.floor(rand() * size * size), vertical);
				const cells = shipCells(size, lengths[k], { at, vertical });
				if (!cells || cells.some((cell) => blocked.has(cell))) continue;
				fleet.push({ at, vertical });
				for (const cell of cells) {
					blocked.add(cell);
					if (!apart) continue;
					for (const n of neighbours(size, cell)) blocked.add(n);
				}
				ok = true;
				break;
			}
		}
		if (ok) return fleet;
	}
	return randomFleet(size, lengths, false, rand);
}

export function neighbours(size: number, index: number): number[] {
	const r = Math.floor(index / size);
	const c = index % size;
	const out: number[] = [];
	if (r > 0) out.push(index - size);
	if (r < size - 1) out.push(index + size);
	if (c > 0) out.push(index - 1);
	if (c < size - 1) out.push(index + 1);
	return out;
}

export function createWaters(size: number, lengths: number[], fleet: Placement[]): Waters {
	const cells = new Array<number>(size * size).fill(0);
	fleet.forEach((p, k) => {
		for (const cell of shipCells(size, lengths[k], p) ?? []) cells[cell] = k + 1;
	});
	return {
		size,
		lengths: [...lengths],
		fleet: fleet.map((p) => ({ ...p })),
		cells,
		shots: new Array<number>(size * size).fill(UNKNOWN),
		hits: lengths.map(() => 0),
		sunk: lengths.map(() => false)
	};
}

export function cloneWaters(w: Waters): Waters {
	return {
		...w,
		fleet: w.fleet.map((p) => ({ ...p })),
		shots: [...w.shots],
		hits: [...w.hits],
		sunk: [...w.sunk]
	};
}

/** Fire into `w` (mutates it). Null when the cell was already shot. */
export function fire(w: Waters, index: number): ShotResult | null {
	if (index < 0 || index >= w.shots.length || w.shots[index] !== UNKNOWN) return null;
	const ship = w.cells[index] - 1;
	if (ship < 0) {
		w.shots[index] = MISS;
		return { kind: 'miss', ship: -1, cells: [index], won: false };
	}
	w.hits[ship] += 1;
	if (w.hits[ship] < w.lengths[ship]) {
		w.shots[index] = HIT;
		return { kind: 'hit', ship, cells: [index], won: false };
	}
	w.sunk[ship] = true;
	const cells = shipCells(w.size, w.lengths[ship], w.fleet[ship]) ?? [];
	for (const cell of cells) w.shots[cell] = SUNK;
	return { kind: 'sunk', ship, cells, won: w.sunk.every(Boolean) };
}

export const afloat = (w: Waters) => w.sunk.filter((s) => !s).length;

/** Whose turn follows a shot: a hit keeps the gun when `chain` is on. */
export function nextAfter(player: Player, result: ShotResult, chain: boolean): Player {
	return chain && result.kind !== 'miss' ? player : opponent(player);
}

export type Battle = {
	waters: Record<Player, Waters>;
	next: Player;
	status: GameStatus;
};

/**
 * Rebuild a battle from both fleets and the shots fired. `waters[p]` holds p's own fleet,
 * shot at by the rival. Null if any shot is out of turn, repeated, or follows the end.
 */
export function replay(
	size: number,
	lengths: number[],
	fleets: Record<Player, Placement[]>,
	shots: Array<[Player, number]>,
	first: Player,
	chain: boolean
): Battle | null {
	if (!validFleet(size, lengths, fleets[1]) || !validFleet(size, lengths, fleets[2])) return null;
	const waters = {
		1: createWaters(size, lengths, fleets[1]),
		2: createWaters(size, lengths, fleets[2])
	};
	let next = first;
	let status: GameStatus = { type: 'playing' };
	for (const [player, index] of shots) {
		if (status.type !== 'playing' || player !== next) return null;
		const result = fire(waters[opponent(player)], index);
		if (!result) return null;
		if (result.won) status = { type: 'won', winner: player };
		else next = nextAfter(player, result, chain);
	}
	return { waters, next, status };
}
