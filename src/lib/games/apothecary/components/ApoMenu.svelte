<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import ArcadeExit from '$lib/components/ArcadeExit.svelte';
	import ArcadeTile from '$lib/components/ArcadeTile.svelte';
	import ApoIcon from './ApoIcon.svelte';
	import { playSelect } from '../audio';
	import { peekSaved } from '../persist';
	import { apoPrefs, apoStats, openApoGuide, openApoSettings, persistApoPrefs, todaysBrew } from '../settings.svelte';
	import { BENCH_INFO, BENCHES, REAGENTS, STONE, reagentOf, todayKey, valueOf, type Board } from '../types';
	import type { ApoSession } from '../session.svelte';

	let { session }: { session: ApoSession } = $props();

	let choice = $state<Board>(apoPrefs.bench);
	const saved = $derived(peekSaved());
	const fresh = $derived(saved && (saved.board !== 'daily' || saved.date === todayKey()) ? saved : null);
	const today = $derived(todaysBrew());
	const codex = $derived(REAGENTS.slice(1, Math.max(apoStats.discovered, 2) + 2).map((r, i) => ({ ...r, tier: i + 1 })));

	function pick(board: Board) {
		choice = board;
		if (board !== 'daily') {
			apoPrefs.bench = board;
			persistApoPrefs();
		}
		playSelect();
	}

	function launch() {
		session.start(choice);
	}

	function resume() {
		playSelect();
		session.resume();
	}

	const best = $derived(choice === 'daily' ? today.score : apoStats.best[choice]);
	const top = $derived(choice === 'daily' ? today.top : apoStats.top[choice]);
</script>

