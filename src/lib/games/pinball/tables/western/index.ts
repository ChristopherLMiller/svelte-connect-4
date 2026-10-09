import { bell, hz, lead, sweep } from '../../sound/synth';
import { run } from '../../sound/sfx';
import type { Bar } from '../../sound/score';
import type { TableSpec } from '../spec';
import { westernArt } from './art';
import { westernHot, westernRules, type WesternState } from './rules';

const AM = [57, 60, 64];
const G = [55, 59, 62];
const F = [53, 57, 60];
const E = [56, 59, 64];
const DM = [62, 65, 69];

/** A whistled A minor theme over a walking upright bass and clip-clop woodblocks. */
const TRAIL: Bar[] = [
	{ chord: AM, root: 45, tune: [69, null, 76, null, 81, null, null, null] },
	{ chord: AM, root: 45, tune: [79, null, 76, null, 74, 76, null, null] },
	{ chord: G, root: 43, tune: [74, null, 71, null, 67, null, null, null] },
	{ chord: E, root: 40, tune: [68, null, 71, null, 76, null, null, null] },
	{ chord: AM, root: 45, tune: [69, null, 76, null, 81, null, 84, null] },
	{ chord: F, root: 41, tune: [81, null, 77, null, 72, null, null, null] },
	{ chord: E, root: 40, tune: [76, null, 74, null, 71, null, 68, null] },
	{ chord: AM, root: 45, tune: [69, null, null, null, 0, null, null, null] }
];
const RIDE: Bar[] = [
	{ chord: DM, root: 38, tune: [74, null, 77, null, 81, null, 77, null] },
	{ chord: AM, root: 45, tune: [76, null, 72, null, 69, null, 72, null] },
	{ chord: F, root: 41, tune: [72, null, 77, null, 81, null, 84, null] },
	{ chord: E, root: 40, tune: [83, null, 80, null, 76, null, null, null] }
];

const BACKDROP = `
vec3 scene(vec2 s, float aspect, float t, float lights, float hot) {
  vec3 c = mix(vec3(0.95, 0.55, 0.25), vec3(0.25, 0.12, 0.3), smoothstep(-0.1, 0.5, s.y));
  c = mix(c, vec3(1.0, 0.3, 0.1), hot * smoothstep(0.3, -0.1, s.y) * 0.5);

  vec2 sp = vec2(0.0, -0.08);
  float sd = length(s - sp);
  c += vec3(1.0, 0.75, 0.35) * 0.08 / (1.0 + sd * sd * 60.0);
  c = mix(c, vec3(1.0, 0.85, 0.5), smoothstep(0.13, 0.125, sd) * step(-0.12, s.y));

  float x = s.x / aspect;
  float mesa = -0.12 + 0.12 * step(0.18, x) * step(x, 0.3) + 0.09 * step(-0.38, x) * step(x, -0.22) + fbm(vec2(s.x * 4.0, 2.0)) * 0.02;
  if (s.y < mesa) c = mix(vec3(0.35, 0.12, 0.08), vec3(0.18, 0.06, 0.06), smoothstep(mesa, mesa - 0.3, s.y));

  float ground = -0.22;
  if (s.y < ground) {
    c = mix(vec3(0.55, 0.3, 0.15), vec3(0.25, 0.12, 0.06), smoothstep(ground, ground - 0.3, s.y));
    float rail = smoothstep(0.004, 0.0, abs(s.y - ground + 0.04)) + smoothstep(0.004, 0.0, abs(s.y - ground + 0.06));
    c = mix(c, vec3(0.75, 0.7, 0.65), rail * 0.6);
  }

  float tx = mod(t * 0.06, 2.4) - 1.2;
  vec2 tq = vec2(x - tx, s.y - ground + 0.01);
  float loco = step(abs(tq.x), 0.05) * step(0.0, tq.y) * step(tq.y, 0.04);
  float stack = step(abs(tq.x - 0.03), 0.007) * step(tq.y, 0.06) * step(0.0, tq.y);
  float cars = 0.0;
  for (int i = 1; i < 5; i++) {
    float cx = tq.x + float(i) * 0.065;
    cars = max(cars, step(abs(cx), 0.028) * step(0.004, tq.y) * step(tq.y, 0.035));
  }
  c = mix(c, vec3(0.05, 0.03, 0.03), max(max(loco, stack), cars));
  for (int i = 1; i < 5; i++) {
    float wd = length(vec2(x - tx + float(i) * 0.065, s.y - ground - 0.02));
    c += vec3(1.0, 0.8, 0.4) * smoothstep(0.006, 0.0, wd) * lights * 0.8;
  }
  for (int k = 0; k < 5; k++) {
    float fk = float(k);
    float age = fract(t * 0.5 + fk * 0.2);
    vec2 pp = vec2(tx + 0.03 - age * 0.15, ground - 0.01 + 0.07 + age * 0.08);
    float pd = length(vec2(x, s.y) - pp);
    c = mix(c, vec3(0.85, 0.8, 0.75), smoothstep(0.012 + age * 0.03, 0.0, pd) * (1.0 - age) * 0.5);
  }

  for (int k = 0; k < 2; k++) {
    float fk = float(k);
    float cx = (fk - 0.5) * 0.9 * aspect;
    vec2 q = s - vec2(cx, ground);
    float trunk = step(abs(q.x), 0.012) * step(0.0, q.y) * step(q.y, 0.16);
    float arm = step(abs(q.x - 0.03 * (fk * 2.0 - 1.0)), 0.009) * step(0.06, q.y) * step(q.y, 0.12) + step(abs(q.y - 0.06), 0.008) * step(0.0, q.x * (fk * 2.0 - 1.0)) * step(q.x * (fk * 2.0 - 1.0), 0.03);
    c = mix(c, vec3(0.08, 0.1, 0.05), max(trunk, arm));
  }
  return c;
}
`;

