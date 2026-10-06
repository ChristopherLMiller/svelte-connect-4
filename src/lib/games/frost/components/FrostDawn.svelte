<script lang="ts">
	import { untrack } from 'svelte';
	import { createFullscreenPass } from '$lib/gl/fullscreen';
	import { createPacer } from '$lib/gl/pace';

	type Mood = 'menu' | 'play' | 'lost' | 'won';

	let {
		mood = 'menu',
		dawn = 0,
		melt = 0,
		crack = 0
	}: {
		mood?: Mood;
		/** 0 before sunrise, 1 with the sun clear of the pines; follows how much ice is open. */
		dawn?: number;
		/** Bumps on every opening; the light warms for a moment. */
		melt?: number;
		/** Bumps when the ice gives way; cracks race across the lake. */
		crack?: number;
	} = $props();

	let failed = $state(false);

	const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uDpr;
uniform float uTime;
uniform float uDawn;
uniform float uMelt;
uniform float uCrack;
uniform float uCrackAge;
uniform float uDim;
uniform float uWarm;
out vec4 outColor;

const float HZ = 0.42;

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

vec3 skyAt(float y, float sx, float D, vec2 sun) {
  float k = clamp((y - HZ) / (1.0 - HZ), 0.0, 1.0);
  vec3 zenith = mix(vec3(0.09, 0.1, 0.26), vec3(0.34, 0.48, 0.74), D);
  vec3 mid = mix(vec3(0.62, 0.38, 0.55), vec3(0.93, 0.66, 0.66), D);
  vec3 low = mix(vec3(0.98, 0.62, 0.48), vec3(1.0, 0.86, 0.7), D);
  vec3 c = mix(low, mid, smoothstep(0.0, 0.3, k));
  c = mix(c, zenith, smoothstep(0.22, 1.0, k));
  float d = length(vec2(sx, y) - sun);
  c += vec3(1.0, 0.72, 0.45) * exp(-d * 4.0) * (0.35 + 0.35 * D);
  c += vec3(1.0, 0.85, 0.6) * exp(-d * 18.0) * 0.5;
  return c;
}

vec3 shack(float fi, float aspect) {
  return vec3(mix(0.3, -0.4, fi) * min(aspect, 1.6), HZ - mix(0.036, 0.054, fi), mix(0.03, 0.042, fi));
}

float seg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));
}

// A figure one unit tall, feet at y = 0, facing +x; returns body distance, scarf distance in .y.
// stoop 1 is a skater's forward lean, lower stands upright; stride scales the leg swing.
vec2 skater(vec2 q, float ph, float stoop, float stride) {
  float st = sin(ph);
  vec2 hip = vec2(0.0, 0.47);
  vec2 sh = vec2(0.13 * stoop, 0.78 + 0.03 * (1.0 - stoop));
  float d = seg(q, hip, sh) - 0.075;
  d = min(d, length(q - sh - vec2(0.06 * stoop, 0.12)) - 0.075);
  for (int k = 0; k < 2; k++) {
    float sg = (k == 0 ? st : -st) * stride;
    float lift = max(0.0, -sg) * 0.07;
    vec2 foot = vec2(0.02 + 0.26 * sg, lift);
    vec2 knee = vec2(0.1 + 0.08 * sg, 0.25 + lift * 0.5);
    d = min(d, min(seg(q, hip, knee), seg(q, knee, foot)) - 0.042);
    d = min(d, seg(q, foot + vec2(-0.07, -0.015), foot + vec2(0.08, -0.015)) - 0.012);
    vec2 hand = sh + vec2(-0.24 * sg, -0.24 + 0.04 * abs(sg));
    d = min(d, seg(q, sh, hand) - 0.03);
  }
  float flut = sin(ph * 2.0 + q.x * 9.0) * 0.025;
  float scarf = seg(q, sh + vec2(0.02, 0.04), sh + vec2(-0.24, 0.02 + flut)) - 0.028;
  return vec2(d, scarf);
}

