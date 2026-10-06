<script lang="ts">
	import { untrack } from 'svelte';
	import FrostBoard from './components/FrostBoard.svelte';
	import FrostDawn from './components/FrostDawn.svelte';
	import FrostGuide from './components/FrostGuide.svelte';
	import FrostHud from './components/FrostHud.svelte';
	import FrostMenu from './components/FrostMenu.svelte';
	import FrostResult from './components/FrostResult.svelte';
	import FrostSettings from './components/FrostSettings.svelte';
	import { primeAudio } from '$lib/audio/prefs.svelte';
	import { closeFrostGuide, closeFrostSettings, frostGuide, frostPanel, frostPrefs, openFrostGuide } from './settings.svelte';
	import { FrostSession } from './session.svelte';

	const session = new FrostSession();
	let quiet = $state(false);

	$effect(() => {
		if (!frostPanel.open && !frostGuide.open) return;
		untrack(() => {
			if (session.screen === 'play' && session.status.type === 'playing') session.togglePause();
		});
	});

	const MOVES: Record<string, [number, number]> = {
		ArrowLeft: [-1, 0],
		ArrowRight: [1, 0],
		ArrowUp: [0, -1],
		ArrowDown: [0, 1],
		a: [-1, 0],
		d: [1, 0],
		w: [0, -1],
		s: [0, 1]
	};

	function onKey(event: KeyboardEvent) {
		primeAudio();
		if (event.key === 'Escape' && frostGuide.open) {
			closeFrostGuide();
			return;
		}
		if (event.key === 'Escape' && frostPanel.open) {
			closeFrostSettings();
			return;
		}
		if (frostGuide.open || frostPanel.open) return;

		if (event.key === '?') {
			openFrostGuide();
			return;
		}

		if (session.screen === 'menu') {
			if (event.key === 'Enter') {
				if (!session.resume()) session.start(frostPrefs.level);
			}
			return;
		}

		if (event.key === 'Escape') {
			session.backToMenu();
			return;
		}

		if (session.ended && (event.key === 'Enter' || event.key === 'n' || event.key === 'N')) {
			event.preventDefault();
			session.restart();
			return;
		}

		const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
		if (key === 'p') {
			if (!event.repeat) session.togglePause();
			return;
		}
		if (key === 'n' || key === 'r') {
			session.restart();
			return;
		}
		const move = MOVES[key];
		if (move) {
			event.preventDefault();
			session.moveCursor(move[0], move[1]);
			return;
		}
		if (event.repeat) return;
		if (key === ' ' || key === 'Enter') {
			event.preventDefault();
			if (session.cursor < 0) session.moveCursor(0, 0);
			else session.strike(session.cursor);
			return;
		}
		if (key === 'f' || key === 'e') {
			event.preventDefault();
			if (session.cursor < 0) session.moveCursor(0, 0);
			else session.mark(session.cursor);
		}
	}
</script>

<svelte:window onkeydown={onKey} onpagehide={() => session.stash()} />
<svelte:document
	onvisibilitychange={() => {
		quiet = document.hidden;
		if (document.hidden) session.hide();
	}}
/>

<div class="look" class:quiet>
	<FrostDawn
		mood={session.screen === 'menu' ? 'menu' : session.status.type === 'lost' ? 'lost' : session.status.type === 'won' ? 'won' : 'play'}
		dawn={session.screen === 'menu' ? 0.3 : session.progress}
		melt={session.melt}
		crack={session.crack}
	/>

	{#if session.screen === 'menu'}
		<div class="stage menu">
			<FrostMenu {session} />
		</div>
	{:else}
		<div class="stage play">
			<FrostHud {session} />
			<div class="arena">
				<FrostBoard {session} />
			</div>
		</div>
	{/if}

	<FrostResult {session} />
	<FrostSettings />
	<FrostGuide />
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
		padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(14px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
		box-sizing: border-box;
	}

	.stage.menu {
		justify-content: safe center;
		padding: max(22px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) max(6vh, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left));
		overflow: auto;
	}

	.stage.play {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		grid-template-rows: auto minmax(0, 1fr);
		grid-template-areas:
			'hud'
			'arena';
		align-items: stretch;
		gap: 10px;
		padding: max(8px, env(safe-area-inset-top)) max(8px, env(safe-area-inset-right)) max(10px, env(safe-area-inset-bottom)) max(8px, env(safe-area-inset-left));
	}

	.arena {
		grid-area: arena;
		min-height: 0;
		min-width: 0;
		display: grid;
		padding: 8px;
		box-sizing: border-box;
	}

	@media (min-width: 960px) and (min-aspect-ratio: 3/2) {
		.stage.play {
			grid-template-columns: minmax(220px, 290px) minmax(0, 1fr) minmax(200px, 260px);
			grid-template-rows: auto minmax(0, 1fr);
			grid-template-areas:
				'lead arena tally'
				'lead arena ops';
			gap: 10px 18px;
			padding: max(14px, env(safe-area-inset-top)) max(18px, env(safe-area-inset-right)) max(14px, env(safe-area-inset-bottom)) max(18px, env(safe-area-inset-left));
		}
	}
</style>
