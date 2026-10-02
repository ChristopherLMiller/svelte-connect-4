<script lang="ts">
	import { untrack } from 'svelte';
	import { createFullscreenPass } from '$lib/gl/fullscreen';
	import { createPacer } from '$lib/gl/pace';

	let {
		won = false,
		washing = false,
		moves = 0
	}: {
		/** Round won — golden light and a flurry of glints. */
		won?: boolean;
		/** Surge in progress — the light dims under the spray. */
		washing?: boolean;
		/** Marks on the board; each new one kicks a little puff of wind. */
		moves?: number;
	} = $props();

	let failed = $state(false);

	// Premultiplied light and shade over the beach: palm shadows, cloud shade, shallow-water
	// caustics, blowing sand and mica glints. CSS pixels, y down.
	const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uDpr;
uniform float uTime;
uniform float uWarm;
uniform float uDim;
uniform float uGust;
uniform vec3 uWind;
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
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    s += a * vnoise(p);
    p = p * 2.03 + vec2(17.1, 9.3);
    a *= 0.5;
  }
  return s;
}

// A palm frond: a drooping spine with jagged leaflets, swaying about its pivot.
float frond(vec2 p, vec2 pivot, float ang, float len, float wid, float droop) {
  vec2 d = p - pivot;
  vec2 dir = vec2(cos(ang), sin(ang));
  float along = dot(d, dir);
  if (along < 0.0 || along > len) return 0.0;
  float k = along / len;
  float across = d.x * dir.y - d.y * dir.x;
  across += droop * k * k * len;
  float span = wid * sin(3.14159 * min(1.0, k * 1.15)) * (1.0 - 0.3 * k);
  float leaf = fract(along / 20.0 - abs(across) / 26.0);
  float blade = smoothstep(0.8, 0.6, leaf) * smoothstep(0.0, 0.08, leaf);
  float body = smoothstep(span + 5.0, span - 5.0, abs(across));
  float spine = smoothstep(4.0, 1.0, abs(across)) * smoothstep(1.0, 0.8, k);
  return max(body * blade, spine);
}

