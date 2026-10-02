<script lang="ts">
	import EclBoard from './components/EclBoard.svelte';
	import EclHud from './components/EclHud.svelte';
	import EclMenu from './components/EclMenu.svelte';
	import EclResult from './components/EclResult.svelte';
	import EclGuide from './components/EclGuide.svelte';
	import EclSettings from './components/EclSettings.svelte';
	import EclOrrery from './components/EclOrrery.svelte';
	import { boardKeys } from '../kit/keys';
	import { eclPanels } from './settings.svelte';
	import { EclSession } from './session.svelte';

	const session = new EclSession();
	let quiet = $state(false);

	const onKey = boardKeys({
		panels: eclPanels,
		screen: () => session.screen,
		startFromMenu: () => {
			if (!session.resume()) session.start(session.mode, session.difficulty);
		},
		backToMenu: () => session.backToMenu(),
		canRematch: () => session.status.type !== 'playing' && !session.animating,
		rematch: () => session.rematch(),
		busy: () => session.busy,
		nudge: (dr, dc) => session.nudge(dr, dc),
		play: () => void session.playCursor()
	});
</script>

<svelte:window onkeydown={onKey} />
<svelte:document onvisibilitychange={() => (quiet = document.hidden)} />

<div class="look" class:quiet>
	<EclOrrery
		mood={session.screen === 'menu' ? 'menu' : session.status.type === 'won' ? 'won' : 'play'}
		balance={session.screen === 'play' ? session.balance : 0}
		winner={session.status.type === 'won' ? session.status.winner : 0}
	/>

	{#if session.screen === 'menu'}
		<div class="stage menu">
			<EclMenu {session} />
		</div>
	{:else}
		<div class="stage play">
			<EclHud {session} />
			<div class="arena">
				<EclBoard {session} />
			</div>
		</div>
	{/if}

	<EclResult {session} />
	<EclSettings />
	<EclGuide />
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
		padding: 10px 10px 12px;
		box-sizing: border-box;
	}

	.stage.menu {
		justify-content: center;
		padding: 22px 20px 8vh;
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
		place-items: center;
		container-type: size;
	}
</style>
