<script lang="ts">
	import { untrack } from 'svelte';
	import { createFullscreenPass } from '$lib/gl/fullscreen';
	import { createPacer } from '$lib/gl/pace';

	type Mood = 'menu' | 'play' | 'won' | 'draw';

	let {
		mood = 'menu',
		turn = 0,
		flare = 0,
		strokes = 0,
		burn = 0.2
	}: {
		mood?: Mood;
		/** Whose quill is up; the compass needle swings to them. 0 on the menu. */
		turn?: 0 | 1 | 2;
		/** Bumps when squares close; the candle flares. */
		flare?: number;
		/** Bumps on every inked line; the inkwell ripples. */
		strokes?: number;
		/** 0–1, how far the candle has burned; wax pools in the dish like an hourglass. */
		burn?: number;
	} = $props();

	let failed = $state(false);

	const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uFlare;
uniform float uWarm;
uniform float uNeedle;
uniform vec3 uTurnInk;
uniform float uInkAge;
uniform float uWax;
out vec4 outColor;

#define PI 3.14159265

float AA;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  return 0.55 * vnoise(p) + 0.3 * vnoise(p * 2.03 + 7.1) + 0.15 * vnoise(p * 4.1 + 3.7);
}

mat2 rot(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c);
}

float cover(float d) {
  return clamp(0.5 - d / AA, 0.0, 1.0);
}

float sdBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

float sdSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

float sdEll(vec2 p, vec2 r) {
  return (length(p / r) - 1.0) * min(r.x, r.y);
}

/* Isosceles triangle, tip at the origin, base at y = q.y. */
float sdTri(vec2 p, vec2 q) {
  p.x = abs(p.x);
  vec2 a = p - q * clamp(dot(p, q) / dot(q, q), 0.0, 1.0);
  vec2 b = p - q * vec2(clamp(p.x / q.x, 0.0, 1.0), 1.0);
  float s = -sign(q.y);
  vec2 d = min(vec2(dot(a, a), s * (p.x * q.y - p.y * q.x)), vec2(dot(b, b), s * (p.y - q.y)));
  return -sqrt(d.x) * sign(d.y);
}

vec3 wood(vec2 p) {
  float rows = 5.0;
  float pl = floor(p.y * rows);
  float off = hash21(vec2(pl, 7.0)) * 20.0;
  float g = fbm(vec2(p.x * 2.2 + off, p.y * rows * 7.0));
  float fine = sin(p.y * rows * 40.0 + g * 9.0 + vnoise(vec2(p.x * 9.0 + off, p.y * 60.0)) * 1.5);
  vec3 dark = vec3(0.2, 0.105, 0.05);
  vec3 mid = vec3(0.4, 0.22, 0.105);
  vec3 c = mix(dark, mid, smoothstep(0.25, 0.8, g));
  c *= 0.86 + 0.14 * fine;
  c *= 0.88 + 0.22 * hash21(vec2(pl, 3.0));
  float fy = fract(p.y * rows);
  c *= 0.5 + 0.5 * smoothstep(0.0, 0.035, fy) * smoothstep(1.0, 0.975, fy);
  float seg = (p.x + off * 0.07) / 1.1;
  float fx = fract(seg);
  c *= 0.55 + 0.45 * smoothstep(0.0, 0.004, fx) * smoothstep(1.0, 0.996, fx);
  vec2 kp = vec2((floor(seg) + 0.25 + 0.5 * hash21(vec2(floor(seg), pl))) * 1.1 - off * 0.07, (pl + 0.3 + 0.4 * hash21(vec2(pl, floor(seg)))) / rows);
  float kd = length((p - kp) * vec2(1.0, 2.6));
  c = mix(c, dark * 0.6, smoothstep(0.03, 0.0, kd) * 0.85);
  c *= 0.92 + 0.08 * sin(kd * 260.0) * smoothstep(0.09, 0.03, kd);
  return c;
}

vec3 paper(vec2 p, vec2 o, vec2 size, float ang, float seed, inout float mask) {
  vec2 q = rot(ang) * (p - o);
  float d = sdBox(q, size) - 0.002;
  float m = cover(d);
  if (m <= 0.0) return vec3(0.0);
  vec3 pc = vec3(0.86, 0.77, 0.58) * (0.88 + 0.12 * fbm(q * 30.0 + seed));
  pc *= 0.8 + 0.2 * smoothstep(0.0, -0.02, d);
  float ly = (q.y + size.y - 0.02) / 0.016;
  float li = floor(ly);
  float wave = sin(q.x * 820.0 + li * 7.0) * 0.07 + sin(q.x * 260.0 + li) * 0.05;
  float inLine = smoothstep(0.13, 0.04, abs(fract(ly) - 0.5 + wave));
  float len = size.x * (0.55 + 0.4 * hash21(vec2(li, seed)));
  float x0 = -size.x + 0.02;
  float inside = step(x0, q.x) * step(q.x, x0 + len * 2.0 - 0.04) * step(0.0, ly) * step(q.y, size.y - 0.02);
  float words = step(0.3, vnoise(vec2(q.x * 70.0, li * 3.0 + seed)));
  pc = mix(pc, vec3(0.22, 0.13, 0.07), inLine * words * inside * 0.55);
  mask = max(mask, m);
  return pc;
}

