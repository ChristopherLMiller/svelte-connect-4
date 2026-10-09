import { moveMover } from '../../engine/physics';
import {
	award,
	bonus,
	cue,
	extraBall,
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
	type Out,
	type ModeSpec,
	type TableRules
} from '../../engine/game';
import { bankDown, comboShot, standing, lit, loopPass, n, newLoop, resetBank, type LoopState } from '../kit';
import { carnivalDef, PHANTOM } from './def';

export const ATTRACTIONS: ModeSpec[] = [
	{ id: 'train', name: 'Ghost Train', hint: 'Ride the Ghost Train ramp', seconds: 30, shots: ['train'], need: 3, value: 20_000, finish: 60_000 },
	{ id: 'mirrors', name: 'Hall of Mirrors', hint: 'Shoot the orbits', seconds: 30, shots: ['orbitL', 'orbitR'], need: 3, value: 20_000, finish: 60_000 },
	{ id: 'hunt', name: 'Phantom Hunt', hint: 'Hit the phantom', seconds: 30, shots: ['phantom'], need: 4, value: 15_000, finish: 60_000 },
	{ id: 'strength', name: 'Test Your Strength', hint: 'Knock down F·A·T·E', seconds: 30, shots: ['fate'], need: 4, value: 12_000, finish: 50_000 },
	{ id: 'wheel', name: 'Big Wheel', hint: 'Ride the Big Wheel ramp', seconds: 30, shots: ['wheel'], need: 3, value: 20_000, finish: 60_000 },
	{
		id: 'bigtop',
		name: 'Big Top',
		hint: 'Every lit shot once',
		seconds: 40,
		shots: ['train', 'wheel', 'orbitL', 'orbitR', 'phantom', 'zelda'],
		need: 6,
		value: 15_000,
		finish: 100_000,
		unique: true
	}
];

const JACKPOT_SHOTS = ['train', 'wheel', 'orbitL', 'orbitR'];

/** The Big Wheel's eight prizes, clockwise from the top of the wheel. */
export const WHEEL_PRIZES = [
	{ id: 'points', label: '25K', color: '#ffc24a' },
	{ id: 'lock', label: 'LOCK', color: '#c48cff' },
	{ id: 'kick', label: 'KICK', color: '#7fe8ff' },
	{ id: 'mult', label: 'BONUS', color: '#ff4b5c' },
	{ id: 'fate', label: 'FATE', color: '#ff8a5a' },
	{ id: 'big', label: '100K', color: '#7dff9a' },
	{ id: 'extra', label: 'EB', color: '#fff3d6' },
	{ id: 'souls', label: 'SOULS', color: '#ff5ad1' }
] as const;
export const WHEEL_SPIN_S = 2.8;
const FORTUNES = ['A tall, dark stranger', 'Great riches await', 'Beware the phantom', 'The wheel turns', 'You will return', 'Midnight draws near'];

export type CarnivalState = {
	locks: number;
	lockLit: boolean;
	/** Ramps made towards lighting the next attraction. */
	toward: number;
	attractionLit: boolean;
	played: string[];
	done: string[];
	trainRides: number;
	/** When the last Ghost Train ride came round, for the tunnel's show. */
	trainAt: number;
	wheelRides: number;
	extraLit: boolean;
	extrasGiven: number;
	phantomHits: number;
	midnight: boolean;
	/** The one add-a-ball each multiball allows. */
	added: boolean;
	jackpotLit: string[];
	jackpotValue: number;
	superLit: boolean;
	jackpots: number;
	wizardLit: boolean;
	wizard: boolean;
	loop: LoopState;
	/** The Big Wheel: where it last stopped, and the spin under way. */
	wheelRest: number;
	spin: { at: number; prize: number; from: number; to: number } | null;
	wheelLast: number;
};

const fresh = (): CarnivalState => ({
	locks: 0,
	lockLit: false,
	toward: 0,
	attractionLit: false,
	played: [],
	done: [],
	trainRides: 0,
	trainAt: -99,
	wheelRides: 0,
	extraLit: false,
	extrasGiven: 0,
	phantomHits: 0,
	midnight: false,
	added: false,
	jackpotLit: [],
	jackpotValue: 75_000,
	superLit: false,
	jackpots: 0,
	wizardLit: false,
	wizard: false,
	loop: newLoop(),
	wheelRest: 0,
	spin: null,
	wheelLast: -1
});

