<script lang="ts">
	import type { FxBurst } from '../types';

	let {
		fx,
		x,
		y
	}: {
		fx: FxBurst;
		x: number;
		y: number;
	} = $props();

	const count = $derived(
		fx.kind === 'win' ? 22 : fx.kind === 'block' ? 16 : Math.round(7 + (fx.impact ?? 0.45) * 10)
	);
	const shards = $derived(
		Array.from({ length: count }, (_, i) => ({
			a: (360 / count) * i + (i % 4) * 6,
			d: (fx.kind === 'impact' ? 36 : 70) + (i % 6) * (fx.kind === 'impact' ? 12 : 22)
		}))
	);
	const power = $derived(fx.kind === 'impact' ? Math.max(0.35, fx.impact ?? 0.5) : 1);
</script>

<div
	class="boom {fx.kind} player-{fx.player}"
	style="left: {x}px; top: {y}px; --pow: {power};"
>
	<span class="shock"></span>
	<span class="flash"></span>
	{#each shards as shard, i (i)}
		<i class="shard" style="--a: {shard.a}deg; --d: {shard.d}px;"></i>
	{/each}
	{#if fx.kind !== 'impact'}
		<strong>{fx.kind === 'block' ? 'DENIED' : 'FOUR'}</strong>
	{/if}
</div>

<style>
	.boom {
		position: absolute;
		width: 0;
		height: 0;
		z-index: 6;
		pointer-events: none;
		translate: 0 0;
		--pow: 1;
	}

	.shock,
	.flash,
	.shard,
	strong {
		position: absolute;
		left: 0;
		top: 0;
		will-change: transform, opacity;
	}

	.shock {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 3px solid #fff;
		translate: -50% -50%;
		animation: shock 0.7s ease-out forwards;
	}

	.impact .shock {
		width: calc(18px + var(--pow) * 16px);
		height: calc(18px + var(--pow) * 16px);
		border-width: 2px;
		animation-duration: 0.42s;
	}

	.flash {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		translate: -50% -50%;
		animation: flash 0.45s ease-out forwards;
	}

	.block .flash {
		background: #5ce1e6;
		box-shadow: 0 0 24px #5ce1e6;
	}

	.win .flash,
	.player-1.win .flash {
		background: #ff335c;
		box-shadow: 0 0 28px #ff335c;
	}

	.player-2.win .flash {
		background: #f5c24b;
		box-shadow: 0 0 28px #f5c24b;
	}

	.impact .flash {
		background: #fff;
		box-shadow: 0 0 18px color-mix(in srgb, var(--flash, #fff) 80%, transparent);
		animation-duration: 0.28s;
	}

	.player-1.impact .flash {
		background: #ff8aa3;
		box-shadow: 0 0 22px #ff335c;
	}

	.player-2.impact .flash {
		background: #ffe38a;
		box-shadow: 0 0 22px #f5c24b;
	}

	.block .shock {
		border-color: #5ce1e6;
	}

	.impact .shock {
		border-color: rgba(255, 255, 255, 0.9);
	}

	.player-1.impact .shock {
		border-color: #ff6b8a;
	}

	.player-2.impact .shock {
		border-color: #ffe08a;
	}

	.shard {
		width: 10px;
		height: 4px;
		border-radius: 2px;
		background: #fff;
		translate: -50% -50%;
		animation: shard 0.65s ease-out forwards;
	}

	.block .shard {
		background: #9ff7fa;
	}

	.player-1 .shard {
		background: #ff6b8a;
	}

	.player-2.win .shard {
		background: #ffe08a;
	}

	.impact .shard {
		width: 7px;
		height: 3px;
		animation-duration: 0.38s;
	}

	.player-1.impact .shard {
		background: #ff9ab0;
	}

	.player-2.impact .shard {
		background: #ffe38a;
	}

	strong {
		translate: -50% -120%;
		font-family: var(--font-display);
		letter-spacing: 0.18em;
		font-size: 0.78rem;
		white-space: nowrap;
		text-shadow: 0 0 16px currentColor;
		animation: stamp 0.7s ease-out forwards;
	}

	.block strong {
		color: #5ce1e6;
	}

	.win.player-1 strong {
		color: #ff335c;
	}

	.win.player-2 strong {
		color: #f5c24b;
	}

	@keyframes shock {
		to {
			transform: scale(calc(5 + var(--pow, 1) * 4));
			opacity: 0;
		}
	}

	@keyframes flash {
		0% {
			transform: scale(0.4);
			opacity: 1;
		}
		100% {
			transform: scale(3.2);
			opacity: 0;
		}
	}

	@keyframes shard {
		0% {
			transform: rotate(var(--a)) translateX(0) scale(1);
			opacity: 1;
		}
		100% {
			transform: rotate(var(--a)) translateX(var(--d)) scale(0.2);
			opacity: 0;
		}
	}

	@keyframes stamp {
		0% {
			transform: scale(0.6) translateY(8px);
			opacity: 0;
		}
		25% {
			transform: scale(1.15) translateY(0);
			opacity: 1;
		}
		100% {
			transform: scale(1) translateY(-10px);
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.shock,
		.flash,
		.shard,
		strong {
			animation-duration: 0.01ms;
		}
	}
</style>
