<script lang="ts">

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

	const CORNERS = new Set([0, 7, 56, 63]);
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
	<div class="frame">
		<i class="cap tl"></i>
		<i class="cap tr"></i>
		<i class="cap bl"></i>
		<i class="cap br"></i>
		<div class="grid">
			{#each [25, 75] as y (y)}
				{#each [25, 75] as x (x)}
					<b class="pin" style:left="{x}%" style:top="{y}%"></b>
				{/each}
			{/each}
			{#each cells as cell (cell.i)}
				<span class="cell" class:corner={CORNERS.has(cell.i)}>
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

	.moon {
		background:
			radial-gradient(circle at 56% 44%, #c9d0de 0 29%, transparent 30%),
			radial-gradient(circle at 45% 50%, #f6f8fc 0 35%, transparent 36%),
			radial-gradient(circle at 38% 32%, #f2f4f8, #c4cbd8 50%, #7e869c 92%);
		box-shadow:
			inset 0 0 0 1px rgba(255, 255, 255, 0.5),
			0 2px 4px rgba(0, 0, 0, 0.6) !important;
	}

	.sun {
		background:
			radial-gradient(circle, #fff1b8 0 13%, #d89a2a 15% 18%, #f6cf6a 20% 25%, transparent 27%),
			repeating-conic-gradient(rgba(150, 96, 20, 0.55) 0 5deg, transparent 5deg 22.5deg),
			radial-gradient(circle at 38% 32%, #fff2c0, #e8b84a 50%, #9a6a1e 92%);
		box-shadow:
			inset 0 0 0 1px rgba(255, 236, 170, 0.6),
			0 2px 4px rgba(0, 0, 0, 0.6) !important;
	}

	.frame {
		position: absolute;
		left: 50%;
		top: 50%;
		height: 88%;
		aspect-ratio: 1;
		translate: -50% -50%;
		padding: 6%;
		border-radius: 1.6cqh;
		box-sizing: border-box;
		z-index: 1;
		background:
			repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.16) 0 1px, transparent 1px 5px, rgba(255, 200, 150, 0.05) 5px 6px, transparent 6px 11px),
			linear-gradient(160deg, #5a3620, #2e1a0e 70%);
		box-shadow:
			inset 0 0 0 1px #c9a256,
			inset 0 0 0 1.4cqh rgba(0, 0, 0, 0.25),
			0 12px 28px rgba(0, 0, 0, 0.55),
			0 0 30px rgba(232, 184, 90, 0.18);
	}

	.grid {
		display: grid;
		width: 100%;
		height: 100%;
		grid-template-columns: repeat(8, 1fr);
		grid-template-rows: repeat(8, 1fr);
		position: relative;
		gap: 1px;
		padding: 1px;
		box-sizing: border-box;
		border-radius: 2px;
		background: #b8924a;
		box-shadow: 0 0 0 0.8cqh #d8b468;
	}

	.cap {
		position: absolute;
		width: 7%;
		aspect-ratio: 1;
		background: linear-gradient(135deg, #f4dc98, #b8862e 60%, #7a5418);
	}

	.cap.tl {
		left: 0;
		top: 0;
		clip-path: polygon(0 0, 100% 0, 0 100%);
		border-top-left-radius: 1.6cqh;
	}

	.cap.tr {
		right: 0;
		top: 0;
		clip-path: polygon(0 0, 100% 0, 100% 100%);
		border-top-right-radius: 1.6cqh;
	}

	.cap.bl {
		left: 0;
		bottom: 0;
		clip-path: polygon(0 0, 100% 100%, 0 100%);
		border-bottom-left-radius: 1.6cqh;
	}

	.cap.br {
		right: 0;
		bottom: 0;
		clip-path: polygon(100% 0, 100% 100%, 0 100%);
		border-bottom-right-radius: 1.6cqh;
	}

	.pin {
		position: absolute;
		z-index: 1;
		width: 1.6cqh;
		aspect-ratio: 1;
		translate: -50% -50%;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 30%, #fff2c0, #d8a848 60%, #8a6020);
	}

	.cell.corner {
		background: radial-gradient(circle at 50% 40%, #22305e, #172248);
	}

	.cell.corner::before {
		content: '';
		width: 46%;
		aspect-ratio: 1;
		background: rgba(201, 162, 86, 0.45);
		clip-path: polygon(50% 0, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0 50%, 40% 40%);
	}

	.cell {
		display: grid;
		place-items: center;
		background:
			radial-gradient(circle at 30% 70%, rgba(255, 255, 255, 0.3) 0 0.5px, transparent 1px),
			radial-gradient(circle at 50% 40%, #22305e, #172248);
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

	@media (prefers-reduced-motion: reduce) {
		.stars i,
		.rings span {
			animation: none;
		}
	}
</style>
