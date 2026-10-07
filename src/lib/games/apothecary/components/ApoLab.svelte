<script lang="ts">
	import { untrack } from 'svelte';
	import { createFullscreenPass } from '$lib/gl/fullscreen';
	import { createPacer } from '$lib/gl/pace';
	import { REAGENTS } from '../types';

	type Mood = 'menu' | 'play' | 'stone' | 'over';

	let {
		mood = 'menu',
		brew = 4,
		flare = { id: 0, tier: 0 },
		tension = 0
	}: {
		mood?: Mood;
		/** Highest tier on the rack; the alembic boils that colour. */
		brew?: number;
		/** Bumps on every merge; the burner flares in the new colour. */
		flare?: { id: number; tier: number };
		/** 0–1, how full the rack is; the burner roars as space runs out. */
		tension?: number;
	} = $props();

	let failed = $state(false);

	const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uBrew;
uniform float uFlare;
uniform vec3 uFlareCol;
uniform float uTension;
uniform float uWarm;
uniform float uDim;
out vec4 outColor;

#define PI 3.14159265
float AA;

float hash21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1, 0)), u.x), mix(hash21(i + vec2(0, 1)), hash21(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 3; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float sdBox(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
float sdRound(vec2 p, vec2 b, float r) { return sdBox(p, b - r) - r; }
float sdSeg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)); }
float sdEll(vec2 p, vec2 r) { float k = length(p / r); return (k - 1.0) * min(r.x, r.y); }
float cover(float d) { return smoothstep(AA, -AA, d); }
float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }

vec3 wall(vec2 p) {
  vec2 s = vec2(0.17, 0.09);
  float row = floor(p.y / s.y);
  vec2 q = vec2(p.x / s.x + 0.5 * mod(row, 2.0), p.y / s.y);
  vec2 id = floor(q);
  vec2 f = fract(q);
  float h = hash21(id);
  vec2 e = min(f, 1.0 - f) * s;
  float edge = min(e.x, e.y) + (vnoise(p * 90.0) - 0.5) * 0.005;
  vec3 c = mix(vec3(0.17, 0.15, 0.14), vec3(0.27, 0.23, 0.2), h) * (0.75 + 0.45 * fbm(p * 22.0 + id * 3.0));
  c *= 0.8 + 0.2 * smoothstep(0.0, 0.025, edge);
  c = mix(vec3(0.06, 0.05, 0.045), c, smoothstep(0.003, 0.008, edge));
  return c;
}

const vec3 GLASS[5] = vec3[5](vec3(0.85, 0.5, 0.15), vec3(0.2, 0.6, 0.3), vec3(0.2, 0.35, 0.8), vec3(0.55, 0.25, 0.7), vec3(0.75, 0.15, 0.15));

