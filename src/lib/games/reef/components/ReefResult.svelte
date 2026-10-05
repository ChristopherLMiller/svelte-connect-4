<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { formatTime, reefBest } from '../settings.svelte';
	import { zoneOf } from '../types';
	import type { ReefSession } from '../session.svelte';

	let { session }: { session: ReefSession } = $props();

	const ended = $derived(
		session.screen === 'play' && (session.status.type === 'over' || session.status.type === 'done')
	);
	const done = $derived(session.status.type === 'done');
	const shine = $derived(done || session.high || session.newBest);

	const motes = Array.from({ length: 28 }, (_, i) => ({
		i,
		x: ((((i * 47) % 100) / 100 - 0.5) * 360).toFixed(1),
		rise: (180 + ((i * 29) % 140)).toFixed(1),
		hue: (['#3fe9ff', '#ffd34d', '#ff4fd8', '#4dff8f', '#ff5a64', '#5f7dff', '#ff9a3d'] as const)[i % 7]
	}));

	const copy = $derived.by(() => {
		if (done) {
			const time = formatTime(session.time);
			return {
				kicker: session.newBest ? 'A new fastest forty' : `Best ${formatTime(reefBest.sprint / 1000)}`,
				title: time,
				body: `Forty lines in ${time}, using ${session.pieces} pieces. The bloom rises all the way to the surface.`
			};
		}
		if (session.mode === 'sprint') {
			return {
				kicker: `${session.lines} of 40 lines`,
				title: 'The reef closed over',
				body: 'The stack reached the rim before the fortieth line. The water is patient; try again.'
			};
		}
		return {
			kicker: session.high ? 'A new high at depth' : `${session.depth.toLocaleString()} m · ${zoneOf(session.depth)}`,
			title: `${session.score.toLocaleString()} points`,
			body: `${session.lines} lines, level ${session.level}. The coral has grown over the well and its light settles into the dark.`
		};
	});
</script>

{#if ended}
	<div class="overlay" class:shine transition:fade={{ duration: 280, delay: 120 }}>
		<div class="glow"></div>
		{#if shine}
			<div class="bloom" aria-hidden="true">
				{#each motes as mote (mote.i)}
					<i style:--i={mote.i} style:--x="{mote.x}px" style:--rise="{mote.rise}px" style:--c={mote.hue}></i>
				{/each}
			</div>
		{/if}
		<div class="panel" transition:scale={{ start: 0.92, duration: 320, delay: 160 }}>
			<p>{copy.kicker}</p>
			<h2>{copy.title}</h2>
			<span>{copy.body}</span>
			<div class="actions">
				<button type="button" class="primary" onclick={() => session.restart()}>Dive again</button>
				<button type="button" onclick={() => session.backToMenu()}>Surface</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: absolute;
		inset: 0;
		z-index: 9;
		display: grid;
		place-items: center;
		padding: 16px;
		pointer-events: none;
		overflow: hidden;
	}

	.glow,
	.bloom {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.glow {
		background: radial-gradient(circle at 50% 46%, rgba(0, 4, 12, 0.66), rgba(0, 4, 12, 0.24) 60%, transparent);
	}

	.shine .glow {
		background:
			radial-gradient(circle at 50% 42%, rgba(63, 233, 255, 0.16), transparent 46%),
			radial-gradient(circle at 50% 46%, rgba(0, 4, 12, 0.55), transparent 70%);
	}

	.bloom i {
		position: absolute;
		left: 50%;
		top: 62%;
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--c);
		box-shadow: 0 0 12px var(--c);
		opacity: 0;
		animation: rise 3s ease-out forwards;
		animation-delay: calc(var(--i) * 0.05s);
	}

	.panel {
		position: relative;
		z-index: 1;
		width: min(460px, 100%);
		padding: 24px 24px 20px;
		border-radius: 24px;
		pointer-events: auto;
		text-align: center;
		color: #d8f4ff;
		background: linear-gradient(180deg, rgba(8, 28, 48, 0.96), rgba(2, 8, 20, 0.96));
		border: 1px solid rgba(63, 233, 255, 0.28);
		box-shadow:
			0 18px 50px rgba(0, 0, 0, 0.55),
			0 0 40px rgba(63, 233, 255, 0.1),
			inset 0 1px 0 rgba(160, 240, 255, 0.14);
	}

	.panel p {
		margin: 0;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		font-size: 0.68rem;
		color: #3fe9ff;
	}

	.panel h2 {
		margin: 8px 0 6px;
		font-family: Syne, ui-sans-serif, system-ui, sans-serif;
		font-weight: 800;
		font-size: clamp(1.8rem, 5vw, 2.5rem);
		font-variant-numeric: tabular-nums;
	}

	.panel span {
		display: block;
		color: #8fb4c8;
		line-height: 1.45;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 10px;
		margin-top: 18px;
	}

	.actions button {
		appearance: none;
		border: 1px solid rgba(63, 233, 255, 0.24);
		background: rgba(255, 255, 255, 0.04);
		color: inherit;
		font: inherit;
		cursor: pointer;
		padding: 10px 18px;
		border-radius: 999px;
		letter-spacing: 0.04em;
	}

	.actions .primary {
		background: linear-gradient(180deg, #7ff3ff, #2a8fd8);
		border-color: transparent;
		color: #021020;
		font-weight: 700;
	}

	@keyframes rise {
		0% {
			opacity: 0;
			translate: 0 0;
			scale: 0.4;
		}
		20% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			translate: var(--x) calc(var(--rise) * -1);
			scale: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.bloom i {
			animation: none;
			opacity: 0;
		}
	}
</style>
