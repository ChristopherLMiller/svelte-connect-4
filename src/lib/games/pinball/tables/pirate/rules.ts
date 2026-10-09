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
import { bankDown, comboShot, lit, loopPass, n, newLoop, resetBank, type LoopState } from '../kit';
import { pirateDef, SHIP } from './def';

export const VOYAGES: ModeSpec[] = [
	{ id: 'plank', name: 'Walk the Plank', hint: 'Shoot the plank ramp', seconds: 30, shots: ['plank'], need: 3, value: 20_000, finish: 60_000 },
	{ id: 'crow', name: 'Crow\u2019s Nest', hint: 'Sink the mast scoop', seconds: 30, shots: ['mast'], need: 3, value: 20_000, finish: 60_000 },
	{ id: 'broadside', name: 'Broadside', hint: 'Fire on the ship', seconds: 30, shots: ['ship'], need: 4, value: 15_000, finish: 60_000 },
	{ id: 'treasure', name: 'Treasure Map', hint: 'Knock down M·A·P or smash the chest', seconds: 30, shots: ['map', 'chest'], need: 4, value: 15_000, finish: 50_000 },
	{ id: 'maelstrom', name: 'Maelstrom', hint: 'Round the horn', seconds: 30, shots: ['orbitR'], need: 3, value: 20_000, finish: 60_000 },
	{ id: 'mutiny', name: 'Mutiny', hint: 'Every lit shot once', seconds: 40, shots: ['plank', 'mast', 'orbitR', 'chest', 'ship', 'cove'], need: 6, value: 15_000, finish: 100_000, unique: true }
];

const JACKPOTS = ['plank', 'mast', 'orbitR', 'chest'];
/** Cannon hits to sink the ship; each sinking makes the next one tougher. */
const HULL = [10, 14, 18];
/** Smashes to burst the chest open. */
const LOCK = 4;

export type PirateState = {
	shipHits: number;
	sinkings: number;
	sunk: boolean;
	plunder: boolean;
	added: boolean;
	jackpotLit: string[];
	jackpotValue: number;
	superLit: boolean;
	jackpots: number;
	toward: number;
	voyageLit: boolean;
	played: string[];
	done: string[];
	lockerLit: boolean;
	locker: boolean;
	extraLit: boolean;
	extrasGiven: number;
	maps: number;
	chest: number;
	opened: number;
	loop: LoopState;
};

type G = Game<PirateState>;

const fresh = (): PirateState => ({
	shipHits: 0,
	sinkings: 0,
	sunk: false,
	plunder: false,
	added: false,
	jackpotLit: [],
	jackpotValue: 75_000,
	superLit: false,
	jackpots: 0,
	toward: 0,
	voyageLit: false,
	played: [],
	done: [],
	lockerLit: false,
	locker: false,
	extraLit: false,
	extrasGiven: 0,
	maps: 0,
	chest: 0,
	opened: 0,
	loop: newLoop()
});

const nextVoyage = (s: PirateState) => VOYAGES.find((v) => !s.played.includes(v.id)) ?? null;
const hull = (s: PirateState) => HULL[Math.min(HULL.length - 1, s.sinkings)]!;

function jackpot(g: G, shot: string, x: number, y: number, out: Out) {
	const s = g.s;
	if (s.locker) {
		const value = 100_000 + s.jackpots * 10_000;
		s.jackpots += 1;
		award(g, value, x, y, out);
		say(out, 'Locker jackpot', n(value), true);
		cue(out, 'jackpot');
		return;
	}
	if (!s.plunder || !s.jackpotLit.includes(shot)) return;
	s.jackpotLit = s.jackpotLit.filter((j) => j !== shot);
	s.jackpots += 1;
	award(g, s.jackpotValue, x, y, out);
	say(out, 'Jackpot', n(s.jackpotValue), true);
	cue(out, 'jackpot');
	s.jackpotValue += 25_000;
	if (!s.jackpotLit.length) {
		s.superLit = true;
		say(out, 'Super jackpot is lit', 'At the cove', true);
		cue(out, 'lit');
	}
}

