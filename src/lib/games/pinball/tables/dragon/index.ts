import { bell, hz, lead, sweep, swell } from '../../sound/synth';
import { run } from '../../sound/sfx';
import type { Bar } from '../../sound/score';
import type { TableSpec } from '../spec';
import { dragonArt } from './art';
import { dragonHot, dragonRules, type DragonState } from './rules';

const DM = [62, 65, 69];
const C = [60, 64, 67];
const G = [55, 59, 62];
const AM = [57, 60, 64];
const F = [57, 60, 65];
const A = [57, 61, 64];

/** A D dorian ballad in three, horn over a plucked bass, and a march that rides out to battle. */
const BALLAD: Bar[] = [
	{ chord: DM, root: 38, tune: [74, null, 72, 74, null, 77] },
	{ chord: C, root: 36, tune: [76, null, 72, 67, null, null] },
	{ chord: DM, root: 38, tune: [69, null, 74, 77, null, 81] },
	{ chord: G, root: 43, tune: [79, null, 77, 74, null, 71] },
	{ chord: F, root: 41, tune: [72, null, 77, 81, null, 79] },
	{ chord: C, root: 36, tune: [76, null, 79, 84, null, 79] },
	{ chord: AM, root: 45, tune: [76, null, 72, 69, null, 72] },
	{ chord: DM, root: 38, tune: [74, null, null, 0, null, null] }
];
const MARCH: Bar[] = [
	{ chord: F, root: 41, tune: [81, null, null, 84, null, 81] },
	{ chord: G, root: 43, tune: [79, null, null, 83, null, 79] },
	{ chord: A, root: 45, tune: [76, null, 73, 69, null, 73] },
	{ chord: DM, root: 38, tune: [74, null, 77, 81, null, null] }
];

const BACKDROP = `
vec3 scene(vec2 s, float aspect, float t, float lights, float hot) {
  vec3 c = mix(vec3(0.16, 0.08, 0.1), vec3(0.03, 0.02, 0.06), smoothstep(-0.2, 0.5, s.y));
  c = mix(c, vec3(0.45, 0.1, 0.03), hot * smoothstep(0.3, -0.3, s.y) * 0.8);
  float cloud = fbm(vec2(s.x * 2.5 - t * 0.02, s.y * 4.0));
  c = mix(c, vec3(0.2, 0.12, 0.14) + hot * vec3(0.3, 0.08, 0.0), smoothstep(0.5, 0.8, cloud) * 0.6);

  vec2 mp = vec2(-0.32 * aspect, 0.32);
  float md = length(s - mp);
  c += vec3(1.0, 0.85, 0.7) * 0.05 / (1.0 + md * md * 260.0);
  c = mix(c, vec3(0.98, 0.9, 0.8), smoothstep(0.06, 0.055, md));

  float hill = -0.25 + fbm(vec2(s.x * 1.5, 1.0)) * 0.12;
  float castle = -0.12;
  float x = s.x / aspect;
  float towers = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float tx = 0.08 + fi * 0.09;
    float th = castle + 0.08 + 0.04 * mod(fi, 2.0);
    float tower = step(abs(x - tx), 0.022) * step(s.y, th) + step(abs(x - tx), 0.028) * step(s.y, th + 0.018) * step(th, s.y) * step(0.5, fract((x - tx) * 70.0));
    towers = max(towers, tower);
  }
  float wallTop = castle + 0.02 * step(0.5, fract(x * 60.0));
  float keep = step(0.06, x) * step(x, 0.36) * step(s.y, wallTop);
  float sil = max(max(keep, towers), step(s.y, hill));
  c = mix(c, vec3(0.02, 0.015, 0.02), sil);
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    vec2 wp = vec2((0.1 + fi * 0.05) * aspect, castle - 0.04 + 0.03 * mod(fi, 3.0));
    float wd = length(s - wp);
    float flick = 0.7 + 0.3 * sin(t * 5.0 + fi * 2.3);
    c += vec3(1.0, 0.65, 0.25) * smoothstep(0.006, 0.0, wd) * flick * lights;
  }

  float fly = t * 0.09;
  vec2 dp = vec2(sin(fly) * 0.45 * aspect, 0.2 + sin(fly * 2.0) * 0.06);
  vec2 q = s - dp;
  q.x *= sign(cos(fly));
  float flap = sin(t * 4.0) * 0.5;
  float body = length(q * vec2(1.0, 3.0)) - 0.03;
  float wing = max(abs(q.x) - 0.09, abs(q.y - abs(q.x) * flap - 0.01) - 0.012 - (0.09 - abs(q.x)) * 0.2);
  float neck = length(vec2(q.x - 0.04, (q.y - 0.01) * 2.5)) - 0.015;
  float dragon = min(min(body, wing), neck);
  c = mix(c, vec3(0.01, 0.0, 0.0), smoothstep(0.004, 0.0, dragon));
  vec2 fp = q - vec2(0.06, 0.0);
  float flame = hot * smoothstep(0.08, 0.0, length(fp * vec2(0.6, 2.4))) * step(0.0, fp.x);
  c += vec3(1.0, 0.45, 0.1) * flame * (0.6 + 0.4 * sin(t * 20.0));
  return c;
}
`;

