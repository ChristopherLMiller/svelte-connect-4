<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import ArcadeExit from '$lib/components/ArcadeExit.svelte';
	import ArcadeTile from '$lib/components/ArcadeTile.svelte';
	import LightIcon from './LightIcon.svelte';
	import { playSelect } from '../audio';
	import { peekSaved } from '../persist';
	import { lightPlay, lightScores, lightView, openLightGuide, openLightSettings, persistLightPlay, persistLightView } from '../settings.svelte';
	import { SEA_INFO, SEAS, WEATHER_INFO, WEATHERS, type Difficulty, type GameMode, type Sea, type Weather } from '../types';
	import type { LightSession } from '../session.svelte';

	let { session }: { session: LightSession } = $props();

	const mode = $derived(lightPlay.mode);
	const difficulty = $derived(lightPlay.difficulty);
	const record = $derived(mode === 'ai' ? lightScores.ai[difficulty] : lightScores.local);
	const saved = $derived(peekSaved());

	function choose(next: GameMode) {
		lightPlay.mode = next;
		session.mode = next;
		persistLightPlay();
		playSelect();
	}

	function chooseDifficulty(next: Difficulty) {
		lightPlay.difficulty = next;
		session.difficulty = next;
		persistLightPlay();
		playSelect();
	}

	function chooseSea(next: Sea) {
		lightView.sea = next;
		session.sea = next;
		persistLightView();
		playSelect();
	}

	function chooseWeather(next: Weather) {
		lightView.weather = next;
		persistLightView();
		playSelect();
	}

	function launch() {
		session.start(mode, difficulty, lightView.sea);
	}

	function resume() {
		playSelect();
		session.resume();
	}

	/** Hull outlines for each sea card's chart thumbnail: [row, col, length, vertical]. */
	const HULLS: Record<Sea, Array<[number, number, number, boolean]>> = {
		cove: [
			[1, 1, 3, false],
			[3, 4, 2, true]
		],
		channel: [
			[1, 1, 4, false],
			[3, 5, 3, true],
			[5, 1, 2, false]
		],
		ocean: [
			[0, 1, 4, false],
			[2, 5, 3, true],
			[4, 0, 3, false],
			[5, 3, 2, false]
		]
	};
</script>

