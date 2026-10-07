<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import ArcadeExit from '$lib/components/ArcadeExit.svelte';
	import ArcadeTile from '$lib/components/ArcadeTile.svelte';
	import ChessIcon from './ChessIcon.svelte';
	import OpponentSeal from './OpponentSeal.svelte';
	import PieceGlyph from './PieceGlyph.svelte';
	import { playSelect } from '../audio';
	import { peekSaved } from '../persist';
	import { chessPanels, chessView, persistChessView } from '../settings.svelte';
	import { OPPONENTS, TIME_CONTROLS, TIME_INFO, opponentById, type Mode, type OpponentId, type SideChoice, type TimeControl } from '../types';
	import type { ChessSession } from '../session.svelte';

	let { session }: { session: ChessSession } = $props();

	const mode = $derived(chessView.mode);
	const chosen = $derived(opponentById(chessView.opponent));
	const record = $derived(chessView.records[chosen.id]);
	const saved = $derived(peekSaved());
	const savedWith = $derived(saved ? (saved.mode === 'ai' ? opponentById(saved.opponent).name : 'hotseat') : '');
	const nextUp = $derived(OPPONENTS.find((o) => chessView.records[o.id].w === 0)?.id ?? null);

	function setMode(next: Mode) {
		chessView.mode = next;
		persistChessView();
		playSelect();
	}

	function pick(id: OpponentId) {
		chessView.opponent = id;
		persistChessView();
		playSelect();
	}

	function setSide(side: SideChoice) {
		chessView.side = side;
		persistChessView();
		playSelect();
	}

	function setTime(time: TimeControl) {
		chessView.time = time;
		persistChessView();
		playSelect();
	}

	function launch() {
		const side = chessView.side === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : chessView.side;
		session.start(mode, chessView.opponent, mode === 'ai' ? side : 'w', chessView.time);
	}

	function resume() {
		playSelect();
		session.resume();
	}

	const favourites = (rep: Record<string, number>) =>
		Object.entries(rep)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 2)
			.map(([name]) => name);

	const STYLE_WORDS: Record<OpponentId, string> = {
		pip: 'Eager · grabs anything',
		bartholomew: 'Steady · develops, then guesses',
		wren: 'Gambits · open lines · attack',
		anselm: 'Solid · trades down · grinds',
		hale: 'Aggressive · king hunts',
		dowager: 'Positional · squeezes',
		vellum: 'Deep theory · precise',
		count: 'Complete · relentless'
	};
</script>

