import { moveMover } from '../../engine/physics';
import {
	aiming,
	award,
	bonus,
	cue,
	extraBall,
	lightKickback,
	modeShot,
	multiball,
	pace,
	raiseMult,
	say,
	startMode,
	type Game,
	type Lights,
	type ModeSpec,
	type Out,
	type TableRules
} from '../../engine/game';
import { comboShot, lit, loopPass, n, newLoop, type LoopState } from '../kit';
import { TRAIN, westernDef } from './def';

export const BOUNTIES: ModeSpec[] = [
	{ id: 'robbery', name: 'Train Robbery', hint: 'Hold up the train', seconds: 30, shots: ['train'], need: 3, value: 20_000, finish: 75_000 },
	{ id: 'stagecoach', name: 'Stagecoach', hint: 'Shoot the mine ramp', seconds: 30, shots: ['mine'], need: 3, value: 20_000, finish: 60_000 },
	{ id: 'rustlers', name: 'Cattle Rustlers', hint: 'Ride the orbits', seconds: 30, shots: ['orbitL', 'orbitR'], need: 3, value: 20_000, finish: 60_000 },
	{ id: 'claim', name: 'Claim Jumpers', hint: 'Shoot the railroad ramp', seconds: 30, shots: ['rail'], need: 3, value: 20_000, finish: 60_000 },
	{ id: 'showdown', name: 'Showdown', hint: 'Shoot the outlaws', seconds: 25, shots: ['outlaw'], need: 4, value: 15_000, finish: 75_000 },
	{ id: 'wanted', name: 'Wanted', hint: 'Every lit shot once', seconds: 40, shots: ['mine', 'rail', 'orbitL', 'orbitR', 'train', 'saloon'], need: 6, value: 15_000, finish: 100_000, unique: true }
];

const JACKPOTS = ['mine', 'rail', 'orbitL', 'orbitR', 'train'];
const JOBS = 2;
const CRACK = [30, 45, 60];
/** How long after the six-shooter fires an outlaw hit still counts as a quick draw. */
const DRAW_WINDOW = 1.2;

export type WesternState = {
	spins: number;
	cracks: number;
	open: boolean;
	jobs: number;
	rush: boolean;
	added: boolean;
	jackpotLit: string[];
	jackpotValue: number;
	superLit: boolean;
	jackpots: number;
	toward: number;
	bountyLit: boolean;
	played: string[];
	done: string[];
	noonLit: boolean;
	noon: boolean;
	outlaws: boolean[];
	posses: number;
	loops: number;
	extraLit: boolean;
	extrasGiven: number;
	loot: number;
	draws: number;
	aimed: boolean;
	firedAt: number;
	loop: LoopState;
};

type G = Game<WesternState>;

const fresh = (): WesternState => ({
	spins: 0,
	cracks: 0,
	open: false,
	jobs: 0,
	rush: false,
	added: false,
	jackpotLit: [],
	jackpotValue: 75_000,
	superLit: false,
	jackpots: 0,
	toward: 0,
	bountyLit: false,
	played: [],
	done: [],
	noonLit: false,
	noon: false,
	outlaws: [false, false, false],
	posses: 0,
	loops: 0,
	extraLit: false,
	extrasGiven: 0,
	loot: 0,
	draws: 0,
	aimed: false,
	firedAt: -9,
	loop: newLoop()
});

const nextBounty = (s: WesternState) => BOUNTIES.find((v) => !s.played.includes(v.id)) ?? null;
export const crackNeed = (s: WesternState) => CRACK[Math.min(CRACK.length - 1, s.cracks)]!;
export const vaultOpen = (s: WesternState) => s.open || s.rush || s.noon;

function jackpot(g: G, shot: string, x: number, y: number, out: Out) {
	const s = g.s;
	if (s.noon) {
		const value = 100_000 + s.jackpots * 10_000;
		s.jackpots += 1;
		award(g, value, x, y, out);
		say(out, 'High Noon jackpot', n(value), true);
		cue(out, 'jackpot');
		return;
	}
	if (!s.rush || !s.jackpotLit.includes(shot)) return;
	s.jackpotLit = s.jackpotLit.filter((j) => j !== shot);
	s.jackpots += 1;
	award(g, s.jackpotValue, x, y, out);
	say(out, 'Jackpot', n(s.jackpotValue), true);
	cue(out, 'jackpot');
	s.jackpotValue += 25_000;
	if (!s.jackpotLit.length) {
		s.superLit = true;
		say(out, 'Super jackpot is lit', 'In the vault', true);
		cue(out, 'lit');
	}
}

