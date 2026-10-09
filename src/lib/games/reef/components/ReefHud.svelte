<script lang="ts">
	import ArcadeExit from '$lib/components/ArcadeExit.svelte';
	import ReefIcon from './ReefIcon.svelte';
	import { formatTime, openReefSettings, reefBest } from '../settings.svelte';
	import { depthFraction, LINES_PER_LEVEL, SPRINT_LINES, zoneOf } from '../types';
	import type { ReefSession } from '../session.svelte';

	let { session }: { session: ReefSession } = $props();

	const sprint = $derived(session.mode === 'sprint');
	const zone = $derived(zoneOf(session.depth));
	const fill = $derived(sprint ? session.lines / SPRINT_LINES : depthFraction(session.level));
	const paused = $derived(session.status.type === 'paused');
	const pausable = $derived(['paused', 'playing', 'ready'].includes(session.status.type));
	const toNext = $derived(LINES_PER_LEVEL - (session.lines % LINES_PER_LEVEL));

	const call = $derived.by(() => {
		switch (session.status.type) {
			case 'ready':
				return 'Descending…';
			case 'paused':
				return 'Holding depth';
			case 'over':
				return 'The reef has closed over';
			case 'done':
				return 'Forty lines of light';
			default:
				if (session.combo >= 2) return `A chain of ${session.combo + 1}`;
				if (session.b2b) return 'Back-to-back primed';
				return sprint ? `${session.left} lines to the surface` : `${toNext} more ${toNext === 1 ? 'line' : 'lines'} to go deeper`;
		}
	});

	function bump(score: number) {
		return (node: HTMLElement) => {
			if (!score) return;
			if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
			node.animate([{ transform: 'scale(1.14)' }, { transform: 'scale(1)' }], { duration: 180, easing: 'ease-out' });
		};
	}
</script>

