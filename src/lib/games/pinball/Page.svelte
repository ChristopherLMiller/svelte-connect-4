<script lang="ts">
	import { untrack } from 'svelte';
	import Backdrop from './components/Backdrop.svelte';
	import Board from './components/Board.svelte';
	import Guide from './components/Guide.svelte';
	import Hud from './components/Hud.svelte';
	import Menu from './components/Menu.svelte';
	import Result from './components/Result.svelte';
	import Settings from './components/Settings.svelte';
	import { primeAudio } from '$lib/audio/prefs.svelte';
	import { closePinballGuide, closePinballSettings, openPinballGuide, pinballGuide, pinballPanel } from './settings.svelte';
	import { PinballSession } from './session.svelte';

	const session = new PinballSession();
	let quiet = $state(false);

	$effect(() => {
		if (!pinballPanel.open && !pinballGuide.open) return;
		untrack(() => {
			const type = session.status.type;
			if (session.screen === 'play' && (type === 'playing' || type === 'ready')) session.togglePause();
		});
	});

	const LEFT = new Set(['KeyZ', 'ArrowLeft', 'ShiftLeft']);
	const RIGHT = new Set(['Slash', 'ArrowRight', 'ShiftRight']);
	const PLUNGER = new Set([' ', 'Enter', 'ArrowDown']);
	const NUDGE: Record<string, -1 | 0 | 1> = { ArrowUp: 0, KeyN: 0, KeyX: 1, Period: -1 };

	function side(event: KeyboardEvent) {
		if (event.key === '?') return null;
		if (LEFT.has(event.code)) return 'left';
		if (RIGHT.has(event.code)) return 'right';
		return null;
	}

	const skin = $derived(session.spec.meta.skin);
	const mood = $derived.by(() => {
		if (session.screen === 'menu') return 'menu';
		const type = session.status.type;
		if (type === 'paused' || type === 'over') return 'dim';
		return session.hot ? 'hot' : 'play';
	});

	function onKey(event: KeyboardEvent) {
		primeAudio();
		if (event.key === 'Escape' && pinballGuide.open) {
			closePinballGuide();
			return;
		}
		if (event.key === 'Escape' && pinballPanel.open) {
			closePinballSettings();
			return;
		}
		if (pinballGuide.open || pinballPanel.open) return;

		if (session.screen === 'menu') {
			if (event.key === '?') openPinballGuide();
			else if (event.key === 'Enter' && event.target === document.body) session.start();
			return;
		}

		const type = session.status.type;
		if (event.key === '?') {
			openPinballGuide();
			return;
		}
		const flipper = side(event);
		if (flipper) {
			event.preventDefault();
			if (!event.repeat) session.flipper(flipper, true);
			return;
		}
		if (event.code in NUDGE) {
			event.preventDefault();
			if (!event.repeat) session.nudge(NUDGE[event.code]!);
			return;
		}
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
		if (PLUNGER.has(event.key)) {
			event.preventDefault();
			if (!event.repeat) session.plunger(true);
		}
	}

	function onKeyUp(event: KeyboardEvent) {
		const flipper = side(event);
		if (flipper) session.flipper(flipper, false);
		else if (PLUNGER.has(event.key)) session.plunger(false);
	}

	function letGo() {
		session.flipper('left', false);
		session.flipper('right', false);
		session.plunger(false);
	}
</script>

<svelte:window onkeydown={onKey} onkeyup={onKeyUp} onblur={letGo} onpagehide={() => session.stash()} />
<svelte:document
	onvisibilitychange={() => {
		quiet = document.hidden;
		if (document.hidden) session.hide();
	}}
/>

<div
	class="look"
	class:quiet
	style:--sb-bg={skin.bg}
	style:--sb-panel={skin.panel}
	style:--sb-ink={skin.ink}
	style:--sb-muted={skin.muted}
	style:--sb-accent={skin.accent}
	style:--sb-hot={skin.hot}
	style:--sb-display={skin.display}
	style:background={skin.bg}
>
	{#key session.table}
		<Backdrop
			scene={session.spec.meta.backdrop}
			label="{session.table} backdrop"
			fallback="linear-gradient(180deg, #000 0%, {skin.bg} 70%, #000 100%)"
			{mood}
			flash={session.flash}
			drained={session.drained}
			pulse={session.pulse}
			accent={skin.accent}
			glow={skin.hot}
		/>
	{/key}

	{#if session.screen === 'menu'}
		<div class="stage menu">
			<Menu {session} />
		</div>
	{:else}
		<div class="stage play">
			<Hud {session} />
			<div class="arena">
				<Board {session} />
			</div>
		</div>
	{/if}

	<Result {session} />
	<Settings playing={session.screen === 'play'} />
	<Guide spec={session.spec} />
</div>

<style>
	.look {
		position: relative;
		isolation: isolate;
		min-height: 100dvh;
		height: 100dvh;
		overflow: hidden;
		transition: background-color 400ms ease;
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

	@media (prefers-reduced-motion: reduce) {
		.look {
			transition: none;
		}
	}
</style>
