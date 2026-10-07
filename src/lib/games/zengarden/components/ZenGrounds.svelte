<script lang="ts">
	import { untrack } from 'svelte';
	import { createFullscreenPass } from '$lib/gl/fullscreen';
	import { createPacer } from '$lib/gl/pace';
	import type { Season } from '../types';

	type Mood = 'menu' | 'play' | 'won' | 'draw';

	let {
		mood = 'menu',
		season = 'spring',
		turn = 0,
		light = 0.2,
		placed = 0,
		gust = 0,
		onclack
	}: {
		mood?: Mood;
		season?: Season;
		/** Whose stone is next; the garden leans cool for slate, warm for quartz. 0 on the menu. */
		turn?: 0 | 1 | 2;
		/** 0–1, how far the day has gone: morning haze to long golden light and lit lanterns. */
		light?: number;
		/** Bumps on every stone; the pond ripples. */
		placed?: number;
		/** Bumps on a five; a gust of petals sweeps the garden. */
		gust?: number;
		/** The bamboo deer-scarer tips and knocks its stone. */
		onclack?: () => void;
	} = $props();

	let failed = $state(false);

	/** Seconds between the deer-scarer's knocks; the shader and the sound share it. */
	const CLACK_PERIOD = 11;
	const CLACK_AT = CLACK_PERIOD - 0.32;

	const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uSeason;
uniform float uLight;
uniform float uGust;
uniform float uRipple;
uniform float uTurn;
uniform float uWarm;
out vec4 outColor;

#define PI 3.14159265
#define PERIOD ${CLACK_PERIOD.toFixed(1)}

float AA;
float A;
float YH;
float YW;
vec2 SUN;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float hash11(float n) {
  return fract(sin(n * 127.1) * 43758.5453);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  return 0.5 * vnoise(p) + 0.3 * vnoise(p * 2.03 + 7.1) + 0.2 * vnoise(p * 4.1 + 3.7);
}

float cover(float d) {
  return clamp(0.5 - d / AA, 0.0, 1.0);
}

float sdSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

float sdBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

float sdEll(vec2 p, vec2 r) {
  return (length(p / r) - 1.0) * min(r.x, r.y);
}

mat2 rot(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c);
}

vec3 pick3(vec3 a, vec3 b, vec3 c) {
  return uSeason < 0.5 ? a : (uSeason < 1.5 ? b : c);
}

float winter() {
  return step(1.5, uSeason);
}

vec3 skyCol(vec2 p, float t) {
  float L = uLight;
  float h = clamp((p.y - YH) / (0.55 - YH), 0.0, 1.0);
  vec3 top = pick3(vec3(0.42, 0.6, 0.84), vec3(0.36, 0.5, 0.74), vec3(0.6, 0.68, 0.78));
  vec3 hor = pick3(vec3(1.0, 0.88, 0.84), vec3(1.0, 0.82, 0.6), vec3(0.9, 0.91, 0.94));
  top = mix(top, vec3(0.32, 0.3, 0.55), L * 0.75);
  hor = mix(hor, vec3(1.0, 0.6, 0.4), L * 0.85);
  vec3 c = mix(hor, top, pow(h, 0.65));
  float sd = length(p - SUN);
  vec3 sunC = mix(vec3(1.0, 0.95, 0.8), vec3(1.0, 0.6, 0.35), L);
  c += sunC * exp(-sd * 5.0) * 0.45;
  c = mix(c, mix(vec3(1.0, 0.98, 0.9), vec3(1.0, 0.75, 0.5), L), smoothstep(0.045, 0.04, sd));
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float cy = YH + 0.14 + fk * 0.1;
    float band = exp(-pow((p.y - cy) / (0.022 + fk * 0.01), 2.0));
    float n = fbm(vec2(p.x * (1.6 + fk * 0.7) + t * (0.006 + fk * 0.004) + fk * 11.0, p.y * 9.0));
    float cl = smoothstep(0.45, 0.78, n) * band;
    vec3 lit = mix(vec3(1.0, 0.98, 0.96), vec3(1.0, 0.72, 0.6), L);
    c = mix(c, lit, cl * 0.6);
  }
  return c;
}

float ridge(float x, float k) {
  return YH + 0.02 + k * -0.03 + (0.13 - k * 0.035) * fbm(vec2(x * (1.1 + k * 0.9) + k * 7.3, k * 3.1));
}

