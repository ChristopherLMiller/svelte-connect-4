<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import ArcadeExit from '$lib/components/ArcadeExit.svelte';
	import ArcadeTile from '$lib/components/ArcadeTile.svelte';
	import ReefIcon from './ReefIcon.svelte';
	import { playSelect } from '../audio';
	import { peekSaved } from '../persist';
	import { formatTime, openReefGuide, openReefSettings, persistReefPrefs, reefBest, reefPrefs } from '../settings.svelte';
	import { depthOf, KINDS, MAX_START, SPECIES, zoneOf, type Mode } from '../types';
	import type { ReefSession } from '../session.svelte';

	let { session }: { session: ReefSession } = $props();

	const mode = $derived(reefPrefs.mode);
	const saved = $derived(peekSaved());
	const startDepth = $derived(depthOf(reefPrefs.startLevel));

	const modes: Array<{ id: Mode; tag: string; title: string; body: string; hue: string }> = [
		{
			id: 'marathon',
			tag: 'Endless',
			title: 'Marathon',
			body: 'Every ten lines takes you deeper. The water darkens, the coral burns brighter and the pieces fall faster.',
			hue: 'cyan'
		},
		{
			id: 'sprint',
			tag: 'Against the clock',
			title: 'Sprint',
			body: 'Forty lines as fast as you can. The depth holds steady; only the clock is chasing you.',
			hue: 'magenta'
		}
	];

	function choose(next: Mode) {
		reefPrefs.mode = next;
		session.mode = next;
		persistReefPrefs();
		playSelect();
	}

	function step(by: number) {
		const next = Math.max(1, Math.min(MAX_START, reefPrefs.startLevel + by));
		if (next === reefPrefs.startLevel) return;
		reefPrefs.startLevel = next;
		persistReefPrefs();
		playSelect();
	}

	function launch() {
		playSelect();
		session.start(mode, reefPrefs.startLevel);
	}

	function resume() {
		playSelect();
		session.resume();
	}
</script>

