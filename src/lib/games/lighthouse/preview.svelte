<script lang="ts">
	import { HIT, MISS, SUNK } from './engine';
	import { SeaRenderer, type SeaView } from './render';

	const N = 8;
	/** Mid-battle in the cove: a Cutter already sunk, the Brigantine burning, buoys scattered through the fog. */
	const SHOTS: Array<[number, number]> = [
		[9, MISS],
		[13, MISS],
		[27, MISS],
		[30, MISS],
		[36, MISS],
		[43, MISS],
		[58, MISS],
		[62, MISS],
		[18, MISS],
		[20, HIT],
		[21, HIT],
		[49, SUNK],
		[50, SUNK]
	];

	const stars = Array.from({ length: 22 }, (_, k) => ({ k, x: (k * 47) % 100, y: (k * 29) % 34, s: 0.3 + ((k * 7) % 4) / 10, d: (k * 0.37) % 3 }));

	function chart(canvas: HTMLCanvasElement) {
		const renderer = new SeaRenderer(canvas);
		renderer.motion = false;
		renderer.weather = 'storm';
		renderer.setSize(N);
		const shots = new Array(N * N).fill(0);
		for (const [i, v] of SHOTS) shots[i] = v;
		const view: SeaView = {
			role: 'target',
			owner: 2,
			shots,
			ships: [{ length: 2, at: 49, vertical: false, sunk: true }],
			hover: -1,
			cursor: -1,
			active: false,
			preview: null
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
	<div class="stars">
		{#each stars as s (s.k)}
			<i style:left="{s.x}%" style:top="{s.y}%" style:scale={s.s} style:animation-delay="-{s.d}s"></i>
		{/each}
	</div>
	<div class="moon"></div>
	<div class="cloud c1"></div>
	<div class="cloud c2"></div>
	<div class="sea"></div>
	<div class="glitter"></div>
	<div class="beam"></div>
	<div class="cliff"></div>
	<svg class="tower" viewBox="0 0 20 60">
		<path d="M5 60 L7 14 L13 14 L15 60 Z" fill="#efe8da" />
		<path d="M5.9 40 L14.1 40 L14.5 48 L5.5 48 Z" fill="#c8321f" />
		<path d="M6.5 24 L13.5 24 L13.8 31 L6.2 31 Z" fill="#c8321f" />
		<rect x="5" y="12" width="10" height="2.4" rx="0.6" fill="#22282c" />
		<rect x="7" y="6" width="6" height="6" fill="#ffd27a" />
		<path d="M6 6 L10 2 L14 6 Z" fill="#22282c" />
	</svg>
	<div class="lamp"></div>
	<div class="board">
		<canvas {@attach chart}></canvas>
	</div>
</div>

<style>
	.shot {
		position: relative;
		height: 100%;
		overflow: hidden;
		container-type: size;
		background: #060b11;
	}

	.sky {
		position: absolute;
		inset: 0 0 40%;
		background: linear-gradient(180deg, #050a12 0%, #0e1d2e 55%, #22384c 100%);
	}

	.stars i {
		position: absolute;
		width: 0.7cqh;
		height: 0.7cqh;
		border-radius: 50%;
		background: #fff6dc;
		box-shadow: 0 0 1cqh rgba(255, 240, 200, 0.8);
		animation: twinkle 3s ease-in-out infinite;
	}

	.moon {
		position: absolute;
		left: 14%;
		top: 9%;
		width: 10cqh;
		height: 10cqh;
		border-radius: 50%;
		background: radial-gradient(circle at 40% 38%, #fff8e2, #e9d9ae 60%, #c9b88c);
		box-shadow: 0 0 8cqh rgba(255, 236, 190, 0.45);
	}

	.cloud {
		position: absolute;
		height: 7cqh;
		border-radius: 999px;
		background: linear-gradient(180deg, rgba(60, 80, 100, 0.85), rgba(25, 38, 52, 0.85));
		filter: blur(0.6cqh);
		animation: drift 14s ease-in-out infinite;
	}

	.c1 {
		left: 4%;
		top: 15%;
		width: 26%;
	}

	.c2 {
		left: 62%;
		top: 6%;
		width: 30%;
		animation-delay: -6s;
	}

	.sea {
		position: absolute;
		inset: 60% 0 0;
		background:
			repeating-linear-gradient(180deg, rgba(120, 170, 200, 0.12) 0 0.3cqh, transparent 0.3cqh 2.6cqh),
			linear-gradient(180deg, #13304a, #071422);
	}

	.glitter {
		position: absolute;
		left: 10%;
		top: 60%;
		width: 18%;
		height: 40%;
		background: repeating-linear-gradient(180deg, rgba(255, 240, 200, 0.45) 0 0.3cqh, transparent 0.3cqh 2.2cqh);
		mask: linear-gradient(90deg, transparent, #000 40%, #000 60%, transparent);
		opacity: 0.6;
	}

	.beam {
		position: absolute;
		right: 8.4%;
		top: 38.8%;
		width: 80%;
		height: 30cqh;
		translate: 0 -50%;
		transform-origin: 100% 50%;
		background: linear-gradient(270deg, rgba(255, 226, 150, 0.6), rgba(255, 226, 150, 0));
		clip-path: polygon(100% 48%, 0 0, 0 100%, 100% 52%);
		animation: sweep 7s ease-in-out infinite alternate;
	}

	.cliff {
		position: absolute;
		right: 0;
		bottom: 0;
		width: 30%;
		height: 50%;
		background: linear-gradient(180deg, #1a242b, #0b1014);
		clip-path: polygon(0 100%, 8% 70%, 22% 52%, 40% 34%, 60% 28%, 80% 30%, 100% 24%, 100% 100%);
	}

	.tower {
		position: absolute;
		right: 6%;
		bottom: 34%;
		height: 32cqh;
		aspect-ratio: 1 / 3;
	}

	.lamp {
		position: absolute;
		right: calc(6% + 5cqh * 0.53);
		bottom: calc(34% + 32cqh * 0.86);
		width: 8cqh;
		height: 8cqh;
		translate: 50% 50%;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(255, 226, 150, 0.9), rgba(255, 226, 150, 0) 70%);
	}

	.board {
		position: absolute;
		left: 42%;
		top: 12%;
		bottom: 9%;
		aspect-ratio: 1;
		translate: -50% 0;
		filter: drop-shadow(0 2cqh 2.6cqh rgba(0, 0, 0, 0.6));
	}

	.board canvas {
		width: 100%;
		height: 100%;
		display: block;
	}

	@keyframes twinkle {
		50% {
			opacity: 0.35;
		}
	}

	@keyframes drift {
		50% {
			translate: 3cqh 0;
		}
	}

	@keyframes sweep {
		from {
			rotate: -8deg;
		}
		to {
			rotate: 10deg;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.stars i,
		.cloud,
		.beam {
			animation: none;
		}
	}
</style>
