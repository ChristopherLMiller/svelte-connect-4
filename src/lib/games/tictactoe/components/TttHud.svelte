<script lang="ts">
	import { openTttSettings } from '../settings.svelte';
	import ArcadeExit from '$lib/components/ArcadeExit.svelte';
	import TttIcon from './TttIcon.svelte';
	import type { TttSession } from '../session.svelte';

	let { session }: { session: TttSession } = $props();

	const p1 = $derived(session.mode === 'ai' ? 'You' : 'Cross');
	const p2 = $derived(session.mode === 'ai' ? 'The Tide' : 'Loop');
	const turn = $derived(session.current === 1 ? p1 : p2);
	const hint = $derived(
		session.washing
			? 'The water takes the board'
			: session.gridHidden
				? 'Smooth sand'
				: session.sketching
					? 'Scratching the grid'
					: session.status.type === 'won'
						? `${session.status.winner === 1 ? p1 : p2} made three`
						: session.status.type === 'draw'
							? 'The square is full'
							: session.aiThinking
								? 'The tide is thinking'
								: `${turn} to scratch`
	);
</script>

<header class="hud">
	<div class="brand">
		<TttIcon />
		<div class="name">
			<p>Tide & Cross</p>
			<small>in the wet sand</small>
		</div>
	</div>
	<div class="call">
		<b>{hint}</b>
	</div>
	<div class="score">
		<span>{p1} <em>{session.scores[1]}</em></span>
		<i>vs</i>
		<span>{p2} <em>{session.scores[2]}</em></span>
	</div>
	<div class="ops">
		<button type="button" onclick={() => openTttSettings()}>Settings</button>
		<button type="button" onclick={() => session.rematch()} disabled={session.washing || session.sketching || session.gridHidden}>
			Rematch
		</button>
		<button type="button" onclick={() => session.backToMenu()}>Menu</button>
		<ArcadeExit tone="shore" />
	</div>
</header>

<style>
	.hud {
		width: min(920px, 100%);
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto auto;
		gap: 10px;
		align-items: stretch;
		color: #3b2a1c;
		z-index: 3;
		flex: 0 0 auto;
		min-height: 60px;
	}

	.brand,
	.call,
	.score,
	.ops button {
		border: 1px solid rgba(90, 64, 42, 0.16);
		background: rgba(255, 248, 236, 0.55);
		backdrop-filter: blur(10px);
		border-radius: 16px;
	}

	.brand {
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: center;
		gap: 10px;
		padding: 6px 14px 6px 8px;
		text-align: left;
	}

	.name p {
		margin: 0;
		font-family: Fraunces, Georgia, serif;
		font-style: italic;
		font-size: 1.05rem;
		line-height: 1;
	}

	.name small {
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-size: 0.62rem;
		color: #1d6d86;
	}

	.call {
		display: grid;
		place-items: center;
		padding: 8px 14px;
	}

	.call b {
		font-family: Fraunces, Georgia, serif;
		font-style: italic;
		font-weight: 600;
		font-size: clamp(1rem, 2.4vw, 1.35rem);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}

	.score {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		font-size: 0.82rem;
	}

	.score em {
		font-style: normal;
		font-weight: 700;
		margin-left: 4px;
	}

	.score i {
		font-style: normal;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-size: 0.62rem;
		color: #1d6d86;
	}

	.ops {
		display: flex;
		justify-content: flex-end;
		align-items: stretch;
		gap: 8px;
		flex-wrap: nowrap;
	}

	.ops button {
		appearance: none;
		color: inherit;
		cursor: pointer;
		padding: 0 16px;
		font: inherit;
		font-size: 0.72rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		display: grid;
		place-items: center;
		transition:
			border-color 160ms ease,
			background 160ms ease,
			color 160ms ease;
	}

	.ops button:hover:not(:disabled) {
		border-color: rgba(29, 109, 134, 0.5);
		background: rgba(255, 248, 236, 0.88);
		color: #15586c;
	}

	.ops button:disabled {
		opacity: 0.45;
		cursor: default;
	}

	.ops :global(.exit) {
		align-self: stretch;
		padding-block: 0;
	}

	@media (max-width: 820px) {
		.hud {
			grid-template-columns: 1fr 1fr;
		}

		.call,
		.ops {
			grid-column: 1 / -1;
		}

		.ops {
			justify-content: center;
		}

		.ops button {
			padding: 10px 14px;
		}

		.ops button {
			padding: 10px 14px;
		}
	}
</style>