function shot(g: G, id: string, x: number, y: number, out: Out) {
	const s = g.s;
	modeShot(g, id, x, y, out);
	jackpot(g, id, x, y, out);
	comboShot(g, id, x, y, out);
	if (id === 'plank' || id === 'mast') {
		s.toward += 1;
		if (s.toward >= 3 && !g.mode && !s.plunder && !s.voyageLit && !s.lockerLit && !s.locker && nextVoyage(s)) {
			s.toward = 0;
			s.voyageLit = true;
			say(out, 'Voyage ready', `${nextVoyage(s)!.name} at the cove`);
			cue(out, 'lit');
		}
	}
}

export const pirateRules: TableRules<PirateState> = {
	id: 'pirate',
	def: pirateDef,
	balls: 3,
	bonusName: 'doubloons',
	bonusValue: 1_000,
	maxMult: 6,
	laneGroups: [{ id: 'rum', sensors: ['lane0', 'lane1', 'lane2'], change: true }],
	skill: { sensors: ['lane0', 'lane1', 'lane2'], points: 25_000, window: 5 },
	kickback: { sensor: 'outL', x: 1.1, vy: -52, points: 5_000 },
	init: fresh,
	restore(raw) {
		const s = { ...fresh(), ...(raw as Partial<PirateState>) };
		s.plunder = false;
		s.locker = false;
		s.added = false;
		s.sunk = false;
		s.shipHits = 0;
		s.jackpotLit = [];
		s.superLit = false;
		s.loop = newLoop();
		return s;
	},
	move(g, h) {
		const s = g.s;
		g.world.toggles.wreck = s.sunk;
		const m = g.world.movers.ship;
		if (!m) return;
		m.solid = !s.sunk;
		if (s.sunk) {
			moveMover(g.world, 'ship', SHIP.x, SHIP.y, h);
			return;
		}
		const t = g.time * pace(g);
		moveMover(g.world, 'ship', SHIP.x + Math.sin(t * 0.5) * SHIP.reach, SHIP.y + Math.sin(t * 1.3) * 0.35, h);
	},
	event(g, e, out) {
		const s = g.s;
		switch (e.type) {
			case 'bumper':
				award(g, 1_000 * (s.locker ? 3 : 1), e.ball.x, e.ball.y, out);
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
				modeShot(g, 'map', e.ball.x, e.ball.y, out);
				if (!bankDown(g, 'map')) break;
				resetBank(g, 'map');
				s.maps += 1;
				award(g, 20_000, e.ball.x, e.ball.y, out);
				if (s.plunder && !s.added) {
					s.added = true;
					say(out, 'All hands on deck', 'Add a ball', true);
					multiball(g, 1, 6, out);
				} else if (s.maps % 2 === 0 && s.extrasGiven < 2 && !s.extraLit) {
					s.extraLit = true;
					say(out, 'X marks the spot', 'Extra ball at the cove', true);
					cue(out, 'lit');
				} else say(out, 'M·A·P', '20,000');
				break;
			}
			case 'captive': {
				award(g, 4_000, e.ball.x, e.ball.y, out);
				bonus(g, 1);
				cue(out, 'chest');
				shot(g, 'chest', e.ball.x, e.ball.y, out);
				s.chest += 1;
				if (s.chest < LOCK) {
					if (!g.mode && !s.plunder) say(out, 'The chest', `${LOCK - s.chest} more to burst it`);
					break;
				}
				s.chest = 0;
				s.opened += 1;
				const value = 25_000 * s.opened;
				award(g, value, e.ball.x, e.ball.y, out);
				cue(out, 'treasure');
				if (raiseMult(g, out)) say(out, 'Pieces of eight', `${n(value)} · Bonus ×${g.mult}`, true);
				else say(out, 'Pieces of eight', n(value), true);
				break;
			}
			case 'mover': {
				if (s.sunk) break;
				s.shipHits += 1;
				award(g, 5_000 + s.shipHits * 1_000, e.ball.x, e.ball.y, out);
				bonus(g, 2);
				shot(g, 'ship', e.ball.x, e.ball.y, out);
				if (s.plunder || s.locker) break;
				if (s.shipHits >= hull(s)) {
					s.sunk = true;
					s.sinkings += 1;
					award(g, 25_000, e.ball.x, e.ball.y, out);
					say(out, 'She\u2019s going down', 'Plunder the wreck', true);
					cue(out, 'sink');
				} else if (!g.mode) say(out, 'Broadside', `${hull(s) - s.shipHits} more to sink her`);
				break;
			}
			case 'ramp': {
				award(g, 10_000, e.ball.x, e.ball.y, out);
				bonus(g, 3);
				if (!g.mode && !s.plunder) say(out, 'Walk the plank', '10,000');
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
					if (!g.mode && !s.plunder) say(out, 'Round the horn', '8,000');
					shot(g, id, e.ball.x, e.ball.y, out);
				}
				break;
			}
		}
	},
	hold(g, hole, ball, out) {
		const s = g.s;
		if (hole.id === 'mast') {
			award(g, 10_000, ball.x, ball.y, out);
			bonus(g, 3);
			cue(out, 'hoist');
			if (lightKickback(g, out)) say(out, 'Crow\u2019s nest', 'Kickback lit');
			else if (!g.mode && !s.plunder) say(out, 'Crow\u2019s nest', 'Up the mast');
			shot(g, 'mast', ball.x, ball.y, out);
			return;
		}
		if (hole.id === 'wreck') {
			const open = s.sunk;
			s.sunk = false;
			s.shipHits = 0;
			if (!open || s.plunder || s.locker) {
				award(g, 25_000, ball.x, ball.y, out);
				return 0.6;
			}
			s.plunder = true;
			s.jackpotLit = JACKPOTS.slice();
			award(g, 50_000, ball.x, ball.y, out);
			say(out, 'Plunder multiball', 'Jackpots on the plank, mast, orbit and chest', true);
			cue(out, 'multiball');
			multiball(g, 2, 12, out);
			return 2.4;
		}
		if (hole.id !== 'cove') return;
		award(g, 3_000, ball.x, ball.y, out);
		if (g.mode?.lit.includes('cove')) {
			modeShot(g, 'cove', ball.x, ball.y, out);
			return;
		}
		if (s.lockerLit) {
			s.lockerLit = false;
			s.locker = true;
			say(out, 'Davy Jones\u2019 Locker', 'Every shot is a jackpot', true);
			cue(out, 'wizard');
			multiball(g, 3, 25, out);
			return 2.6;
		}
		if (s.locker) {
			jackpot(g, 'cove', ball.x, ball.y, out);
			return;
		}
		if (s.plunder && s.superLit) {
			s.superLit = false;
			const value = s.jackpotValue * 3;
			s.jackpots += 1;
			award(g, value, ball.x, ball.y, out);
			say(out, 'Super jackpot', n(value), true);
			cue(out, 'superJackpot');
			s.jackpotLit = JACKPOTS.slice();
			return 2;
		}
		if (s.voyageLit && !g.mode && !s.plunder) {
			s.voyageLit = false;
			const next = nextVoyage(s);
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
		if (raiseMult(g, out)) say(out, 'The cove', `Bonus ×${g.mult}`);
		else {
			award(g, 15_000, ball.x, ball.y, out);
			say(out, 'The cove', '15,000');
		}
	},
	lanesDone(g, _group, out) {
		award(g, 10_000, 9.3, 4, out);
		if (raiseMult(g, out)) say(out, 'R·U·M', `Bonus ×${g.mult}`);
		else say(out, 'R·U·M', '10,000');
	},
	modeOver(g, mode, done, out) {
		const s = g.s;
		if (done) s.done.push(mode.id);
		if (s.played.length >= VOYAGES.length && !s.lockerLit && !s.locker) {
			s.lockerLit = true;
			say(out, 'Davy Jones\u2019 Locker is lit', 'Shoot the cove', true);
			cue(out, 'lit');
		}
	},
	multiballOver(g) {
		const s = g.s;
		if (s.locker) {
			s.locker = false;
			s.played = [];
			s.done = [];
		}
		s.plunder = false;
		s.added = false;
		s.jackpotLit = [];
		s.superLit = false;
		s.jackpotValue = 75_000;
	},
	ballOver(g) {
		g.s.voyageLit = false;
	},
	status(g) {
		const s = g.s;
		const m = g.mode;
		if (s.locker) return 'Davy Jones\u2019 Locker: every shot is a jackpot';
		if (m) return `${m.name}: ${m.hint} · ${Math.ceil(m.left)}s`;
		if (s.plunder) return s.superLit ? 'Super jackpot at the cove' : `Plunder: ${s.jackpotLit.length} jackpots lit`;
		if (s.chest === LOCK - 1) return 'One more smash bursts the treasure chest';
		if (s.sunk) return 'The ship is sunk: plunder the wreck';
		if (s.lockerLit) return 'Davy Jones\u2019 Locker is lit at the cove';
		if (s.voyageLit) return `${nextVoyage(s)?.name} is ready at the cove`;
		if (s.extraLit) return 'Extra ball is lit at the cove';
		return `Sink the ship (${hull(s) - s.shipHits} hits) · ${3 - s.toward} plank or mast shots ready a voyage`;
	},
	goals(g) {
		const s = g.s;
		return [
			{ label: 'Hull', value: s.sunk ? 'Sunk' : `${s.shipHits}/${hull(s)}`, hot: s.sunk },
			{ label: 'Voyages', value: `${s.played.length}/${VOYAGES.length}`, hot: s.voyageLit || s.lockerLit },
			{ label: 'Jackpots', value: `${s.jackpots}`, hot: s.plunder || s.locker }
		];
	},
	lights(g, blink) {
		const s = g.s;
		const L: Lights = {};
		const fast = blink(6);
		const slow = blink(2.5);
		g.lanes.rum?.forEach((on, i) => (L[`lane${i}`] = on ? 1 : 0));
		g.world.drops.map?.forEach((up, i) => (L[`map${i}`] = up ? 0 : 1));
		for (let i = 2; i <= 6; i += 1) L[`mult${i}`] = g.mult >= i ? 1 : 0;
		const broke = Math.floor((s.shipHits / hull(s)) * 10);
		for (let i = 0; i < 10; i += 1) L[`hull${i}`] = i < broke || s.sunk ? 1 : 0.15;
		for (let i = 0; i < LOCK; i += 1) L[`chest${i}`] = i < s.chest ? 1 : s.chest === LOCK - 1 && slow ? 0.6 : 0;
		L.kick = g.kickback ? 1 : 0;
		L.again = g.extra > 0 ? 1 : 0;
		L.extra = s.extraLit && slow ? 1 : 0;
		L.locker = s.locker ? (fast ? 1 : 0.3) : s.lockerLit && slow ? 1 : 0;
		L.wreck = s.sunk ? (fast ? 1 : 0.3) : 0;
		VOYAGES.forEach((v, i) => {
			const running = g.mode?.id === v.id;
			const next = s.voyageLit && nextVoyage(s)?.id === v.id;
			L[`voyage${i}`] = running ? (fast ? 1 : 0.2) : next ? (slow ? 1 : 0) : s.done.includes(v.id) ? 1 : s.played.includes(v.id) ? 0.35 : 0;
		});
		const arrows: Record<string, string | null> = { plank: null, mast: null, orbitR: null, chest: null, ship: null, cove: null };
		if (s.locker) for (const k in arrows) arrows[k] = fast ? '#7affd4' : null;
		else {
			for (const k of g.mode?.lit ?? []) if (k in arrows) arrows[k] = slow ? '#ffcf5a' : null;
			for (const k of s.jackpotLit) arrows[k] = fast ? '#ff4a3a' : null;
			if (s.superLit || s.voyageLit || s.extraLit || s.lockerLit) arrows.cove = fast ? (s.superLit ? '#ff4a3a' : '#ffcf5a') : null;
		}
		for (const [k, color] of Object.entries(arrows)) L[`arrow:${k}`] = color ? lit(1, color) : 0;
		return L;
	}
};

export const pirateHot = (g: G) => g.s.plunder || g.s.locker;
