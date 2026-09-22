<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import type { AshSession } from '../session.svelte';

	let { session }: { session: AshSession } = $props();

	const ended = $derived(session.screen === 'play' && session.status.type !== 'playing' && !session.animating);
	const p1 = $derived(session.mode === 'ai' ? 'You' : 'Ember');
	const p2 = $derived(session.mode === 'ai' ? 'The Yard' : 'Bone');
	const winner = $derived(session.status.type === 'won' ? session.status.winner : 1);
	const specks = Array.from({ length: 20 }, (_, i) => ({
		i,
		x: Math.cos((i / 20) * Math.PI * 2) * (140 + (i % 4) * 24),
		y: Math.sin((i / 20) * Math.PI * 2) * (70 + (i % 3) * 18) - 64,
		ember: i % 2 === 0
	}));

	const copy = $derived.by(() => {
		if (session.status.type === 'draw') {
			return {
				kicker: 'Even clay',
				title: 'The yard cools',
				body: 'No hop left that changes the glaze. Let the china settle and try again.'
			};
		}
		if (session.status.type === 'won' && session.status.winner === 1) {
			return {
				kicker: session.mode === 'ai' ? 'You held the yard' : 'Ember takes the noon',
				title: `${p1} remains`,
				body: 'Bone china went back into the fire. The tiles remember the heat.'
			};
		}
		return {
			kicker: session.mode === 'ai' ? 'The yard keeps its due' : 'Bone claims the board',
			title: `${p2} remains`,
			body:
				session.mode === 'ai'
					? 'Every take was already in the clay. Step onto the tiles again?'
					: 'Pass the board. Hop it again before the glaze dries.'
		};
	});
</script>

{#if ended}
	<div
		class="overlay"
		class:p1={session.status.type === 'won' && winner === 1}
		class:p2={session.status.type === 'won' && winner === 2}
		class:draw={session.status.type === 'draw'}
		transition:fade={{ duration: 280, delay: 120 }}
	>
		<div class="glow"></div>
		<div class="burst" aria-hidden="true">
			{#each specks as speck (speck.i)}
				<i
					class={['speck', speck.ember ? 'ember' : 'bone']}
					style:--i={speck.i}
					style:--x="{speck.x}px"
					style:--y="{speck.y}px"
				></i>
			{/each}
		</div>
		<div class="panel" transition:scale={{ start: 0.92, duration: 320, delay: 180 }}>
			<p>{copy.kicker}</p>
			<h2>{copy.title}</h2>
			<span>{copy.body}</span>
			<div class="actions">
				<button type="button" class="primary" onclick={() => session.rematch()}>Reset the tiles</button>
				<button type="button" onclick={() => session.backToMenu()}>Leave the court</button>
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
			radial-gradient(circle at 50% 42%, rgba(158, 27, 42, 0.22), transparent 46%),
			radial-gradient(circle at 50% 100%, rgba(196, 180, 154, 0.4), transparent 46%);
	}

	.p2 .glow {
		background:
			radial-gradient(circle at 50% 42%, rgba(61, 107, 92, 0.22), transparent 44%),
			radial-gradient(circle at 50% 100%, rgba(196, 180, 154, 0.4), transparent 46%);
	}

	.draw .glow {
		background: radial-gradient(circle at 50% 50%, rgba(90, 70, 50, 0.22), transparent 55%);
	}

	.speck {
		position: absolute;
		left: 50%;
		top: 38%;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		opacity: 0;
		animation: toss 1.7s ease-out forwards;
		animation-delay: calc(var(--i) * 0.035s);
	}

	.speck.ember {
		background: radial-gradient(circle at 30% 30%, #f4c4c8, #9e1b2a);
		box-shadow: 0 0 8px rgba(158, 27, 42, 0.4);
	}

	.speck.bone {
		background: radial-gradient(circle at 30% 30%, #ffffff, #b7c9be);
	}

	.panel {
		position: relative;
		z-index: 1;
		width: min(460px, 100%);
		padding: 22px 22px 18px;
		border-radius: 28px;
		pointer-events: auto;
		text-align: center;
		color: #2a221c;
		background: linear-gradient(180deg, rgba(255, 250, 242, 0.96), rgba(239, 230, 214, 0.98));
		border: 1px solid rgba(158, 27, 42, 0.28);
		box-shadow:
			0 18px 40px rgba(70, 50, 30, 0.22),
			inset 0 1px 0 rgba(255, 255, 255, 0.8);
	}

	.panel p {
		margin: 0;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		font-size: 0.68rem;
		color: #9e1b2a;
	}

	.panel h2 {
		margin: 8px 0 6px;
		font-family: 'Cormorant Garamond', Palatino, serif;
		font-style: italic;
		font-weight: 700;
		font-size: clamp(1.6rem, 4vw, 2.2rem);
	}

	.panel span {
		display: block;
		color: #5a4e42;
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
		border: 1px solid rgba(158, 27, 42, 0.22);
		background: rgba(255, 250, 242, 0.9);
		color: inherit;
		font: inherit;
		cursor: pointer;
		padding: 10px 16px;
		border-radius: 999px;
		letter-spacing: 0.04em;
	}

	.actions .primary {
		background: linear-gradient(180deg, #c43b4a, #9e1b2a);
		border-color: transparent;
		color: #fff8f2;
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
