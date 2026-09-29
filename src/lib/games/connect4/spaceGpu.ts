import type { createStarfield, Sector } from "./space";

type Rgba = [number, number, number, number];
type Vec4 = [number, number, number, number];

export type SectorFrame = { x: number; y: number; age: number };

export type SpaceRenderer = {
  resize(w: number, h: number, dpr: number): void;
  setStars(field: ReturnType<typeof createStarfield>): void;
  setSector(slot: number, sector: Sector): void;
  render(time: number, sectors: SectorFrame[], calm: boolean): void;
  dispose(): void;
};

const KIND = {
  speck: 0,
  tint: 1,
  lane: 2,
  nebula: 3,
  wisp: 4,
  galaxy: 5,
  halo: 6,
  atmo: 7,
  ringBack: 8,
  body: 9,
  aurora: 10,
  ringFront: 11,
  glint: 12,
  moon: 13,
  comet: 14,
  rock: 15,
  craft: 16,
  orbit: 17,
  farGalaxy: 18,
  cloud: 19,
} as const;

const PLANET_KIND: Record<string, number> = {
  gas: 0,
  ice: 1,
  rock: 2,
  dwarf: 3,
  ember: 4,
  ocean: 5,
  toxic: 6,
  dust: 7,
};

/** Floats per instance: seven vec4 attributes. */
const STRIDE = 28;
const ZERO: Vec4 = [0, 0, 0, 0];

const SPRITE_VERT = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec4 aBox;
layout(location = 2) in vec4 aKind;
layout(location = 3) in vec4 aColA;
layout(location = 4) in vec4 aColB;
layout(location = 5) in vec4 aColC;
layout(location = 6) in vec4 aMove;
layout(location = 7) in vec4 aExtra;

uniform vec2 uRes;
uniform vec2 uOffset;
uniform float uAge;
uniform vec4 uWrap;
uniform float uCalm;

out vec2 vLocal;
flat out vec2 vSize;
flat out vec4 vKind;
flat out vec4 vColA;
flat out vec4 vColB;
flat out vec4 vColC;
flat out vec4 vExtra;
flat out vec4 vAnim;

const float TAU = 6.28318530718;

float breathe(float t, float period, float delay) {
	if (t < delay) return 0.0;
	float x = fract((t - delay) / period);
	return smoothstep(0.0, 1.0, 1.0 - abs(1.0 - 2.0 * x));
}

void main() {
	int kind = int(aKind.x + 0.5);
	vec2 center = aBox.xy;
	float rot = aKind.y;
	float t = uAge;
	float S = aExtra.x;
	// x: angle, y: alpha, z: scale, w: eased phase
	vec4 anim = vec4(0.0, 1.0, 1.0, 0.0);

	if (uWrap.x > 0.0) center = mod(center + uWrap.zw, uWrap.xy);
	if (kind >= 6 && kind <= 13) {
		center += aMove.xy * clamp((t - aMove.w) / max(8.0, aMove.z), 0.0, 1.0);
	}

	if (kind == 5) {
		anim.x = TAU * t / aKind.w;
	} else if (kind == 6) {
		anim.y = 1.0 - 0.35 * breathe(t, aKind.z, aKind.w);
	} else if (kind == 8 || kind == 11) {
		anim.x = TAU * t / aKind.w;
	} else if (kind == 9) {
		anim.x = aKind.w + TAU * t / aKind.z;
	} else if (kind == 10) {
		float e = breathe(t, 9.0, 0.0);
		anim = vec4(radians(18.0) * e, 0.55 + 0.3 * e, 1.0 + 0.05 * e, e);
	} else if (kind == 12) {
		float e = breathe(t, 5.5, aKind.z);
		anim = vec4(0.0, 1.0 - 0.55 * e, 1.0 + 0.1 * e, e);
	} else if (kind == 13) {
		float a = TAU * t / aKind.z;
		center += S * vec2(0.09) + 0.2124 * S * vec2(cos(a), sin(a));
	} else if (kind == 14) {
		if (uCalm > 0.5 || t < aMove.z) {
			anim.y = 0.0;
		} else {
			float p = fract((t - aMove.z) / aMove.y);
			center += vec2(cos(rot), sin(rot)) * aMove.x * p;
			anim.y = p < 0.07 ? p / 0.07 : (p < 0.82 ? 1.0 : 1.0 - (p - 0.82) / 0.18);
		}
	} else if (kind == 15) {
		anim.x = aKind.z + radians(220.0) * fract(t / 22.0);
	} else if (kind == 16) {
		if (uCalm > 0.5) {
			anim.y = 0.85;
		} else {
			float p = fract(t / 28.0);
			center += aMove.xy * p;
			anim.y = p < 0.08 ? 0.85 * p / 0.08 : 0.85 * (1.0 - (p - 0.08) / 0.92);
		}
	} else if (kind == 17) {
		anim.x = aKind.w == 0.0 ? 0.0 : TAU * t / aKind.w;
	}

	vec2 local = aCorner * aBox.zw;
	float c = cos(rot);
	float s = sin(rot);
	vec2 world = center + vec2(c * local.x - s * local.y, s * local.x + c * local.y) + uOffset;
	vec2 clip = world / uRes * 2.0 - 1.0;
	gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);

	vLocal = local;
	vSize = aBox.zw;
	vKind = aKind;
	vColA = aColA;
	vColB = aColB;
	vColC = aColC;
	vExtra = aExtra;
	vAnim = anim;
}
`;

const SPRITE_FRAG = `#version 300 es
precision highp float;
in vec2 vLocal;
flat in vec2 vSize;
flat in vec4 vKind;
flat in vec4 vColA;
flat in vec4 vColB;
flat in vec4 vColC;
flat in vec4 vExtra;
flat in vec4 vAnim;

