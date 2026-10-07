<script lang="ts">
	import { untrack } from 'svelte';
	import { createFullscreenPass } from '$lib/gl/fullscreen';
	import { createPacer } from '$lib/gl/pace';
	import type { Weather } from '../types';

	type Mood = 'menu' | 'setup' | 'play' | 'won' | 'lost';

	let {
		mood = 'menu',
		weather = 'storm',
		turn = 0,
		tension = 0,
		flash = 0,
		wreck = 0,
		onthunder
	}: {
		mood?: Mood;
		weather?: Weather;
		/** Whose gun is loaded: the coast leans amber for North, sea-glass for South. 0 when idle. */
		turn?: 0 | 1 | 2;
		/** 0–1, how much of both fleets is ablaze or sunk; the swell and rain build with it. */
		tension?: number;
		/** Bumps on every hit; the clouds light up. */
		flash?: number;
		/** Bumps on every sinking; lightning strikes the sea. */
		wreck?: number;
		/** Thunder after a strike, 0–1 strength, so the sound can follow the light. */
		onthunder?: (strength: number) => void;
	} = $props();

	let failed = $state(false);

	const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uWeather;
uniform float uTension;
uniform float uFlash;
uniform float uBolt;
uniform float uBoltX;
uniform float uDawn;
uniform float uGloom;
uniform float uTurn;
out vec4 outColor;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    s += a * vnoise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return s;
}

float fbm3(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    s += a * vnoise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return s;
}

const float HORIZON = -0.04;

