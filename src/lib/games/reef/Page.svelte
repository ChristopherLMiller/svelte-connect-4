<script lang="ts">
	import { untrack } from 'svelte';
	import ReefAbyss from './components/ReefAbyss.svelte';
	import ReefBoard from './components/ReefBoard.svelte';
	import ReefGuide from './components/ReefGuide.svelte';
	import ReefHud from './components/ReefHud.svelte';
	import ReefMenu from './components/ReefMenu.svelte';
	import ReefResult from './components/ReefResult.svelte';
	import ReefSettings from './components/ReefSettings.svelte';
	import ReefWhale from './components/ReefWhale.svelte';
	import { primeAudio } from '$lib/audio/prefs.svelte';
	import { closeReefGuide, closeReefSettings, openReefGuide, reefGuide, reefPanel, reefPrefs } from './settings.svelte';
	import { ReefSession, type Action } from './session.svelte';
	import { depthFraction } from './types';

	const session = new ReefSession();
	let quiet = $state(false);

	$effect(() => {
		if (!reefPanel.open && !reefGuide.open) return;
		untrack(() => {
			const type = session.status.type;
			if (session.screen === 'play' && (type === 'playing' || type === 'ready')) session.togglePause();
		});
	});

	const KEYS: Record<string, Action> = {
		ArrowLeft: 'left',
		a: 'left',
		A: 'left',
		ArrowRight: 'right',
		d: 'right',
		D: 'right',
		ArrowDown: 'soft',
		s: 'soft',
		S: 'soft',
		ArrowUp: 'cw',
		x: 'cw',
		X: 'cw',
		w: 'cw',
		W: 'cw',
		z: 'ccw',
		Z: 'ccw',
		Control: 'ccw',
		' ': 'drop',
		c: 'hold',
		C: 'hold',
		Shift: 'hold'
	};

	function onKey(event: KeyboardEvent) {
		primeAudio();
		if (event.key === 'Escape' && reefGuide.open) {
			closeReefGuide();
			return;
		}
		if (event.key === 'Escape' && reefPanel.open) {
			closeReefSettings();
			return;
		}
		if (reefGuide.open || reefPanel.open) return;

		if (event.key === '?') {
			openReefGuide();
			return;
		}

		if (session.screen === 'menu') {
			if (event.key === 'Enter') {
				if (!session.resume()) session.start(reefPrefs.mode, reefPrefs.startLevel);
			}
			return;
		}

		if (event.key === 'Escape') {
			session.backToMenu();
			return;
		}

		const type = session.status.type;
		if ((type === 'over' || type === 'done') && event.key === 'Enter') {
			event.preventDefault();
			session.restart();
			return;
		}

		if (event.key === 'p' || event.key === 'P') {
			if (!event.repeat) session.togglePause();
			return;
		}

		const action = KEYS[event.key];
		if (!action) return;
		event.preventDefault();
		if (event.repeat) return;
		if (type === 'paused' && action === 'drop') {
			session.togglePause();
			return;
		}
		session.press(action);
	}

	function onKeyUp(event: KeyboardEvent) {
		const action = KEYS[event.key];
		if (action) session.releaseAction(action);
	}
</script>

<svelte:window onkeydown={onKey} onkeyup={onKeyUp} onblur={() => session.release()} onpagehide={() => session.stash()} />
<svelte:document
	onvisibilitychange={() => {
		quiet = document.hidden;
		if (document.hidden) {
			session.release();
			session.hide();
		}
	}}
/>

<div class="look" class:quiet>
	<ReefAbyss
		mood={session.screen === 'menu'
			? 'menu'
			: session.status.type === 'done'
				? 'done'
				: session.status.type === 'over'
					? 'dim'
					: 'play'}
		depth={session.screen === 'play' ? depthFraction(session.level) : 0.15}
		pulse={session.bloom}
		danger={session.screen === 'play' && session.status.type === 'playing' ? Math.max(0, Math.min(1, (session.stack - 0.6) / 0.3)) : 0}
	/>
	<ReefWhale whale={session.whale} />

	{#if session.screen === 'menu'}
		<div class="stage menu">
			<ReefMenu {session} />
		</div>
	{:else}
		<div class="stage play">
			<ReefHud {session} />
			<div class="arena">
				<ReefBoard {session} />
			</div>
		</div>
	{/if}

	<ReefResult {session} />
	<ReefSettings />
	<ReefGuide />
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
	}
</style>
