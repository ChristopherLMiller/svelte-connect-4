import { bell, drum, hz, lead, sweep, swell } from '../../sound/synth';
import { run } from '../../sound/sfx';
import type { Bar } from '../../sound/score';
import type { TableSpec } from '../spec';
import { carnivalArt } from './art';
import { carnivalRules, type CarnivalState } from './rules';

/** D minor waltz: the A strain creeps, the B strain lifts into B flat before falling back. */
const A: Bar[] = [
	{ chord: [62, 65, 69], root: 38, tune: [62, 65, 69] },
	{ chord: [62, 65, 69], root: 38, tune: [74, null, 73] },
	{ chord: [61, 64, 67], root: 33, tune: [73, null, 76] },
	{ chord: [61, 64, 67], root: 33, tune: [79, 76, 73] },
	{ chord: [62, 67, 70], root: 31, tune: [70, null, 74] },
	{ chord: [62, 65, 69], root: 38, tune: [77, null, 74] },
	{ chord: [61, 64, 67], root: 33, tune: [73, 76, 69] },
	{ chord: [62, 65, 69], root: 38, tune: [74, null, null] }
];
const B: Bar[] = [
	{ chord: [62, 65, 70], root: 34, tune: [77, null, 74] },
	{ chord: [60, 65, 69], root: 29, tune: [72, null, 69] },
	{ chord: [62, 67, 70], root: 31, tune: [70, 74, 79] },
	{ chord: [61, 64, 67], root: 33, tune: [76, null, 73] },
	{ chord: [62, 65, 70], root: 34, tune: [74, 77, 81] },
	{ chord: [60, 65, 69], root: 29, tune: [81, null, 77] },
	{ chord: [62, 64, 67, 70], root: 31, tune: [76, 74, 70] },
	{ chord: [61, 64, 67], root: 33, tune: [73, null, 69] }
];

