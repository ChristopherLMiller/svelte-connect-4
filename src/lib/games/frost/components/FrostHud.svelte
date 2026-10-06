<script lang="ts">
	import ArcadeExit from '$lib/components/ArcadeExit.svelte';
	import FrostIcon from './FrostIcon.svelte';
	import { frostStats, openFrostSettings, todaysDaily } from '../settings.svelte';
	import { formatClock, LEVEL_INFO } from '../types';
	import type { FrostSession } from '../session.svelte';

	let { session }: { session: FrostSession } = $props();

	const daily = $derived(session.board === 'daily');
	const name = $derived(daily ? 'Dawn survey' : LEVEL_INFO[session.board as keyof typeof LEVEL_INFO].name);
	const best = $derived(daily ? todaysDaily(session.date).ms : frostStats.best[session.board as keyof typeof LEVEL_INFO]);
	const pct = $derived(Math.round(session.progress * 100));

	const call = $derived.by(() => {
		switch (session.status.type) {
			case 'ready':
				return daily ? 'Start from the drilled hole' : 'The first step is always safe';
			case 'paused':
				return 'Snow drifts over the lake';
			case 'lost':
				return 'The ice gave way';
			case 'won':
				return 'Every patch of thin ice found';
			default:
				if (session.flagMode) return 'Flag mode: taps plant flags';
				if (session.left < 0) return 'More flags than thin ice';
				if (session.progress < 0.25) return 'The frost is thick out here';
				if (session.progress < 0.6) return 'Read the cracks';
				if (session.progress < 0.9) return 'The sun is climbing';
				return 'Nearly across';
		}
	});
</script>

