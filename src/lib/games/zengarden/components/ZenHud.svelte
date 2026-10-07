<script lang="ts">
	import ArcadeExit from '$lib/components/ArcadeExit.svelte';
	import ZenIcon from './ZenIcon.svelte';
	import { openZenSettings, zenView } from '../settings.svelte';
	import { GARDEN_INFO, SLATE, nameOf, opponent } from '../types';
	import type { ZenSession } from '../session.svelte';

	let { session }: { session: ZenSession } = $props();

	const p1 = $derived(session.mode === 'ai' ? 'You' : 'Slate');
	const p2 = $derived(nameOf(2, session.mode));

	const kicker = $derived(
		session.status.type !== 'playing'
			? 'The garden is still'
			: session.mode === 'ai'
				? session.current === SLATE
					? 'Your stone · slate'
					: 'The Monk · quartz'
				: `${nameOf(session.current, session.mode)} to play`
	);

	const hint = $derived.by(() => {
		const status = session.status;
		if (status.type === 'won') {
			if (session.mode === 'ai') return status.winner === SLATE ? 'Five in a line. The garden is yours' : 'The Monk lays five in a line';
			return `${nameOf(status.winner, session.mode)} lays five in a line`;
		}
		if (status.type === 'draw') return 'The bed is full. A quiet draw';
		if (session.animating) return 'The stone settles…';
		if (session.aiThinking) return 'The Monk considers the gravel';
		if (zenView.warn) {
			const rival = opponent(session.current);
			if (session.threats[session.current].length) return session.mode === 'ai' ? 'A gold ring: five is waiting for you' : 'A gold ring: five is waiting';
			if (session.threats[rival].length) {
				const who = session.mode === 'ai' ? 'The Monk' : nameOf(rival, session.mode);
				return `Block the red ring: ${who} has four`;
			}
		}
		if (session.mode === 'ai') return 'Set a stone where the lines cross';
		return `${nameOf(session.current, session.mode)}, set a stone where the lines cross`;
	});

	const moveNo = $derived(session.moves.length);
</script>

<header class="hud">
	<div class="brand">
		<ZenIcon />
		<div class="name">
			<p>Zen Garden</p>
			<small>{GARDEN_INFO[session.garden].name} · {GARDEN_INFO[session.garden].tag}</small>
		</div>
	</div>
	<div class="call" class:quartz={session.current === 2}>
		<small>{kicker}</small>
		<b>{hint}</b>
	</div>
	<div class="turn" aria-label="Stone {moveNo}">
		<span class="stone one" class:now={session.current === 1 && session.status.type === 'playing'}><i></i><span>{p1}</span></span>
		<em>{moveNo}</em>
		<span class="stone two" class:now={session.current === 2 && session.status.type === 'playing'}><span>{p2}</span><i></i></span>
	</div>
	<div class="score">
		<span>{p1} <em>{session.scores[1]}</em></span>
		<i>vs</i>
		<span>{p2} <em>{session.scores[2]}</em></span>
	</div>
	<div class="ops">
		<button type="button" onclick={() => openZenSettings()}>Settings</button>
		<button type="button" disabled={!session.canUndo} onclick={() => session.undo()}>Rake back</button>
		<button type="button" onclick={() => session.rematch()}>New game</button>
		<button type="button" onclick={() => session.backToMenu()}>Menu</button>
		<ArcadeExit tone="zen" />
	</div>
</header>

