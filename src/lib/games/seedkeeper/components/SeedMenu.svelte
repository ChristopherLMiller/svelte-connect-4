<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import ArcadeExit from '$lib/components/ArcadeExit.svelte';
	import ArcadeTile from '$lib/components/ArcadeTile.svelte';
	import SeedIcon from './SeedIcon.svelte';
	import { playSelect } from '../audio';
	import { peekSaved } from '../persist';
	import { openSeedGuide, openSeedSettings, persistSeedPlay, persistSeedView, seedPlay, seedScores, seedView } from '../settings.svelte';
	import { SOWING_INFO, SOWINGS, type Difficulty, type GameMode, type Sowing } from '../types';
	import type { SeedSession } from '../session.svelte';

	let { session }: { session: SeedSession } = $props();

	const mode = $derived(seedPlay.mode);
	const difficulty = $derived(seedPlay.difficulty);
	const record = $derived(mode === 'ai' ? seedScores.ai[difficulty] : seedScores.local);
	const saved = $derived(peekSaved());
	const hues = ['#4fae80', '#e2a03c', '#e293a6', '#7ea6cf', '#e4d8b8', '#3b3644'];

	function choose(next: GameMode) {
		seedPlay.mode = next;
		session.mode = next;
		persistSeedPlay();
		playSelect();
	}

	function chooseDifficulty(next: Difficulty) {
		seedPlay.difficulty = next;
		session.difficulty = next;
		persistSeedPlay();
		playSelect();
	}

	function chooseSowing(next: Sowing) {
		seedView.sowing = next;
		session.sowing = next;
		persistSeedView();
		playSelect();
	}

	function launch() {
		session.start(mode, difficulty, seedView.sowing);
	}

	function resume() {
		playSelect();
		session.resume();
	}
</script>

