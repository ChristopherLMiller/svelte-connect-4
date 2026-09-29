<script lang="ts">
	import { untrack } from 'svelte';
	import { createFullscreenPass } from '$lib/gl/fullscreen';
	import TttTide from './TttTide.svelte';

	let { surge = false, receding = false }: { surge?: boolean; receding?: boolean } = $props();

	let failed = $state(false);

	// CSS pixels, y down. uLevel is the water height from the bottom edge; uWet blends the
	// translucent shoreline into the opaque surge that wipes the board.
	const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uDpr;
uniform float uTime;
uniform float uLevel;
uniform float uWet;
out vec4 outColor;

vec4 acc;

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

void over(vec3 c, float a) {
  a = clamp(a, 0.0, 1.0);
  acc = vec4(c * a, a) + acc * (1.0 - a);
}

vec4 grad3(float v, vec4 a, vec4 b, vec4 c, float sb) {
  v = clamp(v, 0.0, 1.0);
  return v < sb ? mix(a, b, v / sb) : mix(b, c, (v - sb) / (1.0 - sb));
}

void main() {
  vec2 frag = gl_FragCoord.xy / uDpr;
  vec2 p = vec2(frag.x, uRes.y - frag.y);
  float w = uRes.x;
  float h = uRes.y;
  float H = max(uLevel, 1.0);
  float t = uTime;
  float wet = uWet;
  float calmRoll = 1.0 - wet;

  float top = h - H;
  float u0 = clamp((p.x - 0.5 * w) / (0.5 * w), -1.0, 1.0);
  float dome = wet * H * 0.05 * (1.0 - sqrt(max(0.0, 1.0 - u0 * u0)));
  float lead = wet * (5.0 * sin(p.x * 0.013 + t * 2.4) + 3.0 * sin(p.x * 0.031 - t * 3.1));
  float edge = top + dome + lead;
  if (p.y < edge - 2.0) {
    outColor = vec4(0.0);
    return;
  }
  float inside = smoothstep(edge - 1.0, edge + 1.0, p.y);
  float v = (p.y - top) / H;
  acc = vec4(0.0);

  over(rgb(20.0, 88.0, 108.0), wet);

  vec4 fillIdle = v < 0.38 ? mix(vec4(rgb(74.0, 168.0, 188.0), 0.0), vec4(rgb(47.0, 142.0, 163.0), 1.0), clamp(v / 0.38, 0.0, 1.0))
    : v < 0.62 ? mix(vec4(rgb(47.0, 142.0, 163.0), 1.0), vec4(rgb(29.0, 109.0, 134.0), 1.0), (v - 0.38) / 0.24)
    : mix(vec4(rgb(29.0, 109.0, 134.0), 1.0), vec4(rgb(12.0, 58.0, 76.0), 1.0), clamp((v - 0.62) / 0.38, 0.0, 1.0));
  vec4 fillSurge = grad3(v, vec4(rgb(58.0, 160.0, 184.0), 1.0), vec4(rgb(26.0, 112.0, 136.0), 1.0), vec4(rgb(12.0, 58.0, 76.0), 1.0), 0.22);
  vec4 fill = mix(fillIdle, fillSurge, wet);
  over(fill.rgb, fill.a);

  float hIdle[3] = float[3](0.88, 0.64, 0.48);
  float hSurge[3] = float[3](1.0, 0.72, 0.48);
  float period[3] = float[3](11.0, 7.5, 5.4);
  float dir[3] = float[3](1.0, -1.0, 1.0);
  float topAlpha[3] = float[3](0.75, 0.7, 0.75);
  float surgeOpacity[3] = float[3](1.0, 0.42, 0.42);
  float stop[3] = float[3](0.52, 0.44, 0.40);
  vec3 cTop[3] = vec3[3](rgb(47.0, 142.0, 163.0), rgb(94.0, 184.0, 201.0), rgb(143.0, 208.0, 220.0));
  vec3 cMid[3] = vec3[3](rgb(29.0, 109.0, 134.0), rgb(43.0, 138.0, 163.0), rgb(58.0, 160.0, 184.0));
  vec3 cLow[3] = vec3[3](rgb(14.0, 63.0, 82.0), rgb(20.0, 88.0, 108.0), rgb(24.0, 101.0, 124.0));
  float span = 0.62 * w;

  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float sh = mix(hIdle[i], hSurge[i], wet) * H;
    // Roll, curve and wobble ease down but never vanish, so the surge keeps the shoreline's waves.
    float keep = mix(1.0, 0.35, wet);
    float roll = sin(6.2831853 * t / period[i]) * dir[i];
    float offX = (0.005 + 0.055 * roll) * 1.24 * w * keep;
    float offY = (-0.005 - 0.045 * roll) * min(sh, 240.0) * keep;
    float bottom = h + 0.1 * H * calmRoll + offY;
    float boxTop = bottom - sh;
    float cx = 0.5 * w + offX;
    float uu = (p.x - cx) / span;
    float curve = 0.36 * min(sh, mix(sh, 160.0, wet)) * keep * (1.0 - sqrt(max(0.0, 1.0 - uu * uu)));
    float wobble = mix(1.0, 3.0, wet) * (2.5 * sin(p.x * 0.018 + t * 1.1 + fi * 2.1) + 1.5 * sin(p.x * 0.043 - t * 1.6 + fi * 1.3));
    float crest = boxTop + curve + wobble;
    if (p.y < crest - 1.5) continue;
    float cov = smoothstep(crest - 1.0, crest + 1.0, p.y);
    float layer = mix(1.0, surgeOpacity[i], wet);
    vec4 g = grad3((p.y - boxTop) / sh, vec4(cTop[i], mix(topAlpha[i], 1.0, wet)), vec4(cMid[i], 1.0), vec4(cLow[i], 1.0), stop[i]);
    over(g.rgb, g.a * cov * layer);

    if (i == 2) {
      vec2 hc = vec2(cx - span + 0.2 * 2.0 * span, boxTop);
      float hd = length((p - hc) / vec2(1.2 * 2.0 * span, 0.8 * sh));
      float hl = clamp(1.0 - hd / 0.46, 0.0, 1.0);
      over(mix(vec3(1.0), rgb(244.0, 252.0, 253.0), wet), mix(0.22, 1.0, wet) * hl * cov * layer);
    }

    float below = p.y - crest;
    float band = exp(-max(below, 0.0) / mix(3.2, 2.2, wet)) * cov;
    float lace = smoothstep(0.42, 0.8, vnoise(vec2(p.x * 0.035 + t * 0.6 * dir[i], below * 0.08 + fi * 7.0 - t * 0.35)));
    over(vec3(1.0), band * lace * mix(0.55, 0.25, wet));
  }

  {
    float lipBottom = top + 0.4 * H;
    float lipH = 0.432 * H;
    vec2 lc = vec2(0.5 * w, lipBottom);
    float ld = length((p - lc) / vec2(1.2 * 1.488 * w, 0.8 * lipH));
    float la = ld < 0.48 ? mix(0.55, 0.12, ld / 0.48) : mix(0.12, 0.0, clamp((ld - 0.48) / 0.26, 0.0, 1.0));
    float inBox = step(lipBottom - lipH, p.y) * step(p.y, lipBottom);
    over(rgb(90.0, 170.0, 190.0), la * 0.85 * inBox * calmRoll);

    float sTop = top - 0.06 * H;
    float sH = 0.22 * H;
    vec2 boxC = vec2(0.5 * w, sTop + 0.5 * sH);
    float shape = 1.0 - smoothstep(0.96, 1.0, length((p - boxC) / vec2(0.5 * w, 0.5 * sH)));
    vec2 sc = vec2(0.5 * w, sTop + 0.8 * sH);
    float sd = length((p - sc) / vec2(1.2 * w, 0.9 * sH));
    vec3 capC = sd < 0.46 ? mix(rgb(231.0, 248.0, 251.0), rgb(58.0, 160.0, 184.0), sd / 0.46)
      : mix(rgb(58.0, 160.0, 184.0), rgb(26.0, 112.0, 136.0), clamp((sd - 0.46) / 0.28, 0.0, 1.0));
    over(capC, shape * wet);
  }

  for (int i = 0; i < 12; i++) {
    float fi = float(i);
    vec2 sp = vec2(hash21(vec2(fi, 3.1)) * w, top + (0.08 + 0.4 * hash21(vec2(fi, 7.7))) * H);
    sp.x += 6.0 * sin(t * 0.7 + fi) * calmRoll;
    float r = 1.4 + 1.2 * hash21(vec2(fi, 1.9));
    float tw = 0.5 + 0.5 * sin(t * (1.6 + 0.8 * hash21(vec2(fi, 5.3))) + fi * 1.7);
    float dd = length(p - sp);
    over(vec3(1.0), exp(-dd * dd / (r * r)) * tw * 0.75);
  }

  vec3 fishSpot[3] = vec3[3](vec3(0.12, 0.28, 1.0), vec3(0.48, 0.42, 0.75), vec3(0.70, 0.22, 0.6));
  vec3 fishTime[3] = vec3[3](vec3(9.0, 0.0, 1.0), vec3(12.0, 4.0, 1.0), vec3(8.0, 2.0, -1.0));
  for (int i = 0; i < 3; i++) {
    float ph = 6.2831853 * fishTime[i].z * (t + fishTime[i].y) / fishTime[i].x;
    float s = fishSpot[i].z;
    vec2 fc = vec2(fishSpot[i].x * w + 45.0 - 45.0 * cos(ph) + 10.0 * sin(2.0 * ph), h - fishSpot[i].y * H - 6.0 * sin(2.0 * ph));
    vec2 q = (p - fc) / (vec2(8.0, 3.0) * s);
    float body = 1.0 - smoothstep(0.8, 1.05, length(q));
    float tail = 1.0 - smoothstep(0.6, 0.9, length((p - fc - vec2(7.0 * s, 0.0)) / (vec2(5.0, 2.0) * s)));
    over(rgb(8.0, 32.0, 42.0), max(body * 0.28, tail * 0.18) * mix(1.0, 0.6, wet));
  }

  // Rippling light on the seabed, strongest in the shallows.
  {
    vec2 q = p * vec2(0.018, 0.03);
    float a = vnoise(q + vec2(t * 0.3, t * 0.18)) + 0.5 * vnoise(q * 2.2 - vec2(t * 0.22, -t * 0.35));
    float web = 1.0 - smoothstep(0.0, 0.08, abs(a - 0.75));
    float shallow = smoothstep(0.08, 0.3, v) * (1.0 - smoothstep(0.35, 0.9, v));
    over(rgb(200.0, 240.0, 245.0), web * shallow * 0.22 * calmRoll);
  }

  // Sun glitter: tiny stretched flashes that wink on the moving surface.
  {
    vec2 s = vec2(p.x + t * 9.0, p.y);
    vec2 cell = vec2(18.0, 9.0);
    vec2 id = floor(s / cell);
    float seed = hash21(id + 17.0);
    float nearSurface = smoothstep(0.04, 0.16, v) * (1.0 - smoothstep(0.45, 0.85, v));
    if (seed < 0.3 * nearSurface) {
      vec2 c = (id + 0.2 + 0.6 * vec2(hash21(id + 2.7), hash21(id + 6.1))) * cell;
      vec2 d = (s - c) / vec2(3.2, 0.9);
      float tw = pow(max(0.0, sin(t * (2.5 + seed * 5.0) + seed * 80.0)), 10.0);
      over(vec3(1.0), exp(-dot(d, d)) * tw * mix(0.95, 0.5, wet));
    }
  }

  float fade = v < 0.1 ? 0.2 * clamp(v, 0.0, 1.0) / 0.1 : v < 0.32 ? mix(0.2, 1.0, (v - 0.1) / 0.22) : 1.0;
  outColor = acc * inside * mix(fade, 1.0, wet);
}`;

	function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
		return (x: number) => {
			if (x <= 0) return 0;
			if (x >= 1) return 1;
			let t = x;
			for (let i = 0; i < 8; i += 1) {
				const inv = 1 - t;
				const bx = 3 * x1 * t * inv * inv + 3 * x2 * t * t * inv + t * t * t - x;
				const dx = 3 * x1 * inv * inv + 6 * (x2 - x1) * t * inv + 3 * (1 - x2) * t * t;
				if (Math.abs(bx) < 1e-5 || Math.abs(dx) < 1e-6) break;
				t = Math.min(1, Math.max(0, t - bx / dx));
			}
			const inv = 1 - t;
			return 3 * y1 * t * inv * inv + 3 * y2 * t * t * inv + t * t * t;
		};
	}

	const ease = cubicBezier(0.22, 0.8, 0.28, 1);
	const easeBack = cubicBezier(0.45, 0.05, 0.3, 1);

	function water(canvas: HTMLCanvasElement) {
		const pass = createFullscreenPass(canvas, FRAG, 'ttt tide', { alpha: true, premultipliedAlpha: true });
		if (!pass) {
			failed = true;
			return;
		}
		const { gl } = pass;
		gl.clearColor(0, 0, 0, 0);

		const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
		const t0 = performance.now();
		let calm = motion.matches;
		let cssW = 0;
		let cssH = 0;
		let dpr = 1;
		let raf = 0;

		let level = 0;
		let levelFrom = 0;
		let levelTo = 0;
		let levelStart = 0;
		let levelDur = 0;
		let wet = 0;
		let wetFrom = 0;
		let ebbing = false;

		const restingLevel = () => Math.max(140, cssH * 0.26);
		const targetLevel = () => (surge ? cssH * 1.18 : restingLevel());

		// The surge grows out of the resting waves: wetness follows the water's height above
		// the shoreline, so the rolling waves morph into the wall and settle back as it lands.
		const wetness = () => {
			const band = Math.max(120, cssH * 0.3);
			const k = Math.min(1, Math.max(0, (level - restingLevel()) / band));
			return k * k * (3 - 2 * k);
		};

		// On the way out the surge relaxes back into the rolling waves across the whole ebb,
		// not just the last stretch, so the waves never visibly snap back into place.
		const step = (now: number) => {
			const lt = levelDur > 0 ? Math.min(1, (now - levelStart) / levelDur) : 1;
			level = levelFrom + (levelTo - levelFrom) * (ebbing ? easeBack(lt) : ease(lt));
			if (ebbing) {
				const k = Math.min(1, Math.max(0, (lt - 0.1) / 0.85));
				wet = wetFrom * (1 - k * k * (3 - 2 * k));
			} else {
				wet = wetness();
			}
			return lt < 1;
		};

		const draw = (now: number) => {
			if (!cssW || !cssH) return false;
			const moving = step(now);
			gl.disable(gl.SCISSOR_TEST);
			gl.clear(gl.COLOR_BUFFER_BIT);
			const rows = Math.min(canvas.height, Math.ceil((level + 24) * dpr));
			gl.enable(gl.SCISSOR_TEST);
			gl.scissor(0, 0, canvas.width, rows);
			gl.uniform2f(pass.uniform('uRes'), cssW, cssH);
			gl.uniform1f(pass.uniform('uDpr'), dpr);
			gl.uniform1f(pass.uniform('uTime'), calm ? 0 : (now - t0) / 1000);
			gl.uniform1f(pass.uniform('uLevel'), level);
			gl.uniform1f(pass.uniform('uWet'), wet);
			pass.draw();
			return moving;
		};

		const loop = (now: number) => {
			raf = 0;
			const moving = draw(now);
			if (document.hidden) return;
			if (!calm || moving) raf = requestAnimationFrame(loop);
		};

		const kick = () => {
			if (!raf && !document.hidden) raf = requestAnimationFrame(loop);
		};

		const retarget = () => {
			const now = performance.now();
			step(now);
			levelFrom = level;
			levelTo = targetLevel();
			levelStart = now;
			levelDur = calm ? 450 : surge ? 1550 : receding ? 1450 : 0;
			ebbing = receding && !surge;
			wetFrom = wet;
			if (levelDur === 0) {
				level = levelFrom = levelTo;
				ebbing = false;
				wet = wetness();
			}
			kick();
		};

		const resize = () => {
			const rect = canvas.getBoundingClientRect();
			// Soft water: a capped backing store keeps per-frame fill cheap on dense displays.
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
			const now = performance.now();
			step(now);
			const settled = levelDur === 0 || now - levelStart >= levelDur;
			if (settled) level = levelFrom = levelTo = targetLevel();
			else levelTo = targetLevel();
			if (calm) draw(now);
			kick();
		};

		const observer = new ResizeObserver(resize);
		observer.observe(canvas);
		untrack(() => {
			resize();
			level = levelFrom = levelTo = targetLevel();
			wet = wetness();
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
			void surge;
			void receding;
			untrack(retarget);
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
	<TttTide {surge} {receding} />
{:else}
	<canvas class="water" class:front={surge || receding} aria-hidden="true" {@attach water}></canvas>
{/if}

<style>
	.water {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		z-index: 6;
		display: block;
		pointer-events: none;
	}

	.water.front {
		z-index: 8;
	}
</style>
