<script lang="ts">
	import ZenBoard from './components/ZenBoard.svelte';
	import ZenGrounds from './components/ZenGrounds.svelte';
	import ZenGuide from './components/ZenGuide.svelte';
	import ZenHud from './components/ZenHud.svelte';
	import ZenMenu from './components/ZenMenu.svelte';
	import ZenResult from './components/ZenResult.svelte';
	import ZenSettings from './components/ZenSettings.svelte';
	import { boardKeys } from '../kit/keys';
	import { playClack } from './audio';
	import { zenPanels, zenView } from './settings.svelte';
	import { ZenSession } from './session.svelte';

	const session = new ZenSession();
	let quiet = $state(false);

	const onKey = boardKeys({
		panels: zenPanels,
		screen: () => session.screen,
		startFromMenu: () => {
			if (!session.resume()) session.start(session.mode, session.difficulty, zenView.garden);
		},
		backToMenu: () => session.backToMenu(),
		canRematch: () => session.ended,
		rematch: () => session.rematch(),
		busy: () => session.busy || session.aiTurn,
		nudge: (dr, dc) => session.moveCursor(dr, dc),
		play: () => session.placeCursor(),
		extra: (event) => {
			if (event.key.toLowerCase() === 'u') session.undo();
		}
	});

	const mood = $derived(
		session.screen === 'menu' ? 'menu' : session.status.type === 'won' ? 'won' : session.status.type === 'draw' ? 'draw' : 'play'
	);
</script>

<svelte:window onkeydown={onKey} />
<svelte:document onvisibilitychange={() => (quiet = document.hidden)} />

<div class="look" class:quiet>
	<ZenGrounds
		{mood}
		season={zenView.season}
		turn={session.screen === 'play' && !session.ended ? session.current : 0}
		light={session.screen === 'play' ? 0.15 + 0.85 * session.progress : 0.25}
		placed={session.placed}
		gust={session.gust}
		onclack={() => {
			if (!quiet) playClack();
		}}
	/>

	{#if session.screen === 'menu'}
		<div class="stage menu">
			<ZenMenu {session} />
		</div>
	{:else}
		<div class="stage play">
			<ZenHud {session} />
			<div class="arena">
				<ZenBoard {session} />
			</div>
		</div>
	{/if}

	<ZenResult {session} />
	<ZenSettings />
	<ZenGuide />
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

	.arena {
		flex: 1 1 auto;
		min-height: 0;
		min-width: 0;
		width: 100%;
		display: grid;
		grid-template: minmax(0, 1fr) / minmax(0, 1fr);
		padding: 4px;
		box-sizing: border-box;
	}
</style>
