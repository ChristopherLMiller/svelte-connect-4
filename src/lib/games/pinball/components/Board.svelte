<script lang="ts">
	import { fade } from 'svelte/transition';
	import { TableRenderer } from '../engine/render';
	import { FIELD_H, FIELD_W } from '../engine/def';
	import type { PinballSession } from '../session.svelte';

	let { session }: { session: PinballSession } = $props();

	type Role = 'left' | 'right' | 'plunger';
	type Touch = { role: Role; y: number; at: number; nudged: boolean };
	const pointers = new Map<number, Touch>();
	let frameEl: HTMLDivElement | null = null;

	const type = $derived(session.status.type);
	const serving = $derived(session.phase === 'serve' && type === 'playing');
	const meta = $derived(session.spec.meta);

	function table(canvas: HTMLCanvasElement) {
		const spec = session.spec;
		const r = new TableRenderer(canvas, spec.rules.def, spec.art);
		const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
		let calm = motion.matches;
		session.calm = calm;
		const onMotion = () => {
			calm = motion.matches;
			session.calm = calm;
		};
		motion.addEventListener('change', onMotion);
		const resize = () => r.resize(canvas.getBoundingClientRect().width);
		const observer = new ResizeObserver(resize);
		observer.observe(canvas);
		resize();
		let alive = true;
		document.fonts?.ready.then(() => alive && r.repaint());
		const unlisten = session.listen((event) => r.onEvent(event, !calm));
		const undraw = session.addDrawer((now, dt) => r.draw({ game: session.game, status: session.status }, now, dt, { motion: !calm }));
		return () => {
			alive = false;
			undraw();
			unlisten();
			observer.disconnect();
			motion.removeEventListener('change', onMotion);
			r.clear();
		};
	}

	function count(role: Role) {
		let n = 0;
		for (const v of pointers.values()) if (v.role === role) n += 1;
		return n;
	}

	function down(event: PointerEvent) {
		if (event.pointerType === 'mouse' && event.button !== 0) return;
		if (type === 'paused') {
			session.togglePause();
			return;
		}
		if (type !== 'playing') return;
		event.preventDefault();
		(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
		let role: Role;
		if (session.waitingToShoot()) role = 'plunger';
		else {
			const rect = (frameEl ?? (event.currentTarget as HTMLElement)).getBoundingClientRect();
			role = event.clientX < rect.left + rect.width / 2 ? 'left' : 'right';
		}
		pointers.set(event.pointerId, { role, y: event.clientY, at: performance.now(), nudged: false });
		if (role === 'plunger') session.plunger(true);
		else session.flipper(role, true);
	}

	/** A quick flick upward bumps the cabinet. */
	function move(event: PointerEvent) {
		const p = pointers.get(event.pointerId);
		if (!p || p.nudged || p.role === 'plunger' || event.pointerType === 'mouse') return;
		if (p.y - event.clientY > 36 && performance.now() - p.at < 260) {
			p.nudged = true;
			session.nudge(p.role === 'left' ? 1 : -1);
		}
	}

	function up(event: PointerEvent) {
		const p = pointers.get(event.pointerId);
		if (!p) return;
		pointers.delete(event.pointerId);
		if (count(p.role)) return;
		if (p.role === 'plunger') session.plunger(false);
		else session.flipper(p.role, false);
	}
</script>

<div
	class="rig"
	class:still={type === 'paused' || type === 'over'}
	role="application"
	aria-label="Pinball table. Tap or hold the left half for the left flippers and the right half for the right flippers. When a ball waits in the shooter lane, hold anywhere to draw the plunger and let go to shoot. Flick upward to nudge. Keys: Z or the left arrow, slash or the right arrow, Space for the plunger, and the up arrow or N to nudge."
	onpointerdown={down}
	onpointermove={move}
	onpointerup={up}
	onpointercancel={up}
	onlostpointercapture={up}
	oncontextmenu={(event) => event.preventDefault()}
>
	<div class="frame" bind:this={frameEl} style:--fw={FIELD_W} style:--fh={FIELD_H}>
		{#key session.table}
			<canvas {@attach table}></canvas>
		{/key}

		{#if type === 'ready'}
			<p class="hint" transition:fade={{ duration: 200 }}>
				<span>Ball {session.ball} of {session.balls}</span>
				<b>{meta.words.ready}</b>
			</p>
		{:else if type === 'paused'}
			<p class="hint" transition:fade={{ duration: 160 }}>
				<span>{meta.words.paused}</span>
				<b>Paused</b>
				<small>Esc, Space or tap to carry on</small>
			</p>
		{:else if session.tally && type === 'playing'}
			<p class="hint tally" transition:fade={{ duration: 200 }}>
				<span>Ball {session.ball} over</span>
				{#if session.tally.tilted}
					<b>Tilted</b>
					<small>No bonus this ball</small>
				{:else}
					<b>+{session.tally.bonus.toLocaleString()}</b>
					<small>{session.tally.count} {session.spec.rules.bonusName} × {session.spec.rules.bonusValue.toLocaleString()} × {session.tally.mult}</small>
				{/if}
			</p>
		{:else if serving}
			<p class="serve" transition:fade={{ duration: 200 }}>
				<span>Hold to draw the plunger, let go to shoot</span>
				<small>or hold Space{session.spec.rules.skill ? ' · a soft shot can make the skill shot' : ''}</small>
			</p>
		{/if}

		{#key session.callout?.id}
			{#if session.callout && type === 'playing' && !session.tally}
				<p class="callout" class:big={session.callout.big}>
					<strong>{session.callout.text}</strong>
					{#if session.callout.sub}<span>{session.callout.sub}</span>{/if}
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
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
		-webkit-touch-callout: none;
	}

	.frame {
		position: relative;
		width: min(100cqw, calc(100cqh * var(--fw) / var(--fh)));
		aspect-ratio: var(--fw) / var(--fh);
		border-radius: 18px 18px 10px 10px;
		overflow: hidden;
		box-shadow:
			0 0 0 3px #1c1410,
			0 0 0 5px var(--sb-accent),
			0 0 0 7px #120c08,
			0 24px 60px rgba(0, 0, 0, 0.6),
			0 0 70px color-mix(in srgb, var(--sb-hot) 18%, transparent);
	}

	canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
	}

	.still canvas {
		filter: saturate(0.6) brightness(0.75);
	}

	.hint,
	.serve {
		position: absolute;
		left: 50%;
		translate: -50% -50%;
		margin: 0;
		display: grid;
		text-align: center;
		pointer-events: none;
	}

	.hint {
		top: 44%;
		padding: 12px 20px;
		gap: 2px;
		border-radius: 14px;
		background: var(--sb-panel);
		border: 1px solid color-mix(in srgb, var(--sb-accent) 40%, transparent);
		box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
		white-space: nowrap;
	}

	.hint span {
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-size: 0.7rem;
		font-weight: 700;
		color: var(--sb-accent);
	}

	.hint b {
		font-family: var(--sb-display);
		font-weight: 400;
		font-size: 2rem;
		letter-spacing: 0.04em;
		color: var(--sb-ink);
	}

	.hint small {
		color: var(--sb-muted);
		font-size: 0.82rem;
	}

	.tally b {
		color: var(--sb-accent);
		font-family: 'Barlow Condensed', sans-serif;
		font-weight: 700;
	}

	.serve {
		top: 62%;
		width: 86%;
		gap: 4px;
		padding: 8px 12px;
		border-radius: 12px;
		background: color-mix(in srgb, var(--sb-bg) 75%, transparent);
		color: var(--sb-ink);
		font-weight: 600;
		font-size: 0.9rem;
		animation: breathe 2.2s ease-in-out infinite;
	}

	.serve small {
		color: var(--sb-muted);
		font-size: 0.74rem;
		font-weight: 500;
	}

	.callout {
		position: absolute;
		left: 50%;
		top: 30%;
		margin: 0;
		display: grid;
		justify-items: center;
		gap: 2px;
		pointer-events: none;
		color: var(--sb-ink);
		text-align: center;
		white-space: nowrap;
		text-shadow:
			0 2px 0 color-mix(in srgb, var(--sb-hot) 60%, #000),
			0 4px 16px rgba(0, 0, 0, 0.8);
		animation: rise 1.6s ease-out forwards;
	}

	.callout strong {
		font-family: var(--sb-display);
		font-weight: 400;
		letter-spacing: 0.04em;
		font-size: clamp(1.3rem, 7cqw, 1.9rem);
	}

	.callout.big strong {
		font-size: clamp(1.8rem, 10cqw, 2.8rem);
		color: var(--sb-accent);
	}

	.callout span {
		font-family: 'Barlow Condensed', sans-serif;
		font-weight: 600;
		font-size: 1rem;
		color: var(--sb-muted);
	}

	@keyframes rise {
		0% {
			opacity: 0;
			translate: -50% 10px;
			scale: 0.9;
		}
		12% {
			opacity: 1;
			translate: -50% 0;
			scale: 1;
		}
		80% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			translate: -50% -20px;
		}
	}

	@keyframes still {
		0%,
		100% {
			opacity: 0;
		}
		12%,
		80% {
			opacity: 1;
		}
	}

	@keyframes breathe {
		0%,
		100% {
			opacity: 0.75;
		}
		50% {
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.callout {
			translate: -50% 0;
			animation-name: still;
		}

		.serve {
			animation: none;
		}
	}
</style>
