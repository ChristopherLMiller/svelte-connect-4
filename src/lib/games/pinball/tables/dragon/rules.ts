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
	say,
	startMode,
	type Game,
	type Lights,
	type ModeSpec,
	type Out,
	type TableRules
} from '../../engine/game';
import { comboShot, lit, loopPass, n, newLoop, type LoopState } from '../kit';
import { dragonDef, DRAGON, GATE } from './def';

export const QUESTS: ModeSpec[] = [
	{ id: 'bridge', name: 'Hold the Bridge', hint: 'Shoot the bridge ramp', seconds: 30, shots: ['bridge'], need: 3, value: 20_000, finish: 60_000 },
	{ id: 'tower', name: 'Climb the Tower', hint: 'Shoot the tower ramp', seconds: 35, shots: ['tower'], need: 2, value: 30_000, finish: 60_000 },
	{ id: 'joust', name: 'The Joust', hint: 'Ride the orbits', seconds: 30, shots: ['orbitL', 'orbitR'], need: 3, value: 20_000, finish: 60_000 },
	{ id: 'hoard', name: 'Raid the Hoard', hint: 'Hit the hoard on the deck', seconds: 40, shots: ['hoard'], need: 3, value: 20_000, finish: 60_000 },
	{ id: 'slayer', name: 'Dragonslayer', hint: 'Hit the dragon', seconds: 40, shots: ['dragon'], need: 3, value: 25_000, finish: 75_000 },
	{ id: 'crusade', name: 'Crusade', hint: 'Every lit shot once', seconds: 45, shots: ['bridge', 'tower', 'orbitL', 'orbitR', 'banner', 'dragon'], need: 6, value: 15_000, finish: 100_000, unique: true }
];

const JACKPOTS = ['bridge', 'tower', 'orbitL', 'orbitR', 'dragon'];
const LOCKS = 2;

export type DragonState = {
	gateHits: number;
	smashes: number;
	smashed: boolean;
	locks: number;
	siege: boolean;
	added: boolean;
	jackpotLit: string[];
	jackpotValue: number;
	superLit: boolean;
	jackpots: number;
	toward: number;
	questLit: boolean;
	played: string[];
	done: string[];
	fireLit: boolean;
	fire: boolean;
	hp: number;
	slain: number;
	hoard: boolean[];
	extrasGiven: number;
	loop: LoopState;
};

type G = Game<DragonState>;

const gateHp = (s: DragonState) => Math.min(5, 3 + s.smashes);
export const dragonHp = (s: DragonState) => Math.min(8, 4 + s.slain * 2);

const fresh = (): DragonState => ({
	gateHits: 0,
	smashes: 0,
	smashed: false,
	locks: 0,
	siege: false,
	added: false,
	jackpotLit: [],
	jackpotValue: 75_000,
	superLit: false,
	jackpots: 0,
	toward: 0,
	questLit: false,
	played: [],
	done: [],
	fireLit: false,
	fire: false,
	hp: 4,
	slain: 0,
	hoard: [false, false],
	extrasGiven: 0,
	loop: newLoop()
});

const nextQuest = (s: DragonState) => QUESTS.find((v) => !s.played.includes(v.id)) ?? null;
/** The keep is open when the gate is down, and always in a multiball. */
export const keepOpen = (s: DragonState) => s.smashed || s.siege || s.fire;

function jackpot(g: G, shot: string, x: number, y: number, out: Out) {
	const s = g.s;
	if (s.fire) {
		const value = 100_000 + s.jackpots * 10_000;
		s.jackpots += 1;
		award(g, value, x, y, out);
		say(out, 'Dragonfire jackpot', n(value), true);
		cue(out, 'jackpot');
		return;
	}
	if (!s.siege || !s.jackpotLit.includes(shot)) return;
	s.jackpotLit = s.jackpotLit.filter((j) => j !== shot);
	s.jackpots += 1;
	award(g, s.jackpotValue, x, y, out);
	say(out, 'Jackpot', n(s.jackpotValue), true);
	cue(out, 'jackpot');
	s.jackpotValue += 25_000;
	if (!s.jackpotLit.length) {
		s.superLit = true;
		say(out, 'Super jackpot is lit', 'In the keep', true);
		cue(out, 'lit');
	}
}