// A dog one unit tall at the back, paws at y = 0, facing +x, bounding along.
float dog(vec2 q, float ph) {
  float g = sin(ph);
  float g2 = sin(ph + 0.7);
  float d = seg(q, vec2(-0.42, 0.6 + 0.05 * g), vec2(0.38, 0.64 - 0.05 * g)) - 0.15;
  d = min(d, length(q - vec2(0.6, 0.9 - 0.05 * g)) - 0.15);
  d = min(d, seg(q, vec2(0.62, 0.88 - 0.05 * g), vec2(0.86, 0.8 - 0.05 * g)) - 0.07);
  d = min(d, seg(q, vec2(0.52, 1.0), vec2(0.46, 1.14)) - 0.045);
  d = min(d, seg(q, vec2(0.34, 0.6), vec2(0.34 + 0.3 * g, 0.02)) - 0.055);
  d = min(d, seg(q, vec2(0.34, 0.6), vec2(0.34 + 0.3 * g2, 0.02)) - 0.055);
  d = min(d, seg(q, vec2(-0.38, 0.6), vec2(-0.38 - 0.3 * g, 0.02)) - 0.055);
  d = min(d, seg(q, vec2(-0.38, 0.6), vec2(-0.38 - 0.3 * g2, 0.02)) - 0.055);
  d = min(d, seg(q, vec2(-0.52, 0.68), vec2(-0.82, 0.95 + 0.1 * sin(ph * 2.0))) - 0.04);
  return d;
}

// Someone fishing from an upturned bucket at the origin, one unit tall seated, hole off to the right.
// Returns body + rod, bucket + hat, line, hole.
vec4 angler(vec2 q, float t) {
  float twitch = pow(max(0.0, sin(t * 0.7)), 24.0) * 0.12 + 0.015 * sin(t * 1.9);
  vec2 tip = vec2(0.85, 0.72 - twitch);
  float bucket = max(abs(q.x) - 0.15 + q.y * 0.05, abs(q.y - 0.16) - 0.16);
  float d = seg(q, vec2(0.0, 0.36), vec2(0.07, 0.72)) - 0.1;
  d = min(d, length(q - vec2(0.11, 0.86)) - 0.085);
  d = min(d, seg(q, vec2(0.02, 0.36), vec2(0.3, 0.33)) - 0.05);
  d = min(d, seg(q, vec2(0.3, 0.33), vec2(0.33, 0.0)) - 0.045);
  d = min(d, seg(q, vec2(0.08, 0.64), vec2(0.32, 0.5)) - 0.04);
  float rod = seg(q, vec2(0.3, 0.5), tip) - 0.012;
  float line = seg(q, tip, vec2(0.82, 0.0)) - 0.005;
  vec2 hq = (q - vec2(0.8, -0.02)) / vec2(0.2, 0.055);
  float hole = length(hq) - 1.0;
  float hat = length(q - vec2(0.12, 0.97)) - 0.04;
  return vec4(min(d, rod), min(bucket, hat), line, hole);
}

float pines(float x, float base) {
  float cw = 0.016;
  float ci = floor(x / cw);
  float top = base;
  for (int k = -2; k <= 2; k++) {
    float cell = ci + float(k);
    float hs = hash21(vec2(cell, 3.7));
    float cx = (cell + 0.5 + (hash21(vec2(cell, 8.1)) - 0.5) * 0.6) * cw;
    float ht = mix(0.02, 0.065, hs * hs) * (0.6 + 0.6 * vnoise(vec2(cell * 0.11, 2.0)));
    float wd = ht * 0.32;
    float dx = abs(x - cx) / wd;
    if (dx > 1.0) continue;
    float tiers = 1.0 - 0.18 * fract((1.0 - dx) * 3.0 + hs);
    top = max(top, base + ht * (1.0 - dx) * tiers);
  }
  return top;
}

