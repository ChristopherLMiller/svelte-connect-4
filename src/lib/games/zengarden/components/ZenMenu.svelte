<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import ArcadeExit from '$lib/components/ArcadeExit.svelte';
	import ArcadeTile from '$lib/components/ArcadeTile.svelte';
	import ZenIcon from './ZenIcon.svelte';
	import { playSelect } from '../audio';
	import { peekSaved } from '../persist';
	import { openZenGuide, openZenSettings, persistZenPlay, persistZenView, zenPlay, zenScores, zenView } from '../settings.svelte';
	import { GARDEN_INFO, GARDENS, SEASON_INFO, SEASONS, type Difficulty, type GameMode, type Garden, type Season } from '../types';
	import type { ZenSession } from '../session.svelte';

	let { session }: { session: ZenSession } = $props();

	const mode = $derived(zenPlay.mode);
	const difficulty = $derived(zenPlay.difficulty);
	const record = $derived(mode === 'ai' ? zenScores.ai[difficulty] : zenScores.local);
	const saved = $derived(peekSaved());

	function choose(next: GameMode) {
		zenPlay.mode = next;
		session.mode = next;
		persistZenPlay();
		playSelect();
	}

	function chooseDifficulty(next: Difficulty) {
		zenPlay.difficulty = next;
		session.difficulty = next;
		persistZenPlay();
		playSelect();
	}

	function chooseGarden(next: Garden) {
		zenView.garden = next;
		session.garden = next;
		persistZenView();
		playSelect();
	}

	function chooseSeason(next: Season) {
		zenView.season = next;
		persistZenView();
		playSelect();
	}

	function launch() {
		session.start(mode, difficulty, zenView.garden);
	}

	function resume() {
		playSelect();
		session.resume();
	}

	/** A few stones for each garden card's thumbnail. */
	const STONES: Record<Garden, Array<[number, number, 1 | 2]>> = {
		courtyard: [
			[2, 2, 1],
			[3, 2, 2],
			[2, 3, 1]
		],
		temple: [
			[2, 2, 1],
			[3, 3, 1],
			[3, 2, 2],
			[4, 4, 1],
			[2, 4, 2]
		],
		grand: [
			[2, 2, 1],
			[3, 3, 2],
			[4, 2, 1],
			[3, 1, 2],
			[5, 3, 1],
			[2, 4, 2],
			[4, 4, 1]
		]
	};
</script>

