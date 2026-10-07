<script lang="ts">
	import { fade, fly, scale } from 'svelte/transition';
	import { reagentOf, valueOf } from '../types';
	import type { ApoSession } from '../session.svelte';

	let { session }: { session: ApoSession } = $props();

	let shown = $state(false);
	let tucked = $state(false);

	$effect(() => {
		const kind = session.screen === 'play' ? session.status.type : 'playing';
		tucked = false;
		if (kind === 'playing') {
			shown = false;
			return;
		}
		const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
		const timer = window.setTimeout(() => (shown = true), reduced ? 150 : kind === 'stone' ? 1100 : 800);
		return () => window.clearTimeout(timer);
	});

	const stone = $derived(session.status.type === 'stone');
	const rare = $derived(reagentOf(session.top));
	const copy = $derived(
		stone
			? {
					kicker: 'The great work',
					title: "The Philosopher's Stone",
					body: `${valueOf(session.top)} in ${session.moves} pours. Lesser alchemists spend their lives on this.`
				}
			: {
					kicker: session.newBest ? 'A new best brew' : 'Out of room',
					title: 'The rack is full',
					body: `You brewed ${session.score} and got as far as ${rare.name.toLowerCase()} (${valueOf(session.top)}).`
				}
	);
</script>

{#if shown}
	{#if tucked}
		<button class="pill" transition:fly={{ y: 20, duration: 220 }} onclick={() => (tucked = false)} style:--c={rare.color}>
			<i aria-hidden="true"></i>{copy.title} · {session.score}
		</button>
	{:else}
		<div class="overlay" class:stone transition:fade={{ duration: 300 }}>
			<div class="panel" transition:scale={{ start: 0.92, duration: 340, delay: 80 }} style:--c={rare.color} role="dialog" aria-label={copy.title}>
				<div class="flask" aria-hidden="true"><span></span></div>
				<p>{copy.kicker}</p>
				<h2>{copy.title}</h2>
				<span class="body">{copy.body}</span>
				<div class="actions">
					{#if stone}
						<button type="button" class="primary" onclick={() => session.keepBrewing()}>Keep brewing</button>
						<button type="button" onclick={() => session.restart()}>New brew</button>
					{:else}
						<button type="button" class="primary" onclick={() => session.restart()}>New brew</button>
						{#if session.canUndo}
							<button type="button" onclick={() => session.undo()}>Pull a stopper · undo</button>
						{/if}
						<button type="button" onclick={() => (tucked = true)}>Admire the rack</button>
					{/if}
					<button type="button" onclick={() => session.backToMenu()}>Leave the bench</button>
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
		background: linear-gradient(180deg, transparent 40%, rgba(4, 6, 5, 0.7));
	}

	.overlay.stone {
		background: radial-gradient(60% 50% at 50% 50%, rgba(255, 60, 100, 0.18), transparent 70%), linear-gradient(180deg, transparent 40%, rgba(4, 6, 5, 0.6));
	}

	.panel {
		position: relative;
		width: min(480px, 100%);
		padding: 34px 24px 20px;
		border-radius: 14px;
		pointer-events: auto;
		text-align: center;
		color: #f1e6c8;
		background: linear-gradient(180deg, rgba(30, 42, 36, 0.97), rgba(12, 18, 15, 0.98));
		border: 1px solid rgba(214, 170, 92, 0.5);
		box-shadow:
			0 20px 50px rgba(0, 0, 0, 0.65),
			0 0 50px color-mix(in srgb, var(--c) 25%, transparent),
			inset 0 1px 0 rgba(255, 240, 200, 0.12);
	}

	.flask {
		position: relative;
		width: 64px;
		height: 64px;
		margin: -68px auto 6px;
		border-radius: 50%;
		border: 2px solid rgba(214, 170, 92, 0.8);
		background: rgba(20, 28, 24, 0.95);
		overflow: hidden;
		box-shadow: 0 0 30px color-mix(in srgb, var(--c) 55%, transparent);
	}

	.flask span {
		position: absolute;
		inset: 45% -10% -10%;
		background: radial-gradient(circle at 40% 20%, color-mix(in srgb, var(--c) 60%, white), var(--c) 55%, color-mix(in srgb, var(--c) 50%, black));
		border-radius: 40% 45% 0 0;
		animation: slosh 2.4s ease-in-out infinite;
	}

	@keyframes slosh {
		50% {
			rotate: 6deg;
			translate: 0 -4%;
		}
	}

	.panel p {
		margin: 0;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		font-size: 0.66rem;
		font-weight: 700;
		color: #6fe3b0;
	}

	.stone .panel p {
		color: #ff8aa0;
	}

	h2 {
		margin: 6px 0;
		font-family: Cinzel, Georgia, serif;
		font-weight: 700;
		font-size: clamp(1.5rem, 4vw, 2.1rem);
		line-height: 1.1;
	}

	.body {
		display: block;
		color: #c8bb9c;
		font-family: Spectral, Georgia, serif;
		font-size: 1.04rem;
		line-height: 1.4;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 8px;
		margin-top: 16px;
	}

	.actions button,
	.pill {
		appearance: none;
		border: 1px solid rgba(214, 170, 92, 0.45);
		background: rgba(255, 240, 200, 0.06);
		color: inherit;
		font: inherit;
		cursor: pointer;
		padding: 9px 16px;
		border-radius: 999px;
		font-size: 0.9rem;
	}

	.actions .primary {
		background: linear-gradient(180deg, #ff5a78, #a8122f);
		border-color: transparent;
		color: #fff4f0;
		font-weight: 700;
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
		background: rgba(14, 20, 17, 0.95);
		color: #f1e6c8;
		font-family: Spectral, Georgia, serif;
		font-weight: 600;
		box-shadow: 0 10px 24px rgba(0, 0, 0, 0.5);
		white-space: nowrap;
	}

	.pill i {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--c);
		box-shadow: 0 0 10px var(--c);
	}

	@media (prefers-reduced-motion: reduce) {
		.flask span {
			animation: none;
		}
	}
</style>
