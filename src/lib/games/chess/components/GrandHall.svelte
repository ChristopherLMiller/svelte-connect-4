<script lang="ts">
	import { untrack } from 'svelte';
	import { createFullscreenPass } from '$lib/gl/fullscreen';
	import { createPacer } from '$lib/gl/pace';

	type Mood = 'menu' | 'play' | 'won' | 'lost' | 'draw';

	let {
		mood = 'menu',
		turn = 0,
		flash = 0,
		stir = 0,
		gaze = null,
		onthunder
	}: {
		mood?: Mood;
		/** 1 while white is to move, -1 for black, 0 when idle; the floor leans warm or cool. */
		turn?: number;
		/** Bumps on check and mate; lightning answers outside and the guests gasp. */
		flash?: number;
		/** Bumps on captures; the guests lean in. */
		stir?: number;
		/** Viewport point the portraits watch. */
		gaze?: { x: number; y: number } | null;
		onthunder?: (strength: number) => void;
	} = $props();

	let failed = $state(false);

	const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uFlash;
uniform float uBolt;
uniform float uBoltWin;
uniform float uDawn;
uniform float uDark;
uniform float uFocus;
uniform float uTurn;
uniform vec2 uGaze;
uniform float uGust;
uniform float uStir;
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

const float FLOOR = -0.2;
const float SILL = -0.1;
const float WIN_W = 0.085;
const float WIN_H = 0.3;

/** Windows sit at whole multiples, hearth bays halfway between, the outermost hearths just inside the screen edge. */
float spacing(float A) {
  float e = A * 0.5 - 0.11;
  if (e < 0.25) return 0.5;
  float m = max(0.0, floor(e / 0.47 - 0.5));
  return e / (m + 0.5);
}

float archDist(vec2 q) {
  if (q.y > WIN_H) return length(q - vec2(0.0, WIN_H)) - WIN_W;
  return max(abs(q.x) - WIN_W, -q.y);
}

float flashLevel() {
  float bolt = uBolt >= 0.0 ? exp(-uBolt * 5.0) * (0.55 + 0.45 * sin(uBolt * 70.0)) : 0.0;
  float sheet = uFlash >= 0.0 ? exp(-uFlash * 3.0) * 0.7 : 0.0;
  return clamp(bolt * 1.3 + sheet, 0.0, 1.6) * (1.0 - uDawn * 0.9);
}

float fireOn() {
  return (1.0 - uDark * 0.82) * (1.0 - uDawn * 0.25);
}

float fireFlick(float t, float k) {
  return 0.8 + 0.1 * sin(t * 7.3 + k * 1.7) + 0.06 * sin(t * 13.1 + k * 4.0) + 0.04 * sin(t * 23.7 + k * 2.3);
}

float reaction() {
  float s = uStir >= 0.0 ? smoothstep(0.0, 0.35, uStir) * exp(-max(uStir - 0.35, 0.0) * 0.55) : 0.0;
  float f = uFlash >= 0.0 ? smoothstep(0.0, 0.25, uFlash) * exp(-max(uFlash - 0.25, 0.0) * 0.45) : 0.0;
  return max(s * 0.7, f);
}

float sdSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

float sdEllipse(vec2 p, vec2 r) {
  return (length(p / r) - 1.0) * min(r.x, r.y);
}

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

/** Half-width w0 at y0 widening to w1 at y1, mirrored about x = 0. */
float sdTaper(vec2 u, float y0, float y1, float w0, float w1) {
  float k = clamp((u.y - y0) / (y1 - y0), 0.0, 1.0);
  return max(abs(u.x) - mix(w0, w1, k), abs(u.y - (y0 + y1) * 0.5) - abs(y1 - y0) * 0.5);
}

vec3 skyIn(vec2 q, float t, float flash, float boltHere) {
  float v = clamp(q.y / (WIN_H + WIN_W), 0.0, 1.0);
  vec3 night = mix(vec3(0.06, 0.08, 0.15), vec3(0.015, 0.02, 0.05), v);
  vec3 morning = mix(vec3(1.0, 0.64, 0.4), vec3(0.45, 0.58, 0.8), v);
  vec3 col = mix(night, morning, uDawn);
  float cl = fbm3(vec2(q.x * 9.0 + t * (0.03 + uGust * 0.06), q.y * 5.0 + t * 0.006));
  vec3 cloudC = mix(vec3(0.06, 0.07, 0.1), vec3(0.17, 0.18, 0.23), cl);
  cloudC = mix(cloudC, vec3(1.0, 0.78, 0.62) * (0.6 + 0.4 * cl), uDawn);
  col = mix(col, cloudC, smoothstep(0.35, 0.75, cl) * mix(0.85, 0.5, uDawn));
  col += vec3(0.6, 0.66, 0.9) * flash * (0.6 + cl);
  float hill = 0.05 + 0.035 * fbm3(vec2(q.x * 12.0 + 3.0, 1.0));
  if (boltHere > 0.01 && q.y > hill) {
    float bx = (fbm3(vec2(q.y * 14.0, uBoltWin * 7.0)) - 0.5) * 0.09;
    float d = abs(q.x - bx);
    vec3 boltC = vec3(0.85, 0.9, 1.0) * boltHere * 2.4;
    col += boltC * (smoothstep(0.004, 0.0, d) + exp(-d * 60.0) * 0.45);
    float fork = WIN_H * 0.75;
    if (q.y < fork) {
      float bend = (fork - q.y) * (0.45 + 0.3 * sin(uBoltWin * 3.0));
      float bx2 = bx + bend * (mod(uBoltWin, 2.0) < 1.0 ? 1.0 : -1.0) + (fbm3(vec2(q.y * 30.0, uBoltWin)) - 0.5) * 0.03;
      float d2 = abs(q.x - bx2);
      col += boltC * 0.6 * smoothstep(0.003, 0.0, d2) * smoothstep(hill, hill + 0.08, q.y);
    }
  }
  if (q.y < hill) col = mix(vec3(0.012, 0.014, 0.024), vec3(0.24, 0.14, 0.14), uDawn) + vec3(0.2, 0.22, 0.3) * flash * 0.25;
  return col;
}

