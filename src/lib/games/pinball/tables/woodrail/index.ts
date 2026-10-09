import { bell, chime, hz, sweep } from '../../sound/synth';
import { run } from '../../sound/sfx';
import type { Bar } from '../../sound/score';
import type { TableSpec } from '../spec';
import { woodrailArt } from './art';
import { woodrailHot, woodrailRules, type WoodrailState } from './rules';

const BB6 = [58, 62, 65, 67];
const GM7 = [55, 58, 62, 65];
const CM7 = [55, 58, 60, 63];
const F7 = [57, 60, 63, 65];
const EBM7 = [55, 58, 62, 63];

/** A cocktail-lounge swing in B flat: I–vi–ii–V, then a bridge round the cycle of fifths. */
const A: Bar[] = [
	{ chord: BB6, root: 46, tune: [70, null, 74, 72] },
	{ chord: GM7, root: 43, tune: [70, 67, null, 65] },
	{ chord: CM7, root: 48, tune: [63, null, 67, 70] },
	{ chord: F7, root: 41, tune: [69, null, null, 0] },
	{ chord: BB6, root: 46, tune: [70, 72, 74, 77] },
	{ chord: EBM7, root: 51, tune: [75, null, 74, 70] },
	{ chord: CM7, root: 48, tune: [72, null, 70, 67] },
	{ chord: F7, root: 41, tune: [65, null, null, 0] }
];
const B: Bar[] = [
	{ chord: [54, 57, 60, 62], root: 50, tune: [66, null, 69, 72] },
	{ chord: [55, 59, 62, 65], root: 43, tune: [71, null, 67, null] },
	{ chord: [55, 58, 60, 64], root: 48, tune: [64, 67, 70, 72] },
	{ chord: F7, root: 41, tune: [69, null, 65, 0] }
];

const BACKDROP = `
float star8(vec2 p, float r) {
  float a = atan(p.y, p.x);
  float spikes = pow(abs(cos(a * 4.0)), 18.0);
  float d = length(p);
  return smoothstep(r * (0.15 + 0.85 * spikes), 0.0, d) * step(d, r);
}

vec3 scene(vec2 s, float aspect, float t, float lights, float hot) {
  vec3 wall = mix(vec3(0.07, 0.24, 0.24), vec3(0.03, 0.12, 0.13), smoothstep(-0.1, 0.5, s.y));
  float stripe = step(0.5, fract(s.x * 7.0));
  wall *= 0.92 + 0.08 * stripe;
  vec3 c = wall;

  vec2 g = s * vec2(5.0, 5.0);
  vec2 cell = floor(g);
  vec2 f = fract(g) - 0.5;
  float h = hash21(cell);
  if (h > 0.55 && s.y > -0.12) {
    vec2 o = (vec2(hash21(cell + 1.3), hash21(cell + 4.1)) - 0.5) * 0.4;
    float st = star8(f - o, 0.22 + 0.12 * h);
    vec3 col = h > 0.8 ? vec3(0.95, 0.42, 0.3) : vec3(0.95, 0.72, 0.2);
    c = mix(c, col * (0.5 + 0.2 * lights), st * 0.55);
  }

  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    vec2 lp = vec2((fi - 1.5) * 0.36 * aspect, 0.3 + 0.03 * sin(fi * 2.0));
    float cord = smoothstep(0.003, 0.0, abs(s.x - lp.x)) * step(lp.y, s.y);
    c = mix(c, vec3(0.02), cord * 0.8);
    float d = length(s - lp);
    float swing = 0.9 + 0.1 * sin(t * 2.0 + fi);
    vec3 lamp = mix(vec3(1.0, 0.75, 0.4), mix(vec3(1.0, 0.4, 0.3), vec3(0.3, 0.9, 0.8), mod(fi, 2.0)), hot);
    c += lamp * 0.012 / (d * d + 0.002) * 0.05 * lights * swing;
    c = mix(c, lamp * lights, smoothstep(0.035, 0.03, d));
  }

  float counter = -0.22;
  if (s.y < counter) {
    float grain = fbm(vec2(s.x * 3.0, s.y * 40.0));
    vec3 wood = mix(vec3(0.24, 0.12, 0.05), vec3(0.4, 0.22, 0.09), grain);
    c = wood * (0.6 + 0.4 * smoothstep(-0.5, counter, s.y));
    float edge = smoothstep(0.012, 0.0, abs(s.y - counter + 0.006));
    c += vec3(0.9, 0.7, 0.4) * edge * 0.4 * lights;
  }

  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    vec2 bp = vec2((fi - 0.5) * 0.9 * aspect, counter + 0.1);
    vec2 q = s - bp;
    float glass = max(abs(q.x) - 0.03 + q.y * 0.15, abs(q.y) - 0.07);
    c = mix(c, vec3(0.6, 0.8, 0.85) * 0.4 * lights, smoothstep(0.003, 0.0, glass) * 0.6);
    float olive = length(q - vec2(0.0, 0.02));
    c = mix(c, vec3(0.3, 0.5, 0.1), smoothstep(0.012, 0.008, olive));
  }
  return c;
}
`;

