<script lang="ts">
	import { paintSpecks, type Speck } from '../space';

	let {
		dust,
		glow,
		distant
	}: {
		dust: Speck[];
		glow: Speck[];
		distant: Speck[];
	} = $props();

	let canvas = $state<HTMLCanvasElement | null>(null);

	$effect(() => {
		const node = canvas;
		if (!node) return;

		const parent = node.parentElement;
		const cssW = Math.max(1, parent?.clientWidth || window.innerWidth);
		const cssH = Math.max(1, parent?.clientHeight || window.innerHeight);
		const dpr = Math.min(1.5, window.devicePixelRatio || 1);
		node.width = Math.round(cssW * dpr);
		node.height = Math.round(cssH * dpr);
		node.style.width = '100%';
		node.style.height = '100%';

		const ctx = node.getContext('2d');
		if (!ctx) return;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, cssW, cssH);
		paintSpecks(ctx, dust, cssW, cssH);
		paintSpecks(ctx, glow, cssW, cssH);
		paintSpecks(ctx, distant, cssW, cssH);
	});
</script>

<canvas class="specks" bind:this={canvas} aria-hidden="true"></canvas>

<style>
	.specks {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
		pointer-events: none;
		opacity: 0.9;
	}
</style>