float rainOnGlass(vec2 q, float t) {
  float slant = uGust * 0.35;
  vec2 rp = vec2((q.x + q.y * slant) * 150.0, q.y * 5.0 + t * (3.2 + uGust * 2.5));
  float column = floor(rp.x);
  float h = hash21(vec2(column, 3.1));
  float y = fract(rp.y + h * 10.0);
  float streak = step(0.8 - uGust * 0.18, h) * smoothstep(0.35, 0.0, abs(fract(rp.x) - 0.5)) * smoothstep(0.0, 0.6, y) * smoothstep(1.0, 0.85, y);
  vec2 dp = q * vec2(60.0, 40.0);
  float dcol = floor(dp.x);
  dp.y += t * (0.15 + hash21(vec2(dcol, 7.0)) * 0.5);
  vec2 di = floor(dp);
  vec2 df = fract(dp) - 0.5;
  float drop = step(0.72, hash21(di)) * smoothstep(0.24, 0.1, length(df * vec2(1.0, 0.75)));
  float sheet = smoothstep(0.55, 1.0, 0.5 + 0.5 * sin((q.x + q.y * 0.4) * 30.0 - t * 4.0)) * uGust;
  return streak * 0.55 + drop * 0.6 + sheet * 0.3;
}

/** An ancestor in oils: dark ground, coat, ruff, wig, and eyes that follow you round the room. */
vec3 painting(vec2 d, float k, float lite, float flash, vec2 look) {
  float h1 = hash21(vec2(k, 4.7));
  float h2 = hash21(vec2(k, 9.1));
  vec3 bg = mix(vec3(0.07, 0.05, 0.03), mix(vec3(0.13, 0.05, 0.04), vec3(0.04, 0.08, 0.06), h2), 0.6);
  bg *= 0.65 + 0.6 * smoothstep(0.12, 0.0, length(d - vec2(-0.025, 0.035)));
  vec3 col = bg;
  vec3 coat = h1 < 0.33 ? vec3(0.3, 0.05, 0.06) : h1 < 0.66 ? vec3(0.06, 0.09, 0.22) : vec3(0.06, 0.06, 0.06);
  vec3 hair = h2 > 0.45 ? vec3(0.8, 0.78, 0.74) : vec3(0.13, 0.08, 0.05);
  vec3 skin = vec3(0.88, 0.67, 0.53);
  vec2 hc = vec2(look.x * 0.005, 0.02 + look.y * 0.002);
  float body = length((d - vec2(hc.x * 0.3, -0.088)) / vec2(0.064, 0.055));
  if (body < 1.0) col = coat * (0.65 + 0.45 * smoothstep(0.03, -0.04, d.x)) * (0.8 + 0.2 * smoothstep(1.0, 0.4, body));
  if (abs(d.x - hc.x * 0.6) < 0.009 && d.y > -0.04 && d.y < 0.0) col = skin * 0.75;
  float ruff = length((d - vec2(hc.x * 0.5, -0.035)) / vec2(0.022, 0.009));
  if (ruff < 1.0) col = vec3(0.86, 0.84, 0.78) * (0.82 + 0.18 * sin(d.x * 900.0));
  float wig = length((d - hc - vec2(-look.x * 0.002, 0.006)) / vec2(0.028, 0.031));
  if (wig < 1.0) {
    float curl = lite > 0.5 ? 0.5 : fbm3(d * 520.0 + k * 3.0);
    col = hair * (0.6 + 0.5 * curl) * (0.8 + 0.3 * smoothstep(0.02, -0.02, d.x - hc.x)) * (1.0 - 0.25 * smoothstep(0.7, 1.0, wig));
  }
  float face = length((d - hc) / vec2(0.018, 0.024));
  if (face < 1.0) {
    col = skin * (0.72 + 0.38 * smoothstep(0.02, -0.02, d.x - hc.x));
    col = mix(col, vec3(0.85, 0.45, 0.4), smoothstep(0.5, 0.0, length((d - hc - vec2(0.0, -0.008)) / vec2(0.016, 0.006))) * 0.15);
    for (int s = -1; s <= 1; s += 2) {
      vec2 e = d - hc - vec2(float(s) * 0.0075, 0.004);
      float white = length(e / vec2(0.0044, 0.0023));
      if (white < 1.0) {
        col = vec3(0.92, 0.9, 0.84);
        vec2 pp = e - look * vec2(0.0023, 0.0009);
        if (length(pp) < 0.0019) col = vec3(0.05, 0.03, 0.02) + vec3(1.0, 0.85, 0.5) * flash * 0.9;
        col += vec3(1.0, 0.8, 0.4) * flash * 0.25;
      }
      if (abs(e.y - 0.0045) < 0.0009 && abs(e.x) < 0.005) col *= 0.55;
    }
    if (abs(d.y - hc.y + 0.013) < 0.001 && abs(d.x - hc.x) < 0.0055) col *= 0.6;
    if (abs(d.x - hc.x - 0.002) < 0.0012 && d.y - hc.y < 0.0 && d.y - hc.y > -0.007) col *= 0.82;
  }
  float crack = lite > 0.5 ? 0.0 : smoothstep(0.9, 1.0, vnoise(d * 900.0));
  return col * vec3(1.0, 0.88, 0.66) * (1.0 - crack * 0.25);
}

