<script lang="ts">
	import { cubicOut, cubicIn } from 'svelte/easing';
	import type { Chip } from '../table';

	let { chips, size }: { chips: Chip[]; size: number } = $props();

	const COLOUR: Record<number, { base: string; edge: string; ink: string }> = {
		1: { base: '#efe6d2', edge: '#5d7fa8', ink: '#3d5a80' },
		5: { base: '#b8322f', edge: '#f4e6c8', ink: '#fff4e0' },
		10: { base: '#2f5e9e', edge: '#f4e6c8', ink: '#fff4e0' },
		25: { base: '#2f7d4a', edge: '#f4e6c8', ink: '#fff4e0' },
		50: { base: '#1d1a1c', edge: '#e0a548', ink: '#f0c47a' }
	};

	const calm = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	function thrown(node: HTMLElement, { chip }: { chip: Chip }) {
		const dx = chip.from.x - chip.x;
		const dy = chip.from.y - chip.y;
		if (calm()) return { duration: 160, css: (t: number) => `opacity: ${t}` };
		const spin = (chip.id.length * 97) % 360;
		return {
			delay: chip.delay ?? 0,
			duration: 520,
			easing: cubicOut,
			css: (t: number, u: number) => `translate: ${dx * u}px ${dy * u - Math.sin(t * Math.PI) * size * 1.4}px; rotate: ${u * spin}deg; scale: ${1 + Math.sin(t * Math.PI) * 0.18}`
		};
	}

	function swept(node: HTMLElement, { chip }: { chip: Chip }) {
		const dx = chip.to.x - chip.x;
		const dy = chip.to.y - chip.y;
		if (calm()) return { duration: 160, css: (t: number) => `opacity: ${t}` };
		return {
			delay: ((chip.z - 10) % 8) * 30,
			duration: 420,
			easing: cubicIn,
			css: (t: number, u: number) => `translate: ${dx * u}px ${dy * u}px`
		};
	}
</script>

<div class="chips" style:--d="{size}px">
	{#each chips as chip (chip.id)}
		{@const c = COLOUR[chip.value] ?? COLOUR[5]}
		<div
			class="chip"
			class:gone={chip.gone}
			style:transform="translate({chip.x - size / 2}px, {chip.y - size / 2}px)"
			style:z-index={chip.z}
			style:transition-delay="{chip.delay ?? 0}ms"
			style:--base={c.base}
			style:--edge={c.edge}
			style:--ink={c.ink}
			in:thrown={{ chip }}
			out:swept={{ chip }}
		>
			<span>{chip.value}</span>
		</div>
	{/each}
</div>

<style>
	.chips {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 260;
	}

	.chip {
		position: absolute;
		left: 0;
		top: 0;
		width: var(--d);
		height: var(--d);
		border-radius: 50%;
		display: grid;
		place-items: center;
		background:
			radial-gradient(circle, var(--base) 0 52%, transparent 53%),
			repeating-conic-gradient(var(--edge) 0 12deg, var(--base) 12deg 45deg);
		box-shadow:
			inset 0 0 0 1px rgba(0, 0, 0, 0.35),
			0 1px 0 rgba(0, 0, 0, 0.45);
		transition:
			transform 520ms cubic-bezier(0.3, 0.7, 0.3, 1),
			opacity 380ms ease;
	}

	.chip::before {
		content: '';
		position: absolute;
		inset: 22%;
		border-radius: 50%;
		border: 1px dashed color-mix(in srgb, var(--edge) 70%, transparent);
	}

	.chip span {
		font: 700 calc(var(--d) * 0.32) / 1 'Playfair Display SC', Georgia, serif;
		color: var(--ink);
	}

	.chip.gone {
		opacity: 0;
	}

	@media (prefers-reduced-motion: reduce) {
		.chip {
			transition-duration: 120ms;
			transition-delay: 0ms !important;
		}
	}
</style>
