<script lang="ts">
	import { untrack } from 'svelte';

	let {
		quiet = false,
		calm = false,
		rush = 0,
		gust = null
	}: {
		/** Neon spoke field in CSS px: centre and elliptical radii, usually the cabinet stage. */
		gust?: { x: number; y: number; rx: number; ry: number } | null;
		/** Tab hidden — stop drawing. */
		quiet?: boolean;
		/** Reduced motion — draw a single still frame. */
		calm?: boolean;
		/** Signed cabinet-wheel speed; the room streams sideways with it. */
		rush?: number;
	} = $props();

	let failed = $state(false);

	const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

	// Everything is computed in CSS pixels with y pointing down, so positions match the old CSS layers.
	const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uDpr;
uniform float uTime;
uniform float uLamps;
uniform float uShift;
uniform float uRush;
uniform vec4 uGust;
uniform float uGustSpin;
uniform float uGustAmt;
out vec4 outColor;

const vec3 PINK = vec3(1.0, 0.169, 0.839);
const vec3 CYAN = vec3(0.0, 0.941, 1.0);
const vec3 GOLD = vec3(1.0, 0.882, 0.29);

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec3 palette(float k) {
  return k < 0.34 ? PINK : k < 0.67 ? CYAN : GOLD;
}

float segment(vec2 p, vec2 a, vec2 b, out float h) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

float glowEllipse(vec2 p, vec2 c, vec2 r, float stop) {
  float d = length((p - c) / r);
  return clamp(1.0 - d / stop, 0.0, 1.0);
}

float roundBox(vec2 p, vec2 c, vec2 extent, float rad) {
  vec2 q = abs(p - c) - extent + rad;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - rad;
}

