<script lang="ts">
	import WyrmBoard from './components/WyrmBoard.svelte';
	import WyrmHud from './components/WyrmHud.svelte';
	import WyrmMenu from './components/WyrmMenu.svelte';
	import WyrmNight from './components/WyrmNight.svelte';
	import WyrmResult from './components/WyrmResult.svelte';
	import WyrmSettings from './components/WyrmSettings.svelte';
	import { primeAudio } from '$lib/audio/prefs.svelte';
	import { closeWyrmSettings, wyrmPanel } from './settings.svelte';
	import { WyrmSession } from './session.svelte';
	import type { Dir } from './types';

	const session = new WyrmSession();
	let quiet = $state(false);

	function dirFrom(event: KeyboardEvent): Dir | null {
		const key = event.key;
		if (key === 'ArrowUp' || key === 'w' || key === 'W') return 'up';
		if (key === 'ArrowDown' || key === 's' || key === 'S') return 'down';
		if (key === 'ArrowLeft' || key === 'a' || key === 'A') return 'left';
		if (key === 'ArrowRight' || key === 'd' || key === 'D') return 'right';
		return null;
	}

	function onKey(event: KeyboardEvent) {
		primeAudio();
		if (event.key === 'Escape' && wyrmPanel.open) {
			closeWyrmSettings();
			return;
		}
		if (wyrmPanel.open) return;

		if (session.screen === 'menu') {
			if (event.key === 'Enter') {
				if (!session.resume()) session.start(session.difficulty);
			}
			return;
		}

		if (event.key === 'Escape') {
			session.backToMenu();
			return;
		}

		if (
			(session.status.type === 'dead' || session.status.type === 'won') &&
			(event.key === 'Enter' || event.key === ' ')
		) {
			event.preventDefault();
			session.restart();
			return;
		}

		if (event.key === ' ' || event.key === 'p' || event.key === 'P') {
			event.preventDefault();
			session.togglePause();
			return;
		}

		const next = dirFrom(event);
		if (!next) return;
		if (event.repeat) {
			event.preventDefault();
			return;
		}
		event.preventDefault();
		session.steer(next);
	}
</script>

<svelte:window onkeydown={onKey} onpagehide={() => session.stash()} />
<svelte:document
	onvisibilitychange={() => {
		quiet = document.hidden;
		if (document.hidden) session.stash();
	}}
/>

<div
	class="look"
	class:quiet
	class:won={session.status.type === 'won'}
>
	<WyrmNight
		mood={session.screen === 'menu'
			? 'menu'
			: session.status.type === 'won'
				? 'won'
				: session.status.type === 'dead'
					? 'dim'
					: 'play'}
	/>

	{#if session.screen === 'menu'}
		<div class="stage menu">
			<WyrmMenu {session} />
		</div>
	{:else}
		<div class="stage play">
			<WyrmHud {session} />
			<div class="arena">
				<WyrmBoard {session} />
			</div>
		</div>
	{/if}

	<WyrmResult {session} />
	<WyrmSettings />
</div>

<style>
	.look {
		position: relative;
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
		padding: 14px 12px 18px;
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
		transform: translateZ(0);
		contain: layout;
	}

	.arena {
		flex: 1 1 auto;
		min-height: 0;
		min-width: 0;
		width: 100%;
		display: grid;
		place-items: center;
	}
</style>