function shot(g: G, id: string, x: number, y: number, out: Out) {
	const s = g.s;
	modeShot(g, id, x, y, out);
	jackpot(g, id, x, y, out);
	comboShot(g, id, x, y, out);
	if (id === 'bridge') {
		s.toward += 1;
		if (s.toward >= 3 && !g.mode && !s.siege && !s.questLit && !s.fireLit && !s.fire && nextQuest(s)) {
			s.toward = 0;
			s.questLit = true;
			say(out, 'Quest ready', `${nextQuest(s)!.name} up the tower`);
			cue(out, 'lit');
		}
	}
}

export const dragonRules: TableRules<DragonState> = {
	id: 'dragon',
	def: dragonDef,
	balls: 3,
	bonusName: 'gold',
	bonusValue: 1_000,
	maxMult: 6,
	kickback: { sensor: 'outL', x: 1.1, vy: -52, points: 5_000 },
	init: fresh,
	restore(raw) {
		const s = { ...fresh(), ...(raw as Partial<DragonState>) };
		s.siege = false;
		s.fire = false;
		s.added = false;
		s.smashed = false;
		s.gateHits = 0;
		s.jackpotLit = [];
		s.superLit = false;
		s.hp = dragonHp(s);
		s.loop = newLoop();
		return s;
	},
	move(g, h) {
		const s = g.s;
		const open = keepOpen(s);
		g.world.toggles.keep = open;
		const gate = g.world.movers.gate;
		if (gate) {
			gate.solid = !open;
			moveMover(g.world, 'gate', GATE.x, GATE.y, h);
		}
		const t = g.time * pace(g);
		const fury = s.siege || s.fire ? 1.5 : 1;
		moveMover(g.world, 'dragon', DRAGON.x + Math.sin(t * 0.7 * fury) * DRAGON.reach, DRAGON.y + Math.sin(t * 1.9) * 0.25, h);
	},
	event(g, e, out) {
		const s = g.s;
		switch (e.type) {
			case 'bumper':
				award(g, 1_000 * (s.fire ? 3 : 1), e.ball.x, e.ball.y, out);
				bonus(g, 1);
				break;
			case 'sling':
				award(g, 110, e.ball.x, e.ball.y, out);
				break;
			case 'spin':
				award(g, 150 * e.spins, e.ball.x, e.ball.y, out);
				shot(g, 'banner', e.ball.x, e.ball.y, out);
				break;
			case 'standup': {
				const i = Number(e.id.slice(5));
				award(g, 5_000, e.ball.x, e.ball.y, out);
				bonus(g, 2);
				shot(g, 'hoard', e.ball.x, e.ball.y, out);
				s.hoard[i] = true;
				if (!s.hoard.every(Boolean)) break;
				s.hoard = [false, false];
				award(g, 30_000, e.ball.x, e.ball.y, out);
				if (s.siege && !s.added) {
					s.added = true;
					say(out, 'Reinforcements', 'Add a ball', true);
					multiball(g, 1, 6, out);
				} else if (raiseMult(g, out)) say(out, 'The hoard', `Bonus ×${g.mult}`);
				else say(out, 'The hoard', '30,000');
				break;
			}
			case 'mover': {
				if (e.id === 'gate') {
					if (keepOpen(s)) break;
					s.gateHits += 1;
					award(g, 4_000, e.ball.x, e.ball.y, out);
					bonus(g, 1);
					if (s.gateHits >= gateHp(s)) {
						s.smashed = true;
						s.smashes += 1;
						award(g, 20_000, e.ball.x, e.ball.y, out);
						say(out, 'The gate is smashed', 'Lock a ball in the keep', true);
						cue(out, 'smash');
					} else if (!g.mode) say(out, 'Batter the gate', `${gateHp(s) - s.gateHits} more`);
					break;
				}
				award(g, 8_000, e.ball.x, e.ball.y, out);
				bonus(g, 2);
				shot(g, 'dragon', e.ball.x, e.ball.y, out);
				if (s.siege || s.fire) break;
				s.hp -= 1;
				if (s.hp > 0) {
					if (!g.mode) say(out, 'The dragon roars', `${s.hp} more to slay it`);
					cue(out, 'roar');
					break;
				}
				s.slain += 1;
				s.hp = dragonHp(s);
				const value = 100_000 * s.slain;
				award(g, value, e.ball.x, e.ball.y, out);
				say(out, 'Dragon slain', n(value), true);
				cue(out, 'slay');
				if (s.extrasGiven < 2 && s.slain % 2 === 1) {
					s.extrasGiven += 1;
					extraBall(g, out);
				}
				break;
			}
			case 'ramp': {
				award(g, 10_000, e.ball.x, e.ball.y, out);
				bonus(g, 3);
				if (e.id === 'bridge') {
					if (lightKickback(g, out)) say(out, 'The bridge', 'Kickback lit');
					else if (!g.mode && !s.siege) say(out, 'The bridge', '10,000');
					shot(g, 'bridge', e.ball.x, e.ball.y, out);
					break;
				}
				shot(g, 'tower', e.ball.x, e.ball.y, out);
				if (s.fireLit) {
					s.fireLit = false;
					s.fire = true;
					say(out, 'Dragonfire', 'Every shot is a jackpot', true);
					cue(out, 'wizard');
					multiball(g, 3, 25, out);
				} else if (s.questLit && !g.mode && !s.siege && !s.fire) {
					s.questLit = false;
					const next = nextQuest(s);
					if (next) {
						s.played.push(next.id);
						startMode(g, next, out);
					}
				} else if (!g.mode && !s.siege && !s.fire) say(out, 'Up the tower', 'Face the dragon');
				break;
			}
			case 'enter': {
				if (e.id === 'inL' || e.id === 'inR') award(g, 500, e.ball.x, e.ball.y, out);
				else if (e.id === 'outL' || e.id === 'outR') award(g, 2_000, e.ball.x, e.ball.y, out);
				else if (e.id === 'orbitL' || e.id === 'orbitR') {
					const made = loopPass(s.loop, g, e.id);
					if (!made) break;
					const id = made === 'orbitL' ? 'orbitR' : 'orbitL';
					award(g, 8_000, e.ball.x, e.ball.y, out);
					bonus(g, 2);
					if (!g.mode && !s.siege) say(out, 'Joust', '8,000');
					shot(g, id, e.ball.x, e.ball.y, out);
				}
				break;
			}
		}
	},
	hold(g, hole, ball, out) {
		const s = g.s;
		if (hole.id === 'lair') {
			award(g, 2_000, ball.x, ball.y, out);
			return;
		}
		if (hole.id !== 'keep') return;
		const open = keepOpen(s);
		award(g, 3_000, ball.x, ball.y, out);
		if (!open) return 0.6;
		if (g.mode?.lit.includes('keep')) {
			modeShot(g, 'keep', ball.x, ball.y, out);
			return;
		}
		if (s.fire) {
			jackpot(g, 'keep', ball.x, ball.y, out);
			return;
		}
		if (s.siege) {
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
		s.smashed = false;
		s.gateHits = 0;
		s.locks += 1;
		if (s.locks >= LOCKS) {
			s.locks = 0;
			s.siege = true;
			s.jackpotLit = JACKPOTS.slice();
			award(g, 50_000, ball.x, ball.y, out);
			say(out, 'Siege multiball', 'Jackpots on the ramps, orbits and dragon', true);
			cue(out, 'multiball');
			multiball(g, 2, 12, out);
			return 2.4;
		}
		award(g, 15_000, ball.x, ball.y, out);
		say(out, 'Ball locked', 'The gate is rebuilt', true);
		cue(out, 'lock', s.locks);
		return 1.8;
	},
	modeOver(g, mode, done, out) {
		const s = g.s;
		if (done) s.done.push(mode.id);
		if (s.played.length >= QUESTS.length && !s.fireLit && !s.fire) {
			s.fireLit = true;
			say(out, 'Dragonfire is lit', 'Shoot the tower', true);
			cue(out, 'lit');
		}
	},
	multiballOver(g) {
		const s = g.s;
		if (s.fire) {
			s.fire = false;
			s.played = [];
			s.done = [];
		}
		s.siege = false;
		s.added = false;
		s.jackpotLit = [];
		s.superLit = false;
		s.jackpotValue = 75_000;
	},
	ballOver(g) {
		g.s.questLit = false;
	},
	status(g) {
		const s = g.s;
		const m = g.mode;
		if (s.fire) return 'Dragonfire: every shot is a jackpot';
		if (m) return `${m.name}: ${m.hint} · ${Math.ceil(m.left)}s`;
		if (s.siege) return s.superLit ? 'Super jackpot in the keep' : `Siege: ${s.jackpotLit.length} jackpots lit`;
		if (s.fireLit) return 'Dragonfire is lit up the tower';
		if (s.smashed) return `The gate is down: lock a ball in the keep (${s.locks}/${LOCKS})`;
		if (s.questLit) return `${nextQuest(s)?.name} is ready up the tower`;
		return `Smash the gate (${gateHp(s) - s.gateHits}) · ${3 - s.toward} bridge ramps ready a quest`;
	},
	goals(g) {
		const s = g.s;
		return [
			{ label: 'Dragon', value: `${s.hp}/${dragonHp(s)}`, hot: s.hp <= 1 },
			{ label: 'Quests', value: `${s.played.length}/${QUESTS.length}`, hot: s.questLit || s.fireLit },
			{ label: 'Jackpots', value: `${s.jackpots}`, hot: s.siege || s.fire }
		];
	},
	lights(g, blink) {
		const s = g.s;
		const L: Lights = {};
		const fast = blink(6);
		const slow = blink(2.5);
		const open = keepOpen(s);
		for (let i = 2; i <= 6; i += 1) L[`mult${i}`] = g.mult >= i ? 1 : 0;
		for (let i = 0; i < 8; i += 1) L[`hp${i}`] = i < dragonHp(s) ? (i < s.hp ? 1 : 0.12) : 0;
		for (let i = 0; i < 5; i += 1) L[`gate${i}`] = i < gateHp(s) ? (open ? (fast ? 1 : 0.3) : i < s.gateHits ? 1 : 0.15) : 0;
		for (let i = 0; i < LOCKS; i += 1) L[`lock${i}`] = s.siege ? (fast ? 1 : 0.3) : i < s.locks ? 1 : 0;
		s.hoard.forEach((on, i) => (L[`hoard${i}`] = on ? 1 : 0));
		L.kick = g.kickback ? 1 : 0;
		L.again = g.extra > 0 ? 1 : 0;
		L.fire = s.fire ? (fast ? 1 : 0.3) : s.fireLit && slow ? 1 : 0;
		QUESTS.forEach((v, i) => {
			const running = g.mode?.id === v.id;
			const next = s.questLit && nextQuest(s)?.id === v.id;
			L[`quest${i}`] = running ? (fast ? 1 : 0.2) : next ? (slow ? 1 : 0) : s.done.includes(v.id) ? 1 : s.played.includes(v.id) ? 0.35 : 0;
		});
		const arrows: Record<string, string | null> = { bridge: null, tower: null, orbitL: null, orbitR: null, keep: null, dragon: null };
		if (s.fire) for (const k in arrows) arrows[k] = fast ? '#ffe04a' : null;
		else {
			for (const k of g.mode?.lit ?? []) if (k in arrows) arrows[k] = slow ? '#ffb84a' : null;
			for (const k of s.jackpotLit) arrows[k] = fast ? '#ff3a2a' : null;
			if (s.questLit || s.fireLit) arrows.tower = fast ? '#ffb84a' : null;
			if ((s.smashed && !s.siege) || s.superLit) arrows.keep = fast ? (s.superLit ? '#ff3a2a' : '#ffb84a') : null;
		}
		for (const [k, color] of Object.entries(arrows)) L[`arrow:${k}`] = color ? lit(1, color) : 0;
		return L;
	}
};

export const dragonHot = (g: G) => g.s.siege || g.s.fire;
