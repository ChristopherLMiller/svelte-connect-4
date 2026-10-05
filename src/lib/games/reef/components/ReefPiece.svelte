<script lang="ts">
	import { cellsOf } from '../engine';
	import { cssRgb, SPECIES, type Kind } from '../types';

	let { kind, dim = false }: { kind: Kind | 0; dim?: boolean } = $props();

	const shape = $derived.by(() => {
		if (!kind) return null;
		const cells = cellsOf(kind, 0);
		const xs = cells.map(([x]) => x);
		const ys = cells.map(([, y]) => y);
		const minX = Math.min(...xs);
		const minY = Math.min(...ys);
		const w = Math.max(...xs) - minX + 1;
		const h = Math.max(...ys) - minY + 1;
		return { cells: cells.map(([x, y]) => [x - minX, y - minY] as const), w, h };
	});
</script>

<span
	class="piece"
	class:dim
	style:--w={shape?.w ?? 4}
	style:--h={shape?.h ?? 2}
	style:--rgb={kind ? cssRgb(kind) : '120, 200, 255'}
	style:--light={kind ? SPECIES[kind].light : '#fff'}
	style:--dark={kind ? SPECIES[kind].dark : '#000'}
	style:--base={kind ? SPECIES[kind].base : '#fff'}
>
	{#if shape}
		{#each shape.cells as [x, y], i (i)}
			<i style:--x={x} style:--y={y}></i>
		{/each}
	{/if}
</span>

<style>
	.piece {
		position: relative;
		display: block;
		width: calc(var(--w) * var(--m));
		height: calc(var(--h) * var(--m));
		transition: opacity 200ms ease, filter 200ms ease;
	}

	.piece.dim {
		opacity: 0.32;
		filter: saturate(0.3);
	}

	i {
		position: absolute;
		left: calc(var(--x) * var(--m));
		top: calc(var(--y) * var(--m));
		width: var(--m);
		height: var(--m);
		box-sizing: border-box;
		padding: 0;
		border-radius: 26%;
		border: max(1px, calc(var(--m) * 0.06)) solid rgba(var(--rgb), 0.95);
		background: radial-gradient(circle at 40% 36%, var(--light), var(--base) 45%, var(--dark));
		box-shadow: 0 0 calc(var(--m) * 0.5) rgba(var(--rgb), 0.45);
		scale: 0.9;
	}
</style>