export const western: TableSpec<WesternState> = {
	meta: {
		id: 'western',
		name: 'High Noon Express',
		kicker: 'Wild West',
		lede: 'Hold up the train, crack the bank vault, round up the outlaws, and ride six bounties to the High Noon showdown.',
		year: 'Modern',
		skin: {
			bg: '#2a140a',
			panel: 'rgba(40, 20, 10, 0.88)',
			ink: '#fff0d8',
			muted: '#e0c4a0',
			accent: '#ffd24a',
			hot: '#ff4a2a',
			display: 'Rye, Georgia, serif',
			font: 'Rye'
		},
		words: { ready: 'Saddle up', over: 'End of the trail', paused: 'Taking five' },
		guide: {
			how: [
				'Rip the dial spinner on the right orbit to crack the bank vault, then shoot the open vault for a bank job. Two jobs start Gold Rush multiball: jackpots on both ramps, both orbits and the train, then a super jackpot in the vault.',
				'Quick Draw: a ball in the saloon is loaded into a six-shooter that swings between the corral and the outlaws. Press a flipper to fire it; an outlaw hit straight off the gun pays a quick-draw bonus that grows each time.',
				'Every three ramps post a bounty at the saloon: Train Robbery, Stagecoach, Cattle Rustlers, Claim Jumpers, Showdown and Wanted.',
				'Ride all six bounties to light High Noon, where every shot is a jackpot.',
				'Round up all three outlaws, in a row on the right, to raise the bonus multiplier; every second round-up lights an extra ball.',
				'The express runs the long track right across the top: each hit pays more loot.'
			],
			tips: [
				'Wait for the barrel to sweep right before you fire: aimed flat across, the gun finds the outlaws. Leave it and it fires itself after five seconds.',
				'The vault needs more spins every time it is cracked.',
				'The train speeds up during Train Robbery and the multiballs: time it at the stations at each end.',
				'The mine ramp goes straight up the middle and its cart rides back over the corral to the left flipper. It relights the kickback.'
			]
		},
		backdrop: BACKDROP
	},
	rules: westernRules,
	art: westernArt,
	score: {
		layers: 'pinball-western',
		step: 0.16,
		steps: 8,
		sections: [{ bars: TRAIL }, { bars: RIDE }, { bars: TRAIL, lead: 'harp' }, { bars: RIDE, quiet: true }],
		lead: { voice: 'whistle', level: 0.026 },
		bass: { voice: 'upright', level: 0.07, pattern: 'R.5.R.5.' },
		comp: { voice: 'strum', level: 0.014, pattern: '..x...x.' },
		drums: { level: 0.04, block: 'x.x.x.x.', tom: 'x...x...' },
		scale: [69, 71, 72, 74, 76, 77, 79, 81]
	},
	sfx: {
		key: 57,
		minor: true,
		voice: 'whistle',
		bumper: 'pop',
		bumperNotes: [69, 72, 76],
		ramp: 'gallop',
		drain: 'slide',
		toy: 'clang',
		cues: {
			/** A pitched crack rather than a noise burst. */
			bang(k) {
				sweep(k, 'square', 1400, 70, k.t, 0.03, 0.001, 0.12);
				sweep(k, 'sine', 300, 40, k.t, 0.04, 0.001, 0.25);
			},
			/** A ricochet whine and a bell for the sharpshooter. */
			quickDraw(k) {
				sweep(k, 'sine', 2400, 900, k.t + 0.05, 0.03, 0.002, 0.35);
				bell(k, hz(81), k.t + 0.3, 0.05, 1.0);
				bell(k, hz(88), k.t + 0.42, 0.04, 1.2);
			},
			crack(k) {
				sweep(k, 'triangle', 90, 60, k.t, 0.05, 0.05, 0.8);
				for (let i = 0; i < 4; i += 1) bell(k, hz(81 + i * 3), k.t + 0.6 + i * 0.08, 0.025, 0.5);
			},
			lock(k, n = 1) {
				bell(k, hz(88), k.t, 0.035, 0.8);
				bell(k, hz(93), k.t + 0.1, 0.03, 0.8);
				for (let i = 0; i < n; i += 1) lead(k, 'whistle', 81 + i * 5, k.t + 0.35 + i * 0.2, 0.25, 0.03);
			},
			multiball(k) {
				for (const m of [69, 72, 76]) sweep(k, 'sine', hz(m) * 0.94, hz(m), k.t, 0.025, 0.08, 1.2);
				run(k, 9, k.t + 1.3, 0.08, 0.035, 0, 'whistle');
			},
			wizard(k) {
				for (let i = 0; i < 6; i += 1) bell(k, hz(57), k.t + i * 0.35, 0.05, 1.4);
				for (const m of [69, 72, 76]) sweep(k, 'sine', hz(m) * 0.94, hz(m), k.t + 2.2, 0.025, 0.08, 1.4);
				run(k, 12, k.t + 3.4, 0.07, 0.035, 0, 'whistle');
			}
		}
	},
	hot: westernHot,
	feat: { label: 'Jackpots', of: (g) => g.s.jackpots }
};