vec3 firebox(vec2 o, float t, float k, float lite, float fo) {
  vec2 bc = vec2(o.x * 50.0 + mod(floor(o.y * 28.0), 2.0) * 0.5, o.y * 28.0);
  vec2 bf = abs(fract(bc) - 0.5);
  float mortar = max(smoothstep(0.42, 0.5, bf.x), smoothstep(0.38, 0.5, bf.y));
  vec3 col = vec3(0.07, 0.035, 0.025) * (1.0 - mortar * 0.5);
  float back = exp(-length(vec2(o.x * 9.0, (o.y - 0.03) * 8.0)));
  col *= 0.3 + 2.4 * back * fo;
  float fy = o.y / 0.12;
  if (lite < 0.5) {
    float n = fbm3(vec2(o.x * 42.0 + k * 3.1, o.y * 20.0 - t * 3.4));
    float h = fy * 1.2 + abs(o.x) * 10.0;
    float fl = clamp((n * 1.6 - h + 0.38) * 2.4, 0.0, 1.0) * fo;
    col = mix(col, vec3(0.85, 0.2, 0.03), fl * 0.85);
    col += vec3(1.0, 0.55, 0.12) * fl * fl * 1.1 + vec3(1.0, 0.92, 0.7) * pow(fl, 5.0) * 1.4;
    vec2 sg = vec2(o.x * 110.0, o.y * 34.0 - t * 2.2);
    float sh = hash21(floor(sg) + k * 17.0);
    vec2 sf = fract(sg) - 0.5;
    col += vec3(1.0, 0.7, 0.3) * step(0.95, sh) * smoothstep(0.22, 0.0, length(sf * vec2(1.0, 0.6))) * smoothstep(0.03, 0.08, o.y) * fo * 1.5;
  } else {
    col += vec3(1.0, 0.45, 0.1) * 0.6 * fo * smoothstep(0.1, 0.0, o.y);
  }
  if (o.y < 0.012) {
    float coal = lite > 0.5 ? 0.5 : vnoise(o * 260.0 + vec2(k * 5.0, t * 0.4));
    col = vec3(0.04, 0.025, 0.02) + vec3(1.0, 0.3, 0.05) * smoothstep(0.35, 0.8, coal) * fo * (0.6 + 0.4 * smoothstep(0.0, 0.012, o.y));
  }
  for (int i = 0; i < 2; i++) {
    vec2 a = i == 0 ? vec2(-0.046, 0.011) : vec2(-0.03, 0.027);
    vec2 b = i == 0 ? vec2(0.034, 0.017) : vec2(0.047, 0.014);
    float r = i == 0 ? 0.0095 : 0.0085;
    float ld = sdSeg(o, a, b) - r;
    if (ld < 0.0) {
      vec2 ax = normalize(b - a);
      float across = dot(o - a, vec2(-ax.y, ax.x)) / r;
      float along = dot(o - a, ax);
      float bark = lite > 0.5 ? 0.5 : vnoise(vec2(along * 260.0, across * 3.0 + float(i) * 7.0));
      col = mix(vec3(0.07, 0.04, 0.025), vec3(0.16, 0.09, 0.05), bark) * (0.5 + fo * smoothstep(-0.2, 1.0, across) * 1.4);
      float glow = smoothstep(0.1, -0.9, across) * (lite > 0.5 ? 0.5 : smoothstep(0.45, 0.75, vnoise(vec2(along * 180.0, t * 0.5 + float(i)))));
      col += vec3(1.0, 0.34, 0.06) * glow * fo * 1.3;
      float endGrain = smoothstep(r * 1.2, 0.0, length(o - b));
      col = mix(col, vec3(0.42, 0.28, 0.16) * (0.5 + fo), endGrain * 0.7);
    }
  }
  return col;
}

