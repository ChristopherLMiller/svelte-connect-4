<script lang="ts">
	import { untrack } from 'svelte';
	import { createFullscreenPass } from '$lib/gl/fullscreen';
	import { createPacer } from '$lib/gl/pace';

	let {
		cheer = 0,
		hush = 0,
		stir = 0,
		dim = false
	}: {
		/** Bumps on big moments: the fire flares and the dog lifts his head. */
		cheer?: number;
		/** Bumps when someone goes alone: the room holds its breath. */
		hush?: number;
		/** Bumps whenever points go on the board: a crackle in the grate. */
		stir?: number;
		/** Menu or result: the room settles a little darker. */
		dim?: boolean;
	} = $props();

	let failed = $state(false);

	const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uFire;
uniform float uHush;
uniform float uDog;
uniform float uDim;
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

float sdBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

vec3 oak(vec2 p, float tone) {
  float g = fbm3(vec2(p.x * 3.0, p.y * 60.0)) * 0.6 + vnoise(vec2(p.x * 1.5, p.y * 140.0)) * 0.4;
  return mix(vec3(0.16, 0.09, 0.045), vec3(0.3, 0.18, 0.09), g) * tone;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  float A = uRes.x / uRes.y;
  vec2 p = (frag - 0.5 * uRes) / uRes.y;
  float t = uTime;
  float W = 0.5 * A;
  float hush = uHush;

  float FX = min(-W + 0.32, -W * 0.56);
  float WX = max(W - 0.28, W * 0.56);
  vec2 FIRE = vec2(FX, -0.33);

  float flick = 0.86 + 0.08 * sin(t * 7.3) + 0.05 * sin(t * 13.1 + 1.0) + 0.08 * (vnoise(vec2(t * 5.0, 0.0)) - 0.5);
  float fireAmt = (0.85 + 0.75 * uFire) * flick * (1.0 - 0.6 * hush);
  vec2 fq = (p - FIRE) * vec2(0.75, 1.0);
  float fd = length(fq);
  vec3 fireLight = vec3(1.0, 0.52, 0.2) * fireAmt * (0.7 * exp(-fd * 2.3) + 0.08);

  vec2 LAMP = vec2(0.0, 0.27);
  float lampOn = (1.0 - 0.5 * hush) * (1.0 + 0.35 * uFire);
  vec3 lampLight = vec3(1.0, 0.76, 0.42) * (0.42 * exp(-length(p - LAMP) * 2.2) + 0.07) * lampOn;
  vec3 light = fireLight + lampLight + vec3(0.025, 0.03, 0.05);

  /* Lime-washed wall, oak panelling below the dado */
  float pn = fbm3(p * vec2(5.0, 7.0));
  vec3 alb = vec3(0.6, 0.5, 0.37) * (0.72 + 0.28 * pn);
  alb *= 1.0 - 0.25 * smoothstep(0.0, 0.3, p.y);
  if (p.y < -0.06) {
    float stile = abs(fract(p.x * 5.5) - 0.5);
    alb = oak(p, 0.9);
    alb *= 0.8 + 0.25 * smoothstep(0.42, 0.47, stile);
    alb = mix(alb, oak(p + 3.0, 1.25), smoothstep(0.012, 0.0, abs(p.y + 0.075)));
  }
  vec3 col = alb * light;

  /* Flagstone floor */
  if (p.y < -0.42) {
    float depth = -0.42 - p.y;
    vec2 fp = vec2(p.x / (0.4 + depth * 3.0), depth * 6.0);
    vec2 cell = floor(fp * vec2(3.0, 1.0) + vec2(floor(fp.y) * 0.5, 0.0));
    vec2 f = fract(fp * vec2(3.0, 1.0) + vec2(floor(fp.y) * 0.5, 0.0));
    float grout = smoothstep(0.03, 0.06, min(min(f.x, 1.0 - f.x) * 0.5, min(f.y, 1.0 - f.y)));
    vec3 stone = vec3(0.24, 0.21, 0.18) * (0.75 + 0.35 * hash21(cell)) * (0.85 + 0.2 * fbm3(p * 30.0));
    col = stone * mix(0.35, 1.0, grout) * light * 1.1;
    col += vec3(1.0, 0.5, 0.2) * fireAmt * exp(-length((p - FIRE) * vec2(0.5, 2.0)) * 4.0) * 0.12 * grout;
  }

  /* Ceiling: joists above a great beam, tankards on hooks */
  if (p.y > 0.34) {
    float joist = smoothstep(0.32, 0.36, abs(fract(p.x * 3.2 + 0.25) - 0.5));
    vec3 ceil = mix(vec3(0.42, 0.34, 0.25) * 0.6, oak(p * vec2(0.3, 1.0), 0.8), joist);
    col = ceil * (light * 0.9);
  }
  if (p.y > 0.33 && p.y < 0.41) {
    float edge = smoothstep(0.33, 0.345, p.y) * smoothstep(0.41, 0.395, p.y);
    col = oak(vec2(p.x, p.y * 0.2 + 4.0), 0.9 + 0.3 * edge) * light * 1.15;
    col *= 0.7 + 0.3 * smoothstep(0.33, 0.37, p.y);
  }
  for (int k = -4; k <= 4; k++) {
    float hx = float(k) * 0.13 + 0.065 * sign(float(k) + 0.5);
    if (abs(hx) > W - 0.05) continue;
    float sway = sin(t * 0.7 + float(k) * 1.3) * 0.003;
    vec2 q = p - vec2(hx + sway, 0.283);
    float hook = step(abs(q.x - sway * 0.5), 0.0016) * step(0.03, q.y) * step(q.y, 0.05);
    float body = step(sdBox(q, vec2(0.016 + q.y * 0.08, 0.026)), 0.0);
    float handle = smoothstep(0.004, 0.0, abs(length((q - vec2(0.021, 0.0)) * vec2(1.0, 0.75)) - 0.012)) * step(0.0, q.x - 0.016);
    vec3 pewter = vec3(0.5, 0.5, 0.52) * (0.45 + 0.75 * smoothstep(0.02, -0.012, q.x));
    col = mix(col, vec3(0.08), hook);
    col = mix(col, pewter * light * 1.6, max(body, handle * 0.9));
    col += vec3(1.0, 0.85, 0.6) * body * smoothstep(0.004, 0.0, abs(q.x + 0.008)) * 0.18 * lampOn;
  }

  /* Hanging oil lamp */
  {
    vec2 q = p - LAMP;
    float chain = step(abs(q.x), 0.0015) * step(0.04, q.y);
    float glass = step(length(q * vec2(1.0, 0.8)), 0.024);
    float cap = step(sdBox(q - vec2(0.0, 0.032), vec2(0.018 - (q.y - 0.032) * 0.6, 0.008)), 0.0);
    col = mix(col, vec3(0.1, 0.07, 0.03), chain);
    col = mix(col, vec3(0.75, 0.52, 0.2) * lampOn, cap);
    col = mix(col, vec3(1.0, 0.86, 0.55) * (0.85 + 0.15 * flick) * lampOn, glass);
    col += vec3(1.0, 0.75, 0.4) * exp(-length(q) * 20.0) * 0.35 * lampOn;
  }

  /* The inglenook */
  {
    vec2 q = p - vec2(FX, -0.14);
    float outer = sdBox(q, vec2(0.25, 0.28));
    if (outer < 0.0) {
      vec2 bp = (p - vec2(FX, 0.0)) * vec2(14.0, 26.0);
      bp.x += step(1.0, mod(floor(bp.y), 2.0)) * 0.5;
      vec2 bf = fract(bp);
      float mortar = smoothstep(0.04, 0.1, min(min(bf.x, 1.0 - bf.x), min(bf.y, 1.0 - bf.y) * 1.6));
      vec3 brick = vec3(0.45, 0.36, 0.28) * (0.7 + 0.45 * hash21(floor(bp))) * (0.85 + 0.25 * fbm3(p * 40.0));
      col = mix(vec3(0.2, 0.18, 0.15), brick, mortar) * light * 1.05;
      col *= 1.0 - 0.35 * smoothstep(-0.02, 0.0, outer);
    }
    vec2 o = p - vec2(FX, -0.27);
    float arch = o.y < 0.1 ? sdBox(o, vec2(0.17, 0.15)) : length((o - vec2(0.0, 0.1)) * vec2(1.0, 2.6)) - 0.17;
    if (arch < 0.0) {
      float soot = smoothstep(-0.12, 0.0, o.y);
      col = vec3(0.05, 0.035, 0.03) * (1.0 - 0.5 * soot) + fireLight * 0.12 * (1.0 - soot);
      vec2 g = p - FIRE;
      float logs = step(sdBox(g - vec2(0.0, -0.06), vec2(0.09, 0.011)), 0.0) + step(sdBox((g - vec2(0.02, -0.044)) * mat2(0.96, 0.28, -0.28, 0.96), vec2(0.07, 0.01)), 0.0);
      float h = (0.2 + 0.08 * uFire) * (1.0 - 0.45 * hush);
      float lean = g.x - 0.015 * sin(g.y * 18.0 - t * 3.0);
      float shape = smoothstep(0.13, 0.0, abs(lean) + max(0.0, g.y + 0.04) * 0.45) * smoothstep(h, 0.0, g.y + 0.05) * step(-0.07, g.y);
      float dens = fbm3(vec2(lean * 10.0, g.y * 6.0 - t * 2.8)) + 0.4 * vnoise(vec2(lean * 28.0, g.y * 16.0 - t * 5.5));
      float f = clamp(shape * (dens * 1.9 - 0.3), 0.0, 1.0) * fireAmt;
      col += vec3(1.0, 0.36, 0.06) * f * 3.0 + vec3(1.0, 0.85, 0.5) * pow(f, 1.6) * 2.4;
      col += vec3(1.0, 0.45, 0.12) * exp(-length((g + vec2(0.0, 0.04)) * vec2(1.0, 2.2)) * 9.0) * 0.5 * fireAmt;
      col = mix(col, vec3(0.08, 0.04, 0.02) + vec3(1.0, 0.3, 0.05) * 0.5 * fireAmt * smoothstep(0.55, 0.9, vnoise(g * 90.0 + t * 0.7)), clamp(logs, 0.0, 1.0));
      vec2 sp = vec2(g.x * 70.0, (g.y - t * 0.09) * 50.0);
      vec2 sc = floor(sp);
      float sh = hash21(sc);
      vec2 sf = fract(sp) - vec2(0.5 + 0.3 * sin(sh * 40.0 + t), 0.5);
      float spark = step(0.94, sh) * smoothstep(0.2, 0.05, length(sf)) * step(-0.04, g.y) * smoothstep(0.32, 0.05, g.y) * smoothstep(0.1, 0.03, abs(g.x));
      col += vec3(1.0, 0.65, 0.25) * spark * fireAmt * 1.2;
    }
    vec2 m = p - vec2(FX, 0.155);
    if (sdBox(m, vec2(0.29, 0.016)) < 0.0) col = oak(m * vec2(1.0, 3.0), 1.15) * light * 1.2;
    for (int k = 0; k < 2; k++) {
      vec2 tq = m - vec2(float(k) * 0.4 - 0.2, 0.036);
      float tk = step(sdBox(tq, vec2(0.014, 0.02)), 0.0);
      col = mix(col, vec3(0.55, 0.55, 0.57) * light * 1.5 * (0.6 + 0.6 * smoothstep(0.012, -0.01, tq.x)), tk);
    }
    vec2 d = p - vec2(FX, 0.255);
    float r = length(d);
    if (r < 0.062) {
      float ang = atan(d.y, d.x);
      float seg = step(0.5, fract(ang / 6.2831853 * 20.0 + 0.025));
      vec3 board = mix(vec3(0.08, 0.07, 0.06), vec3(0.75, 0.68, 0.52), seg);
      float ring = step(0.5, fract(ang / 6.2831853 * 20.0 + 0.025));
      vec3 ringC = mix(vec3(0.12, 0.35, 0.16), vec3(0.6, 0.1, 0.08), ring);
      board = mix(board, ringC, step(abs(r - 0.044), 0.003) + step(abs(r - 0.027), 0.003));
      board = mix(board, vec3(0.6, 0.1, 0.08), step(r, 0.004));
      board = mix(board, vec3(0.12, 0.35, 0.16), step(r, 0.008) * step(0.004, r));
      board = mix(board, vec3(0.06, 0.05, 0.04), step(0.048, r));
      col = board * light * 1.4;
      col *= 1.0 - 0.3 * smoothstep(0.055, 0.062, r);
    }
    for (int k = 0; k < 3; k++) {
      vec2 dq = d - vec2(-0.012 + float(k) * 0.014, 0.012 - float(k) * 0.018);
      float shaft = step(abs(dq.y + dq.x * 0.25), 0.0012) * step(0.0, dq.x) * step(dq.x, 0.022);
      float flight = step(abs(dq.y + dq.x * 0.25), 0.004) * step(0.016, dq.x) * step(dq.x, 0.026);
      col = mix(col, vec3(0.75, 0.6, 0.3) * light * 1.6, shaft);
      col = mix(col, vec3(0.7, 0.12, 0.1) * light * 1.6, flight);
    }
  }

  /* The dog by the fire */
  {
    vec2 q = p - vec2(FX + 0.05, -0.445);
    float breathe = 1.0 + 0.05 * sin(t * 1.4);
    float body = length(q * vec2(1.0, 2.4 / breathe)) - 0.085;
    float lift = uDog;
    vec2 hp = q - vec2(0.09, 0.012 + 0.032 * lift);
    float head = length(hp * vec2(1.0, 1.25)) - 0.032;
    float snout = length((hp - vec2(0.03, -0.006 - 0.004 * (1.0 - lift))) * vec2(1.0, 1.8)) - 0.02;
    float ear = length((hp - vec2(-0.012, 0.014 + 0.01 * lift)) * vec2(1.6, 1.0)) - 0.014;
    float tail = length((q - vec2(-0.09, -0.012 + 0.006 * sin(t * 2.0) * lift)) * vec2(1.0, 3.0)) - 0.035;
    float dog = min(min(body, head), min(min(snout, ear), tail));
    col *= 1.0 - 0.45 * smoothstep(0.14, 0.0, length((q + vec2(0.0, 0.03)) * vec2(1.0, 5.0)));
    if (dog < 0.0) {
      float fur = fbm3(q * 60.0);
      vec3 coat = mix(vec3(0.32, 0.18, 0.08), vec3(0.5, 0.32, 0.16), fur);
      coat = mix(coat, vec3(0.16, 0.08, 0.04), step(ear, 0.0));
      float rim = smoothstep(-0.02, 0.0, dog) * step(q.x, 0.02);
      col = coat * light * 1.3 + vec3(1.0, 0.55, 0.2) * rim * fireAmt * 0.25;
      vec2 eye = hp - vec2(0.012, 0.006);
      col = mix(col, vec3(0.02), step(length(eye * vec2(1.0, mix(4.0, 1.2, lift))), 0.004));
      col = mix(col, vec3(0.05, 0.03, 0.02), step(length(hp - vec2(0.05, -0.004)), 0.006));
    }
  }

  /* Leaded diamond window, rain outside */
  {
    vec2 q = p - vec2(WX, 0.12);
    float reveal = sdBox(q, vec2(0.16, 0.21));
    if (reveal < 0.0) col = vec3(0.4, 0.34, 0.27) * light * 0.9 * (0.75 + 0.25 * fbm3(p * 25.0));
    float pane = sdBox(q, vec2(0.135, 0.185));
    if (pane < 0.0) {
      float sy = q.y / 0.37 + 0.5;
      vec3 night = mix(vec3(0.03, 0.05, 0.09), vec3(0.06, 0.09, 0.15), sy);
      vec2 sl = q - vec2(0.07, -0.05);
      night += vec3(1.0, 0.75, 0.4) * (exp(-length(sl) * 30.0) * 0.5 + exp(-length(sl) * 8.0) * 0.08);
      night += vec3(0.06, 0.08, 0.1) * smoothstep(-0.1, -0.18, q.y) * (0.5 + 0.5 * fbm3(vec2(q.x * 10.0, 3.0)));
      for (int k = 0; k < 2; k++) {
        float fk = float(k);
        float sc = 40.0 + fk * 30.0;
        vec2 rp = vec2(q.x * sc + q.y * sc * 0.2, q.y * sc * 0.06 + t * (4.0 + fk * 2.0));
        float rh = hash21(floor(rp) + fk * 11.0);
        float streak = step(0.86, rh) * smoothstep(0.1, 0.0, abs(fract(rp.x) - 0.5)) * smoothstep(0.0, 0.4, fract(rp.y)) * smoothstep(1.0, 0.6, fract(rp.y));
        night += vec3(0.45, 0.5, 0.6) * streak * 0.18;
      }
      vec2 dp = q * vec2(30.0, 14.0);
      vec2 cellD = floor(dp);
      float dh = hash21(cellD);
      float fall = fract(t * (0.05 + dh * 0.12) + dh);
      vec2 dc = fract(dp) - vec2(0.5, 1.0 - fall);
      float drop = step(0.6, dh) * smoothstep(0.22, 0.12, length(dc * vec2(1.0, 1.6)));
      night += vec3(0.35, 0.42, 0.5) * drop * 0.4;
      vec3 glass = night * vec3(0.9, 1.0, 0.95) + lampLight * 0.06 + fireLight * 0.03;
      float d1 = abs(fract((q.x * 1.6 + q.y) * 9.0) - 0.5);
      float d2 = abs(fract((q.x * 1.6 - q.y) * 9.0) - 0.5);
      float lead = smoothstep(0.06, 0.035, min(d1, d2));
      glass = mix(glass, vec3(0.06, 0.06, 0.07) + lampLight * 0.15, lead);
      float mull = step(abs(q.x), 0.008) + step(abs(q.y - 0.02), 0.007);
      glass = mix(glass, oak(q * 4.0, 0.7) * light * 1.2, clamp(mull, 0.0, 1.0));
      col = glass;
      col *= 1.0 - 0.45 * smoothstep(-0.02, 0.0, pane);
    }
    vec2 s = p - vec2(WX, -0.105);
    if (sdBox(s, vec2(0.185, 0.012)) < 0.0) col = oak(s * 3.0, 1.1) * light * 1.2;
    for (int k = 0; k < 3; k++) {
      vec2 cq = s - vec2(-0.12 + float(k) * 0.03, 0.035);
      float bottle = step(sdBox(cq, vec2(0.008, 0.022)), 0.0) + step(sdBox(cq - vec2(0.0, 0.028), vec2(0.003, 0.01)), 0.0);
      vec3 bc = k == 0 ? vec3(0.1, 0.3, 0.12) : k == 1 ? vec3(0.4, 0.22, 0.05) : vec3(0.15, 0.2, 0.28);
      col = mix(col, bc * light * 2.0 + vec3(1.0, 0.8, 0.5) * 0.08 * step(abs(cq.x + 0.004), 0.0015), clamp(bottle, 0.0, 1.0));
    }
    vec2 cs = s - vec2(0.11, 0.06);
    float flame = smoothstep(0.012, 0.0, length((cs - vec2(0.0, 0.012)) * vec2(1.6, 0.8)));
    float candle = step(sdBox(cs + vec2(0.0, 0.03), vec2(0.006, 0.035)), 0.0);
    col = mix(col, vec3(0.85, 0.8, 0.68) * light * 1.4, candle);
    col += vec3(1.0, 0.75, 0.35) * (flame * (0.8 + 0.2 * sin(t * 9.0)) + exp(-length(cs) * 40.0) * 0.25) * (1.0 - 0.6 * hush);
  }

  /* The bar: brass taps on a polished counter */
  {
    vec2 b = p - vec2(WX, -0.3);
    if (b.y < 0.07 && abs(b.x) < 0.3) {
      if (b.y > 0.045) col = oak(b * vec2(1.0, 6.0) + 7.0, 1.4) * light * 1.3 + lampLight * 0.12 * smoothstep(0.05, 0.068, b.y);
      else {
        float panel = smoothstep(0.38, 0.42, abs(fract(b.x * 6.0) - 0.5));
        col = oak(b + 2.0, 0.8 + 0.25 * panel) * light * 1.05;
      }
    }
    for (int k = 0; k < 3; k++) {
      vec2 tq = b - vec2(-0.07 + float(k) * 0.07, 0.07);
      float stem = step(sdBox(tq - vec2(0.0, 0.025), vec2(0.006, 0.025)), 0.0);
      float handle = step(sdBox(tq - vec2(0.0, 0.07), vec2(0.009, 0.022)), 0.0);
      vec3 brass = vec3(0.85, 0.6, 0.25) * (0.5 + 0.9 * smoothstep(0.006, -0.004, tq.x));
      col = mix(col, brass * light * 1.8, stem);
      col = mix(col, (k == 1 ? vec3(0.12, 0.25, 0.14) : vec3(0.3, 0.12, 0.08)) * light * 2.2, handle);
      col += vec3(1.0, 0.8, 0.45) * stem * smoothstep(0.002, 0.0, abs(tq.x + 0.002)) * 0.25;
    }
    vec2 pq = b - vec2(0.16, 0.09);
    float pint = step(sdBox(pq, vec2(0.016 - pq.y * 0.1, 0.028)), 0.0);
    vec3 ale = mix(vec3(0.5, 0.25, 0.05), vec3(0.95, 0.9, 0.8), step(0.02, pq.y));
    col = mix(col, ale * light * 2.2, pint * 0.92);
  }

  /* Pipe smoke drifting from the corner */
  {
    vec2 s = p - vec2(WX + 0.2, -0.2);
    float rise = clamp(s.y / 0.65, 0.0, 1.0);
    float sx = s.x + 0.05 * sin(s.y * 6.0 - t * 0.6) + 0.12 * rise * rise;
    float plume = smoothstep(0.03 + rise * 0.12, 0.0, abs(sx)) * step(0.0, s.y) * (1.0 - rise);
    float wisp = fbm3(vec2(sx * 14.0, s.y * 6.0 - t * 0.35));
    col += vec3(0.55, 0.5, 0.45) * plume * smoothstep(0.35, 0.8, wisp) * 0.16 * (light.r * 1.2 + 0.2);
    float haze = fbm3(vec2(p.x * 1.4 + t * 0.02, p.y * 2.0 - t * 0.015));
    col += vec3(0.35, 0.28, 0.2) * smoothstep(0.4, 0.75, haze) * smoothstep(0.0, 0.42, p.y) * 0.05 * (1.0 - hush);
  }

  float dim = clamp(hush * 0.45 + uDim * 0.25, 0.0, 0.7);
  col *= 1.0 - dim;
  vec2 vg = frag / uRes - 0.5;
  col *= 1.0 - (0.75 + 0.4 * hush) * dot(vg, vg);
  col = 1.0 - exp(-col * 1.5);
  col = pow(col, vec3(0.95));
  col += (hash21(frag + fract(t) * 91.0) - 0.5) * 0.008;
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

	function snug(canvas: HTMLCanvasElement) {
		const pass = createFullscreenPass(canvas, FRAG, 'pub snug');
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
		let fire = 0;
		let fireKick = 0;
		let hushLevel = 0;
		let hushUntil = -1;
		let dog = 0;
		let dogUntil = -1;
		let dimLevel = untrack(() => (dim ? 1 : 0));

		const draw = (ms: number) => {
			if (!cssW || !cssH) return;
			const dt = Math.min(1 / 20, Math.max(0, (ms - last) / 1000));
			last = ms;
			const time = (ms - t0) / 1000;
			const ease = (rate: number) => (calm ? 1 : 1 - Math.exp(-dt * rate));
			fireKick *= calm ? 0 : Math.exp(-dt * 0.9);
			fire += (fireKick - fire) * ease(3);
			hushLevel += ((time < hushUntil ? 1 : 0) - hushLevel) * ease(1.6);
			dog += ((time < dogUntil ? 1 : 0) - dog) * ease(time < dogUntil ? 3 : 0.8);
			dimLevel += ((dim ? 1 : 0) - dimLevel) * ease(1.2);

			gl.useProgram(pass.program);
			gl.uniform2f(pass.uniform('uRes'), canvas.width, canvas.height);
			gl.uniform1f(pass.uniform('uTime'), calm ? 4 : time);
			gl.uniform1f(pass.uniform('uFire'), Math.min(1.2, fire));
			gl.uniform1f(pass.uniform('uHush'), hushLevel);
			gl.uniform1f(pass.uniform('uDog'), dog);
			gl.uniform1f(pass.uniform('uDim'), dimLevel);
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

		const now = () => (performance.now() - t0) / 1000;

		let seenCheer = untrack(() => cheer);
		$effect(() => {
			const next = cheer;
			untrack(() => {
				if (next > seenCheer) {
					fireKick = 1.2;
					dogUntil = now() + 3.5;
					hushUntil = -1;
					kick();
				}
				seenCheer = next;
			});
		});

		let seenHush = untrack(() => hush);
		$effect(() => {
			const next = hush;
			untrack(() => {
				if (next > seenHush) {
					hushUntil = now() + 4;
					dogUntil = now() + 2;
					kick();
				}
				seenHush = next;
			});
		});

		let seenStir = untrack(() => stir);
		$effect(() => {
			const next = stir;
			untrack(() => {
				if (next > seenStir) {
					fireKick = Math.max(fireKick, 0.45);
					kick();
				}
				seenStir = next;
			});
		});

		$effect(() => {
			void dim;
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

<div class="snug" aria-hidden="true">
	{#if failed}
		<div class="fallback"></div>
	{:else}
		<canvas {@attach snug}></canvas>
	{/if}
</div>

<style>
	.snug {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
		z-index: 0;
		contain: layout paint;
		background: #1a0f08;
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
			radial-gradient(22% 30% at 16% 72%, rgba(255, 140, 50, 0.45), transparent 70%),
			radial-gradient(30% 24% at 50% 22%, rgba(255, 200, 120, 0.22), transparent 70%),
			linear-gradient(180deg, #24150b 0%, #3b2716 14%, #4a3420 16%, #3a2818 56%, #22140a 58%, #160d06 100%);
	}
</style>
