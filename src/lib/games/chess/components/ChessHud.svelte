<script lang="ts">
	import ArcadeExit from '$lib/components/ArcadeExit.svelte';
	import ChessIcon from './ChessIcon.svelte';
	import { REASON_TEXT, type ChessSession } from '../session.svelte';
	import { chessPanels } from '../settings.svelte';
	import { TIME_INFO } from '../types';

	let { session }: { session: ChessSession } = $props();

	const ai = $derived(session.mode === 'ai');

	const kicker = $derived.by(() => {
		if (session.opening) return session.opening;
		if (!session.records.length) return ai ? `${TIME_INFO[session.time].name} · vs ${session.opponent.name}` : `${TIME_INFO[session.time].name} · hotseat`;
		return 'Off the book';
	});

	const status = $derived.by(() => {
		if (session.review) return 'Reviewing the game';
		const o = session.outcome;
		if (o) {
			if (o.winner === 0) return `Drawn · ${REASON_TEXT[o.reason]}`;
			const who = ai ? (session.verdict === 'won' ? 'You win' : `${session.opponent.name} wins`) : o.winner === 1 ? 'White wins' : 'Black wins';
			return `${who} · ${REASON_TEXT[o.reason]}`;
		}
		if (session.note) return session.note;
		if (!session.live) return `Looking back at move ${Math.ceil(session.shownPly / 2) || 0} · tap the board to return`;
		if (session.promotion) return 'Choose a piece to promote to';
		if (session.aiThinking) return `${session.opponent.name} is thinking…`;
		const check = session.lastMove?.check;
		if (ai) {
			if (session.turn !== session.human) return `${session.opponent.name} to move`;
			return check ? 'Check! Your move' : 'Your move';
		}
		const side = session.turn === 'w' ? 'White' : 'Black';
		return check ? `${side} is in check` : `${side} to move`;
	});

	const tone = $derived(session.outcome ? (session.verdict ?? 'draw') : session.turn);
</script>

<header class="hud">
	<div class="brand">
		<ChessIcon />
		<div class="name">
			<p>Chess</p>
			<small>The Grand Hall</small>
		</div>
	</div>
	<div class="call {tone}" aria-live="polite">
		<small>{kicker}</small>
		<b>{status}</b>
	</div>
	<div class="ops">
		<button type="button" onclick={() => chessPanels.openSettings()}>Settings</button>
		<button type="button" onclick={() => chessPanels.openGuide()}>Rules</button>
		<button type="button" onclick={() => session.backToMenu()}>Menu</button>
		<ArcadeExit tone="regal" />
	</div>
</header>

<style>
	.hud {
		width: min(1400px, 100%);
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		gap: 10px;
		align-items: stretch;
		color: #f3e7cf;
		z-index: 3;
		flex: 0 0 56px;
		height: 56px;
	}

	.brand,
	.call,
	.ops button {
		border: 1px solid rgba(217, 178, 94, 0.24);
		background: linear-gradient(180deg, rgba(40, 22, 15, 0.9), rgba(16, 9, 6, 0.92));
		border-radius: 10px;
		box-shadow:
			inset 0 1px 0 rgba(255, 226, 170, 0.07),
			0 8px 18px rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(4px);
	}

	.brand {
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: center;
		gap: 10px;
		padding: 6px 14px 6px 8px;
	}

	.name p {
		margin: 0;
		font-family: 'Cinzel', Georgia, serif;
		font-weight: 600;
		font-size: 1.2rem;
		line-height: 1.05;
		letter-spacing: 0.06em;
	}

	.name small {
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-size: 0.56rem;
		font-weight: 700;
		color: #d9b25e;
	}

	.call {
		display: grid;
		align-content: center;
		padding: 6px 16px 6px 13px;
		min-width: 0;
		border-left: 4px solid #f3e7cf;
		transition: border-color 300ms ease;
	}

	.call.b {
		border-left-color: #6b5648;
	}

	.call.won {
		border-left-color: #ecc874;
	}

	.call.lost {
		border-left-color: #8a96b0;
	}

	.call.draw {
		border-left-color: #b39a7a;
	}

	.call small {
		display: block;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		font-size: 0.6rem;
		font-weight: 700;
		color: #d9b25e;
		margin-bottom: 1px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.call b {
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-weight: 700;
		font-size: clamp(1.04rem, 2.1vw, 1.26rem);
		line-height: 1.15;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
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
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		display: grid;
		place-items: center;
		transition: border-color 160ms ease;
	}

	@media (hover: hover) {
		.ops button:hover {
			border-color: #d9b25e;
		}
	}

	.ops :global(.exit) {
		align-self: stretch;
		padding-block: 0;
	}

	@media (max-width: 1100px) {
		.name {
			display: none;
		}

		.brand {
			padding: 4px;
		}
	}

	@media (max-width: 760px) {
		.hud {
			grid-template-columns: auto minmax(0, 1fr);
			grid-template-areas: 'brand ops' 'call call';
			height: auto;
			flex-basis: auto;
			gap: 6px;
		}

		.brand {
			grid-area: brand;
		}

		.ops {
			grid-area: ops;
			gap: 5px;
		}

		.call {
			grid-area: call;
			padding-block: 4px;
		}

		.ops button {
			padding: 8px 9px;
			font-size: 0.62rem;
			letter-spacing: 0.06em;
		}
	}

	@media (max-width: 420px) {
		.ops :global(.exit) {
			display: none;
		}
	}
</style>
