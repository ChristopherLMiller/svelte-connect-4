<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import type { TttSession } from '../session.svelte';

	let { session }: { session: TttSession } = $props();

	const ended = $derived(
		session.screen === 'play' &&
			session.status.type !== 'playing' &&
			!session.washing &&
			!session.gridHidden &&
			!session.sketching
	);
	const p1 = $derived(session.mode === 'ai' ? 'You' : 'Cross');
	const p2 = $derived(session.mode === 'ai' ? 'The Tide' : 'Loop');
	const winner = $derived(session.status.type === 'won' ? session.status.winner : 1);
	const specks = Array.from({ length: 18 }, (_, i) => ({
		i,
		x: Math.cos((i / 18) * Math.PI * 2) * 170,
		y: Math.sin((i / 18) * Math.PI * 2) * 86 - 72
	}));

	const copy = $derived.by(() => {
		if (session.status.type === 'draw') {
			return {
				kicker: 'Even shore',
				title: 'The square is full',
				body: 'Nine scratches. No three. The water can have this one.'
			};
		}
		if (session.status.type === 'won' && session.status.winner === 1) {
			return {
				kicker: session.mode === 'ai' ? 'You held the square' : 'Cross finds three',
				title: `${p1} in a line`,
				body: 'The stick found its path. Let the tide take the rest.'
			};
		}
		return {
			kicker: session.mode === 'ai' ? 'The water remembers' : 'Loop closes it',
			title: `${p2} in a line`,
			body: session.mode === 'ai' ? 'Every fork was already wet. Rematch the shore?' : 'Pass the stick. Draw it again before the water does.'
		};
	});
</script>

{#if ended}
	<div
		class="overlay"
		class:p1={session.status.type === 'won' && winner === 1}
		class:p2={session.status.type === 'won' && winner === 2}
		class:draw={session.status.type === 'draw'}
		transition:fade={{ duration: 280, delay: 160 }}
	>
		<div class="glow"></div>
		<div class="burst" aria-hidden="true">
			{#each specks as speck (speck.i)}
				<i class="speck" style:--i={speck.i} style:--x="{speck.x}px" style:--y="{speck.y}px"></i>
			{/each}
		</div>
		<div class="panel" transition:scale={{ start: 0.92, duration: 320, delay: 220 }}>
			<p>{copy.kicker}</p>
			<h2>{copy.title}</h2>
			<span>{copy.body}</span>
			<div class="actions">
				<button type="button" class="primary" onclick={() => session.rematch()}>Let the tide take it</button>
				<button type="button" onclick={() => session.backToMenu()}>Change shore</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 9;
		display: grid;
		place-items: end center;
		padding: 0 16px 22vh;
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
			radial-gradient(circle at 50% 42%, rgba(255, 232, 176, 0.2), transparent 46%),
			radial-gradient(circle at 50% 100%, rgba(58, 160, 184, 0.18), transparent 46%);
	}

	.p2 .glow {
		background:
			radial-gradient(circle at 50% 42%, rgba(176, 228, 236, 0.4), transparent 44%),
			radial-gradient(circle at 50% 100%, rgba(29, 109, 134, 0.22), transparent 46%);
	}

	.draw .glow {
		background: radial-gradient(circle at 50% 50%, rgba(210, 186, 150, 0.28), transparent 55%);
	}

	.speck {
		position: absolute;
		left: 50%;
		top: 38%;
		width: 10px;
		height: 7px;
		border-radius: 70% 70% 40% 40%;
		background: radial-gradient(circle at 30% 30%, #fff6e4, #d9b08c 62%, #b07a52);
		opacity: 0;
		animation: toss 1.8s ease-out forwards;
		animation-delay: calc(var(--i) * 0.04s);
		transform: rotate(calc(var(--i) * 21deg));
	}

	.panel {
		position: relative;
		z-index: 1;
		width: min(460px, 100%);
		padding: 22px 22px 18px;
		border-radius: 28px;
		pointer-events: auto;
		text-align: center;
		color: #3b2a1c;
		background:
			linear-gradient(180deg, rgba(255, 252, 246, 0.92), rgba(247, 239, 226, 0.9));
		border: 1px solid rgba(90, 64, 42, 0.16);
		box-shadow:
			0 18px 40px rgba(62, 38, 18, 0.18),
			inset 0 1px 0 rgba(255, 255, 255, 0.7);
	}

	.panel p {
		margin: 0;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		font-size: 0.68rem;
		color: #1d6d86;
	}

	.panel h2 {
		margin: 8px 0 6px;
		font-family: Fraunces, Georgia, serif;
		font-style: italic;
		font-weight: 600;
		font-size: clamp(1.6rem, 4vw, 2.2rem);
	}

	.panel span {
		display: block;
		color: #5a4634;
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
		border: 1px solid rgba(90, 64, 42, 0.18);
		background: rgba(255, 255, 255, 0.55);
		color: inherit;
		font: inherit;
		cursor: pointer;
		padding: 10px 16px;
		border-radius: 999px;
		letter-spacing: 0.04em;
	}

	.actions .primary {
		background: #1d6d86;
		border-color: transparent;
		color: #f4fbff;
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
