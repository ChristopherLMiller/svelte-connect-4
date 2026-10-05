<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import type { ChapelSession } from '../session.svelte';

	let { session }: { session: ChapelSession } = $props();

	const ended = $derived(
		session.screen === 'play' && (session.status.type === 'over' || session.status.type === 'won')
	);
	const won = $derived(session.status.type === 'won');

	const motes = Array.from({ length: 24 }, (_, i) => ({
		i,
		x: (Math.cos((i / 24) * Math.PI * 2) * (140 + (i % 4) * 30)).toFixed(1),
		y: (Math.sin((i / 24) * Math.PI * 2) * (90 + (i % 3) * 24) - 60).toFixed(1),
		hue: (['ruby', 'cobalt', 'amber', 'emerald', 'violet', 'opal'] as const)[i % 6]
	}));

	const copy = $derived.by(() => {
		if (won) {
			return {
				kicker: session.high ? 'A new high, and every window' : 'The nave is full of light',
				title: 'Every window burns',
				body: `All ${session.windows} windows lit at ${session.score.toLocaleString()} points. The ruin has not been this bright in a century.`
			};
		}
		return {
			kicker: session.high ? 'A new high before the dark' : `Window ${session.level + 1} · ${session.windowName}`,
			title: `${session.score.toLocaleString()} points`,
			body: 'The last candle gutters out. The glass waits; it has waited for centuries.'
		};
	});
</script>

{#if ended}
	<div class="overlay" class:won class:high={session.high} transition:fade={{ duration: 280, delay: 80 }}>
		<div class="glow"></div>
		{#if won || session.high}
			<div class="burst" aria-hidden="true">
				{#each motes as mote (mote.i)}
					<i class={['mote', mote.hue]} style:--i={mote.i} style:--x="{mote.x}px" style:--y="{mote.y}px"></i>
				{/each}
			</div>
		{/if}
		<div class="panel" transition:scale={{ start: 0.92, duration: 320, delay: 120 }}>
			<p>{copy.kicker}</p>
			<h2>{copy.title}</h2>
			<span>{copy.body}</span>
			<div class="actions">
				<button type="button" class="primary" onclick={() => session.restart()}>Light it again</button>
				<button type="button" onclick={() => session.backToMenu()}>Leave the nave</button>
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
	.burst {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.glow {
		background: radial-gradient(circle at 50% 46%, rgba(10, 8, 14, 0.6), rgba(10, 8, 14, 0.2) 60%, transparent);
	}

	.won .glow,
	.high .glow {
		background:
			radial-gradient(circle at 50% 42%, rgba(255, 220, 150, 0.22), transparent 46%),
			radial-gradient(circle at 50% 46%, rgba(10, 8, 14, 0.5), transparent 70%);
	}

	.mote {
		position: absolute;
		left: 50%;
		top: 44%;
		width: 10px;
		height: 14px;
		border-radius: 5px 5px 2px 2px;
		opacity: 0;
		animation: toss 2s ease-out forwards;
		animation-delay: calc(var(--i) * 0.035s);
		box-shadow: 0 0 12px currentColor;
	}

	.ruby {
		color: #ff8c9c;
		background: #c8243c;
	}

	.cobalt {
		color: #93b3ff;
		background: #2b5ad0;
	}

	.amber {
		color: #ffd98a;
		background: #e8a23a;
	}

	.emerald {
		color: #7ff0b0;
		background: #1f9a5c;
	}

	.violet {
		color: #cba3ff;
		background: #7b3dcc;
	}

	.opal {
		color: #f4f8ff;
		background: #cdd8e6;
	}

	.panel {
		position: relative;
		z-index: 1;
		width: min(470px, 100%);
		padding: 24px 24px 20px;
		border-radius: 24px;
		pointer-events: auto;
		text-align: center;
		color: #f4e8d0;
		background: linear-gradient(180deg, rgba(40, 38, 50, 0.96), rgba(18, 17, 24, 0.96));
		border: 1px solid rgba(242, 196, 107, 0.3);
		box-shadow:
			0 18px 50px rgba(0, 0, 0, 0.5),
			inset 0 1px 0 rgba(255, 236, 200, 0.14);
	}

	.panel p {
		margin: 0;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		font-size: 0.68rem;
		color: #f2c46b;
	}

	.panel h2 {
		margin: 8px 0 6px;
		font-family: 'IM Fell English SC', Georgia, serif;
		font-weight: 400;
		font-size: clamp(1.8rem, 5vw, 2.5rem);
	}

	.panel span {
		display: block;
		color: #c9bda8;
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
		border: 1px solid rgba(242, 196, 107, 0.24);
		background: rgba(255, 255, 255, 0.05);
		color: inherit;
		font: inherit;
		cursor: pointer;
		padding: 10px 18px;
		border-radius: 999px;
		letter-spacing: 0.04em;
	}

	.actions .primary {
		background: linear-gradient(180deg, #f6d48a, #c8243c);
		border-color: transparent;
		color: #1a0c10;
		font-weight: 700;
	}

	@keyframes toss {
		0% {
			opacity: 0;
			translate: 0 0;
			scale: 0.4;
		}
		18% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			translate: var(--x) var(--y);
			scale: 0.8;
			rotate: 200deg;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.mote {
			animation: none;
			opacity: 0;
		}
	}
</style>
