import type { Hole } from '../../engine/def';
import { moveMover } from '../../engine/physics';
import {
	award,
	bonus,
	cue,
	extraBall,
	grab,
	lightKickback,
	modeShot,
	multiball,
	pace,
	raiseMult,
	rand,
	say,
	startMode,
	type Game,
	type Lights,
	type ModeSpec,
	type Out,
	type TableRules
} from '../../engine/game';
import { comboShot, lit, loopPass, n, newLoop, type LoopState } from '../kit';
import { deepseaDef, KRAKEN, SPIN, UNDERTOW, WHIRLPOOL } from './def';
import type { Ball } from '../../engine/physics';

export const DIVES: ModeSpec[] = [
	{ id: 'galleon', name: 'Sunken Galleon', hint: 'Sink the trench scoop', seconds: 30, shots: ['trench'], need: 3, value: 20_000, finish: 60_000 },
	{ id: 'smokers', name: 'Black Smokers', hint: 'Shoot the vent ramp', seconds: 30, shots: ['vent'], need: 3, value: 20_000, finish: 60_000 },
	{ id: 'pearls', name: 'Pearl Diver', hint: 'Hit the pearl targets', seconds: 30, shots: ['pearl'], need: 4, value: 12_000, finish: 50_000 },
	{ id: 'riptide', name: 'Riptide', hint: 'Ride the whirlpool', seconds: 30, shots: ['whirl'], need: 3, value: 20_000, finish: 60_000 },
	{ id: 'tentacles', name: 'Tentacles', hint: 'Hit the kraken', seconds: 30, shots: ['kraken'], need: 4, value: 15_000, finish: 60_000 },
	{ id: 'leviathan', name: 'Leviathan', hint: 'Every lit shot once', seconds: 40, shots: ['trench', 'vent', 'orbitL', 'orbitR', 'kraken', 'grotto'], need: 6, value: 15_000, finish: 100_000, unique: true }
];

const JACKPOTS = ['trench', 'vent', 'orbitL', 'orbitR', 'kraken'];
/** Hits to wake the kraken; it sleeps lighter each time. */
const STIR = [3, 4, 5];
const GRABS = 2;
const UNDERTOW_SPINS = 30;
const UNDERTOW_HOLD = 1.4;
/** How far round the whirlpool a ball must be carried to count as a whirl. */
const WHIRL = Math.PI;
const WHIRLS_FOR_EXTRA = 6;
/** How far round each ball on the whirlpool has been carried since it got on. */
const carried = new WeakMap<Ball, { a: number; sum: number }>();

export type DeepseaState = {
	stir: number;
	wakes: number;
	awake: boolean;
	grabs: number;
	attack: boolean;
	added: boolean;
	jackpotLit: string[];
	jackpotValue: number;
	superLit: boolean;
	jackpots: number;
	toward: number;
	diveLit: boolean;
	played: string[];
	done: string[];
	deepLit: boolean;
	deep: boolean;
	pearls: boolean[];
	loops: number;
	extraLit: boolean;
	extrasGiven: number;
	spins: number;
	undertowLit: boolean;
	pulling: number;
	loop: LoopState;
};

type G = Game<DeepseaState>;

const fresh = (): DeepseaState => ({
	stir: 0,
	wakes: 0,
	awake: false,
	grabs: 0,
	attack: false,
	added: false,
	jackpotLit: [],
	jackpotValue: 75_000,
	superLit: false,
	jackpots: 0,
	toward: 0,
	diveLit: false,
	played: [],
	done: [],
	deepLit: false,
	deep: false,
	pearls: [false, false, false],
	loops: 0,
	extraLit: false,
	extrasGiven: 0,
	spins: 0,
	undertowLit: false,
	pulling: 0,
	loop: newLoop()
});

const nextDive = (s: DeepseaState) => DIVES.find((v) => !s.played.includes(v.id)) ?? null;
const stirNeed = (s: DeepseaState) => STIR[Math.min(STIR.length - 1, s.wakes)]!;
export const gripped = (g: G) => g.holds.some((h) => h.hole.id === 'kraken');

