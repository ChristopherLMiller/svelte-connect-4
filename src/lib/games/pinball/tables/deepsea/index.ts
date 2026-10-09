import { hz, lead, sweep, swell } from '../../sound/synth';
import { run } from '../../sound/sfx';
import type { Bar } from '../../sound/score';
import type { TableSpec } from '../spec';
import { deepseaArt } from './art';
import { deepseaHot, deepseaRules, type DeepseaState } from './rules';

const EM = [64, 67, 71];
const C = [60, 64, 67];
const AM = [57, 60, 64];
const B = [59, 63, 66];
const G = [55, 59, 62];
const D = [62, 66, 69];

/** A slow E minor theme on glass over a sub bass, drifting like something huge below. */
const VERSE: Bar[] = [
	{ chord: EM, root: 40, tune: [76, null, null, 79, null, null, 83, null] },
	{ chord: C, root: 36, tune: [84, null, 83, null, 79, null, null, null] },
	{ chord: AM, root: 45, tune: [81, null, null, 76, null, null, 72, null] },
	{ chord: B, root: 47, tune: [75, null, null, 78, null, null, 83, null] },
	{ chord: EM, root: 40, tune: [76, null, 79, null, 83, null, 88, null] },
	{ chord: C, root: 36, tune: [84, null, 83, null, 79, null, 76, null] },
	{ chord: AM, root: 45, tune: [72, null, 76, null, 81, null, 79, 78] },
	{ chord: B, root: 47, tune: [75, null, null, null, 71, null, null, null] }
];
const BRIDGE: Bar[] = [
	{ chord: G, root: 43, tune: [79, null, 83, null, 86, null, 83, null] },
	{ chord: D, root: 38, tune: [81, null, 78, null, 74, null, 78, null] },
	{ chord: C, root: 36, tune: [76, null, 79, null, 84, null, 83, null] },
	{ chord: B, root: 47, tune: [78, null, 75, null, 71, null, null, null] }
];

const BACKDROP = `
vec3 scene(vec2 s, float aspect, float t, float lights, float hot) {
  float depth = clamp(0.5 - s.y, 0.0, 1.2);
  vec3 c = mix(vec3(0.04, 0.22, 0.3), vec3(0.0, 0.02, 0.06), smoothstep(0.0, 1.0, depth));
  c = mix(c, vec3(0.12, 0.02, 0.08), hot * smoothstep(0.3, 1.0, depth) * 0.8);

  for (int k = 0; k < 4; k++) {
    float fk = float(k);
    float x = (fk - 1.5) * 0.35 * aspect + sin(t * 0.07 + fk) * 0.05;
    float ray = smoothstep(0.08, 0.0, abs(s.x - x - (0.5 - s.y) * 0.25));
    c += vec3(0.3, 0.7, 0.8) * ray * smoothstep(-0.4, 0.5, s.y) * 0.06;
  }

  for (int k = 0; k < 2; k++) {
    float fk = float(k);
    vec2 g = (s + vec2(sin(t * 0.05 + fk) * 0.05, t * (0.01 + fk * 0.008))) * (25.0 + fk * 20.0);
    vec2 cell = floor(g);
    float h = hash21(cell + fk * 11.0);
    if (h > 0.93) {
      vec2 o = vec2(hash21(cell + 3.0), hash21(cell + 9.0)) - 0.5;
      float d = length(fract(g) - 0.5 - o * 0.6);
      float pulse = 0.5 + 0.5 * sin(t * (1.0 + h * 2.0) + h * 40.0);
      vec3 col = mix(vec3(0.3, 1.0, 0.8), vec3(0.7, 0.45, 1.0), step(0.965, h));
      c += col * smoothstep(0.12, 0.0, d) * pulse * (0.4 + 0.4 * lights);
    }
  }

  vec2 ep = vec2(0.0, -0.32);
  vec2 q = (s - ep) * vec2(1.0, 2.2);
  float open = 0.15 + hot * 0.85;
  float lid = length(q);
  float eye = smoothstep(0.17, 0.16, lid) * smoothstep(0.0, 0.02, open * 0.17 - abs(q.y) * 1.0 + 0.0);
  vec3 iris = mix(vec3(0.9, 0.7, 0.1), vec3(1.0, 0.25, 0.3), hot);
  float pupil = smoothstep(0.02, 0.012, abs(q.x + sin(t * 0.3) * 0.03));
  c = mix(c, iris * (0.5 + 0.5 * lights) * (1.0 - pupil), eye * (0.25 + 0.75 * hot));

  float floorY = -0.42 + fbm(vec2(s.x * 3.0, 0.0)) * 0.08;
  if (s.y < floorY) c = mix(c, vec3(0.03, 0.04, 0.05), 0.85);
  for (int k = 0; k < 5; k++) {
    float fk = float(k);
    float x = (fk - 2.0) * 0.28 * aspect;
    float sway = sin(t * 0.6 + fk * 1.7 + s.y * 6.0) * 0.02;
    float stalk = smoothstep(0.012, 0.0, abs(s.x - x - sway)) * step(s.y, floorY + 0.2 + hash21(vec2(fk, 1.0)) * 0.2) * step(floorY - 0.05, s.y);
    c = mix(c, vec3(0.05, 0.25, 0.15), stalk * 0.8);
  }
  return c;
}
`;

