import { bell, drum, hz, lead, sweep, swell } from '../../sound/synth';
import { run } from '../../sound/sfx';
import type { Bar } from '../../sound/score';
import type { TableSpec } from '../spec';
import { pirateArt } from './art';
import { pirateHot, pirateRules, type PirateState } from './rules';

const DM = [62, 65, 69];
const C = [60, 64, 67];
const BB = [58, 62, 65];
const A7 = [57, 61, 64];
const F = [57, 60, 65];

/** A D minor shanty in six-eight: the verse rolls like a deck, the chorus hauls up to F. */
const A: Bar[] = [
	{ chord: DM, root: 38, tune: [74, null, 72, 69, null, 69] },
	{ chord: DM, root: 38, tune: [69, null, 72, 74, null, 77] },
	{ chord: C, root: 36, tune: [76, null, 74, 72, null, 67] },
	{ chord: C, root: 36, tune: [67, null, 69, 72, null, null] },
	{ chord: DM, root: 38, tune: [74, null, 72, 69, null, 72] },
	{ chord: BB, root: 34, tune: [74, null, 77, 74, null, 70] },
	{ chord: A7, root: 33, tune: [69, null, 73, 76, null, 73] },
	{ chord: DM, root: 38, tune: [74, null, null, 0, null, null] }
];
const B: Bar[] = [
	{ chord: F, root: 41, tune: [72, null, 77, 81, null, 77] },
	{ chord: C, root: 36, tune: [79, null, 76, 72, null, 76] },
	{ chord: DM, root: 38, tune: [77, null, 74, 69, null, 74] },
	{ chord: A7, root: 33, tune: [73, null, 76, 69, null, null] }
];

const BACKDROP = `
float wave(float x, float t, float k) {
  return sin(x * 9.0 * k + t * 1.1) * 0.012 + sin(x * 23.0 * k - t * 1.7) * 0.005;
}

vec3 scene(vec2 s, float aspect, float t, float lights, float hot) {
  vec3 sky = mix(vec3(0.05, 0.12, 0.2), vec3(0.01, 0.03, 0.07), smoothstep(-0.05, 0.5, s.y));
  sky = mix(sky, vec3(0.25, 0.08, 0.04), hot * smoothstep(0.2, -0.1, s.y) * 0.7);
  vec3 c = sky;
  float cloud = fbm(vec2(s.x * 2.0 + t * 0.015, s.y * 5.0));
  c = mix(c, vec3(0.08, 0.13, 0.18), smoothstep(0.45, 0.75, cloud) * 0.8);

  vec2 mp = vec2(0.28 * aspect, 0.3);
  float md = length(s - mp);
  c += vec3(0.9, 0.95, 1.0) * 0.06 / (1.0 + md * md * 300.0);
  c = mix(c, vec3(0.95, 0.93, 0.85), smoothstep(0.055, 0.05, md));

  float sea = -0.05;
  if (s.y < sea + wave(s.x, t, 1.0)) {
    float depth = sea - s.y;
    vec3 water = mix(vec3(0.03, 0.12, 0.17), vec3(0.01, 0.04, 0.07), smoothstep(0.0, 0.45, depth));
    float glint = pow(max(0.0, 1.0 - abs(s.x - mp.x) * 3.0), 3.0) * step(0.6, fract(s.y * 60.0 + sin(s.x * 40.0 + t) * 0.5)) * smoothstep(0.4, 0.0, depth);
    water += vec3(0.8, 0.85, 0.9) * glint * 0.35;
    water += vec3(1.0, 0.45, 0.15) * hot * smoothstep(0.3, 0.0, depth) * 0.15;
    float foam = smoothstep(0.004, 0.0, abs(s.y - sea - wave(s.x, t, 1.0)));
    c = water + vec3(0.6, 0.8, 0.85) * foam * 0.3;
  }

  vec2 sp = vec2(-0.3 * aspect + sin(t * 0.05) * 0.05, sea + 0.01);
  vec2 q = s - sp;
  q.y -= sin(t * 0.8) * 0.004;
  float tilt = sin(t * 0.7) * 0.04;
  q = mat2(cos(tilt), -sin(tilt), sin(tilt), cos(tilt)) * q;
  float hull = max(abs(q.x) - 0.14 + q.y * 0.6, abs(q.y + 0.015) - 0.025);
  float masts = min(min(abs(q.x + 0.06), abs(q.x - 0.0)), abs(q.x - 0.07)) - 0.003;
  masts = max(masts, max(-q.y, q.y - 0.2));
  float sails = 1.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 sq = q - vec2(-0.06 + fi * 0.065, 0.09 + 0.02 * mod(fi, 2.0));
    sails = min(sails, max(abs(sq.x) - 0.026 + sq.y * 0.12, abs(sq.y) - 0.045));
  }
  float ship = min(min(hull, masts), sails);
  c = mix(c, vec3(0.01, 0.02, 0.03), smoothstep(0.003, 0.0, ship));
  for (int i = 0; i < 4; i++) {
    vec2 lp = sp + vec2(-0.09 + float(i) * 0.06, -0.012);
    float ld = length(s - lp);
    float flick = 0.8 + 0.2 * sin(t * 9.0 + float(i) * 2.0);
    c += vec3(1.0, 0.7, 0.3) * 0.0004 / (ld * ld + 0.0002) * flick * lights;
  }
  float flash = hot * step(0.92, fract(t * 0.6)) * step(0.5, hash21(vec2(floor(t * 0.6), 3.0)));
  c += vec3(1.0, 0.6, 0.3) * flash * 0.004 / (length(s - sp - vec2(0.15, 0.0)) + 0.01);
  float bolt = hot * step(0.97, fract(t * 0.23)) * smoothstep(0.003, 0.0, abs(s.x - 0.1 * aspect - sin(s.y * 30.0) * 0.02)) * step(0.0, s.y);
  c += vec3(0.8, 0.9, 1.0) * bolt;
  return c;
}
`;

