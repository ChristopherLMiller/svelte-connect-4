<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { FieldRenderer } from '../render';
	import { CHAPTERS } from '../levels';
	import { FIELD_H, FIELD_W } from '../types';
	import type { ChapelSession } from '../session.svelte';

	let { session }: { session: ChapelSession } = $props();

	let canvasEl: HTMLCanvasElement | null = null;
	let press: { x: number; y: number; at: number; id: number } | null = null;

	const type = $derived(session.status.type);
	const opening = $derived(CHAPTERS.find((chapter) => chapter.start === session.level + 1));

	function field(canvas: HTMLCanvasElement) {
		canvasEl = canvas;
		const renderer = new FieldRenderer(canvas);
		const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
		renderer.calm = motion.matches;
		const onMotion = () => (renderer.calm = motion.matches);
		motion.addEventListener('change', onMotion);
		const resize = () => renderer.resize(canvas.getBoundingClientRect().width);
		const observer = new ResizeObserver(resize);
		observer.observe(canvas);
		resize();
		const unlisten = session.listen((event) => renderer.event(event));
		const undraw = session.addDrawer((now, dt) => renderer.draw(session.world, session.status, now, dt));
		return () => {
			canvasEl = null;
			undraw();
			unlisten();
			observer.disconnect();
			motion.removeEventListener('change', onMotion);
		};
	}

	function fieldX(clientX: number) {
		if (!canvasEl) return null;
		const rect = canvasEl.getBoundingClientRect();
		if (!rect.width) return null;
		return ((clientX - rect.left) / rect.width) * FIELD_W;
	}

	function move(event: PointerEvent) {
		if (event.pointerType === 'mouse' || press) session.steerTo(fieldX(event.clientX));
	}

	function down(event: PointerEvent) {
		press = { x: event.clientX, y: event.clientY, at: performance.now(), id: event.pointerId };
		session.steerTo(fieldX(event.clientX));
	}

	function up(event: PointerEvent) {
		if (!press || press.id !== event.pointerId) return;
		const moved = Math.hypot(event.clientX - press.x, event.clientY - press.y);
		const quick = performance.now() - press.at < 320;
		press = null;
		if (moved < 14 && (quick || event.pointerType === 'mouse')) session.launch();
	}
</script>

<div
	class="pad"
	class:quiet={type === 'paused' || type === 'over'}
	role="application"
	aria-label="Chapel Glass. Move the pointer or drag to steer the beam; click, tap or press Space to serve."
	onpointermove={move}
	onpointerdown={down}
	onpointerup={up}
	onpointercancel={() => (press = null)}
