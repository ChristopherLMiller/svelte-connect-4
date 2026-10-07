<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import ActionBar from './components/ActionBar.svelte';
	import ChessBoard from './components/ChessBoard.svelte';
	import ChessGuide from './components/ChessGuide.svelte';
	import ChessHud from './components/ChessHud.svelte';
	import ChessMenu from './components/ChessMenu.svelte';
	import ChessResult from './components/ChessResult.svelte';
	import ChessSettings from './components/ChessSettings.svelte';
	import EvalBar from './components/EvalBar.svelte';
	import GrandHall from './components/GrandHall.svelte';
	import MoveList from './components/MoveList.svelte';
	import PlayerPlate from './components/PlayerPlate.svelte';
	import PromotionPicker from './components/PromotionPicker.svelte';
	import ReviewPanel from './components/ReviewPanel.svelte';
	import { boardKeys } from '../kit/keys';
	import { playThunder } from './audio';
	import { ChessSession } from './session.svelte';
	import { chessPanels, chessView, persistChessView } from './settings.svelte';

	const session = new ChessSession();
	let quiet = $state(false);
	let resultHidden = $state(false);

	const shared = boardKeys({
		panels: chessPanels,
		screen: () => session.screen,
		startFromMenu: () => {
			if (!session.resume()) {
				const side = chessView.side === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : chessView.side;
				session.start(chessView.mode, chessView.opponent, chessView.mode === 'ai' ? side : 'w', chessView.time);
			}
		},
		backToMenu: () => session.backToMenu(),
		canRematch: () => session.screen === 'play' && session.ended && !session.review,
		rematch: () => session.rematch(),
		busy: () => session.screen === 'play' && (session.aiTurn || !!session.promotion),
		nudge: (dr, dc) => session.moveCursor(dr, dc),
		play: () => session.pressCursor(),
		extra: (event) => {
			const key = event.key.toLowerCase();
			if (key === 'f') session.flip();
			else if (key === 'e') {
				chessView.evalBar = !chessView.evalBar;
				persistChessView();
			} else if (key === ',' || key === '[') session.step(-1);
			else if (key === '.' || key === ']') session.step(1);
		}
	});

	function onKey(event: KeyboardEvent) {
		const panelOpen = chessPanels.panel.open || chessPanels.guide.open;
		if (!panelOpen && session.screen === 'play' && !session.promotion) {
			if (event.key === 'Escape') {
				if (session.selected >= 0) {
					session.deselect();
					return;
				}
				if (session.review) {
					session.exitReview();
					return;
				}
				if (!session.live) {
					session.viewAt(null);
					return;
				}
			}
			const browsing = session.ended || !!session.review;
			if (browsing && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
				event.preventDefault();
				session.step(event.key === 'ArrowLeft' ? -1 : 1);
				return;
			}
		}
		shared(event);
	}

	const mood = $derived.by(() => {
		if (session.screen === 'menu') return 'menu';
		return session.verdict ?? 'play';
	});
	const turn = $derived(session.screen === 'play' && !session.outcome ? (session.turn === 'w' ? 1 : -1) : 0);
	const top = $derived(session.bottom === 'w' ? 'b' : 'w');

	let gaze = $state<{ x: number; y: number } | null>(null);
	const stir = $derived(session.captures.w.length + session.captures.b.length);

	/** Viewport centre of a square on the live board, for the portraits to look at. */
	function squarePoint(sq: number) {
		const well = document.querySelector('.well');
		if (!well || sq < 0) return null;
		const rect = well.getBoundingClientRect();
		const inset = rect.width * 0.043;
		const cell = (rect.width - inset * 2) / 8;
		const white = session.bottom === 'w';
		const col = white ? sq & 7 : 7 - (sq & 7);
		const row = white ? 7 - (sq >> 4) : sq >> 4;
		return { x: rect.left + inset + (col + 0.5) * cell, y: rect.top + inset + (row + 0.5) * cell };
	}

	$effect(() => {
		const sq = session.selected >= 0 ? session.selected : (session.lastMove?.to ?? -1);
		void session.bottom;
		untrack(() => {
			const point = squarePoint(sq);
			if (point) gaze = point;
		});
	});

	$effect(() => {
		void session.outcome;
		resultHidden = false;
	});

	$effect(() => {
		if (chessView.evalBar) untrack(() => session.requestEval());
	});

	onDestroy(() => session.dispose());
