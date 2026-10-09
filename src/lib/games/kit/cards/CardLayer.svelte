<script lang="ts">
	import { untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { CARD_RATIO, backUrl, faceUrl, type BackStyle } from './faces';
	import { longName, type Card } from './deck';
	import type { Placement } from './layout';

	let {
		cards,
		width,
		back,
		onpick,
		ondrop,
		ondouble,
		dropRise = 0.7,
		lift = true
	}: {
		cards: Placement[];
		/** Card width in px. */
		width: number;
		back: BackStyle;
		onpick?: (id: Card) => void;
		/** A live card dragged upward past `dropRise` card heights and let go. */
		ondrop?: (id: Card) => void;
		/** A second tap on the same card straight after the first. */
		ondouble?: (id: Card) => void;
		dropRise?: number;
		/** Playable cards rise under a hovering pointer. */
		lift?: boolean;
	} = $props();

	const height = $derived(width / CARD_RATIO);

	/** A keyed node that moves in the DOM loses its transition, so cards keep one fixed order and z-index does the stacking. */
	const ordered = $derived([...cards].sort((a, b) => a.id - b.id));
	const backImage = $derived(`url(${backUrl(back)})`);

	/** Cards lying under another card's footprint skip the drop shadow, so piles don't darken as they grow. */
	const covered = $derived.by(() => {
		const out = new Set<Card>();
		const tx = width * 0.08;
		const ty = height * 0.14;
		for (const a of cards) {
			for (const b of cards) {
				if (b.z > a.z && Math.abs(b.x - a.x) < tx && Math.abs(b.y - a.y) < ty && (b.scale ?? 1) >= (a.scale ?? 1)) {
					out.add(a.id);
					break;
				}
			}
		}
		return out;
	});

	/** Cards on their way somewhere ride above everything until they land. */
	const flying = new SvelteSet<Card>();
	const where = new Map<Card, string>();
	const timers = new Map<Card, ReturnType<typeof setTimeout>>();

	$effect.pre(() => {
		const list = cards;
		untrack(() => {
			for (const p of list) {
				const key = `${Math.round(p.x)},${Math.round(p.y)}`;
				const before = where.get(p.id);
				where.set(p.id, key);
				if (before === undefined || before === key) continue;
				flying.add(p.id);
				clearTimeout(timers.get(p.id));
				timers.set(
					p.id,
					setTimeout(() => {
						flying.delete(p.id);
						timers.delete(p.id);
					}, 480 + (p.delay ?? 0))
				);
			}
		});
	});

	$effect(() => () => {
		for (const t of timers.values()) clearTimeout(t);
	});

	let lastTap: { id: Card; at: number } | null = null;

	let drag = $state<{ id: Card; pointer: number; x0: number; y0: number; dx: number; dy: number; moved: boolean } | null>(null);

	function down(event: PointerEvent, p: Placement) {
		if (!p.live || event.button > 0) return;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		drag = { id: p.id, pointer: event.pointerId, x0: event.clientX, y0: event.clientY, dx: 0, dy: 0, moved: false };
	}

	function move(event: PointerEvent) {
		if (!drag || event.pointerId !== drag.pointer) return;
		drag.dx = event.clientX - drag.x0;
		drag.dy = event.clientY - drag.y0;
		if (Math.hypot(drag.dx, drag.dy) > 8) drag.moved = true;
	}

	function up(event: PointerEvent) {
		if (!drag || event.pointerId !== drag.pointer) return;
		const { id, moved, dy } = drag;
		drag = null;
		if (!moved) {
			const now = performance.now();
			if (ondouble && lastTap?.id === id && now - lastTap.at < 400) {
				lastTap = null;
				ondouble(id);
			} else {
				lastTap = { id, at: now };
				onpick?.(id);
			}
		} else if (ondrop && -dy > height * dropRise) ondrop(id);
	}

	function cancel() {
		drag = null;
	}

	function key(event: KeyboardEvent, p: Placement) {
		if (!p.live) return;
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			event.stopPropagation();
			onpick?.(p.id);
		}
	}
</script>