vec3 hall(vec2 p, float t, float A, float lite, float flash) {
  float sp = spacing(A);
  float flame = (1.0 - uDark) * (1.0 - uDawn * 0.45);
  float fo = fireOn();

  float row = floor(p.y * 9.0);
  vec2 cell = vec2(p.x * 4.8 + mod(row, 2.0) * 0.5, p.y * 9.0);
  vec2 bf = abs(fract(cell) - 0.5);
  float mortar = max(smoothstep(0.46, 0.5, bf.x), smoothstep(0.43, 0.5, bf.y));
  float stoneN = lite > 0.5 ? 0.5 : fbm3(p * vec2(18.0, 26.0));
  vec3 albedo = mix(vec3(0.3, 0.26, 0.22), vec3(0.42, 0.37, 0.32), stoneN) * (1.0 - mortar * 0.45);
  if (p.y < SILL) {
    float pf = fract(p.x * 7.0);
    float frameV = smoothstep(0.04, 0.0, pf) + smoothstep(0.96, 1.0, pf);
    float frameH = smoothstep(0.006, 0.0, abs(p.y - SILL + 0.012)) + smoothstep(0.006, 0.0, abs(p.y - FLOOR - 0.012));
    float grain = lite > 0.5 ? 0.5 : vnoise(vec2(p.x * 60.0, p.y * 6.0));
    albedo = mix(vec3(0.16, 0.08, 0.04), vec3(0.24, 0.13, 0.07), grain) * (1.0 - 0.35 * clamp(frameV + frameH, 0.0, 1.0));
  }

  vec3 light = vec3(0.05, 0.05, 0.07) + vec3(0.25, 0.32, 0.5) * flash * 0.5;
  float winGlow = 0.0;
  for (int k = -3; k <= 3; k++) {
    float cx = float(k) * sp;
    if (abs(cx - p.x) > sp) continue;
    vec2 q = p - vec2(cx, SILL);
    float d = archDist(q);
    winGlow += exp(-max(d, 0.0) * 9.0);
  }
  light += vec3(0.25, 0.3, 0.45) * winGlow * (0.25 + flash * 0.8) * (1.0 - uDawn);
  light += vec3(1.0, 0.75, 0.5) * winGlow * uDawn * 0.7;
  for (int k = -3; k <= 2; k++) {
    float kf = float(k);
    float cx = (kf + 0.5) * sp;
    vec2 c = vec2(cx, 0.29);
    float dd = length((p - c) * vec2(1.0, 1.3));
    light += vec3(1.0, 0.62, 0.3) * exp(-dd * 3.4) * 1.1 * flame * (0.94 + 0.06 * sin(t * 5.0 + kf));
    vec2 fp = vec2(cx, FLOOR + 0.06);
    light += vec3(1.0, 0.48, 0.16) * exp(-length((p - fp) * vec2(1.0, 1.25)) * 6.0) * 0.8 * fo * fireFlick(t, kf);
    vec2 cp = vec2(cx - sign(cx) * 0.175, -0.07);
    light += vec3(1.0, 0.7, 0.4) * exp(-length(p - cp) * 9.0) * 0.3 * flame;
  }
  vec3 col = albedo * light;

  if (p.y > 0.46) {
    float coffer = smoothstep(0.42, 0.5, max(abs(fract(p.x * 6.0) - 0.5), abs(fract(p.y * 10.0) - 0.5)));
    col = mix(vec3(0.16, 0.1, 0.06), vec3(0.32, 0.22, 0.1), coffer) * light;
    col *= smoothstep(0.75, 0.46, p.y) * 0.7 + 0.3;
  }

  for (int k = -3; k <= 3; k++) {
    float cx = float(k) * sp;
    if (abs(cx - p.x) > sp * 0.6) continue;
    vec2 q = p - vec2(cx, SILL);
    float d = archDist(q);
    if (d < 0.0) {
      float boltHere = float(abs(uBoltWin - float(k)) < 0.5) * (uBolt >= 0.0 ? exp(-uBolt * 5.0) : 0.0);
      vec3 glass = skyIn(q, t, flash, boltHere);
      if (lite < 0.5) {
        float wet = rainOnGlass(q + vec2(float(k) * 3.7, 0.0), t) * (1.0 - uDawn);
        glass += vec3(0.5, 0.56, 0.68) * wet * (0.18 + flash * 0.6) + vec3(1.0, 0.7, 0.4) * wet * 0.05 * flame;
      }
      float pane = max(smoothstep(0.08, 0.0, abs(fract(q.x * 26.0) - 0.5) - 0.42), smoothstep(0.08, 0.0, abs(fract(q.y * 19.0) - 0.5) - 0.42));
      float bar = smoothstep(0.004, 0.002, abs(q.x)) + smoothstep(0.004, 0.002, abs(q.y - WIN_H * 0.62));
      glass = mix(glass, vec3(0.02, 0.018, 0.016), clamp(pane * 0.7 + bar, 0.0, 1.0));
      col = glass;
    } else if (d < 0.016) {
      float edge = d / 0.016;
      col = vec3(0.5, 0.45, 0.38) * (0.5 + 0.5 * edge) * light * 1.2;
      if (q.y > WIN_H + WIN_W - 0.01 && abs(q.x) < 0.012) col = vec3(0.62, 0.55, 0.42) * light * 1.3;
    }
    float ax = abs(q.x);
    float top = WIN_H + WIN_W + 0.07;
    float hem = -0.12;
    float drop = smoothstep(top, hem, q.y);
    float billow = uGust * 0.022 * drop * (0.65 + 0.35 * sin(t * 1.9 + q.y * 12.0 + float(k) * 1.3 + sign(q.x)));
    float gather = mix(0.05, 0.03, drop);
    float inner = WIN_W - 0.012 - billow;
    if (ax > inner && ax < WIN_W + gather + 0.012 - billow * 0.5 && q.y > hem && q.y < top) {
      float x = (ax - inner) / (gather + 0.024);
      float fold = 0.55 + 0.45 * sin(x * 22.0 + q.y * 3.0 + billow * 120.0) * (0.7 + 0.3 * sin(q.y * 40.0 + x * 5.0));
      vec3 velvet = vec3(0.34, 0.035, 0.055) * fold;
      velvet += vec3(0.6, 0.15, 0.1) * pow(fold, 6.0) * 0.4;
      col = velvet * (light * 1.4 + 0.02);
      if (abs(q.y - 0.03) < 0.008) col = vec3(0.75, 0.55, 0.2) * light * 1.6;
    }
    if (abs(q.x) < WIN_W + gather + 0.02 && q.y > top - 0.04 && q.y < top + 0.01) {
      float swag = top - 0.025 - 0.015 * abs(sin(q.x * 38.0));
      if (q.y > swag) {
        col = vec3(0.3, 0.03, 0.05) * (light * 1.4 + 0.02) * (0.7 + 0.3 * sin(q.x * 90.0));
        if (q.y < swag + 0.006) col = vec3(0.8, 0.6, 0.25) * light * 1.5;
      }
    }
  }

  for (int k = -3; k <= 2; k++) {
    float kf = float(k);
    float cx = (kf + 0.5) * sp;
    if (abs(p.x - cx) > 0.12) continue;
    vec2 d = p - vec2(cx, 0.11);
    vec2 hs = vec2(0.068, 0.1);
    vec2 fh = hs + 0.016;
    if (abs(d.x) < fh.x && abs(d.y) < fh.y) {
      if (abs(d.x) < hs.x && abs(d.y) < hs.y) {
        vec2 look = uGaze - vec2(cx, 0.13);
        look /= max(length(look), 0.18);
        col = painting(d, kf, lite, flash, look) * (light * 1.5 + 0.015);
      } else {
        float e = min(fh.x - abs(d.x), fh.y - abs(d.y)) / 0.016;
        float carve = 0.6 + 0.4 * sin(e * 9.4) * (lite > 0.5 ? 1.0 : 0.8 + 0.2 * sin((d.x + d.y) * 400.0));
        col = vec3(0.78, 0.58, 0.26) * carve * (light * 1.6 + 0.02);
      }
    }
    vec2 f = p - vec2(cx, FLOOR);
    if (abs(f.x) < 0.108 && f.y > 0.0 && f.y < 0.185) {
      float fl = fo * fireFlick(t, kf);
      if (f.y > 0.168) {
        col = vec3(0.6, 0.55, 0.5) * (light * 1.4 + 0.02) * (0.75 + 0.25 * smoothstep(0.168, 0.185, f.y));
      } else if (abs(f.x) < 0.096) {
        float openD = f.y > 0.085 ? length(vec2(f.x, (f.y - 0.085) * 1.5)) - 0.062 : abs(f.x) - 0.062;
        if (openD < 0.0) {
          col = firebox(f, t, kf, lite, fl);
        } else {
          float vein = lite > 0.5 ? 0.5 : pow(1.0 - abs(sin(f.x * 60.0 + f.y * 40.0 + fbm3(f * 30.0) * 4.0)), 8.0);
          col = mix(vec3(0.52, 0.48, 0.44), vec3(0.3, 0.28, 0.27), vein * 0.5) * (light * 1.25 + 0.015);
          col += vec3(1.0, 0.45, 0.15) * exp(-openD * 45.0) * 0.35 * fl;
        }
      }
    }
  }
  return col;
}