const BACKDROP = `
vec3 bulbColor(float i, float hot) {
  float k = mod(i, 3.0);
  vec3 c = k < 1.0 ? vec3(1.0, 0.86, 0.6) : (k < 2.0 ? vec3(1.0, 0.3, 0.35) : vec3(1.0, 0.7, 0.25));
  vec3 m = mod(i, 2.0) < 1.0 ? vec3(0.45, 1.0, 0.55) : vec3(0.75, 0.5, 1.0);
  return mix(c, m, hot);
}

vec3 scene(vec2 s, float aspect, float t, float lights, float hot) {
  vec3 c = mix(vec3(0.16, 0.05, 0.2), vec3(0.025, 0.01, 0.05), smoothstep(-0.35, 0.5, s.y));
  c = mix(c, c * vec3(0.6, 1.1, 0.75), hot * 0.6);

  vec2 sg = s * 90.0;
  vec2 cell = floor(sg);
  float star = hash21(cell);
  if (star > 0.985) {
    vec2 o = vec2(hash21(cell + 3.1), hash21(cell + 7.7)) - 0.5;
    float d = length(fract(sg) - 0.5 - o * 0.6);
    float tw = 0.6 + 0.4 * sin(t * (1.0 + star * 3.0) + star * 40.0);
    c += vec3(0.9, 0.85, 1.0) * smoothstep(0.12, 0.0, d) * tw * smoothstep(-0.2, 0.2, s.y);
  }

  vec2 mp = vec2(-0.3 * aspect, 0.29);
  float md = length(s - mp);
  c += vec3(1.0, 0.85, 0.7) * 0.08 / (1.0 + md * md * 260.0);
  float disc = smoothstep(0.072, 0.068, md);
  vec3 moon = mix(vec3(1.0, 0.93, 0.8), vec3(0.82, 0.74, 0.66), fbm((s - mp) * 22.0));
  c = mix(c, moon, disc);
  float cloud = smoothstep(0.5, 0.78, fbm(vec2(s.x * 2.4 + t * 0.012, s.y * 7.0)));
  c = mix(c, vec3(0.07, 0.03, 0.1), cloud * smoothstep(-0.05, 0.25, s.y) * 0.85);

  float ground = -0.36 + 0.015 * sin(s.x * 3.0);

  vec2 wc = vec2(0.34 * aspect, 0.02);
  float wr = 0.3;
  vec2 wp = s - wc;
  float wd = length(wp);
  vec3 sil = vec3(0.03, 0.012, 0.045);
  if (wd < wr + 0.06 || (s.y < wc.y && abs(s.x - wc.x) < 0.25)) {
    float rot = t * 0.05;
    float a = atan(wp.y, wp.x) + rot;
    float rim = abs(wd - wr) - 0.005;
    float inner = abs(wd - wr * 0.86) - 0.003;
    float spokes = abs(sin(a * 8.0)) * wd - 0.003;
    float frame = min(min(rim, inner), wd < wr ? spokes : 1.0);
    frame = min(frame, wd - 0.025);
    float legs = min(segment(s, wc, vec2(wc.x - 0.2, ground)), segment(s, wc, vec2(wc.x + 0.2, ground))) - 0.006;
    frame = min(frame, legs);
    c = mix(c, sil, smoothstep(0.003, 0.0, frame));
    for (int i = 0; i < 12; i++) {
      float ga = float(i) / 12.0 * 6.28318 - rot;
      vec2 gp = wc + vec2(cos(ga), sin(ga)) * wr + vec2(0.0, -0.028);
      vec2 q = s - gp;
      q.x += sin(t * 0.9 + float(i)) * 0.002;
      float cab = max(abs(q.x) - 0.016, abs(q.y) - 0.012);
      c = mix(c, sil, smoothstep(0.002, 0.0, cab));
    }
    float n = 36.0;
    float id = floor(a / 6.28318 * n + 0.5);
    float ba = (id / n) * 6.28318 - rot;
    vec2 bp = wc + vec2(cos(ba), sin(ba)) * wr;
    float bd = length(s - bp);
    float chase = 0.35 + 0.65 * step(0.5, fract((id - t * 6.0) / 4.0));
    c += bulbColor(id, hot) * (0.0016 / (bd * bd + 0.0004)) * 0.05 * chase * lights;
  }

  vec2 tc = vec2(-0.36 * aspect, ground);
  vec2 tp = s - tc;
  if (abs(tp.x) < 0.36 && tp.y < 0.42 && tp.y > -0.02) {
    float wall = max(abs(tp.x) - 0.3, tp.y - 0.17);
    float roof = max(tp.y - 0.17 - (0.3 - abs(tp.x)) * 0.62, -(tp.y - 0.12));
    roof = max(roof, abs(tp.x) - 0.32);
    float flag = segment(tp, vec2(0.0, 0.355), vec2(0.0, 0.41)) - 0.003;
    float tent = min(min(wall, roof), flag);
    float stripe = step(0.5, fract(atan(tp.x, 0.42 - tp.y) * 9.0));
    vec3 canvas = mix(vec3(0.06, 0.015, 0.04), vec3(0.11, 0.02, 0.05), stripe);
    canvas += vec3(0.25, 0.08, 0.02) * smoothstep(0.2, 0.0, abs(tp.x)) * smoothstep(0.2, 0.0, tp.y) * 0.5 * lights;
    c = mix(c, canvas, smoothstep(0.003, 0.0, tent));
    float door = max(abs(tp.x) - 0.03 + tp.y * 0.08, tp.y - 0.13);
    float flicker = 0.85 + 0.15 * sin(t * 13.0) * sin(t * 7.3);
    c = mix(c, vec3(1.0, 0.62, 0.25) * flicker * lights, smoothstep(0.003, 0.0, door) * step(0.0, tp.y));
    float eid = floor((tp.x + 0.3) / 0.04 + 0.5);
    vec2 ep = vec2(-0.3 + eid * 0.04, 0.17);
    if (abs(ep.x) <= 0.3) {
      float ed = length(tp - ep);
      c += bulbColor(eid, hot) * (0.0008 / (ed * ed + 0.0003)) * 0.05 * lights * (0.5 + 0.5 * step(0.5, fract(eid * 0.5 + t * 1.5)));
    }
  }

  if (s.y < ground) c = mix(vec3(0.02, 0.01, 0.03), vec3(0.06, 0.02, 0.07), smoothstep(-0.5, ground, s.y));
  float fog = fbm(vec2(s.x * 2.2 - t * 0.03, s.y * 6.0 + t * 0.02)) * smoothstep(-0.05, -0.45, s.y);
  vec3 fogTint = mix(vec3(0.45, 0.32, 0.55), vec3(0.4, 0.7, 0.45), hot);
  c = mix(c, fogTint * (0.35 + 0.25 * lights), fog * 0.55);

  for (int k = 0; k < 2; k++) {
    float fk = float(k);
    float y0 = 0.43 - fk * 0.07;
    float sag = 0.06 + fk * 0.02;
    float span = aspect * 0.5 + 0.05;
    float xn = s.x / span;
    float cy = y0 - sag * (1.0 - xn * xn) + sin(t * 0.6 + fk) * 0.004;
    c = mix(c, vec3(0.02, 0.01, 0.02), smoothstep(0.0025, 0.0, abs(s.y - cy)));
    float id = floor(s.x / 0.055 + 0.5);
    float bx = id * 0.055;
    float bxn = bx / span;
    vec2 bp = vec2(bx, y0 - sag * (1.0 - bxn * bxn) - 0.012);
    float bd = length(s - bp);
    float dead = step(0.88, hash21(vec2(id, fk + floor(t * 0.25 + hash21(vec2(id, fk)) * 4.0))));
    float on = (1.0 - dead) * (0.7 + 0.3 * sin(t * 3.0 + id));
    c += bulbColor(id + fk, hot) * (0.0006 / (bd * bd + 0.0002)) * 0.05 * on * lights;
    c = mix(c, bulbColor(id + fk, hot) * on * lights, smoothstep(0.007, 0.004, bd));
  }

  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float life = fract(t * 0.035 + fi * 0.37);
    vec2 wp2 = vec2((fi - 1.0) * 0.55 * aspect + sin(t * 0.3 + fi * 2.0) * 0.08, -0.45 + life * 0.9);
    vec2 q = s - wp2;
    q.x += sin(q.y * 18.0 + t * 2.0) * 0.012;
    float blob = exp(-dot(q * vec2(1.0, 0.55), q * vec2(1.0, 0.55)) * 900.0);
    float tail = exp(-q.x * q.x * 1500.0) * smoothstep(0.0, -0.12, q.y) * smoothstep(-0.2, -0.02, q.y);
    float a = (blob + tail * 0.5) * sin(life * 3.14159) * 0.35;
    c += mix(vec3(0.7, 0.75, 1.0), vec3(0.6, 1.0, 0.7), hot) * a;
  }
  return c;
}
`;

