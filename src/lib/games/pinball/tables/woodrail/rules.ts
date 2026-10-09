import { award, bonus, cue, extraBall, raiseMult, say, type Game, type Lights, type TableRules } from '../../engine/game';
import { n } from '../kit';
import { woodrailDef } from './def';

export type WoodrailState = {
	/** Times A·B·C·D has been completed this ball. */
	rounds: number;
	bumpersLit: boolean;
	kick: number;
	special: boolean;
	specials: number;
	sides: [boolean, boolean];
};

type G = Game<WoodrailState>;

const fresh = (): WoodrailState => ({ rounds: 0, bumpersLit: false, kick: 1, special: false, specials: 0, sides: [false, false] });

export const woodrailRules: TableRules<WoodrailState> = {
	id: 'woodrail',
	def: woodrailDef,
	balls: 5,
	bonusName: 'bonus',
	bonusValue: 1_000,
	maxMult: 3,
	laneGroups: [{ id: 'abcd', sensors: ['lane0', 'lane1', 'lane2', 'lane3'], change: false }],
	init: fresh,
	restore(raw) {
		return { ...fresh(), ...(raw as Partial<WoodrailState>), special: false };
	},
	serve(g) {
		g.s.rounds = 0;
		g.s.bumpersLit = false;
		g.s.kick = 1;
		g.s.sides = [false, false];
	},
	event(g, e, out) {
		const s = g.s;
		switch (e.type) {
			case 'bumper':
				award(g, s.bumpersLit ? 1_000 : 100, e.ball.x, e.ball.y, out);
				break;
			case 'sling':
				award(g, 10, e.ball.x, e.ball.y, out);
				break;
			case 'standup': {
				award(g, 1_000, e.ball.x, e.ball.y, out);
				bonus(g, 1);
				const i = e.id === 'sideL' ? 0 : 1;
				s.sides[i] = true;
				if (s.sides[0] && s.sides[1]) {
					s.sides = [false, false];
					if (raiseMult(g, out)) say(out, g.mult === 2 ? 'Double bonus' : 'Triple bonus', undefined, true);
					else award(g, 5_000, e.ball.x, e.ball.y, out);
				}
				break;
			}
			case 'enter':
				if (e.id.startsWith('lane')) {
					award(g, 500, e.ball.x, e.ball.y, out);
					bonus(g, 1);
				} else if (e.id === 'inL' || e.id === 'inR') award(g, 300, e.ball.x, e.ball.y, out);
				else if (e.id === 'outL' || e.id === 'outR') award(g, 1_000, e.ball.x, e.ball.y, out);
				break;
		}
	},
	hold(g, hole, ball, out) {
		if (hole.id !== 'kickout') return;
		const s = g.s;
		const value = 3_000 * s.kick;
		award(g, value, ball.x, ball.y, out);
		bonus(g, 2);
		if (s.special) {
			s.special = false;
			s.specials += 1;
			if (s.specials === 1) extraBall(g, out, 'Special');
			else {
				award(g, 50_000, ball.x, ball.y, out);
				say(out, 'Special', '50,000', true);
				cue(out, 'special');
			}
			return 1.8;
		}
		say(out, 'Kick-out', n(value));
		if (s.kick < 5) s.kick += 1;
	},
	lanesDone(g, _group, out) {
		const s = g.s;
		s.rounds += 1;
		award(g, 5_000, 9.3, 4, out);
		if (!s.bumpersLit) {
			s.bumpersLit = true;
			say(out, 'A·B·C·D', 'Bumpers score 1,000', true);
			cue(out, 'lit');
		} else if (!s.special) {
			s.special = true;
			say(out, 'Special lit', 'Shoot the kick-out hole', true);
			cue(out, 'lit');
		} else say(out, 'A·B·C·D', '5,000');
	},
	status(g) {
		const s = g.s;
		if (s.special) return 'Special is lit at the kick-out hole';
		const left = 4 - (g.lanes.abcd?.filter(Boolean).length ?? 0);
		if (!s.bumpersLit) return `Roll A·B·C·D to light the bumpers · ${left} to go`;
		return `Roll A·B·C·D again to light the special · ${left} to go`;
	},
	goals(g) {
		const s = g.s;
		return [
			{ label: 'Bumpers', value: s.bumpersLit ? '1,000' : '100', hot: s.bumpersLit },
			{ label: 'Kick-out', value: n(3_000 * s.kick) },
			{ label: 'Specials', value: `${s.specials}`, hot: s.special }
		];
	},
	lights(g, blink) {
		const s = g.s;
		const L: Lights = {};
		g.lanes.abcd?.forEach((on, i) => (L[`lane${i}`] = on ? 1 : 0));
		L.bumpers = s.bumpersLit ? 1 : 0;
		for (let k = 1; k <= 5; k += 1) L[`kick${k}`] = s.kick === k ? 1 : 0;
		L.special = s.special && blink(2.5) ? 1 : 0;
		L.sideL = s.sides[0] ? 1 : 0;
		L.sideR = s.sides[1] ? 1 : 0;
		L.double = g.mult >= 2 ? 1 : 0;
		L.triple = g.mult >= 3 ? 1 : 0;
		for (let k = 1; k <= 10; k += 1) L[`bonus${k}`] = g.bonus >= k ? 1 : 0;
		L.again = g.extra > 0 ? 1 : 0;
		return L;
	}
};

export const woodrailHot = (g: G) => g.s.special;
