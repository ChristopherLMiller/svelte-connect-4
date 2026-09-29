<script lang="ts">
	import type { Snippet } from 'svelte';
	import { createFullscreenPass } from '$lib/gl/fullscreen';

	let {
		mood = 'play',
		heat = 0,
		live = $bindable(false),
		fallback
	}: {
		mood?: 'menu' | 'play' | 'won';
		/** 0–1: how hot the kiln is running; thickens the smoke and warms the air. */
		heat?: number;
		/** True while the GPU sky is drawing, so the yard can drop layers it replaces. */
		live?: boolean;
		fallback: Snippet;
	} = $props();

	let failed = $state(false);

	// CSS pixels, y down. The sun, flue and wall line sit where the CSS yard puts them.
	const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uDpr;
uniform float uTime;
uniform float uWarm;
uniform float uHeat;
out vec4 outColor;

vec3 rgb(float r, float g, float b) { return vec3(r, g, b) / 255.0; }

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
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * vnoise(p);
    p = p * 2.03 + vec2(7.1, 3.7);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 frag = gl_FragCoord.xy / uDpr;
  vec2 p = vec2(frag.x, uRes.y - frag.y);
  float w = uRes.x;
  float h = uRes.y;
  float v = p.y / h;
  float t = uTime;
  float warm = uWarm;

  // Heat shimmer: the lower air wobbles, stronger as the kiln runs hot.
  float shimmerBand = smoothstep(0.3, 0.55, v) * (1.0 - smoothstep(0.75, 0.95, v));
  float shimmer = (0.6 + 1.6 * uHeat + 1.2 * warm) * shimmerBand;
  vec2 q = p + vec2(sin(p.y * 0.09 + t * 3.1) * 1.6, sin(p.x * 0.05 + t * 2.3) * 1.2) * shimmer;

  vec3 top = mix(rgb(142.0, 186.0, 212.0), rgb(214.0, 142.0, 120.0), warm);
  vec3 mid = mix(rgb(226.0, 228.0, 216.0), rgb(236.0, 184.0, 146.0), warm);
  vec3 low = mix(rgb(215.0, 203.0, 184.0), rgb(196.0, 150.0, 132.0), warm);
  vec3 col = v < 0.42 ? mix(top, mid, v / 0.42) : mix(mid, low, (v - 0.42) / 0.58);
  col = mix(col, col * vec3(1.03, 0.99, 0.95), uHeat);

  vec2 sun = vec2(0.68 * w, 0.06 * h + 90.0 + warm * 0.08 * h);
  vec2 ds = p - sun;
  float dist = length(ds);
  vec3 sunTint = mix(rgb(255.0, 250.0, 236.0), rgb(255.0, 214.0, 170.0), warm);

  col = mix(col, sunTint, 0.45 * exp(-dist / 200.0));
  col += rgb(255.0, 226.0, 160.0) * 0.28 * exp(-dist / 55.0);

  // Soft god rays fanning from the sun, slowly turning.
  float ang = atan(ds.y, ds.x);
  vec2 ring = vec2(cos(ang + t * 0.03), sin(ang + t * 0.03));
  vec2 ring2 = vec2(cos(ang - t * 0.02), sin(ang - t * 0.02));
  float rays = fbm(ring * 4.0 + vec2(t * 0.05, 0.0)) * fbm(ring2 * 9.0 + 3.0);
  float rayFall = exp(-dist / (0.55 * max(w, h))) * smoothstep(40.0, 140.0, dist);
  col = mix(col, sunTint, clamp(smoothstep(0.12, 0.4, rays) * rayFall * (0.55 + 0.25 * warm), 0.0, 0.6));

  // Far hills in the haze, behind the yard walls.
  float hill = h * 0.47 + sin(q.x * 0.0045 + 1.3) * 22.0 + sin(q.x * 0.011) * 9.0 + (fbm(vec2(q.x * 0.008, 1.0)) - 0.5) * 30.0;
  float hillMask = smoothstep(hill - 1.0, hill + 1.0, q.y);
  vec3 hillCol = mix(rgb(190.0, 196.0, 190.0), rgb(186.0, 150.0, 142.0), warm);
  col = mix(col, mix(hillCol, col, 0.35), hillMask * 0.6);
  float ridge2 = h * 0.52 + sin(q.x * 0.007 + 4.0) * 16.0 + (fbm(vec2(q.x * 0.013, 5.0)) - 0.5) * 22.0;
  col = mix(col, mix(hillCol * 0.9, col, 0.2), smoothstep(ridge2 - 1.0, ridge2 + 1.0, q.y) * 0.55);

  // Drifting cumulus in the upper sky.
  if (v < 0.5) {
    vec2 cp = vec2(q.x * 0.0028 + t * 0.012, q.y * 0.009);
    float c = fbm(cp + vec2(0.0, fbm(cp * 1.7 + t * 0.01) * 0.6));
    float cover = smoothstep(0.48, 0.66, c) * (1.0 - smoothstep(0.26, 0.46, v));
    float under = fbm(cp + vec2(0.0, 0.08));
    vec3 cloud = mix(vec3(1.0), mix(rgb(222.0, 214.0, 204.0), rgb(214.0, 160.0, 150.0), warm), smoothstep(0.5, 0.75, under) * 0.6);
    cloud += sunTint * 0.25 * exp(-dist / 320.0);
    col = mix(col, cloud, cover * 0.8);
  }

  // Kiln smoke rising from the flue and leaning downwind.
  {
    vec2 flue = vec2(0.78 * w + 18.0, h * 0.44);
    float rise = flue.y - q.y;
    if (rise > -6.0) {
      float lean = rise * 0.34 + rise * rise * 0.0005;
      float wobble = (fbm(vec2(rise * 0.01 - t * 0.3, t * 0.1)) - 0.5) * (18.0 + rise * 0.25);
      float cx = flue.x + lean + wobble;
      float width = 8.0 + rise * 0.3;
      float across = (q.x - cx) / width;
      float body = exp(-across * across * 1.6);
      float n = fbm(vec2((q.x - lean) * 0.018, q.y * 0.018 + t * 0.55));
      float fade = smoothstep(-6.0, 20.0, rise) * exp(-rise / (h * (0.35 + 0.25 * uHeat + 0.2 * warm)));
      float density = body * smoothstep(0.25, 0.8, n) * fade * (0.55 + 0.45 * uHeat + 0.3 * warm);
      vec3 smoke = mix(rgb(246.0, 242.0, 236.0), rgb(150.0, 140.0, 134.0), 0.25 + 0.4 * uHeat);
      smoke = mix(smoke, rgb(220.0, 170.0, 160.0), warm * 0.5);
      col = mix(col, smoke, clamp(density, 0.0, 0.85));
    }
  }

  // Shimmer glints in the hot air.
  col += vec3(1.0, 0.98, 0.92) * 0.02 * sin(q.y * 0.4 - t * 4.0) * shimmerBand * (0.4 + uHeat);

  // Sun disc on top of everything.
  float disc = 1.0 - smoothstep(25.0, 28.0, dist);
  vec3 discCol = mix(vec3(1.0, 0.99, 0.95), rgb(255.0, 226.0, 180.0), warm);
  col = mix(col, discCol, disc);

  col += (hash21(p + fract(t) * 13.0) - 0.5) * 0.012;
  outColor = vec4(col, 1.0);
}`;

	function sky(canvas: HTMLCanvasElement) {
		const pass = createFullscreenPass(canvas, FRAG, 'ashcourt sky');
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
		let warm = mood === 'won' ? 1 : 0;
		let hot = heat;

		const draw = (ms: number) => {
			if (!cssW || !cssH) return;
			const dt = Math.min(1 / 30, Math.max(0, (ms - last) / 1000));
			last = ms;
			const ease = calm ? 1 : 1 - Math.exp(-dt * 1.5);
			warm += ((mood === 'won' ? 1 : 0) - warm) * ease;
			hot += (heat - hot) * ease;
			gl.uniform2f(pass.uniform('uRes'), cssW, cssH);
			gl.uniform1f(pass.uniform('uDpr'), dpr);
			gl.uniform1f(pass.uniform('uTime'), calm ? 0 : (ms - t0) / 1000);
			gl.uniform1f(pass.uniform('uWarm'), warm);
			gl.uniform1f(pass.uniform('uHeat'), hot);
			pass.draw();
		};

		const loop = (ms: number) => {
			raf = 0;
			draw(ms);
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
			// Soft sky: a capped backing store keeps full-screen fill affordable.
			dpr = Math.min(window.devicePixelRatio || 1, 1.25);
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
		resize();
		kick();
		live = true;

		const onVisibility = () => kick();
		const onMotion = () => {
			calm = motion.matches;
			kick();
		};
		const onLost = (event: Event) => {
			event.preventDefault();
			cancelAnimationFrame(raf);
			live = false;
			failed = true;
		};
		document.addEventListener('visibilitychange', onVisibility);
		motion.addEventListener('change', onMotion);
		canvas.addEventListener('webglcontextlost', onLost);

		$effect(() => {
			void mood;
			void heat;
			kick();
		});

		return () => {
			cancelAnimationFrame(raf);
			observer.disconnect();
			document.removeEventListener('visibilitychange', onVisibility);
			motion.removeEventListener('change', onMotion);
			canvas.removeEventListener('webglcontextlost', onLost);
			live = false;
			pass.dispose();
		};
	}
</script>

{#if failed}
	{@render fallback()}
{:else}
	<canvas class="sky" aria-hidden="true" {@attach sky}></canvas>
{/if}

<style>
	.sky {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
	}
</style>
