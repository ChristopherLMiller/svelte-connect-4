<script lang="ts">
	import { fade } from 'svelte/transition';
	import { PondRenderer } from '../render';
	import { centre, LAUNCH } from '../shooter';
	import { koiPrefs } from '../settings.svelte';
	import type { KoiEvent, KoiSession } from '../session.svelte';
	import type { Spot } from '../match';

	let { session }: { session: KoiSession } = $props();

	type Gesture = { id: number; x0: number; y0: number; cell: Spot | null; aiming: boolean };

	let canvasEl: HTMLCanvasElement | null = null;
	let renderer: PondRenderer | null = null;
	let gesture: Gesture | null = null;

	const type = $derived(session.status.type);
	const field = $derived(PondRenderer.field(session.mode));

	function board(canvas: HTMLCanvasElement) {
		canvasEl = canvas;
		const r = new PondRenderer(canvas);
		renderer = r;
		const fw = field.w;
		const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
		let calm = motion.matches;
		session.calm = calm;
		const onMotion = () => {
			calm = motion.matches;
			session.calm = calm;
		};
		motion.addEventListener('change', onMotion);
		const resize = () => r.resize(canvas.getBoundingClientRect().width, fw);
		const observer = new ResizeObserver(resize);
		observer.observe(canvas);
		resize();
		const unlisten = session.listen((event) => {
			r.onEvent(event, session, !calm);
			ripple(event, canvas, r);
		});
		const undraw = session.addDrawer((_now, dt) => {
			const opts = { motion: !calm, aim: koiPrefs.aim };
			if (session.mode === 'ripples') r.drawShooter(session, dt, opts);
			else r.drawMatch(session, dt, opts);
		});
		return () => {
			undraw();
			unlisten();
			observer.disconnect();
			motion.removeEventListener('change', onMotion);
			r.clear();
			if (renderer === r) renderer = null;
			if (canvasEl === canvas) canvasEl = null;
		};
	}

	/** Send a ripple across the pond backdrop from where the action was. */
	function ripple(event: KoiEvent, canvas: HTMLCanvasElement, r: PondRenderer) {
		let points: Array<{ x: number; y: number }> = [];
		let strength = 0.6;
		if (event.type === 'land') {
			const at = { top: event.top };
			points = [...event.result.popped, ...event.result.dropped].map((p) => centre(at, p.r, p.c));
			if (!points.length && event.result.plan.cell) points = [centre(at, event.result.plan.cell[0], event.result.plan.cell[1])];
			strength = 0.4 + Math.min(1, points.length / 10);
		} else if (event.type === 'step') {
			points = event.step.cleared.map((g) => ({ x: g.c + 0.5, y: g.r + 0.5 }));
			strength = 0.4 + Math.min(1, points.length / 12) + event.step.chain * 0.1;
		} else if (event.type === 'cleared') {
			points = [{ x: field.w / 2, y: field.h / 2 }];
			strength = 1.4;
		}
		if (!points.length) return;
		const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
		const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
		const rect = canvas.getBoundingClientRect();
		const f = r.fieldPoint({ x: cx, y: cy });
		session.splash((rect.left + f.x * rect.width) / window.innerWidth, (rect.top + f.y * rect.height) / window.innerHeight, strength);
	}

	function local(event: PointerEvent) {
		if (!canvasEl) return null;
		const rect = canvasEl.getBoundingClientRect();
		return {
			x: (event.clientX - rect.left) * (canvasEl.width / rect.width),
			y: (event.clientY - rect.top) * (canvasEl.height / rect.height)
		};
	}

	function aimFrom(event: PointerEvent) {
		const p = local(event);
		if (!p || !renderer) return;
		const angle = renderer.aimAt(p.x, p.y);
		if (angle != null) session.setAim(angle);
	}

	function down(event: PointerEvent) {
		if (type === 'paused') {
			session.togglePause();
			return;
		}
		if (type !== 'playing' || !renderer) return;
		const p = local(event);
		if (!p) return;
		if (session.mode === 'ripples') {
			if (renderer.onNext(p.x, p.y)) {
				session.swapBloom();
				return;
			}
			(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
			gesture = { id: event.pointerId, x0: event.clientX, y0: event.clientY, cell: null, aiming: true };
			aimFrom(event);
			return;
		}
		const cell = renderer.cellAt(p.x, p.y);
		if (!cell) return;
		(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
		gesture = { id: event.pointerId, x0: event.clientX, y0: event.clientY, cell, aiming: false };
	}

	function move(event: PointerEvent) {
		if (session.mode === 'ripples') {
			if (type !== 'playing') return;
			if (event.pointerType === 'mouse' || (gesture && gesture.id === event.pointerId)) aimFrom(event);
			return;
		}
		const g = gesture;
		if (!g || g.id !== event.pointerId || !g.cell || !renderer || !canvasEl) return;
		const cssCell = canvasEl.getBoundingClientRect().width / field.w;
		const dx = event.clientX - g.x0;
		const dy = event.clientY - g.y0;
		if (Math.max(Math.abs(dx), Math.abs(dy)) < cssCell * 0.4) return;
		const to = Math.abs(dx) > Math.abs(dy) ? { r: g.cell.r, c: g.cell.c + Math.sign(dx) } : { r: g.cell.r + Math.sign(dy), c: g.cell.c };
		gesture = null;
		session.swap(g.cell, to);
	}

	function up(event: PointerEvent) {
		const g = gesture;
		if (!g || g.id !== event.pointerId) return;
		gesture = null;
		if (type !== 'playing') return;
		if (session.mode === 'ripples') {
			const p = local(event);
			if (!p || !renderer) return;
			// Letting go below the lily pad calls the shot off.
			if (p.y / (canvasEl!.height / field.h) > LAUNCH.y + 0.4) return;
			aimFrom(event);
			session.shoot();
			return;
		}
		if (g.cell) session.pick(g.cell);
	}

	function cancel() {
		gesture = null;
	}
</script>

<div class="rig" class:still={type === 'paused' || type === 'over'}>
	<div
		class="frame"
		style:--fw={field.w}
		style:--fh={field.h}
		class:currents={session.mode === 'currents'}
		role="application"
		aria-label={session.mode === 'ripples'
			? 'Ripples. Aim with the pointer or the arrow keys; click, tap or press Space to flick a bloom; X or Tab swaps in the next bloom.'
			: 'Currents. Tap two neighbouring blooms or drag one onto its neighbour to swap them; or move with the arrow keys, Space to pick, then an arrow to swap.'}
		onpointerdown={down}
		onpointermove={move}
		onpointerup={up}
		onpointercancel={cancel}
	>
		{#key session.mode}
			<canvas {@attach board}></canvas>
		{/key}

		{#if type === 'ready'}
			<p class="hint" transition:fade={{ duration: 200 }}>
				<span>{session.mode === 'ripples' ? 'Ripples' : `Reach ${session.target.toLocaleString()} in ${session.moves} moves`}</span>
				<b>Stage {session.stage}</b>
			</p>
		{:else if type === 'paused'}
			<p class="hint" transition:fade={{ duration: 160 }}>
				<span>The pond is still</span>
				<b>Paused</b>
				<small>Esc, Space or tap to carry on</small>
			</p>
		{:else if type === 'cleared'}
			<p class="hint clear" transition:fade={{ duration: 200 }}>
				<span>Stage {session.stage} clear</span>
				<b>+{session.bonus.toLocaleString()}</b>
				<small>{session.mode === 'ripples' ? 'A fresh pond' : 'Moves left over pay 60 each'}</small>
			</p>
		{/if}

		{#key session.callout?.id}
			{#if session.callout && type === 'playing'}
				<p class="callout" class:big={session.callout.big}>
					<strong>{session.callout.label}</strong>
					{#if session.callout.points}<span>+{session.callout.points.toLocaleString()}</span>{/if}
				</p>
			{/if}
		{/key}
	</div>
</div>

<style>
	.rig {
		width: 100%;
		height: 100%;
		display: grid;
		place-items: center;
		container-type: size;
	}

	.frame {
		position: relative;
		width: min(100cqw, calc(100cqh * var(--fw) / var(--fh)));
		aspect-ratio: var(--fw) / var(--fh);
		border-radius: 22px;
		background: linear-gradient(180deg, rgba(8, 46, 42, 0.36), rgba(6, 34, 31, 0.46));
		box-shadow:
			0 18px 40px rgba(0, 30, 24, 0.3),
			inset 0 0 0 1px rgba(220, 255, 235, 0.2);
		backdrop-filter: blur(2px);
	}

	canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
		touch-action: none;
		cursor: crosshair;
		border-radius: inherit;
	}

	.currents canvas {
		cursor: pointer;
	}

	.still canvas {
		filter: saturate(0.7) brightness(0.85);
	}

	.hint {
		position: absolute;
		left: 50%;
		top: 42%;
		translate: -50% -50%;
		margin: 0;
		padding: 14px 22px;
		border-radius: 18px;
		display: grid;
		gap: 2px;
		text-align: center;
		pointer-events: none;
		background: rgba(8, 40, 36, 0.82);
		border: 1px solid rgba(255, 179, 71, 0.3);
		box-shadow: 0 12px 30px rgba(0, 30, 24, 0.4);
		white-space: nowrap;
	}

	.hint span {
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-size: 0.66rem;
		font-weight: 700;
		color: #ffb347;
	}

	.hint b {
		font-family: 'Kaisei Decol', Georgia, serif;
		font-size: 1.8rem;
		color: #fff8ea;
	}

	.hint small {
		color: #b6d2c5;
		font-size: 0.8rem;
	}

	.hint.clear b {
		color: #ffd27a;
	}

	.callout {
		position: absolute;
		left: 50%;
		top: 30%;
		margin: 0;
		display: grid;
		justify-items: center;
		pointer-events: none;
		color: #fff8ea;
		text-shadow:
			0 2px 0 rgba(217, 83, 28, 0.5),
			0 4px 14px rgba(0, 30, 24, 0.7);
		animation: float 1.3s ease-out forwards;
		white-space: nowrap;
	}

	.callout strong {
		font-family: 'Kaisei Decol', Georgia, serif;
		font-size: 1.4rem;
	}

	.callout.big strong {
		font-size: 2rem;
		color: #ffd27a;
	}

	.callout span {
		font-weight: 700;
		font-size: 1rem;
	}

	@keyframes float {
		0% {
			opacity: 0;
			translate: -50% 10px;
		}
		15% {
			opacity: 1;
			translate: -50% 0;
		}
		75% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			translate: -50% -26px;
		}
	}

	@keyframes still {
		0%,
		100% {
			opacity: 0;
		}
		15%,
		75% {
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.callout {
			translate: -50% 0;
			animation-name: still;
		}
	}
</style>
