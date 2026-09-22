<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import type { WyrmSession } from '../session.svelte';

	let { session }: { session: WyrmSession } = $props();

	const ended = $derived(
		session.screen === 'play' && (session.status.type === 'dead' || session.status.type === 'won')
	);

	const specks = Array.from({ length: 22 }, (_, i) => ({
		i,
		x: Math.cos((i / 22) * Math.PI * 2) * (150 + (i % 4) * 28),
		y: Math.sin((i / 22) * Math.PI * 2) * (80 + (i % 3) * 22) - 70,
		hue: (['gold', 'red', 'jade', 'rose'] as const)[i % 4] ?? 'gold'
	}));

	const copy = $derived.by(() => {
		if (session.status.type === 'won') {
			return {
				kicker: 'The market is silk',
				title: 'Every lantern swallowed',
				body: 'Nothing left but the coil. That is a night the stalls will remember.'
			};
		}
		if (session.status.type === 'dead' && session.status.cause === 'wall') {
			return {
				kicker: session.high ? 'A new high, then the stall' : 'The aisle ends',
				title: `${session.score} lanterns`,
				body: 'Wood does not yield. Turn earlier. The night is still open.'
			};
		}
		return {
			kicker: session.high ? 'A new high in the bite' : 'Silk on silk',
			title: `${session.score} lanterns`,
			body: 'The wyrm found its own tail. Uncoil and try the market again.'
		};
	});
</script>

{#if ended}
	<div
		class="overlay"
		class:won={session.status.type === 'won'}
		class:high={session.high}
		transition:fade={{ duration: 280, delay: 80 }}
	>
		<div class="glow"></div>
		<div class="burst" aria-hidden="true">
			{#each specks as speck (speck.i)}
				<i
					class={['speck', speck.hue]}
					style:--i={speck.i}
					style:--x="{speck.x}px"
					style:--y="{speck.y}px"
				></i>
			{/each}
		</div>
		<div class="panel" transition:scale={{ start: 0.92, duration: 320, delay: 120 }}>
			<p>{copy.kicker}</p>
			<h2>{copy.title}</h2>
			<span>{copy.body}</span>
			<div class="actions">
				<button type="button" class="primary" onclick={() => session.restart()}>Coil again</button>
				<button type="button" onclick={() => session.backToMenu()}>Leave the market</button>
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
		place-items: end center;
		padding: 0 16px 10vh;
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
		background:
			radial-gradient(circle at 50% 42%, rgba(240, 196, 92, 0.18), transparent 46%),
			radial-gradient(circle at 50% 100%, rgba(226, 74, 61, 0.16), transparent 46%);
	}

	.won .glow,
	.high .glow {
		background:
			radial-gradient(circle at 50% 42%, rgba(255, 220, 140, 0.28), transparent 44%),
			radial-gradient(circle at 50% 100%, rgba(226, 74, 61, 0.2), transparent 46%);
	}

	.speck {
		position: absolute;
		left: 50%;
		top: 38%;
		width: 12px;
		height: 16px;
		border-radius: 40% 40% 36% 36%;
		opacity: 0;
		animation: toss 1.9s ease-out forwards;
		animation-delay: calc(var(--i) * 0.035s);
		box-shadow: 0 0 12px currentColor;
	}

	.speck.gold {
		color: #f0c45c;
		background: radial-gradient(circle at 30% 30%, #fff4c8, #f0c45c 60%, #e24a3d);
	}

	.speck.red {
		color: #e24a3d;
		background: radial-gradient(circle at 30% 30%, #ffd0c4, #e24a3d 60%, #8a1820);
	}

	.speck.jade {
		color: #7dffc2;
		background: radial-gradient(circle at 30% 30%, #e8fff4, #7dffc2 60%, #1f8a68);
	}

	.speck.rose {
		color: #ff9bb8;
		background: radial-gradient(circle at 30% 30%, #ffe4ee, #ff9bb8 60%, #c45a78);
	}

	.panel {
		position: relative;
		z-index: 1;
		width: min(460px, 100%);
		padding: 22px 22px 18px;
		border-radius: 28px;
		pointer-events: auto;
		text-align: center;
		color: #f7ead2;
		background:
			linear-gradient(180deg, rgba(28, 20, 48, 0.94), rgba(12, 10, 28, 0.94));
		border: 1px solid rgba(240, 196, 92, 0.28);
		box-shadow:
			0 18px 40px rgba(0, 0, 0, 0.35),
			inset 0 1px 0 rgba(255, 244, 210, 0.16);
	}

	.panel p {
		margin: 0;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		font-size: 0.68rem;
		color: #f0c45c;
	}

	.panel h2 {
		margin: 8px 0 6px;
		font-family: Cinzel, Palatino, serif;
		font-weight: 600;
		font-size: clamp(1.6rem, 4vw, 2.2rem);
	}

	.panel span {
		display: block;
		color: #c4b08a;
		line-height: 1.45;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 10px;
		margin-top: 16px;
	}

	.actions button {
		appearance: none;
		border: 1px solid rgba(240, 196, 92, 0.22);
		background: rgba(255, 255, 255, 0.06);
		color: inherit;
		font: inherit;
		cursor: pointer;
		padding: 10px 16px;
		border-radius: 999px;
		letter-spacing: 0.04em;
	}

	.actions .primary {
		background: linear-gradient(180deg, #ffe08a, #e24a3d);
		border-color: transparent;
		color: #1a0c12;
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
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.speck {
			animation: none;
			opacity: 0;
		}
	}
</style>
