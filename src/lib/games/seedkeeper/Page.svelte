<script lang="ts">
	import SeedBank from './components/SeedBank.svelte';
	import SeedBoard from './components/SeedBoard.svelte';
	import SeedGuide from './components/SeedGuide.svelte';
	import SeedHud from './components/SeedHud.svelte';
	import SeedMenu from './components/SeedMenu.svelte';
	import SeedResult from './components/SeedResult.svelte';
	import SeedSettings from './components/SeedSettings.svelte';
	import { boardKeys } from '../kit/keys';
	import { seedPanels, seedView } from './settings.svelte';
	import { SeedSession } from './session.svelte';
	import { FIREFLY } from './types';

	const session = new SeedSession();
	let quiet = $state(false);
	let portrait = $state(false);

	const onKey = boardKeys({
		panels: seedPanels,
		screen: () => session.screen,
		startFromMenu: () => {
			if (!session.resume()) session.start(session.mode, session.difficulty, seedView.sowing);
		},
		backToMenu: () => session.backToMenu(),
		canRematch: () => session.ended,
		rematch: () => session.rematch(),
		busy: () => session.busy || session.aiTurn,
		nudge: (dr, dc) => {
			// On a sideways board the rows run up the screen, so up and down walk the row.
			const step = portrait ? -dr : dc;
			if (!step) return;
			session.moveCursor(session.current === FIREFLY ? step : -step);
		},
		play: () => session.sowCursor()
	});

	/** Matches the board renderer, which stands the slab on its side in tall boxes. */
	function watchShape(node: HTMLElement) {
		const observer = new ResizeObserver(() => (portrait = node.clientHeight > node.clientWidth * 1.05));
		observer.observe(node);
		return () => observer.disconnect();
	}

	const mood = $derived(
		session.screen === 'menu' ? 'menu' : session.status.type === 'won' ? 'won' : session.status.type === 'draw' ? 'draw' : 'play'
	);
</script>

<svelte:window onkeydown={onKey} />
<svelte:document onvisibilitychange={() => (quiet = document.hidden)} />

<div class="look" class:quiet>
	<SeedBank
		{mood}
		turn={session.screen === 'play' && !session.ended ? session.current : 0}
		flare={session.flare}
		strike={session.strike}
		dusk={session.screen === 'play' ? 0.12 + 0.88 * session.gathered : 0.18}
	/>

	{#if session.screen === 'menu'}
		<div class="stage menu">
			<SeedMenu {session} />
		</div>
	{:else}
		<div class="stage play">
			<SeedHud {session} />
			<div class="arena" {@attach watchShape}>
				<SeedBoard {session} />
			</div>
		</div>
	{/if}

	<SeedResult {session} />
	<SeedSettings />
	<SeedGuide />
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