float quillSd(vec2 p, vec2 a, vec2 dir, float len, out float u, out float v, out float w) {
  vec2 q = p - a;
  u = dot(q, dir) / len;
  v = dot(q, vec2(-dir.y, dir.x)) - 0.06 * u * u * len;
  w = 0.03 * smoothstep(0.08, 0.38, u) * (1.0 - smoothstep(0.8, 1.0, u)) + 0.003;
  float side = v > 0.0 ? 1.0 : 0.62;
  return max(abs(v) - w * side, max(-u * len, (u - 1.0) * len));
}

/* 0 curled, 1 at full stretch. */
float STRETCH;

float catBody(vec2 q, float breath) {
  return sdEll(q, vec2(0.118 * (1.0 + 0.32 * STRETCH), 0.088 * (1.0 - 0.22 * STRETCH)) * breath);
}

vec2 catHead(float alert) {
  return vec2(0.082, 0.042) + alert * vec2(0.006, 0.012) + STRETCH * vec2(0.05, 0.0);
}

/* Tail curled around the front of the body; 'along' runs 0 at the root to 1 at the tip. */
float catTail(vec2 q, out float along) {
  q.x += STRETCH * 0.03;
  float ta = atan(q.y, q.x);
  along = clamp((ta + 2.7) / 2.55, 0.0, 1.0);
  vec2 rad = vec2(0.132 * (1.0 + 0.1 * STRETCH), 0.104 * (1.0 + 0.25 * STRETCH));
  float ring = abs(length(q / rad) - 1.0) * rad.y - 0.015 * (1.0 - along * along * 0.8);
  vec2 tip = vec2(cos(-0.15) * rad.x, sin(-0.15) * rad.y);
  return min(max(ring, max(-2.7 - ta, ta + 0.15)), length(q - tip) - 0.0035);
}

float catSd(vec2 q, float breath, float alert) {
  float body = catBody(q, breath);
  float head = length(q - catHead(alert)) - 0.044;
  float along;
  return min(min(body, head), catTail(q, along));
}