<style>
	.hud {
		width: min(1400px, 100%);
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto auto auto;
		gap: 10px;
		align-items: stretch;
		color: #2b2622;
		z-index: 3;
		flex: 0 0 60px;
		height: 60px;
	}

	.brand,
	.call,
	.turn,
	.score,
	.ops button {
		border: 1px solid rgba(60, 40, 25, 0.22);
		background: linear-gradient(180deg, rgba(252, 248, 239, 0.94), rgba(238, 229, 212, 0.94));
		border-radius: 8px;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.7),
			0 8px 18px rgba(40, 25, 10, 0.22);
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
		font-family: 'Shippori Mincho', Georgia, serif;
		font-weight: 800;
		font-size: 1.22rem;
		line-height: 1.05;
	}

	.name small {
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-size: 0.58rem;
		font-weight: 700;
		color: #b22a18;
	}

	.call {
		display: grid;
		align-content: center;
		padding: 6px 16px 6px 13px;
		min-width: 0;
		border-left: 4px solid #3d4a57;
		transition: border-color 300ms ease;
	}

	.call.quartz {
		border-left-color: #c9a560;
	}

	.call small {
		display: block;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-size: 0.6rem;
		font-weight: 700;
		color: #b22a18;
		margin-bottom: 1px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.call b {
		font-family: 'Shippori Mincho', Georgia, serif;
		font-weight: 700;
		font-size: clamp(1rem, 2.1vw, 1.18rem);
		line-height: 1.15;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.turn {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 0 14px;
		font-size: 0.8rem;
		font-weight: 700;
	}

	.turn em {
		font-style: normal;
		font-family: 'Shippori Mincho', Georgia, serif;
		font-size: 1.3rem;
		min-width: 1.6em;
		text-align: center;
		color: #6b5f52;
		font-variant-numeric: tabular-nums;
	}

	.stone {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		opacity: 0.5;
		transition: opacity 200ms ease;
	}

	.stone.now {
		opacity: 1;
	}

	.stone i {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		flex-shrink: 0;
		box-shadow: 0 2px 3px rgba(40, 25, 10, 0.35);
	}

	.one i {
		background: radial-gradient(circle at 35% 30%, #8a95a2, #3b424b 45%, #0b0d10);
	}

	.two i {
		background: radial-gradient(circle at 35% 30%, #fff, #efe8da 50%, #b3a892);
	}

	.stone.now i {
		animation: breathe 1.8s ease-in-out infinite;
	}

	.score {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 14px;
		font-size: 0.85rem;
		font-weight: 700;
	}

	.score em {
		font-style: normal;
		font-weight: 800;
		font-size: 1.25rem;
		margin-left: 3px;
		color: #b22a18;
	}

	.score i {
		font-style: normal;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-size: 0.6rem;
		color: #6b5f52;
	}

	.ops {
		display: flex;
		justify-content: flex-end;
		align-items: stretch;
		gap: 8px;
	}

	.ops button {
		appearance: none;
		color: inherit;
		cursor: pointer;
		padding: 0 13px;
		font: inherit;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		display: grid;
		place-items: center;
		transition:
			border-color 160ms ease,
			opacity 160ms ease;
	}

	.ops button:disabled {
		opacity: 0.45;
		cursor: default;
	}

	@media (hover: hover) {
		.ops button:not(:disabled):hover {
			border-color: #c8321f;
		}
	}

	.ops :global(.exit) {
		align-self: stretch;
		padding-block: 0;
	}

	@keyframes breathe {
		50% {
			scale: 1.15;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.stone.now i {
			animation: none;
		}
	}

	@media (max-width: 1180px) {
		.score {
			display: none;
		}
	}

	@media (max-width: 1000px) {
		.hud {
			grid-template-columns: auto auto minmax(0, 1fr);
			grid-template-areas: 'brand turn ops' 'call call call';
			height: auto;
			flex-basis: auto;
			gap: 8px;
		}

		.brand {
			grid-area: brand;
		}

		.turn {
			grid-area: turn;
		}

		.ops {
			grid-area: ops;
		}

		.call {
			grid-area: call;
			padding-block: 5px;
		}

		.name {
			display: none;
		}

		.brand {
			padding: 4px;
		}

		.ops button {
			padding: 9px 10px;
			letter-spacing: 0.08em;
		}
	}

	@media (max-width: 1000px) and (min-width: 641px) {
		.stone span {
			display: none;
		}
	}

	@media (max-width: 640px) {
		.hud {
			grid-template-columns: auto minmax(0, 1fr);
			grid-template-areas: 'brand turn' 'call call' 'ops ops';
		}

		.turn {
			justify-content: center;
		}

		.ops {
			justify-content: center;
		}
	}

	@media (max-width: 520px) {
		.brand {
			padding: 4px 10px 4px 4px;
			gap: 8px;
		}

		.name p {
			font-size: 1.05rem;
		}

		.turn {
			padding: 0 10px;
			gap: 6px;
			font-size: 0.72rem;
		}

		.ops {
			gap: 5px;
		}

		.ops button {
			padding: 8px 8px;
			font-size: 0.6rem;
			letter-spacing: 0.05em;
		}

		.ops :global(.exit) {
			display: none;
		}
	}
</style>
