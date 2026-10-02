<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { SUN, type Player } from '../types';
	import { FLIP_TURN_MS } from '../session.svelte';

	let {
		player,
		ids,
		faces = ['moon', 'sun'],
		delay = 0,
		axis = 0,
		last = false,
		corner = false
	}: {
		player: Player;
		/** Prefix for the face symbols defined by the board. */
		ids: string;
		/** Symbol names for the Moon face and the Sun face. */
		faces?: readonly [string, string];
		/** ms before this disc starts turning. */
		delay?: number;
		/** Direction the eclipse travels across this disc, in degrees. */
		axis?: number;
		last?: boolean;
		corner?: boolean;
	} = $props();

	// Each flip adds half a turn, so discs always roll forward instead of snapping back.
	let turns = $state(untrack(() => (player === SUN ? 180 : 0)));
	let seen = untrack(() => player);
	let burst = $state(0);
	let hop = $state<HTMLElement>();
	let glint = $state<HTMLElement>();
	let timer: ReturnType<typeof setTimeout> | undefined;

	const sparks = Array.from({ length: 7 }, (_, i) => {
		const a = (i / 7) * Math.PI * 2 + 0.4;
		const d = 62 + (i % 3) * 14;
		return { i, x: `${Math.round(Math.cos(a) * d)}cqw`, y: `${Math.round(Math.sin(a) * d)}cqh` };
	});

	$effect.pre(() => {
		const next = player;
		untrack(() => {
			if (next === seen) return;
			seen = next;
			turns += 180;
			if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
			hop?.animate(
				[
					{ transform: 'translateZ(0) scale(1)' },
					{ transform: 'translateZ(0) scale(1.16)', offset: 0.45 },
					{ transform: 'translateZ(0) scale(1)' }
				],
				{ duration: FLIP_TURN_MS, delay, easing: 'cubic-bezier(.3,.7,.3,1)' }
			);
			glint?.animate(
				[
					{ opacity: 0, translate: '-60% -60%' },
					{ opacity: 0.95, translate: '0% 0%', offset: 0.5 },
					{ opacity: 0, translate: '60% 60%' }
				],
				{ duration: FLIP_TURN_MS, delay: delay + FLIP_TURN_MS * 0.15, easing: 'ease-out' }
			);
			clearTimeout(timer);
			timer = setTimeout(() => (burst += 1), delay + FLIP_TURN_MS * 0.55);
		});
	});

	onDestroy(() => clearTimeout(timer));
</script>

<div
	class="disc"
	class:last
	class:corner
	class:sun={player === SUN}
	class:classic={faces[0] !== 'moon'}
	style:--delay="{delay}ms"
	style:--turn="{FLIP_TURN_MS}ms"
>
	<i class="halo"></i>
	<i class="shadow"></i>
	<div class="hop" bind:this={hop}>
		<div class="coin" style:transform="rotate({axis}deg) rotateY({turns}deg) rotate({-axis}deg)">
			<svg class="face moon" viewBox="0 0 100 100"><use href="#{ids}-{faces[0]}" /></svg>
			<svg class="face sun" viewBox="0 0 100 100"><use href="#{ids}-{faces[1]}" /></svg>
		</div>
		<i class="glint" bind:this={glint}></i>
	</div>
	{#if burst}
		{#key burst}
			<span class="sparks" aria-hidden="true">
				{#each sparks as spark (spark.i)}
					<i style:--x={spark.x} style:--y={spark.y} style:--n={spark.i}></i>
				{/each}
			</span>
		{/key}
	{/if}
	{#if last}<i class="pin"></i>{/if}
</div>

<style>
	.disc {
		--tint: 170, 192, 240;
		position: absolute;
		inset: 7%;
		perspective: 600px;
		pointer-events: none;
	}

	.disc.sun {
		--tint: 240, 190, 100;
	}

	.disc.classic {
		--tint: 220, 220, 230;
	}

	.halo {
		position: absolute;
		inset: -14%;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(var(--tint), 0.34), transparent 66%);
		transition: background 400ms ease var(--delay);
	}

	.corner .halo {
		animation: corner 3.4s ease-in-out infinite;
	}

	.shadow {
		position: absolute;
		inset: 6% 2% -6% 6%;
		border-radius: 50%;
		background: radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0.55), transparent 70%);
	}

	.hop {
		position: absolute;
		inset: 0;
		transform-style: preserve-3d;
		animation: seat 420ms cubic-bezier(0.2, 0.9, 0.3, 1.15) both;
	}

	.coin {
		position: absolute;
		inset: 0;
		transform-style: preserve-3d;
		transition: transform var(--turn) cubic-bezier(0.55, 0.05, 0.25, 1) var(--delay);
	}

	.face {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		border-radius: 50%;
		backface-visibility: hidden;
		overflow: visible;
	}

	.face.sun {
		transform: rotateY(180deg);
	}

	.glint {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		opacity: 0;
		background: linear-gradient(135deg, transparent 35%, rgba(255, 252, 240, 0.85) 50%, transparent 65%);
		mix-blend-mode: screen;
		clip-path: circle(48% at 50% 50%);
	}

	.sparks {
		position: absolute;
		inset: 0;
		z-index: 2;
		container-type: size;
	}

	.sparks i {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 10%;
		aspect-ratio: 1;
		border-radius: 50%;
		background: rgb(var(--tint));
		box-shadow: 0 0 6px 1px rgba(var(--tint), 0.9);
		translate: -50% -50%;
		animation: spark 560ms cubic-bezier(0.15, 0.7, 0.3, 1) both;
		animation-delay: calc(var(--n) * 12ms);
	}

	.pin {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 16%;
		aspect-ratio: 1;
		translate: -50% -50%;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 30%, #fff6d8, #e8b85a 45%, #7a5218);
		box-shadow:
			0 0 0 1.5px rgba(30, 20, 10, 0.45),
			0 0 10px rgba(255, 210, 120, 0.7);
		animation: pin 520ms ease-out both;
		animation-delay: 200ms;
	}

	@keyframes seat {
		from {
			opacity: 0;
			transform: translateY(-14%) scale(1.3);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	@keyframes pin {
		from {
			opacity: 0;
			scale: 0.2;
		}
		to {
			opacity: 1;
			scale: 1;
		}
	}

	@keyframes spark {
		from {
			opacity: 1;
			translate: -50% -50%;
			scale: 1;
		}
		to {
			opacity: 0;
			translate: calc(-50% + var(--x)) calc(-50% + var(--y));
			scale: 0.2;
		}
	}

	@keyframes corner {
		0%,
		100% {
			opacity: 0.7;
			scale: 1;
		}
		50% {
			opacity: 1;
			scale: 1.12;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.hop,
		.pin,
		.corner .halo {
			animation: none;
		}

		.coin {
			transition: none;
		}

		.sparks {
			display: none;
		}
	}
</style>
