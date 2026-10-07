<script lang="ts">
	import { untrack } from 'svelte';
	import { createFullscreenPass } from '$lib/gl/fullscreen';
	import { createPacer } from '$lib/gl/pace';

	type Mood = 'menu' | 'play' | 'won' | 'draw';

	let {
		mood = 'menu',
		turn = 0,
		flare = 0,
		strike = 0,
		dusk = 0.15
	}: {
		mood?: Mood;
		/** Whose hand is on the stones; the bank warms or cools toward them. 0 on the menu. */
		turn?: 0 | 1 | 2;
		/** Bumps on every capture; the fireflies swarm. */
		flare?: number;
		/** Bumps when Heron captures; the heron spears at the water. */
		strike?: number;
		/** 0–1, how far the evening has gone: the sun sinks, the moon rises, stars come out. */
		dusk?: number;
	} = $props();

	let failed = $state(false);

	const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uDusk;
uniform float uFlare;
uniform float uWarm;
uniform float uStrike;
uniform float uTurn;
out vec4 outColor;

#define PI 3.14159265

float AA;
float YH;
vec2 SUN;
vec2 MOON;

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
  return 0.55 * vnoise(p) + 0.3 * vnoise(p * 2.03 + 7.1) + 0.15 * vnoise(p * 4.1 + 3.7);
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

float sdEll(vec2 p, vec2 r) {
  return (length(p / r) - 1.0) * min(r.x, r.y);
}

mat2 rot(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c);
}

float ridgeFar(float x) {
  return YH + 0.03 + 0.055 * fbm(vec2(x * 1.6, 3.0));
}

float ridgeNear(float x) {
  float trees = 0.016 * smoothstep(0.45, 0.85, vnoise(vec2(x * 38.0, 2.0))) + 0.008 * vnoise(vec2(x * 90.0, 5.0));
  return YH + 0.006 + 0.028 * fbm(vec2(x * 3.2 + 9.0, 1.0)) + trees;
}