const TAU = Math.PI * 2;

/** Where the wheel points at a moment: easing out of a spin, or resting. */
export function wheelAngle(s: CarnivalState, time: number) {
	if (!s.spin) return s.wheelRest;
	const p = Math.min(1, (time - s.spin.at) / WHEEL_SPIN_S);
	return s.spin.from + (s.spin.to - s.spin.from) * (1 - Math.pow(1 - p, 3));
}

function spinWheel(g: G, out: Out) {
	const s = g.s;
	if (s.spin) return;
	const open = WHEEL_PRIZES.map((p, i) => ({ i, id: p.id })).filter(({ id }) => {
		if (id === 'lock') return !s.lockLit && !s.midnight && !s.wizard;
		if (id === 'kick') return !g.kickback;
		if (id === 'mult') return g.mult < g.rules.maxMult;
		if (id === 'extra') return !s.extraLit && s.extrasGiven < 2 && rand(g) < 0.25;
		return true;
	});
	const prize = open[Math.floor(rand(g) * open.length)]!.i;
	const from = s.wheelRest;
	const centre = ((prize + 0.5) / WHEEL_PRIZES.length) * TAU;
	const land = (((-Math.PI / 2 - centre - from) % TAU) + TAU) % TAU;
	s.spin = { at: g.time, prize, from, to: from + TAU * 3 + land };
	say(out, 'The Big Wheel spins', 'Round and round she goes');
	cue(out, 'wheelSpin');
}

function payWheel(g: G, out: Out) {
	const s = g.s;
	const spin = s.spin;
	if (!spin) return;
	s.spin = null;
	s.wheelRest = spin.to % TAU;
	s.wheelLast = spin.prize;
	const prize = WHEEL_PRIZES[spin.prize]!;
	const x = 9.3;
	const y = 24.4;
	cue(out, 'wheelPrize', spin.prize);
	switch (prize.id) {
		case 'lock':
			s.lockLit = true;
			say(out, 'Big Wheel', `Lock ${s.locks + 1} lit at Madame Zelda`, true);
			return;
		case 'kick':
			lightKickback(g, out);
			say(out, 'Big Wheel', 'Kickback lit', true);
			return;
		case 'mult':
			raiseMult(g, out);
			say(out, 'Big Wheel', `Bonus ×${g.mult}`, true);
			return;
		case 'fate': {
			const up = g.world.drops.fate!;
			const i = up.indexOf(true);
			if (i >= 0) {
				up[i] = false;
				award(g, 3_000, x, y, out);
			}
			say(out, 'Big Wheel', i >= 0 ? `${'FATE'[i]} spotted` : 'F·A·T·E');
			if (bankDown(g, 'fate')) {
				resetBank(g, 'fate');
				if (!s.lockLit && !s.midnight && !s.wizard) s.lockLit = true;
			}
			return;
		}
		case 'big':
			award(g, 100_000, x, y, out);
			say(out, 'Big Wheel', '100,000', true);
			return;
		case 'extra':
			s.extraLit = true;
			say(out, 'Big Wheel', 'Extra ball lit at Madame Zelda', true);
			cue(out, 'lit');
			return;
		case 'souls':
			bonus(g, 10);
			award(g, 10_000, x, y, out);
			say(out, 'Big Wheel', '10 souls', true);
			return;
		default:
			award(g, 25_000, x, y, out);
			say(out, 'Big Wheel', '25,000', true);
	}
}

type G = Game<CarnivalState>;

const nextAttraction = (s: CarnivalState) => ATTRACTIONS.find((a) => !s.played.includes(a.id)) ?? null;

function lightAttraction(g: G, out: Out) {
	const s = g.s;
	if (s.attractionLit || s.wizardLit || s.wizard || !nextAttraction(s)) return;
	s.attractionLit = true;
	say(out, 'Attraction lit', `${nextAttraction(s)!.name} at Madame Zelda`);
	cue(out, 'lit');
}

function startMidnight(g: G, out: Out) {
	const s = g.s;
	s.midnight = true;
	s.locks = 0;
	s.lockLit = false;
	s.jackpotLit = JACKPOT_SHOTS.slice();
	s.superLit = false;
	say(out, 'Midnight multiball', 'Jackpots on every flashing shot', true);
	cue(out, 'multiball');
	multiball(g, 2, 12, out);
}