void main() {
  vec2 frag = gl_FragCoord.xy / uDpr;
  vec2 p = vec2(frag.x, uRes.y - frag.y);
  float w = uRes.x;
  float h = uRes.y;
  float t = uTime;
  float v = p.y / h;

  float shade = 0.0;
  vec3 light = vec3(0.0);

  // Palm shadows leaning in from the upper corners, blurred like real sun-cast shade.
  {
    float swayL = 0.05 * sin(t * 0.55) + 0.025 * sin(t * 1.3 + 1.0);
    float swayR = 0.05 * sin(t * 0.5 + 2.0) + 0.025 * sin(t * 1.1);
    vec2 pl = vec2(-0.04 * w, -0.06 * h);
    vec2 pr = vec2(1.05 * w, -0.1 * h);
    float scale = clamp(min(w, h * 1.4) / 900.0, 0.55, 1.3);
    float L = 380.0 * scale;
    float W = 48.0 * scale;
    float f = 0.0;
    f = max(f, frond(p, pl, 0.25 + swayL, L, W, 0.12));
    f = max(f, frond(p, pl, 0.75 + swayL * 1.2, L * 0.92, W, 0.16));
    f = max(f, frond(p, pl, 1.22 + swayL * 0.8, L * 0.8, W * 0.9, 0.12));
    f = max(f, frond(p, pr, 3.14159 - 0.35 + swayR, L * 0.95, W, -0.14));
    f = max(f, frond(p, pr, 3.14159 - 0.9 + swayR * 1.2, L * 0.85, W, -0.18));
    f = max(f, frond(p, pr, 3.14159 - 1.4 + swayR * 0.7, L * 0.7, W * 0.85, -0.1));
    float dapple = 0.75 + 0.25 * vnoise(p * 0.04 + t * 0.3);
    shade = max(shade, f * 0.26 * dapple);
  }

  // Cloud shade drifting slowly across the beach.
  {
    float n = fbm(p * 0.0022 + vec2(-t * 0.018, t * 0.006));
    shade = max(shade, smoothstep(0.52, 0.72, n) * 0.13);
  }

  // Caustic web on the wet sand and in the shallows.
  float rest = max(140.0, h * 0.26);
  float band = smoothstep(h - rest + 5.0, h - rest + 45.0, p.y) * (1.0 - smoothstep(h - rest + 70.0, h - rest + 140.0, p.y));
  if (band > 0.0) {
    vec2 q = p * vec2(0.022, 0.034);
    float a = vnoise(q + vec2(t * 0.35, t * 0.2)) + 0.5 * vnoise(q * 2.1 - vec2(t * 0.25, -t * 0.4));
    float b = vnoise(q * 1.3 + vec2(-t * 0.3, t * 0.28) + 11.0) + 0.5 * vnoise(q * 2.4 + vec2(t * 0.45, t * 0.1) + 5.0);
    float web = (1.0 - smoothstep(0.0, 0.09, abs(a - 0.75))) * 0.7 + (1.0 - smoothstep(0.0, 0.07, abs(b - 0.75))) * 0.6;
    light += vec3(1.0, 0.98, 0.9) * web * band * 0.32 * (1.0 - uDim);
  }

  // Wind: faint wisps of sand in patchy gusts; heading and travel come from the host.
  {
    float gust = min(1.0, uWind.z + uGust);
    if (gust > 0.01) {
      vec2 dir = vec2(cos(uWind.x), sin(uWind.x));
      vec2 r = vec2(dot(p, dir), p.x * dir.y - p.y * dir.x);
      vec2 s = vec2(r.x - uWind.y, r.y + sin(r.x * 0.008 + t * 0.7) * 10.0);
      vec2 cell = vec2(110.0, 9.0);
      vec2 id = floor(s / cell);
      float seed = hash21(id + 41.0);
      float spread = smoothstep(0.2, 0.6, vnoise(p * 0.004 + vec2(t * 0.05, 0.0)));
      // Sheets of fine sand sliding along the wind, stretched long in its direction.
      float veil = smoothstep(0.55, 0.9, vnoise(vec2(s.x * 0.006, s.y * 0.05)));
      light += vec3(1.0, 0.94, 0.82) * veil * 0.08 * gust * (0.4 + 0.6 * spread);
      if (seed < 0.1 * gust * (0.3 + 0.7 * spread)) {
        float len = 20.0 + 50.0 * hash21(id + 19.0);
        vec2 c = (id + vec2(0.5, 0.5)) * cell;
        vec2 d = (s - c) / vec2(len, 1.5);
        float streak = exp(-dot(d, d));
        light += vec3(1.0, 0.94, 0.82) * streak * 0.36 * min(1.0, 0.4 + gust);
      }
    }
  }

  // Mica glints twinkling in the dry sand; a golden flurry when a round is won.
  {
    vec2 id = floor(p / 26.0);
    float seed = hash21(id + 7.0);
    float dry = 1.0 - smoothstep(0.6, 0.72, v);
    if (seed < 0.1 + 0.2 * uWarm) {
      vec2 c = (id + 0.2 + 0.6 * vec2(hash21(id + 1.3), hash21(id + 4.4))) * 26.0;
      float tw = pow(max(0.0, sin(t * (1.2 + seed * 3.0) + seed * 60.0)), 12.0);
      vec2 d = p - c;
      float star = exp(-dot(d, d) / 1.2) + 0.5 * (exp(-d.y * d.y / 0.6 - abs(d.x) / 5.0) + exp(-d.x * d.x / 0.6 - abs(d.y) / 5.0));
      vec3 tint = mix(vec3(1.0, 1.0, 0.95), vec3(1.0, 0.85, 0.5), uWarm);
      light += tint * star * tw * dry * (0.7 + 0.5 * uWarm);
    }
  }

  // Golden afternoon wash over the board when the round is won.
  {
    vec2 sun = vec2(0.3 * w, -0.2 * h);
    vec2 rel = p - sun;
    float ang = atan(rel.x, rel.y);
    float rays = 0.5 + 0.5 * sin(ang * 22.0 + t * 0.4) * sin(ang * 13.0 - t * 0.25);
    float fall = exp(-length(rel) / (h * 0.9));
    light += vec3(1.0, 0.8, 0.45) * rays * fall * 0.22 * uWarm;
  }

  float la = clamp(max(light.r, max(light.g, light.b)), 0.0, 1.0);
  shade *= 1.0 - la;
  vec3 shadeCol = vec3(0.24, 0.14, 0.09);
  float a = clamp(la + shade, 0.0, 1.0);
  vec3 c = light + shadeCol * shade;
  outColor = vec4(min(c, vec3(a)), a);
}`;

	function glow(canvas: HTMLCanvasElement) {
		const pass = createFullscreenPass(canvas, FRAG, 'ttt light', { alpha: true, premultipliedAlpha: true });
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
		let warm = untrack(() => (won ? 1 : 0));
		let dim = untrack(() => (washing ? 1 : 0));
		let gust = 0;

		// Gusts arrive at random, each from a fresh heading picked while the air is still.
		const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
		let heading = rand(0, Math.PI * 2);
		let travel = 0;
		let speed = 0;
		let strength = 0;
		let gustStart = t0 + rand(1000, 3000);
		let gustLen = 0;
		let blow = 0;

		const wind = (ms: number, dt: number) => {
			if (ms >= gustStart + gustLen) {
				if (gustLen > 0) gustStart = ms + rand(3000, 8000);
				heading = rand(0, Math.PI * 2);
				travel = rand(0, 1e4);
				speed = rand(160, 320);
				strength = rand(0.65, 1);
				gustLen = rand(3200, 6000);
			}
			const k = (ms - gustStart) / gustLen;
			blow = k > 0 && k < 1 ? Math.sin(Math.PI * k) ** 2 * strength : 0;
			travel += speed * (0.35 + 0.65 * blow + gust) * dt;
		};

		const draw = (ms: number) => {
			if (!cssW || !cssH) return;
			const dt = Math.min(1 / 30, Math.max(0, (ms - last) / 1000));
			last = ms;
			const ease = 1 - Math.exp(-dt * 2);
			warm += ((won ? 1 : 0) - warm) * ease;
			dim += ((washing ? 1 : 0) - dim) * ease;
			gust *= Math.exp(-dt * 1.8);
			wind(ms, dt);
			gl.clearColor(0, 0, 0, 0);
			gl.clear(gl.COLOR_BUFFER_BIT);
			gl.uniform2f(pass.uniform('uRes'), cssW, cssH);
			gl.uniform1f(pass.uniform('uDpr'), dpr);
			gl.uniform1f(pass.uniform('uTime'), calm ? 4 : (ms - t0) / 1000);
			gl.uniform1f(pass.uniform('uWarm'), calm ? (won ? 1 : 0) : warm);
			gl.uniform1f(pass.uniform('uDim'), dim);
			gl.uniform1f(pass.uniform('uGust'), calm ? 0 : gust);
			gl.uniform3f(pass.uniform('uWind'), heading, travel, calm ? 0 : blow);
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
				cancelAnimationFrame(raf);
				raf = 0;
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
			// Soft shade and sparkles; a capped backing store keeps the full-screen pass cheap.
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
		untrack(() => {
			resize();
			kick();
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

		let seen = untrack(() => moves);
		$effect(() => {
			const m = moves;
			void won;
			void washing;
			untrack(() => {
				if (m > seen) gust = Math.min(0.5, gust + 0.3);
				seen = m;
				if (calm) draw(performance.now());
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
	<canvas class="light" aria-hidden="true" {@attach glow}></canvas>
{/if}

<style>
	.light {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		z-index: 1;
		display: block;
		pointer-events: none;
	}
</style>
