<script lang="ts">
	import AshBoard from './components/AshBoard.svelte';
	import AshHud from './components/AshHud.svelte';
	import AshMenu from './components/AshMenu.svelte';
	import AshResult from './components/AshResult.svelte';
	import AshGuide from './components/AshGuide.svelte';
	import AshSettings from './components/AshSettings.svelte';
	import AshYard from './components/AshYard.svelte';
	import { boardKeys } from '../kit/keys';
	import { ashPanels } from './settings.svelte';
	import { AshSession } from './session.svelte';

	const session = new AshSession();
	let quiet = $state(false);

	const onKey = boardKeys({
		panels: ashPanels,
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

<div
	class="look"
	class:quiet
>
	<AshYard
		mood={session.screen === 'menu' ? 'menu' : session.status.type === 'won' ? 'won' : 'play'}
		heat={session.heat}
		kindle={session.kindle}
	/>

	{#if session.screen === 'menu'}
		<div class="stage menu">
			<AshMenu {session} />
		</div>
	{:else}
		<div class="stage play">
			<AshHud {session} />
			<div class="arena">
				<AshBoard {session} />
			</div>
		</div>
	{/if}

	<AshResult {session} />
	<AshSettings />
	<AshGuide />
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
