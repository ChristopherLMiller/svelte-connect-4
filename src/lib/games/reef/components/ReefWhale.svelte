<script lang="ts">
	import { untrack } from 'svelte';

	let { whale = 0 }: { whale?: number } = $props();

	let pass = $state(0);
	let flip = $state(false);
	let seen = untrack(() => whale);

	$effect(() => {
		const next = whale;
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

	const SPOTS = [
		[90, 58],
		[130, 52],
		[176, 50],
		[222, 54],
		[264, 60],
		[300, 66],
		[110, 84],
		[160, 88],
		[210, 88]
	];
</script>

<div class="sea" aria-hidden="true">
	{#key pass}
		{#if pass}
			<div class="whale" class:flip onanimationend={done}>
				<div class="swim">
					<svg viewBox="0 0 400 140" preserveAspectRatio="xMidYMid meet">
						<defs>
							<linearGradient id="reef-whale-body" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0" stop-color="#1d5a7e" />
								<stop offset="0.55" stop-color="#0c2a44" />
								<stop offset="1" stop-color="#061626" />
							</linearGradient>
							<linearGradient id="reef-whale-rim" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0" stop-color="#9ff6ff" stop-opacity="0.9" />
								<stop offset="0.35" stop-color="#9ff6ff" stop-opacity="0" />
							</linearGradient>
						</defs>
						<path
							d="M18 70 C40 40 110 34 180 38 C250 42 300 50 336 62 C350 54 362 40 386 30 C380 50 374 62 372 72 C378 84 386 98 392 112 C368 102 352 90 338 80 C300 92 240 100 180 100 C120 100 60 96 30 86 C20 82 14 76 18 70 Z"
							fill="url(#reef-whale-body)"
						/>
						<path
							d="M18 70 C40 40 110 34 180 38 C250 42 300 50 336 62 C350 54 362 40 386 30"
							fill="none"
							stroke="url(#reef-whale-rim)"
							stroke-width="3"
						/>
						<path d="M120 92 C130 110 150 126 176 132 C164 118 156 104 152 96 Z" fill="#0a2236" />
						{#each [0, 1, 2, 3, 4, 5] as i (i)}
							<path d="M{36 + i * 4} {82 + i * 1.6} C{90 + i * 6} {92 + i} {140} {96} {200 - i * 6} {96 - i}" fill="none" stroke="#2a6d92" stroke-width="0.8" opacity="0.5" />
						{/each}
						<circle cx="58" cy="66" r="2.6" fill="#c8fbff" />
						{#each SPOTS as [x, y], i (i)}
							<circle cx={x} cy={y} r="2" fill="#9ff6ff" opacity={0.45 + ((i * 37) % 50) / 100} />
						{/each}
					</svg>
				</div>
			</div>
		{/if}
	{/key}
</div>

<style>
	.sea {
		position: absolute;
		inset: 0;
		z-index: 1;
		overflow: hidden;
		pointer-events: none;
		contain: layout paint;
	}

	.whale {
		position: absolute;
		top: 10%;
		left: 0;
		width: min(92vw, 980px);
		aspect-ratio: 400 / 140;
		opacity: 0;
		animation: glide 10s cubic-bezier(0.35, 0.05, 0.4, 1) forwards;
		will-change: transform, opacity;
	}

	.whale.flip {
		top: 22%;
		animation-name: glide-back;
	}

	.swim {
		width: 100%;
		height: 100%;
		animation: swim 3.2s ease-in-out infinite;
		will-change: transform;
	}

	svg {
		width: 100%;
		height: 100%;
		display: block;
		overflow: visible;
		filter: drop-shadow(0 0 18px rgba(63, 233, 255, 0.35));
	}

	.whale:not(.flip) svg {
		transform: scaleX(-1);
	}

	@keyframes glide {
		0% {
			transform: translate(-100%, 20px);
			opacity: 0;
		}
		14% {
			opacity: 0.8;
		}
		86% {
			opacity: 0.8;
		}
		100% {
			transform: translate(100vw, -30px);
			opacity: 0;
		}
	}

	@keyframes glide-back {
		0% {
			transform: translate(100vw, -10px);
			opacity: 0;
		}
		14% {
			opacity: 0.8;
		}
		86% {
			opacity: 0.8;
		}
		100% {
			transform: translate(-100%, 30px);
			opacity: 0;
		}
	}

	@keyframes swim {
		0%,
		100% {
			transform: translateY(0) rotate(0deg);
		}
		50% {
			transform: translateY(8px) rotate(-1.4deg);
		}
	}

	@keyframes appear {
		0%,
		100% {
			opacity: 0;
		}
		30%,
		70% {
			opacity: 0.6;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.whale,
		.whale.flip {
			left: 50%;
			translate: -50% 0;
			animation: appear 4s ease-in-out forwards;
		}

		.swim {
			animation: none;
		}
	}
</style>