function jackpot(g: G, shot: string, x: number, y: number, out: Out) {
	const s = g.s;
	if (s.wizard) {
		const value = 100_000 + s.jackpots * 10_000;
		s.jackpots += 1;
		award(g, value, x, y, out);
		say(out, 'Witching jackpot', n(value), true);
		cue(out, 'jackpot');
		return true;
	}
	if (!s.midnight || !s.jackpotLit.includes(shot)) return false;
	s.jackpotLit = s.jackpotLit.filter((j) => j !== shot);
	s.jackpots += 1;
	award(g, s.jackpotValue, x, y, out);
	say(out, 'Jackpot', n(s.jackpotValue), true);
	cue(out, 'jackpot');
	s.jackpotValue += 25_000;
	if (!s.jackpotLit.length) {
		s.superLit = true;
		say(out, 'Super jackpot lit', 'Madame Zelda', true);
		cue(out, 'lit');
	}
	return true;
}

/** A major shot: ramps, orbits, the phantom, Zelda. */
function shot(g: G, id: string, x: number, y: number, out: Out) {
	const s = g.s;
	modeShot(g, id, x, y, out);
	jackpot(g, id, x, y, out);
	comboShot(g, id, x, y, out);
	if (id === 'train' || id === 'wheel') {
		s.toward += 1;
		if (s.toward >= 3 && !g.mode && !s.midnight) {
			s.toward = 0;
			lightAttraction(g, out);
		}
	}
}

