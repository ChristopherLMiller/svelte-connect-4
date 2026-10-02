<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { createFullscreenPass } from '$lib/gl/fullscreen';
	import { createPacer } from '$lib/gl/pace';
	import { Fireworks, PALETTE, SHELL_KINDS, type ShellSpec } from '../fireworks';

	type Mood = 'menu' | 'play' | 'dim' | 'won';

	let {
		mood = 'menu',
		pulse = 0,
		fallback
	}: { mood?: Mood; pulse?: number; fallback: Snippet } = $props();

	let failed = $state(false);

	// CSS pixels, y down. uGlow is the summed colour of recent bursts lighting the whole sky.
	const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uDpr;
uniform float uTime;
uniform float uWarm;
uniform float uDim;
uniform vec3 uGlow;
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
  return 0.55 * vnoise(p) + 0.3 * vnoise(p * 2.03 + 7.1) + 0.15 * vnoise(p * 4.1 + 3.7);
}

float glowAt(vec2 p, vec2 c, vec2 size, float stop) {
  return 1.0 - smoothstep(0.0, stop, length((p - c) / size));
}

void main() {
  vec2 frag = gl_FragCoord.xy / uDpr;
  vec2 p = vec2(frag.x, uRes.y - frag.y);
  float w = uRes.x;
  float h = uRes.y;
  vec2 uv = p / uRes;
  float t = uTime;

  vec3 top = rgb(18.0, 16.0, 44.0);
  vec3 mid = rgb(10.0, 14.0, 34.0);
  vec3 low = rgb(22.0, 12.0, 28.0);
  vec3 c = uv.y < 0.46 ? mix(top, mid, uv.y / 0.46) : mix(mid, low, (uv.y - 0.46) / 0.54);

  vec2 drift = vec2(sin(t * 0.07), cos(t * 0.05));
  c += rgb(240.0, 196.0, 92.0) * 0.2 * glowAt(p, vec2(0.5 * w + drift.x * 0.12 * w, -0.12 * h), vec2(1100.0, 520.0), 0.58);
  c += rgb(255.0, 236.0, 190.0) * 0.14 * glowAt(p, vec2(0.88 * w, 0.08 * h), vec2(520.0, 360.0), 0.46);
  c += rgb(226.0, 74.0, 61.0) * 0.18 * glowAt(p, vec2((0.08 + 0.1 * sin(t * 0.06)) * w, (0.82 + 0.05 * drift.y) * h), vec2(700.0, 420.0), 0.5);
  c += rgb(90.0, 180.0, 150.0) * 0.12 * glowAt(p, vec2((0.94 - 0.1 * sin(t * 0.05 + 1.0)) * w, 0.72 * h), vec2(640.0, 380.0), 0.52);

  float breathe = 0.85 + 0.15 * sin(t * 0.785);
  float warm = uWarm;
  c += rgb(255.0, 214.0, 140.0) * mix(0.14, 0.28, warm) * breathe * glowAt(p, vec2((0.5 + 0.18 * sin(t * 0.09)) * w, (0.28 + 0.1 * warm) * h), vec2(0.9 * w, 0.7 * h), 0.5);
  c += rgb(226.0, 74.0, 61.0) * mix(0.1, 0.18, warm) * breathe * glowAt(p, vec2((0.7 - 0.2 * warm + 0.15 * sin(t * 0.07 + 2.0)) * w, 0.8 * h), vec2(0.8 * w, 0.6 * h), 0.45);

  {
    vec2 cell = floor(p / 64.0);
    vec2 f = p - cell * 64.0;
    float hs = hash21(cell);
    if (hs > 0.5) {
      vec2 sp = vec2(hash21(cell + 3.1), hash21(cell + 7.7)) * 50.0 + 7.0;
      float r = length(f - sp);
      float tw = 0.3 + 0.7 * (0.5 + 0.5 * sin(t * (1.1 + 2.2 * hs) + hs * 40.0));
      float mag = 0.35 + 0.65 * hash21(cell + 1.3);
      float star = (exp(-r * r / 1.3) * 0.9 + exp(-r / 5.0) * 0.1) * tw * mag;
      c += rgb(255.0, 246.0, 216.0) * star * (1.0 - smoothstep(0.38, 0.66, uv.y));
    }
  }

  {
    vec2 mc = vec2(w - 0.09 * w - 29.0, 0.07 * h + 29.0);
    float r = length(p - mc);
    c += rgb(240.0, 196.0, 92.0) * (exp(-max(r - 29.0, 0.0) / 26.0) * 0.4 + exp(-max(r - 29.0, 0.0) / 90.0) * 0.16);
    if (r < 30.0) {
      vec2 lp = (p - mc) / 29.0;
      float lg = length(lp - vec2(-0.32, -0.36));
      vec3 disc = lg < 0.7 ? mix(rgb(255.0, 248.0, 228.0), rgb(240.0, 196.0, 92.0), lg / 0.7)
        : mix(rgb(240.0, 196.0, 92.0), rgb(196.0, 137.0, 42.0), clamp((lg - 0.7) / 0.6, 0.0, 1.0));
      float crater = max(1.0 - smoothstep(0.14, 0.18, length(lp - vec2(-0.14, -0.26))), 1.0 - smoothstep(0.08, 0.11, length(lp - vec2(0.3, 0.2))));
      disc = mix(disc, rgb(180.0, 130.0, 50.0), crater * 0.28);
      c = mix(c, disc, 1.0 - smoothstep(28.5, 29.5, r));
    }
  }

  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 sc = vec2((0.16 + 0.34 * fi + 0.05 * sin(t * 0.21 + fi * 2.0)) * w, h * (0.8 - 0.05 * sin(t * 0.35 + fi)));
    vec2 sq = (p - sc) / vec2(130.0, 170.0);
    float n = fbm(vec2(p.x * 0.006 + fi * 5.0, p.y * 0.006 + t * 0.12));
    float a = exp(-dot(sq, sq) * 1.4) * (0.5 + 0.8 * n) * (0.6 + 0.4 * sin(t * 0.7 + fi * 2.1));
    c += rgb(255.0, 230.0, 180.0) * 0.08 * a;
  }

  {
    float cs = 150.0;
    vec2 q = vec2(p.x, p.y + t * 14.0);
    vec2 cell = floor(q / cs);
    float hs = hash21(cell + 41.0);
    if (hs > 0.72) {
      vec2 sp = cell * cs + vec2(hash21(cell + 5.0), hash21(cell + 9.0)) * (cs - 30.0) + 15.0;
      sp.x += 10.0 * sin(t * 0.6 + hs * 30.0);
      vec2 d = (q - sp) / vec2(1.0, 1.25);
      float flick = 0.75 + 0.25 * sin(t * 7.0 + hs * 50.0);
      float lamp = exp(-dot(d, d) / 3.5) + exp(-length(d) / 9.0) * 0.28;
      float far = 1.0 - smoothstep(0.1, 0.75, uv.y);
      c += mix(rgb(255.0, 170.0, 80.0), rgb(255.0, 110.0, 70.0), hash21(cell + 2.0)) * lamp * flick * 0.55 * (0.35 + 0.65 * far);
    }
  }

  for (int layer = 0; layer < 2; layer++) {
    float fl = float(layer);
    float cs = mix(90.0, 130.0, fl);
    float speed = mix(46.0, 28.0, fl);
    vec2 q = vec2(p.x + 20.0 * sin(p.y * 0.01 + t * 0.4 + fl), p.y + t * speed);
    vec2 cell = floor(q / cs);
    float hs = hash21(cell + fl * 13.0);
    if (hs > 0.55) {
      vec2 sp = cell * cs + vec2(hash21(cell + 2.2), hash21(cell + 8.1)) * (cs - 16.0) + 8.0;
      vec2 d = (q - sp) / vec2(1.0, 1.5);
      float tw = 0.5 + 0.5 * sin(t * 3.0 + hs * 60.0);
      float mote = exp(-dot(d, d) / mix(2.2, 1.4, fl)) + exp(-length(d) / 6.0) * 0.25;
      c += rgb(255.0, 217.0, 122.0) * mote * (0.35 + 0.5 * tw) * mix(0.8, 0.5, fl) * smoothstep(0.05, 0.6, uv.y);
    }
  }

  c += uGlow * (1.0 - 0.5 * uv.y);
  c += (hash21(p + fract(t) * 91.0) - 0.5) * 0.028;

  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(lum), c, 1.0 - 0.35 * uDim) * (1.0 - 0.22 * uDim);
  outColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

	// Willows are always gold, so the palette leans on the other colours.
	const HUES = [1, 1, 2, 2, 3, 3, 5, 5, 6, 6, 0, 4];

	function sky(canvas: HTMLCanvasElement) {
		const pass = createFullscreenPass(canvas, FRAG, 'wyrm sky');
		const fx = pass && Fireworks.create(pass.gl);
		if (!pass || !fx) {
			pass?.dispose();
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
		let nextLaunch = 0.4;
		let warm = mood === 'won' ? 1 : 0;
		let dim = mood === 'dim' ? 1 : 0;
		const queue: { at: number; quick: boolean }[] = [];

		const clock = () => (performance.now() - t0) / 1000;
		const rand = (a: number, b: number) => a + Math.random() * (b - a);
		const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)]!;

		const gap = () => {
			if (mood === 'won') return rand(0.22, 0.55);
			if (mood === 'dim') return rand(3.5, 6);
			if (mood === 'play') return rand(1.2, 2.4);
			return rand(0.7, 1.5);
		};

		const fire = (quick: boolean) => {
			if (calm || !cssW) return;
			const big = mood === 'won';
			const high = mood === 'play' || mood === 'dim';
			const base = Math.min(cssW, cssH);
			const hue = pick(HUES);
			const spec: ShellSpec = {
				x: rand(0.08, 0.92) * cssW,
				apexY: (high ? rand(0.06, 0.24) : rand(0.1, big ? 0.5 : 0.42)) * cssH,
				driftX: rand(-0.06, 0.06) * cssW,
				radius: base * (big ? rand(0.17, 0.27) : rand(0.12, 0.2)),
				kind: pick(SHELL_KINDS),
				color: PALETTE[hue]!,
				color2: PALETTE[(hue + 2 + Math.floor(Math.random() * 4)) % PALETTE.length]!,
				quick
			};
			fx.launch(spec, cssH + 10);
		};

		const draw = (ms: number) => {
			if (!cssW || !cssH) return;
			const dt = Math.min(1 / 30, Math.max(0, (ms - last) / 1000));
			last = ms;
			const now = (ms - t0) / 1000;
			const ease = calm ? 1 : 1 - Math.exp(-dt * 2.5);
			warm += ((mood === 'won' ? 1 : 0) - warm) * ease;
			dim += ((mood === 'dim' ? 1 : 0) - dim) * ease;

			if (!calm) {
				if (now >= nextLaunch) {
					fire(false);
					nextLaunch = now + gap();
				}
				for (let i = queue.length - 1; i >= 0; i -= 1) {
					if (queue[i]!.at <= now) {
						fire(queue[i]!.quick);
						queue.splice(i, 1);
					}
				}
				fx.step(dt, 14 * fx.unit * Math.sin(now * 0.05));
			}

			gl.useProgram(pass.program);
			gl.bindVertexArray(null);
			gl.uniform2f(pass.uniform('uRes'), cssW, cssH);
			gl.uniform1f(pass.uniform('uDpr'), dpr);
			gl.uniform1f(pass.uniform('uTime'), calm ? 0 : now);
			gl.uniform1f(pass.uniform('uWarm'), warm);
			gl.uniform1f(pass.uniform('uDim'), dim);
			gl.uniform3f(pass.uniform('uGlow'), fx.glow[0], fx.glow[1], fx.glow[2]);
			pass.draw();

			if (!calm) {
				fx.pack(1 - 0.45 * dim);
				fx.draw(cssW, cssH);
			}
		};

		const pace = createPacer();
		const loop = (ms: number) => {
			raf = 0;
			if (pace.due(ms)) draw(ms);
			if (!calm && !document.hidden) raf = requestAnimationFrame(loop);
		};

		const kick = () => {
			if (calm) {
				fx.clear();
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
			// Sky and sparks are soft glows; a capped backing store keeps full-screen fill affordable.
			dpr = Math.min(window.devicePixelRatio || 1, 1.25);
			cssW = rect.width;
			cssH = rect.height;
			fx.resize(cssW, cssH);
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
				if (next > seenPulse) queue.push({ at: clock(), quick: true });
				seenPulse = next;
			});
		});

		let seenMood = untrack(() => mood);
		$effect(() => {
			const next = mood;
			untrack(() => {
				if (next === 'won' && seenMood !== 'won') {
					const now = clock();
					for (let i = 0; i < 6; i += 1) queue.push({ at: now + i * 0.16, quick: false });
				}
				seenMood = next;
				nextLaunch = Math.min(nextLaunch, clock() + gap());
				kick();
			});
		});

		return () => {
			cancelAnimationFrame(raf);
			observer.disconnect();
			document.removeEventListener('visibilitychange', onVisibility);
			motion.removeEventListener('change', onMotion);
			canvas.removeEventListener('webglcontextlost', onLost);
			fx.dispose();
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
