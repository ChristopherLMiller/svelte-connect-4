<script lang="ts">
	import ChapelBoard from './components/ChapelBoard.svelte';
	import ChapelGuide from './components/ChapelGuide.svelte';
	import ChapelHud from './components/ChapelHud.svelte';
	import ChapelMenu from './components/ChapelMenu.svelte';
	import ChapelNave from './components/ChapelNave.svelte';
	import ChapelResult from './components/ChapelResult.svelte';
	import ChapelSettings from './components/ChapelSettings.svelte';
	import { primeAudio } from '$lib/audio/prefs.svelte';
	import {
		chapelGuide,
		chapelPanel,
		chosenChapter,
		closeChapelGuide,
		closeChapelSettings,
		openChapelGuide
	} from './settings.svelte';
	import { CHAPTERS } from './levels';
	import { ChapelSession } from './session.svelte';

	const session = new ChapelSession();
	let quiet = $state(false);

	const LEFT = new Set(['ArrowLeft', 'a', 'A']);
	const RIGHT = new Set(['ArrowRight', 'd', 'D']);

	function onKey(event: KeyboardEvent) {
		primeAudio();
		if (event.key === 'Escape' && chapelGuide.open) {
			closeChapelGuide();
			return;
		}
		if (event.key === 'Escape' && chapelPanel.open) {
			closeChapelSettings();
			return;
		}
		if (chapelGuide.open || chapelPanel.open) return;

		if (event.key === '?') {
			openChapelGuide();
			return;
		}

		if (session.screen === 'menu') {
			if (event.key === 'Enter') {
				if (!session.resume()) {
					session.start(session.difficulty, CHAPTERS[chosenChapter(session.difficulty)]!.start);
				}
			}
			return;
		}

		if (event.key === 'Escape') {
			session.backToMenu();
			return;
		}

		const type = session.status.type;
		if ((type === 'over' || type === 'won') && (event.key === 'Enter' || event.key === ' ')) {
			event.preventDefault();
			session.restart();
			return;
		}

		if (LEFT.has(event.key) || RIGHT.has(event.key)) {
			event.preventDefault();
			session.hold(LEFT.has(event.key) ? 'left' : 'right', true);
			return;
		}

		if (event.key === 'p' || event.key === 'P') {
			session.togglePause();
			return;
		}

		if (event.key === ' ' || event.key === 'Enter' || event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') {
			event.preventDefault();
			if (event.repeat) return;
			if (type === 'paused') session.togglePause();
			else session.launch();
		}
	}

	function onKeyUp(event: KeyboardEvent) {
		if (LEFT.has(event.key)) session.hold('left', false);
		if (RIGHT.has(event.key)) session.hold('right', false);
	}

	function release() {
		session.hold('left', false);
		session.hold('right', false);
	}
</script>

<svelte:window onkeydown={onKey} onkeyup={onKeyUp} onblur={release} onpagehide={() => session.stash()} />
<svelte:document
	onvisibilitychange={() => {
		quiet = document.hidden;
		if (document.hidden) {
			release();
			session.hide();
		}
	}}
/>

<div class="look" class:quiet>
	<ChapelNave
		mood={session.screen === 'menu'
			? 'menu'
			: session.status.type === 'won'
				? 'won'
				: session.status.type === 'over'
					? 'dim'
					: 'play'}
		light={session.screen === 'play' ? session.lit : 0.32}
		tint={session.tint}
		pulse={session.pulse}
		flashHue={session.flashHue}
	/>

	{#if session.screen === 'menu'}
		<div class="stage menu">
			<ChapelMenu {session} />
		</div>
	{:else}
		<div class="stage play">
			<ChapelHud {session} />
			<div class="arena">
				<ChapelBoard {session} />
			</div>
		</div>
	{/if}

	<ChapelResult {session} />
	<ChapelSettings />
	<ChapelGuide />
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
		justify-content: center;
		padding: 22px 20px 6vh;
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
		gap: 8px;
		padding: 8px;
	}

	.arena {
		grid-area: arena;
		min-height: 0;
		min-width: 0;
		display: grid;
		place-items: center;
		container-type: size;
		padding-top: 6px;
		box-sizing: border-box;
	}

	@media (min-width: 960px) and (min-aspect-ratio: 3/2) {
		.stage.play {
			grid-template-columns: minmax(220px, 300px) minmax(0, 1fr) minmax(220px, 300px);
			grid-template-rows: auto minmax(0, 1fr);
			grid-template-areas:
				'lead arena tally'
				'lead arena ops';
			gap: 10px 18px;
			padding: 14px 18px;
		}

		.arena {
			padding-top: 12px;
		}
	}
</style>
