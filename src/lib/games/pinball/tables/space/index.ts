import { hz, lead, sweep, swell } from '../../sound/synth';
import { run } from '../../sound/sfx';
import type { Bar } from '../../sound/score';
import type { TableSpec } from '../spec';
import { spaceArt } from './art';
import { spaceHot, spaceRules, type SpaceState } from './rules';

const AM = [57, 60, 64];
const F = [53, 57, 60];
const C = [55, 60, 64];
const G = [55, 59, 62];

/** An A minor synth line over a driving octave bass, with a bridge that climbs to E. */
const A: Bar[] = [
	{ chord: AM, root: 45, tune: [69, null, 72, null, 76, null, 74, 72] },
	{ chord: F, root: 41, tune: [72, null, 69, null, 65, null, 67, 69] },
	{ chord: C, root: 48, tune: [67, null, 72, null, 76, null, 79, null] },
	{ chord: G, root: 43, tune: [74, null, null, null, 71, null, 74, null] },
	{ chord: AM, root: 45, tune: [69, 72, 76, 81, null, 79, 76, null] },
	{ chord: F, root: 41, tune: [77, null, 76, null, 72, null, 69, null] },
	{ chord: G, root: 43, tune: [71, null, 74, null, 79, null, 77, 76] },
	{ chord: AM, root: 45, tune: [76, null, null, null, 0, null, null, null] }
];
const B: Bar[] = [
	{ chord: [62, 65, 69], root: 50, tune: [74, null, 77, null, 81, null, 77, null] },
	{ chord: AM, root: 45, tune: [76, null, 72, null, 69, null, 72, null] },
	{ chord: F, root: 41, tune: [72, null, 77, null, 81, null, 84, null] },
	{ chord: [56, 59, 64], root: 40, tune: [80, null, null, null, 76, null, 71, null] }
];

const BACKDROP = `
vec3 scene(vec2 s, float aspect, float t, float lights, float hot) {
  vec3 c = mix(vec3(0.05, 0.02, 0.16), vec3(0.01, 0.005, 0.05), smoothstep(-0.2, 0.5, s.y));
  float neb = fbm(s * 3.0 + vec2(t * 0.01, 0.0));
  vec3 nebCol = mix(vec3(0.35, 0.15, 0.6), vec3(0.9, 0.2, 0.7), neb);
  nebCol = mix(nebCol, vec3(0.2, 0.9, 1.0), hot * 0.5);
  c += nebCol * smoothstep(0.45, 0.85, neb) * 0.35 * (0.7 + 0.3 * lights);

  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float speed = 0.01 + fk * 0.012;
    vec2 g = (s + vec2(t * speed, 0.0)) * (40.0 + fk * 30.0);
    vec2 cell = floor(g);
    float h = hash21(cell + fk * 17.0);
    if (h > 0.97) {
      vec2 o = vec2(hash21(cell + 2.0), hash21(cell + 5.0)) - 0.5;
      float d = length(fract(g) - 0.5 - o * 0.6);
      float tw = 0.6 + 0.4 * sin(t * (2.0 + h * 4.0) + h * 30.0);
      c += vec3(0.85, 0.9, 1.0) * smoothstep(0.1, 0.0, d) * tw * (0.5 + fk * 0.25);
    }
  }

  vec2 pc = vec2(0.32 * aspect, 0.18);
  float pd = length(s - pc);
  float pr = 0.16;
  if (pd < pr) {
    vec2 q = (s - pc) / pr;
    float band = sin(q.y * 14.0 + fbm(q * 3.0) * 3.0);
    vec3 pcol = mix(vec3(0.95, 0.55, 0.3), vec3(0.6, 0.2, 0.5), 0.5 + 0.5 * band);
    float shade = clamp(dot(normalize(vec3(q, sqrt(max(0.0, 1.0 - dot(q, q))))), normalize(vec3(-0.6, 0.5, 0.6))), 0.0, 1.0);
    c = pcol * (0.15 + 0.85 * shade);
  }
  vec2 rq = (s - pc) * mat2(0.95, -0.3, 0.3, 0.95);
  float ring = abs(length(rq * vec2(1.0, 3.6)) - pr * 1.6);
  if (!(pd < pr && rq.y > 0.0)) c += vec3(1.0, 0.85, 0.4) * smoothstep(0.012, 0.0, ring) * 0.5;

  float horizon = -0.18;
  if (s.y < horizon) {
    float depth = horizon - s.y;
    float z = 0.05 / max(depth, 0.001);
    float gx = abs(fract(s.x * z * 2.0) - 0.5);
    float gz = abs(fract(z - t * 0.8) - 0.5);
    float line = smoothstep(0.03 * z, 0.0, gx) + smoothstep(0.03 * z * 2.0, 0.0, gz);
    vec3 gridCol = mix(vec3(1.0, 0.25, 0.8), vec3(0.3, 0.95, 1.0), hot);
    c = mix(vec3(0.03, 0.0, 0.08), c, 0.2) + gridCol * line * 0.45 * lights * smoothstep(0.0, 0.25, depth);
  }
  vec2 sun = vec2(-0.3 * aspect, horizon + 0.08);
  float sd = length(s - sun);
  if (sd < 0.12 && s.y > horizon) {
    float slat = step(0.5, fract((s.y - horizon) * 40.0)) + step(0.06, s.y - horizon);
    c = mix(c, mix(vec3(1.0, 0.85, 0.3), vec3(1.0, 0.25, 0.6), 1.0 - (s.y - horizon) / 0.2), min(slat, 1.0));
  }
  c += mix(vec3(1.0, 0.3, 0.7), vec3(0.3, 1.0, 1.0), hot) * 0.02 / (abs(s.y - horizon) + 0.02) * 0.15 * lights;
  return c;
}
`;