float pagoda(vec2 p) {
  vec2 q = p;
  float d = 1.0;
  float y = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float w = 0.05 - fi * 0.0065;
    float body = sdBox(q - vec2(0.0, y + 0.011), vec2(w * 0.55, 0.011));
    float curl = 0.006 * pow(abs(q.x) / w, 3.0);
    float roof = sdBox(q - vec2(0.0, y + 0.024 + curl), vec2(w, 0.0035)) ;
    roof = min(roof, sdBox(q - vec2(0.0, y + 0.028), vec2(w * 0.7, 0.004)));
    d = min(d, min(body, roof));
    y += 0.03;
  }
  d = min(d, sdSeg(q, vec2(0.0, y), vec2(0.0, y + 0.04)) - 0.0018);
  for (int k = 0; k < 5; k++) d = min(d, length(q - vec2(0.0, y + 0.008 + float(k) * 0.006)) - 0.003);
  return d;
}

float windows(vec2 p) {
  float w = 0.0;
  for (int i = 0; i < 5; i++) {
    float y = float(i) * 0.03 + 0.011;
    w += smoothstep(0.004, 0.0, sdBox(p - vec2(0.0, y), vec2(0.0035, 0.004)));
  }
  return w;
}

float treeWood(vec2 p, vec2 o, float sway) {
  vec2 a = o + vec2(-0.02, -0.15);
  vec2 b = o + vec2(0.08, 0.22);
  vec2 c = o + vec2(0.18, 0.42);
  float d = 1.0;
  vec2 prev = a;
  for (int k = 1; k <= 8; k++) {
    float u = float(k) / 8.0;
    vec2 pt = mix(mix(a, b, u), mix(b, c, u), u);
    d = min(d, sdSeg(p, prev, pt) - mix(0.045, 0.02, u));
    prev = pt;
  }
  vec2 br0 = o + vec2(0.12, 0.33);
  for (int k = 0; k < 5; k++) {
    float fk = float(k);
    vec2 e = br0 + vec2(0.1 + fk * 0.07, 0.03 + 0.05 * sin(fk * 1.9)) + vec2(sway, 0.0) * (fk + 1.0);
    d = min(d, sdSeg(p, br0 + vec2(fk * 0.04, fk * 0.01), e) - mix(0.012, 0.004, fk / 4.0));
    vec2 tw = e + vec2(0.05, -0.04 + 0.03 * sin(fk * 3.1));
    d = min(d, sdSeg(p, e, tw) - 0.003);
  }
  return d;
}

