<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import ArcadeExit from '$lib/components/ArcadeExit.svelte';
	import AshIcon from './AshIcon.svelte';
	import { playSelect } from '../audio';
	import { peekSaved } from '../persist';
	import { persistAshPlay, ashPlay, ashScores, openAshSettings } from '../settings.svelte';
	import type { AshSession } from '../session.svelte';
	import type { Difficulty, GameMode } from '../types';

	let { session }: { session: AshSession } = $props();

	const mode = $derived(ashPlay.mode);
	const difficulty = $derived(ashPlay.difficulty);
	const record = $derived(mode === 'ai' ? ashScores.ai[difficulty] : ashScores.local);
	const saved = $derived(peekSaved());

	function choose(next: GameMode) {
		ashPlay.mode = next;
		session.mode = next;
		persistAshPlay();
		playSelect();
	}

	function chooseDifficulty(next: Difficulty) {
		ashPlay.difficulty = next;
		session.difficulty = next;
		persistAshPlay();
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
		<AshIcon size="hero" />
	</div>
	<p class="kicker" in:fly={{ y: 12, duration: 420 }}>A walled kiln yard</p>
	<h1 in:fly={{ y: 18, duration: 560 }}>Ashcourt</h1>
	<p class="lede">
		Oxblood glaze against bone china, under a hard noon sun. Hop, or send a piece back into the
		fire. Crown a man and the glaze runs wet.
	</p>

	<div class="modes">
		<button class="card" class:on={mode === 'local'} onclick={() => choose('local')}>
			<span class="tag">Hotseat</span>
			<strong>Yard duel</strong>
			<small>Pass the board. Ember hops up, bone hops down.</small>
		</button>
		<button class="card" class:on={mode === 'ai'} onclick={() => choose('ai')}>
			<span class="tag">The Yard</span>
			<strong>Play the clay</strong>
			<small>A patient mind that likes a long, dry game.</small>
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
		{mode === 'ai' ? 'Against the yard' : 'Hotseat ledger'}
		<strong>Ember {record[1]} — {record[2]} {mode === 'ai' ? 'Yard' : 'Bone'}</strong>
	</p>

	<div class="cta">
		{#if saved}
			<button class="ghost" onclick={resume}>Resume the last court</button>
		{/if}
		<button class="go" onclick={launch}>Step onto the tiles</button>
		<button class="ghost" onclick={() => openAshSettings()}>Settings</button>
	</div>
	<ArcadeExit tone="ash" size="banner" />
</section>

<style>
	.menu {
		position: relative;
		z-index: 2;
		width: min(720px, 100%);
		text-align: center;
		color: #2a221c;
		padding-bottom: 4vh;
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
		color: #9e1b2a;
	}

	h1 {
		margin: 8px 0 0;
		font-family: 'Cormorant Garamond', Palatino, serif;
		font-style: italic;
		font-weight: 700;
		font-size: clamp(2.8rem, 8vw, 4.8rem);
		letter-spacing: -0.03em;
		line-height: 0.92;
	}

	.lede {
		margin: 14px auto 0;
		max-width: 30rem;
		color: #5a4e42;
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
		border: 1px solid rgba(158, 27, 42, 0.22);
		background: rgba(255, 250, 242, 0.72);
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
		border-color: rgba(158, 27, 42, 0.7);
		background: rgba(255, 255, 255, 0.92);
		box-shadow: 0 10px 24px rgba(70, 50, 30, 0.12);
	}

	.tag {
		display: block;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-size: 0.68rem;
		color: #9e1b2a;
		margin-bottom: 6px;
	}

	.card strong {
		display: block;
		font-size: 1.15rem;
	}

	.card small {
		display: block;
		margin-top: 6px;
		color: #5a4e42;
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
		background: #9e1b2a;
		color: #fff8f2;
		border-color: transparent;
	}

	.ledger {
		margin: 22px 0 0;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		font-size: 0.72rem;
		color: #3d6b5c;
	}

	.ledger strong {
		display: block;
		margin-top: 4px;
		font-size: 1rem;
		letter-spacing: 0;
		text-transform: none;
		color: #2a221c;
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
		background: linear-gradient(180deg, #c43b4a, #9e1b2a);
		color: #fff8f2;
		box-shadow:
			0 10px 24px rgba(90, 20, 28, 0.22),
			inset 0 1px 0 rgba(255, 255, 255, 0.28);
	}

	.ghost {
		padding: 14px 22px;
		background: rgba(255, 250, 242, 0.72);
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
