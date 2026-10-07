import type { BrewEvent } from './session.svelte';
import { MAX_TIER, REAGENTS, valueOf, type Dir } from './types';

/** Gap between the rack edge and the first well, in cell units. */
export const MARGIN = 0.16;
export const SLIDE_MS = 140;
const POP_MS = 190;
const SWIRL_MS = 620;
const MAX_TILES = 64;
const FLOATS = 12;
const LABEL_W = 256;
const LABEL_H = 80;

const VERT = `#version 300 es
in vec2 aCorner;
in vec4 iA;
in vec4 iB;
in vec4 iC;
uniform float uBoard;
uniform int uMode;
out vec2 vQ;
flat out vec4 vA;
flat out vec4 vB;
flat out vec4 vC;
void main() {
  if (uMode == 0) {
    vQ = aCorner * uBoard;
    gl_Position = vec4(aCorner.x * 2.0 - 1.0, 1.0 - aCorner.y * 2.0, 0.0, 1.0);
  } else {
    vec2 local = vec2(mix(-0.64, 0.64, aCorner.x), mix(1.02, -0.62, aCorner.y));
    vec2 pos = iA.xy + vec2(local.x, -local.y) * iA.z;
    vQ = local;
    gl_Position = vec4(pos.x / uBoard * 2.0 - 1.0, 1.0 - pos.y / uBoard * 2.0, 0.0, 1.0);
  }
  vA = iA;
  vB = iB;
  vC = iC;
}`;

