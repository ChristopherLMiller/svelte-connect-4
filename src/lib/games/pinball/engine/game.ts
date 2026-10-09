import { addBall, createWorld, laneBall, laneRest, nudge, startRide, STEP, stepWorld, type Ball, type PhysEvent, type World } from './physics';
import type { Hole, Side, TableDef } from './def';
import { nextRandom, type Difficulty, type TableId } from '../types';

const TALLY_S = 2.6;
/** A quick tap still shoots, as if the plunger were drawn this far. */
const TAP_POWER = 0.45;
const STILL_S = 6;
const COMBO_S = 3.5;
const NUDGE_WINDOW = 3;

export const LEVELS: Record<Difficulty, { save: number; gravity: number; tilt: number; pace: number; kickbackEveryBall: boolean }> = {
	kind: { save: 15, gravity: 34, tilt: 4, pace: 0.8, kickbackEveryBall: true },
	fair: { save: 8, gravity: 38, tilt: 3, pace: 1, kickbackEveryBall: false },
	wicked: { save: 3, gravity: 43, tilt: 2, pace: 1.2, kickbackEveryBall: false }
};

export type GameEvent =
	| PhysEvent
	| { type: 'score'; points: number; x: number; y: number }
	| { type: 'message'; text: string; sub?: string; big?: boolean }
	/** A named moment for the table's sounds and lights: 'jackpot', 'lock', 'modeStart'… */
	| { type: 'cue'; cue: string; n?: number }
	| { type: 'lane'; group: string; i: number; done: boolean }
	| { type: 'launch'; power: number }
	| { type: 'eject'; id: string }
	| { type: 'serve'; ball: number }
	| { type: 'ballOver'; bonus: number; count: number; mult: number; tilted: boolean }
	| { type: 'multiball'; on: boolean }
	| { type: 'over' };

export type Phase = 'serve' | 'play' | 'tally' | 'over';
export type Out = GameEvent[];
/** `ready` is when an aiming hole will first answer the flippers. */
type HoldState = { ball: Ball; until: number; hole: Hole; ready?: number };

export type ModeSpec = {
	id: string;
	name: string;
	/** Shown under the name when it starts, and in the HUD while it runs. */
	hint: string;
	seconds: number;
	shots: string[];
	need: number;
	value: number;
	finish: number;
	/** Each lit shot goes out once it's made. */
	unique?: boolean;
};
export type Mode = ModeSpec & { left: number; hits: number; lit: string[] };

export type Light = number | { level: number; color: string };
export type Lights = Record<string, Light>;
export type Blink = (rate: number, phase?: number) => boolean;
export type Goal = { label: string; value: string; hot?: boolean };

export type Progress<S> = {
	score: number;
	ball: number;
	extra: number;
	mult: number;
	bonus: number;
	lanes: Record<string, boolean[]>;
	kickback: boolean;
	s: S;
};

export type TableRules<S> = {
	id: TableId;
	def: TableDef;
	balls: number;
	bonusName: string;
	bonusValue: number;
	maxMult: number;
	laneGroups?: Array<{ id: string; sensors: string[]; change: boolean }>;
	skill?: { sensors: string[]; points: number; window: number };
	kickback?: { sensor: string; x: number; vy: number; points: number };
	/** Fresh state for a new game. */
	init: (g: Game<S>) => S;
	/** Tidy a saved state (modes and multiballs don't survive a save). */
	restore: (raw: unknown, g: Game<S>) => S;
	serve?: (g: Game<S>, out: Out) => void;
	event: (g: Game<S>, e: PhysEvent, out: Out) => void;
	/** Seconds to keep a ball in a hole, if not the hole's own. */
	hold?: (g: Game<S>, hole: Hole, ball: Ball, out: Out) => number | void;
	/** Every physics step: move the toys. */
	move?: (g: Game<S>, h: number) => void;
	/** Every frame while the ball is in play. */
	tick?: (g: Game<S>, dt: number, out: Out) => void;
	lanesDone?: (g: Game<S>, group: string, out: Out) => void;
	modeOver?: (g: Game<S>, mode: Mode, done: boolean, out: Out) => void;
	multiballOver?: (g: Game<S>, out: Out) => void;
	ballOver?: (g: Game<S>, out: Out) => void;
	status: (g: Game<S>) => string;
	goals: (g: Game<S>) => Goal[];
	lights: (g: Game<S>, blink: Blink) => Lights;
};

