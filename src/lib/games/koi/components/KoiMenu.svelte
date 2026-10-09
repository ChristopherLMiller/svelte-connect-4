<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import ArcadeExit from '$lib/components/ArcadeExit.svelte';
	import ArcadeTile from '$lib/components/ArcadeTile.svelte';
	import KoiBloom from './KoiBloom.svelte';
	import KoiIcon from './KoiIcon.svelte';
	import { playSelect } from '../audio';
	import { peekKoi } from '../persist';
	import { koiBest, koiPrefs, openKoiGuide, openKoiSettings, persistKoiPrefs } from '../settings.svelte';
	import { KINDS, type Mode } from '../types';
	import type { KoiSession } from '../session.svelte';

	let { session }: { session: KoiSession } = $props();

	const mode = $derived(koiPrefs.mode);
	const saved = $derived.by(() => {
		void session.screen;
		const prefs = peekKoi();
		return mode === 'ripples' ? prefs.savedRipples : prefs.savedCurrents;
	});
	const best = $derived(koiBest[mode]);

	const modes: Array<{ id: Mode; tag: string; title: string; body: string }> = [
		{
			id: 'ripples',
			tag: 'Bubble shooter',
			title: 'Ripples',
			body: 'Flick blooms from the lily pad. Three of a kind pop, and anything cut loose drifts away.'
		},
		{
			id: 'currents',
			tag: 'Match three',
			title: 'Currents',
			body: 'Swap neighbouring blooms to make rows. Longer matches leave behind currents, bursts and the moon.'
		}
	];

	function choose(next: Mode) {
		koiPrefs.mode = next;
		session.mode = next;
		persistKoiPrefs();
		playSelect();
	}

	function launch() {
		playSelect();
		session.start(mode);
	}

	function resume() {
		playSelect();
		if (!session.resume(mode)) session.start(mode);
	}
</script>