const FRAG = `#version 300 es
precision highp float;
precision highp int;
in vec2 vQ;
flat in vec4 vA;
flat in vec4 vB;
flat in vec4 vC;
uniform int uMode;
uniform float uBoard;
uniform float uN;
uniform float uTime;
uniform float uPx;
uniform vec3 uPal[19];
uniform float uLabelW[19];
uniform sampler2D uAtlas;
out vec4 outColor;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float sdBox(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
float sdRound(vec2 p, vec2 b, float r) { return sdBox(p, b - r) - r; }
float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
float sdHex(vec2 p, float r) {
  const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
  p = abs(p);
  p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
  p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
  return length(p) * sign(p.y);
}
float sdTrap(vec2 p, float r1, float r2, float he) {
  vec2 k1 = vec2(r2, he);
  vec2 k2 = vec2(r2 - r1, 2.0 * he);
  p.x = abs(p.x);
  vec2 ca = vec2(p.x - min(p.x, (p.y < 0.0) ? r1 : r2), abs(p.y) - he);
  vec2 cb = p - k1 + k2 * clamp(dot(k1 - p, k2) / dot(k2, k2), 0.0, 1.0);
  float s = (cb.x < 0.0 && ca.y < 0.0) ? -1.0 : 1.0;
  return s * sqrt(min(dot(ca, ca), dot(cb, cb)));
}

void over(inout vec4 acc, vec3 c, float a) {
  acc.rgb = c * a + acc.rgb * (1.0 - a);
  acc.a = a + acc.a * (1.0 - a);
}

/* Glass outline per family; fills top, label centre and height, fill level, half width, bottom. */
float vial(vec2 q, float g, out float top, out vec2 label, out float lh, out float level, out float halfW, out float bottom) {
  float d;
  if (g < 0.5) {
    d = min(sdRound(q - vec2(0.0, -0.03), vec2(0.15, 0.34), 0.15), sdRound(q - vec2(0.0, 0.3), vec2(0.18, 0.028), 0.02));
    top = 0.328; label = vec2(0.0, -0.1); lh = 0.125; level = 0.12; halfW = 0.15; bottom = -0.37;
  } else if (g < 1.5) {
    float body = length(q - vec2(0.0, -0.13)) - 0.285;
    float neck = sdRound(q - vec2(0.0, 0.17), vec2(0.085, 0.15), 0.02);
    d = min(smin(body, neck, 0.05), sdRound(q - vec2(0.0, 0.31), vec2(0.115, 0.026), 0.02));
    top = 0.336; label = vec2(0.0, -0.15); lh = 0.115; level = 0.0; halfW = 0.285; bottom = -0.415;
  } else if (g < 2.5) {
    float body = sdTrap(q - vec2(0.0, -0.17), 0.34, 0.09, 0.22) - 0.03;
    float neck = sdRound(q - vec2(0.0, 0.16), vec2(0.08, 0.14), 0.02);
    d = min(smin(body, neck, 0.04), sdRound(q - vec2(0.0, 0.31), vec2(0.11, 0.026), 0.02));
    top = 0.336; label = vec2(0.0, -0.22); lh = 0.108; level = -0.04; halfW = 0.32; bottom = -0.42;
  } else if (g < 3.5) {
    vec2 b = (q - vec2(0.0, -0.11)) / vec2(1.0, 0.84);
    float body = (length(b) - 0.33) * 0.84;
    float neck = sdRound(q - vec2(0.0, 0.2), vec2(0.07, 0.12), 0.02);
    d = min(smin(body, neck, 0.06), sdRound(q - vec2(0.0, 0.31), vec2(0.1, 0.026), 0.02));
    top = 0.336; label = vec2(0.0, -0.13); lh = 0.104; level = 0.04; halfW = 0.33; bottom = -0.39;
  } else {
    float body = sdHex((q - vec2(0.0, -0.1)).yx, 0.3) - 0.012;
    float neck = sdRound(q - vec2(0.0, 0.24), vec2(0.06, 0.09), 0.02);
    d = min(smin(body, neck, 0.03), sdRound(q - vec2(0.0, 0.32), vec2(0.095, 0.024), 0.02));
    top = 0.344; label = vec2(0.0, -0.1); lh = 0.098; level = 0.1; halfW = 0.3; bottom = -0.44;
  }
  return d;
}

vec4 rack(vec2 p) {
  float aa = uPx * 1.5;
  vec2 c = vec2(uBoard * 0.5);
  float d = sdRound(p - c, vec2(uBoard * 0.5 - 0.03), 0.24);
  float grain = vnoise(vec2(p.x * 1.4, p.y * 16.0)) * 0.6 + vnoise(vec2(p.x * 5.0, p.y * 40.0)) * 0.4;
  float ring = sin((p.y + vnoise(p * vec2(0.6, 3.0)) * 0.8) * 22.0) * 0.5 + 0.5;
  vec3 wood = mix(vec3(0.2, 0.1, 0.05), vec3(0.36, 0.2, 0.1), grain * 0.7 + ring * 0.15);
  float light = 1.0 - 0.35 * length((p - vec2(0.0, 0.0)) / uBoard);
  wood *= 0.75 + 0.45 * light;
  wood += vec3(0.5, 0.3, 0.12) * 0.25 * smoothstep(0.06, 0.0, abs(d + 0.05)) * smoothstep(0.5, -0.5, (p.x + p.y) / uBoard - 1.0);
  wood *= 1.0 - 0.45 * smoothstep(-0.02, 0.0, d + 0.02);

  vec2 cp = p - MARGIN;
  vec2 ci = floor(cp);
  vec3 col = wood;
  if (ci.x >= 0.0 && ci.y >= 0.0 && ci.x < uN && ci.y < uN) {
    vec2 f = fract(cp) - 0.5;
    float r = length(f);
    float lit = dot(f / max(r, 1e-4), normalize(vec2(-1.0, -1.0)));
    vec3 hole = mix(vec3(0.04, 0.03, 0.025), vec3(0.11, 0.07, 0.045), smoothstep(0.452, 0.1, r));
    hole *= 1.0 - 0.5 * smoothstep(0.2, 0.452, r) * (0.5 + 0.5 * -lit);
    col = mix(col, hole, smoothstep(aa, -aa, r - 0.452));
    float brass = abs(r - 0.462) - 0.013;
    vec3 bc = mix(vec3(0.5, 0.33, 0.13), vec3(0.95, 0.75, 0.4), 0.5 + 0.5 * lit);
    bc += vec3(1.0, 0.9, 0.6) * 0.3 * pow(max(0.0, lit), 6.0);
    col = mix(col, bc, smoothstep(aa, -aa, brass));
  }
  return vec4(col, 1.0) * smoothstep(aa, -aa, d);
}

void main() {
  if (uMode == 0) {
    outColor = rack(vQ);
    return;
  }

  vec2 q = vQ;
  float tier = vA.w;
  float t = uTime;
  float seed = vB.w;
  float aa = uPx / max(vA.z, 0.05) * 1.4;
  float g = tier <= 3.0 ? 0.0 : tier <= 6.0 ? 1.0 : tier <= 9.0 ? 2.0 : tier <= 11.0 ? 3.0 : 4.0;
  float top; vec2 lc; float lh; float level; float halfW; float bottom;
  float d = vial(q, g, top, lc, lh, level, halfW, bottom);

  vec3 pal = uPal[int(tier)];
  vec3 prev = uPal[int(vB.x)];
  float settle = vB.y;
  float swirl = vnoise(vec2(atan(q.y + 0.1, q.x) * 2.0 + t * 5.0, length(q) * 9.0 - t * 3.0));
  float mixAmt = clamp(settle * 1.6 - 0.3 + (swirl - 0.5) * (1.0 - settle) * 1.6, 0.0, 1.0);
  vec3 liquid = mix(prev, pal, settle >= 1.0 ? 1.0 : mixAmt);

  float rare = step(8.0, tier);
  float pulse = 0.65 + 0.35 * sin(t * 2.2 + seed * 6.0);
  float flash = vC.x;
  vec4 acc = vec4(0.0);

  /* Halo for rare tiers and a burst on every merge. */
  float outside = max(d, 0.0);
  acc.rgb += pal * exp(-outside * 14.0) * (0.22 * rare * pulse + 0.1 * step(10.0, tier)) * step(0.0, d);
  acc.rgb += mix(pal, vec3(1.0), 0.4) * exp(-outside * 9.0) * flash * 0.55 * step(0.0, d);

  /* Glass back wall. */
  float inGlass = smoothstep(aa, -aa, d);
  over(acc, vec3(0.7, 0.8, 0.85) * 0.18, inGlass * 0.35);

  /* Liquid with a sloshing, rippled surface. */
  float wave = sin(q.x * 19.0 + t * 4.0 + seed * 9.0) * 0.006 * (1.0 + abs(vB.z) * 5.0);
  float surface = level + vC.y * 0.05 + vB.z * q.x * 0.9 + wave;
  float inner = d + 0.028;
  float liq = smoothstep(aa, -aa, inner) * smoothstep(aa, -aa, q.y - surface);
  if (liq > 0.0) {
    float cyl = 1.0 - pow(clamp(abs(q.x) / halfW, 0.0, 1.0), 2.0) * 0.55;
    float depth = smoothstep(surface, bottom, q.y);
    vec3 lcCol = liquid * (0.5 + 0.6 * cyl) * (1.0 - depth * 0.35);
    lcCol += liquid * rare * 0.35 * pulse * (1.0 - depth * 0.5);
    lcCol += mix(liquid, vec3(1.0), 0.6) * 0.45 * smoothstep(0.022, 0.0, surface - q.y);
    if (tier == 7.0) lcCol += vec3(0.6) * pow(max(0.0, sin(q.x * 14.0 + q.y * 6.0 + t * 1.5)), 8.0) * 0.4;
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      float h1 = hash(vec2(seed * 13.0, fi));
      float h2 = hash(vec2(fi, seed * 7.0));
      float speed = 0.12 + h2 * 0.2 + rare * 0.15;
      float span = surface - bottom;
      vec2 bp = vec2((h1 - 0.5) * halfW * 1.1 + sin(t * 2.0 + fi) * 0.01, bottom + 0.04 + fract(t * speed + h2) * span);
      float br = 0.01 + h1 * 0.012;
      float bd = abs(length(q - bp) - br) - 0.003;
      lcCol += vec3(1.0) * 0.4 * smoothstep(aa, -aa, bd) * step(fi, 1.0 + rare * 3.0 + g);
    }
    over(acc, lcCol, liq * 0.93);
  }

  /* Glass front: rim light, specular streak, dark edge. */
  float rim = smoothstep(aa, -aa, abs(d + 0.012) - 0.009);
  over(acc, vec3(0.9, 0.95, 1.0), rim * 0.32);
  float streak = smoothstep(0.03, 0.0, abs(q.x + halfW * 0.55 - q.y * 0.04)) * smoothstep(0.0, -0.04, d + 0.02);
  streak *= smoothstep(bottom + 0.08, bottom + 0.2, q.y) * smoothstep(top, top - 0.12, q.y);
  over(acc, vec3(1.0), streak * 0.3);
  over(acc, vec3(0.02, 0.03, 0.04), smoothstep(aa, -aa, abs(d) - 0.004) * 0.6);

  /* Stopper: cork on common vials, gold on rare ones, a crystal on the rarest. */
  float lift = flash * 0.05;
  if (g < 2.5) {
    vec2 cq = q - vec2(0.0, top + 0.05 + lift);
    float cork = sdRound(cq, vec2(0.075 - cq.y * 0.12, 0.055), 0.015);
    vec3 cc = vec3(0.55, 0.38, 0.22) * (0.75 + 0.35 * vnoise(cq * 60.0 + seed)) * (0.8 + 0.4 * smoothstep(-0.06, 0.06, -cq.x));
    over(acc, cc, smoothstep(aa, -aa, cork));
  } else if (g < 3.5) {
    vec2 cq = q - vec2(0.0, top + 0.07 + lift);
    float ball = length(cq) - 0.06;
    float collar = sdRound(q - vec2(0.0, top + 0.01 + lift), vec2(0.08, 0.018), 0.01);
    vec3 gold = mix(vec3(0.55, 0.36, 0.1), vec3(1.0, 0.85, 0.45), smoothstep(0.06, -0.04, length(cq - vec2(-0.02, 0.02))));
    over(acc, vec3(0.75, 0.55, 0.2), smoothstep(aa, -aa, collar));
    over(acc, gold, smoothstep(aa, -aa, ball));
  } else {
    vec2 cq = q - vec2(0.0, top + 0.08 + lift);
    float gem = sdHex(cq, 0.055);
    vec3 gc = mix(pal, vec3(1.0), 0.5 + 0.4 * sin(atan(cq.y, cq.x) * 3.0 + t * 2.0));
    over(acc, gc, smoothstep(aa, -aa, gem));
  }

  /* Parchment label with the strength inked on it. */
  float W = 2.0 * lh * ${(LABEL_W / LABEL_H).toFixed(4)};
  float lw = uLabelW[int(tier)] * W * 0.5 + 0.035;
  vec2 lq = q - lc;
  lq.y += sin(lq.x * 6.0) * 0.006;
  float tag = sdRound(lq, vec2(lw, lh * 0.62), 0.018);
  vec3 paper = vec3(0.93, 0.87, 0.72) * (0.85 + 0.15 * vnoise(lq * 50.0 + seed * 3.0));
  paper *= 1.0 - 0.25 * smoothstep(-0.02, 0.0, tag);
  if (tier >= 11.0) paper = mix(paper, vec3(0.98, 0.84, 0.5), smoothstep(-0.012, 0.0, tag) * 0.9);
  over(acc, paper, smoothstep(aa, -aa, tag) * 0.97);
  vec2 uv = lq / vec2(W, 2.0 * lh) + 0.5;
  if (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) {
    float v = (tier + (1.0 - uv.y)) / 19.0;
    float ink = texture(uAtlas, vec2(uv.x, v)).a;
    over(acc, tier >= 11.0 ? vec3(0.45, 0.06, 0.1) : vec3(0.17, 0.1, 0.06), ink);
  }

  /* Vapour curling off the rare brews. */
  if (tier >= 10.0) {
    float vy = q.y - top - 0.1;
    float sway = sin(q.y * 9.0 - t * 2.2 + seed * 5.0) * 0.05 * smoothstep(0.0, 0.4, vy);
    float column = smoothstep(0.09 + vy * 0.4, 0.0, abs(q.x + sway));
    float n = vnoise(vec2(q.x * 9.0, q.y * 7.0 - t * 1.6 + seed * 11.0));
    n = smoothstep(0.2, 0.8, n);
    float fadeUp = smoothstep(0.0, 0.06, vy) * smoothstep(0.62, 0.12, vy);
    over(acc, mix(pal, vec3(1.0), 0.5), column * fadeUp * n * 0.85);
  }

  /* Sparks around the Stone and beyond. */
  if (tier >= 11.0) {
    vec2 sp = q * 9.0;
    vec2 cell = floor(sp);
    float h = hash(cell + seed);
    vec2 o = vec2(hash(cell + 3.1), hash(cell + 7.7)) - 0.5;
    float tw = max(0.0, sin(t * (2.0 + h * 3.0) + h * 40.0));
    float star = smoothstep(0.09, 0.0, length(fract(sp) - 0.5 - o * 0.6)) * step(0.82, h) * tw * tw;
    acc.rgb += mix(pal, vec3(1.0), 0.6) * star * step(0.0, d) * 0.9;
  }

  outColor = acc * vC.z;
}`;

