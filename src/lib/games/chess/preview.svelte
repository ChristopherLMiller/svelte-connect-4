<script lang="ts">
	import { Position, parseSquare } from './engine';
	import { BoardRenderer, type BoardView } from './render';

	/** An Italian Game, Black has just played ...d6. */
	const FEN = 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQ1RK1 w - - 0 7';

	const rain = Array.from({ length: 26 }, (_, k) => ({ k, x: (k * 37) % 100, d: ((k * 0.29) % 1.2).toFixed(2), h: 4 + ((k * 5) % 5) }));

	function board(canvas: HTMLCanvasElement) {
		const renderer = new BoardRenderer(canvas);
		renderer.motion = false;
		const view: BoardView = {
			board: new Position(FEN).board,
			bottom: 'w',
			coords: true,
			hints: true,
			selected: -1,
			targets: [],
			last: { from: parseSquare('d7'), to: parseSquare('d6') },
			check: -1,
			cursor: -1,
			hover: -1,
			drag: null,
			mark: null,
			fallen: null
		};
		const paint = () => {
			const rect = canvas.getBoundingClientRect();
			if (!rect.width || !rect.height) return;
			renderer.resize(rect.width, rect.height);
			renderer.draw(performance.now(), view);
		};
		const observer = new ResizeObserver(paint);
		observer.observe(canvas);
		paint();
		return () => observer.disconnect();
	}
</script>

<div class="shot" aria-hidden="true">
	<div class="wall"></div>
	{#each [12, 88] as x (x)}
		<div class="window" style:left="{x}%">
			<div class="glass">
				{#each rain as r (r.k)}
					<i style:left="{r.x}%" style:height="{r.h}cqh" style:animation-delay="-{r.d}s"></i>
				{/each}
			</div>
		</div>
	{/each}
	<div class="curtain left"></div>
	<div class="curtain right"></div>
	<div class="floor"></div>
	<div class="chandelier"></div>
	<div class="board">
		<canvas {@attach board}></canvas>
	</div>
</div>

<style>
	.shot {
		position: relative;
		height: 100%;
		overflow: hidden;
		container-type: size;
		background: #0d0806;
	}

	.wall {
		position: absolute;
		inset: 0 0 26%;
		background:
			repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.25) 0 0.25cqh, transparent 0.25cqh 7cqh),
			radial-gradient(ellipse at 50% 10%, rgba(255, 190, 110, 0.25), transparent 60%),
			linear-gradient(180deg, #2a1a14, #1a0f0b 70%, #3a2416);
	}

	.window {
		position: absolute;
		top: 10%;
		width: 15%;
		height: 56%;
		translate: -50% 0;
		border: 0.8cqh solid #3a2618;
		border-radius: 50% 50% 0 0 / 22% 22% 0 0;
		background: #1a1410;
		overflow: hidden;
		box-shadow: 0 0 6cqh rgba(120, 150, 220, 0.18);
	}

	.glass {
		position: absolute;
		inset: 0;
		background:
			linear-gradient(90deg, transparent 48%, #2a1a10 48% 52%, transparent 52%),
			linear-gradient(0deg, transparent 58%, #2a1a10 58% 61%, transparent 61%),
			radial-gradient(circle at 64% 22%, rgba(240, 236, 210, 0.85) 0 5%, rgba(160, 180, 230, 0.25) 6%, transparent 40%),
			linear-gradient(180deg, #0d1530, #2a3b66);
	}

	.glass i {
		position: absolute;
		top: -10%;
		width: 1px;
		background: linear-gradient(180deg, transparent, rgba(190, 210, 240, 0.7));
		rotate: 8deg;
		animation: rain 1.1s linear infinite;
	}

	.curtain {
		position: absolute;
		top: 0;
		bottom: 22%;
		width: 7%;
		background: repeating-linear-gradient(90deg, #4a0f14 0 1.6cqh, #6e1a20 1.6cqh 2.6cqh, #3a0a0e 2.6cqh 3.6cqh);
		box-shadow: 0 0 4cqh rgba(0, 0, 0, 0.7);
	}

	.curtain.left {
		left: 0;
		border-radius: 0 0 40% 0;
	}

	.curtain.right {
		right: 0;
		border-radius: 0 0 0 40%;
	}

	.floor {
		position: absolute;
		inset: 74% -20% 0;
		background:
			radial-gradient(ellipse at 50% 0%, rgba(255, 200, 120, 0.25), transparent 60%),
			repeating-conic-gradient(#e8dcc6 0 25%, #2c3e36 0 50%) 0 0 / 9cqh 9cqh;
		transform: perspective(30cqh) rotateX(52deg);
		transform-origin: 50% 0;
		opacity: 0.55;
	}

	.chandelier {
		position: absolute;
		left: 50%;
		top: -6%;
		width: 60cqh;
		height: 34cqh;
		translate: -50% 0;
		border-radius: 50%;
		background: radial-gradient(ellipse, rgba(255, 213, 138, 0.55), rgba(255, 170, 80, 0.12) 45%, transparent 70%);
		animation: flicker 2.6s ease-in-out infinite;
	}

	.board {
		position: absolute;
		left: 50%;
		top: 10%;
		bottom: 7%;
		aspect-ratio: 1;
		translate: -50% 0;
		filter: drop-shadow(0 2cqh 3cqh rgba(0, 0, 0, 0.7));
	}

	.board canvas {
		width: 100%;
		height: 100%;
		display: block;
	}

	@keyframes rain {
		to {
			translate: -2cqh 70cqh;
		}
	}

	@keyframes flicker {
		0%,
		100% {
			opacity: 1;
		}
		45% {
			opacity: 0.78;
		}
		60% {
			opacity: 0.92;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.glass i,
		.chandelier {
			animation: none;
		}
	}
</style>
