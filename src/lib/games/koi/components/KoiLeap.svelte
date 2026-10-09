<script lang="ts">
	import { untrack } from 'svelte';

	let { leap = 0 }: { leap?: number } = $props();

	let pass = $state(0);
	let flip = $state(false);
	let seen = untrack(() => leap);

	$effect(() => {
		const next = leap;
		untrack(() => {
			if (next > seen) {
				flip = !flip;
				pass += 1;
			}
			seen = next;
		});
	});

	function done(event: AnimationEvent) {
		if (event.target === event.currentTarget) pass = 0;
	}

	const SCALES = [
		[96, 40],
		[118, 36],
		[140, 34],
		[162, 35],
		[106, 52],
		[128, 50],
		[150, 50],
		[172, 50],
		[118, 64],
		[140, 64],
		[162, 62]
	];
</script>

<div class="air" aria-hidden="true">
	{#key pass}
		{#if pass}
			<div class="leap" class:flip onanimationend={done}>
				<span class="splash out"></span>
				<span class="splash in"></span>
				<div class="across">
					<div class="rise">
						<div class="tilt">
							<svg viewBox="0 0 260 100">
								<defs>
									<linearGradient id="koi-leap-body" x1="0" y1="0" x2="0" y2="1">
										<stop offset="0" stop-color="#fff3b0" />
										<stop offset="0.45" stop-color="#ffc93c" />
										<stop offset="1" stop-color="#d98a0b" />
									</linearGradient>
									<linearGradient id="koi-leap-fin" x1="0" y1="0" x2="1" y2="0">
										<stop offset="0" stop-color="#ffe9a0" stop-opacity="0.35" />
										<stop offset="1" stop-color="#ffd25a" stop-opacity="0.9" />
									</linearGradient>
								</defs>
								<path d="M44 50 C22 30 10 20 2 14 C10 34 12 44 10 50 C12 56 10 66 2 86 C10 80 22 70 44 50 Z" fill="url(#koi-leap-fin)" />
								<path d="M120 30 C126 12 146 6 160 8 C150 16 142 24 140 32 Z" fill="url(#koi-leap-fin)" />
								<path d="M150 66 C150 82 136 92 122 94 C130 84 134 76 134 68 Z" fill="url(#koi-leap-fin)" />
								<path
									d="M40 50 C70 28 120 22 180 28 C214 32 240 40 252 50 C240 60 214 68 180 72 C120 78 70 72 40 50 Z"
									fill="url(#koi-leap-body)"
								/>
								{#each SCALES as [x, y], i (i)}
									<path d="M{x - 7} {y} q7 7 14 0" fill="none" stroke="#c97d06" stroke-width="1.2" opacity="0.45" />
								{/each}
								<circle cx="226" cy="45" r="3.6" fill="#2a1600" />
								<circle cx="227" cy="44" r="1.2" fill="#fff" />
								<path d="M248 54 C258 58 262 64 258 70" fill="none" stroke="#d98a0b" stroke-width="1.6" stroke-linecap="round" />
							</svg>
						</div>
					</div>
				</div>
			</div>
		{/if}
	{/key}
</div>

<style>
	.air {
		position: absolute;
		inset: 0;
		z-index: 3;
		overflow: hidden;
		pointer-events: none;
		contain: layout paint;
	}

	.leap {
		--w: min(30vw, 260px);
		position: absolute;
		inset: 0;
		animation: hold 2.4s linear forwards;
	}

	.leap.flip {
		transform: scaleX(-1);
	}

	.across {
		position: absolute;
		left: 0;
		bottom: 12%;
		width: var(--w);
		aspect-ratio: 260 / 100;
		animation: across 1.9s cubic-bezier(0.45, 0.1, 0.55, 0.9) forwards;
		will-change: transform;
	}

	.rise {
		width: 100%;
		height: 100%;
		animation: rise 1.9s forwards;
		will-change: transform;
	}

	.tilt {
		width: 100%;
		height: 100%;
		animation: tilt 1.9s ease-in-out forwards;
		will-change: transform;
	}

	svg {
		width: 100%;
		height: 100%;
		display: block;
		overflow: visible;
		filter: drop-shadow(0 0 14px rgba(255, 210, 90, 0.7)) drop-shadow(0 18px 18px rgba(0, 40, 30, 0.35));
	}

	.splash {
		position: absolute;
		bottom: 12%;
		width: calc(var(--w) * 0.7);
		aspect-ratio: 3 / 1;
		border-radius: 50%;
		border: 3px solid rgba(255, 255, 255, 0.8);
		opacity: 0;
		translate: -50% 50%;
	}

	.splash.out {
		left: 22%;
		animation: splash 0.9s ease-out forwards;
	}

	.splash.in {
		left: 78%;
		animation: splash 0.9s 1.55s ease-out forwards;
	}

	@keyframes hold {
		to {
			opacity: 1;
		}
	}

	@keyframes across {
		from {
			transform: translateX(calc(22vw - var(--w) / 2));
		}
		to {
			transform: translateX(calc(78vw - var(--w) / 2));
		}
	}

	@keyframes rise {
		0% {
			transform: translateY(60%);
			animation-timing-function: cubic-bezier(0.2, 0.7, 0.4, 1);
		}
		50% {
			transform: translateY(-38vh);
			animation-timing-function: cubic-bezier(0.6, 0, 0.8, 0.3);
		}
		100% {
			transform: translateY(60%);
		}
	}

	@keyframes tilt {
		0% {
			transform: rotate(-48deg) scale(0.8);
			opacity: 0;
		}
		10% {
			opacity: 1;
		}
		50% {
			transform: rotate(0deg) scale(1);
		}
		90% {
			opacity: 1;
		}
		100% {
			transform: rotate(52deg) scale(0.8);
			opacity: 0;
		}
	}

	@keyframes splash {
		0% {
			opacity: 0.9;
			scale: 0.3;
		}
		100% {
			opacity: 0;
			scale: 1.4;
		}
	}

	@keyframes appear {
		0%,
		100% {
			opacity: 0;
		}
		30%,
		70% {
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.across {
			left: 50%;
			bottom: 40%;
			translate: -50% 0;
			animation: appear 2s ease-in-out forwards;
		}

		.rise,
		.tilt,
		.splash {
			animation: none;
		}

		.splash {
			display: none;
		}
	}
</style>