export const space: TableSpec<SpaceState> = {
	meta: {
		id: 'space',
		name: 'Nova Patrol',
		kicker: '1984 solid state',
		lede: 'Big drop-target banks, an upper flipper and a computer that talks back. Fly six missions to go Supernova.',
		year: '1984',
		skin: {
			bg: '#08051f',
			panel: 'rgba(10, 6, 36, 0.88)',
			ink: '#e8f6ff',
			muted: '#a9b4e6',
			accent: '#4af2ff',
			hot: '#ff3fd2',
			display: 'Orbitron, "Barlow Condensed", sans-serif',
			font: 'Orbitron',
			caps: true
		},
		words: { ready: 'Systems ready', over: 'Mission over', paused: 'Holding orbit' },
		guide: {
			how: [
				'Knock down A·L·I·E·N to light a lock at the warp. Lock two balls for Star Storm multiball.',
				'In Star Storm, the orbit loop, the spinner, the U·F·O bank and the alien bank each light a jackpot. Collect them all for a super jackpot at the warp.',
				'Clear the U·F·O bank to ready a mission at the warp. Fly all six to light Supernova, where every shot is a jackpot.',
				'Loop the orbit for Hyperspace: every fifth loop lights an extra ball.',
				'Roll through S·T·R to raise the bonus multiplier; the flippers move the lit lanes.'
			],
			tips: [
				'Shoot the left orbit: the ball loops over the top and drops onto the upper flipper on the right.',
				'Let the ball roll out toward the upper flipper\u2019s tip before you flip, and it flies up into the U·F·O bank.',
				'Turn on Voice in Settings to hear the ship\u2019s computer.'
			]
		},
		backdrop: BACKDROP
	},
	rules: spaceRules,
	art: spaceArt,
	score: {
		layers: 'pinball-space',
		step: 0.15,
		steps: 8,
		sections: [{ bars: A }, { bars: B }, { bars: A }, { bars: B, quiet: true, drums: false }],
		lead: { voice: 'square', level: 0.022 },
		bass: { voice: 'synth', level: 0.07, pattern: 'R.ORR.O5' },
		comp: { voice: 'arp', level: 0.012, pattern: 'xxxxxxxx' },
		drums: { level: 0.05, kick: 'x...x...', snap: '..x...x.', tick: '.x.x.x.x' },
		scale: [69, 71, 72, 74, 76, 77, 79, 81]
	},
	sfx: {
		key: 57,
		minor: true,
		voice: 'square',
		bumper: 'zap',
		bumperNotes: [81, 84, 88],
		ramp: 'whoosh',
		drain: 'fall',
		toy: 'zap',
		speech: { pitch: 0.15, rate: 0.92 },
		cues: {
			lock(k, n = 1) {
				sweep(k, 'square', 200, 1600, k.t, 0.025, 0.01, 0.4);
				for (let i = 0; i < n; i += 1) lead(k, 'square', 69 + i * 7, k.t + 0.45 + i * 0.2, 0.18, 0.03);
			},
			multiball(k) {
				for (let i = 0; i < 3; i += 1) sweep(k, 'square', 300, 1800, k.t + i * 0.35, 0.025, 0.01, 0.3);
				run(k, 9, k.t + 1.1, 0.07, 0.035, 0, 'square');
			},
			wizard(k) {
				swell(k, 'sawtooth', 60, 400, k.t, 0.04, 2.2, 0.05, 6);
				run(k, 12, k.t + 1.4, 0.06, 0.035, 0, 'square');
				lead(k, 'glass', 93, k.t + 2.2, 1.6, 0.03);
			},
			saved(k) {
				[0, 7, 12, 19].forEach((d, i) => lead(k, 'square', 69 + d, k.t + i * 0.06, 0.1, 0.025));
			},
			lit(k) {
				sweep(k, 'sine', hz(81), hz(93), k.t, 0.03, 0.005, 0.15);
				sweep(k, 'sine', hz(88), hz(100), k.t + 0.1, 0.025, 0.005, 0.15);
			}
		}
	},
	hot: spaceHot,
	feat: { label: 'Jackpots', of: (g) => g.s.jackpots }
};
