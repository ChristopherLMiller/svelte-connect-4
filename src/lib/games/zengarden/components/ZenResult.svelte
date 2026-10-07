<script lang="ts">
	import { fade, fly, scale } from 'svelte/transition';
	import { zenView } from '../settings.svelte';
	import { SEASON_INFO, SLATE, nameOf } from '../types';
	import type { ZenSession } from '../session.svelte';

	let { session }: { session: ZenSession } = $props();

	let shown = $state(false);
	let tucked = $state(false);

	$effect(() => {
		const over = session.screen === 'play' && session.status.type !== 'playing' && !session.animating;
		tucked = false;
		if (!over) {
			shown = false;
			return;
		}
		const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
		const timer = window.setTimeout(() => (shown = true), reduced ? 250 : 1900);
		return () => window.clearTimeout(timer);
	});

	const winner = $derived(session.status.type === 'won' ? session.status.winner : 0);
	const stones = $derived(session.moves.length);

	const copy = $derived.by(() => {
		if (session.status.type === 'draw') {
			return { kicker: 'Every point is set', title: 'A quiet draw', body: `${stones} stones and no line of five. The gravel rests.`, seal: '和' };
		}
		if (session.mode === 'ai') {
			return winner === SLATE
				? { kicker: 'The Monk bows', title: 'Five in a line', body: `You read the gravel in ${stones} stones. He smiles and reaches for the rake.`, seal: '勝' }
				: { kicker: 'The Monk lays five', title: 'The garden is his', body: `${stones} stones. Watch for the line that grows on two ends at once.`, seal: '僧' };
		}
		const name = nameOf(winner as 1 | 2, session.mode);
		return { kicker: `${name} lays five`, title: `${name} keeps the garden`, body: `A line of five after ${stones} stones. Swap who opens and rake again?`, seal: '勝' };
	});

	const petals = Array.from({ length: 16 }, (_, k) => ({ k, x: (k * 61) % 100, d: (k * 0.41) % 3, s: 0.6 + ((k * 7) % 5) / 6 }));
</script>

{#if shown}
	{#if tucked}
		<button class="pill" transition:fly={{ y: 20, duration: 220 }} onclick={() => (tucked = false)}>
			<i aria-hidden="true">{copy.seal}</i>{copy.title}
		</button>
	{:else}
		<div class="overlay" transition:fade={{ duration: 300 }}>
			<div class="panel" transition:scale={{ start: 0.92, duration: 340, delay: 80 }} style:--petal={SEASON_INFO[zenView.season].hue}>
				<div class="petals" class:snow={zenView.season === 'winter'} aria-hidden="true">
					{#each petals as p (p.k)}
						<i style:left="{p.x}%" style:animation-delay="{p.d}s" style:scale={p.s}></i>
					{/each}
				</div>
				<div class="seal" aria-hidden="true">{copy.seal}</div>
				<p>{copy.kicker}</p>
				<h2>{copy.title}</h2>
				<span>{copy.body}</span>
				<div class="actions">
					<button type="button" class="primary" onclick={() => session.rematch()}>Rake again</button>
					<button type="button" onclick={() => (tucked = true)}>Admire the garden</button>
					<button type="button" onclick={() => session.backToMenu()}>Leave the garden</button>
				</div>
			</div>
		</div>
	{/if}
{/if}

<style>
	.overlay {
		position: absolute;
		inset: 0;
		z-index: 9;
		display: grid;
		place-items: end center;
		padding: 0 16px max(7vh, env(safe-area-inset-bottom));
		pointer-events: none;
		background: linear-gradient(180deg, transparent 45%, rgba(30, 20, 10, 0.4));
	}

	.panel {
		position: relative;
		width: min(470px, 100%);
		padding: 30px 24px 20px;
		border-radius: 6px;
		pointer-events: auto;
		text-align: center;
		color: #2b2622;
		background:
			linear-gradient(90deg, rgba(90, 60, 30, 0.12), transparent 4%, transparent 96%, rgba(90, 60, 30, 0.12)),
			linear-gradient(180deg, #fbf7ee, #efe6d4);
		border-top: 6px solid #5a3a24;
		border-bottom: 6px solid #5a3a24;
		box-shadow:
			0 20px 50px rgba(30, 18, 8, 0.45),
			inset 0 1px 0 rgba(255, 255, 255, 0.7);
	}

	.petals {
		position: absolute;
		inset: -60px 0 0;
		pointer-events: none;
		overflow: hidden;
	}

	.petals i {
		position: absolute;
		top: 0;
		width: 9px;
		height: 12px;
		border-radius: 50% 0 50% 50%;
		background: var(--petal);
		opacity: 0;
		animation: fall 4s linear infinite;
	}

	.petals.snow i {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 0 4px rgba(150, 180, 210, 0.8);
	}

	.seal {
		width: 58px;
		height: 58px;
		margin: -60px auto 8px;
		display: grid;
		place-items: center;
		border-radius: 6px;
		background: #b8261a;
		color: #f6e7d2;
		font-family: 'Shippori Mincho', serif;
		font-weight: 800;
		font-size: 2rem;
		box-shadow:
			inset 0 0 0 3px #b8261a,
			inset 0 0 0 5px #f6e7d2,
			0 8px 18px rgba(90, 20, 10, 0.4);
		rotate: -6deg;
		animation: stamp 600ms cubic-bezier(0.2, 1.5, 0.4, 1) both 150ms;
	}

	.panel p {
		margin: 0;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		font-size: 0.66rem;
		font-weight: 700;
		color: #b22a18;
	}

	.panel h2 {
		margin: 6px 0;
		font-family: 'Shippori Mincho', Georgia, serif;
		font-weight: 800;
		font-size: clamp(1.5rem, 4.2vw, 2.1rem);
		line-height: 1.1;
	}

	.panel span {
		display: block;
		color: #5b5046;
		font-size: 1rem;
		line-height: 1.5;
	}

	.actions {
		position: relative;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 8px;
		margin-top: 16px;
	}

	.actions button,
	.pill {
		appearance: none;
		border: 1px solid rgba(60, 40, 25, 0.25);
		background: rgba(255, 255, 255, 0.5);
		color: inherit;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
		padding: 9px 16px;
		border-radius: 999px;
		font-size: 0.9rem;
	}

	.actions .primary {
		background: linear-gradient(180deg, #d8442c, #a8261a);
		border-color: transparent;
		color: #fff6ec;
	}

	.pill {
		position: absolute;
		z-index: 9;
		left: 50%;
		bottom: max(16px, env(safe-area-inset-bottom));
		translate: -50% 0;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		background: linear-gradient(180deg, #fbf7ee, #efe6d4);
		color: #2b2622;
		box-shadow: 0 10px 24px rgba(30, 18, 8, 0.35);
		white-space: nowrap;
	}

	.pill i {
		font-style: normal;
		display: grid;
		place-items: center;
		width: 22px;
		height: 22px;
		border-radius: 3px;
		background: #b8261a;
		color: #f6e7d2;
		font-family: 'Shippori Mincho', serif;
		font-size: 0.8rem;
	}

	@keyframes fall {
		0% {
			transform: translate(0, 0) rotate(0deg);
			opacity: 0;
		}
		15% {
			opacity: 0.9;
		}
		100% {
			transform: translate(40px, 300px) rotate(320deg);
			opacity: 0;
		}
	}

	@keyframes stamp {
		from {
			scale: 1.8;
			opacity: 0;
		}
		to {
			scale: 1;
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.seal {
			animation: none;
		}

		.petals {
			display: none;
		}
	}
</style>
