<script lang="ts">
	import type { Cell } from './types';

	const uid = $props.id();

	const SNAPSHOT: Cell[][] = [
		[0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0],
		[0, 0, 1, 0, 0, 0, 0],
		[0, 2, 1, 2, 0, 0, 0],
		[0, 2, 1, 1, 2, 0, 0],
		[1, 2, 2, 1, 1, 2, 1]
	];

	const stars = [
		[12, 18, 1.4],
		[28, 8, 1],
		[46, 22, 1.2],
		[63, 11, 0.9],
		[78, 26, 1.3],
		[88, 9, 1],
		[18, 42, 0.8],
		[92, 48, 1.1],
		[8, 62, 0.9],
		[71, 16, 1.5]
	] as const;
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="shot" aria-hidden="true">
	<div class="void"></div>
	{#each stars as [x, y, s], i (`s${i}`)}
		<i class="star" style:left="{x}%" style:top="{y}%" style:--s={s}></i>
	{/each}
	<div class="planet a"></div>
	<div class="planet b"></div>
	<div class="hud">
		<div class="brand">
			<span>CONNECT</span>
			<strong>4</strong>
		</div>
		<div class="turn">
			<i class="pip"></i>
			<b>Crimson to drop</b>
		</div>
		<div class="score">
			<em class="p1">2</em>
			<span>VS</span>
			<em class="p2">1</em>
		</div>
	</div>
	<div class="well">
		<div class="board">
			<svg class="hull" viewBox="0 0 140 120" preserveAspectRatio="none">
				<defs>
					<linearGradient id="{uid}-hull" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stop-color="#2a3348" />
						<stop offset="28%" stop-color="#121826" />
						<stop offset="100%" stop-color="#070910" />
					</linearGradient>
					<pattern id="{uid}-grid" width="10" height="10" patternUnits="userSpaceOnUse">
						<path d="M10 0H0V10" fill="none" stroke="rgba(92,225,230,0.12)" stroke-width="0.6" />
					</pattern>
				</defs>
				<rect width="140" height="120" rx="10" fill="url(#{uid}-hull)" />
				<rect width="140" height="120" rx="10" fill="url(#{uid}-grid)" />
			</svg>
			<div class="holes">
				{#each SNAPSHOT as row, r (r)}
					{#each row as cell, c (`${r}-${c}`)}
						<span class="hole" class:p1={cell === 1} class:p2={cell === 2}></span>
					{/each}
				{/each}
			</div>
		</div>
	</div>
</div>

<style>
	.shot {
		position: relative;
		isolation: isolate;
		height: 100%;
		min-height: 0;
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		gap: 4%;
		padding: 5% 5% 6%;
		overflow: hidden;
		font-family: Orbitron, sans-serif;
		color: #f4f1ff;
		container-type: size;
		background: #07060d;
	}

	.void {
		position: absolute;
		inset: 0;
		z-index: 0;
		background:
			radial-gradient(circle at 16% 18%, rgba(139, 124, 255, 0.32), transparent 34%),
			radial-gradient(circle at 88% 10%, rgba(255, 51, 92, 0.18), transparent 30%),
			radial-gradient(circle at 70% 80%, rgba(92, 225, 230, 0.1), transparent 36%),
			linear-gradient(180deg, #12081c 0%, #07060d 58%, #0c0714 100%);
	}

	.star,
	.planet {
		position: absolute;
		z-index: 0;
		pointer-events: none;
		border-radius: 50%;
	}

	.star {
		width: calc(1.1px * var(--s));
		height: calc(1.1px * var(--s));
		background: #fff;
		box-shadow: 0 0 4px rgba(255, 255, 255, 0.8);
		opacity: 0.7;
	}

	.planet.a {
		width: 18%;
		aspect-ratio: 1;
		left: 6%;
		bottom: 18%;
		background:
			radial-gradient(circle at 32% 30%, #8b7cff, #3a2a78 62%, #12081c);
		box-shadow: 0 0 18px rgba(139, 124, 255, 0.35);
		opacity: 0.7;
	}

	.planet.b {
		width: 9%;
		aspect-ratio: 1;
		right: 8%;
		top: 22%;
		background: radial-gradient(circle at 40% 32%, #ffe38a, #c88814 70%);
		box-shadow: 0 0 12px rgba(245, 194, 75, 0.35);
		opacity: 0.55;
	}

	.hud,
	.well {
		position: relative;
		z-index: 1;
	}

	.hud {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		gap: 5px;
		align-items: stretch;
		height: 18%;
		min-height: 28px;
	}

	.brand,
	.turn,
	.score {
		border: 1px solid rgba(255, 255, 255, 0.12);
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.06), transparent 40%),
			rgba(10, 8, 20, 0.72);
		border-radius: 8px;
	}

	.brand {
		display: grid;
		align-content: center;
		padding: 3px 8px 3px 10px;
		line-height: 0.82;
		position: relative;
	}

	.brand::after {
		content: '';
		position: absolute;
		inset: 0 auto 0 0;
		width: 2px;
		background: linear-gradient(180deg, #5ce1e6, #f5c24b, #ff335c);
	}

	.brand span {
		letter-spacing: 0.16em;
		font-size: 0.38rem;
		color: #5ce1e6;
	}

	.brand strong {
		font-size: 0.95rem;
		background: linear-gradient(180deg, #fff1b0, #ff335c);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}

	.turn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 0 8px;
		border-color: rgba(255, 51, 92, 0.4);
		min-width: 0;
	}

	.pip {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		flex-shrink: 0;
		background:
			radial-gradient(circle at 32% 28%, #fff, #ff335c 42%, #6a1024);
		box-shadow: 0 0 8px rgba(255, 51, 92, 0.55);
	}

	.turn b {
		font-size: 0.52rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.score {
		display: flex;
		align-items: center;
		gap: 5px;
		padding: 0 8px;
		font-size: 0.78rem;
	}

	.score em {
		font-style: normal;
	}

	.score .p1 {
		color: #ff6b88;
	}

	.score .p2 {
		color: #ffe38a;
	}

	.score span {
		font-size: 0.32rem;
		letter-spacing: 0.12em;
		color: #5ce1e6;
		border: 1px solid rgba(92, 225, 230, 0.35);
		border-radius: 999px;
		padding: 2px 4px;
	}

	.well {
		display: grid;
		place-items: center;
		min-height: 0;
	}

	.board {
		position: relative;
		aspect-ratio: 7 / 6;
		width: min(100%, calc(100cqh * 7 / 6));
		height: auto;
		max-height: 100%;
	}

	.hull {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		overflow: visible;
		filter: drop-shadow(0 10px 16px rgba(0, 0, 0, 0.45));
	}

	.holes {
		position: absolute;
		inset: 8% 6% 9%;
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		grid-template-rows: repeat(6, minmax(0, 1fr));
		gap: 7%;
	}

	.hole {
		display: block;
		min-width: 0;
		min-height: 0;
		border-radius: 50%;
		background: radial-gradient(circle at 50% 40%, #14101c, #05040a 72%);
		box-shadow:
			inset 0 0 0 1px rgba(92, 225, 230, 0.42),
			0 0 0 2px rgba(8, 10, 18, 0.9);
	}

	.hole.p1,
	.hole.p2 {
		box-shadow:
			inset 0 0 0 1px rgba(255, 255, 255, 0.22),
			0 3px 6px rgba(0, 0, 0, 0.4);
	}

	.hole.p1 {
		background:
			radial-gradient(circle at 32% 28%, rgba(255, 255, 255, 0.9), transparent 28%),
			radial-gradient(circle at 50% 46%, #ff335c, #5a0820 70%);
	}

	.hole.p2 {
		background:
			radial-gradient(circle at 32% 28%, rgba(255, 255, 255, 0.9), transparent 28%),
			radial-gradient(circle at 50% 46%, #ffe38a, #8a5a08 70%);
	}

	@container (max-width: 220px) {
		.turn b,
		.score span {
			display: none;
		}
	}
</style>
