<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { pinballBest } from '../settings.svelte';
	import type { PinballSession } from '../session.svelte';

	let { session }: { session: PinballSession } = $props();

	const ended = $derived(session.screen === 'play' && session.status.type === 'over');
	const shine = $derived(session.newBest);

	const confetti = Array.from({ length: 34 }, (_, i) => ({
		i,
		x: ((((i * 53) % 100) / 100 - 0.5) * 420).toFixed(1),
		fall: (180 + ((i * 37) % 180)).toFixed(1),
		hue: i % 5
	}));

	const copy = $derived.by(() => {
		const best = pinballBest[session.table][session.difficulty];
		const meta = session.spec.meta;
		return {
			kicker: session.newBest ? `A new high score on ${meta.name}` : `High score ${best.score.toLocaleString()}`,
			title: session.score.toLocaleString(),
			body: session.feat ? `${session.spec.feat.label}: ${session.feat}. ${meta.words.over}.` : `${meta.words.over}.`
		};
	});
</script>

{#if ended}
	<div class="overlay" class:shine transition:fade={{ duration: 280, delay: 200 }}>
		<div class="glow"></div>
		{#if shine}
			<div class="fall" aria-hidden="true">
				{#each confetti as bit (bit.i)}
					<i class="c{bit.hue}" style:--i={bit.i} style:--x="{bit.x}px" style:--fall="{bit.fall}px"></i>
				{/each}
			</div>
		{/if}
		<div class="panel" transition:scale={{ start: 0.92, duration: 320, delay: 240 }}>
			<p>{copy.kicker}</p>
			<h2>Game over</h2>
			<strong>{copy.title}</strong>
			<span>{copy.body}</span>
			<div class="actions">
				<button type="button" class="primary" onclick={() => session.restart()}>Play again</button>
				<button type="button" onclick={() => session.backToMenu()}>Tables</button>
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
		background: radial-gradient(circle at 50% 46%, rgba(4, 2, 8, 0.7), rgba(4, 2, 8, 0.3) 60%, transparent);
	}

	.shine .glow {
		background:
			radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--sb-accent) 22%, transparent), transparent 46%),
			radial-gradient(circle at 50% 46%, rgba(4, 2, 8, 0.6), transparent 70%);
	}

	.fall i {
		position: absolute;
		left: 50%;
		top: 20%;
		width: 8px;
		height: 12px;
		border-radius: 2px;
		opacity: 0;
		animation: drift 3.2s ease-out forwards;
		animation-delay: calc(var(--i) * 0.04s);
	}

	.c0 {
		background: var(--sb-accent);
	}
	.c1 {
		background: var(--sb-hot);
	}
	.c2 {
		background: var(--sb-ink);
	}
	.c3 {
		background: color-mix(in srgb, var(--sb-accent) 50%, var(--sb-hot));
	}
	.c4 {
		background: #ffffff;
	}

	.panel {
		position: relative;
		z-index: 1;
		width: min(440px, 100%);
		padding: 22px 24px 20px;
		border-radius: 22px;
		pointer-events: auto;
		text-align: center;
		color: var(--sb-ink);
		background: linear-gradient(180deg, color-mix(in srgb, var(--sb-bg) 85%, #ffffff 8%), var(--sb-bg));
		border: 1px solid color-mix(in srgb, var(--sb-accent) 35%, transparent);
		box-shadow: 0 18px 50px rgba(0, 0, 0, 0.6);
	}

	.panel p {
		margin: 0;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		font-size: 0.74rem;
		font-weight: 700;
		color: var(--sb-accent);
	}

	.panel h2 {
		margin: 6px 0 0;
		font-family: var(--sb-display);
		font-weight: 400;
		letter-spacing: 0.05em;
		font-size: clamp(2rem, 6vw, 2.8rem);
		color: var(--sb-hot);
	}

	.panel strong {
		display: block;
		font-size: clamp(2rem, 7vw, 2.8rem);
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.panel span {
		display: block;
		margin-top: 4px;
		color: var(--sb-muted);
		line-height: 1.4;
		font-size: 1.02rem;
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
		border: 1px solid color-mix(in srgb, var(--sb-accent) 32%, transparent);
		background: rgba(255, 255, 255, 0.05);
		color: inherit;
		font: inherit;
		font-weight: 700;
		letter-spacing: 0.06em;
		cursor: pointer;
		padding: 10px 20px;
		border-radius: 999px;
	}

	.actions .primary {
		background: linear-gradient(180deg, color-mix(in srgb, var(--sb-hot) 80%, #fff), color-mix(in srgb, var(--sb-hot) 60%, #000));
		border-color: transparent;
		color: #fff;
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
			rotate: 340deg;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.fall i {
			animation: none;
			opacity: 0;
		}
	}
</style>