>
	<div class="stage" style:--aspect={FIELD_W / FIELD_H}>
		<div class="frame">
			<span class="pinnacle left" aria-hidden="true"></span>
			<span class="pinnacle right" aria-hidden="true"></span>
			<svg class="rose" viewBox="0 0 60 60" aria-hidden="true">
				<circle cx="30" cy="30" r="27" fill="#1d1c25" stroke="#4a4756" stroke-width="2.5" />
				{#each Array.from({ length: 8 }, (_, i) => i) as i (i)}
					{@const a = (i / 8) * Math.PI * 2}
					<circle
						cx={30 + Math.cos(a) * 15}
						cy={30 + Math.sin(a) * 15}
						r="7.2"
						fill={['#c8243c', '#2b5ad0', '#e8a23a', '#1f9a5c'][i % 4]}
						stroke="#0f0d13"
						stroke-width="2"
						opacity="0.9"
					/>
				{/each}
				<circle cx="30" cy="30" r="7" fill="#cba3ff" stroke="#0f0d13" stroke-width="2" />
			</svg>
			<div class="glass">
				<canvas {@attach field}></canvas>

				{#if type === 'serve'}
					<p class="hint" transition:fade={{ duration: 200 }}>
						<span>Window {session.level + 1} · {session.windowName}</span>
						<b>Tap, click or Space to serve</b>
					</p>
				{:else if type === 'paused'}
					<p class="hint mid" transition:fade={{ duration: 160 }}>
						<span>The vigil holds</span>
						<b>Space or P resumes</b>
					</p>
				{:else if type === 'cleared'}
					<div class="lit" in:fly={{ y: 16, duration: 420 }} out:fade={{ duration: 200 }}>
						<small>Window {session.level + 1} is lit</small>
						<strong>{session.windowName}</strong>
						<em>+{session.bonus.toLocaleString()} for the light and the candles</em>
						{#if opening}
							<span class="opens">{session.chapter.name} is lit · {opening.name} opens</span>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>
	<p class="drag" aria-hidden="true"><span></span>Drag here to steer<span></span></p>
</div>

<style>
	.pad {
		width: 100%;
		height: 100%;
		display: grid;
		justify-items: center;
		align-content: center;
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
	}

	.drag {
		display: none;
		align-self: center;
		align-items: center;
		gap: 12px;
		margin: 0;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		font-size: 0.66rem;
		color: rgba(242, 196, 107, 0.45);
		pointer-events: none;
	}

	.drag span {
		width: 34px;
		height: 1px;
		background: currentColor;
	}

	/* Tall screens: the window sits up top and the space below becomes a thumb pad. */
	@container (max-aspect-ratio: 4/5) {
		.pad {
			grid-template-rows: auto 1fr;
			align-content: stretch;
		}

		.drag {
			display: flex;
		}
	}

	.stage {
		--pad: 9px;
		--top: 20px;
		--w: min(calc(100cqw - 2 * var(--pad)), calc((100cqh - var(--top) - var(--pad)) * var(--aspect)));
		width: calc(var(--w) + 2 * var(--pad));
	}

	.frame {
		position: relative;
		padding: var(--top) var(--pad) var(--pad);
		border-radius: 14px 14px 10px 10px;
		background:
			repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.22) 0 1.5px, transparent 1.5px 26px),
			linear-gradient(180deg, #34323e, #1f1e27 40%, #17161d);
		box-shadow:
			inset 0 1px 0 rgba(255, 236, 200, 0.14),
			inset 0 0 0 1px rgba(255, 236, 200, 0.06),
			0 24px 60px rgba(0, 0, 0, 0.55);
	}

	.pinnacle {
		position: absolute;
		top: -14px;
		width: 14px;
		height: 30px;
		background: linear-gradient(180deg, #4a4756, #25242d);
		clip-path: polygon(50% 0, 100% 40%, 100% 100%, 0 100%, 0 40%);
	}

	.pinnacle.left {
		left: 6px;
	}

	.pinnacle.right {
		right: 6px;
	}

	.rose {
		position: absolute;
		top: -20px;
		left: 50%;
		width: 40px;
		height: 40px;
		translate: -50% 0;
		filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 12px rgba(203, 163, 255, 0.25));
	}

	.glass {
		position: relative;
		cursor: none;
		border-radius: 6px;
		overflow: hidden;
		box-shadow:
			inset 0 0 0 1px rgba(0, 0, 0, 0.6),
			0 0 0 1px rgba(255, 236, 200, 0.08);
	}

	.quiet .glass {
		cursor: default;
	}

	canvas {
		display: block;
		width: var(--w);
		height: calc(var(--w) / var(--aspect));
	}

	.hint {
		position: absolute;
		left: 50%;
		top: 74%;
		translate: -50% 0;
		margin: 0;
		display: grid;
		gap: 4px;
		text-align: center;
		pointer-events: none;
		white-space: nowrap;
		color: #f4e8d0;
		text-shadow: 0 2px 10px rgba(0, 0, 0, 0.9);
	}

	.hint.mid {
		top: 56%;
	}

	.hint span {
		font-family: 'IM Fell English SC', Georgia, serif;
		font-size: clamp(0.85rem, 2.4cqw, 1.05rem);
		color: #f2c46b;
		letter-spacing: 0.06em;
	}

	.hint b {
		font-weight: 600;
		font-size: clamp(0.72rem, 2cqw, 0.86rem);
		letter-spacing: 0.14em;
		text-transform: uppercase;
		opacity: 0.85;
	}

	.lit {
		position: absolute;
		left: 50%;
		top: 60%;
		translate: -50% -50%;
		display: grid;
		gap: 6px;
		text-align: center;
		pointer-events: none;
		padding: 16px 26px;
		border-radius: 16px;
		background: radial-gradient(closest-side, rgba(16, 12, 20, 0.82), rgba(16, 12, 20, 0.5) 70%, transparent);
		color: #fff4dc;
		min-width: 70%;
	}

	.lit small {
		letter-spacing: 0.22em;
		text-transform: uppercase;
		font-size: 0.7rem;
		color: #f2c46b;
	}

	.lit strong {
		font-family: 'IM Fell English SC', Georgia, serif;
		font-weight: 400;
		font-size: clamp(1.5rem, 5cqw, 2.3rem);
		line-height: 1.05;
		text-shadow: 0 0 22px rgba(255, 210, 140, 0.55);
	}

	.lit em {
		font-style: normal;
		font-size: 0.85rem;
		color: #d8c6a4;
	}

	.lit .opens {
		margin-top: 6px;
		font-family: 'IM Fell English SC', Georgia, serif;
		font-size: 1.05rem;
		color: #cba3ff;
	}
</style>
