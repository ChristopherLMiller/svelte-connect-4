<script lang="ts">
	import { untrack } from 'svelte';
	import { createFullscreenPass } from '$lib/gl/fullscreen';
	import { createPacer } from '$lib/gl/pace';
	import type { KoiSession } from '../session.svelte';

	type Mood = 'menu' | 'play' | 'dim' | 'bright';

	let {
		session,
		mood = 'menu',
		danger = 0
	}: {
		session: KoiSession;
		mood?: Mood;
		/** 0–1, how close the blooms are to the lily pad. */
		danger?: number;
	} = $props();

	let failed = $state(false);

	const RIPPLES = 10;

	const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uDim;
uniform float uBright;
uniform float uDanger;
uniform vec4 uRip[${RIPPLES}];
out vec4 outColor;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec2 hash22(vec2 p) {
  float n = hash21(p);
  return vec2(n, hash21(p + n + 7.1));
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + 11.7;
    a *= 0.5;
  }
  return v;
}

/** Pebbles on the bed: distance to the nearest stone edge and that stone's id. */
vec3 pebbles(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float best = 9.0;
  float second = 9.0;
  vec2 id = vec2(0.0);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = hash22(i + g) * 0.8 + 0.1;
      float d = length(g + o - f);
      if (d < best) {
        second = best;
        best = d;
        id = i + g;
      } else if (d < second) {
        second = d;
      }
    }
  }
  return vec3(second - best, id);
}

/** Bright sun lines thrown on the bed through the moving surface. */
float caustic(vec2 p, float t) {
  vec2 q = p;
  float c = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    q += vec2(sin(q.y * 1.7 + t * 0.6 + fi), cos(q.x * 1.5 - t * 0.5 + fi * 2.0)) * 0.45;
    c += 1.0 / (1.0 + 40.0 * abs(sin(q.x + q.y * 0.6 + t * 0.3) * cos(q.y - q.x * 0.4)));
  }
  return c / 3.0;
}

/** One koi, swimming a slow loop. Returns body (x), pattern (y), and fin (z) coverage. */
vec3 koi(vec2 s, float t, float seed, float size, out float shade) {
  float sp = 0.07 + seed * 0.02;
  float ph = seed * 6.283;
  vec2 A = vec2(0.62 + 0.25 * fract(seed * 3.7), 0.34 + 0.08 * fract(seed * 5.3));
  vec2 w = vec2(sp, sp * (1.6 + fract(seed * 2.1) * 0.6));
  vec2 pos = vec2(A.x * sin(t * w.x + ph), A.y * sin(t * w.y + ph * 1.7));
  vec2 vel = vec2(A.x * w.x * cos(t * w.x + ph), A.y * w.y * cos(t * w.y + ph * 1.7));
  vec2 dir = normalize(vel + 1e-4);
  vec2 rel = s - pos;
  if (dot(rel, rel) > size * size * 2.8) {
    shade = 0.0;
    return vec3(0.0);
  }
  vec2 lp = vec2(dot(rel, dir), dot(rel, vec2(-dir.y, dir.x))) / size;
  // The body bends in a travelling wave, more toward the tail.
  float tailward = clamp(-lp.x * 0.5 + 0.5, 0.0, 1.0);
  lp.y += sin(t * 5.0 + seed * 9.0 - lp.x * 2.4) * 0.13 * tailward * tailward;
  float u = lp.x;
  float half_ = 0.27 * pow(max(0.0, 1.0 - u * u), 0.55) * (u > 0.0 ? 1.0 : 0.82);
  float body = smoothstep(0.03, 0.0, abs(lp.y) - half_) * step(-1.0, u) * step(u, 1.0);
  // Forked tail fin.
  vec2 tp = lp - vec2(-1.05, 0.0);
  float fan = smoothstep(0.02, -0.02, abs(tp.y) - (-tp.x) * 0.9) * step(tp.x, 0.0) * step(-0.42, tp.x);
  fan *= 1.0 - smoothstep(0.1, 0.0, abs(tp.y) - (-tp.x - 0.3) * 0.8) * step(tp.x, -0.24) * 0.85;
  // Pectoral fins, sweeping out behind the head.
  vec2 fp = vec2(lp.x - 0.35, abs(lp.y) - 0.3);
  float pec = smoothstep(0.02, 0.0, length(fp * vec2(1.4, 2.6)) - 0.18);
  float pattern = smoothstep(0.45, 0.6, noise(lp * 2.6 + seed * 40.0));
  shade = body;
  return vec3(body, pattern, max(fan, pec) * 0.75);
}