<section class="menu" in:fade={{ duration: 420 }}>
	<div class="crest" in:fly={{ y: 10, duration: 420 }}>
		<LightIcon size="hero" />
	</div>
	<p class="kicker" in:fly={{ y: 12, duration: 460 }}>Ships in the dark water</p>
	<h1 in:fly={{ y: 18, duration: 600 }}>Lighthouse</h1>
	<p class="lede">
		Hide your fleet, then hunt theirs through the fog. Call a square and the beam swings round: a splash, or <strong>fire on a hull</strong>.
		Sink every ship to keep the light.
	</p>

	<div class="seas">
		{#each SEAS as sea (sea)}
			{@const info = SEA_INFO[sea]}
			<button class="card sea" class:on={lightView.sea === sea} onclick={() => chooseSea(sea)}>
				<span class="tag">{info.tag} · {info.ships.length} ships</span>
				<strong>{info.name}</strong>
				<small>{info.blurb}</small>
				<svg class="thumb" viewBox="0 0 70 70" aria-hidden="true">
					<rect x="1" y="1" width="68" height="68" rx="5" fill="#3d2a1c" />
					<rect x="5" y="5" width="60" height="60" rx="2" fill="#123040" />
					{#each Array.from({ length: 7 }, (_, k) => k) as k (k)}
						<line x1="5" y1={5 + (k + 1) * 7.5} x2="65" y2={5 + (k + 1) * 7.5} stroke="#9fd0de" stroke-opacity="0.18" stroke-width="0.7" />
						<line y1="5" x1={5 + (k + 1) * 7.5} y2="65" x2={5 + (k + 1) * 7.5} stroke="#9fd0de" stroke-opacity="0.18" stroke-width="0.7" />
					{/each}
					{#each HULLS[sea] as [r, c, len, v], k (k)}
						<rect
							x={6 + c * 7.5}
							y={6 + r * 7.5}
							width={v ? 5.5 : len * 7.5 - 2}
							height={v ? len * 7.5 - 2 : 5.5}
							rx="2.6"
							fill="#7a5532"
							stroke="#c49a62"
							stroke-width="0.7"
						/>
					{/each}
					<circle cx="50" cy="52" r="3" fill="#ffb24e" class="blast" />
					<circle cx="22" cy="54" r="2" fill="#e4edf0" />
				</svg>
			</button>
		{/each}
	</div>

	<div class="weathers" role="radiogroup" aria-label="Weather">
		{#each WEATHERS as weather (weather)}
			{@const info = WEATHER_INFO[weather]}
			<button role="radio" aria-checked={lightView.weather === weather} class:on={lightView.weather === weather} onclick={() => chooseWeather(weather)} style:--hue={info.hue}>
				<i class={weather} aria-hidden="true"></i>
				<span><strong>{info.name}</strong><small>{info.blurb}</small></span>
			</button>
		{/each}
	</div>

	<div class="modes">
		<button class="card" class:on={mode === 'local'} onclick={() => choose('local')}>
			<span class="tag">Hotseat</span>
			<strong>Two keepers, one glass</strong>
			<small>Pass the device between turns. No peeking at the other chart.</small>
		</button>
		<button class="card" class:on={mode === 'ai'} onclick={() => choose('ai')}>
			<span class="tag">The Wrecker</span>
			<strong>False lights on the rocks</strong>
			<small>He reads every splash and knows where hulls like to hide.</small>
		</button>
	</div>

	{#if mode === 'ai'}
		<div class="diffs" transition:fade={{ duration: 160 }}>
			{#each ['easy', 'medium', 'hard'] as level (level)}
				<button class:on={difficulty === level} onclick={() => chooseDifficulty(level as Difficulty)}>
					{level === 'easy' ? 'Deckhand' : level === 'medium' ? 'Bosun' : 'Captain'}
				</button>
			{/each}
		</div>
	{/if}

	<p class="ledger">
		<span>
			{mode === 'ai' ? 'Against the Wrecker' : 'Between the lights'}
			<strong>{mode === 'ai' ? 'You' : 'North'} {record[1]} — {record[2]} {mode === 'ai' ? 'Wrecker' : 'South'}</strong>
		</span>
		<span>
			Ships sunk
			<strong>{lightView.wrecks}</strong>
		</span>
	</p>

	<div class="cta">
		{#if saved}
			<button class="ghost" onclick={resume}>Resume the battle</button>
		{/if}
		<button class="go" onclick={launch}>Light the lamp</button>
	</div>
	<nav class="dock" aria-label="Lighthouse">
		<ArcadeTile tone="beacon" size="tile" kicker="Rules" label="How to play" onclick={openLightGuide} />
		<ArcadeTile tone="beacon" size="tile" kicker="Tune" label="Settings" onclick={openLightSettings} />
		<ArcadeExit tone="beacon" size="tile" />
	</nav>
</section>

<style>
	.menu {
		position: relative;
		z-index: 2;
		width: min(840px, 100%);
		text-align: center;
		color: #f2e8d5;
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
		color: #e8b05a;
		text-shadow: 0 1px 8px rgba(0, 0, 0, 0.8);
	}

	h1 {
		margin: 4px 0 0;
		font-family: 'IM Fell English', Georgia, serif;
		font-weight: 400;
		font-size: clamp(2.8rem, 9vw, 5.4rem);
		line-height: 0.95;
		color: #fff4dc;
		letter-spacing: 0.01em;
		text-shadow:
			0 0 24px rgba(255, 200, 110, 0.55),
			0 0 60px rgba(255, 190, 90, 0.25),
			0 6px 18px rgba(0, 0, 0, 0.7);
		animation: lamp 6s ease-in-out infinite;
	}

	.lede {
		margin: 14px auto 0;
		max-width: 38rem;
		padding: 13px 18px;
		border-radius: 8px;
		background: rgba(9, 17, 24, 0.82);
		border: 1px solid rgba(232, 176, 90, 0.22);
		color: #ddd3bf;
		font-size: 1.04rem;
		line-height: 1.55;
		box-shadow: 0 10px 26px rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(4px);
	}

	.lede strong {
		color: #ffc26a;
	}

	.seas,
	.modes {
		display: grid;
		gap: 10px;
		margin-top: 16px;
	}

	.seas {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.modes {
		grid-template-columns: 1fr 1fr;
		margin-top: 10px;
	}

	.card,
	.go,
	.ghost,
	.diffs button,
	.weathers button {
		appearance: none;
		border: 1px solid rgba(232, 176, 90, 0.22);
		background: linear-gradient(180deg, rgba(20, 34, 46, 0.92), rgba(9, 17, 24, 0.94));
		color: #f2e8d5;
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
			inset 0 1px 0 rgba(255, 230, 180, 0.07),
			0 8px 20px rgba(0, 0, 0, 0.4);
		transition:
			border-color 180ms ease,
			transform 180ms ease,
			box-shadow 180ms ease;
	}

	.card.on {
		border-color: #e8b05a;
		box-shadow:
			inset 0 1px 0 rgba(255, 230, 180, 0.1),
			0 0 0 2px rgba(232, 176, 90, 0.3),
			0 0 28px rgba(255, 190, 90, 0.18),
			0 12px 26px rgba(0, 0, 0, 0.45);
		transform: translateY(-3px);
	}

	.card.on::after {
		content: '';
		position: absolute;
		right: 10px;
		top: 10px;
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: #ffcf7a;
		box-shadow: 0 0 10px 3px rgba(255, 190, 90, 0.6);
	}

	.tag {
		display: block;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-size: 0.62rem;
		font-weight: 700;
		color: #e8b05a;
		margin-bottom: 3px;
	}

	.card strong {
		display: block;
		font-family: 'IM Fell English', Georgia, serif;
		font-weight: 400;
		font-size: 1.32rem;
	}

	.card small {
		display: block;
		margin-top: 3px;
		color: #b3ab9a;
		line-height: 1.35;
		font-size: 0.92rem;
	}

	.sea {
		padding-right: 74px;
		min-height: 88px;
	}

	.thumb {
		position: absolute;
		right: 10px;
		top: 50%;
		translate: 0 -50%;
		width: 56px;
		height: 56px;
		filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 0.5));
	}

	.sea.on .blast {
		animation: blast 2.2s ease-in-out infinite;
		transform-box: fill-box;
		transform-origin: center;
	}

	.weathers {
		margin-top: 10px;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 8px;
	}

	.weathers button {
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 12px;
		border-radius: 999px;
		text-align: left;
		box-shadow: 0 6px 14px rgba(0, 0, 0, 0.35);
		transition:
			border-color 160ms ease,
			box-shadow 160ms ease;
	}

	.weathers button.on {
		border-color: var(--hue);
		box-shadow:
			0 0 0 2px color-mix(in srgb, var(--hue) 45%, transparent),
			0 8px 18px rgba(0, 0, 0, 0.4);
	}

	.weathers span {
		display: grid;
		line-height: 1.15;
		min-width: 0;
	}

	.weathers strong {
		font-family: 'IM Fell English', Georgia, serif;
		font-weight: 400;
		font-size: 1.05rem;
	}

	.weathers small {
		font-size: 0.74rem;
		color: #b3ab9a;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.weathers i {
		position: relative;
		flex-shrink: 0;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		background: radial-gradient(circle at 40% 35%, #2a4054, #0b1520);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--hue) 50%, transparent);
		overflow: hidden;
	}

	.weathers i::before,
	.weathers i::after {
		content: '';
		position: absolute;
	}

	.weathers i.storm::before {
		left: 9px;
		top: 4px;
		width: 8px;
		height: 18px;
		background: #ffe9a8;
		clip-path: polygon(60% 0, 10% 55%, 45% 55%, 25% 100%, 90% 40%, 55% 40%, 80% 0);
	}

	.weathers i.fog::before {
		inset: 7px 4px auto;
		height: 3px;
		border-radius: 3px;
		background: #c7d0d4;
		box-shadow:
			2px 5px 0 #a9b4b9,
			-2px 10px 0 #c7d0d4;
	}

	.weathers i.moon::before {
		left: 7px;
		top: 6px;
		width: 13px;
		height: 13px;
		border-radius: 50%;
		background: #f6e6b8;
		box-shadow: 0 0 8px rgba(246, 230, 184, 0.7);
	}

	.weathers button.on i::before {
		animation: pulse 2.6s ease-in-out infinite;
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
		font-size: 0.98rem;
	}

	.diffs button.on {
		background: linear-gradient(180deg, #f2c26e, #c58a2c);
		border-color: transparent;
		color: #1a1206;
	}

	.ledger {
		margin: 16px auto 0;
		width: fit-content;
		display: flex;
		gap: 32px;
		padding: 8px 22px;
		border-radius: 8px;
		background: rgba(5, 10, 15, 0.78);
		border: 1px solid rgba(232, 176, 90, 0.18);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-size: 0.64rem;
		font-weight: 700;
		color: #e8b05a;
	}

	.ledger strong {
		display: block;
		margin-top: 3px;
		font-family: 'IM Fell English', Georgia, serif;
		font-weight: 400;
		font-size: 1.15rem;
		letter-spacing: 0.02em;
		text-transform: none;
		color: #fff4dc;
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
		font-size: 0.88rem;
		transition:
			transform 160ms ease,
			box-shadow 160ms ease;
	}

	.go {
		border: 0;
		background: linear-gradient(180deg, #ffd27a, #c58a2c);
		color: #1a1206;
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
		}
	}

	@keyframes lamp {
		50% {
			text-shadow:
				0 0 34px rgba(255, 210, 120, 0.75),
				0 0 80px rgba(255, 190, 90, 0.35),
				0 6px 18px rgba(0, 0, 0, 0.7);
		}
	}

	@keyframes blast {
		0%,
		100% {
			scale: 0.8;
			opacity: 0.6;
		}
		50% {
			scale: 1.5;
			opacity: 1;
		}
	}

	@keyframes pulse {
		50% {
			opacity: 0.55;
		}
	}

	@keyframes beckon {
		50% {
			box-shadow:
				0 10px 24px rgba(0, 0, 0, 0.45),
				0 0 30px rgba(255, 200, 100, 0.55),
				inset 0 1px 0 rgba(255, 245, 220, 0.7);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.crest,
		h1,
		.go,
		.sea.on .blast,
		.weathers button.on i::before {
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
		.seas {
			grid-template-columns: 1fr;
		}

		.sea small {
			display: none;
		}

		.sea {
			min-height: 0;
		}

		.thumb {
			width: 44px;
			height: 44px;
		}

		.modes {
			grid-template-columns: 1fr;
		}

		.weathers small {
			display: none;
		}

		.weathers button {
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
