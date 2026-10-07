<script lang="ts">
	import { untrack } from 'svelte';
	import { createPacer } from '$lib/gl/pace';
	import { SLIDE_MS, VialRenderer } from '../render';
	import type { ApoSession } from '../session.svelte';

	let { session }: { session: ApoSession } = $props();

	let side = $state(0);
	let failed = $state(false);

	const FONT = '"Cinzel", Georgia, serif';

	function measure(node: HTMLDivElement) {
		const observer = new ResizeObserver(() => {
			const rect = node.getBoundingClientRect();
			side = Math.max(160, Math.floor(Math.min(rect.width, rect.height, 720)));
		});
		observer.observe(node);
		return () => observer.disconnect();
	}

	function board(canvas: HTMLCanvasElement) {
		return untrack(() => mountBoard(canvas));
	}

	function mountBoard(canvas: HTMLCanvasElement) {
		const renderer = new VialRenderer(canvas, FONT);
		if (!renderer.ok) {
			failed = true;
			return;
		}
		const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
		renderer.setCalm(motion.matches);
		renderer.onEvent(session.snapshot());
		const pace = createPacer();
		let raf = 0;
		let cssSide = 0;

		const frame = (ms: number) => {
			raf = 0;
			if (pace.due(ms)) renderer.draw(ms);
			if (!motion.matches && !document.hidden) raf = requestAnimationFrame(frame);
		};
		const kick = () => {
			if (motion.matches) {
				renderer.draw(performance.now());
				return;
			}
			if (!raf && !document.hidden) raf = requestAnimationFrame(frame);
		};

		const resize = () => {
			const rect = canvas.getBoundingClientRect();
			if (!rect.width) return;
			cssSide = rect.width;
			renderer.resize(cssSide, Math.min(window.devicePixelRatio || 1, 1.75));
			renderer.draw(performance.now());
		};
		const observer = new ResizeObserver(resize);
		observer.observe(canvas);

		const stop = session.listen((event) => {
			renderer.onEvent(event);
			if (event.type === 'pour' && !motion.matches) {
				const [x, y] = event.dir === 'left' ? [-1, 0] : event.dir === 'right' ? [1, 0] : event.dir === 'up' ? [0, -1] : [0, 1];
				const travel = event.motions.reduce((sum, m) => sum + (m.from === m.to ? 0 : 1), 0);
				const push = Math.min(7, 2.5 + travel * 0.35 + event.merges.length * 0.9) * Math.max(0.7, cssSide / 480);
				const tilt = (x - y) * push * 0.12;
				canvas.animate(
					[
						{ transform: 'translate(0, 0) rotate(0deg)' },
						{ transform: `translate(${x * push * 0.3}px, ${y * push * 0.3}px)`, offset: 0.35 },
						{ transform: `translate(${x * push}px, ${y * push}px) rotate(${tilt}deg)`, offset: 0.55 },
						{ transform: `translate(${-x * push * 0.35}px, ${-y * push * 0.35}px) rotate(${-tilt * 0.4}deg)`, offset: 0.75 },
						{ transform: `translate(${x * push * 0.1}px, ${y * push * 0.1}px)`, offset: 0.9 },
						{ transform: 'translate(0, 0) rotate(0deg)' }
					],
					{ duration: SLIDE_MS / 0.5, easing: 'ease-out' }
				);
			}
			if (event.type === 'nudge' && !motion.matches) {
				const [x, y] = event.dir === 'left' ? [-1, 0] : event.dir === 'right' ? [1, 0] : event.dir === 'up' ? [0, -1] : [0, 1];
				canvas.animate(
					[
						{ transform: 'translate(0, 0)' },
						{ transform: `translate(${x * 6}px, ${y * 6}px)` },
						{ transform: `translate(${-x * 3}px, ${-y * 3}px)` },
						{ transform: 'translate(0, 0)' }
					],
					{ duration: 220, easing: 'ease-out' }
				);
			}
			kick();
		});

		const onMotion = () => {
			renderer.setCalm(motion.matches);
			kick();
		};
		const onVisibility = () => kick();
		const onLost = (event: Event) => {
			event.preventDefault();
			cancelAnimationFrame(raf);
			failed = true;
		};
		motion.addEventListener('change', onMotion);
		document.addEventListener('visibilitychange', onVisibility);
		canvas.addEventListener('webglcontextlost', onLost);
		document.fonts?.load(`700 60px ${FONT}`).then(() => {
			renderer.paintLabels();
			kick();
		});
		kick();

		return () => {
			cancelAnimationFrame(raf);
			stop();
			observer.disconnect();
			motion.removeEventListener('change', onMotion);
			document.removeEventListener('visibilitychange', onVisibility);
			canvas.removeEventListener('webglcontextlost', onLost);
			renderer.dispose();
		};
	}

	let start: { id: number; x: number; y: number; done: boolean } | null = null;

	function down(event: PointerEvent) {
		if (event.button !== 0 && event.pointerType === 'mouse') return;
		start = { id: event.pointerId, x: event.clientX, y: event.clientY, done: false };
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}

	function move(event: PointerEvent) {
		if (!start || start.id !== event.pointerId || start.done) return;
		const dir = VialRenderer.swipe(event.clientX - start.x, event.clientY - start.y, Math.max(22, side * 0.05));
		if (!dir) return;
		start.done = true;
		session.pour(dir);
	}

	function up(event: PointerEvent) {
		if (start?.id === event.pointerId) start = null;
	}
</script>

<div class="rig" {@attach measure}>
	<div
		class="rack"
		style:width="{side}px"
		style:height="{side}px"
		role="application"
		aria-label="Alchemist's rack, {session.n} by {session.n}. Swipe or use the arrow keys to pour every vial one way."
		onpointerdown={down}
		onpointermove={move}
		onpointerup={up}
		onpointercancel={up}
	>
		{#if failed}
			<div class="fallback" style:--n={session.n}>
				{#each session.cells as tier, i (i)}
					<span class:on={tier > 0}>{tier ? 2 ** tier : ''}</span>
				{/each}
			</div>
		{:else}
			<canvas {@attach board}></canvas>
		{/if}
	</div>
</div>

<style>
	.rig {
		position: relative;
		width: 100%;
		height: 100%;
		min-height: 0;
		display: grid;
		place-items: center;
	}

	.rack {
		position: relative;
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
		filter: drop-shadow(0 18px 30px rgba(0, 0, 0, 0.6)) drop-shadow(0 0 40px rgba(255, 160, 70, 0.08));
	}

	canvas {
		display: block;
		width: 100%;
		height: 100%;
	}

	.fallback {
		width: 100%;
		height: 100%;
		display: grid;
		grid-template-columns: repeat(var(--n), 1fr);
		gap: 8px;
		padding: 4%;
		border-radius: 18px;
		background: #3a2010;
	}

	.fallback span {
		display: grid;
		place-items: center;
		border-radius: 50%;
		background: #120a06;
		color: #f6e8c8;
		font-family: Cinzel, Georgia, serif;
		font-weight: 700;
		font-size: 1.4rem;
	}

	.fallback span.on {
		background: radial-gradient(circle at 40% 35%, #4fb3a0, #1d4a44);
	}
</style>
