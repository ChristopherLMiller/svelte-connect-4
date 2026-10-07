<script lang="ts">
	import type { ChessSession } from '../session.svelte';

	let { session, resultHidden, onshow }: { session: ChessSession; resultHidden: boolean; onshow: () => void } = $props();

	let confirming = $state(false);
	let timer: number | null = null;

	const playing = $derived(session.screen === 'play' && !session.outcome);
	const hotseat = $derived(session.mode === 'hotseat');
	const incoming = $derived(hotseat && session.offer !== null && session.offer !== session.turn);
	const pending = $derived(session.offer !== null && !incoming);

	function resign() {
		if (!confirming) {
			confirming = true;
			if (timer !== null) window.clearTimeout(timer);
			timer = window.setTimeout(() => (confirming = false), 3200);
			return;
		}
		confirming = false;
		session.resign();
	}

	$effect(() => {
		if (!playing) confirming = false;
	});
</script>

<div class="bar">
	{#if incoming}
		<p class="offer">{session.offer === 'w' ? 'White' : 'Black'} offers a draw</p>
		<button class="gold" onclick={() => session.answerOffer(true)}>Accept</button>
		<button onclick={() => session.answerOffer(false)}>Decline</button>
	{:else if playing}
		<button onclick={() => session.flip()} aria-label="Flip board (F)">Flip</button>
		{#if session.claim}
			<button class="gold" disabled={!session.canInput} onclick={() => session.claimDraw()}>
				Claim draw · {session.claim === 'threefold' ? 'repetition' : '50 moves'}
			</button>
		{:else}
			<button disabled={pending || session.records.length < 2} onclick={() => session.offerDraw()}>{pending ? 'Draw offered' : 'Offer draw'}</button>
		{/if}
		<button class="danger" class:confirm={confirming} onclick={resign}>{confirming ? 'Really resign?' : 'Resign'}</button>
	{:else if session.outcome && !session.review}
		<button onclick={() => session.flip()}>Flip</button>
		{#if resultHidden}
			<button onclick={onshow}>Result</button>
		{/if}
		{#if session.records.length}
			<button onclick={() => void session.startReview()}>Review</button>
		{/if}
		<button class="gold" onclick={() => session.rematch()}>Rematch</button>
	{:else}
		<button onclick={() => session.flip()}>Flip</button>
		<button class="gold" onclick={() => session.rematch()}>Rematch</button>
	{/if}
</div>

<style>
	.bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
	}

	.offer {
		margin: 0 auto 0 4px;
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-weight: 700;
		font-size: 1.08rem;
		color: #ecc874;
	}

	button {
		flex: 1 1 auto;
		appearance: none;
		border: 1px solid rgba(217, 178, 94, 0.26);
		background: linear-gradient(180deg, rgba(40, 22, 15, 0.92), rgba(16, 9, 6, 0.94));
		color: #f3e7cf;
		border-radius: 8px;
		padding: 9px 12px;
		font: inherit;
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-size: 0.66rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		cursor: pointer;
		box-shadow: 0 6px 14px rgba(0, 0, 0, 0.35);
		transition:
			border-color 140ms ease,
			background 140ms ease;
		white-space: nowrap;
	}

	.gold {
		border-color: transparent;
		background: linear-gradient(180deg, #f2d27e, #b8862e);
		color: #1c1107;
	}

	.danger.confirm {
		border-color: #e0605a;
		background: linear-gradient(180deg, #8a2a22, #4a120e);
	}

	button:disabled {
		opacity: 0.4;
		cursor: default;
	}

	@media (hover: hover) {
		button:not(:disabled):not(.gold):hover {
			border-color: #d9b25e;
		}

		.danger:not(.confirm):hover {
			border-color: #e0605a !important;
		}
	}
</style>
