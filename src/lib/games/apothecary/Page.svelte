<script lang="ts">
	import ApoBoard from './components/ApoBoard.svelte';
	import ApoGuide from './components/ApoGuide.svelte';
	import ApoHud from './components/ApoHud.svelte';
	import ApoLab from './components/ApoLab.svelte';
	import ApoMenu from './components/ApoMenu.svelte';
	import ApoResult from './components/ApoResult.svelte';
	import ApoSettings from './components/ApoSettings.svelte';
	import { primeAudio } from '$lib/audio/prefs.svelte';
	import { apoGuide, apoPanel, apoPrefs, closeApoGuide, closeApoSettings, openApoGuide } from './settings.svelte';
	import { ApoSession } from './session.svelte';
	import type { Dir } from './types';

	const session = new ApoSession();
	let quiet = $state(false);

	const MOVES: Record<string, Dir> = {
		ArrowLeft: 'left',
		ArrowRight: 'right',
		ArrowUp: 'up',
		ArrowDown: 'down',
		a: 'left',
		d: 'right',
		w: 'up',
		s: 'down'
	};

	const mood = $derived(
		session.screen === 'menu' ? 'menu' : session.status.type === 'stone' ? 'stone' : session.status.type === 'over' ? 'over' : 'play'
	);
	const tension = $derived(session.screen === 'play' ? session.cells.filter(Boolean).length / session.cells.length : 0.2);

	function onKey(event: KeyboardEvent) {
		primeAudio();
		if (event.key === 'Escape' && apoGuide.open) {
			closeApoGuide();
			return;
		}
		if (event.key === 'Escape' && apoPanel.open) {
			closeApoSettings();
			return;
		}
		if (apoGuide.open || apoPanel.open) return;
		if (event.key === '?') {
			openApoGuide();
			return;
		}
		if (session.screen === 'menu') {
			if (event.key === 'Enter' && !session.resume()) session.start(apoPrefs.bench);
			return;
		}
		if (event.key === 'Escape') {
			session.backToMenu();
			return;
		}
		if (session.status.type === 'stone') {
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				session.keepBrewing();
			}
			return;
		}
		const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
		const dir = MOVES[key];
		if (dir) {
			event.preventDefault();
			session.pour(dir);
			return;
		}
		if (event.repeat) return;
		if (key === 'u' || key === 'z' || key === 'Backspace') {
			event.preventDefault();
			session.undo();
			return;
		}
		if (key === 'n' || (session.ended && key === 'Enter')) session.restart();
	}
</script>

<svelte:window onkeydown={onKey} />
<svelte:document onvisibilitychange={() => (quiet = document.hidden)} />

<div class="look" class:quiet>
	<ApoLab {mood} brew={session.screen === 'play' ? Math.max(3, session.top) : 6} flare={session.flare} {tension} />

	{#if session.screen === 'menu'}
		<div class="stage menu">
			<ApoMenu {session} />
		</div>
	{:else}
		<div class="stage play">
			<ApoHud {session} />
			<div class="arena">
				<ApoBoard {session} />
			</div>
		</div>
	{/if}

	<ApoResult {session} />
	<ApoSettings />
	<ApoGuide />
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
	}

	.stage.menu {
		justify-content: safe center;
		padding: max(22px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) max(6vh, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left));
		overflow: auto;
	}

	.stage.play {
		display: grid;
		grid-template: auto minmax(0, 1fr) / minmax(0, 1fr);
		align-items: stretch;
		gap: 10px;
		padding: max(10px, env(safe-area-inset-top)) max(10px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(10px, env(safe-area-inset-left));
	}

	.arena {
		min-height: 0;
		min-width: 0;
		display: grid;
		grid-template: minmax(0, 1fr) / minmax(0, 1fr);
		padding: 6px 4px;
	}
</style>
