<script lang="ts">
	import ReefIcon from './components/ReefIcon.svelte';

	const HUE: Record<string, string> = {
		i: '#3fe9ff',
		o: '#ffd34d',
		t: '#ff4fd8',
		s: '#4dff8f',
		z: '#ff5a64',
		j: '#5f7dff',
		l: '#ff9a3d'
	};
	const MAP = [
		'..........',
		'..........',
		'..........',
		'....ttt...',
		'.....t....',
		'..........',
		'..........',
		'..........',
		'.....ggg..',
		'......g...',
		'l.........',
		'l.oo.....j',
		'llooss..jj',
		'zzjss.iiii',
		'jzzjjjllol',
		'izztlllool'
	];
	const cells = MAP.flatMap((row, r) =>
		row.split('').map((ch, c) => ({ key: `${r}-${c}`, color: HUE[ch] ?? '', ghost: ch === 'g' }))
	);
	const motes = Array.from({ length: 10 }, (_, i) => ({
		i,
		x: 10 + ((i * 37) % 80),
		d: (i * 0.41) % 3,
		c: Object.values(HUE)[i % 7]!
	}));
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Outfit:wght@400;600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="shot" aria-hidden="true">
	<div class="hud">
		<div class="brand">
			<ReefIcon size="chip" />
			<div>
				<p>Lumen Reef</p>
				<small>2,250 m</small>
			</div>
		</div>
		<div class="call"><b>Back-to-back Lumen</b></div>
		<div class="score">18,420</div>
	</div>
	<div class="tank">
		<div class="well">
			{#each motes as mote (mote.i)}
				<i class="mote" style:left="{mote.x}%" style:--d="{mote.d}s" style:--c={mote.c}></i>
			{/each}
			<div class="grid">
				{#each cells as cell (cell.key)}
					<span class:cell={cell.color && !cell.ghost} class:ghost={cell.ghost} style:--c={cell.color || '#ff4fd8'}></span>
				{/each}
			</div>
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
			radial-gradient(50% 40% at 50% 10%, rgba(40, 140, 200, 0.18), transparent 70%),
			radial-gradient(40% 30% at 20% 100%, rgba(255, 79, 216, 0.08), transparent 70%),
			linear-gradient(180deg, #04142a 0%, #020a18 60%, #01050c 100%);
		font-family: Outfit, ui-sans-serif, system-ui, sans-serif;
		color: #d8f4ff;
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
		border: 1px solid rgba(63, 233, 255, 0.24);
		background: rgba(3, 12, 24, 0.86);
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
		font-family: Syne, ui-sans-serif, system-ui, sans-serif;
		font-weight: 800;
		font-size: 0.62rem;
		line-height: 1;
		white-space: nowrap;
	}

	.brand small {
		display: block;
		font-size: 0.4rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #3fe9ff;
	}

	.call {
		display: grid;
		place-items: center;
	}

	.call b {
		font-family: Syne, ui-sans-serif, system-ui, sans-serif;
		font-weight: 700;
		font-size: clamp(0.48rem, 3.2cqw, 0.74rem);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
		background: linear-gradient(90deg, #3fe9ff, #ff4fd8);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}

	.score {
		display: flex;
		align-items: center;
		font-family: Syne, ui-sans-serif, system-ui, sans-serif;
		font-weight: 700;
		font-size: 0.6rem;
		color: #bff6ff;
	}

	.tank {
		position: absolute;
		left: 50%;
		top: 22%;
		height: 75%;
		aspect-ratio: 10 / 16;
		translate: -50% 0;
		padding: 1.6%;
		box-sizing: border-box;
		border-radius: 8px;
		background: linear-gradient(180deg, #13202c, #070c12);
		box-shadow:
			0 0 24px rgba(63, 233, 255, 0.1),
			0 12px 28px rgba(0, 0, 0, 0.6);
	}

	.well {
		position: relative;
		height: 100%;
		border-radius: 4px;
		overflow: hidden;
		background: linear-gradient(180deg, rgba(2, 14, 28, 0.9), rgba(1, 6, 14, 0.95));
	}

	.grid {
		position: absolute;
		inset: 0;
		display: grid;
		grid-template-columns: repeat(10, 1fr);
		grid-template-rows: repeat(16, 1fr);
	}

	.grid span {
		margin: 6%;
		border-radius: 26%;
	}

	.cell {
		background: radial-gradient(circle at 40% 36%, #fff, var(--c) 45%, color-mix(in srgb, var(--c) 35%, #000));
		box-shadow: 0 0 6px color-mix(in srgb, var(--c) 60%, transparent);
	}

	.ghost {
		border: 1px dashed color-mix(in srgb, var(--c) 60%, transparent);
	}

	.mote {
		position: absolute;
		bottom: 10%;
		width: 3px;
		height: 3px;
		border-radius: 50%;
		background: var(--c);
		box-shadow: 0 0 5px var(--c);
		opacity: 0;
		animation: rise 3s ease-out infinite;
		animation-delay: var(--d);
	}

	@keyframes rise {
		0% {
			transform: translateY(0);
			opacity: 0;
		}
		20% {
			opacity: 1;
		}
		100% {
			transform: translateY(-40cqh);
			opacity: 0;
		}
	}

	@container (max-width: 220px) {
		.brand small,
		.score {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.mote {
			animation: none;
			opacity: 0.5;
		}
	}
</style>