export const dragon: TableSpec<DragonState> = {
	meta: {
		id: 'dragon',
		name: 'Dragon\u2019s Keep',
		kicker: 'Fantasy',
		lede: 'Batter down the portcullis, siege the keep, and climb the tower to a raised deck where the dragon waits.',
		year: 'Modern',
		skin: {
			bg: '#120e0c',
			panel: 'rgba(24, 16, 12, 0.88)',
			ink: '#fff0d8',
			muted: '#c8b8a0',
			accent: '#ffb84a',
			hot: '#ff3a2a',
			display: '"Uncial Antiqua", Georgia, serif',
			font: 'Uncial Antiqua'
		},
		words: { ready: 'To arms', over: 'The keep has fallen', paused: 'Truce' },
		guide: {
			how: [
				'The tower ramp lifts the ball onto the deck at the top, where the dragon prowls. The deck has its own flipper on the right button; slay the dragon for a big award and an extra ball.',
				'Batter the portcullis to smash it, then lock a ball in the keep. Two locks start Siege multiball: jackpots on both ramps, both orbits and the dragon, then a super jackpot in the keep.',
				'Every three bridge ramps ready a quest up the tower. Six quests light Dragonfire, where every shot is a jackpot.',
				'Hit both hoard targets on the deck to raise the bonus multiplier.'
			],
			tips: [
				'Balls off the deck drop into the lair and ride a wire back to the right inlane: be ready on the right flipper.',
				'The dragon grows tougher every time it is slain, and the gate is rebuilt stronger.',
				'The bridge ramp relights the kickback.'
			]
		},
		backdrop: BACKDROP
	},
	rules: dragonRules,
	art: dragonArt,
	score: {
		layers: 'pinball-dragon',
		step: 0.19,
		steps: 6,
		sections: [{ bars: BALLAD }, { bars: MARCH }, { bars: BALLAD, lead: 'reed' }, { bars: MARCH, quiet: true }],
		lead: { voice: 'horn', level: 0.026 },
		bass: { voice: 'pluck', level: 0.07, pattern: 'R..5..' },
		comp: { voice: 'strum', level: 0.014, pattern: 'x.x.x.' },
		drums: { level: 0.045, tom: 'x....x', block: '..x...' },
		scale: [74, 76, 77, 79, 81, 83, 84, 86]
	},
	sfx: {
		key: 50,
		minor: true,
		voice: 'horn',
		bumper: 'clank',
		bumperNotes: [74, 77, 81],
		ramp: 'gallop',
		drain: 'boom',
		toy: 'roar',
		cues: {
			/** Timber and iron giving way. */
			smash(k) {
				sweep(k, 'square', 180, 40, k.t, 0.05, 0.002, 0.35);
				sweep(k, 'triangle', 600, 120, k.t + 0.05, 0.04, 0.002, 0.5);
				for (let i = 0; i < 3; i += 1) bell(k, hz(45 + i * 3), k.t + 0.2 + i * 0.08, 0.03, 0.6);
			},
			roar(k) {
				swell(k, 'sawtooth', 110, 55, k.t, 0.05, 0.8, 0.25, 11);
			},
			slay(k) {
				swell(k, 'sawtooth', 140, 30, k.t, 0.06, 1.4, 0.3, 9);
				run(k, 9, k.t + 1.0, 0.09, 0.04, 0, 'horn');
				lead(k, 'horn', 86, k.t + 1.9, 1.2, 0.035);
			},
			lock(k, n = 1) {
				sweep(k, 'square', 220, 60, k.t, 0.04, 0.002, 0.3);
				for (let i = 0; i < n; i += 1) lead(k, 'horn', 62 + i * 7, k.t + 0.35 + i * 0.25, 0.3, 0.035);
			},
			multiball(k) {
				for (let i = 0; i < 3; i += 1) lead(k, 'horn', [62, 69, 74][i]!, k.t + i * 0.22, 0.3, 0.04);
				run(k, 9, k.t + 0.9, 0.08, 0.04, 0, 'horn');
			},
			wizard(k) {
				swell(k, 'sawtooth', 70, 35, k.t, 0.07, 2, 0.3, 8);
				run(k, 12, k.t + 1.5, 0.07, 0.04, 0, 'horn');
				lead(k, 'horn', 86, k.t + 2.5, 1.6, 0.035);
			}
		}
	},
	hot: dragonHot,
	feat: { label: 'Dragons', of: (g) => g.s.slain }
};