void main() {
  vec2 frag = gl_FragCoord.xy / uDpr;
  vec2 p = vec2(frag.x, uRes.y - frag.y);
  float w = uRes.x;
  float h = uRes.y;
  float t = uTime;

  // Base vertical gradient.
  float v = p.y / h;
  vec3 col = v < 0.42
    ? mix(vec3(0.078, 0.0, 0.133), vec3(0.027, 0.0, 0.078), v / 0.42)
    : mix(vec3(0.027, 0.0, 0.078), vec3(0.071, 0.031, 0.122), (v - 0.42) / 0.58);

  // Corner glows.
  col = mix(col, vec3(1.0, 0.169, 0.839), 0.28 * glowEllipse(p, vec2(0.18 * w, -0.1 * h), vec2(900.0, 520.0), 0.58));
  col = mix(col, vec3(0.0, 0.941, 1.0), 0.20 * glowEllipse(p, vec2(0.88 * w, 0.0), vec2(820.0, 540.0), 0.52));
  col = mix(col, vec3(1.0, 0.882, 0.29), 0.10 * glowEllipse(p, vec2(0.5 * w, 1.2 * h), vec2(700.0, 480.0), 0.60));

  // Breathing haze.
  float breathe = 0.825 + 0.175 * cos(t * 6.2831853 / 7.0);
  col = mix(col, vec3(0.353, 0.078, 0.471), 0.35 * breathe * glowEllipse(p, vec2(0.5 * w, 0.8 * h), vec2(0.75 * w, 0.75 * h), 0.55));

  // Colour clouds roaming the whole room.
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 c = vec2(
      w * (0.5 + 0.48 * sin(t * (0.09 + 0.03 * fi) + fi * 2.1)),
      h * (0.45 + 0.4 * sin(t * (0.07 + 0.025 * fi) + fi * 1.3 + 1.0))
    );
    float r = 0.38 * max(w, h);
    col += palette(fract(fi * 0.37 + 0.1)) * exp(-dot(p - c, p - c) / (r * r * 0.3)) * 0.09;
  }

  // Searchlights sweeping up from the floor corners.
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    float side = i == 0 ? 1.0 : -1.0;
    vec2 o = vec2(i == 0 ? 0.08 * w : 0.92 * w, h + 60.0);
    float ang = -1.5708 + side * (0.5 + 0.42 * sin(t * 0.36 + fi * 2.4));
    vec2 dir = vec2(cos(ang), sin(ang));
    vec2 d = p - o;
    float along = dot(d, dir);
    if (along > 0.0) {
      float perp = abs(d.x * dir.y - d.y * dir.x);
      float width = 26.0 + along * 0.15;
      col += (i == 0 ? PINK : CYAN) * exp(-perp * perp / (width * width)) * exp(-along / (h * 1.2)) * 0.2;
    }
  }

  // Perspective floor grid.
  float horizon = h * 0.52;
  if (p.y > horizon) {
    float ty = (p.y - horizon) / (h - horizon);
    float depth = 1.0 / max(ty, 0.02);
    float drift = t * 64.0 / 18.0;
    vec2 world = vec2((p.x - 0.5 * w) * depth * 0.55 + drift + uShift * 0.8, depth * 120.0 + drift * 2.0);
    vec2 cell = world / 64.0;
    vec2 fw = fwidth(cell);
    vec2 g = abs(fract(cell - 0.5) - 0.5) / max(fw, vec2(1e-4));
    float lineZ = 1.0 - clamp(g.y, 0.0, 1.0);
    float lineX = 1.0 - clamp(g.x, 0.0, 1.0);
    float fade = smoothstep(0.0, 0.22, ty) * (1.0 - smoothstep(0.82, 1.08, ty));
    float far = clamp(1.0 - fw.y * 1.5, 0.0, 1.0);
    float wave = exp(-pow((ty - fract(t * 0.22)) * 7.0, 2.0));
    float boost = 1.0 + 2.2 * wave + 1.5 * uRush;
    col = mix(col, CYAN, clamp(0.22 * lineZ * fade * far * boost, 0.0, 1.0));
    col = mix(col, PINK, clamp(0.16 * lineX * fade * far * boost, 0.0, 1.0));
  }

  // Carpet strip along the bottom.
  float carpetTop = h * 0.82;
  if (p.y > carpetTop && p.x > 0.08 * w && p.x < 0.92 * w) {
    float band = mod(floor(p.x / 12.0), 2.0);
    vec4 stripe = band < 0.5 ? vec4(0.353, 0.078, 0.314, 0.35) : vec4(0.157, 0.031, 0.196, 0.25);
    float mask = smoothstep(0.0, 0.4, (p.y - carpetTop) / (h - carpetTop));
    col = mix(col, stripe.rgb, stripe.a * mask * 0.55);
  }

  // Bokeh orbs drifting across the whole screen.
  {
    vec2 q = p + vec2(t * 18.0 + uShift * 0.35, -t * 10.0);
    vec2 base = floor(q / 200.0);
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 id = base + vec2(float(x), float(y));
        float seed = hash21(id);
        if (seed < 0.45) continue;
        vec2 c = (id + 0.5 + 0.35 * vec2(sin(t * 0.4 + seed * 20.0), cos(t * 0.33 + seed * 13.0))) * 200.0;
        float r = 12.0 + 30.0 * hash21(id + 7.1);
        float d = length(q - c);
        float disk = 1.0 - smoothstep(r - 2.0, r, d);
        float rim = exp(-abs(d - r + 2.0) / 2.5) * (1.0 - smoothstep(r, r + 3.0, d));
        float pulse = 0.6 + 0.4 * sin(t * 1.3 + seed * 30.0);
        col += palette(hash21(id + 3.3)) * (disk * 0.07 + rim * 0.1) * pulse;
      }
    }
  }

  // Sparkles rising everywhere; they smear sideways while the wheel spins.
  {
    vec2 s = p + vec2(uShift * 0.9 + 20.0 * sin(t * 0.3), t * 34.0);
    vec2 sc = floor(s / 64.0);
    float seed = hash21(sc + 11.0);
    if (seed > 0.5) {
      vec2 c = (sc + 0.2 + 0.6 * vec2(hash21(sc + 1.7), hash21(sc + 4.2))) * 64.0;
      vec2 dd = s - c;
      dd.x /= 1.0 + uRush * 7.0;
      float tw = 0.5 + 0.5 * sin(t * (2.0 + 3.0 * seed) + seed * 40.0);
      col += palette(fract(seed * 7.0)) * exp(-dot(dd, dd) / 3.0) * (0.35 + 0.65 * tw) * 0.9;
    }
  }

  // Shooting streaks crossing the room.
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float period = 5.5 + fi * 1.7;
    float clock = (t + fi * 2.3) / period;
    float phase = fract(clock);
    if (phase < 0.3) {
      float k = phase / 0.3;
      float seed = floor(clock) + fi * 17.0;
      vec2 a = vec2(hash21(vec2(seed, 1.0)) * w, -40.0);
      vec2 b = vec2(a.x + (hash21(vec2(seed, 2.0)) - 0.5) * 1.4 * w, h * (0.55 + 0.3 * hash21(vec2(seed, 3.0))));
      vec2 head = mix(a, b, k);
      vec2 dir = normalize(b - a);
      float along;
      float d = segment(p, head - dir * 240.0, head, along);
      float life = sin(k * 3.14159);
      col += palette(fract(seed * 0.13)) * exp(-d * d / (2.0 + 10.0 * along)) * along * along * life * 0.9;
      col += vec3(1.0) * exp(-dot(p - head, p - head) / 10.0) * life * 0.8;
    }
  }

  // Floating motes.
  for (int i = 0; i < 18; i++) {
    float fi = float(i);
    float phase = fract((t + fi * 0.28) / 5.4);
    float s = 0.5 - 0.5 * cos(phase * 6.2831853);
    bool gold = mod(fi, 2.0) < 0.5;
    float r = gold ? 3.0 : 2.0;
    vec3 tint = gold ? vec3(1.0, 0.882, 0.29) : vec3(0.0, 0.941, 1.0);
    vec2 c = vec2(w * (0.06 + fi * 0.051) + 3.0 + 12.0 * s, h * 0.88 - 3.0 - 46.0 * s);
    float d = length(p - c);
    float core = 1.0 - smoothstep(r - 0.75, r + 0.75, d);
    float halo = exp(-max(d - r, 0.0) * max(d - r, 0.0) / 32.0) * 0.6;
    float a = 0.45 * (0.2 + 0.6 * s);
    col = mix(col, tint, clamp((core + halo) * a, 0.0, 1.0));
  }

  // Ceiling shade.
  col *= 1.0 - 0.55 * clamp(1.0 - p.y / (0.18 * h), 0.0, 1.0);

  // Lamp cones (hidden on narrow screens).
  if (uLamps > 0.5) {
    float coneH = 0.42 * h;
    if (p.y < coneH) {
      float k = p.y / coneH;
      float halfW = mix(0.12, 0.5, k) * 90.0;
      float fall = clamp(1.0 - k / 0.7, 0.0, 1.0) * 0.7;
      float ca = 0.18 * w + 45.0;
      float cb = w - 0.18 * w - 45.0;
      col = mix(col, vec3(1.0, 0.882, 0.29), 0.16 * fall * step(abs(p.x - ca), halfW));
      col = mix(col, vec3(0.0, 0.941, 1.0), 0.14 * fall * step(abs(p.x - cb), halfW));
    }
  }

  // Neon pipes.
  vec3 pipeCol[3] = vec3[3](vec3(1.0, 0.169, 0.839), vec3(0.0, 0.941, 1.0), vec3(1.0, 0.882, 0.29));
  vec4 pipe[3] = vec4[3](
    vec4(0.08 * w, 10.0, 0.28 * w, 8.0),
    vec4(0.38 * w, 22.0, 0.26 * w, 8.0),
    vec4(0.70 * w, 10.0, 0.22 * w, 8.0)
  );
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec4 b = pipe[i];
    vec2 halfSize = b.zw * 0.5;
    vec2 center = b.xy + halfSize;

    // Lasers that flash on and sweep down from each pipe.
    float on = smoothstep(0.25, 0.65, sin(t * 0.8 + fi * 1.9));
    if (on > 0.0) {
      float ang = 1.5708 + 0.85 * sin(t * 0.55 + fi * 2.1);
      vec2 dir = vec2(cos(ang), sin(ang));
      vec2 d = p - center;
      float along = dot(d, dir);
      if (along > 0.0) {
        float perp = abs(d.x * dir.y - d.y * dir.x);
        float beam = exp(-perp * perp / 1.6) * 0.8 + exp(-perp / 9.0) * 0.22;
        col += pipeCol[i] * beam * exp(-along / (h * 0.85)) * on * 0.55;
      }
    }

    float d = roundBox(p, center, halfSize, 4.0);
    float body = 1.0 - smoothstep(-0.75, 0.75, d);
    float chase = 0.7 + 0.6 * (0.5 + 0.5 * sin(p.x * 0.045 - t * 5.0 + fi * 2.0));
    float glow = exp(-max(d, 0.0) / 7.0) * 0.55 * chase;
    col = mix(col, pipeCol[i] * mix(0.85, 1.15, chase - 0.7), clamp(body + glow * (1.0 - body), 0.0, 1.0));
  }

  // Neon gust: fine cyan / gold / pink spokes fanning out from behind the wheel, turning with it.
  if (uGust.z > 1.0 && uGustAmt > 0.0) {
    vec2 d = p - uGust.xy;
    float r = length(d / uGust.zw);
    float mask = smoothstep(0.08, 0.4, r) * (1.0 - smoothstep(0.45, 0.95, r));
    if (mask > 0.0) {
      float deg = mod(degrees(atan(d.y, d.x) - uGustSpin) - 8.0, 32.0);
      float soft = 1.6 / max(length(d) * 0.01745, 1e-3);
      float cy = 1.0 - smoothstep(1.0, 1.0 + soft, abs(deg - 5.0));
      float gd = 1.0 - smoothstep(1.0, 1.0 + soft, abs(deg - 13.0));
      float pk = 1.0 - smoothstep(1.0, 1.0 + soft, abs(deg - 21.0));
      vec3 spokes = (CYAN * cy * 0.95 + GOLD * gd * 0.82 + PINK * pk * 0.9) * mask * uGustAmt;
      col += spokes * (1.0 - col);
    }
  }

  // Scanlines.
  float scan = step(mod(p.y + t * 2.0, 3.0), 1.0);
  col += scan * 0.022;

  outColor = vec4(col, 1.0);
}`;

	function compile(gl: WebGL2RenderingContext, type: number, src: string) {
		const shader = gl.createShader(type);
		if (!shader) return null;
		gl.shaderSource(shader, src);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			console.warn('[hall backdrop]', gl.getShaderInfoLog(shader));
			gl.deleteShader(shader);
			return null;
		}
		return shader;
	}

	function backdrop(canvas: HTMLCanvasElement) {
		const gl = canvas.getContext('webgl2', {
			alpha: false,
			antialias: false,
			depth: false,
			stencil: false,
			powerPreference: 'low-power',
			preserveDrawingBuffer: false
		});
		if (!gl) {
			failed = true;
			return;
		}

		const vs = compile(gl, gl.VERTEX_SHADER, VERT);
		const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
		const program = gl.createProgram();
		if (!vs || !fs || !program) {
			failed = true;
			return;
		}
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			console.warn('[hall backdrop]', gl.getProgramInfoLog(program));
			failed = true;
			return;
		}
		gl.useProgram(program);

		const buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
		const aPos = gl.getAttribLocation(program, 'aPos');
		gl.enableVertexAttribArray(aPos);
		gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

		const uRes = gl.getUniformLocation(program, 'uRes');
		const uDpr = gl.getUniformLocation(program, 'uDpr');
		const uTime = gl.getUniformLocation(program, 'uTime');
		const uLamps = gl.getUniformLocation(program, 'uLamps');
		const uShift = gl.getUniformLocation(program, 'uShift');
		const uRush = gl.getUniformLocation(program, 'uRush');
		const uGust = gl.getUniformLocation(program, 'uGust');
		const uGustSpin = gl.getUniformLocation(program, 'uGustSpin');
		const uGustAmt = gl.getUniformLocation(program, 'uGustAmt');
		let gustSpin = 0;

		let cssW = 0;
		let cssH = 0;
		let dpr = 1;
		let raf = 0;
		let shift = 0;
		let lastDraw = 0;
		const t0 = performance.now();

		const draw = (now: number) => {
			if (!cssW || !cssH) return;
			const dt = lastDraw ? Math.min(0.1, (now - lastDraw) / 1000) : 0;
			lastDraw = now;
			const speed = untrack(() => rush);
			shift += speed * dt * 240;
			gl.uniform2f(uRes, cssW, cssH);
			gl.uniform1f(uDpr, dpr);
			gl.uniform1f(uTime, calm ? 0 : (now - t0) / 1000);
			gl.uniform1f(uLamps, cssW > 860 ? 1 : 0);
			gl.uniform1f(uShift, shift);
			gl.uniform1f(uRush, Math.min(1, Math.abs(speed) / 2.5));
			const whirl = Math.min(1, Math.abs(speed) / 1.2);
			if (!calm) gustSpin = (gustSpin + (0.12 + speed * 1.1) * dt) % (Math.PI * 2);
			const flicker = whirl > 0.08 && Math.floor(now / 70) % 2 ? 0.88 : 1;
			const box = untrack(() => gust);
			gl.uniform4f(uGust, box?.x ?? 0, box?.y ?? 0, box?.rx ?? 0, box?.ry ?? 0);
			gl.uniform1f(uGustSpin, gustSpin);
			gl.uniform1f(uGustAmt, (0.4 + 0.8 * whirl) * flicker);
			gl.drawArrays(gl.TRIANGLES, 0, 3);
		};

		const loop = (now: number) => {
			raf = requestAnimationFrame(loop);
			draw(now);
		};

		const sync = () => {
			cancelAnimationFrame(raf);
			raf = 0;
			if (quiet) return;
			if (calm) draw(performance.now());
			else raf = requestAnimationFrame(loop);
		};

		const resize = () => {
			const rect = canvas.getBoundingClientRect();
			// Soft background: capping resolution keeps fill cost low on retina panels.
			dpr = Math.min(window.devicePixelRatio || 1, 1.5);
			cssW = rect.width;
			cssH = rect.height;
			const pxW = Math.max(1, Math.round(cssW * dpr));
			const pxH = Math.max(1, Math.round(cssH * dpr));
			if (canvas.width !== pxW || canvas.height !== pxH) {
				canvas.width = pxW;
				canvas.height = pxH;
				gl.viewport(0, 0, pxW, pxH);
			}
			draw(performance.now());
		};

		const observer = new ResizeObserver(resize);
		observer.observe(canvas);
		untrack(resize);

		const onLost = (event: Event) => {
			event.preventDefault();
			cancelAnimationFrame(raf);
			failed = true;
		};
		canvas.addEventListener('webglcontextlost', onLost);

		$effect(() => {
			void quiet;
			void calm;
			void gust;
			sync();
		});

		return () => {
			cancelAnimationFrame(raf);
			observer.disconnect();
			canvas.removeEventListener('webglcontextlost', onLost);
			gl.deleteBuffer(buffer);
			gl.deleteProgram(program);
			gl.deleteShader(vs);
			gl.deleteShader(fs);
		};
	}
</script>

{#if failed}
	<div class="backdrop fallback" aria-hidden="true"></div>
{:else}
	<canvas class="backdrop" aria-hidden="true" {@attach backdrop}></canvas>
{/if}

<style>
	.backdrop {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		z-index: 0;
		display: block;
		pointer-events: none;
	}

	.fallback {
		background:
			radial-gradient(900px 520px at 18% -10%, rgba(255, 43, 214, 0.28), transparent 58%),
			radial-gradient(820px 540px at 88% 0%, rgba(0, 240, 255, 0.2), transparent 52%),
			radial-gradient(700px 480px at 50% 120%, rgba(255, 225, 74, 0.1), transparent 60%),
			linear-gradient(180deg, #140022 0%, #070014 42%, #12081f 100%);
	}
</style>