<div class="layer" class:hover={lift} style:--w="{width}px" style:--h="{height}px" style:--back={backImage}>
	{#each ordered as p (p.id)}
		{@const dragging = drag?.id === p.id && drag.moved}
		<div
			class="card"
			class:dragging
			class:flat={covered.has(p.id)}
			style:transform="translate({p.x - width / 2 + (dragging ? drag!.dx : 0)}px, {p.y - height / 2 + (dragging ? drag!.dy : 0)}px) rotate({dragging ? 0 : p.rot}deg) scale({p.scale ?? 1})"
			style:z-index={dragging ? 2000 : flying.has(p.id) ? 1000 + p.z : p.z}
			style:transition-delay="{p.delay ?? 0}ms"
		>
			<div
				class="lift"
				class:live={p.live}
				class:raised={p.raised}
				class:dim={p.dim}
				style:--glow={p.glow ?? 'transparent'}
				role="button"
				aria-disabled={!p.live}
				tabindex={p.live ? 0 : -1}
				aria-label={p.face ? (p.label ?? longName(p.id)) : 'card'}
				aria-pressed={p.live ? !!p.raised : undefined}
				onpointerdown={(event) => down(event, p)}
				onpointermove={move}
				onpointerup={up}
				onpointercancel={cancel}
				onkeydown={(event) => key(event, p)}
			>
				<div class="spin" class:down={!p.face}>
					<div class="face" style:background-image="url({faceUrl(p.id)})"></div>
					<div class="back"></div>
				</div>
				{#if p.raised && p.face}
					<span class="pick" aria-hidden="true">
						<svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7" /></svg>
					</span>
				{/if}
			</div>
		</div>
	{/each}
</div>

<style>
	.layer {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.card {
		position: absolute;
		left: 0;
		top: 0;
		width: var(--w);
		height: var(--h);
		transition: transform 460ms cubic-bezier(0.22, 0.8, 0.3, 1);
		will-change: transform;
	}

	.card.dragging {
		transition: none;
	}

	.lift {
		position: relative;
		width: 100%;
		height: 100%;
		perspective: 900px;
		transition:
			translate 200ms ease,
			filter 200ms ease;
		border-radius: 7%;
		outline-offset: 4px;
	}

	.lift.live {
		pointer-events: auto;
		cursor: grab;
		touch-action: none;
	}

	.dragging .lift.live {
		cursor: grabbing;
	}

	@media (hover: hover) {
		.hover .lift.live:hover {
			translate: 0 -9%;
		}
	}

	.lift.raised {
		translate: 0 -22%;
	}

	.lift.raised .spin {
		box-shadow:
			0 0 0 2.5px #ffd36e,
			0 0 0 5px rgba(120, 70, 10, 0.55),
			0 0 22px 4px rgba(255, 196, 92, 0.75),
			0 10px 18px rgba(0, 0, 0, 0.5);
		animation: picked 1.6s ease-in-out infinite;
	}

	.lift.raised .face::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: linear-gradient(180deg, rgba(255, 214, 120, 0.28), rgba(255, 214, 120, 0) 55%);
		pointer-events: none;
	}

	@keyframes picked {
		50% {
			box-shadow:
				0 0 0 2.5px #ffe39a,
				0 0 0 5px rgba(120, 70, 10, 0.55),
				0 0 32px 8px rgba(255, 206, 110, 0.9),
				0 10px 18px rgba(0, 0, 0, 0.5);
		}
	}

	.pick {
		position: absolute;
		left: 30%;
		top: 0;
		width: max(18px, calc(var(--w) * 0.26));
		aspect-ratio: 1;
		translate: -50% -62%;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 30%, #ffe7a8, #e0a548 60%, #9a6420);
		box-shadow:
			0 0 0 2px rgba(60, 30, 4, 0.6),
			0 2px 6px rgba(0, 0, 0, 0.5);
		display: grid;
		place-items: center;
		animation: pick-in 220ms cubic-bezier(0.3, 1.6, 0.5, 1);
	}

	.pick svg {
		width: 66%;
		height: 66%;
		fill: none;
		stroke: #3a1f04;
		stroke-width: 2.4;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	@keyframes pick-in {
		from {
			scale: 0.2;
			opacity: 0;
		}
	}

	.lift.dim {
		filter: brightness(0.62) saturate(0.7);
	}

	.spin {
		position: absolute;
		inset: 0;
		transform-style: preserve-3d;
		transition: transform 420ms cubic-bezier(0.3, 0.7, 0.3, 1);
		border-radius: 7%;
		box-shadow:
			0 0 0 2px var(--glow),
			0 0 18px var(--glow),
			0 2px 5px rgba(0, 0, 0, 0.32);
	}

	.flat .spin {
		box-shadow:
			0 0 0 2px var(--glow),
			0 0 18px var(--glow);
	}

	.spin.down {
		transform: rotateY(180deg);
	}

	.face,
	.back {
		position: absolute;
		inset: 0;
		border-radius: 7%;
		backface-visibility: hidden;
		background-size: 100% 100%;
	}

	.back {
		transform: rotateY(180deg);
		background-image: var(--back);
	}

	@media (prefers-reduced-motion: reduce) {
		.card {
			transition-duration: 120ms;
			transition-delay: 0ms !important;
		}

		.spin {
			transition: none;
		}

		.lift {
			transition: none;
		}

		.lift.raised .spin,
		.pick {
			animation: none;
		}
	}
</style>
