<script lang="ts">
	import TttMark from './components/TttMark.svelte';
	import TttIcon from './components/TttIcon.svelte';
	import { scratchGrid } from './scratch';
	import type { Cell } from './types';

	const SNAPSHOT: Cell[][] = [
		[1, 0, 2],
		[0, 1, 2],
		[1, 0, 0]
	];

	const LINES = scratchGrid(814229);
	const SEEDS = [41, 0, 88, 0, 17, 203, 64, 0, 0];
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,600&family=Nunito:wght@400;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="shot" aria-hidden="true">
	<div class="sand"></div>
	<div class="hud">
		<div class="brand">
			<TttIcon size="chip" />
			<div>
				<p>Tide & Cross</p>
				<small>in the wet sand</small>
			</div>
		</div>
		<div class="call"><b>You to scratch</b></div>
		<div class="score">You <em>1</em> vs Tide <em>0</em></div>
	</div>
	<div class="grid">
		<svg class="grooves" viewBox="0 0 300 300">
			<g class="ridge">
				{#each LINES as d (`r-${d.slice(0, 22)}`)}
					<path {d} />
				{/each}
			</g>
			<g class="trough">
				{#each LINES as d (`t-${d.slice(0, 22)}`)}
					<path {d} />
				{/each}
			</g>
			<g class="wet">
				{#each LINES as d (`w-${d.slice(0, 22)}`)}
					<path {d} />
				{/each}
			</g>
		</svg>
		{#each SNAPSHOT as row, r (r)}
			{#each row as cell, c (`${r}-${c}`)}
				<span class="cell">
					{#if cell !== 0}
						<TttMark player={cell === 2 ? 2 : 1} seed={SEEDS[r * 3 + c]} />
					{/if}
				</span>
			{/each}
		{/each}
	</div>
	<div class="sea">
		<div class="swell"></div>
		<div class="foam"></div>
	</div>
</div>

<style>
	.shot {
		position: relative;
		height: 100%;
		overflow: hidden;
		container-type: size;
		background:
			radial-gradient(900px 420px at 50% -10%, rgba(255, 244, 220, 0.45), transparent 58%),
			linear-gradient(180deg, #e3c79a 0%, #c19a72 55%, #a97b58 100%);
	}

	.sand {
		position: absolute;
		inset: 0;
		opacity: 0.28;
		mix-blend-mode: multiply;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E");
	}

	.hud {
		position: relative;
		z-index: 1;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		gap: 6px;
		padding: 5% 5% 0;
	}

	.brand,
	.call,
	.score {
		border: 1px solid rgba(90, 64, 42, 0.16);
		background: rgba(255, 248, 236, 0.55);
		backdrop-filter: blur(8px);
		border-radius: 10px;
		padding: 6px 8px;
		color: #3b2a1c;
		font-family: Nunito, ui-sans-serif, system-ui, sans-serif;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 5px 8px 5px 5px;
	}

	.brand :global(.icon) {
		width: 22px;
		height: 22px;
	}

	.brand p {
		margin: 0;
		font-family: Fraunces, Georgia, serif;
		font-style: italic;
		font-size: 0.7rem;
		line-height: 1;
	}

	.brand small,
	.score {
		letter-spacing: 0.08em;
		text-transform: uppercase;
		font-size: 0.42rem;
	}

	.call {
		display: grid;
		place-items: center;
	}

	.call b {
		font-family: Fraunces, Georgia, serif;
		font-style: italic;
		font-size: clamp(0.55rem, 1.8vw, 0.85rem);
		white-space: nowrap;
	}

	.score em {
		font-style: normal;
		font-weight: 700;
	}

	.grid {
		position: absolute;
		left: 50%;
		top: 22%;
		height: 46%;
		width: auto;
		aspect-ratio: 1;
		transform: translateX(-50%);
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		grid-template-rows: repeat(3, 1fr);
	}

	.grooves {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		overflow: visible;
		pointer-events: none;
	}

	.grooves path {
		fill: none;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.ridge {
		transform: translate(0.6px, -0.8px);
	}

	.ridge path {
		stroke: #e8d4b4;
		stroke-width: 8.2;
		opacity: 0.42;
	}

	.trough path {
		stroke: #7a4f36;
		stroke-width: 5.2;
		opacity: 0.86;
	}

	.wet path {
		stroke: #5c3a28;
		stroke-width: 2;
		opacity: 0.45;
	}

	.cell {
		display: grid;
		place-items: center;
	}

	.sea {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 32%;
		overflow: hidden;
		background: linear-gradient(180deg, transparent 0%, rgba(90, 180, 196, 0.28) 22%, #1d6d86 58%, #0e3f52 100%);
		-webkit-mask-image: linear-gradient(180deg, transparent 0%, #000 28%, #000 100%);
		mask-image: linear-gradient(180deg, transparent 0%, #000 28%, #000 100%);
	}

	.swell {
		position: absolute;
		left: -14%;
		right: -14%;
		top: -8%;
		height: 62%;
		border-radius: 50%;
		background: linear-gradient(180deg, rgba(214, 246, 250, 0.35), #2b8aa3);
		filter: blur(2px);
	}

	.foam {
		position: absolute;
		left: 0;
		right: 0;
		top: 10%;
		height: 18px;
		background:
			radial-gradient(12px 8px at 18% 50%, rgba(255, 255, 255, 0.45), transparent 70%),
			radial-gradient(16px 8px at 52% 40%, rgba(255, 255, 255, 0.35), transparent 70%),
			radial-gradient(12px 8px at 82% 60%, rgba(255, 255, 255, 0.4), transparent 70%);
		filter: blur(1px);
		opacity: 0.65;
	}

	@container (max-width: 420px) {
		.brand small {
			display: none;
		}

		.score {
			letter-spacing: 0.04em;
		}
	}
</style>
