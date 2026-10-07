<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import LightIcon from './LightIcon.svelte';
	import { GLOW, nameOf } from '../types';
	import type { LightSession } from '../session.svelte';

	let { session }: { session: LightSession } = $props();

	const c = $derived(session.curtain);
	const name = $derived(c ? nameOf(c.for, session.mode) : '');
	const other = $derived(c ? nameOf(c.for === 1 ? 2 : 1, session.mode) : '');
</script>

{#if c}
	<div class="curtain" transition:fade={{ duration: 260 }} style:--glow={GLOW[c.for]}>
		<div class="card" in:scale={{ start: 0.94, duration: 300, delay: 120 }}>
			<div class="lamp"><LightIcon size="hero" /></div>
			<p class="kicker">{c.reason === 'setup' ? 'Fleets to sea' : 'Change of watch'}</p>
			<h2>Hand the glass to {name}</h2>
			<p class="body">
				{#if c.reason === 'setup'}
					{name}, lay out your ships where {other} can't see. Look away, {other}.
				{:else}
					{other}, look away. {name}, your gun is loaded.
				{/if}
			</p>
			<button type="button" onclick={() => session.liftCurtain()}>I'm {name} · take the glass</button>
		</div>
	</div>
{/if}

<style>
	.curtain {
		position: absolute;
		inset: 0;
		z-index: 12;
		display: grid;
		place-items: center;
		padding: max(20px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) max(20px, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left));
		background:
			radial-gradient(60% 50% at 50% 40%, color-mix(in srgb, var(--glow) 12%, transparent), transparent 70%),
			rgba(3, 7, 11, 0.95);
		backdrop-filter: blur(16px);
	}

	.card {
		width: min(440px, 100%);
		text-align: center;
		color: #f2e8d5;
	}

	.lamp {
		display: grid;
		place-items: center;
		margin-bottom: 12px;
		filter: drop-shadow(0 0 24px color-mix(in srgb, var(--glow) 60%, transparent));
		animation: glow 3s ease-in-out infinite;
	}

	.kicker {
		margin: 0;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		font-size: 0.7rem;
		font-weight: 700;
		color: var(--glow);
	}

	h2 {
		margin: 6px 0 8px;
		font-family: 'IM Fell English', Georgia, serif;
		font-weight: 400;
		font-size: clamp(1.8rem, 6vw, 2.6rem);
		line-height: 1.05;
	}

	.body {
		margin: 0 0 20px;
		color: #b3ab9a;
		font-size: 1.02rem;
		line-height: 1.5;
	}

	button {
		appearance: none;
		border: 0;
		border-radius: 999px;
		padding: 14px 26px;
		font: inherit;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		font-size: 0.86rem;
		cursor: pointer;
		color: #1a1206;
		background: linear-gradient(180deg, color-mix(in srgb, var(--glow) 80%, white), var(--glow));
		box-shadow:
			0 10px 26px rgba(0, 0, 0, 0.5),
			0 0 30px color-mix(in srgb, var(--glow) 40%, transparent);
	}

	@keyframes glow {
		50% {
			filter: drop-shadow(0 0 40px color-mix(in srgb, var(--glow) 80%, transparent));
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.lamp {
			animation: none;
		}
	}
</style>
