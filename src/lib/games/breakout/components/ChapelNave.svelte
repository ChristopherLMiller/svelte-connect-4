<script lang="ts">
	import { untrack } from 'svelte';
	import { createFullscreenPass } from '$lib/gl/fullscreen';
	import { createPacer } from '$lib/gl/pace';
	import { HUES } from '../types';

	type Mood = 'menu' | 'play' | 'dim' | 'won';

	let {
		mood = 'menu',
		light = 0,
		tint = [1, 0.78, 0.5],
		pulse = 0,
		flashHue = 2
	}: {
		mood?: Mood;
		light?: number;
		tint?: [number, number, number];
		pulse?: number;
		flashHue?: number;
	} = $props();

	let failed = $state(false);

	// s: x centred and measured in screen heights, y from 0 at the bottom to 1 at the top.
	const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uDpr;
uniform float uTime;
uniform float uLight;
uniform vec3 uTint;
uniform float uFlash;
uniform vec3 uFlashColor;
uniform float uDim;
uniform float uWarm;
out vec4 outColor;

const vec3 PAL[6] = vec3[6](
  vec3(0.86, 0.9, 1.0),
  vec3(1.0, 0.68, 0.24),
  vec3(0.2, 0.86, 0.5),
  vec3(0.3, 0.48, 1.0),
  vec3(1.0, 0.22, 0.32),
  vec3(0.66, 0.38, 1.0)
);

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

// Pointed (equilateral) arch opening: negative inside.
float archSd(vec2 q, float hw, float spring, float bottom) {
  if (q.y < spring) return max(abs(q.x) - hw, bottom - q.y);
  float R = hw * 2.0;
  float c = R - hw;
  return max(length(q - vec2(c, spring)) - R, length(q + vec2(c, -spring)) - R);
}

