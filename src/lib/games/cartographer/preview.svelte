<script lang="ts">
	import { createGrid, play, sidesOf, topology, type Grid } from './engine';
	import { mulberry32 } from './map';
	import { ChartRenderer } from './render';
	import type { Player } from './types';

	const N = 6;
	const SEED = 4127;

	/** A seeded half-played sheet: closers keep the quill, others avoid giving a third side. */
	function midGame(): { grid: Grid; last: number } {
		const topo = topology(N);
		const random = mulberry32(SEED);
		let grid = createGrid(N);
		let player: Player = 1;
		let last = -1;
		const target = Math.round(topo.B * 0.45);
		for (let turn = 0; turn < topo.E; turn += 1) {
			const open = [...grid.edges.keys()].filter((e) => !grid.edges[e]);
			const sides = (e: number) =>
				[0, 1].map((k) => topo.edgeBoxes[e * 2 + k]!).filter((b) => b >= 0).map((b) => sidesOf(topo, grid.edges, b));
			const closing = open.filter((e) => sides(e).includes(3));
			const safe = open.filter((e) => !sides(e).includes(2));
			const claimed = grid.boxes.reduce((sum, b) => sum + (b ? 1 : 0), 0);
			const pool = closing.length ? closing : safe.length ? safe : claimed < target ? open : [];
			if (!pool.length) break;
			const e = pool[Math.floor(random() * pool.length)]!;
			const result = play(grid, e, player)!;
			grid = result.grid;
			last = e;
			if (!result.closed.length) player = player === 1 ? 2 : 1;
		}
		return { grid, last };
	}

	const SHEET = midGame();

	function chart(canvas: HTMLCanvasElement) {
		const renderer = new ChartRenderer(canvas);
		renderer.motion = false;
		renderer.setGrid(SHEET.grid, 'coast', SEED);
		renderer.lastEdge = SHEET.last;
		const paint = () => {
			const w = canvas.clientWidth;
			if (!w) return;
			renderer.resize(w);
			renderer.draw(0);
		};
		const observer = new ResizeObserver(paint);
		observer.observe(canvas);
		paint();
		return () => observer.disconnect();
	}
</script>

<div class="shot" aria-hidden="true">
	<div class="candle"></div>
	<span class="scroll"></span>
	<span class="ink"></span>
	<span class="quill"></span>
	<span class="compass"><i></i></span>
	<div class="sheet">
		<canvas {@attach chart}></canvas>
	</div>
</div>

<style>
	.shot {
		position: relative;
		height: 100%;
		overflow: hidden;
		container-type: size;
		background:
			radial-gradient(70% 60% at 50% 45%, rgba(255, 190, 110, 0.12), transparent 70%),
			repeating-linear-gradient(180deg, rgba(0, 0, 0, 0) 0 18%, rgba(0, 0, 0, 0.35) 18% 18.6%),
			repeating-linear-gradient(90deg, rgba(255, 220, 160, 0.03) 0 3px, transparent 3px 7px),
			linear-gradient(180deg, #4a2a14, #2a160a);
	}

	.candle {
		position: absolute;
		left: 10%;
		top: 18%;
		width: 80cqh;
		height: 80cqh;
		translate: -50% -50%;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(255, 200, 120, 0.45), rgba(255, 140, 60, 0.14) 35%, transparent 65%);
		animation: flicker 2.4s ease-in-out infinite;
	}

	.candle::before {
		content: '';
		position: absolute;
		left: 50%;
		top: 50%;
		width: 20cqh;
		height: 20cqh;
		translate: -50% -50%;
		border-radius: 50%;
		background: radial-gradient(circle, #e9c77a 0 30%, #b88a3a 50%, #7a5420 68%, transparent 70%);
	}

	.candle::after {
		content: '';
		position: absolute;
		left: 50%;
		top: 50%;
		width: 3.6cqh;
		height: 3.6cqh;
		translate: -50% -50%;
		border-radius: 50%;
		background: radial-gradient(circle, #fffbe8, #ffc36a 60%, transparent 70%);
		box-shadow: 0 0 14px 6px rgba(255, 170, 80, 0.6);
	}

	.scroll {
		position: absolute;
		left: 4%;
		top: 40%;
		width: 5cqh;
		height: 36cqh;
		border-radius: 2.5cqh;
		background:
			linear-gradient(180deg, transparent 44%, #8a2a1a 44% 50%, transparent 50%),
			linear-gradient(90deg, #8a6a40, #e2c890 45%, #a07a48);
		box-shadow: 0 6px 12px rgba(0, 0, 0, 0.5);
	}

	.ink {
		position: absolute;
		right: 7%;
		top: 14%;
		width: 11cqh;
		height: 11cqh;
		border-radius: 30%;
		background: radial-gradient(circle at 50% 50%, #050404 0 28%, #2a2a30 32%, #121216 70%);
		box-shadow: 0 6px 12px rgba(0, 0, 0, 0.6);
	}

	.quill {
		position: absolute;
		right: 3%;
		top: 4%;
		width: 2cqh;
		height: 30cqh;
		rotate: 28deg;
		border-radius: 50% 50% 10% 10%;
		background: linear-gradient(90deg, #d8cfc0, #f6f0e4 50%, #b8ad9c);
		opacity: 0.85;
	}

	.compass {
		position: absolute;
		right: 6%;
		bottom: 10%;
		width: 18cqh;
		aspect-ratio: 1;
		border-radius: 50%;
		background: radial-gradient(circle, #e8dcc0 0 58%, #a07a3a 60% 70%, #5a3e18 72%);
		box-shadow: 0 8px 14px rgba(0, 0, 0, 0.55);
	}

	.compass i {
		position: absolute;
		inset: 22%;
		clip-path: polygon(50% 0, 58% 50%, 50% 100%, 42% 50%);
		rotate: 35deg;
		background: linear-gradient(180deg, #a8301c 50%, #2a2a30 50%);
	}

	.sheet {
		position: absolute;
		left: 50%;
		top: 50%;
		height: 90%;
		aspect-ratio: 1;
		translate: -50% -50%;
		rotate: -0.6deg;
		border-radius: 2px;
		overflow: hidden;
		box-shadow:
			0 0 0 1px rgba(90, 58, 26, 0.45),
			0 12px 26px rgba(0, 0, 0, 0.6),
			0 0 40px rgba(255, 170, 80, 0.15);
		z-index: 1;
	}

	.sheet canvas {
		display: block;
		width: 100%;
		height: 100%;
	}

	@keyframes flicker {
		0%,
		100% {
			opacity: 1;
			scale: 1;
		}
		30% {
			opacity: 0.85;
			scale: 0.97;
		}
		55% {
			opacity: 0.95;
			scale: 1.02;
		}
		75% {
			opacity: 0.8;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.candle {
			animation: none;
		}
	}
</style>
