<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { frostStats, liveStreak, todaysDaily } from '../settings.svelte';
	import { formatPrecise, LEVEL_INFO } from '../types';
	import type { FrostSession } from '../session.svelte';

	let { session }: { session: FrostSession } = $props();

	let peek = $state(false);
	const ended = $derived(session.screen === 'play' && session.ended);
	const won = $derived(session.status.type === 'won');
	const daily = $derived(session.board === 'daily');

	$effect(() => {
		if (!ended) peek = false;
	});

	const flakes = Array.from({ length: 24 }, (_, i) => ({
		i,
		x: ((((i * 47) % 100) / 100 - 0.5) * 380).toFixed(1),
		rise: (160 + ((i * 29) % 140)).toFixed(1),
		hue: (['#ffffff', '#ffe2b8', '#bfeaff', '#ffc2b0'] as const)[i % 4]
	}));

	const copy = $derived.by(() => {
		const name = daily ? 'Dawn survey' : LEVEL_INFO[session.board as keyof typeof LEVEL_INFO].name;
		if (won) {
			const best = daily ? todaysDaily(session.date).ms : frostStats.best[session.board as keyof typeof LEVEL_INFO];
			const streak = liveStreak(session.date || undefined);
			return {
				kicker: session.newBest ? (daily ? "Today's best crossing" : 'A new best crossing') : `${name} · best ${formatPrecise(best)}`,
				title: formatPrecise(session.time),
				body: daily
					? `Today's lake is read end to end.${streak > 1 ? ` That's ${streak} dawns in a row.` : ''} Come back tomorrow for a new one.`
					: 'Every patch of thin ice found and flagged. The sun clears the pines and the frost lets go.'
			};
		}
		return {
			kicker: `${name} · ${Math.round(session.progress * 100)}% of the ice read`,
			title: 'The ice gave way',
			body: 'One soft step and the lake took it. The cracks show where the water was waiting.'
		};
	});
</script>

{#if ended && !peek}
	<div class="overlay" class:won in:fade={{ duration: 280, delay: won ? 900 : 1300 }} out:fade={{ duration: 160 }}>
		<div class="glow"></div>
		{#if won}
			<div class="flurry" aria-hidden="true">
				{#each flakes as f (f.i)}
					<i style:--i={f.i} style:--x="{f.x}px" style:--rise="{f.rise}px" style:--c={f.hue}></i>
				{/each}
			</div>
		{/if}
		<div class="panel" in:scale={{ start: 0.92, duration: 320, delay: won ? 960 : 1360 }}>
			<p>{copy.kicker}</p>
			<h2>{copy.title}</h2>
			<span>{copy.body}</span>
			<div class="actions">
				<button type="button" class="primary" onclick={() => session.restart()}>
					{daily || !won ? 'Try again' : 'Another lake'}
				</button>
				<button type="button" onclick={() => (peek = true)}>Look at the lake</button>
				<button type="button" onclick={() => session.backToMenu()}>Back to shore</button>
			</div>
		</div>
	</div>
{:else if ended && peek}
	<button class="back" type="button" transition:fade={{ duration: 160 }} onclick={() => (peek = false)}>
		{won ? 'Crossed' : 'Gave way'} · show result
	</button>
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
	.flurry {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.glow {
		background: radial-gradient(circle at 50% 46%, rgba(16, 22, 48, 0.55), rgba(16, 22, 48, 0.18) 60%, transparent);
	}

	.won .glow {
		background:
			radial-gradient(circle at 50% 42%, rgba(255, 210, 160, 0.3), transparent 50%),
			radial-gradient(circle at 50% 46%, rgba(16, 22, 48, 0.35), transparent 70%);
	}

	.flurry i {
		position: absolute;
		left: 50%;
		top: 62%;
		width: 8px;
		height: 8px;
		background: var(--c);
		clip-path: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%);
		opacity: 0;
		animation: rise 3.2s ease-out forwards;
		animation-delay: calc(1s + var(--i) * 0.05s);
	}

	.panel {
		position: relative;
		z-index: 1;
		width: min(470px, 100%);
		padding: 24px 24px 20px;
		border-radius: 24px;
		pointer-events: auto;
		text-align: center;
		color: #1d2b47;
		background: linear-gradient(180deg, rgba(250, 253, 255, 0.97), rgba(226, 238, 248, 0.97));
		border: 1px solid rgba(255, 255, 255, 0.9);
		box-shadow:
			0 18px 50px rgba(16, 22, 48, 0.4),
			0 0 40px rgba(255, 190, 160, 0.25),
			inset 0 1px 0 #fff;
	}

	.panel p {
		margin: 0;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		font-size: 0.66rem;
		font-weight: 700;
		color: #2f7fb0;
	}

	.panel h2 {
		margin: 8px 0 6px;
		font-family: 'Josefin Sans', ui-sans-serif, system-ui, sans-serif;
		font-weight: 600;
		font-size: clamp(1.9rem, 5vw, 2.6rem);
		font-variant-numeric: tabular-nums;
	}

	.panel span {
		display: block;
		color: #4d5f7a;
		line-height: 1.45;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 8px;
		margin-top: 18px;
	}

	.actions button,
	.back {
		appearance: none;
		border: 1px solid rgba(47, 127, 176, 0.25);
		background: rgba(255, 255, 255, 0.7);
		color: inherit;
		font: inherit;
		font-weight: 600;
		cursor: pointer;
		padding: 10px 16px;
		border-radius: 999px;
		letter-spacing: 0.02em;
	}

	.actions .primary {
		background: linear-gradient(180deg, #ff9a6e, #e8573a);
		border-color: transparent;
		color: #fff8f2;
		font-weight: 800;
	}

	.back {
		position: absolute;
		z-index: 9;
		left: 50%;
		bottom: max(16px, env(safe-area-inset-bottom));
		translate: -50% 0;
		color: #1d2b47;
		background: rgba(250, 253, 255, 0.92);
		box-shadow: 0 10px 24px rgba(16, 22, 48, 0.3);
	}

	@keyframes rise {
		0% {
			opacity: 0;
			translate: 0 0;
			scale: 0.4;
			rotate: 0deg;
		}
		20% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			translate: var(--x) calc(var(--rise) * -1);
			scale: 1;
			rotate: 200deg;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.flurry i {
			animation: none;
			opacity: 0;
		}
	}
</style>