float cliffTop(float x, float A) {
  float hx = 0.15 * A;
  float rise = smoothstep(hx - 0.1, hx + 0.12, x);
  float face = pow(rise, 0.55);
  float crag = (fbm3(vec2(x * 22.0, 5.0)) - 0.5) * 0.12 * face * (1.0 - face) * 4.0;
  return mix(-0.62, 0.035 + 0.03 * fbm3(vec2(x * 7.0, 2.0)), face) + crag + 0.012 * vnoise(vec2(x * 40.0, 1.0)) * rise;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  float A = uRes.x / uRes.y;
  vec2 p = (frag - 0.5 * uRes) / uRes.y;
  float t = uTime;
  float S = uWeather < 0.5 ? 1.0 : 0.0;
  float F = (uWeather > 0.5 && uWeather < 1.5) ? 1.0 : 0.0;
  float M = uWeather > 1.5 ? 1.0 : 0.0;
  float dawn = uDawn;
  float rough = mix(0.35, 1.0, S) * (0.7 + 0.5 * uTension) * (1.0 - 0.5 * dawn);

  float bolt = uBolt >= 0.0 ? exp(-uBolt * 6.0) : 0.0;
  float flick = bolt * (0.65 + 0.35 * sin(uBolt * 85.0));
  float sheet = uFlash >= 0.0 ? exp(-uFlash * 4.0) * 0.55 : 0.0;
  float flash = clamp(flick + sheet, 0.0, 1.5) * (1.0 - dawn * 0.8);

  /* Sky */
  float sy = clamp((p.y - HORIZON) / (0.5 - HORIZON), 0.0, 1.0);
  vec3 skyTop = mix(vec3(0.015, 0.025, 0.06), vec3(0.04, 0.05, 0.07), S);
  skyTop = mix(skyTop, vec3(0.1, 0.12, 0.14), F);
  vec3 skyLow = mix(vec3(0.08, 0.12, 0.22), vec3(0.09, 0.11, 0.15), S);
  skyLow = mix(skyLow, vec3(0.3, 0.34, 0.37), F);
  skyTop = mix(skyTop, vec3(0.2, 0.3, 0.5), dawn);
  skyLow = mix(skyLow, vec3(1.0, 0.6, 0.4), dawn);
  vec3 col = mix(skyLow, skyTop, pow(sy, 0.7));

  vec2 MOON = vec2(-0.3 * A, 0.3);
  float md = length(p - MOON);
  float moonVis = mix(0.45, 1.0, M) * (1.0 - dawn * 0.75);
  col += vec3(0.7, 0.78, 0.9) * 0.09 * exp(-md * 5.0) * moonVis * (1.0 + F * 1.5);

  if (p.y > HORIZON) {
    vec2 sg = p * 90.0;
    vec2 si = floor(sg);
    float h = hash21(si);
    float star = step(0.985, h) * smoothstep(0.14, 0.0, length(fract(sg) - 0.5)) * (0.55 + 0.45 * sin(t * 2.0 + h * 60.0));
    col += vec3(0.9, 0.93, 1.0) * star * (0.25 + 0.75 * M) * (1.0 - F) * (1.0 - dawn) * sy;
  }

  float disc = smoothstep(0.05, 0.046, md);
  vec3 moonC = vec3(0.96, 0.94, 0.86) - 0.14 * fbm3((p - MOON) * 28.0);

  float cover = mix(mix(0.3, 0.8, S), 0.6, F) * (1.0 - dawn * 0.45);
  vec2 cp = vec2(p.x * 1.3 + t * 0.012 * (1.0 + S * 2.5), p.y * 2.8);
  float cn = fbm(cp * 2.0 + vec2(0.0, t * 0.01));
  float cloud = smoothstep(1.0 - cover - 0.15, 1.0 - cover + 0.3, cn) * smoothstep(HORIZON, HORIZON + 0.1, p.y);
  vec3 cloudC = mix(vec3(0.04, 0.05, 0.07), vec3(0.15, 0.16, 0.19), cn);
  cloudC = mix(cloudC, vec3(0.32, 0.35, 0.38), F);
  cloudC += vec3(0.55, 0.58, 0.65) * exp(-md * 4.5) * moonVis * 0.45;
  cloudC = mix(cloudC, vec3(0.88, 0.56, 0.5) * (0.55 + 0.45 * cn), dawn);
  cloudC += vec3(0.55, 0.6, 0.8) * flash * (0.5 + cn);
  col = mix(col, moonC, disc * moonVis * (1.0 - cloud * 0.85));
  col = mix(col, cloudC, cloud);
  col += vec3(0.35, 0.4, 0.6) * flash * 0.3 * sy;

  if (bolt > 0.01 && p.y > HORIZON) {
    float yy = p.y;
    float bx = uBoltX + (fbm3(vec2(yy * 8.0, uBoltX * 10.0)) - 0.5) * 0.16 + (vnoise(vec2(yy * 45.0, uBoltX * 3.0)) - 0.5) * 0.025;
    float dd = abs(p.x - bx);
    float side = sign(sin(uBoltX * 31.0));
    float bx2 = bx + (0.24 - yy) * 0.35 * side + (vnoise(vec2(yy * 35.0, uBoltX * 7.0)) - 0.5) * 0.03;
    float branch = step(yy, 0.24) * step(0.04, yy) * smoothstep(0.003, 0.0, abs(p.x - bx2));
    col += vec3(0.85, 0.9, 1.0) * (smoothstep(0.0045, 0.0, dd) + branch * 0.55 + exp(-dd * 55.0) * 0.45) * bolt * 2.2;
  }

  /* Distant land and ships on the horizon */
  float farLand = HORIZON + 0.018 * fbm3(vec2(p.x * 4.0, 3.0)) * smoothstep(-0.1 * A, -0.5 * A, p.x);
  if (p.y > HORIZON && p.y < farLand) col = mix(col, vec3(0.03, 0.04, 0.06) + skyLow * 0.15, 0.85);

  vec3 seaDeep = mix(vec3(0.02, 0.05, 0.075), vec3(0.025, 0.05, 0.065), S);
  seaDeep = mix(seaDeep, vec3(0.15, 0.18, 0.2), F);
  seaDeep = mix(seaDeep, vec3(0.32, 0.25, 0.3), dawn);

  if (p.y < HORIZON) {
    float depth = HORIZON - p.y;
    float persp = 1.0 / (depth + 0.03);
    vec2 wp = vec2(p.x * persp * 0.6, persp * 0.8 - t * 0.35 * (0.5 + rough));
    float wv = fbm(wp * vec2(1.0, 0.6) + vec2(t * 0.05, 0.0));
    vec3 seaCol = mix(seaDeep * 0.55, seaDeep * 1.7, wv);
    seaCol = mix(seaCol, skyLow * 0.7, exp(-depth * 18.0) * 0.7);
    float gx = p.x - MOON.x;
    float glint = pow(vnoise(wp * vec2(3.0, 1.5) + t * 0.3), 6.0);
    seaCol += vec3(0.9, 0.9, 0.8) * exp(-gx * gx * 110.0 / (1.0 + depth * 8.0)) * glint * 3.0 * moonVis * (0.4 + M);
    seaCol += vec3(1.0, 0.7, 0.45) * dawn * exp(-gx * gx * 18.0) * glint * 4.0;
    float crest = smoothstep(0.62, 0.8, fbm3(wp * vec2(1.6, 0.9) + vec2(0.0, t * 0.2))) * smoothstep(0.02, 0.25, depth) * rough;
    seaCol = mix(seaCol, vec3(0.72, 0.8, 0.84) * (0.55 + 0.4 * M + dawn * 0.4), crest * 0.55);
    seaCol += vec3(0.5, 0.55, 0.7) * flash * 0.35 * (1.0 - depth);
    col = seaCol;
  }

  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float sx = (-0.42 + fk * 0.21) * A + sin(t * 0.01 + fk) * 0.02;
    float bob = sin(t * 1.1 + fk * 2.0) * 0.0025;
    vec2 q = p - vec2(sx, HORIZON + 0.004 + bob);
    float hull = step(abs(q.x), 0.016 - max(0.0, q.y) * 0.6) * step(-0.002, q.y) * step(q.y, 0.006);
    float mast = step(abs(q.x - 0.002), 0.0012) * step(0.0, q.y) * step(q.y, 0.028);
    float sail = step(0.004, q.y) * step(q.y, 0.024) * step(abs(q.x + 0.006 - (q.y - 0.004) * 0.15), 0.006 - (q.y - 0.004) * 0.12);
    col = mix(col, vec3(0.02, 0.025, 0.035) + skyLow * 0.08, max(hull, max(mast, sail)) * 0.95);
    float lamp = exp(-length(q - vec2(-0.012, 0.006)) * 260.0) * (0.75 + 0.25 * sin(t * 3.0 + fk));
    col += vec3(1.0, 0.75, 0.4) * lamp * (1.0 - dawn * 0.6);
  }

  for (int k = 0; k < 2; k++) {
    float fk = float(k);
    float base = -0.3 - fk * 0.11;
    float sw = base + (0.022 + 0.03 * rough) * sin(p.x * (5.0 + fk * 2.0) + t * (0.8 + fk * 0.3) + fk * 2.0) + 0.01 * sin(p.x * 17.0 - t * 1.6);
    if (p.y < sw) {
      float dd = sw - p.y;
      vec3 c2 = mix(seaDeep * 1.5, seaDeep * 0.45, smoothstep(0.0, 0.12, dd));
      c2 += vec3(0.62, 0.72, 0.76) * smoothstep(0.012, 0.0, dd) * (0.35 + 0.6 * rough) * (0.6 + M * 0.4 + dawn * 0.4);
      c2 += vec3(0.5, 0.58, 0.62) * smoothstep(0.62, 0.8, fbm3(vec2(p.x * 12.0, dd * 40.0 - t))) * smoothstep(0.06, 0.0, dd) * 0.35;
      c2 += vec3(0.5, 0.55, 0.7) * flash * 0.25;
      col = c2;
    }
  }

  /* Bell buoy with a red light */
  vec2 BUOY = vec2(-0.33 * A, -0.17 + sin(t * 1.4) * 0.006);
  vec2 bq = p - BUOY;
  float bRot = sin(t * 1.4 + 0.6) * 0.18;
  bq = mat2(cos(bRot), -sin(bRot), sin(bRot), cos(bRot)) * bq;
  float buoy = step(abs(bq.x), 0.012 - bq.y * 0.25) * step(-0.006, bq.y) * step(bq.y, 0.03);
  col = mix(col, mix(vec3(0.35, 0.06, 0.05), vec3(0.12, 0.03, 0.03), step(0.012, bq.y)), buoy);
  float blink = smoothstep(0.82, 0.86, fract(t / 3.0)) * smoothstep(1.0, 0.94, fract(t / 3.0));
  float bd = length(bq - vec2(0.0, 0.034));
  col += vec3(1.0, 0.22, 0.15) * (exp(-bd * 220.0) * 1.2 + exp(-bd * 30.0) * 0.25) * (0.15 + blink);

  /* The headland and the lighthouse */
  float ct = cliffTop(p.x, A);
  if (p.y < ct) {
    float rn = fbm(p * vec2(14.0, 22.0));
    vec3 rock = mix(vec3(0.03, 0.035, 0.04), vec3(0.11, 0.1, 0.1), rn);
    rock = mix(rock, vec3(0.2, 0.17, 0.18), dawn * 0.5);
    float edge = smoothstep(0.012, 0.0, ct - p.y);
    rock += vec3(0.25, 0.28, 0.32) * edge * (0.25 + M * 0.5) + vec3(0.6, 0.65, 0.8) * flash * 0.2 * rn;
    float grass = edge * smoothstep(0.12 * A, 0.2 * A, p.x);
    rock = mix(rock, vec3(0.06, 0.1, 0.06) * (1.0 + dawn * 2.0), grass * 0.6);
    float wet = smoothstep(-0.2, -0.36, p.y) * smoothstep(0.55, 0.8, fbm3(p * vec2(18.0, 46.0)));
    rock += vec3(0.4, 0.45, 0.5) * wet * (0.4 + M);
    col = rock;
  }

  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float cx = 0.17 * A + fk * 0.06;
    float phase = fract(t * (0.2 + fk * 0.03) + fk * 0.37);
    float h = (0.04 + 0.13 * rough) * sqrt(phase);
    vec2 q = p - vec2(cx, -0.1);
    float w = 0.02 + 0.05 * phase;
    float shape = smoothstep(w, w * 0.3, abs(q.x)) * step(0.0, q.y) * smoothstep(h, h * 0.4, q.y);
    float dens = shape * (1.0 - phase) * smoothstep(0.35, 0.75, fbm3(vec2(q.x * 50.0, q.y * 30.0 - t * 2.0)));
    col = mix(col, vec3(0.78, 0.84, 0.88) * (0.5 + 0.35 * M + 0.4 * dawn + flash * 0.4), clamp(dens * 1.4, 0.0, 0.9));
  }

  float LX = 0.31 * A;
  float baseY = cliffTop(LX, A) - 0.01;
  float topT = baseY + 0.2;
  float ty = (p.y - baseY) / (topT - baseY);
  float halfW = mix(0.03, 0.019, clamp(ty, 0.0, 1.0));
  float u = (p.x - LX) / halfW;
  if (ty > 0.0 && ty < 1.0 && abs(u) < 1.0) {
    float band = step(0.5, fract(ty * 2.5 + 0.25));
    vec3 paint = mix(vec3(0.85, 0.83, 0.78), vec3(0.62, 0.12, 0.1), band);
    float shade = 0.35 + 0.65 * smoothstep(1.0, -0.6, u);
    vec3 tower = paint * shade * (0.32 + 0.4 * M + 0.5 * dawn) + vec3(0.6, 0.65, 0.8) * flash * 0.3;
    float win = step(abs(u), 0.18) * step(abs(fract(ty * 4.0) - 0.5), 0.08);
    tower = mix(tower, vec3(1.0, 0.75, 0.4) * 0.8, win * step(ty, 0.9));
    col = tower;
  }
  vec2 g = p - vec2(LX, topT);
  if (abs(g.x) < 0.028 && g.y > 0.0 && g.y < 0.007) col = vec3(0.05, 0.05, 0.06);
  float theta = t * 0.55;
  float facing = sin(theta);
  float flare = pow(max(0.0, facing), 18.0);
  if (abs(g.x) < 0.017 && g.y > 0.007 && g.y < 0.033) {
    float bars = step(0.12, abs(fract(g.x * 120.0) - 0.5));
    col = mix(vec3(0.08, 0.06, 0.04), vec3(1.0, 0.86, 0.55) * (0.7 + flare * 0.8), bars) * (1.0 - dawn * 0.4);
  }
  vec2 dq = g - vec2(0.0, 0.033);
  if (dq.y > 0.0 && length(dq / vec2(0.019, 0.017)) < 1.0) col = vec3(0.22, 0.05, 0.04) * (0.5 + 0.5 * M + dawn);
  if (abs(dq.x) < 0.0015 && dq.y > 0.0 && dq.y < 0.026) col = vec3(0.1, 0.08, 0.06);

  vec2 LAMP = vec2(LX, topT + 0.02);
  vec2 bvec = p - LAMP;
  float dirX = cos(theta);
  float sideB = dirX >= 0.0 ? 1.0 : -1.0;
  float along = bvec.x * sideB;
  float blen = 0.12 + 1.9 * abs(dirX);
  float beamOn = 1.0 - dawn * 0.85;
  if (along > 0.0) {
    float off = bvec.y + 0.045 * along;
    float width = (0.022 + 0.03 * (1.0 - abs(dirX))) * along + 0.006;
    float beam = smoothstep(width, 0.0, abs(off)) * smoothstep(blen, blen * 0.15, along);
    beam *= 0.65 + 0.35 * fbm3(p * 18.0 + vec2(t * 0.3, 0.0));
    beam *= (facing > 0.0 ? 1.0 : 0.55) * mix(mix(0.32, 0.55, S), 0.85, F) * (1.0 + 0.6 * M * 0.0);
    col += vec3(1.0, 0.9, 0.7) * beam * 0.55 * beamOn;
  }
  float ld = length(bvec);
  col += vec3(1.0, 0.92, 0.75) * (exp(-ld * 70.0) * 0.9 + exp(-ld * 12.0) * 0.22) * (0.35 + flare * 2.2) * beamOn;
  col += vec3(1.0, 0.9, 0.7) * exp(-abs(bvec.y) * 280.0) * exp(-abs(bvec.x) * 5.0) * flare * 0.5 * beamOn;

  /* Weather veils */
  if (S > 0.5) {
    for (int k = 0; k < 3; k++) {
      float fk = float(k);
      float sc = 55.0 + fk * 38.0;
      vec2 rp = vec2(p.x * sc + p.y * sc * 0.28, p.y * sc * 0.07 + t * (5.5 + fk * 2.0));
      vec2 ri = floor(rp);
      float rh = hash21(ri + fk * 17.0);
      float streak = step(0.9 - 0.06 * uTension, rh) * smoothstep(0.09, 0.0, abs(fract(rp.x) - 0.5)) * smoothstep(0.0, 0.35, fract(rp.y)) * smoothstep(1.0, 0.65, fract(rp.y));
      col += vec3(0.5, 0.56, 0.66) * streak * (0.09 + flash * 0.3) * (1.0 - dawn);
    }
  }
  float fogN = fbm3(vec2(p.x * 1.5 + t * 0.025, p.y * 4.0 - t * 0.01));
  float veil = F * (0.3 + 0.45 * fogN) * smoothstep(0.4, -0.25, p.y) + S * 0.08 * fogN;
  vec3 veilC = vec3(0.4, 0.44, 0.48) * (1.0 + flash * 0.6) + vec3(0.35, 0.3, 0.2) * exp(-ld * 3.0) * beamOn;
  col = mix(col, veilC, clamp(veil * (1.0 - dawn * 0.7), 0.0, 0.85));

  col += vec3(1.0, 0.72, 0.35) * 0.05 * clamp(uTurn, 0.0, 1.0) * smoothstep(0.1, -0.5, p.y);
  col += vec3(0.35, 0.9, 0.8) * 0.045 * clamp(-uTurn, 0.0, 1.0) * smoothstep(0.1, -0.5, p.y);
  float lum = dot(col, vec3(0.3, 0.59, 0.11));
  col = mix(col, vec3(lum) * vec3(0.8, 0.85, 0.95), uGloom * 0.5) * (1.0 - uGloom * 0.15);

  vec2 vg = frag / uRes - 0.5;
  col *= 1.0 - 0.6 * dot(vg, vg);
  col = 1.0 - exp(-col * 1.4);
  col = pow(col, vec3(0.95));
  col += (hash21(frag + fract(t) * 91.0) - 0.5) * 0.01;
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

	function headland(canvas: HTMLCanvasElement) {
		const pass = createFullscreenPass(canvas, FRAG, 'lighthouse headland');
		if (!pass) {
			failed = true;
			return;
		}
		const { gl } = pass;
		const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
		const t0 = performance.now();
		let calm = motion.matches;
		let cssW = 0;
		let cssH = 0;
		let raf = 0;
		let last = t0;
		let dawn = 0;
		let gloom = 0;
		let lean = 0;
		let tense = untrack(() => tension);
		let flashAt = -100;
		let boltAt = -100;
		let boltX = 0;
		let nextBolt = 6 + Math.random() * 8;

		const strike = (time: number, strength: number) => {
			boltAt = time;
			const A = cssW / Math.max(1, cssH);
			boltX = (-0.45 + Math.random() * 0.5) * A;
			onthunder?.(strength);
		};

		const draw = (ms: number) => {
			if (!cssW || !cssH) return;
			const dt = Math.min(1 / 20, Math.max(0, (ms - last) / 1000));
			last = ms;
			const time = (ms - t0) / 1000;
			const ease = (rate: number) => (calm ? 1 : 1 - Math.exp(-dt * rate));
			dawn += ((mood === 'won' ? 1 : 0) - dawn) * ease(0.35);
			gloom += ((mood === 'lost' ? 1 : 0) - gloom) * ease(0.6);
			lean += ((turn === 1 ? 1 : turn === 2 ? -1 : 0) - lean) * ease(2.5);
			tense += (tension - tense) * ease(0.5);
			if (!calm && weather === 'storm' && mood !== 'won' && time > nextBolt) {
				strike(time, 0.55 + Math.random() * 0.3);
				nextBolt = time + 8 + Math.random() * 14 * (1 - tense * 0.5);
			}

			gl.useProgram(pass.program);
			gl.uniform2f(pass.uniform('uRes'), canvas.width, canvas.height);
			gl.uniform1f(pass.uniform('uTime'), calm ? 6 : time);
			gl.uniform1f(pass.uniform('uWeather'), weather === 'storm' ? 0 : weather === 'fog' ? 1 : 2);
			gl.uniform1f(pass.uniform('uTension'), tense);
			gl.uniform1f(pass.uniform('uFlash'), calm ? -1 : time - flashAt);
			gl.uniform1f(pass.uniform('uBolt'), calm ? -1 : time - boltAt);
			gl.uniform1f(pass.uniform('uBoltX'), boltX);
			gl.uniform1f(pass.uniform('uDawn'), dawn);
			gl.uniform1f(pass.uniform('uGloom'), gloom);
			gl.uniform1f(pass.uniform('uTurn'), lean);
			pass.draw();
		};

		const pace = createPacer();
		const loop = (ms: number) => {
			raf = 0;
			if (pace.due(ms)) draw(ms);
			if (!calm && !document.hidden) raf = requestAnimationFrame(loop);
		};

		const kick = () => {
			if (calm) {
				draw(performance.now());
				return;
			}
			if (!raf && !document.hidden) {
				last = performance.now();
				raf = requestAnimationFrame(loop);
			}
		};

		const resize = () => {
			const rect = canvas.getBoundingClientRect();
			const dpr = Math.min(window.devicePixelRatio || 1, 1);
			cssW = rect.width;
			cssH = rect.height;
			const pxW = Math.max(1, Math.round(cssW * dpr));
			const pxH = Math.max(1, Math.round(cssH * dpr));
			if (canvas.width !== pxW || canvas.height !== pxH) {
				canvas.width = pxW;
				canvas.height = pxH;
				gl.viewport(0, 0, pxW, pxH);
			}
			if (calm) draw(performance.now());
		};

		const observer = new ResizeObserver(resize);
		observer.observe(canvas);
		resize();
		kick();

		const onVisibility = () => kick();
		const onMotion = () => {
			calm = motion.matches;
			kick();
		};
		const onLost = (event: Event) => {
			event.preventDefault();
			cancelAnimationFrame(raf);
			failed = true;
		};
		document.addEventListener('visibilitychange', onVisibility);
		motion.addEventListener('change', onMotion);
		canvas.addEventListener('webglcontextlost', onLost);

		let seenFlash = untrack(() => flash);
		$effect(() => {
			const next = flash;
			untrack(() => {
				if (next > seenFlash) flashAt = (performance.now() - t0) / 1000;
				seenFlash = next;
			});
		});

		let seenWreck = untrack(() => wreck);
		$effect(() => {
			const next = wreck;
			untrack(() => {
				if (next > seenWreck && !calm) strike((performance.now() - t0) / 1000, 1);
				seenWreck = next;
			});
		});

		$effect(() => {
			void mood;
			void weather;
			void turn;
			void tension;
			untrack(kick);
		});

		return () => {
			cancelAnimationFrame(raf);
			observer.disconnect();
			document.removeEventListener('visibilitychange', onVisibility);
			motion.removeEventListener('change', onMotion);
			canvas.removeEventListener('webglcontextlost', onLost);
			pass.dispose();
		};
	}
</script>

<div class="headland" aria-hidden="true">
	{#if failed}
		<div class="fallback"></div>
	{:else}
		<canvas {@attach headland}></canvas>
	{/if}
</div>

<style>
	.headland {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
		z-index: 0;
		contain: layout paint;
	}

	canvas,
	.fallback {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
	}

	.fallback {
		background:
			radial-gradient(4% 6% at 81% 32%, rgba(255, 230, 170, 0.9), transparent 70%),
			radial-gradient(30% 20% at 20% 20%, rgba(170, 190, 220, 0.25), transparent 70%),
			linear-gradient(180deg, #05080f 0%, #142033 52%, #0a1620 54%, #050b10 100%);
	}
</style>
