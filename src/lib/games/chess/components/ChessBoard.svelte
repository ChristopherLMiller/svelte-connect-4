<script lang="ts">
	import { untrack } from 'svelte';
	import { createPacer } from '$lib/gl/pace';
	import { playMove } from '../audio';
	import { BoardRenderer, type BoardView } from '../render';
	import { chessView } from '../settings.svelte';
	import type { ChessSession } from '../session.svelte';

	let { session }: { session: ChessSession } = $props();

	let live: BoardRenderer | null = null;
	let hover = $state(-1);
	let drag = $state<{ sq: number; x: number; y: number; moved: boolean; sx: number; sy: number; fresh: boolean } | null>(null);

	function fallen(): BoardView['fallen'] {
		const o = session.outcome;
		if (!o || (o.reason !== 'checkmate' && o.reason !== 'resign')) return null;
		if (session.shownPly !== session.records.length) return null;
		const b = session.shownBoard;
		let loser = -1;
		let winner = -1;
		for (let sq = 0; sq < 128; sq += 1) {
			if (sq & 0x88) continue;
			if (b[sq] === -6 * o.winner) loser = sq;
			if (b[sq] === 6 * o.winner) winner = sq;
		}
		return loser >= 0 ? { sq: loser, winner } : null;
	}

	function view(): BoardView {
		const last = session.lastMove;
		const review = session.review;
		const markPly = review ? review.index - 1 : -1;
		const mark = review && markPly >= 0 && review.marks[markPly] ? { sq: session.records[markPly].to, kind: review.marks[markPly]! } : null;
		return {
			board: session.shownBoard,
			bottom: session.bottom,
			coords: chessView.coords,
			hints: chessView.hints,
			selected: session.selected,
			targets: session.targets,
			last: last ? { from: last.from, to: last.to } : null,
			check: session.checkSquare,
			cursor: session.showCursor && session.screen === 'play' ? session.cursor : -1,
			hover,
			drag: drag?.moved ? { sq: drag.sq, x: drag.x, y: drag.y } : null,
			mark,
			fallen: fallen()
		};
	}

	function board(canvas: HTMLCanvasElement) {
		const renderer = new BoardRenderer(canvas);
		live = renderer;
		const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
		renderer.motion = !motion.matches;
		renderer.onImpact = () => playMove(0);

		let raf = 0;
		const pace = createPacer();
		const frame = (now: number) => {
			raf = 0;
			if (pace.due(now)) renderer.draw(now, untrack(view));
			if (!document.hidden && (renderer.motion || renderer.busy(now))) raf = requestAnimationFrame(frame);
		};
		const kick = () => {
			if (!raf && !document.hidden) raf = requestAnimationFrame(frame);
		};

		const resize = () => {
			const rect = canvas.getBoundingClientRect();
			if (!rect.width || !rect.height) return;
			renderer.resize(rect.width, rect.height);
			renderer.draw(performance.now(), untrack(view));
		};
		const observer = new ResizeObserver(resize);
		observer.observe(canvas);
		resize();
		kick();

		const off = session.listen((event) => {
			if (event.type === 'load') renderer.snap();
			else if (event.type === 'move') renderer.move(event.record, untrack(() => session.bottom), event.reduced);
			else if (event.type === 'end') {
				const f = untrack(fallen);
				if (f) renderer.fall(f.sq, event.reduced, event.outcome.reason === 'checkmate' ? 500 : 150);
			}
			kick();
		});

		const onMotion = () => {
			renderer.motion = !motion.matches;
			kick();
		};
		motion.addEventListener('change', onMotion);
		document.addEventListener('visibilitychange', kick);

		$effect(() => {
			void session.shownBoard;
			void session.bottom;
			void session.selected;
			void session.targets;
			void session.showCursor;
			void session.cursor;
			void session.review;
			void session.outcome;
			void chessView.coords;
			void chessView.hints;
			void hover;
			void drag;
			untrack(kick);
		});

		return () => {
			cancelAnimationFrame(raf);
			if (live === renderer) live = null;
			off();
			observer.disconnect();
			motion.removeEventListener('change', onMotion);
			document.removeEventListener('visibilitychange', kick);
		};
	}

	function local(event: PointerEvent) {
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		return { x: event.clientX - rect.left, y: event.clientY - rect.top };
	}

	function squareOf(event: PointerEvent) {
		if (!live) return -1;
		const p = local(event);
		return live.squareAt(p.x, p.y, session.bottom);
	}

	function down(event: PointerEvent) {
		const sq = squareOf(event);
		if (sq < 0) return;
		session.showCursor = false;
		const p = local(event);
		const wasSelected = session.selected === sq;
		if (session.grab(sq)) {
			drag = { sq, x: p.x, y: p.y, moved: false, sx: event.clientX, sy: event.clientY, fresh: !wasSelected };
			(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
			return;
		}
		drag = null;
	}

	function move(event: PointerEvent) {
		const sq = squareOf(event);
		if (event.pointerType === 'mouse') hover = sq;
		if (!drag) return;
		const p = local(event);
		if (!drag.moved && Math.hypot(event.clientX - drag.sx, event.clientY - drag.sy) > 6) drag.moved = true;
		drag.x = p.x;
		drag.y = p.y;
		if (event.pointerType !== 'mouse') hover = sq;
	}

	function up(event: PointerEvent) {
		const sq = squareOf(event);
		const d = drag;
		drag = null;
		if (event.pointerType !== 'mouse') hover = -1;
		if (d) {
			if (d.moved) {
				if (sq >= 0 && sq !== d.sq) session.drop(d.sq, sq);
				return;
			}
			if (sq === d.sq && d.fresh) return;
		}
		if (sq >= 0) session.tap(sq);
	}

	function cancel() {
		drag = null;
		hover = -1;
	}
</script>

<div class="board">
	<canvas
		{@attach board}
		class:grab={!!drag?.moved}
		class:pointer={hover >= 0 && (session.targets.includes(hover) || (session.canInput && session.board[hover] !== 0))}
		onpointerdown={down}
		onpointermove={move}
		onpointerup={up}
		onpointercancel={cancel}
		onpointerleave={(event) => {
			if (event.pointerType === 'mouse' && !drag) hover = -1;
		}}
		aria-label="Chessboard"
	></canvas>
</div>

<style>
	.board {
		position: relative;
		width: 100%;
		height: 100%;
		min-height: 0;
	}

	canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
		touch-action: none;
		-webkit-tap-highlight-color: transparent;
	}

	canvas.pointer {
		cursor: pointer;
	}

	canvas.grab {
		cursor: grabbing;
	}
</style>
