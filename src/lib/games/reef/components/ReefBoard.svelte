<script lang="ts">
	import { fade } from 'svelte/transition';
	import ReefPiece from './ReefPiece.svelte';
	import { WellRenderer } from '../render';
	import { reefPrefs } from '../settings.svelte';
	import { depthOf, zoneOf } from '../types';
	import type { Action, ReefSession } from '../session.svelte';

	let { session }: { session: ReefSession } = $props();

	type Gesture = { id: number; x0: number; y0: number; ax: number; at: number; moved: boolean; soft: boolean; cell: number };

	let wellEl: HTMLDivElement | null = null;
	let gesture: Gesture | null = null;

	const type = $derived(session.status.type);
	const live = $derived(type === 'playing');

	function well(canvas: HTMLCanvasElement) {
		const renderer = new WellRenderer(canvas);
		const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
		let calm = motion.matches;
		const onMotion = () => (calm = motion.matches);
		motion.addEventListener('change', onMotion);
		const resize = () => {
			const rect = canvas.getBoundingClientRect();
			renderer.resize(rect.width, rect.height);
		};
		const observer = new ResizeObserver(resize);
		observer.observe(canvas);
		resize();
		const unlisten = session.listen((event) => renderer.onEvent(event, session.game, !calm));
		const undraw = session.addDrawer((_now, dt) => {
			const t = session.status.type;
			renderer.draw(session.game, t === 'paused' ? 0 : dt, {
				ghost: reefPrefs.ghost,
				motion: !calm,
				active: t !== 'over' && t !== 'done'
			});
		});
		return () => {
			undraw();
			unlisten();
			observer.disconnect();
			motion.removeEventListener('change', onMotion);
			renderer.clear();
		};
	}

	function down(event: PointerEvent) {
		if (type === 'paused') {
			session.togglePause();
			return;
		}
		if (event.pointerType === 'mouse' || !wellEl) return;
		const rect = wellEl.getBoundingClientRect();
		gesture = {
			id: event.pointerId,
			x0: event.clientX,
			y0: event.clientY,
			ax: event.clientX,
			at: performance.now(),
			moved: false,
			soft: false,
			cell: rect.width / 10
		};
	}

	function move(event: PointerEvent) {
		const g = gesture;
		if (!g || g.id !== event.pointerId || !live) return;
		const dx = event.clientX - g.ax;
		const step = g.cell * 0.9;
		if (Math.abs(dx) >= step) {
			const n = Math.trunc(dx / step);
			for (let i = 0; i < Math.abs(n); i += 1) session.nudge(Math.sign(n));
			g.ax += n * step;
			g.moved = true;
		}
		const dy = event.clientY - g.y0;
		const across = Math.abs(event.clientX - g.x0);
		if (!g.soft && dy > g.cell * 1.4 && across < dy * 0.6) {
			g.soft = true;
			g.moved = true;
			session.setSoft(true);
		}
	}

	function up(event: PointerEvent) {
		const g = gesture;
		if (!g || g.id !== event.pointerId) return;
		gesture = null;
		if (g.soft) session.setSoft(false);
		if (!live) return;
		const dt = Math.max(1, performance.now() - g.at);
		const dy = event.clientY - g.y0;
		const across = Math.abs(event.clientX - g.x0);
		const vy = dy / dt;
		if (dy > g.cell * 2.2 && vy > 0.8 && across < dy * 0.7) session.press('drop');
		else if (dy < -g.cell * 2 && vy < -0.5 && across < -dy * 0.7) session.press('hold');
		else if (!g.moved && dt < 320 && Math.hypot(event.clientX - g.x0, dy) < g.cell * 0.6) session.press('cw');
	}

	function cancel() {
		if (gesture?.soft) session.setSoft(false);
		gesture = null;
	}

	function hold(action: Action) {
		return {
			onpointerdown: (event: PointerEvent) => {
				event.preventDefault();
				session.press(action);
			},
			onpointerup: () => session.releaseAction(action),
			onpointercancel: () => session.releaseAction(action),
			onpointerleave: () => session.releaseAction(action)
		};
	}

	const BUTTONS: Array<{ action: Action; label: string; glyph: string }> = [
		{ action: 'hold', label: 'Hold', glyph: 'hold' },
		{ action: 'ccw', label: 'Turn left', glyph: 'ccw' },
		{ action: 'left', label: 'Move left', glyph: 'left' },
		{ action: 'soft', label: 'Soft drop', glyph: 'soft' },
		{ action: 'right', label: 'Move right', glyph: 'right' },
		{ action: 'cw', label: 'Turn right', glyph: 'cw' },
		{ action: 'drop', label: 'Hard drop', glyph: 'drop' }
	];
