<script lang="ts">
	import { untrack } from 'svelte';
	import { createPacer } from '$lib/gl/pace';
	import { playLand, playLift } from '../audio';
	import { sow } from '../engine';
	import { BankRenderer, type BoardView } from '../render';
	import { seedView } from '../settings.svelte';
	import { STORE } from '../types';
	import type { SeedSession } from '../session.svelte';

	let { session }: { session: SeedSession } = $props();

	let pressed = -1;

	function view(): BoardView {
		const human = !session.busy && !session.aiTurn;
		const focus = session.hover >= 0 ? session.hover : session.showCursor ? session.cursor : -1;
		const preview = human && seedView.trail && focus >= 0 && session.moves.includes(focus) ? sow(session.board, focus, session.current) : null;
		return {
			current: session.current,
			human,
			legal: human ? session.moves : [],
			hover: session.hover,
			cursor: session.showCursor ? session.cursor : -1,
			preview,
			counts: seedView.counts,
			ended: session.ended,
			winner: session.status.type === 'won' ? session.status.winner : 0
		};
	}

	function board(canvas: HTMLCanvasElement) {
		const renderer = new BankRenderer(canvas);
		live = renderer;
		const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
		renderer.motion = !motion.matches;
		renderer.onLand = (k, index, pan) => playLand(k, index === STORE[1] || index === STORE[2], pan);
		renderer.onLift = (count, pan) => playLift(count, pan);
		renderer.load(untrack(() => session.shown));

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
			if (event.type === 'load') renderer.load(event.board);
			else renderer.sow(event.pit, event.player, event.result, event.plan);
			kick();
		});

		const onMotion = () => {
			renderer.motion = !motion.matches;
			kick();
		};
		motion.addEventListener('change', onMotion);
		document.addEventListener('visibilitychange', kick);

		$effect(() => {
			void session.hover;
			void session.cursor;
			void session.showCursor;
			void session.current;
			void session.busy;
			void session.status;
			void seedView.trail;
			void seedView.counts;
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

	let live: BankRenderer | null = null;

	function pitAt(event: PointerEvent) {
		const canvas = event.currentTarget as HTMLCanvasElement;
		if (!live) return -1;
		const rect = canvas.getBoundingClientRect();
		return live.indexAt(event.clientX - rect.left, event.clientY - rect.top);
	}

	function down(event: PointerEvent) {
		const pit = pitAt(event);
		if (!session.canSow(pit)) return;
		pressed = pit;
		session.showCursor = false;
		session.setHover(pit);
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}

	function move(event: PointerEvent) {
		const pit = pitAt(event);
		if (pressed >= 0 || event.pointerType === 'mouse') session.setHover(pit);
	}

	function up(event: PointerEvent) {
		const pit = pitAt(event);
		const was = pressed;
		pressed = -1;
		if (was >= 0 && session.canSow(pit)) session.choose(pit);
		if (event.pointerType !== 'mouse') session.setHover(-1);
	}

	function cancel() {
		pressed = -1;
		session.setHover(-1);
	}
</script>

<div class="stones">
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
		aria-label="Seedkeeper board"
	></canvas>
</div>

<style>
	.stones {
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
