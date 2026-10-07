<script lang="ts">
	import { untrack } from 'svelte';
	import { createPacer } from '$lib/gl/pace';
	import { playPlace } from '../audio';
	import { GardenRenderer, type GardenView } from '../render';
	import { zenView } from '../settings.svelte';
	import type { ZenSession } from '../session.svelte';

	let { session }: { session: ZenSession } = $props();

	let pressed = -1;
	let live: GardenRenderer | null = null;

	function view(): GardenView {
		const human = !session.busy && !session.aiTurn;
		return {
			current: session.current,
			human,
			hover: session.hover,
			cursor: human && session.showCursor ? session.cursor : -1,
			ghost: zenView.ghost,
			last: session.last,
			threats: session.threats,
			warn: zenView.warn,
			win: session.status.type === 'won' ? session.status.line : null,
			winner: session.status.type === 'won' ? session.status.winner : 0
		};
	}

	function board(canvas: HTMLCanvasElement) {
		const renderer = new GardenRenderer(canvas);
		live = renderer;
		const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
		renderer.motion = !motion.matches;
		renderer.season = untrack(() => zenView.season);
		renderer.onLand = (index, player, pan) => playPlace(player, pan, session.moves.length + index);
		renderer.load(untrack(() => session.board), untrack(() => session.size));

		let raf = 0;
		const pace = createPacer();
		const frame = (now: number) => {
			raf = 0;
			if (pace.due(now)) renderer.draw(now, view());
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
			if (event.type === 'load') renderer.load(event.board, event.size, event.lifted);
			else renderer.place(event.index, event.player, event.reduced);
			kick();
		});

		const onMotion = () => {
			renderer.motion = !motion.matches;
			kick();
		};
		motion.addEventListener('change', onMotion);
		document.addEventListener('visibilitychange', kick);

		$effect(() => {
			renderer.season = zenView.season;
			untrack(kick);
		});

		$effect(() => {
			void session.hover;
			void session.cursor;
			void session.showCursor;
			void session.current;
			void session.busy;
			void session.status;
			void session.threats;
			void zenView.warn;
			void zenView.ghost;
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

	function pointAt(event: PointerEvent) {
		const canvas = event.currentTarget as HTMLCanvasElement;
		if (!live) return -1;
		const rect = canvas.getBoundingClientRect();
		return live.indexAt(event.clientX - rect.left, event.clientY - rect.top);
	}

	function down(event: PointerEvent) {
		const index = pointAt(event);
		if (!session.canPlace(index)) return;
		pressed = index;
		session.showCursor = false;
		session.setHover(index);
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}

	function move(event: PointerEvent) {
		const index = pointAt(event);
		if (pressed >= 0 || event.pointerType === 'mouse') session.setHover(index);
	}

	/** On small points a fingertip covers the target, so touch aims first and places on a second tap. */
	let armed = -1;

	function up(event: PointerEvent) {
		const index = pointAt(event);
		const was = pressed;
		pressed = -1;
		const touch = event.pointerType !== 'mouse';
		const aim = touch && (live?.cellPx ?? 99) < 30;
		if (was >= 0 && session.canPlace(index)) {
			if (aim && armed !== index) {
				armed = index;
				session.setHover(index);
				return;
			}
			armed = -1;
			session.choose(index);
		}
		if (touch) session.setHover(-1);
	}

	function cancel() {
		pressed = -1;
		armed = -1;
		session.setHover(-1);
	}
</script>

<div class="bed">
	<canvas
		{@attach board}
		class:pointer={session.hover >= 0}
		onpointerdown={down}
		onpointermove={move}
		onpointerup={up}
		onpointercancel={cancel}
		onpointerleave={(event) => {
			if (event.pointerType === 'mouse' && pressed < 0) session.setHover(-1);
		}}
		aria-label="Zen Garden board"
	></canvas>
</div>

<style>
	.bed {
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
</style>
