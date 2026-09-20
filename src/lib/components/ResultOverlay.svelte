<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import VictoryFx from '$lib/components/VictoryFx.svelte';
	import type { GameSession } from '$lib/game/session.svelte';

	let { session }: { session: GameSession } = $props();

	const ended = $derived(session.status.type !== 'playing');
	const winner = $derived(session.status.type === 'won' ? session.status.winner : 1);
	const mode = $derived(session.status.type === 'draw' ? 'draw' : 'win');
	const copy = $derived.by(() => {
		if (session.status.type === 'draw') {
			return {
				kicker: 'Stalemate',
				title: 'The grid is saturated',
				body: 'Forty-two cells. Zero four-in-a-rows. Beautiful waste.'
			};
		}
		if (session.status.type === 'won' && session.status.winner === 1) {
			return {
				kicker: session.mode === 'ai' ? 'Human victory' : 'Crimson claims it',
				title: session.mode === 'ai' ? 'You outplayed the core' : 'Four on the line',
				body: 'The bounce, the block, the finish. That is the whole sport.'
			};
		}
		return {
			kicker: session.mode === 'ai' ? 'Core victory' : 'Gold strikes four',
			title: session.mode === 'ai' ? 'The machine saw it coming' : 'The line is theirs',
			body: session.mode === 'ai' ? 'Minimax does not blink. Rematch?' : 'Pass the device. Rewrite history.'
		};
	});
</script>

{#if ended}
	<div
		class={['overlay', mode, { p1: mode === 'win' && winner === 1, p2: mode === 'win' && winner === 2 }]}
		transition:fade={{ duration: 220 }}
	>
		<div class="bloom"></div>
		<div class="scan"></div>
		<div class="sweep"></div>
		<VictoryFx {mode} {winner} />
		<div class="panel" transition:scale={{ start: 0.92, duration: 280 }}>
			<i class="tick tl"></i>
			<i class="tick tr"></i>
			<i class="tick bl"></i>
			<i class="tick br"></i>
			<p>{copy.kicker}</p>
			<h2>{copy.title}</h2>
			<span>{copy.body}</span>
			<div class="actions">
				<button class="primary" onclick={() => session.resetRound()}>Rematch</button>
				<button onclick={() => session.backToMenu()}>Change mode</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 8;
		display: grid;
		place-items: end center;
		padding: 0 16px 28px;
		pointer-events: none;
		overflow: hidden;
	}

	.bloom,
	.scan,
	.sweep {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.bloom {
		background: radial-gradient(circle at 50% 38%, rgba(92, 225, 230, 0.2), transparent 58%);
		animation: bloom 1.1s ease-out forwards;
	}

	.p1 .bloom {
		background: radial-gradient(circle at 50% 38%, rgba(255, 51, 92, 0.28), transparent 58%);
	}

	.p2 .bloom {
		background: radial-gradient(circle at 50% 38%, rgba(245, 194, 75, 0.26), transparent 58%);
	}

	.draw .bloom {
		background: radial-gradient(circle at 50% 50%, rgba(139, 124, 255, 0.16), transparent 62%);
	}

	.scan {
		background: repeating-linear-gradient(
			180deg,
			transparent 0 3px,
			rgba(8, 10, 18, 0.12) 3px 4px
		);
		opacity: 0.4;
	}

	.sweep {
		background: linear-gradient(
			180deg,
			transparent 0%,
			rgba(92, 225, 230, 0.14) 48%,
			rgba(255, 255, 255, 0.22) 50%,
			rgba(92, 225, 230, 0.14) 52%,
			transparent 100%
		);
		animation: sweep 1.1s ease-out forwards;
	}

	.p1 .sweep {
		background: linear-gradient(
			180deg,
			transparent 0%,
			rgba(255, 51, 92, 0.16) 48%,
			rgba(255, 255, 255, 0.3) 50%,
			rgba(255, 51, 92, 0.16) 52%,
			transparent 100%
		);
	}

	.p2 .sweep {
		background: linear-gradient(
			180deg,
			transparent 0%,
			rgba(245, 194, 75, 0.16) 48%,
			rgba(255, 255, 255, 0.3) 50%,
			rgba(245, 194, 75, 0.16) 52%,
			transparent 100%
		);
	}

	.panel {
		width: min(460px, 100%);
		text-align: center;
		padding: 28px 24px 24px;
		border-radius: 18px;
		background: rgba(8, 10, 18, 0.9);
		border: 1px solid rgba(92, 225, 230, 0.35);
		box-shadow:
			var(--shadow),
			0 0 40px rgba(92, 225, 230, 0.16);
		position: relative;
		pointer-events: auto;
	}

	.p1 .panel {
		border-color: rgba(255, 51, 92, 0.45);
		box-shadow:
			var(--shadow),
			0 0 42px rgba(255, 51, 92, 0.22);
	}

	.p2 .panel {
		border-color: rgba(245, 194, 75, 0.45);
		box-shadow:
			var(--shadow),
			0 0 42px rgba(245, 194, 75, 0.2);
	}

	.tick {
		position: absolute;
		width: 16px;
		height: 16px;
		border: 2px solid var(--cyan);
		pointer-events: none;
	}

	.p1 .tick {
		border-color: var(--crimson);
	}

	.p2 .tick {
		border-color: var(--gold);
	}

	.tl {
		top: 8px;
		left: 8px;
		border-right: 0;
		border-bottom: 0;
	}

	.tr {
		top: 8px;
		right: 8px;
		border-left: 0;
		border-bottom: 0;
	}

	.bl {
		bottom: 8px;
		left: 8px;
		border-right: 0;
		border-top: 0;
	}

	.br {
		bottom: 8px;
		right: 8px;
		border-left: 0;
		border-top: 0;
	}

	p {
		margin: 0 0 8px;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		font-size: 0.72rem;
		color: var(--cyan);
		font-family: var(--font-display);
	}

	h2 {
		margin: 0 0 12px;
		font-family: var(--font-display);
		font-size: clamp(1.8rem, 6vw, 2.5rem);
		line-height: 1.05;
		background: linear-gradient(90deg, #fff, #5ce1e6, #ff335c, #fff);
		background-size: 220% 100%;
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		animation: sheen 3s linear infinite;
	}

	@keyframes sheen {
		to {
			background-position: 220% 0;
		}
	}

	@keyframes bloom {
		from {
			opacity: 0.15;
		}
		25% {
			opacity: 0.85;
		}
		to {
			opacity: 0.4;
		}
	}

	@keyframes sweep {
		from {
			translate: 0 -100%;
			opacity: 0.2;
		}
		to {
			translate: 0 100%;
			opacity: 0;
		}
	}

	span {
		display: block;
		color: var(--muted);
		line-height: 1.55;
	}

	.actions {
		display: flex;
		justify-content: center;
		gap: 10px;
		margin-top: 24px;
		flex-wrap: wrap;
	}

	button {
		border: 1px solid var(--line);
		background: transparent;
		border-radius: 999px;
		padding: 11px 18px;
		cursor: pointer;
	}

	.primary {
		background: linear-gradient(180deg, #ffe38a, #f5c24b 50%, #e08a1a);
		color: #2a1600;
		border: 0;
		font-weight: 700;
	}

	@media (prefers-reduced-motion: reduce) {
		.bloom,
		.sweep,
		h2 {
			animation: none;
		}
	}
</style>