void main() {
  vec2 frag = gl_FragCoord.xy / uDpr;
  float h = uRes.y;
  vec2 s = vec2((frag.x - 0.5 * uRes.x) / h, frag.y / h);
  float t = uTime;
  float D = clamp(uDawn, 0.0, 1.0);
  float aspect = uRes.x / uRes.y;
  vec2 sun = vec2(-0.18 * min(aspect, 1.6), HZ + 0.06 + D * 0.2 + uWarm * 0.05 - uDim * 0.04);

  vec3 c;
  if (s.y >= HZ) {
    c = skyAt(s.y, s.x, D, sun);
    float k = (s.y - HZ) / (1.0 - HZ);
    // Stars linger in the indigo until the sun is up.
    vec2 g = s * 90.0;
    vec2 gi = floor(g);
    float hs = hash21(gi);
    if (hs > 0.985) {
      float r = length(g - gi - 0.5);
      c += vec3(0.9, 0.95, 1.0) * exp(-r * r * 10.0) * smoothstep(0.35, 0.9, k) * (1.0 - D) * (0.6 + 0.4 * sin(t * 2.0 + hs * 90.0));
    }
    // Aurora curtains, fading out as the sun comes up.
    float night = pow(1.0 - D, 1.4);
    if (night > 0.02) {
      float ax = s.x * 1.1 + t * 0.012;
      float edge = 0.64 + 0.1 * (fbm(vec2(ax * 1.4, t * 0.035)) - 0.5) * 2.0 + 0.03 * sin(ax * 2.6 + t * 0.07);
      float up = s.y - edge;
      float sheet = smoothstep(-0.012, 0.006, up) * exp(-max(up, 0.0) * 6.5);
      float rays = 0.45 + 0.55 * vnoise(vec2(ax * 26.0 + fbm(vec2(ax * 3.0, t * 0.05)) * 4.0, t * 0.35));
      float fold = 0.35 + 0.65 * smoothstep(0.2, 0.8, fbm(vec2(ax * 2.2 - t * 0.02, 3.0)));
      vec3 hueA = mix(vec3(0.2, 1.0, 0.6), vec3(0.7, 0.35, 1.0), smoothstep(0.02, 0.2, up));
      float a = sheet * rays * fold * night;
      c = mix(c, c * 0.7 + hueA * 0.9, clamp(a * 0.8, 0.0, 0.7));
    }
    // A shooting star now and then while it's still dark.
    {
      float per = 5.5;
      float n = floor(t / per);
      float f = fract(t / per) / 0.13;
      if (f < 1.0 && hash21(vec2(n, 1.3)) > 0.4) {
        vec2 a = vec2((hash21(vec2(n, 2.1)) - 0.5) * 1.3 * min(aspect, 1.6), 0.8 + 0.15 * hash21(vec2(n, 4.7)));
        vec2 dir = normalize(vec2(hash21(vec2(n, 5.5)) > 0.5 ? 1.0 : -1.0, -0.5));
        vec2 rel = s - (a + dir * f * 0.32);
        float along = dot(rel, -dir);
        float perp = abs(rel.x * dir.y - rel.y * dir.x) * h;
        float tail = step(0.0, along) * smoothstep(0.11, 0.0, along);
        float fade = sin(f * 3.14159) * night;
        c += vec3(0.95, 0.97, 1.0) * (exp(-perp * perp / 1.2) * tail + exp(-dot(rel, rel) * h * h / 4.0)) * fade * 0.9;
      }
    }
    // Soft shafts from the sun once it clears the hills.
    {
      vec2 sv = s - sun;
      vec2 around = normalize(sv + 1e-5) * 4.5;
      float shafts = smoothstep(0.45, 0.85, vnoise(around + vec2(t * 0.06, -t * 0.04)));
      c += vec3(1.0, 0.8, 0.6) * shafts * exp(-length(sv) * 2.4) * smoothstep(0.15, 0.7, D) * 0.14;
    }
    // Long thin clouds lit from below.
    vec2 cp = vec2(s.x * 1.4 + t * 0.006, s.y * 9.0);
    float cl = smoothstep(0.55, 0.85, fbm(cp + vec2(0.0, fbm(cp * 0.5) * 1.5)));
    float band = smoothstep(0.05, 0.22, k) * smoothstep(0.75, 0.35, k);
    vec3 lit = mix(vec3(0.95, 0.55, 0.6), vec3(1.0, 0.85, 0.7), D);
    float near = exp(-length(s - sun) * 2.2);
    c = mix(c, lit + near * 0.3, cl * band * 0.55);

    float hill = HZ + 0.03 + 0.05 * fbm(vec2(s.x * 1.3 + 4.0, 1.0)) + 0.015 * sin(s.x * 2.3);
    if (s.y < hill) c = mix(c, mix(vec3(0.42, 0.36, 0.56), vec3(0.62, 0.6, 0.76), D), 0.65);
    float tree = pines(s.x, HZ + 0.004 + 0.012 * vnoise(vec2(s.x * 3.0, 5.0)));
    if (s.y < tree) {
      vec3 dark = mix(vec3(0.1, 0.09, 0.2), vec3(0.17, 0.2, 0.32), D);
      float rim = exp(-abs(s.x - sun.x) * 3.0) * smoothstep(tree - 0.006, tree, s.y);
      c = dark + vec3(1.0, 0.6, 0.35) * rim * 0.35;
    }
    // A skein of geese crossing now and then.
    {
      float per = 60.0;
      float n = floor(t / per);
      float f = fract(t / per) * per / 26.0;
      if (f < 1.0) {
        float side = hash21(vec2(n, 6.2)) > 0.5 ? 1.0 : -1.0;
        float span = 0.75 * min(aspect, 1.8) + 0.2;
        vec2 lead = vec2(side * mix(-span, span, f), 0.6 + 0.16 * hash21(vec2(n, 7.9)) + 0.02 * sin(f * 6.0));
        if (abs(s.y - lead.y) < 0.06 && abs(s.x - lead.x) < 0.18) {
          float ink = 0.0;
          for (int i = 0; i < 9; i++) {
            float fi = float(i);
            float rank = floor((fi + 1.0) * 0.5);
            float wing = mod(fi, 2.0) * 2.0 - 1.0;
            vec2 at = lead + vec2(-side * rank * 0.022, wing * rank * 0.011 + 0.002 * sin(t * 0.8 + fi));
            vec2 q = (s - at) / 0.0065;
            q.x *= side;
            float flap = sin(t * 6.5 + fi * 1.7);
            vec2 tip = vec2(1.0, 0.25 + 0.55 * flap);
            vec2 qa = vec2(abs(q.x), q.y);
            float hseg = clamp(dot(qa, tip) / dot(tip, tip), 0.0, 1.0);
            float d = length(qa - tip * hseg);
            ink = max(ink, smoothstep(0.32, 0.12, d) * step(abs(q.x), 1.2));
          }
          c = mix(c, mix(vec3(0.16, 0.12, 0.24), vec3(0.25, 0.26, 0.38), D), ink * 0.85);
        }
      }
    }
  } else {
    float dy = HZ - s.y;
    float z = 0.08 / max(dy, 0.002);
    vec2 pl = vec2(s.x * z, z);
    // Ice mirrors a softened sky.
    vec3 refl = skyAt(HZ + dy * 0.7, s.x, D, vec2(sun.x, HZ + (sun.y - HZ) * 0.6));
    vec3 ice = mix(vec3(0.55, 0.62, 0.78), vec3(0.78, 0.86, 0.94), D);
    float drift = fbm(vec2(pl.x * 1.6 + pl.y * 0.4, pl.y * 6.0));
    float snow = smoothstep(0.42, 0.72, drift);
    c = mix(refl * 0.7 + ice * 0.25, mix(vec3(0.86, 0.84, 0.92), vec3(0.98, 0.96, 0.95), D), snow * 0.85);
    // Old pressure cracks frozen into the lake.
    float n1 = vnoise(pl * vec2(2.2, 2.2) + 11.0);
    float ridge = 1.0 - smoothstep(0.0, 0.035 * z * 0.4 + 0.01, abs(n1 - 0.5));
    c = mix(c, vec3(0.95, 0.98, 1.0), ridge * (1.0 - snow) * 0.35 * smoothstep(0.0, 0.25, dy));
    // Sun glitter column.
    float col = exp(-abs(s.x - sun.x) * (6.0 + 30.0 * dy));
    vec2 gc = floor(frag * 0.5);
    float gh = hash21(gc);
    float glit = step(0.8, gh) * pow(max(0.0, sin(t * (1.2 + gh * 2.5) + hash21(gc + 9.0) * 6.283)), 12.0);
    c += vec3(1.0, 0.82, 0.62) * col * (0.25 + 0.9 * glit * (1.0 - snow)) * (0.5 + 0.5 * D);
    // Spindrift: loose snow blown in streaks across the ice, faster close by.
    float gust = 0.55 + 0.45 * sin(t * 0.23 + pl.y * 0.4);
    float streak = vnoise(vec2(pl.x * 0.7 - t * 0.55, pl.y * 16.0)) * vnoise(vec2(pl.x * 0.25 - t * 0.3, pl.y * 3.0 + 4.0));
    c = mix(c, vec3(0.97, 0.97, 1.0), smoothstep(0.3, 0.62, streak) * gust * 0.32 * smoothstep(0.0, 0.05, dy));
    // Two ice-fishing shacks far out, with a flag.
    for (int i = 0; i < 2; i++) {
      float fi = float(i);
      vec3 sh = shack(fi, aspect);
      float sc = sh.z;
      vec2 q = (s - sh.xy) / sc;
      float body = step(abs(q.x), 0.5) * step(0.0, q.y) * step(q.y, 0.7);
      float roof = step(0.7, q.y) * step(q.y, 0.7 + 0.5 * (0.6 - abs(q.x))) * step(abs(q.x), 0.6);
      vec3 hue = i == 0 ? vec3(0.62, 0.22, 0.2) : vec3(0.24, 0.32, 0.5);
      c = mix(c, hue * (0.5 + 0.5 * D), body);
      c = mix(c, vec3(0.92, 0.94, 1.0) * (0.7 + 0.3 * D), roof);
      c = mix(c, vec3(0.12, 0.12, 0.16), step(abs(q.x - 0.3), 0.045) * step(0.7, q.y) * step(q.y, 0.98));
      c = mix(c, hue * 0.25, step(abs(q.x - 0.15), 0.12) * step(0.05, q.y) * step(q.y, 0.45) * body);
      float flick = 0.8 + 0.2 * sin(t * 7.0 + fi * 3.0) * sin(t * 2.3 + fi);
      float lamp = step(abs(q.x + 0.25), 0.1) * step(0.25, q.y) * step(q.y, 0.48);
      c = mix(c, vec3(1.0, 0.72, 0.36) * flick, lamp * (0.55 + 0.45 * (1.0 - D)));
      c += vec3(1.0, 0.6, 0.3) * exp(-length(q - vec2(-0.25, 0.1)) * 1.6) * (1.0 - D) * 0.12 * flick * step(q.y, 0.0);
      c = mix(c, vec3(0.05, 0.08, 0.14), step(0.0, q.y) * step(q.y, 0.06) * step(abs(q.x), 0.62) * 0.4);
      if (i == 0) {
        float ah = sc * 0.72;
        vec2 aq = (s - sh.xy - vec2(0.9, -0.14) * sc) / ah;
        if (aq.x > -0.3 && aq.x < 1.1 && aq.y > -0.15 && aq.y < 1.1) {
          vec4 an = angler(aq, t);
          float apx = 1.2 / (ah * h);
          c = mix(c, vec3(0.04, 0.1, 0.17), 1.0 - smoothstep(0.0, apx, an.w));
          c = mix(c, vec3(0.85, 0.88, 0.92), (1.0 - smoothstep(0.0, apx, an.z)) * 0.5);
          c = mix(c, vec3(0.72, 0.24, 0.2) * (0.6 + 0.4 * D), 1.0 - smoothstep(0.0, apx, an.y));
          c = mix(c, mix(vec3(0.13, 0.12, 0.22), vec3(0.2, 0.22, 0.34), D), 1.0 - smoothstep(0.0, apx, an.x));
        }
      }
    }
    // Folk out on the ice: four skaters (one a pair, one with a dog) and a walker towing a sled.
    vec3 ink = mix(vec3(0.13, 0.12, 0.22), vec3(0.2, 0.22, 0.34), D);
    float wrap = 2.0 * min(aspect, 1.8) + 0.6;
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      bool sled = i == 4;
      float far = sled ? 0.1 : mix(0.05, 0.13, hash21(vec2(fi, 2.4)));
      float dir = mod(fi, 2.0) * 2.0 - 1.0;
      float rate = sled ? 3.2 : 2.4 + 0.5 * hash21(vec2(fi, 6.6));
      float speed = far * (sled ? 0.45 : 1.3);
      float lead = mod(hash21(vec2(fi, 9.1)) * wrap + dir * t * speed, wrap) - wrap * 0.5;
      vec3 scarfHue = i == 0 ? vec3(0.9, 0.25, 0.22) : i == 1 ? vec3(1.0, 0.75, 0.25) : i == 2 ? vec3(0.2, 0.7, 0.75) : i == 3 ? vec3(0.95, 0.45, 0.65) : vec3(0.35, 0.55, 0.95);
      for (int m = 0; m < 2; m++) {
        if (m == 1 && i != 2) break;
        float fm = float(m);
        float tall0 = far * 0.62;
        float x = lead - fm * tall0 * 0.45 * dir;
        // Marks in the frost, cut where this one crossed this column a while ago.
        float tail = sled ? tall0 * 1.5 : 0.0;
        float back = mod((x - s.x) * dir - tail, wrap);
        float age = back / speed;
        if (age < 16.0) {
          float tau = t - age;
          float depT = far + 0.006 * sin(tau * 0.35 + fi * 1.9) + fm * 0.008;
          float fade = (1.0 - age / 16.0) * smoothstep(0.0, 0.4, age);
          if (sled) {
            float y0 = HZ - depT;
            float r1 = abs(s.y - (y0 + tall0 * 0.035)) * h;
            float r2 = abs(s.y - (y0 - tall0 * 0.035)) * h;
            c = mix(c, vec3(0.99, 1.0, 1.0), (1.0 - smoothstep(0.5, 1.4, min(r1, r2))) * fade * 0.55);
          } else {
            float weave = sin(tau * rate + fi * 2.1 + fm * 0.4) * tall0 * 0.06;
            float dpx = abs(s.y - (HZ - depT + weave)) * h;
            c = mix(c, vec3(0.99, 1.0, 1.0), (1.0 - smoothstep(0.6, 1.6, dpx)) * fade * 0.6);
            c = mix(c, vec3(0.4, 0.5, 0.66), (1.0 - smoothstep(0.0, 0.6, dpx)) * fade * 0.22);
          }
        }
        float dep = far + 0.006 * sin(t * 0.35 + fi * 1.9) + fm * 0.008;
        float tall = dep * 0.62;
        vec2 base = vec2(x, HZ - dep);
        vec2 q = (s - base) / tall;
        q.x *= dir;
        float reachBack = sled ? -1.8 : -0.7;
        float reachFwd = i == 1 ? 1.2 : 0.7;
        if (q.x < reachBack || q.x > reachFwd || q.y > 1.05 || q.y < -0.9) continue;
        float ph = t * rate + fi * 2.1 + fm * 0.4;
        float px = 1.2 / (tall * h);
        // Long shadow toward the viewer, leaning away from the low sun.
        float lean = clamp((base.x - sun.x) * 1.5, -1.0, 1.0) * 0.8;
        float sx = q.x * dir + q.y * lean;
        c *= 1.0 - 0.2 * exp(-sx * sx * 40.0) * step(q.y, 0.0) * smoothstep(-0.7, -0.02, q.y);
        float stoop = sled ? 0.35 : 1.0;
        float stride = sled ? 0.45 : 1.0;
        vec2 rf = skater(vec2(q.x, -q.y), ph, stoop, stride);
        c = mix(c, ink, (1.0 - smoothstep(0.0, px * 3.0, rf.x)) * 0.14 * (1.0 - snow) * smoothstep(-0.9, 0.0, q.y));
        vec2 body = skater(q, ph, stoop, stride);
        if (sled) {
          vec2 hand = vec2(-0.1, 0.5);
          float rope = seg(q, hand, vec2(-0.95, 0.1)) - 0.012;
          float deck = max(abs(q.x + 1.22) - 0.27, abs(q.y - 0.09) - 0.04);
          float runner = seg(q, vec2(-1.5, 0.02), vec2(-0.9, 0.02)) - 0.014;
          runner = min(runner, seg(q, vec2(-0.9, 0.02), vec2(-0.86, 0.08)) - 0.014);
          float bob = 0.01 * sin(ph * 2.0);
          float kid = min(seg(q, vec2(-1.28, 0.14), vec2(-1.22, 0.36 + bob)) - 0.08, length(q - vec2(-1.2, 0.47 + bob)) - 0.075);
          float hat = length(q - vec2(-1.21, 0.55 + bob)) - 0.04;
          c = mix(c, ink * 0.8, 1.0 - smoothstep(0.0, px, min(rope, runner)));
          c = mix(c, vec3(0.62, 0.3, 0.18) * (0.6 + 0.4 * D), 1.0 - smoothstep(0.0, px, deck));
          c = mix(c, ink, 1.0 - smoothstep(0.0, px, kid));
          c = mix(c, vec3(0.95, 0.35, 0.3) * (0.6 + 0.4 * D), 1.0 - smoothstep(0.0, px, hat));
        }
        if (i == 1) {
          vec2 dq = (q - vec2(0.62, -0.06)) / 0.3;
          float pup = dog(dq, ph * 1.9);
          c = mix(c, vec3(0.45, 0.28, 0.16) * (0.55 + 0.45 * D), 1.0 - smoothstep(0.0, px / 0.3, pup));
        }
        c = mix(c, scarfHue * (0.55 + 0.45 * D), 1.0 - smoothstep(0.0, px, body.y));
        c = mix(c, ink, 1.0 - smoothstep(0.0, px, body.x));
      }
    }
    // The crack: lines race out from beneath the board across the lake.
    if (uCrack > 0.001) {
      vec2 cp = pl * vec2(3.0, 3.0);
      vec2 o = vec2(0.0, 0.6);
      float r = length(cp - o);
      float reach = uCrackAge * 9.0;
      vec2 ci = floor(cp);
      vec2 cf = fract(cp);
      float d1 = 8.0;
      float d2 = 8.0;
      for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
          vec2 nb = vec2(float(x), float(y));
          vec2 pt = nb + vec2(hash21(ci + nb), hash21(ci + nb + 31.0)) - cf;
          float dd = dot(pt, pt);
          if (dd < d1) { d2 = d1; d1 = dd; } else if (dd < d2) { d2 = dd; }
        }
      }
      float edge = sqrt(d2) - sqrt(d1);
      float line = 1.0 - smoothstep(0.0, 0.05 + 0.02 * z, edge);
      float mask = smoothstep(reach, reach - 1.5, r) * uCrack;
      c = mix(c, vec3(0.05, 0.12, 0.2), line * mask * 0.65);
      c += vec3(0.8, 0.9, 1.0) * (1.0 - smoothstep(0.0, 0.02, edge)) * mask * 0.3;
    }
    // Low mist on the ice, warmed by the sun.
    float mist = smoothstep(0.08, 0.0, dy) * (0.5 + 0.5 * fbm(vec2(s.x * 3.0 + t * 0.02, t * 0.01)));
    c = mix(c, mix(vec3(0.9, 0.7, 0.72), vec3(1.0, 0.9, 0.82), D), mist * 0.5);
  }

  // Stove smoke from the shacks, leaning with the wind.
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    vec3 sh = shack(fi, aspect);
    vec2 chim = sh.xy + vec2(0.3, 0.98) * sh.z;
    float u = s.y - chim.y;
    if (u > 0.0 && u < 0.14) {
      float lean = u * u * 4.0 + 0.006 * sin(u * 40.0 - t * 1.3 + fi * 2.0) * smoothstep(0.0, 0.03, u);
      float wide = 0.0025 + u * 0.22;
      float across = (s.x - chim.x - lean) / wide;
      float puff = fbm(vec2(across * 0.9 + fi * 5.0 - t * 0.15, u * 60.0 - t * 1.4));
      float smoke = exp(-across * across * 1.4) * smoothstep(0.14, 0.01, u) * smoothstep(0.0, 0.004, u);
      smoke *= smoothstep(0.25, 0.7, puff) * 1.4 * (1.0 - u * 4.0);
      c = mix(c, mix(vec3(0.78, 0.72, 0.84), vec3(0.97, 0.93, 0.92), D), clamp(smoke * 0.8, 0.0, 0.75));
    }
  }

  // Diamond dust: ice crystals hanging in the air, catching the low sun.
  for (int layer = 0; layer < 2; layer++) {
    float fl = float(layer);
    float cs = mix(0.05, 0.03, fl);
    vec2 q = vec2(s.x + t * 0.003 * (1.0 + fl) + 0.01 * sin(t * 0.2 + s.y * 4.0), s.y + t * mix(0.006, 0.012, fl));
    vec2 cell = floor(q / cs);
    float hs = hash21(cell + 17.0 + fl * 41.0);
    if (hs > 0.8) {
      vec2 sp = (cell + vec2(hash21(cell + 3.0), hash21(cell + 8.0))) * cs;
      vec2 d = (q - sp) * h;
      float tw = pow(0.5 + 0.5 * sin(t * (1.5 + hs * 3.0) + hs * 70.0), 6.0);
      float star = exp(-dot(d, d) / 1.6) + (exp(-abs(d.x) * 1.2) * exp(-d.y * d.y / 0.25) + exp(-abs(d.y) * 1.2) * exp(-d.x * d.x / 0.25)) * 0.3 * tw;
      float toward = 0.5 + 0.8 * exp(-length(s - sun) * 1.5);
      c += vec3(1.0, 0.95, 0.88) * star * tw * toward * (0.5 + 0.4 * D);
    }
  }

  c += vec3(1.0, 0.7, 0.4) * uMelt * 0.07 * exp(-length(s - sun) * 1.2);
  c += vec3(1.0, 0.82, 0.55) * uWarm * 0.07;

  vec2 v = frag / uRes - 0.5;
  c *= 1.0 - 0.55 * dot(v, v) * 1.5;
  c += (hash21(frag + fract(t) * 91.0) - 0.5) * 0.012;
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(c, vec3(lum) * vec3(0.8, 0.88, 1.0), 0.55 * uDim) * (1.0 - 0.28 * uDim);
  outColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

	function dawnScene(canvas: HTMLCanvasElement) {
		const pass = createFullscreenPass(canvas, FRAG, 'frost dawn');
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
		let dpr = 1;
		let raf = 0;
		let last = t0;
		let sunUp = untrack(() => dawn);
		let glow = 0;
		let cracked = 0;
		let crackAge = 0;
		let dim = 0;
		let warm = 0;

		const draw = (ms: number) => {
			if (!cssW || !cssH) return;
			const dt = Math.min(1 / 20, Math.max(0, (ms - last) / 1000));
			last = ms;
			const ease = (rate: number) => (calm ? 1 : 1 - Math.exp(-dt * rate));
			sunUp += (dawn - sunUp) * ease(0.9);
			dim += ((mood === 'lost' ? 1 : 0) - dim) * ease(1.6);
			warm += ((mood === 'won' ? 1 : 0) - warm) * ease(1.2);
			glow *= Math.exp(-dt * 1.8);
			if (mood !== 'lost') cracked *= Math.exp(-dt * 0.8);
			crackAge += dt;

			gl.useProgram(pass.program);
			gl.uniform2f(pass.uniform('uRes'), cssW, cssH);
			gl.uniform1f(pass.uniform('uDpr'), dpr);
			gl.uniform1f(pass.uniform('uTime'), calm ? 0 : (ms - t0) / 1000);
			gl.uniform1f(pass.uniform('uDawn'), sunUp);
			gl.uniform1f(pass.uniform('uMelt'), calm ? 0 : glow);
			gl.uniform1f(pass.uniform('uCrack'), cracked);
			gl.uniform1f(pass.uniform('uCrackAge'), calm ? 10 : crackAge);
			gl.uniform1f(pass.uniform('uDim'), dim);
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
			dpr = Math.min(window.devicePixelRatio || 1, 1);
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

		let seenMelt = untrack(() => melt);
		$effect(() => {
			const next = melt;
			untrack(() => {
				if (next > seenMelt) glow = Math.min(1, glow + 0.5);
				seenMelt = next;
			});
		});

		let seenCrack = untrack(() => crack);
		$effect(() => {
			const next = crack;
			untrack(() => {
				if (next > seenCrack) {
					cracked = 1;
					crackAge = 0;
				}
				seenCrack = next;
			});
		});

		$effect(() => {
			void mood;
			void dawn;
			void melt;
			void crack;
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

<div class="dawn" aria-hidden="true">
	{#if failed}
		<div class="fallback"></div>
	{:else}
		<canvas {@attach dawnScene}></canvas>
	{/if}
</div>

<style>
	.dawn {
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
			radial-gradient(40% 24% at 32% 58%, rgba(255, 210, 160, 0.55), transparent 70%),
			linear-gradient(180deg, #2a3566 0%, #b06f8f 40%, #ffc49a 57.5%, #cfe0ef 58%, #9bbbd6 100%);
	}
</style>