/* A plank of bottles; adds glass and liquid to col and the occasional glowing tincture to emit. */
void shelf(vec2 p, float y0, float x0, float x1, float sd, float t, inout vec3 col, inout vec3 emit, inout float shade) {
  if (p.x < x0 - 0.03 || p.x > x1 + 0.03 || p.y < y0 - 0.08 || p.y > y0 + 0.2) return;
  float mid = (x0 + x1) * 0.5;
  float half_ = (x1 - x0) * 0.5;
  shade = max(shade, smoothstep(0.05, 0.0, y0 - 0.02 - p.y) * step(p.y, y0 - 0.02) * step(abs(p.x - mid), half_ + 0.02) * 0.6);
  float slot = 0.08;
  float i = floor((p.x - x0) / slot);
  if (i >= 0.0 && x0 + (i + 1.0) * slot <= x1 + 0.001) {
    float h = hash21(vec2(i, sd));
    float h2 = hash21(vec2(sd, i * 1.7));
    float h3 = hash21(vec2(i * 3.1, sd + 2.0));
    if (h3 > 0.12) {
      vec2 bq = p - vec2(x0 + (i + 0.5) * slot + (h2 - 0.5) * 0.014, y0);
      float type = floor(h * 3.0);
      float d;
      float lvl;
      float hw;
      float top;
      if (type < 0.5) {
        float H = 0.07 + h2 * 0.07;
        d = min(sdRound(bq - vec2(0.0, H * 0.5), vec2(0.022, H * 0.5), 0.01), sdBox(bq - vec2(0.0, H + 0.012), vec2(0.008, 0.014)));
        lvl = H * (0.3 + 0.5 * h3); hw = 0.022; top = H + 0.026;
      } else if (type < 1.5) {
        d = min(length(bq - vec2(0.0, 0.032)) - 0.032, sdBox(bq - vec2(0.0, 0.074), vec2(0.009, 0.016)));
        lvl = 0.02 + 0.03 * h3; hw = 0.032; top = 0.09;
      } else {
        d = sdRound(bq - vec2(0.0, 0.026), vec2(0.03, 0.026), 0.008);
        lvl = 0.03 + 0.015 * h3; hw = 0.03; top = 0.06;
      }
      vec3 gc = GLASS[int(mod(floor(h3 * 17.0), 5.0))];
      float m = cover(d);
      vec3 glass = col * 0.45 + gc * 0.12;
      float liq = step(bq.y, lvl) * cover(d + 0.005);
      glass = mix(glass, gc * 0.6, liq);
      glass += vec3(1.0) * 0.35 * smoothstep(0.006, 0.0, abs(bq.x + hw * 0.5)) * cover(d + 0.004);
      col = mix(col, glass, m);
      if (type > 1.5) col = mix(col, vec3(0.35, 0.22, 0.12), cover(sdBox(bq - vec2(0.0, 0.056), vec2(0.033, 0.007))));
      else col = mix(col, vec3(0.45, 0.3, 0.18), cover(sdBox(bq - vec2(0.0, top + 0.004), vec2(0.009, 0.008))));
      if (h2 > 0.72) emit += gc * liq * (0.35 + 0.25 * sin(t * 1.3 + h * 20.0));
      shade = max(shade, cover(sdEll(bq - vec2(0.015, -0.002), vec2(hw * 1.3, 0.006))) * 0.5);
    }
  }
  float plank = sdBox(p - vec2(mid, y0 - 0.012), vec2(half_ + 0.025, 0.012));
  vec3 wood = vec3(0.32, 0.19, 0.1) * (0.75 + 0.4 * vnoise(vec2(p.x * 40.0, p.y * 300.0)));
  wood += vec3(0.2, 0.12, 0.05) * smoothstep(0.004, 0.0, abs(p.y - y0 + 0.001));
  col = mix(col, wood, cover(plank));
}

