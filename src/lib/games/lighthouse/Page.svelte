<script lang="ts">
	import Headland from './components/Headland.svelte';
	import LightBoard from './components/LightBoard.svelte';
	import LightCurtain from './components/LightCurtain.svelte';
	import LightDock from './components/LightDock.svelte';
	import LightGuide from './components/LightGuide.svelte';
	import LightHud from './components/LightHud.svelte';
	import LightMenu from './components/LightMenu.svelte';
	import LightResult from './components/LightResult.svelte';
	import LightSettings from './components/LightSettings.svelte';
	import { boardKeys } from '../kit/keys';
	import { playThunder } from './audio';
	import { lightPanels, lightView } from './settings.svelte';
	import { LightSession } from './session.svelte';
	import { GLOW, NORTH, nameOf, opponent } from './types';

	const session = new LightSession();
	let quiet = $state(false);

	const onKey = boardKeys({
		panels: lightPanels,
		screen: () => (session.screen === 'menu' ? 'menu' : 'play'),
		startFromMenu: () => {
			if (!session.resume()) session.start(session.mode, session.difficulty, lightView.sea);
		},
		backToMenu: () => session.backToMenu(),
		canRematch: () => session.screen === 'play' && session.ended,
		rematch: () => session.rematch(),
		busy: () => !session.curtain && session.screen === 'play' && (session.busy || session.aiTurn),
		nudge: (dr, dc) => session.moveCursor(dr, dc),
		play: () => {
			if (session.curtain) session.liftCurtain();
			else if (session.screen === 'setup' && session.ready) session.confirmSetup();
			else session.fireCursor();
		},
		extra: (event) => {
			if (event.key.toLowerCase() === 'r' && !session.curtain) session.turn();
		}
	});

	const mood = $derived.by(() => {
		if (session.screen === 'menu') return 'menu';
		if (session.screen === 'setup') return 'setup';
		if (session.status.type === 'won') return session.mode === 'local' || session.status.winner === NORTH ? 'won' : 'lost';
		return 'play';
	});

	const me = $derived(session.viewer);
	const them = $derived(opponent(me));
	const ai = $derived(session.mode === 'ai');
	const myTurn = $derived(!session.ended && session.current === me && !session.curtain);
	const underFire = $derived(!session.ended && session.current === them && !session.curtain);
</script>

<svelte:window onkeydown={onKey} />
<svelte:document onvisibilitychange={() => (quiet = document.hidden)} />