function shot(g: G, id: string, x: number, y: number, out: Out) {
	const s = g.s;
	modeShot(g, id, x, y, out);
	jackpot(g, id, x, y, out);
	comboShot(g, id, x, y, out);
	if (id === 'mine' || id === 'rail') {
		s.toward += 1;
		if (s.toward >= 3 && !g.mode && !s.rush && !s.bountyLit && !s.noonLit && !s.noon && nextBounty(s)) {
			s.toward = 0;
			s.bountyLit = true;
			say(out, 'Bounty posted', `${nextBounty(s)!.name} at the saloon`);
			cue(out, 'lit');
		}
	}
}

export const westernRules: TableRules<WesternState> = {
	id: 'western',
	def: westernDef,
	balls: 3,
	bonusName: 'gold dust',
	bonusValue: 1_000,
	maxMult: 6,
	laneGroups: [{ id: 'gun', sensors: ['lane0', 'lane1', 'lane2'], change: true }],
	skill: { sensors: ['lane0', 'lane1', 'lane2'], points: 25_000, window: 5 },
	kickback: { sensor: 'outL', x: 1.1, vy: -52, points: 5_000 },
	init: fresh,
	restore(raw) {
		const s = { ...fresh(), ...(raw as Partial<WesternState>) };
		s.rush = false;
		s.noon = false;
		s.added = false;
		s.open = false;
		s.spins = 0;
		s.jackpotLit = [];
		s.superLit = false;
		s.aimed = false;
		s.firedAt = -9;
		s.loop = newLoop();
		return s;
	},
	tick(g, _dt, out) {
		const s = g.s;
		if (aiming(g)) s.aimed = true;
		else if (s.aimed) {
			s.aimed = false;
			s.firedAt = g.time;
			cue(out, 'bang');
		}
	},
	move(g, h) {
		const s = g.s;
		g.world.toggles.vault = vaultOpen(s);
		const robbing = g.mode?.id === 'robbery' || s.rush || s.noon;
		const t = g.time * pace(g) * (robbing ? 1.5 : 1);
		// A triangle wave with a pause at each station, so it reads as a train and not a pendulum.
		const phase = (t * 0.12) % 1;
		const run = phase < 0.4 ? phase / 0.4 : phase < 0.5 ? 1 : phase < 0.9 ? 1 - (phase - 0.5) / 0.4 : 0;
		const ease = run * run * (3 - 2 * run);
		moveMover(g.world, 'train', TRAIN.x - TRAIN.reach + ease * TRAIN.reach * 2, TRAIN.y, h);
	},
	event(g, e, out) {
		const s = g.s;
		switch (e.type) {
			case 'bumper':
				award(g, 1_000 * (s.noon ? 3 : 1), e.ball.x, e.ball.y, out);
				bonus(g, 1);
				break;
			case 'sling':
				award(g, 110, e.ball.x, e.ball.y, out);
				break;
			case 'spin': {
				award(g, 150 * e.spins, e.ball.x, e.ball.y, out);
				if (vaultOpen(s)) break;
				s.spins += e.spins;
				if (s.spins >= crackNeed(s)) {
					s.spins = 0;
					s.open = true;
					s.cracks += 1;
					award(g, 20_000, e.ball.x, e.ball.y, out);
					say(out, 'The vault is cracked', 'Rob the bank', true);
					cue(out, 'crack');
				}
				break;
			}
			case 'standup': {
				const i = Number(e.id.slice(6));
				award(g, 3_000, e.ball.x, e.ball.y, out);
				bonus(g, 1);
				shot(g, 'outlaw', e.ball.x, e.ball.y, out);
				cue(out, 'bang');
				if (g.time - s.firedAt < DRAW_WINDOW) {
					s.firedAt = -9;
					s.draws += 1;
					const value = 15_000 * Math.min(4, s.draws);
					award(g, value, e.ball.x, e.ball.y, out);
					cue(out, 'quickDraw');
					if (!g.mode && !s.rush && !s.noon) say(out, 'Quick draw', n(value), true);
				}
				s.outlaws[i] = true;
				if (!s.outlaws.every(Boolean)) break;
				s.outlaws = [false, false, false];
				s.posses += 1;
				award(g, 25_000, e.ball.x, e.ball.y, out);
				if (s.rush && !s.added) {
					s.added = true;
					say(out, 'Posse rides in', 'Add a ball', true);
					multiball(g, 1, 6, out);
				} else if (s.posses % 2 === 0 && s.extrasGiven < 2 && !s.extraLit) {
					s.extraLit = true;
					say(out, 'Reward', 'Extra ball at the saloon', true);
					cue(out, 'lit');
				} else if (raiseMult(g, out)) say(out, 'Outlaws rounded up', `Bonus ×${g.mult}`);
				else say(out, 'Outlaws rounded up', '25,000');
				break;
			}
			case 'mover': {
				s.loot += 1;
				award(g, 5_000 + Math.min(10, s.loot) * 500, e.ball.x, e.ball.y, out);
				bonus(g, 2);
				shot(g, 'train', e.ball.x, e.ball.y, out);
				if (!g.mode && !s.rush && !s.noon) say(out, 'Hold up the train', n(5_000 + Math.min(10, s.loot) * 500));
				break;
			}
			case 'ramp': {
				award(g, 10_000, e.ball.x, e.ball.y, out);
				bonus(g, 3);
				if (e.id === 'mine' && lightKickback(g, out)) say(out, 'Gold mine', 'Kickback lit');
				else if (!g.mode && !s.rush) say(out, e.id === 'mine' ? 'Gold mine' : 'Railroad', '10,000');
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
					s.loops += 1;
					award(g, 8_000, e.ball.x, e.ball.y, out);
					bonus(g, 2);
					if (s.loops % 4 === 0 && s.extrasGiven < 2 && !s.extraLit) {
						s.extraLit = true;
						say(out, 'Trail boss', 'Extra ball at the saloon', true);
						cue(out, 'lit');
					} else if (!g.mode && !s.rush) say(out, 'Round up', '8,000');
					shot(g, id, e.ball.x, e.ball.y, out);
				}
				break;
			}
		}
	},
	hold(g, hole, ball, out) {
		const s = g.s;
		if (hole.id === 'vault') {
			award(g, 5_000, ball.x, ball.y, out);
			if (!vaultOpen(s)) return 0.6;
			if (s.noon) {
				jackpot(g, 'vault', ball.x, ball.y, out);
				return;
			}
			if (s.rush) {
				if (!s.superLit) return 0.8;
				s.superLit = false;
				const value = s.jackpotValue * 3;
				s.jackpots += 1;
				award(g, value, ball.x, ball.y, out);
				say(out, 'Super jackpot', n(value), true);
				cue(out, 'superJackpot');
				s.jackpotLit = JACKPOTS.slice();
				return 2;
			}
			s.open = false;
			s.jobs += 1;
			if (s.jobs >= JOBS) {
				s.jobs = 0;
				s.rush = true;
				s.jackpotLit = JACKPOTS.slice();
				award(g, 50_000, ball.x, ball.y, out);
				say(out, 'Gold Rush multiball', 'Jackpots on the ramps, orbits and train', true);
				cue(out, 'multiball');
				multiball(g, 2, 12, out);
				return 2.4;
			}
			award(g, 25_000, ball.x, ball.y, out);
			say(out, 'Bank job', `${JOBS - s.jobs} more for Gold Rush`, true);
			cue(out, 'lock', s.jobs);
			return 1.8;
		}
		if (hole.id !== 'saloon') return;
		award(g, 3_000, ball.x, ball.y, out);
		if (g.mode?.lit.includes('saloon')) {
			modeShot(g, 'saloon', ball.x, ball.y, out);
			return;
		}
		if (s.noonLit) {
			s.noonLit = false;
			s.noon = true;
			say(out, 'High Noon', 'Every shot is a jackpot', true);
			cue(out, 'wizard');
			multiball(g, 3, 25, out);
			return 2.6;
		}
		if (s.noon) {
			jackpot(g, 'saloon', ball.x, ball.y, out);
			return;
		}
		if (s.bountyLit && !g.mode && !s.rush) {
			s.bountyLit = false;
			const next = nextBounty(s);
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
		if (raiseMult(g, out)) say(out, 'The saloon', `Bonus ×${g.mult}`);
		else {
			award(g, 15_000, ball.x, ball.y, out);
			say(out, 'The saloon', '15,000');
		}
	},
	lanesDone(g, _group, out) {
		award(g, 10_000, 9.3, 4, out);
		if (raiseMult(g, out)) say(out, 'G·U·N', `Bonus ×${g.mult}`);
		else say(out, 'G·U·N', '10,000');
	},
	modeOver(g, mode, done, out) {
		const s = g.s;
		if (done) s.done.push(mode.id);
		if (s.played.length >= BOUNTIES.length && !s.noonLit && !s.noon) {
			s.noonLit = true;
			say(out, 'High Noon is lit', 'Shoot the saloon', true);
			cue(out, 'lit');
		}
	},
	multiballOver(g) {
		const s = g.s;
		if (s.noon) {
			s.noon = false;
			s.played = [];
			s.done = [];
		}
		s.rush = false;
		s.added = false;
		s.jackpotLit = [];
		s.superLit = false;
		s.jackpotValue = 75_000;
	},
	ballOver(g) {
		g.s.bountyLit = false;
	},
	status(g) {
		const s = g.s;
		const m = g.mode;
		if (aiming(g)) return 'Quick draw: press a flipper to fire';
		if (s.noon) return 'High Noon: every shot is a jackpot';
		if (m) return `${m.name}: ${m.hint} · ${Math.ceil(m.left)}s`;
		if (s.rush) return s.superLit ? 'Super jackpot in the vault' : `Gold Rush: ${s.jackpotLit.length} jackpots lit`;
		if (s.noonLit) return 'High Noon is lit at the saloon';
		if (s.open) return `The vault is open: rob the bank (${s.jobs}/${JOBS})`;
		if (s.bountyLit) return `${nextBounty(s)?.name} is posted at the saloon`;
		if (s.extraLit) return 'Extra ball is lit at the saloon';
		return `Spin the dial (${crackNeed(s) - s.spins}) · ${3 - s.toward} ramps post a bounty`;
	},
	goals(g) {
		const s = g.s;
		return [
			{ label: 'Vault', value: vaultOpen(s) ? 'Open' : `${Math.round((s.spins / crackNeed(s)) * 100)}%`, hot: s.open },
			{ label: 'Bounties', value: `${s.played.length}/${BOUNTIES.length}`, hot: s.bountyLit || s.noonLit },
			{ label: 'Jackpots', value: `${s.jackpots}`, hot: s.rush || s.noon }
		];
	},
	lights(g, blink) {
		const s = g.s;
		const L: Lights = {};
		const fast = blink(6);
		const slow = blink(2.5);
		const open = vaultOpen(s);
		g.lanes.gun?.forEach((on, i) => (L[`lane${i}`] = on ? 1 : 0));
		s.outlaws.forEach((on, i) => (L[`outlaw${i}`] = on ? 1 : 0));
		for (let i = 2; i <= 6; i += 1) L[`mult${i}`] = g.mult >= i ? 1 : 0;
		for (let i = 0; i < 6; i += 1) L[`dial${i}`] = open ? (fast ? 1 : 0.3) : i < Math.floor((s.spins / crackNeed(s)) * 6) ? 1 : 0.12;
		for (let i = 0; i < JOBS; i += 1) L[`job${i}`] = s.rush ? (fast ? 1 : 0.3) : i < s.jobs ? 1 : 0;
		L.kick = g.kickback ? 1 : 0;
		L.again = g.extra > 0 ? 1 : 0;
		L.extra = s.extraLit && slow ? 1 : 0;
		L.noon = s.noon ? (fast ? 1 : 0.3) : s.noonLit && slow ? 1 : 0;
		BOUNTIES.forEach((v, i) => {
			const running = g.mode?.id === v.id;
			const next = s.bountyLit && nextBounty(s)?.id === v.id;
			L[`bounty${i}`] = running ? (fast ? 1 : 0.2) : next ? (slow ? 1 : 0) : s.done.includes(v.id) ? 1 : s.played.includes(v.id) ? 0.35 : 0;
		});
		const arrows: Record<string, string | null> = { mine: null, rail: null, orbitL: null, orbitR: null, train: null, saloon: null, vault: null };
		if (s.noon) for (const k in arrows) arrows[k] = fast ? '#fff0c8' : null;
		else {
			for (const k of g.mode?.lit ?? []) if (k in arrows) arrows[k] = slow ? '#ffd24a' : null;
			for (const k of s.jackpotLit) arrows[k] = fast ? '#ff4a2a' : null;
			if (s.bountyLit || s.extraLit || s.noonLit) arrows.saloon = fast ? '#ffd24a' : null;
			if ((s.open && !s.rush) || s.superLit) arrows.vault = fast ? (s.superLit ? '#ff4a2a' : '#ffd24a') : null;
		}
		for (const [k, color] of Object.entries(arrows)) L[`arrow:${k}`] = color ? lit(1, color) : 0;
		return L;
	}
};

export const westernHot = (g: G) => g.s.rush || g.s.noon;
