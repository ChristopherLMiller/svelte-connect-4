<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import ArcadeExit from '$lib/components/ArcadeExit.svelte';
	import ArcadeTile from '$lib/components/ArcadeTile.svelte';
	import PubIcon from './PubIcon.svelte';
	import Rosie from './Rosie.svelte';
	import { playSelect } from '../audio';
	import { persistPubView, pubPanelControls, pubRecords, pubView } from '../settings.svelte';
	import { DIFFICULTIES, PARTNERED, REGULARS, SHELVES, SOLO, VARIANTS, VARIANT_INFO, difficultyInfo, type Difficulty, type HotseatEuchre, type HotseatHearts, type Mode, type Variant } from '../types';
	import { viewForVariant } from '../views';
	import type { PubSession } from '../session.svelte';

	let { session }: { session: PubSession } = $props();

	const variant = $derived(pubView.variant);
	const record = $derived(pubRecords[variant]);
	const saved = $derived(record.saved);
	const four = $derived(VARIANT_INFO[variant].players === 4);
	const solo = $derived(SOLO.includes(variant));
	const mode = $derived(solo ? 'ai' : pubView.mode);

	const BASE_GLYPH: Partial<Record<Variant, { glyph: string; red: boolean }>> = {
		cribbage: { glyph: '15', red: false },
		hearts: { glyph: '♥', red: true },
		gin: { glyph: '♣', red: false },
		euchre: { glyph: 'J', red: true },
		spades: { glyph: '♠', red: false }
	};
	const glyph = (v: Variant) => BASE_GLYPH[v] ?? viewForVariant(v)?.glyph ?? { glyph: '?', red: false };
	const players = (v: Variant) => (VARIANT_INFO[v].players === 1 ? 'Patience' : SOLO.includes(v) ? 'You v the house' : `${VARIANT_INFO[v].players} players`);

	function pick(next: Variant) {
		session.open(next);
		playSelect();
	}

	function setMode(next: Mode) {
		pubView.mode = next;
		persistPubView();
		playSelect();
	}

	function setDifficulty(next: Difficulty) {
		pubView.difficulty = next;
		persistPubView();
		playSelect();
	}

	function setHearts(next: HotseatHearts) {
		pubView.heartsPlayers = next;
		persistPubView();
		playSelect();
	}

	function setEuchre(next: HotseatEuchre) {
		pubView.euchreSeats = next;
		persistPubView();
		playSelect();
	}

	function resume() {
		playSelect();
		session.resume();
	}

	const opponents = $derived(REGULARS[variant].slice(1).join(', ').replace(/, ([^,]*)$/, ' and $1'));
	const ai = $derived(record.ai[pubView.difficulty]);
</script>