void main() {
  vec2 frag = gl_FragCoord.xy / uDpr;
  vec2 p = vec2(frag.x, uRes.y - frag.y);
  float w = uRes.x;
  float h = uRes.y;
  vec2 s = vec2((p.x - 0.5 * w) / h, 1.0 - p.y / h);
  float aspect = w / h;
  float t = uTime;
  float L = clamp(uLight, 0.0, 1.0);
  vec3 moon = vec3(0.5, 0.62, 1.0);
  vec3 beamCol = mix(moon * 0.55, uTint, smoothstep(0.0, 0.35, L));
  float floorY = 0.16;
  float slant = 0.34;

  vec3 c = mix(vec3(0.028, 0.029, 0.04), vec3(0.06, 0.058, 0.076), smoothstep(0.1, 0.95, s.y));
  vec2 bq = s * vec2(15.0, 24.0);
  bq.x += mod(floor(bq.y), 2.0) * 0.5;
  vec2 bf = fract(bq);
  float mortar = smoothstep(0.0, 0.05, bf.x) * smoothstep(0.0, 0.05, 1.0 - bf.x) * smoothstep(0.0, 0.08, bf.y) * smoothstep(0.0, 0.08, 1.0 - bf.y);
  c *= (0.72 + 0.28 * mortar) * (0.88 + 0.24 * hash21(floor(bq))) * (0.85 + 0.3 * fbm(s * 5.0));

  float beams = 0.0;
  for (int i = -3; i <= 3; i++) {
    float fi = float(i);
    float centre = i == 0 ? 1.0 : 0.0;
    float wx = fi * 0.27;
    float hw = mix(0.048, 0.066, centre);
    float spring = mix(0.6, 0.66, centre);
    float bottom = mix(0.36, 0.32, centre);
    vec2 q = s - vec2(wx, 0.0);
    float d = archSd(q, hw, spring, bottom);

    if (d >= 0.014) {
      c += beamCol * (exp(-(d - 0.014) * 60.0) * 0.6 + exp(-(d - 0.014) * 14.0) * 0.4) * (0.03 + 0.16 * L);
    } else if (d > 0.0) {
      c = mix(c, vec3(0.085, 0.082, 0.1) * (0.8 + 0.4 * smoothstep(0.014, 0.0, d)), 0.85);
    } else {
      vec2 g = q * vec2(70.0, 52.0) + vec2(fi * 13.0, 0.0);
      g += 0.25 * vec2(vnoise(g * 0.7), vnoise(g * 0.7 + 9.0));
      vec2 gi = floor(g);
      vec2 gf = fract(g);
      float lead = smoothstep(0.0, 0.12, min(min(gf.x, 1.0 - gf.x), min(gf.y, 1.0 - gf.y)));
      int idx = int(hash21(gi + fi * 7.0) * 5.999);
      vec3 pane = PAL[idx];
      float mull = smoothstep(0.0025, 0.0045, abs(q.x)) * smoothstep(0.0025, 0.0045, abs(abs(q.x) - hw * 0.5));
      vec2 rq = q - vec2(0.0, spring + hw * 0.62);
      float rose = abs(length(rq) - hw * 0.42);
      float ring = smoothstep(0.003, 0.006, rose);
      float flick = 0.85 + 0.15 * vnoise(gi * 0.6 + t * 0.4);
      vec3 cold = moon * 0.07 + pane * 0.05;
      vec3 warm = mix(pane, uTint, 0.3) * (0.18 + 1.05 * L) * flick;
      vec3 glass = mix(cold, warm, smoothstep(0.0, 0.25, L + 0.05));
      float seed = hash21(gi + fi * 3.0 + 40.0);
      float ph = fract(t * 0.11 + seed * 7.0);
      float glint = step(0.94, seed) * smoothstep(0.0, 0.015, ph) * smoothstep(0.07, 0.015, ph);
      glass += vec3(1.0, 0.95, 0.86) * glint * max(0.0, 1.0 - length(gf - 0.5) * 1.5) * (0.25 + 0.9 * L);
      c = glass * lead * mull * ring + vec3(0.012) * (1.0 - lead * mull * ring);
    }

    float dist = bottom - s.y;
    if (s.y < floorY) dist = (bottom - floorY) + (floorY - s.y) * 2.6;
    if (dist > 0.0) {
      float xs = s.x - min(dist, bottom - floorY) * slant - max(0.0, dist - (bottom - floorY)) * slant * 0.25;
      float b = smoothstep(hw * 1.1, hw * 0.45, abs(xs - wx)) * exp(-dist * 1.5);
      if (b > 0.001) {
        float dust = 0.55 + 0.6 * fbm(vec2(xs * 22.0, s.y * 5.0 - t * 0.035));
        float onFloor = s.y < floorY ? 1.5 : 1.0;
        float stain = 0.4 + 0.6 * smoothstep(0.0, 0.5, L);
        vec3 col;
        if (s.y < floorY) {
          vec2 pc = floor(vec2((xs - wx) * 44.0 + fi * 13.0, (floorY - s.y) * 70.0));
          vec3 pane = PAL[int(hash21(pc + fi * 7.0) * 5.999)];
          col = mix(beamCol, mix(pane, uTint, 0.2) * 2.2, stain * 0.9);
        } else {
          float k = vnoise(vec2((xs - wx) * 26.0 + fi * 5.0, dist * 2.5));
          vec3 hue = 0.5 + 0.5 * cos(6.2831 * (k * 1.4 + fi * 0.21 + vec3(0.0, 0.33, 0.67)));
          col = mix(beamCol, hue * 1.3, stain * 0.45);
        }
        beams += b * onFloor;
        c += col * b * dust * onFloor * (0.05 + 0.42 * L);
      }
    }
  }

  if (s.y < floorY) {
    float z = 1.0 / (floorY - s.y + 0.04);
    vec2 tile = fract(vec2(s.x * z * 0.55, z * 0.42));
    float seam = smoothstep(0.0, 0.04, min(tile.x, 1.0 - tile.x)) * smoothstep(0.0, 0.05, min(tile.y, 1.0 - tile.y));
    vec3 flag = vec3(0.04, 0.038, 0.048) * (0.7 + 0.3 * seam) * (0.85 + 0.3 * hash21(floor(vec2(s.x * z * 0.55, z * 0.42))));
    c = mix(c, c * 0.35 + flag, 0.8);
  }

  {
    float cs = 0.05;
    vec2 q = vec2(s.x, s.y - t * 0.006);
    vec2 cell = floor(q / cs);
    float hs = hash21(cell + 17.0);
    if (hs > 0.6) {
      vec2 sp = (cell + vec2(hash21(cell + 3.0), hash21(cell + 8.0))) * cs;
      sp.x += 0.004 * sin(t * 0.4 + hs * 30.0);
      float r = length(q - sp) * h;
      float tw = 0.5 + 0.5 * sin(t * 1.7 + hs * 50.0);
      float mote = exp(-r * r / 2.2);
      c += mix(vec3(1.0, 0.86, 0.62), uTint, 0.5) * mote * tw * (0.06 + 2.2 * beams) * 0.6;
    }
  }

  // Incense drifting up through the beams.
  {
    vec2 sq = vec2(s.x * 2.2 + 0.3 * sin(s.y * 3.2 + t * 0.13), s.y * 1.5 - t * 0.035);
    float smoke = smoothstep(0.42, 0.85, fbm(sq + 0.6 * vnoise(sq * 1.7 + t * 0.05)));
    c += mix(vec3(0.6, 0.6, 0.7), beamCol, 0.6) * smoke * (min(beams, 1.2) * (0.1 + 0.45 * L) + 0.018);
  }

  float archHw = min(aspect * 0.5 - 0.035, 0.92);

  // Iron candle wheels hung between the outer windows, swaying on their chains.
  if (s.y > 0.76) {
    for (int k = 0; k < 4; k++) {
      float fk = float(k);
      float cx = (k < 2 ? -1.0 : 1.0) * (0.405 + mod(fk, 2.0) * 0.27);
      if (abs(cx) > archHw - 0.06) continue;
      float sw = 0.007 * sin(t * 0.33 + fk * 1.7);
      float cy = 0.85;
      vec2 lp = s - vec2(cx + sw, cy);
      float chainX = cx + sw * (1.0 - (s.y - cy) / (1.0 - cy));
      if (s.y > cy && abs(s.x - chainX) * h < 0.9) c = mix(c, vec3(0.1, 0.075, 0.05), 0.6);
      float e = length(lp / vec2(0.038, 0.008));
      if (abs(e - 1.0) * 0.008 * h < 1.2) c = mix(c, vec3(0.16, 0.1, 0.06) * (0.6 + 0.6 * smoothstep(0.0, -0.008, lp.y)), 0.85);
      c += vec3(1.0, 0.62, 0.3) * exp(-length(lp * vec2(1.0, 1.6)) * 12.0) * 0.07;
      for (int j = 0; j < 6; j++) {
        float a = float(j) * 1.0472 + 0.3;
        vec2 fp = vec2(cos(a) * 0.038, sin(a) * 0.008 + 0.012);
        float fl = 0.75 + 0.25 * sin(t * (8.0 + float(j)) + fk * 3.0) * sin(t * 12.1 + float(j) * 1.9);
        float r = length((lp - fp) * vec2(1.0, 0.55));
        c += vec3(1.0, 0.64, 0.3) * exp(-r * 220.0) * 0.6 * fl * (sin(a) < 0.0 ? 0.7 : 1.0);
      }
    }
  }

  // The near arcade: a great pointed arch on clustered piers framing the nave.
  float da = archSd(s, archHw, 0.7, -2.0);
  if (da > 0.0) {
    float flute = 0.75 + 0.25 * cos(s.x * h * 0.09);
    vec3 pier = vec3(0.016, 0.016, 0.022) * flute * (0.85 + 0.3 * fbm(s * 9.0));
    float rim = smoothstep(0.03, 0.0, da);
    pier += (beamCol * (0.03 + 0.12 * L) + vec3(0.03, 0.026, 0.02)) * rim;
    pier += vec3(0.07, 0.06, 0.05) * smoothstep(0.004, 0.0, abs(da - 0.006));
    c = pier;
  }

  for (int k = -1; k <= 1; k += 2) {
    float side = float(k);
    vec2 cp = vec2(side * (archHw - 0.03), 0.165);
    float flame = 0.8 + 0.2 * sin(t * 9.0 + side * 3.0) * sin(t * 13.7 + side);
    float r = length((s - cp) * vec2(1.0, 0.7));
    c += vec3(1.0, 0.62, 0.28) * (exp(-r * 70.0) * 0.6 + exp(-r * 9.0) * 0.06) * flame;
  }

  // Racks of votive candles at the foot of the piers.
  if (aspect > 1.15 && s.y < 0.24 && abs(s.x) > archHw - 0.3) {
    for (int k = -1; k <= 1; k += 2) {
      float side = float(k);
      for (int j = 0; j < 10; j++) {
        float fj = float(j);
        float row = floor(fj / 5.0);
        float col = fj - row * 5.0;
        vec2 vp = vec2(side * (archHw - 0.085 - col * 0.03 - row * 0.015), 0.1 + row * 0.028);
        float fl = 0.72 + 0.28 * sin(t * (7.0 + fj * 0.9) + side * fj) * sin(t * 11.3 + fj * 2.1);
        vec2 dv = s - vp;
        float r = length(dv * vec2(1.0, 0.55));
        c += vec3(1.0, 0.6, 0.26) * (exp(-r * 190.0) * 0.55 + exp(-r * 26.0) * 0.03) * fl;
        vec2 wax = dv + vec2(0.0, 0.011);
        if (abs(wax.x) < 0.0035 && abs(wax.y) < 0.007) c = mix(c, vec3(0.42, 0.34, 0.24) * (0.5 + 0.5 * fl), 0.85);
      }
    }
  }

  c += uFlashColor * uFlash * (0.03 + 0.35 * beams);
  c += vec3(1.0, 0.84, 0.55) * uWarm * (0.03 + 0.25 * beams);

  vec2 v = p / uRes - 0.5;
  c *= 1.0 - 0.55 * dot(v, v) * 1.6;
  c += (hash21(p + fract(t) * 91.0) - 0.5) * 0.02;
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(lum), c, 1.0 - 0.5 * uDim) * (1.0 - 0.3 * uDim);
  outColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

	function nave(canvas: HTMLCanvasElement) {
		const pass = createFullscreenPass(canvas, FRAG, 'chapel nave');
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
		let lit = untrack(() => light);
		let hue: [number, number, number] = untrack(() => [...tint]);
		let warm = 0;
		let dim = 0;
		let flash = 0;
		let flashRgb: [number, number, number] = [1, 0.8, 0.5];

		const draw = (ms: number) => {
			if (!cssW || !cssH) return;
			const dt = Math.min(1 / 20, Math.max(0, (ms - last) / 1000));
			last = ms;
			const ease = calm ? 1 : 1 - Math.exp(-dt * 2);
			const goal = mood === 'won' ? 1 : mood === 'menu' ? Math.max(light, 0.32) : light;
			lit += (goal - lit) * ease;
			for (let i = 0; i < 3; i += 1) hue[i] = hue[i]! + (tint[i]! - hue[i]!) * ease;
			warm += ((mood === 'won' ? 1 : 0) - warm) * ease;
			dim += ((mood === 'dim' ? 1 : 0) - dim) * ease;
			flash *= Math.exp(-dt * 3.2);

			gl.useProgram(pass.program);
			gl.uniform2f(pass.uniform('uRes'), cssW, cssH);
			gl.uniform1f(pass.uniform('uDpr'), dpr);
			gl.uniform1f(pass.uniform('uTime'), calm ? 0 : (ms - t0) / 1000);
			gl.uniform1f(pass.uniform('uLight'), lit);
			gl.uniform3f(pass.uniform('uTint'), hue[0], hue[1], hue[2]);
			gl.uniform1f(pass.uniform('uFlash'), calm ? 0 : flash);
			gl.uniform3f(pass.uniform('uFlashColor'), flashRgb[0], flashRgb[1], flashRgb[2]);
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
			// A soft, dark scene: one backing pixel per CSS pixel keeps phones cool.
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
			const hueId = flashHue;
			untrack(() => {
				if (next > seenPulse) {
					flash = Math.min(1, flash + 0.6);
					flashRgb = HUES[hueId]?.rgb ?? flashRgb;
				}
				seenPulse = next;
			});
		});

		$effect(() => {
			void mood;
			void light;
			void tint;
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

<div class="nave" aria-hidden="true">
	{#if failed}
		<div class="fallback"></div>
	{:else}
		<canvas {@attach nave}></canvas>
	{/if}
</div>

<style>
	.nave {
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
			radial-gradient(40% 50% at 50% 30%, rgba(147, 179, 255, 0.12), transparent 70%),
			radial-gradient(60% 30% at 50% 100%, rgba(255, 200, 120, 0.08), transparent 70%),
			linear-gradient(180deg, #0f0f17 0%, #0a0a10 70%, #07070b 100%);
	}
</style>
