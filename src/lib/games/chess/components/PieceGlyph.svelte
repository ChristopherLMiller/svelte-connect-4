<script lang="ts">
	import { renderSprite } from '../render';

	let { piece, size = 24 }: { piece: number; size?: number } = $props();

	function paint(canvas: HTMLCanvasElement) {
		$effect(() => {
			const dpr = Math.min(2, window.devicePixelRatio || 1);
			const px = Math.round(size * dpr);
			canvas.width = px;
			canvas.height = px;
			const ctx = canvas.getContext('2d');
			if (!ctx) return;
			ctx.clearRect(0, 0, px, px);
			ctx.drawImage(renderSprite(piece, px), 0, 0);
		});
	}
</script>

<canvas {@attach paint} style:width="{size}px" style:height="{size}px" aria-hidden="true"></canvas>

<style>
	canvas {
		display: block;
		flex-shrink: 0;
	}
</style>