<section class="menu" in:fade={{ duration: 420 }}>
	<div class="crest" in:fly={{ y: 10, duration: 420 }}>
		<SeedIcon size="hero" />
	</div>
	<p class="kicker" in:fly={{ y: 12, duration: 460 }}>River stones at dusk</p>
	<h1 in:fly={{ y: 18, duration: 600 }}>Seedkeeper</h1>
	<p class="lede">
		Lift every seed from one of your pits and sow them one by one around the stone, toward your store. Drop the last seed in
		your store and you sow again. Land it in an empty pit of your own and you capture everything across the river. Most seeds
		home when a row runs dry wins.
	</p>

	<div class="sowings">
		{#each SOWINGS as sowing (sowing)}
			{@const info = SOWING_INFO[sowing]}
			<button class="card sowing" class:on={seedView.sowing === sowing} onclick={() => chooseSowing(sowing)}>
				<span class="tag">{info.tag}</span>
				<strong>{info.name}</strong>
				<small>{info.blurb}</small>
				<span class="pit" aria-hidden="true">
					{#each Array.from({ length: info.seeds }, (_, k) => k) as k (k)}
						<i style:--a="{k * 137.5}deg" style:--r="{4 + Math.sqrt(k) * 5}px" style:--c={hues[k % hues.length]} style:--d="{k * 0.18}s"></i>
					{/each}
				</span>
			</button>
		{/each}
	</div>

	<div class="modes">
		<button class="card" class:on={mode === 'local'} onclick={() => choose('local')}>
			<span class="tag">Hotseat</span>
			<strong>Two by the river</strong>
			<small>Firefly against Heron. Pass the stones.</small>
		</button>
		<button class="card" class:on={mode === 'ai'} onclick={() => choose('ai')}>
			<span class="tag">Old Heron</span>
			<strong>Patient as still water</strong>
			<small>He has watched these stones for a hundred summers.</small>
		</button>
	</div>

	{#if mode === 'ai'}
		<div class="diffs" transition:fade={{ duration: 160 }}>
			{#each ['easy', 'medium', 'hard'] as level (level)}
				<button class:on={difficulty === level} onclick={() => chooseDifficulty(level as Difficulty)}>
					{level === 'easy' ? 'Fledgling' : level === 'medium' ? 'Wader' : 'Elder'}
				</button>
			{/each}
		</div>
	{/if}

	<p class="ledger">
		<span>
			{mode === 'ai' ? 'Against Old Heron' : 'By the river'}
			<strong>Firefly {record[1]} — {record[2]} {mode === 'ai' ? 'Old Heron' : 'Heron'}</strong>
		</span>
		<span>
			Harvests
			<strong>{seedView.harvests}</strong>
		</span>
	</p>

	<div class="cta">
		{#if saved}
			<button class="ghost" onclick={resume}>Resume {SOWING_INFO[saved.sowing].name.toLowerCase()}</button>
		{/if}
		<button class="go" onclick={launch}>Sow the first seed</button>
	</div>
	<nav class="dock" aria-label="Seedkeeper">
		<ArcadeTile tone="moss" size="tile" kicker="Rules" label="How to play" onclick={openSeedGuide} />
		<ArcadeTile tone="moss" size="tile" kicker="Tune" label="Settings" onclick={openSeedSettings} />
		<ArcadeExit tone="moss" size="tile" />
	</nav>
</section>

<style>
	.menu {
		position: relative;
		z-index: 2;
		width: min(820px, 100%);
		text-align: center;
		color: #f3ecd6;
		padding-bottom: 4vh;
	}

	.crest {
		display: grid;
		place-items: center;
		margin-bottom: 8px;
		animation: bob 5s ease-in-out infinite;
	}

	.kicker {
		margin: 0;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		font-size: 0.72rem;
		font-weight: 800;
		color: #c8f06a;
		text-shadow: 0 1px 8px rgba(0, 0, 0, 0.7);
	}

	h1 {
		margin: 4px 0 0;
		font-family: Fraunces, Georgia, serif;
		font-weight: 700;
		font-size: clamp(2.8rem, 9vw, 5.2rem);
		line-height: 0.95;
		color: #fff4d6;
		text-shadow:
			0 2px 0 rgba(40, 60, 20, 0.6),
			0 0 34px rgba(246, 196, 83, 0.5),
			0 8px 26px rgba(0, 0, 0, 0.6);
		animation: glow 6s ease-in-out infinite;
	}

	.lede {
		margin: 14px auto 0;
		max-width: 37rem;
		padding: 13px 18px;
		border-radius: 14px;
		background: rgba(14, 22, 13, 0.72);
		border: 1px solid rgba(184, 240, 106, 0.18);
		backdrop-filter: blur(6px);
		color: #e8e2c8;
		font-size: 1rem;
		line-height: 1.55;
		box-shadow: 0 10px 26px rgba(0, 0, 0, 0.45);
	}

	.sowings,
	.modes {
		display: grid;
		gap: 10px;
		margin-top: 18px;
	}

	.sowings {
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
		border: 1px solid rgba(184, 240, 106, 0.22);
		background: linear-gradient(180deg, rgba(30, 44, 28, 0.9), rgba(14, 22, 13, 0.92));
		color: #f3ecd6;
		cursor: pointer;
		font: inherit;
	}

	.card {
		position: relative;
		display: grid;
		align-content: start;
		text-align: left;
		border-radius: 14px;
		padding: 12px 16px 14px;
		backdrop-filter: blur(6px);
		box-shadow:
			inset 0 1px 0 rgba(230, 255, 190, 0.08),
			0 8px 22px rgba(0, 0, 0, 0.4);
		transition:
			border-color 180ms ease,
			transform 180ms ease,
			box-shadow 180ms ease;
	}

	.card.on {
		border-color: #f6c453;
		box-shadow:
			inset 0 1px 0 rgba(255, 240, 190, 0.14),
			0 0 0 2px rgba(246, 196, 83, 0.4),
			0 12px 28px rgba(0, 0, 0, 0.5),
			0 0 30px rgba(246, 196, 83, 0.25);
		transform: translateY(-3px);
	}

	.tag {
		display: block;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-size: 0.62rem;
		font-weight: 800;
		color: #c8f06a;
		margin-bottom: 3px;
	}

	.card strong {
		display: block;
		font-family: Fraunces, Georgia, serif;
		font-weight: 700;
		font-size: 1.28rem;
	}

	.card small {
		display: block;
		margin-top: 3px;
		color: #bdb79c;
		line-height: 1.35;
		font-size: 0.92rem;
	}

	.sowing {
		padding-right: 68px;
	}

	.pit {
		position: absolute;
		right: 12px;
		top: 50%;
		translate: 0 -50%;
		width: 46px;
		height: 46px;
		border-radius: 50%;
		background: radial-gradient(circle at 40% 35%, #2d3229, #10130d);
		box-shadow:
			0 0 0 3px #5b6358,
			inset 0 3px 6px rgba(0, 0, 0, 0.7);
	}

	.pit i {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 9px;
		height: 7px;
		margin: -3.5px 0 0 -4.5px;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 30%, #fff8, var(--c) 45%, color-mix(in srgb, var(--c) 50%, black));
		transform: rotate(var(--a)) translate(var(--r)) rotate(calc(var(--a) * -1));
		animation: settle 3.2s ease-in-out var(--d) infinite;
	}

	.sowing.on .pit i {
		animation-duration: 1.4s;
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
		padding: 8px 18px;
		font-weight: 700;
		font-size: 0.95rem;
	}

	.diffs button.on {
		background: linear-gradient(180deg, #ffd56e, #d69a22);
		border-color: transparent;
		color: #1c1406;
	}

	.ledger {
		margin: 16px auto 0;
		width: fit-content;
		display: flex;
		gap: 32px;
		padding: 8px 22px;
		border-radius: 12px;
		background: rgba(8, 14, 8, 0.6);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-size: 0.64rem;
		font-weight: 700;
		color: #c8f06a;
	}

	.ledger strong {
		display: block;
		margin-top: 3px;
		font-family: Fraunces, Georgia, serif;
		font-size: 1.1rem;
		letter-spacing: 0.02em;
		text-transform: none;
		color: #fff4d6;
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
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-size: 0.85rem;
		transition:
			transform 160ms ease,
			box-shadow 160ms ease;
	}

	.go {
		border: 0;
		background: linear-gradient(180deg, #ffd56e, #d69a22);
		color: #1c1406;
		box-shadow:
			0 10px 26px rgba(0, 0, 0, 0.45),
			0 0 28px rgba(246, 196, 83, 0.4),
			inset 0 1px 0 rgba(255, 250, 220, 0.6);
		animation: beckon 3.6s ease-in-out infinite;
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

	@keyframes bob {
		50% {
			translate: 0 -6px;
			rotate: -2deg;
		}
	}

	@keyframes glow {
		50% {
			text-shadow:
				0 2px 0 rgba(40, 60, 20, 0.6),
				0 0 46px rgba(246, 196, 83, 0.75),
				0 8px 26px rgba(0, 0, 0, 0.6);
		}
	}

	@keyframes settle {
		0%,
		100% {
			translate: 0 0;
		}
		50% {
			translate: 0 -1.5px;
		}
	}

	@keyframes beckon {
		50% {
			box-shadow:
				0 10px 26px rgba(0, 0, 0, 0.45),
				0 0 44px rgba(246, 196, 83, 0.65),
				inset 0 1px 0 rgba(255, 250, 220, 0.6);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.crest,
		h1,
		.go,
		.pit i {
			animation: none;
		}

		.go:hover,
		.ghost:hover,
		.card:hover,
		.card.on {
			transform: none;
		}
	}

	@media (max-width: 680px) {
		.sowings {
			grid-template-columns: 1fr;
		}

		.sowing small {
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
