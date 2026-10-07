<script lang="ts">
	import { fade, fly, scale } from 'svelte/transition';
	import { INK, VERMILION, nameOf } from '../types';
	import type { CartSession } from '../session.svelte';

	let { session }: { session: CartSession } = $props();

	let shown = $state(false);
	let tucked = $state(false);

	$effect(() => {
		const over = session.screen === 'play' && session.status.type !== 'playing';
		tucked = false;
		if (!over) {
			shown = false;
			return;
		}
		const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
		const timer = window.setTimeout(() => (shown = true), reduced ? 200 : 1500);
		return () => window.clearTimeout(timer);
	});

	const winner = $derived(session.status.type === 'won' ? session.status.winner : 0);
	const final = $derived(`${session.count[1]} – ${session.count[2]}`);
	const seal = $derived(winner ? INK[winner] : '#7a5a2e');

	const copy = $derived.by(() => {
		if (session.status.type === 'draw') {
			return {
				kicker: 'A divided realm',
				title: 'The border runs down the middle',
				body: `Squares split ${final}. The guild will argue about this one for years.`
			};
		}
		if (session.mode === 'ai') {
			return winner === VERMILION
				? { kicker: 'Sealed in vermilion', title: 'The guild names you master', body: `You charted ${final}. Mercator grumbles into his beard.` }
				: { kicker: 'Sealed in indigo', title: 'Mercator claims the realm', body: `The map reads ${final}. Mind the chains next time.` };
		}
		const name = nameOf(winner as 1 | 2, session.mode);
		return { kicker: `Sealed in ${name.toLowerCase()}`, title: `${name} charts the realm`, body: `The map reads ${final}. Swap quills and go again?` };
	});
</script>

{#if shown}
	{#if tucked}
		<button class="pill" transition:fly={{ y: 20, duration: 220 }} onclick={() => (tucked = false)} style:--seal={seal}>
			<i aria-hidden="true"></i>{copy.title}
		</button>
	{:else}
		<div class="overlay" transition:fade={{ duration: 300 }}>
			<div class="panel" transition:scale={{ start: 0.92, duration: 340, delay: 80 }} style:--seal={seal}>
				<div class="seal" aria-hidden="true">
					<span class="drip"></span>
					<span class="wax">
						<svg viewBox="0 0 40 40">
							<g fill="none" stroke="rgba(255, 230, 210, 0.55)" stroke-width="1.4" stroke-linecap="round">
								<circle cx="20" cy="20" r="11" />
								<path d="M20 6 V34 M6 20 H34" />
								<path d="M20 9 L23 20 L20 31 L17 20 Z" fill="rgba(255, 230, 210, 0.45)" />
							</g>
						</svg>
					</span>
				</div>
				<p>{copy.kicker}</p>
				<h2>{copy.title}</h2>
				<span>{copy.body}</span>
				<div class="actions">
					<button type="button" class="primary" onclick={() => session.rematch()}>Fresh parchment</button>
					<button type="button" onclick={() => (tucked = true)}>Admire the map</button>
					<button type="button" onclick={() => session.backToMenu()}>Leave the study</button>
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
		background: linear-gradient(180deg, transparent 45%, rgba(10, 5, 2, 0.6));
	}

	.panel {
		position: relative;
		width: min(470px, 100%);
		padding: 30px 24px 20px;
		border-radius: 6px;
		pointer-events: auto;
		text-align: center;
		color: #2e2014;
		background: linear-gradient(180deg, #f6ead0, #e6d0a2);
		border: 1px solid rgba(107, 72, 36, 0.5);
		box-shadow:
			0 20px 50px rgba(0, 0, 0, 0.6),
			0 0 40px rgba(255, 160, 70, 0.18),
			inset 0 1px 0 rgba(255, 248, 228, 0.9);
	}

	.seal {
		position: relative;
		width: 70px;
		height: 70px;
		margin: -66px auto 8px;
	}

	.wax,
	.drip {
		position: absolute;
		background: radial-gradient(circle at 38% 32%, color-mix(in srgb, var(--seal) 70%, white), var(--seal) 55%, color-mix(in srgb, var(--seal) 60%, black));
	}

	.wax {
		inset: 0;
		display: grid;
		place-items: center;
		border-radius: 48% 52% 45% 55% / 52% 46% 54% 48%;
		box-shadow:
			0 6px 14px rgba(0, 0, 0, 0.45),
			inset 0 -3px 6px rgba(0, 0, 0, 0.3),
			inset 0 3px 4px rgba(255, 255, 255, 0.25);
		animation: press 620ms cubic-bezier(0.2, 1.4, 0.4, 1) both 200ms;
	}

	.wax svg {
		width: 66%;
		height: 66%;
	}

	.drip {
		width: 24px;
		height: 24px;
		right: -6px;
		bottom: -4px;
		border-radius: 50% 40% 55% 45%;
		animation: press 620ms ease-out both 320ms;
	}

	.panel p {
		margin: 0;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		font-size: 0.66rem;
		font-weight: 700;
		color: var(--seal);
	}

	.panel h2 {
		margin: 6px 0 6px;
		font-family: Almendra, 'EB Garamond', Georgia, serif;
		font-weight: 700;
		font-size: clamp(1.6rem, 4.2vw, 2.2rem);
		line-height: 1.1;
	}

	.panel span {
		display: block;
		color: #6b5238;
		font-family: 'EB Garamond', Georgia, serif;
		font-size: 1.05rem;
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
		border: 1px solid rgba(107, 72, 36, 0.45);
		background: rgba(255, 248, 228, 0.6);
		color: inherit;
		font: inherit;
		cursor: pointer;
		padding: 9px 16px;
		border-radius: 999px;
		font-size: 0.9rem;
	}

	.actions .primary {
		background: linear-gradient(180deg, #d0553a, #8e2a14);
		border-color: transparent;
		color: #fbefd6;
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
		background: linear-gradient(180deg, #f6ead0, #e6d0a2);
		color: #2e2014;
		font-family: 'EB Garamond', Georgia, serif;
		font-weight: 600;
		box-shadow: 0 10px 24px rgba(0, 0, 0, 0.5);
		white-space: nowrap;
	}

	.pill i {
		width: 16px;
		height: 16px;
		border-radius: 50% 40% 55% 45%;
		background: var(--seal);
	}

	@keyframes press {
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
		.wax,
		.drip {
			animation: none;
		}
	}
</style>
