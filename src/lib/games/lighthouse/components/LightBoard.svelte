<script lang="ts">
	import { untrack } from 'svelte';
	import { createPacer } from '$lib/gl/pace';
	import { playFire, playHit, playSink, playSplash } from '../audio';
	import { clampBow, fits, shipCells } from '../engine';
	import { SeaRenderer, type Role, type SeaView, type ShipDraw } from '../render';
	import { lightView } from '../settings.svelte';
	import { opponent, type Player } from '../types';
	import type { LightSession } from '../session.svelte';

	let { session, role, label }: { session: LightSession; role: Role; label: string } = $props();

	const owner = $derived<Player>(role === 'target' ? opponent(session.viewer) : role === 'setup' ? session.setupFor : session.viewer);

	let live: SeaRenderer | null = null;
	let drag = $state<{ ship: number; offset: number; at: number; moved: boolean; x: number; y: number } | null>(null);
	let pressed = -1;
	let armed = -1;

	function bowFrom(cell: number, ship: number, offset: number) {
		const n = session.size;
		const vertical = session.placing[ship]?.vertical ?? false;
		const r = Math.max(0, Math.floor(cell / n) - (vertical ? offset : 0));
		const c = Math.max(0, (cell % n) - (vertical ? 0 : offset));
		return clampBow(n, session.lengths[ship], r * n + c, vertical);
	}

	function view(): SeaView {
		const n = session.size;
		if (role === 'setup') {
			const ships: ShipDraw[] = [];
			session.placing.forEach((p, k) => {
				if (!p) return;
				ships.push({ length: session.lengths[k], at: p.at, vertical: p.vertical, sunk: false, selected: k === session.selected, lifted: drag?.moved && drag.ship === k });
			});
			let preview: SeaView['preview'] = null;
			if (drag?.moved) {
				const vertical = session.placing[drag.ship]?.vertical ?? false;
				const cells = shipCells(n, session.lengths[drag.ship], { at: drag.at, vertical }) ?? [];
				preview = { cells, ok: fits(n, session.lengths, session.placing, drag.ship, { at: drag.at, vertical }), length: session.lengths[drag.ship], at: drag.at, vertical };
			} else {
				const spot = session.hover >= 0 ? session.hover : session.showCursor ? session.cursor : -1;
				const p = spot >= 0 && session.shipAt(spot) < 0 ? session.previewAt(spot) : null;
				if (p && !session.placing[p.ship]) preview = { cells: p.cells, ok: p.ok, length: session.lengths[p.ship], at: p.at, vertical: p.vertical };
			}
			return { role, owner, shots: new Array(n * n).fill(0), ships, hover: -1, cursor: -1, active: true, preview };
		}
		const w = session.waters?.[owner];
		if (!w) return { role, owner, shots: new Array(n * n).fill(0), ships: [], hover: -1, cursor: -1, active: false, preview: null };
		const reveal = role === 'fleet' || session.ended;
		const ships: ShipDraw[] = [];
		w.fleet.forEach((p, k) => {
			if (!w.sunk[k] && !reveal) return;
			ships.push({ length: w.lengths[k], at: p.at, vertical: p.vertical, sunk: w.sunk[k], ghost: role === 'target' && !w.sunk[k] });
		});
		const active = role === 'target' && !session.busy && !session.aiTurn && session.current === session.viewer;
		return {
			role,
			owner,
			shots: w.shots,
			ships,
			hover: session.hover,
			cursor: active && session.showCursor ? session.cursor : -1,
			active,
			preview: null
		};
	}

	function board(canvas: HTMLCanvasElement) {
		const renderer = new SeaRenderer(canvas);
		live = renderer;
		const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
		renderer.motion = !motion.matches;
		renderer.weather = untrack(() => lightView.weather);
		renderer.setSize(untrack(() => session.size));
		renderer.onFire = (pan) => playFire(pan);
		renderer.onImpact = (kind, pan) => {
			if (kind === 'miss') playSplash(pan);
			else if (kind === 'hit') playHit(pan);
			else {
				playHit(pan);
				playSink(pan);
			}
		};

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
			if (event.type === 'load') renderer.setSize(session.size);
			else if (role !== 'setup' && event.owner === untrack(() => owner)) renderer.shoot(event.index, event.result, event.reduced);
			kick();
		});

		const onMotion = () => {
			renderer.motion = !motion.matches;
			kick();
		};
		motion.addEventListener('change', onMotion);
		document.addEventListener('visibilitychange', kick);

		$effect(() => {
			renderer.weather = lightView.weather;
			untrack(kick);
		});

		$effect(() => {
			void session.size;
			renderer.setSize(session.size);
			untrack(kick);
		});

		$effect(() => {
			void session.hover;
			void session.cursor;
			void session.showCursor;
			void session.placing;
			void session.selected;
			void session.waters;
			void session.busy;
			void session.viewer;
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

	function pointAt(event: PointerEvent) {
		const canvas = event.currentTarget as HTMLCanvasElement;
		if (!live) return -1;
		const rect = canvas.getBoundingClientRect();
		return live.indexAt(event.clientX - rect.left, event.clientY - rect.top);
	}

	function down(event: PointerEvent) {
		const index = pointAt(event);
		if (index < 0) return;
		const target = event.currentTarget as HTMLElement;
		if (role === 'setup') {
			session.showCursor = false;
			const ship = session.shipAt(index);
			if (ship >= 0) {
				const p = session.placing[ship];
				if (!p) return;
				const n = session.size;
				const offset = p.vertical ? Math.floor(index / n) - Math.floor(p.at / n) : (index % n) - (p.at % n);
				drag = { ship, offset, at: p.at, moved: false, x: event.clientX, y: event.clientY };
			}
			pressed = index;
			target.setPointerCapture(event.pointerId);
			return;
		}
		if (role !== 'target' || !session.canFire(index)) return;
		pressed = index;
		session.showCursor = false;
		session.setHover(index);
		target.setPointerCapture(event.pointerId);
	}

	function move(event: PointerEvent) {
		const index = pointAt(event);
		if (role === 'setup') {
			if (drag) {
				if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 6) drag.moved = true;
				if (drag.moved && index >= 0) drag.at = bowFrom(index, drag.ship, drag.offset);
				return;
			}
			if (event.pointerType === 'mouse' || pressed >= 0) session.setHover(index);
			return;
		}
		if (role !== 'target') return;
		if (pressed >= 0 || event.pointerType === 'mouse') session.setHover(index);
	}

	function up(event: PointerEvent) {
		const index = pointAt(event);
		const was = pressed;
		pressed = -1;
		const touch = event.pointerType !== 'mouse';
		if (role === 'setup') {
			const d = drag;
			drag = null;
			if (d) {
				if (d.moved) session.moveShip(d.ship, d.at);
				else if (session.shipAt(index) === d.ship) session.rotateShip(d.ship);
			} else if (was >= 0 && index >= 0) {
				session.placeAt(index);
			}
			if (touch) session.setHover(-1);
			return;
		}
		if (role !== 'target') return;
		const aim = touch && (live?.cellPx ?? 99) < 28;
		if (was >= 0 && session.canFire(index)) {
			if (aim && armed !== index) {
				armed = index;
				session.setHover(index);
				return;
			}
			armed = -1;
			session.fireAt(index);
		}
		if (touch) session.setHover(-1);
	}

	function cancel() {
		pressed = -1;
		armed = -1;
		drag = null;
		session.setHover(-1);
	}
</script>

<div class="sea" class:target={role === 'target'}>
	<canvas
		{@attach board}
		class:pointer={(role === 'target' && session.hover >= 0) || role === 'setup'}
		onpointerdown={down}
		onpointermove={move}
		onpointerup={up}
		onpointercancel={cancel}
		onpointerleave={(event) => {
			if (event.pointerType === 'mouse' && pressed < 0 && !drag) session.setHover(-1);
		}}
		aria-label={label}
	></canvas>
</div>

<style>
	.sea {
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