export const woodrail: TableSpec<WoodrailState> = {
	meta: {
		id: 'woodrail',
		name: 'Hi-Fi Holiday',
		kicker: '1962 woodrail',
		lede: 'Chimes, score reels and five balls. Spell A·B·C·D, light the bumpers, and shoot for the special.',
		year: '1962',
		skin: {
			bg: '#0f2a28',
			panel: 'rgba(15, 42, 40, 0.88)',
			ink: '#fff3d6',
			muted: '#bcd6cf',
			accent: '#f2b632',
			hot: '#f2664e',
			display: 'Lobster, Georgia, serif',
			font: 'Lobster'
		},
		words: { ready: 'Insert coin', over: 'Game over', paused: 'Intermission' },
		guide: {
			how: [
				'Five balls, no ramps, no modes: just a fast, bouncy playfield and a big score.',
				'Four flippers, like the machines of the day: a short pair at the bottom with a post between them, and a second pair halfway up the sides. Each button works both flippers on its side.',
				'Roll through A, B, C and D at the top. The first set lights the pop bumpers to score 1,000; the next lights the special.',
				'The kick-out hole scores 3,000 and climbs a step every time it catches the ball, up to 15,000.',
				'Shoot the kick-out hole while the special is lit: the first special earns an extra ball, after that 50,000.',
				'Hit both side targets for double bonus, and again for triple.'
			],
			tips: [
				'How hard you pull the plunger decides which top lane the ball drops into.',
				'The kick-out hole fires the ball back up into the bumpers. Keep your fingers ready.',
				'Balls running down the side walls roll onto the upper flippers: from there the opposite side target and the kick-out hole are easy shots.',
				'The gap at the bottom is wide. The centre post saves some balls, not all.',
				'The bonus counts up to ten on the apron, and the multiplier counts it twice or three times.'
			]
		},
		backdrop: BACKDROP,
		reels: true
	},
	rules: woodrailRules,
	art: woodrailArt,
	score: {
		layers: 'pinball-woodrail',
		step: 0.26,
		steps: 4,
		swing: 0.32,
		sections: [{ bars: A }, { bars: B }, { bars: A, lead: 'vibes', octave: 0 }, { bars: B, quiet: true }],
		lead: { voice: 'vibes', level: 0.03 },
		bass: { voice: 'upright', level: 0.08, pattern: 'R35W' },
		comp: { voice: 'organ', level: 0.012, pattern: '.x.-' },
		drums: { level: 0.035, tick: 'x-xx', snap: '.x.x' },
		sparkle: { voice: 'chime', chance: 0.12, level: 0.01, octave: 2 },
		scale: [70, 72, 74, 75, 77, 79, 81, 82]
	},
	sfx: {
		key: 58,
		minor: false,
		voice: 'vibes',
		bumper: 'clank',
		bumperNotes: [70, 74, 77],
		ramp: 'rise',
		drain: 'fall',
		toy: 'clang',
		chimes: true,
		cues: {
			/** The knocker, then a chime run. */
			special(k) {
				sweep(k, 'sine', 90, 40, k.t, 0.2, 0.002, 0.2);
				for (let i = 0; i < 6; i += 1) chime(k, [82, 79, 77, 74, 70, 82][i]!, k.t + 0.2 + i * 0.14, 0.05, 1.4);
			},
			extraBall(k) {
				sweep(k, 'sine', 90, 40, k.t, 0.2, 0.002, 0.2);
				run(k, 6, k.t + 0.2, 0.09, 0.04, 12, 'chime');
			},
			lit(k) {
				[0, 4, 7, 12].forEach((d, i) => bell(k, hz(70 + d), k.t + i * 0.08, 0.04, 0.9));
			}
		}
	},
	hot: woodrailHot,
	feat: { label: 'Specials', of: (g) => g.s.specials }
};
