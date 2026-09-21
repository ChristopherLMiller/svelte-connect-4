<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import ArcadeExit from '$lib/components/ArcadeExit.svelte';
	import TttIcon from './TttIcon.svelte';
	import { playSelect } from '../audio';
	import { peekSaved } from '../persist';
	import { persistTttPlay, tttPlay, tttScores, openTttSettings } from '../settings.svelte';
	import type { TttSession } from '../session.svelte';
	import type { Difficulty, GameMode } from '../types';

	let { session }: { session: TttSession } = $props();

	const mode = $derived(tttPlay.mode);
	const difficulty = $derived(tttPlay.difficulty);
	const record = $derived(mode === 'ai' ? tttScores.ai[difficulty] : tttScores.local);
	const saved = $derived(peekSaved());

	function choose(next: GameMode) {
		tttPlay.mode = next;
		session.mode = next;
		persistTttPlay();
		playSelect();
	}

	function chooseDifficulty(next: Difficulty) {
		tttPlay.difficulty = next;
		session.difficulty = next;
		persistTttPlay();
		playSelect();
	}

	function launch() {
		playSelect();
		session.start(mode, difficulty);
	}

	function resume() {
		playSelect();
		session.resume();
	}
</script>

<section class="menu" in:fade={{ duration: 380 }}>
	<div class="crest" in:fly={{ y: 10, duration: 380 }}>
		<TttIcon size="hero" />
	</div>
	<p class="kicker" in:fly={{ y: 12, duration: 420 }}>Drawn in the wet sand</p>
	<h1 in:fly={{ y: 18, duration: 560 }}>
		Tide <em>&</em> Cross
	</h1>
	<p class="lede">
		Look down. Scratch three in a line with a stick. When the round ends, the water takes the board back.
	</p>

	<div class="modes">
		<button class="card" class:on={mode === 'local'} onclick={() => choose('local')}>
			<span class="tag">Hotseat</span>
			<strong>Shore duel</strong>
			<small>Pass the stick. Cross and Loop, same square of sand.</small>
		</button>
		<button class="card" class:on={mode === 'ai'} onclick={() => choose('ai')}>
			<span class="tag">The Tide</span>
			<strong>Play the water</strong>
			<small>A quiet mind that knows every fork in the grid.</small>
		</button>
	</div>

	{#if mode === 'ai'}
		<div class="diffs">
			{#each ['easy', 'medium', 'hard'] as level (level)}
				<button class:on={difficulty === level} onclick={() => chooseDifficulty(level as Difficulty)}>
					{level}
				</button>
			{/each}
		</div>
	{/if}

	<p class="ledger">
		{mode === 'ai' ? 'Against the tide' : 'Hotseat ledger'}
		<strong>Cross {record[1]} — {record[2]} {mode === 'ai' ? 'Tide' : 'Loop'}</strong>
	</p>

	<div class="cta">
		{#if saved}
			<button class="ghost" onclick={resume}>Resume the last tide</button>
		{/if}
		<button class="go" onclick={launch}>Draw in the sand</button>
		<button class="ghost" onclick={() => openTttSettings()}>Settings</button>
	</div>
	<ArcadeExit tone="shore" size="banner" />
</section>

<style>
	.menu {
		position: relative;
		z-index: 2;
		width: min(720px, 100%);
		text-align: center;
		color: #3b2a1c;
		padding-bottom: 12vh;
	}

	.crest {
		display: grid;
		place-items: center;
		margin-bottom: 10px;
	}

	.kicker {
		margin: 0;
		letter-spacing: 0.26em;
		text-transform: uppercase;
		font-size: 0.72rem;
		color: #6a5340;
	}

	h1 {
		margin: 8px 0 0;
		font-family: Fraunces, Georgia, serif;
		font-style: italic;
		font-weight: 600;
		font-size: clamp(2.6rem, 8vw, 4.6rem);
		letter-spacing: -0.04em;
		line-height: 0.95;
	}

	h1 em {
		font-style: italic;
		color: #1d6d86;
		padding: 0 0.12em;
	}

	.lede {
		margin: 14px auto 0;
		max-width: 28rem;
		color: #5c4634;
		line-height: 1.5;
	}

	.modes {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
		margin-top: 28px;
	}

	.card,
	.go,
	.ghost,
	.diffs button {
		appearance: none;
		border: 1px solid rgba(90, 64, 42, 0.18);
		background: rgba(255, 248, 236, 0.42);
		color: inherit;
		cursor: pointer;
		font: inherit;
	}

	.card {
		text-align: left;
		border-radius: 18px;
		padding: 16px 18px 18px;
		backdrop-filter: blur(8px);
	}

	.card.on {
		border-color: rgba(29, 109, 134, 0.55);
		background: rgba(255, 252, 246, 0.7);
		box-shadow: 0 10px 24px rgba(62, 40, 22, 0.12);
	}

	.tag {
		display: block;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-size: 0.68rem;
		color: #1d6d86;
		margin-bottom: 6px;
	}

	.card strong {
		display: block;
		font-size: 1.15rem;
	}

	.card small {
		display: block;
		margin-top: 6px;
		color: #6a5340;
		line-height: 1.4;
	}

	.diffs {
		margin-top: 16px;
		display: flex;
		justify-content: center;
		gap: 8px;
	}

	.diffs button {
		border-radius: 999px;
		padding: 8px 14px;
		text-transform: capitalize;
	}

	.diffs button.on {
		background: #1d6d86;
		color: #f4fbff;
		border-color: transparent;
	}

	.ledger {
		margin: 22px 0 0;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		font-size: 0.72rem;
		color: #6a5340;
	}

	.ledger strong {
		display: block;
		margin-top: 4px;
		font-size: 1rem;
		letter-spacing: 0;
		text-transform: none;
		color: #3b2a1c;
	}

	.cta {
		margin-top: 22px;
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: 10px;
	}

	.go,
	.ghost {
		border-radius: 999px;
		padding: 14px 28px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		transition:
			transform 160ms ease,
			border-color 160ms ease,
			background 160ms ease;
	}

	.go {
		border: 0;
		background: linear-gradient(180deg, #f8ead8, #e0b07a);
		color: #2a1a12;
		box-shadow:
			0 10px 24px rgba(62, 40, 22, 0.14),
			inset 0 1px 0 rgba(255, 255, 255, 0.55);
	}

	.ghost {
		padding: 14px 22px;
		background: rgba(255, 248, 236, 0.42);
	}

	.go:hover,
	.ghost:hover {
		transform: translateY(-2px);
	}

	@media (prefers-reduced-motion: reduce) {
		.go:hover,
		.ghost:hover {
			transform: none;
		}
	}

	@media (max-width: 640px) {
		.modes {
			grid-template-columns: 1fr;
		}
	}
</style>