type Tile = {
	id: number;
	tier: number;
	prev: number;
	x: number;
	y: number;
	fx: number;
	fy: number;
	tx: number;
	ty: number;
	moveAt: number;
	mergeAt: number;
	spawnAt: number;
	dieAt: number;
	slosh: number;
	sloshV: number;
	bounce: number;
	bounceV: number;
	seed: number;
	/** Impulse to give at the end of the slide. */
	kick: [number, number];
};

function hexToRgb(hex: string): [number, number, number] {
	const v = parseInt(hex.slice(1), 16);
	return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
	const shader = gl.createShader(type);
	if (!shader) return null;
	gl.shaderSource(shader, src);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		console.warn('[apothecary rack]', gl.getShaderInfoLog(shader));
		return null;
	}
	return shader;
}

export class VialRenderer {
	readonly ok: boolean;
	private gl: WebGL2RenderingContext | null = null;
	private program: WebGLProgram | null = null;
	private vao: WebGLVertexArrayObject | null = null;
	private corners: WebGLBuffer | null = null;
	private instances: WebGLBuffer | null = null;
	private atlas: WebGLTexture | null = null;
	private data = new Float32Array(MAX_TILES * FLOATS);
	private uniforms = new Map<string, WebGLUniformLocation | null>();
	private labelW = new Float32Array(19);
	private tiles: Tile[] = [];
	private nextId = 1;
	private n = 4;
	private px = 1;
	private calm = false;
	private t0 = performance.now();