<header class="hud">
	<section class="lead">
		<div class="brand card">
			<ReefIcon />
			<div class="name">
				<p>Lumen Reef</p>
				<small>{sprint ? 'Sprint · 40 lines' : 'Marathon'}</small>
			</div>
		</div>
		<div class="call card">
			<small>{session.depth.toLocaleString()} m · {zone}</small>
			<b>{call}</b>
		</div>
		<div class="gauge card" aria-label={sprint ? `${session.lines} of ${SPRINT_LINES} lines` : `Depth ${session.depth} metres`}>
			<small>{sprint ? 'Lines' : 'Depth'}</small>
			<span class="track" aria-hidden="true">
				<i style:--f={fill}></i>
				{#each [0.25, 0.5, 0.75] as tick (tick)}
					<b style:--t={tick}></b>
				{/each}
			</span>
			<span class="row">
				{#if sprint}
					<em>{session.lines}<span>/{SPRINT_LINES}</span></em>
				{:else}
					<em>{session.depth.toLocaleString()}<span> m</span></em>
				{/if}
				<span>{sprint ? `${session.left} to go` : zone}</span>
			</span>
		</div>
	</section>
	<section class="tally card" class:hot={session.high}>
		{#if sprint}
			<span class="figure">
				<small>Time</small>
				<em class="clock">{formatTime(session.time)}</em>
			</span>
			<span class="figure best">
				<small>Best</small>
				<em>{reefBest.sprint ? formatTime(reefBest.sprint / 1000) : '—'}</em>
			</span>
		{:else}
			<span class="figure">
				<small>Score</small>
				<em {@attach bump(session.score)}>{session.score.toLocaleString()}</em>
			</span>
			<span class="figure best">
				<small>Best</small>
				<em>{session.best.toLocaleString()}</em>
			</span>
			<span class="figure">
				<small>Level</small>
				<em>{session.level}</em>
			</span>
		{/if}
		<span class="figure lines">
			<small>Lines</small>
			<em>{session.lines}</em>
		</span>
	</section>
	<nav class="ops" aria-label="Game">
		<button
			type="button"
			class:on={paused}
			disabled={!pausable}
			aria-pressed={paused}
			onclick={(event) => {
				session.togglePause();
				event.currentTarget.blur();
			}}>{paused ? 'Resume' : 'Pause'}</button
		>
		<button type="button" onclick={() => openReefSettings()}>Settings</button>
		<button type="button" onclick={() => session.restart()}>Restart</button>
		<button type="button" onclick={() => session.backToMenu()}>Menu</button>
		<ArcadeExit tone="reef" />
		<p class="keys">← → move · ↑ or X turns, Z back · ↓ soft · Space drops · C holds · Esc pauses · ? guide</p>
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
		color: #d8f4ff;
		z-index: 3;
	}

	.card,
	.ops button {
		border: 1px solid rgba(63, 233, 255, 0.18);
		background: rgba(3, 12, 24, 0.82);
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
	.gauge,
	.keys {
		display: none;
	}

	.name p {
		margin: 0;
		font-family: Syne, ui-sans-serif, system-ui, sans-serif;
		font-weight: 800;
		font-size: 1.2rem;
		line-height: 1.05;
		letter-spacing: 0.02em;
	}

	.name small {
		display: block;
		margin-top: 3px;
		letter-spacing: 0.1em;
		font-size: 0.7rem;
		color: #3fe9ff;
	}

	.call {
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
		color: #3fe9ff;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.call b {
		font-family: Syne, ui-sans-serif, system-ui, sans-serif;
		font-weight: 600;
		font-size: clamp(0.85rem, 2vw, 1.05rem);
		line-height: 1.2;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.gauge small {
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-size: 0.6rem;
		color: #8fb4c8;
	}

	.track {
		position: relative;
		display: block;
		height: 10px;
		margin: 8px 0;
		border-radius: 999px;
		background: linear-gradient(90deg, rgba(40, 120, 170, 0.25), rgba(10, 20, 50, 0.4));
		overflow: hidden;
	}

	.track i {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: linear-gradient(90deg, #3fe9ff, #5f7dff 55%, #ff4fd8);
		clip-path: inset(0 calc((1 - var(--f)) * 100%) 0 0 round 999px);
		box-shadow: 0 0 12px rgba(63, 233, 255, 0.6);
		transition: clip-path 600ms ease;
	}

	.track b {
		position: absolute;
		top: 0;
		bottom: 0;
		left: calc(var(--t) * 100%);
		width: 1px;
		background: rgba(216, 244, 255, 0.25);
	}

	.gauge .row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 10px;
		font-size: 0.78rem;
		color: #8fb4c8;
	}

	.gauge em {
		font-style: normal;
		font-family: Syne, ui-sans-serif, system-ui, sans-serif;
		font-weight: 700;
		font-size: 1.3rem;
		color: #e8fcff;
	}

	.gauge em span {
		font-size: 0.8rem;
		color: #8fb4c8;
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
		color: #8fb4c8;
	}

	.figure em {
		display: inline-block;
		font-style: normal;
		font-family: Syne, ui-sans-serif, system-ui, sans-serif;
		font-weight: 700;
		font-size: 1.2rem;
		color: #bff6ff;
		min-width: 2ch;
		font-variant-numeric: tabular-nums;
	}

	.figure .clock {
		min-width: 6ch;
	}

	.tally.hot .figure:first-child em {
		color: #fff;
		text-shadow: 0 0 12px rgba(63, 233, 255, 0.8);
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

	.ops button.on {
		border-color: rgba(63, 233, 255, 0.7);
		color: #bff6ff;
	}

	.ops button:disabled {
		opacity: 0.45;
		cursor: default;
	}

	@media (hover: hover) {
		.ops button:hover:not(:disabled) {
			border-color: rgba(63, 233, 255, 0.55);
			background: rgba(8, 30, 50, 0.92);
			color: #bff6ff;
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
		color: #6f93a6;
	}

	/* Wide screens: the HUD splits into rails either side of the well. */
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
		.gauge,
		.keys {
			display: block;
		}

		.call {
			padding: 14px 16px;
		}

		.call b {
			white-space: normal;
			font-size: 1.05rem;
		}

		.gauge {
			padding: 12px 16px 14px;
		}

		.tally {
			align-self: start;
			flex-wrap: wrap;
			padding: 14px 16px;
			gap: 12px 22px;
		}

		.figure em {
			font-size: 1.6rem;
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
		.lines {
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