</script>

<div class="rig" class:quiet={type === 'paused' || type === 'over' || type === 'done'}>
	<div class="tank">
		<aside class="side held" aria-label="Held piece">
			<small>Hold</small>
			<div class="slot">
				<ReefPiece kind={session.hold} dim={session.holdUsed} />
			</div>
		</aside>

		<div class="basin">
			<div
				class="well"
				bind:this={wellEl}
				role="application"
				aria-label="Lumen Reef well. Arrow keys move, Up or X turns, Space drops, C holds. On touch: drag to move, tap to turn, swipe down to drop, swipe up to hold."
				onpointerdown={down}
				onpointermove={move}
				onpointerup={up}
				onpointercancel={cancel}
			>
				<canvas {@attach well}></canvas>

				{#if type === 'ready'}
					<p class="hint" transition:fade={{ duration: 200 }}>
						<span>{depthOf(session.level).toLocaleString()} m · {zoneOf(depthOf(session.level))}</span>
						<b>{session.mode === 'sprint' ? 'Forty lines' : session.pieces ? 'Resume the dive' : 'Descend'}</b>
					</p>
				{:else if type === 'paused'}
					<p class="hint" transition:fade={{ duration: 160 }}>
						<span>Holding depth</span>
						<b>Paused</b>
						<small>Esc, Space or tap to resume</small>
					</p>
				{/if}

				{#key session.callout?.id}
					{#if session.callout && live}
						<p class="callout" class:big={session.callout.count === 4 || session.callout.perfect}>
							<strong>{session.callout.perfect ? 'Perfect clear' : session.callout.label}</strong>
							{#if session.callout.combo >= 1}<em>Chain ×{session.callout.combo}</em>{/if}
							{#if session.callout.points}<span>+{session.callout.points.toLocaleString()}</span>{/if}
						</p>
					{/if}
				{/key}
			</div>
		</div>

		<aside class="side next" aria-label="Next pieces">
			<small>Next</small>
			<ol>
				{#each session.queue as kind, i (i)}
					<li class:first={i === 0}><ReefPiece {kind} /></li>
				{/each}
			</ol>
		</aside>
	</div>

	<div class="pad" role="group" aria-label="Touch controls">
		{#each BUTTONS as b (b.action)}
			<button type="button" class={b.glyph} aria-label={b.label} {...hold(b.action)}>
				<i aria-hidden="true"></i>
			</button>
		{/each}
	</div>
</div>

<style>
	.rig {
		--bar: 0px;
		--side: 4;
		--peek: 0.5;
		--c: min(calc((100cqh - var(--bar) - 18px) / 20.6), calc((100cqw - 12px) / (11.6 + 2 * var(--side))));
		height: 100%;
		width: 100%;
		display: grid;
		align-content: center;
		justify-items: center;
		gap: 10px;
		user-select: none;
		-webkit-user-select: none;
	}

	.tank {
		display: grid;
		grid-template-columns: calc(var(--c) * var(--side)) auto calc(var(--c) * var(--side));
		align-items: start;
		gap: calc(var(--c) * 0.4);
	}

	.basin {
		padding: calc(var(--c) * 0.3);
		border-radius: calc(var(--c) * 0.5);
		background:
			radial-gradient(120% 60% at 50% 0%, rgba(63, 233, 255, 0.08), transparent 60%),
			linear-gradient(180deg, #13202c, #0a121b 60%, #070c12);
		box-shadow:
			inset 0 1px 0 rgba(160, 240, 255, 0.12),
			inset 0 0 0 1px rgba(160, 240, 255, 0.06),
			0 0 40px rgba(63, 233, 255, 0.08),
			0 24px 60px rgba(0, 0, 0, 0.6);
	}

	.well {
		position: relative;
		width: calc(var(--c) * 10);
		height: calc(var(--c) * 20);
		border-radius: calc(var(--c) * 0.22);
		overflow: hidden;
		touch-action: none;
		background:
			linear-gradient(180deg, rgba(2, 14, 28, 0.55), rgba(1, 6, 14, 0.78)),
			repeating-linear-gradient(0deg, rgba(120, 200, 255, 0.03) 0 1px, transparent 1px calc(var(--c))),
			transparent;
		box-shadow:
			inset 0 0 0 1px rgba(0, 0, 0, 0.6),
			inset 0 0 calc(var(--c) * 1.4) rgba(0, 0, 0, 0.6);
	}

	canvas {
		display: block;
		width: 100%;
		height: 100%;
	}

	.side {
		display: grid;
		gap: calc(var(--c) * 0.3);
		padding: calc(var(--c) * 0.35) calc(var(--c) * 0.25);
		border-radius: calc(var(--c) * 0.4);
		background: rgba(4, 14, 26, 0.7);
		border: 1px solid rgba(63, 233, 255, 0.14);
		justify-items: center;
	}

	.side small {
		letter-spacing: 0.2em;
		text-transform: uppercase;
		font-size: clamp(0.5rem, calc(var(--c) * 0.36), 0.68rem);
		color: #6fc7dc;
	}

	.slot {
		--m: calc(var(--c) * 0.72);
		height: calc(var(--c) * 1.8);
		display: grid;
		place-items: center;
	}

	.next ol {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: calc(var(--c) * 0.45);
		justify-items: center;
	}

	.next li {
		--m: calc(var(--c) * var(--peek));
		min-height: calc(var(--c) * 1.1);
		display: grid;
		place-items: center;
		opacity: 0.8;
	}

	.next li.first {
		--m: calc(var(--c) * 0.72);
		min-height: calc(var(--c) * 1.7);
		opacity: 1;
	}

	.hint {
		position: absolute;
		left: 50%;
		top: 38%;
		translate: -50% 0;
		width: 92%;
		margin: 0;
		display: grid;
		gap: 6px;
		text-align: center;
		text-wrap: balance;
		pointer-events: none;
		color: #d8f4ff;
		text-shadow: 0 2px 12px rgba(0, 0, 0, 0.9);
	}

	.hint span {
		font-size: clamp(0.7rem, calc(var(--c) * 0.5), 0.95rem);
		letter-spacing: 0.12em;
		color: #6fe6ff;
	}

	.hint b {
		font-family: Syne, ui-sans-serif, system-ui, sans-serif;
		font-weight: 700;
		font-size: clamp(1.1rem, calc(var(--c) * 1), 1.8rem);
		letter-spacing: 0.04em;
	}

	.hint small {
		font-size: clamp(0.68rem, calc(var(--c) * 0.46), 0.85rem);
		letter-spacing: 0.08em;
		color: #a9d8e8;
	}

	.callout {
		position: absolute;
		left: 50%;
		top: 30%;
		translate: -50% 0;
		width: 92%;
		margin: 0;
		display: grid;
		gap: 2px;
		justify-items: center;
		text-align: center;
		pointer-events: none;
		line-height: 1.05;
		text-shadow: 0 0 14px rgba(63, 233, 255, 0.8), 0 2px 8px rgba(0, 0, 0, 0.9);
		animation: rise 1.6s ease-out forwards;
	}

	.callout strong {
		font-family: Syne, ui-sans-serif, system-ui, sans-serif;
		font-weight: 800;
		font-size: clamp(0.95rem, calc(var(--c) * 0.85), 1.6rem);
		color: #e8fcff;
		letter-spacing: 0.03em;
	}

	.callout.big strong {
		font-size: clamp(1.3rem, calc(var(--c) * 1.25), 2.3rem);
		background: linear-gradient(90deg, #3fe9ff, #ff4fd8, #ffd34d);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		text-shadow: none;
		filter: drop-shadow(0 0 10px rgba(63, 233, 255, 0.6));
	}

	.callout em {
		font-style: normal;
		font-size: clamp(0.7rem, calc(var(--c) * 0.48), 0.9rem);
		color: #ffd34d;
	}

	.callout span {
		font-size: clamp(0.7rem, calc(var(--c) * 0.5), 0.95rem);
		color: #9fe9ff;
	}

	.pad {
		display: none;
		gap: 6px;
		width: min(100%, calc(var(--c) * 19));
		grid-template-columns: repeat(7, 1fr);
	}

	.pad button {
		appearance: none;
		position: relative;
		height: 52px;
		border-radius: 14px;
		border: 1px solid rgba(63, 233, 255, 0.22);
		background: rgba(4, 16, 30, 0.8);
		color: #9fe9ff;
		touch-action: none;
		-webkit-tap-highlight-color: transparent;
	}

	.pad button:active {
		background: rgba(20, 60, 90, 0.9);
		border-color: rgba(63, 233, 255, 0.6);
	}

	.pad i {
		position: absolute;
		inset: 0;
		margin: auto;
		width: 18px;
		height: 18px;
		background: currentColor;
	}

	.pad .left i {
		clip-path: polygon(70% 0, 70% 100%, 10% 50%);
	}

	.pad .right i {
		clip-path: polygon(30% 0, 30% 100%, 90% 50%);
	}

	.pad .soft i {
		clip-path: polygon(0 30%, 100% 30%, 50% 90%);
	}

	.pad .drop i {
		clip-path: polygon(0 10%, 100% 10%, 50% 60%, 0 60%, 0 75%, 100% 75%, 100% 90%, 0 90%, 0 60%, 50% 60%);
		background: #ffd34d;
	}

	.pad .cw i,
	.pad .ccw i {
		background: none;
		border: 3px solid currentColor;
		border-radius: 50%;
		border-top-color: transparent;
		box-sizing: border-box;
	}

	.pad .cw i {
		rotate: 45deg;
	}

	.pad .ccw i {
		rotate: -45deg;
	}

	.pad .hold i {
		width: 16px;
		height: 16px;
		border-radius: 4px;
		background: none;
		border: 3px solid #ff4fd8;
		box-sizing: border-box;
	}

	/* Narrow portrait: slimmer side rails so the well gets the width. */
	@container (max-aspect-ratio: 3/4) {
		.rig {
			--side: 2.7;
			--peek: 0.42;
		}

		.slot,
		.next li.first {
			--m: calc(var(--c) * 0.56);
		}

		.side {
			padding-inline: calc(var(--c) * 0.12);
		}
	}

	/* Tall phones: hold and next move to a strip above a full-width well. */
	@container (max-aspect-ratio: 5/8) {
		.rig {
			--c: min(calc((100cqh - var(--bar) - 30px) / 23.2), calc((100cqw - 12px) / 10.8));
		}

		.tank {
			grid-template-columns: auto minmax(0, 1fr);
			grid-template-areas:
				'hold next'
				'basin basin';
			gap: 8px;
		}

		.held {
			grid-area: hold;
		}

		.next {
			grid-area: next;
		}

		.basin {
			grid-area: basin;
			justify-self: center;
		}

		.side {
			grid-auto-flow: column;
			align-items: center;
			justify-content: start;
			gap: calc(var(--c) * 0.35);
			height: calc(var(--c) * 2);
			box-sizing: border-box;
			padding: 0 calc(var(--c) * 0.35);
		}

		.side small {
			writing-mode: vertical-rl;
			rotate: 180deg;
		}

		.slot {
			--m: calc(var(--c) * 0.42);
			height: auto;
			min-width: calc(var(--c) * 1.7);
		}

		.next ol {
			grid-auto-flow: column;
			align-items: center;
			gap: calc(var(--c) * 0.4);
		}

		.next li,
		.next li.first {
			--m: calc(var(--c) * 0.34);
			min-height: 0;
		}

		.next li.first {
			--m: calc(var(--c) * 0.42);
		}
	}

	@media (pointer: coarse) {
		.rig {
			--bar: 62px;
		}

		.pad {
			display: grid;
		}
	}

	@keyframes rise {
		0% {
			opacity: 0;
			transform: translateY(10px) scale(0.92);
		}
		15% {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
		75% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: translateY(-24px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.callout {
			animation-name: fade-only;
		}
	}

	@keyframes fade-only {
		0%,
		100% {
			opacity: 0;
		}
		15%,
		75% {
			opacity: 1;
		}
	}
</style>
