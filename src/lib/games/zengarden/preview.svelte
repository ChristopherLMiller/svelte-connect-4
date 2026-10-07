<script lang="ts">
	import { GardenRenderer } from './render';
	import { createBoard } from './engine';

	const SIZE = 13;
	/** Mid-game on the courtyard bed: slate has an open three on the diagonal, quartz is hemming it in. */
	const STONES: Array<[number, number, 1 | 2]> = [
		[6, 6, 1],
		[5, 6, 2],
		[7, 7, 1],
		[5, 5, 2],
		[5, 7, 1],
		[8, 8, 2],
		[4, 4, 1],
		[6, 4, 2],
		[7, 5, 1],
		[4, 8, 2],
		[6, 8, 1],
		[3, 6, 2]
	];

	const bamboo = Array.from({ length: 7 }, (_, k) => ({ k, x: k * 13 + ((k * 7) % 5), w: 1.1 + ((k * 3) % 3) * 0.3, d: (k * 0.53) % 3 }));
	const petals = Array.from({ length: 18 }, (_, k) => ({ k, x: (k * 59) % 100, y: (k * 37) % 90, d: (k * 0.71) % 6, r: (k * 47) % 360 }));

	function stones(canvas: HTMLCanvasElement) {
		const renderer = new GardenRenderer(canvas);
		renderer.motion = false;
		const board = createBoard(SIZE);
		for (const [r, c, p] of STONES) board[r * SIZE + c] = p;
		renderer.load(board, SIZE);
		const view = {
			current: 2 as const,
			human: false,
			hover: -1,
			cursor: -1,
			ghost: false,
			last: 6 * SIZE + 8,
			threats: { 1: [], 2: [] },
			warn: false,
			win: null,
			winner: 0 as const
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
	<div class="sky"></div>
	<div class="sun"></div>
	<div class="ridge far"></div>
	<div class="ridge mid"></div>
	<div class="mist"></div>
	<svg class="pagoda" viewBox="0 0 30 60">
		<g fill="#4a3c3e">
			<rect x="13" y="0" width="1.5" height="8" />
			<path d="M4 12 L25 12 L21 9 L8 9 Z" />
			<rect x="9" y="12" width="11" height="6" />
			<path d="M2 22 L27 22 L22 18 L7 18 Z" />
			<rect x="8" y="22" width="13" height="7" />
			<path d="M0 33 L29 33 L23 29 L6 29 Z" />
			<rect x="7" y="33" width="15" height="10" />
		</g>
		<rect x="13" y="36" width="3" height="4" fill="#ffcf7a" />
	</svg>
	<div class="wall"><i></i></div>
	<div class="tree">
		<i class="trunk"></i>
		<i class="crown c1"></i>
		<i class="crown c2"></i>
		<i class="crown c3"></i>
	</div>
	<div class="bamboo">
		{#each bamboo as b (b.k)}
			<b style:left="{b.x}%" style:width="{b.w}cqh" style:animation-delay="-{b.d}s"></b>
		{/each}
	</div>
	<div class="ground"></div>
	<svg class="lantern" viewBox="0 0 24 48">
		<g fill="#8a8478">
			<path d="M2 12 L22 12 L18 6 L6 6 Z" />
			<rect x="11" y="2" width="2" height="5" />
			<rect x="6" y="12" width="12" height="10" />
			<rect x="4" y="22" width="16" height="3" />
			<rect x="9" y="25" width="6" height="16" />
			<rect x="5" y="41" width="14" height="5" />
		</g>
		<rect x="9" y="14" width="6" height="6" fill="#ffcf7a" />
	</svg>
	<div class="board">
		<canvas {@attach stones}></canvas>
	</div>
	<div class="petals">
		{#each petals as p (p.k)}
			<i style:left="{p.x}%" style:top="{p.y}%" style:rotate="{p.r}deg" style:animation-delay="-{p.d}s"></i>
		{/each}
	</div>
</div>

<style>
	.shot {
		position: relative;
		height: 100%;
		overflow: hidden;
		container-type: size;
		background: #1e1a16;
	}

	.sky {
		position: absolute;
		inset: 0 0 45%;
		background: linear-gradient(180deg, #a9c3d8 0%, #e6d9cf 60%, #f6dccb 100%);
	}

	.sun {
		position: absolute;
		left: 70%;
		top: 9%;
		width: 9cqh;
		height: 9cqh;
		border-radius: 50%;
		background: radial-gradient(circle, #fff7e4 0 45%, rgba(255, 220, 180, 0) 72%);
		box-shadow: 0 0 9cqh rgba(255, 210, 170, 0.6);
	}

	.ridge {
		position: absolute;
		left: 0;
		right: 0;
	}

	.ridge.far {
		top: 18%;
		height: 16%;
		background: #9fb0bf;
		clip-path: polygon(0 70%, 10% 40%, 20% 55%, 34% 10%, 46% 50%, 58% 30%, 72% 60%, 86% 20%, 100% 45%, 100% 100%, 0 100%);
	}

	.ridge.mid {
		top: 26%;
		height: 14%;
		background: #6f8090;
		clip-path: polygon(0 50%, 12% 70%, 24% 30%, 36% 60%, 52% 20%, 64% 55%, 78% 35%, 90% 60%, 100% 40%, 100% 100%, 0 100%);
	}

	.mist {
		position: absolute;
		left: 0;
		right: 0;
		top: 30%;
		height: 12%;
		background: linear-gradient(180deg, transparent, rgba(240, 232, 222, 0.75));
	}

	.pagoda {
		position: absolute;
		left: 74%;
		top: 15%;
		height: 22cqh;
		aspect-ratio: 1 / 2;
	}

	.wall {
		position: absolute;
		left: 0;
		right: 0;
		top: 38%;
		height: 14%;
		background: repeating-linear-gradient(180deg, transparent 0 19%, rgba(255, 250, 240, 0.85) 19% 22%), linear-gradient(180deg, #d79a5a, #b97a42);
		border-top: 2cqh solid #3e3a3c;
	}

	.wall i {
		position: absolute;
		inset: -3cqh 0 auto;
		height: 1.2cqh;
		background: #59545a;
	}

	.tree {
		position: absolute;
		left: 0;
		top: 0;
		width: 34%;
		height: 62%;
	}

	.trunk {
		position: absolute;
		left: 12%;
		top: 30%;
		bottom: 0;
		width: 8%;
		border-radius: 30%;
		background: linear-gradient(90deg, #2b1d18, #4a3328);
		rotate: 6deg;
	}

	.crown {
		position: absolute;
		border-radius: 50%;
		background: radial-gradient(circle at 40% 35%, #fbd9e3, #f0a5bd 60%, #d7809d);
		animation: sway 6s ease-in-out infinite;
	}

	.c1 {
		left: -10%;
		top: 4%;
		width: 70%;
		height: 34%;
	}

	.c2 {
		left: 28%;
		top: 12%;
		width: 62%;
		height: 30%;
		animation-delay: -2s;
	}

	.c3 {
		left: 4%;
		top: 26%;
		width: 52%;
		height: 22%;
		animation-delay: -4s;
	}

	.bamboo {
		position: absolute;
		right: 0;
		top: 0;
		width: 18%;
		height: 72%;
	}

	.bamboo b {
		position: absolute;
		top: 0;
		bottom: 0;
		border-radius: 999px;
		background: repeating-linear-gradient(180deg, #6e8f3e 0 7cqh, #3f5a24 7cqh 7.6cqh), #6e8f3e;
		transform-origin: bottom;
		animation: sway 5s ease-in-out infinite;
	}

	.ground {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 48%;
		background:
			repeating-linear-gradient(180deg, rgba(160, 150, 130, 0.35) 0 0.4cqh, transparent 0.4cqh 1.8cqh),
			linear-gradient(180deg, #d8d0bf, #bfb6a2);
	}

	.lantern {
		position: absolute;
		left: 5%;
		bottom: 8%;
		height: 30cqh;
		aspect-ratio: 1 / 2;
	}

	.board {
		position: absolute;
		left: 50%;
		top: 8%;
		bottom: 4%;
		aspect-ratio: 1;
		translate: -50% 0;
		filter: drop-shadow(0 2cqh 2.4cqh rgba(40, 25, 10, 0.45));
	}

	.board canvas {
		width: 100%;
		height: 100%;
		display: block;
	}

	.petals i {
		position: absolute;
		width: 1.4cqh;
		height: 1.8cqh;
		border-radius: 50% 0 50% 50%;
		background: #f6b8cb;
		opacity: 0.9;
		animation: drift 6s ease-in-out infinite;
	}

	@keyframes sway {
		50% {
			rotate: 2deg;
		}
	}

	@keyframes drift {
		50% {
			translate: 2cqh 3cqh;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.crown,
		.bamboo b,
		.petals i {
			animation: none;
		}
	}
</style>
