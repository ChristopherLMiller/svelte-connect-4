<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { koiBest } from '../settings.svelte';
	import { BLOOMS, KINDS } from '../types';
	import type { KoiSession } from '../session.svelte';

	let { session }: { session: KoiSession } = $props();

	const ended = $derived(session.screen === 'play' && session.status.type === 'over');
	const shine = $derived(session.newBest);

	const petals = Array.from({ length: 30 }, (_, i) => ({
		i,
		x: ((((i * 47) % 100) / 100 - 0.5) * 380).toFixed(1),
		fall: (160 + ((i * 29) % 160)).toFixed(1),
		hue: BLOOMS[KINDS[i % 6]!].base
	}));

	const copy = $derived.by(() => {
		const ripples = session.mode === 'ripples';
		const best = koiBest[session.mode];
		return {
			kicker: session.newBest ? 'A new best for the pond' : `Best ${best.score.toLocaleString()}`,
			title: `${session.score.toLocaleString()} points`,
			body: ripples
				? `Stage ${session.stage}, ${session.popped.toLocaleString()} blooms cleared. The blooms reached the lily pad, and the koi go back to circling.`
				: `Stage ${session.stage}. The moves ran out before the current carried you to ${session.target.toLocaleString()}.`
		};
	});
</script>

{#if ended}
	<div class="overlay" class:shine transition:fade={{ duration: 280, delay: 120 }}>
		<div class="glow"></div>
		{#if shine}
			<div class="fall" aria-hidden="true">
				{#each petals as petal (petal.i)}
					<i style:--i={petal.i} style:--x="{petal.x}px" style:--fall="{petal.fall}px" style:--c={petal.hue}></i>
				{/each}
			</div>
		{/if}
		<div class="panel" transition:scale={{ start: 0.92, duration: 320, delay: 160 }}>
			<p>{copy.kicker}</p>
			<h2>{copy.title}</h2>
			<span>{copy.body}</span>
			<div class="actions">
				<button type="button" class="primary" onclick={() => session.restart()}>Play again</button>
				<button type="button" onclick={() => session.backToMenu()}>Menu</button>
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
	.fall {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.glow {
		background: radial-gradient(circle at 50% 46%, rgba(4, 24, 21, 0.6), rgba(4, 24, 21, 0.2) 60%, transparent);
	}

	.shine .glow {
		background:
			radial-gradient(circle at 50% 40%, rgba(255, 201, 60, 0.2), transparent 46%),
			radial-gradient(circle at 50% 46%, rgba(4, 24, 21, 0.5), transparent 70%);
	}

	.fall i {
		position: absolute;
		left: 50%;
		top: 22%;
		width: 10px;
		height: 6px;
		border-radius: 50%;
		background: var(--c);
		opacity: 0;
		animation: drift 3.4s ease-out forwards;
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
		color: #f6f1e4;
		background: linear-gradient(180deg, rgba(22, 76, 68, 0.97), rgba(10, 42, 38, 0.97));
		border: 1px solid rgba(255, 179, 71, 0.32);
		box-shadow:
			0 18px 50px rgba(0, 30, 24, 0.5),
			inset 0 1px 0 rgba(220, 255, 235, 0.14);
	}

	.panel p {
		margin: 0;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		font-size: 0.68rem;
		font-weight: 700;
		color: #ffb347;
	}

	.panel h2 {
		margin: 8px 0 6px;
		font-family: 'Kaisei Decol', Georgia, serif;
		font-weight: 700;
		font-size: clamp(1.8rem, 5vw, 2.5rem);
		font-variant-numeric: tabular-nums;
	}

	.panel span {
		display: block;
		color: #b6d2c5;
		line-height: 1.45;
		font-weight: 500;
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
		border: 1px solid rgba(255, 179, 71, 0.3);
		background: rgba(255, 255, 255, 0.05);
		color: inherit;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
		padding: 10px 18px;
		border-radius: 999px;
	}

	.actions .primary {
		background: linear-gradient(180deg, #ffc36b, #f07a2c);
		border-color: transparent;
		color: #2a1206;
	}

	@keyframes drift {
		0% {
			opacity: 0;
			translate: 0 0;
			rotate: 0deg;
		}
		15% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			translate: var(--x) var(--fall);
			rotate: 260deg;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.fall i {
			animation: none;
			opacity: 0;
		}
	}
</style>
