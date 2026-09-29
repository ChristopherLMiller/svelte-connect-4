/**
 * Particle fireworks: rockets fly ballistically and burst near their apex; every spark, ember and
 * smoke puff is integrated with gravity, quadratic air drag and wind. Rendered as instanced,
 * velocity-stretched quads with premultiplied blending (sparks are additive, smoke has coverage).
 */

const MAX = 7000;
const INSTANCE = 10;

const SPARK = 0;
const EMBER = 1;
const SMOKE = 2;
const FLASH = 3;
const POP = 4;

export type ShellKind = 'peony' | 'willow' | 'double' | 'crackle' | 'ring';
export const SHELL_KINDS: ShellKind[] = ['peony', 'willow', 'double', 'crackle', 'ring'];

export type Rgb = readonly [number, number, number];

export const PALETTE: Rgb[] = [
	[1, 0.8, 0.38],
	[1, 0.36, 0.26],
	[0.49, 1, 0.76],
	[1, 0.6, 0.74],
	[1, 0.95, 0.84],
	[0.74, 0.56, 1],
	[0.46, 0.86, 1]
];

const GOLD: Rgb = [1, 0.7, 0.32];

export type ShellSpec = {
	x: number;
	apexY: number;
	driftX: number;
	radius: number;
	kind: ShellKind;
	color: Rgb;
	color2: Rgb;
	quick?: boolean;
};

type Rocket = {
	x: number;
	y: number;
	vx: number;
	vy: number;
	age: number;
	emit: number;
	spec: ShellSpec;
};