</script>

<svelte:window onkeydown={onKey} onpointermove={(event) => (gaze = { x: event.clientX, y: event.clientY })} />
<svelte:document onvisibilitychange={() => (quiet = document.hidden)} />

<div class="look" class:quiet>
	<GrandHall
		{mood}
		{turn}
		flash={session.flash}
		{stir}
		{gaze}
		onthunder={(strength) => {
			if (!quiet) playThunder(strength);
		}}
	/>

	{#if session.screen === 'menu'}
		<div class="stage menu">
			<ChessMenu {session} />
		</div>
	{:else}
		<div class="stage play">
			<ChessHud {session} />
			<div class="hall">
				<div class="arena" class:evalbar={chessView.evalBar}>
					<section class="seat">
						{#if chessView.evalBar}
							<div class="eval"><EvalBar score={session.review ? (session.review.scores[session.review.index] ?? null) : session.evalScore} bottom={session.bottom} /></div>
						{/if}
						<PlayerPlate {session} side={top} />
						<div class="well">
							<ChessBoard {session} />
							{#if session.promotion}
								<PromotionPicker {session} />
							{/if}
						</div>
						<PlayerPlate {session} side={session.bottom} />
						{#if session.outcome && !session.review && !resultHidden}
							<ChessResult {session} onhide={() => (resultHidden = true)} />
						{/if}
					</section>
					<aside class="side">
						{#if session.review}
							<ReviewPanel {session} />
						{/if}
						<MoveList {session} />
						<ActionBar {session} {resultHidden} onshow={() => (resultHidden = false)} />
					</aside>
				</div>
			</div>
		</div>
	{/if}

	<ChessSettings />
	<ChessGuide />
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
		justify-content: stretch;
		gap: 10px;
		min-height: 0;
	}

	.hall {
		flex: 1 1 auto;
		min-height: 0;
		min-width: 0;
		width: min(1400px, 100%);
		container-type: size;
	}

	.arena {
		--plates: 112px;
		--aside: clamp(260px, 26cqw, 340px);
		--evalw: 0px;
		--board: min(calc(100cqh - var(--plates)), calc(100cqw - var(--aside) - 16px - var(--evalw)));
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 16px;
	}

	.arena.evalbar {
		--evalw: 24px;
	}

	.seat {
		position: relative;
		display: grid;
		grid-template-columns: var(--board);
		grid-template-rows: auto auto auto;
		gap: 6px 8px;
	}

	.evalbar .seat {
		grid-template-columns: 16px var(--board);
	}

	.seat > :global(*) {
		grid-column: -2;
	}

	.seat > .eval {
		grid-column: 1;
		grid-row: 2;
		display: flex;
	}

	.seat > :global(.veil) {
		border-radius: 12px;
	}

	.well {
		position: relative;
		width: var(--board);
		aspect-ratio: 1;
	}

	.side {
		width: var(--aside);
		height: calc(var(--board) + var(--plates));
		display: grid;
		grid-template-rows: auto minmax(0, 1fr) auto;
		gap: 8px;
		min-height: 0;
	}

	.side:not(:has(.review)) {
		grid-template-rows: minmax(0, 1fr) auto;
	}

	@container (max-aspect-ratio: 1.15) {
		.arena {
			--board: min(calc(100cqw - var(--evalw)), calc(100cqh - var(--plates) - 150px));
			flex-direction: column;
			justify-content: flex-start;
			gap: 8px;
		}

		.side {
			width: calc(var(--board) + var(--evalw));
			height: auto;
			flex: 1 1 0;
			min-height: 0;
			overflow-y: auto;
		}
	}
</style>
