<script lang="ts">
	import GameBoard from '$lib/components/GameBoard.svelte';
	import GameHud from '$lib/components/GameHud.svelte';
	import MenuScreen from '$lib/components/MenuScreen.svelte';
	import ResultOverlay from '$lib/components/ResultOverlay.svelte';
	import { GameSession } from '$lib/game/session.svelte';
	import { audioSettings, closeSettings, primeAudio } from '$lib/game/settings.svelte';

	const session = new GameSession();

	function onKey(event: KeyboardEvent) {
		primeAudio();

		if (event.key === 'Escape' && audioSettings.open) {
			closeSettings();
			return;
		}

		if (audioSettings.open) return;

		if (session.screen === 'menu') {
			if (event.key === 'Enter') {
				if (!session.resume()) session.start(session.mode, session.difficulty);
			}
			return;
		}

		if (event.key === 'Escape') {
			session.backToMenu();
			return;
		}

		if (session.busy) return;

		if (event.key === 'ArrowLeft') {
			event.preventDefault();
			session.nudgeSelection(-1);
			return;
		}
		if (event.key === 'ArrowRight') {
			event.preventDefault();
			session.nudgeSelection(1);
			return;
		}
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			void session.playSelected();
			return;
		}

		const numeric = Number(event.key);
		if (numeric >= 1 && numeric <= 7) {
			void session.playColumn(numeric - 1);
		}
	}
</script>

<svelte:window onkeydown={onKey} />

{#if session.screen === 'menu'}
	<MenuScreen {session} />
{:else}
	<div class="arena">
		<GameHud {session} />
		<GameBoard {session} />
		<ResultOverlay {session} />
	</div>
{/if}

<style>
	.arena {
		width: 100%;
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		align-items: stretch;
	}
</style>