export const pirate: TableSpec<PirateState> = {
	meta: {
		id: 'pirate',
		name: 'Dead Man\u2019s Tide',
		kicker: 'Modern pirate',
		lede: 'Fire on the galleon until she sinks, plunder the wreck, and sail six voyages to Davy Jones\u2019 Locker.',
		year: 'Modern',
		skin: {
			bg: '#061a26',
			panel: 'rgba(6, 26, 38, 0.88)',
			ink: '#f4e6c4',
			muted: '#b9c8c4',
			accent: '#ffcf5a',
			hot: '#ff4a3a',
			display: '"Pirata One", Georgia, serif',
			font: 'Pirata One'
		},
		words: { ready: 'Weigh anchor', over: 'Lost at sea', paused: 'Becalmed' },
		guide: {
			how: [
				'Three flippers: the usual pair, plus a gunwale flipper halfway up the left wall. Balls fed down the left lane land on it; fire it across at the ship, the map and the chest.',
				'The galleon sails the top left. Hit her enough times and she sinks, opening the wreck. The mast is the scoop in the middle: it hoists the ball up to the crow\u2019s nest and drops it into the rum lanes.',
				'The treasure chest is a captive ball on a track: smash it four times to burst it open for a big award and a higher bonus multiplier.',
				'Shoot the wreck to start Plunder multiball: jackpots on the plank, the mast, the orbit and the chest, then a super jackpot at the cove.',
				'Every three plank or mast shots ready a voyage at the cove: six modes, from Walk the Plank to Mutiny. Sail all six to light Davy Jones\u2019 Locker, where every shot is a jackpot.',
				'Knock down M·A·P twice to light an extra ball at the cove. Roll through R·U·M to raise the bonus multiplier.'
			],
			tips: [
				'Each time the ship sinks, she comes back with a tougher hull.',
				'The mast relights the kickback in the left outlane.',
				'The plank ramp is up the right; the chest and the map are cleanest from the gunwale flipper.',
				'Round the Horn: the right orbit loops over the top and down the left lane, right back onto the gunwale flipper.'
			]
		},
		backdrop: BACKDROP
	},
	rules: pirateRules,
	art: pirateArt,
	score: {
		layers: 'pinball-pirate',
		step: 0.2,
		steps: 6,
		sections: [{ bars: A }, { bars: B }, { bars: A }, { bars: B, lead: 'reed', quiet: true }],
		lead: { voice: 'whistle', level: 0.026 },
		bass: { voice: 'pluck', level: 0.07, pattern: 'R..5..' },
		comp: { voice: 'strum', level: 0.016, pattern: 'x..x-.' },
		drums: { level: 0.04, tom: 'x..x..', block: '..x..x' },
		scale: [74, 76, 77, 79, 81, 82, 84, 86]
	},
	sfx: {
		key: 50,
		minor: true,
		voice: 'whistle',
		bumper: 'clank',
		bumperNotes: [74, 77, 81],
		ramp: 'whoosh',
		drain: 'sink',
		toy: 'creak',
		cues: {
			/** Cannon fire, timbers, and a bell tolling her down. */
			sink(k) {
				for (let i = 0; i < 3; i += 1) sweep(k, 'sine', 140, 35, k.t + i * 0.25, 0.16, 0.002, 0.4);
				swell(k, 'triangle', 90, 60, k.t + 0.8, 0.04, 1.2, 0.2, 5);
				for (let i = 0; i < 3; i += 1) bell(k, hz(57), k.t + 1.4 + i * 0.6, 0.05, 1.8);
			},
			multiball(k) {
				for (let i = 0; i < 6; i += 1) sweep(k, 'sine', 150, 35, k.t + i * 0.16, 0.14, 0.002, 0.35);
				run(k, 9, k.t + 1.1, 0.08, 0.04, 0, 'whistle');
			},
			wizard(k) {
				swell(k, 'sine', 60, 40, k.t, 0.08, 2, 0.1, 3);
				for (let i = 0; i < 8; i += 1) bell(k, hz(i % 2 ? 50 : 45), k.t + i * 0.3, 0.05, 1.6);
				run(k, 9, k.t + 2.4, 0.08, 0.04, 0, 'reed');
			},
			/** A block and tackle hauling the ball up the mast, then the lookout's bell. */
			hoist(k) {
				for (let i = 0; i < 6; i += 1) drum(k, 'block', k.t + i * 0.11, 0.08, i * 2);
				bell(k, hz(81), k.t + 0.75, 0.05, 1.2);
			},
			/** The lid flying off and pieces of eight spilling out. */
			treasure(k) {
				drum(k, 'block', k.t, 0.1, 0);
				for (let i = 0; i < 10; i += 1) bell(k, hz(84 + ((i * 5) % 12)), k.t + 0.08 + i * 0.06, 0.025, 0.5);
				run(k, 5, k.t + 0.8, 0.07, 0.04, 0, 'whistle');
			},
			modeStart(k) {
				lead(k, 'horn', 62, k.t, 0.3, 0.04);
				lead(k, 'horn', 69, k.t + 0.3, 0.6, 0.04);
			}
		}
	},
	hot: pirateHot,
	feat: { label: 'Jackpots', of: (g) => g.s.jackpots }
};
