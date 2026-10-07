<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import ArcadeExit from '$lib/components/ArcadeExit.svelte';
	import ArcadeTile from '$lib/components/ArcadeTile.svelte';
	import CartIcon from './CartIcon.svelte';
	import { playSelect } from '../audio';
	import { peekSaved } from '../persist';
	import { cartPlay, cartScores, cartView, openCartGuide, openCartSettings, persistCartPlay, persistCartView } from '../settings.svelte';
	import { CHART_INFO, CHARTS, type Chart, type Difficulty, type GameMode } from '../types';
	import type { CartSession } from '../session.svelte';

	let { session }: { session: CartSession } = $props();

	const mode = $derived(cartPlay.mode);
	const difficulty = $derived(cartPlay.difficulty);
	const record = $derived(mode === 'ai' ? cartScores.ai[difficulty] : cartScores.local);
	const saved = $derived(peekSaved());

	function choose(next: GameMode) {
		cartPlay.mode = next;
		session.mode = next;
		persistCartPlay();
		playSelect();
	}

	function chooseDifficulty(next: Difficulty) {
		cartPlay.difficulty = next;
		session.difficulty = next;
		persistCartPlay();
		playSelect();
	}

	function chooseChart(next: Chart) {
		cartView.chart = next;
		session.chart = next;
		persistCartView();
		playSelect();
	}

	function launch() {
		session.start(mode, difficulty, cartView.chart);
	}

	function resume() {
		playSelect();
		session.resume();
	}
</script>

