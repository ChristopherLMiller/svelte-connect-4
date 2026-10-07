<script lang="ts">
	import { fade } from 'svelte/transition';
	import { untrack } from 'svelte';
	import { ChartRenderer } from '../render';
	import { cartView } from '../settings.svelte';
	import { CHART_INFO } from '../types';
	import type { CartSession } from '../session.svelte';

	let { session }: { session: CartSession } = $props();

	let rigW = $state(0);
	let rigH = $state(0);
	const side = $derived(Math.max(0, Math.floor(Math.min(rigW, rigH, 860))));

	let renderer: ChartRenderer | null = null;
	let raf = 0;

	function kick() {
		if (!renderer || raf) return;
		raf = requestAnimationFrame(frame);
	}

	function frame(now: number) {
		raf = 0;
		if (!renderer) return;
		if (renderer.draw(now)) raf = requestAnimationFrame(frame);
	}

	function measure(node: HTMLDivElement) {
		const observer = new ResizeObserver(([entry]) => {
			rigW = entry.contentRect.width;
			rigH = entry.contentRect.height;
		});
		observer.observe(node);
		return () => observer.disconnect();
	}

	function sheet(canvas: HTMLCanvasElement) {
		const r = new ChartRenderer(canvas);
		renderer = r;
		const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
		r.motion = !motion.matches;
		const onMotion = () => (r.motion = !motion.matches);
		motion.addEventListener('change', onMotion);
		untrack(() => r.setGrid(session.grid, session.chart, session.seed));
		const observer = new ResizeObserver(() => {
			r.resize(canvas.getBoundingClientRect().width);
			kick();
		});
		observer.observe(canvas);
		const unlisten = session.listen((event) => {
			if (event.type === 'load') {
				r.setGrid(session.grid, session.chart, session.seed);
				r.resize(canvas.getBoundingClientRect().width);
			} else {
				r.onEvent(event, session.grid);
			}
			kick();
		});
		return () => {
			unlisten();
			observer.disconnect();
			motion.removeEventListener('change', onMotion);
			cancelAnimationFrame(raf);
			raf = 0;
			renderer = null;
		};
	}

	$effect(() => {
		const cursor = session.showCursor && !session.busy && !session.aiTurn ? session.cursor : -1;
		const hover = session.hover;
		const current = session.current;
		const warn = cartView.warn;
		untrack(() => {
			if (!renderer) return;
			renderer.cursor = cursor;
			renderer.hover = hover;
			renderer.current = current;
			renderer.warn = warn;
			kick();
		});
	});

	type Press = { id: number; edge: number };
	let press: Press | null = null;

	function edgeAt(event: PointerEvent) {
		const target = event.currentTarget as HTMLElement;
		const rect = target.getBoundingClientRect();
		return renderer?.pick(event.clientX - rect.left, event.clientY - rect.top, rect.width) ?? -1;
	}

	const open = (edge: number) => edge >= 0 && !session.grid.edges[edge];

	function setPress(edge: number) {
		if (!renderer || renderer.press === edge) return;
		renderer.press = edge;
		kick();
	}

	function down(event: PointerEvent) {
		if (event.pointerType === 'mouse' && event.button !== 0) return;
		session.showCursor = false;
		if (session.busy || session.aiTurn) return;
		(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
		const edge = edgeAt(event);
		press = { id: event.pointerId, edge: open(edge) ? edge : -1 };
		setPress(press.edge);
	}

	function move(event: PointerEvent) {
		const edge = edgeAt(event);
		if (event.pointerType === 'mouse' && !press) session.setHover(open(edge) ? edge : -1);
		const p = press;
		if (!p || p.id !== event.pointerId) return;
		p.edge = open(edge) ? edge : -1;
		setPress(p.edge);
	}

	function up(event: PointerEvent) {
		const p = press;
		if (!p || p.id !== event.pointerId) return;
		press = null;
		setPress(-1);
		if (p.edge >= 0) session.ink(p.edge);
	}

	function cancel() {
		press = null;
		setPress(-1);
	}

	function leave(event: PointerEvent) {
		if (event.pointerType === 'mouse') session.setHover(-1);
	}
</script>

<div class="rig" {@attach measure}>
	<div class="sheet" style:width="{side}px" style:height="{side}px">
		<div
			class="chart"
			role="application"
			aria-label="{CHART_INFO[session.chart].name}, {session.n} by {session.n} squares. Arrow keys move between lines, Space or Enter inks one."
			onpointerdown={down}
			onpointermove={move}
			onpointerup={up}
			onpointercancel={cancel}
			onpointerleave={leave}
			oncontextmenu={(event) => event.preventDefault()}
		>
			<canvas {@attach sheet}></canvas>
		</div>

		{#if session.status.type === 'playing' && session.count[1] + session.count[2] === 0 && session.lastEdge < 0 && !session.aiTurn}
			<p class="hint" transition:fade={{ duration: 200 }}>
				<span>Close a square to chart it</span>
				<b>Ink any line between two dots</b>
			</p>
		{/if}
	</div>
</div>

<style>
	.rig {
		width: 100%;
		height: 100%;
		display: grid;
		place-items: center;
		min-height: 0;
		user-select: none;
		-webkit-user-select: none;
	}

	.sheet {
		position: relative;
		border-radius: 6px;
		box-shadow:
			0 1px 0 rgba(255, 240, 200, 0.4) inset,
			0 0 0 1px rgba(90, 58, 26, 0.55),
			0 18px 38px rgba(0, 0, 0, 0.55),
			0 4px 10px rgba(0, 0, 0, 0.35),
			0 0 80px rgba(255, 170, 80, 0.12);
		rotate: -0.4deg;
	}

	.chart {
		width: 100%;
		height: 100%;
		border-radius: 6px;
		overflow: hidden;
		touch-action: none;
		cursor: crosshair;
		-webkit-tap-highlight-color: transparent;
	}

	canvas {
		display: block;
		width: 100%;
		height: 100%;
	}

	.hint {
		position: absolute;
		left: 50%;
		bottom: 9%;
		translate: -50% 0;
		margin: 0;
		display: grid;
		gap: 2px;
		justify-items: center;
		padding: 9px 18px;
		border-radius: 4px;
		background: rgba(250, 240, 214, 0.92);
		border: 1px solid rgba(90, 58, 26, 0.35);
		box-shadow: 0 8px 20px rgba(40, 20, 4, 0.25);
		color: #3b2a1a;
		pointer-events: none;
		text-align: center;
		white-space: nowrap;
	}

	.hint span {
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-size: 0.62rem;
		color: #8a3a22;
	}

	.hint b {
		font-family: Almendra, 'EB Garamond', Georgia, serif;
		font-weight: 700;
		font-size: 1.1rem;
	}
</style>
