<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import ArcadeExit from '$lib/components/ArcadeExit.svelte';
	import ArcadeTile from '$lib/components/ArcadeTile.svelte';
	import ChapelIcon from './ChapelIcon.svelte';
	import { playSelect } from '../audio';
	import { peekSaved } from '../persist';
	import { CHAPTERS, romanNumeral, WINDOWS } from '../levels';
	import {
		chapelBest,
		chapelPlay,
		chapelReached,
		chosenChapter,
		openChapelGuide,
		openChapters,
		openChapelSettings,
		persistChapelPlay
	} from '../settings.svelte';
	import type { ChapelSession } from '../session.svelte';
	import type { Difficulty } from '../types';

	let { session }: { session: ChapelSession } = $props();

	const difficulty = $derived(chapelPlay.difficulty);
	const record = $derived(chapelBest[difficulty]);
	const reached = $derived(chapelReached[difficulty]);
	const saved = $derived(peekSaved());
	const open = $derived(openChapters(difficulty));
	const chosen = $derived(chosenChapter(difficulty));
	const chapter = $derived(CHAPTERS[chosen]!);

	function step(by: number) {
		const next = Math.max(0, Math.min(open - 1, chosen + by));
		if (next === chosen) return;
		chapelPlay.chapter = next;
		playSelect();
	}

	const hours: Array<{ id: Difficulty; tag: string; title: string; body: string; hue: string }> = [
		{
			id: 'easy',
			tag: 'Evening',
			title: 'Vespers',
			body: 'A broad beam, a patient light and four candles. Learn how the glass answers.',
			hue: 'amber'
		},
		{
			id: 'medium',
			tag: 'Night',
			title: 'Compline',
			body: 'The proper office. The light quickens with every return from the beam.',
			hue: 'ruby'
		},
		{
			id: 'hard',
			tag: 'Midnight',
			title: 'Nocturns',
			body: 'A narrow beam and a light that will not wait. Relics are rare at this hour.',
			hue: 'violet'
		}
	];

	const panes = Array.from({ length: 21 }, (_, i) => ({
		i,
		hue: ['ruby', 'cobalt', 'amber', 'emerald', 'violet', 'cobalt', 'ruby'][i % 7]!,
		d: (i * 0.29) % 3
	}));

	function choose(next: Difficulty) {
		chapelPlay.difficulty = next;
		session.difficulty = next;
		persistChapelPlay();
		playSelect();
	}

	function launch() {
		playSelect();
		session.start(difficulty, chapter.start);
	}

	function resume() {
		playSelect();
		session.resume();
	}
</script>