<section class="menu" in:fade={{ duration: 420 }}>
	<div class="crest" in:fly={{ y: 10, duration: 420 }}>
		<CartIcon size="hero" />
	</div>
	<p class="kicker" in:fly={{ y: 12, duration: 460 }}>Rival mapmakers by candlelight</p>
	<h1 in:fly={{ y: 18, duration: 600 }}>Cartographer</h1>
	<p class="lede">
		One blank sheet, two inks. Take turns drawing a border between neighbouring dots. Close a square and the land inside is
		yours: it blooms into coast, forest or sea monster, and you ink again. When the last line is drawn, the bigger share of
		the map wins.
	</p>

	<div class="charts">
		{#each CHARTS as chart (chart)}
			{@const info = CHART_INFO[chart]}
			<button class="card chart" class:on={cartView.chart === chart} onclick={() => chooseChart(chart)}>
				<span class="tag">{info.tag}</span>
				<strong>{info.name}</strong>
				<small>{info.blurb}</small>
				<span class="grid" aria-hidden="true" style:--n={info.size}></span>
			</button>
		{/each}
	</div>

	<div class="modes">
		<button class="card" class:on={mode === 'local'} onclick={() => choose('local')}>
			<span class="tag">Hotseat</span>
			<strong>Two quills, one desk</strong>
			<small>Vermilion against Indigo. Pass the pen.</small>
		</button>
		<button class="card" class:on={mode === 'ai'} onclick={() => choose('ai')}>
			<span class="tag">Mercator</span>
			<strong>Rival of the guild</strong>
			<small>An old hand who counts chains in his sleep.</small>
		</button>
	</div>

	{#if mode === 'ai'}
		<div class="diffs" transition:fade={{ duration: 160 }}>
			{#each ['easy', 'medium', 'hard'] as level (level)}
				<button class:on={difficulty === level} onclick={() => chooseDifficulty(level as Difficulty)}>
					{level === 'easy' ? 'Apprentice' : level === 'medium' ? 'Journeyman' : 'Master'}
				</button>
			{/each}
		</div>
	{/if}

	<p class="ledger">
		<span>
			{mode === 'ai' ? 'Against Mercator' : 'Hotseat ledger'}
			<strong>Vermilion {record[1]} — {record[2]} {mode === 'ai' ? 'Mercator' : 'Indigo'}</strong>
		</span>
		<span>
			Charts drawn
			<strong>{cartView.charted}</strong>
		</span>
	</p>

	<div class="cta">
		{#if saved}
			<button class="ghost" onclick={resume}>Resume {CHART_INFO[saved.chart].name.toLowerCase()}</button>
		{/if}
		<button class="go" onclick={launch}>Unroll the parchment</button>
	</div>
	<nav class="dock" aria-label="Cartographer">
		<ArcadeTile tone="ink" size="tile" kicker="Rules" label="How to play" onclick={openCartGuide} />
		<ArcadeTile tone="ink" size="tile" kicker="Tune" label="Settings" onclick={openCartSettings} />
		<ArcadeExit tone="ink" size="tile" />
	</nav>
</section>

<style>
	.menu {
		position: relative;
		z-index: 2;
		width: min(820px, 100%);
		text-align: center;
		color: #f6e8c8;
		padding-bottom: 4vh;
	}

	.crest {
		display: grid;
		place-items: center;
		margin-bottom: 10px;
	}

	.kicker {
		margin: 0;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		font-size: 0.72rem;
		color: #f0b866;
		text-shadow: 0 1px 8px rgba(0, 0, 0, 0.7);
	}

	h1 {
		margin: 4px 0 0;
		font-family: Almendra, 'EB Garamond', Georgia, serif;
		font-weight: 700;
		font-size: clamp(2.8rem, 9vw, 5.2rem);
		line-height: 0.95;
		color: #fbefd6;
		text-shadow:
			0 2px 0 rgba(120, 50, 20, 0.6),
			0 0 30px rgba(255, 170, 80, 0.45),
			0 8px 26px rgba(0, 0, 0, 0.6);
	}

	.lede {
		margin: 14px auto 0;
		max-width: 36rem;
		padding: 12px 18px;
		border-radius: 6px;
		background: rgba(246, 234, 208, 0.9);
		color: #3b2a1a;
		font-family: 'EB Garamond', Georgia, serif;
		font-size: 1.04rem;
		line-height: 1.5;
		box-shadow: 0 10px 26px rgba(0, 0, 0, 0.45);
	}

	.charts,
	.modes {
		display: grid;
		gap: 10px;
		margin-top: 18px;
	}

	.charts {
		grid-template-columns: repeat(3, 1fr);
	}

	.modes {
		grid-template-columns: 1fr 1fr;
		margin-top: 10px;
	}

	.card,
	.go,
	.ghost,
	.diffs button {
		appearance: none;
		border: 1px solid rgba(107, 72, 36, 0.45);
		background: linear-gradient(180deg, rgba(246, 234, 208, 0.92), rgba(228, 206, 162, 0.9));
		color: #2e2014;
		cursor: pointer;
		font: inherit;
	}

	.card {
		position: relative;
		display: grid;
		align-content: start;
		text-align: left;
		border-radius: 6px;
		padding: 12px 16px 14px;
		box-shadow:
			inset 0 1px 0 rgba(255, 248, 228, 0.8),
			0 8px 22px rgba(0, 0, 0, 0.4);
		transition:
			border-color 180ms ease,
			transform 180ms ease,
			box-shadow 180ms ease;
	}

	.card.on {
		border-color: #a33a1f;
		box-shadow:
			inset 0 1px 0 rgba(255, 248, 228, 0.9),
			0 0 0 2px rgba(179, 49, 29, 0.55),
			0 12px 28px rgba(0, 0, 0, 0.5),
			0 0 30px rgba(255, 170, 80, 0.25);
		transform: translateY(-3px) rotate(-0.4deg);
	}

	.tag {
		display: block;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-size: 0.62rem;
		font-weight: 700;
		color: #a33a1f;
		margin-bottom: 3px;
	}

	.card strong {
		display: block;
		font-family: Almendra, 'EB Garamond', Georgia, serif;
		font-weight: 700;
		font-size: 1.32rem;
	}

	.card small {
		display: block;
		margin-top: 3px;
		color: #6b5238;
		font-family: 'EB Garamond', Georgia, serif;
		line-height: 1.35;
		font-size: 0.95rem;
	}

	.chart {
		padding-right: 64px;
	}

	.grid {
		position: absolute;
		right: 14px;
		top: 50%;
		translate: 0 -50%;
		width: 38px;
		height: 38px;
		background-image:
			radial-gradient(circle, #3b2a1a 1.5px, transparent 1.8px),
			linear-gradient(rgba(59, 42, 26, 0.18) 1px, transparent 1px),
			linear-gradient(90deg, rgba(59, 42, 26, 0.18) 1px, transparent 1px);
		background-size: calc(38px / var(--n)) calc(38px / var(--n));
		background-position:
			calc(-19px / var(--n)) calc(-19px / var(--n)),
			0 0,
			0 0;
		border: 1px solid rgba(59, 42, 26, 0.3);
	}

	.diffs {
		margin-top: 14px;
		display: flex;
		justify-content: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.diffs button {
		border-radius: 999px;
		padding: 8px 16px;
		font-family: 'EB Garamond', Georgia, serif;
		font-size: 1rem;
	}

	.diffs button.on {
		background: linear-gradient(180deg, #c4482a, #8e2a14);
		border-color: transparent;
		color: #fbefd6;
		font-weight: 600;
	}

	.ledger {
		margin: 16px auto 0;
		width: fit-content;
		display: flex;
		gap: 32px;
		padding: 8px 22px;
		border-radius: 6px;
		background: rgba(20, 12, 6, 0.55);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-size: 0.64rem;
		color: #e2c08a;
	}

	.ledger strong {
		display: block;
		margin-top: 3px;
		font-family: 'EB Garamond', Georgia, serif;
		font-size: 1.1rem;
		letter-spacing: 0.02em;
		text-transform: none;
		color: #fbefd6;
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
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-size: 0.85rem;
		transition:
			transform 160ms ease,
			box-shadow 160ms ease;
	}

	.go {
		border: 0;
		background: linear-gradient(180deg, #d0553a, #8e2a14);
		color: #fbefd6;
		box-shadow:
			0 10px 26px rgba(0, 0, 0, 0.45),
			0 0 26px rgba(255, 120, 60, 0.3),
			inset 0 1px 0 rgba(255, 220, 190, 0.45);
	}

	.ghost {
		padding: 13px 22px;
	}

	@media (hover: hover) {
		.go:hover,
		.ghost:hover,
		.card:hover {
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

	@media (prefers-reduced-motion: reduce) {
		.go:hover,
		.ghost:hover,
		.card:hover,
		.card.on {
			transform: none;
		}
	}

	@media (max-width: 680px) {
		.charts {
			grid-template-columns: 1fr;
		}

		.chart small {
			display: none;
		}

		.modes {
			grid-template-columns: 1fr;
		}

		.ledger {
			gap: 20px;
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
