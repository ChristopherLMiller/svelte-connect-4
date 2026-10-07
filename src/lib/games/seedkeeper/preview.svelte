<script lang="ts">
	import { BankRenderer } from './render';

	/** A classic game a few turns in: Firefly to sow, a capture waiting in pit 1. */
	const BOARD = [2, 0, 5, 4, 1, 6, 8, 3, 4, 0, 5, 2, 3, 5];

	const reeds = Array.from({ length: 9 }, (_, k) => ({ k, x: k * 2.4, h: 26 + ((k * 37) % 30), r: ((k * 53) % 20) - 10 }));
	const strands = Array.from({ length: 12 }, (_, k) => ({ k, x: 1 + k * 2.1, h: 30 + ((k * 41) % 28), d: (k * 0.43) % 3 }));
	const flies = Array.from({ length: 16 }, (_, k) => ({ k, x: (k * 67) % 100, y: 40 + ((k * 29) % 56), d: (k * 0.61) % 3.4 }));

	function stones(canvas: HTMLCanvasElement) {
		const renderer = new BankRenderer(canvas);
		renderer.motion = false;
		renderer.load(BOARD);
		const view = {
			current: 1 as const,
			human: false,
			legal: [],
			hover: -1,
			cursor: -1,
			preview: null,
			counts: true,
			ended: false,
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

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&display=swap" rel="stylesheet" />
</svelte:head>

<div class="shot" aria-hidden="true">
	<div class="sky"></div>
	<div class="moon"></div>
	<div class="sun"></div>
	<div class="cloud a"></div>
	<div class="cloud b"></div>
	<div class="hills far"></div>
	<div class="hills near"></div>
	<div class="river">
		<i class="glitter"></i>
		<i class="pad p1"></i>
		<i class="pad p2"></i>
		<i class="pad p3"></i>
	</div>
	<svg class="heron" viewBox="0 0 40 60">
		<g fill="#2a2a36">
			<path d="M18 30 C26 26 32 30 33 34 C30 38 22 38 16 35 Z" />
			<path d="M18 31 C14 25 18 18 14 12 C13 9 10 9 9 11" fill="none" stroke="#2a2a36" stroke-width="2.6" stroke-linecap="round" />
			<circle cx="9.5" cy="11" r="2.4" />
			<path d="M8 10.5 L0 12.5 L8 12 Z" />
			<path d="M20 36 L19 58 M24 36 L26 58" fill="none" stroke="#2a2a36" stroke-width="1" />
		</g>
	</svg>
	<div class="willow">
		<i class="trunk"></i>
		{#each strands as s (s.k)}
			<b style:left="{s.x}%" style:height="{s.h}%" style:animation-delay="-{s.d}s"></b>
		{/each}
	</div>
	<div class="bank"></div>
	<svg class="reeds l" viewBox="0 0 24 60" preserveAspectRatio="none">
		{#each reeds as r (r.k)}
			<path d="M{r.x} 60 Q{r.x + r.r * 0.2} {60 - r.h * 0.6} {r.x + r.r * 0.4} {60 - r.h}" />
			{#if r.k % 3 === 0}
				<rect x={r.x + r.r * 0.35 - 0.9} y={60 - r.h + 2} width="1.8" height="7" rx="0.9" />
			{/if}
		{/each}
	</svg>
	<div class="board">
		<canvas {@attach stones}></canvas>
	</div>
	<div class="flies">
		{#each flies as f (f.k)}
			<i style:left="{f.x}%" style:top="{f.y}%" style:animation-delay="-{f.d}s"></i>
		{/each}
	</div>
</div>

<style>
	.shot {
		position: relative;
		height: 100%;
		overflow: hidden;
		container-type: size;
		background: #0c140d;
	}

	.sky {
		position: absolute;
		inset: 0 0 50%;
		background: linear-gradient(180deg, #2a2152 0%, #7a4570 45%, #e38a68 85%, #ffb27a 100%);
	}

	.moon {
		position: absolute;
		left: 18%;
		top: 14%;
		width: 5cqh;
		height: 5cqh;
		border-radius: 50%;
		background: radial-gradient(circle at 40% 40%, #fffbea, #ded8c4);
		box-shadow: 0 0 4cqh rgba(200, 210, 255, 0.5);
	}

	.sun {
		position: absolute;
		left: 68%;
		top: 33%;
		width: 11cqh;
		height: 11cqh;
		border-radius: 50%;
		background: radial-gradient(circle, #fff1c8 0 45%, #ffc078 60%, rgba(255, 150, 90, 0) 72%);
		box-shadow: 0 0 10cqh rgba(255, 150, 80, 0.5);
	}

	.cloud {
		position: absolute;
		height: 1.6cqh;
		border-radius: 999px;
		background: linear-gradient(90deg, transparent, rgba(255, 170, 150, 0.6), transparent);
	}

	.cloud.a {
		left: 8%;
		width: 50%;
		top: 26%;
	}

	.cloud.b {
		left: 48%;
		width: 44%;
		top: 18%;
	}

	.hills {
		position: absolute;
		left: 0;
		right: 0;
	}

	.hills.far {
		top: 40%;
		height: 10%;
		background: #5a3a5c;
		clip-path: polygon(0 60%, 12% 30%, 24% 50%, 38% 15%, 52% 45%, 66% 25%, 80% 50%, 92% 20%, 100% 40%, 100% 100%, 0 100%);
	}

	.hills.near {
		top: 45%;
		height: 5%;
		background: #2a1c33;
		clip-path: polygon(0 50%, 4% 20%, 7% 45%, 15% 35%, 22% 10%, 26% 40%, 40% 30%, 48% 0, 53% 40%, 70% 30%, 78% 5%, 83% 40%, 100% 20%, 100% 100%, 0 100%);
	}

	.river {
		position: absolute;
		top: 50%;
		left: 0;
		right: 0;
		height: 32%;
		background: linear-gradient(180deg, #b77b80 0%, #6b4a68 30%, #2c3448 70%, #1a2430 100%);
		overflow: hidden;
	}

	.glitter {
		position: absolute;
		left: 68%;
		top: 0;
		width: 11cqh;
		height: 100%;
		background: repeating-linear-gradient(180deg, rgba(255, 210, 150, 0.7) 0 0.4cqh, transparent 0.4cqh 1.6cqh);
		mask: linear-gradient(180deg, #000, transparent 85%);
		opacity: 0.8;
	}

	.pad {
		position: absolute;
		width: 5cqh;
		height: 1.6cqh;
		border-radius: 50%;
		background: #3d5f2c;
	}

	.p1 {
		left: 8%;
		top: 18%;
	}

	.p2 {
		left: 20%;
		top: 52%;
		width: 7cqh;
		height: 2.2cqh;
	}

	.p3 {
		left: 34%;
		top: 30%;
	}

	.p2::after {
		content: '';
		position: absolute;
		left: 30%;
		top: -40%;
		width: 1.8cqh;
		height: 1.6cqh;
		border-radius: 50% 50% 30% 30%;
		background: #f2a7c0;
	}

	.heron {
		position: absolute;
		right: 6%;
		top: 54%;
		height: 26cqh;
		aspect-ratio: 2 / 3;
	}

	.willow {
		position: absolute;
		left: 0;
		top: 0;
		width: 30%;
		height: 80%;
	}

	.trunk {
		position: absolute;
		left: 2%;
		top: 0;
		bottom: 0;
		width: 8%;
		border-radius: 40%;
		background: linear-gradient(90deg, #1a120f, #2c1d16);
	}

	.willow b {
		position: absolute;
		top: 0;
		width: 0.5cqh;
		border-radius: 0 0 50% 50%;
		background: repeating-linear-gradient(180deg, #4c6b34 0 1.2cqh, #3a5428 1.2cqh 2cqh);
		transform-origin: top;
		animation: sway 5s ease-in-out infinite;
	}

	.bank {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 20%;
		background:
			radial-gradient(60% 50% at 10% 0%, rgba(120, 170, 70, 0.4), transparent 70%),
			linear-gradient(180deg, #2a4220, #142010 60%, #0b140a);
		border-top: 0.6cqh solid #3f6b2c;
	}

	.reeds {
		position: absolute;
		bottom: 16%;
		height: 32cqh;
		width: 16cqh;
		fill: none;
		stroke: #2f4220;
		stroke-width: 0.9;
	}

	.reeds.l {
		left: 8%;
	}

	.reeds rect {
		fill: #5a3a20;
		stroke: none;
	}

	.board {
		position: absolute;
		left: 3%;
		right: 3%;
		top: 24%;
		bottom: 10%;
	}

	.board canvas {
		width: 100%;
		height: 100%;
		display: block;
	}

	.flies i {
		position: absolute;
		width: 1.2cqh;
		height: 1.2cqh;
		border-radius: 50%;
		background: radial-gradient(circle, #f6ffc0 0 20%, rgba(200, 240, 106, 0.5) 40%, transparent 70%);
		animation: blink 3.4s ease-in-out infinite;
	}

	@keyframes sway {
		50% {
			rotate: 3deg;
		}
	}

	@keyframes blink {
		0%,
		100% {
			opacity: 0;
		}
		40%,
		60% {
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.willow b,
		.flies i {
			animation: none;
		}
	}
</style>
