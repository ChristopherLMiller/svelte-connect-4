<script lang="ts">
	import EclIcon from './components/EclIcon.svelte';

	const POSITION = [
		'........',
		'..s.....',
		'..sms...',
		'.mmmsm..',
		'..msss..',
		'...ms.m.',
		'....m...',
		'........'
	].join('');

	const cells = Array.from(POSITION, (ch, i) => ({ i, side: ch === 'm' ? 1 : ch === 's' ? 2 : 0 }));
	const stars = Array.from({ length: 28 }, (_, i) => ({
		i,
		x: (i * 37) % 100,
		y: (i * 53) % 60,
		s: 1 + (i % 3) * 0.6
	}));
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,700&family=Jost:wght@400;600&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="shot" aria-hidden="true">
	<div class="stars">
		{#each stars as star (star.i)}
			<i style:left="{star.x}%" style:top="{star.y}%" style:--s="{star.s}px" style:--d="{(star.i % 5) * 0.7}s"></i>
		{/each}
	</div>
	<div class="rings">
		<span class="r1"><b></b></span>
		<span class="r2"><b></b></span>
		<span class="r3"><b></b></span>
	</div>
	<div class="lamp"></div>
	<div class="hud">
		<div class="brand">
			<EclIcon size="chip" />
			<div>
				<p>Eclipse</p>
				<small>orrery reversi</small>
			</div>
		</div>
		<div class="call"><b>Moon to move</b></div>
		<div class="score"><span class="m"></span>13 · 9<span class="s"></span></div>
	</div>
	<div class="frame">
		<div class="grid">
			{#each cells as cell (cell.i)}
				<span class="cell">
					{#if cell.side === 1}
						<i class="moon"></i>
					{:else if cell.side === 2}
						<i class="sun"></i>
					{/if}
				</span>
			{/each}
		</div>
	</div>
</div>

<style>
	.shot {
		position: relative;
		height: 100%;
		overflow: hidden;
		container-type: size;
		background:
			radial-gradient(60% 50% at 50% 46%, rgba(232, 184, 90, 0.16), transparent 70%),
			linear-gradient(180deg, #0b0e26 0%, #1c1638 55%, #3a2340 100%);
		font-family: Jost, ui-sans-serif, system-ui, sans-serif;
		color: #f1e6cf;
	}

	.stars,
	.rings,
	.lamp {
		position: absolute;
		pointer-events: none;
	}

	.stars {
		inset: 0;
	}

	.stars i {
		position: absolute;
		width: var(--s);
		height: var(--s);
		border-radius: 50%;
		background: #f4ecd8;
		animation: twinkle 3.2s ease-in-out infinite;
		animation-delay: var(--d);
	}

	.rings {
		left: 50%;
		top: 56%;
		width: 0;
		height: 0;
	}

	.rings span {
		position: absolute;
		left: 0;
		top: 0;
		border-radius: 50%;
		border: 1px solid rgba(232, 184, 90, 0.4);
		translate: -50% -50%;
		rotate: -14deg;
		animation: orbit 18s linear infinite;
	}

	.rings b {
		position: absolute;
		top: -4px;
		left: 50%;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 30%, #fff, #9fb8e8 60%, #3d4a78);
	}

	.r1 {
		width: 120cqw;
		height: 46cqw;
	}

	.r2 {
		width: 150cqw;
		height: 60cqw;
		animation-duration: 28s !important;
		animation-direction: reverse !important;
	}

	.r2 b {
		background: radial-gradient(circle at 35% 30%, #fff6d2, #e0a050 60%, #7a4a1c);
	}

	.r3 {
		width: 96cqw;
		height: 34cqw;
		border-style: dashed !important;
		opacity: 0.6;
	}

	.lamp {
		left: 50%;
		top: 56%;
		width: 70cqh;
		height: 70cqh;
		translate: -50% -50%;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(255, 220, 150, 0.28), transparent 62%);
	}

	.hud {
		position: relative;
		z-index: 2;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		gap: 5px;
		padding: 5% 5% 0;
	}

	.brand,
	.call,
	.score {
		border: 1px solid rgba(232, 184, 90, 0.3);
		background: rgba(20, 18, 44, 0.82);
		border-radius: 10px;
		padding: 4px 7px;
		min-width: 0;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 8px 4px 4px;
	}

	.brand :global(.icon) {
		width: 18px;
		height: 18px;
		flex-shrink: 0;
	}

	.brand p {
		margin: 0;
		font-family: 'Cormorant Garamond', Palatino, serif;
		font-style: italic;
		font-size: 0.64rem;
		line-height: 1;
		color: #f4d58a;
		white-space: nowrap;
	}

	.brand small {
		letter-spacing: 0.08em;
		text-transform: uppercase;
		font-size: 0.38rem;
		color: #9fb8e8;
		display: block;
	}

	.call {
		display: grid;
		place-items: center;
	}

	.call b {
		font-family: 'Cormorant Garamond', Palatino, serif;
		font-style: italic;
		font-size: clamp(0.5rem, 3.4cqw, 0.78rem);
		white-space: nowrap;
	}

	.score {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 0.5rem;
		font-weight: 600;
	}

	.score span {
		width: 7px;
		height: 7px;
		border-radius: 50%;
	}

	.score .m,
	.moon {
		background: radial-gradient(circle at 35% 30%, #fff, #c4cde0 50%, #66708e);
	}

	.score .s,
	.sun {
		background: radial-gradient(circle at 35% 30%, #fff6d2, #f0c060 50%, #8a5a1c);
	}

	.frame {
		position: absolute;
		left: 50%;
		top: 24%;
		height: 64%;
		aspect-ratio: 1;
		translate: -50% 0;
		padding: 4.5%;
		border-radius: 12px;
		box-sizing: border-box;
		z-index: 1;
		background: linear-gradient(160deg, #6a3e22, #3a2014 70%);
		box-shadow:
			inset 0 0 0 2px #c9a256,
			0 12px 28px rgba(0, 0, 0, 0.55),
			0 0 30px rgba(232, 184, 90, 0.18);
	}

	.grid {
		display: grid;
		width: 100%;
		height: 100%;
		grid-template-columns: repeat(8, 1fr);
		grid-template-rows: repeat(8, 1fr);
		gap: 1px;
		padding: 1px;
		box-sizing: border-box;
		border-radius: 4px;
		background: #c9a256;
	}

	.cell {
		display: grid;
		place-items: center;
		background: radial-gradient(circle at 50% 40%, #232450, #14143a);
	}

	.cell i {
		width: 74%;
		aspect-ratio: 1;
		border-radius: 50%;
		display: block;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
	}

	@keyframes twinkle {
		50% {
			opacity: 0.3;
		}
	}

	@keyframes orbit {
		to {
			rotate: 346deg;
		}
	}

	@container (max-width: 220px) {
		.brand small,
		.score {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.stars i,
		.rings span {
			animation: none;
		}
	}
</style>
