<script lang="ts">
	import ArcadeExit from '$lib/components/ArcadeExit.svelte';
	import EclIcon from './EclIcon.svelte';
	import { eclView, openEclSettings } from '../settings.svelte';
	import { MOON, SUN } from '../types';
	import type { EclSession } from '../session.svelte';

	let { session }: { session: EclSession } = $props();

	const p1 = $derived(session.mode === 'ai' ? 'You' : 'Moon');
	const p2 = $derived(session.mode === 'ai' ? 'The Orrery' : 'Sun');
	const turn = $derived(session.current === MOON ? p1 : p2);
	const side = $derived(session.current === MOON ? 'Moon' : 'Sun');
	const kicker = $derived(
		session.status.type !== 'playing'
			? 'The sky settles'
			: session.mode === 'ai'
				? session.current === MOON
					? 'Your move · silver'
					: 'The orrery turns · gold'
				: `${side} to move`
	);
	const hint = $derived(
		session.status.type === 'won'
			? session.status.winner === MOON
				? session.mode === 'ai'
					? 'You eclipse the sun'
					: 'The Moon eclipses the Sun'
				: session.mode === 'ai'
					? 'The orrery outshines you'
					: 'The Sun breaks through'
			: session.status.type === 'draw'
				? 'An equinox: even light'
				: session.animating
					? 'The eclipse passes'
					: session.aiThinking
						? 'The orrery is counting'
						: session.pass
							? `${session.pass.player === MOON ? p1 : p2} had no move`
							: session.mode === 'ai'
								? 'Trap a line of gold between two silvers'
								: `${turn} — trap a line of the other light`
	);
	const moonShare = $derived((session.tally[1] / Math.max(1, session.tally[1] + session.tally[2])) * 100);

	function bump(score: number) {
		return (node: HTMLElement) => {
			if (!score) return;
			if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
			node.animate([{ transform: 'scale(1.2)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'ease-out' });
		};
	}
</script>

<header class="hud">
	<div class="brand">
		<EclIcon />
		<div class="name">
			<p>Eclipse</p>
			<small>orrery reversi</small>
		</div>
	</div>
	<div class="call">
		<small>{kicker}</small>
		<b>{hint}</b>
	</div>
	<div class="meter" class:classic={eclView.pieces === 'classic'} aria-label="Moon {session.tally[1]} discs, Sun {session.tally[2]} discs">
		<span class="side moon" class:now={session.current === MOON && session.status.type === 'playing'}>
			<i></i>{session.tally[1]}
		</span>
		<span class="bar" aria-hidden="true">
			<b style:width="{moonShare}%"></b>
		</span>
		<span class="side sun" class:now={session.current === SUN && session.status.type === 'playing'}>
			{session.tally[2]}<i></i>
		</span>
	</div>
	<div class="score">
		<span>{p1} <em {@attach bump(session.scores[1])}>{session.scores[1]}</em></span>
		<i>vs</i>
		<span>{p2} <em {@attach bump(session.scores[2])}>{session.scores[2]}</em></span>
	</div>
	<div class="ops">
		<button type="button" onclick={() => openEclSettings()}>Settings</button>
		<button type="button" onclick={() => session.rematch()} disabled={session.animating}>Rematch</button>
		<button type="button" onclick={() => session.backToMenu()}>Menu</button>
		<ArcadeExit tone="orrery" />
	</div>
</header>

<style>
	.hud {
		width: min(1400px, 100%);
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto auto auto;
		gap: 10px;
		align-items: stretch;
		color: #f1e6cf;
		z-index: 3;
		flex: 0 0 60px;
		height: 60px;
	}

	.brand,
	.call,
	.meter,
	.score,
	.ops button {
		border: 1px solid rgba(232, 184, 90, 0.26);
		background: linear-gradient(180deg, rgba(30, 28, 58, 0.82), rgba(14, 14, 32, 0.86));
		border-radius: 16px;
		box-shadow: inset 0 1px 0 rgba(244, 213, 138, 0.1);
		backdrop-filter: blur(8px);
	}

	.brand {
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: center;
		gap: 10px;
		padding: 6px 14px 6px 8px;
		text-align: left;
	}

	.name p {
		margin: 0;
		font-family: 'Cormorant Garamond', Palatino, serif;
		font-style: italic;
		font-weight: 700;
		font-size: 1.2rem;
		line-height: 1.05;
		color: #f4d58a;
	}

	.name small {
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-size: 0.58rem;
		color: #9fb8e8;
	}

	.call {
		display: grid;
		align-content: center;
		padding: 8px 16px;
		min-width: 0;
	}

	.call small {
		display: block;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		font-size: 0.6rem;
		color: #e8b85a;
		margin-bottom: 2px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.call b {
		font-family: 'Cormorant Garamond', Palatino, serif;
		font-style: italic;
		font-weight: 600;
		font-size: clamp(0.95rem, 2.2vw, 1.3rem);
		line-height: 1.15;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.meter {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 0 14px;
		font-variant-numeric: tabular-nums;
		font-weight: 600;
	}

	.side {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-width: 2.6em;
		opacity: 0.72;
		transition: opacity 200ms ease;
	}

	.side.sun {
		justify-content: flex-end;
	}

	.side.now {
		opacity: 1;
	}

	.side i {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.moon i {
		background: radial-gradient(circle at 35% 30%, #fff, #b8c2d8 55%, #5b6582);
	}

	.sun i {
		background: radial-gradient(circle at 35% 30%, #fff6d2, #f0c060 50%, #8a5a1c);
	}

	.classic .moon i {
		background: radial-gradient(circle at 35% 28%, #6a6e78, #1c1e24 45%, #050507);
		box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.25);
	}

	.classic .sun i {
		background: radial-gradient(circle at 35% 28%, #ffffff, #eceae4 50%, #a9a69e);
	}

	.classic .bar {
		background: linear-gradient(90deg, #bdbab2, #f6f4ee);
	}

	.classic .bar b {
		background: linear-gradient(90deg, #08080a, #3a3d46);
	}

	.moon.now i {
		box-shadow: 0 0 10px rgba(190, 206, 240, 0.85);
	}

	.sun.now i {
		box-shadow: 0 0 10px rgba(240, 192, 96, 0.9);
	}

	.bar {
		position: relative;
		width: clamp(70px, 9vw, 130px);
		height: 6px;
		border-radius: 999px;
		background: linear-gradient(90deg, #c38a2e, #f4cf74);
		overflow: hidden;
		box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.35);
	}

	.bar b {
		position: absolute;
		inset: 0 auto 0 0;
		background: linear-gradient(90deg, #8e9ab8, #e4e9f3);
		box-shadow: 2px 0 6px rgba(0, 0, 0, 0.6);
		transition: width 600ms cubic-bezier(0.3, 0.8, 0.3, 1);
	}

	.score {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 14px;
		font-size: 0.82rem;
	}

	.score em {
		font-style: normal;
		font-family: 'Cormorant Garamond', Palatino, serif;
		font-weight: 700;
		font-size: 1.32rem;
		margin-left: 4px;
		color: #f4d58a;
	}

	.score i {
		font-style: normal;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-size: 0.6rem;
		color: #9fb8e8;
	}

	.ops {
		display: flex;
		justify-content: flex-end;
		align-items: stretch;
		gap: 8px;
	}

	.ops button {
		appearance: none;
		color: inherit;
		cursor: pointer;
		padding: 0 16px;
		font: inherit;
		font-size: 0.72rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		display: grid;
		place-items: center;
		transition:
			border-color 160ms ease,
			color 160ms ease;
	}

	@media (hover: hover) {
		.ops button:hover:not(:disabled) {
			border-color: rgba(232, 184, 90, 0.7);
			color: #f4d58a;
		}
	}

	.ops button:disabled {
		opacity: 0.45;
		cursor: default;
	}

	.ops :global(.exit) {
		align-self: stretch;
		padding-block: 0;
	}

	@media (max-width: 1100px) {
		.score {
			display: none;
		}
	}

	@media (max-width: 860px) {
		.hud {
			grid-template-columns: 1fr auto;
			height: auto;
			flex-basis: auto;
		}

		.call,
		.ops {
			grid-column: 1 / -1;
		}

		.meter {
			justify-content: center;
		}

		.ops {
			justify-content: center;
		}

		.ops button {
			padding: 10px 14px;
		}
	}

	@media (max-width: 520px) {
		.ops {
			flex-wrap: wrap;
			gap: 6px;
		}

		.ops button {
			padding: 9px 11px;
			font-size: 0.64rem;
			letter-spacing: 0.08em;
		}
	}
</style>
