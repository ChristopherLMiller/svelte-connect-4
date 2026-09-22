<script lang="ts">
	import TttBoard from './components/TttBoard.svelte';
	import TttHud from './components/TttHud.svelte';
	import TttMenu from './components/TttMenu.svelte';
	import TttResult from './components/TttResult.svelte';
	import TttSettings from './components/TttSettings.svelte';
	import TttShore from './components/TttShore.svelte';
	import TttTide from './components/TttTide.svelte';
	import { primeAudio } from '$lib/audio/prefs.svelte';
	import { closeTttSettings, tttPanel } from './settings.svelte';
	import { TttSession } from './session.svelte';

	const session = new TttSession();
	let quiet = $state(false);

	function onKey(event: KeyboardEvent) {
		primeAudio();
		if (event.key === 'Escape' && tttPanel.open) {
			closeTttSettings();
			return;
		}
		if (tttPanel.open) return;

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

		if (
			session.status.type !== 'playing' &&
			!session.washing &&
			!session.receding &&
			!session.sketching &&
			!session.gridHidden &&
			(event.key === 'Enter' || event.key === ' ')
		) {
			event.preventDefault();
			session.rematch();
			return;
		}

		if (session.busy) return;

		if (event.key === 'ArrowLeft') {
			event.preventDefault();
			session.nudge(0, -1);
			return;
		}
		if (event.key === 'ArrowRight') {
			event.preventDefault();
			session.nudge(0, 1);
			return;
		}
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			session.nudge(-1, 0);
			return;
		}
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			session.nudge(1, 0);
			return;
		}
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			void session.playSelected();
			return;
		}

		const numeric = Number(event.key);
		if (numeric >= 1 && numeric <= 9) {
			const index = numeric - 1;
			void session.playCell(Math.floor(index / 3), index % 3);
		}
	}
</script>

<svelte:window onkeydown={onKey} />
<svelte:document onvisibilitychange={() => (quiet = document.hidden)} />

<div
	class="look"
	class:won={session.status.type === 'won' && !session.washing && !session.receding}
	class:washing={session.washing || session.receding}
	class:quiet
>
	<div class="grain" aria-hidden="true"></div>
	<div class="heat" aria-hidden="true"></div>
	<div class="wet" aria-hidden="true"></div>
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

	<TttTide surge={session.washing} receding={session.receding} />
	<TttResult {session} />
	<TttSettings />
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

	.grain,
	.heat,
	.wet,
	.shell {
		pointer-events: none;
		position: absolute;
	}

	.stage > :global(*) {
		pointer-events: auto;
	}

	.heat {
		inset: 0;
		z-index: 1;
		background:
			radial-gradient(ellipse at 36% 32%, rgba(255, 240, 210, 0.22), transparent 48%),
			radial-gradient(ellipse at 70% 58%, rgba(255, 226, 180, 0.1), transparent 42%);
		mix-blend-mode: screen;
		opacity: 0.65;
		isolation: isolate;
		transform: translateZ(0);
	}

	.won .heat {
		opacity: 0.9;
		background:
			radial-gradient(ellipse at 50% 42%, rgba(255, 232, 180, 0.3), transparent 52%),
			radial-gradient(ellipse at 36% 32%, rgba(255, 240, 210, 0.22), transparent 48%);
	}

	.grain {
		inset: 0;
		opacity: 0.28;
		mix-blend-mode: multiply;
		isolation: isolate;
		transform: translateZ(0);
		background-image: url('/sand-grain.png');
		background-size: 96px 96px;
	}

	.wet {
		left: 0;
		right: 0;
		bottom: 0;
		height: 44vh;
		background: linear-gradient(
			180deg,
			transparent 0%,
			rgba(149, 108, 78, 0.14) 32%,
			rgba(92, 86, 72, 0.16) 52%,
			rgba(45, 108, 128, 0.14) 74%,
			transparent 100%
		);
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
		padding: 14px 12px 11vh;
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

	.look.washing .grain,
	.look.washing .heat {
		mix-blend-mode: normal;
		transform: none;
	}

	.look.washing .arena {
		opacity: 0;
	}

	.arena > :global(*) {
		pointer-events: auto;
	}
</style>
