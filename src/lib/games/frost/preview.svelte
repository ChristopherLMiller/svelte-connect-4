<script lang="ts">
	import { createField, neighbours, plant, reveal, toggleFlag } from './engine';
	import { FieldRenderer } from './render';
	import { HIDDEN, LEVEL_INFO } from './types';

	const SEED = 2207;

	function staged() {
		const field = createField(LEVEL_INFO.shore);
		const centre = Math.floor(field.total / 2);
		plant(field, centre, SEED, false);
		reveal(field, centre);
		const border = new Set<number>();
		for (let i = 0; i < field.total; i += 1) {
			if (field.state[i] === HIDDEN || !field.count[i]) continue;
			for (const n of neighbours(field.w, field.h, i)) if (field.mine[n] && field.state[n] === HIDDEN) border.add(n);
		}
		[...border].slice(0, 4).forEach((i) => toggleFlag(field, i));
		return field;
	}

	const FIELD = staged();

	function board(canvas: HTMLCanvasElement) {
		const renderer = new FieldRenderer(canvas);
		renderer.motion = false;
		renderer.setField(FIELD, false);
		const paint = () => {
			const w = canvas.clientWidth;
			if (!w) return;
			renderer.resize(w);
			renderer.draw(performance.now() + 60_000);
		};
		const observer = new ResizeObserver(paint);
		observer.observe(canvas);
		paint();
		return () => observer.disconnect();
	}

	const FIRS = Array.from({ length: 34 }, (_, i) => ({ i, x: i * 3 + ((i * 7) % 3), h: 50 + ((i * 37) % 50) }));
	const stars = Array.from({ length: 14 }, (_, i) => ({ i, x: (i * 41 + 9) % 100, y: (i * 17) % 30 }));
	const dust = Array.from({ length: 9 }, (_, i) => ({ i, x: 8 + ((i * 41) % 84), d: (i * 0.6) % 4 }));
</script>

<div class="shot" aria-hidden="true">
	{#each stars as star (star.i)}
		<i class="star" style:left="{star.x}%" style:top="{star.y}%"></i>
	{/each}
	<div class="aurora"></div>
	<svg class="pines" viewBox="0 0 100 10" preserveAspectRatio="none">
		{#each FIRS as fir (fir.i)}
			<path d="M{fir.x} 10 L{fir.x + 1.4} {10 - fir.h / 10} L{fir.x + 2.8} 10 Z" />
		{/each}
	</svg>
	<div class="lake">
		<i class="track a"></i>
		<i class="track b"></i>
	</div>
	<div class="hut"><b></b></div>
	<div class="skater"></div>
	{#each dust as d (d.i)}
		<i class="flake" style:left="{d.x}%" style:--d="{d.d}s"></i>
	{/each}
	<div class="slab">
		<canvas {@attach board}></canvas>
	</div>
</div>

<style>
	.shot {
		position: relative;
		height: 100%;
		overflow: hidden;
		container-type: size;
		background: linear-gradient(180deg, #2e2a5a 0%, #5a4378 22%, #a8708e 40%, #e8a48e 52%, #f4c0a0 56%);
	}

	.star {
		position: absolute;
		width: 1.5px;
		height: 1.5px;
		border-radius: 50%;
		background: #fff;
		opacity: 0.7;
	}

	.aurora {
		position: absolute;
		left: -10%;
		top: 6%;
		width: 60%;
		height: 30%;
		border-radius: 50%;
		background: radial-gradient(60% 40% at 50% 60%, rgba(120, 255, 190, 0.38), transparent 70%);
		filter: blur(6px);
		rotate: -8deg;
		animation: glow 8s ease-in-out infinite;
	}

	.pines {
		position: absolute;
		left: 0;
		top: 48%;
		width: 100%;
		height: 9%;
		fill: #1e1c34;
	}

	.lake {
		position: absolute;
		left: 0;
		right: 0;
		top: 56.5%;
		bottom: 0;
		background:
			radial-gradient(50% 30% at 30% 10%, rgba(255, 210, 190, 0.5), transparent 70%),
			linear-gradient(180deg, #e8d4dc, #cdb8cc 40%, #a890b0);
	}

	.track {
		position: absolute;
		height: 1px;
		border-radius: 50%;
		border-top: 1px solid rgba(255, 255, 255, 0.55);
	}

	.track.a {
		left: 4%;
		top: 30%;
		width: 34%;
		height: 10%;
		rotate: -6deg;
	}

	.track.b {
		right: 2%;
		top: 52%;
		width: 30%;
		height: 14%;
		rotate: 8deg;
	}

	.hut {
		position: absolute;
		left: 8%;
		top: 59%;
		width: 7cqh;
		height: 5cqh;
		background: #2e3048;
		clip-path: polygon(0 30%, 50% 0, 100% 30%, 100% 100%, 0 100%);
	}

	.hut b {
		position: absolute;
		left: 34%;
		top: 46%;
		width: 30%;
		height: 26%;
		background: #ffcf7a;
		box-shadow: 0 0 6px #ffb84a;
	}

	.skater {
		position: absolute;
		right: 9%;
		top: 61%;
		width: 1.6cqh;
		height: 5cqh;
		border-radius: 40% 40% 10% 10%;
		background: #2a2a40;
		rotate: 10deg;
	}

	.flake {
		position: absolute;
		top: 4%;
		width: 4px;
		height: 4px;
		background: #fff;
		clip-path: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%);
		opacity: 0;
		animation: fall 4s linear infinite;
		animation-delay: var(--d);
	}

	.slab {
		position: absolute;
		left: 50%;
		top: 50%;
		height: 86%;
		aspect-ratio: 1;
		translate: -50% -50%;
		padding: 1.6cqh;
		box-sizing: border-box;
		border-radius: 3cqh;
		background: rgba(240, 246, 255, 0.55);
		box-shadow:
			inset 0 0 0 1px rgba(255, 255, 255, 0.9),
			0 0 0 1px rgba(160, 180, 220, 0.4),
			0 12px 28px rgba(16, 24, 56, 0.45);
	}

	canvas {
		display: block;
		width: 100%;
		height: 100%;
		border-radius: 1.4cqh;
	}

	@keyframes glow {
		50% {
			opacity: 0.6;
			translate: 4% 0;
		}
	}

	@keyframes fall {
		0% {
			transform: translateY(0);
			opacity: 0;
		}
		20% {
			opacity: 0.9;
		}
		100% {
			transform: translateY(40cqh) rotate(160deg);
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.aurora,
		.flake {
			animation: none;
		}

		.flake {
			opacity: 0.6;
		}
	}
</style>
