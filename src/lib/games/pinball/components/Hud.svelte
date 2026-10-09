<script lang="ts">
	import ArcadeExit from '$lib/components/ArcadeExit.svelte';
	import Reels from './Reels.svelte';
	import { openPinballSettings } from '../settings.svelte';
	import { DIFFICULTIES } from '../types';
	import type { PinballSession } from '../session.svelte';

	let { session }: { session: PinballSession } = $props();

	const paused = $derived(session.status.type === 'paused');
	const pausable = $derived(['paused', 'playing', 'ready'].includes(session.status.type));
	const level = $derived(DIFFICULTIES.find((d) => d.id === session.difficulty)?.name ?? '');
	const meta = $derived(session.spec.meta);

	const call = $derived.by(() => {
		const type = session.status.type;
		if (type === 'ready') return `Ball ${session.ball}`;
		if (type === 'paused') return meta.words.paused;
		if (type === 'over') return meta.words.over;
		if (session.phase === 'serve') return 'Draw the plunger and let fly';
		if (session.phase === 'tally') return `Counting the ${session.spec.rules.bonusName}`;
		return session.line;
	});

	function bump(score: number) {
		return (node: HTMLElement) => {
			if (!score) return;
			if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
			node.animate([{ transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 160, easing: 'ease-out' });
		};
	}
</script>

<header class="hud">
	<section class="lead card">
		<div class="name">
			<p>{meta.name}</p>
			<small>{level} · {session.saving ? 'ball save on' : session.warnings ? `${session.warnings} tilt warning${session.warnings === 1 ? '' : 's'}` : meta.kicker}</small>
		</div>
		<b class="call">{call}</b>
	</section>

	<section class="tally card" class:high={session.high} class:hot={session.hot}>
		<span class="figure score">
			<small>Score</small>
			{#if meta.reels}
				<em class="reeled"><Reels value={session.score} /></em>
			{:else}
				<em {@attach bump(session.score)}>{session.score.toLocaleString()}</em>
			{/if}
		</span>
		<span class="figure best">
			<small>Best</small>
			<em>{session.best.toLocaleString()}</em>
		</span>
		<span class="figure" aria-label="Ball {session.ball} of {session.balls}{session.extra ? `, plus ${session.extra} extra` : ''}">
			<small>Ball</small>
			<span class="balls" aria-hidden="true">
				{#each Array.from({ length: session.balls }, (_, i) => i + 1) as n (n)}
					<i class:on={n === session.ball} class:spent={n < session.ball}></i>
				{/each}
				{#if session.extra}<b>+{session.extra}</b>{/if}
			</span>
		</span>
		<span class="figure">
			<small>Bonus</small>
			<em class="mult">×{session.mult}</em>
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
		<button type="button" onclick={() => openPinballSettings()}>Settings</button>
		<button type="button" class="wide" onclick={() => session.restart()}>Restart</button>
		<button type="button" onclick={() => session.backToMenu()}>Tables</button>
		<span class="exit"><ArcadeExit tone="silverball" /></span>
	</nav>

	<section class="goals" aria-label="Progress">
		{#if session.mode}
			<span class="mode" style:--left={session.mode.left / session.mode.seconds}>
				<b>{session.mode.name}</b>
				<em>{session.mode.hits}/{session.mode.need} · {Math.ceil(session.mode.left)}s</em>
				<i aria-hidden="true"></i>
			</span>
		{/if}
		{#each session.goals as goal (goal.label)}
			<span class="goal" class:lit={goal.hot}>
				<small>{goal.label}</small>
				<b>{goal.value}</b>
			</span>
		{/each}
		<p class="line">{call}</p>
	</section>
</header>

<style>
	.hud {
		grid-area: hud;
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto auto;
		gap: 8px;
		width: min(1180px, 100%);
		justify-self: center;
		color: var(--sb-ink);
		z-index: 3;
	}

	.card,
	.ops button,
	.goal,
	.mode {
		border: 1px solid color-mix(in srgb, var(--sb-accent) 24%, transparent);
		background: var(--sb-panel);
		backdrop-filter: blur(8px);
		border-radius: 12px;
	}

	.lead {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 6px 12px;
		min-width: 0;
	}

	.name {
		flex: 0 0 auto;
	}

	.name p {
		margin: 0;
		font-family: var(--sb-display);
		letter-spacing: 0.04em;
		font-size: 1.3rem;
		line-height: 1;
		color: var(--sb-accent);
	}

	.name small {
		display: block;
		margin-top: 3px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-size: 0.68rem;
		font-weight: 700;
		color: var(--sb-muted);
	}

	.call {
		min-width: 0;
		margin-left: 6px;
		font-weight: 600;
		font-size: 1rem;
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

	.tally.high {
		border-color: var(--sb-accent);
		box-shadow: 0 0 18px color-mix(in srgb, var(--sb-accent) 30%, transparent);
	}

	.tally.hot {
		border-color: var(--sb-hot);
		box-shadow: 0 0 22px color-mix(in srgb, var(--sb-hot) 35%, transparent);
	}

	.figure {
		display: grid;
		gap: 1px;
		min-width: 0;
	}

	.figure small,
	.goal small {
		letter-spacing: 0.14em;
		text-transform: uppercase;
		font-size: 0.62rem;
		font-weight: 700;
		color: var(--sb-muted);
	}

	.figure em {
		font-style: normal;
		font-weight: 700;
		font-size: 1.35rem;
		line-height: 1.1;
		font-variant-numeric: tabular-nums;
		display: inline-block;
		transform-origin: left center;
	}

	.score em {
		min-width: 6ch;
	}

	.score em.reeled {
		font-size: 1.1rem;
	}

	.best em {
		color: var(--sb-accent);
	}

	.mult {
		color: var(--sb-hot);
	}

	.balls {
		display: flex;
		align-items: center;
		gap: 4px;
		height: 1.45rem;
	}

	.balls i {
		width: 11px;
		height: 11px;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 30%, #fff, #8c90a4 60%, #3a3d4c);
	}

	.balls i.spent {
		opacity: 0.2;
	}

	.balls i.on {
		box-shadow: 0 0 0 2px var(--sb-accent);
	}

	.balls b {
		font-size: 0.85rem;
		color: var(--sb-accent);
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
		font-size: 0.95rem;
		letter-spacing: 0.04em;
		padding: 0 14px;
		cursor: pointer;
	}

	.ops button.on {
		border-color: var(--sb-accent);
		color: var(--sb-accent);
	}

	.ops button:disabled {
		opacity: 0.45;
		cursor: default;
	}

	.exit {
		display: flex;
	}

	.goals {
		grid-column: 1 / -1;
		display: flex;
		flex-wrap: wrap;
		align-items: stretch;
		justify-content: center;
		gap: 6px;
		min-height: 0;
	}

	.goal {
		display: flex;
		align-items: baseline;
		gap: 6px;
		padding: 3px 10px;
	}

	.goal b {
		font-size: 0.95rem;
		font-variant-numeric: tabular-nums;
	}

	.goal.lit {
		border-color: var(--sb-hot);
		box-shadow: 0 0 12px color-mix(in srgb, var(--sb-hot) 35%, transparent);
	}

	.goal.lit b {
		color: var(--sb-hot);
	}

	.mode {
		position: relative;
		overflow: hidden;
		display: flex;
		align-items: baseline;
		gap: 8px;
		padding: 3px 12px 5px;
		border-color: var(--sb-accent);
	}

	.mode b {
		color: var(--sb-accent);
		font-size: 0.95rem;
	}

	.mode em {
		font-style: normal;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.mode i {
		position: absolute;
		left: 0;
		bottom: 0;
		height: 3px;
		width: calc(var(--left) * 100%);
		background: var(--sb-accent);
		transition: width 1s linear;
	}

	.line {
		display: none;
		margin: 0;
		flex-basis: 100%;
		text-align: center;
		font-weight: 600;
		font-size: 0.9rem;
		color: var(--sb-ink);
		text-shadow: 0 1px 6px rgba(0, 0, 0, 0.8);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
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
			padding: 7px 10px;
		}

		.exit {
			display: none;
		}
	}

	@media (max-width: 640px) {
		.hud {
			grid-template-columns: minmax(0, 1fr);
			gap: 6px;
		}

		.lead {
			display: none;
		}

		.line {
			display: block;
		}

		.tally {
			justify-content: space-between;
			gap: 10px;
			padding: 4px 12px;
		}

		.figure em {
			font-size: 1.15rem;
		}

		.ops button {
			padding: 6px 8px;
			font-size: 0.88rem;
		}

		.ops button.wide {
			display: none;
		}

		.goal,
		.mode {
			padding: 2px 8px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.mode i {
			transition: none;
		}
	}
</style>