export const carnival: TableSpec<CarnivalState> = {
	meta: {
		id: 'carnival',
		name: 'Haunted Carnival',
		kicker: 'Midnight fairground',
		lede: 'Ride the Ghost Train, lock souls with Madame Zelda, and strike midnight.',
		year: 'Fairground',
		skin: {
			bg: '#1a0822',
			panel: 'rgba(26, 8, 34, 0.88)',
			ink: '#fff2dc',
			muted: '#c9b3cf',
			accent: '#ffc24a',
			hot: '#7dff9a',
			display: 'Creepster, "Barlow Condensed", Impact, sans-serif',
			font: 'Creepster'
		},
		words: { ready: 'Step right up', over: 'The lights go out', paused: 'The carnival waits' },
		guide: {
			how: [
				'Knock down F·A·T·E to light a lock at Madame Zelda. Lock two souls to strike Midnight multiball.',
				'In Midnight, the ramps and orbits flash for jackpots. Collect them all to light the super jackpot at Zelda.',
				'Every three ramps light an attraction at Zelda: six modes, from the Ghost Train to the Big Top.',
				'The Big Wheel ramp spins the wheel in the middle of the fair: it can light a lock, the kickback or an extra ball, raise the bonus, or pay out big points.',
				'Play all six attractions to light the Witching Hour, where every shot is a jackpot.',
				'Roll through B·O·O to raise the bonus multiplier; flippers move the lit lanes. Every fourth Ghost Train ride lights an extra ball: the green lamps under the ramp count the rides.'
			],
			tips: [
				'Hold a flipper up to catch the ball, then aim. A cradled ball rolls off the flipper tip when you let go.',
				'Orbits loop round the top and back down the other side: a fast way to chain combos.',
				'The kickback in the left outlane sends a ball back up the orbit. Big Wheel rides and Zelda relight it.'
			]
		},
		backdrop: BACKDROP
	},
	rules: carnivalRules,
	art: carnivalArt,
	score: {
		layers: 'pinball-carnival',
		step: 0.42,
		steps: 3,
		sections: [{ bars: A }, { bars: A }, { bars: B }, { bars: A, lead: 'tine', octave: 1, quiet: true }],
		lead: { voice: 'calliope', level: 0.028 },
		bass: { voice: 'oom', level: 0.07, pattern: 'R..5..' },
		comp: { voice: 'pah', level: 0.02, pattern: '.xx' },
		sparkle: { voice: 'tine', chance: 0.3, level: 0.012, octave: 2 },
		scale: [74, 76, 77, 79, 81, 82, 85, 86]
	},
	sfx: {
		key: 50,
		minor: true,
		voice: 'calliope',
		bumper: 'bell',
		bumperNotes: [81, 84, 86],
		ramp: 'rattle',
		drain: 'slide',
		toy: 'moan',
		cues: {
			/** The clock strikes twelve, and the calliope wakes in a major key. */
			multiball(k) {
				for (let i = 0; i < 12; i += 1) bell(k, hz(45), k.t + i * 0.3, 0.07, 1.8);
				[62, 66, 69, 74, 78, 81, 86].forEach((n, i) => lead(k, 'calliope', n, k.t + 3.7 + i * 0.09, 0.3, 0.04));
			},
			lock(k, n = 1) {
				[72, 74, 76, 78, 80, 82].forEach((m, i) => lead(k, 'tine', m + 12, k.t + i * 0.06, 0.4, 0.02));
				for (let i = 0; i < n; i += 1) bell(k, hz(57), k.t + 0.5 + i * 0.5, 0.06, 1.6);
			},
			/** A ratchet clacking round, slowing as the wheel winds down. */
			wheelSpin(k) {
				let at = k.t;
				for (let i = 0; i < 34; i += 1) {
					const gap = 0.035 + Math.pow(i / 34, 2.2) * 0.22;
					drum(k, 'block', at, 0.1, i % 2 ? 5 : 0);
					at += gap;
					if (at > k.t + 2.75) break;
				}
				[62, 65, 69, 74].forEach((n, i) => lead(k, 'calliope', n + 12, k.t + i * 0.08, 0.2, 0.03));
			},
			/** A chug picking up speed, a two-note steam whistle, then a moan from the tunnel. */
			ghostTrain(k) {
				let at = k.t;
				for (let i = 0; i < 8; i += 1) {
					drum(k, 'block', at, 0.08, i % 2 ? -3 : -7);
					at += 0.16 - i * 0.012;
				}
				for (const [t0, len] of [
					[0.15, 0.55],
					[0.8, 0.9]
				] as const) {
					swell(k, 'triangle', hz(74) * 0.97, hz(74), k.t + t0, 0.03, len, 0.004, 9);
					swell(k, 'triangle', hz(78) * 0.97, hz(78), k.t + t0, 0.025, len, 0.004, 9);
				}
				swell(k, 'sine', hz(69), hz(57), k.t + 1.5, 0.035, 1.2, 0.02, 5);
			},
			wheelPrize(k) {
				bell(k, hz(74), k.t, 0.07, 1.6);
				[74, 78, 81, 86].forEach((n, i) => lead(k, 'calliope', n, k.t + 0.08 + i * 0.07, 0.25, 0.035));
			},
			wizard(k) {
				for (let i = 0; i < 12; i += 1) bell(k, hz(i % 2 ? 45 : 52), k.t + i * 0.22, 0.06, 1.6);
				run(k, 9, k.t + 2.8, 0.08, 0.04, 0, 'calliope');
				sweep(k, 'sine', 900, 300, k.t + 2.6, 0.03, 0.05, 1.2);
			}
		}
	},
	hot: (g) => g.s.midnight || g.s.wizard,
	feat: { label: 'Jackpots', of: (g) => g.s.jackpots }
};