const VERT = `#version 300 es
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec4 aPos;
layout(location = 2) in vec4 aColor;
layout(location = 3) in vec2 aSize;
uniform vec2 uRes;
out vec2 vLocal;
out vec4 vColor;
out float vLen;
out vec2 vSize;
void main() {
  vec2 tail = aPos.zw;
  float len = length(tail);
  vec2 ax = len > 0.001 ? tail / len : vec2(1.0, 0.0);
  vec2 ay = vec2(-ax.y, ax.x);
  float rad = aSize.y > 0.5 ? aSize.x : aSize.x * 3.2;
  float lx = mix(-rad, len + rad, aCorner.x * 0.5 + 0.5);
  float ly = aCorner.y * rad;
  vec2 p = aPos.xy + ax * lx + ay * ly;
  vLocal = vec2(lx, ly);
  vLen = len;
  vColor = aColor;
  vSize = aSize;
  vec2 clip = p / uRes * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vLocal;
in vec4 vColor;
in float vLen;
in vec2 vSize;
out vec4 outColor;
void main() {
  float along = clamp(vLocal.x, 0.0, vLen);
  float d = length(vec2(vLocal.x - along, vLocal.y));
  float k;
  if (vSize.y > 0.5) {
    float s = 1.0 - clamp(d / vSize.x, 0.0, 1.0);
    k = s * s;
  } else {
    float s = vSize.x;
    k = exp(-d * d / (s * s)) + exp(-d / (s * 2.4)) * 0.3;
    k *= vLen > 0.0 ? mix(1.0, 0.15, along / vLen) : 1.0;
  }
  outColor = vColor * k;
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
	const shader = gl.createShader(type);
	if (!shader) return null;
	gl.shaderSource(shader, src);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		console.warn('[wyrm fireworks]', gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export class Fireworks {
	private readonly gl: WebGL2RenderingContext;
	private readonly program: WebGLProgram;
	private readonly vao: WebGLVertexArrayObject;
	private readonly corners: WebGLBuffer;
	private readonly instances: WebGLBuffer;
	private readonly uRes: WebGLUniformLocation | null;
	private readonly shaders: WebGLShader[];
	private readonly data = new Float32Array((MAX + 16) * INSTANCE);

	private readonly x = new Float32Array(MAX);
	private readonly y = new Float32Array(MAX);
	private readonly vx = new Float32Array(MAX);
	private readonly vy = new Float32Array(MAX);
	private readonly age = new Float32Array(MAX);
	private readonly life = new Float32Array(MAX);
	private readonly size = new Float32Array(MAX);
	private readonly drag = new Float32Array(MAX);
	private readonly grav = new Float32Array(MAX);
	private readonly bright = new Float32Array(MAX);
	private readonly emit = new Float32Array(MAX);
	private readonly acc = new Float32Array(MAX);
	private readonly r = new Float32Array(MAX);
	private readonly g = new Float32Array(MAX);
	private readonly b = new Float32Array(MAX);
	private readonly kind = new Uint8Array(MAX);
	private readonly crackle = new Uint8Array(MAX);
	private readonly trail = new Uint8Array(MAX);
	private count = 0;

	private rockets: Rocket[] = [];
	private instanceCount = 0;

	/** Pixels per second squared; scaled with the viewport so bursts keep their shape on any screen. */
	gravity = 240;
	unit = 1;
	/** Summed flash colour of recent bursts, for lighting the sky. */
	readonly glow: [number, number, number] = [0, 0, 0];

	private constructor(gl: WebGL2RenderingContext, program: WebGLProgram, shaders: WebGLShader[]) {
		this.gl = gl;
		this.program = program;
		this.shaders = shaders;
		this.uRes = gl.getUniformLocation(program, 'uRes');
		this.vao = gl.createVertexArray()!;
		this.corners = gl.createBuffer()!;
		this.instances = gl.createBuffer()!;

		gl.bindVertexArray(this.vao);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.corners);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.instances);
		gl.bufferData(gl.ARRAY_BUFFER, this.data.byteLength, gl.DYNAMIC_DRAW);
		const stride = INSTANCE * 4;
		gl.enableVertexAttribArray(1);
		gl.vertexAttribPointer(1, 4, gl.FLOAT, false, stride, 0);
		gl.vertexAttribDivisor(1, 1);
		gl.enableVertexAttribArray(2);
		gl.vertexAttribPointer(2, 4, gl.FLOAT, false, stride, 16);
		gl.vertexAttribDivisor(2, 1);
		gl.enableVertexAttribArray(3);
		gl.vertexAttribPointer(3, 2, gl.FLOAT, false, stride, 32);
		gl.vertexAttribDivisor(3, 1);
		gl.bindVertexArray(null);
	}

	static create(gl: WebGL2RenderingContext) {
		const vs = compile(gl, gl.VERTEX_SHADER, VERT);
		const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
		const program = gl.createProgram();
		if (!vs || !fs || !program) return null;
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			console.warn('[wyrm fireworks]', gl.getProgramInfoLog(program));
			return null;
		}
		return new Fireworks(gl, program, [vs, fs]);
	}

	get busy() {
		return this.count > 0 || this.rockets.length > 0;
	}

	resize(width: number, height: number) {
		this.unit = Math.min(width, height) / 800;
		this.gravity = 240 * this.unit;
	}

	clear() {
		this.count = 0;
		this.rockets = [];
		this.glow.fill(0);
	}

	launch(spec: ShellSpec, groundY: number) {
		if (this.rockets.length >= 12) return;
		const g = this.gravity;
		const rise = Math.max(60, groundY - spec.apexY);
		// Launch speed that just reaches the apex, padded for the rocket's own drag.
		const vy = -Math.sqrt(2 * g * rise) * (spec.quick ? 1.12 : 1.06);
		const flight = -vy / g;
		this.rockets.push({
			x: spec.x,
			y: groundY,
			vx: spec.driftX / flight,
			vy,
			age: 0,
			emit: 0,
			spec
		});
	}

	private spawn(
		kind: number,
		x: number,
		y: number,
		vx: number,
		vy: number,
		life: number,
		size: number,
		drag: number,
		grav: number,
		bright: number,
		c: Rgb
	) {
		if (this.count >= MAX) return -1;
		const i = this.count++;
		this.kind[i] = kind;
		this.x[i] = x;
		this.y[i] = y;
		this.vx[i] = vx;
		this.vy[i] = vy;
		this.age[i] = 0;
		this.life[i] = life;
		this.size[i] = size;
		this.drag[i] = drag;
		this.grav[i] = grav;
		this.bright[i] = bright;
		this.r[i] = c[0];
		this.g[i] = c[1];
		this.b[i] = c[2];
		this.emit[i] = 0;
		this.acc[i] = 0;
		this.crackle[i] = 0;
		this.trail[i] = 0;
		return i;
	}

	private burst(rocket: Rocket) {
		const { spec } = rocket;
		const R = spec.radius;
		// Quadratic drag sized so sparks coast out to roughly R before stalling.
		const c = 2.6 / R;
		const v0 = R * 4.3;
		const bx = rocket.x;
		const by = rocket.y;
		const ivx = rocket.vx * 0.35;
		const ivy = rocket.vy * 0.35;

		const sphere = (n: number, speed: number, color: Rgb, opts: { life: number; drag: number; emit: number; crackle?: boolean; trail?: Rgb; size?: number; bright?: number }) => {
			for (let k = 0; k < n; k += 1) {
				const z = rand(-1, 1);
				const th = Math.random() * Math.PI * 2;
				const rr = Math.sqrt(1 - z * z);
				const s = speed * rand(0.88, 1.06);
				const i = this.spawn(
					SPARK,
					bx,
					by,
					ivx + Math.cos(th) * rr * s,
					ivy + Math.sin(th) * rr * s,
					opts.life * rand(0.85, 1.12),
					(opts.size ?? 1.5) * this.unit + 0.4,
					opts.drag,
					1,
					opts.bright ?? 1.25,
					color
				);
				if (i < 0) return;
				this.emit[i] = opts.emit;
				this.crackle[i] = opts.crackle ? 1 : 0;
				this.trail[i] = opts.trail === GOLD ? 1 : 0;
			}
		};

		switch (spec.kind) {
			case 'peony':
				sphere(110, v0, spec.color, { life: 1.9, drag: c, emit: 5 });
				break;
			case 'willow':
				sphere(80, v0 * 0.78, GOLD, { life: 3.4, drag: c * 1.35, emit: 18, trail: GOLD, size: 1.2, bright: 0.9 });
				break;
			case 'double':
				sphere(80, v0, spec.color, { life: 2.0, drag: c, emit: 4 });
				sphere(45, v0 * 0.55, spec.color2, { life: 1.8, drag: c, emit: 3 });
				break;
			case 'crackle':
				sphere(90, v0 * 0.95, spec.color, { life: 2.3, drag: c * 1.1, emit: 12, crackle: true });
				break;
			case 'ring': {
				const tilt = rand(0.35, 1.2);
				const roll = Math.random() * Math.PI;
				const cr = Math.cos(roll);
				const sr = Math.sin(roll);
				const n = 64;
				for (let k = 0; k < n; k += 1) {
					const th = (k / n) * Math.PI * 2 + rand(-0.02, 0.02);
					const px = Math.cos(th);
					const py = Math.sin(th) * Math.cos(tilt);
					const s = v0 * rand(0.96, 1.02);
					const i = this.spawn(
						SPARK,
						bx,
						by,
						ivx + (px * cr - py * sr) * s,
						ivy + (px * sr + py * cr) * s,
						rand(1.8, 2.1),
						1.6 * this.unit + 0.4,
						c,
						1,
						1.35,
						spec.color
					);
					if (i < 0) break;
					this.emit[i] = 4;
				}
				sphere(24, v0 * 0.25, spec.color2, { life: 1.5, drag: c, emit: 0 });
				break;
			}
		}

		const flash: Rgb = [0.6 + 0.4 * spec.color[0], 0.6 + 0.4 * spec.color[1], 0.6 + 0.4 * spec.color[2]];
		this.spawn(FLASH, bx, by, 0, 0, 0.3, R * 0.75, 0, 0, 0.55, flash);

		const tint: Rgb = [0.42 + 0.2 * spec.color[0], 0.4 + 0.2 * spec.color[1], 0.48 + 0.2 * spec.color[2]];
		for (let k = 0; k < 7; k += 1) {
			const z = rand(-1, 1);
			const th = Math.random() * Math.PI * 2;
			const rr = Math.sqrt(1 - z * z) * rand(0.2, 1);
			this.spawn(
				SMOKE,
				bx + Math.cos(th) * rr * R * 0.3,
				by + Math.sin(th) * rr * R * 0.3,
				Math.cos(th) * rr * v0 * 0.35,
				Math.sin(th) * rr * v0 * 0.35,
				rand(3.2, 4.4),
				R * rand(0.32, 0.55),
				6 / R,
				-0.035,
				rand(0.05, 0.08),
				tint
			);
		}

		this.glow[0] += spec.color[0] * 0.12;
		this.glow[1] += spec.color[1] * 0.12;
		this.glow[2] += spec.color[2] * 0.12;
	}

	step(dt: number, wind: number) {
		const g = this.gravity;
		const u = this.unit;

		const decay = Math.exp(-dt * 3);
		this.glow[0] *= decay;
		this.glow[1] *= decay;
		this.glow[2] *= decay;

		const rockets = this.rockets;
		for (let k = rockets.length - 1; k >= 0; k -= 1) {
			const rk = rockets[k]!;
			const sp = Math.hypot(rk.vx, rk.vy);
			const damp = 1 / (1 + 0.00035 * sp * dt);
			rk.vx = rk.vx * damp + wind * 0.2 * dt;
			rk.vy = rk.vy * damp + g * dt;
			rk.x += rk.vx * dt;
			rk.y += rk.vy * dt;
			rk.age += dt;
			rk.emit += dt * 90;
			while (rk.emit >= 1) {
				rk.emit -= 1;
				this.spawn(
					EMBER,
					rk.x + rand(-1, 1),
					rk.y + rand(-1, 1),
					rk.vx * 0.15 + rand(-28, 28) * u,
					rk.vy * 0.15 + rand(20, 70) * u,
					rand(0.3, 0.6),
					1.1 * u + 0.35,
					0.02 / u,
					0.5,
					0.8,
					[1, 0.72, 0.42]
				);
			}
			if (rk.vy > -18 * u || rk.age > 4) {
				this.burst(rk);
				rockets.splice(k, 1);
			}
		}

		const n = this.count;
		for (let i = 0; i < n; i += 1) {
			const vx = this.vx[i]!;
			const vy = this.vy[i]!;
			const sp = Math.hypot(vx, vy);
			const damp = 1 / (1 + this.drag[i]! * sp * dt);
			const gr = this.grav[i]!;
			const nvx = vx * damp + wind * (this.kind[i] === SMOKE ? 1 : 0.35) * dt;
			const nvy = vy * damp + g * gr * dt;
			this.vx[i] = nvx;
			this.vy[i] = nvy;
			this.x[i] += nvx * dt;
			this.y[i] += nvy * dt;
			this.age[i] += dt;

			const rate = this.emit[i]!;
			if (rate > 0 && this.age[i]! < this.life[i]! * 0.9) {
				this.acc[i] += rate * dt;
				while (this.acc[i]! >= 1) {
					this.acc[i] -= 1;
					const gold = this.trail[i] === 1;
					this.spawn(
						EMBER,
						this.x[i]!,
						this.y[i]!,
						nvx * 0.08 + rand(-8, 8) * u,
						nvy * 0.08 + rand(-8, 8) * u,
						gold ? rand(0.9, 1.6) : rand(0.35, 0.7),
						(gold ? 1.0 : 0.9) * u + 0.3,
						this.drag[i]! * 3,
						gold ? 0.35 : 0.2,
						gold ? 0.55 : 0.45,
						gold ? GOLD : [this.r[i]!, this.g[i]!, this.b[i]!]
					);
				}
			}
		}

		let w = 0;
		for (let i = 0; i < this.count; i += 1) {
			if (this.age[i]! >= this.life[i]!) {
				if (this.kind[i] === SPARK && this.crackle[i] === 1) {
					for (let k = 0; k < 2; k += 1) {
						this.spawnPop(this.x[i]!, this.y[i]!);
					}
				}
				continue;
			}
			if (w !== i) this.move(i, w);
			w += 1;
		}
		this.count = w;
		this.flushPops();
	}

	private pops: number[] = [];

	private spawnPop(x: number, y: number) {
		this.pops.push(x, y);
	}

	private flushPops() {
		const u = this.unit;
		for (let k = 0; k < this.pops.length; k += 2) {
			this.spawn(
				POP,
				this.pops[k]! + rand(-3, 3) * u,
				this.pops[k + 1]! + rand(-3, 3) * u,
				rand(-40, 40) * u,
				rand(-40, 40) * u,
				rand(0.08, 0.16),
				1.7 * u + 0.4,
				0.03 / u,
				0.2,
				2.2,
				[1, 0.96, 0.82]
			);
		}
		this.pops.length = 0;
	}

	private move(from: number, to: number) {
		this.x[to] = this.x[from]!;
		this.y[to] = this.y[from]!;
		this.vx[to] = this.vx[from]!;
		this.vy[to] = this.vy[from]!;
		this.age[to] = this.age[from]!;
		this.life[to] = this.life[from]!;
		this.size[to] = this.size[from]!;
		this.drag[to] = this.drag[from]!;
		this.grav[to] = this.grav[from]!;
		this.bright[to] = this.bright[from]!;
		this.emit[to] = this.emit[from]!;
		this.acc[to] = this.acc[from]!;
		this.r[to] = this.r[from]!;
		this.g[to] = this.g[from]!;
		this.b[to] = this.b[from]!;
		this.kind[to] = this.kind[from]!;
		this.crackle[to] = this.crackle[from]!;
		this.trail[to] = this.trail[from]!;
	}

	/** Packs live particles and rocket heads into the instance buffer. */
	pack(intensity: number) {
		const d = this.data;
		let o = 0;
		const put = (x: number, y: number, tx: number, ty: number, r: number, g: number, b: number, a: number, size: number, soft: number) => {
			d[o] = x;
			d[o + 1] = y;
			d[o + 2] = tx;
			d[o + 3] = ty;
			d[o + 4] = r;
			d[o + 5] = g;
			d[o + 6] = b;
			d[o + 7] = a;
			d[o + 8] = size;
			d[o + 9] = soft;
			o += INSTANCE;
		};

		for (let i = 0; i < this.count; i += 1) {
			const kind = this.kind[i]!;
			const age = this.age[i]!;
			const life = this.life[i]!;
			const t = age / life;
			let r = this.r[i]!;
			let g = this.g[i]!;
			let b = this.b[i]!;
			let k = this.bright[i]! * intensity;
			let streak = 0;
			let a = 0;
			let size = this.size[i]!;
			let soft = 0;

			if (kind === SPARK) {
				const heat = Math.max(0, 1 - age / 0.25);
				r += (1 - r) * heat * 0.65;
				g += (1 - g) * heat * 0.65;
				b += (1 - b) * heat * 0.65;
				k *= t < 0.5 ? 1 : 1 - (t - 0.5) / 0.5;
				if (this.crackle[i] === 1 && t > 0.4) k *= Math.random() > 0.45 ? 1.5 : 0.15;
				streak = 0.045;
			} else if (kind === EMBER) {
				k *= (1 - t) * (1 - t);
				streak = 0.02;
			} else if (kind === POP) {
				k *= 1 - t;
			} else if (kind === FLASH) {
				k *= (1 - t) * (1 - t);
				soft = 1;
				size *= 0.7 + 0.5 * t;
			} else {
				const fade = Math.min(1, age / 0.4) * (1 - t);
				a = k * fade;
				k = a * 1.1;
				a *= 0.55;
				soft = 1;
				size *= 1 + t * 0.9;
			}
			if (k <= 0.002 && a <= 0.002) continue;
			put(this.x[i]!, this.y[i]!, -this.vx[i]! * streak, -this.vy[i]! * streak, r * k, g * k, b * k, a, size, soft);
		}

		for (const rk of this.rockets) {
			const s = 1.6 * this.unit + 0.5;
			put(rk.x, rk.y, -rk.vx * 0.05, -rk.vy * 0.05, 1.4 * intensity, 1.1 * intensity, 0.75 * intensity, 0, s, 0);
		}

		this.instanceCount = o / INSTANCE;
	}

	draw(width: number, height: number) {
		if (!this.instanceCount) return;
		const gl = this.gl;
		gl.useProgram(this.program);
		gl.uniform2f(this.uRes, width, height);
		gl.bindVertexArray(this.vao);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.instances);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data, 0, this.instanceCount * INSTANCE);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.instanceCount);
		gl.disable(gl.BLEND);
		gl.bindVertexArray(null);
	}

	dispose() {
		const gl = this.gl;
		gl.deleteVertexArray(this.vao);
		gl.deleteBuffer(this.corners);
		gl.deleteBuffer(this.instances);
		gl.deleteProgram(this.program);
		for (const s of this.shaders) gl.deleteShader(s);
	}
}
