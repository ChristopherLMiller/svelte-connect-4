import { raiseBank } from '../engine/physics';
import { award, combo, cue, say, type AnyGame, type Light, type Out } from '../engine/game';

export const lit = (level: number, color: string): Light => ({ level, color });

export const bankDown = (g: AnyGame, id: string) => g.world.drops[id]?.every((up) => !up) ?? false;
export const standing = (g: AnyGame, id: string) => g.world.drops[id]?.filter(Boolean).length ?? 0;

export function resetBank(g: AnyGame, id: string) {
	raiseBank(g.world, id);
}

/** Score a combo for a major shot; 2+ in a row pays an escalating bonus. */
export function comboShot(g: AnyGame, shot: string, x: number, y: number, out: Out, base = 10_000) {
	const n = combo(g, shot);
	if (n < 2) return n;
	const points = base * (n - 1);
	award(g, points, x, y, out);
	say(out, n === 2 ? 'Combo' : `${n}-way combo`, points.toLocaleString());
	cue(out, 'combo', n);
	return n;
}

export type LoopState = { last: string; at: number };
export const newLoop = (): LoopState => ({ last: '', at: -9 });

/** Two sensors in a row within a window: an orbit made all the way round. Returns the sensor it ended on, or null. */
export function loopPass(state: LoopState, g: AnyGame, id: string, window = 2.4) {
	const made = state.last !== '' && state.last !== id && g.time - state.at < window;
	state.last = made ? '' : id;
	state.at = g.time;
	return made ? id : null;
}

export const n = (points: number) => points.toLocaleString();

export function plural(count: number, one: string, many = `${one}s`) {
	return `${count} ${count === 1 ? one : many}`;
}
