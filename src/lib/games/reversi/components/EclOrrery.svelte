<script lang="ts">
	import { untrack } from 'svelte';
	import { createFullscreenPass } from '$lib/gl/fullscreen';
	import { createPacer } from '$lib/gl/pace';

	let {
		mood = 'menu',
		balance = 0,
		winner = 0
	}: {
		mood?: 'menu' | 'play' | 'won';
		/** -1 Moon ahead, +1 Sun ahead. */
		balance?: number;
		/** 0 none, 1 Moon, 2 Sun. */
		winner?: 0 | 1 | 2;
	} = $props();

	let failed = $state(false);

	// Twilight sky through the observatory slit, with a brass orrery turning behind the board.
	// CSS pixels, y down.
	const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uDpr;
uniform float uTime;
uniform float uBalance;
uniform float uMenu;
uniform float uGlow;
uniform float uWinSide;
uniform float uSpin;
uniform float uFade;
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
    p = p * 2.03 + 11.7;
    a *= 0.5;
  }
  return s;
}

mat2 rot(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c);
}

// One layer of stars in rotating sky cells.
float stars(vec2 q, float cell, float density, float t, float seed) {
  vec2 id = floor(q / cell);
  float h = hash21(id + seed);
  if (h > density) return 0.0;
  vec2 c = (id + 0.2 + 0.6 * vec2(hash21(id + seed + 3.1), hash21(id + seed + 7.3))) * cell;
  vec2 d = q - c;
  float size = 0.6 + 1.6 * hash21(id + seed + 1.7);
  float tw = 0.55 + 0.45 * sin(t * (0.6 + 2.2 * hash21(id + seed + 9.1)) + h * 40.0);
  float core = exp(-dot(d, d) / (size * size));
  float spike = exp(-abs(d.x) / (size * 2.2) - d.y * d.y / 0.5) + exp(-abs(d.y) / (size * 2.2) - d.x * d.x / 0.5);
  return (core + spike * 0.25 * step(0.8, hash21(id + seed + 5.5))) * tw;
}