<section class="menu" in:fade={{ duration: 420 }}>
	<div class="crest" in:fly={{ y: 10, duration: 420 }}>
		<ZenIcon size="hero" />
	</div>
	<p class="kicker" in:fly={{ y: 12, duration: 460 }}>Stones on raked gravel</p>
	<h1 in:fly={{ y: 18, duration: 600 }}>Zen Garden</h1>
	<p class="lede">
		Take turns setting a stone where the rake lines cross. The first to lay <strong>five in an unbroken line</strong>, across,
		down or on a slant, wins the garden. Slate and quartz, patience and nerve.
	</p>

	<div class="gardens">
		{#each GARDENS as garden (garden)}
			{@const info = GARDEN_INFO[garden]}
			<button class="card garden" class:on={zenView.garden === garden} onclick={() => chooseGarden(garden)}>
				<span class="tag">{info.tag}</span>
				<strong>{info.name}</strong>
				<small>{info.blurb}</small>
				<svg class="thumb" viewBox="0 0 70 70" aria-hidden="true">
					<rect x="1" y="1" width="68" height="68" rx="5" fill="#5a3a24" />
					<rect x="5" y="5" width="60" height="60" rx="2" fill="#e4ddcc" />
					{#each Array.from({ length: 7 }, (_, k) => k) as k (k)}
						<line x1="9" y1={11 + k * 8} x2="61" y2={11 + k * 8} stroke="#b4a78f" stroke-width="0.8" />
						<line y1="9" x1={11 + k * 8} y2="61" x2={11 + k * 8} stroke="#b4a78f" stroke-width="0.8" />
					{/each}
					{#each STONES[garden] as [r, c, p], k (k)}
						<circle cx={11 + c * 8} cy={11 + r * 8} r="3.4" fill={p === 1 ? '#2d3238' : '#f6f1e6'} stroke={p === 1 ? '#0b0d10' : '#a89d88'} stroke-width="0.6" style:--d="{k * 0.12}s" />
					{/each}
				</svg>
			</button>
		{/each}
	</div>

	<div class="seasons" role="radiogroup" aria-label="Season">
		{#each SEASONS as season (season)}
			{@const info = SEASON_INFO[season]}
			<button role="radio" aria-checked={zenView.season === season} class:on={zenView.season === season} onclick={() => chooseSeason(season)} style:--hue={info.hue}>
				<i class={season} aria-hidden="true"></i>
				<span><strong>{info.name}</strong><small>{info.blurb}</small></span>
			</button>
		{/each}
	</div>

	<div class="modes">
		<button class="card" class:on={mode === 'local'} onclick={() => choose('local')}>
			<span class="tag">Hotseat</span>
			<strong>Two at the bench</strong>
			<small>Slate against quartz. Share the rake.</small>
		</button>
		<button class="card" class:on={mode === 'ai'} onclick={() => choose('ai')}>
			<span class="tag">The Monk</span>
			<strong>Patient as raked stone</strong>
			<small>He has tended this gravel since before the wall was built.</small>
		</button>
	</div>

	{#if mode === 'ai'}
		<div class="diffs" transition:fade={{ duration: 160 }}>
			{#each ['easy', 'medium', 'hard'] as level (level)}
				<button class:on={difficulty === level} onclick={() => chooseDifficulty(level as Difficulty)}>
					{level === 'easy' ? 'Novice' : level === 'medium' ? 'Adept' : 'Master'}
				</button>
			{/each}
		</div>
	{/if}

	<p class="ledger">
		<span>
			{mode === 'ai' ? 'Against the Monk' : 'At the bench'}
			<strong>Slate {record[1]} — {record[2]} {mode === 'ai' ? 'Monk' : 'Quartz'}</strong>
		</span>
		<span>
			Gardens raked
			<strong>{zenView.raked}</strong>
		</span>
	</p>

	<div class="cta">
		{#if saved}
			<button class="ghost" onclick={resume}>Resume the {GARDEN_INFO[saved.garden].name.toLowerCase()}</button>
		{/if}
		<button class="go" onclick={launch}>Place the first stone</button>
	</div>
	<nav class="dock" aria-label="Zen Garden">
		<ArcadeTile tone="zen" size="tile" kicker="Rules" label="How to play" onclick={openZenGuide} />
		<ArcadeTile tone="zen" size="tile" kicker="Tune" label="Settings" onclick={openZenSettings} />
		<ArcadeExit tone="zen" size="tile" />
	</nav>
</section>

<style>
	.menu {
		position: relative;
		z-index: 2;
		width: min(840px, 100%);
		text-align: center;
		color: #2b2622;
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
		color: #fff8ee;
		text-shadow: 0 1px 6px rgba(40, 25, 10, 0.6);
	}

	h1 {
		margin: 4px 0 0;
		font-family: 'Shippori Mincho', Georgia, serif;
		font-weight: 800;
		font-size: clamp(2.8rem, 9vw, 5.2rem);
		line-height: 0.95;
		color: #fffaf1;
		letter-spacing: 0.02em;
		text-shadow:
			0 2px 0 rgba(90, 40, 20, 0.55),
			0 0 30px rgba(255, 220, 190, 0.5),
			0 8px 24px rgba(40, 20, 10, 0.5);
	}

	.lede {
		margin: 14px auto 0;
		max-width: 38rem;
		padding: 13px 18px;
		border-radius: 6px;
		background:
			url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='f'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0.4 0 0 0 0 0.3 0 0 0 0 0.2 0 0 0 0.06 0'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23f)'/%3E%3C/svg%3E"),
			rgba(251, 247, 238, 0.93);
		border: 1px solid rgba(60, 40, 25, 0.18);
		color: #3a322b;
		font-size: 1rem;
		line-height: 1.6;
		box-shadow: 0 10px 26px rgba(40, 25, 10, 0.25);
	}

	.lede strong {
		color: #b22a18;
	}

	.gardens,
	.modes {
		display: grid;
		gap: 10px;
		margin-top: 16px;
	}

	.gardens {
		grid-template-columns: repeat(3, 1fr);
	}

	.modes {
		grid-template-columns: 1fr 1fr;
		margin-top: 10px;
	}

	.card,
	.go,
	.ghost,
	.diffs button,
	.seasons button {
		appearance: none;
		border: 1px solid rgba(60, 40, 25, 0.22);
		background: linear-gradient(180deg, rgba(252, 248, 239, 0.94), rgba(238, 229, 212, 0.94));
		color: #2b2622;
		cursor: pointer;
		font: inherit;
	}

	.card {
		position: relative;
		display: grid;
		align-content: start;
		text-align: left;
		border-radius: 8px;
		padding: 12px 16px 14px;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.7),
			0 8px 20px rgba(40, 25, 10, 0.22);
		transition:
			border-color 180ms ease,
			transform 180ms ease,
			box-shadow 180ms ease;
	}

	.card.on {
		border-color: #c8321f;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.8),
			0 0 0 2px rgba(200, 50, 31, 0.35),
			0 12px 26px rgba(40, 25, 10, 0.3);
		transform: translateY(-3px);
	}

	.card.on::after {
		content: '';
		position: absolute;
		right: 8px;
		top: 8px;
		width: 12px;
		height: 12px;
		border-radius: 2px;
		background: #c8321f;
		rotate: 8deg;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
	}

	.tag {
		display: block;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-size: 0.62rem;
		font-weight: 700;
		color: #b22a18;
		margin-bottom: 3px;
	}

	.card strong {
		display: block;
		font-family: 'Shippori Mincho', Georgia, serif;
		font-weight: 700;
		font-size: 1.24rem;
	}

	.card small {
		display: block;
		margin-top: 3px;
		color: #6b5f52;
		line-height: 1.35;
		font-size: 0.9rem;
	}

	.garden {
		padding-right: 74px;
		min-height: 84px;
	}

	.thumb {
		position: absolute;
		right: 10px;
		top: 50%;
		translate: 0 -50%;
		width: 56px;
		height: 56px;
		filter: drop-shadow(0 3px 4px rgba(40, 25, 10, 0.3));
	}

	.garden.on .thumb circle {
		animation: settle 2.6s ease-in-out var(--d) infinite;
		transform-box: fill-box;
		transform-origin: center;
	}

	.seasons {
		margin-top: 10px;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 8px;
	}

	.seasons button {
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 12px;
		border-radius: 999px;
		text-align: left;
		box-shadow: 0 6px 14px rgba(40, 25, 10, 0.18);
		transition:
			border-color 160ms ease,
			box-shadow 160ms ease;
	}

	.seasons button.on {
		border-color: var(--hue);
		box-shadow:
			0 0 0 2px color-mix(in srgb, var(--hue) 55%, transparent),
			0 8px 18px rgba(40, 25, 10, 0.25);
	}

	.seasons span {
		display: grid;
		line-height: 1.15;
	}

	.seasons strong {
		font-family: 'Shippori Mincho', Georgia, serif;
		font-size: 1rem;
	}

	.seasons small {
		font-size: 0.74rem;
		color: #6b5f52;
	}

	.seasons i {
		position: relative;
		flex-shrink: 0;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		background: radial-gradient(circle at 40% 35%, #fff, color-mix(in srgb, var(--hue) 70%, white));
		box-shadow: inset 0 0 0 1px rgba(60, 40, 25, 0.2);
	}

	.seasons i::before {
		content: '';
		position: absolute;
		inset: 6px;
		background: var(--hue);
	}

	.seasons i.spring::before {
		border-radius: 50% 0 50% 50%;
		rotate: -45deg;
		background: #ef8fab;
	}

	.seasons i.autumn::before {
		clip-path: polygon(50% 0, 62% 30%, 100% 25%, 72% 52%, 88% 92%, 50% 70%, 12% 92%, 28% 52%, 0 25%, 38% 30%);
		background: #d9482a;
		inset: 4px;
	}

	.seasons i.winter::before {
		border-radius: 50%;
		background: radial-gradient(circle, #fff 30%, #b8cfe2 70%);
		inset: 7px;
	}

	.seasons button.on i::before {
		animation: drift 3s ease-in-out infinite;
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
		background: linear-gradient(180deg, #d8442c, #a8261a);
		border-color: transparent;
		color: #fff6ec;
	}

	.ledger {
		margin: 16px auto 0;
		width: fit-content;
		display: flex;
		gap: 32px;
		padding: 8px 22px;
		border-radius: 6px;
		background: rgba(43, 38, 34, 0.72);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-size: 0.64rem;
		font-weight: 700;
		color: #f0c8b8;
	}

	.ledger strong {
		display: block;
		margin-top: 3px;
		font-family: 'Shippori Mincho', Georgia, serif;
		font-size: 1.1rem;
		letter-spacing: 0.02em;
		text-transform: none;
		color: #fffaf1;
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
		font-size: 0.85rem;
		transition:
			transform 160ms ease,
			box-shadow 160ms ease;
	}

	.go {
		border: 0;
		background: linear-gradient(180deg, #d8442c, #a8261a);
		color: #fff6ec;
		box-shadow:
			0 10px 24px rgba(90, 20, 10, 0.35),
			inset 0 1px 0 rgba(255, 220, 200, 0.5);
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

	@keyframes float {
		50% {
			translate: 0 -6px;
			rotate: 2deg;
		}
	}

	@keyframes settle {
		0%,
		100% {
			scale: 1;
		}
		50% {
			scale: 1.12;
		}
	}

	@keyframes drift {
		50% {
			translate: 1px 2px;
			rotate: 20deg;
		}
	}

	@keyframes beckon {
		50% {
			box-shadow:
				0 10px 24px rgba(90, 20, 10, 0.35),
				0 0 26px rgba(216, 68, 44, 0.45),
				inset 0 1px 0 rgba(255, 220, 200, 0.5);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.crest,
		.go,
		.garden.on .thumb circle,
		.seasons button.on i::before {
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
		.gardens {
			grid-template-columns: 1fr;
		}

		.garden small {
			display: none;
		}

		.garden {
			min-height: 0;
		}

		.thumb {
			width: 44px;
			height: 44px;
		}

		.modes {
			grid-template-columns: 1fr;
		}

		.seasons small {
			display: none;
		}

		.seasons button {
			gap: 7px;
			padding: 7px 9px;
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
