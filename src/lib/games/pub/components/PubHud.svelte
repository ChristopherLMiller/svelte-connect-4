<script lang="ts">
	import ArcadeExit from '$lib/components/ArcadeExit.svelte';
	import PubIcon from './PubIcon.svelte';
	import { pubPanelControls } from '../settings.svelte';
	import { DIFFICULTY_INFO, VARIANT_INFO } from '../types';
	import type { PubSession } from '../session.svelte';

	let { session, ledgerOpen, onledger }: { session: PubSession; ledgerOpen: boolean; onledger: () => void } = $props();

	const sub = $derived(
		session.mode === 'ai' ? `${DIFFICULTY_INFO[session.difficulty].line} · hand ${session.state?.handNo ?? 0}` : `Pass and play · hand ${session.state?.handNo ?? 0}`
	);
</script>

<header class="hud">
	<div class="brand">
		<PubIcon />
		<div class="name">
			<p>{VARIANT_INFO[session.variant].title}</p>
			<small>{sub}</small>
		</div>
	</div>
	<div class="ops">
		<button type="button" class="ledger-toggle" aria-pressed={ledgerOpen} onclick={onledger}>Scores</button>
		<button type="button" onclick={() => pubPanelControls.openGuide()}>Rules</button>
		<button type="button" onclick={() => pubPanelControls.openSettings()}>Settings</button>
		<button type="button" onclick={() => session.rematch()}>New game</button>
		<button type="button" onclick={() => session.backToMenu()}>Menu</button>
		<ArcadeExit tone="tavern" />
	</div>
</header>

<style>
	.hud {
		width: min(1400px, 100%);
		display: flex;
		justify-content: space-between;
		gap: 10px;
		align-items: stretch;
		flex: 0 0 auto;
		color: #f4e6c8;
		z-index: 3;
	}

	.brand,
	.ops button {
		border: 1px solid rgba(224, 165, 72, 0.3);
		background: linear-gradient(180deg, rgba(44, 29, 17, 0.92), rgba(20, 13, 7, 0.94));
		border-radius: 14px;
		box-shadow: 0 8px 18px rgba(0, 0, 0, 0.35);
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 6px 16px 6px 8px;
		min-width: 0;
	}

	.name {
		min-width: 0;
	}

	.name p {
		margin: 0;
		font: 700 1.2rem 'Playfair Display SC', Georgia, serif;
		color: #ffc46a;
		line-height: 1.05;
	}

	.name small {
		display: block;
		font-size: 0.7rem;
		letter-spacing: 0.08em;
		color: #bfa985;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.ops {
		display: flex;
		align-items: stretch;
		gap: 8px;
	}

	.ops button {
		appearance: none;
		color: inherit;
		cursor: pointer;
		padding: 0 14px;
		min-height: 44px;
		font: inherit;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		transition: border-color 160ms ease;
	}

	.ops button[aria-pressed='true'] {
		border-color: #e0a548;
		color: #ffd48a;
	}

	.ledger-toggle {
		display: none;
	}

	@media (hover: hover) {
		.ops button:hover {
			border-color: #e0a548;
		}
	}

	.ops :global(.exit) {
		align-self: stretch;
		padding-block: 0;
	}

	@media (max-width: 1099px), (max-aspect-ratio: 5/4) {
		.ledger-toggle {
			display: block;
		}
	}

	@media (max-width: 760px) {
		.hud {
			flex-wrap: wrap;
		}

		.brand {
			flex: 1 1 auto;
		}

		.ops {
			flex: 1 1 100%;
			justify-content: center;
			gap: 5px;
		}

		.ops button {
			padding: 0 9px;
			min-height: 38px;
			font-size: 0.62rem;
			letter-spacing: 0.06em;
		}

		.ops :global(.exit) {
			display: none;
		}
	}
</style>