<section class="menu" in:fade={{ duration: 380 }}>
	<div class="crest" in:fly={{ y: 10, duration: 380 }}>
		<div class="ring" aria-hidden="true">
			{#each KINDS as kind, i (kind)}
				<span style:--i={i}><KoiBloom {kind} size={26} /></span>
			{/each}
		</div>
		<KoiIcon size="hero" />
	</div>
	<p class="kicker" in:fly={{ y: 12, duration: 420 }}>A garden pond in high summer</p>
	<h1 in:fly={{ y: 18, duration: 560 }}>Koi Pond</h1>
	<p class="lede">
		Sun through the maple leaves, koi turning under the lily pads, and blooms floating on the water. Clear them two ways, and
		when you play well the golden koi leaps.
	</p>

	<div class="modes">
		{#each modes as item (item.id)}
			<button class={['card', item.id]} class:on={mode === item.id} aria-pressed={mode === item.id} onclick={() => choose(item.id)}>
				<span class="tag">{item.tag}</span>
				<strong>{item.title}</strong>
				<small>{item.body}</small>
			</button>
		{/each}
	</div>

	<p class="ledger">
		<span>
			Best score
			<strong>{best.score ? best.score.toLocaleString() : '—'}</strong>
		</span>
		<span>
			Furthest stage
			<strong>{best.stage || '—'}</strong>
		</span>
		{#if mode === 'currents'}
			<span>
				Longest current
				<strong>{koiBest.currents.chain ? `×${koiBest.currents.chain}` : '—'}</strong>
			</span>
		{/if}
	</p>

	<div class="cta">
		{#if saved}
			<button class="ghost" onclick={resume}>Resume · stage {saved.stage} · {saved.score.toLocaleString()}</button>
		{/if}
		<button class="go" onclick={launch}>{saved ? 'New game' : mode === 'ripples' ? 'Start rippling' : 'Into the current'}</button>
	</div>
	<nav class="dock" aria-label="Koi Pond">
		<ArcadeTile tone="pond" size="tile" kicker="Learn" label="How to play" onclick={openKoiGuide} />
		<ArcadeTile tone="pond" size="tile" kicker="Tune" label="Settings" onclick={openKoiSettings} />
		<ArcadeExit tone="pond" size="tile" />
	</nav>
</section>

<style>
	.menu {
		position: relative;
		z-index: 2;
		width: min(820px, 100%);
		text-align: center;
		color: #f6f1e4;
		padding: 20px 22px 26px;
		border-radius: 28px;
		background: radial-gradient(closest-side, rgba(8, 40, 36, 0.6), rgba(8, 40, 36, 0.35) 65%, transparent);
	}

	.crest {
		position: relative;
		display: grid;
		place-items: center;
		height: 120px;
	}

	.ring {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
	}

	.ring span {
		position: absolute;
		--a: calc(var(--i) * 60deg);
		transform: rotate(var(--a)) translateY(-52px) rotate(calc(var(--a) * -1));
		animation: orbit 30s linear infinite;
		filter: drop-shadow(0 3px 4px rgba(0, 30, 24, 0.35));
	}

	.kicker {
		margin: 12px 0 0;
		letter-spacing: 0.26em;
		text-transform: uppercase;
		font-size: 0.74rem;
		font-weight: 700;
		color: #ffd27a;
		text-shadow: 0 1px 6px rgba(0, 30, 24, 0.6);
	}

	h1 {
		margin: 6px 0 0;
		font-family: 'Kaisei Decol', Georgia, serif;
		font-weight: 700;
		font-size: clamp(2.8rem, 8.5vw, 4.8rem);
		line-height: 1;
		color: #fff8ea;
		text-shadow:
			0 2px 0 rgba(217, 83, 28, 0.55),
			0 6px 26px rgba(0, 30, 24, 0.55);
	}

	.lede {
		margin: 14px auto 0;
		max-width: 36rem;
		color: #dcefe6;
		line-height: 1.55;
		font-size: 1.04rem;
		font-weight: 500;
		text-shadow: 0 1px 8px rgba(0, 30, 24, 0.7);
	}

	.modes {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 12px;
		margin-top: 24px;
	}

	.card,
	.go,
	.ghost {
		appearance: none;
		border: 1px solid rgba(255, 179, 71, 0.25);
		background: rgba(10, 44, 40, 0.72);
		color: inherit;
		cursor: pointer;
		font: inherit;
	}

	.card {
		position: relative;
		text-align: left;
		border-radius: 18px;
		padding: 16px 18px 18px;
		backdrop-filter: blur(8px);
		transition:
			border-color 180ms ease,
			transform 180ms ease,
			box-shadow 180ms ease;
	}

	.card.ripples {
		--hue: #ff8fb5;
		--glow: rgba(255, 111, 159, 0.3);
	}

	.card.currents {
		--hue: #7cc9ff;
		--glow: rgba(56, 169, 255, 0.3);
	}

	.card.on {
		border-color: var(--hue);
		background: rgba(14, 58, 52, 0.9);
		box-shadow: 0 10px 28px var(--glow);
		transform: translateY(-3px);
	}

	.tag {
		display: block;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		font-size: 0.66rem;
		font-weight: 700;
		color: var(--hue);
		margin-bottom: 6px;
	}

	.card strong {
		display: block;
		font-family: 'Kaisei Decol', Georgia, serif;
		font-weight: 700;
		font-size: 1.45rem;
	}

	.card small {
		display: block;
		margin-top: 6px;
		color: #b6d2c5;
		line-height: 1.4;
		font-size: 0.92rem;
		font-weight: 500;
	}

	.ledger {
		margin: 20px 0 0;
		display: flex;
		justify-content: center;
		gap: 36px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		font-size: 0.7rem;
		font-weight: 700;
		color: #b6d2c5;
		text-shadow: 0 1px 6px rgba(0, 30, 24, 0.7);
	}

	.ledger strong {
		display: block;
		margin-top: 4px;
		font-family: 'Kaisei Decol', Georgia, serif;
		font-size: 1.25rem;
		letter-spacing: 0.02em;
		text-transform: none;
		color: #fff3d6;
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
		letter-spacing: 0.08em;
		text-transform: uppercase;
		transition:
			transform 160ms ease,
			border-color 160ms ease;
	}

	.go {
		border: 0;
		background: linear-gradient(180deg, #ffc36b, #f07a2c);
		color: #2a1206;
		box-shadow:
			0 10px 26px rgba(240, 122, 44, 0.3),
			inset 0 1px 0 rgba(255, 255, 255, 0.5);
	}

	.ghost {
		padding: 14px 22px;
		backdrop-filter: blur(8px);
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

	@keyframes orbit {
		to {
			transform: rotate(calc(var(--a) + 360deg)) translateY(-52px) rotate(calc((var(--a) + 360deg) * -1));
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.go:hover,
		.ghost:hover,
		.card:hover,
		.card.on {
			transform: none;
		}

		.ring span {
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
