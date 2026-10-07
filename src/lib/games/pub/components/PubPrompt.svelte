<script lang="ts">
	import { SUIT_GLYPH, SUIT_NAME, label, longName, type Card, type Suit } from '../../kit/cards/deck';
	import { showOf, total, type ScoreItem } from '../rules/cribbage';
	import { canBigGin, canKnockWith } from '../rules/gin';
	import { PASS_NAMES, passDir, passTarget } from '../rules/hearts';
	import { mayGoAlone, mustCall, partnerOf, teamOf } from '../rules/euchre';
	import type { PubSession } from '../session.svelte';

	let { session }: { session: PubSession } = $props();

	const s = $derived(session.state);
	const my = $derived(session.myTurn);
	const actor = $derived(session.actor);
	const names = $derived(session.names);

	let alone = $state(false);

	const waiting = $derived.by(() => {
		if (!s || session.over || actor === null || my) return '';
		if (session.thinking !== null) return `${names[session.thinking]} is thinking…`;
		return `Waiting for ${names[actor]}`;
	});

	const KIND: Record<ScoreItem['kind'], string> = {
		fifteen: 'Fifteen',
		pair: 'Pair',
		run: 'Run',
		flush: 'Flush',
		nobs: 'His nobs',
		heels: 'His heels'
	};

	const cribShow = $derived(s?.kind === 'cribbage' && s.phase === 'show' ? showOf(s) : null);

	function cardsText(cards: Card[]) {
		return cards.map(label).join(' ');
	}

	const knockable = $derived(s?.kind === 'gin' && my && s.phase === 'discard' ? s.hands[session.viewer].some((c) => canKnockWith(s, c)) : false);

	function ginKind(kind: string) {
		return kind === 'gin' ? 'Gin!' : kind === 'bigGin' ? 'Big gin!' : kind === 'undercut' ? 'Undercut!' : 'Knock.';
	}

	function ginLine(kind: string, knocker: string, winner: string) {
		if (kind === 'gin') return `${knocker} melds every card.`;
		if (kind === 'bigGin') return `${knocker} melds all eleven.`;
		if (kind === 'undercut') return `${knocker} knocked, but ${winner} matched it.`;
		return `${knocker} lays down.`;
	}
</script>

