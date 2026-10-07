<script lang="ts">
	import { fade, fly, scale } from 'svelte/transition';
	import { FIREFLY, GLOW, STORE, nameOf } from '../types';
	import type { SeedSession } from '../session.svelte';

	let { session }: { session: SeedSession } = $props();

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
		const timer = window.setTimeout(() => (shown = true), reduced ? 200 : 1100);
		return () => window.clearTimeout(timer);
	});

	const winner = $derived(session.status.type === 'won' ? session.status.winner : 0);
	const final = $derived(`${session.shown[STORE[1]]} – ${session.shown[STORE[2]]}`);
	const tint = $derived(winner ? GLOW[winner] : '#c8f06a');

	const copy = $derived.by(() => {
		if (session.status.type === 'draw') {
			return { kicker: 'An even harvest', title: 'Seed for seed, the river is shared', body: `Both stores hold the same: ${final}.` };
		}
		if (session.mode === 'ai') {
			return winner === FIREFLY
				? { kicker: 'The fireflies dance', title: 'You out-gathered Old Heron', body: `Your store holds the most: ${final}. The heron ruffles his feathers.` }
				: { kicker: 'The heron nods', title: 'Old Heron takes the harvest', body: `The stores read ${final}. Watch for his captures next time.` };
		}
		const name = nameOf(winner as 1 | 2, session.mode);
		return { kicker: `${name} gathers most`, title: `${name} keeps the seeds`, body: `The stores read ${final}. Swap sides and sow again?` };
	});

	const motes = Array.from({ length: 14 }, (_, k) => ({ k, x: (k * 61) % 100, d: (k * 0.37) % 2.4, s: 0.6 + ((k * 7) % 5) / 6 }));
</script>

{#if shown}
	{#if tucked}
		<button class="pill" transition:fly={{ y: 20, duration: 220 }} onclick={() => (tucked = false)} style:--tint={tint}>
			<i aria-hidden="true"></i>{copy.title}
		</button>
	{:else}
		<div class="overlay" transition:fade={{ duration: 300 }}>
			<div class="panel" transition:scale={{ start: 0.92, duration: 340, delay: 80 }} style:--tint={tint}>
				<div class="motes" aria-hidden="true">
					{#each motes as m (m.k)}
						<i style:left="{m.x}%" style:animation-delay="{m.d}s" style:scale={m.s}></i>
					{/each}
				</div>
				<div class="jar" aria-hidden="true">
					<svg viewBox="0 0 60 60">
						<path d="M20 10 H40 V16 C48 20 50 28 50 36 C50 48 41 54 30 54 C19 54 10 48 10 36 C10 28 12 20 20 16 Z" fill="rgba(200, 240, 106, 0.08)" stroke="rgba(243, 236, 214, 0.6)" stroke-width="1.6" />
						<rect x="18" y="6" width="24" height="6" rx="2" fill="#8a6a3a" />
						<g class="flies">
							<circle cx="24" cy="38" r="2.4" />
							<circle cx="35" cy="30" r="2" />
							<circle cx="31" cy="44" r="2.2" />
							<circle cx="38" cy="40" r="1.8" />
						</g>
					</svg>
				</div>
				<p>{copy.kicker}</p>
				<h2>{copy.title}</h2>
				<span>{copy.body}</span>
				<div class="actions">
					<button type="button" class="primary" onclick={() => session.rematch()}>Sow again</button>
					<button type="button" onclick={() => (tucked = true)}>Look at the board</button>
					<button type="button" onclick={() => session.backToMenu()}>Leave the river</button>
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
		background: linear-gradient(180deg, transparent 45%, rgba(4, 8, 4, 0.6));
	}

	.panel {
		position: relative;
		width: min(470px, 100%);
		padding: 30px 24px 20px;
		border-radius: 18px;
		pointer-events: auto;
		text-align: center;
		color: #f3ecd6;
		background: linear-gradient(180deg, rgba(30, 44, 28, 0.95), rgba(12, 20, 12, 0.96));
		border: 1px solid color-mix(in srgb, var(--tint) 50%, transparent);
		box-shadow:
			0 20px 50px rgba(0, 0, 0, 0.6),
			0 0 50px color-mix(in srgb, var(--tint) 25%, transparent),
			inset 0 1px 0 rgba(230, 255, 190, 0.08);
	}

	.motes {
		position: absolute;
		inset: -40px 0 0;
		pointer-events: none;
		overflow: hidden;
		border-radius: 18px;
	}

	.motes i {
		position: absolute;
		bottom: 0;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: radial-gradient(circle, #fff8c8, var(--tint) 50%, transparent 70%);
		box-shadow: 0 0 10px var(--tint);
		animation: rise 3.2s ease-in infinite;
		opacity: 0;
	}

	.jar {
		width: 74px;
		height: 74px;
		margin: -68px auto 6px;
		filter: drop-shadow(0 0 18px color-mix(in srgb, var(--tint) 50%, transparent));
		animation: drop 700ms cubic-bezier(0.2, 1.4, 0.4, 1) both 150ms;
	}

	.flies circle {
		fill: #e8ff9a;
		filter: drop-shadow(0 0 3px #c8f06a);
		animation: flicker 1.8s ease-in-out infinite;
	}

	.flies circle:nth-child(2) {
		animation-delay: 0.5s;
	}

	.flies circle:nth-child(3) {
		animation-delay: 1s;
	}

	.flies circle:nth-child(4) {
		animation-delay: 1.3s;
	}

	.panel p {
		margin: 0;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		font-size: 0.66rem;
		font-weight: 800;
		color: var(--tint);
	}

	.panel h2 {
		margin: 6px 0;
		font-family: Fraunces, Georgia, serif;
		font-weight: 700;
		font-size: clamp(1.5rem, 4.2vw, 2.1rem);
		line-height: 1.1;
	}

	.panel span {
		display: block;
		color: #c9c3a8;
		font-size: 1rem;
		line-height: 1.45;
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
		border: 1px solid rgba(184, 240, 106, 0.25);
		background: rgba(243, 236, 214, 0.06);
		color: inherit;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
		padding: 9px 16px;
		border-radius: 999px;
		font-size: 0.9rem;
	}

	.actions .primary {
		background: linear-gradient(180deg, #ffd56e, #d69a22);
		border-color: transparent;
		color: #1c1406;
		font-weight: 800;
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
		background: linear-gradient(180deg, rgba(30, 44, 28, 0.95), rgba(12, 20, 12, 0.96));
		color: #f3ecd6;
		box-shadow: 0 10px 24px rgba(0, 0, 0, 0.5);
		white-space: nowrap;
	}

	.pill i {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--tint);
		box-shadow: 0 0 10px var(--tint);
	}

	@keyframes rise {
		0% {
			transform: translateY(0);
			opacity: 0;
		}
		20% {
			opacity: 1;
		}
		100% {
			transform: translateY(-260px) translateX(12px);
			opacity: 0;
		}
	}

	@keyframes drop {
		from {
			translate: 0 -30px;
			opacity: 0;
		}
		to {
			translate: 0 0;
			opacity: 1;
		}
	}

	@keyframes flicker {
		50% {
			opacity: 0.35;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.motes,
		.jar,
		.flies circle {
			animation: none;
		}

		.motes {
			display: none;
		}
	}
</style>
