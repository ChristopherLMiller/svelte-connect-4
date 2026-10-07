<script lang="ts">
	import CartBoard from './components/CartBoard.svelte';
	import CartDesk from './components/CartDesk.svelte';
	import CartGuide from './components/CartGuide.svelte';
	import CartHud from './components/CartHud.svelte';
	import CartMenu from './components/CartMenu.svelte';
	import CartResult from './components/CartResult.svelte';
	import CartSettings from './components/CartSettings.svelte';
	import { boardKeys } from '../kit/keys';
	import { cartPanels, cartView } from './settings.svelte';
	import { CartSession } from './session.svelte';

	const session = new CartSession();
	let quiet = $state(false);

	const onKey = boardKeys({
		panels: cartPanels,
		screen: () => session.screen,
		startFromMenu: () => {
			if (!session.resume()) session.start(session.mode, session.difficulty, cartView.chart);
		},
		backToMenu: () => session.backToMenu(),
		canRematch: () => session.ended,
		rematch: () => session.rematch(),
		busy: () => session.busy || session.aiTurn,
		nudge: (dr, dc) => session.moveCursor(dc, dr),
		play: () => session.inkCursor()
	});

	const mood = $derived(
		session.screen === 'menu' ? 'menu' : session.status.type === 'won' ? 'won' : session.status.type === 'draw' ? 'draw' : 'play'
	);
</script>

<svelte:window onkeydown={onKey} />
<svelte:document onvisibilitychange={() => (quiet = document.hidden)} />

<div class="look" class:quiet>
	<CartDesk
		{mood}
		turn={session.screen === 'play' && !session.ended ? session.current : 0}
		flare={session.flare}
		strokes={session.strokes}
		burn={session.screen === 'play' ? 0.1 + 0.9 * session.inked : 0.2}
	/>

	{#if session.screen === 'menu'}
		<div class="stage menu">
			<CartMenu {session} />
		</div>
	{:else}
		<div class="stage play">
			<CartHud {session} />
			<div class="arena">
				<CartBoard {session} />
			</div>
		</div>
	{/if}

	<CartResult {session} />
	<CartSettings />
	<CartGuide />
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
		padding: 6px;
		box-sizing: border-box;
	}
</style>