vec3 petalCol(float h) {
  if (uSeason < 0.5) return mix(vec3(1.0, 0.8, 0.86), vec3(0.96, 0.62, 0.74), h);
  if (uSeason < 1.5) return mix(vec3(0.9, 0.3, 0.16), vec3(0.97, 0.62, 0.2), h);
  return vec3(1.0);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  AA = 1.6 / uRes.y;
  A = uRes.x / uRes.y;
  vec2 p = (frag - 0.5 * uRes) / uRes.y;
  float t = uTime;
  float L = uLight;
  float tall = 1.0 - smoothstep(0.75, 1.15, A);
  YH = mix(0.1, 0.2, tall);
  YW = YH - 0.04;
  SUN = vec2(A * mix(0.18, 0.1, tall), YH + mix(0.3, 0.06, L));
  float wind = sin(t * 0.33) * 0.6 + sin(t * 0.87) * 0.3 + uGust * 2.5;
  vec3 col;

  /* Sky, ink-wash mountains in three layers with mist between, a far pagoda. */
  col = skyCol(p, t);
  if (p.y > YW - 0.08) {
    vec3 haze = skyCol(vec2(p.x, YH + 0.02), t);
    for (int k = 0; k < 3; k++) {
      float fk = float(k);
      float r = ridge(p.x, fk);
      vec3 ink = pick3(vec3(0.36, 0.45, 0.5), vec3(0.42, 0.36, 0.38), vec3(0.5, 0.56, 0.64));
      ink = mix(ink, vec3(0.3, 0.24, 0.36), L * 0.6);
      ink *= 0.95 - fk * 0.25;
      vec3 mc = mix(haze, ink, 0.35 + fk * 0.25);
      float tex = fbm(vec2(p.x * 14.0, p.y * 30.0) + fk * 4.0);
      mc *= 0.92 + tex * 0.14;
      if (winter() > 0.5 && fk < 1.5) mc = mix(mc, vec3(0.95, 0.97, 1.0), smoothstep(r - 0.04, r - 0.01, p.y) * smoothstep(0.4, 0.6, tex) * 0.85);
      col = mix(col, mc, cover(p.y - r));
      float mist = exp(-pow((p.y - (r - 0.035)) / 0.025, 2.0)) * fbm(vec2(p.x * 2.5 - t * 0.012 * (fk + 1.0), p.y * 10.0 + fk));
      col = mix(col, haze, mist * 0.55);
      if (k == 1) {
        vec2 pq = p - vec2(A * 0.22, ridge(A * 0.22, 1.0) - 0.012);
        float pd = pagoda(pq / 0.85) * 0.85;
        vec3 pc = mix(ink * 0.7, haze, 0.25);
        col = mix(col, pc, cover(pd));
        col += vec3(1.0, 0.7, 0.35) * windows(pq / 0.85) * smoothstep(0.4, 1.0, L) * 0.8 * cover(pd + 0.004);
      }
    }
  }

  /* Birds crossing now and then. */
  float bp = mod(t + 6.0, 41.0);
  if (bp < 16.0 && p.y > YH) {
    for (int b = 0; b < 4; b++) {
      float fb = float(b);
      vec2 bc = vec2(A * 0.6 - bp / 16.0 * A * 1.3 + abs(fb - 1.5) * 0.02, YH + 0.3 + fb * 0.012 - abs(fb - 1.5) * 0.01 + 0.005 * sin(t * 1.1 + fb));
      vec2 q = p - bc;
      float flap = sin(t * 8.0 + fb * 1.9) * 0.005;
      float wing = min(sdSeg(q, vec2(0.0), vec2(-0.01, 0.004 + flap)), sdSeg(q, vec2(0.0), vec2(0.01, 0.004 + flap)));
      col = mix(col, vec3(0.15, 0.13, 0.18), smoothstep(0.0015, 0.0007, wing));
    }
  }

  /* Trees peeking over the temple wall. */
  float crowns = YW + 0.025 + 0.05 * fbm(vec2(p.x * 7.0, 2.0)) + 0.02 * vnoise(vec2(p.x * 30.0 + wind * 0.2, 1.0));
  if (p.y < crowns + 0.01) {
    vec3 tc = pick3(vec3(0.28, 0.42, 0.25), vec3(0.6, 0.3, 0.14), vec3(0.42, 0.48, 0.5));
    tc = mix(tc, tc * vec3(1.1, 0.75, 0.6), L * 0.5);
    tc *= 0.75 + 0.35 * fbm(p * 40.0);
    if (winter() > 0.5) tc = mix(tc, vec3(0.92, 0.95, 1.0), smoothstep(0.55, 0.7, fbm(p * 60.0)) * 0.8);
    col = mix(col, tc, cover(p.y - crowns));
  }

  /* The temple wall: ochre plaster with five white lines under a tiled cap. */
  float wallTop = YW;
  float wallBot = YW - 0.075;
  if (p.y < wallTop + 0.02 && p.y > wallBot - 0.01) {
    vec3 plaster = vec3(0.86, 0.72, 0.46) * (0.9 + 0.1 * fbm(p * 50.0));
    plaster = mix(plaster, plaster * vec3(1.05, 0.8, 0.65), L * 0.5);
    float lines = 0.0;
    for (int k = 0; k < 5; k++) lines += smoothstep(0.0016, 0.0, abs(p.y - (wallBot + 0.02 + float(k) * 0.0085)));
    plaster = mix(plaster, vec3(0.97, 0.95, 0.9), clamp(lines, 0.0, 1.0) * 0.9);
    plaster *= 1.0 - 0.25 * smoothstep(wallTop - 0.02, wallTop, p.y);
    float wallD = max(p.y - wallTop, wallBot - p.y);
    col = mix(col, plaster, cover(wallD));
    float capY = wallTop + 0.006;
    float tiles = abs(p.y - capY) - 0.008 + 0.002 * abs(sin(p.x * 260.0));
    vec3 tileC = vec3(0.24, 0.25, 0.28) * (0.85 + 0.25 * smoothstep(0.0, 0.006, p.y - capY));
    if (winter() > 0.5) tileC = mix(tileC, vec3(0.95, 0.97, 1.0), smoothstep(capY, capY + 0.008, p.y));
    col = mix(col, tileC, cover(tiles));
  }

  /* Raked gravel all the way down, the waves bending round two great rocks. */
  if (p.y < wallBot) {
    float depth = clamp((wallBot - p.y) / (wallBot + 0.5), 0.0, 1.0);
    float v = 1.0 / (wallBot - p.y + 0.06);
    vec2 r1 = vec2(-A * 0.33, -0.3);
    vec2 r2 = vec2(A * 0.36, -0.36);
    vec2 d1 = (p - r1) * vec2(1.0, 2.6);
    vec2 d2 = (p - r2) * vec2(1.0, 2.6);
    float l1 = length(d1);
    float l2 = length(d2);
    float rings1 = sin(l1 * 150.0);
    float rings2 = sin(l2 * 150.0);
    float waves = sin(v * 6.0 + sin(p.x * 9.0) * 0.6);
    float rake = waves;
    rake = mix(rings1, rake, smoothstep(0.12, 0.2, l1));
    rake = mix(rings2, rake, smoothstep(0.12, 0.2, l2));
    vec3 grit = vec3(0.86, 0.83, 0.77) * (0.9 + 0.12 * hash21(floor(frag * 0.7)));
    grit = mix(grit, grit * vec3(1.05, 0.86, 0.7), L * 0.5);
    grit *= 0.88 + 0.12 * smoothstep(-0.6, 0.6, rake);
    grit *= 1.0 - depth * 0.1;
    col = grit;
    col *= 0.74 + 0.26 * smoothstep(0.0, 0.05, wallBot - p.y);
    float mossN = fbm(p * 7.0);
    for (int k = 0; k < 2; k++) {
      vec2 rc = k == 0 ? r1 : r2;
      vec2 q = (p - rc);
      float moss = sdEll(q * vec2(1.0, 2.4), vec2(0.16, 0.1)) - 0.02 * mossN;
      vec3 mc = pick3(vec3(0.32, 0.46, 0.2), vec3(0.4, 0.42, 0.18), vec3(0.85, 0.88, 0.9));
      mc *= 0.75 + 0.4 * fbm(p * 50.0);
      col = mix(col, mc, cover(moss));
      float rock = sdEll(q - vec2(0.0, 0.03), vec2(0.075, 0.05)) - 0.012 * fbm(q * 30.0);
      vec3 rcC = vec3(0.32, 0.3, 0.3) * (0.7 + 0.5 * smoothstep(-0.03, 0.05, q.y - q.x * 0.3));
      rcC *= 0.85 + 0.25 * fbm(q * 80.0);
      if (winter() > 0.5) rcC = mix(rcC, vec3(0.95, 0.97, 1.0), smoothstep(0.03, 0.07, q.y));
      else rcC = mix(rcC, vec3(0.3, 0.45, 0.2), smoothstep(0.045, 0.075, q.y) * 0.7);
      col = mix(col, rcC, cover(rock));
    }
  }

  /* Koi pond in the near-left corner, with the bamboo deer-scarer on its bank. */
  vec2 pc = vec2(-A * 0.5 + 0.2, -0.43);
  vec2 pq = (p - pc) * vec2(1.0, 2.7);
  float pond = length(pq) - 0.24 - 0.012 * sin(atan(pq.y, pq.x) * 5.0);
  if (pond < 0.06) {
    vec3 water = mix(vec3(0.14, 0.28, 0.32), vec3(0.2, 0.18, 0.28), L * 0.6);
    vec2 refl = vec2(p.x + 0.003 * sin(p.y * 200.0 - t * 2.0), YH + (YH - p.y) * 0.4);
    water = mix(water, skyCol(refl, t) * 0.6, 0.35);
    float age = uRipple;
    float rr = length(pq - vec2(0.05, 0.02));
    water += vec3(0.8, 0.9, 1.0) * smoothstep(0.004, 0.0, abs(rr - age * 0.12)) * exp(-age * 1.4) * 0.5;
    water += vec3(0.8, 0.9, 1.0) * smoothstep(0.004, 0.0, abs(rr - age * 0.07)) * exp(-age * 2.0) * 0.35;
    for (int k = 0; k < 3; k++) {
      float fk = float(k);
      float speed = 0.16 + fk * 0.05;
      float a = t * speed * (k == 1 ? -1.0 : 1.0) + fk * 2.1;
      float rad = 0.1 + fk * 0.035 + 0.02 * sin(t * 0.3 + fk);
      vec2 fc = vec2(cos(a), sin(a)) * rad;
      vec2 dir = normalize(vec2(-sin(a), cos(a)) * (k == 1 ? -1.0 : 1.0));
      vec2 q = pq - fc;
      q = vec2(dot(q, dir), dot(q, vec2(-dir.y, dir.x)));
      float wag = sin(t * 6.0 + fk) * 0.004;
      q.y += wag * smoothstep(0.0, -0.04, q.x) * 2.0;
      float body = sdEll(q, vec2(0.032, 0.011));
      float tail = sdEll((q - vec2(-0.036, 0.0)) * vec2(1.0, 1.0), vec2(0.01, 0.009 + abs(wag)));
      float fish = min(body, tail);
      float spots = smoothstep(0.45, 0.55, vnoise(q * 90.0 + fk * 13.0));
      vec3 kc = k == 0 ? mix(vec3(1.0, 0.98, 0.94), vec3(0.95, 0.35, 0.12), spots) : (k == 1 ? mix(vec3(0.98, 0.6, 0.15), vec3(1.0, 0.85, 0.5), spots) : mix(vec3(0.95, 0.95, 0.92), vec3(0.08, 0.08, 0.1), spots));
      float sink = 0.55 + 0.25 * sin(t * 0.5 + fk * 2.0);
      water = mix(water, mix(water, kc, sink), cover(fish / 2.7));
    }
    for (int k = 0; k < 3; k++) {
      float fk = float(k);
      vec2 lc = vec2(-0.12 + fk * 0.1, -0.08 + fk * 0.06 + 0.01 * sin(fk * 5.0)) + 0.004 * vec2(sin(t * 0.4 + fk), cos(t * 0.5 + fk));
      vec2 q = pq - lc;
      float pad = length(q) - 0.035;
      float notch = step(abs(atan(q.y, q.x) - fk * 1.7), 0.25);
      vec3 lp = vec3(0.22, 0.42, 0.2) * (0.85 + 0.2 * smoothstep(0.0, 0.035, length(q)));
      if (winter() > 0.5) lp = mix(lp, vec3(0.9, 0.93, 0.96), 0.5);
      water = mix(water, lp, cover(pad / 2.7) * (1.0 - notch));
    }
    float shishi = mod(t, PERIOD);
    float splash = shishi - (PERIOD - 0.9);
    if (splash > 0.0) {
      float sr = length(pq - vec2(0.17, 0.05));
      water += vec3(0.9, 0.95, 1.0) * smoothstep(0.004, 0.0, abs(sr - splash * 0.09)) * exp(-splash * 1.6) * 0.6;
    }
    water += vec3(1.0, 0.95, 0.85) * pow(max(0.0, vnoise(vec2(p.x * 60.0 - t * 0.3, p.y * 240.0))), 12.0) * 0.6;
    col = mix(col, water, cover(pond / 2.7));
    float rim = abs(pond) - 0.012;
    vec3 stone = vec3(0.42, 0.4, 0.38) * (0.7 + 0.45 * vnoise(pq * 40.0));
    if (winter() > 0.5) stone = mix(stone, vec3(0.95, 0.97, 1.0), 0.55);
    col = mix(col, stone, cover(rim / 2.7) * smoothstep(0.3, 0.5, vnoise(vec2(atan(pq.y, pq.x) * 6.0, 1.0))));
  }
  {
    vec2 piv = pc + vec2(0.26, 0.06);
    float u = mod(t, PERIOD);
    float a = mix(0.32, 0.08, smoothstep(0.0, PERIOD - 1.2, u));
    a = mix(a, -0.55, smoothstep(PERIOD - 1.2, PERIOD - 0.9, u));
    a = mix(a, 0.32, smoothstep(PERIOD - 0.5, PERIOD - 0.3, u));
    vec2 dir = vec2(-cos(a), sin(a));
    vec2 tipA = piv + dir * 0.08;
    vec2 tipB = piv - dir * 0.045;
    float tube = sdSeg(p, tipB, tipA) - 0.008;
    vec3 bam = vec3(0.55, 0.62, 0.3) * (0.8 + 0.3 * smoothstep(-0.006, 0.006, dot(p - piv, vec2(-dir.y, dir.x))));
    float posts = min(sdBox(p - piv + vec2(0.0, 0.03), vec2(0.004, 0.03)), sdBox(p - piv + vec2(-0.012, 0.03), vec2(0.004, 0.03)));
    col = mix(col, vec3(0.4, 0.3, 0.18), cover(posts));
    col = mix(col, bam, cover(tube));
    col = mix(col, vec3(0.3, 0.32, 0.14), cover(abs(length(p - tipA) - 0.006) - 0.002));
    vec2 spout = piv + vec2(-0.1, 0.07);
    float feed = sdSeg(p, spout + vec2(0.0, 0.02), spout + vec2(0.06, 0.02)) - 0.006;
    col = mix(col, vec3(0.5, 0.56, 0.28), cover(feed));
    float drip = sdSeg(p, spout + vec2(0.06, 0.015), mix(spout + vec2(0.06, -0.02), tipA, 0.6)) - 0.0012;
    col = mix(col, vec3(0.75, 0.88, 0.95), cover(drip) * 0.7 * (0.6 + 0.4 * sin(t * 30.0 + p.y * 300.0)));
    float hit = sdEll(p - tipB + vec2(0.0, 0.012), vec2(0.016, 0.008));
    col = mix(col, vec3(0.38, 0.36, 0.34), cover(hit));
  }

  /* Bamboo grove on the right, swaying, its leaves catching the wind. */
  if (p.x > A * 0.5 - 0.3) {
    for (int i = 0; i < 9; i++) {
      float fi = float(i);
      float x0 = A * 0.5 - 0.02 - fi * 0.032 - hash11(fi) * 0.012;
      float base = YW - 0.1 + hash11(fi + 3.0) * 0.03;
      float hgt = p.y - base;
      float sway = (sin(t * 0.7 + fi * 0.8) * 0.012 + wind * 0.01) * hgt * hgt;
      float w = 0.007 + hash11(fi + 7.0) * 0.005;
      float stalk = abs(p.x - x0 - sway) - w;
      stalk = max(stalk, base - p.y);
      vec3 sc = mix(vec3(0.42, 0.58, 0.26), vec3(0.62, 0.72, 0.34), hash11(fi + 2.0));
      sc *= 0.75 + 0.4 * smoothstep(-w, w, p.x - x0 - sway);
      float node = smoothstep(0.003, 0.0, abs(fract(hgt * 11.0 + hash11(fi)) - 0.5) - 0.47);
      sc *= 1.0 - node * 0.35;
      if (winter() > 0.5) sc = mix(sc, sc * vec3(0.85, 0.9, 0.95), 0.4);
      col = mix(col, sc * (0.82 + 0.18 * fi / 9.0), cover(stalk));
      for (int k = 0; k < 5; k++) {
        float fk = float(k);
        float ly = base + 0.18 + fk * 0.08 + hash11(fi * 7.0 + fk) * 0.05;
        float lh = ly - base;
        vec2 lc = vec2(x0 + (sin(t * 0.7 + fi * 0.8) * 0.012 + wind * 0.01) * lh * lh, ly);
        float side = hash11(fi * 3.0 + fk) > 0.5 ? 1.0 : -1.0;
        float flutter = sin(t * 2.3 + fi + fk * 1.7) * 0.15 + wind * 0.1;
        vec2 q = rot(side * (0.5 + flutter)) * (p - lc - vec2(side * 0.028, -0.008));
        float leaf = sdEll(q, vec2(0.03, 0.0055));
        vec3 lcC = mix(vec3(0.3, 0.5, 0.2), vec3(0.48, 0.64, 0.26), hash11(fi + fk * 11.0));
        if (winter() > 0.5) lcC = mix(lcC, vec3(0.95, 0.97, 1.0), smoothstep(0.0, 0.004, q.y) * 0.8);
        col = mix(col, lcC, cover(leaf));
      }
    }
  }

  /* Stone lantern in the near-right corner, glowing more as the light goes. */
  {
    vec2 lb = vec2(A * 0.5 - mix(0.2, 0.12, tall), -0.42);
    float hs = mix(1.0, 0.8, tall);
    vec2 q = (p - lb) / hs;
    float base = sdBox(q - vec2(0.0, 0.012), vec2(0.04, 0.012));
    float pillar = sdBox(q - vec2(0.0, 0.06), vec2(0.014, 0.04));
    float shelf = sdBox(q - vec2(0.0, 0.104), vec2(0.04, 0.007));
    float box = sdBox(q - vec2(0.0, 0.135), vec2(0.028, 0.024));
    float curl = 0.012 * pow(abs(q.x) / 0.06, 3.0);
    float roof = sdBox(q - vec2(0.0, 0.168 + curl), vec2(0.06 - (q.y - 0.168) * 0.6, 0.008));
    float cap = length(q - vec2(0.0, 0.19)) - 0.012;
    float finial = length(q - vec2(0.0, 0.207)) - 0.006;
    float lantern = min(min(min(base, pillar), min(shelf, box)), min(min(roof, cap), finial)) * hs;
    vec3 stoneC = vec3(0.5, 0.49, 0.46) * (0.75 + 0.35 * fbm(q * 60.0));
    stoneC *= 0.8 + 0.3 * smoothstep(-0.04, 0.04, q.x);
    stoneC = mix(stoneC, vec3(0.32, 0.45, 0.22), smoothstep(0.55, 0.75, fbm(q * 30.0 + 3.0)) * 0.6);
    if (winter() > 0.5) stoneC = mix(stoneC, vec3(0.96, 0.98, 1.0), smoothstep(0.17, 0.18, q.y) * step(abs(q.x), 0.055) + smoothstep(0.108, 0.112, q.y) * step(q.y, 0.115) * 0.9);
    float flick = 0.8 + 0.12 * sin(t * 13.0) + 0.08 * sin(t * 7.3 + 1.0);
    float on = 0.35 + 0.65 * smoothstep(0.2, 0.9, L);
    float window = sdBox(q - vec2(0.0, 0.135), vec2(0.016, 0.014)) * hs;
    col += vec3(1.0, 0.65, 0.3) * exp(-length(q - vec2(0.0, 0.135)) * 14.0) * 0.4 * on * flick;
    col = mix(col, stoneC, cover(lantern));
    col = mix(col, vec3(1.0, 0.78, 0.42) * flick * (0.6 + 0.6 * on), cover(window) * on);
  }

  /* The great tree leaning in from the top left: blossom, maple, or snow on bare plum. */
  {
    vec2 o = vec2(-A * 0.5, 0.0);
    float sway = wind * 0.006 + sin(t * 0.5) * 0.004;
    vec2 br0 = o + vec2(0.12, 0.33);
    float wood = treeWood(p, o, sway);
    vec3 bark = vec3(0.2, 0.14, 0.12) * (0.75 + 0.35 * vnoise(vec2(p.x * 90.0, p.y * 14.0)));
    bark = mix(bark, bark * vec3(1.2, 0.9, 0.7), L * 0.4);
    col = mix(col, bark, cover(wood));
    if (winter() > 0.5) {
      float below = treeWood(p - vec2(0.0, 0.007), o, sway);
      float snow = max(below, -wood - 0.0035);
      col = mix(col, vec3(0.95, 0.97, 1.0) * (0.9 + 0.1 * vnoise(p * 300.0)), cover(snow));
      for (int k = 0; k < 16; k++) {
        float fk = float(k);
        float u = hash11(fk * 3.3);
        vec2 e = br0 + vec2(0.1 + floor(u * 5.0) * 0.07, 0.03 + 0.05 * sin(floor(u * 5.0) * 1.9)) + vec2(sway, 0.0) * (floor(u * 5.0) + 1.0);
        vec2 fc = mix(br0 + vec2(floor(u * 5.0) * 0.04, 0.0), e, 0.3 + 0.7 * hash11(fk * 5.1)) + vec2(0.0, 0.006);
        float bl = length(p - fc) - 0.0055;
        col = mix(col, vec3(0.86, 0.16, 0.25), cover(bl));
        col = mix(col, vec3(1.0, 0.85, 0.4), cover(length(p - fc) - 0.0018));
      }
    } else {
      float canopy = 1.0;
      float shade = 0.0;
      for (int k = 0; k < 11; k++) {
        float fk = float(k);
        vec2 cc = o + vec2(0.06 + fk * 0.045 + hash11(fk) * 0.03, 0.36 + 0.06 * sin(fk * 1.3) + hash11(fk + 5.0) * 0.05) + vec2(sway * (1.0 + fk * 0.4), 0.0);
        float rr = 0.06 + hash11(fk + 9.0) * 0.04;
        float d = length(p - cc) - rr;
        if (d < canopy) shade = clamp((p.y - cc.y) / rr, -1.0, 1.0);
        canopy = min(canopy, d);
      }
      float n = fbm(p * 38.0 + vec2(wind * 0.3, 0.0));
      canopy += (n - 0.5) * 0.05;
      vec3 bloom = uSeason < 0.5 ? vec3(0.98, 0.76, 0.84) : vec3(0.86, 0.32, 0.16);
      vec3 bloom2 = uSeason < 0.5 ? vec3(1.0, 0.92, 0.95) : vec3(0.97, 0.62, 0.22);
      vec3 cc = mix(bloom, bloom2, smoothstep(0.4, 0.75, fbm(p * 70.0)));
      cc *= 0.78 + 0.3 * (shade * 0.5 + 0.5);
      cc = mix(cc, cc * vec3(1.08, 0.86, 0.72), L * 0.4);
      float holes = smoothstep(0.62, 0.7, vnoise(p * 120.0)) * smoothstep(-0.03, 0.0, canopy);
      col = mix(col, cc, cover(canopy) * (1.0 - holes));
    }
  }

  /* Petals, leaves or snow on the wind; a five sends a gust of them across. */
  {
    float density = (winter() > 0.5 ? 0.35 : 0.16) + uGust * 0.5;
    for (int l = 0; l < 3; l++) {
      float fl = float(l);
      float cs = 0.1 - fl * 0.022;
      float speed = 0.04 + fl * 0.02 + uGust * 0.25;
      vec2 drift = vec2(-t * speed * (1.0 + wind * 0.15), t * (0.035 + fl * 0.012));
      vec2 q = p + drift + vec2(0.0, sin(p.x * 3.0 + t * 0.5 + fl) * 0.02);
      vec2 cell = floor(q / cs);
      float h = hash21(cell + fl * 19.7);
      if (h < density) {
        vec2 sp = (cell + 0.5 + 0.3 * vec2(sin(t * (0.5 + h) + h * 30.0), cos(t * (0.4 + h * 0.8) + h * 50.0))) * cs;
        vec2 d = q - sp;
        float spin = t * (1.0 + h * 2.0) + h * 20.0;
        d = rot(spin * 0.4) * d;
        d.x /= max(0.2, abs(cos(spin)));
        float sz = (0.0045 + fl * 0.0018) * (winter() > 0.5 ? 0.7 : 1.0);
        float pd = winter() > 0.5 ? length(d) - sz * 0.8 : sdEll(d, vec2(sz * 0.7, sz * 1.15));
        vec3 pcC = petalCol(hash21(cell + 3.0));
        pcC = mix(pcC, pcC * vec3(1.05, 0.85, 0.7), L * 0.3);
        float a2 = cover(pd) * (0.75 + 0.25 * fl / 2.0);
        if (winter() > 0.5) a2 = smoothstep(sz * 1.6, 0.0, length(d)) * 0.9;
        col = mix(col, pcC, a2);
      }
    }
  }

  /* Long light from the sun, warmer late in the day. */
  vec2 sv = p - SUN;
  float ang = atan(sv.y, sv.x);
  float rays = pow(max(0.0, vnoise(vec2(ang * 9.0, t * 0.05))), 3.0) * smoothstep(1.2, 0.1, length(sv)) * step(sv.y, 0.0);
  col += mix(vec3(1.0, 0.95, 0.8), vec3(1.0, 0.6, 0.3), L) * rays * 0.12;

  col += vec3(0.4, 0.6, 1.0) * 0.035 * clamp(uTurn, 0.0, 1.0) * smoothstep(0.1, -0.5, p.y) * smoothstep(0.3, -A * 0.5, p.x);
  col += vec3(1.0, 0.8, 0.4) * 0.04 * clamp(-uTurn, 0.0, 1.0) * smoothstep(0.1, -0.5, p.y) * smoothstep(-0.3, A * 0.5, p.x);
  col *= 1.0 + uWarm * 0.18 * vec3(1.0, 0.85, 0.6);
  col *= mix(vec3(1.0), vec3(1.04, 0.94, 0.86), L * 0.5);

  vec2 vg = frag / uRes - 0.5;
  col *= 1.0 - 0.5 * dot(vg, vg);
  col = 1.0 - exp(-col * 1.25);
  col = pow(col, vec3(0.92));
  col += (hash21(frag + fract(t) * 91.0) - 0.5) * 0.008;
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

	function grounds(canvas: HTMLCanvasElement) {
		const pass = createFullscreenPass(canvas, FRAG, 'zen garden grounds');
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
		let gusting = 0;
		let warm = 0;
		let lean = 0;
		let day = untrack(() => light);
		let rippleAt = -100;
		let lastClack = -1;

		const draw = (ms: number) => {
			if (!cssW || !cssH) return;
			const dt = Math.min(1 / 20, Math.max(0, (ms - last) / 1000));
			last = ms;
			const time = (ms - t0) / 1000;
			const ease = (rate: number) => (calm ? 1 : 1 - Math.exp(-dt * rate));
			warm += ((mood === 'won' ? 1 : mood === 'draw' ? 0.5 : 0) - warm) * ease(1.2);
			gusting *= Math.exp(-dt * 0.45);
			day += (light - day) * ease(0.4);
			lean += ((turn === 1 ? 1 : turn === 2 ? -1 : 0) - lean) * ease(2.5);
			if (!calm) {
				const cycle = Math.floor((time - CLACK_AT) / CLACK_PERIOD);
				if (time > CLACK_AT && cycle !== lastClack) {
					if (lastClack >= 0 || cycle === 0) onclack?.();
					lastClack = cycle;
				}
			}

			gl.useProgram(pass.program);
			gl.uniform2f(pass.uniform('uRes'), canvas.width, canvas.height);
			gl.uniform1f(pass.uniform('uTime'), calm ? 4 : time);
			gl.uniform1f(pass.uniform('uSeason'), season === 'spring' ? 0 : season === 'autumn' ? 1 : 2);
			gl.uniform1f(pass.uniform('uLight'), day);
			gl.uniform1f(pass.uniform('uGust'), calm ? 0 : gusting);
			gl.uniform1f(pass.uniform('uRipple'), calm ? 100 : time - rippleAt);
			gl.uniform1f(pass.uniform('uTurn'), lean);
			gl.uniform1f(pass.uniform('uWarm'), warm);
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

		let seenGust = untrack(() => gust);
		$effect(() => {
			const next = gust;
			untrack(() => {
				if (next > seenGust) gusting = 1;
				seenGust = next;
			});
		});

		let seenPlaced = untrack(() => placed);
		$effect(() => {
			const next = placed;
			untrack(() => {
				if (next > seenPlaced) rippleAt = (performance.now() - t0) / 1000;
				seenPlaced = next;
			});
		});

		$effect(() => {
			void mood;
			void season;
			void turn;
			void light;
			void gust;
			void placed;
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

<div class="grounds" aria-hidden="true">
	{#if failed}
		<div class="fallback"></div>
	{:else}
		<canvas {@attach grounds}></canvas>
	{/if}
</div>

<style>
	.grounds {
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
			radial-gradient(30% 20% at 70% 25%, rgba(255, 240, 210, 0.6), transparent 70%),
			linear-gradient(180deg, #7aa0cf 0%, #f6dcd2 34%, #8a9aa0 38%, #d9b779 42%, #d8d2c4 48%, #c9c1b1 100%);
	}
</style>