<header class="hud">
	<section class="lead">
		<div class="brand card">
			<FrostIcon />
			<div class="name">
				<p>Frostline</p>
				<small>{name}{session.guessFree ? ' · sure footing' : ''}</small>
			</div>
		</div>
		<div class="call card">
			<small>{name} · {session.field.w}×{session.field.h}</small>
			<b>{call}</b>
		</div>
		<div class="gauge card" aria-label="{pct}% of the safe ice opened">
			<small>Sunrise</small>
			<span class="track" aria-hidden="true"><i style:--f={session.progress}></i></span>
			<span class="row">
				<em>{pct}<span>%</span></em>
				<span>{session.opened} of {session.safe} opened</span>
			</span>
		</div>
	</section>
	<section class="tally card">
		<span class="figure flags" class:over={session.left < 0}>
			<small>Thin ice</small>
			<em>
				<svg viewBox="0 0 16 16" aria-hidden="true">
					<path d="M6 2 V14 M3 14 H10" stroke="#5a3d26" stroke-width="1.6" stroke-linecap="round" fill="none" />
					<path d="M6.6 2 L13 4.4 L6.6 6.8 Z" fill="#ff6a3d" />
				</svg>
				{session.left}
			</em>
		</span>
		<span class="figure">
			<small>Time</small>
			<em class="clock">{formatClock(session.time)}</em>
		</span>
		<span class="figure best">
			<small>{daily ? 'Today' : 'Best'}</small>
			<em class="clock">{best ? formatClock(best) : '—'}</em>
		</span>
	</section>
	<nav class="ops" aria-label="Game">
		<button
			type="button"
			class="mode"
			class:on={session.flagMode}
			aria-pressed={session.flagMode}
			onclick={() => session.toggleFlagMode()}
			title="Switch taps between digging and planting flags"
		>
			<svg class="glyph" viewBox="0 0 16 16" aria-hidden="true">
				{#if session.flagMode}
					<path d="M6 2 V14 M3 14 H10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none" />
					<path d="M6.6 2 L13 4.4 L6.6 6.8 Z" fill="currentColor" />
				{:else}
					<path d="M3 13 L11 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
					<path d="M6 3.2 C9 1.8 12.6 2.8 13.8 6.4 C11.8 4.6 9.4 4.2 7.4 4.6 Z" fill="currentColor" />
				{/if}
			</svg>
			{session.flagMode ? 'Flagging' : 'Digging'}
		</button>
		<button type="button" onclick={() => openFrostSettings()}>Settings</button>
		<button type="button" onclick={() => session.restart()}>{daily ? 'Retry' : 'New lake'}</button>
		<button type="button" onclick={() => session.backToMenu()}>Menu</button>
		<ArcadeExit tone="frost" />
		<p class="keys">Click digs · hold, right-click or F flags · click a number to clear around it · arrows + Space / F · P pauses · N new · ? guide</p>
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
		color: #1d2b47;
		z-index: 3;
	}

	.card,
	.ops button {
		border: 1px solid rgba(255, 255, 255, 0.75);
		background: linear-gradient(180deg, rgba(246, 251, 255, 0.84), rgba(220, 235, 247, 0.8));
		border-radius: 14px;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.9),
			0 8px 22px rgba(20, 30, 70, 0.18);
		backdrop-filter: blur(6px);
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
		font-family: 'Josefin Sans', ui-sans-serif, system-ui, sans-serif;
		font-weight: 700;
		font-size: 1.3rem;
		line-height: 1.05;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.name small {
		display: block;
		margin-top: 3px;
		letter-spacing: 0.08em;
		font-size: 0.72rem;
		color: #2f7fb0;
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
		color: #2f7fb0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.call b {
		font-family: 'Josefin Sans', ui-sans-serif, system-ui, sans-serif;
		font-weight: 600;
		font-size: clamp(0.9rem, 2vw, 1.1rem);
		line-height: 1.25;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.gauge small {
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-size: 0.6rem;
		color: #4d5f7a;
	}

	.track {
		position: relative;
		display: block;
		height: 10px;
		margin: 8px 0;
		border-radius: 999px;
		background: rgba(47, 90, 140, 0.14);
		overflow: hidden;
	}

	.track i {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: linear-gradient(90deg, #8a6fb8, #f19a8a 50%, #ffd59a);
		clip-path: inset(0 calc((1 - var(--f)) * 100%) 0 0 round 999px);
		transition: clip-path 500ms ease;
	}

	.gauge .row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 10px;
		font-size: 0.78rem;
		color: #4d5f7a;
	}

	.gauge em {
		font-style: normal;
		font-family: 'Josefin Sans', ui-sans-serif, system-ui, sans-serif;
		font-weight: 700;
		font-size: 1.4rem;
		color: #1d2b47;
	}

	.gauge em span {
		font-size: 0.85rem;
		color: #4d5f7a;
	}

	.tally {
		grid-area: tally;
		display: flex;
		align-items: center;
		gap: 16px;
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
		color: #4d5f7a;
	}

	.figure em {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-style: normal;
		font-family: 'Josefin Sans', ui-sans-serif, system-ui, sans-serif;
		font-weight: 700;
		font-size: 1.25rem;
		color: #1d2b47;
		min-width: 2ch;
		font-variant-numeric: tabular-nums;
	}

	.figure svg {
		width: 0.95em;
		height: 0.95em;
	}

	.flags.over em {
		color: #d4462c;
	}

	.figure .clock {
		min-width: 4.4ch;
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
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		transition:
			border-color 160ms ease,
			background 160ms ease,
			color 160ms ease;
	}

	.ops .mode {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.ops .mode .glyph {
		width: 15px;
		height: 15px;
		flex-shrink: 0;
	}

	.ops .mode.on {
		background: linear-gradient(180deg, #ff9a6e, #e8573a);
		border-color: #ffd2bf;
		color: #fff8f2;
	}

	@media (hover: hover) {
		.ops button:hover {
			border-color: #fff;
			background: rgba(255, 255, 255, 0.95);
		}

		.ops .mode.on:hover {
			background: linear-gradient(180deg, #ffab84, #f0653f);
		}
	}

	.ops :global(.exit) {
		align-self: stretch;
		padding-block: 0;
	}

	.keys {
		margin: 4px 2px 0;
		padding: 8px 10px;
		border-radius: 12px;
		background: rgba(246, 251, 255, 0.6);
		font-size: 0.74rem;
		line-height: 1.5;
		color: #33445f;
	}

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
			font-size: 1.15rem;
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

	@media (max-width: 860px) {
		.hud {
			grid-template-columns: minmax(0, 1fr) auto;
			grid-template-areas:
				'lead tally'
				'ops ops';
		}

		.ops {
			justify-content: center;
			flex-wrap: wrap;
		}

		.ops button {
			padding: 9px 12px;
		}
	}

	@media (max-width: 520px) {
		.best {
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
			gap: 12px;
		}

		.ops {
			flex-wrap: nowrap;
			gap: 5px;
		}

		.ops button {
			padding: 8px 8px;
			font-size: 0.62rem;
			letter-spacing: 0.06em;
		}

		.ops :global(.exit) {
			display: none;
		}
	}
</style>