function jackpot(g: G, shot: string, x: number, y: number, out: Out) {
	const s = g.s;
	if (s.deep) {
		const value = 100_000 + s.jackpots * 10_000;
		s.jackpots += 1;
		award(g, value, x, y, out);
		say(out, 'Abyssal jackpot', n(value), true);
		cue(out, 'jackpot');
		return;
	}
	if (!s.attack || !s.jackpotLit.includes(shot)) return;
	s.jackpotLit = s.jackpotLit.filter((j) => j !== shot);
	s.jackpots += 1;
	award(g, s.jackpotValue, x, y, out);
	say(out, 'Jackpot', n(s.jackpotValue), true);
	cue(out, 'jackpot');
	s.jackpotValue += 25_000;
	if (!s.jackpotLit.length) {
		s.superLit = true;
		say(out, 'Super jackpot is lit', 'At the grotto', true);
		cue(out, 'lit');
	}
}

function shot(g: G, id: string, x: number, y: number, out: Out) {
	const s = g.s;
	modeShot(g, id, x, y, out);
	jackpot(g, id, x, y, out);
	comboShot(g, id, x, y, out);
	if (id === 'trench' || id === 'vent') {
		s.toward += 1;
		if (s.toward >= 3 && !g.mode && !s.attack && !s.diveLit && !s.deepLit && !s.deep && nextDive(s)) {
			s.toward = 0;
			s.diveLit = true;
			say(out, 'Dive ready', `${nextDive(s)!.name} at the grotto`);
			cue(out, 'lit');
		}
	}
}

/** Whirls and loops over the top both stir the sea toward an extra ball. */
function swirl(g: G, label: string, out: Out) {
	const s = g.s;
	s.loops += 1;
	if (s.loops % WHIRLS_FOR_EXTRA === 0 && s.extrasGiven < 2 && !s.extraLit) {
		s.extraLit = true;
		say(out, 'Maelstrom', 'Extra ball at the grotto', true);
		cue(out, 'lit');
	} else if (!g.mode && !s.attack) say(out, label, `${WHIRLS_FOR_EXTRA - (s.loops % WHIRLS_FOR_EXTRA)} more for an extra ball`);
}

/** The kraken wraps the ball up, then flings it back up the table. */
function seize(g: G, ball: G['world']['balls'][number], out: Out) {
	const m = g.world.movers.kraken!;
	const side = rand(g) < 0.5 ? -1 : 1;
	const hole: Hole = {
		id: 'kraken',
		x: m.x,
		y: m.y,
		r: KRAKEN.r,
		layer: 0,
		maxSpeed: 0,
		hold: 2,
		kind: 'saucer',
		eject: { x: m.x + side * 0.3, y: m.y - KRAKEN.r - 0.7, vx: side * 5, vy: -20, jitter: 5 }
	};
	grab(g, ball, hole, 2.2);
	cue(out, 'grab');
}