float mouseSd(vec2 q, float t, out float part) {
  float body = sdEll(q, vec2(0.024, 0.013));
  float head = sdEll(q - vec2(0.022, 0.0), vec2(0.014, 0.0085));
  float ears = min(length(q - vec2(0.016, 0.009)) - 0.0055, length(q - vec2(0.016, -0.009)) - 0.0055);
  float tv = q.y - 0.006 * sin(q.x * 110.0 + t * 30.0);
  float tail = max(abs(tv) - 0.0016, max(q.x + 0.018, -q.x - 0.08));
  float d = min(min(body, head), min(ears, tail));
  part = ears < min(body, head) ? 1.0 : 0.0;
  return d;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  AA = 1.6 / uRes.y;
  float A = uRes.x / uRes.y;
  vec2 p = (frag - 0.5 * uRes) / uRes.y;
  float t = uTime;
  float tall = 1.0 - smoothstep(0.8, 1.1, A);
  float sc = mix(1.0, 0.8, tall);

  vec2 L = mix(vec2(-A * 0.5 + 0.17, 0.26), vec2(-A * 0.5 + 0.1, 0.29), tall);
  vec2 I = mix(vec2(A * 0.5 - 0.16, 0.3), vec2(A * 0.5 - 0.09, 0.3), tall);
  vec2 C = mix(vec2(A * 0.5 - 0.18, -0.27), vec2(A * 0.5 - 0.09, -0.42), tall);
  vec2 K = vec2(-A * 0.5 + 0.13, -0.37);
  vec2 G = mix(vec2(-A * 0.5 + 0.42, -0.34), vec2(0.0, -0.05), tall);

  /* A gust through the window every so often: the flame gutters and loose things stir. */
  vec2 wind = normalize(vec2(-1.0, -0.6));
  float gp = mod(t + 20.0, 53.0);
  float gust = smoothstep(0.0, 0.6, gp) * smoothstep(3.4, 1.6, gp);
  float gustWave = sin(clamp(gp / 3.4, 0.0, 1.0) * PI);

  /* The cat wakes every 95 s, stretches, and turns to settle at a new angle. */
  float cp = mod(t + 40.0, 95.0);
  float cyc = floor((t + 40.0) / 95.0);
  STRETCH = sin(clamp(cp / 5.5, 0.0, 1.0) * PI);
  STRETCH *= STRETCH;
  mat2 catTurn = rot(mix(0.75 * sin((cyc - 1.0) * 2.1), 0.75 * sin(cyc * 2.1), smoothstep(1.0, 5.0, cp)));

  float flick = 0.86 + 0.07 * sin(t * 11.0 + sin(t * 3.1) * 2.0) + 0.1 * (vnoise(vec2(t * 9.0, 1.0)) - 0.5);
  flick *= 1.0 - 0.5 * gust * (0.6 + 0.4 * sin(t * 23.0));
  flick += uFlare * 0.45;
  vec2 sway = vec2(sin(t * 7.3) + 0.5 * sin(t * 13.1), cos(t * 6.1)) * 0.0022 * sc;
  sway += wind * 0.012 * gust * sc * (0.7 + 0.3 * sin(t * 19.0));
  vec2 Lj = L + sway;

  /* Desk, papers. */
  vec3 col = wood(p);
  float pm = 0.0;
  vec3 flut = gust * vec3(sin(t * 17.0), sin(t * 14.0 + 1.7), sin(t * 19.0 + 3.1));
  vec2 lift = wind * 0.006 * gustWave;
  vec3 pc = paper(p, L + vec2(0.1, -0.08) * sc + lift, vec2(0.14, 0.1) * sc, 0.28 + 0.05 * flut.x, 1.0, pm);
  col = mix(col, pc, pm);
  pm = 0.0;
  pc = paper(p, C + vec2(-0.13, 0.07) * sc + lift, vec2(0.13, 0.09) * sc, -0.34 + 0.04 * flut.y, 4.0, pm);
  col = mix(col, pc, pm);
  if (A > 1.3) {
    pm = 0.0;
    pc = paper(p, vec2(A * 0.5 - 0.2, 0.02) + lift * 1.5, vec2(0.11, 0.15), 0.12 + 0.06 * flut.z, 9.0, pm);
    col = mix(col, pc, pm);
  }

  /* Shadows from everything standing on the desk. */
  float shade = 0.0;
  {
    vec2 sd = normalize(I - L);
    vec2 q = (p - I - sd * 0.02 * sc) / sc;
    vec2 aq = abs(q);
    float oct = max(max(aq.x, aq.y), (aq.x + aq.y) * 0.7071) - 0.058;
    shade = max(shade, (1.0 - smoothstep(-0.01, 0.02, oct)) * 0.55);
    float u; float v; float w;
    vec2 qd = normalize(vec2(-0.78, -0.42));
    float qs = quillSd(p - normalize(I - L) * 0.05 * sc, I, qd, 0.32 * sc, u, v, w);
    shade = max(shade, (1.0 - smoothstep(-0.006, 0.02, qs)) * 0.35);
  }
  {
    vec2 sd = normalize(C - L);
    float cs = length(p - C - sd * 0.012 * sc) - 0.088 * sc;
    shade = max(shade, (1.0 - smoothstep(-0.01, 0.015, cs)) * 0.5);
  }
  {
    float breath = 1.0 + 0.03 * sin(t * 1.25);
    vec2 sd = normalize(K - L);
    vec2 q = catTurn * (p - K - sd * 0.018) / sc;
    float cs = catSd(q, breath, 0.0);
    shade = max(shade, (1.0 - smoothstep(-0.015, 0.025, cs)) * 0.5);
  }
  {
    vec2 sd = normalize(G - L);
    vec2 hd = normalize(vec2(0.8, -0.55));
    vec2 q = p - sd * 0.03 * sc;
    float ring = abs(length(q - G) - 0.072 * sc) - 0.007 * sc;
    float handle = sdSeg(q, G + hd * 0.078 * sc, G + hd * 0.22 * sc) - 0.012 * sc;
    shade = max(shade, (1.0 - smoothstep(-0.008, 0.018, min(ring, handle))) * 0.45);
  }

  /* Moth circling the flame, and the giant moth on the desk it casts. */
  float ma = t * 1.9 + 1.3 * sin(t * 0.7);
  float mr = (0.08 + 0.03 * sin(t * 2.7) + 0.012 * sin(t * 7.1)) * sc;
  vec2 M = Lj + vec2(cos(ma), sin(ma) * 0.85) * mr + wind * 0.06 * gustWave * sc;
  vec2 tang = normalize(vec2(-sin(ma), cos(ma) * 0.85));
  float flap = 0.3 + 0.7 * abs(sin(t * 36.0));
  float mothD;
  {
    vec2 S = Lj + (M - Lj) * 3.4;
    vec2 q = p - S;
    q = vec2(dot(q, tang), dot(q, vec2(-tang.y, tang.x))) / (3.4 * sc);
    float body = sdEll(q, vec2(0.014, 0.0055));
    vec2 wq = vec2(q.x + 0.003, abs(q.y));
    float wing = sdEll(wq - vec2(-0.002, 0.012 * flap), vec2(0.013, 0.011 * flap + 0.001));
    float d = min(body, wing) * 3.4 * sc;
    shade = max(shade, (1.0 - smoothstep(-0.01, 0.03, d)) * 0.28);
    q = p - M;
    q = vec2(dot(q, tang), dot(q, vec2(-tang.y, tang.x))) / sc;
    body = sdEll(q, vec2(0.014, 0.0055));
    wq = vec2(q.x + 0.003, abs(q.y));
    wing = sdEll(wq - vec2(-0.002, 0.012 * flap), vec2(0.013, 0.011 * flap + 0.001));
    mothD = min(body, wing) * sc;
  }

  /* Candle. */
  vec3 glow = vec3(0.0);
  {
    vec2 q = (p - L) / sc;
    float r = length(q);
    float ring = abs(length(q - vec2(0.1, -0.035)) - 0.022) - 0.006;
    vec3 brass = vec3(0.8, 0.58, 0.27);
    vec3 dc = brass * (0.7 + 0.35 * smoothstep(0.085, 0.055, r));
    dc += vec3(1.0, 0.85, 0.5) * 0.3 * smoothstep(0.006, 0.0, abs(r - 0.079));
    col = mix(col, dc, cover(min(r - 0.086, ring) * sc));
    float ang = atan(q.y, q.x);
    float drips = 0.018 * pow(max(0.0, sin(ang * 3.0 + 1.3)), 8.0) + 0.012 * pow(max(0.0, sin(ang * 5.0 + 0.4)), 12.0);
    float pool = 0.039 + uWax * 0.012 + 0.0015 * sin(ang * 7.0 + 2.0) * uWax;
    float wax = r - (pool + drips * (1.0 - 0.5 * uWax));
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float a = 0.7 + fi * 2.3;
      float grow = smoothstep(0.1 + fi * 0.25, 0.4 + fi * 0.25, uWax);
      wax = min(wax, length(q - vec2(cos(a), sin(a)) * (0.045 + 0.008 * grow)) - 0.016 * grow);
    }
    float spill = length(q - vec2(cos(-2.2), sin(-2.2)) * 0.095) - 0.016 * smoothstep(0.55, 1.0, uWax);
    spill = min(spill, sdSeg(q, vec2(cos(-2.2), sin(-2.2)) * 0.06, vec2(cos(-2.2), sin(-2.2)) * 0.093)
      - 0.007 * smoothstep(0.45, 0.8, uWax));
    wax = min(wax, spill + step(uWax, 0.45));
    col = mix(col, vec3(0.86, 0.8, 0.68) * (0.92 + 0.08 * smoothstep(0.0, -0.01, wax)), cover(wax * sc));
    col = mix(col, vec3(0.74, 0.68, 0.56), cover((r - 0.034) * sc));
    col = mix(col, vec3(0.95, 0.9, 0.79), cover((r - 0.03) * sc));
    col = mix(col, vec3(0.08, 0.05, 0.03), cover((length(q - vec2(0.003, -0.002)) - 0.0035) * sc));
    glow += vec3(1.0, 0.68, 0.32) * 0.18 * smoothstep(0.034, 0.0, r) * flick;
  }

  /* Inkwell and quill. */
  {
    vec2 q = (p - I) / sc;
    float r = length(q);
    vec2 aq = abs(q);
    float oct = max(max(aq.x, aq.y), (aq.x + aq.y) * 0.7071) - 0.058;
    vec3 glass = mix(col * 0.5, vec3(0.1, 0.2, 0.23), 0.5);
    glass += vec3(0.6, 0.8, 0.85) * 0.18 * smoothstep(0.006, 0.0, abs(oct + 0.005));
    col = mix(col, glass, cover(oct * sc));
    col = mix(col, vec3(0.42, 0.4, 0.37) * (0.8 + 0.3 * smoothstep(0.036, 0.028, r)), cover((r - 0.036) * sc));
    vec3 ink = vec3(0.02, 0.03, 0.07);
    float rip = smoothstep(0.003, 0.0, abs(r - uInkAge * 0.03)) * exp(-uInkAge * 2.2);
    ink += vec3(0.25, 0.3, 0.45) * rip;
    vec2 toL = normalize(L - I);
    ink += vec3(1.0, 0.8, 0.55) * exp(-dot(q - toL * 0.01, q - toL * 0.01) / 0.00002) * 0.8 * flick;
    col = mix(col, ink, cover((r - 0.025) * sc));

    float u; float v; float w;
    vec2 qd = normalize(vec2(-0.78, -0.42));
    float qs = quillSd(p, I, qd, 0.32 * sc, u, v, w);
    float len = 0.32 * sc;
    vec3 fc = vec3(0.93, 0.91, 0.85) * (0.86 + 0.14 * sin(u * len * 900.0 + abs(v) * 700.0 * sign(v)));
    fc = mix(fc, vec3(0.55, 0.5, 0.47), smoothstep(0.6, 1.0, abs(v) / max(w, 0.001)) * 0.6 * smoothstep(0.5, 1.0, u));
    fc = mix(fc, vec3(0.97, 0.94, 0.86), smoothstep(0.0022, 0.0, abs(v)));
    col = mix(col, fc, cover(qs) * step(0.08, u));
  }

  /* Brass compass, its needle on whoever holds the quill, and a few coins. */
  {
    vec2 q = (p - C) / sc;
    float r = length(q);
    float ang = atan(q.y, q.x);
    col = mix(col, vec3(0.72, 0.52, 0.26), cover((abs(length(q - vec2(0.0, 0.095)) - 0.014) - 0.004) * sc));
    vec3 cc = vec3(0.62, 0.44, 0.2) * (0.92 + 0.08 * sin(ang * 90.0));
    cc += vec3(1.0, 0.85, 0.5) * 0.25 * smoothstep(0.005, 0.0, abs(r - 0.08));
    col = mix(col, cc, cover((r - 0.088) * sc));
    vec3 card = vec3(0.93, 0.87, 0.72);
    float tick = smoothstep(0.08, 0.0, abs(fract(ang / (2.0 * PI) * 32.0 + 0.5) - 0.5)) * step(0.06, r);
    card = mix(card, vec3(0.3, 0.2, 0.1), tick * 0.8);
    float star = mix(0.012, 0.056, pow(abs(cos(ang * 2.0)), 10.0));
    float star2 = mix(0.01, 0.036, pow(abs(cos(ang * 2.0 + PI * 0.5)), 10.0));
    card = mix(card, vec3(0.55, 0.42, 0.26), cover((r - max(star, star2)) * sc) * 0.55);
    col = mix(col, card, cover((r - 0.072) * sc));
    vec2 nq = rot(uNeedle) * q;
    float needle = abs(nq.x) / 0.062 + abs(nq.y) / 0.009 - 1.0;
    vec3 nc = nq.x > 0.0 ? uTurnInk : vec3(0.22, 0.24, 0.27);
    col = mix(col, nc, cover(needle * 0.009 * sc));
    col = mix(col, vec3(0.85, 0.65, 0.3), cover((r - 0.006) * sc));
    float glint = smoothstep(0.004, 0.0, abs(r - 0.052)) * smoothstep(0.5, 0.0, abs(ang - 2.2));
    col += vec3(1.0, 0.95, 0.85) * glint * 0.25;

    for (int k = 0; k < 4; k++) {
      float fk = float(k);
      vec2 o = C + (vec2(-0.13, -0.06) + vec2(fk < 2.0 ? 0.004 * fk : 0.04 + fk * 0.012, fk < 2.0 ? 0.004 * fk : -0.035 + fk * 0.01)) * sc;
      vec2 cq = (p - o) / sc;
      float cr = length(cq);
      float coinD = cr - 0.021;
      shade = max(shade, (1.0 - smoothstep(-0.004, 0.008, length(p - o - normalize(o - L) * 0.004) - 0.021 * sc)) * 0.4 * (1.0 - cover(coinD * sc)));
      vec3 gold = vec3(0.86, 0.66, 0.28) * (0.85 + 0.2 * smoothstep(0.021, 0.0, cr));
      gold = mix(gold, vec3(0.55, 0.38, 0.14), smoothstep(0.0025, 0.0, abs(cr - 0.017)));
      gold = mix(gold, vec3(1.0, 0.86, 0.5), step(cr, 0.011) * step(min(abs(cq.x), abs(cq.y)), 0.0022) * 0.6);
      col = mix(col, gold, cover(coinD * sc));
    }
  }

  /* Rolled chart and brass dividers, only when the desk is wide enough to show them. */
  if (A > 1.3) {
    vec2 so = vec2(-A * 0.5 + 0.09, -0.04);
    vec2 q = p - so;
    float cap = sdSeg(q, vec2(0.0, -0.14), vec2(0.0, 0.14)) - 0.032;
    shade = max(shade, (1.0 - smoothstep(-0.01, 0.02, sdSeg(q - normalize(so - L) * 0.02, vec2(0.0, -0.14), vec2(0.0, 0.14)) - 0.032)) * 0.5);
    float roll = 0.55 + 0.45 * sqrt(max(0.0, 1.0 - pow(q.x / 0.032, 2.0)));
    vec3 sc2 = vec3(0.86, 0.76, 0.56) * roll;
    sc2 *= 0.92 + 0.08 * sin(q.x * 600.0);
    sc2 = mix(sc2, vec3(0.55, 0.1, 0.06) * roll, step(abs(q.y), 0.012));
    col = mix(col, sc2, cover(cap));

    vec2 h = vec2(A * 0.5 - 0.1, 0.17);
    vec2 a = h + vec2(-0.05, -0.24);
    vec2 b = h + vec2(0.04, -0.235);
    float legs = min(sdSeg(p, h, a) - 0.0045, sdSeg(p, h, b) - 0.0045);
    vec2 sd = normalize(h - L) * 0.012;
    shade = max(shade, (1.0 - smoothstep(-0.004, 0.012, min(sdSeg(p - sd, h, a), sdSeg(p - sd, h, b)) - 0.0045)) * 0.45);
    col = mix(col, vec3(0.78, 0.6, 0.3), cover(legs));
    col = mix(col, vec3(0.7, 0.52, 0.26), cover(length(p - h) - 0.013));
    col = mix(col, vec3(0.95, 0.8, 0.5), cover(length(p - h) - 0.005));
  }

  /* Magnifying glass: the wood swells under the lens and the flame focuses into a hot spot. */
  {
    vec2 hd = normalize(vec2(0.8, -0.55));
    float lr = 0.07 * sc;
    float dl = length(p - G) - lr;
    float handle = sdSeg(p, G + hd * 0.08 * sc, G + hd * 0.22 * sc) - 0.011 * sc;
    float ferrule = sdSeg(p, G + hd * 0.074 * sc, G + hd * 0.1 * sc) - 0.013 * sc;
    float across = dot(p - G, vec2(-hd.y, hd.x)) / (0.011 * sc);
    vec3 rose = vec3(0.48, 0.2, 0.1) * (0.9 + 0.12 * sin(dot(p - G, hd) * 340.0 + across * 2.0));
    rose += vec3(1.0, 0.8, 0.6) * 0.22 * smoothstep(0.5, 0.0, abs(across + 0.35));
    col = mix(col, rose, cover(handle));
    col = mix(col, vec3(0.78, 0.58, 0.28), cover(ferrule));
    if (dl < AA * 2.0) {
      vec2 lq = (p - G) / lr;
      float k = dot(lq, lq);
      vec3 mag = wood(G + (p - G) * (0.55 + 0.15 * k));
      mag *= 1.08 - 0.25 * k;
      float crescent = smoothstep(0.62, 0.78, length(lq)) * smoothstep(1.0, 0.86, length(lq));
      mag += vec3(1.0, 0.95, 0.85) * 0.16 * crescent * smoothstep(-0.2, 0.8, dot(normalize(lq + 1e-4), normalize(L - G)));
      col = mix(col, mag, cover(dl));
    }
    col = mix(col, vec3(0.82, 0.62, 0.3), cover(abs(dl) - 0.006 * sc));
    vec2 Gc = G + normalize(G - L) * 0.055 * sc;
    glow += vec3(1.0, 0.8, 0.45) * exp(-dot(p - Gc, p - Gc) / (0.00012 * sc * sc)) * 0.5 * flick;
  }

  /* The cat, the mouse, and the cat noticing the mouse. */
  float period = 41.0;
  float mt = mod(t + 14.0, period);
  float run = 8.5;
  float my = mix(-0.29, -0.335, tall);
  float mouseOn = step(mt, run);
  float mu = clamp(mt / run, 0.0, 1.0);
  float prog = mu + sin(mu * PI * 6.0) / (PI * 6.0) * 0.9;
  vec2 Mo = vec2(mix(A * 0.5 + 0.1, -A * 0.5 - 0.1, prog), my + 0.01 * sin(prog * 28.0));
  float alert = mouseOn * smoothstep(0.38, 0.08, abs(Mo.x - K.x));
  {
    float breath = 1.0 + 0.03 * sin(t * 1.25) * (1.0 - alert * 0.7);
    vec2 q = catTurn * (p - K) / sc;
    float d = catSd(q, breath, alert);
    vec2 rad = vec2(0.118 * (1.0 + 0.32 * STRETCH), 0.088 * (1.0 - 0.22 * STRETCH)) * breath;
    float rn = length(q / rad);
    float ang = atan(q.y, q.x);
    vec3 fur = vec3(0.88, 0.54, 0.24);
    vec3 dark = vec3(0.56, 0.28, 0.1);
    float band = sin(ang * 9.0 + fbm(q * 30.0) * 1.6);
    float stripe = smoothstep(0.45, 0.85, band) * smoothstep(0.35, 0.75, rn);
    fur = mix(fur, dark, stripe * 0.6);
    fur = mix(fur, vec3(0.96, 0.84, 0.66), smoothstep(0.75, 1.0, rn) * smoothstep(0.2, -0.6, sin(ang + 0.6)) * 0.6);
    float dome = sqrt(max(0.0, 1.0 - min(rn, 1.0) * min(rn, 1.0)));
    vec3 cc = fur * (0.62 + 0.45 * dome);

    float along;
    float tail = catTail(q, along);
    vec3 tcol = mix(vec3(0.86, 0.52, 0.22), dark, smoothstep(0.2, 0.7, sin(along * 34.0)) * 0.7);
    tcol = mix(tcol, vec3(0.98, 0.9, 0.78), smoothstep(0.86, 0.95, along));
    cc = mix(cc, tcol * (0.7 + 0.3 * smoothstep(0.015, 0.0, abs(tail + 0.008))), cover(tail * sc) * step(0.0, catBody(q, breath)));

    vec2 hc = catHead(alert);
    vec2 hq = q - hc;
    vec2 f = normalize(vec2(0.55, -0.85) + vec2(0.45, 0.6) * alert);
    vec2 s = vec2(-f.y, f.x);
    float hl = length(hq);
    vec3 hcol = vec3(0.9, 0.57, 0.26) * (0.72 + 0.35 * sqrt(max(0.0, 1.0 - hl * hl / 0.0019)));
    float brow = smoothstep(0.5, 0.9, sin(dot(hq, s) * 300.0)) * smoothstep(0.0, -0.02, dot(hq, f)) * step(abs(dot(hq, s)), 0.018);
    hcol = mix(hcol, dark, brow * 0.6);
    float twitch = exp(-mod(t, 9.0) * 6.0) * sin(t * 50.0) * 0.25 + alert * sin(t * 18.0) * 0.18;
    for (int e = 0; e < 2; e++) {
      float side = e == 0 ? 1.0 : -1.0;
      vec2 out2 = normalize(-f * 0.8 + s * side * 0.6);
      float ea = atan(out2.y, out2.x) + side * twitch;
      vec2 dir = vec2(cos(ea), sin(ea));
      vec2 eq = rot(ea - PI * 0.5) * (q - hc - dir * 0.066);
      float ear = sdTri(eq * vec2(1.0, -1.0), vec2(0.017, 0.032));
      d = min(d, ear);
      cc = mix(cc, vec3(0.82, 0.5, 0.22), cover(ear * sc));
      cc = mix(cc, vec3(0.92, 0.62, 0.58), cover((ear + 0.005) * sc) * 0.75);
    }
    cc = mix(cc, hcol, cover((hl - 0.044) * sc));
    for (int e = 0; e < 2; e++) {
      float side = e == 0 ? 1.0 : -1.0;
      vec2 ep = hc + f * 0.016 + s * side * 0.015;
      vec2 eq = vec2(dot(q - ep, s), dot(q - ep, f));
      float open = smoothstep(0.35, 0.8, max(alert, STRETCH * 1.3));
      float lid = abs(eq.y + 0.004 * (1.0 - eq.x * eq.x / 0.00006)) - 0.0012;
      lid = max(lid, abs(eq.x) - 0.007);
      float eye = sdEll(eq, vec2(0.0075, 0.0055));
      cc = mix(cc, vec3(0.2, 0.1, 0.05), cover(lid * sc) * (1.0 - open));
      vec3 ec = vec3(0.55, 0.75, 0.25);
      vec2 look = normalize(catTurn * (Mo - K) / sc - ep);
      float pupil = sdEll(eq - vec2(dot(look, s), dot(look, f)) * 0.002, vec2(0.0014, 0.0048));
      ec = mix(ec, vec3(0.03), cover(pupil * sc));
      cc = mix(cc, ec, cover(eye * sc) * open);
    }
    vec2 nq = vec2(dot(q - hc - f * 0.034, s), dot(q - hc - f * 0.034, f));
    cc = mix(cc, vec3(0.96, 0.86, 0.72), cover(sdEll(nq + vec2(0.0, 0.004), vec2(0.014, 0.009)) * sc));
    cc = mix(cc, vec3(0.86, 0.48, 0.46), cover(sdTri(nq * vec2(1.0, -1.0) + vec2(0.0, -0.001), vec2(0.004, 0.005)) * sc));
    for (int e = 0; e < 2; e++) {
      float side = e == 0 ? 1.0 : -1.0;
      vec2 pq = q - hc - f * (0.044 + 0.026 * STRETCH) - s * side * (0.017 + 0.006 * STRETCH);
      float paw = sdEll(vec2(dot(pq, s), dot(pq, f)), vec2(0.011, 0.014));
      d = min(d, paw);
      cc = mix(cc, vec3(0.97, 0.9, 0.78), cover(paw * sc));
    }
    col = mix(col, cc, cover(d * sc));
  }
  if (mouseOn > 0.0) {
    vec2 q = (p - Mo) / sc;
    q.x = -q.x;
    float part;
    float d = mouseSd(q, t, part);
    shade = max(shade, (1.0 - smoothstep(-0.003, 0.008, mouseSd((p - Mo - normalize(Mo - L) * 0.006) / sc * vec2(-1.0, 1.0), t, part) * sc)) * 0.4);
    d = mouseSd(q, t, part);
    vec3 mc = part > 0.5 ? vec3(0.78, 0.56, 0.52) : vec3(0.44, 0.4, 0.37) * (0.8 + 0.3 * smoothstep(0.013, 0.0, abs(q.y)));
    mc = mix(mc, vec3(0.02), cover((length(q - vec2(0.026, 0.004 * sign(q.y))) - 0.0018) * sc));
    col = mix(col, mc, cover(d * sc));
  }

  /* Now and then a spider lets itself down on a thread, dangles a while, and climbs back. */
  float threadD = 1.0;
  {
    float cyc = floor((t + 5.0) / 71.0);
    float sp = mod(t + 5.0, 71.0);
    if (sp < 15.0) {
      float h1 = hash21(vec2(cyc, 4.1));
      float h2 = hash21(vec2(cyc, 9.7));
      float side = h1 > 0.5 ? 1.0 : -1.0;
      float sx = side * mix(A * 0.5 - 0.24 - 0.12 * h2, A * 0.5 - 0.07, tall);
      float drop = smoothstep(0.0, 4.5, sp) * (1.0 - smoothstep(10.0, 15.0, sp));
      float moving = (1.0 - smoothstep(3.5, 4.5, sp)) + smoothstep(10.0, 10.8, sp);
      float bob = 0.006 * sin(t * 1.7) * (1.0 - moving * 0.5);
      vec2 top = vec2(sx, 0.52);
      vec2 S = top + vec2(0.008 * sin(t * 0.9 + h2 * 6.0), -drop * (0.3 + 0.12 * h2) + bob);
      threadD = max(abs(p.x - mix(top.x, S.x, (top.y - p.y) / max(top.y - S.y, 1e-3))) - 0.0006, max(p.y - top.y, S.y - p.y));

      float spin = 0.25 * sin(t * 0.6 + h1 * 9.0);
      float scrabble = moving * sin(t * 26.0);
      for (int sh = 0; sh < 2; sh++) {
        vec2 o = sh == 0 ? normalize(S - L) * 0.035 * (1.2 - drop * 0.5) : vec2(0.0);
        vec2 q = rot(spin) * (p - S - o) / sc;
        float body = min(length(q - vec2(0.0, -0.007)) - 0.0105, length(q - vec2(0.0, 0.006)) - 0.0065);
        float legs = 1.0;
        for (int i = 0; i < 4; i++) {
          float fi = float(i);
          float a0 = mix(0.55, -0.75, fi / 3.0) + scrabble * 0.18 * (mod(fi, 2.0) * 2.0 - 1.0);
          vec2 hip = vec2(0.004, 0.004 - fi * 0.002);
          vec2 knee = hip + vec2(cos(a0 + 0.6), sin(a0 + 0.6)) * 0.014;
          vec2 foot = knee + vec2(cos(a0 - 0.7), sin(a0 - 0.7)) * 0.016;
          vec2 aq = vec2(abs(q.x), q.y);
          legs = min(legs, min(sdSeg(aq, hip, knee), sdSeg(aq, knee, foot)) - 0.0011);
        }
        float d = min(body, legs) * sc;
        if (sh == 0) {
          shade = max(shade, (1.0 - smoothstep(-0.004, 0.012 + 0.01 * (1.0 - drop), d)) * 0.3 * drop);
        } else {
          vec3 spc = vec3(0.06, 0.045, 0.035);
          spc += vec3(0.35, 0.25, 0.15) * smoothstep(0.006, 0.0, length(q - vec2(-0.003, -0.002)));
          spc = mix(spc, vec3(0.5, 0.4, 0.3), smoothstep(0.0015, 0.0, abs(q.x)) * step(q.y, -0.002) * 0.4);
          col = mix(col, spc, cover(d) * step(0.02, drop));
        }
      }
    }
  }

  /* Moonlight through the window panes. */
  vec2 wq = rot(0.45) * (p - vec2(A * 0.5 - 0.05, 0.46));
  float win = smoothstep(0.05, -0.05, sdBox(wq, vec2(0.36, 0.24)));
  float panes = smoothstep(0.43, 0.38, abs(fract(wq.x / 0.18) - 0.5)) * smoothstep(0.42, 0.37, abs(fract(wq.y / 0.12) - 0.5));
  float clouds = 0.55 + 0.45 * smoothstep(0.3, 0.7, fbm(vec2(t * 0.03, 2.0) + wq * 0.6));
  float moon = win * mix(1.0, panes, 0.85) * clouds;

  /* Light it all. */
  vec2 dl2 = p - Lj;
  float lit = flick * 0.95 / (1.0 + dot(dl2, dl2) * 4.5);
  vec3 light = vec3(1.0, 0.7, 0.4) * lit * (1.0 - shade * 0.85);
  light += vec3(0.11, 0.085, 0.08) * (1.0 - shade * 0.3);
  light += vec3(0.35, 0.45, 0.8) * 0.22 * moon * (1.0 - shade * 0.6);
  vec3 c = col * light * 1.15;

  c = mix(c, vec3(0.98, 0.9, 0.72) * (0.6 + 0.6 * flick), cover(mothD) * 0.95);
  c += vec3(1.0, 0.9, 0.75) * smoothstep(0.0012, 0.0, threadD) * (0.08 + lit * 0.35);

  for (int layer = 0; layer < 2; layer++) {
    float fl = float(layer);
    float cs = mix(0.04, 0.026, fl);
    vec2 q = (p - L) + vec2(0.012 * sin(t * 0.3 + fl * 2.0) + t * 0.002, -t * mix(0.004, 0.007, fl));
    q -= wind * mix(0.05, 0.08, fl) * gustWave;
    vec2 cell = floor(q / cs);
    float hs = hash21(cell + fl * 31.0);
    if (hs > 0.82) {
      vec2 sp = (cell + vec2(hash21(cell + 3.0), hash21(cell + 8.0))) * cs;
      float d = length(q - sp);
      float tw = 0.4 + 0.6 * sin(t * (0.8 + hs * 2.0) + hs * 60.0);
      c += vec3(1.0, 0.85, 0.6) * smoothstep(0.0022, 0.0, d) * max(tw, 0.0) * lit * 0.9;
    }
  }

  vec2 fq = (p - Lj) / sc;
  float fr2 = dot(fq, fq);
  float size = 1.0 + uFlare * 1.4;
  c += vec3(1.0, 0.92, 0.7) * exp(-fr2 / (0.00005 * size)) * 1.6;
  c += vec3(1.0, 0.6, 0.22) * exp(-fr2 / (0.0006 * size)) * 0.35 * flick;
  c += vec3(1.0, 0.55, 0.2) * exp(-sqrt(fr2) / 0.16) * 0.06 * flick;
  c += glow;

  c *= 1.0 + uWarm * 0.22 * vec3(1.0, 0.82, 0.55);
  c = 1.0 - exp(-c * 1.5);
  vec2 vg = frag / uRes - 0.5;
  c *= 1.0 - 0.7 * dot(vg, vg);
  c += (hash21(frag + fract(t) * 91.0) - 0.5) * 0.012;
  outColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

	const INKS: Record<0 | 1 | 2, [number, number, number]> = {
		0: [0.62, 0.16, 0.1],
		1: [0.72, 0.18, 0.1],
		2: [0.16, 0.26, 0.55]
	};

	function deskScene(canvas: HTMLCanvasElement) {
		const pass = createFullscreenPass(canvas, FRAG, 'cartographer desk');
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
		let flared = 0;
		let warm = 0;
		let needle = 1.2;
		let spin = 0;
		let inkAge = 10;
		let wax = untrack(() => burn);
		let ink = INKS[untrack(() => turn)].slice();

		const draw = (ms: number) => {
			if (!cssW || !cssH) return;
			const dt = Math.min(1 / 20, Math.max(0, (ms - last) / 1000));
			last = ms;
			const time = (ms - t0) / 1000;
			const ease = (rate: number) => (calm ? 1 : 1 - Math.exp(-dt * rate));
			warm += ((mood === 'won' ? 1 : mood === 'draw' ? 0.5 : 0) - warm) * ease(1.2);
			flared *= Math.exp(-dt * 2.4);
			inkAge += dt;
			wax += (burn - wax) * ease(0.5);
			const target = turn === 1 ? -2.6 : turn === 2 ? 1.9 : 1.2 + 0.7 * Math.sin(time * 0.35);
			if (calm) {
				needle = target;
				spin = 0;
			} else {
				spin += ((target - needle) * 26 - spin * 4.2) * dt;
				needle += spin * dt;
			}
			const goal = INKS[turn];
			for (let k = 0; k < 3; k += 1) ink[k] += (goal[k] - ink[k]) * ease(4);

			gl.useProgram(pass.program);
			gl.uniform2f(pass.uniform('uRes'), canvas.width, canvas.height);
			gl.uniform1f(pass.uniform('uTime'), calm ? 3 : time);
			gl.uniform1f(pass.uniform('uFlare'), calm ? 0 : flared);
			gl.uniform1f(pass.uniform('uWarm'), warm);
			gl.uniform1f(pass.uniform('uNeedle'), needle);
			gl.uniform3f(pass.uniform('uTurnInk'), ink[0], ink[1], ink[2]);
			gl.uniform1f(pass.uniform('uInkAge'), calm ? 10 : inkAge);
			gl.uniform1f(pass.uniform('uWax'), wax);
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

		let seenFlare = untrack(() => flare);
		$effect(() => {
			const next = flare;
			untrack(() => {
				if (next > seenFlare) flared = Math.min(1, flared + 0.6);
				seenFlare = next;
			});
		});

		let seenStrokes = untrack(() => strokes);
		$effect(() => {
			const next = strokes;
			untrack(() => {
				if (next > seenStrokes) inkAge = 0;
				seenStrokes = next;
			});
		});

		$effect(() => {
			void mood;
			void turn;
			void flare;
			void strokes;
			void burn;
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

<div class="desk" aria-hidden="true">
	{#if failed}
		<div class="fallback"></div>
	{:else}
		<canvas {@attach deskScene}></canvas>
	{/if}
</div>

<style>
	.desk {
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
			radial-gradient(45% 40% at 14% 22%, rgba(255, 170, 80, 0.4), transparent 70%),
			repeating-linear-gradient(180deg, #3a2010 0 19.6vh, #24130a 19.6vh 20vh),
			#2c180c;
	}
</style>
