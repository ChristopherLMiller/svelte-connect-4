<script lang="ts">
	import ArcadeExit from '$lib/components/ArcadeExit.svelte';
	import ChapelIcon from './ChapelIcon.svelte';
	import { openChapelSettings } from '../settings.svelte';
	import { chapterOf, CHAPTERS, romanNumeral } from '../levels';
	import { HOURS } from '../types';
	import type { ChapelSession } from '../session.svelte';

	let { session }: { session: ChapelSession } = $props();

	const mult = $derived(Math.min(8, 1 + Math.floor((session.combo - 1) / 3)));
	const chapterIndex = $derived(chapterOf(session.level));
	const chapter = $derived(CHAPTERS[chapterIndex]!);
	const inChapter = $derived(session.level - chapter.start + 1);

	const call = $derived.by(() => {
		switch (session.status.type) {
			case 'serve':
				return 'Serve the light';
			case 'paused':
				return 'The vigil holds';
			case 'cleared':
				return 'The window is lit';
			case 'over':
				return 'The candles gutter';
			case 'won':
				return 'Every window burns';
			default:
				return session.combo >= 4 ? `A chain of ${session.combo} · ×${mult}` : 'Keep the light aloft';
		}
	});

	const blessings = $derived(
		(
			[
				['lantern', 'Lantern'],
				['halo', 'Halo'],
				['sunburst', 'Sunburst']
			] as const
		).filter(([key]) => session.effects[key] > 0)
	);

	function bump(score: number) {
		return (node: HTMLElement) => {
			if (!score) return;
			if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
			node.animate([{ transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 200, easing: 'ease-out' });
		};
	}
</script>

<header class="hud">
	<section class="lead">
		<div class="brand card">
			<ChapelIcon />
			<div class="name">
				<p>Chapel Glass</p>
				<small>Chapter {romanNumeral(chapterIndex + 1)} · {chapter.name}</small>
			</div>
		</div>
		<div class="call card">
			<small>
				{HOURS[session.difficulty].name} · Window {session.level + 1}<span class="of">{` of ${session.windows}`}</span>
			</small>
			<strong>{session.windowName}</strong>
			<b>{call}</b>
			{#if blessings.length}
				<span class="chips">
					{#each blessings as [key, label] (key)}
						<i class={key}>{label} {session.effects[key]}</i>
					{/each}
				</span>
			{/if}
		</div>
		<div class="glass card">
			<small>Glass broken</small>
			<span class="bar" aria-hidden="true"><i style:width="{Math.round(session.lit * 100)}%"></i></span>
			<span class="row">
				<em>{Math.round(session.lit * 100)}%</em>
				<span>Window {inChapter} of {chapter.count} in {chapter.name}</span>
			</span>
		</div>
	</section>
	<section class="tally card" class:hot={session.high}>
		<span class="figure">
			<small>Score</small>
			<em {@attach bump(session.score)}>{session.score.toLocaleString()}</em>
		</span>
		<span class="figure best">
			<small>Best</small>
			<em>{session.best.toLocaleString()}</em>
		</span>
		<span class="candles" aria-label="{session.lives} candles left">
			{#each Array.from({ length: Math.max(0, session.lives) }, (_, i) => i) as i (i)}
				<i style:--d="{i * 0.37}s"></i>
			{/each}
		</span>
	</section>
	<nav class="ops" aria-label="Game">
		<button type="button" onclick={() => openChapelSettings()}>Settings</button>
		<button type="button" onclick={() => session.restart()}>Restart</button>
		<button type="button" onclick={() => session.backToMenu()}>Menu</button>
		<ArcadeExit tone="chapel" />
		<p class="keys">Mouse or ← → to steer · Space serves · P pauses · ? guide</p>
	</nav>
</header>

<style>
	.hud {
		grid-area: hud;
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto auto;
		grid-template-areas: 'lead tally ops';
		gap: 8px;
		width: min(1180px, 100%);
		justify-self: center;
		color: #f4e8d0;
		z-index: 3;
	}

	.card,
	.ops button {
		border: 1px solid rgba(242, 196, 107, 0.22);
		background: rgba(18, 17, 24, 0.84);
		border-radius: 14px;
	}

	.lead {
		grid-area: lead;
		display: flex;
		gap: 8px;
		min-width: 0;
	}

	.brand {
		display: grid;
		place-items: center;
		padding: 6px;
		flex: 0 0 auto;
	}

	.name,
	.call strong,
	.glass,
	.keys {
		display: none;
	}

	.name p {
		margin: 0;
		font-family: 'IM Fell English SC', Georgia, serif;
		font-size: 1.2rem;
		line-height: 1.05;
	}

	.name small {
		display: block;
		margin-top: 3px;
		letter-spacing: 0.08em;
		font-size: 0.7rem;
		color: #f2c46b;
	}

	.call {
		position: relative;
		display: grid;
		align-content: center;
		padding: 6px 14px;
		min-width: 0;
		flex: 1 1 auto;
	}

	.call small {
		display: block;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		font-size: 0.6rem;
		color: #f2c46b;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.call strong {
		font-family: 'IM Fell English SC', Georgia, serif;
		font-weight: 400;
		font-size: 1.5rem;
		line-height: 1.1;
		margin: 4px 0 2px;
		color: #fff4dc;
	}

	.call b {
		font-family: 'IM Fell English SC', Georgia, serif;
		font-weight: 400;
		font-size: clamp(0.95rem, 2.2vw, 1.2rem);
		line-height: 1.15;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.chips {
		position: absolute;
		right: 10px;
		top: 50%;
		translate: 0 -50%;
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.chips i {
		font-style: normal;
		font-size: 0.64rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		padding: 4px 8px;
		border-radius: 999px;
		border: 1px solid currentColor;
		background: rgba(10, 9, 14, 0.85);
	}

	.chips .lantern {
		color: #ffd98a;
	}

	.chips .halo {
		color: #f4f8ff;
	}

	.chips .sunburst {
		color: #ff9a7a;
	}

	.glass small {
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-size: 0.6rem;
		color: #bdb2a0;
	}

	.bar {
		display: block;
		height: 8px;
		margin: 8px 0;
		border-radius: 999px;
		background: rgba(255, 236, 200, 0.08);
		overflow: hidden;
	}

	.bar i {
		display: block;
		height: 100%;
		border-radius: inherit;
		background: linear-gradient(90deg, #c8243c, #e8a23a, #1f9a5c, #2b5ad0, #7b3dcc);
		background-size: 280px 100%;
		box-shadow: 0 0 12px rgba(255, 210, 140, 0.5);
		transition: width 260ms ease;
	}

	.glass .row {
		display: flex;
		align-items: baseline;
		gap: 10px;
		font-size: 0.78rem;
		color: #c9bda8;
	}

	.glass em {
		font-style: normal;
		font-family: 'IM Fell English SC', Georgia, serif;
		font-size: 1.3rem;
		color: #ffe2a0;
	}

	.tally {
		grid-area: tally;
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 6px 14px;
	}

	.figure {
		display: grid;
		line-height: 1.05;
	}

	.figure small {
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-size: 0.56rem;
		color: #bdb2a0;
	}

	.figure em {
		display: inline-block;
		font-style: normal;
		font-family: 'IM Fell English SC', Georgia, serif;
		font-size: 1.3rem;
		color: #ffe2a0;
		min-width: 3ch;
	}

	.tally.hot .figure:first-child em {
		color: #fff4dc;
		text-shadow: 0 0 12px rgba(242, 196, 107, 0.7);
	}

	.candles {
		display: flex;
		gap: 5px;
		align-items: flex-end;
		height: 26px;
	}

	.candles i {
		position: relative;
		width: 6px;
		height: 15px;
		border-radius: 1.5px;
		background: linear-gradient(180deg, #fff4dc, #d8c6a4);
	}

	.candles i::before {
		content: '';
		position: absolute;
		left: 50%;
		bottom: 100%;
		width: 6px;
		height: 9px;
		translate: -50% 1px;
		border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
		background: radial-gradient(circle at 50% 70%, #fff6d2, #ffb44a 60%, rgba(255, 120, 40, 0));
		box-shadow: 0 0 8px rgba(255, 190, 90, 0.8);
		animation: flicker 1.3s ease-in-out infinite;
		animation-delay: var(--d);
	}

	.ops {
		grid-area: ops;
		display: flex;
		align-items: stretch;
		gap: 6px;
	}

	.ops button {
		appearance: none;
		color: inherit;
		cursor: pointer;
		padding: 0 12px;
		font: inherit;
		font-size: 0.7rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		transition:
			border-color 160ms ease,
			background 160ms ease,
			color 160ms ease;
	}

	@media (hover: hover) {
		.ops button:hover {
			border-color: rgba(242, 196, 107, 0.6);
			background: rgba(32, 30, 40, 0.92);
			color: #ffe2a0;
		}
	}

	.ops :global(.exit) {
		align-self: stretch;
		padding-block: 0;
	}

	.keys {
		margin: 4px 2px 0;
		font-size: 0.74rem;
		line-height: 1.5;
		color: #9d927f;
	}

	/* Wide screens: the HUD splits into rails either side of a full-height window. */
	@media (min-width: 960px) and (min-aspect-ratio: 3/2) {
		.hud {
			display: contents;
		}

		.lead {
			flex-direction: column;
			align-self: start;
		}

		.brand {
			grid-template-columns: auto 1fr;
			place-items: center start;
			gap: 12px;
			padding: 10px 14px 10px 10px;
		}

		.name,
		.call strong,
		.glass,
		.keys {
			display: block;
		}

		.call {
			padding: 14px 16px;
		}

		.call b {
			white-space: normal;
			font-size: 1.05rem;
			color: #e9dcc2;
		}

		.chips {
			position: static;
			translate: none;
			margin-top: 10px;
		}

		.glass {
			padding: 12px 16px 14px;
		}

		.tally {
			align-self: start;
			flex-wrap: wrap;
			padding: 14px 16px;
			gap: 12px 22px;
		}

		.figure em {
			font-size: 1.7rem;
		}

		.candles {
			flex-basis: 100%;
			height: 30px;
			gap: 9px;
		}

		.candles i {
			width: 8px;
			height: 19px;
		}

		.ops {
			flex-direction: column;
			align-self: start;
		}

		.ops button {
			padding: 12px 14px;
			text-align: left;
		}

		.ops :global(.exit) {
			padding-block: 8px;
		}
	}

	@keyframes flicker {
		0%,
		100% {
			scale: 1 1;
			opacity: 1;
		}
		40% {
			scale: 0.9 1.1;
			opacity: 0.85;
		}
		70% {
			scale: 1.06 0.94;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.candles i::before {
			animation: none;
		}
	}

	@media (max-width: 820px) {
		.hud {
			grid-template-columns: minmax(0, 1fr) auto;
			grid-template-areas:
				'lead tally'
				'ops ops';
		}

		.ops {
			justify-content: center;
		}

		.ops button {
			padding: 8px 12px;
		}
	}

	@media (max-width: 520px) {
		.best,
		.call .of {
			display: none;
		}

		.lead {
			gap: 6px;
		}

		.brand {
			padding: 4px;
		}

		.call {
			padding: 5px 10px;
		}

		.tally {
			padding: 5px 10px;
			gap: 10px;
		}

		.ops button {
			padding: 7px 9px;
			font-size: 0.64rem;
		}
	}
</style>