export type Game<S = unknown> = {
	rules: TableRules<S>;
	difficulty: Difficulty;
	world: World;
	phase: Phase;
	time: number;
	rng: { seed: number };
	score: number;
	ball: number;
	extra: number;
	mult: number;
	bonus: number;
	lanes: Record<string, boolean[]>;
	kickback: boolean;
	multiball: boolean;
	mode: Mode | null;
	saveUntil: number;
	skill: { sensor: string | null; until: number };
	combo: { shot: string; at: number; n: number };
	tilt: { warnings: number; recent: number[]; tilted: boolean };
	holds: HoldState[];
	/** Balls still to launch, and when the next goes. */
	queue: number;
	queueAt: number;
	tallyUntil: number;
	lastBonus: number;
	stillFor: number;
	pulling: boolean;
	drains: number;
	acc: number;
	s: S;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyGame = Game<any>;

export const rand = (g: AnyGame) => nextRandom(g.rng);
export const pick = <T>(g: AnyGame, list: T[]) => list[Math.floor(rand(g) * list.length)]!;
export const pace = (g: AnyGame) => LEVELS[g.difficulty].pace;

export function createGame<S>(rules: TableRules<S>, difficulty: Difficulty, seed: number, progress?: Partial<Progress<unknown>>): Game<S> {
	const level = LEVELS[difficulty];
	const g = {
		rules,
		difficulty,
		world: createWorld(rules.def, level.gravity),
		phase: 'serve',
		time: 0,
		rng: { seed },
		score: 0,
		ball: 1,
		extra: 0,
		mult: 1,
		bonus: 0,
		lanes: Object.fromEntries((rules.laneGroups ?? []).map((l) => [l.id, l.sensors.map(() => false)])),
		kickback: !!rules.kickback,
		multiball: false,
		mode: null,
		saveUntil: 0,
		skill: { sensor: null, until: 0 },
		combo: { shot: '', at: -99, n: 0 },
		tilt: { warnings: 0, recent: [], tilted: false },
		holds: [],
		queue: 0,
		queueAt: 0,
		tallyUntil: 0,
		lastBonus: 0,
		stillFor: 0,
		pulling: false,
		drains: 0,
		acc: 0,
		s: undefined as S
	} as Game<S>;
	g.s = rules.init(g);
	if (progress) {
		g.score = progress.score ?? 0;
		g.ball = Math.max(1, Math.min(rules.balls, progress.ball ?? 1));
		g.extra = Math.min(3, progress.extra ?? 0);
		g.mult = Math.max(1, Math.min(rules.maxMult, progress.mult ?? 1));
		g.bonus = Math.max(0, progress.bonus ?? 0);
		g.kickback = !!rules.kickback && progress.kickback !== false;
		for (const id in g.lanes) {
			const saved = progress.lanes?.[id];
			if (saved?.length === g.lanes[id]!.length) g.lanes[id] = saved.map(Boolean);
		}
		g.s = rules.restore(progress.s, g);
	}
	serve(g, []);
	return g;
}

export function progressOf<S>(g: Game<S>): Progress<S> {
	return {
		score: g.score,
		ball: g.ball,
		extra: g.extra,
		mult: g.mult,
		bonus: g.bonus,
		lanes: Object.fromEntries(Object.entries(g.lanes).map(([k, v]) => [k, v.slice()])),
		kickback: g.kickback,
		s: structuredClone(g.s)
	};
}

/* ---------- The kit the tables build with ---------- */

export function award(g: AnyGame, points: number, x: number, y: number, out: Out) {
	if (g.tilt.tilted || !points) return;
	g.score += points;
	out.push({ type: 'score', points, x, y });
}

export function say(out: Out, text: string, sub?: string, big = false) {
	out.push({ type: 'message', text, sub, big });
}

export function cue(out: Out, name: string, n?: number) {
	out.push({ type: 'cue', cue: name, n });
}

export function bonus(g: AnyGame, n: number) {
	if (!g.tilt.tilted) g.bonus += n;
}

export function raiseMult(g: AnyGame, out: Out) {
	if (g.mult >= g.rules.maxMult) return false;
	g.mult += 1;
	cue(out, 'mult', g.mult);
	return true;
}

export function extraBall(g: AnyGame, out: Out, sub = 'Shoot again after this ball') {
	g.extra += 1;
	say(out, 'Extra ball', sub, true);
	cue(out, 'extraBall');
}

export function lightKickback(g: AnyGame, out: Out) {
	if (!g.rules.kickback || g.kickback) return false;
	g.kickback = true;
	cue(out, 'kickbackLit');
	return true;
}

/** Balls on the table, held, riding, or waiting to launch. */
export function liveBalls(g: AnyGame) {
	return g.world.balls.length + g.queue;
}

/** Add balls for a multiball, launched one by one from the plunger, with a ball save. */
export function multiball(g: AnyGame, add: number, save: number, out: Out) {
	const was = g.multiball;
	g.multiball = true;
	g.queue += add;
	g.queueAt = g.time + 1.4;
	g.saveUntil = Math.max(g.saveUntil, g.time + save);
	if (!was) out.push({ type: 'multiball', on: true });
}

export function ballSave(g: AnyGame, seconds: number) {
	g.saveUntil = Math.max(g.saveUntil, g.time) + seconds;
}

export const saveLeft = (g: AnyGame) => Math.max(0, g.saveUntil - g.time);

/** Counts shots made in quick succession; returns how many in a row (1 for a lone shot). */
export function combo(g: AnyGame, shot: string) {
	const chained = g.time - g.combo.at < COMBO_S && g.combo.shot !== shot;
	g.combo = { shot, at: g.time, n: chained ? g.combo.n + 1 : 1 };
	return g.combo.n;
}

export function startMode(g: AnyGame, spec: ModeSpec, out: Out) {
	g.mode = { ...spec, left: spec.seconds, hits: 0, lit: spec.shots.slice() };
	say(out, spec.name, spec.hint, true);
	cue(out, 'modeStart');
}

/** Score a shot against the running mode; true when it counted. */
export function modeShot(g: AnyGame, shot: string, x: number, y: number, out: Out) {
	const m = g.mode;
	if (!m || !m.lit.includes(shot)) return false;
	m.hits += 1;
	if (m.unique) m.lit = m.lit.filter((s) => s !== shot);
	const points = m.value * m.hits;
	award(g, points, x, y, out);
	cue(out, 'modeHit', m.hits);
	if (m.hits >= m.need) {
		g.mode = null;
		award(g, m.finish, x, y, out);
		say(out, `${m.name} complete`, m.finish.toLocaleString(), true);
		cue(out, 'modeDone');
		g.rules.modeOver?.(g, m, true, out);
	} else say(out, m.name, `${points.toLocaleString()} · ${m.need - m.hits} to go`);
	return true;
}

export function endMode(g: AnyGame, out: Out) {
	const m = g.mode;
	if (!m) return;
	g.mode = null;
	g.rules.modeOver?.(g, m, false, out);
}

/* ---------- Serving, shooting, flipping ---------- */

function serve(g: AnyGame, out: Out) {
	const rest = laneRest(g.world);
	addBall(g.world, rest.x, rest.y);
	g.world.plunger = 0;
	g.phase = 'serve';
	const skill = g.rules.skill;
	g.skill = { sensor: skill ? pick(g, skill.sensors) : null, until: 0 };
	g.stillFor = 0;
	g.tilt = { warnings: 0, recent: [], tilted: false };
	if (LEVELS[g.difficulty].kickbackEveryBall && g.rules.kickback) g.kickback = true;
	g.rules.serve?.(g, out);
	out.push({ type: 'serve', ball: g.ball });
}

export const launchSpeed = (power: number) => 26 + power * 38;

function autoLaunch(g: AnyGame, out: Out) {
	const rest = laneRest(g.world);
	const b = addBall(g.world, rest.x, rest.y);
	const power = 0.78 + rand(g) * 0.12;
	b.vy = -launchSpeed(power);
	out.push({ type: 'launch', power });
}

export function pull(g: AnyGame, on: boolean, out: Out) {
	if (on) {
		g.pulling = true;
		return;
	}
	if (!g.pulling) return;
	g.pulling = false;
	const power = Math.max(TAP_POWER, g.world.plunger);
	const b = laneBall(g.world);
	if (b) {
		b.vy = -launchSpeed(power);
		if (g.phase === 'serve') {
			g.phase = 'play';
			g.saveUntil = g.time + LEVELS[g.difficulty].save;
			if (g.skill.sensor) g.skill.until = g.time + (g.rules.skill?.window ?? 5);
		}
		out.push({ type: 'launch', power });
	}
	g.world.plunger = 0;
}

export function flip(g: AnyGame, side: Side, on: boolean) {
	const live = (g.phase === 'play' || g.phase === 'serve') && !g.tilt.tilted;
	for (const f of g.world.flippers) {
		if (f.side !== side) continue;
		if (on && !f.pressed && g.phase === 'play' && f.id === (side === 'left' ? 'L' : 'R')) {
			for (const group of g.rules.laneGroups ?? []) {
				if (!group.change) continue;
				const l = g.lanes[group.id]!;
				g.lanes[group.id] = side === 'left' ? [...l.slice(1), l[0]!] : [l[l.length - 1]!, ...l.slice(0, -1)];
			}
		}
		f.pressed = on && live;
	}
	if (on && g.phase === 'play' && !g.tilt.tilted) {
		for (const hold of g.holds) if (hold.ready != null && g.time >= hold.ready) hold.until = g.time;
	}
}

/** The aiming hole holding a ball, if any, and where it points. */
export function aiming(g: AnyGame) {
	const hold = g.holds.find((x) => x.ready != null);
	return hold ? { id: hold.hole.id, angle: g.world.aims[hold.hole.id] ?? 0, armed: g.time >= hold.ready! } : null;
}

/** Bump the cabinet. Too many in a few seconds earns a warning; too many warnings, a tilt. */
export function shake(g: AnyGame, dir: -1 | 0 | 1, out: Out) {
	if (g.phase !== 'play' || g.tilt.tilted) return;
	nudge(g.world, dir * 3.2 + (rand(g) - 0.5) * 1.2, -2.6);
	cue(out, 'nudge');
	g.tilt.recent = g.tilt.recent.filter((t) => g.time - t < NUDGE_WINDOW);
	g.tilt.recent.push(g.time);
	if (g.tilt.recent.length < 3) return;
	g.tilt.recent = [];
	g.tilt.warnings += 1;
	if (g.tilt.warnings > LEVELS[g.difficulty].tilt) {
		g.tilt.tilted = true;
		g.saveUntil = 0;
		g.queue = 0;
		endMode(g, out);
		for (const f of g.world.flippers) f.pressed = false;
		for (const id in g.world.magnets) g.world.magnets[id] = false;
		say(out, 'Tilt', 'The flippers go dead', true);
		cue(out, 'tilt');
	} else {
		const left = LEVELS[g.difficulty].tilt - g.tilt.warnings + 1;
		say(out, 'Danger', left === 1 ? 'One more and it tilts' : `Careful · ${left} warnings left`);
		cue(out, 'tiltWarn', g.tilt.warnings);
	}
}

/* ---------- The loop ---------- */

function onEvent(g: AnyGame, e: PhysEvent, out: Out) {
	const rules = g.rules;
	if (e.type === 'drain' || e.type === 'lost') {
		out.push(e);
		drained(g, e.ball, out);
		return;
	}
	if (e.type === 'hole') {
		const hole = rules.def.holes.find((h) => h.id === e.id)!;
		const custom = g.tilt.tilted ? 0.6 : rules.hold?.(g, hole, e.ball, out);
		const seconds = typeof custom === 'number' ? custom : hole.hold;
		if (hole.aim && !g.tilt.tilted) g.holds.push({ ball: e.ball, hole, until: g.time + Math.max(seconds, hole.aim.wait), ready: g.time + Math.min(seconds, 0.5) });
		else g.holds.push({ ball: e.ball, hole, until: g.time + seconds });
	}
	if (g.tilt.tilted) {
		out.push(e);
		return;
	}
	const scoring =
		e.type === 'bumper' || e.type === 'sling' || e.type === 'drop' || e.type === 'standup' || e.type === 'mover' || e.type === 'captive' || e.type === 'hole' || e.type === 'ramp' || e.type === 'spin' || e.type === 'enter';
	if (e.type === 'enter') {
		const skill = rules.skill;
		if (skill && g.skill.sensor === e.id && g.time < g.skill.until) {
			award(g, skill.points * g.ball, e.ball.x, e.ball.y, out);
			say(out, 'Skill shot', (skill.points * g.ball).toLocaleString(), true);
			cue(out, 'skill');
		}
		for (const group of rules.laneGroups ?? []) {
			const i = group.sensors.indexOf(e.id);
			if (i < 0) continue;
			const lit = g.lanes[group.id]!;
			lit[i] = true;
			const done = lit.every(Boolean);
			out.push({ type: 'lane', group: group.id, i, done });
			if (done) {
				g.lanes[group.id] = lit.map(() => false);
				rules.lanesDone?.(g, group.id, out);
			}
		}
		const kick = rules.kickback;
		if (kick && e.id === kick.sensor && g.kickback && e.ball.vy > 0) {
			g.kickback = false;
			e.ball.x = kick.x;
			e.ball.vx = 0;
			e.ball.vy = kick.vy;
			award(g, kick.points, e.ball.x, e.ball.y, out);
			say(out, 'Kickback');
			cue(out, 'kickback');
		}
	}
	if (scoring && !(e.type === 'enter' && e.id === g.skill.sensor)) g.skill.sensor = null;
	rules.event(g, e, out);
	out.push(e);
}

/** Hold a ball somewhere that isn't a hole (a claw, a tentacle); it is let go by the hole's eject. */
export function grab(g: AnyGame, ball: Ball, hole: Hole, seconds: number) {
	if (ball.state !== 'free') return;
	ball.state = 'held';
	ball.x = hole.x;
	ball.y = hole.y;
	ball.vx = 0;
	ball.vy = 0;
	g.holds.push({ ball, hole, until: g.time + seconds });
}

/** Feed a switch as if a ball had hit it: for checks that drive the rules without playing. */
export function inject(g: AnyGame, e: PhysEvent): GameEvent[] {
	const out: Out = [];
	onEvent(g, e, out);
	return out;
}

function drained(g: AnyGame, b: Ball, out: Out) {
	g.drains += 1;
	const left = g.world.balls.filter((x) => x !== b && x.state !== 'gone').length + g.queue;
	if (g.phase !== 'play') return;
	if (g.time < g.saveUntil && !g.tilt.tilted) {
		g.queue += 1;
		g.queueAt = Math.min(g.queueAt > g.time ? g.queueAt : g.time + 0.8, g.time + 0.8);
		say(out, 'Ball saved');
		cue(out, 'saved');
		return;
	}
	if (g.multiball && left <= 1) {
		g.multiball = false;
		out.push({ type: 'multiball', on: false });
		g.rules.multiballOver?.(g, out);
	}
	if (left === 0) endBall(g, out);
}

function endBall(g: AnyGame, out: Out) {
	g.phase = 'tally';
	g.multiball = false;
	endMode(g, out);
	for (const id in g.world.magnets) g.world.magnets[id] = false;
	g.rules.ballOver?.(g, out);
	const tilted = g.tilt.tilted;
	const value = tilted ? 0 : g.bonus * g.rules.bonusValue * g.mult;
	g.lastBonus = value;
	g.score += value;
	out.push({ type: 'ballOver', bonus: value, count: g.bonus, mult: g.mult, tilted });
	g.tallyUntil = g.time + TALLY_S;
}

function nextBall(g: AnyGame, out: Out) {
	g.bonus = 0;
	g.mult = 1;
	if (g.extra > 0) {
		g.extra -= 1;
		say(out, 'Shoot again', undefined, true);
	} else if (g.ball >= g.rules.balls) {
		g.phase = 'over';
		out.push({ type: 'over' });
		return;
	} else g.ball += 1;
	serve(g, out);
}

function release(g: AnyGame, hold: HoldState, out: Out) {
	const b = hold.ball;
	const { hole } = hold;
	const ej = hole.eject;
	b.state = 'free';
	b.hidden = false;
	b.inside.clear();
	b.inside.add(hole.id);
	b.sides.clear();
	b.x = ej.x ?? hole.x;
	b.y = ej.y ?? hole.y;
	b.layer = ej.layer ?? hole.layer;
	b.vx = ej.vx + (rand(g) - 0.5) * ej.jitter;
	b.vy = ej.vy + (rand(g) - 0.5) * ej.jitter * 0.4;
	if (hole.aim && hold.ready != null) {
		const a = g.world.aims[hole.id] ?? hole.aim.from;
		b.vx = Math.cos(a) * hole.aim.speed;
		b.vy = Math.sin(a) * hole.aim.speed;
	}
	if (ej.ride) startRide(g.world, b, ej.ride);
	out.push({ type: 'eject', id: hole.id });
}

/** Unstick a ball that has come to rest somewhere it shouldn't. */
function nudgeStill(g: AnyGame, dt: number) {
	const lane = g.world.def.lane;
	const free = g.world.balls.filter((b) => b.state === 'free');
	const resting = free.length && free.every((b) => Math.hypot(b.vx, b.vy) < 0.6 && b.x < lane.x - 0.6 && (b.y < 30 || b.layer === 1));
	g.stillFor = resting ? g.stillFor + dt : 0;
	if (g.stillFor > STILL_S) {
		g.stillFor = 0;
		for (const b of free) {
			b.vx += (rand(g) - 0.5) * 12;
			b.vy -= 8;
		}
	}
}

/** Run the table for dt seconds of real time; returns what happened. */
export function advance(g: AnyGame, dt: number): GameEvent[] {
	const out: Out = [];
	if (g.phase === 'over') return out;
	if (g.pulling) g.world.plunger = Math.min(1, g.world.plunger + dt / 0.9);
	g.acc += Math.min(dt, 0.05);
	const emit = (e: PhysEvent) => onEvent(g, e, out);
	const move = g.rules.move;
	while (g.acc >= STEP) {
		g.acc -= STEP;
		g.time += STEP;
		move?.(g, STEP);
		stepWorld(g.world, emit);
		for (let i = g.holds.length - 1; i >= 0; i -= 1) {
			const hold = g.holds[i]!;
			if (g.time >= hold.until) {
				g.holds.splice(i, 1);
				release(g, hold, out);
			}
		}
		if (g.queue > 0 && g.time >= g.queueAt && !laneBall(g.world)) {
			g.queue -= 1;
			g.queueAt = g.time + 1.1;
			autoLaunch(g, out);
		}
	}
	if (g.phase === 'play') {
		nudgeStill(g, dt);
		if (!g.tilt.tilted) {
			const inPlay = g.world.balls.some((b) => b.state !== 'held' && b.x < g.world.def.lane.wall);
			if (g.mode && inPlay) {
				const before = Math.ceil(g.mode.left);
				g.mode.left -= dt;
				const now = Math.ceil(g.mode.left);
				if (now < before && now > 0 && now <= 5) cue(out, 'hurry', now);
				if (g.mode.left <= 0) {
					const m = g.mode;
					say(out, `${m.name} over`, m.hits ? `${m.hits} of ${m.need}` : undefined);
					cue(out, 'modeOver');
					endMode(g, out);
				}
			}
			g.rules.tick?.(g, dt, out);
		}
	}
	if (g.phase === 'tally' && g.time >= g.tallyUntil) nextBall(g, out);
	return out;
}
