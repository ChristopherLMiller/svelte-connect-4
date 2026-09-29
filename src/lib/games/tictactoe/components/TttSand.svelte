<script lang="ts">
	import { untrack } from 'svelte';
	import { createFullscreenPass } from '$lib/gl/fullscreen';

	let {
		won = false,
		hot = false
	}: {
		/** Round won — stronger heat bloom over the board. */
		won?: boolean;
		/** Celebrating — full-strength glare and sheen. */
		hot?: boolean;
	} = $props();

	let failed = $state(false);

	// CSS pixels, y down. Mirrors the layered CSS beach so the fallback and the canvas match.
	const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uDpr;
uniform float uWon;
uniform float uHot;
uniform float uGrainReady;
uniform sampler2D uGrain;
out vec4 outColor;

vec3 rgb(float r, float g, float b) { return vec3(r, g, b) / 255.0; }

float radial(vec2 p, vec2 c, vec2 r, float stop) {
  return clamp(1.0 - length((p - c) / r) / stop, 0.0, 1.0);
}

vec2 farCorner(vec2 c, vec2 lo, vec2 hi) {
  return max(abs(c - lo), abs(hi - c)) * 1.41421356;
}

vec3 over(vec3 dst, vec3 src, float a) { return mix(dst, src, clamp(a, 0.0, 1.0)); }
vec3 screenOver(vec3 dst, vec3 src, float a) { return dst + clamp(a, 0.0, 1.0) * (src - dst * src); }

vec3 ramp4(float v, vec3 a, vec3 b, vec3 c, vec3 d, float sb, float sc) {
  if (v < sb) return mix(a, b, v / sb);
  if (v < sc) return mix(b, c, (v - sb) / (sc - sb));
  return mix(c, d, (v - sc) / (1.0 - sc));
}

