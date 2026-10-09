<script lang="ts">
	import ArcadeExit from '$lib/components/ArcadeExit.svelte';
	import KoiIcon from './KoiIcon.svelte';
	import { openKoiSettings } from '../settings.svelte';
	import type { KoiSession } from '../session.svelte';

	let { session }: { session: KoiSession } = $props();

	const ripples = $derived(session.mode === 'ripples');
	const paused = $derived(session.status.type === 'paused');
	const pausable = $derived(['paused', 'playing', 'ready'].includes(session.status.type));
	const fill = $derived(Math.min(1, session.stageScore / Math.max(1, session.target)));

	const call = $derived.by(() => {
		switch (session.status.type) {
			case 'ready':
				return `Stage ${session.stage}`;
			case 'paused':
				return 'The pond is still';
			case 'over':
				return ripples ? 'The blooms reached the lily pad' : 'Out of moves';
			case 'cleared':
				return 'Stage clear';
			default:
				if (ripples) return session.misses === 1 ? 'The far bank is about to creep in' : `${session.misses} misses before the bank creeps in`;
				return `${Math.max(0, session.target - session.stageScore).toLocaleString()} to clear the stage`;
		}
	});

	function bump(score: number) {
		return (node: HTMLElement) => {
			if (!score) return;
			if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
			node.animate([{ transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 180, easing: 'ease-out' });
		};
	}
</script>

<header class="hud">
	<section class="lead card">
		<KoiIcon />
		<div class="name">
			<p>Koi Pond</p>
			<small>{ripples ? 'Ripples' : 'Currents'} · stage {session.stage}</small>
		</div>
		<b class="call">{call}</b>
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
		{#if ripples}
			<span class="figure" aria-label="{session.misses} misses left before the bank creeps in">
				<small>Misses</small>
				<span class="pips" aria-hidden="true">
					{#each Array.from({ length: session.allowance }, (_, i) => i) as i (i)}
						<i class:on={i < session.misses}></i>
					{/each}
				</span>
			</span>
		{:else}
			<span class="figure">
				<small>Moves</small>
				<em class:low={session.moves <= 5}>{session.moves}</em>
			</span>
			<span class="figure goal" aria-label="{session.stageScore} of {session.target} for this stage">
				<small>Stage</small>
				<span class="track" aria-hidden="true"><i style:--f={fill}></i></span>
			</span>
		{/if}
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
		<button type="button" onclick={() => openKoiSettings()}>Settings</button>
		<button type="button" class="wide" onclick={() => session.restart()}>Restart</button>
		<button type="button" onclick={() => session.backToMenu()}>Menu</button>
		<span class="exit"><ArcadeExit tone="pond" /></span>
	</nav>
</header>

<style>
	.hud {
		grid-area: hud;
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto auto;
		gap: 8px;
		width: min(1180px, 100%);
		justify-self: center;
		color: #f6f1e4;
		z-index: 3;
	}

	.card,
	.ops button {
		border: 1px solid rgba(255, 179, 71, 0.22);
		background: rgba(8, 40, 36, 0.8);
		backdrop-filter: blur(8px);
		border-radius: 14px;
	}

	.lead {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 6px 12px 6px 6px;
		min-width: 0;
	}

	.name {
		flex: 0 0 auto;
	}

	.name p {
		margin: 0;
		font-family: 'Kaisei Decol', Georgia, serif;
		font-weight: 700;
		font-size: 1.15rem;
		line-height: 1.05;
	}

	.name small {
		display: block;
		margin-top: 3px;
		letter-spacing: 0.1em;
		font-size: 0.7rem;
		font-weight: 700;
		color: #ffb347;
	}

	.call {
		min-width: 0;
		margin-left: 6px;
		font-weight: 600;
		font-size: 0.92rem;
		color: #dcefe6;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.tally {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 6px 14px;
	}

	.tally.hot {
		border-color: #ffb347;
		box-shadow: 0 0 18px rgba(255, 179, 71, 0.3);
	}

	.figure {
		display: grid;
		gap: 2px;
		min-width: 0;
	}

	.figure small {
		letter-spacing: 0.14em;
		text-transform: uppercase;
		font-size: 0.6rem;
		font-weight: 700;
		color: #b6d2c5;
	}

	.figure em {
		font-style: normal;
		font-family: 'Kaisei Decol', Georgia, serif;
		font-weight: 700;
		font-size: 1.2rem;
		font-variant-numeric: tabular-nums;
		display: inline-block;
		transform-origin: left center;
	}

	.figure em.low {
		color: #ff9a7a;
	}

	.best em {
		color: #ffd27a;
	}

	.pips {
		display: flex;
		gap: 4px;
		height: 1.2rem;
		align-items: center;
	}

	.pips i {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		border: 1.5px solid rgba(246, 241, 228, 0.5);
	}

	.pips i.on {
		background: #ff8fb5;
		border-color: #ffd3e2;
	}

	.track {
		display: block;
		width: 92px;
		height: 8px;
		margin: 6px 0;
		border-radius: 999px;
		background: rgba(246, 241, 228, 0.16);
		overflow: hidden;
	}

	.track i {
		display: block;
		height: 100%;
		width: calc(var(--f) * 100%);
		border-radius: inherit;
		background: linear-gradient(90deg, #7cc9ff, #4fc46a, #ffc93c);
		transition: width 300ms ease;
	}

	.ops {
		display: flex;
		align-items: stretch;
		gap: 6px;
	}

	.ops button {
		appearance: none;
		color: inherit;
		font: inherit;
		font-weight: 700;
		font-size: 0.84rem;
		padding: 0 14px;
		cursor: pointer;
	}

	.ops button.on {
		border-color: #ffb347;
		color: #ffd27a;
	}

	.ops button:disabled {
		opacity: 0.45;
		cursor: default;
	}

	.exit {
		display: flex;
	}

	@media (max-width: 1080px) {
		.hud {
			grid-template-columns: minmax(0, 1fr) auto;
		}

		.ops {
			grid-column: 1 / -1;
		}

		.ops button {
			flex: 1;
			padding: 8px 10px;
		}

		.exit {
			display: none;
		}
	}

	@media (max-width: 640px) {
		.hud {
			grid-template-columns: minmax(0, 1fr);
		}

		.name,
		.call {
			display: none;
		}

		.lead {
			display: none;
		}

		.tally {
			justify-content: space-between;
		}

		.ops button.wide {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.track i {
			transition: none;
		}
	}
</style>
