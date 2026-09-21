<script lang="ts">
	import { scratchMark } from '../scratch';

	let {
		player,
		winning = false,
		ghost = false,
		thinking = false,
		seed
	}: {
		player: 1 | 2;
		winning?: boolean;
		ghost?: boolean;
		thinking?: boolean;
		seed?: number;
	} = $props();

	const roll = Math.floor(Math.random() * 0x7fffffff);
	const drawing = $derived(scratchMark(player, (seed ?? roll) + player * 997));
</script>

<svg
	class="mark"
	class:win={winning}
	class:ghost
	class:thinking
	class:loop={player === 2}
	viewBox="0 0 100 100"
	aria-hidden="true"
	style:--stick={drawing.width}
	style:--turn="{drawing.rotate}deg"
	style:--ox="{drawing.ox}px"
	style:--oy="{drawing.oy}px"
>
	{#each drawing.paths as d, i (`${i}-${d}`)}
		<g class="cut" style:--wait="{i * 0.2}s">
			<path class="ridge" {d} />
			{#if winning}
				<path class="aura" {d} />
			{/if}
			<path class="trough" {d} />
		</g>
	{/each}
</svg>

<style>
	.mark {
		width: 74%;
		height: 74%;
		overflow: visible;
		transform: translate(var(--ox), var(--oy)) rotate(var(--turn));
	}

	path {
		fill: none;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-dasharray: 420;
		stroke-dashoffset: 420;
		animation: scratch 0.46s ease-out forwards;
		animation-delay: var(--wait);
	}

	.ridge {
		stroke: #e8d4b4;
		stroke-width: calc(var(--stick) * 1.55);
		opacity: 0.42;
		transform: translate(0.5px, -0.6px);
	}

	.trough {
		stroke: #7a4f36;
		stroke-width: var(--stick);
		opacity: 0.88;
	}

	.aura {
		stroke: rgba(255, 214, 140, 0.7);
		stroke-width: calc(var(--stick) * 2.35);
		opacity: 0.55;
	}

	.ghost .ridge {
		opacity: 0.2;
	}

	.ghost .trough {
		stroke: #8a5c40;
		opacity: 0.4;
	}

	.ghost path {
		animation: none;
		stroke-dashoffset: 0;
	}

	.ghost.thinking .ridge {
		opacity: 0.24;
	}

	.ghost.thinking .trough {
		opacity: 0.5;
	}

	.loop:not(.ghost) path {
		animation-duration: 0.68s;
	}

	.win .ridge {
		stroke: #ffe7b0;
		opacity: 0.7;
	}

	.win .trough {
		stroke: #c48a42;
		opacity: 0.98;
	}

	@keyframes scratch {
		to {
			stroke-dashoffset: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		path {
			animation: none;
			stroke-dashoffset: 0;
		}
	}
</style>
