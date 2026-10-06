<script lang="ts">
	import { untrack } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import ArcadeExit from '$lib/components/ArcadeExit.svelte';
	import ArcadeTile from '$lib/components/ArcadeTile.svelte';
	import FrostIcon from './FrostIcon.svelte';
	import { playSelect } from '../audio';
	import { peekSaved, type Board } from '../persist';
	import { frostPrefs, frostStats, liveStreak, openFrostGuide, openFrostSettings, persistFrostPrefs, todaysDaily } from '../settings.svelte';
	import { formatPrecise, LEVEL_INFO, LEVELS, todayKey } from '../types';
	import type { FrostSession } from '../session.svelte';

	let { session }: { session: FrostSession } = $props();

	let choice = $state<Board>(untrack(() => session.board));
	const saved = $derived(peekSaved());
	const today = todayKey();
	const daily = $derived(todaysDaily(today));
	const streak = $derived(liveStreak(today));
	const flakes = Array.from({ length: 14 }, (_, i) => ({ i, x: (i * 37) % 100, d: (i * 0.53) % 5, s: 0.6 + ((i * 13) % 10) / 12 }));

	const savedLabel = $derived.by(() => {
		if (!saved) return '';
		if (saved.board === 'daily') return saved.date === today ? "today's survey" : '';
		return LEVEL_INFO[saved.board].name.toLowerCase();
	});

	function choose(next: Board) {
		choice = next;
		if (next !== 'daily') {
			frostPrefs.level = next;
			persistFrostPrefs();
		}
		playSelect();
	}

	function toggleSure() {
		frostPrefs.sure = !frostPrefs.sure;
		persistFrostPrefs();
		playSelect();
	}

	function launch() {
		session.start(choice);
	}

	function resume() {
		playSelect();
		session.resume();
	}
</script>

