<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import OpponentSeal from './OpponentSeal.svelte';
	import { REASON_TEXT, type ChessSession } from '../session.svelte';
	import { chessView, persistChessView } from '../settings.svelte';
	import { OPPONENTS } from '../types';

	let { session, onhide }: { session: ChessSession; onhide: () => void } = $props();

	let copied = $state(false);

	const o = $derived(session.outcome!);
	const ai = $derived(session.mode === 'ai');
	const opp = $derived(session.opponent);
	const verdict = $derived(session.verdict);

	const title = $derived.by(() => {
		if (verdict === 'draw') return 'Drawn';
		if (!ai) return o.winner === 1 ? 'White wins' : 'Black wins';
		return verdict === 'won' ? 'Victory' : 'Defeat';
	});

	const line = $derived.by(() => {
		const reason = o.reason;
		if (verdict === 'draw') return REASON_TEXT[reason];
		const loser = o.winner === 1 ? 'b' : 'w';
		if (!ai) {
			if (reason === 'checkmate') return 'Checkmate';
			if (reason === 'resign') return `${loser === 'w' ? 'White' : 'Black'} resigns`;
			return `${loser === 'w' ? "White's" : "Black's"} flag fell`;
		}
		if (verdict === 'won') {
			if (reason === 'checkmate') return `Checkmate. ${opp.name} bows to you.`;
			if (reason === 'resign') return `${opp.name} tips over the king.`;
			return `${opp.name}'s flag fell.`;
		}
		if (reason === 'checkmate') return `Checkmate. ${opp.name} takes the game.`;
		if (reason === 'resign') return 'You resigned.';
		return 'Your flag fell.';
	});

	const record = $derived(ai ? chessView.records[opp.id] : null);
	const next = $derived.by(() => {
		if (!ai || verdict !== 'won' || !record || record.w !== 1) return null;
		const i = OPPONENTS.findIndex((x) => x.id === opp.id);
		return OPPONENTS[i + 1] ?? null;
	});

	async function copy() {
		try {
			await navigator.clipboard.writeText(session.pgn());
			copied = true;
			window.setTimeout(() => (copied = false), 1600);
		} catch {
			copied = false;
		}
	}

	function challenge() {
		if (!next) return;
		chessView.opponent = next.id;
		persistChessView();
		session.start('ai', next.id, session.human, session.time);
	}
</script>

<div class="veil" transition:fade={{ duration: 260 }}>
	<div class="card {verdict}" in:fly={{ y: 16, duration: 420, delay: 520 }} role="dialog" aria-label={title}>
		{#if ai}
			<OpponentSeal opponent={opp} size={54} />
		{/if}
		<h2>{title}</h2>
		<p class="line">{line}</p>
		<p class="meta">
			{#if session.records.length}{Math.ceil(session.records.length / 2)} {Math.ceil(session.records.length / 2) === 1 ? 'move' : 'moves'}{:else}No moves{/if}{#if session.opening}&nbsp;· {session.opening}{/if}
		</p>
		{#if record}
			<p class="record">Against {opp.name}: <b>{record.w}</b> won · <b>{record.d}</b> drawn · <b>{record.l}</b> lost</p>
		{/if}
		{#if next}
			<button class="next" onclick={challenge}>
				<OpponentSeal opponent={next} size={30} />
				<span><small>Next on the ladder</small>{next.name} · {next.rating}</span>
			</button>
		{/if}
		<div class="actions">
			<button class="go" onclick={() => session.rematch()}>{ai ? 'Rematch, colours swapped' : 'Rematch'}</button>
			{#if session.records.length}
				<button onclick={() => void session.startReview()}>Review game</button>
			{/if}
			<button onclick={copy} disabled={!session.records.length}>{copied ? 'Copied' : 'Copy PGN'}</button>
			<button onclick={onhide}>See board</button>
			<button onclick={() => session.backToMenu()}>Menu</button>
		</div>
	</div>
</div>

<style>
	.veil {
		position: absolute;
		inset: 0;
		z-index: 5;
		display: grid;
		place-items: center;
		padding: 12px;
		background: radial-gradient(circle at 50% 50%, rgba(10, 5, 3, 0.35), rgba(10, 5, 3, 0.7));
		border-radius: 8px;
	}

	.card {
		display: grid;
		justify-items: center;
		gap: 4px;
		width: min(400px, 100%);
		padding: 18px 20px 16px;
		border-radius: 14px;
		background: linear-gradient(180deg, rgba(42, 22, 16, 0.96), rgba(16, 9, 6, 0.97));
		border: 1px solid rgba(217, 178, 94, 0.5);
		box-shadow:
			0 0 50px rgba(255, 196, 110, 0.18),
			0 24px 50px rgba(0, 0, 0, 0.6);
		color: #f3e7cf;
		text-align: center;
	}

	.card.lost {
		border-color: rgba(150, 160, 180, 0.4);
		box-shadow:
			0 0 40px rgba(120, 140, 180, 0.15),
			0 24px 50px rgba(0, 0, 0, 0.6);
	}

	h2 {
		margin: 4px 0 0;
		font-family: 'Cinzel', Georgia, serif;
		font-weight: 600;
		font-size: 2.2rem;
		letter-spacing: 0.06em;
		color: #fff2d8;
		text-shadow: 0 0 22px rgba(255, 196, 110, 0.55);
	}

	.lost h2 {
		color: #d6dbe6;
		text-shadow: 0 0 18px rgba(140, 160, 200, 0.4);
	}

	p {
		margin: 0;
	}

	.line {
		font-size: 1.18rem;
		color: #e2d4b8;
	}

	.meta,
	.record {
		font-size: 0.95rem;
		color: #bba88a;
		font-style: italic;
	}

	.record b {
		font-style: normal;
		color: #fff2d8;
	}

	.next {
		margin-top: 8px;
		display: flex;
		align-items: center;
		gap: 10px;
		text-align: left;
	}

	.next small {
		display: block;
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-size: 0.56rem;
		font-weight: 700;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: #d9b25e;
	}

	.actions {
		margin-top: 12px;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 6px;
	}

	button {
		appearance: none;
		border: 1px solid rgba(217, 178, 94, 0.3);
		background: rgba(0, 0, 0, 0.3);
		color: #f3e7cf;
		border-radius: 999px;
		padding: 8px 14px;
		font: inherit;
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		cursor: pointer;
		transition: border-color 140ms ease;
	}

	.next {
		border-radius: 10px;
		padding: 6px 14px 6px 8px;
		text-transform: none;
		letter-spacing: 0.02em;
		font-size: 0.9rem;
		font-family: 'Cinzel', Georgia, serif;
		border-color: rgba(217, 178, 94, 0.5);
	}

	.go {
		flex-basis: 100%;
		border: 0;
		padding: 11px 18px;
		background: linear-gradient(180deg, #f2d27e, #b8862e);
		color: #1c1107;
	}

	button:disabled {
		opacity: 0.4;
		cursor: default;
	}

	@media (hover: hover) {
		button:not(:disabled):hover {
			border-color: #ecc874;
		}
	}
</style>