<section class="menu" in:fade={{ duration: 420 }}>
	<div class="crest" in:fly={{ y: 10, duration: 420 }}>
		<ChessIcon size="hero" />
	</div>
	<p class="kicker" in:fly={{ y: 12, duration: 460 }}>The Grand Hall · after midnight</p>
	<h1 in:fly={{ y: 18, duration: 600 }}>Chess</h1>
	<p class="lede">
		Rain on the tall windows, candles in the chandeliers, and a marble board laid out for you. Climb the ladder of the hall's
		<strong>eight players</strong>, from the page boy to the Count himself, or sit across from a friend.
	</p>

	<div class="modes">
		<button class="card" class:on={mode === 'ai'} onclick={() => setMode('ai')}>
			<span class="tag">Against the hall</span>
			<strong>Take a challenger</strong>
			<small>Eight opponents from 400 to 2200, each with a style and an opening book.</small>
		</button>
		<button class="card" class:on={mode === 'hotseat'} onclick={() => setMode('hotseat')}>
			<span class="tag">Hotseat</span>
			<strong>Two at the board</strong>
			<small>Share the device. Flip the board each turn if you like.</small>
		</button>
	</div>

	{#if mode === 'ai'}
		<div class="ladder" transition:fade={{ duration: 160 }} role="radiogroup" aria-label="Opponent">
			{#each OPPONENTS as o, i (o.id)}
				{@const r = chessView.records[o.id]}
				<button role="radio" aria-checked={chessView.opponent === o.id} class="rung" class:on={chessView.opponent === o.id} class:beaten={r.w > 0} style:--hue={o.hue} onclick={() => pick(o.id)}>
					<OpponentSeal opponent={o} size={38} />
					<span class="who">
						<strong>{o.name}</strong>
						<small>{o.title}</small>
					</span>
					<span class="elo">{o.rating}</span>
					{#if r.w > 0}
						<i class="laurel" title="Beaten">✦</i>
					{:else if nextUp === o.id}
						<i class="next">Next</i>
					{/if}
					<span class="rank">{i + 1}</span>
				</button>
			{/each}
		</div>

		<div class="detail" style:--hue={chosen.hue}>
			<OpponentSeal opponent={chosen} size={58} />
			<div class="about">
				<p class="name">{chosen.name} <em>{chosen.title}</em></p>
				<p class="blurb">{chosen.blurb}</p>
				<p class="facts">
					<span><b>Style</b> {STYLE_WORDS[chosen.id]}</span>
					<span><b>As white</b> {favourites(chosen.white).join(', ')}</span>
					<span><b>As black</b> {favourites(chosen.black).join(', ')}</span>
				</p>
			</div>
			<p class="record">
				<span><b>{record.w}</b> won</span>
				<span><b>{record.d}</b> drawn</span>
				<span><b>{record.l}</b> lost</span>
			</p>
		</div>

		<div class="chips" role="radiogroup" aria-label="Your colour">
			<span class="label">You play</span>
			{#each [['w', 'White'], ['random', 'Either'], ['b', 'Black']] as [value, label] (value)}
				<button role="radio" aria-checked={chessView.side === value} class:on={chessView.side === value} onclick={() => setSide(value as SideChoice)}>
					{#if value === 'random'}
						<span class="duo"><PieceGlyph piece={6} size={20} /><PieceGlyph piece={-6} size={20} /></span>
					{:else}
						<PieceGlyph piece={value === 'w' ? 6 : -6} size={22} />
					{/if}
					{label}
				</button>
			{/each}
		</div>
	{:else}
		<p class="ledger" transition:fade={{ duration: 160 }}>
			<span>White wins <strong>{chessView.hotseat.w}</strong></span>
			<span>Draws <strong>{chessView.hotseat.d}</strong></span>
			<span>Black wins <strong>{chessView.hotseat.b}</strong></span>
		</p>
	{/if}

	<div class="chips" role="radiogroup" aria-label="Clock">
		<span class="label">Clock</span>
		{#each TIME_CONTROLS as time (time)}
			<button role="radio" aria-checked={chessView.time === time} class:on={chessView.time === time} onclick={() => setTime(time)}>
				{TIME_INFO[time].label}
			</button>
		{/each}
	</div>

	<div class="cta">
		{#if saved}
			<button class="ghost" onclick={resume}>Resume vs {savedWith}</button>
		{/if}
		<button class="go" onclick={launch}>Take your seat</button>
	</div>
	<nav class="dock" aria-label="Chess">
		<ArcadeTile tone="regal" size="tile" kicker="Rules" label="How to play" onclick={chessPanels.openGuide} />
		<ArcadeTile tone="regal" size="tile" kicker="Tune" label="Settings" onclick={chessPanels.openSettings} />
		<ArcadeExit tone="regal" size="tile" />
	</nav>
</section>

<style>
	.menu {
		position: relative;
		z-index: 2;
		width: min(880px, 100%);
		text-align: center;
		color: #f3e7cf;
		padding-bottom: 4vh;
	}

	.crest {
		display: grid;
		place-items: center;
		margin-bottom: 8px;
		animation: float 6s ease-in-out infinite;
	}

	.kicker {
		margin: 0;
		letter-spacing: 0.32em;
		text-transform: uppercase;
		font-size: 0.72rem;
		font-weight: 700;
		color: #d9b25e;
		text-shadow: 0 1px 8px rgba(0, 0, 0, 0.8);
	}

	h1 {
		margin: 4px 0 0;
		font-family: 'Cinzel', Georgia, serif;
		font-weight: 600;
		font-size: clamp(2.8rem, 9vw, 5.2rem);
		line-height: 0.95;
		letter-spacing: 0.06em;
		color: #fff2d8;
		text-shadow:
			0 0 24px rgba(255, 196, 110, 0.5),
			0 0 60px rgba(255, 180, 90, 0.22),
			0 6px 18px rgba(0, 0, 0, 0.75);
		animation: candle 5s ease-in-out infinite;
	}

	.lede {
		margin: 14px auto 0;
		max-width: 40rem;
		padding: 13px 18px;
		border-radius: 8px;
		background: rgba(20, 10, 7, 0.82);
		border: 1px solid rgba(217, 178, 94, 0.22);
		color: #e2d4b8;
		font-size: 1.12rem;
		line-height: 1.5;
		box-shadow: 0 10px 26px rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(4px);
	}

	.lede strong {
		color: #f0c870;
	}

	.modes {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
		margin-top: 16px;
	}

	.card,
	.go,
	.ghost,
	.chips button,
	.rung {
		appearance: none;
		border: 1px solid rgba(217, 178, 94, 0.22);
		background: linear-gradient(180deg, rgba(40, 22, 15, 0.92), rgba(18, 10, 7, 0.94));
		color: #f3e7cf;
		cursor: pointer;
		font: inherit;
	}

	.card {
		position: relative;
		display: grid;
		align-content: start;
		text-align: left;
		border-radius: 10px;
		padding: 12px 16px 14px;
		box-shadow:
			inset 0 1px 0 rgba(255, 226, 170, 0.07),
			0 8px 20px rgba(0, 0, 0, 0.4);
		transition:
			border-color 180ms ease,
			transform 180ms ease,
			box-shadow 180ms ease;
	}

	.card.on {
		border-color: #d9b25e;
		box-shadow:
			inset 0 1px 0 rgba(255, 226, 170, 0.1),
			0 0 0 2px rgba(217, 178, 94, 0.3),
			0 0 28px rgba(255, 190, 90, 0.18),
			0 12px 26px rgba(0, 0, 0, 0.45);
		transform: translateY(-3px);
	}

	.tag {
		display: block;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-size: 0.64rem;
		font-weight: 700;
		color: #d9b25e;
		margin-bottom: 3px;
	}

	.card strong {
		display: block;
		font-family: 'Cinzel', Georgia, serif;
		font-weight: 600;
		font-size: 1.2rem;
	}

	.card small {
		display: block;
		margin-top: 3px;
		color: #bba88a;
		line-height: 1.35;
		font-size: 0.98rem;
	}

	.ladder {
		margin-top: 12px;
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 8px;
	}

	.rung {
		position: relative;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		grid-template-rows: auto auto;
		align-items: center;
		column-gap: 8px;
		padding: 8px 10px;
		border-radius: 10px;
		text-align: left;
		box-shadow: 0 6px 14px rgba(0, 0, 0, 0.35);
		transition:
			border-color 160ms ease,
			box-shadow 160ms ease,
			transform 160ms ease;
	}

	.rung :global(.seal) {
		grid-row: 1 / 3;
	}

	.rung.on {
		border-color: var(--hue);
		box-shadow:
			0 0 0 2px color-mix(in srgb, var(--hue) 40%, transparent),
			0 0 22px color-mix(in srgb, var(--hue) 25%, transparent),
			0 8px 18px rgba(0, 0, 0, 0.4);
		transform: translateY(-2px);
	}

	.who {
		display: grid;
		min-width: 0;
		line-height: 1.1;
	}

	.who strong {
		font-family: 'Cinzel', Georgia, serif;
		font-weight: 600;
		font-size: 0.92rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.who small {
		color: #bba88a;
		font-size: 0.86rem;
		font-style: italic;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.elo {
		grid-column: 2;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		color: var(--hue);
		font-family: ui-sans-serif, system-ui, sans-serif;
	}

	.rank {
		position: absolute;
		right: 8px;
		bottom: 6px;
		font-family: 'Cinzel', Georgia, serif;
		font-size: 0.72rem;
		color: rgba(217, 178, 94, 0.45);
	}

	.laurel,
	.next {
		position: absolute;
		right: 8px;
		top: 6px;
		font-style: normal;
		font-size: 0.8rem;
		color: #f0c870;
		text-shadow: 0 0 8px rgba(255, 200, 100, 0.7);
	}

	.next {
		font-size: 0.56rem;
		font-weight: 700;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-family: ui-sans-serif, system-ui, sans-serif;
		color: #d9b25e;
		text-shadow: none;
	}

	.detail {
		margin-top: 10px;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		gap: 14px;
		align-items: center;
		text-align: left;
		padding: 12px 16px;
		border-radius: 10px;
		background: rgba(20, 10, 7, 0.86);
		border: 1px solid color-mix(in srgb, var(--hue) 40%, transparent);
		box-shadow: 0 10px 24px rgba(0, 0, 0, 0.4);
	}

	.about p {
		margin: 0;
	}

	.name {
		font-family: 'Cinzel', Georgia, serif;
		font-weight: 600;
		font-size: 1.12rem;
	}

	.name em {
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-weight: 500;
		color: var(--hue);
	}

	.blurb {
		margin-top: 2px !important;
		color: #e2d4b8;
		font-size: 1.02rem;
		line-height: 1.35;
	}

	.facts {
		margin-top: 6px !important;
		display: flex;
		flex-wrap: wrap;
		gap: 4px 14px;
		color: #bba88a;
		font-size: 0.92rem;
	}

	.facts b {
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-size: 0.6rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: #d9b25e;
		margin-right: 4px;
	}

	.record {
		margin: 0;
		display: grid;
		gap: 2px;
		text-align: right;
		font-size: 0.82rem;
		color: #bba88a;
		white-space: nowrap;
	}

	.record b {
		font-family: 'Cinzel', Georgia, serif;
		color: #fff2d8;
		font-size: 1rem;
	}

	.chips {
		margin-top: 12px;
		display: flex;
		justify-content: center;
		align-items: center;
		flex-wrap: wrap;
		gap: 7px;
	}

	.label {
		font-size: 0.64rem;
		font-weight: 700;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: #d9b25e;
		margin-right: 4px;
	}

	.chips button {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		border-radius: 999px;
		padding: 6px 14px;
		font-weight: 600;
		font-size: 1rem;
	}

	.duo {
		display: inline-flex;
	}

	.duo :global(canvas + canvas) {
		margin-left: -8px;
	}

	.chips button.on {
		background: linear-gradient(180deg, #ecc874, #b8862e);
		border-color: transparent;
		color: #1c1107;
	}

	.ledger {
		margin: 14px auto 0;
		width: fit-content;
		display: flex;
		gap: 28px;
		padding: 8px 22px;
		border-radius: 8px;
		background: rgba(14, 7, 5, 0.8);
		border: 1px solid rgba(217, 178, 94, 0.18);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-size: 0.64rem;
		font-weight: 700;
		color: #d9b25e;
	}

	.ledger strong {
		display: block;
		margin-top: 3px;
		font-family: 'Cinzel', Georgia, serif;
		font-size: 1.15rem;
		letter-spacing: 0.02em;
		color: #fff2d8;
	}

	.cta {
		margin-top: 18px;
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: 10px;
	}

	.go,
	.ghost {
		border-radius: 999px;
		padding: 13px 28px;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		font-size: 0.9rem;
		font-family: ui-sans-serif, system-ui, sans-serif;
		transition:
			transform 160ms ease,
			box-shadow 160ms ease;
	}

	.go {
		border: 0;
		background: linear-gradient(180deg, #f2d27e, #b8862e);
		color: #1c1107;
		box-shadow:
			0 10px 24px rgba(0, 0, 0, 0.45),
			inset 0 1px 0 rgba(255, 245, 220, 0.7);
		animation: beckon 3.6s ease-in-out infinite;
	}

	.ghost {
		padding: 13px 22px;
	}

	@media (hover: hover) {
		.go:hover,
		.ghost:hover,
		.card:hover,
		.rung:hover {
			transform: translateY(-2px);
		}
	}

	.dock {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 12px;
		width: min(760px, 100%);
		margin: 18px auto 0;
	}

	@keyframes float {
		50% {
			translate: 0 -6px;
		}
	}

	@keyframes candle {
		50% {
			text-shadow:
				0 0 32px rgba(255, 206, 120, 0.7),
				0 0 80px rgba(255, 180, 90, 0.3),
				0 6px 18px rgba(0, 0, 0, 0.75);
		}
	}

	@keyframes beckon {
		50% {
			box-shadow:
				0 10px 24px rgba(0, 0, 0, 0.45),
				0 0 30px rgba(255, 200, 100, 0.5),
				inset 0 1px 0 rgba(255, 245, 220, 0.7);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.crest,
		h1,
		.go {
			animation: none;
		}

		.go:hover,
		.ghost:hover,
		.card:hover,
		.card.on,
		.rung:hover,
		.rung.on {
			transform: none;
		}
	}

	@media (max-width: 760px) {
		.ladder {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.detail {
			grid-template-columns: auto minmax(0, 1fr);
		}

		.record {
			grid-column: 1 / -1;
			display: flex;
			justify-content: center;
			gap: 18px;
		}

		.facts span:not(:first-child) {
			display: none;
		}
	}

	@media (max-width: 560px) {
		.modes {
			grid-template-columns: 1fr;
		}

		.card small {
			display: none;
		}

		.detail :global(.seal) {
			display: none;
		}

		.detail {
			grid-template-columns: minmax(0, 1fr);
		}

		.dock {
			grid-template-columns: 1fr 1fr;
		}

		.dock > :global(.exit) {
			grid-column: 1 / -1;
		}
	}
</style>
