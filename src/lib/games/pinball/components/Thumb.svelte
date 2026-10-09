<script lang="ts">
	import { TableRenderer } from '../engine/render';
	import { createGame } from '../engine/game';
	import type { AnySpec } from '../tables/spec';

	let { spec }: { spec: AnySpec } = $props();

	function paint(canvas: HTMLCanvasElement) {
		const r = new TableRenderer(canvas, spec.rules.def, spec.art);
		const game = createGame(spec.rules, 'fair', 7);
		game.phase = 'play';
		const scene = { game, status: { type: 'paused' } };
		const draw = () => {
			const w = canvas.clientWidth;
			if (!w) return;
			r.resize(w);
			r.draw(scene, 0, 0, { motion: false });
		};
		const observer = new ResizeObserver(draw);
		observer.observe(canvas);
		draw();
		let alive = true;
		document.fonts?.ready.then(() => {
			if (!alive) return;
			r.repaint();
			draw();
		});
		return () => {
			alive = false;
			observer.disconnect();
		};
	}
</script>

<canvas {@attach paint} aria-hidden="true"></canvas>

<style>
	canvas {
		display: block;
		width: 100%;
		aspect-ratio: 20 / 36;
	}
</style>