uniform float uDpr;
out vec4 outColor;

const float TAU = 6.28318530718;

float aa(float sd) {
	float w = max(fwidth(sd), 1e-3);
	return clamp(0.5 - sd / w, 0.0, 1.0);
}

vec4 pm(vec4 c) { return vec4(c.rgb * c.a, c.a); }
vec4 over(vec4 top, vec4 base) { return top + base * (1.0 - top.a); }

vec2 rot2(vec2 p, float a) {
	float c = cos(a);
	float s = sin(a);
	return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

float turn(vec2 q, float fromDeg) {
	return fract(atan(q.x, -q.y) / TAU - fromDeg / 360.0);
}

float ellipseSd(vec2 p, vec2 r) {
	float k0 = length(p / r);
	float k1 = length(p / (r * r));
	return k0 * (k0 - 1.0) / max(k1, 1e-5);
}

float roundBoxSd(vec2 p, vec2 b, float r) {
	vec2 q = abs(p) - b + r;
	return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

vec4 galaxyConic(float f) {
	vec4 v = pm(vec4(0.545, 0.486, 1.0, 0.22));
	vec4 c = pm(vec4(0.361, 0.882, 0.902, 0.16));
	vec4 k = pm(vec4(1.0, 0.706, 0.863, 0.12));
	if (f < 0.12) return vec4(0.0);
	if (f < 0.18) return v * (f - 0.12) / 0.06;
	if (f < 0.32) return v * (1.0 - (f - 0.18) / 0.14);
	if (f < 0.44) return c * (f - 0.32) / 0.12;
	if (f < 0.58) return c * (1.0 - (f - 0.44) / 0.14);
	if (f < 0.70) return k * (f - 0.58) / 0.12;
	if (f < 0.84) return k * (1.0 - (f - 0.70) / 0.14);
	return vec4(0.0);
}

float hash21(vec2 p) {
	p = fract(p * vec2(123.34, 456.21));
	p += dot(p, p + 45.32);
	return fract(p.x * p.y);
}

float vnoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(
		mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
		mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
		u.y
	);
}

float fbm(vec2 p, int octaves) {
	float v = 0.0;
	float a = 0.5;
	mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
	for (int i = 0; i < 5; i++) {
		if (i >= octaves) break;
		v += a * vnoise(p);
		p = m * p;
		a *= 0.5;
	}
	return v;
}

float cloudTexture(vec2 p, float scale, vec2 seed) {
	return mix(0.25, 1.55, smoothstep(0.22, 0.72, fbm(p / scale + seed, 3)));
}

vec4 cityDot(vec2 e, vec2 at, float r, vec3 c) {
	float a = max(0.0, 1.0 - length(e - at) / r);
	return vec4(c * a, a);
}

vec4 planetBody(vec2 p) {
	float S = vExtra.x;
	int kind = int(vExtra.y + 0.5);
	vec2 q = rot2(p, -vAnim.x);
	vec2 n = q / S + 0.5;
	vec3 hi = vColA.rgb;
	vec3 mid = vColB.rgb;
	vec3 lo = vColC.rgb;

	float midStop = kind == 5 ? 0.42 : (kind == 6 ? 0.48 : 0.46);
	float tb = length(n - vec2(0.7, 0.68)) / 0.976;
	vec3 base = tb < midStop
		? mix(lo, mid, tb / midStop)
		: mix(mid, hi, clamp((tb - midStop) / (1.0 - midStop), 0.0, 1.0));
	vec4 col = vec4(base, 1.0);

	vec2 hc = vec2(0.32, 0.28);
	float ha = 0.34;
	float hr = 0.257;

	if (kind == 0) {
		float pos = dot(q, vec2(0.9703, 0.2419)) + 0.6061 * S;
		float m = mod(pos, 30.0);
		col = vec4(m < 10.0 ? mid : (m < 16.0 ? hi : (m < 22.0 ? lo : mid)), 1.0);
		ha = 0.32;
	} else if (kind == 5) {
		vec3 cc = mix(vec3(0.039, 0.125, 0.188), hi, 0.7);
		float a = clamp(1.0 - (length(n - vec2(0.28, 0.62)) - 0.171) / 0.228, 0.0, 1.0);
		col = over(vec4(cc * a, a), col);
		hc = vec2(0.34, 0.30);
		ha = 0.4;
		hr = 0.25;
	} else if (kind == 6) {
		float a = max(0.0, 1.0 - length(n - vec2(0.62, 0.58)) / 0.306);
		col = over(vec4(hi * a, a), col);
		hc = vec2(0.30, 0.28);
		ha = 0.28;
		hr = 0.241;
	} else if (kind == 7) {
		float a = 0.55 * clamp(1.0 - (length(n - vec2(0.58, 0.40)) - 0.1) / 0.134, 0.0, 1.0);
		col = over(vec4(lo * a, a), col);
		hc = vec2(0.30, 0.28);
		ha = 0.22;
		hr = 0.241;
	}

	float hl = ha * max(0.0, 1.0 - length(n - hc) / hr);
	col = over(vec4(vec3(hl), hl), col);

	float shade = 0.48 * smoothstep(-22.0, 22.0, length(q - vec2(-14.0, -10.0)) - S * 0.5);
	col = over(vec4(0.0, 0.0, 0.0, shade), col);

	if (vExtra.z > 0.5) {
		vec2 sc = vec2(0.69, 0.53);
		vec2 sr = vec2(0.11, 0.07);
		float k = length((n - sc) / sr) / 1.4142;
		vec4 storm = mix(vec4(lo, 1.0), vec4(mid * 0.2, 0.2), clamp(k / 0.7, 0.0, 1.0));
		storm *= 0.85 * aa(ellipseSd((n - sc) * S, sr * S));
		col = over(storm, col);
	}

	if (vExtra.w > 0.5 && n.x > 0.52) {
		vec2 e = n * S;
		vec4 lights = cityDot(e, vec2(0.62, 0.38) * S, 1.2, vec3(1.0, 0.89, 0.541));
		lights = over(cityDot(e, vec2(0.70, 0.52) * S, 1.0, vec3(0.361, 0.882, 0.902)), lights);
		lights = over(cityDot(e, vec2(0.78, 0.44) * S, 1.4, vec3(1.0, 0.69, 0.816)), lights);
		lights = over(cityDot(e, vec2(0.66, 0.61) * S, 1.0, vec3(1.0)), lights);
		lights = over(cityDot(e, vec2(0.74, 0.70) * S, 1.1, vec3(1.0, 0.89, 0.541)), lights);
		lights = over(cityDot(e, vec2(0.84, 0.56) * S, 0.9, vec3(0.545, 0.486, 1.0)), lights);
		col = over(lights * 0.8, col);
	}

	return col * aa(length(p) - S * 0.5);
}

vec4 ring(vec2 p, bool front) {
	float S = vExtra.x;
	vec2 q = rot2(vec2(p.x, p.y / 0.28), -vAnim.x);
	float d = length(q);
	float outer = 1.22 * S;
	float w = max(fwidth(d), 1e-3);
	float cov = clamp(0.5 - (d - outer) / w, 0.0, 1.0)
		* clamp(0.5 - ((outer - vKind.z) - d) / w, 0.0, 1.0);
	vec4 col = pm(vColA);
	if (front) {
		cov *= clamp(0.5 + q.y / max(fwidth(q.y), 1e-3), 0.0, 1.0);
	} else if (abs(q.x) > abs(q.y)) {
		col = q.x < 0.0 ? vec4(0.0) : col * 0.28;
	}
	return col * cov;
}

vec4 comet(vec2 p) {
	float len = vKind.z;
	float th = vKind.w;
	vec2 hb = vec2(len, th) * 0.5;
	vec3 tone = vColA.rgb;

	float body = aa(roundBoxSd(p, hb, th * 0.5));
	float s = clamp((p.x + hb.x) / len, 0.0, 1.0);
	vec4 bc = s < 0.58 ? vec4(tone, 1.0) * (s / 0.58) : mix(vec4(tone, 1.0), vec4(1.0), (s - 0.58) / 0.42);

	float glow = 0.55 * (1.0 - smoothstep(-10.0, 10.0, roundBoxSd(p - vec2(6.0, 0.0), hb + 1.0, th * 0.5 + 1.0)));
	glow *= 1.0 - body;

	vec2 hc = vec2(hb.x - 0.5, 0.0);
	float dh = length(p - hc);
	float head = aa(dh - 2.5);
	float headGlow = (1.0 - smoothstep(-8.0, 8.0, dh - 4.5)) * (1.0 - head);

	vec4 col = vec4(tone * glow, glow);
	col = over(bc * body, col);
	col = over(vec4(tone * headGlow, headGlow), col);
	col = over(vec4(head), col);
	return col * vAnim.y;
}

vec4 craft(vec2 p) {
	float sdBody = roundBoxSd(p, vec2(17.0, 4.0), 2.0);
	float body = aa(sdBody);
	float glow = 0.4 * (1.0 - smoothstep(-12.0, 12.0, sdBody)) * (1.0 - body);
	vec4 col = vec4(vec3(glow), glow);
	vec4 cyan = vec4(vec3(0.361, 0.882, 0.902) * 0.55, 0.55);
	col = over(cyan * aa(roundBoxSd(p - vec2(16.0, 0.0), vec2(15.0, 2.0), 0.0)) * (1.0 - body), col);
	col = over(cyan * aa(roundBoxSd(p + vec2(16.0, 0.0), vec2(15.0, 2.0), 0.0)) * (1.0 - body), col);
	vec3 bc = mix(vec3(0.604, 0.643, 0.78), vec3(0.933, 0.953, 1.0), clamp((p.x + 17.0) / 34.0, 0.0, 1.0));
	col = over(vec4(bc * body, body), col);
	return col * vAnim.y;
}

void main() {
	int kind = int(vKind.x + 0.5);
	vec2 p = vLocal;
	vec2 hs = vSize;
	float S = vExtra.x;
	vec4 col = vec4(0.0);

	if (kind == 0) {
		float r = vKind.z * uDpr;
		float d = length(p) * uDpr;
		float re = max(r, 0.5);
		float cov = clamp(re + 0.5 - d, 0.0, 1.0) * min(1.0, (r * r) / (re * re));
		col = pm(vColA) * cov * vKind.w;
	} else if (kind == 1) {
		float t = length((p / hs - vec2(0.0, -0.2)) / vec2(1.4142, 1.6971));
		col = pm(vColA) * max(0.0, 1.0 - t / 0.7) * aa(ellipseSd(p, hs)) * vKind.z;
	} else if (kind == 2) {
		float s = p.x / hs.x * 0.5 + 0.5;
		vec4 c1 = pm(vec4(0.706, 0.784, 1.0, 0.05));
		vec4 c2 = pm(vec4(1.0, 1.0, 1.0, 0.11));
		vec4 c3 = pm(vec4(0.627, 0.549, 1.0, 0.07));
		col = s < 0.18 ? c1 * (s / 0.18)
			: s < 0.5 ? mix(c1, c2, (s - 0.18) / 0.32)
			: s < 0.74 ? mix(c2, c3, (s - 0.5) / 0.24)
			: c3 * (1.0 - (s - 0.74) / 0.26);
		col *= aa(ellipseSd(p, hs)) * vKind.z;
	} else if (kind == 3) {
		vec2 e = p + hs;
		vec2 wh = hs * 2.0;
		float t1 = length((e - vec2(0.38, 0.42) * wh) / (vec2(0.7, 0.55) * wh));
		float t2 = length((e - vec2(0.62, 0.58) * wh) / (vec2(0.4, 0.5) * wh));
		vec4 g1 = pm(vColA) * max(0.0, 1.0 - t1 / 0.62);
		vec4 g2 = pm(vColB) * max(0.0, 1.0 - t2 / 0.6);
		col = over(g1, g2) * aa(ellipseSd(p, hs)) * vKind.z;
		if (col.a > 0.002) col *= cloudTexture(p, 150.0, vExtra.xy);
	} else if (kind == 4) {
		float t = length(p / hs) / 1.4142;
		col = pm(vColA) * max(0.0, 1.0 - t / 0.7) * aa(ellipseSd(p, hs)) * vKind.z;
		if (col.a > 0.002) col *= cloudTexture(vec2(p.x * 0.35, p.y), 60.0, vExtra.xy);
	} else if (kind == 5) {
		float R = hs.x;
		float core = 0.18 * max(0.0, 1.0 - length(p) / (2.0 * R) / 0.1273);
		col = over(vec4(core), galaxyConic(turn(rot2(p, -vAnim.x), 30.0)));
		col *= aa(length(p) - R) * vKind.z;
	} else if (kind == 6) {
		col = pm(vColA) * max(0.0, 1.0 - length(p) / (0.6926 * S)) * vAnim.y;
	} else if (kind == 7) {
		col = pm(vColA) * max(0.0, 1.0 - length(p) / (0.855 * S)) * vKind.z;
	} else if (kind == 8) {
		col = ring(p, false);
	} else if (kind == 9) {
		col = planetBody(p);
	} else if (kind == 10) {
		vec2 q = rot2(p, -vAnim.x) / vAnim.z;
		float f = turn(q, 200.0);
		vec4 hz = pm(vColA);
		vec4 hl = pm(vColB);
		col = f < 0.18 ? vec4(0.0)
			: f < 0.24 ? hz * (f - 0.18) / 0.06
			: f < 0.38 ? hz * (1.0 - (f - 0.24) / 0.14)
			: f < 0.48 ? hl * (f - 0.38) / 0.1
			: f < 0.62 ? hl * (1.0 - (f - 0.48) / 0.14)
			: vec4(0.0);
		col *= aa((length(q) - 0.68 * S) * vAnim.z) * vAnim.y;
	} else if (kind == 11) {
		col = ring(p, true);
	} else if (kind == 12) {
		vec2 c = vec2(-0.18, -0.24) * S + vec2(0.0168, 0.008) * S * vAnim.w;
		vec2 q = (p - c) / vAnim.z;
		float a = 0.45 * max(0.0, 1.0 - length(q) / (0.1204 * S));
		col = vec4(a * aa(ellipseSd(q, vec2(0.14, 0.10) * S)) * vAnim.y);
	} else if (kind == 13) {
		float r = 0.09 * S;
		float t = length((p + r) / (2.0 * r) - 0.3) / 0.99;
		vec3 c = t < 0.58
			? mix(vec3(0.965, 0.949, 0.918), vColA.rgb, t / 0.58)
			: mix(vColA.rgb, vec3(0.424, 0.396, 0.361), min(1.0, (t - 0.58) / 0.42));
		c *= 1.0 - 0.4 * smoothstep(-6.0, 6.0, length(p - vec2(-4.0, -3.0)) - r);
		float cov = aa(length(p) - r);
		col = vec4(c * cov, cov);
	} else if (kind == 14) {
		col = comet(p);
	} else if (kind == 15) {
		vec2 wh = vExtra.xy;
		vec2 q = rot2(p, -vAnim.x);
		float t = length(q + wh * 0.5 - 0.3 * wh) / length(0.7 * wh);
		vec3 c = mix(vec3(0.541, 0.518, 0.596), vec3(0.231, 0.208, 0.282), clamp(t / 0.7, 0.0, 1.0));
		float a = aa(ellipseSd(q, wh * 0.5)) * 0.55;
		col = vec4(c * a, a);
	} else if (kind == 16) {
		col = craft(p);
	} else if (kind == 17) {
		float R = S;
		float d = length(p);
		float w = max(fwidth(d), 1e-3);
		float cov = clamp(0.5 - (d - R) / w, 0.0, 1.0) * clamp(0.5 - ((R - 1.0) - d) / w, 0.0, 1.0);
		if (vKind.z > 0.5) {
			vec2 q = rot2(p, -vAnim.x);
			float m = mod((atan(q.y, q.x) + 3.14159265) * R, 6.0);
			float edge = m < 4.5 ? min(m, 3.0 - m) : m - 6.0;
			cov *= clamp(edge + 0.5, 0.0, 1.0);
		}
		col = pm(vColA) * cov;
	} else if (kind == 18) {
		vec2 q = vec2(p.x, p.y / vKind.w) / S;
		float r = length(q);
		if (r < 1.0) {
			float arms = pow(0.5 + 0.5 * cos(2.0 * atan(q.y, q.x) - 7.0 * log(r + 0.08)), 2.5);
			float disk = exp(-r * 4.0) * (0.3 + 0.9 * arms) * (1.0 - smoothstep(0.7, 1.0, r));
			float core = min(1.0, exp(-r * r * 60.0));
			col = over(pm(vColB) * core, pm(vColA) * min(1.0, disk * 1.6)) * vKind.z;
		}
	} else if (kind == 19) {
		float fall = 1.0 - smoothstep(0.3, 1.0, length(p / hs));
		if (fall > 0.0) {
			vec2 q = p / 170.0 + vExtra.xy;
			q += 0.9 * vec2(vnoise(q * 0.7 + 3.1), vnoise(q * 0.7 + 7.7));
			float n = fbm(q, 4);
			float density = smoothstep(0.36, 0.8, n) * fall;
			col = mix(pm(vColA), pm(vColB), smoothstep(0.45, 0.75, n)) * density * 1.5 * vKind.z;
		}
	}

	outColor = col;
}
`;

const SCREEN_VERT = `#version 300 es
layout(location = 0) in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const SCREEN_FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uDpr;
uniform int uLayer;
out vec4 outColor;

float hash(vec2 p) {
	return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
	vec2 frag = gl_FragCoord.xy / uDpr;
	vec2 p = vec2(frag.x, uRes.y - frag.y);
	float dither = (hash(gl_FragCoord.xy) - 0.5) / 255.0;

	if (uLayer == 0) {
		float y = p.y / uRes.y;
		vec3 c0 = vec3(18.0, 8.0, 28.0) / 255.0;
		vec3 c1 = vec3(7.0, 6.0, 13.0) / 255.0;
		vec3 c2 = vec3(12.0, 7.0, 20.0) / 255.0;
		vec3 col = y < 0.52 ? mix(c0, c1, y / 0.52) : mix(c1, c2, (y - 0.52) / 0.48);
		float t2 = length((p - vec2(0.94, 0.10) * uRes) / vec2(900.0, 560.0));
		col = mix(col, vec3(1.0, 0.2, 0.361), 0.14 * max(0.0, 1.0 - t2 / 0.52));
		float t1 = length((p - vec2(0.08, 0.04) * uRes) / vec2(1100.0, 700.0));
		col = mix(col, vec3(0.545, 0.486, 1.0), 0.22 * max(0.0, 1.0 - t1 / 0.58));
		outColor = vec4(col + dither, 1.0);
	} else {
		vec2 c = vec2(0.5, 0.38) * uRes;
		float R = length(max(c, uRes - c));
		float a = 0.5 * clamp((length(p - c) / R - 0.3) / 0.7, 0.0, 1.0) + dither;
		outColor = vec4(0.0, 0.0, 0.0, max(a, 0.0));
	}
}
`;

export function parseColor(input: string): Rgba {
  const s = input.trim();
  if (s === "transparent") return [0, 0, 0, 0];
  if (s[0] === "#") {
    const hex =
      s.length === 4
        ? [...s.slice(1)].map((ch) => ch + ch).join("")
        : s.slice(1);
    const n = parseInt(hex, 16);
    return [
      ((n >> 16) & 255) / 255,
      ((n >> 8) & 255) / 255,
      (n & 255) / 255,
      1,
    ];
  }
  const match = s.match(/^(rgba?|hsla?)\(([^)]*)\)$/);
  if (!match) return [0, 0, 0, 0];
  const parts = match[2]
    .split(/[\s,/]+/)
    .filter(Boolean)
    .map(parseFloat);
  const alpha = parts.length > 3 ? parts[3] : 1;
  if (match[1].startsWith("rgb"))
    return [parts[0] / 255, parts[1] / 255, parts[2] / 255, alpha];

  const h = (((parts[0] % 360) + 360) % 360) / 360;
  const sat = parts[1] / 100;
  const light = parts[2] / 100;
  const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
  const p = 2 * light - q;
  const channel = (t: number) => {
    const k = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    if (k < 1 / 6) return p + (q - p) * 6 * k;
    if (k < 1 / 2) return q;
    if (k < 2 / 3) return p + (q - p) * (2 / 3 - k) * 6;
    return p;
  };
  return [channel(h + 1 / 3), channel(h), channel(h - 1 / 3), alpha];
}

type Sprite = {
  cx: number;
  cy: number;
  hx: number;
  hy: number;
  kind: number;
  rot?: number;
  p0?: number;
  p1?: number;
  a?: Rgba;
  b?: Rgba;
  c?: Rgba;
  move?: Vec4;
  extra?: Vec4;
};

function push(out: number[], s: Sprite) {
  out.push(s.cx, s.cy, s.hx, s.hy, s.kind, s.rot ?? 0, s.p0 ?? 0, s.p1 ?? 0);
  out.push(...(s.a ?? ZERO), ...(s.b ?? ZERO), ...(s.c ?? ZERO));
  out.push(...(s.move ?? ZERO), ...(s.extra ?? ZERO));
}

const rad = (deg: number) => (deg * Math.PI) / 180;

function packSector(sector: Sector, w: number, h: number) {
  const out: number[] = [];
  const sh = h * 1.4;
  const px = (pct: number) => (pct / 100) * w;
  const py = (pct: number) => (pct / 100) * sh;
  const vw = w / 100;
  const vh = h / 100;

  push(out, {
    cx: w / 2,
    cy: sh / 2,
    hx: w * 0.42,
    hy: sh * 0.4,
    kind: KIND.tint,
    p0: 0.85,
    a: parseColor(`rgba(${sector.tint}, 0.16)`),
  });

  const lw = w * 1.6;
  const lh = sh * 0.28;
  push(out, {
    cx: px(sector.lane.x) + lw / 2,
    cy: py(sector.lane.y) + lh / 2,
    hx: lw / 2,
    hy: lh / 2,
    kind: KIND.lane,
    rot: rad(sector.lane.tilt),
    p0: sector.lane.opacity,
  });

  for (const cloud of sector.clouds) {
    const cw = cloud.w * vw;
    const ch = cloud.h * vw;
    push(out, {
      cx: px(cloud.x) + cw / 2,
      cy: py(cloud.y) + ch / 2,
      hx: cw / 2,
      hy: ch / 2,
      kind: KIND.cloud,
      rot: rad(cloud.tilt),
      p0: cloud.opacity,
      a: parseColor(cloud.a),
      b: parseColor(cloud.b),
      extra: [cloud.seed, cloud.seed * 0.37, 0, 0],
    });
  }

  for (const cloud of sector.nebulae) {
    const cw = cloud.w * vw;
    const ch = cloud.h * vw;
    const cx = px(cloud.x) + cw / 2;
    const cy = py(cloud.y) + ch / 2;
    push(out, {
      cx,
      cy,
      hx: cw / 2,
      hy: ch / 2,
      kind: KIND.nebula,
      rot: rad(cloud.tilt),
      p0: cloud.opacity,
      a: parseColor(cloud.a),
      b: parseColor(cloud.b),
      extra: [cx * 0.013, cy * 0.017, 0, 0],
    });
  }

  for (const wisp of sector.wisps) {
    const ww = wisp.w * vw;
    const wh = wisp.h * vw;
    const cx = px(wisp.x) + ww / 2;
    const cy = py(wisp.y) + wh / 2;
    push(out, {
      cx,
      cy,
      hx: ww / 2,
      hy: wh / 2,
      kind: KIND.wisp,
      rot: rad(wisp.tilt),
      p0: wisp.opacity,
      a: parseColor(wisp.a),
      extra: [cx * 0.011, cy * 0.019, 0, 0],
    });
  }

  for (const galaxy of sector.farGalaxies) {
    const r = galaxy.size / 2;
    push(out, {
      cx: px(galaxy.x),
      cy: py(galaxy.y),
      hx: r + 1,
      hy: r + 1,
      kind: KIND.farGalaxy,
      rot: rad(galaxy.tilt),
      p0: galaxy.opacity,
      p1: galaxy.squash,
      a: parseColor(galaxy.arms),
      b: parseColor(galaxy.core),
      extra: [r, 0, 0, 0],
    });
  }

  for (const [galaxy, opacity] of [
    [sector.galaxy, 0.55],
    [sector.galaxyB, 0.32],
  ] as const) {
    if (!galaxy) continue;
    push(out, {
      cx: px(galaxy.x) + galaxy.size / 2,
      cy: py(galaxy.y) + galaxy.size / 2,
      hx: galaxy.size / 2,
      hy: galaxy.size / 2,
      kind: KIND.galaxy,
      p0: opacity,
      p1: galaxy.spin,
    });
  }

  for (const speck of [...sector.band, ...sector.dust, ...sector.glow, ...sector.distant]) {
    const r = Math.max(0.35, speck.r);
    push(out, {
      cx: speck.x * w,
      cy: speck.y * sh,
      hx: r + 1.5,
      hy: r + 1.5,
      kind: KIND.speck,
      p0: r,
      p1: 0.9,
      a: parseColor(speck.color),
    });
  }

  for (const planet of sector.planets) {
    const S = planet.size;
    const cx = px(planet.x) + S / 2;
    const cy = py(planet.y) + S / 2;
    const move: Vec4 = [
      parseFloat(planet.dx) * vw,
      parseFloat(planet.dy) * vh,
      planet.cruise,
      Math.max(0, planet.phase),
    ];
    const extra: Vec4 = [S, 0, 0, 0];
    const halo = parseColor(planet.halo);
    const haze = parseColor(planet.haze);
    const ringTone = parseColor(planet.ring);
    const gas = planet.kind === "gas";
    const part = (
      kind: number,
      hx: number,
      hy: number,
      rest: Partial<Sprite> = {},
    ) => push(out, { cx, cy, hx, hy, kind, move, extra, ...rest });

    part(KIND.halo, 0.72 * S, 0.72 * S, {
      p0: planet.kind === "ember" || planet.atmo === "burn" ? 3.4 : 7,
      p1: planet.phase,
      a: halo,
    });
    if (planet.atmo !== "none") {
      part(KIND.atmo, 0.84 * S, 0.84 * S, {
        p0: planet.atmo === "ion" ? 0.85 : 1,
        a: haze,
      });
    }
    const ringProps = { p0: gas ? 8 : 5, p1: gas ? 48 : 36, a: ringTone };
    if (planet.ringed)
      part(KIND.ringBack, 1.22 * S + 2, 0.3416 * S + 2, ringProps);
    part(KIND.body, S / 2 + 1, S / 2 + 1, {
      p0: planet.retro ? -planet.spin : planet.spin,
      p1: rad(planet.axial),
      a: parseColor(planet.hi),
      b: parseColor(planet.mid),
      c: parseColor(planet.lo),
      extra: [
        S,
        PLANET_KIND[planet.kind] ?? 2,
        planet.storm ? 1 : 0,
        planet.cities ? 1 : 0,
      ],
    });
    if (planet.atmo === "aurora") {
      part(KIND.aurora, 0.72 * S + 1, 0.72 * S + 1, { a: haze, b: halo });
    }
    if (planet.ringed)
      part(KIND.ringFront, 1.22 * S + 2, 0.3416 * S + 2, ringProps);
    part(KIND.glint, 0.36 * S, 0.36 * S, { p0: planet.phase });
    if (planet.moon) {
      part(KIND.moon, 0.09 * S + 1, 0.09 * S + 1, {
        p0: planet.orbit,
        a: parseColor(planet.moonTint),
      });
    }
  }

  for (const comet of sector.comets) {
    push(out, {
      cx: px(comet.x) + comet.len / 2,
      cy: py(comet.y) + comet.thick / 2,
      hx: comet.len / 2 + 16,
      hy: comet.thick / 2 + 14,
      kind: KIND.comet,
      rot: rad(comet.angle),
      p0: comet.len,
      p1: comet.thick,
      a: parseColor(comet.color),
      move: [comet.travel * vw, comet.dur, comet.delay, 0],
    });
  }

  for (const rock of sector.rocks) {
    const r = Math.max(rock.w, rock.h) / 2 + 1;
    push(out, {
      cx: px(rock.x) + rock.w / 2,
      cy: py(rock.y) + rock.h / 2,
      hx: r,
      hy: r,
      kind: KIND.rock,
      p0: rad(rock.rot),
      extra: [rock.w, rock.h, 0, 0],
    });
  }

  if (sector.craft) {
    push(out, {
      cx: px(sector.craft.x) + 17,
      cy: py(sector.craft.y) + 4,
      hx: 40,
      hy: 20,
      kind: KIND.craft,
      move: [40 * vw, 12 * vh, 28, 0],
    });
  }

  return new Float32Array(out);
}

function packStars(
  field: ReturnType<typeof createStarfield>,
  layers: "fixed" | "mid",
) {
  const out: number[] = [];
  const list = layers === "mid" ? field.mid : [...field.far, ...field.deep];
  for (const speck of list) {
    const r = Math.max(0.35, speck.r);
    push(out, {
      cx: speck.x * field.width,
      cy: speck.y * field.height,
      hx: r + 1.5,
      hy: r + 1.5,
      kind: KIND.speck,
      p0: r,
      p1: layers === "mid" ? 0.9 : 0.88,
      a: parseColor(speck.color),
    });
  }
  return new Float32Array(out);
}

function packOrbits(w: number, h: number) {
  const out: number[] = [];
  const rings: Array<[number, Rgba, number, number]> = [
    [Math.min(0.92 * w, 820) / 2, [0.361, 0.882, 0.902, 0.12], 0, 0],
    [Math.min(0.68 * w, 560) / 2, [1, 0.2, 0.361, 0.12], 0, 0],
    [Math.min(1.1 * w, 1040) / 2, [0.545, 0.486, 1, 0.1], 1, 72],
  ];
  for (const [r, tone, dashed, period] of rings) {
    push(out, {
      cx: w / 2,
      cy: h * 0.42,
      hx: r + 2,
      hy: r + 2,
      kind: KIND.orbit,
      p0: dashed,
      p1: period,
      a: tone,
      extra: [r, 0, 0, 0],
    });
  }
  return new Float32Array(out);
}

function compile(gl: WebGL2RenderingContext, vert: string, frag: string) {
  const make = (type: number, src: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(log ?? "shader compile failed");
    }
    return shader;
  };
  const vs = make(gl.VERTEX_SHADER, vert);
  const fs = make(gl.FRAGMENT_SHADER, frag);
  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(log ?? "program link failed");
  }
  return program;
}

type Batch = {
  vao: WebGLVertexArrayObject;
  buffer: WebGLBuffer;
  count: number;
};

export function createSpaceRenderer(
  canvas: HTMLCanvasElement,
): SpaceRenderer | null {
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
    powerPreference: "low-power",
  });
  if (!gl) return null;

  let sprite: WebGLProgram;
  let screen: WebGLProgram;
  try {
    sprite = compile(gl, SPRITE_VERT, SPRITE_FRAG);
    screen = compile(gl, SCREEN_VERT, SCREEN_FRAG);
  } catch (error) {
    console.warn("[connect4] space shader failed", error);
    return null;
  }

  const u = {
    res: gl.getUniformLocation(sprite, "uRes"),
    offset: gl.getUniformLocation(sprite, "uOffset"),
    age: gl.getUniformLocation(sprite, "uAge"),
    wrap: gl.getUniformLocation(sprite, "uWrap"),
    calm: gl.getUniformLocation(sprite, "uCalm"),
    dpr: gl.getUniformLocation(sprite, "uDpr"),
  };
  const su = {
    res: gl.getUniformLocation(screen, "uRes"),
    dpr: gl.getUniformLocation(screen, "uDpr"),
    layer: gl.getUniformLocation(screen, "uLayer"),
  };

  const cornerBuffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );

  const screenVao = gl.createVertexArray()!;
  const screenBuffer = gl.createBuffer()!;
  gl.bindVertexArray(screenVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, screenBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const makeBatch = (): Batch => {
    const vao = gl.createVertexArray()!;
    const buffer = gl.createBuffer()!;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    for (let i = 0; i < 7; i += 1) {
      gl.enableVertexAttribArray(i + 1);
      gl.vertexAttribPointer(i + 1, 4, gl.FLOAT, false, STRIDE * 4, i * 16);
      gl.vertexAttribDivisor(i + 1, 1);
    }
    gl.bindVertexArray(null);
    return { vao, buffer, count: 0 };
  };

  const upload = (batch: Batch, data: Float32Array) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, batch.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    batch.count = data.length / STRIDE;
  };

  const fixedStars = makeBatch();
  const midStars = makeBatch();
  const orbits = makeBatch();
  const sectors: Batch[] = [];
  const sectorData: Array<Sector | null> = [];
  let starField = { width: 0, height: 0 };
  let W = 1;
  let H = 1;
  let dpr = 1;

  const draw = (batch: Batch) => {
    if (!batch.count) return;
    gl.bindVertexArray(batch.vao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, batch.count);
  };

  return {
    resize(w, h, ratio) {
      W = Math.max(1, w);
      H = Math.max(1, h);
      dpr = ratio;
      canvas.width = Math.max(1, Math.round(W * dpr));
      canvas.height = Math.max(1, Math.round(H * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      upload(orbits, packOrbits(W, H));
      sectorData.forEach((sector, slot) => {
        if (sector) upload(sectors[slot], packSector(sector, W, H));
      });
    },
    setStars(field) {
      starField = { width: field.width, height: field.height };
      upload(fixedStars, packStars(field, "fixed"));
      upload(midStars, packStars(field, "mid"));
    },
    setSector(slot, sector) {
      while (sectors.length <= slot) {
        sectors.push(makeBatch());
        sectorData.push(null);
      }
      sectorData[slot] = sector;
      upload(sectors[slot], packSector(sector, W, H));
    },
    render(time, frames, calm) {
      const ratio = canvas.width / W;

      gl.disable(gl.BLEND);
      gl.useProgram(screen);
      gl.uniform2f(su.res, W, H);
      gl.uniform1f(su.dpr, ratio);
      gl.uniform1i(su.layer, 0);
      gl.bindVertexArray(screenVao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(sprite);
      gl.uniform2f(u.res, W, H);
      gl.uniform1f(u.dpr, ratio);
      gl.uniform1f(u.calm, calm ? 1 : 0);

      gl.uniform2f(u.offset, 0, 0);
      gl.uniform1f(u.age, 0);
      gl.uniform4f(u.wrap, 0, 0, 0, 0);
      draw(fixedStars);
      gl.uniform4f(
        u.wrap,
        starField.width,
        starField.height,
        -time * 4.5 * 0.22,
        time * 16 * 0.32,
      );
      draw(midStars);
      gl.uniform4f(u.wrap, 0, 0, 0, 0);

      frames.forEach((frame, slot) => {
        const batch = sectors[slot];
        if (!batch) return;
        gl.uniform2f(u.offset, frame.x, frame.y);
        gl.uniform1f(u.age, frame.age);
        draw(batch);
      });

      gl.uniform2f(u.offset, 0, 0);
      gl.uniform1f(u.age, time);
      draw(orbits);

      gl.useProgram(screen);
      gl.uniform1i(su.layer, 1);
      gl.bindVertexArray(screenVao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindVertexArray(null);
    },
    dispose() {
      for (const batch of [fixedStars, midStars, orbits, ...sectors]) {
        gl.deleteVertexArray(batch.vao);
        gl.deleteBuffer(batch.buffer);
      }
      gl.deleteVertexArray(screenVao);
      gl.deleteBuffer(screenBuffer);
      gl.deleteBuffer(cornerBuffer);
      gl.deleteProgram(sprite);
      gl.deleteProgram(screen);
    },
  };
}
