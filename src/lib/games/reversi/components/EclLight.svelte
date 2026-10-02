<script lang="ts">
	import { untrack } from 'svelte';
	import { createFullscreenPass } from '$lib/gl/fullscreen';
	import { createPacer } from '$lib/gl/pace';
	import { FLIP_LEAD_MS, FLIP_STEP_MS, FLIP_TURN_MS, type Eclipse } from '../session.svelte';
	import { SUN, type Player } from '../types';

	let {
		eclipse = null,
		flare = null
	}: {
		eclipse?: Eclipse | null;
		flare?: { key: number; index: number; player: Player } | null;
	} = $props();

	/** Canvas overhang past each board edge, as a fraction of the board. */
	const SPILL = 0.18;
	const MAX_LINES = 8;

	// Premultiplied shade and light over the board. Coordinates are in board cells, y down.
	const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uDpr;
uniform vec3 uBoard;
uniform vec2 uOrigin;
uniform vec4 uLines[${MAX_LINES}];
uniform float uSince;
uniform float uStep;
uniform float uLead;
uniform float uTurn;
uniform float uSide;
uniform vec3 uFlare;
uniform float uFlareSide;
out vec4 outColor;

void main() {
  vec2 frag = gl_FragCoord.xy / uDpr;
  vec2 px = vec2(frag.x, uRes.y - frag.y);
  float cellPx = uBoard.z / 8.0;
  vec2 p = (px - uBoard.xy) / cellPx;

  vec3 corona = uSide > 0.0 ? vec3(1.0, 0.76, 0.36) : vec3(0.68, 0.8, 1.0);
  float shade = 0.0;
  vec3 light = vec3(0.0);

  vec2 o = uOrigin + 0.5;
  float since = uSince;

  // A ring of light leaves the seated disc.
  if (since >= 0.0 && since < 1.2) {
    float r = 0.35 + since * 3.2;
    float d = length(p - o);
    float ring = exp(-pow((d - r) / 0.12, 2.0)) * (1.0 - since / 1.2);
    light += corona * ring * 0.55;
  }

  // The eclipse runs down each line, crossing every disc mid-turn.
  for (int i = 0; i < ${MAX_LINES}; i++) {
    vec4 L = uLines[i];
    if (L.w < 0.5) continue;
    vec2 dir = L.xy;
    float count = L.z;
    float x = 1.0 + (since - uLead - uTurn * 0.5) / uStep;
    float life = smoothstep(0.4, 0.9, x) * (1.0 - smoothstep(count + 0.1, count + 0.7, x));
    if (life <= 0.0) continue;
    vec2 at = o + dir * x;
    vec2 rel = p - at;
    float d = length(rel);
    float umbra = 1.0 - smoothstep(0.3, 0.42, d);
    shade = max(shade, umbra * 0.5 * life);
    float halo = exp(-pow((d - 0.43) / 0.07, 2.0));
    float flick = 0.75 + 0.25 * sin(atan(rel.y, rel.x) * 9.0 + since * 14.0);
    light += corona * halo * flick * 0.9 * life;
    light += corona * exp(-d * d / 0.5) * 0.12 * life;

    // Faint wake of light along the cells already turned.
    vec2 ab = dir * (x - 1.0);
    vec2 rp = p - (o + dir);
    float len2 = max(dot(ab, ab), 1e-4);
    float hseg = clamp(dot(rp, ab) / len2, 0.0, 1.0);
    float wake = exp(-pow(length(rp - ab * hseg) / 0.09, 2.0));
    light += corona * wake * 0.16 * life * (0.4 + 0.6 * hseg);
  }

  // Corona flare when a corner is taken.
  if (uFlare.z >= 0.0 && uFlare.z < 1.8) {
    vec3 fc = uFlareSide > 0.0 ? vec3(1.0, 0.8, 0.42) : vec3(0.72, 0.84, 1.0);
    vec2 rel = p - (uFlare.xy + 0.5);
    float d = length(rel);
    float age = uFlare.z;
    float a = atan(rel.y, rel.x);
    float rays = pow(max(0.0, sin(a * 12.0 + age * 2.0)), 6.0) + 0.5 * pow(max(0.0, sin(a * 7.0 - age * 3.0)), 8.0);
    float reach = 0.6 + age * 3.2;
    float fade = 1.0 - smoothstep(0.6, 1.8, age);
    light += fc * rays * exp(-d / reach) * 0.7 * fade;
    light += fc * exp(-pow((d - 0.5 - age * 2.6) / 0.16, 2.0)) * 0.6 * fade;
    light += fc * exp(-d * d / 0.35) * 0.8 * (1.0 - smoothstep(0.0, 0.7, age));
  }

  float la = clamp(max(light.r, max(light.g, light.b)), 0.0, 1.0);
  shade *= 1.0 - la;
  // Light is additive (zero alpha); only the umbra occludes what's beneath.
  vec3 c = light + vec3(0.02, 0.02, 0.06) * shade;
  outColor = vec4(min(c, vec3(1.0)), clamp(shade, 0.0, 1.0));
}`;

	let failed = $state(false);

	function glow(canvas: HTMLCanvasElement) {
		const pass = createFullscreenPass(canvas, FRAG, 'eclipse light', { alpha: true, premultipliedAlpha: true });
		if (!pass) {
			failed = true;
			return;
		}
		const { gl } = pass;
		const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
		let cssW = 0;
		let cssH = 0;
		let dpr = 1;
		let raf = 0;
		let shownAt = -1;
		let flareAt = -1;
		let lines = new Float32Array(MAX_LINES * 4);
		let origin: [number, number] = [0, 0];
		let side = 1;
		let flareCell: [number, number] = [0, 0];
		let flareSide = 1;
		let span = 0;

		const clear = () => {
			gl.clearColor(0, 0, 0, 0);
			gl.clear(gl.COLOR_BUFFER_BIT);
		};

		const draw = (now: number) => {
			if (!cssW || !cssH) return false;
			const since = shownAt < 0 ? -1 : (now - shownAt) / 1000;
			const flareAge = flareAt < 0 ? -1 : (now - flareAt) / 1000;
			const lineLive = since >= 0 && since < span;
			const flareLive = flareAge >= 0 && flareAge < 1.8;
			clear();
			if (!lineLive && !flareLive) return false;
			const board = cssW / (1 + SPILL * 2);
			gl.uniform2f(pass.uniform('uRes'), cssW, cssH);
			gl.uniform1f(pass.uniform('uDpr'), dpr);
			gl.uniform3f(pass.uniform('uBoard'), board * SPILL, board * SPILL, board);
			gl.uniform2f(pass.uniform('uOrigin'), origin[0], origin[1]);
			gl.uniform4fv(pass.uniform('uLines'), lines);
			gl.uniform1f(pass.uniform('uSince'), lineLive ? since : -1);
			gl.uniform1f(pass.uniform('uStep'), FLIP_STEP_MS / 1000);
			gl.uniform1f(pass.uniform('uLead'), FLIP_LEAD_MS / 1000);
			gl.uniform1f(pass.uniform('uTurn'), FLIP_TURN_MS / 1000);
			gl.uniform1f(pass.uniform('uSide'), side);
			gl.uniform3f(pass.uniform('uFlare'), flareCell[0], flareCell[1], flareLive ? flareAge : -1);
			gl.uniform1f(pass.uniform('uFlareSide'), flareSide);
			pass.draw();
			return true;
		};

		const pace = createPacer();
		const loop = (now: number) => {
			raf = 0;
			const active = pace.due(now) ? draw(now) : true;
			if (active && !document.hidden) raf = requestAnimationFrame(loop);
		};

		const kick = () => {
			if (!raf && !document.hidden) raf = requestAnimationFrame(loop);
		};

		const resize = () => {
			const rect = canvas.getBoundingClientRect();
			dpr = Math.min(window.devicePixelRatio || 1, 1.5);
			cssW = rect.width;
			cssH = rect.height;
			const pxW = Math.max(1, Math.round(cssW * dpr));
			const pxH = Math.max(1, Math.round(cssH * dpr));
			if (canvas.width !== pxW || canvas.height !== pxH) {
				canvas.width = pxW;
				canvas.height = pxH;
				gl.viewport(0, 0, pxW, pxH);
			}
			clear();
			kick();
		};

		const observer = new ResizeObserver(resize);
		observer.observe(canvas);
		untrack(resize);

		const onLost = (event: Event) => {
			event.preventDefault();
			cancelAnimationFrame(raf);
			failed = true;
		};
		canvas.addEventListener('webglcontextlost', onLost);

		let seenEclipse = untrack(() => eclipse?.key ?? 0);
		let seenFlare = untrack(() => flare?.key ?? 0);
		$effect(() => {
			const next = eclipse;
			untrack(() => {
				if (!next || next.key === seenEclipse || motion.matches) return;
				seenEclipse = next.key;
				lines = new Float32Array(MAX_LINES * 4);
				const or = next.origin >> 3;
				const oc = next.origin & 7;
				let longest = 0;
				next.lines.slice(0, MAX_LINES).forEach((line, i) => {
					const first = line[0];
					lines.set([(first & 7) - oc, (first >> 3) - or, line.length, 1], i * 4);
					longest = Math.max(longest, line.length);
				});
				origin = [oc, or];
				side = next.player === SUN ? 1 : -1;
				span = (FLIP_LEAD_MS + (longest + 1) * FLIP_STEP_MS + FLIP_TURN_MS) / 1000 + 1.2;
				shownAt = performance.now();
				kick();
			});
		});
		$effect(() => {
			const next = flare;
			untrack(() => {
				if (!next || next.key === seenFlare || motion.matches) return;
				seenFlare = next.key;
				flareCell = [next.index & 7, next.index >> 3];
				flareSide = next.player === SUN ? 1 : -1;
				flareAt = performance.now();
				kick();
			});
		});

		return () => {
			cancelAnimationFrame(raf);
			observer.disconnect();
			canvas.removeEventListener('webglcontextlost', onLost);
			pass.dispose();
		};
	}
</script>

{#if !failed}
	<canvas class="light" style:--spill="{SPILL * 100}%" aria-hidden="true" {@attach glow}></canvas>
{/if}

<style>
	.light {
		position: absolute;
		inset: calc(var(--spill) * -1);
		width: calc(100% + var(--spill) * 2);
		height: calc(100% + var(--spill) * 2);
		z-index: 4;
		pointer-events: none;
		display: block;
	}
</style>