void main() {
  vec2 frag = gl_FragCoord.xy / uDpr;
  vec2 p = vec2(frag.x, uRes.y - frag.y);
  float w = uRes.x;
  float h = uRes.y;
  vec2 full = vec2(w, h);

  vec3 col = ramp4(clamp(p.y / h, 0.0, 1.0), rgb(217.0, 184.0, 135.0), rgb(193.0, 154.0, 114.0), rgb(169.0, 123.0, 88.0), rgb(141.0, 98.0, 72.0), 0.42, 0.76);
  col = over(col, rgb(90.0, 150.0, 150.0), 0.12 * radial(p, vec2(0.12, 0.7) * full, vec2(700.0, 380.0), 0.55));
  col = over(col, rgb(176.0, 122.0, 78.0), 0.28 * radial(p, vec2(0.9, 0.3) * full, vec2(900.0, 420.0), 0.5));
  col = over(col, rgb(255.0, 244.0, 220.0), 0.32 * radial(p, vec2(0.38, 0.28) * full, vec2(900.0, 520.0), 0.58));

  if (uGrainReady > 0.5) {
    vec3 grain = texture(uGrain, p / 96.0).rgb;
    col = mix(col, col * grain, 0.28);
  }

  float wetTop = h * 0.56;
  if (p.y > wetTop) {
    float v = (p.y - wetTop) / (h * 0.44);
    vec4 wet = v < 0.32 ? vec4(rgb(149.0, 108.0, 78.0), 0.14 * v / 0.32)
      : v < 0.52 ? vec4(mix(rgb(149.0, 108.0, 78.0), rgb(92.0, 86.0, 72.0), (v - 0.32) / 0.2), mix(0.14, 0.16, (v - 0.32) / 0.2))
      : v < 0.74 ? vec4(mix(rgb(92.0, 86.0, 72.0), rgb(45.0, 108.0, 128.0), (v - 0.52) / 0.22), mix(0.16, 0.14, (v - 0.52) / 0.22))
      : vec4(rgb(45.0, 108.0, 128.0), 0.14 * (1.0 - (v - 0.74) / 0.26));
    col = over(col, wet.rgb, wet.a);
  }

  float heat = mix(0.65, 0.9, uWon);
  vec2 hA = vec2(0.36, 0.32) * full;
  col = screenOver(col, rgb(255.0, 240.0, 210.0), heat * 0.22 * radial(p, hA, farCorner(hA, vec2(0.0), full), 0.48));
  vec2 hB = vec2(0.7, 0.58) * full;
  col = screenOver(col, rgb(255.0, 226.0, 180.0), heat * (1.0 - uWon) * 0.1 * radial(p, hB, farCorner(hB, vec2(0.0), full), 0.42));
  vec2 hC = vec2(0.5, 0.42) * full;
  col = screenOver(col, rgb(255.0, 232.0, 180.0), heat * uWon * 0.3 * radial(p, hC, farCorner(hC, vec2(0.0), full), 0.52));

  vec2 gLo = vec2(0.0, 0.1 * h);
  vec2 gHi = vec2(w, 0.62 * h);
  vec2 gC = vec2(0.42 * w, gLo.y + 0.38 * (gHi.y - gLo.y));
  float gd = length((p - gC) / farCorner(gC, gLo, gHi));
  float glareA = gd < 0.42 ? mix(0.28, 0.08, gd / 0.42) : mix(0.08, 0.0, clamp((gd - 0.42) / 0.32, 0.0, 1.0));
  vec3 glareC = gd < 0.42 ? mix(rgb(255.0, 248.0, 226.0), rgb(255.0, 230.0, 186.0), gd / 0.42) : rgb(255.0, 230.0, 186.0);
  float inside = 1.0 - smoothstep(0.97, 1.0, length((p - 0.5 * (gLo + gHi)) / (0.5 * (gHi - gLo))));
  col = screenOver(col, glareC, mix(0.7, 1.0, uHot) * glareA * inside);

  float sTop = h * 0.64;
  float sH = h * 0.18;
  if (p.y > sTop && p.y < sTop + sH) {
    float v = (p.y - sTop) / sH;
    vec4 s = v < 0.4 ? vec4(vec3(1.0), 0.08 * v / 0.4)
      : v < 0.7 ? vec4(mix(vec3(1.0), rgb(210.0, 236.0, 240.0), (v - 0.4) / 0.3), mix(0.08, 0.16, (v - 0.4) / 0.3))
      : vec4(rgb(210.0, 236.0, 240.0), 0.16 * (1.0 - (v - 0.7) / 0.3));
    col = over(col, s.rgb, s.a * mix(0.8, 1.0, uHot));
  }

  outColor = vec4(col, 1.0);
}`;

	function sand(canvas: HTMLCanvasElement) {
		const pass = createFullscreenPass(canvas, FRAG, 'ttt sand');
		if (!pass) {
			failed = true;
			return;
		}
		const { gl } = pass;
		const texture = gl.createTexture();
		let grainReady = false;
		let cssW = 0;
		let cssH = 0;
		let dpr = 1;

		const draw = () => {
			if (!cssW || !cssH) return;
			gl.uniform2f(pass.uniform('uRes'), cssW, cssH);
			gl.uniform1f(pass.uniform('uDpr'), dpr);
			gl.uniform1f(pass.uniform('uWon'), won ? 1 : 0);
			gl.uniform1f(pass.uniform('uHot'), hot ? 1 : 0);
			gl.uniform1f(pass.uniform('uGrainReady'), grainReady ? 1 : 0);
			gl.uniform1i(pass.uniform('uGrain'), 0);
			pass.draw();
		};

		const image = new Image();
		image.onload = () => {
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			grainReady = true;
			draw();
		};
		image.src = '/sand-grain.png';

		const resize = () => {
			const rect = canvas.getBoundingClientRect();
			// Static image: full DPR keeps the grain crisp and it only rasterises on resize.
			dpr = Math.min(window.devicePixelRatio || 1, 2);
			cssW = rect.width;
			cssH = rect.height;
			const pxW = Math.max(1, Math.round(cssW * dpr));
			const pxH = Math.max(1, Math.round(cssH * dpr));
			if (canvas.width !== pxW || canvas.height !== pxH) {
				canvas.width = pxW;
				canvas.height = pxH;
				gl.viewport(0, 0, pxW, pxH);
			}
			draw();
		};

		const observer = new ResizeObserver(resize);
		observer.observe(canvas);
		untrack(resize);

		const onLost = (event: Event) => {
			event.preventDefault();
			failed = true;
		};
		canvas.addEventListener('webglcontextlost', onLost);

		$effect(() => {
			void won;
			void hot;
			draw();
		});

		return () => {
			image.onload = null;
			observer.disconnect();
			canvas.removeEventListener('webglcontextlost', onLost);
			gl.deleteTexture(texture);
			pass.dispose();
		};
	}
</script>

{#if failed}
	<div class="fallback" class:won class:hot aria-hidden="true">
		<div class="grain"></div>
		<div class="wet"></div>
		<div class="heat"></div>
		<div class="glare"></div>
		<div class="sheen"></div>
	</div>
{:else}
	<canvas class="sand" aria-hidden="true" {@attach sand}></canvas>
{/if}

<style>
	.sand,
	.fallback {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		z-index: 0;
		display: block;
		pointer-events: none;
	}

	.fallback > div {
		position: absolute;
		pointer-events: none;
	}

	.grain {
		inset: 0;
		opacity: 0.28;
		mix-blend-mode: multiply;
		background-image: url('/sand-grain.png');
		background-size: 96px 96px;
	}

	.wet {
		left: 0;
		right: 0;
		bottom: 0;
		height: 44vh;
		background: linear-gradient(
			180deg,
			transparent 0%,
			rgba(149, 108, 78, 0.14) 32%,
			rgba(92, 86, 72, 0.16) 52%,
			rgba(45, 108, 128, 0.14) 74%,
			transparent 100%
		);
	}

	.heat {
		inset: 0;
		background:
			radial-gradient(ellipse at 36% 32%, rgba(255, 240, 210, 0.22), transparent 48%),
			radial-gradient(ellipse at 70% 58%, rgba(255, 226, 180, 0.1), transparent 42%);
		mix-blend-mode: screen;
		opacity: 0.65;
	}

	.won .heat {
		opacity: 0.9;
		background:
			radial-gradient(ellipse at 50% 42%, rgba(255, 232, 180, 0.3), transparent 52%),
			radial-gradient(ellipse at 36% 32%, rgba(255, 240, 210, 0.22), transparent 48%);
	}

	.glare {
		top: 10%;
		left: 0;
		width: 100%;
		height: 52%;
		border-radius: 50%;
		background: radial-gradient(ellipse at 42% 38%, rgba(255, 248, 226, 0.28), rgba(255, 230, 186, 0.08) 42%, transparent 74%);
		opacity: 0.7;
		mix-blend-mode: screen;
	}

	.sheen {
		left: 0;
		right: 0;
		bottom: 18vh;
		height: 18vh;
		background: linear-gradient(180deg, transparent 0%, rgba(255, 255, 255, 0.08) 40%, rgba(210, 236, 240, 0.16) 70%, transparent 100%);
		opacity: 0.8;
	}

	.hot .glare,
	.hot .sheen {
		opacity: 1;
	}
</style>
