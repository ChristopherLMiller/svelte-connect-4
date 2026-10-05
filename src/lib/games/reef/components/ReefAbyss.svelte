<script lang="ts">
	import { untrack } from 'svelte';
	import { createFullscreenPass } from '$lib/gl/fullscreen';
	import { createPacer } from '$lib/gl/pace';

	type Mood = 'menu' | 'play' | 'dim' | 'done';

	let {
		mood = 'menu',
		depth = 0,
		pulse = 0,
		danger = 0
	}: {
		mood?: Mood;
		/** 0 at the top of the midnight zone, 1 in the trench. */
		depth?: number;
		/** Bumps on every clear; the water blooms with light. */
		pulse?: number;
		/** 0–1, how close the stack is to the top. */
		danger?: number;
	} = $props();

	let failed = $state(false);

	const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uDpr;
uniform float uTime;
uniform float uDepth;
uniform float uBloom;
uniform float uDanger;
uniform float uDim;
uniform float uWarm;
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
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  return 0.55 * vnoise(p) + 0.3 * vnoise(p * 2.03 + 7.1) + 0.15 * vnoise(p * 4.1 + 3.7);
}

vec3 glowHue(float k) {
  return 0.5 + 0.5 * cos(6.2831 * (k + vec3(0.0, 0.33, 0.67)));
}

vec3 jellies(vec2 s, float t, float h, float D) {
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float hs = hash21(vec2(fi * 7.3, 2.1));
    float near = hash21(vec2(fi, 9.4));
    float size = mix(0.022, 0.058, near);
    float y = fract(hs * 3.7 + t * mix(0.004, 0.009, near)) * 1.7 - 0.3;
    float x = (fract(hs * 5.3 + fi * 0.618) - 0.5) * 1.8 + 0.05 * sin(t * 0.21 + fi * 2.0);
    vec2 l = (s - vec2(x, y)) / size;
    if (abs(l.x) > 2.6 || l.y > 2.4 || l.y < -4.2) continue;
    float px = size * h;
    float beat = 0.5 + 0.5 * sin(t * (1.3 + hs * 0.6) + fi * 3.0);
    vec2 b = l / vec2(1.0 + 0.16 * beat, 0.8 - 0.12 * beat);
    float r = length(b);
    float dome = smoothstep(-0.25, -0.1, l.y);
    float rim = exp(-pow((r - 1.0) * px, 2.0) / 3.0) * dome;
    float fill = (r < 1.0 ? 0.12 + 0.3 * smoothstep(1.0, 0.2, r) * smoothstep(-0.2, 0.6, l.y) : 0.0) * dome;
    float skirt = exp(-pow((l.y + 0.18) * px, 2.0) / 2.0) * smoothstep(1.1, 0.8, abs(b.x)) * 0.5;
    float halo = exp(-dot(l, l) * 0.5) * 0.08;
    float tent = 0.0;
    if (l.y < -0.1) {
      float sway = 0.12 * sin(l.y * 2.6 - t * 2.0 + fi) * -l.y;
      float tx = l.x + sway;
      float d = abs(fract(tx * 2.4 + 0.5) - 0.5) / 2.4;
      tent = exp(-pow(d * px, 2.0) / 1.1) * smoothstep(0.8, 0.55, abs(tx)) * smoothstep(-4.0, -0.2, l.y) * 0.55;
    }
    vec3 hue = mix(vec3(1.0, 0.36, 0.86), vec3(0.3, 0.92, 1.0), step(0.5, hs));
    hue = mix(hue, vec3(0.62, 0.48, 1.0), step(0.75, fract(hs * 9.1)));
    float fade = mix(0.35, 1.0, near) * (0.6 + 0.4 * beat) * (0.7 + 0.5 * D);
    acc += hue * (rim * 0.85 + fill + skirt + tent + halo) * fade;
  }
  return acc;
}