<section class="menu" in:fade={{ duration: 380 }}>
	<div class="crest" in:fly={{ y: 10, duration: 380 }}>
		<div class="lancet" aria-hidden="true">
			{#each panes as pane (pane.i)}
				<i class={pane.hue} style:--d="{pane.d}s"></i>
			{/each}
		</div>
		<ChapelIcon size="hero" />
	</div>
	<p class="kicker" in:fly={{ y: 12, duration: 420 }}>A ruined cathedral at nightfall</p>
	<h1 in:fly={{ y: 18, duration: 560 }}>Chapel Glass</h1>
	<p class="lede">
		The windows were bricked up long ago. Knock out the stones and the glass behind lets the light
		back in. Clear a window and the nave remembers it. Lose the light and the candles gutter.
	</p>

	<div class="modes">
		{#each hours as hour (hour.id)}
			<button class={['card', hour.hue]} class:on={difficulty === hour.id} onclick={() => choose(hour.id)}>
				<span class="pane" aria-hidden="true"></span>
				<span class="tag">{hour.tag}</span>
				<strong>{hour.title}</strong>
				<small>{hour.body}</small>
			</button>
		{/each}
	</div>

	<div class="chapters">
		<button class="step" aria-label="Earlier chapter" disabled={chosen === 0} onclick={() => step(-1)}>‹</button>
		<div class="chapter">
			<small>Begin in chapter {romanNumeral(chosen + 1)} of {romanNumeral(CHAPTERS.length)}</small>
			<strong>{chapter.name}</strong>
			<span>{chapter.blurb}</span>
			<em>Windows {chapter.start + 1}–{chapter.start + chapter.count}</em>
		</div>
		<button class="step" aria-label="Later chapter" disabled={chosen >= open - 1} onclick={() => step(1)}>›</button>
		<div class="strip" role="group" aria-label="Chapters">
			{#each CHAPTERS as item, i (item.start)}
				<button
					class="cell"
					class:lit={i < open}
					class:on={i === chosen}
					disabled={i >= open}
					title={i < open ? item.name : 'Still dark: light the chapter before it'}
					aria-label={i < open ? `Chapter ${i + 1}, ${item.name}` : `Chapter ${i + 1}, still dark`}
					onclick={() => step(i - chosen)}
				></button>
			{/each}
		</div>
	</div>

	<p class="ledger">
		<span>
			Best at this hour
			<strong>{record.toLocaleString()}</strong>
		</span>
		<span>
			Windows lit
			<strong>{Math.min(reached, WINDOWS.length)} of {WINDOWS.length}</strong>
		</span>
	</p>

	<div class="cta">
		{#if saved}
			<button class="ghost" onclick={resume}>Resume the vigil · Window {saved.level + 1}</button>
		{/if}
		<button class="go" onclick={launch}>Enter {chosen ? chapter.name.replace(/^The /, 'the ') : 'the nave'}</button>
	</div>
	<nav class="dock" aria-label="Nave">
		<ArcadeTile tone="chapel" size="tile" kicker="Rubric" label="How to play" onclick={openChapelGuide} />
		<ArcadeTile tone="chapel" size="tile" kicker="Tune" label="Settings" onclick={openChapelSettings} />
		<ArcadeExit tone="chapel" size="tile" />
	</nav>
</section>

<style>
	.menu {
		position: relative;
		z-index: 2;
		width: min(880px, 100%);
		text-align: center;
		color: #f4e8d0;
		padding-bottom: 4vh;
	}

	.crest {
		position: relative;
		display: grid;
		place-items: center;
		margin-bottom: 12px;
		height: 110px;
	}

	.lancet {
		position: absolute;
		width: 96px;
		height: 120px;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 3px;
		padding: 3px;
		background: #0f0d13;
		clip-path: path('M0 120 V48 C0 26 22 8 48 0 C74 8 96 26 96 48 V120 Z');
		opacity: 0.85;
		filter: drop-shadow(0 0 30px rgba(203, 163, 255, 0.3));
	}

	.lancet i {
		display: block;
		border-radius: 2px;
		animation: glow 4.8s ease-in-out infinite;
		animation-delay: var(--d);
	}

	.lancet .ruby {
		background: linear-gradient(160deg, #ff8c9c, #c8243c 50%, #5a0b18);
	}

	.lancet .cobalt {
		background: linear-gradient(160deg, #93b3ff, #2b5ad0 50%, #0f245c);
	}

	.lancet .amber {
		background: linear-gradient(160deg, #ffd98a, #e8a23a 50%, #83470f);
	}

	.lancet .emerald {
		background: linear-gradient(160deg, #7ff0b0, #1f9a5c 50%, #0a4528);
	}

	.lancet .violet {
		background: linear-gradient(160deg, #cba3ff, #7b3dcc 50%, #31145e);
	}

	.crest :global(.icon) {
		position: relative;
		translate: 0 34px;
	}

	.kicker {
		margin: 26px 0 0;
		letter-spacing: 0.26em;
		text-transform: uppercase;
		font-size: 0.74rem;
		color: #f2c46b;
	}

	h1 {
		margin: 8px 0 0;
		font-family: 'IM Fell English SC', Georgia, serif;
		font-weight: 400;
		font-size: clamp(2.6rem, 8vw, 4.6rem);
		line-height: 0.95;
		letter-spacing: 0.01em;
		background: linear-gradient(90deg, #ff8c9c, #ffd98a, #93b3ff, #cba3ff, #7ff0b0, #ff8c9c);
		background-size: 260% 100%;
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		animation: shimmer 12s linear infinite;
		filter: drop-shadow(0 8px 22px rgba(0, 0, 0, 0.6));
	}

	.lede {
		margin: 14px auto 0;
		max-width: 34rem;
		color: #c9bda8;
		line-height: 1.5;
		font-size: 1.04rem;
	}

	.modes {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 12px;
		margin-top: 28px;
	}

	.card,
	.go,
	.ghost {
		appearance: none;
		border: 1px solid rgba(242, 196, 107, 0.22);
		background: rgba(18, 17, 24, 0.6);
		color: inherit;
		cursor: pointer;
		font: inherit;
	}

	.card {
		position: relative;
		text-align: left;
		border-radius: 16px;
		padding: 16px 18px 18px;
		backdrop-filter: blur(8px);
		overflow: hidden;
		transition:
			border-color 180ms ease,
			transform 180ms ease,
			box-shadow 180ms ease;
	}

	.card .pane {
		position: absolute;
		top: 12px;
		right: 14px;
		width: 14px;
		height: 22px;
		border-radius: 7px 7px 2px 2px;
		border: 2px solid #0f0d13;
		box-shadow: 0 0 14px var(--glow);
	}

	.card.amber {
		--glow: rgba(255, 217, 138, 0.6);
	}

	.card.ruby {
		--glow: rgba(255, 140, 156, 0.6);
	}

	.card.violet {
		--glow: rgba(203, 163, 255, 0.6);
	}

	.card.amber .pane {
		background: linear-gradient(160deg, #ffd98a, #e8a23a);
	}

	.card.ruby .pane {
		background: linear-gradient(160deg, #ff8c9c, #c8243c);
	}

	.card.violet .pane {
		background: linear-gradient(160deg, #cba3ff, #7b3dcc);
	}

	.card.on {
		border-color: rgba(242, 196, 107, 0.7);
		background: rgba(34, 32, 42, 0.86);
		box-shadow: 0 10px 28px var(--glow, rgba(0, 0, 0, 0.3));
		transform: translateY(-3px);
	}

	.tag {
		display: block;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		font-size: 0.66rem;
		color: #ff8c9c;
		margin-bottom: 6px;
	}

	.card strong {
		display: block;
		font-family: 'IM Fell English SC', Georgia, serif;
		font-weight: 400;
		font-size: 1.36rem;
	}

	.card small {
		display: block;
		margin-top: 6px;
		color: #c9bda8;
		line-height: 1.4;
		font-size: 0.9rem;
	}

	.chapters {
		margin: 22px auto 0;
		width: min(620px, 100%);
		display: grid;
		grid-template-columns: 44px minmax(0, 1fr) 44px;
		align-items: center;
		gap: 10px 12px;
	}

	.chapter {
		display: grid;
		gap: 3px;
		padding: 12px 16px;
		border-radius: 16px;
		border: 1px solid rgba(242, 196, 107, 0.22);
		background: rgba(18, 17, 24, 0.6);
		backdrop-filter: blur(8px);
	}

	.chapter small {
		letter-spacing: 0.18em;
		text-transform: uppercase;
		font-size: 0.64rem;
		color: #f2c46b;
	}

	.chapter strong {
		font-family: 'IM Fell English SC', Georgia, serif;
		font-weight: 400;
		font-size: 1.45rem;
		color: #fff4dc;
	}

	.chapter span {
		color: #c9bda8;
		font-size: 0.92rem;
	}

	.chapter em {
		font-style: normal;
		font-size: 0.72rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #9d927f;
	}

	.step {
		appearance: none;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		border: 1px solid rgba(242, 196, 107, 0.3);
		background: rgba(18, 17, 24, 0.7);
		color: #ffe2a0;
		font: inherit;
		font-size: 1.5rem;
		line-height: 1;
		cursor: pointer;
	}

	.step:disabled {
		opacity: 0.3;
		cursor: default;
	}

	.strip {
		grid-column: 1 / -1;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 6px;
	}

	.cell {
		appearance: none;
		width: 16px;
		height: 24px;
		padding: 0;
		border-radius: 8px 8px 2px 2px;
		border: 2px solid #0f0d13;
		background: #2a2833;
		cursor: default;
	}

	.cell.lit {
		cursor: pointer;
		background: linear-gradient(160deg, #ffd98a, #c8243c 60%, #7b3dcc);
		box-shadow: 0 0 10px rgba(255, 190, 120, 0.35);
	}

	.cell.on {
		outline: 2px solid #f2c46b;
		outline-offset: 2px;
	}

	.ledger {
		margin: 18px 0 0;
		display: flex;
		justify-content: center;
		gap: 36px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		font-size: 0.7rem;
		color: #bdb2a0;
	}

	.ledger strong {
		display: block;
		margin-top: 4px;
		font-size: 1.2rem;
		font-weight: 400;
		letter-spacing: 0.02em;
		text-transform: none;
		color: #ffe2a0;
		font-family: 'IM Fell English SC', Georgia, serif;
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
		letter-spacing: 0.1em;
		text-transform: uppercase;
		transition:
			transform 160ms ease,
			border-color 160ms ease,
			background 160ms ease;
	}

	.go {
		border: 0;
		background: linear-gradient(180deg, #f6d48a, #c8243c);
		color: #1a0c10;
		box-shadow:
			0 10px 26px rgba(200, 36, 60, 0.3),
			inset 0 1px 0 rgba(255, 255, 255, 0.45);
	}

	.ghost {
		padding: 14px 22px;
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

	@keyframes glow {
		0%,
		100% {
			filter: brightness(0.75);
		}
		50% {
			filter: brightness(1.15);
		}
	}

	@keyframes shimmer {
		to {
			background-position: -260% 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.go:hover,
		.ghost:hover,
		.card:hover,
		.card.on {
			transform: none;
		}

		.lancet i,
		h1 {
			animation: none;
		}
	}

	@media (max-width: 760px) {
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

		.ledger {
			gap: 20px;
		}
	}
</style>
