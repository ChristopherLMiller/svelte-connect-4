<script lang="ts">
	import { lookSettings } from '$lib/game/settings.svelte';
	import type { Player } from '$lib/game/types';

	let {
		player,
		size,
		ghost = false,
		winning = false,
		falling = false,
		vy = 0,
		vx = 0,
		scaleX = 1,
		scaleY = 1
	}: {
		player: Player;
		size: number;
		ghost?: boolean;
		winning?: boolean;
		falling?: boolean;
		vy?: number;
		vx?: number;
		scaleX?: number;
		scaleY?: number;
	} = $props();

	const protocol = $derived(lookSettings.skin === 'protocol');
	const speed = $derived(Math.hypot(vx, vy));
	const rising = $derived(vy < 0);
	const trailLen = $derived(Math.min(size * 2.45, speed * (protocol ? 0.09 : 0.072)));
	const trailAng = $derived((Math.atan2(vx, -(vy || 0.001)) * 180) / Math.PI);
	const trailOp = $derived(Math.min(0.9, Math.max(0, (speed - 18) / 1180)));
	const trailW = $derived(size * (0.68 + 0.22 * Math.min(1, speed / 1650)));
	const trailY = $derived(rising ? '88%' : '12%');
</script>

<div
	class={['disc', `player-${player}`, lookSettings.skin, { ghost, winning, falling, rising }]}
	style="--size: {size}px;"
>
	{#if falling}
		<span
			class="trail"
			style:--trail-len="{trailLen}px"
			style:--trail-w="{trailW}px"
			style:--trail-ang="{trailAng}deg"
			style:--trail-op={trailOp}
			style:--trail-y={trailY}
		></span>
	{/if}
	<div class="mass" style="--sx: {scaleX}; --sy: {scaleY};">
		{#if protocol}
			<span class="halo"></span>
			<span class="rim"></span>
			<span class="ticks"></span>
			<span class="core"></span>
			<span class="iris"></span>
			<span class="pip"></span>
		{:else}
			<span class="core"></span>
			<span class="shine"></span>
		{/if}
	</div>
</div>

<style>
	.disc {
		width: var(--size);
		height: var(--size);
		border-radius: 50%;
		position: relative;
		overflow: visible;
	}

	.mass {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		transform: scale(var(--sx), var(--sy));
		transform-origin: center bottom;
		z-index: 1;
	}

	.player-1 {
		--mid: #ff4d73;
		--deep: #b50d38;
		--glow: rgba(255, 51, 92, 0.55);
		--edge: #ff9ab0;
		--arc: #5ce1e6;
	}

	.player-2 {
		--mid: #ffd56a;
		--deep: #c48a12;
		--glow: rgba(245, 194, 75, 0.5);
		--edge: #fff1c2;
		--arc: #ffffff;
	}

	.core,
	.shine,
	.halo,
	.rim,
	.ticks,
	.iris,
	.pip,
	.trail {
		position: absolute;
	}

	.core {
		inset: 0;
		border-radius: inherit;
		background:
			radial-gradient(circle at 32% 28%, rgba(255, 255, 255, 0.78), transparent 34%),
			radial-gradient(circle at 50% 58%, var(--mid), var(--deep) 72%);
		box-shadow:
			0 12px 20px rgba(0, 0, 0, 0.35),
			0 0 18px var(--glow);
	}

	.shine {
		left: 16%;
		top: 12%;
		width: 30%;
		height: 20%;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.62);
	}

	.trail {
		left: 50%;
		top: var(--trail-y, 50%);
		width: var(--trail-w);
		height: var(--trail-len);
		border-radius: 999px;
		background: linear-gradient(to bottom, var(--glow), transparent 82%);
		box-shadow: 0 0 10px 3px color-mix(in srgb, var(--glow) 55%, transparent);
		filter: blur(1.2px);
		opacity: var(--trail-op);
		pointer-events: none;
		transform-origin: 50% 0;
		transform: translateX(-50%) rotate(var(--trail-ang));
		z-index: 2;
		will-change: transform, height, opacity, width;
	}

	.protocol .halo {
		inset: -16%;
		border-radius: 50%;
		background: radial-gradient(circle, var(--glow), transparent 68%);
		opacity: 0.9;
	}

	.protocol .rim {
		inset: 0;
		border-radius: 50%;
		background:
			conic-gradient(from 210deg, rgba(255, 255, 255, 0.2), transparent 28%, rgba(0, 0, 0, 0.35) 62%, transparent 80%),
			radial-gradient(circle at 50% 50%, transparent 62%, #0c0a14 63% 78%, var(--edge) 79% 84%, #161221 85%);
		box-shadow:
			inset 0 0 0 1px rgba(255, 255, 255, 0.18),
			0 10px 18px rgba(0, 0, 0, 0.45),
			0 0 18px var(--glow);
	}

	.protocol .ticks {
		inset: 9%;
		border-radius: 50%;
		background: repeating-conic-gradient(
			from 8deg,
			var(--arc) 0 4deg,
			transparent 4deg 30deg
		);
		mask: radial-gradient(circle, transparent 68%, #000 69% 78%, transparent 79%);
		opacity: 0.7;
	}

	.protocol .core {
		inset: 18%;
		background:
			radial-gradient(circle at 34% 30%, rgba(255, 255, 255, 0.95), transparent 28%),
			radial-gradient(circle at 50% 46%, var(--mid), var(--deep) 70%);
		box-shadow:
			inset 0 0 12px rgba(255, 255, 255, 0.28),
			0 0 16px var(--glow);
	}

	.protocol .iris {
		inset: 31%;
		clip-path: polygon(50% 4%, 92% 27%, 92% 73%, 50% 96%, 8% 73%, 8% 27%);
		background:
			linear-gradient(160deg, rgba(255, 255, 255, 0.35), transparent 42%),
			radial-gradient(circle at 50% 50%, var(--arc), transparent 56%);
		opacity: 0.55;
	}

	.protocol .pip {
		left: 46%;
		top: 44%;
		width: 8%;
		height: 8%;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 0 8px var(--arc);
	}

	.protocol .trail {
		background: linear-gradient(to bottom, var(--glow), var(--arc), transparent 80%);
		filter: blur(1.6px);
		box-shadow: 0 0 14px 4px color-mix(in srgb, var(--glow) 60%, transparent);
	}

	.protocol.player-1 {
		--mid: #ff335c;
		--deep: #5a0820;
		--glow: rgba(255, 51, 92, 0.7);
	}

	.protocol.player-2 {
		--mid: #ffe38a;
		--deep: #8a5a08;
		--glow: rgba(245, 194, 75, 0.65);
	}

	.ghost {
		opacity: 0.42;
	}

	.protocol.ghost {
		opacity: 0.58;
		filter: saturate(0.7);
	}

	.protocol.ghost .core {
		background: radial-gradient(circle at 50% 50%, transparent 40%, var(--mid) 70%);
		box-shadow: 0 0 12px var(--glow);
	}

	.winning .core {
		animation: pulse 0.8s ease-in-out infinite;
	}

	.protocol.winning .ticks {
		animation: spin 2.8s linear infinite;
	}

	.protocol.winning .halo {
		animation: pulse 0.8s ease-in-out infinite;
	}

	@keyframes pulse {
		50% {
			transform: scale(1.06);
			box-shadow:
				0 12px 20px rgba(0, 0, 0, 0.35),
				0 0 32px var(--glow);
		}
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.winning .core,
		.protocol.winning .ticks,
		.protocol.winning .halo {
			animation: none;
		}

		.trail {
			opacity: 0;
		}
	}
</style>