<section class="menu" in:fade={{ duration: 380 }}>
	<div class="crest" in:fly={{ y: 10, duration: 380 }}>
		<div class="column" aria-hidden="true">
			{#each KINDS as kind, i (kind)}
				<i style:--c={SPECIES[kind].base} style:--d="{i * 0.43}s" style:--x="{((i * 37) % 100) / 100}"></i>
			{/each}
		</div>
		<ReefIcon size="hero" />
	</div>
	<p class="kicker" in:fly={{ y: 12, duration: 420 }}>A thousand metres down</p>
	<h1 in:fly={{ y: 18, duration: 560 }}>Lumen Reef</h1>
	<p class="lede">
		In the midnight zone, living light builds the reef. Stack the glowing coral, seven species of it,
		and every full line dissolves into a plankton bloom that rises toward a surface no one here has seen.
	</p>

	<div class="modes">
		{#each modes as item (item.id)}
			<button class={['card', item.hue]} class:on={mode === item.id} onclick={() => choose(item.id)}>
				<span class="tag">{item.tag}</span>
				<strong>{item.title}</strong>
				<small>{item.body}</small>
			</button>
		{/each}
	</div>

	{#if mode === 'marathon'}
		<div class="depth" transition:fade={{ duration: 160 }}>
			<button class="step" aria-label="Shallower start" disabled={reefPrefs.startLevel <= 1} onclick={() => step(-1)}>‹</button>
			<div class="dial">
				<small>Start at level {reefPrefs.startLevel}</small>
				<strong>{startDepth.toLocaleString()} m</strong>
				<span>{zoneOf(startDepth)}</span>
			</div>
			<button class="step" aria-label="Deeper start" disabled={reefPrefs.startLevel >= MAX_START} onclick={() => step(1)}>›</button>
		</div>
	{/if}

	<p class="ledger">
		{#if mode === 'marathon'}
			<span>
				Best score
				<strong>{reefBest.score.toLocaleString()}</strong>
			</span>
			<span>
				Deepest
				<strong>{reefBest.depth ? `${reefBest.depth.toLocaleString()} m` : '—'}</strong>
			</span>
			<span>
				Most lines
				<strong>{reefBest.lines}</strong>
			</span>
		{:else}
			<span>
				Fastest forty
				<strong>{reefBest.sprint ? formatTime(reefBest.sprint / 1000) : '—'}</strong>
			</span>
		{/if}
	</p>

	<div class="cta">
		{#if saved}
			<button class="ghost" onclick={resume}>
				Resume the {saved.mode === 'sprint' ? 'sprint' : 'dive'} · {saved.mode === 'sprint'
					? `${saved.lines} lines`
					: `${depthOf(saved.level).toLocaleString()} m`}
			</button>
		{/if}
		<button class="go" onclick={launch}>{mode === 'sprint' ? 'Start the sprint' : 'Dive'}</button>
	</div>
	<nav class="dock" aria-label="Reef">
		<ArcadeTile tone="reef" size="tile" kicker="Learn" label="How to play" onclick={openReefGuide} />
		<ArcadeTile tone="reef" size="tile" kicker="Tune" label="Settings" onclick={openReefSettings} />
		<ArcadeExit tone="reef" size="tile" />
	</nav>
</section>

<style>
	.menu {
		position: relative;
		z-index: 2;
		width: min(820px, 100%);
		text-align: center;
		color: #d8f4ff;
		padding-bottom: 4vh;
	}

	.crest {
		position: relative;
		display: grid;
		place-items: center;
		margin-bottom: 12px;
		height: 110px;
	}

	.column {
		position: absolute;
		inset: -10px 30%;
	}

	.column i {
		position: absolute;
		left: calc(var(--x) * 100%);
		bottom: 0;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--c);
		box-shadow: 0 0 10px var(--c);
		opacity: 0;
		animation: drift 4.2s ease-in infinite;
		animation-delay: var(--d);
	}

	.kicker {
		margin: 18px 0 0;
		letter-spacing: 0.26em;
		text-transform: uppercase;
		font-size: 0.74rem;
		color: #3fe9ff;
	}

	h1 {
		margin: 8px 0 0;
		font-family: Syne, ui-sans-serif, system-ui, sans-serif;
		font-weight: 800;
		font-size: clamp(2.6rem, 8vw, 4.6rem);
		line-height: 0.95;
		letter-spacing: 0.01em;
		background: linear-gradient(90deg, #3fe9ff, #5f7dff, #ff4fd8, #ffd34d, #4dff8f, #3fe9ff);
		background-size: 260% 100%;
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		animation: shimmer 14s linear infinite;
		filter: drop-shadow(0 0 22px rgba(63, 233, 255, 0.3));
	}

	.lede {
		margin: 14px auto 0;
		max-width: 36rem;
		color: #8fb4c8;
		line-height: 1.55;
		font-size: 1.02rem;
	}

	.modes {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 12px;
		margin-top: 26px;
	}

	.card,
	.go,
	.ghost,
	.step {
		appearance: none;
		border: 1px solid rgba(63, 233, 255, 0.2);
		background: rgba(3, 14, 28, 0.62);
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

	.card.cyan {
		--glow: rgba(63, 233, 255, 0.35);
		--hue: #3fe9ff;
	}

	.card.magenta {
		--glow: rgba(255, 79, 216, 0.32);
		--hue: #ff4fd8;
	}

	.card.on {
		border-color: var(--hue);
		background: rgba(6, 26, 46, 0.86);
		box-shadow: 0 10px 28px var(--glow);
		transform: translateY(-3px);
	}

	.tag {
		display: block;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		font-size: 0.66rem;
		color: var(--hue);
		margin-bottom: 6px;
	}

	.card strong {
		display: block;
		font-family: Syne, ui-sans-serif, system-ui, sans-serif;
		font-weight: 700;
		font-size: 1.36rem;
	}

	.card small {
		display: block;
		margin-top: 6px;
		color: #8fb4c8;
		line-height: 1.4;
		font-size: 0.9rem;
	}

	.depth {
		margin: 18px auto 0;
		width: min(440px, 100%);
		display: grid;
		grid-template-columns: 44px minmax(0, 1fr) 44px;
		align-items: center;
		gap: 12px;
	}

	.dial {
		display: grid;
		gap: 2px;
		padding: 10px 16px;
		border-radius: 16px;
		border: 1px solid rgba(63, 233, 255, 0.2);
		background: rgba(3, 14, 28, 0.62);
		backdrop-filter: blur(8px);
	}

	.dial small {
		letter-spacing: 0.18em;
		text-transform: uppercase;
		font-size: 0.64rem;
		color: #3fe9ff;
	}

	.dial strong {
		font-family: Syne, ui-sans-serif, system-ui, sans-serif;
		font-weight: 700;
		font-size: 1.45rem;
		color: #e8fcff;
	}

	.dial span {
		color: #8fb4c8;
		font-size: 0.86rem;
	}

	.step {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		color: #bff6ff;
		font-size: 1.5rem;
		line-height: 1;
	}

	.step:disabled {
		opacity: 0.3;
		cursor: default;
	}

	.ledger {
		margin: 18px 0 0;
		display: flex;
		justify-content: center;
		gap: 36px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		font-size: 0.7rem;
		color: #8fb4c8;
	}

	.ledger strong {
		display: block;
		margin-top: 4px;
		font-family: Syne, ui-sans-serif, system-ui, sans-serif;
		font-size: 1.2rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		text-transform: none;
		color: #bff6ff;
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
		padding: 14px 30px;
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
		background: linear-gradient(180deg, #7ff3ff, #2a8fd8);
		color: #021020;
		box-shadow:
			0 10px 26px rgba(63, 233, 255, 0.25),
			inset 0 1px 0 rgba(255, 255, 255, 0.5);
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

	@keyframes drift {
		0% {
			transform: translateY(20px) scale(0.6);
			opacity: 0;
		}
		20% {
			opacity: 0.9;
		}
		100% {
			transform: translateY(-110px) scale(1);
			opacity: 0;
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

		.column i {
			animation: none;
			opacity: 0.6;
			bottom: calc(var(--x) * 80px);
		}

		h1 {
			animation: none;
		}
	}

	@media (max-width: 640px) {
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
