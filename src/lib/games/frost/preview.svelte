<script lang="ts">
	import FrostIcon from './components/FrostIcon.svelte';
	import { CRACK_HUE } from './types';

	// '#' frost, 'm' frost over thin ice, 'f' a flag on thin ice, '.' opened ice.
	const MAP = ['#mf#m###', '#....m##', '#.....f#', 'f.......', '......f.', '........', '....f#m#', '....####'];
	const thin = (r: number, c: number) => 'mf'.includes(MAP[r]?.[c] ?? '');
	const cells = MAP.flatMap((row, r) =>
		row.split('').map((ch, c) => {
			let n = 0;
			for (let dr = -1; dr <= 1; dr += 1) for (let dc = -1; dc <= 1; dc += 1) if ((dr || dc) && thin(r + dr, c + dc)) n += 1;
			return { key: `${r}-${c}`, ch: ch === 'm' ? '#' : ch, n };
		})
	);
	const dust = Array.from({ length: 9 }, (_, i) => ({ i, x: 8 + ((i * 41) % 84), d: (i * 0.6) % 4 }));
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@300;600;700&family=Manrope:wght@600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="shot" aria-hidden="true">
	<div class="sun"></div>
	<div class="pines"></div>
	{#each dust as d (d.i)}
		<i class="flake" style:left="{d.x}%" style:--d="{d.d}s"></i>
	{/each}
	<div class="hud">
		<div class="brand">
			<FrostIcon size="chip" />
			<div>
				<p>Frostline</p>
				<small>Open lake</small>
			</div>
		</div>
		<div class="call"><b>Read the cracks</b></div>
		<div class="time">1:07.4</div>
	</div>
	<div class="slab">
		<div class="grid">
			{#each cells as cell (cell.key)}
				{#if cell.ch === '#' || cell.ch === 'f'}
					<span class="frost">{#if cell.ch === 'f'}<i class="flag"></i>{/if}</span>
				{:else}
					<span class="clear" style:--c={CRACK_HUE[cell.n] || 'transparent'}>{cell.n || ''}</span>
				{/if}
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
		background: linear-gradient(180deg, #2a3566 0%, #a86d90 34%, #ffc49a 48%, #d6e6f3 48.5%, #9fbcd6 100%);
		font-family: Manrope, ui-sans-serif, system-ui, sans-serif;
		color: #1d2b47;
	}

	.sun {
		position: absolute;
		left: 18%;
		top: 40%;
		width: 22cqh;
		height: 22cqh;
		translate: -50% -50%;
		border-radius: 50%;
		background: radial-gradient(circle, #fff4d8 0 18%, #ffc98a 32%, rgba(255, 150, 110, 0) 70%);
	}

	.pines {
		position: absolute;
		left: 0;
		right: 0;
		top: 41%;
		height: 8%;
		background: #2a2a4a;
		clip-path: polygon(0 100%, 0 60%, 3% 20%, 6% 70%, 9% 10%, 12% 60%, 16% 30%, 20% 75%, 25% 40%, 30% 80%, 36% 25%, 41% 70%, 47% 45%, 53% 80%, 58% 15%, 63% 65%, 69% 35%, 74% 75%, 80% 20%, 85% 70%, 90% 40%, 95% 75%, 100% 30%, 100% 100%);
		opacity: 0.85;
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
	.time {
		border: 1px solid rgba(255, 255, 255, 0.8);
		background: rgba(246, 251, 255, 0.86);
		border-radius: 9px;
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
	}

	.brand p {
		margin: 0;
		font-family: 'Josefin Sans', ui-sans-serif, system-ui, sans-serif;
		font-weight: 700;
		font-size: 0.6rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		line-height: 1;
		white-space: nowrap;
	}

	.brand small {
		display: block;
		font-size: 0.4rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #2f7fb0;
	}

	.call {
		display: grid;
		place-items: center;
	}

	.call b {
		font-family: 'Josefin Sans', ui-sans-serif, system-ui, sans-serif;
		font-weight: 600;
		font-size: clamp(0.5rem, 3.2cqw, 0.76rem);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}

	.time {
		display: flex;
		align-items: center;
		font-family: 'Josefin Sans', ui-sans-serif, system-ui, sans-serif;
		font-weight: 700;
		font-size: 0.62rem;
	}

	.slab {
		position: absolute;
		left: 50%;
		top: 24%;
		height: 70%;
		aspect-ratio: 1;
		translate: -50% 0;
		padding: 1.4%;
		box-sizing: border-box;
		border-radius: 8px;
		background: #0e2234;
		box-shadow:
			0 0 0 2px rgba(255, 255, 255, 0.85),
			0 12px 28px rgba(16, 24, 56, 0.45);
	}

	.grid {
		height: 100%;
		display: grid;
		grid-template-columns: repeat(8, 1fr);
		grid-template-rows: repeat(8, 1fr);
		gap: 2.5%;
	}

	.grid span {
		position: relative;
		display: grid;
		place-items: center;
		border-radius: 16%;
		font-family: 'Josefin Sans', ui-sans-serif, system-ui, sans-serif;
		font-weight: 700;
		font-size: clamp(0.4rem, 4.4cqh, 0.9rem);
	}

	.frost {
		background: linear-gradient(135deg, #f6fbff, #c3d9ea);
	}

	.clear {
		background: linear-gradient(170deg, #2b5875, #163348);
		color: var(--c);
		text-shadow: 0 0 5px var(--c);
	}

	.flag {
		position: absolute;
		left: 46%;
		top: 18%;
		width: 7%;
		min-width: 1px;
		height: 62%;
		background: #3b2a1d;
	}

	.flag::after {
		content: '';
		position: absolute;
		left: 100%;
		top: 0;
		width: 350%;
		height: 38%;
		background: #ff6a3d;
		clip-path: polygon(0 0, 100% 50%, 0 100%);
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

	@container (max-width: 220px) {
		.brand small,
		.time {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.flake {
			animation: none;
			opacity: 0.6;
		}
	}
</style>
