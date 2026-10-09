<script lang="ts">
	import { fly } from 'svelte/transition';
	import Ledger from './components/Ledger.svelte';
	import PubCoach from './components/PubCoach.svelte';
	import PubCurtain from './components/PubCurtain.svelte';
	import PubGuide from './components/PubGuide.svelte';
	import PubHud from './components/PubHud.svelte';
	import PubLesson from './components/PubLesson.svelte';
	import PubMenu from './components/PubMenu.svelte';
	import PubPrompt from './components/PubPrompt.svelte';
	import PubResult from './components/PubResult.svelte';
	import PubSettings from './components/PubSettings.svelte';
	import PubTable from './components/PubTable.svelte';
	import Snug from './components/Snug.svelte';
	import { boardKeys } from '../kit/keys';
	import { pubPanelControls } from './settings.svelte';
	import { PubSession } from './session.svelte';

	const session = new PubSession();
	let quiet = $state(false);
	let ledgerOpen = $state(false);

	$effect(() => () => session.dispose());

	const onKey = boardKeys({
		panels: pubPanelControls,
		screen: () => session.screen,
		startFromMenu: () => {
			if (!session.resume()) session.start();
		},
		backToMenu: () => session.backToMenu(),
		canRematch: () => session.over,
		rematch: () => session.rematch(),
		busy: () => !!session.curtain,
		nudge: () => {},
		play: () => {
			if (session.selected.length && session.selected.length === session.choose) session.confirm();
			else session.next();
		},
		wasd: false
	});
</script>

<svelte:window onkeydown={onKey} />
<svelte:document onvisibilitychange={() => (quiet = document.hidden)} />

<div class="look" class:quiet>
	<Snug cheer={session.cheer} hush={session.hush} stir={session.stir} dim={session.screen === 'menu'} />

	{#if session.screen === 'menu'}
		<div class="stage menu">
			<PubMenu {session} />
		</div>
	{:else}
		<div class="stage play">
			<PubHud {session} {ledgerOpen} onledger={() => (ledgerOpen = !ledgerOpen)} />
			<div class="main">
				<div class="arena">
					<div class="felt-wrap">
						<PubTable {session} />
						<PubLesson {session} />
					</div>
					{#if session.coaching}<PubCoach {session} />{/if}
					<PubPrompt {session} />
				</div>
				<div class="side">
					<Ledger {session} />
				</div>
				{#if ledgerOpen}
					<div class="sheet" transition:fly={{ y: -12, duration: 200 }}>
						<Ledger {session} />
						<button class="close" onclick={() => (ledgerOpen = false)}>Close</button>
					</div>
				{/if}
			</div>
		</div>
		<PubCurtain {session} />
	{/if}

	<PubResult {session} />
	<PubSettings />
	<PubGuide />
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
		gap: 10px;
		min-height: 0;
	}

	.main {
		position: relative;
		flex: 1 1 auto;
		min-height: 0;
		width: min(1400px, 100%);
		display: grid;
		grid-template-columns: minmax(0, 1fr) 300px;
		gap: 14px;
	}

	.arena {
		min-height: 0;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
		width: min(1080px, 100%);
		justify-self: center;
	}

	.felt-wrap {
		position: relative;
		flex: 1 1 auto;
		min-height: 0;
		isolation: isolate;
	}

	.side {
		min-height: 0;
		overflow: auto;
	}

	.sheet {
		position: absolute;
		z-index: 6;
		top: 0;
		right: 0;
		width: min(340px, 100%);
		max-height: 100%;
		overflow: auto;
		display: grid;
		gap: 8px;
	}

	.close {
		appearance: none;
		justify-self: end;
		border: 1px solid rgba(224, 165, 72, 0.4);
		border-radius: 999px;
		padding: 7px 16px;
		font: inherit;
		font-weight: 700;
		font-size: 0.75rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #f4e6c8;
		background: rgba(20, 13, 7, 0.92);
		cursor: pointer;
	}

	@media (min-width: 1100px) and (min-aspect-ratio: 5/4) {
		.sheet {
			display: none;
		}
	}

	@media (max-width: 1099px), (max-aspect-ratio: 5/4) {
		.main {
			grid-template-columns: minmax(0, 1fr);
		}

		.side {
			display: none;
		}

		.arena {
			width: 100%;
		}
	}

	@media (max-width: 640px) {
		.stage.play {
			gap: 6px;
		}

		.arena {
			gap: 6px;
		}
	}
</style>