<section class="menu" in:fade={{ duration: 420 }}>
	<div class="crest" in:fly={{ y: 10, duration: 420 }}>
		<PubIcon size="hero" />
	</div>
	<p class="kicker" in:fly={{ y: 12, duration: 460 }}>Cards by the fire</p>
	<h1 in:fly={{ y: 18, duration: 600 }}>The Lamplight</h1>

	<div class="board" role="radiogroup" aria-label="Game">
		<p class="chalk-head">Tonight's tables</p>
		{#each SHELVES as shelf (shelf.id)}
			<p class="shelf">{shelf.title}</p>
			{#each VARIANTS.filter((v) => VARIANT_INFO[v].shelf === shelf.id) as v (v)}
				{@const info = VARIANT_INFO[v]}
				<button role="radio" aria-checked={variant === v} class:on={variant === v} onclick={() => pick(v)}>
					<i class:red={glyph(v).red} class:long={glyph(v).glyph.length > 1} aria-hidden="true">{glyph(v).glyph}</i>
					<span>
						<strong>{info.title}</strong>
						<small>{info.line}</small>
					</span>
					<em>{players(v)} · {info.chalk}</em>
				</button>
			{/each}
		{/each}
	</div>

	{#if !solo}
		<div class="modes">
			<button class="card" class:on={mode === 'ai'} onclick={() => setMode('ai')}>
				<span class="tag">With the regulars</span>
				<strong>Sit in with {opponents}</strong>
				<small>{four ? (PARTNERED.includes(variant) ? `${REGULARS[variant][2]} partners you across the table.` : 'Every seat for themselves.') : 'Heads up across the table.'}</small>
			</button>
			<button class="card" class:on={mode === 'local'} onclick={() => setMode('local')}>
				<span class="tag">Pass and play</span>
				<strong>One device, passed round</strong>
				<small>A curtain drops between turns so nobody peeks.</small>
			</button>
		</div>
	{/if}

	{#if mode === 'ai'}
		<div class="chips" transition:fade={{ duration: 160 }}>
			{#each DIFFICULTIES as level (level)}
				{@const info = difficultyInfo(variant, level)}
				<button class:on={pubView.difficulty === level} onclick={() => setDifficulty(level)}>
					{info.title}<small>{info.line}</small>
				</button>
			{/each}
		</div>
	{:else if four && !PARTNERED.includes(variant)}
		<div class="chips" transition:fade={{ duration: 160 }}>
			{#each [2, 3, 4] as n (n)}
				<button class:on={pubView.heartsPlayers === n} onclick={() => setHearts(n as HotseatHearts)}>
					{n} people<small>{4 - n ? `${4 - n} regular${n === 3 ? '' : 's'} fill in` : 'A full table'}</small>
				</button>
			{/each}
		</div>
	{:else if PARTNERED.includes(variant)}
		<div class="chips" transition:fade={{ duration: 160 }}>
			<button class:on={pubView.euchreSeats === 'partners'} onclick={() => setEuchre('partners')}>Two partners<small>Against {REGULARS[variant][1]} and {REGULARS[variant][3]}</small></button>
			<button class:on={pubView.euchreSeats === 'rivals'} onclick={() => setEuchre('rivals')}>Two rivals<small>Each with a regular</small></button>
			<button class:on={pubView.euchreSeats === 'four'} onclick={() => setEuchre('four')}>Four people<small>A full table</small></button>
		</div>
	{/if}

	<p class="ledger">
		{#if mode === 'ai'}
			<span>{difficultyInfo(variant, pubView.difficulty).title} · won <strong>{ai.w}</strong></span>
			<span>{VARIANT_INFO[variant].players === 1 ? 'Not out' : 'Lost'} <strong>{ai.l}</strong></span>
		{:else}
			<span>Pass-and-play games <strong>{record.local}</strong></span>
		{/if}
	</p>

	<button class="learn" onclick={() => session.startLesson(variant)}>
		<Rosie size={40} />
		<span>
			<strong>New to {VARIANT_INFO[variant].title}? Learn it with Rosie</strong>
			<small>She walks you through {VARIANT_INFO[variant].players === 1 ? 'the opening of a deal' : 'one hand'}, explaining every move. Nothing counts toward your record.</small>
		</span>
	</button>

	<div class="cta">
		{#if saved}
			<button class="ghost" onclick={resume}>Resume {VARIANT_INFO[variant].title.toLowerCase()}{VARIANT_INFO[variant].players > 1 ? `, hand ${saved.state.handNo}` : ''}</button>
		{/if}
		<button class="go" onclick={() => session.start()}>Deal me in</button>
	</div>

	<nav class="dock" aria-label="Lamplight Pub">
		<ArcadeTile tone="tavern" size="tile" kicker="Rules" label="How to play" onclick={() => pubPanelControls.openGuide()} />
		<ArcadeTile tone="tavern" size="tile" kicker="Tune" label="Settings" onclick={() => pubPanelControls.openSettings()} />
		<ArcadeExit tone="tavern" size="tile" />
	</nav>
</section>

<style>
	.menu {
		position: relative;
		z-index: 2;
		width: min(860px, 100%);
		text-align: center;
		color: #f4e6c8;
		padding-bottom: 4vh;
	}

	.crest {
		display: grid;
		place-items: center;
		margin-bottom: 6px;
	}

	.kicker {
		margin: 0;
		letter-spacing: 0.32em;
		text-transform: uppercase;
		font-size: 0.72rem;
		font-weight: 700;
		color: #e0a548;
	}

	h1 {
		margin: 4px 0 0;
		font: 700 clamp(2.6rem, 8.5vw, 4.8rem) 'Playfair Display SC', Georgia, serif;
		line-height: 0.95;
		color: #ffe3ad;
		text-shadow:
			0 2px 0 #5a3712,
			0 0 34px rgba(255, 180, 80, 0.45),
			0 10px 26px rgba(0, 0, 0, 0.6);
	}

	.board {
		margin: 18px auto 0;
		padding: 18px 18px 14px;
		border-radius: 10px;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
		background:
			radial-gradient(ellipse at 25% 15%, rgba(255, 255, 255, 0.07), transparent 55%),
			linear-gradient(160deg, #2c322d, #1a1e1b);
		box-shadow:
			inset 0 0 0 8px #5a3a1f,
			inset 0 0 0 10px #2a170a,
			inset 0 0 40px rgba(0, 0, 0, 0.6),
			0 20px 40px rgba(0, 0, 0, 0.5);
		font-family: 'Cabin Sketch', Spectral, serif;
	}

	.chalk-head {
		grid-column: 1 / -1;
		margin: 2px 0 4px;
		font-size: 1.35rem;
		color: rgba(244, 240, 228, 0.9);
		letter-spacing: 0.04em;
	}

	.shelf {
		grid-column: 1 / -1;
		margin: 10px 0 0;
		text-align: left;
		font-size: 0.95rem;
		letter-spacing: 0.08em;
		color: rgba(255, 212, 138, 0.75);
		border-bottom: 1px dashed rgba(240, 236, 226, 0.18);
		padding-bottom: 2px;
	}

	.board button {
		appearance: none;
		position: relative;
		display: grid;
		grid-template-columns: auto 1fr;
		grid-template-rows: auto auto;
		column-gap: 12px;
		align-items: center;
		text-align: left;
		padding: 10px 12px;
		border-radius: 8px;
		border: 1px dashed rgba(240, 236, 226, 0.2);
		background: transparent;
		color: rgba(240, 236, 226, 0.88);
		font: inherit;
		cursor: pointer;
		transition:
			border-color 160ms ease,
			background-color 160ms ease;
	}

	.board button.on {
		border: 1px solid rgba(255, 212, 138, 0.8);
		background: rgba(255, 212, 138, 0.07);
	}

	.board i {
		grid-row: 1 / 3;
		display: grid;
		place-items: center;
		width: 44px;
		height: 58px;
		border-radius: 5px;
		font-style: normal;
		font: 700 1.5rem Georgia, serif;
		color: #1d1a18;
		background: linear-gradient(180deg, #fbf3e0, #e2cfa8);
		box-shadow: 0 4px 10px rgba(0, 0, 0, 0.45);
		rotate: -4deg;
		transition: rotate 220ms ease;
	}

	.board button.on i {
		rotate: 3deg;
	}

	.board i.red {
		color: #b3262e;
	}

	.board i.long {
		font-size: 1.15rem;
	}

	.board span {
		display: grid;
	}

	.board strong {
		font-size: 1.35rem;
		font-weight: 700;
		color: #fff6e2;
	}

	.board small {
		font-family: Spectral, Georgia, serif;
		font-size: 0.86rem;
		line-height: 1.35;
		color: rgba(240, 236, 226, 0.7);
	}

	.board em {
		grid-column: 2;
		font-style: normal;
		font-size: 0.8rem;
		color: #ffd48a;
		opacity: 0.85;
	}

	.modes {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
		margin-top: 12px;
	}

	.card,
	.chips button,
	.ghost {
		appearance: none;
		border: 1px solid rgba(224, 165, 72, 0.28);
		background: linear-gradient(180deg, rgba(48, 32, 18, 0.92), rgba(22, 14, 8, 0.94));
		color: #f4e6c8;
		font: inherit;
		cursor: pointer;
	}

	.card {
		display: grid;
		align-content: start;
		text-align: left;
		border-radius: 14px;
		padding: 12px 16px 14px;
		box-shadow: 0 10px 22px rgba(0, 0, 0, 0.35);
		transition:
			border-color 180ms ease,
			box-shadow 180ms ease;
	}

	.card.on {
		border-color: #e0a548;
		box-shadow:
			0 0 0 2px rgba(224, 165, 72, 0.35),
			0 12px 26px rgba(0, 0, 0, 0.4);
	}

	.tag {
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-size: 0.62rem;
		font-weight: 700;
		color: #e0a548;
	}

	.card strong {
		font: 700 1.15rem 'Playfair Display SC', Georgia, serif;
		margin-top: 2px;
	}

	.card small {
		margin-top: 3px;
		color: #bfa985;
		font-size: 0.88rem;
		line-height: 1.35;
	}

	.chips {
		margin-top: 12px;
		display: flex;
		justify-content: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.chips button {
		display: grid;
		border-radius: 14px;
		padding: 8px 18px;
		font-weight: 700;
		min-width: 130px;
	}

	.chips small {
		font-weight: 400;
		font-size: 0.74rem;
		color: #bfa985;
	}

	.chips button.on {
		background: linear-gradient(180deg, #f6c873, #c88a2e);
		border-color: transparent;
		color: #1c1107;
	}

	.chips button.on small {
		color: #4a2e10;
	}

	.ledger {
		margin: 14px auto 0;
		width: fit-content;
		display: flex;
		gap: 28px;
		padding: 8px 22px;
		border-radius: 999px;
		background: rgba(14, 9, 5, 0.7);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-size: 0.64rem;
		font-weight: 700;
		color: #d9b06a;
	}

	.ledger strong {
		margin-left: 4px;
		font: 700 1.05rem 'Playfair Display SC', Georgia, serif;
		color: #fff2d6;
	}

	.learn {
		appearance: none;
		margin: 14px auto 0;
		width: min(560px, 100%);
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 16px 10px 10px;
		border-radius: 16px;
		border: 1px solid rgba(80, 230, 215, 0.35);
		background: linear-gradient(180deg, rgba(22, 38, 36, 0.9), rgba(12, 20, 19, 0.92));
		color: #e8f4ee;
		font: inherit;
		text-align: left;
		cursor: pointer;
		transition:
			border-color 160ms ease,
			box-shadow 160ms ease;
	}

	.learn span {
		display: grid;
		gap: 2px;
	}

	.learn strong {
		font: 700 1.02rem Spectral, Georgia, serif;
		color: #8ff0e2;
	}

	.learn small {
		font-size: 0.82rem;
		line-height: 1.35;
		color: #b5c9c1;
	}

	@media (hover: hover) {
		.learn:hover {
			border-color: rgba(80, 230, 215, 0.75);
			box-shadow: 0 0 22px rgba(80, 230, 215, 0.18);
		}
	}

	.cta {
		margin-top: 16px;
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
		font-size: 0.85rem;
	}

	.go {
		appearance: none;
		border: 0;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
		color: #1c1107;
		background: linear-gradient(180deg, #f6c873, #c88a2e);
		box-shadow:
			0 10px 24px rgba(0, 0, 0, 0.45),
			inset 0 1px 0 rgba(255, 240, 200, 0.6);
		animation: beckon 3.6s ease-in-out infinite;
	}

	.dock {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 12px;
		width: min(760px, 100%);
		margin: 18px auto 0;
	}

	@keyframes beckon {
		50% {
			box-shadow:
				0 10px 24px rgba(0, 0, 0, 0.45),
				0 0 28px rgba(255, 196, 106, 0.5),
				inset 0 1px 0 rgba(255, 240, 200, 0.6);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.go {
			animation: none;
		}

		.board i {
			transition: none;
		}
	}

	@media (max-width: 680px) {
		.board,
		.modes {
			grid-template-columns: 1fr;
		}

		.board small {
			display: none;
		}

		.board i {
			width: 34px;
			height: 46px;
			font-size: 1.15rem;
		}

		.chips button {
			min-width: 0;
			padding: 7px 12px;
		}
	}

	@media (max-width: 560px) {
		.dock {
			grid-template-columns: 1fr 1fr;
		}

		.dock > :global(.exit) {
			grid-column: 1 / -1;
		}
	}
</style>
