<script lang="ts">
	import { untrack } from 'svelte';
	import KoiBoard from './components/KoiBoard.svelte';
	import KoiGuide from './components/KoiGuide.svelte';
	import KoiHud from './components/KoiHud.svelte';
	import KoiLeap from './components/KoiLeap.svelte';
	import KoiMenu from './components/KoiMenu.svelte';
	import KoiResult from './components/KoiResult.svelte';
	import KoiSettings from './components/KoiSettings.svelte';
	import KoiWater from './components/KoiWater.svelte';
	import { primeAudio } from '$lib/audio/prefs.svelte';
	import { closeKoiGuide, closeKoiSettings, koiGuide, koiPanel, koiPrefs, openKoiGuide } from './settings.svelte';
	import { KoiSession } from './session.svelte';

	const session = new KoiSession();
	let quiet = $state(false);

	$effect(() => {
		if (!koiPanel.open && !koiGuide.open) return;
		untrack(() => {
			const type = session.status.type;
			if (session.screen === 'play' && (type === 'playing' || type === 'ready')) session.togglePause();
		});
	});

	const STEER: Record<string, [number, number]> = {
		ArrowUp: [-1, 0],
		ArrowDown: [1, 0],
		ArrowLeft: [0, -1],
		ArrowRight: [0, 1]
	};

	function onKey(event: KeyboardEvent) {
		primeAudio();
		if (event.key === 'Escape' && koiGuide.open) {
			closeKoiGuide();
			return;
		}
		if (event.key === 'Escape' && koiPanel.open) {
			closeKoiSettings();
			return;
		}
		if (koiGuide.open || koiPanel.open) return;

		if (event.key === '?') {
			openKoiGuide();
			return;
		}

		if (session.screen === 'menu') {
			if (event.key === 'Enter' && event.target === document.body) {
				if (!session.resume(koiPrefs.mode)) session.start(koiPrefs.mode);
			}
			return;
		}

		const type = session.status.type;
		if (event.key === 'Escape') {
			if (type === 'over') session.backToMenu();
			else if (!event.repeat) session.togglePause();
			return;
		}
		if (type === 'over' && event.key === 'Enter') {
			event.preventDefault();
			session.restart();
			return;
		}
		if (event.key === 'p' || event.key === 'P') {
			if (!event.repeat) session.togglePause();
			return;
		}
		if (type === 'paused' && (event.key === ' ' || event.key === 'Enter')) {
			event.preventDefault();
			session.togglePause();
			return;
		}

		if (session.mode === 'ripples') {
			if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
				event.preventDefault();
				session.turn(-1);
			} else if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
				event.preventDefault();
				session.turn(1);
			} else if (event.key === ' ' || event.key === 'ArrowUp' || event.key === 'Enter') {
				event.preventDefault();
				if (!event.repeat) session.shoot();
			} else if (event.key === 'x' || event.key === 'X' || event.key === 'Tab') {
				event.preventDefault();
				if (!event.repeat) session.swapBloom();
			}
			return;
		}

		const steer = STEER[event.key];
		if (steer) {
			event.preventDefault();
			session.steer(steer[0], steer[1]);
		} else if (event.key === ' ' || event.key === 'Enter') {
			event.preventDefault();
			if (!event.repeat) session.pickCursor();
		}
	}

	function onKeyUp(event: KeyboardEvent) {
		if (session.mode !== 'ripples') return;
		if (['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D'].includes(event.key)) session.turn(0);
	}
</script>

<svelte:window onkeydown={onKey} onkeyup={onKeyUp} onblur={() => session.turn(0)} onpagehide={() => session.stash()} />
<svelte:document
	onvisibilitychange={() => {
		quiet = document.hidden;
		if (document.hidden) session.hide();
	}}
/>

<div class="look" class:quiet>
	<KoiWater
		{session}
		mood={session.screen === 'menu' ? 'menu' : session.status.type === 'over' ? 'dim' : session.status.type === 'cleared' ? 'bright' : 'play'}
		danger={session.screen === 'play' && session.mode === 'ripples' && session.status.type === 'playing' ? session.danger : 0}
	/>
	<KoiLeap leap={session.leap} />

	{#if session.screen === 'menu'}
		<div class="stage menu">
			<KoiMenu {session} />
		</div>
	{:else}
		<div class="stage play">
			<KoiHud {session} />
			<div class="arena">
				<KoiBoard {session} />
			</div>
		</div>
	{/if}

	<KoiResult {session} />
	<KoiSettings />
	<KoiGuide />
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
		box-sizing: border-box;
	}

	.stage.menu {
		justify-content: safe center;
		overflow: auto;
		padding: max(18px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(18px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
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
		place-items: stretch;
		box-sizing: border-box;
	}

	@media (min-width: 960px) {
		.stage.play {
			padding: max(14px, env(safe-area-inset-top)) max(18px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(18px, env(safe-area-inset-left));
		}
	}
</style>