<section class="menu" in:fade={{ duration: 380 }}>
	<div class="crest" in:fly={{ y: 10, duration: 380 }}>
		<div class="dust" aria-hidden="true">
			{#each flakes as f (f.i)}
				<i style:--x="{f.x}%" style:--d="{f.d}s" style:--s={f.s}></i>
			{/each}
		</div>
		<FrostIcon size="hero" />
	</div>
	<p class="kicker" in:fly={{ y: 12, duration: 420 }}>A frozen lake at dawn</p>
	<h1 in:fly={{ y: 18, duration: 560 }}>Frostline</h1>
	<p class="lede">
		The lake froze hard in the night, but not everywhere. Step through the frost and read the cracks: each one counts the thin
		ice around it. Plant a flag where the water waits, and cross before the sun is up.
	</p>

	<div class="levels">
		{#each LEVELS as level (level)}
			{@const info = LEVEL_INFO[level]}
			<button class="card" class:on={choice === level} onclick={() => choose(level)}>
				<span class="tag">{info.tag}</span>
				<strong>{info.name}</strong>
				<small>{info.body}</small>
				<span class="meta">
					{info.w}×{info.h} · {info.mines}
					{#if frostStats.best[level]}<b>Best {formatPrecise(frostStats.best[level])}</b>{/if}
				</span>
			</button>
		{/each}
	</div>

	<button class="card daily" class:on={choice === 'daily'} onclick={() => choose('daily')}>
		<span class="sun" aria-hidden="true"></span>
		<span class="copy">
			<span class="tag">Dawn survey · {today}</span>
			<strong>Today's lake</strong>
			<small>One lake for everyone today. Guess-free, opened from a drilled hole.</small>
		</span>
		<span class="stat">
			{#if daily.won}
				<b>{formatPrecise(daily.ms)}</b>
				<small>crossed</small>
			{:else if daily.tries}
				<b>{daily.tries}</b>
				<small>{daily.tries === 1 ? 'try' : 'tries'}</small>
			{:else}
				<b>New</b>
				<small>today</small>
			{/if}
			{#if streak > 1}<em>{streak}-day streak</em>{/if}
		</span>
	</button>

	{#if choice !== 'daily'}
		<label class="sure" transition:fade={{ duration: 160 }}>
			<input type="checkbox" checked={frostPrefs.sure} onchange={toggleSure} />
			<span>
				<strong>Sure footing</strong>
				<small>Only lakes that can be read without a guess</small>
			</span>
		</label>
		<p class="ledger">
			<span>
				Best
				<strong>{frostStats.best[choice] ? formatPrecise(frostStats.best[choice]) : '—'}</strong>
			</span>
			<span>
				Crossed
				<strong>{frostStats.won[choice]}<i>{' '}of {frostStats.played[choice]}</i></strong>
			</span>
		</p>
	{/if}

	<div class="cta">
		{#if saved && savedLabel}
			<button class="ghost" onclick={resume}>Resume {savedLabel}</button>
		{/if}
		<button class="go" onclick={launch}>{choice === 'daily' ? 'Survey the lake' : 'Step onto the ice'}</button>
	</div>
	<nav class="dock" aria-label="Frostline">
		<ArcadeTile tone="frost" size="tile" kicker="Learn" label="How to play" onclick={openFrostGuide} />
		<ArcadeTile tone="frost" size="tile" kicker="Tune" label="Settings" onclick={openFrostSettings} />
		<ArcadeExit tone="frost" size="tile" />
	</nav>
</section>

<style>
	.menu {
		position: relative;
		z-index: 2;
		width: min(860px, 100%);
		text-align: center;
		color: #1d2b47;
		padding-bottom: 4vh;
	}

	.crest {
		position: relative;
		display: grid;
		place-items: center;
		height: 100px;
	}

	.dust {
		position: absolute;
		inset: -20px 25%;
	}

	.dust i {
		position: absolute;
		left: var(--x);
		top: 0;
		width: 4px;
		height: 4px;
		background: #fff;
		clip-path: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%);
		scale: var(--s);
		opacity: 0;
		animation: fall 5s linear infinite;
		animation-delay: var(--d);
	}

	.kicker {
		margin: 14px 0 0;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		font-size: 0.74rem;
		font-weight: 700;
		color: #fff4ea;
		text-shadow: 0 1px 10px rgba(80, 40, 80, 0.45);
	}

	h1 {
		margin: 6px 0 0;
		font-family: 'Josefin Sans', ui-sans-serif, system-ui, sans-serif;
		font-weight: 300;
		font-size: clamp(2.8rem, 9vw, 5rem);
		line-height: 0.95;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: #fff;
		text-shadow:
			0 2px 0 rgba(120, 160, 210, 0.35),
			0 0 28px rgba(255, 210, 180, 0.6),
			0 6px 30px rgba(40, 30, 80, 0.35);
	}

	.lede {
		margin: 14px auto 0;
		max-width: 38rem;
		padding: 12px 18px;
		border-radius: 16px;
		background: rgba(246, 251, 255, 0.62);
		backdrop-filter: blur(6px);
		color: #2b3b58;
		line-height: 1.55;
		font-size: 0.98rem;
	}

	.levels {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
		margin-top: 20px;
	}

	.card,
	.go,
	.ghost {
		appearance: none;
		border: 1px solid rgba(255, 255, 255, 0.75);
		background: linear-gradient(180deg, rgba(246, 251, 255, 0.8), rgba(214, 232, 246, 0.74));
		color: inherit;
		cursor: pointer;
		font: inherit;
		backdrop-filter: blur(8px);
	}

	.card {
		position: relative;
		display: grid;
		align-content: start;
		text-align: left;
		border-radius: 16px;
		padding: 14px 16px 14px;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.9),
			0 8px 22px rgba(20, 30, 70, 0.16);
		transition:
			border-color 180ms ease,
			transform 180ms ease,
			box-shadow 180ms ease;
	}

	.card.on {
		border-color: #ff8a5a;
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(236, 244, 251, 0.92));
		box-shadow:
			inset 0 1px 0 #fff,
			0 0 0 2px rgba(255, 138, 90, 0.5),
			0 12px 28px rgba(20, 30, 70, 0.22);
		transform: translateY(-3px);
	}

	.tag {
		display: block;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-size: 0.62rem;
		font-weight: 700;
		color: #2f7fb0;
		margin-bottom: 4px;
	}

	.card strong {
		display: block;
		font-family: 'Josefin Sans', ui-sans-serif, system-ui, sans-serif;
		font-weight: 600;
		font-size: 1.32rem;
	}

	.card small {
		display: block;
		margin-top: 4px;
		color: #4d5f7a;
		line-height: 1.4;
		font-size: 0.86rem;
	}

	.meta {
		display: flex;
		justify-content: space-between;
		gap: 8px;
		margin-top: 10px;
		font-size: 0.74rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		color: #4d5f7a;
	}

	.meta b {
		color: #d4562f;
	}

	.daily {
		margin-top: 10px;
		width: 100%;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 14px;
	}

	.daily .sun {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: radial-gradient(circle at 50% 50%, #fff4d8 0 30%, #ffc98a 46%, rgba(255, 140, 110, 0) 70%);
		box-shadow: 0 0 22px rgba(255, 170, 120, 0.6);
	}

	.daily .stat {
		display: grid;
		justify-items: end;
		text-align: right;
	}

	.daily .stat b {
		font-family: 'Josefin Sans', ui-sans-serif, system-ui, sans-serif;
		font-size: 1.35rem;
		font-weight: 700;
	}

	.daily .stat small {
		margin: 0;
		font-size: 0.7rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.daily .stat em {
		margin-top: 4px;
		font-style: normal;
		font-size: 0.72rem;
		font-weight: 700;
		color: #d4562f;
	}

	.sure {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		margin-top: 14px;
		padding: 9px 16px;
		border-radius: 999px;
		background: rgba(246, 251, 255, 0.72);
		border: 1px solid rgba(255, 255, 255, 0.8);
		backdrop-filter: blur(6px);
		cursor: pointer;
		text-align: left;
	}

	.sure input {
		accent-color: #e8573a;
		width: 18px;
		height: 18px;
	}

	.sure strong {
		display: block;
		font-size: 0.9rem;
	}

	.sure small {
		display: block;
		font-size: 0.78rem;
		color: #4d5f7a;
	}

	.ledger {
		margin: 12px auto 0;
		width: fit-content;
		display: flex;
		justify-content: center;
		gap: 36px;
		padding: 8px 22px;
		border-radius: 16px;
		background: rgba(246, 251, 255, 0.62);
		backdrop-filter: blur(6px);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-size: 0.64rem;
		font-weight: 700;
		color: #4d5f7a;
	}

	.ledger strong {
		display: block;
		margin-top: 2px;
		font-family: 'Josefin Sans', ui-sans-serif, system-ui, sans-serif;
		font-size: 1.25rem;
		letter-spacing: 0.02em;
		text-transform: none;
		color: #1d2b47;
	}

	.ledger i {
		font-style: normal;
		font-size: 0.85rem;
		opacity: 0.85;
	}

	.cta {
		margin-top: 20px;
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: 10px;
	}

	.go,
	.ghost {
		border-radius: 999px;
		padding: 14px 30px;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		transition:
			transform 160ms ease,
			border-color 160ms ease,
			background 160ms ease;
	}

	.go {
		border: 0;
		background: linear-gradient(180deg, #ff9a6e, #e8573a);
		color: #fff8f2;
		box-shadow:
			0 10px 26px rgba(232, 87, 58, 0.35),
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

	@keyframes fall {
		0% {
			transform: translateY(0) rotate(0deg);
			opacity: 0;
		}
		15% {
			opacity: 0.95;
		}
		100% {
			transform: translateY(130px) rotate(180deg);
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.go:hover,
		.ghost:hover,
		.card:hover,
		.card.on {
			transform: none;
		}

		.dust i {
			animation: none;
			opacity: 0.7;
			top: calc(var(--s) * 60px);
		}
	}

	@media (max-width: 680px) {
		.levels {
			grid-template-columns: 1fr;
		}

		.levels .card small {
			display: none;
		}

		.meta {
			margin-top: 4px;
		}

		.daily .copy small {
			display: none;
		}

		.daily .sun {
			width: 34px;
			height: 34px;
		}

		.ledger {
			gap: 22px;
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