<div class="look" class:quiet>
	<Headland
		{mood}
		weather={lightView.weather}
		turn={session.screen === 'play' && !session.ended && !session.curtain ? session.current : 0}
		tension={session.screen === 'play' ? session.tension : 0}
		flash={session.flash}
		wreck={session.wreck}
		onthunder={(strength) => {
			if (!quiet) playThunder(strength);
		}}
	/>

	{#if session.screen === 'menu'}
		<div class="stage menu">
			<LightMenu {session} />
		</div>
	{:else}
		<div class="stage play">
			<LightHud {session} />
			<div class="harbor">
				{#if session.screen === 'setup'}
					<div class="arena setup" class:hidden={!!session.curtain}>
						<section class="chart" style:--glow={GLOW[session.setupFor]}>
							<p class="tag">
								<span>{ai ? 'Your waters' : `${nameOf(session.setupFor, session.mode)}'s waters`}</span>
								<em>{session.vertical ? 'Laying down' : 'Laying across'}</em>
							</p>
							<div class="well">
								<LightBoard {session} role="setup" label="Your chart: lay out your fleet" />
							</div>
						</section>
						<LightDock {session} />
					</div>
				{:else}
					<div class="arena battle" class:hidden={!!session.curtain}>
						<section class="chart target" class:live={myTurn} style:--glow={GLOW[me]}>
							<p class="tag">
								<span>{ai ? "The Wrecker's waters" : `${nameOf(them, session.mode)}'s waters`}</span>
								<em>{session.afloatOf[them]} afloat</em>
							</p>
							<div class="well">
								<LightBoard {session} role="target" label="Rival waters: tap a square to fire" />
							</div>
						</section>
						<section class="chart fleet" class:live={underFire} style:--glow={GLOW[them]}>
							<p class="tag">
								<span>{ai ? 'Your fleet' : `${nameOf(me, session.mode)}'s fleet`}</span>
								<em>{session.afloatOf[me]} afloat</em>
							</p>
							<div class="well">
								<LightBoard {session} role="fleet" label="Your fleet" />
							</div>
						</section>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<LightCurtain {session} />
	<LightResult {session} />
	<LightSettings />
	<LightGuide />
</div>

<style>
	.look {
		position: relative;
		isolation: isolate;
		min-height: 100dvh;
		height: 100dvh;
		overflow: hidden;
	}

	.look.quiet,
	.look.quiet :global(*) {
		animation-play-state: paused !important;
	}

	.stage {
		position: relative;
		z-index: 2;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: max(10px, env(safe-area-inset-top)) max(10px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(10px, env(safe-area-inset-left));
		box-sizing: border-box;
	}

	.stage.menu {
		justify-content: safe center;
		padding: max(22px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) max(6vh, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left));
		overflow: auto;
	}

	.stage.play {
		justify-content: stretch;
		gap: 10px;
		min-height: 0;
	}

	.harbor {
		flex: 1 1 auto;
		min-height: 0;
		min-width: 0;
		width: min(1400px, 100%);
		container-type: size;
	}

	.arena {
		height: 100%;
		display: grid;
		gap: 14px;
		box-sizing: border-box;
		transition: opacity 200ms ease;
	}

	.arena.hidden {
		visibility: hidden;
		opacity: 0;
	}

	.arena.battle {
		grid-template: minmax(0, 1fr) / minmax(0, 1.55fr) minmax(0, 1fr);
		align-items: stretch;
	}

	.arena.setup {
		grid-template: minmax(0, 1fr) / minmax(0, 1fr) minmax(270px, 340px);
		align-items: stretch;
	}

	.arena.setup :global(.dock) {
		align-self: center;
		max-height: 100%;
		overflow: auto;
	}

	.chart {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		min-height: 0;
		min-width: 0;
		gap: 4px;
		container-type: size;
	}

	.tag {
		margin: 0;
		height: 28px;
		box-sizing: border-box;
		display: inline-flex;
		align-items: center;
		gap: 10px;
		padding: 0 14px;
		border-radius: 999px;
		background: rgba(6, 12, 18, 0.66);
		border: 1px solid rgba(232, 176, 90, 0.2);
		color: #f2e8d5;
		white-space: nowrap;
		transition:
			border-color 300ms ease,
			box-shadow 300ms ease;
	}

	.tag span {
		font-family: 'IM Fell English', Georgia, serif;
		font-size: 1.05rem;
	}

	.tag em {
		font-style: normal;
		font-size: 0.66rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #e8b05a;
	}

	.live .tag {
		border-color: var(--glow);
		box-shadow: 0 0 18px color-mix(in srgb, var(--glow) 40%, transparent);
	}

	.well {
		flex: none;
		width: min(100cqw, calc(100cqh - 32px));
		aspect-ratio: 1;
		position: relative;
	}

	@container (orientation: portrait) {
		.arena.battle {
			grid-template: minmax(0, 1.6fr) minmax(0, 1fr) / minmax(0, 1fr);
			gap: 6px;
		}

		.arena.setup {
			grid-template: minmax(0, 1fr) auto / minmax(0, 1fr);
			gap: 8px;
		}

		.arena.setup :global(.dock) {
			align-self: stretch;
		}
	}

	@media (max-width: 640px) {
		.tag {
			height: 24px;
			padding: 2px 10px;
		}

		.well {
			width: min(100cqw, calc(100cqh - 28px));
		}

		.tag span {
			font-size: 0.92rem;
		}
	}
</style>