vec3 chandeliers(vec2 p, float t, float A, vec3 col) {
  float sp = spacing(A);
  float flame = (1.0 - uDark) * (1.0 - uDawn * 0.45);
  for (int k = -3; k <= 2; k++) {
    float cx = (float(k) + 0.5) * sp;
    if (abs(p.x - cx) > 0.16) continue;
    float sway = sin(t * 0.4 + float(k)) * 0.003 + uGust * 0.002 * sin(t * 1.1 + float(k));
    vec2 c = vec2(cx + sway, 0.3);
    vec2 q = p - c;
    if (abs(q.x - sway * 4.0 * (p.y - 0.5)) < 0.0022 && q.y > 0.03) {
      float link = step(0.5, fract(p.y * 160.0));
      col = mix(vec3(0.35, 0.25, 0.1), vec3(0.75, 0.58, 0.26), link) * (0.35 + flame * 0.8);
    }
    if (length(q / vec2(0.013, 0.04)) < 1.0) col = vec3(0.8, 0.6, 0.28) * (0.35 + 0.65 * smoothstep(0.013, -0.01, q.x)) * (0.3 + flame);
    float ring = abs(length(q / vec2(0.09, 0.018) - vec2(0.0, -0.4)) - 1.0);
    if (ring < 0.09 && q.y < 0.0) col = vec3(0.78, 0.6, 0.3) * (0.4 + flame * 0.9);
    float glowAll = 0.0;
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.7854 + 0.39;
      vec2 cp = vec2(cos(a) * 0.09, -0.007 + sin(a) * 0.018);
      vec2 s = q - cp;
      if (abs(s.x) < 0.0032 && s.y > 0.0 && s.y < 0.02) col = vec3(0.92, 0.88, 0.78) * (0.4 + flame * 0.7);
      if (length(s / vec2(0.006, 0.0025)) < 1.0) col = vec3(0.75, 0.58, 0.28) * (0.4 + flame * 0.7);
      vec2 f = s - vec2(0.0, 0.026);
      float flick = 0.82 + 0.12 * sin(t * 13.0 + float(i) * 1.7 + float(k)) + 0.06 * sin(t * 31.0 + float(i) * 4.1);
      float tear = length(f / vec2(0.0035, 0.0075 * flick));
      col += vec3(1.0, 0.82, 0.5) * smoothstep(1.0, 0.2, tear) * 1.6 * flame;
      glowAll += exp(-length(f) * 45.0) * flick;
      if (uDark > 0.05) {
        float rise = s.y - 0.03;
        float wisp = smoothstep(0.012, 0.0, abs(s.x + sin(rise * 60.0 + t * 1.5) * 0.004 * rise * 30.0)) * step(0.0, rise) * exp(-rise * 14.0);
        col += vec3(0.5, 0.52, 0.56) * wisp * 0.2 * uDark * (0.5 + 0.5 * vnoise(vec2(rise * 30.0 - t, float(i))));
      }
      vec2 cr = q - vec2(cos(a + 0.39) * 0.07, -0.03 + sin(a + 0.39) * 0.012);
      float tw = pow(0.5 + 0.5 * sin(t * 2.3 + float(i * 7 + k * 3)), 12.0);
      col += vec3(1.0, 0.95, 0.85) * exp(-length(cr) * 600.0) * (0.4 + tw * 2.0) * (0.25 + flame);
    }
    col += vec3(1.0, 0.68, 0.35) * glowAll * 0.22 * flame;
    col += vec3(1.0, 0.66, 0.32) * exp(-length(q * vec2(1.0, 1.6)) * 9.0) * 0.12 * flame;
  }
  return col;
}

/** One guest, in units of their own height with the feet at the origin. dir points toward the board. */
float guestSd(vec2 u, float id, float lady, float dir, float t, float react, out float glassD) {
  float cheer = uDawn;
  float mourn = uDark;
  float lean = sin(t * 0.55 + id * 2.1) * 0.012 + react * 0.075 * dir + mourn * 0.03 * dir;
  float c = cos(lean);
  float s = sin(lean);
  u = vec2(c * u.x - s * u.y, s * u.x + c * u.y);
  float breath = sin(t * 1.4 + id) * 0.004;
  vec2 head = vec2(dir * (0.01 + react * 0.014 + mourn * 0.02), 0.9 + breath - mourn * 0.05);
  float d = sdEllipse(u - head, vec2(0.052, 0.062));
  d = min(d, sdEllipse(u - head - vec2(dir * 0.044, -0.008), vec2(0.012, 0.016)));
  if (lady > 0.5) {
    d = smin(d, length(u - head - vec2(-dir * 0.03, 0.05)) - 0.036, 0.012);
    d = min(d, length(u - head - vec2(-dir * 0.05, 0.085)) - 0.018);
  } else {
    d = smin(d, sdEllipse(u - head - vec2(-dir * 0.024, 0.016), vec2(0.05, 0.05)), 0.01);
    d = min(d, sdEllipse(u - head - vec2(-dir * 0.07, -0.035), vec2(0.016, 0.02)));
  }
  d = smin(d, sdTaper(u, 0.78, 0.86, 0.034, 0.024), 0.02);
  float waist = lady > 0.5 ? 0.055 : 0.078;
  float torso = sdTaper(u, 0.42, 0.76, waist + breath, 0.105 + breath);
  torso = smin(torso, sdEllipse(u - vec2(0.0, 0.755), vec2(0.122, 0.04)), 0.03);
  d = smin(d, torso, 0.025);
  if (lady > 0.5) {
    float sw = sin(t * 0.8 + id) * 0.008;
    float sy = clamp(u.y / 0.48, 0.0, 1.0);
    float bell = mix(0.2, waist + 0.005, pow(sy, 0.6));
    float skirt = max(abs(u.x - sw * (1.0 - sy) - dir * 0.012 * (1.0 - sy)) - bell, abs(u.y - 0.24) - 0.24);
    skirt = max(skirt, -u.y);
    d = smin(d, skirt, 0.03);
    d = min(d, sdEllipse(u - vec2(dir * 0.02, 0.69), vec2(0.075, 0.03)));
  } else {
    d = smin(d, sdTaper(u, 0.3, 0.52, 0.098, waist + 0.002), 0.02);
    for (int l = -1; l <= 1; l += 2) {
      float lx = float(l) * 0.036;
      d = smin(d, sdSeg(u, vec2(lx, 0.42), vec2(lx * 1.1, 0.04)) - mix(0.027, 0.042, clamp((u.y - 0.04) / 0.38, 0.0, 1.0)), 0.012);
      d = min(d, sdEllipse(u - vec2(lx * 1.1 + dir * 0.02, 0.016), vec2(0.046, 0.017)));
    }
  }
  float clap = abs(sin(t * 8.0 + id)) * 0.035 * cheer;
  float sip = pow(max(0.0, sin(t * 0.22 + id * 3.0)), 24.0) * (1.0 - cheer) * (1.0 - react);
  vec2 shO = vec2(-dir * 0.115, 0.75);
  vec2 shI = vec2(dir * 0.115, 0.75);
  vec2 elO = mix(vec2(-dir * 0.14, 0.57), vec2(-dir * 0.19, 0.93), cheer);
  vec2 haO = mix(vec2(-dir * 0.125, 0.42), vec2(-dir * (0.06 + clap), 1.07), cheer);
  vec2 elI = mix(vec2(dir * 0.15, 0.58), vec2(dir * 0.19, 0.93), cheer);
  vec2 haI = mix(mix(vec2(dir * 0.075, 0.66), vec2(dir * 0.03, 0.86), sip), vec2(dir * (0.06 + clap), 1.07), cheer);
  float point = react * 0.7 * (1.0 - cheer);
  elI = mix(elI, vec2(dir * 0.2, 0.68), point);
  haI = mix(haI, vec2(dir * 0.27, 0.74), point);
  d = smin(d, sdSeg(u, shO, elO) - 0.033, 0.015);
  d = min(d, sdSeg(u, elO, haO) - 0.027);
  d = smin(d, sdSeg(u, shI, elI) - 0.033, 0.015);
  d = min(d, sdSeg(u, elI, haI) - 0.027);
  vec2 g = u - haI - vec2(0.0, 0.05);
  glassD = min(sdEllipse(g - vec2(0.0, 0.025), vec2(0.022, 0.028)), max(abs(g.x) - 0.004, abs(g.y + 0.01) - 0.02));
  return d;
}

