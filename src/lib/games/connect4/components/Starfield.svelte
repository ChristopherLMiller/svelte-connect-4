<script lang="ts">
	import {
		createStarfield,
		paintSpecks,
		STAR_DRIFT_FACTOR,
		STAR_PARALLAX,
		VOYAGE_DRIFT_PX_PER_S,
		VOYAGE_TRAVEL_PX_PER_S
	} from '../space';

	let root = $state<HTMLDivElement | null>(null);
	let farEl = $state<HTMLCanvasElement | null>(null);
	let midEl = $state<HTMLCanvasElement | null>(null);
	let midAnim: Animation | null = null;

	function sizeCanvas(canvas: HTMLCanvasElement, cssW: number, cssH: number) {
		const dpr = Math.min(2, window.devicePixelRatio || 1);
		canvas.width = Math.max(1, Math.round(cssW * dpr));
		canvas.height = Math.max(1, Math.round(cssH * dpr));
		canvas.style.width = `${cssW}px`;
		canvas.style.height = `${cssH}px`;
		const ctx = canvas.getContext('2d');
		if (!ctx) return null;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		return ctx;
	}

	function paintFar(canvas: HTMLCanvasElement, field: ReturnType<typeof createStarfield>) {
		const ctx = sizeCanvas(canvas, field.width, field.height);
		if (!ctx) return;
		ctx.clearRect(0, 0, field.width, field.height);
		paintSpecks(ctx, field.far, field.width, field.height);
		paintSpecks(ctx, field.deep, field.width, field.height);
	}

	function paintMid(canvas: HTMLCanvasElement, field: ReturnType<typeof createStarfield>) {
		// Double-tall so a translateY loop of `height` is seamless.
		const ctx = sizeCanvas(canvas, field.width, field.height * 2);
		if (!ctx) return;
		ctx.clearRect(0, 0, field.width, field.height * 2);
		paintSpecks(ctx, field.mid, field.width, field.height, 0);
		paintSpecks(ctx, field.mid, field.width, field.height, field.height);
	}

	function startMidScroll(canvas: HTMLCanvasElement, tileH: number) {
		midAnim?.cancel();
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			canvas.style.transform = 'translate3d(0, 0, 0)';
			return;
		}
		const duration = Math.max(8, tileH / (VOYAGE_TRAVEL_PX_PER_S * STAR_PARALLAX)) * 1000;
		const drift = VOYAGE_DRIFT_PX_PER_S * STAR_DRIFT_FACTOR * (duration / 1000);
		midAnim = canvas.animate(
			[
				{ transform: 'translate3d(0px, 0px, 0)' },
				{ transform: `translate3d(${(-drift).toFixed(1)}px, ${tileH.toFixed(1)}px, 0)` }
			],
			{
				duration,
				easing: 'linear',
				iterations: Infinity
			}
		);
	}

	$effect(() => {
		const node = root;
		const far = farEl;
		const mid = midEl;
		if (!node || !far || !mid) return;

		const measure = () => ({
			w: Math.max(node.parentElement?.clientWidth || 0, window.innerWidth),
			h: Math.max(node.parentElement?.clientHeight || 0, window.innerHeight)
		});

		const render = (size: { w: number; h: number }) => {
			const field = createStarfield(2026, size);
			paintFar(far, field);
			paintMid(mid, field);
			startMidScroll(mid, field.height);
		};

		let fieldSize = measure();
		render(fieldSize);

		const onResize = () => {
			const next = measure();
			if (Math.abs(next.w - fieldSize.w) < 160 && Math.abs(next.h - fieldSize.h) < 160) return;
			fieldSize = next;
			render(next);
		};

		window.addEventListener('resize', onResize);
		return () => {
			midAnim?.cancel();
			midAnim = null;
			window.removeEventListener('resize', onResize);
		};
	});
</script>

<div class="starfield" bind:this={root} aria-hidden="true">
	<canvas class="layer far" bind:this={farEl}></canvas>
	<canvas class="layer mid" bind:this={midEl}></canvas>
</div>

<style>
	.starfield {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
	}

	.layer {
		position: absolute;
		left: 0;
		top: 0;
		display: block;
		pointer-events: none;
		backface-visibility: hidden;
	}

	.far {
		opacity: 0.88;
	}

	.mid {
		opacity: 0.9;
		transform: translate3d(0, 0, 0);
	}
</style>
