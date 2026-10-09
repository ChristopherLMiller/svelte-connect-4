<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import ArcadeExit from '$lib/components/ArcadeExit.svelte';
	import ArcadeTile from '$lib/components/ArcadeTile.svelte';
	import Thumb from './Thumb.svelte';
	import { uiSound } from '../sound/sfx';
	import { peekPinball } from '../persist';
	import { pinballBest, pinballPrefs, openPinballGuide, openPinballSettings, persistPinballPrefs } from '../settings.svelte';
	import { TABLES } from '../tables';
	import { DIFFICULTIES, TABLE_IDS, type Difficulty, type TableId } from '../types';
	import type { PinballSession } from '../session.svelte';

	let { session }: { session: PinballSession } = $props();

	const tables = TABLE_IDS.map((id) => TABLES[id]);
	const difficulty = $derived(pinballPrefs.difficulty);
	const spec = $derived(session.spec);
	const saved = $derived.by(() => {
		void session.screen;
		return peekPinball().saved;
	});
	const savedName = $derived(saved ? TABLES[saved.table]?.meta.name : '');
	const best = $derived(pinballBest[session.table][difficulty]);

	function pickTable(id: TableId) {
		if (id === session.table) return;
		session.choose(id);
		uiSound(session.spec.sfx, 'select');
	}

	function pickLevel(next: Difficulty) {
		pinballPrefs.difficulty = next;
		session.difficulty = next;
		persistPinballPrefs();
		uiSound(session.spec.sfx, 'select');
	}

	function onKeys(event: KeyboardEvent) {
		if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
		const i = tables.findIndex((t) => t.meta.id === session.table);
		const next = tables[(i + (event.key === 'ArrowRight' ? 1 : tables.length - 1)) % tables.length]!;
		event.preventDefault();
		pickTable(next.meta.id);
		(event.currentTarget as HTMLElement).querySelector<HTMLElement>(`[data-id="${next.meta.id}"]`)?.focus();
	}
</script>