float flameSd(vec2 q, float size, float t) {
  q /= size;
  q.x += sin(q.y * 9.0 - t * 14.0) * 0.12 * q.y;
  float d = sdEll(q - vec2(0.0, 0.32), vec2(0.18, 0.42 + 0.06 * sin(t * 17.0)));
  d = smin(d, length(q) - 0.2, 0.15);
  return d * size;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  AA = 1.6 / uRes.y;
  float A = uRes.x / uRes.y;
  vec2 p = (frag - 0.5 * uRes) / uRes.y;
  float t = uTime;
  float tall = 1.0 - smoothstep(0.85, 1.15, A);
  float sc = mix(1.0, 0.8, tall);

  float yT = mix(-0.31, -0.39, tall);
  vec2 W = mix(vec2(A * 0.5 - 0.27, 0.19), vec2(A * 0.5 - 0.16, 0.37), tall);
  vec2 F = vec2(-A * 0.5 + mix(0.27, 0.17, tall), yT + 0.14 * sc);
  float Fr = 0.1 * sc;
  vec2 Bn = vec2(F.x, yT + 0.008);
  vec2 R = vec2(F.x + mix(0.3, 0.22, tall), yT + 0.05 * sc);
  vec2 Cn = vec2(A * 0.5 - mix(0.17, 0.1, tall), yT + 0.075 * sc);
  vec2 Bk = vec2(A * 0.5 - mix(0.5, 0.33, tall), yT - 0.09);

  float flick = 0.88 + 0.08 * sin(t * 13.0 + sin(t * 3.7) * 2.0) + 0.08 * (vnoise(vec2(t * 8.0, 3.0)) - 0.5);
  float burner = (0.75 + 0.5 * uTension + uFlare * 0.9) * (0.9 + 0.1 * sin(t * 21.0));

  vec3 col = wall(p);
  vec3 emit = vec3(0.0);
  float shade = 0.0;

  /* Arched window with a night sky, and a raven on the sill. */
  float moonMask = 0.0;
  {
    vec2 wq = (p - W) / sc;
    float body = min(sdBox(wq - vec2(0.0, -0.05), vec2(0.13, 0.13)), length(wq - vec2(0.0, 0.08)) - 0.13);
    float frame = body - 0.02;
    col = mix(col, vec3(0.3, 0.27, 0.24) * (0.8 + 0.3 * vnoise(wq * 60.0)), cover(frame * sc));
    if (body < 0.01) {
      vec3 sky = mix(vec3(0.02, 0.04, 0.12), vec3(0.07, 0.12, 0.28), smoothstep(0.2, -0.2, wq.y));
      vec2 sp = wq * 60.0;
      vec2 cell = floor(sp);
      float hs = hash21(cell);
      float tw = 0.5 + 0.5 * sin(t * (1.0 + hs * 3.0) + hs * 50.0);
      sky += vec3(0.9, 0.95, 1.0) * smoothstep(0.12, 0.0, length(fract(sp) - 0.5)) * step(0.9, hs) * tw;
      vec2 mq = wq - vec2(-0.05, 0.08);
      float moon = length(mq) - 0.04;
      vec3 mc = vec3(0.95, 0.93, 0.85) * (0.85 + 0.15 * vnoise(mq * 90.0)) - 0.1 * step(length(mq - vec2(0.012, 0.01)), 0.009);
      sky = mix(sky, mc, cover(moon * sc));
      sky += vec3(0.5, 0.6, 0.9) * 0.25 * exp(-max(moon, 0.0) * 30.0);
      float sp2 = mod(t, 19.0);
      if (sp2 < 0.9) {
        vec2 a = vec2(0.12, 0.17) - vec2(0.3, 0.12) * sp2;
        float trail = sdSeg(wq, a, a + vec2(0.06, 0.024));
        sky += vec3(1.0) * smoothstep(0.004, 0.0, trail) * smoothstep(0.9, 0.3, sp2);
      }
      float bars = min(abs(wq.x) - 0.006, abs(wq.y + 0.02) - 0.006);
      sky = mix(sky, vec3(0.08, 0.06, 0.05), cover(bars * sc));
      col = mix(col, sky, cover(body * sc));
      emit += sky * cover(body * sc) * 0.6;
      moonMask = cover(body * sc);
    }
    float sill = sdBox(wq - vec2(0.0, -0.19), vec2(0.17, 0.014));
    col = mix(col, vec3(0.36, 0.32, 0.28), cover(sill * sc));

    /* Raven: blinks, turns its head, ruffles at a rare pour. */
    vec2 rq = (wq - vec2(0.08, -0.115));
    float look = sign(sin(floor(t / 5.3) * 12.9898) + 0.2);
    float ruffle = 1.0 + 0.08 * uFlare * step(0.4, uFlare);
    float hop = abs(sin(t * 6.0)) * 0.012 * step(mod(t, 31.0), 1.0);
    rq.y -= hop;
    float rb = sdEll((rq - vec2(0.0, 0.0)) * rot(0.25), vec2(0.03, 0.045) * ruffle);
    vec2 hc = vec2(look * 0.014, 0.05);
    float rh = length(rq - hc) - 0.02;
    vec2 bq = (rq - hc - vec2(look * 0.025, -0.002)) * vec2(look, 1.0);
    float beak = sdBox(rot(0.15) * bq, vec2(0.016, 0.004 + 0.004 * (1.0 - bq.x / 0.016)));
    float tail = sdBox(rot(-0.3 * look) * (rq - vec2(-look * 0.02, -0.055)), vec2(0.01, 0.025));
    float legs = min(sdSeg(rq, vec2(-0.008, -0.04), vec2(-0.008, -0.07)), sdSeg(rq, vec2(0.006, -0.04), vec2(0.006, -0.07))) - 0.002;
    float raven = min(min(min(rb, rh), min(beak, tail)), legs);
    vec3 feather = vec3(0.05, 0.05, 0.07) + vec3(0.12, 0.14, 0.22) * smoothstep(0.02, -0.02, rq.x * look - rq.y * 0.3) * 0.5;
    col = mix(col, feather, cover(raven * sc));
    float blink = step(0.12, mod(t + 1.3, 4.1));
    vec2 eq = rq - hc - vec2(look * 0.009, 0.004);
    emit += vec3(0.9, 0.8, 0.5) * cover((length(eq) - 0.0035) * sc) * blink * 0.7;
  }

  /* Shelves of bottles. */
  float shY = mix(0.24, 0.395, tall);
  shelf(p, shY, -A * 0.5 + 0.04, -A * 0.5 + mix(0.5, A * 0.55, tall), 3.0, t, col, emit, shade);
  if (tall < 0.5) shelf(p, -0.02, A * 0.5 - 0.46, A * 0.5 - 0.05, 9.0, t, col, emit, shade);

  /* Bundles of herbs hanging from the beam. */
  for (int k = 0; k < 2; k++) {
    float fk = float(k);
    vec2 hp = vec2(mix(-A * 0.5 + 0.62, A * 0.5 - 0.12, fk), 0.5);
    if (tall > 0.5) hp.x = mix(-A * 0.5 + 0.1, A * 0.5 - 0.06, fk);
    float sway = sin(t * 0.7 + fk * 2.0) * 0.06;
    vec2 hq = rot(sway) * (p - hp);
    float len = 0.11 + fk * 0.03;
    float string = sdSeg(hq, vec2(0.0), vec2(0.0, -len)) - 0.0015;
    col = mix(col, vec3(0.5, 0.42, 0.3), cover(string));
    for (int j = 0; j < 5; j++) {
      float fj = float(j);
      vec2 lq = rot((fj - 2.0) * 0.35) * (hq - vec2(0.0, -len)) - vec2(0.0, -0.05);
      float leaf = sdEll(lq, vec2(0.012, 0.05));
      vec3 lc = mix(vec3(0.25, 0.32, 0.14), vec3(0.45, 0.4, 0.2), hash21(vec2(fj, fk))) * (0.8 + 0.3 * vnoise(lq * 120.0));
      col = mix(col, lc, cover(leaf));
    }
    col = mix(col, vec3(0.55, 0.2, 0.15), cover(sdBox(hq - vec2(0.0, -len), vec2(0.012, 0.006))));
  }

  /* Table. */
  if (p.y < yT) {
    vec3 wood = vec3(0.3, 0.17, 0.09) * (0.7 + 0.45 * vnoise(vec2(p.x * 8.0, p.y * 90.0)) * 0.8 + 0.2 * vnoise(vec2(p.x * 30.0, p.y * 200.0)));
    wood *= 0.65 + 0.35 * smoothstep(yT - 0.25, yT, p.y);
    wood = mix(wood, vec3(0.05, 0.03, 0.02), smoothstep(0.003, 0.0, abs(fract((p.x + 0.13) * 3.2) - 0.5) - 0.497));
    col = wood;
  }
  col = mix(col, vec3(0.52, 0.32, 0.17), smoothstep(0.006, 0.0, abs(p.y - yT + 0.003)));
  shade = max(shade, smoothstep(0.04, 0.0, p.y - yT) * step(yT, p.y) * 0.45);

  /* Grimoire: runes glow in the brew's colour; a page turns now and then. */
  {
    vec2 bq = (p - Bk) / sc;
    bq.y *= 1.6;
    float pageL = sdRound(bq - vec2(-0.075, 0.0), vec2(0.072, 0.06), 0.006);
    float pageR = sdRound(bq - vec2(0.075, 0.0), vec2(0.072, 0.06), 0.006);
    float coverB = sdRound(bq, vec2(0.16, 0.07), 0.01);
    shade = max(shade, cover(sdRound(bq - vec2(0.01, -0.012), vec2(0.17, 0.075), 0.02)) * 0.55);
    col = mix(col, vec3(0.3, 0.08, 0.08), cover(coverB * sc));
    vec3 paper = vec3(0.85, 0.78, 0.62) * (0.85 + 0.15 * vnoise(bq * 80.0));
    paper *= 0.8 + 0.2 * smoothstep(0.0, 0.03, abs(bq.x));
    col = mix(col, paper, cover(min(pageL, pageR) * sc));
    float lines = step(0.5, fract(bq.y * 60.0)) * step(abs(fract(bq.y * 60.0) - 0.75), 0.12);
    float rn = step(0.55, vnoise(vec2(bq.x * 90.0, floor(bq.y * 60.0) * 3.0)));
    float text = lines * rn * cover(min(pageL, pageR) * sc + 0.012) * step(0.012, abs(bq.x));
    col = mix(col, vec3(0.3, 0.2, 0.12), text * 0.7);
    vec2 gq = bq - vec2(-0.075, 0.005);
    float rune = abs(length(gq) - 0.03) - 0.003;
    rune = min(rune, abs(sdBox(rot(t * 0.2) * gq, vec2(0.018))) - 0.002);
    float glow = 0.6 + 0.4 * sin(t * 1.7);
    emit += uBrew * cover(rune * sc) * glow * 0.9 + uBrew * exp(-length(gq) * 30.0) * 0.12 * glow;
    float tp = mod(t, 23.0);
    if (tp < 1.4) {
      float a = tp / 1.4 * PI;
      float w = cos(a) * 0.072;
      vec2 fq = bq - vec2(w, 0.0);
      float page = sdRound(fq * vec2(1.0, 1.0), vec2(abs(w), 0.06 + 0.012 * sin(a)), 0.006);
      vec3 pc = vec3(0.92, 0.86, 0.7) * (0.75 + 0.25 * abs(cos(a)));
      col = mix(col, pc, cover(page * sc));
    }
  }

  /* Candle. */
  {
    vec2 q = (p - Cn) / sc;
    shade = max(shade, cover(sdEll(q - vec2(0.02, -0.075), vec2(0.05, 0.01))) * 0.5);
    float base = sdRound(q - vec2(0.0, -0.068), vec2(0.04, 0.008), 0.004);
    col = mix(col, vec3(0.6, 0.45, 0.22), cover(base * sc));
    float stick = sdRound(q - vec2(0.0, -0.02), vec2(0.016, 0.045), 0.004);
    stick = smin(stick, length(q - vec2(-0.012, -0.0)) - 0.007, 0.01);
    col = mix(col, vec3(0.88, 0.82, 0.7) * (0.8 + 0.2 * smoothstep(0.016, -0.016, q.x)), cover(stick * sc));
    float f = flameSd(q - vec2(0.0, 0.028), 0.045, t);
    emit += mix(vec3(1.0, 0.55, 0.15), vec3(1.0, 0.95, 0.8), smoothstep(0.0, -0.01, f)) * cover(f * sc) * 1.4 * flick;
  }

  /* Alembic over a burner: boiling in the colour of the strongest brew. */
  vec2 neckTop = F + vec2(0.0, Fr + 0.09 * sc);
  vec2 bend = neckTop + vec2(0.04, 0.03) * sc;
  vec2 spout = R + vec2(0.0, 0.1 * sc);
  {
    shade = max(shade, cover(sdEll(p - vec2(F.x + 0.02, yT - 0.005), vec2(0.12, 0.012) * sc)) * 0.55);
    vec2 bq = (p - Bn) / sc;
    float stand = min(sdRound(bq - vec2(0.0, 0.008), vec2(0.05, 0.01), 0.004), sdBox(bq - vec2(0.0, 0.03), vec2(0.018, 0.02)));
    float legs = min(sdSeg(bq, vec2(-0.09, -0.005), vec2(-0.07, 0.085)), sdSeg(bq, vec2(0.09, -0.005), vec2(0.07, 0.085))) - 0.005;
    col = mix(col, vec3(0.6, 0.42, 0.2) * (0.7 + 0.4 * smoothstep(0.05, -0.05, bq.x)), cover(min(stand, legs) * sc));
    float f = flameSd(bq - vec2(0.0, 0.05), 0.05 * burner, t * 1.3);
    vec3 fc = mix(vec3(0.2, 0.4, 1.0), mix(vec3(1.0, 0.6, 0.2), uFlareCol, uFlare * 0.7), smoothstep(-0.01, 0.01, bq.y - 0.07));
    emit += fc * cover(f * sc) * 1.5;

    /* Salamander peeking out of the flame. */
    float sp = mod(t + 8.0, 37.0);
    if (sp < 6.0) {
      float up = smoothstep(0.0, 1.0, sp) * smoothstep(6.0, 5.0, sp);
      vec2 sq = bq - vec2(0.006 * sin(t * 2.0), 0.03 + up * 0.045);
      float head = sdEll(sq, vec2(0.022, 0.016));
      float neck = sdBox(sq - vec2(0.0, -0.025), vec2(0.012, 0.022));
      float sal = min(head, neck);
      vec3 skin = vec3(0.95, 0.35, 0.08) * (0.8 + 0.3 * vnoise(sq * 200.0));
      skin = mix(skin, vec3(0.15, 0.05, 0.02), step(0.75, vnoise(sq * 120.0 + 3.0)) * 0.7);
      col = mix(col, skin, cover(sal * sc) * step(0.06, up));
      float blink = step(0.1, mod(t, 2.7));
      for (int e = 0; e < 2; e++) {
        float s = e == 0 ? -1.0 : 1.0;
        float eye = length(sq - vec2(s * 0.011, 0.007)) - 0.0055;
        emit += vec3(1.0, 0.9, 0.2) * cover(eye * sc) * step(0.06, up) * blink;
        col = mix(col, vec3(0.0), cover((length(sq - vec2(s * 0.011, 0.007)) - 0.002) * sc) * step(0.06, up) * blink);
      }
      emit += vec3(1.0, 0.4, 0.1) * exp(-length(sq) * 40.0) * 0.4 * up;
    }

    vec2 fq = (p - F) / sc;
    float body = length(fq) - 0.1;
    float neck = sdBox(fq - vec2(0.0, 0.14), vec2(0.016, 0.05));
    float glass = smin(body, neck, 0.02);
    float tube = min(sdSeg(p, neckTop, bend), sdSeg(p, bend, spout)) - 0.007 * sc;
    vec2 rq = (p - R) / sc;
    float recv = smin(length(rq) - 0.05, sdBox(rq - vec2(0.0, 0.065), vec2(0.011, 0.03)), 0.015);
    float allGlass = min(min(glass * sc, tube), recv * sc);
    vec3 behind = col;
    col = mix(col, behind * 0.55 + vec3(0.1, 0.12, 0.14), cover(allGlass) * 0.7);
    float boil = sin(fq.x * 40.0 + t * 6.0) * 0.004 + sin(fq.x * 70.0 - t * 9.0) * 0.003;
    float liq = cover(body + 0.01) * step(fq.y, 0.015 + boil);
    vec3 lc = uBrew * (0.55 + 0.5 * smoothstep(0.1, -0.05, length(fq - vec2(-0.02, -0.03))));
    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      float h = hash21(vec2(fi, 4.2));
      vec2 b = vec2((h - 0.5) * 0.12, -0.08 + fract(t * (0.6 + h * 0.6) + h) * 0.095);
      lc += vec3(1.0) * 0.5 * smoothstep(0.003, 0.0, abs(length(fq - b) - 0.008 - h * 0.006));
    }
    col = mix(col, lc, liq);
    emit += uBrew * liq * (0.25 + 0.3 * uFlare);
    float rl = cover(length(rq) - 0.045) * step(rq.y, -0.005 + 0.002 * sin(t * 3.0));
    col = mix(col, uBrew * 0.7, rl);
    emit += uBrew * rl * 0.2;
    float hi = smoothstep(0.004, 0.0, abs(length(fq - vec2(0.0, 0.0)) - 0.088)) * smoothstep(0.0, 0.08, -fq.x + fq.y * 0.5);
    col += vec3(0.8, 0.9, 1.0) * hi * 0.4;
    col = mix(col, vec3(0.45, 0.3, 0.18), cover(sdBox(p - neckTop - vec2(0.0, 0.004 * sc), vec2(0.02, 0.008) * sc)));
    float dp = mod(t, 1.7) / 1.7;
    vec2 drop = spout - vec2(0.0, 0.006 + dp * dp * 0.055 * sc);
    float dd = sdEll(p - drop, vec2(0.004, 0.006) * sc);
    col = mix(col, uBrew, cover(dd) * step(dp, 0.85));
    emit += uBrew * cover(dd) * 0.5;
  }

  /* Lighting: the burner (tinted by the latest pour), the candle, and moonlight. */
  vec2 Lb = Bn + vec2(0.0, 0.07 * sc);
  vec2 db = p - Lb;
  vec2 dc = p - Cn - vec2(0.0, 0.03 * sc);
  vec3 bcol = mix(vec3(1.0, 0.6, 0.3), uFlareCol, uFlare * 0.6);
  bcol = mix(bcol, vec3(1.0, 0.4, 0.2), uTension * 0.4);
  vec3 light = vec3(0.1, 0.09, 0.1);
  light += bcol * burner * 0.85 / (1.0 + dot(db, db) * 9.0);
  light += vec3(1.0, 0.72, 0.4) * flick * 0.6 / (1.0 + dot(dc, dc) * 14.0);
  vec2 dw = p - W;
  light += vec3(0.3, 0.4, 0.75) * 0.35 / (1.0 + dot(dw, dw) * 10.0);
  light += vec3(1.0, 0.8, 0.45) * uWarm * 0.35;
  light *= 1.0 - shade * 0.8;
  vec3 c = col * light * 1.3;

  /* Vapour rolling up off the table, tinted by the brew; embers over the burner. */
  float v = fbm(vec2(p.x * 3.0 + t * 0.05, p.y * 4.0 - t * 0.25));
  float vap = smoothstep(0.45, 0.85, v) * smoothstep(yT + 0.45, yT - 0.05, p.y) * 0.18;
  c += mix(vec3(0.6, 0.55, 0.5), uBrew, 0.4) * vap * (0.4 + light * 0.6);
  vec2 sq = (p - neckTop) / sc;
  float steam = smoothstep(0.03 + sq.y * 0.3, 0.0, abs(sq.x - sin(sq.y * 12.0 - t * 2.0) * 0.02 * sq.y * 8.0));
  steam *= smoothstep(0.0, 0.03, sq.y) * smoothstep(0.35, 0.05, sq.y) * vnoise(vec2(sq.x * 30.0, sq.y * 14.0 - t * 2.0));
  c += mix(vec3(0.8), uBrew, 0.5) * steam * 0.35;
  for (int layer = 0; layer < 2; layer++) {
    float fl = float(layer);
    float cs = mix(0.05, 0.032, fl);
    vec2 q = p - Lb + vec2(sin(t * 0.4 + fl) * 0.02, -t * mix(0.05, 0.08, fl));
    vec2 cell = floor(q / cs);
    float hs = hash21(cell + fl * 17.0);
    if (hs > 0.86) {
      vec2 spk = (cell + vec2(hash21(cell + 2.0), hash21(cell + 5.0))) * cs;
      float d = length(q - spk);
      float near = exp(-length(p - Lb) * 3.5);
      c += mix(vec3(1.0, 0.6, 0.2), uFlareCol, 0.4) * smoothstep(0.003, 0.0, d) * near * 2.0;
    }
  }
  if (uWarm > 0.0) {
    vec2 sp = p * 22.0 + vec2(0.0, -t * 0.6);
    vec2 cell = floor(sp);
    float h = hash21(cell + 9.0);
    float tw = max(0.0, sin(t * 3.0 + h * 40.0));
    c += vec3(1.0, 0.85, 0.5) * smoothstep(0.12, 0.0, length(fract(sp) - 0.5)) * step(0.93, h) * tw * uWarm;
  }

  c += emit;
  c *= 1.0 - uDim * 0.35;
  c = 1.0 - exp(-c * 1.4);
  vec2 vg = frag / uRes - 0.5;
  c *= 1.0 - 0.85 * dot(vg, vg);
  c += (hash21(frag + fract(t) * 71.0) - 0.5) * 0.012;
  outColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

	function rgb(hex: string): [number, number, number] {
		const v = parseInt(hex.slice(1), 16);
		return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
	}

	function colourOf(tier: number) {
		return rgb(REAGENTS[Math.max(1, Math.min(REAGENTS.length - 1, tier))].color);
	}

	function labScene(canvas: HTMLCanvasElement) {
		const pass = createFullscreenPass(canvas, FRAG, 'apothecary lab');
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
		let dim = 0;
		let heat = 0;
		const tint = colourOf(untrack(() => brew));
		const flareCol = colourOf(untrack(() => brew));

		const draw = (ms: number) => {
			if (!cssW || !cssH) return;
			const dt = Math.min(1 / 20, Math.max(0, (ms - last) / 1000));
			last = ms;
			const ease = (rate: number) => (calm ? 1 : 1 - Math.exp(-dt * rate));
			warm += ((mood === 'stone' ? 1 : 0) - warm) * ease(1.2);
			dim += ((mood === 'over' ? 1 : 0) - dim) * ease(1.5);
			heat += (tension - heat) * ease(1.5);
			flared *= Math.exp(-dt * 1.8);
			const goal = colourOf(brew);
			for (let k = 0; k < 3; k += 1) tint[k] += (goal[k] - tint[k]) * ease(1.2);

			gl.useProgram(pass.program);
			gl.uniform2f(pass.uniform('uRes'), canvas.width, canvas.height);
			gl.uniform1f(pass.uniform('uTime'), calm ? 4 : (ms - t0) / 1000);
			gl.uniform3f(pass.uniform('uBrew'), tint[0], tint[1], tint[2]);
			gl.uniform1f(pass.uniform('uFlare'), calm ? 0 : flared);
			gl.uniform3f(pass.uniform('uFlareCol'), flareCol[0], flareCol[1], flareCol[2]);
			gl.uniform1f(pass.uniform('uTension'), heat);
			gl.uniform1f(pass.uniform('uWarm'), warm);
			gl.uniform1f(pass.uniform('uDim'), dim);
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

		let seen = untrack(() => flare.id);
		$effect(() => {
			const next = flare;
			untrack(() => {
				if (next.id > seen) {
					flared = Math.min(1, flared + 0.25 + Math.max(0, next.tier - 4) * 0.08);
					const c = colourOf(next.tier);
					for (let k = 0; k < 3; k += 1) flareCol[k] = c[k];
				}
				seen = next.id;
			});
		});

		$effect(() => {
			void mood;
			void brew;
			void tension;
			void flare;
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

<div class="lab" aria-hidden="true">
	{#if failed}
		<div class="fallback"></div>
	{:else}
		<canvas {@attach labScene}></canvas>
	{/if}
</div>

<style>
	.lab {
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
			radial-gradient(40% 40% at 16% 80%, rgba(255, 150, 70, 0.35), transparent 70%),
			radial-gradient(30% 30% at 85% 20%, rgba(90, 120, 220, 0.25), transparent 70%),
			linear-gradient(180deg, #1c1714 0 70%, #2a160b 70%);
	}
</style>
