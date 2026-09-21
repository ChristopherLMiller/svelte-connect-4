<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import ArcadeExit from '$lib/components/ArcadeExit.svelte';
	import { playSelect } from '../audio';
	import { countDiscs } from '../persist';
	import type { GameSession } from '../session.svelte';
	import {
		matchSave,
		openSettings,
		persistSettings,
		playSettings,
		scoreboard
	} from '../settings.svelte';
	import type { Difficulty, GameMode } from '../types';

	let { session }: { session: GameSession } = $props();

	const mode = $derived(playSettings.mode);
	const difficulty = $derived(playSettings.difficulty);
	const record = $derived(mode === 'ai' ? scoreboard.ai[difficulty] : scoreboard.local);
	const saved = $derived(matchSave.game);
	const savedLine = $derived.by(() => {
		if (!saved) return '';
		const vs = saved.mode === 'ai' ? `Neural Core · ${saved.difficulty}` : 'Hotseat duel';
		return `${vs} · ${countDiscs(saved.board)} discs`;
	});

	function choose(next: GameMode) {
		playSettings.mode = next;
		session.mode = next;
		persistSettings();
		playSelect();
	}

	function chooseDifficulty(next: Difficulty) {
		playSettings.difficulty = next;
		session.difficulty = next;
		persistSettings();
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

<section class="menu" in:fade={{ duration: 400 }}>
	<p class="kicker" in:fly={{ y: 16, duration: 500 }}>ARCADE PROTOCOL</p>
	<h1 in:fly={{ y: 24, duration: 650 }}>
		<span class="word" data-text="CONNECT">CONNECT</span>
		<span class="four-wrap">
			<i class="orbiter o1"></i>
			<i class="orbiter o2"></i>
			<i class="orbiter o3"></i>
			<em>4</em>
		</span>
	</h1>
	<p class="lede" in:fly={{ y: 18, duration: 700 }}>
		Drop with gravity. Bounce with restitution. Claim four in a line before the grid saturates.
	</p>

	<div class="modes">
		<button class="card" class:on={mode === 'local'} onclick={() => choose('local')}>
			<span class="tag">Hotseat</span>
			<strong>Human Duel</strong>
			<small>Pass the machine. Crimson vs gold, same screen, no mercy.</small>
		</button>
		<button class="card" class:on={mode === 'ai'} onclick={() => choose('ai')}>
			<span class="tag">Synthetic</span>
			<strong>Neural Core</strong>
			<small>A minimax mind with alpha-beta teeth. It will see the fork.</small>
		</button>
	</div>

	<p class="record" in:fade={{ duration: 200 }}>
		{#if mode === 'ai'}
			<span>Career vs {difficulty}</span>
			<strong>You {record[1]} — {record[2]} Core</strong>
		{:else}
			<span>Hotseat ledger</span>
			<strong>Crimson {record[1]} — {record[2]} Gold</strong>
		{/if}
	</p>

	{#if mode === 'ai'}
		<div class="diffs" in:fade={{ duration: 200 }}>
			{#each (['easy', 'medium', 'hard'] as const) as level (level)}
				<button class="pill" class:on={difficulty === level} onclick={() => chooseDifficulty(level)}>
					{level}
				</button>
			{/each}
		</div>
	{/if}

	<div class="launch">
		{#if saved}
			<button class="go" onclick={resume}>Resume match</button>
			<button class="gear" onclick={launch}>New match</button>
		{:else}
			<button class="go" onclick={launch}>Initialize match</button>
		{/if}
		<button class="gear" onclick={openSettings}>Settings</button>
	</div>
	<ArcadeExit tone="space" size="banner" />
	{#if saved}
		<p class="saved" in:fade={{ duration: 180 }}>{savedLine} waiting in storage.</p>
	{/if}
	<p class="hint">Keys 1-7 drop. Arrows aim. Enter resumes or starts. Esc closes settings, then this chamber.</p>
</section>

<style>
	.menu {
		position: relative;
		z-index: 1;
		width: min(760px, 100%);
		text-align: center;
		padding: 24px 8px 48px;
	}

	.kicker {
		margin: 0 0 10px;
		letter-spacing: 0.42em;
		font-size: 0.72rem;
		color: var(--cyan);
		font-family: var(--font-display);
	}

	h1 {
		margin: 0;
		font-family: var(--font-display);
		font-weight: 900;
		line-height: 0.86;
		font-size: clamp(4.4rem, 16vw, 8.4rem);
		letter-spacing: -0.04em;
		animation: titlefloat 4.5s ease-in-out infinite;
	}

	.word {
		display: block;
		position: relative;
		background: linear-gradient(90deg, #fff, #c9c0ff 40%, #5ce1e6 70%, #ff335c);
		background-size: 200% 100%;
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		animation: sheen 5s linear infinite;
		filter: drop-shadow(0 12px 24px rgba(92, 225, 230, 0.22));
	}

	.word::before,
	.word::after {
		content: attr(data-text);
		position: absolute;
		inset: 0;
		background: inherit;
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		mix-blend-mode: screen;
		pointer-events: none;
	}

	.word::before {
		color: #ff335c;
		transform: translate(-3px, 1px);
		opacity: 0.45;
		animation: rgb 2.8s steps(2, end) infinite;
	}

	.word::after {
		color: #5ce1e6;
		transform: translate(3px, -1px);
		opacity: 0.4;
		animation: rgb 3.4s steps(2, end) infinite reverse;
	}

	.four-wrap {
		display: block;
		position: relative;
		width: max-content;
		margin: 0 auto;
	}

	h1 em {
		display: block;
		font-style: normal;
		background: linear-gradient(180deg, #fff1b0, #f5c24b 40%, #ff335c);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		animation: fourpulse 2.2s ease-in-out infinite;
	}

	.orbiter {
		position: absolute;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		left: 50%;
		top: 50%;
		box-shadow: 0 0 12px currentColor;
	}

	.o1 {
		color: #ff335c;
		background: #ff335c;
		animation: orbit 3.2s linear infinite;
	}

	.o2 {
		color: #f5c24b;
		background: #f5c24b;
		animation: orbit 4.4s linear infinite reverse;
	}

	.o3 {
		color: #5ce1e6;
		background: #5ce1e6;
		animation: orbit 5.6s linear infinite;
	}

	.lede {
		margin: 22px auto 34px;
		max-width: 34rem;
		color: var(--muted);
		font-size: 1.05rem;
		line-height: 1.6;
	}

	.record {
		margin: 22px auto 0;
		display: grid;
		gap: 4px;
		justify-items: center;
	}

	.record span {
		letter-spacing: 0.18em;
		text-transform: uppercase;
		font-size: 0.68rem;
		color: var(--cyan);
	}

	.record strong {
		font-family: var(--font-display);
		font-size: 1.15rem;
		letter-spacing: 0.04em;
	}

	.modes {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
	}

	.card,
	.go,
	.gear,
	.pill {
		border: 1px solid var(--line);
		background: var(--glass);
		cursor: pointer;
	}

	.card {
		text-align: left;
		padding: 22px 20px 20px;
		border-radius: 22px;
		box-shadow: var(--shadow);
		overflow: hidden;
		transition:
			transform 180ms ease,
			border-color 180ms ease,
			box-shadow 180ms ease;
	}

	.card::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(110deg, transparent 30%, rgba(255, 255, 255, 0.12) 48%, transparent 62%);
		translate: -80% 0;
		animation: foil 4.8s ease-in-out infinite;
		pointer-events: none;
	}

	.card {
		position: relative;
	}

	.card:hover,
	.card.on {
		transform: translateY(-4px);
		border-color: rgba(92, 225, 230, 0.5);
		box-shadow:
			var(--shadow),
			0 0 0 1px rgba(92, 225, 230, 0.15);
	}

	.card.on {
		background: linear-gradient(180deg, rgba(92, 225, 230, 0.12), rgba(16, 18, 36, 0.7));
	}

	.tag {
		display: inline-block;
		font-size: 0.68rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--cyan);
		margin-bottom: 10px;
	}

	.card strong {
		display: block;
		font-family: var(--font-display);
		font-size: 1.35rem;
		margin-bottom: 8px;
	}

	.card small {
		color: var(--muted);
		line-height: 1.5;
	}

	.diffs {
		display: flex;
		justify-content: center;
		gap: 10px;
		margin: 22px 0 0;
	}

	.pill {
		padding: 8px 16px;
		border-radius: 999px;
		text-transform: capitalize;
	}

	.pill.on {
		background: var(--gold);
		color: #2a1a00;
		border-color: transparent;
	}

	.launch {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 12px;
		margin-top: 28px;
		flex-wrap: wrap;
	}

	.go,
	.gear {
		padding: 16px 36px;
		border-radius: 999px;
		font-family: var(--font-display);
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.go {
		background: linear-gradient(180deg, #ffe38a, #f5c24b 45%, #e08a1a);
		color: #2a1600;
		border: 0;
		box-shadow:
			0 12px 30px rgba(245, 194, 75, 0.28),
			inset 0 1px 0 rgba(255, 255, 255, 0.5);
		animation: cta 1.8s ease-in-out infinite;
	}

	.gear {
		padding: 16px 22px;
		color: var(--cyan);
	}

	.go:hover,
	.gear:hover {
		transform: translateY(-2px);
	}

	@keyframes titlefloat {
		50% {
			transform: translateY(-8px);
		}
	}

	@keyframes sheen {
		to {
			background-position: 200% 0;
		}
	}

	@keyframes rgb {
		50% {
			opacity: 0.15;
		}
	}

	@keyframes fourpulse {
		50% {
			filter: drop-shadow(0 0 18px rgba(255, 51, 92, 0.55));
			transform: scale(1.04);
		}
	}

	@keyframes orbit {
		from {
			transform: rotate(0deg) translateX(78px) rotate(0deg);
		}
		to {
			transform: rotate(360deg) translateX(78px) rotate(-360deg);
		}
	}

	@keyframes foil {
		0%,
		55% {
			translate: -80% 0;
		}
		100% {
			translate: 120% 0;
		}
	}

	@keyframes cta {
		50% {
			box-shadow:
				0 16px 40px rgba(245, 194, 75, 0.5),
				inset 0 1px 0 rgba(255, 255, 255, 0.5);
			transform: scale(1.03);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		h1,
		.word,
		.word::before,
		.word::after,
		h1 em,
		.orbiter,
		.card::after,
		.go {
			animation: none;
		}
	}

	.hint {
		margin: 18px 0 0;
		color: color-mix(in srgb, var(--muted) 80%, transparent);
		font-size: 0.85rem;
	}

	.saved {
		margin: 12px 0 0;
		color: var(--cyan);
		font-size: 0.88rem;
		letter-spacing: 0.04em;
	}

	@media (max-width: 680px) {
		.modes {
			grid-template-columns: 1fr;
		}
	}
</style>