<section class="menu" in:fade={{ duration: 420 }}>
	<div class="crest" in:fly={{ y: 10, duration: 420 }}>
		<ApoIcon size="hero" />
	</div>
	<p class="kicker" in:fly={{ y: 12, duration: 460 }}>An alchemist's bench</p>
	<h1 in:fly={{ y: 18, duration: 600 }}>Apothecary</h1>
	<p class="lede">
		Tip the whole rack one way and every vial slides with it. Two of the same reagent pour together into something rarer:
		rainwater to brine, brine to sulphur, on up the ladder. Distil all the way to the
		<strong>Philosopher's Stone</strong> before the rack fills.
	</p>

	<div class="benches">
		{#each BENCHES as bench (bench)}
			{@const info = BENCH_INFO[bench]}
			<button class="card" class:on={choice === bench} onclick={() => pick(bench)}>
				<span class="tag">{info.tag}</span>
				<strong>{info.name}</strong>
				<small>{info.body}</small>
			</button>
		{/each}
		<button class="card daily" class:on={choice === 'daily'} onclick={() => pick('daily')}>
			<span class="tag">Same for everyone</span>
			<strong>Brew of the day</strong>
			<small>{today.tries ? `Today: ${today.score} · ${today.tries} ${today.tries === 1 ? 'try' : 'tries'}` : 'One recipe, one rack, every vial in the same order.'}</small>
		</button>
	</div>

	<div class="codex" aria-label="Reagents discovered">
		{#each codex as reagent (reagent.tier)}
			{@const known = reagent.tier <= apoStats.discovered}
			<span class="drop" class:known class:rare={reagent.tier >= 8} style:--c={reagent.color} title={known ? `${valueOf(reagent.tier)} · ${reagent.name}` : 'Undiscovered'}>
				<i></i>
				<em>{known ? reagent.name : '???'}</em>
			</span>
		{/each}
	</div>

	<p class="ledger">
		<span>Best brew <strong>{best || '—'}</strong></span>
		<span>Rarest <strong>{top ? reagentOf(top).name : '—'}</strong></span>
		<span>Stones made <strong>{apoStats.stones}</strong></span>
	</p>

	<div class="cta">
		{#if fresh}
			<button class="ghost" onclick={resume}>
				Resume {fresh.board === 'daily' ? "today's brew" : BENCH_INFO[fresh.board].name.toLowerCase()} · {fresh.score}
			</button>
		{/if}
		<button class="go" onclick={launch}>Light the burner</button>
	</div>
	<p class="goal">Reach {valueOf(STONE)} to make the Stone. Three stoppers let you take a pour back.</p>
	<nav class="dock" aria-label="Apothecary">
		<ArcadeTile tone="brew" size="tile" kicker="Rules" label="How to play" onclick={openApoGuide} />
		<ArcadeTile tone="brew" size="tile" kicker="Tune" label="Settings" onclick={openApoSettings} />
		<ArcadeExit tone="brew" size="tile" />
	</nav>
</section>

<style>
	.menu {
		position: relative;
		z-index: 2;
		width: min(840px, 100%);
		text-align: center;
		color: #f1e6c8;
		padding-bottom: 4vh;
	}

	.crest {
		display: grid;
		place-items: center;
		margin-bottom: 8px;
	}

	.kicker {
		margin: 0;
		letter-spacing: 0.32em;
		text-transform: uppercase;
		font-size: 0.72rem;
		color: #e0b25c;
		text-shadow: 0 1px 8px rgba(0, 0, 0, 0.8);
	}

	h1 {
		margin: 4px 0 0;
		font-family: Cinzel, Georgia, serif;
		font-weight: 700;
		font-size: clamp(2.6rem, 8.6vw, 5rem);
		letter-spacing: 0.04em;
		line-height: 1;
		color: #fbf1d8;
		text-shadow:
			0 0 28px rgba(255, 60, 100, 0.4),
			0 2px 0 rgba(90, 20, 30, 0.7),
			0 8px 26px rgba(0, 0, 0, 0.7);
	}

	.lede {
		margin: 14px auto 0;
		max-width: 37rem;
		padding: 12px 18px;
		border-radius: 10px;
		background: rgba(14, 20, 17, 0.78);
		border: 1px solid rgba(214, 170, 92, 0.3);
		font-family: Spectral, Georgia, serif;
		font-size: 1.04rem;
		line-height: 1.5;
		color: #e8dcc0;
		box-shadow: 0 10px 26px rgba(0, 0, 0, 0.45);
		backdrop-filter: blur(4px);
	}

	.lede strong {
		color: #ff7a92;
	}

	.benches {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
		margin-top: 18px;
	}

	.card,
	.go,
	.ghost {
		appearance: none;
		font: inherit;
		cursor: pointer;
	}

	.card {
		display: grid;
		align-content: start;
		text-align: left;
		border-radius: 10px;
		padding: 12px 16px 14px;
		border: 1px solid rgba(214, 170, 92, 0.35);
		background: linear-gradient(180deg, rgba(30, 42, 36, 0.92), rgba(16, 24, 20, 0.94));
		color: #f1e6c8;
		box-shadow:
			inset 0 1px 0 rgba(255, 240, 200, 0.12),
			0 8px 22px rgba(0, 0, 0, 0.45);
		transition:
			border-color 180ms ease,
			transform 180ms ease,
			box-shadow 180ms ease;
	}

	.card.on {
		border-color: #e0b25c;
		box-shadow:
			inset 0 1px 0 rgba(255, 240, 200, 0.2),
			0 0 0 2px rgba(224, 178, 92, 0.45),
			0 12px 28px rgba(0, 0, 0, 0.5),
			0 0 30px rgba(111, 227, 176, 0.18);
		transform: translateY(-3px);
	}

	.daily.on {
		border-color: #ff6a86;
		box-shadow:
			0 0 0 2px rgba(255, 60, 100, 0.4),
			0 12px 28px rgba(0, 0, 0, 0.5),
			0 0 30px rgba(255, 60, 100, 0.22);
	}

	.tag {
		display: block;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-size: 0.62rem;
		font-weight: 700;
		color: #6fe3b0;
		margin-bottom: 3px;
	}

	.daily .tag {
		color: #ff8aa0;
	}

	.card strong {
		display: block;
		font-family: Cinzel, Georgia, serif;
		font-weight: 700;
		font-size: 1.12rem;
	}

	.card small {
		display: block;
		margin-top: 4px;
		color: #b9ad90;
		font-family: Spectral, Georgia, serif;
		line-height: 1.35;
		font-size: 0.92rem;
	}

	.codex {
		margin: 16px auto 0;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 6px;
		max-width: 46rem;
	}

	.drop {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px 4px 5px;
		border-radius: 999px;
		background: rgba(10, 14, 12, 0.7);
		border: 1px solid rgba(214, 170, 92, 0.2);
		font-family: Spectral, Georgia, serif;
		font-size: 0.8rem;
		color: #8a8070;
	}

	.drop i {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: #2a2a2a;
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.15);
	}

	.drop em {
		font-style: normal;
	}

	.drop.known {
		color: #f1e6c8;
	}

	.drop.known i {
		background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--c) 50%, white), var(--c) 60%, color-mix(in srgb, var(--c) 50%, black));
	}

	.drop.known.rare i {
		box-shadow: 0 0 10px var(--c);
	}

	.ledger {
		margin: 14px auto 0;
		width: fit-content;
		display: flex;
		gap: 28px;
		padding: 8px 22px;
		border-radius: 10px;
		background: rgba(8, 10, 9, 0.6);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-size: 0.62rem;
		color: #c9a560;
	}

	.ledger strong {
		display: block;
		margin-top: 3px;
		font-family: Spectral, Georgia, serif;
		font-size: 1.08rem;
		letter-spacing: 0.02em;
		text-transform: none;
		color: #fbf1d8;
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
		background: linear-gradient(180deg, #ff5a78, #a8122f);
		color: #fff4f0;
		box-shadow:
			0 10px 26px rgba(0, 0, 0, 0.45),
			0 0 26px rgba(255, 60, 100, 0.35),
			inset 0 1px 0 rgba(255, 220, 220, 0.45);
	}

	.ghost {
		border: 1px solid rgba(214, 170, 92, 0.5);
		background: rgba(16, 24, 20, 0.85);
		color: #f1e6c8;
		padding: 13px 22px;
	}

	.goal {
		margin: 10px 0 0;
		font-family: Spectral, Georgia, serif;
		font-size: 0.88rem;
		color: #b9ad90;
		text-shadow: 0 1px 6px rgba(0, 0, 0, 0.8);
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
		.benches {
			grid-template-columns: 1fr;
		}

		.card small {
			display: none;
		}

		.codex em {
			display: none;
		}

		.drop {
			padding: 4px;
		}

		.ledger {
			gap: 16px;
			padding: 8px 14px;
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