<section class="menu" in:fade={{ duration: 380 }}>
	<p class="kicker" in:fly={{ y: 12, duration: 420 }}>Pinball parlour · {tables.length} tables</p>
	<h1 in:fly={{ y: 18, duration: 560 }}>Silverball</h1>

	<div class="shelf" role="radiogroup" aria-label="Table" tabindex="-1" onkeydown={onKeys}>
		{#each tables as t (t.meta.id)}
			{@const on = t.meta.id === session.table}
			<button
				class="table"
				class:on
				role="radio"
				aria-checked={on}
				aria-label={t.meta.name}
				tabindex={on ? 0 : -1}
				data-id={t.meta.id}
				style:--c-accent={t.meta.skin.accent}
				style:--c-hot={t.meta.skin.hot}
				style:--c-bg={t.meta.skin.bg}
				onclick={() => pickTable(t.meta.id)}
			>
				<span class="glass"><Thumb spec={t} /></span>
				<small>{t.meta.year}</small>
				<b style:font-family={t.meta.skin.display}>{t.meta.name}</b>
			</button>
		{/each}
	</div>

	{#key spec.meta.id}
		<div class="about" in:fade={{ duration: 220 }}>
			<p class="era">{spec.meta.kicker}</p>
			<h2>{spec.meta.name}</h2>
			<p class="lede">{spec.meta.lede}</p>
		</div>
	{/key}

	<div class="levels" role="radiogroup" aria-label="Difficulty">
		{#each DIFFICULTIES as item (item.id)}
			<button class={['level', item.id]} class:on={difficulty === item.id} role="radio" aria-checked={difficulty === item.id} onclick={() => pickLevel(item.id)}>
				<strong>{item.name}</strong>
				<small>{item.note}</small>
			</button>
		{/each}
	</div>

	<p class="ledger">
		<span>
			Best score
			<strong>{best.score ? best.score.toLocaleString() : '—'}</strong>
		</span>
		<span>
			Most {spec.feat.label.toLowerCase()}
			<strong>{best.feat || '—'}</strong>
		</span>
	</p>

	<div class="cta">
		{#if saved}
			<button
				class="ghost"
				onclick={() => {
					uiSound(session.spec.sfx, 'select');
					if (!session.resume()) session.start();
				}}>Resume {savedName} · ball {saved.progress.ball} · {saved.progress.score.toLocaleString()}</button
			>
		{/if}
		<button
			class="go"
			onclick={() => {
				uiSound(session.spec.sfx, 'select');
				session.start(session.table, difficulty);
			}}>Play {spec.meta.name}</button
		>
	</div>
	<nav class="dock" aria-label="Silverball">
		<ArcadeTile tone="silverball" size="tile" kicker="Learn" label="How to play" onclick={openPinballGuide} />
		<ArcadeTile tone="silverball" size="tile" kicker="Tune" label="Settings" onclick={openPinballSettings} />
		<ArcadeExit tone="silverball" size="tile" />
	</nav>
</section>

<style>
	.menu {
		position: relative;
		z-index: 2;
		width: min(1080px, 100%);
		text-align: center;
		color: var(--sb-ink);
		padding: 16px 18px 24px;
		border-radius: 28px;
		background: radial-gradient(closest-side, color-mix(in srgb, var(--sb-bg) 78%, transparent), color-mix(in srgb, var(--sb-bg) 40%, transparent) 70%, transparent);
	}

	.kicker {
		margin: 0;
		letter-spacing: 0.26em;
		text-transform: uppercase;
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--sb-accent);
	}

	h1 {
		margin: 4px 0 0;
		font-family: 'Righteous', 'Barlow Condensed', Impact, sans-serif;
		font-weight: 400;
		letter-spacing: 0.06em;
		font-size: clamp(2.6rem, 8vw, 4.4rem);
		line-height: 1;
		background: linear-gradient(180deg, #ffffff, #c9ced8 45%, #7d8494 55%, #e8ecf2);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		filter: drop-shadow(0 3px 0 rgba(0, 0, 0, 0.45)) drop-shadow(0 0 18px color-mix(in srgb, var(--sb-accent) 35%, transparent));
	}

	.shelf {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		gap: 10px;
		margin-top: 18px;
		outline: none;
	}

	.table {
		appearance: none;
		border: 1px solid color-mix(in srgb, var(--c-accent) 25%, transparent);
		border-radius: 14px;
		background: color-mix(in srgb, var(--c-bg) 85%, transparent);
		color: inherit;
		font: inherit;
		padding: 6px 6px 8px;
		cursor: pointer;
		display: grid;
		gap: 3px;
		transition:
			transform 180ms ease,
			border-color 180ms ease,
			box-shadow 180ms ease;
	}

	.table .glass {
		display: block;
		border-radius: 9px 9px 5px 5px;
		overflow: hidden;
		opacity: 0.8;
		transition: opacity 180ms ease;
	}

	.table small {
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-size: 0.6rem;
		font-weight: 700;
		color: var(--c-accent);
	}

	.table b {
		font-weight: 400;
		font-size: 0.98rem;
		line-height: 1.05;
		color: var(--sb-ink);
	}

	.table.on {
		border-color: var(--c-accent);
		box-shadow: 0 10px 28px color-mix(in srgb, var(--c-hot) 30%, transparent);
		transform: translateY(-4px);
	}

	.table.on .glass {
		opacity: 1;
	}

	.about {
		margin-top: 16px;
	}

	.era {
		margin: 0;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--sb-accent);
	}

	h2 {
		margin: 4px 0 0;
		font-family: var(--sb-display);
		font-weight: 400;
		letter-spacing: 0.04em;
		font-size: clamp(2rem, 6vw, 3.2rem);
		line-height: 1.05;
		text-shadow:
			0 3px 0 color-mix(in srgb, var(--sb-hot) 55%, #000),
			0 8px 30px rgba(0, 0, 0, 0.6);
	}

	.lede {
		margin: 8px auto 0;
		max-width: 40rem;
		color: var(--sb-muted);
		line-height: 1.45;
		font-size: 1.08rem;
		text-shadow: 0 1px 8px rgba(0, 0, 0, 0.8);
	}

	.levels {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
		margin: 18px auto 0;
		max-width: 840px;
	}

	.level,
	.go,
	.ghost {
		appearance: none;
		border: 1px solid color-mix(in srgb, var(--sb-accent) 25%, transparent);
		background: var(--sb-panel);
		color: inherit;
		cursor: pointer;
		font: inherit;
	}

	.level {
		text-align: left;
		border-radius: 16px;
		padding: 10px 14px 12px;
		backdrop-filter: blur(8px);
		transition:
			border-color 180ms ease,
			transform 180ms ease,
			box-shadow 180ms ease;
	}

	.level.kind {
		--hue: #7dff9a;
	}

	.level.fair {
		--hue: #ffc24a;
	}

	.level.wicked {
		--hue: #ff4b5c;
	}

	.level.on {
		border-color: var(--hue);
		box-shadow: 0 10px 28px color-mix(in srgb, var(--hue) 30%, transparent);
		transform: translateY(-3px);
	}

	.level strong {
		display: block;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		font-size: 1.1rem;
		color: var(--hue);
	}

	.level small {
		display: block;
		margin-top: 2px;
		color: var(--sb-muted);
		line-height: 1.3;
		font-size: 0.9rem;
	}

	.ledger {
		margin: 16px 0 0;
		display: flex;
		justify-content: center;
		gap: 36px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		font-size: 0.74rem;
		font-weight: 700;
		color: var(--sb-muted);
		text-shadow: 0 1px 6px rgba(0, 0, 0, 0.8);
	}

	.ledger strong {
		display: block;
		margin-top: 4px;
		font-size: 1.4rem;
		letter-spacing: 0.02em;
		text-transform: none;
		color: var(--sb-ink);
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
		padding: 13px 30px;
		font-weight: 700;
		font-size: 1.05rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		transition: transform 160ms ease;
	}

	.go {
		border: 0;
		background: linear-gradient(180deg, color-mix(in srgb, var(--sb-hot) 80%, #fff), color-mix(in srgb, var(--sb-hot) 60%, #000));
		color: #fff;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
		box-shadow:
			0 10px 26px color-mix(in srgb, var(--sb-hot) 40%, transparent),
			inset 0 1px 0 rgba(255, 255, 255, 0.35);
	}

	.ghost {
		padding: 13px 22px;
		backdrop-filter: blur(8px);
	}

	@media (hover: hover) {
		.go:hover,
		.ghost:hover,
		.level:hover,
		.table:hover {
			transform: translateY(-2px);
		}

		.table.on:hover {
			transform: translateY(-4px);
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
		.ghost:hover,
		.level:hover,
		.level.on,
		.table:hover,
		.table.on,
		.table.on:hover {
			transform: none;
		}
	}

	@media (max-width: 860px) {
		.shelf {
			grid-template-columns: none;
			grid-auto-flow: column;
			grid-auto-columns: 112px;
			overflow-x: auto;
			padding: 6px 4px 10px;
			scroll-snap-type: x mandatory;
		}

		.table {
			scroll-snap-align: center;
		}
	}

	@media (max-width: 640px) {
		.levels {
			grid-template-columns: 1fr;
		}

		.level small {
			display: none;
		}

		.ledger {
			gap: 16px;
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
