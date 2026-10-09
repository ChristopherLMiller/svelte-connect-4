<script lang="ts">
	import { untrack } from 'svelte';
	import { createFullscreenPass } from '$lib/gl/fullscreen';
	import { createPacer } from '$lib/gl/pace';

	type Mood = 'menu' | 'play' | 'hot' | 'dim';

	let {
		scene,
		label,
		fallback,
		mood = 'menu',
		flash = 0,
		drained = 0,
		pulse = 0,
		accent = '#ffc24a',
		glow = '#7dff9a'
	}: {
		/** GLSL defining `vec3 scene(vec2 s, float aspect, float t, float lights, float hot)`. */
		scene: string;
		label: string;
		/** CSS background used when WebGL isn't available. */
		fallback: string;
		mood?: Mood;
		/** Ticks up on jackpots: the lights flare. */
		flash?: number;
		/** Ticks up when the last ball drains: the lights gutter. */
		drained?: number;
		/** Ticks up on every scoring hit: the lights throb. */
		pulse?: number;
		/** The table's two light colours, as hex. */
		accent?: string;
		glow?: string;
	} = $props();

	const rgb = (hex: string): [number, number, number] => {
		const v = parseInt(hex.replace('#', '').slice(0, 6), 16) || 0;
		return [(v >> 16) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
	};

	let failed = $state(false);

	const HEAD = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uDim;
uniform float uHot;
uniform float uFlash;
uniform float uGutter;
uniform float uPulse;
uniform vec3 uAccent;
uniform vec3 uGlow;
out vec4 outColor;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
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
    p = p * 2.02 + 7.3;
    a *= 0.5;
  }
  return v;
}

float segment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}
`;

	const MAIN = `
/** The parlour's own light show over every scene: searchlights and a marquee of chasing bulbs. */
vec3 show(vec2 s, float aspect, float t, float lights) {
  vec3 add = vec3(0.0);
  float drive = 0.06 + 0.14 * uHot + 0.3 * uFlash + 0.1 * uPulse;
  for (int i = 0; i < 2; i++) {
    float side = i == 0 ? -1.0 : 1.0;
    vec2 d = s - vec2(side * aspect * 0.5, -0.56);
    float aim = -side * 0.4 + sin(t * (0.45 + uHot * 0.8) + float(i) * 2.1) * 0.42;
    float beam = smoothstep(0.08, 0.0, abs(atan(d.x, d.y) - aim)) * smoothstep(1.7, 0.15, length(d));
    add += mix(uAccent, uGlow, float(i)) * beam * drive;
  }
  float speed = 3.0 + 9.0 * uHot + 8.0 * uFlash;
  vec2 e = vec2(aspect * 0.5 - abs(s.x), 0.5 - abs(s.y));
  if (min(e.x, e.y) < 0.05) {
    bool row = e.y < e.x;
    float along = row ? s.x : s.y;
    float gap = 0.045;
    float id = floor(along / gap + 0.5);
    vec2 bulb = row ? vec2(id * gap, sign(s.y) * 0.475) : vec2(sign(s.x) * (aspect * 0.5 - 0.025), id * gap);
    float d = length(s - bulb);
    float dir = row ? sign(s.y) : -sign(s.x);
    float on = max(step(0.5, fract((id - t * speed * dir) / 3.0)), uPulse * 0.8);
    vec3 col = mod(id, 2.0) < 1.0 ? uAccent : uGlow;
    add += col * (smoothstep(0.011, 0.004, d) * (0.2 + 0.8 * on) + 0.00003 / (d * d + 0.0002) * on);
  }
  return add * lights;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  float aspect = uRes.x / uRes.y;
  vec2 s = (frag - 0.5 * uRes) / uRes.y;
  float lights = (1.0 - 0.75 * uGutter) * (1.0 + 0.8 * uFlash) * (1.0 + 0.3 * uPulse);
  vec3 c = scene(s, aspect, uTime, lights, uHot);
  c += show(s, aspect, uTime, lights);
  c += mix(uAccent, uGlow, 0.5) * uFlash * 0.08;
  vec2 v = frag / uRes - 0.5;
  c *= 1.0 - 0.6 * dot(v, v) * 1.5;
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(lum), c, 1.0 - 0.6 * uDim) * (1.0 - 0.35 * uDim);
  outColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

	function backdrop(canvas: HTMLCanvasElement) {
		const pass = createFullscreenPass(canvas, HEAD + scene + MAIN, label);
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
		let hot = 0;
		let glare = 0;
		let gutter = 0;
		let throb = 0;
		let seenFlash = untrack(() => flash);
		let seenDrain = untrack(() => drained);
		let seenPulse = untrack(() => pulse);

		const draw = (ms: number) => {
			if (!cssW || !cssH) return;
			const dt = Math.min(1 / 20, Math.max(0, (ms - last) / 1000));
			last = ms;
			const ease = (rate: number) => (calm ? 1 : 1 - Math.exp(-dt * rate));
			dim += ((mood === 'dim' ? 1 : 0) - dim) * ease(2);
			hot += ((mood === 'hot' ? 1 : 0) - hot) * ease(1.5);
			glare = calm ? 0 : Math.max(0, glare - dt * 1.6);
			gutter = calm ? 0 : Math.max(0, gutter - dt * 0.8);
			throb = calm ? 0 : Math.max(0, throb - dt * 3.5);
			gl.useProgram(pass.program);
			gl.uniform1f(pass.uniform('uPulse'), throb);
			gl.uniform3f(pass.uniform('uAccent'), ...rgb(accent));
			gl.uniform3f(pass.uniform('uGlow'), ...rgb(glow));
			gl.uniform2f(pass.uniform('uRes'), canvas.width, canvas.height);
			gl.uniform1f(pass.uniform('uTime'), calm ? 0 : (ms - t0) / 1000);
			gl.uniform1f(pass.uniform('uDim'), dim);
			gl.uniform1f(pass.uniform('uHot'), hot);
			gl.uniform1f(pass.uniform('uFlash'), glare);
			gl.uniform1f(pass.uniform('uGutter'), gutter);
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
			// The shader is busy, so stay at or under one backing pixel per CSS pixel.
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

		$effect(() => {
			void mood;
			void accent;
			void glow;
			const f = flash;
			const d = drained;
			const p = pulse;
			untrack(() => {
				if (f > seenFlash) glare = 1;
				if (d > seenDrain) gutter = 1;
				if (p > seenPulse) throb = Math.min(1, throb + 0.35 * (p - seenPulse));
				seenFlash = f;
				seenDrain = d;
				seenPulse = p;
				kick();
			});
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

<div class="backdrop" aria-hidden="true">
	{#if failed}
		<div class="fallback" style:background={fallback}></div>
	{:else}
		<canvas {@attach backdrop}></canvas>
	{/if}
</div>

<style>
	.backdrop {
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
</style>
