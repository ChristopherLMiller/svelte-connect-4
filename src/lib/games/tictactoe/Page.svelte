<script lang="ts">
	import TttBoard from './components/TttBoard.svelte';
	import TttHud from './components/TttHud.svelte';
	import TttMenu from './components/TttMenu.svelte';
	import TttResult from './components/TttResult.svelte';
	import TttGuide from './components/TttGuide.svelte';
	import TttSettings from './components/TttSettings.svelte';
	import TttSand from './components/TttSand.svelte';
	import TttShore from './components/TttShore.svelte';
	import TttLight from './components/TttLight.svelte';
	import TttWater from './components/TttWater.svelte';
	import { boardKeys } from '../kit/keys';
	import { tttPanels } from './settings.svelte';
	import { TttSession } from './session.svelte';

	const session = new TttSession();
	let quiet = $state(false);

	const onKey = boardKeys({
		panels: tttPanels,
		screen: () => session.screen,
		startFromMenu: () => {
			if (!session.resume()) session.start(session.mode, session.difficulty);
		},
		backToMenu: () => session.backToMenu(),
		canRematch: () =>
			session.status.type !== 'playing' &&
			!session.washing &&
			!session.receding &&
			!session.sketching &&
			!session.gridHidden,
		rematch: () => session.rematch(),
		busy: () => session.busy,
		nudge: (dr, dc) => session.nudge(dr, dc),
		play: () => void session.playSelected(),
		wasd: false,
		extra: (event) => {
			const numeric = Number(event.key);
			if (numeric >= 1 && numeric <= 9) {
				const index = numeric - 1;
				void session.playCell(Math.floor(index / 3), index % 3);
			}
		}
	});
</script>

<svelte:window onkeydown={onKey} />
<svelte:document onvisibilitychange={() => (quiet = document.hidden)} />

<div
	class="look"
	class:won={session.status.type === 'won' && !session.washing && !session.receding}
	class:washing={session.washing || session.receding}
	class:quiet
>
	<TttSand
		won={session.status.type === 'won' && !session.washing && !session.receding}
		hot={session.status.type === 'won' && !session.washing && !session.receding}
	/>
	<TttLight
		won={session.status.type === 'won' && !session.washing && !session.receding}
		washing={session.washing || session.receding}
		moves={session.board.flat().filter((cell) => cell !== 0).length}
	/>
	<TttShore celebrating={session.status.type === 'won' && !session.washing && !session.receding} washing={session.washing || session.receding} />
	<div class="shell a" aria-hidden="true"></div>
	<div class="shell b" aria-hidden="true"></div>
	<div class="shell c" aria-hidden="true"></div>

	{#if session.screen === 'menu'}
		<div class="stage menu">
			<TttMenu {session} />
		</div>
	{:else}
		<div class="stage play">
			<TttHud {session} />
			<div class="arena">
				<TttBoard {session} />
			</div>
		</div>
	{/if}

	<TttWater surge={session.washing} receding={session.receding} />
	<TttResult {session} />
	<TttSettings />
	<TttGuide />
</div>

<style>
	.look {
		position: relative;
		isolation: isolate;
		min-height: 100dvh;
		height: 100dvh;
		overflow: hidden;
		background:
			radial-gradient(900px 520px at 38% 28%, rgba(255, 244, 220, 0.32), transparent 58%),
			radial-gradient(900px 420px at 90% 30%, rgba(176, 122, 78, 0.28), transparent 50%),
			radial-gradient(700px 380px at 12% 70%, rgba(90, 150, 150, 0.12), transparent 55%),
			linear-gradient(180deg, #d9b887 0%, #c19a72 42%, #a97b58 76%, #8d6248 100%);
	}

	.look.quiet {
		animation-play-state: paused;
	}

	.shell {
		pointer-events: none;
		position: absolute;
	}

	.stage > :global(*) {
		pointer-events: auto;
	}

	.shell {
		width: 28px;
		height: 20px;
		border-radius: 70% 70% 40% 40%;
		background: radial-gradient(circle at 30% 30%, #f7efe2, #d9b08c 60%, #b07a52);
		box-shadow: inset 0 -4px 6px rgba(90, 50, 30, 0.25);
		opacity: 0.8;
	}

	.shell.a {
		top: 11%;
		left: 3%;
		rotate: -18deg;
	}

	.shell.b {
		top: 14%;
		right: 3%;
		width: 22px;
		rotate: 24deg;
	}

	.shell.c {
		top: auto;
		bottom: 14vh;
		left: 6%;
		width: 18px;
		rotate: 8deg;
	}

	.stage {
		position: relative;
		z-index: 2;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: max(14px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(11vh, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
		box-sizing: border-box;
		pointer-events: none;
	}

	.stage.menu {
		justify-content: center;
		padding: 22px 20px 18vh;
	}

	.stage.play {
		justify-content: stretch;
		gap: 10px;
		min-height: 0;
		padding-bottom: 28vh;
	}

	.arena {
		flex: 1 1 auto;
		min-height: 0;
		min-width: 0;
		width: 100%;
		container-type: size;
		display: grid;
		place-items: center;
		pointer-events: none;
		transition: opacity 0.35s linear;
	}

	.look.washing .arena {
		opacity: 0;
	}

	.arena > :global(*) {
		pointer-events: auto;
	}
</style>