{#if s}
	<div class="prompt" class:live={my} aria-live="polite">
		{#if s.kind === 'cribbage'}
			{#if cribShow}
				{@const pts = total(cribShow.items)}
				<div class="summary">
					<p class="head">
						<b>{names[cribShow.seat]}</b>
						{cribShow.crib ? 'counts the crib' : 'counts their hand'}
						<span class="pts">{pts} {pts === 1 ? 'point' : 'points'}</span>
					</p>
					{#if cribShow.items.length}
						<ul class="items">
							{#each cribShow.items as item, i (i)}
								<li><em>{KIND[item.kind]}</em> {cardsText(item.cards)} <b>+{item.points}</b></li>
							{/each}
						</ul>
					{:else}
						<p class="muted">Nineteen, as they say: not a single point.</p>
					{/if}
					<button class="go" onclick={() => session.next()}>{s.showStep < 2 ? 'Next count' : 'Deal again'}</button>
				</div>
			{:else if my && s.phase === 'discard'}
				<p class="line">Choose two cards for <b>{s.dealer === session.viewer ? 'your' : `${names[s.dealer]}'s`}</b> crib</p>
				<button class="go" disabled={session.selected.length !== 2} onclick={() => session.confirm()}>Throw to the crib</button>
			{:else if my && s.phase === 'cut'}
				<p class="line">Cut the deck for the starter</p>
				<button class="go" onclick={() => session.spot('cut')}>Cut</button>
			{:else if my && s.phase === 'peg'}
				<p class="line">Play a card. The count is <b>{s.count}</b>, keep it at 31 or under</p>
			{:else}
				<p class="line muted">{waiting}</p>
			{/if}
		{:else if s.kind === 'hearts'}
			{#if s.phase === 'handOver' && s.summary}
				<div class="summary">
					<p class="head">
						{#if s.summary.moon !== null}<b>{names[s.summary.moon]}</b> shot the moon!{:else}Hand {s.handNo} is in{/if}
					</p>
					<ul class="items row">
						{#each s.summary.points as pts, seat (seat)}
							<li><em>{names[seat]}</em> <b>+{pts}</b> <span class="muted">→ {s.scores[seat]}</span></li>
						{/each}
					</ul>
					<button class="go" onclick={() => session.next()}>{s.winners.length ? 'See the result' : 'Deal again'}</button>
				</div>
			{:else if my && s.phase === 'pass'}
				<p class="line">Pass three cards <b>{PASS_NAMES[passDir(s.handNo)]}</b> to {names[passTarget(session.viewer, passDir(s.handNo))]}</p>
				<button class="go" disabled={session.selected.length !== 3} onclick={() => session.confirm()}>Pass them</button>
			{:else if my && s.phase === 'play'}
				<p class="line">
					{#if s.trickNo === 0 && s.trick.every((c) => c === null)}Lead the two of clubs
					{:else if s.trick.every((c) => c === null)}Your lead{s.heartsBroken ? '' : ' (hearts not broken yet)'}
					{:else}Follow suit if you can{/if}
				</p>
			{:else}
				<p class="line muted">{waiting || (s.phase === 'pass' ? 'Passing…' : '')}</p>
			{/if}
		{:else if s.kind === 'gin'}
			{#if (s.phase === 'handOver' || s.phase === 'over') && s.result}
				{@const r = s.result}
				<div class="summary">
					<p class="head">
						{#if r.kind === 'void'}The stock ran dry. No score, same dealer.
						{:else}
							<b>{ginKind(r.kind)}</b>
							{ginLine(r.kind, names[r.knocker!], names[r.winner!])}
							<span class="pts">+{r.points} to {names[r.winner!]}</span>
						{/if}
					</p>
					{#if r.kind !== 'void'}
						<ul class="items row">
							<li><em>{names[r.knocker!]}</em> deadwood <b>{r.knockerMeld!.points}</b></li>
							<li>
								<em>{names[1 - r.knocker!]}</em> deadwood <b>{r.defenderMeld!.points}</b>
								{#if r.layoffs.length}<span class="muted">after laying off {cardsText(r.layoffs)}</span>{/if}
							</li>
						</ul>
					{/if}
					{#if s.phase === 'handOver'}
						<button class="go" onclick={() => session.next()}>{s.winner !== null ? 'See the result' : 'Deal again'}</button>
					{/if}
				</div>
			{:else if my && s.phase === 'firstUp'}
				<p class="line">Take the <b>{longName(s.discard[s.discard.length - 1])}</b>, or pass</p>
				<div class="row-buttons">
					<button class="go" onclick={() => session.act({ type: 'take' })}>Take it</button>
					<button class="soft" onclick={() => session.act({ type: 'pass' })}>Pass</button>
				</div>
			{:else if my && s.phase === 'draw'}
				<p class="line">Draw from the stock, or take the <b>{label(s.discard[s.discard.length - 1])}</b></p>
				<div class="row-buttons">
					<button class="go" onclick={() => session.act({ type: 'draw' })}>Draw</button>
					<button class="soft" onclick={() => session.act({ type: 'take' })}>Take {label(s.discard[s.discard.length - 1])}</button>
				</div>
			{:else if my && s.phase === 'discard'}
				<p class="line">{session.knocking ? 'Tap the card to throw face down and knock' : 'Tap a card to discard it'}</p>
				<div class="row-buttons">
					{#if canBigGin(s)}<button class="go" onclick={() => session.act({ type: 'bigGin' })}>Big gin!</button>{/if}
					{#if knockable}
						<button class={session.knocking ? 'go' : 'soft'} onclick={() => (session.knocking = !session.knocking)}>{session.knocking ? 'Cancel knock' : 'Knock…'}</button>
					{/if}
				</div>
			{:else}
				<p class="line muted">{waiting}</p>
			{/if}
		{:else if s.kind === 'euchre'}
			{#if s.phase === 'handOver' && s.summary}
				{@const sm = s.summary}
				<div class="summary">
					<p class="head">
						<b>{sm.why}</b>
						<span class="pts">+{sm.points} to {sm.team === teamOf(session.viewer) ? 'your side' : 'their side'}</span>
					</p>
					<ul class="items row">
						<li><em>Us</em> <b>{s.scores[teamOf(session.viewer)]}</b></li>
						<li><em>Them</em> <b>{s.scores[1 - teamOf(session.viewer)]}</b></li>
						<li class="muted">Game to {s.target}</li>
					</ul>
					<button class="go" onclick={() => session.next()}>{s.winner !== null ? 'See the result' : 'Deal again'}</button>
				</div>
			{:else if my && s.phase === 'farmer'}
				<p class="line">Farmer's hand! Swap three nines and tens for the hidden kitty cards?</p>
				<div class="row-buttons">
					<button class="go" onclick={() => session.act({ type: 'farmer', swap: true })}>Swap</button>
					<button class="soft" onclick={() => session.act({ type: 'farmer', swap: false })}>Keep my hand</button>
				</div>
			{:else if my && s.phase === 'bid1'}
				{@const dealer = s.dealer === session.viewer}
				<p class="line">
					{dealer ? 'Pick up' : partnerOf(s.dealer) === session.viewer ? 'Order your partner up with' : `Order ${names[s.dealer]} up with`}
					the <b>{longName(s.upcard)}</b>? Trump would be {SUIT_NAME[Math.floor(s.upcard / 13)]}
				</p>
				<div class="row-buttons">
					<button class="go" onclick={() => session.act({ type: 'order', alone: false })}>{dealer ? 'Pick it up' : 'Order up'}</button>
					{#if mayGoAlone(s, session.viewer)}
						<button class="soft gold" onclick={() => session.act({ type: 'order', alone: true })}>Go alone</button>
					{/if}
					<button class="soft" onclick={() => session.act({ type: 'pass' })}>Pass</button>
				</div>
			{:else if my && s.phase === 'bid2'}
				<p class="line">{mustCall(s) ? 'Stuck! You must name trump' : 'Name trump, or pass'}</p>
				<div class="row-buttons">
					{#each [0, 1, 2, 3] as suit (suit)}
						{#if suit !== Math.floor(s.upcard / 13)}
							<button class={['suit', (suit === 1 || suit === 3) && 'red']} onclick={() => session.act({ type: 'call', suit: suit as Suit, alone })} aria-label="Call {SUIT_NAME[suit]}">
								{SUIT_GLYPH[suit]}
							</button>
						{/if}
					{/each}
					<label class="alone"><input type="checkbox" bind:checked={alone} /> Alone</label>
					{#if !mustCall(s)}<button class="soft" onclick={() => session.act({ type: 'pass' })}>Pass</button>{/if}
				</div>
			{:else if my && s.phase === 'discard'}
				<p class="line">You picked up the <b>{longName(s.upcard)}</b>. Tap a card to bury</p>
			{:else if my && s.phase === 'defend'}
				<p class="line">{names[s.maker!]} is going alone. Defend alone for 4 if you euchre them?</p>
				<div class="row-buttons">
					<button class="soft gold" onclick={() => session.act({ type: 'defend', alone: true })}>Defend alone</button>
					<button class="go" onclick={() => session.act({ type: 'defend', alone: false })}>Play with my partner</button>
				</div>
			{:else if my && s.phase === 'play'}
				<p class="line">{s.trick.every((c) => c === null) ? 'Your lead' : 'Follow suit if you can'} · trump is <b>{SUIT_NAME[s.trump!]}</b></p>
			{:else}
				<p class="line muted">{waiting}</p>
			{/if}
		{/if}
	</div>
{/if}

<style>
	.prompt {
		min-height: 52px;
		width: min(980px, 100%);
		margin: 0 auto;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 8px 14px;
		padding: 8px 16px;
		box-sizing: border-box;
		border-radius: 18px;
		background: linear-gradient(180deg, rgba(42, 28, 16, 0.86), rgba(18, 12, 7, 0.9));
		border: 1px solid rgba(224, 165, 72, 0.22);
		color: #f4e6c8;
		transition:
			border-color 240ms ease,
			box-shadow 240ms ease;
	}

	.prompt.live {
		border-color: rgba(255, 196, 106, 0.6);
		box-shadow: 0 0 22px rgba(255, 196, 106, 0.18);
	}

	.line {
		margin: 0;
		font-family: Spectral, Georgia, serif;
		font-size: 1.02rem;
		text-align: center;
	}

	.line b {
		color: #ffc46a;
	}

	.muted {
		color: #bfa985;
	}

	.row-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		justify-content: center;
		align-items: center;
	}

	button {
		appearance: none;
		border: 0;
		border-radius: 999px;
		padding: 9px 18px;
		font: inherit;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		font-size: 0.78rem;
		cursor: pointer;
		transition:
			transform 140ms ease,
			filter 140ms ease;
	}

	button:active {
		transform: translateY(1px);
	}

	button:disabled {
		opacity: 0.45;
		cursor: default;
	}

	.go {
		color: #1c1107;
		background: linear-gradient(180deg, #f6c873, #c88a2e);
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
	}

	.soft {
		color: #f4e6c8;
		background: rgba(244, 230, 200, 0.08);
		box-shadow: inset 0 0 0 1px rgba(224, 165, 72, 0.4);
	}

	.soft.gold {
		color: #ffd48a;
		box-shadow: inset 0 0 0 1px rgba(255, 196, 106, 0.8);
	}

	.suit {
		width: 52px;
		height: 52px;
		padding: 0;
		font-size: 1.7rem;
		line-height: 1;
		color: #1d1a18;
		background: radial-gradient(circle at 40% 35%, #fbf3e0, #dccaa4);
		box-shadow:
			0 0 0 2px #b8873a,
			0 6px 14px rgba(0, 0, 0, 0.35);
	}

	.suit.red {
		color: #b3262e;
	}

	.alone {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 0.86rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #ffd48a;
		cursor: pointer;
	}

	.alone input {
		width: 18px;
		height: 18px;
		accent-color: #e0a548;
	}

	.summary {
		width: 100%;
		display: grid;
		justify-items: center;
		gap: 6px;
	}

	.head {
		margin: 0;
		font-family: Spectral, Georgia, serif;
		font-size: 1.05rem;
		text-align: center;
	}

	.head b {
		font-family: 'Playfair Display SC', Georgia, serif;
		color: #ffc46a;
	}

	.pts {
		margin-left: 8px;
		padding: 2px 10px;
		border-radius: 999px;
		background: rgba(255, 196, 106, 0.16);
		color: #ffd48a;
		font-weight: 700;
	}

	.items {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 4px 14px;
		font-size: 0.9rem;
	}

	.items em {
		font-style: normal;
		color: #bfa985;
		margin-right: 4px;
	}

	.items b {
		color: #ffd48a;
		margin-left: 4px;
	}

	@media (max-width: 640px) {
		.prompt {
			padding: 6px 10px;
			border-radius: 14px;
		}

		.line {
			font-size: 0.9rem;
		}

		button {
			padding: 8px 14px;
		}
	}
</style>
