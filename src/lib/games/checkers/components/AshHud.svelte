<script lang="ts">
	import { openAshSettings } from '../settings.svelte';
	import ArcadeExit from '$lib/components/ArcadeExit.svelte';
	import AshIcon from './AshIcon.svelte';
	import type { AshSession } from '../session.svelte';

	let { session }: { session: AshSession } = $props();

	const p1 = $derived(session.mode === 'ai' ? 'You' : 'Ember');
	const p2 = $derived(session.mode === 'ai' ? 'The Yard' : 'Bone');
	const turn = $derived(session.current === 1 ? p1 : p2);
	const kicker = $derived(
		session.chaining ? 'Keep hopping' : session.mustTake ? 'A take is open' : `${turn} to hop`
	);
	const hint = $derived(
		session.status.type === 'won'
			? `${session.status.winner === 1 ? p1 : p2} holds the yard`
			: session.status.type === 'draw'
				? 'The clay cools even'
				: session.animating
					? 'Cinderfall'
					: session.aiThinking
						? 'The yard is thinking'
						: session.chaining
							? `${turn} — finish the hop`
							: session.mustTake
							? `${turn} — hop or take`
							: session.selected
								? 'Hop a ring, or tap the piece to drop it'
								: `${turn} to hop`
	);

	function bump(score: number) {
		return (node: HTMLElement) => {
			if (!score) return;
			if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
			node.animate([{ transform: 'scale(1.18)' }, { transform: 'scale(1)' }], {
				duration: 240,
				easing: 'ease-out'
			});
		};
	}
</script>

<header class="hud">
	<div class="brand">
		<AshIcon />
		<div class="name">
			<p>Ashcourt</p>
			<small>raku draughts</small>
		</div>
	</div>
	<div class="call">
		<small>{kicker}</small>
		<b>{hint}</b>
	</div>
	<div class="score">
		<span>{p1} <em {@attach bump(session.scores[1])}>{session.scores[1]}</em></span>
		<i>vs</i>
		<span>{p2} <em {@attach bump(session.scores[2])}>{session.scores[2]}</em></span>
	</div>
	<div class="ops">
		<button type="button" onclick={() => openAshSettings()}>Settings</button>
		<button type="button" onclick={() => session.rematch()} disabled={session.animating}>Rematch</button>
		<button type="button" onclick={() => session.backToMenu()}>Menu</button>
		<ArcadeExit tone="ash" />
	</div>
</header>

<style>
	.hud {
		width: min(1400px, 100%);
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto auto;
		gap: 10px;
		align-items: stretch;
		color: #2a221c;
		z-index: 3;
		flex: 0 0 60px;
		height: 60px;
	}

	.brand,
	.call,
	.score,
	.ops button {
		border: 1px solid rgba(158, 27, 42, 0.22);
		background: rgba(255, 250, 242, 0.82);
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
		font-family: 'Cormorant Garamond', Palatino, serif;
		font-style: italic;
		font-weight: 700;
		font-size: 1.12rem;
		line-height: 1.05;
	}

	.name small {
		letter-spacing: 0.14em;
		text-transform: uppercase;
		font-size: 0.6rem;
		color: #9e1b2a;
	}

	.call {
		display: grid;
		align-content: center;
		padding: 8px 16px;
		min-width: 0;
	}

	.call small {
		display: block;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-size: 0.62rem;
		color: #3d6b5c;
		margin-bottom: 2px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.call b {
		font-family: 'Cormorant Garamond', Palatino, serif;
		font-style: italic;
		font-weight: 600;
		font-size: clamp(0.92rem, 2.2vw, 1.28rem);
		line-height: 1.15;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.score {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 14px;
		font-size: 0.82rem;
	}

	.score em {
		font-style: normal;
		font-family: 'Cormorant Garamond', Palatino, serif;
		font-weight: 700;
		font-size: 1.28rem;
		margin-left: 4px;
		color: #9e1b2a;
	}

	.score i {
		font-style: normal;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-size: 0.6rem;
		color: #3d6b5c;
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
		border-color: rgba(158, 27, 42, 0.55);
		background: rgba(255, 255, 255, 0.92);
		color: #5c1c24;
	}

	.ops button:disabled {
		opacity: 0.45;
		cursor: default;
	}

	.ops :global(.exit) {
		align-self: stretch;
		padding-block: 0;
	}

	@media (max-width: 860px) {
		.hud {
			grid-template-columns: 1fr 1fr;
			height: auto;
			flex-basis: auto;
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
	}
</style>