vec3 guests(vec2 p, float t, float A, float flash, vec3 col) {
  float sp = spacing(A);
  float react = reaction();
  float fo = fireOn();
  for (int k = -3; k <= 2; k++) {
    float cx = (float(k) + 0.5) * sp;
    if (abs(p.x - cx) > 0.24) continue;
    float dir = -sign(cx);
    for (int j = 0; j < 2; j++) {
      float side = j == 0 ? -1.0 : 1.0;
      float id = float(k * 2 + j) + 7.0;
      float lady = step(0.5, hash21(vec2(id, 2.0)));
      float H = 0.27 + hash21(vec2(id, 5.0)) * 0.025 - lady * 0.015;
      vec2 feet = vec2(cx + side * 0.106, FLOOR - 0.035);
      vec2 u = (p - feet) / H;
      if (u.y < -0.08 || u.y > 1.25 || abs(u.x) > 0.6) continue;
      float shadow = length((p - feet) / vec2(0.075, 0.012));
      col *= mix(0.5, 1.0, smoothstep(0.3, 1.0, shadow));
      float glassD;
      float d = guestSd(u, id, lady, dir, t, react, glassD) * H;
      if (d < 0.0) {
        float rim = smoothstep(-0.005, 0.0, d);
        col = vec3(0.016, 0.011, 0.01) + vec3(1.0, 0.45, 0.15) * rim * (0.6 * fo + 0.05) + vec3(0.35, 0.4, 0.6) * rim * 0.4 * flash;
      } else {
        col += vec3(1.0, 0.5, 0.2) * exp(-d * 240.0) * 0.14 * fo;
      }
      if (glassD < 0.0) {
        float rim = smoothstep(-0.004, 0.0, glassD * H);
        col = mix(vec3(0.22, 0.03, 0.05) * (0.3 + fo * 0.7), vec3(1.0, 0.85, 0.6) * (0.3 + fo * 0.6), rim * 0.7);
      }
    }
  }
  return col;
}

/** A standing candelabrum just beside the board; the flames bow when someone is checked. */
vec3 candelabra(vec2 p, float t, float A, vec3 col) {
  float sp = spacing(A);
  float flame = (1.0 - uDark) * (1.0 - uDawn * 0.45);
  float gutter = uFlash >= 0.0 ? exp(-uFlash * 1.5) * 0.6 : 0.0;
  for (int k = -3; k <= 2; k++) {
    float cx = (float(k) + 0.5) * sp;
    float x0 = cx - sign(cx) * 0.175;
    vec2 q = p - vec2(x0, FLOOR - 0.13);
    if (abs(q.x) > 0.3 || q.y < -0.15 || q.y > 0.5) continue;
    vec3 brass = vec3(0.72, 0.54, 0.25) * (0.18 + flame * 0.75) * (0.7 + 0.5 * smoothstep(0.004, -0.004, q.x));
    if (abs(q.x) < 0.06 && q.y > -0.01 && q.y < 0.26) {
      bool hit = false;
      if (q.y < 0.024 && abs(q.x) < 0.034 - q.y * 0.9) hit = true;
      float stemW = 0.0034 + 0.0018 * smoothstep(0.6, 1.0, sin(q.y * 140.0));
      if (q.y < 0.2 && abs(q.x) < stemW) hit = true;
      if (length((q - vec2(0.0, 0.1)) / vec2(0.009, 0.006)) < 1.0) hit = true;
      float armY = 0.182 + 13.0 * q.x * q.x;
      if (abs(q.x) < 0.047 && abs(q.y - armY) < 0.0024) hit = true;
      if (hit) col = brass;
    }
    float shadow = length((q - vec2(0.0, -0.004)) / vec2(0.05, 0.008));
    if (q.y < -0.001) col *= mix(0.6, 1.0, smoothstep(0.4, 1.0, shadow));
    for (int i = -1; i <= 1; i++) {
      float fi = float(i);
      vec2 c = q - vec2(fi * 0.045, i == 0 ? 0.214 : 0.21);
      if (abs(c.x) < 0.007 && c.y > -0.004 && c.y < 0.0) col = brass * 1.2;
      if (abs(c.x) < 0.0036 && c.y >= 0.0 && c.y < 0.034) col = vec3(0.9, 0.86, 0.76) * (0.3 + flame * 0.7) * (0.8 + 0.2 * smoothstep(0.003, -0.003, c.x));
      vec2 fq = c - vec2(0.0, 0.034);
      float sway = sin(t * 1.6 + fi * 2.0 + float(k)) * 0.0012 + sin(t * 5.3 + fi) * 0.0009 * (0.4 + uGust) + gutter * 0.003 * sign(cx);
      fq.x -= sway * clamp(fq.y / 0.01, 0.0, 2.0);
      float fl = flame * (1.0 - gutter) * (0.9 + 0.1 * sin(t * 17.0 + fi * 3.0));
      float tear = length(fq / vec2(0.0034, 0.0085) - vec2(0.0, 0.55));
      col += vec3(1.0, 0.8, 0.45) * smoothstep(1.0, 0.25, tear) * 1.5 * fl;
      float gl = length(fq - vec2(0.0, 0.005));
      col += vec3(1.0, 0.65, 0.3) * (exp(-gl * 70.0) * 0.35 + exp(-gl * 14.0) * 0.06) * fl;
    }
  }
  return col;
}

