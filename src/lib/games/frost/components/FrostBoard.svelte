<script lang="ts">
	import { fade } from 'svelte/transition';
	import { untrack } from 'svelte';
	import { FieldRenderer } from '../render';
	import { frostPrefs } from '../settings.svelte';
	import type { FrostSession } from '../session.svelte';

	let { session }: { session: FrostSession } = $props();

	const HOLD_MS = 380;

	let rigW = $state(0);
	let rigH = $state(0);
	let slab: HTMLDivElement | null = $state(null);

	const type = $derived(session.status.type);
	const shape = $derived.by(() => {
		void session.field;
		void session.mines;
		const { w, h } = session.field;
		const flip = w > h && rigW > 0 && rigH > 0 && rigW / rigH < 1;
		return { flip, cols: flip ? h : w, rows: flip ? w : h };
	});
	const RIM = 5;
	const cellCss = $derived(
		rigW && rigH ? Math.max(10, Math.min((rigW - RIM * 2) / shape.cols, (rigH - RIM * 2) / shape.rows, 64)) : 0
	);

	let renderer: FieldRenderer | null = null;
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

	function lake(canvas: HTMLCanvasElement) {
		const r = new FieldRenderer(canvas);
		renderer = r;
		const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
		r.motion = !motion.matches;
		const onMotion = () => (r.motion = !motion.matches);
		motion.addEventListener('change', onMotion);
		r.setField(session.field, untrack(() => shape.flip));
		const observer = new ResizeObserver(() => {
			r.resize(canvas.getBoundingClientRect().width);
			kick();
		});
		observer.observe(canvas);
		void document.fonts?.load(`700 32px "Josefin Sans"`).then(() => {
			r.bake();
			kick();
		});
		const unlisten = session.listen((event) => {
			if (event.type === 'load') {
				r.setField(session.field, untrack(() => shape.flip));
				r.resize(canvas.getBoundingClientRect().width);
			} else {
				r.onEvent(event, session.field);
			}
			if (event.type === 'boom') shake();
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
		const flip = shape.flip;
		untrack(() => {
			if (!renderer) return;
			const { cols } = renderer.shape;
			if (cols === shape.cols) return;
			renderer.setField(session.field, flip);
			kick();
		});
	});

	$effect(() => {
		const cursor = session.showCursor ? session.cursor : -1;
		const paused = type === 'paused';
		untrack(() => {
			if (!renderer) return;
			renderer.cursor = cursor;
			renderer.paused = paused;
			kick();
		});
	});

	function shake() {
		if (!slab || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		slab.animate(
			[
				{ transform: 'translate(0, 0)' },
				{ transform: 'translate(-7px, 3px) rotate(-0.4deg)' },
				{ transform: 'translate(6px, -4px) rotate(0.3deg)' },
				{ transform: 'translate(-4px, 2px)' },
				{ transform: 'translate(2px, -1px)' },
				{ transform: 'translate(0, 0)' }
			],
			{ duration: 520, easing: 'ease-out' }
		);
		navigator.vibrate?.([30, 40, 60]);
	}

	type Press = { id: number; cell: number; x: number; y: number; timer: number; done: boolean; mouse: boolean };
	let press: Press | null = null;

	function cellAt(event: PointerEvent) {
		const target = event.currentTarget as HTMLElement;
		const rect = target.getBoundingClientRect();
		return renderer?.pick(event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height) ?? -1;
	}

	function setPress(cell: number) {
		if (!renderer || renderer.press === cell) return;
		renderer.press = cell;
		if (cell < 0) renderer.holdCell = -1;
		kick();
	}

	function startHold(cell: number) {
		if (!renderer) return;
		renderer.holdCell = cell;
		renderer.holdAt = performance.now();
		renderer.holdMs = HOLD_MS;
		kick();
	}

	function down(event: PointerEvent) {
		const cell = cellAt(event);
		if (cell < 0) return;
		session.showCursor = false;
		if (type === 'paused') {
			session.togglePause();
			return;
		}
		const mouse = event.pointerType === 'mouse';
		if (mouse) {
			// Ctrl+click is the macOS secondary click; browsers may report it as button 0.
			if (event.button === 2 || (event.button === 0 && (event.ctrlKey || event.metaKey || event.altKey))) {
				session.mark(cell);
				return;
			}
			if (event.button === 1) {
				event.preventDefault();
				session.dig(cell);
				return;
			}
			if (event.button !== 0) return;
		}
		(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
		const p: Press = { id: event.pointerId, cell, x: event.clientX, y: event.clientY, timer: 0, done: false, mouse };
		setPress(cell);
		if (frostPrefs.holdFlag && session.field.state[cell] !== 1) {
			startHold(cell);
			p.timer = window.setTimeout(() => {
				p.done = true;
				setPress(-1);
				if (!mouse) navigator.vibrate?.(18);
				if (session.flagMode) session.dig(cell);
				else session.mark(cell);
			}, HOLD_MS);
		}
		press = p;
	}

	function move(event: PointerEvent) {
		if (event.pointerType === 'mouse') {
			const cell = cellAt(event);
			if (renderer && renderer.hover !== cell) {
				renderer.hover = cell;
				kick();
			}
			if (cell >= 0) session.cursor = cell;
		}
		const p = press;
		if (!p || p.id !== event.pointerId || p.done) return;
		if (p.mouse) {
			if (cellAt(event) === p.cell) return;
		} else if (Math.hypot(event.clientX - p.x, event.clientY - p.y) <= Math.max(10, cellCss * 0.45)) {
			return;
		}
		clearTimeout(p.timer);
		p.done = true;
		setPress(-1);
	}

	function up(event: PointerEvent) {
		const p = press;
		if (!p || p.id !== event.pointerId) return;
		press = null;
		clearTimeout(p.timer);
		setPress(-1);
		if (!p.done) session.strike(p.cell);
	}

	function cancel() {
		if (press) clearTimeout(press.timer);
		press = null;
		setPress(-1);
	}

	function leave(event: PointerEvent) {
		if (event.pointerType !== 'mouse' || !renderer) return;
		renderer.hover = -1;
		kick();
	}
</script>

<div class="rig" {@attach measure}>
	<div
		class="slab"
		class:quiet={type === 'paused'}
		bind:this={slab}
		style:width="{cellCss * shape.cols + RIM * 2}px"
		style:height="{cellCss * shape.rows + RIM * 2}px"
		style:padding="{RIM}px"
	>
		<div
			class="ice"
			role="application"
			aria-label="Frozen lake, {session.field.w} by {session.field.h}. Arrow keys move, Space or Enter steps, F plants a flag."
			onpointerdown={down}
			onpointermove={move}
			onpointerup={up}
			onpointercancel={cancel}
			onpointerleave={leave}
			oncontextmenu={(event) => event.preventDefault()}
		>
			<canvas {@attach lake}></canvas>
		</div>

		{#if type === 'ready' && session.board !== 'daily' && session.opened === 0}
			<p class="hint" transition:fade={{ duration: 200 }}>
				<span>The first step is always safe</span>
				<b>Step anywhere</b>
			</p>
		{:else if type === 'ready' && session.board === 'daily'}
			<p class="hint low" transition:fade={{ duration: 200 }}>
				<span>Today's lake · same for everyone</span>
				<b>Start from the drilled hole</b>
			</p>
		{:else if type === 'paused'}
			<p class="hint" transition:fade={{ duration: 160 }}>
				<span>Snow has drifted over the lake</span>
				<b>Tap or P to carry on</b>
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

	.slab {
		position: relative;
		border-radius: 14px;
		box-shadow:
			0 0 0 3px rgba(255, 255, 255, 0.85),
			0 0 0 7px rgba(214, 232, 246, 0.55),
			0 18px 40px rgba(16, 24, 56, 0.45),
			0 0 60px rgba(255, 190, 160, 0.18);
		overflow: hidden;
		background: linear-gradient(160deg, #f4f9fd, #c9dceb 60%, #b5cde0);
	}

	.ice {
		width: 100%;
		height: 100%;
		border-radius: 4px;
		overflow: hidden;
		background: #0e2234;
		touch-action: none;
		cursor: pointer;
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
		top: 50%;
		translate: -50% -50%;
		margin: 0;
		display: grid;
		gap: 2px;
		justify-items: center;
		padding: 10px 18px;
		border-radius: 14px;
		background: rgba(246, 251, 255, 0.88);
		border: 1px solid rgba(255, 255, 255, 0.9);
		box-shadow: 0 10px 26px rgba(16, 24, 56, 0.25);
		color: #1d2b47;
		pointer-events: none;
		text-align: center;
		white-space: nowrap;
	}

	.hint.low {
		top: auto;
		bottom: 12px;
		translate: -50% 0;
	}

	.hint span {
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-size: 0.62rem;
		color: #2f7fb0;
	}

	.hint b {
		font-family: 'Josefin Sans', ui-sans-serif, system-ui, sans-serif;
		font-weight: 600;
		font-size: 1.1rem;
	}
</style>