export const deepsea: TableSpec<DeepseaState> = {
	meta: {
		id: 'deepsea',
		name: 'The Abyss',
		kicker: 'Deep sea',
		lede: 'Open water and a whirlpool in the middle: wake the kraken beyond it, let it grab the ball, and dive six times into the Deep.',
		year: 'Modern',
		skin: {
			bg: '#030c1c',
			panel: 'rgba(4, 16, 30, 0.88)',
			ink: '#e6f6ff',
			muted: '#9ec4cc',
			accent: '#5affc8',
			hot: '#ff5a8a',
			display: 'Cinzel, Georgia, serif',
			font: 'Cinzel',
			caps: true
		},
		words: { ready: 'Dive', over: 'Lost to the deep', paused: 'Drifting' },
		guide: {
			how: [
				'A whirlpool turns in the middle of the table and drags every ball that crosses it. Each time it carries the ball half way round, it scores.',
				'The kraken lurks at the top, beyond the whirlpool. Hit it to wake it, then hit it again and it grabs the ball and flings it back. When it wakes, the whirlpool turns the other way.',
				'There are no orbit walls: a ball sent up either side sweeps over the top and down the other side.',
				'The trench is the scoop on the left: its tunnel runs under the table and comes out at the top right. The vent is the only ramp, on the right, and the grotto hides above it.',
				'Two grabs start Kraken Attack multiball: jackpots on the trench, the vent, both sides and the kraken, then a super jackpot at the grotto. The whirlpool speeds up.',
				'Every three trench or vent shots ready a dive at the grotto. Six dives light The Deep, where every shot is a jackpot.',
				'Rip the spinner to light the undertow: the next ball into the eye of the whirlpool is caught by the magnet and thrown.',
				'Every sixth whirl or trip over the top lights an extra ball at the grotto.'
			],
			tips: [
				'The kraken sleeps lighter each time it wakes: it takes more hits to rouse it again.',
				'All three pearls, up the right side, raise the bonus multiplier or add a ball during Kraken Attack.',
				'A slow ball across the whirlpool gets thrown sideways. Hit the kraken hard and straight.',
				'The vent ramp and S·E·A both relight the kickback.'
			]
		},
		backdrop: BACKDROP
	},
	rules: deepseaRules,
	art: deepseaArt,
	score: {
		layers: 'pinball-deepsea',
		step: 0.22,
		steps: 8,
		sections: [{ bars: VERSE }, { bars: BRIDGE }, { bars: VERSE, lead: 'harp' }, { bars: BRIDGE, quiet: true, drums: false }],
		lead: { voice: 'glass', level: 0.024 },
		bass: { voice: 'sub', level: 0.08, pattern: 'R...R.5.' },
		comp: { voice: 'pad', level: 0.014, pattern: 'x-------' },
		drums: { level: 0.035, kick: 'x.......', tom: '......x.', tick: '..x...x.' },
		scale: [76, 78, 79, 81, 83, 84, 86, 88]
	},
	sfx: {
		key: 52,
		minor: true,
		voice: 'glass',
		bumper: 'bubble',
		bumperNotes: [76, 79, 83],
		ramp: 'bubbles',
		drain: 'sink',
		toy: 'roar',
		cues: {
			/** A low growl as the arms close round the ball. */
			grab(k) {
				swell(k, 'sawtooth', 55, 40, k.t, 0.05, 1.2, 0.2, 9);
				sweep(k, 'sine', 300, 80, k.t, 0.05, 0.01, 0.5);
			},
			/** Bubbles rising as the ball drops into the dark. */
			trench(k) {
				sweep(k, 'sine', hz(64), hz(40), k.t, 0.05, 0.01, 0.8);
				for (let i = 0; i < 5; i += 1) sweep(k, 'sine', hz(79 + i * 2), hz(86 + i * 2), k.t + 0.25 + i * 0.09, 0.025, 0.005, 0.07);
			},
			/** A falling glass swirl as the whirlpool carries the ball round. */
			whirl(k) {
				for (let i = 0; i < 4; i += 1) lead(k, 'glass', 88 - i * 3, k.t + i * 0.06, 0.18, 0.018);
				sweep(k, 'sine', hz(71), hz(59), k.t, 0.03, 0.02, 0.4);
			},
			undertow(k) {
				sweep(k, 'sine', hz(76), hz(52), k.t, 0.05, 0.02, 0.9);
				sweep(k, 'triangle', hz(83), hz(59), k.t + 0.1, 0.03, 0.02, 0.9);
			},
			multiball(k) {
				swell(k, 'sawtooth', 50, 35, k.t, 0.06, 1.4, 0.25, 7);
				run(k, 9, k.t + 1.0, 0.08, 0.035, 0, 'glass');
			},
			wizard(k) {
				swell(k, 'sine', 40, 30, k.t, 0.08, 2.4, 0.1, 2);
				run(k, 12, k.t + 1.6, 0.07, 0.035, 0, 'glass');
				lead(k, 'harp', 88, k.t + 2.6, 1.6, 0.03);
			},
			lit(k) {
				lead(k, 'glass', 83, k.t, 0.3, 0.03);
				lead(k, 'glass', 88, k.t + 0.12, 0.5, 0.03);
			}
		}
	},
	hot: deepseaHot,
	feat: { label: 'Jackpots', of: (g) => g.s.jackpots }
};