export const deepseaRules: TableRules<DeepseaState> = {
	id: 'deepsea',
	def: deepseaDef,
	balls: 3,
	bonusName: 'fathoms',
	bonusValue: 1_000,
	maxMult: 6,
	laneGroups: [{ id: 'sea', sensors: ['lane0', 'lane1', 'lane2'], change: true }],
	skill: { sensors: ['lane0', 'lane1', 'lane2'], points: 25_000, window: 5 },
	kickback: { sensor: 'outL', x: 1.1, vy: -52, points: 5_000 },
	init: fresh,
	restore(raw) {
		const s = { ...fresh(), ...(raw as Partial<DeepseaState>) };
		s.attack = false;
		s.deep = false;
		s.added = false;
		s.awake = false;
		s.stir = 0;
		s.jackpotLit = [];
		s.superLit = false;
		s.pulling = 0;
		s.loop = newLoop();
		return s;
	},
	move(g, h) {
		const s = g.s;
		const pool = g.world.discs.whirlpool;
		if (pool) pool.rate = (s.awake || s.attack ? -1 : 1) * (s.attack || s.deep ? SPIN.stirred : SPIN.calm);
		const m = g.world.movers.kraken;
		if (!m) return;
		if (gripped(g)) {
			moveMover(g.world, 'kraken', m.x, m.y, h);
			return;
		}
		const t = g.time * pace(g);
		const lunge = g.s.awake ? 1.25 : 1;
		moveMover(g.world, 'kraken', KRAKEN.x + Math.sin(t * 0.42 * lunge) * KRAKEN.reach, KRAKEN.y + Math.sin(t * 1.1) * 0.4, h);
	},
	tick(g, dt, out) {
		const s = g.s;
		const w = g.world;
		for (const b of w.balls) {
			const dx = b.x - WHIRLPOOL.x;
			const dy = b.y - WHIRLPOOL.y;
			if (b.state !== 'free' || b.layer !== 0 || dx * dx + dy * dy > WHIRLPOOL.r * WHIRLPOOL.r) {
				carried.delete(b);
				continue;
			}
			const a = Math.atan2(dy, dx);
			const c = carried.get(b);
			if (!c) {
				carried.set(b, { a, sum: 0 });
				continue;
			}
			let step = a - c.a;
			if (step > Math.PI) step -= Math.PI * 2;
			else if (step < -Math.PI) step += Math.PI * 2;
			c.a = a;
			c.sum += step;
			if (Math.abs(c.sum) < WHIRL) continue;
			c.sum = 0;
			award(g, 5_000 + s.loops * 500, b.x, b.y, out);
			bonus(g, 1);
			cue(out, 'whirl');
			swirl(g, 'Whirlpool', out);
			shot(g, 'whirl', b.x, b.y, out);
		}
		if (s.pulling > 0) {
			s.pulling -= dt;
			if (s.pulling > 0) return;
			w.magnets.undertow = false;
			for (const b of w.balls) {
				if (b.state !== 'free' || Math.hypot(b.x - UNDERTOW.x, b.y - UNDERTOW.y) > UNDERTOW.r) continue;
				b.vx = (rand(g) - 0.5) * 18;
				b.vy = -24;
			}
			cue(out, 'kickback');
			return;
		}
		if (!s.undertowLit) return;
		const near = w.balls.find((b) => b.state === 'free' && b.layer === 0 && Math.hypot(b.x - UNDERTOW.x, b.y - UNDERTOW.y) < UNDERTOW.r * 0.8);
		if (!near) return;
		s.undertowLit = false;
		s.pulling = UNDERTOW_HOLD;
		w.magnets.undertow = true;
		award(g, 25_000, near.x, near.y, out);
		say(out, 'Undertow', '25,000');
		cue(out, 'undertow');
		shot(g, 'undertow', near.x, near.y, out);
	},
	event(g, e, out) {
		const s = g.s;
		switch (e.type) {
			case 'bumper':
				award(g, 1_000 * (s.deep ? 3 : 1), e.ball.x, e.ball.y, out);
				bonus(g, 1);
				break;
			case 'sling':
				award(g, 110, e.ball.x, e.ball.y, out);
				break;
			case 'spin':
				award(g, 150 * e.spins, e.ball.x, e.ball.y, out);
				if (s.undertowLit || s.pulling > 0) break;
				s.spins += e.spins;
				if (s.spins >= UNDERTOW_SPINS) {
					s.spins = 0;
					s.undertowLit = true;
					say(out, 'Undertow is lit', 'Find the eye of the whirlpool');
					cue(out, 'lit');
				}
				break;
			case 'standup': {
				const i = Number(e.id.slice(5));
				award(g, 2_000, e.ball.x, e.ball.y, out);
				bonus(g, 1);
				shot(g, 'pearl', e.ball.x, e.ball.y, out);
				s.pearls[i] = true;
				if (!s.pearls.every(Boolean)) break;
				s.pearls = [false, false, false];
				award(g, 20_000, e.ball.x, e.ball.y, out);
				if (s.attack && !s.added) {
					s.added = true;
					say(out, 'Another arm', 'Add a ball', true);
					multiball(g, 1, 6, out);
				} else if (raiseMult(g, out)) say(out, 'String of pearls', `Bonus ×${g.mult}`);
				else say(out, 'String of pearls', '20,000');
				break;
			}
			case 'mover': {
				award(g, 5_000, e.ball.x, e.ball.y, out);
				bonus(g, 2);
				shot(g, 'kraken', e.ball.x, e.ball.y, out);
				if (s.attack || s.deep) break;
				if (s.awake) {
					s.awake = false;
					s.stir = 0;
					s.wakes += 1;
					s.grabs += 1;
					award(g, 25_000, e.ball.x, e.ball.y, out);
					seize(g, e.ball, out);
					if (s.grabs >= GRABS) {
						s.grabs = 0;
						s.attack = true;
						s.jackpotLit = JACKPOTS.slice();
						say(out, 'Kraken attack', 'Jackpots on the trench, vent, orbits and kraken', true);
						cue(out, 'multiball');
						multiball(g, 2, 12, out);
					} else say(out, 'The kraken has it', `${GRABS - s.grabs} more for Kraken Attack`, true);
					break;
				}
				s.stir += 1;
				if (s.stir >= stirNeed(s)) {
					s.awake = true;
					say(out, 'The kraken wakes', 'Hit it again', true);
					cue(out, 'lit');
				} else if (!g.mode) say(out, 'Something stirs', `${stirNeed(s) - s.stir} more`);
				break;
			}
			case 'ramp': {
				award(g, 10_000, e.ball.x, e.ball.y, out);
				bonus(g, 3);
				if (lightKickback(g, out)) say(out, 'Vent', 'Kickback lit');
				else if (!g.mode && !s.attack) say(out, 'The vent', '10,000');
				shot(g, e.id, e.ball.x, e.ball.y, out);
				break;
			}
			case 'enter': {
				if (e.id === 'inL' || e.id === 'inR') award(g, 500, e.ball.x, e.ball.y, out);
				else if (e.id === 'outL' || e.id === 'outR') award(g, 2_000, e.ball.x, e.ball.y, out);
				else if (e.id.startsWith('lane')) {
					award(g, 1_000, e.ball.x, e.ball.y, out);
					bonus(g, 1);
				} else if (e.id === 'orbitL' || e.id === 'orbitR') {
					const made = loopPass(s.loop, g, e.id);
					if (!made) break;
					const id = made === 'orbitL' ? 'orbitR' : 'orbitL';
					award(g, 8_000, e.ball.x, e.ball.y, out);
					bonus(g, 2);
					swirl(g, 'Over the top', out);
					shot(g, id, e.ball.x, e.ball.y, out);
				}
				break;
			}
		}
	},
	hold(g, hole, ball, out) {
		const s = g.s;
		if (hole.id === 'trench') {
			award(g, 10_000, ball.x, ball.y, out);
			bonus(g, 3);
			cue(out, 'trench');
			if (!g.mode && !s.attack) say(out, 'The trench', 'Down into the dark');
			shot(g, 'trench', ball.x, ball.y, out);
			return;
		}
		if (hole.id !== 'grotto') return;
		award(g, 3_000, ball.x, ball.y, out);
		if (g.mode?.lit.includes('grotto')) {
			modeShot(g, 'grotto', ball.x, ball.y, out);
			return;
		}
		if (s.deepLit) {
			s.deepLit = false;
			s.deep = true;
			say(out, 'The Deep', 'Every shot is a jackpot', true);
			cue(out, 'wizard');
			multiball(g, 3, 25, out);
			return 2.6;
		}
		if (s.deep) {
			jackpot(g, 'grotto', ball.x, ball.y, out);
			return;
		}
		if (s.attack && s.superLit) {
			s.superLit = false;
			const value = s.jackpotValue * 3;
			s.jackpots += 1;
			award(g, value, ball.x, ball.y, out);
			say(out, 'Super jackpot', n(value), true);
			cue(out, 'superJackpot');
			s.jackpotLit = JACKPOTS.slice();
			return 2;
		}
		if (s.diveLit && !g.mode && !s.attack) {
			s.diveLit = false;
			const next = nextDive(s);
			if (next) {
				s.played.push(next.id);
				startMode(g, next, out);
				return 2;
			}
		}
		if (s.extraLit) {
			s.extraLit = false;
			s.extrasGiven += 1;
			extraBall(g, out);
			return 1.8;
		}
		if (raiseMult(g, out)) say(out, 'The grotto', `Bonus ×${g.mult}`);
		else {
			award(g, 15_000, ball.x, ball.y, out);
			say(out, 'The grotto', '15,000');
		}
	},
	lanesDone(g, _group, out) {
		award(g, 10_000, 9.3, 4, out);
		if (lightKickback(g, out)) say(out, 'S·E·A', 'Kickback lit');
		else if (raiseMult(g, out)) say(out, 'S·E·A', `Bonus ×${g.mult}`);
		else say(out, 'S·E·A', '10,000');
	},
	modeOver(g, mode, done, out) {
		const s = g.s;
		if (done) s.done.push(mode.id);
		if (s.played.length >= DIVES.length && !s.deepLit && !s.deep) {
			s.deepLit = true;
			say(out, 'The Deep is lit', 'Shoot the grotto', true);
			cue(out, 'lit');
		}
	},
	multiballOver(g) {
		const s = g.s;
		if (s.deep) {
			s.deep = false;
			s.played = [];
			s.done = [];
		}
		s.attack = false;
		s.added = false;
		s.jackpotLit = [];
		s.superLit = false;
		s.jackpotValue = 75_000;
	},
	ballOver(g) {
		g.s.diveLit = false;
		g.s.pulling = 0;
	},
	status(g) {
		const s = g.s;
		const m = g.mode;
		if (s.deep) return 'The Deep: every shot is a jackpot';
		if (gripped(g)) return 'The kraken has your ball';
		if (m) return `${m.name}: ${m.hint} · ${Math.ceil(m.left)}s`;
		if (s.attack) return s.superLit ? 'Super jackpot at the grotto' : `Kraken Attack: ${s.jackpotLit.length} jackpots lit`;
		if (s.awake) return 'The kraken is awake: hit it to be grabbed';
		if (s.deepLit) return 'The Deep is lit at the grotto';
		if (s.diveLit) return `${nextDive(s)?.name} is ready at the grotto`;
		if (s.extraLit) return 'Extra ball is lit at the grotto';
		if (s.undertowLit) return 'Undertow is lit in the eye of the whirlpool';
		return `Wake the kraken (${stirNeed(s) - s.stir} hits) · ${3 - s.toward} trench or vent shots ready a dive`;
	},
	goals(g) {
		const s = g.s;
		return [
			{ label: 'Kraken', value: s.awake ? 'Awake' : `${s.stir}/${stirNeed(s)}`, hot: s.awake },
			{ label: 'Dives', value: `${s.played.length}/${DIVES.length}`, hot: s.diveLit || s.deepLit },
			{ label: 'Jackpots', value: `${s.jackpots}`, hot: s.attack || s.deep }
		];
	},
	lights(g, blink) {
		const s = g.s;
		const L: Lights = {};
		const fast = blink(6);
		const slow = blink(2.5);
		g.lanes.sea?.forEach((on, i) => (L[`lane${i}`] = on ? 1 : 0));
		s.pearls.forEach((on, i) => (L[`pearl${i}`] = on ? 1 : 0));
		for (let i = 2; i <= 6; i += 1) L[`mult${i}`] = g.mult >= i ? 1 : 0;
		for (let i = 0; i < 5; i += 1) L[`stir${i}`] = i < stirNeed(s) ? (s.awake ? (fast ? 1 : 0.3) : i < s.stir ? 1 : 0.15) : 0;
		for (let i = 0; i < GRABS; i += 1) L[`grab${i}`] = s.attack ? (fast ? 1 : 0.3) : i < s.grabs ? 1 : 0;
		L.kick = g.kickback ? 1 : 0;
		L.again = g.extra > 0 ? 1 : 0;
		L.extra = s.extraLit && slow ? 1 : 0;
		L.undertow = s.pulling > 0 ? (fast ? 1 : 0.4) : s.undertowLit ? (slow ? 1 : 0.2) : Math.min(1, s.spins / UNDERTOW_SPINS) * 0.5;
		L.deep = s.deep ? (fast ? 1 : 0.3) : s.deepLit && slow ? 1 : 0;
		DIVES.forEach((v, i) => {
			const running = g.mode?.id === v.id;
			const next = s.diveLit && nextDive(s)?.id === v.id;
			L[`dive${i}`] = running ? (fast ? 1 : 0.2) : next ? (slow ? 1 : 0) : s.done.includes(v.id) ? 1 : s.played.includes(v.id) ? 0.35 : 0;
		});
		const arrows: Record<string, string | null> = { trench: null, vent: null, orbitL: null, orbitR: null, kraken: null, grotto: null };
		if (s.deep) for (const k in arrows) arrows[k] = fast ? '#7affd4' : null;
		else {
			for (const k of g.mode?.lit ?? []) if (k in arrows) arrows[k] = slow ? '#5affc8' : null;
			for (const k of s.jackpotLit) arrows[k] = fast ? '#ff5a8a' : null;
			if (s.awake) arrows.kraken = fast ? '#ff5a8a' : null;
			if (s.superLit || s.diveLit || s.extraLit || s.deepLit) arrows.grotto = fast ? (s.superLit ? '#ff5a8a' : '#5affc8') : null;
		}
		for (const [k, color] of Object.entries(arrows)) L[`arrow:${k}`] = color ? lit(1, color) : 0;
		return L;
	}
};

export const deepseaHot = (g: G) => g.s.attack || g.s.deep;