vec3 skyCol(vec2 p, float t) {
  float d = uDusk;
  float h = clamp((p.y - YH) / (0.56 - YH), 0.0, 1.0);
  vec3 top = mix(vec3(0.17, 0.13, 0.34), vec3(0.02, 0.025, 0.08), d);
  vec3 mid = mix(vec3(0.68, 0.37, 0.52), vec3(0.1, 0.08, 0.21), d);
  vec3 low = mix(vec3(1.0, 0.63, 0.4), vec3(0.38, 0.2, 0.33), d);
  vec3 c = mix(low, mid, smoothstep(0.0, 0.32, h));
  c = mix(c, top, smoothstep(0.28, 1.0, h));

  float sd = length(p - SUN);
  float sunUp = smoothstep(-0.07, 0.02, SUN.y - YH);
  c += vec3(1.0, 0.55, 0.28) * exp(-sd * 5.0) * 0.55 * sunUp;
  c = mix(c, vec3(1.0, 0.88, 0.62), smoothstep(0.058, 0.054, sd) * sunUp);

  for (int k = 0; k < 2; k++) {
    float fk = float(k);
    float cy = YH + 0.17 + fk * 0.14;
    float band = exp(-pow((p.y - cy) / (0.028 + fk * 0.012), 2.0));
    float n = fbm(vec2(p.x * (1.4 + fk) + t * (0.008 + fk * 0.005) + fk * 9.0, p.y * 7.0));
    float cl = smoothstep(0.45, 0.75, n) * band;
    vec3 lit = mix(vec3(1.0, 0.62, 0.5), vec3(0.2, 0.16, 0.3), d);
    lit = mix(lit, vec3(1.0, 0.8, 0.55), smoothstep(0.4, 0.0, abs(p.x - SUN.x)) * 0.4 * (1.0 - d));
    c = mix(c, lit, cl * 0.7);
  }

  float md = length(p - MOON);
  float moonOn = 0.35 + 0.65 * d;
  c += vec3(0.6, 0.7, 1.0) * exp(-md * 9.0) * 0.25 * moonOn;
  float craters = 0.85 + 0.15 * fbm((p - MOON) * 90.0);
  c = mix(c, vec3(0.96, 0.95, 0.88) * craters, smoothstep(0.032, 0.028, md) * moonOn);
  return c;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  AA = 1.6 / uRes.y;
  float A = uRes.x / uRes.y;
  vec2 p = (frag - 0.5 * uRes) / uRes.y;
  float t = uTime;
  float d = uDusk;
  float tall = 1.0 - smoothstep(0.75, 1.1, A);
  YH = mix(0.06, 0.16, tall);
  SUN = vec2(A * 0.22, YH + mix(0.12, -0.08, d));
  MOON = vec2(-A * 0.27, mix(0.2, 0.37, d));
  float wind = sin(t * 0.37) * 0.6 + sin(t * 0.91) * 0.3;
  float yb = mix(-0.3, -0.37, tall) + 0.012 * sin(p.x * 7.0) + 0.012 * vnoise(vec2(p.x * 12.0, 1.0));
  vec3 col;

  if (p.y > YH) {
    col = skyCol(p, t);
    float starOn = smoothstep(0.15, 0.85, d) + 0.12;
    vec2 sc = floor(p * 90.0);
    float sh = hash21(sc);
    if (sh > 0.94) {
      vec2 sp = (sc + vec2(hash21(sc + 3.1), hash21(sc + 7.7))) / 90.0;
      float tw = 0.55 + 0.45 * sin(t * (1.0 + sh * 3.0) + sh * 50.0);
      float sz = mix(0.0012, 0.0026, hash21(sc + 1.3));
      col += vec3(0.95, 0.95, 1.0) * smoothstep(sz, 0.0, length(p - sp)) * tw * starOn * smoothstep(YH + 0.05, YH + 0.25, p.y);
    }
    float sp = mod(t, 19.0);
    if (sp < 1.1) {
      float k = floor(t / 19.0);
      vec2 a = vec2((hash11(k) - 0.5) * A, 0.3 + hash11(k + 2.0) * 0.18);
      vec2 dir = normalize(vec2(hash11(k + 4.0) > 0.5 ? 1.0 : -1.0, -0.45));
      float u = sp / 1.1;
      vec2 head = a + dir * u * 0.45;
      float ds = sdSeg(p, head - dir * 0.09, head);
      float along = clamp(dot(p - head + dir * 0.09, dir) / 0.09, 0.0, 1.0);
      col += vec3(1.0, 0.95, 0.85) * smoothstep(0.0022, 0.0, ds) * along * sin(u * PI) * starOn * 1.4;
    }
    float bp = mod(t + 9.0, 37.0);
    if (bp < 14.0) {
      for (int b = 0; b < 5; b++) {
        float fb = float(b);
        vec2 bc = vec2(-A * 0.6 + bp / 14.0 * A * 1.25 - abs(fb - 2.0) * 0.022, YH + 0.25 + (fb - 2.0) * 0.012 - abs(fb - 2.0) * 0.012 + 0.006 * sin(t * 1.3 + fb));
        vec2 q = p - bc;
        float flap = sin(t * 9.0 + fb * 1.7) * 0.006;
        float wing = min(sdSeg(q, vec2(0.0), vec2(-0.011, 0.004 + flap)), sdSeg(q, vec2(0.0), vec2(0.011, 0.004 + flap)));
        col = mix(col, vec3(0.08, 0.06, 0.12), smoothstep(0.0016, 0.0008, wing));
      }
    }
    float rf = ridgeFar(p.x);
    vec3 farC = mix(vec3(0.42, 0.28, 0.44), vec3(0.11, 0.09, 0.19), d);
    col = mix(col, mix(farC, col, 0.25), cover(p.y - rf));
    float rn = ridgeNear(p.x);
    vec3 nearC = mix(vec3(0.2, 0.13, 0.24), vec3(0.04, 0.04, 0.09), d);
    col = mix(col, nearC, cover(p.y - rn));
  } else if (p.y > yb - 0.02) {
    float depth = clamp((YH - p.y) / (YH - yb), 0.0, 1.0);
    float sway = (vnoise(vec2(p.x * 14.0 / (0.3 + depth) - t * 0.5, p.y * 160.0 / (0.3 + depth))) - 0.5);
    float sway2 = sin(p.y * 260.0 / (0.25 + depth) - t * 2.2 + p.x * 8.0) * 0.5;
    vec2 m = vec2(p.x + (sway * 0.03 + sway2 * 0.004) * (0.3 + depth), YH + (YH - p.y) * 1.15);
    vec3 refl = skyCol(m, t);
    if (m.y < ridgeFar(m.x)) refl = mix(vec3(0.42, 0.28, 0.44), vec3(0.11, 0.09, 0.19), d) * 0.85;
    if (m.y < ridgeNear(m.x)) refl = mix(vec3(0.2, 0.13, 0.24), vec3(0.04, 0.04, 0.09), d) * 0.85;
    col = refl * mix(vec3(0.62, 0.72, 0.8), vec3(0.4, 0.55, 0.62), depth) + vec3(0.01, 0.025, 0.04);
    col *= 1.0 - depth * 0.35;

    float column = exp(-pow((p.x - SUN.x) / (0.02 + 0.09 * depth), 2.0)) * smoothstep(-0.08, 0.0, SUN.y - YH);
    vec2 gs = vec2(0.012, 0.0032) * (0.35 + depth);
    vec2 gq = vec2(p.x + t * 0.004, p.y) / gs;
    vec2 gcell = floor(gq);
    vec2 gf = fract(gq) - 0.5;
    float gh = hash21(gcell);
    float twinkle = pow(max(0.0, sin(t * (1.5 + gh * 3.0) + gh * 40.0)), 6.0);
    float spark = smoothstep(0.45, 0.1, length(gf * vec2(1.0, 2.0))) * twinkle * step(0.5, gh);
    col += vec3(1.0, 0.75, 0.45) * spark * column * 1.2 * (1.0 - d);
    float mcol = exp(-pow((p.x - MOON.x) / (0.015 + 0.06 * depth), 2.0));
    col += vec3(0.75, 0.82, 1.0) * spark * mcol * (0.2 + 0.8 * d) * 0.9;

    float streak = smoothstep(0.82, 0.98, vnoise(vec2(p.x * 7.0 - t * 0.35, p.y * 700.0 / (0.3 + depth))));
    col += vec3(0.6, 0.65, 0.8) * streak * 0.05 * (1.0 - depth * 0.5);

    float mist = exp(-pow((p.y - (YH - 0.03)) / 0.04, 2.0)) * fbm(vec2(p.x * 3.0 - t * 0.03, p.y * 12.0 + t * 0.02));
    col = mix(col, mix(vec3(0.95, 0.72, 0.7), vec3(0.42, 0.42, 0.6), d), mist * 0.5);

    /* Ripple rings from the fish and the frog. */
    float rings = 0.0;

    float fp = mod(t + 3.0, 13.0);
    float fk = floor((t + 3.0) / 13.0);
    vec2 f0 = vec2((hash11(fk * 3.1) - 0.5) * A * 0.7, mix(YH - 0.03, yb + 0.06, 0.3 + 0.4 * hash11(fk + 7.0)));
    float fdir = hash11(fk + 1.0) > 0.5 ? 1.0 : -1.0;
    float fsc = 0.5 + 0.8 * clamp((YH - f0.y) / (YH - yb), 0.0, 1.0);
    if (fp < 1.4) {
      float u = fp / 1.4;
      vec2 fc = f0 + vec2(fdir * u * 0.1 * fsc, sin(u * PI) * 0.1 * fsc);
      vec2 vel = normalize(vec2(fdir * 0.1, cos(u * PI) * 0.1 * PI));
      vec2 q = p - fc;
      q = vec2(dot(q, vel), dot(q, vec2(-vel.y, vel.x))) / fsc;
      float body = sdEll(q, vec2(0.018, 0.006));
      float tail = sdSeg(q, vec2(-0.017, 0.0), vec2(-0.026, 0.006 * sin(t * 30.0))) - 0.0025;
      float fish = min(body, tail) * fsc;
      vec3 fcol = mix(vec3(0.75, 0.6, 0.55), vec3(0.3, 0.32, 0.4), d);
      fcol += vec3(1.0, 0.8, 0.6) * smoothstep(0.004, 0.0, abs(q.y + 0.003)) * 0.3;
      col = mix(col, fcol, cover(fish));
      vec2 drop = fc + vec2(0.0, -0.01);
      for (int k = 0; k < 4; k++) {
        float fk2 = float(k);
        float age = u * 1.4 - fk2 * 0.08;
        vec2 dp = vec2(f0.x + fdir * 0.02 * fsc * fk2, f0.y + 0.03 * fsc * (sin(min(1.0, age * 2.0) * PI)) * hash11(fk2 + fk));
        col += vec3(0.9, 0.9, 1.0) * smoothstep(0.0025, 0.0, length(p - dp)) * step(0.0, age) * step(age, 0.5) * 0.6;
      }
    }
    for (int k = 0; k < 2; k++) {
      float age = k == 0 ? fp : fp - 1.4;
      vec2 c = k == 0 ? f0 : f0 + vec2(fdir * 0.1 * fsc, 0.0);
      if (age > 0.0 && age < 3.0) {
        vec2 q = (p - c) * vec2(1.0, 3.2);
        float r = length(q);
        rings += smoothstep(0.003, 0.0, abs(r - age * 0.05 * fsc)) * exp(-age * 1.2);
        rings += smoothstep(0.003, 0.0, abs(r - age * 0.03 * fsc)) * exp(-age * 1.6) * 0.6;
      }
    }

    /* Lily pads, two with lotus flowers, and a frog that hops between them. */
    float period = 17.0;
    float pk = floor(t / period);
    float pu = mod(t, period);
    vec2 pads[5];
    for (int k = 0; k < 5; k++) {
      float fk3 = float(k);
      float u = fk3 / 4.0;
      pads[k] = vec2(mix(-A * 0.42, -A * 0.08, u) + 0.03 * sin(fk3 * 2.7), mix(YH - 0.04, yb + 0.07, 0.25 + 0.55 * fract(fk3 * 0.618 + 0.2)));
    }
    for (int k = 0; k < 5; k++) {
      vec2 c = pads[k] + vec2(0.003 * sin(t * 0.7 + float(k)), 0.0015 * sin(t * 0.9 + float(k) * 2.0));
      float dep = clamp((YH - c.y) / (YH - yb), 0.0, 1.0);
      float sz = 0.6 + 0.9 * dep;
      vec2 q = (p - c) / sz;
      float pad = sdEll(q, vec2(0.034, 0.011));
      float ang = atan(q.y * 3.0, q.x);
      float notch = step(abs(ang - 0.5 - float(k)), 0.18);
      vec3 pc = mix(vec3(0.24, 0.42, 0.2), vec3(0.06, 0.12, 0.08), d) * (0.85 + 0.25 * smoothstep(0.03, 0.0, length(q * vec2(1.0, 3.0))));
      pc += vec3(0.1, 0.12, 0.05) * smoothstep(0.004, 0.0, abs(sin(ang * 7.0) * length(q))) * 0.4;
      col = mix(col, pc, cover(pad * sz) * (1.0 - notch));
      rings += smoothstep(0.003, 0.0, abs(length(q * vec2(1.0, 3.0)) - 0.042 - 0.004 * sin(t * 1.5 + float(k)))) * 0.15;
      if (k == 1 || k == 3) {
        vec2 lq = q - vec2(0.006, 0.006);
        float petals = 1.0;
        for (int j = 0; j < 5; j++) {
          float a = float(j) / 4.0 * 1.6 - 0.8;
          petals = min(petals, sdEll(rot(a) * lq - vec2(0.0, 0.007), vec2(0.0035, 0.008)));
        }
        vec3 lc = mix(vec3(1.0, 0.7, 0.8), vec3(0.6, 0.45, 0.6), d);
        col = mix(col, lc * (0.8 + 0.3 * smoothstep(0.0, 0.012, lq.y)), cover(petals * sz));
        col += vec3(1.0, 0.8, 0.9) * exp(-dot(lq, lq) / 0.0002) * 0.12 * d;
      }
    }
    {
      int from = int(mod(pk, 5.0));
      int to = int(mod(pk + 1.0, 5.0));
      vec2 a = pads[0];
      vec2 b = pads[1];
      for (int k = 0; k < 5; k++) {
        if (k == from) a = pads[k];
        if (k == to) b = pads[k];
      }
      float hop = clamp((pu - 1.0) / 0.9, 0.0, 1.0);
      float e = hop * hop * (3.0 - 2.0 * hop);
      vec2 fc = mix(a, b, e) + vec2(0.0, sin(hop * PI) * 0.06 + 0.006);
      float dep = clamp((YH - fc.y) / (YH - yb), 0.0, 1.0);
      float sz = 0.6 + 0.9 * dep;
      vec2 q = (p - fc) / sz;
      float face = b.x > a.x ? 1.0 : -1.0;
      q.x *= face;
      float stretch = sin(hop * PI);
      float body = sdEll(q, vec2(0.009 + stretch * 0.004, 0.006 - stretch * 0.001));
      float eye = min(length(q - vec2(0.005, 0.005)) - 0.0026, length(q - vec2(0.0015, 0.0055)) - 0.0024);
      float legs = sdSeg(q, vec2(-0.004, -0.003), vec2(-0.01 - stretch * 0.01, -0.006 - stretch * 0.004)) - 0.0016;
      float frog = min(min(body, eye), legs) * sz;
      vec3 fcol = mix(vec3(0.4, 0.62, 0.25), vec3(0.12, 0.2, 0.1), d);
      fcol = mix(fcol, vec3(0.05), smoothstep(0.0012, 0.0, length(q - vec2(0.0055, 0.0055))));
      col = mix(col, fcol, cover(frog));
      float splash = pu - 1.9;
      if (splash > 0.0 && splash < 2.5) {
        vec2 rq = (p - b) * vec2(1.0, 3.2);
        rings += smoothstep(0.003, 0.0, abs(length(rq) - splash * 0.04 * sz)) * exp(-splash * 1.4);
      }
    }
    col += mix(vec3(1.0, 0.8, 0.65), vec3(0.7, 0.75, 0.95), d) * rings * 0.35;

    /* The heron, its reflection, and its strike. */
    vec2 H0 = vec2(A * 0.5 - mix(0.21, 0.1, tall), yb + 0.035);
    float hs = mix(1.0, 0.75, tall);
    float sAge = uStrike;
    float idle = mod(t + 20.0, 61.0);
    float strike = max(sAge < 1.4 ? sin(clamp(sAge / 1.4, 0.0, 1.0) * PI) : 0.0, idle < 1.4 ? sin(idle / 1.4 * PI) : 0.0);
    float alert = clamp(-uTurn, 0.0, 1.0);
    for (int pass = 0; pass < 2; pass++) {
      vec2 q = (p - H0) / hs;
      float refl = pass == 0 ? 1.0 : 0.0;
      if (pass == 0) {
        if (q.y > 0.0) continue;
        q.y = -q.y * 1.1;
        q.x += (vnoise(vec2(q.y * 90.0 - t * 2.0, 1.0)) - 0.5) * 0.012;
      } else if (q.y < -0.005) {
        continue;
      }
      float breath = 0.002 * sin(t * 1.6);
      vec2 shoulder = vec2(-0.03, 0.17 + breath);
      vec2 headIdle = vec2(-0.058 + 0.004 * sin(t * 0.4), 0.262 + alert * 0.03 + breath);
      vec2 headDown = vec2(-0.13, 0.03);
      vec2 head = mix(headIdle, headDown, strike);
      vec2 ctrl = mix(vec2(0.01, 0.23 + alert * 0.02), vec2(-0.05, 0.16), strike);
      float neck = 1.0;
      vec2 prev = shoulder;
      for (int k = 1; k <= 8; k++) {
        float u = float(k) / 8.0;
        vec2 pt = mix(mix(shoulder, ctrl, u), mix(ctrl, head, u), u);
        neck = min(neck, sdSeg(q, prev, pt) - mix(0.009, 0.0045, u));
        prev = pt;
      }
      float body = sdEll(rot(0.38) * (q - vec2(0.0, 0.15 + breath)), vec2(0.058, 0.028));
      float tailF = sdSeg(q, vec2(0.04, 0.135), vec2(0.075, 0.115)) - 0.007;
      float legs = min(sdSeg(q, vec2(-0.004, 0.13), vec2(-0.006, 0.0)), sdSeg(q, vec2(0.008, 0.13), vec2(0.014, 0.0))) - 0.0022;
      float knee = length(q - vec2(-0.005, 0.07)) - 0.0035;
      vec2 bdir = normalize(mix(vec2(-1.0, -0.12), vec2(-0.35, -1.0), strike));
      float beak = sdSeg(q, head, head + bdir * 0.05) - 0.0028 * (1.0 - clamp(dot(q - head, bdir) / 0.05, 0.0, 1.0));
      float headD = length(q - head) - 0.011;
      float plume = sdSeg(q, head + vec2(0.006, 0.004), head + vec2(0.03, 0.012 + 0.003 * sin(t * 2.0))) - 0.0012;
      float heron = min(min(min(neck, body), min(tailF, legs)), min(min(beak, headD), min(plume, knee))) * hs;
      vec3 hc = mix(vec3(0.3, 0.3, 0.38), vec3(0.1, 0.12, 0.17), d);
      hc += mix(vec3(0.6, 0.35, 0.25), vec3(0.25, 0.3, 0.45), d) * smoothstep(0.0, 0.03, q.y - 0.15) * 0.4 * step(q.x, 0.0);
      float eye = smoothstep(0.003, 0.0, length(q - head - vec2(-0.002, 0.003)));
      hc = mix(hc, vec3(1.0, 0.85, 0.3), eye);
      float a = pass == 0 ? 0.45 * smoothstep(-0.25, -0.02, q.y * -1.0) : 1.0;
      col = mix(col, pass == 0 ? hc * 0.6 + col * 0.2 : hc, cover(heron) * a);
      if (pass == 1 && strike > 0.6) {
        vec2 tip = (head + bdir * 0.05) * hs + H0;
        float sp = smoothstep(0.6, 1.0, strike);
        for (int k = 0; k < 6; k++) {
          float fk4 = float(k);
          vec2 dp = tip + vec2((fk4 - 2.5) * 0.006, sp * 0.02 * (0.5 + hash11(fk4)));
          col += vec3(0.85, 0.9, 1.0) * smoothstep(0.0022, 0.0, length(p - dp)) * sp;
        }
      }
    }
    if (strike > 0.01) {
      vec2 tipW = vec2(-0.13, 0.03) * hs + H0;
      float age = sAge < 1.4 ? sAge - 0.6 : idle - 0.6;
      if (age > 0.0) {
        vec2 rq = (p - tipW) * vec2(1.0, 3.2);
        col += vec3(0.9, 0.9, 1.0) * smoothstep(0.003, 0.0, abs(length(rq) - age * 0.05)) * exp(-age * 1.5) * 0.5;
      }
    }
  } else {
    col = vec3(0.0);
  }

  /* Willow on the left: a leaning trunk and long strands swaying in the breeze. */
  {
    float L0 = -A * 0.5;
    float trunkX = L0 + 0.035 + 0.03 * sin(p.y * 3.0 + 0.6);
    float trunk = abs(p.x - trunkX) - (0.03 - 0.008 * p.y);
    float bough = abs(p.y - (0.49 - 0.12 * smoothstep(0.0, 0.4, p.x - L0) + 0.01 * sin(p.x * 20.0))) - 0.012 * (1.0 - clamp((p.x - L0) / 0.4, 0.0, 1.0));
    bough = max(bough, p.x - L0 - 0.4);
    vec3 bark = mix(vec3(0.16, 0.1, 0.09), vec3(0.04, 0.035, 0.05), d);
    bark *= 0.8 + 0.3 * vnoise(vec2(p.x * 80.0, p.y * 12.0));
    col = mix(col, bark, cover(min(trunk, bough)));
    for (int i = 0; i < 18; i++) {
      float fi = float(i);
      float xi = L0 + 0.02 + fi * 0.021 * min(1.0, A) + hash11(fi) * 0.01;
      float top = 0.49 - 0.12 * smoothstep(0.0, 0.4, xi - L0);
      float len = 0.22 + hash11(fi + 3.0) * 0.3;
      float u = clamp((top - p.y) / len, 0.0, 1.0);
      float sway = (sin(t * 0.6 + fi * 0.7) * 0.02 + wind * 0.015) * u * u;
      float w = 0.0018 + 0.0032 * max(0.0, sin(p.y * 150.0 + fi * 3.0)) * u;
      float strand = max(abs(p.x - xi - sway) - w, max(p.y - top, top - len - p.y));
      vec3 leaf = mix(vec3(0.3, 0.42, 0.2), vec3(0.06, 0.1, 0.07), d) * (0.75 + 0.35 * hash11(fi + 9.0));
      leaf += mix(vec3(0.5, 0.3, 0.15), vec3(0.1, 0.12, 0.2), d) * 0.25 * (1.0 - u);
      col = mix(col, leaf, cover(strand) * 0.9);
    }
  }

  /* Mossy bank. */
  float grass = yb + 0.016 * (0.4 + 0.6 * hash11(floor(p.x * 210.0 + wind * 0.4))) * (1.0 - abs(fract(p.x * 210.0 + wind * 0.4 + 0.3 * sin(t + p.x * 9.0)) - 0.5) * 2.0);
  if (p.y < grass) {
    vec3 moss = mix(vec3(0.12, 0.2, 0.09), vec3(0.03, 0.06, 0.04), d);
    moss *= 0.7 + 0.5 * fbm(p * 30.0);
    moss *= 0.65 + 0.35 * smoothstep(-0.5, yb, p.y);
    col = moss;
    vec2 fc = floor(p * 70.0);
    float fh = hash21(fc + 2.0);
    if (fh > 0.93) {
      vec2 fp2 = (fc + 0.5) / 70.0;
      vec3 fl = fh > 0.97 ? vec3(1.0, 0.9, 0.5) : vec3(0.95, 0.85, 0.95);
      col = mix(col, fl * (1.0 - d * 0.5), smoothstep(0.003, 0.0015, length(p - fp2)));
    }
  }

  /* Glowing mushrooms in the moss near the corners. */
  for (int k = 0; k < 6; k++) {
    float fk5 = float(k);
    float side = k < 3 ? -1.0 : 1.0;
    vec2 c = vec2(side * (A * 0.5 - 0.05 - mod(fk5, 3.0) * 0.035), yb - 0.035 - mod(fk5, 3.0) * 0.02 - hash11(fk5) * 0.03);
    float sz = 0.7 + 0.5 * hash11(fk5 + 4.0);
    vec2 q = (p - c) / sz;
    float cap = max(sdEll(q - vec2(0.0, 0.006), vec2(0.012, 0.008)), -q.y + 0.004);
    float stem = sdSeg(q, vec2(0.0, -0.008), vec2(0.0, 0.006)) - 0.0025;
    float pulse = 0.6 + 0.4 * sin(t * 1.3 + fk5 * 1.9);
    vec3 cc = vec3(0.35, 0.95, 0.85) * (0.5 + 0.8 * d) * pulse;
    col = mix(col, vec3(0.8, 0.85, 0.75) * (0.4 + 0.3 * d), cover(stem * sz));
    col = mix(col, cc, cover(cap * sz));
    col += vec3(0.3, 0.9, 0.8) * exp(-dot(q, q) / 0.0008) * 0.25 * pulse * (0.3 + d);
  }

  /* Cattails and reeds on both banks. */
  for (int i = 0; i < 22; i++) {
    float fi = float(i);
    float side = i < 12 ? -1.0 : 1.0;
    float base = side < 0.0 ? -A * 0.5 + 0.06 + fi * 0.017 : A * 0.5 - 0.015 - (fi - 12.0) * 0.012;
    float hgt = 0.11 + hash11(fi + 1.0) * 0.16;
    float y0 = yb - 0.02;
    float u = clamp((p.y - y0) / hgt, 0.0, 1.0);
    float bend = (hash11(fi + 5.0) - 0.5) * 0.06 + (sin(t * 0.8 + fi) * 0.012 + wind * 0.02) ;
    float x = base + bend * u * u;
    float w = 0.0032 * (1.0 - u * 0.85);
    float blade = max(abs(p.x - x) - w, max(y0 - p.y, p.y - y0 - hgt));
    vec3 rc = mix(vec3(0.2, 0.28, 0.12), vec3(0.04, 0.07, 0.05), d) * (0.8 + 0.4 * hash11(fi + 8.0));
    col = mix(col, rc, cover(blade));
    if (mod(fi, 3.0) < 1.0) {
      float topY = y0 + hgt * 0.86;
      float tx = base + bend * 0.74;
      float head = sdSeg(p, vec2(tx, topY - 0.018), vec2(tx + bend * 0.02, topY + 0.012)) - 0.0055;
      col = mix(col, mix(vec3(0.38, 0.22, 0.12), vec3(0.1, 0.07, 0.06), d), cover(head));
    }
  }

  /* Fireflies: more as the night deepens, swarming on every capture. */
  {
    float density = 0.1 + 0.32 * d + uFlare * 0.35 + uWarm * 0.2;
    float near = smoothstep(0.42, -0.05, p.y);
    for (int l = 0; l < 3; l++) {
      float fl = float(l);
      float cs = 0.085 - fl * 0.02;
      vec2 q = p + vec2(sin(t * 0.13 + fl * 2.0) * 0.06, -t * 0.004 * (fl + 1.0));
      q = rot(uFlare * 0.6 * sin(t * 0.7 + fl)) * q;
      vec2 cell = floor(q / cs);
      float h = hash21(cell + fl * 17.3);
      if (h < density) {
        vec2 sp = (cell + 0.5 + 0.2 * vec2(sin(t * (0.4 + h) + h * 30.0), cos(t * (0.33 + h * 0.8) + h * 50.0))) * cs;
        float blink = pow(max(0.0, sin(t * (0.9 + h * 1.6) + h * 40.0)), 3.0);
        float dd = length(q - sp);
        float sz = 0.0016 + fl * 0.0006;
        vec3 fc = mix(vec3(0.85, 1.0, 0.45), vec3(1.0, 0.85, 0.4), hash21(cell + 9.0));
        float glow = smoothstep(sz * 1.6, 0.0, dd) + exp(-dd * dd / (cs * cs * 0.006)) * 0.35;
        col += fc * glow * blink * (0.5 + 0.8 * near + uFlare) * (0.6 + 0.4 * d);
      }
    }
  }

  /* Whoever is sowing warms their side of the bank. */
  col += vec3(1.0, 0.75, 0.3) * 0.05 * clamp(uTurn, 0.0, 1.0) * smoothstep(0.2, -0.5, p.y) * smoothstep(0.3, -A * 0.5, p.x);
  col += vec3(0.4, 0.65, 1.0) * 0.05 * clamp(-uTurn, 0.0, 1.0) * smoothstep(0.2, -0.5, p.y) * smoothstep(-0.3, A * 0.5, p.x);
  col *= 1.0 + uWarm * 0.25 * vec3(1.0, 0.85, 0.6);

  vec2 vg = frag / uRes - 0.5;
  col *= 1.0 - 0.55 * dot(vg, vg);
  col = 1.0 - exp(-col * 1.35);
  col += (hash21(frag + fract(t) * 91.0) - 0.5) * 0.01;
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

	function bankScene(canvas: HTMLCanvasElement) {
		const pass = createFullscreenPass(canvas, FRAG, 'seedkeeper bank');
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
		let swarm = 0;
		let warm = 0;
		let lean = 0;
		let eve = untrack(() => dusk);
		let strikeAt = -100;

		const draw = (ms: number) => {
			if (!cssW || !cssH) return;
			const dt = Math.min(1 / 20, Math.max(0, (ms - last) / 1000));
			last = ms;
			const time = (ms - t0) / 1000;
			const ease = (rate: number) => (calm ? 1 : 1 - Math.exp(-dt * rate));
			warm += ((mood === 'won' ? 1 : mood === 'draw' ? 0.5 : 0) - warm) * ease(1.2);
			swarm *= Math.exp(-dt * 1.1);
			eve += (dusk - eve) * ease(0.6);
			lean += ((turn === 1 ? 1 : turn === 2 ? -1 : 0) - lean) * ease(2.5);

			gl.useProgram(pass.program);
			gl.uniform2f(pass.uniform('uRes'), canvas.width, canvas.height);
			gl.uniform1f(pass.uniform('uTime'), calm ? 30 : time);
			gl.uniform1f(pass.uniform('uDusk'), eve);
			gl.uniform1f(pass.uniform('uFlare'), calm ? 0 : swarm);
			gl.uniform1f(pass.uniform('uWarm'), warm);
			gl.uniform1f(pass.uniform('uStrike'), calm ? 100 : time - strikeAt);
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

		let seenFlare = untrack(() => flare);
		$effect(() => {
			const next = flare;
			untrack(() => {
				if (next > seenFlare) swarm = Math.min(1, swarm + 0.8);
				seenFlare = next;
			});
		});

		let seenStrike = untrack(() => strike);
		$effect(() => {
			const next = strike;
			untrack(() => {
				if (next > seenStrike) strikeAt = (performance.now() - t0) / 1000;
				seenStrike = next;
			});
		});

		$effect(() => {
			void mood;
			void turn;
			void flare;
			void strike;
			void dusk;
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

<div class="bank" aria-hidden="true">
	{#if failed}
		<div class="fallback"></div>
	{:else}
		<canvas {@attach bankScene}></canvas>
	{/if}
</div>

<style>
	.bank {
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
			radial-gradient(30% 20% at 70% 40%, rgba(255, 190, 120, 0.6), transparent 70%),
			linear-gradient(180deg, #2b2050 0%, #a65a78 38%, #f0a070 46%, #3c3050 47%, #1c2a2c 70%, #0f1a0e 76%, #0a1208 100%);
	}
</style>