/** Sparks escaping the hearths and drifting up past the portraits. */
vec3 embers(vec2 p, float t, float A) {
  float sp = spacing(A);
  float fo = fireOn();
  vec3 add = vec3(0.0);
  for (int k = -3; k <= 2; k++) {
    float cx = (float(k) + 0.5) * sp;
    vec2 q = p - vec2(cx, -0.07);
    if (abs(q.x) > 0.2 || q.y < 0.0 || q.y > 0.45) continue;
    vec2 g = vec2(q.x * 50.0 + sin(q.y * 9.0 + t * 0.8) * 1.5, q.y * 22.0 - t * 0.9);
    vec2 gi = floor(g);
    float h = hash21(gi + float(k) * 31.0);
    vec2 gf = fract(g) - 0.5 + vec2(sin(t * 1.3 + h * 40.0), cos(t * 1.1 + h * 25.0)) * 0.25;
    float e = step(0.94, h) * smoothstep(0.15, 0.0, length(gf));
    float fade = smoothstep(0.45, 0.04, q.y) * smoothstep(0.2, 0.04, abs(q.x));
    add += vec3(1.0, 0.55, 0.18) * e * fade * (0.6 + 0.4 * sin(t * 6.0 + h * 50.0)) * fo * 1.4;
  }
  return add;
}