void main() {
  vec2 frag = gl_FragCoord.xy / uDpr;
  float h = uRes.y;
  // s: x centred in screen heights, y 0 at the bottom, 1 at the top.
  vec2 s = vec2((frag.x - 0.5 * uRes.x) / h, frag.y / h);
  float t = uTime;
  float D = clamp(uDepth, 0.0, 1.0);

  vec3 top = mix(vec3(0.03, 0.11, 0.21), vec3(0.008, 0.02, 0.05), D);
  vec3 low = mix(vec3(0.004, 0.02, 0.05), vec3(0.0, 0.003, 0.012), D);
  vec3 c = mix(low, top, smoothstep(0.0, 1.0, s.y));

  // Faint shafts from a surface far above, gone by the trench.
  float rays = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float x = s.x + (1.0 - s.y) * (0.18 + fi * 0.05) - (fi - 1.5) * 0.36 + 0.04 * sin(t * 0.07 + fi);
    rays += smoothstep(0.09, 0.0, abs(x)) * (0.5 + 0.5 * vnoise(vec2(x * 8.0, t * 0.1 + fi)));
  }
  c += vec3(0.1, 0.32, 0.5) * rays * smoothstep(0.2, 1.0, s.y) * 0.2 * (1.0 - D * 0.9);

  // Caustic web rippling down from the surface.
  if (s.y > 0.45 && D < 0.95) {
    vec2 cp = s * vec2(2.6, 4.2);
    float w1 = vnoise(cp + vec2(t * 0.05, t * 0.07)) * 0.7 + vnoise(cp * 2.1 + vec2(1.7, t * 0.09)) * 0.3;
    float w2 = vnoise(cp * 1.3 + vec2(4.0 - t * 0.06, t * 0.04)) * 0.7 + vnoise(cp * 2.6 + vec2(t * 0.05, 8.3)) * 0.3;
    float web = pow(clamp(1.0 - abs(w1 - w2) * 6.0, 0.0, 1.0), 5.0);
    c += vec3(0.22, 0.7, 0.88) * web * smoothstep(0.45, 1.0, s.y) * 0.14 * (1.0 - D * 0.85);
  }

  // Murk.
  float murk = fbm(s * 2.4 + vec2(t * 0.012, -t * 0.006));
  c *= 0.75 + 0.5 * murk;

  // Glowing currents winding through the water column.
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float y0 = 0.3 + 0.21 * fi + 0.07 * sin(s.x * 1.7 + t * 0.11 + fi * 2.1) + 0.025 * sin(s.x * 4.3 - t * 0.19 + fi);
    if (abs(s.y - y0) > 0.16) continue;
    float d = (s.y - y0) * h;
    float m = smoothstep(0.3, 0.8, vnoise(vec2(s.x * 2.4 - t * (0.1 + 0.05 * fi), fi * 7.0)));
    vec3 hue = mix(vec3(0.25, 0.95, 1.0), vec3(1.0, 0.35, 0.85), 0.5 + 0.5 * sin(s.x * 1.3 + t * 0.08 + fi * 2.0));
    c += hue * (exp(-d * d / 5.0) * 0.16 + exp(-d * d / 2200.0) * 0.045) * m * (0.6 + 0.6 * D + uBloom);
  }

  // Distant reef ridges with points of living light.
  float ridge1 = 0.14 + 0.06 * fbm(vec2(s.x * 1.6 + 3.0, 1.0)) + 0.03 * sin(s.x * 3.1);
  float ridge2 = 0.07 + 0.05 * fbm(vec2(s.x * 2.6 + 9.0, 4.0));
  if (s.y < ridge1) c = mix(c, vec3(0.003, 0.012, 0.025) * (1.0 - D * 0.6), 0.7);
  if (s.y < ridge2) c = mix(c, vec3(0.001, 0.005, 0.01), 0.85);
  {
    vec2 g = s * vec2(38.0, 38.0);
    vec2 gi = floor(g);
    float hs = hash21(gi + 5.0);
    if (hs > 0.86) {
      vec2 sp = gi + vec2(0.3 + 0.4 * hash21(gi + 1.0), 0.3 + 0.4 * hash21(gi + 2.0));
      float r = length(g - sp);
      float tw = 0.5 + 0.5 * sin(t * (0.6 + hs) + hs * 40.0);
      float below = smoothstep(ridge1 + 0.03, ridge1 - 0.02, sp.y / 38.0);
      c += glowHue(hs * 3.0) * exp(-r * r * 40.0) * tw * below * (0.3 + 0.7 * D + uBloom * 0.8);
    }
  }

  // Kelp in the foreground, swaying, with lanterns at the tips.
  if (s.y < 0.34) {
    float cw = 0.05;
    float ci = floor(s.x / cw);
    for (int k = -1; k <= 1; k++) {
      float cell = ci + float(k);
      float hs = hash21(vec2(cell, 13.0));
      if (hs < 0.4) continue;
      float top = 0.08 + 0.22 * hash21(vec2(cell, 21.0));
      float root = (cell + 0.5) * cw + (hash21(vec2(cell, 4.0)) - 0.5) * cw * 0.5;
      float phase = t * 0.5 + hs * 20.0;
      float u = clamp(s.y / top, 0.0, 1.0);
      float sx = root + 0.018 * sin(phase + s.y * 6.0) * u * u;
      float d = abs(s.x - sx) - mix(0.005, 0.0012, u);
      vec3 hue = glowHue(hs * 4.0);
      if (s.y < top) {
        c = mix(c, vec3(0.0, 0.004, 0.008), smoothstep(1.5 / h, 0.0, d) * 0.92);
        float run = 0.5 + 0.5 * sin(t * 1.4 + hs * 30.0 - s.y * 24.0);
        float edge = exp(-abs(d) * h * 0.9);
        c += hue * (edge * (0.05 + 0.1 * run) * (0.3 + 0.7 * u) + exp(-max(d, 0.0) * h * 0.25) * u * u * run * 0.05);
      }
      vec2 tip = vec2(root + 0.018 * sin(phase + top * 6.0), top);
      float rt = length(s - tip) * h;
      float glow = 0.6 + 0.4 * sin(t * (1.0 + hs) + hs * 9.0);
      c += hue * (exp(-rt * rt / 7.0) * 0.9 + exp(-rt * rt / 160.0) * 0.16) * glow * (0.6 + 0.4 * D + uBloom * 0.6);
    }
  }

  // Bioluminescent motes drifting, more and brighter with depth.
  for (int layer = 0; layer < 2; layer++) {
    float fl = float(layer);
    float cs = mix(0.07, 0.045, fl);
    vec2 q = vec2(s.x + t * 0.004 * (1.0 + fl), s.y + t * mix(0.006, 0.011, fl));
    vec2 cell = floor(q / cs);
    float hs = hash21(cell + 17.0 + fl * 31.0);
    if (hs > mix(0.72, 0.55, D)) {
      vec2 sp = (cell + vec2(hash21(cell + 3.0), hash21(cell + 8.0))) * cs;
      sp.x += 0.006 * sin(t * 0.5 + hs * 30.0);
      float r = length(q - sp) * h;
      float tw = 0.5 + 0.5 * sin(t * (0.8 + hs * 1.6) + hs * 50.0);
      vec3 hue = mix(vec3(0.3, 0.9, 1.0), glowHue(hs * 5.0), 0.4);
      c += hue * exp(-r * r / mix(2.0, 3.6, fl)) * tw * (0.35 + 0.7 * D + uBloom * 1.4);
    }
  }

  c += jellies(s, t, h, D);

  // A clear blooms through the whole water column.
  vec2 centre = s - vec2(0.0, 0.55);
  c += vec3(0.2, 0.8, 1.0) * uBloom * 0.16 * exp(-dot(centre, centre) * 2.4);

  // Danger: the trench walls blush red as the stack nears the top.
  c += vec3(0.5, 0.04, 0.12) * uDanger * 0.12 * (0.7 + 0.3 * sin(t * 2.6)) * smoothstep(0.3, 1.0, s.y);

  c += vec3(0.1, 0.5, 0.6) * uWarm * 0.06;

  vec2 v = frag / uRes - 0.5;
  c *= 1.0 - 0.7 * dot(v, v) * 1.6;
  c += (hash21(frag + fract(t) * 91.0) - 0.5) * 0.012;
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(lum), c, 1.0 - 0.6 * uDim) * (1.0 - 0.35 * uDim);
  outColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

	function abyss(canvas: HTMLCanvasElement) {
		const pass = createFullscreenPass(canvas, FRAG, 'reef abyss');
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
		let deep = untrack(() => depth);
		let bloom = 0;
		let warn = 0;
		let dim = 0;
		let warm = 0;

		const draw = (ms: number) => {
			if (!cssW || !cssH) return;
			const dt = Math.min(1 / 20, Math.max(0, (ms - last) / 1000));
			last = ms;
			const ease = calm ? 1 : 1 - Math.exp(-dt * 1.2);
			deep += (depth - deep) * ease;
			warn += (danger - warn) * (calm ? 1 : 1 - Math.exp(-dt * 3));
			dim += ((mood === 'dim' ? 1 : 0) - dim) * (calm ? 1 : 1 - Math.exp(-dt * 2));
			warm += ((mood === 'done' ? 1 : 0) - warm) * (calm ? 1 : 1 - Math.exp(-dt * 2));
			bloom *= Math.exp(-dt * 1.6);

			gl.useProgram(pass.program);
			gl.uniform2f(pass.uniform('uRes'), cssW, cssH);
			gl.uniform1f(pass.uniform('uDpr'), dpr);
			gl.uniform1f(pass.uniform('uTime'), calm ? 0 : (ms - t0) / 1000);
			gl.uniform1f(pass.uniform('uDepth'), deep);
			gl.uniform1f(pass.uniform('uBloom'), calm ? 0 : bloom);
			gl.uniform1f(pass.uniform('uDanger'), warn);
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
			// Soft, dark water: one backing pixel per CSS pixel keeps phones cool.
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

		let seenPulse = untrack(() => pulse);
		$effect(() => {
			const next = pulse;
			untrack(() => {
				if (next > seenPulse) bloom = Math.min(1, bloom + 0.7);
				seenPulse = next;
			});
		});

		$effect(() => {
			void mood;
			void depth;
			void danger;
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

<div class="abyss" aria-hidden="true">
	{#if failed}
		<div class="fallback"></div>
	{:else}
		<canvas {@attach abyss}></canvas>
	{/if}
</div>

<style>
	.abyss {
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
			radial-gradient(50% 40% at 50% 20%, rgba(40, 140, 200, 0.14), transparent 70%),
			radial-gradient(60% 30% at 50% 100%, rgba(63, 233, 255, 0.05), transparent 70%),
			linear-gradient(180deg, #04142a 0%, #020a18 60%, #01050c 100%);
	}
</style>
