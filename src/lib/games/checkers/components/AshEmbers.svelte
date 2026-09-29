<script lang="ts">
	import { untrack } from 'svelte';
	import { createFullscreenPass } from '$lib/gl/fullscreen';

	let {
		mood = 'play',
		heat = 0,
		strikes = 0,
		kindle = 0
	}: {
		mood?: 'menu' | 'play' | 'won';
		/** 0–1 kiln heat; more embers ride the updraft. */
		heat?: number;
		/** Capture count; each new one gusts sparks up from the hearth. */
		strikes?: number;
		/** Crown count; each new one throws a gold flare. */
		kindle?: number;
	} = $props();

	let failed = $state(false);

	// Premultiplied output over the yard. Every particle is procedural: one hashed cell lookup per layer.
	const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uDpr;
uniform float uTime;
uniform float uHeat;
uniform float uWarm;
uniform float uGust;
uniform float uGold;
out vec4 outColor;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  vec2 frag = gl_FragCoord.xy / uDpr;
  vec2 p = vec2(frag.x, uRes.y - frag.y);
  float w = uRes.x;
  float h = uRes.y;
  float t = uTime;
  float v = p.y / h;

  vec3 glow = vec3(0.0);
  float ash = 0.0;

  float drive = clamp(0.3 + 0.5 * uHeat + 0.9 * uWarm + 0.9 * uGust, 0.0, 1.6);

  // Embers riding the updraft; three depths, nearer ones bigger and faster.
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float cell = 54.0 + fi * 22.0;
    float speed = 38.0 + fi * 26.0 + 60.0 * uGust;
    vec2 s = vec2(p.x + sin(p.y * 0.012 + t * 0.6 + fi) * 14.0, p.y + t * speed);
    vec2 id = floor(s / cell);
    float seed = hash21(id + fi * 31.7);
    float column = exp(-pow((((id.x + 0.5) * cell) / w - 0.5) / 0.42, 2.0));
    float chance = drive * (0.25 + 0.75 * column) * (0.28 + 0.1 * fi);
    if (seed < chance) {
      vec2 c = (id + 0.25 + 0.5 * vec2(hash21(id + 3.1), hash21(id + 7.7))) * cell;
      vec2 d = s - c;
      d.y *= 0.7;
      float r = 1.3 + fi * 0.8 + seed * 1.6;
      float life = clamp(1.0 - v, 0.0, 1.0);
      float flick = 0.55 + 0.45 * sin(t * (7.0 + seed * 9.0) + seed * 40.0);
      vec3 hot = mix(vec3(1.0, 0.36, 0.12), vec3(1.0, 0.8, 0.45), flick * 0.6);
      hot = mix(hot, vec3(1.0, 0.86, 0.4), uGold * 0.8);
      float core = exp(-dot(d, d) / (r * r));
      float halo = exp(-length(d) / (r * 3.2)) * 0.35;
      float fade = smoothstep(0.0, 0.25, v) * (0.35 + 0.65 * smoothstep(0.1, 0.9, v));
      glow += hot * (core + halo) * flick * fade * (0.6 + 0.4 * life);
    }
  }

  // Ash flakes drifting down and tumbling.
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    float cell = 90.0 + fi * 40.0;
    vec2 s = vec2(p.x - t * (14.0 + fi * 8.0), p.y - t * (16.0 + fi * 10.0));
    vec2 id = floor(s / cell);
    float seed = hash21(id + 91.0 + fi * 13.0);
    if (seed < 0.22 + 0.25 * uHeat + 0.3 * uWarm) {
      vec2 c = (id + 0.3 + 0.4 * vec2(hash21(id + 1.9), hash21(id + 5.3))) * cell;
      vec2 d = s - c;
      float spin = t * (1.0 + seed * 2.0) + seed * 20.0;
      float cs = cos(spin);
      float sn = sin(spin);
      d = vec2(d.x * cs - d.y * sn, d.x * sn + d.y * cs);
      d.x /= 0.35 + 0.65 * abs(sin(spin * 0.7));
      float size = 1.6 + fi * 0.9;
      ash = max(ash, exp(-dot(d, d) / (size * size)) * 0.45);
    }
  }

  // Motes glinting in the sunbeam from the upper right.
  {
    vec2 sun = vec2(0.68 * w, 0.06 * h + 90.0);
    vec2 dir = normalize(vec2(-0.35, 1.0));
    vec2 rel = p - sun;
    float perp = abs(rel.x * dir.y - rel.y * dir.x);
    float beam = exp(-perp * perp / (w * w * 0.02)) * smoothstep(0.0, 200.0, dot(rel, dir));
    vec2 s = p + vec2(sin(t * 0.2) * 20.0, -t * 6.0);
    vec2 id = floor(s / 36.0);
    float seed = hash21(id + 211.0);
    if (seed < 0.35 && beam > 0.02) {
      vec2 c = (id + 0.2 + 0.6 * vec2(hash21(id + 2.2), hash21(id + 8.8))) * 36.0;
      float tw = 0.5 + 0.5 * sin(t * (1.5 + seed * 3.0) + seed * 30.0);
      glow += vec3(1.0, 0.97, 0.88) * exp(-dot(s - c, s - c) / 1.4) * tw * beam * 0.9;
    }
  }

  // Hearth glow pooling at the foot of the screen.
  float pool = exp(-pow((p.x / w - 0.5) / 0.35, 2.0)) * smoothstep(0.7, 1.0, v);
  glow += vec3(1.0, 0.32, 0.18) * pool * (0.05 + 0.1 * uHeat + 0.25 * uGust + 0.15 * uWarm);
  glow += vec3(1.0, 0.82, 0.4) * pool * 0.3 * uGold;

  vec3 ashCol = vec3(0.32, 0.29, 0.27);
  float glowA = clamp(max(glow.r, max(glow.g, glow.b)), 0.0, 1.0);
  float a = clamp(glowA + ash * (1.0 - glowA), 0.0, 1.0);
  vec3 c = glow + ashCol * ash * (1.0 - glowA);
  outColor = vec4(min(c, vec3(a)), a);
}`;

	function embers(canvas: HTMLCanvasElement) {
		const pass = createFullscreenPass(canvas, FRAG, 'ashcourt embers', {
			alpha: true,
			premultipliedAlpha: true
		});
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
		let gust = 0;
		let gold = 0;

		const draw = (ms: number) => {
			if (!cssW || !cssH) return;
			const dt = Math.min(1 / 30, Math.max(0, (ms - last) / 1000));
			last = ms;
			const ease = 1 - Math.exp(-dt * 1.5);
			warm += ((mood === 'won' ? 1 : 0) - warm) * ease;
			hot += (heat - hot) * ease;
			gust *= Math.exp(-dt * 1.6);
			gold *= Math.exp(-dt * 1.2);
			gl.clearColor(0, 0, 0, 0);
			gl.clear(gl.COLOR_BUFFER_BIT);
			gl.uniform2f(pass.uniform('uRes'), cssW, cssH);
			gl.uniform1f(pass.uniform('uDpr'), dpr);
			gl.uniform1f(pass.uniform('uTime'), (ms - t0) / 1000);
			gl.uniform1f(pass.uniform('uHeat'), hot);
			gl.uniform1f(pass.uniform('uWarm'), warm);
			gl.uniform1f(pass.uniform('uGust'), gust);
			gl.uniform1f(pass.uniform('uGold'), gold);
			pass.draw();
		};

		const loop = (ms: number) => {
			raf = 0;
			draw(ms);
			if (!calm && !document.hidden) raf = requestAnimationFrame(loop);
		};

		const kick = () => {
			if (calm) {
				cancelAnimationFrame(raf);
				raf = 0;
				gl.clearColor(0, 0, 0, 0);
				gl.clear(gl.COLOR_BUFFER_BIT);
				return;
			}
			if (!raf && !document.hidden) {
				last = performance.now();
				raf = requestAnimationFrame(loop);
			}
		};

		const resize = () => {
			const rect = canvas.getBoundingClientRect();
			// Tiny glowing dots; native-ish resolution is unnecessary.
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

		let seenStrikes = untrack(() => strikes);
		let seenKindle = untrack(() => kindle);
		$effect(() => {
			const s = strikes;
			const k = kindle;
			untrack(() => {
				if (s > seenStrikes) gust = Math.min(1.2, gust + 0.8);
				if (k > seenKindle) {
					gold = 1;
					gust = Math.min(1.2, gust + 0.5);
				}
				seenStrikes = s;
				seenKindle = k;
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

{#if !failed}
	<canvas class="embers" aria-hidden="true" {@attach embers}></canvas>
{/if}

<style>
	.embers {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
		pointer-events: none;
	}
</style>