export const carnivalRules: TableRules<CarnivalState> = {
	id: 'carnival',
	def: carnivalDef,
	balls: 3,
	bonusName: 'souls',
	bonusValue: 1_000,
	maxMult: 6,
	laneGroups: [{ id: 'boo', sensors: ['lane0', 'lane1', 'lane2'], change: true }],
	skill: { sensors: ['lane0', 'lane1', 'lane2'], points: 25_000, window: 5 },
	kickback: { sensor: 'outL', x: 1.1, vy: -52, points: 5_000 },
	init: fresh,
	restore(raw) {
		const s = { ...fresh(), ...(raw as Partial<CarnivalState>) };
		s.midnight = false;
		s.added = false;
		s.wizard = false;
		s.jackpotLit = [];
		s.superLit = false;
		s.loop = newLoop();
		s.wheelRest = Number.isFinite(s.wheelRest) ? s.wheelRest : 0;
		s.spin = null;
		s.trainAt = -99;
		return s;
	},
	tick(g, _dt, out) {
		const spin = g.s.spin;
		if (spin && g.time >= spin.at + WHEEL_SPIN_S) payWheel(g, out);
	},
	move(g, h) {
		const t = g.time * pace(g);
		const x = PHANTOM.x + Math.sin(t * 0.55) * PHANTOM.reach;
		const y = PHANTOM.y + Math.sin(t * 1.1) * 0.5;
		moveMover(g.world, 'phantom', x, y, h);
	},
	event(g, e, out) {
		const s = g.s;
		switch (e.type) {
			case 'bumper':
				award(g, 1_000 * (s.wizard ? 3 : 1), e.ball.x, e.ball.y, out);
				bonus(g, 1);
				break;
			case 'sling':
				award(g, 110, e.ball.x, e.ball.y, out);
				break;
			case 'spin':
				award(g, 150 * e.spins, e.ball.x, e.ball.y, out);
				break;
			case 'drop': {
				award(g, 3_000, e.ball.x, e.ball.y, out);
				bonus(g, 1);
				modeShot(g, 'fate', e.ball.x, e.ball.y, out);
				if (!bankDown(g, 'fate')) break;
				award(g, 20_000, e.ball.x, e.ball.y, out);
				resetBank(g, 'fate');
				if (s.midnight && !s.added) {
					s.added = true;
					say(out, 'Fate sealed', 'Add a ball');
					multiball(g, 1, 6, out);
				} else if (!s.lockLit && !s.wizard && !s.midnight) {
					s.lockLit = true;
					say(out, 'F·A·T·E', `Lock ${s.locks + 1} lit at Madame Zelda`, true);
					cue(out, 'lit');
				} else say(out, 'F·A·T·E', '20,000');
				break;
			}
			case 'mover': {
				s.phantomHits += 1;
				const value = 5_000 + s.phantomHits * 1_000;
				award(g, value, e.ball.x, e.ball.y, out);
				bonus(g, 2);
				if (!g.mode && !s.midnight) say(out, 'Boo!', n(value));
				shot(g, 'phantom', e.ball.x, e.ball.y, out);
				break;
			}
			case 'ramp': {
				const train = e.id === 'train';
				if (train) {
					s.trainRides += 1;
					s.trainAt = g.time;
					cue(out, 'ghostTrain');
				} else s.wheelRides += 1;
				const rides = train ? s.trainRides : s.wheelRides;
				award(g, 10_000 + rides * 1_000, e.ball.x, e.ball.y, out);
				bonus(g, 3);
				if (train && rides % 4 === 0 && s.extrasGiven < 2 && !s.extraLit) {
					s.extraLit = true;
					say(out, 'Extra ball lit', 'Madame Zelda', true);
					cue(out, 'lit');
				} else if (!g.mode && !s.midnight) say(out, train ? 'Ghost Train' : 'Big Wheel', `${rides} ${rides === 1 ? 'ride' : 'rides'}`);
				if (!train && rides % 3 === 0) lightKickback(g, out);
				shot(g, e.id, e.ball.x, e.ball.y, out);
				if (!train) spinWheel(g, out);
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
					if (!g.mode && !s.midnight) say(out, 'Round the fair', '8,000');
					shot(g, id, e.ball.x, e.ball.y, out);
				}
				break;
			}
		}
	},
	hold(g, hole, ball, out) {
		if (hole.id !== 'zelda') return;
		const s = g.s;
		award(g, 3_000, ball.x, ball.y, out);
		if (g.mode?.lit.includes('zelda')) {
			modeShot(g, 'zelda', ball.x, ball.y, out);
			return;
		}
		if (s.wizardLit) {
			s.wizardLit = false;
			s.wizard = true;
			say(out, 'The Witching Hour', 'Every shot is a jackpot', true);
			cue(out, 'wizard');
			multiball(g, 3, 25, out);
			return 2.4;
		}
		if (s.wizard) {
			jackpot(g, 'zelda', ball.x, ball.y, out);
			return;
		}
		if (s.midnight && s.superLit) {
			s.superLit = false;
			const value = s.jackpotValue * 3;
			s.jackpots += 1;
			award(g, value, ball.x, ball.y, out);
			say(out, 'Super jackpot', n(value), true);
			cue(out, 'superJackpot');
			s.jackpotLit = JACKPOT_SHOTS.slice();
			return 2;
		}
		if (s.lockLit && !s.midnight) {
			s.lockLit = false;
			s.locks += 1;
			if (s.locks >= 2) {
				startMidnight(g, out);
				return 2.2;
			}
			say(out, 'Soul locked', 'One more starts Midnight multiball', true);
			cue(out, 'lock', s.locks);
			return 1.6;
		}
		if (s.attractionLit && !g.mode && !s.midnight) {
			const next = nextAttraction(s);
			s.attractionLit = false;
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
		const fortune = FORTUNES[Math.floor(g.time * 7) % FORTUNES.length]!;
		if (lightKickback(g, out)) say(out, fortune, 'Kickback lit');
		else if (raiseMult(g, out)) say(out, fortune, `Bonus ×${g.mult}`);
		else {
			award(g, 15_000, ball.x, ball.y, out);
			say(out, fortune, '15,000');
		}
	},
	lanesDone(g, _group, out) {
		const s = g.s;
		award(g, 10_000, 9.3, 4, out);
		if (raiseMult(g, out)) say(out, 'B·O·O', `Bonus ×${g.mult}`);
		else say(out, 'B·O·O', '10,000');
		if (!s.lockLit && !s.midnight && !s.wizard && s.locks === 0 && g.mult >= 3) {
			s.lockLit = true;
			say(out, 'B·O·O', 'Lock lit at Madame Zelda');
		}
	},
	modeOver(g, mode, done, out) {
		const s = g.s;
		if (done) s.done.push(mode.id);
		if (s.played.length >= ATTRACTIONS.length && !s.wizardLit && !s.wizard) {
			s.wizardLit = true;
			say(out, 'The Witching Hour is lit', 'Madame Zelda awaits', true);
			cue(out, 'lit');
		}
	},
	multiballOver(g) {
		const s = g.s;
		if (s.wizard) {
			s.wizard = false;
			s.played = [];
			s.done = [];
		}
		s.midnight = false;
		s.added = false;
		s.jackpotLit = [];
		s.superLit = false;
		s.jackpotValue = 75_000;
	},
	ballOver(g) {
		const s = g.s;
		s.attractionLit = false;
		if (s.spin) {
			s.wheelRest = s.spin.to % TAU;
			s.spin = null;
		}
	},
	status(g) {
		const s = g.s;
		const m = g.mode;
		if (s.wizard) return 'The Witching Hour: every shot is a jackpot';
		if (s.spin) return 'The Big Wheel is spinning…';
		if (m) return `${m.name}: ${m.hint} · ${Math.ceil(m.left)}s`;
		if (s.midnight) return s.superLit ? 'Super jackpot at Madame Zelda' : `Midnight: ${s.jackpotLit.length} jackpots flashing`;
		if (s.wizardLit) return 'The Witching Hour is lit at Madame Zelda';
		if (s.lockLit) return `Lock ${s.locks + 1} lit at Madame Zelda`;
		if (s.attractionLit) return `${nextAttraction(s)?.name} lit at Madame Zelda`;
		if (s.extraLit) return 'Extra ball lit at Madame Zelda';
		const fate = standing(g, 'fate');
		return `F·A·T·E lights a lock (${fate} to go) · ${3 - s.toward} ramps light an attraction`;
	},
	goals(g) {
		const s = g.s;
		return [
			{ label: 'Locks', value: `${s.locks}/2`, hot: s.lockLit },
			{ label: 'Attractions', value: `${s.played.length}/${ATTRACTIONS.length}`, hot: s.attractionLit || s.wizardLit },
			{ label: 'Jackpots', value: `${s.jackpots}`, hot: s.midnight || s.wizard }
		];
	},
	lights(g, blink) {
		const s = g.s;
		const L: Lights = {};
		const fast = blink(6);
		const slow = blink(2.5);
		g.lanes.boo?.forEach((on, i) => (L[`lane${i}`] = on ? 1 : 0));
		g.world.drops.fate?.forEach((up, i) => (L[`fate${i}`] = up ? 0 : 1));
		for (let i = 2; i <= 6; i += 1) L[`mult${i}`] = g.mult >= i ? 1 : 0;
		L.kick = g.kickback ? 1 : 0;
		L.again = g.extra > 0 ? 1 : 0;
		L.lock0 = s.locks >= 1 ? 1 : s.lockLit && s.locks === 0 && slow ? 1 : 0;
		L.lock1 = s.locks >= 2 ? 1 : s.lockLit && s.locks === 1 && slow ? 1 : 0;
		L.extra = s.extraLit && slow ? 1 : 0;
		const toward = s.trainRides % 4;
		for (let i = 0; i < 4; i += 1) L[`train${i}`] = i < toward ? 1 : 0;
		L.wizard = s.wizard ? (fast ? 1 : 0.3) : s.wizardLit && slow ? 1 : 0;
		ATTRACTIONS.forEach((a, i) => {
			const running = g.mode?.id === a.id;
			const next = s.attractionLit && nextAttraction(s)?.id === a.id;
			L[`attr${i}`] = running ? (fast ? 1 : 0.2) : next ? (slow ? 1 : 0) : s.done.includes(a.id) ? 1 : s.played.includes(a.id) ? 0.35 : 0;
		});
		const arrows: Record<string, string | null> = { train: null, wheel: null, orbitL: null, orbitR: null, phantom: null, zelda: null };
		const gold = '#ffd34a';
		const green = '#7dff9a';
		if (s.wizard) for (const k in arrows) arrows[k] = fast ? '#ff5ad1' : null;
		else {
			for (const k of g.mode?.lit ?? []) if (k in arrows) arrows[k] = slow ? gold : null;
			for (const k of s.jackpotLit) arrows[k] = fast ? green : null;
			if (s.superLit || s.lockLit || s.attractionLit || s.extraLit || s.wizardLit) arrows.zelda = fast ? (s.superLit ? green : '#c08cff') : null;
		}
		for (const [k, color] of Object.entries(arrows)) L[`arrow:${k}`] = color ? lit(1, color) : 0;
		return L;
	}
};