/** A lily pad with its notch, turning slowly. Returns coverage and vein shade. */
vec2 pad(vec2 s, vec2 c, float r, float turn) {
  vec2 d = s - c;
  float a = atan(d.y, d.x) + turn;
  float wrapped = abs(mod(a + 3.14159, 6.28318) - 3.14159);
  float edge = r * (0.97 + 0.03 * sin(a * 7.0));
  float inside = smoothstep(0.004, 0.0, length(d) - edge);
  float notch = smoothstep(0.14, 0.2, wrapped);
  float vein = 0.5 + 0.5 * cos(a * 14.0);
  return vec2(inside * notch, vein);
}

float lotus(vec2 s, vec2 c, float r) {
  vec2 d = s - c;
  float a = atan(d.y, d.x);
  float petals = r * (0.55 + 0.45 * abs(cos(a * 4.0)));
  return smoothstep(0.004, 0.0, length(d) - petals);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 s = (frag - 0.5 * uRes) / uRes.y;
  float t = uTime;

  // Ripples from the game bend the light passing through the surface.
  vec2 bend = vec2(0.0);
  float glint = 0.0;
  for (int i = 0; i < ${RIPPLES}; i++) {
    vec4 r = uRip[i];
    if (r.w <= 0.0) continue;
    float age = t - r.z;
    if (age < 0.0 || age > 3.2) continue;
    vec2 d = s - r.xy;
    float dist = length(d);
    float radius = age * 0.32;
    float fade = (1.0 - age / 3.2) * r.w;
    float ring = sin((dist - radius) * 70.0) * exp(-pow((dist - radius) * 14.0, 2.0)) * fade;
    bend += d / max(dist, 1e-3) * ring * 0.012;
    glint += max(0.0, ring) * 0.4;
  }

  // The surface: a slow swell refracts everything under it.
  vec2 swell = vec2(fbm(s * 3.0 + t * 0.05), fbm(s * 3.0 - t * 0.04 + 4.0)) - 0.5;
  vec2 bed = s + swell * 0.02 + bend;

  // The bed: smooth river pebbles under green-tinted water.
  vec3 pb = pebbles(bed * 22.0);
  float tone = hash21(pb.yz);
  vec3 stone = mix(vec3(0.46, 0.48, 0.38), vec3(0.66, 0.6, 0.46), tone);
  stone = mix(stone, vec3(0.34, 0.4, 0.34), step(0.8, hash21(pb.yz + 3.0)));
  stone *= 0.62 + 0.38 * sqrt(smoothstep(0.0, 0.45, pb.x));
  float deep = fbm(s * 1.4);
  vec3 water = mix(vec3(0.12, 0.46, 0.44), vec3(0.2, 0.56, 0.48), deep);
  vec3 c = mix(stone, water, mix(0.7, 0.86, deep));

  // Sunlight through leaves: big soft dapples drifting with the breeze.
  float leaves = smoothstep(0.35, 0.7, fbm(s * 1.6 + vec2(t * 0.012, -t * 0.008)));
  float sun = mix(0.72, 1.12, leaves);
  float cs = caustic(bed * 7.0, t) * (0.6 + 0.6 * leaves);
  c *= sun;
  c += vec3(0.9, 1.0, 0.8) * pow(cs, 2.0) * 0.32;

  // Koi under the surface, each with its shadow on the bed.
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float seed = fract(fi * 0.618 + 0.13);
    float size = 0.085 + 0.025 * fract(fi * 0.37);
    float shade;
    float tt = t + fi * 40.0;
    vec3 shadow = koi(bed - vec2(0.018, -0.026), tt, seed, size, shade);
    c *= 1.0 - 0.32 * max(shadow.x, shadow.z * 0.5);
    vec3 k = koi(bed, tt, seed, size, shade);
    vec3 base = i == 2 ? vec3(1.0, 0.82, 0.34) : vec3(0.98, 0.95, 0.9);
    vec3 spot = i == 2 ? vec3(1.0, 0.7, 0.2) : (i == 4 ? vec3(0.12, 0.1, 0.1) : vec3(0.98, 0.38, 0.12));
    vec3 fish = mix(base, spot, k.y);
    fish *= 0.82 + 0.3 * sun;
    c = mix(c, mix(c, fish, 0.9), k.x);
    c = mix(c, mix(c, fish * 1.05, 0.45), k.z * (1.0 - k.x));
  }

  // The surface glints where the sun catches the swell.
  float spec = pow(max(0.0, fbm(s * 9.0 + t * 0.12) - 0.55) * 2.4, 3.0);
  c += vec3(1.0, 0.98, 0.88) * (spec * 0.35 * leaves + glint);

  // Lily pads float on top, shading the water under them.
  float aspect = uRes.x / uRes.y;
  vec4 pads[6] = vec4[6](
    vec4(-0.48 * aspect, 0.34, 0.11, 0.3),
    vec4(-0.4 * aspect, 0.18, 0.06, 2.0),
    vec4(0.44 * aspect, -0.3, 0.12, 4.1),
    vec4(0.36 * aspect, -0.4, 0.07, 1.2),
    vec4(0.46 * aspect, 0.4, 0.08, 5.0),
    vec4(-0.45 * aspect, -0.38, 0.09, 3.3)
  );
  for (int i = 0; i < 6; i++) {
    vec4 p = pads[i];
    vec2 drift = vec2(sin(t * 0.05 + p.w), cos(t * 0.04 + p.w)) * 0.01;
    if (length(s - p.xy - drift) > p.z * 1.4) continue;
    vec2 sh = pad(s, p.xy + drift + vec2(0.012, -0.016), p.z, p.w + t * 0.01);
    c *= 1.0 - 0.3 * sh.x;
    vec2 pd = pad(s, p.xy + drift, p.z, p.w + t * 0.01);
    vec3 green = mix(vec3(0.18, 0.5, 0.2), vec3(0.36, 0.66, 0.26), fbm((s - p.xy) * 12.0));
    green *= 0.9 + 0.12 * pd.y;
    green *= 0.85 + 0.3 * leaves;
    c = mix(c, green, pd.x);
    if (i == 0 || i == 2) {
      vec2 lc = p.xy + drift + vec2(p.z * 0.25, p.z * 0.2);
      float fl = lotus(s, lc, p.z * 0.42);
      float inner = lotus(s, lc, p.z * 0.24);
      vec3 pink = mix(vec3(1.0, 0.62, 0.76), vec3(1.0, 0.86, 0.9), inner);
      c = mix(c, pink * (0.85 + 0.25 * leaves), fl);
      c = mix(c, vec3(1.0, 0.85, 0.35), smoothstep(0.004, 0.0, length(s - lc) - p.z * 0.07));
    }
  }

  // Maple leaves drifting across on the surface.
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float speed = 0.012 + fi * 0.004;
    float x = mod(t * speed + fi * 0.7, 1.0) * (aspect + 0.3) - (aspect + 0.3) * 0.5;
    vec2 lc = vec2(x, -0.3 + fi * 0.32 + sin(t * 0.1 + fi) * 0.05);
    vec2 d = s - lc;
    float rot = t * 0.08 + fi * 2.0;
    d = mat2(cos(rot), -sin(rot), sin(rot), cos(rot)) * d;
    float a = atan(d.y, d.x);
    float leaf = smoothstep(0.003, 0.0, length(d) - 0.022 * (0.5 + 0.5 * pow(abs(cos(a * 2.5)), 0.6)));
    c *= 1.0 - 0.18 * smoothstep(0.003, 0.0, length(d + vec2(0.006, -0.008)) - 0.02);
    c = mix(c, mix(vec3(0.92, 0.32, 0.12), vec3(0.98, 0.6, 0.18), fi * 0.5), leaf * 0.95);
  }

  c *= 1.0 + 0.12 * uBright;
  c = mix(c, c * vec3(1.05, 0.86, 0.84), uDanger * 0.35);

  vec2 v = frag / uRes - 0.5;
  c *= 1.0 - 0.5 * dot(v, v) * 1.4;
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(lum), c, 1.0 - 0.55 * uDim) * (1.0 - 0.3 * uDim);
  outColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

	function pond(canvas: HTMLCanvasElement) {
		const pass = createFullscreenPass(canvas, FRAG, 'koi pond');
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
		let dim = 0;
		let bright = 0;
		let warn = 0;
		const rips = new Float32Array(RIPPLES * 4);
		let ripAt = 0;

		const draw = (ms: number) => {
			if (!cssW || !cssH) return;
			const dt = Math.min(1 / 20, Math.max(0, (ms - last) / 1000));
			last = ms;
			const ease = (rate: number) => (calm ? 1 : 1 - Math.exp(-dt * rate));
			dim += ((mood === 'dim' ? 1 : 0) - dim) * ease(2);
			bright += ((mood === 'bright' ? 1 : 0) - bright) * ease(2);
			warn += (danger - warn) * ease(3);
			gl.useProgram(pass.program);
			gl.uniform2f(pass.uniform('uRes'), canvas.width, canvas.height);
			gl.uniform1f(pass.uniform('uTime'), calm ? 0 : (ms - t0) / 1000);
			gl.uniform1f(pass.uniform('uDim'), dim);
			gl.uniform1f(pass.uniform('uBright'), bright);
			gl.uniform1f(pass.uniform('uDanger'), warn);
			gl.uniform4fv(pass.uniform('uRip[0]'), rips);
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
			// Soft water: the shader is busy, so stay at or under one backing pixel per CSS pixel.
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

		const unsplash = session.onSplash((x, y, strength) => {
			if (calm || !cssW || !cssH) return;
			const i = ripAt % RIPPLES;
			ripAt += 1;
			rips[i * 4] = (x - 0.5) * (cssW / cssH);
			rips[i * 4 + 1] = 0.5 - y;
			rips[i * 4 + 2] = (performance.now() - t0) / 1000;
			rips[i * 4 + 3] = Math.min(1.4, strength);
		});

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

		$effect(() => {
			void mood;
			void danger;
			untrack(kick);
		});

		return () => {
			cancelAnimationFrame(raf);
			unsplash();
			observer.disconnect();
			document.removeEventListener('visibilitychange', onVisibility);
			motion.removeEventListener('change', onMotion);
			canvas.removeEventListener('webglcontextlost', onLost);
			pass.dispose();
		};
	}
</script>

<div class="pond" aria-hidden="true">
	{#if failed}
		<div class="fallback"></div>
	{:else}
		<canvas {@attach pond}></canvas>
	{/if}
</div>

<style>
	.pond {
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
			radial-gradient(30% 22% at 12% 20%, rgba(80, 170, 70, 0.6), transparent 70%),
			radial-gradient(26% 20% at 88% 78%, rgba(80, 170, 70, 0.55), transparent 70%),
			radial-gradient(70% 60% at 50% 40%, rgba(150, 220, 190, 0.25), transparent 70%),
			linear-gradient(180deg, #1c6a64 0%, #145650 60%, #0f4440 100%);
	}
</style>
