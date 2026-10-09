<script lang="ts">
	import { bloomSprite, moonSprite } from '../render';
	import type { Kind } from '../types';

	let { kind, moon = false, size = 34 }: { kind: Kind; moon?: boolean; size?: number } = $props();

	function paint(canvas: HTMLCanvasElement) {
		const dpr = Math.min(2, window.devicePixelRatio || 1);
		const px = Math.round(size * dpr);
		canvas.width = canvas.height = px;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		ctx.clearRect(0, 0, px, px);
		ctx.drawImage(moon ? moonSprite(px) : bloomSprite(kind, px), 0, 0);
	}
</script>

<canvas {@attach paint} style:width="{size}px" style:height="{size}px" aria-hidden="true"></canvas>

<style>
	canvas {
		display: block;
	}
</style>
