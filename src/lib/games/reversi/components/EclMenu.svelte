<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import ArcadeExit from '$lib/components/ArcadeExit.svelte';
	import ArcadeTile from '$lib/components/ArcadeTile.svelte';
	import EclIcon from './EclIcon.svelte';
	import { playSelect } from '../audio';
	import { peekSaved } from '../persist';
	import { eclPlay, eclScores, openEclGuide, openEclSettings, persistEclPlay } from '../settings.svelte';
	import type { EclSession } from '../session.svelte';
	import type { Difficulty, GameMode } from '../types';

	let { session }: { session: EclSession } = $props();

	const mode = $derived(eclPlay.mode);
	const difficulty = $derived(eclPlay.difficulty);
	const record = $derived(mode === 'ai' ? eclScores.ai[difficulty] : eclScores.local);
	const saved = $derived(peekSaved());

	function choose(next: GameMode) {
		eclPlay.mode = next;
		session.mode = next;
		persistEclPlay();
		playSelect();
	}

	function chooseDifficulty(next: Difficulty) {
		eclPlay.difficulty = next;
		session.difficulty = next;
		persistEclPlay();
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

<section class="menu" in:fade={{ duration: 420 }}>
	<div class="crest" in:fly={{ y: 10, duration: 420 }}>
		<EclIcon size="hero" />
	</div>
	<p class="kicker" in:fly={{ y: 12, duration: 460 }}>A brass observatory at twilight</p>
	<h1 in:fly={{ y: 18, duration: 600 }}>Eclipse</h1>
	<p class="lede">
		Silver moons against gilded suns on a star chart. Trap a line of the other light between two of
		your own and the eclipse runs down it, turning every disc.
	</p>

	<div class="modes">
		<button class="card" class:on={mode === 'local'} onclick={() => choose('local')}>
			<span class="tag">Hotseat</span>
			<strong>Night and day</strong>
			<small>Share the chart. The Moon always moves first.</small>
		</button>
		<button class="card" class:on={mode === 'ai'} onclick={() => choose('ai')}>
			<span class="tag">The Orrery</span>
			<strong>Play the heavens</strong>
			<small>A clockwork mind that counts every corner.</small>
		</button>
	</div>

	{#if mode === 'ai'}
		<div class="diffs" transition:fade={{ duration: 160 }}>
			{#each ['easy', 'medium', 'hard'] as level (level)}
				<button class:on={difficulty === level} onclick={() => chooseDifficulty(level as Difficulty)}>
					{level}
				</button>
			{/each}
		</div>
	{/if}

	<p class="ledger">
		{mode === 'ai' ? 'Against the orrery' : 'Hotseat ledger'}
		<strong>Moon {record[1]} — {record[2]} {mode === 'ai' ? 'Orrery' : 'Sun'}</strong>
	</p>

	<div class="cta">
		{#if saved}
			<button class="ghost" onclick={resume}>Resume the last sky</button>
		{/if}
		<button class="go" onclick={launch}>Wind the orrery</button>
	</div>
	<nav class="dock" aria-label="Observatory">
		<ArcadeTile tone="orrery" size="tile" kicker="Rules" label="How to play" onclick={openEclGuide} />
		<ArcadeTile tone="orrery" size="tile" kicker="Tune" label="Settings" onclick={openEclSettings} />
		<ArcadeExit tone="orrery" size="tile" />
	</nav>
</section>

<style>
	.menu {
		position: relative;
		z-index: 2;
		width: min(720px, 100%);
		text-align: center;
		color: #f1e6cf;
		padding-bottom: 4vh;
	}

	.crest {
		display: grid;
		place-items: center;
		margin-bottom: 12px;
	}

	.kicker {
		margin: 0;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		font-size: 0.72rem;
		color: #e8b85a;
	}

	h1 {
		margin: 6px 0 0;
		font-family: 'Cormorant Garamond', Palatino, serif;
		font-style: italic;
		font-weight: 700;
		font-size: clamp(3rem, 9vw, 5.4rem);
		letter-spacing: -0.02em;
		line-height: 0.92;
		background: linear-gradient(180deg, #fff3cf 10%, #e8b85a 55%, #9fb8e8 105%);
		background-clip: text;
		-webkit-background-clip: text;
		color: transparent;
		filter: drop-shadow(0 0 24px rgba(232, 184, 90, 0.28));
	}

	.lede {
		margin: 14px auto 0;
		max-width: 31rem;
		color: #c6bfd4;
		line-height: 1.55;
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
		border: 1px solid rgba(232, 184, 90, 0.28);
		background: rgba(18, 18, 42, 0.62);
		color: inherit;
		cursor: pointer;
		font: inherit;
	}

	.card {
		text-align: left;
		border-radius: 18px;
		padding: 16px 18px 18px;
		backdrop-filter: blur(10px);
		transition:
			border-color 180ms ease,
			background 180ms ease,
			box-shadow 180ms ease;
	}

	@media (hover: hover) {
		.card:hover {
			border-color: rgba(232, 184, 90, 0.55);
		}
	}

	.card.on {
		border-color: rgba(232, 184, 90, 0.85);
		background: linear-gradient(180deg, rgba(48, 42, 82, 0.82), rgba(20, 20, 46, 0.86));
		box-shadow:
			inset 0 1px 0 rgba(244, 213, 138, 0.22),
			0 12px 30px rgba(0, 0, 0, 0.35),
			0 0 26px rgba(232, 184, 90, 0.14);
	}

	.tag {
		display: block;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		font-size: 0.68rem;
		color: #e8b85a;
		margin-bottom: 6px;
	}

	.card strong {
		display: block;
		font-family: 'Cormorant Garamond', Palatino, serif;
		font-style: italic;
		font-size: 1.4rem;
	}

	.card small {
		display: block;
		margin-top: 4px;
		color: #b9b2c8;
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
		padding: 8px 16px;
		text-transform: capitalize;
		letter-spacing: 0.04em;
	}

	.diffs button.on {
		background: linear-gradient(180deg, #f4d58a, #c8903a);
		color: #1a1224;
		border-color: transparent;
		font-weight: 600;
	}

	.ledger {
		margin: 22px 0 0;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-size: 0.72rem;
		color: #9fb8e8;
	}

	.ledger strong {
		display: block;
		margin-top: 4px;
		font-size: 1rem;
		letter-spacing: 0.02em;
		text-transform: none;
		color: #f1e6cf;
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
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		transition:
			transform 160ms ease,
			box-shadow 160ms ease,
			border-color 160ms ease;
	}

	.go {
		border: 0;
		background: linear-gradient(180deg, #f8e2a2, #d9a24a 55%, #a8701f);
		color: #1a1224;
		box-shadow:
			0 10px 26px rgba(0, 0, 0, 0.4),
			0 0 28px rgba(232, 184, 90, 0.3),
			inset 0 1px 0 rgba(255, 255, 255, 0.5);
	}

	.ghost {
		padding: 14px 22px;
	}

	@media (hover: hover) {
		.go:hover,
		.ghost:hover {
			transform: translateY(-2px);
		}
	}

	@media (hover: hover) {
		.go:hover {
			box-shadow:
				0 12px 30px rgba(0, 0, 0, 0.45),
				0 0 36px rgba(232, 184, 90, 0.45),
				inset 0 1px 0 rgba(255, 255, 255, 0.5);
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
		.ghost:hover {
			transform: none;
		}
	}

	@media (max-width: 640px) {
		.modes {
			grid-template-columns: 1fr;
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