	constructor(
		private canvas: HTMLCanvasElement,
		private font: string
	) {
		this.ok = this.init();
	}

	private init() {
		const gl = this.canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
		if (!gl) return false;
		const vs = compile(gl, gl.VERTEX_SHADER, VERT);
		const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG.replaceAll('MARGIN', MARGIN.toFixed(3)));
		const program = gl.createProgram();
		if (!vs || !fs || !program) return false;
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			console.warn('[apothecary rack]', gl.getProgramInfoLog(program));
			return false;
		}
		gl.deleteShader(vs);
		gl.deleteShader(fs);
		this.gl = gl;
		this.program = program;
		gl.useProgram(program);

		this.vao = gl.createVertexArray();
		gl.bindVertexArray(this.vao);
		this.corners = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.corners);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
		const aCorner = gl.getAttribLocation(program, 'aCorner');
		gl.enableVertexAttribArray(aCorner);
		gl.vertexAttribPointer(aCorner, 2, gl.FLOAT, false, 0, 0);

		this.instances = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.instances);
		gl.bufferData(gl.ARRAY_BUFFER, this.data.byteLength, gl.DYNAMIC_DRAW);
		['iA', 'iB', 'iC'].forEach((name, k) => {
			const loc = gl.getAttribLocation(program, name);
			gl.enableVertexAttribArray(loc);
			gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, FLOATS * 4, k * 16);
			gl.vertexAttribDivisor(loc, 1);
		});
		gl.bindVertexArray(null);

		const pal = new Float32Array(19 * 3);
		REAGENTS.forEach((r, i) => pal.set(hexToRgb(r.color), i * 3));
		gl.uniform3fv(this.uniform('uPal[0]'), pal);

		this.atlas = gl.createTexture();
		this.paintLabels();
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		return true;
	}

	private uniform(name: string) {
		if (!this.uniforms.has(name)) this.uniforms.set(name, this.gl!.getUniformLocation(this.program!, name));
		return this.uniforms.get(name) ?? null;
	}

	/** Inks every strength onto a strip of labels; redrawn once the display font arrives. */
	paintLabels() {
		const gl = this.gl;
		if (!gl) return;
		const strip = document.createElement('canvas');
		strip.width = LABEL_W;
		strip.height = LABEL_H * 19;
		const ctx = strip.getContext('2d');
		if (!ctx) return;
		ctx.fillStyle = '#fff';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		for (let tier = 1; tier <= MAX_TIER; tier += 1) {
			const text = String(valueOf(tier));
			ctx.font = `700 60px ${this.font}`;
			const w = ctx.measureText(text).width;
			const fit = Math.min(1, (LABEL_W - 16) / w);
			ctx.save();
			ctx.translate(LABEL_W / 2, tier * LABEL_H + LABEL_H / 2 + 3);
			ctx.scale(fit, fit);
			ctx.fillText(text, 0, 0);
			ctx.restore();
			this.labelW[tier] = (w * fit) / LABEL_W;
		}
		gl.useProgram(this.program);
		gl.uniform1fv(this.uniform('uLabelW[0]'), this.labelW);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.atlas);
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, strip);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.uniform1i(this.uniform('uAtlas'), 0);
	}

	setCalm(calm: boolean) {
		this.calm = calm;
	}

	/** Board size in cell units, margins included. */
	get span() {
		return this.n + MARGIN * 2;
	}

	resize(cssSide: number, dpr: number) {
		const px = Math.max(1, Math.round(cssSide * dpr));
		if (this.canvas.width !== px || this.canvas.height !== px) {
			this.canvas.width = px;
			this.canvas.height = px;
		}
		this.px = this.span / px;
	}

	private centre(cell: number): [number, number] {
		return [MARGIN + (cell % this.n) + 0.5, MARGIN + Math.floor(cell / this.n) + 0.5];
	}

	private make(cell: number, tier: number, spawnAt: number): Tile {
		const [x, y] = this.centre(cell);
		return {
			id: this.nextId++,
			tier,
			prev: tier,
			x,
			y,
			fx: x,
			fy: y,
			tx: x,
			ty: y,
			moveAt: -1e9,
			mergeAt: -1e9,
			spawnAt,
			dieAt: Infinity,
			slosh: 0,
			sloshV: 0,
			bounce: 0,
			bounceV: 0,
			seed: Math.random(),
			kick: [0, 0]
		};
	}

	private rebuild(cells: number[], now: number, pop: Set<number>) {
		this.tiles = [];
		cells.forEach((tier, cell) => {
			if (tier) this.tiles.push(this.make(cell, tier, pop.has(cell) ? now : -1e9));
		});
	}

	onEvent(event: BrewEvent, now = performance.now()) {
		if (event.type === 'load') {
			this.n = event.n;
			this.rebuild(event.cells, now, new Set(event.spawns.map((s) => s.cell)));
			return;
		}
		if (event.type === 'undo') {
			this.rebuild(event.cells, now, new Set());
			for (const tile of this.tiles) tile.bounceV = this.calm ? 0 : 1.6;
			return;
		}
		if (event.type !== 'pour') return;
		const slide = this.calm ? 0 : SLIDE_MS;
		const byCell = new Map<number, Tile>();
		for (const tile of this.tiles) {
			if (tile.dieAt !== Infinity) continue;
			const cell = Math.round(tile.ty - MARGIN - 0.5) * this.n + Math.round(tile.tx - MARGIN - 0.5);
			byCell.set(cell, tile);
		}
		const [dx, dy] = event.dir === 'left' ? [-1, 0] : event.dir === 'right' ? [1, 0] : event.dir === 'up' ? [0, -1] : [0, 1];
		const landed = new Map<number, Tile>();
		for (const motion of event.motions) {
			const tile = byCell.get(motion.from);
			if (!tile) continue;
			tile.fx = tile.x;
			tile.fy = tile.y;
			[tile.tx, tile.ty] = this.centre(motion.to);
			tile.moveAt = now;
			tile.kick = motion.from === motion.to ? [0, 0] : [dx, dy];
			if (motion.merged) {
				const first = landed.get(motion.to);
				if (first) {
					tile.dieAt = now + slide;
					first.prev = first.tier;
					first.tier = motion.tier + 1;
					first.mergeAt = now + slide;
				} else {
					landed.set(motion.to, tile);
				}
			}
		}
		if (event.spawn) this.tiles.push(this.make(event.spawn.cell, event.spawn.tier, now + slide));
		const live = this.tiles.filter((t) => t.dieAt === Infinity);
		const sane = live.length === event.cells.filter(Boolean).length && live.every((t) => {
			const cell = Math.round(t.ty - MARGIN - 0.5) * this.n + Math.round(t.tx - MARGIN - 0.5);
			return event.cells[cell] === t.tier;
		});
		if (!sane) this.rebuild(event.cells, now, new Set());
	}

	/** Draws one frame; returns true while anything is still settling. */
	draw(now: number) {
		const gl = this.gl;
		if (!gl || !this.program) return false;
		const slide = this.calm ? 0 : SLIDE_MS;
		const dt = 1 / 60;
		let busy = false;
		this.tiles = this.tiles.filter((t) => now < t.dieAt);
		let k = 0;
		const order = [...this.tiles].sort((a, b) => (a.dieAt !== b.dieAt ? (a.dieAt === Infinity ? 1 : -1) : a.y - b.y));
		for (const tile of order) {
			if (k >= MAX_TILES) break;
			const u = slide ? Math.min(1, (now - tile.moveAt) / slide) : 1;
			const e = u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u);
			tile.x = tile.fx + (tile.tx - tile.fx) * e;
			tile.y = tile.fy + (tile.ty - tile.fy) * e;
			if (u >= 1 && (tile.kick[0] || tile.kick[1])) {
				if (!this.calm) {
					tile.sloshV += tile.kick[0] * 3.2;
					tile.bounceV += Math.abs(tile.kick[1]) * 2.2;
				}
				tile.kick = [0, 0];
			}
			if (u < 1) busy = true;
			if (!this.calm) {
				tile.sloshV += (-tile.slosh * 120 - tile.sloshV * 5.5) * dt;
				tile.slosh += tile.sloshV * dt;
				tile.bounceV += (-tile.bounce * 140 - tile.bounceV * 6) * dt;
				tile.bounce += tile.bounceV * dt;
				if (Math.abs(tile.slosh) + Math.abs(tile.sloshV) + Math.abs(tile.bounce) + Math.abs(tile.bounceV) > 0.002) busy = true;
			}
			const popU = this.calm ? 1 : Math.min(1, Math.max(0, (now - tile.spawnAt) / POP_MS));
			const scale = popU <= 0 ? 0 : 1 + Math.sin(popU * Math.PI) * 0.12 - (1 - popU) * 0.6;
			const mergeU = Math.max(0, (now - tile.mergeAt) / SWIRL_MS);
			const merging = now >= tile.mergeAt && mergeU < 1;
			const settle = this.calm || !merging ? 1 : mergeU;
			const flash = this.calm || !merging ? 0 : Math.exp(-mergeU * 4) * (1 - Math.exp(-mergeU * 40));
			const mergeScale = merging && !this.calm ? 1 + Math.sin(Math.min(1, mergeU * 2.5) * Math.PI) * 0.1 : 1;
			const showTier = now < tile.mergeAt ? tile.prev : tile.tier;
			if (popU < 1 || merging) busy = true;
			const o = k * FLOATS;
			this.data[o] = tile.x;
			this.data[o + 1] = tile.y;
			this.data[o + 2] = scale * mergeScale * 1.07;
			this.data[o + 3] = showTier;
			this.data[o + 4] = merging ? tile.prev : showTier;
			this.data[o + 5] = settle;
			this.data[o + 6] = Math.max(-0.25, Math.min(0.25, tile.slosh));
			this.data[o + 7] = tile.seed;
			this.data[o + 8] = flash;
			this.data[o + 9] = tile.bounce;
			this.data[o + 10] = popU <= 0 ? 0 : 1;
			this.data[o + 11] = 0;
			k += 1;
		}

		gl.viewport(0, 0, this.canvas.width, this.canvas.height);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.useProgram(this.program);
		gl.bindVertexArray(this.vao);
		gl.uniform1f(this.uniform('uBoard'), this.span);
		gl.uniform1f(this.uniform('uN'), this.n);
		gl.uniform1f(this.uniform('uPx'), this.px);
		gl.uniform1f(this.uniform('uTime'), this.calm ? 2 : (now - this.t0) / 1000);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.atlas);
		gl.uniform1i(this.uniform('uMode'), 0);
		gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, 1);
		if (k) {
			gl.bindBuffer(gl.ARRAY_BUFFER, this.instances);
			gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data.subarray(0, k * FLOATS));
			gl.uniform1i(this.uniform('uMode'), 1);
			gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, k);
		}
		gl.bindVertexArray(null);
		return busy;
	}

	/** Which way a drag points, or null while it is still too short to count. */
	static swipe(dx: number, dy: number, min: number): Dir | null {
		if (Math.max(Math.abs(dx), Math.abs(dy)) < min) return null;
		return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
	}

	dispose() {
		const gl = this.gl;
		if (!gl) return;
		gl.deleteBuffer(this.corners);
		gl.deleteBuffer(this.instances);
		gl.deleteTexture(this.atlas);
		gl.deleteVertexArray(this.vao);
		gl.deleteProgram(this.program);
	}
}
