import {
	award,
	bonus,
	cue,
	extraBall,
	lightKickback,
	modeShot,
	multiball,
	raiseMult,
	say,
	startMode,
	type Game,
	type Lights,
	type ModeSpec,
	type Out,
	type TableRules
} from '../../engine/game';
import { bankDown, comboShot, lit, loopPass, n, newLoop, resetBank, standing, type LoopState } from '../kit';
import { spaceDef } from './def';

export const MISSIONS: ModeSpec[] = [
	{ id: 'asteroids', name: 'Asteroid Field', hint: 'Rip the nebula spinner', seconds: 30, shots: ['spinner'], need: 5, value: 12_000, finish: 50_000 },
	{ id: 'blockade', name: 'Alien Blockade', hint: 'Knock down A·L·I·E·N', seconds: 35, shots: ['alien'], need: 5, value: 10_000, finish: 60_000 },
	{ id: 'dogfight', name: 'Dogfight', hint: 'Hit the U·F·O bank', seconds: 30, shots: ['ufo'], need: 3, value: 20_000, finish: 60_000 },
	{ id: 'hyperspace', name: 'Hyperspace Run', hint: 'Loop the orbit', seconds: 30, shots: ['loop'], need: 3, value: 25_000, finish: 75_000 },
	{ id: 'ion', name: 'Ion Storm', hint: 'Pound the bumpers', seconds: 25, shots: ['bumper'], need: 12, value: 3_000, finish: 40_000 },
	{ id: 'rescue', name: 'Deep Space Rescue', hint: 'Every lit shot once', seconds: 40, shots: ['loop', 'warp', 'ufo', 'spinner', 'alien'], need: 5, value: 15_000, finish: 100_000, unique: true }
];

const JACKPOTS = ['loop', 'ufo', 'spinner', 'alien'];

export type SpaceState = {
	locks: number;
	lockLit: boolean;
	missionLit: boolean;
	played: string[];
	done: string[];
	storm: boolean;
	added: boolean;
	jackpotLit: string[];
	jackpotValue: number;
	superLit: boolean;
	jackpots: number;
	novaLit: boolean;
	nova: boolean;
	loops: number;
	extraLit: boolean;
	extrasGiven: number;
	loop: LoopState;
};

type G = Game<SpaceState>;

const fresh = (): SpaceState => ({
	locks: 0,
	lockLit: false,
	missionLit: false,
	played: [],
	done: [],
	storm: false,
	added: false,
	jackpotLit: [],
	jackpotValue: 60_000,
	superLit: false,
	jackpots: 0,
	novaLit: false,
	nova: false,
	loops: 0,
	extraLit: false,
	extrasGiven: 0,
	loop: newLoop()
});

const nextMission = (s: SpaceState) => MISSIONS.find((m) => !s.played.includes(m.id)) ?? null;

function jackpot(g: G, shot: string, x: number, y: number, out: Out) {
	const s = g.s;
	if (s.nova) {
		const value = 100_000 + s.jackpots * 10_000;
		s.jackpots += 1;
		award(g, value, x, y, out);
		say(out, 'Supernova jackpot', n(value), true);
		cue(out, 'jackpot');
		return;
	}
	if (!s.storm || !s.jackpotLit.includes(shot)) return;
	s.jackpotLit = s.jackpotLit.filter((j) => j !== shot);
	s.jackpots += 1;
	award(g, s.jackpotValue, x, y, out);
	say(out, 'Jackpot', n(s.jackpotValue), true);
	cue(out, 'jackpot');
	s.jackpotValue += 20_000;
	if (!s.jackpotLit.length) {
		s.superLit = true;
		say(out, 'Super jackpot is lit', 'Shoot the warp', true);
		cue(out, 'lit');
	}
}

/** A shot that counts toward missions, jackpots and combos. */
function shot(g: G, id: string, x: number, y: number, out: Out) {
	modeShot(g, id, x, y, out);
	jackpot(g, id, x, y, out);
	if (id === 'loop' || id === 'warp' || id === 'ufo') comboShot(g, id, x, y, out, 12_000);
}