vec3 shafts(vec2 p, float t, float A, float flash) {
  float sp = spacing(A);
  vec2 dir = normalize(vec2(-0.38, -1.0));
  vec2 nrm = vec2(-dir.y, dir.x);
  vec3 add = vec3(0.0);
  float strength = 0.035 + flash * 0.35 + uDawn * 0.3;
  vec3 tint = mix(vec3(0.55, 0.65, 0.95), vec3(1.0, 0.78, 0.5), uDawn);
  for (int k = -3; k <= 3; k++) {
    float cx = float(k) * sp;
    vec2 o = vec2(cx, SILL + WIN_H * 0.6);
    vec2 r = p - o;
    float along = dot(r, dir);
    if (along < 0.0) continue;
    float perp = dot(r, nrm);
    float width = WIN_W * (0.9 + along * 0.5);
    float beam = smoothstep(width, width * 0.25, abs(perp)) * exp(-along * 1.6) * smoothstep(0.0, 0.08, along);
    if (beam < 0.001) continue;
    vec2 mp = vec2(perp * 90.0, along * 90.0 + t * 0.6);
    vec2 mi = floor(mp);
    float mh = hash21(mi + float(k) * 13.0);
    vec2 mf = fract(mp) - 0.5 + vec2(sin(t * 0.7 + mh * 30.0), cos(t * 0.5 + mh * 20.0)) * 0.3;
    float mote = step(0.86, mh) * smoothstep(0.08, 0.0, length(mf)) * (0.5 + 0.5 * sin(t * 2.0 + mh * 40.0));
    add += tint * beam * (strength + mote * 0.6 * (0.4 + uDawn));
  }
  return add;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  float A = uRes.x / uRes.y;
  vec2 p = (frag - 0.5 * uRes) / uRes.y;
  float t = uTime;
  float flash = flashLevel();
  float sp = spacing(A);
  float flame = (1.0 - uDark) * (1.0 - uDawn * 0.45);
  float fo = fireOn();
  vec3 col;

  if (p.y >= FLOOR) {
    col = hall(p, t, A, 0.0, flash);
    col = chandeliers(p, t, A, col);
  } else {
    float depth = FLOOR - p.y;
    float z = 0.14 / (depth + 0.006);
    vec2 w = vec2(p.x * z * 1.3, z);
    vec2 tile = floor(w);
    float checker = mod(tile.x + tile.y, 2.0);
    float vein = pow(1.0 - abs(sin((w.x * 0.7 + w.y * 0.4) * 3.0 + fbm3(w * 1.4) * 5.0)), 10.0);
    vec3 albedo = mix(vec3(0.62, 0.58, 0.52), vec3(0.06, 0.1, 0.09), checker);
    albedo = mix(albedo, mix(vec3(0.4, 0.4, 0.42), vec3(0.5, 0.55, 0.5), checker), vein * 0.4);
    vec2 g = abs(fract(w) - 0.5);
    albedo *= 1.0 - 0.4 * smoothstep(0.47, 0.5, max(g.x, g.y)) * smoothstep(0.5, 0.05, depth);
    vec3 light = vec3(0.04, 0.04, 0.06) + vec3(0.25, 0.3, 0.45) * flash * 0.35;
    for (int k = -3; k <= 2; k++) {
      float kf = float(k);
      float cx = (kf + 0.5) * sp;
      vec2 d = vec2(p.x - cx, (p.y - FLOOR + 0.05) * 3.0);
      light += vec3(1.0, 0.62, 0.3) * exp(-length(d) * 4.0) * 0.6 * flame;
      vec2 fd = vec2(p.x - cx, (p.y - FLOOR + 0.03) * 3.2);
      light += vec3(1.0, 0.45, 0.15) * exp(-length(fd) * 7.0) * 0.9 * fo * fireFlick(t, kf);
      vec2 cd = vec2(p.x - cx + sign(cx) * 0.175, (p.y - FLOOR + 0.13) * 3.5);
      light += vec3(1.0, 0.66, 0.35) * exp(-length(cd) * 9.0) * 0.4 * flame;
    }
    for (int k = -3; k <= 3; k++) {
      float cx = float(k) * sp - 0.13;
      vec2 d = vec2((p.x - cx - (p.y - FLOOR) * 0.5) / 0.09, (p.y - FLOOR + 0.1) / 0.06);
      float pool = smoothstep(1.0, 0.3, length(d));
      light += mix(vec3(0.45, 0.55, 0.85), vec3(1.0, 0.75, 0.48), uDawn) * pool * (0.1 + flash * 0.9 + uDawn * 0.8);
    }
    light += vec3(1.0, 0.75, 0.4) * 0.04 * clamp(uTurn, 0.0, 1.0) + vec3(0.4, 0.55, 0.9) * 0.04 * clamp(-uTurn, 0.0, 1.0);
    col = albedo * light;
    float ripple = (fbm3(w * 3.0) - 0.5) * 0.012;
    vec2 rp = vec2(p.x + ripple, FLOOR + depth * 1.35 + ripple);
    vec3 refl = hall(rp, t, A, 1.0, flash);
    refl = chandeliers(rp, t, A, refl);
    float fres = 0.32 * smoothstep(0.32, 0.0, depth);
    col += refl * fres * mix(0.6, 1.0, checker);
  }

  col = guests(p, t, A, flash, col);
  col = candelabra(p, t, A, col);
  col += embers(p, t, A);
  col += shafts(p, t, A, flash);

  float lum = dot(col, vec3(0.3, 0.59, 0.11));
  col = mix(col, vec3(lum) * vec3(0.75, 0.82, 1.0), uDark * 0.45) * (1.0 - uDark * 0.2);
  vec2 vg = frag / uRes - 0.5;
  col *= 1.0 - (0.55 + uFocus * 0.25) * dot(vg, vg) * 1.6;
  col = 1.0 - exp(-col * 1.5);
  col = pow(col, vec3(0.95));
  col += (hash21(frag + fract(t) * 91.0) - 0.5) * 0.01;
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

	function spacing(A: number) {
		const e = A * 0.5 - 0.11;
		if (e < 0.25) return 0.5;
		const m = Math.max(0, Math.floor(e / 0.47 - 0.5));
		return e / (m + 0.5);
	}

	function hallGl(canvas: HTMLCanvasElement) {
		const pass = createFullscreenPass(canvas, FRAG, 'chess grand hall');
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
		let left = 0;
		let topPx = 0;
		let raf = 0;
		let last = t0;
		let dawn = 0;
		let dark = 0;
		let focus = 0;
		let lean = 0;
		let gust = 0.3;
		let gazeX = 0;
		let gazeY = -0.1;
		let flashAt = -100;
		let stirAt = -100;
		let boltAt = -100;
		let boltWin = 0;
		let nextBolt = 6 + Math.random() * 6;

		const strike = (time: number, strength: number) => {
			boltAt = time;
			const A = cssW / Math.max(1, cssH);
			const sp = spacing(A);
			const visible = Math.max(0, Math.floor(A / 2 / sp));
			boltWin = Math.round((Math.random() * 2 - 1) * visible);
			onthunder?.(strength);
		};

		const draw = (ms: number) => {
			if (!cssW || !cssH) return;
			const dt = Math.min(1 / 20, Math.max(0, (ms - last) / 1000));
			last = ms;
			const time = (ms - t0) / 1000;
			const ease = (rate: number) => (calm ? 1 : 1 - Math.exp(-dt * rate));
			const dawnGoal = mood === 'won' ? 1 : mood === 'draw' ? 0.35 : 0;
			dawn += (dawnGoal - dawn) * ease(0.35);
			dark += ((mood === 'lost' ? 1 : 0) - dark) * ease(mood === 'lost' ? 0.9 : 0.5);
			focus += ((mood === 'play' ? 1 : 0) - focus) * ease(1.2);
			lean += (turn - lean) * ease(2.5);
			const kick = Math.max(0, 0.45 * Math.exp(-(time - boltAt) * 0.5));
			const wind = 0.32 + 0.22 * Math.sin(time * 0.13) + 0.18 * Math.sin(time * 0.37 + 1.3) + 0.12 * Math.sin(time * 0.91 + 0.4) + kick;
			gust += ((calm ? 0.3 : Math.max(0, Math.min(1, wind))) - gust) * ease(1.5);
			const target = untrack(() => gaze);
			const gx = target ? (target.x - left - cssW / 2) / cssH : 0;
			const gy = target ? (cssH / 2 - (target.y - topPx)) / cssH : -0.1;
			gazeX += (gx - gazeX) * ease(3);
			gazeY += (gy - gazeY) * ease(3);
			if (!calm && mood !== 'won' && time > nextBolt) {
				strike(time, 0.4 + Math.random() * 0.4);
				nextBolt = time + (gust > 0.55 ? 5 : 8) + Math.random() * 12;
			}

			gl.useProgram(pass.program);
			gl.uniform2f(pass.uniform('uRes'), canvas.width, canvas.height);
			gl.uniform1f(pass.uniform('uTime'), calm ? 8 : time);
			gl.uniform1f(pass.uniform('uFlash'), calm ? -1 : time - flashAt);
			gl.uniform1f(pass.uniform('uBolt'), calm ? -1 : time - boltAt);
			gl.uniform1f(pass.uniform('uBoltWin'), boltWin);
			gl.uniform1f(pass.uniform('uDawn'), dawn);
			gl.uniform1f(pass.uniform('uDark'), dark);
			gl.uniform1f(pass.uniform('uFocus'), focus);
			gl.uniform1f(pass.uniform('uTurn'), lean);
			gl.uniform2f(pass.uniform('uGaze'), gazeX, gazeY);
			gl.uniform1f(pass.uniform('uGust'), gust);
			gl.uniform1f(pass.uniform('uStir'), calm ? -1 : time - stirAt);
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
			left = rect.left;
			topPx = rect.top;
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
				if (next > seenFlash && !calm) {
					const time = (performance.now() - t0) / 1000;
					flashAt = time;
					if (Math.random() < 0.6) strike(time, 0.7);
				}
				seenFlash = next;
			});
		});

		let seenStir = untrack(() => stir);
		$effect(() => {
			const next = stir;
			untrack(() => {
				if (next > seenStir && !calm) stirAt = (performance.now() - t0) / 1000;
				seenStir = next;
			});
		});

		$effect(() => {
			void mood;
			void turn;
			void gaze;
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

<div class="hall" aria-hidden="true">
	{#if failed}
		<div class="fallback"></div>
	{:else}
		<canvas {@attach hallGl}></canvas>
	{/if}
</div>

<style>
	.hall {
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
			radial-gradient(14% 12% at 8% 72%, rgba(255, 130, 50, 0.35), transparent 70%),
			radial-gradient(14% 12% at 92% 72%, rgba(255, 130, 50, 0.35), transparent 70%),
			radial-gradient(18% 14% at 30% 22%, rgba(255, 180, 100, 0.35), transparent 70%),
			radial-gradient(18% 14% at 70% 22%, rgba(255, 180, 100, 0.35), transparent 70%),
			linear-gradient(180deg, #120c08 0%, #1a120c 60%, #0b0806 70%, #070605 100%);
	}
</style>
