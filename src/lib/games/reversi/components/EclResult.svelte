<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { MOON } from '../types';
	import type { EclSession } from '../session.svelte';

	let { session }: { session: EclSession } = $props();

	const ended = $derived(session.screen === 'play' && session.status.type !== 'playing' && !session.animating);
	const winner = $derived(session.status.type === 'won' ? session.status.winner : 0);
	const final = $derived(`${session.tally[1]} – ${session.tally[2]}`);
	const motes = Array.from({ length: 24 }, (_, i) => {
		const a = (i / 24) * Math.PI * 2;
		const d = 120 + (i % 4) * 30;
		return { i, x: Math.round(Math.cos(a) * d), y: Math.round(Math.sin(a) * d * 0.7) };
	});

	const copy = $derived.by(() => {
		if (session.status.type === 'draw') {
			return {
				kicker: 'Equinox',
				title: 'Day and night hold even',
				body: `The chart reads ${final}. The orrery stops dead centre.`
			};
		}
		if (winner === MOON) {
			return session.mode === 'ai'
				? { kicker: 'Victory', title: 'You eclipse the sun', body: `Silver holds the chart, ${final}. The orrery bows.` }
				: { kicker: 'Moon wins', title: 'The Moon eclipses the Sun', body: `Silver holds the chart, ${final}. Swap seats and go again?` };
		}
		return session.mode === 'ai'
			? { kicker: 'Defeat', title: 'The orrery outshines you', body: `Gold holds the chart, ${final}. Wind it once more?` }
			: { kicker: 'Sun wins', title: 'The Sun breaks through', body: `Gold holds the chart, ${final}. Swap seats and go again?` };
	});
</script>

{#if ended}
	<div
		class="overlay"
		class:moon={winner === MOON}
		class:sun={winner === 2}
		class:draw={session.status.type === 'draw'}
		transition:fade={{ duration: 300, delay: 160 }}
	>
		<div class="glow"></div>
		<div class="motes" aria-hidden="true">
			{#each motes as mote (mote.i)}
				<i style:--i={mote.i} style:--x="{mote.x}px" style:--y="{mote.y}px"></i>
			{/each}
		</div>
		<div class="panel" transition:scale={{ start: 0.92, duration: 340, delay: 220 }}>
			<div class="seal" aria-hidden="true"><b></b><i></i></div>
			<p>{copy.kicker}</p>
			<h2>{copy.title}</h2>
			<span>{copy.body}</span>
			<div class="actions">
				<button type="button" class="primary" onclick={() => session.rematch()}>Reset the chart</button>
				<button type="button" onclick={() => session.backToMenu()}>Leave the dome</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		--c: 232, 184, 90;
		position: absolute;
		inset: 0;
		z-index: 9;
		display: grid;
		place-items: end center;
		padding: 0 16px 9vh;
		pointer-events: none;
		overflow: hidden;
	}

	.overlay.moon {
		--c: 170, 192, 240;
	}

	.glow,
	.motes {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.glow {
		background:
			radial-gradient(circle at 50% 46%, rgba(var(--c), 0.2), transparent 45%),
			linear-gradient(180deg, transparent 50%, rgba(6, 6, 18, 0.55));
	}

	.motes i {
		position: absolute;
		left: 50%;
		top: 46%;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: rgb(var(--c));
		box-shadow: 0 0 10px rgba(var(--c), 0.9);
		opacity: 0;
		animation: drift 2.2s ease-out forwards;
		animation-delay: calc(var(--i) * 0.03s);
	}

	.panel {
		position: relative;
		z-index: 1;
		width: min(470px, 100%);
		padding: 26px 24px 20px;
		border-radius: 28px;
		pointer-events: auto;
		text-align: center;
		color: #f1e6cf;
		background: linear-gradient(180deg, rgba(30, 28, 60, 0.96), rgba(12, 12, 28, 0.97));
		border: 1px solid rgba(var(--c), 0.5);
		box-shadow:
			0 20px 50px rgba(0, 0, 0, 0.55),
			0 0 40px rgba(var(--c), 0.18),
			inset 0 1px 0 rgba(255, 240, 200, 0.14);
	}

	.seal {
		position: relative;
		width: 64px;
		height: 64px;
		margin: -58px auto 10px;
		border-radius: 50%;
		overflow: hidden;
		box-shadow:
			0 0 0 3px rgba(12, 12, 28, 0.9),
			0 0 34px rgba(var(--c), 0.8);
	}

	.seal b,
	.seal i {
		position: absolute;
		border-radius: 50%;
	}

	.seal b {
		inset: 0;
		background: radial-gradient(circle at 40% 34%, #fff6d2, #f0c060 50%, #9a6420);
	}

	.seal i {
		inset: 4px -4px -4px 4px;
		background: radial-gradient(circle at 38% 32%, #2a3058, #0c0f24);
		box-shadow: inset 2px 0 0 rgba(220, 230, 250, 0.4);
		animation: cover 1.4s cubic-bezier(0.3, 0.8, 0.3, 1) both;
		animation-delay: 380ms;
	}

	.sun .seal i {
		animation-name: uncover;
	}

	.draw .seal i {
		animation-name: half;
	}

	.panel p {
		margin: 0;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		font-size: 0.68rem;
		color: rgb(var(--c));
	}

	.panel h2 {
		margin: 8px 0 6px;
		font-family: 'Cormorant Garamond', Palatino, serif;
		font-style: italic;
		font-weight: 700;
		font-size: clamp(1.7rem, 4.2vw, 2.3rem);
		color: #fff3cf;
	}

	.panel span {
		display: block;
		color: #c6bfd4;
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
		border: 1px solid rgba(232, 184, 90, 0.3);
		background: rgba(18, 18, 42, 0.7);
		color: inherit;
		font: inherit;
		cursor: pointer;
		padding: 10px 18px;
		border-radius: 999px;
		letter-spacing: 0.06em;
	}

	.actions .primary {
		background: linear-gradient(180deg, #f8e2a2, #d9a24a 55%, #a8701f);
		border-color: transparent;
		color: #1a1224;
		font-weight: 700;
	}

	@keyframes drift {
		0% {
			opacity: 0;
			translate: 0 0;
			scale: 0.4;
		}
		20% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			translate: var(--x) var(--y);
			scale: 1;
		}
	}

	@keyframes cover {
		from {
			translate: 70% -40%;
		}
		to {
			translate: -6% 6%;
		}
	}

	@keyframes uncover {
		from {
			translate: -6% 6%;
		}
		to {
			translate: 90% -60%;
		}
	}

	@keyframes half {
		from {
			translate: 70% -40%;
		}
		to {
			translate: 40% -24%;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.motes i,
		.seal i {
			animation-duration: 1ms;
			animation-delay: 0ms;
		}
	}
</style>