void main() {
  vec2 frag = gl_FragCoord.xy / uDpr;
  vec2 p = vec2(frag.x, uRes.y - frag.y);
  float w = uRes.x;
  float h = uRes.y;
  float t = uTime;
  float v = p.y / h;
  float warm = max(uBalance, 0.0);
  float cool = max(-uBalance, 0.0);

  // Sky: indigo zenith settling into a rose-violet horizon.
  vec3 zenith = vec3(0.027, 0.035, 0.105);
  vec3 mid = vec3(0.085, 0.075, 0.2);
  vec3 low = vec3(0.24, 0.13, 0.25);
  vec3 col = mix(zenith, mid, smoothstep(0.0, 0.62, v));
  col = mix(col, low, smoothstep(0.58, 1.05, v));
  vec3 sunTint = vec3(0.95, 0.6, 0.28);
  vec3 moonTint = vec3(0.45, 0.6, 0.95);
  float horizon = smoothstep(0.45, 1.0, v);
  col += sunTint * warm * 0.22 * horizon + moonTint * cool * 0.2 * horizon;

  // Galactic band drifting across the slit.
  vec2 band = rot(-0.5) * (p - vec2(0.5 * w, 0.4 * h));
  float lane = exp(-pow(band.y / (h * 0.16), 2.0));
  float dust = fbm(band * vec2(0.004, 0.012) + vec2(t * 0.004, 0.0));
  float rift = smoothstep(0.45, 0.75, fbm(band * vec2(0.008, 0.03) + 7.0));
  col += vec3(0.32, 0.26, 0.45) * lane * dust * 0.32 * (1.0 - 0.6 * rift);

  // Stars wheel slowly about a pole above the dome.
  vec2 pole = vec2(0.5 * w, -0.4 * h);
  vec2 sky = rot(t * 0.006) * (p - pole);
  float fadeLow = 1.0 - smoothstep(0.55, 0.95, v);
  float s = stars(sky, 34.0, 0.16, t, 1.0) * 0.8 + stars(sky, 71.0, 0.22, t, 9.0) * 1.0 + stars(sky + 500.0, 17.0, 0.1, t, 21.0) * 0.4;
  col += vec3(0.92, 0.94, 1.0) * s * fadeLow * (0.75 + 0.25 * lane);

  // Brass orrery: tilted rings and planets about a lamp at the centre.
  vec2 c = vec2(0.5 * w, mix(0.52, 0.5, uMenu) * h);
  float R = min(w * 0.62, h * 1.05);
  float k = 0.36;
  vec2 q = rot(-0.16) * (p - c);
  vec2 e = vec2(q.x, q.y / k);
  float d = length(e);
  float ang = atan(e.y, e.x);
  float bright = mix(0.75, 1.0, uMenu);
  vec3 brass = vec3(0.86, 0.66, 0.34);
  float radii[4] = float[4](0.42, 0.56, 0.71, 0.9);
  for (int i = 0; i < 4; i++) {
    float r = radii[i] * R;
    // Ring width in screen space shrinks where the tilt foreshortens it.
    float wid = 1.3 + 0.9 * abs(sin(ang));
    float ring = exp(-pow((d - r) * k / wid, 2.0) * 1.0) ;
    float sheen = 0.45 + 0.55 * pow(0.5 + 0.5 * cos(ang - 1.2 + t * 0.05), 3.0);
    float front = 0.55 + 0.45 * smoothstep(-0.2, 0.4, sin(ang));
    col += brass * ring * sheen * front * 0.42 * bright;
    if (i == 3) {
      float tick = step(0.82, abs(sin(ang * 36.0))) * exp(-pow((d - r - 9.0 / k) * k / 3.0, 2.0));
      col += brass * tick * 0.25 * front * bright;
    }
  }

  // Lamp of the orrery: a warm sun the planets turn about.
  float lampR = R * 0.05;
  float lampD = length(p - c);
  col += vec3(1.0, 0.78, 0.42) * exp(-lampD / (lampR * 3.0)) * 0.22 * bright;

  vec3 planetCol[5] = vec3[5](vec3(0.82, 0.84, 0.92), vec3(0.85, 0.55, 0.3), vec3(0.35, 0.5, 0.85), vec3(0.95, 0.78, 0.45), vec3(0.6, 0.66, 0.8));
  float planetRing[5] = float[5](0.42, 0.56, 0.71, 0.9, 0.56);
  float planetSpeed[5] = float[5](0.11, 0.07, 0.045, 0.028, 0.07);
  float planetPhase[5] = float[5](0.4, 2.6, 4.1, 1.3, 5.7);
  float planetSize[5] = float[5](0.018, 0.026, 0.03, 0.04, 0.014);
  for (int i = 0; i < 5; i++) {
    float a = planetPhase[i] + uSpin * planetSpeed[i];
    vec2 loc = vec2(cos(a), sin(a) * k) * planetRing[i] * R;
    vec2 pc = c + rot(0.16) * loc;
    float depth = 0.75 + 0.25 * sin(a);
    float pr = planetSize[i] * R * depth;
    vec2 rel = (p - pc) / pr;
    float rr = dot(rel, rel);
    // Spoke from the lamp to each planet.
    vec2 ab = pc - c;
    float hseg = clamp(dot(p - c, ab) / dot(ab, ab), 0.0, 1.0);
    float spoke = exp(-pow(length(p - c - ab * hseg) / 0.9, 2.0));
    col += brass * spoke * 0.12 * depth * bright;
    if (rr < 1.6) {
      vec3 n = vec3(rel, sqrt(max(0.0, 1.0 - rr)));
      vec3 toLamp = normalize(vec3(c - pc, pr * 3.0));
      float lit = max(0.0, dot(n, toLamp));
      float spec = pow(max(0.0, dot(reflect(-toLamp, n), vec3(0.0, 0.0, 1.0))), 18.0);
      float body = 1.0 - smoothstep(0.86, 1.0, rr);
      vec3 pcol = planetCol[i] * (0.12 + 0.95 * lit) + vec3(1.0, 0.95, 0.85) * spec * 0.6;
      col = mix(col, pcol * depth * bright, body);
      col += planetCol[i] * exp(-rr * 0.8) * 0.06 * (1.0 - body);
    }
  }

  // Victory: the winner's light floods out of the orrery.
  if (uGlow > 0.001) {
    vec3 gc = uWinSide > 0.0 ? vec3(1.0, 0.72, 0.36) : vec3(0.62, 0.74, 1.0);
    vec2 rp = p - c;
    float ra = atan(rp.y, rp.x);
    float rays = pow(0.5 + 0.5 * sin(ra * 18.0 + t * 0.35) * sin(ra * 7.0 - t * 0.2), 2.0);
    float fall = exp(-length(rp) / (min(w, h) * 0.55));
    col += gc * (rays * 0.35 + 0.25) * fall * uGlow;
  }

  // Dome shadow at the edges of the slit.
  vec2 uv = p / uRes - 0.5;
  float vig = smoothstep(0.95, 0.25, length(uv * vec2(1.05, 1.25)));
  col *= mix(0.45, 1.0, vig);

  col += (hash21(p + fract(t)) - 0.5) / 255.0;
  outColor = vec4(col * uFade, 1.0);
}`;

	function backdrop(canvas: HTMLCanvasElement) {
		const pass = createFullscreenPass(canvas, FRAG, 'eclipse orrery');
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
		let tilt = untrack(() => balance);
		let menu = untrack(() => (mood === 'menu' ? 1 : 0));
		let glow = untrack(() => (mood === 'won' ? 1 : 0));
		let side = untrack(() => (winner === 2 ? 1 : -1));
		let spin = 0;
		let fade = calm ? 1 : 0;

		const draw = (ms: number) => {
			if (!cssW || !cssH) return;
			const dt = Math.min(1 / 20, Math.max(0, (ms - last) / 1000));
			last = ms;
			const ease = calm ? 1 : 1 - Math.exp(-dt * 1.6);
			tilt += (balance - tilt) * ease;
			menu += ((mood === 'menu' ? 1 : 0) - menu) * ease;
			glow += ((mood === 'won' ? 1 : 0) - glow) * ease;
			if (winner) side = winner === 2 ? 1 : -1;
			// The orrery turns briskly on the title and slows to a crawl in play.
			spin += dt * (0.35 + 1.4 * menu);
			fade = Math.min(1, fade + dt * 1.2);
			gl.uniform2f(pass.uniform('uRes'), cssW, cssH);
			gl.uniform1f(pass.uniform('uDpr'), dpr);
			gl.uniform1f(pass.uniform('uTime'), calm ? 12 : (ms - t0) / 1000);
			gl.uniform1f(pass.uniform('uBalance'), tilt);
			gl.uniform1f(pass.uniform('uMenu'), menu);
			gl.uniform1f(pass.uniform('uGlow'), glow);
			gl.uniform1f(pass.uniform('uWinSide'), side);
			gl.uniform1f(pass.uniform('uSpin'), calm ? 8 : spin);
			gl.uniform1f(pass.uniform('uFade'), fade);
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
			// Soft sky: a capped backing store keeps the full-screen pass cheap on dense displays.
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

		$effect(() => {
			void mood;
			void balance;
			void winner;
			untrack(() => {
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

{#if failed}
	<div class="fallback" class:sun={balance > 0.15} class:moon={balance < -0.15} aria-hidden="true"></div>
{:else}
	<canvas class="sky" aria-hidden="true" {@attach backdrop}></canvas>
{/if}

<style>
	.sky,
	.fallback {
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
			radial-gradient(ellipse 60% 22% at 50% 52%, transparent 70%, rgba(220, 170, 90, 0.18) 71%, transparent 73%),
			radial-gradient(ellipse 80% 30% at 50% 52%, transparent 70%, rgba(220, 170, 90, 0.14) 71%, transparent 73%),
			linear-gradient(180deg, #070921 0%, #161433 55%, #3d2140 100%);
		transition: filter 1.2s ease;
	}

	.fallback.sun {
		filter: sepia(0.25) saturate(1.2);
	}

	.fallback.moon {
		filter: hue-rotate(-12deg) saturate(1.1);
	}
</style>