export const spaceRules: TableRules<SpaceState> = {
	id: 'space',
	def: spaceDef,
	balls: 3,
	bonusName: 'light years',
	bonusValue: 1_000,
	maxMult: 6,
	laneGroups: [{ id: 'str', sensors: ['lane0', 'lane1', 'lane2'], change: true }],
	skill: { sensors: ['lane0', 'lane1', 'lane2'], points: 30_000, window: 5 },
	kickback: { sensor: 'outL', x: 1.1, vy: -52, points: 5_000 },
	init: fresh,
	restore(raw) {
		const s = { ...fresh(), ...(raw as Partial<SpaceState>) };
		s.storm = false;
		s.nova = false;
		s.added = false;
		s.jackpotLit = [];
		s.superLit = false;
		s.loop = newLoop();
		return s;
	},
	event(g, e, out) {
		const s = g.s;
		switch (e.type) {
			case 'bumper':
				award(g, 1_000, e.ball.x, e.ball.y, out);
				bonus(g, 1);
				modeShot(g, 'bumper', e.ball.x, e.ball.y, out);
				break;
			case 'sling':
				award(g, 100, e.ball.x, e.ball.y, out);
				break;
			case 'spin':
				award(g, 200 * e.spins, e.ball.x, e.ball.y, out);
				if (e.spins >= 4) shot(g, 'spinner', e.ball.x, e.ball.y, out);
				break;
			case 'drop': {
				award(g, e.bank === 'ufo' ? 5_000 : 2_500, e.ball.x, e.ball.y, out);
				bonus(g, 1);
				shot(g, e.bank, e.ball.x, e.ball.y, out);
				if (!bankDown(g, e.bank)) break;
				resetBank(g, e.bank);
				if (e.bank === 'alien') {
					award(g, 25_000, e.ball.x, e.ball.y, out);
					if (s.storm && !s.added) {
						s.added = true;
						say(out, 'Reinforcements', 'Add a ball', true);
						multiball(g, 1, 6, out);
					} else if (!s.storm && !s.nova && !s.lockLit) {
						s.lockLit = true;
						say(out, 'Alien fleet down', `Lock ${s.locks + 1} is lit at the warp`, true);
						cue(out, 'lit');
					} else say(out, 'Alien fleet down', '25,000');
				} else {
					award(g, 30_000, e.ball.x, e.ball.y, out);
					if (!s.missionLit && !g.mode && !s.storm && !s.nova && nextMission(s)) {
						s.missionLit = true;
						say(out, 'Mission ready', `${nextMission(s)!.name} at the warp`, true);
						cue(out, 'lit');
					} else say(out, 'U·F·O', '30,000');
				}
				break;
			}
			case 'enter': {
				if (e.id === 'inL' || e.id === 'inR') award(g, 500, e.ball.x, e.ball.y, out);
				else if (e.id === 'outL' || e.id === 'outR') award(g, 2_000, e.ball.x, e.ball.y, out);
				else if (e.id.startsWith('lane')) {
					award(g, 1_000, e.ball.x, e.ball.y, out);
					bonus(g, 1);
				} else if (e.id === 'orbitL' || e.id === 'orbitR') {
					if (!loopPass(s.loop, g, e.id)) break;
					s.loops += 1;
					const value = 10_000 + s.loops * 2_000;
					award(g, value, e.ball.x, e.ball.y, out);
					bonus(g, 3);
					if (s.loops % 5 === 0 && s.extrasGiven < 2 && !s.extraLit) {
						s.extraLit = true;
						say(out, 'Extra ball is lit', 'Shoot the warp', true);
						cue(out, 'lit');
					} else if (!g.mode && !s.storm) say(out, 'Hyperspace', n(value));
					shot(g, 'loop', e.ball.x, e.ball.y, out);
				}
				break;
			}
		}
	},
	hold(g, hole, ball, out) {
		if (hole.id !== 'warp') return;
		const s = g.s;
		award(g, 5_000, ball.x, ball.y, out);
		if (g.mode?.lit.includes('warp')) {
			shot(g, 'warp', ball.x, ball.y, out);
			return;
		}
		if (s.novaLit) {
			s.novaLit = false;
			s.nova = true;
			say(out, 'Supernova', 'Every shot is a jackpot', true);
			cue(out, 'wizard');
			multiball(g, 3, 25, out);
			return 2.6;
		}
		if (s.nova) {
			jackpot(g, 'warp', ball.x, ball.y, out);
			return;
		}
		if (s.storm && s.superLit) {
			s.superLit = false;
			const value = s.jackpotValue * 3;
			s.jackpots += 1;
			award(g, value, ball.x, ball.y, out);
			say(out, 'Super jackpot', n(value), true);
			cue(out, 'superJackpot');
			s.jackpotLit = JACKPOTS.slice();
			return 2;
		}
		if (s.lockLit && !s.storm) {
			s.lockLit = false;
			s.locks += 1;
			if (s.locks >= 2) {
				s.locks = 0;
				s.storm = true;
				s.jackpotLit = JACKPOTS.slice();
				say(out, 'Star Storm', 'Multiball. Jackpots are lit', true);
				cue(out, 'multiball');
				multiball(g, 2, 12, out);
				return 2.4;
			}
			say(out, 'Ball locked', 'One more for Star Storm', true);
			cue(out, 'lock', s.locks);
			return 1.6;
		}
		if (s.missionLit && !g.mode && !s.storm) {
			s.missionLit = false;
			const next = nextMission(s);
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
		if (lightKickback(g, out)) say(out, 'Warp', 'Kickback is lit');
		else if (raiseMult(g, out)) say(out, 'Warp', `Bonus ×${g.mult}`);
		else {
			award(g, 15_000, ball.x, ball.y, out);
			say(out, 'Warp', '15,000');
		}
	},
	lanesDone(g, _group, out) {
		award(g, 10_000, 9.3, 4, out);
		if (raiseMult(g, out)) say(out, 'S·T·R', `Bonus ×${g.mult}`);
		else say(out, 'S·T·R', '10,000');
	},
	modeOver(g, mode, done, out) {
		const s = g.s;
		if (done) s.done.push(mode.id);
		if (s.played.length >= MISSIONS.length && !s.novaLit && !s.nova) {
			s.novaLit = true;
			say(out, 'Supernova is lit', 'Shoot the warp', true);
			cue(out, 'lit');
		}
	},
	multiballOver(g) {
		const s = g.s;
		if (s.nova) {
			s.nova = false;
			s.played = [];
			s.done = [];
		}
		s.storm = false;
		s.added = false;
		s.jackpotLit = [];
		s.superLit = false;
		s.jackpotValue = 60_000;
	},
	ballOver(g) {
		g.s.missionLit = false;
	},
	status(g) {
		const s = g.s;
		const m = g.mode;
		if (s.nova) return 'Supernova: every shot is a jackpot';
		if (m) return `${m.name}: ${m.hint} · ${Math.ceil(m.left)}s`;
		if (s.storm) return s.superLit ? 'Super jackpot at the warp' : `Star Storm: ${s.jackpotLit.length} jackpots lit`;
		if (s.novaLit) return 'Supernova is lit at the warp';
		if (s.lockLit) return `Lock ${s.locks + 1} is lit at the warp`;
		if (s.missionLit) return `${nextMission(s)?.name} is ready at the warp`;
		if (s.extraLit) return 'Extra ball is lit at the warp';
		return `A·L·I·E·N lights a lock (${standing(g, 'alien')} to go) · U·F·O readies a mission`;
	},
	goals(g) {
		const s = g.s;
		return [
			{ label: 'Locks', value: `${s.locks}/2`, hot: s.lockLit },
			{ label: 'Missions', value: `${s.played.length}/${MISSIONS.length}`, hot: s.missionLit || s.novaLit },
			{ label: 'Loops', value: `${s.loops}` },
			{ label: 'Jackpots', value: `${s.jackpots}`, hot: s.storm || s.nova }
		];
	},
	lights(g, blink) {
		const s = g.s;
		const L: Lights = {};
		const fast = blink(6);
		const slow = blink(2.5);
		g.lanes.str?.forEach((on, i) => (L[`lane${i}`] = on ? 1 : 0));
		g.world.drops.alien?.forEach((up, i) => (L[`alien${i}`] = up ? 0 : 1));
		g.world.drops.ufo?.forEach((up, i) => (L[`ufo${i}`] = up ? 0 : 1));
		for (let i = 2; i <= 6; i += 1) L[`mult${i}`] = g.mult >= i ? 1 : 0;
		L.kick = g.kickback ? 1 : 0;
		L.again = g.extra > 0 ? 1 : 0;
		L.lock0 = s.locks >= 1 ? 1 : s.lockLit && s.locks === 0 && slow ? 1 : 0;
		L.lock1 = s.lockLit && s.locks === 1 && slow ? 1 : 0;
		L.extra = s.extraLit && slow ? 1 : 0;
		L.nova = s.nova ? (fast ? 1 : 0.3) : s.novaLit && slow ? 1 : 0;
		MISSIONS.forEach((m, i) => {
			const running = g.mode?.id === m.id;
			const next = s.missionLit && nextMission(s)?.id === m.id;
			L[`mission${i}`] = running ? (fast ? 1 : 0.2) : next ? (slow ? 1 : 0) : s.done.includes(m.id) ? 1 : s.played.includes(m.id) ? 0.35 : 0;
		});
		const arrows: Record<string, string | null> = { loop: null, ufo: null, spinner: null, alien: null, warp: null };
		if (s.nova) for (const k in arrows) arrows[k] = fast ? '#ff5ad1' : null;
		else {
			for (const k of g.mode?.lit ?? []) if (k in arrows) arrows[k] = slow ? '#ffe14a' : null;
			for (const k of s.jackpotLit) arrows[k] = fast ? '#4af2ff' : null;
			if (s.superLit || s.lockLit || s.missionLit || s.extraLit || s.novaLit) arrows.warp = fast ? (s.superLit ? '#4af2ff' : '#ff8a3a') : null;
		}
		for (const [k, color] of Object.entries(arrows)) L[`arrow:${k}`] = color ? lit(1, color) : 0;
		return L;
	}
};

export const spaceHot = (g: G) => g.s.storm || g.s.nova;
