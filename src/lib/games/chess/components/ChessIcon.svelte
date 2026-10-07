<script lang="ts">
	let { size = 'hud' }: { size?: 'hud' | 'hero' | 'chip' } = $props();
</script>

<span class="icon {size}" aria-hidden="true">
	<svg viewBox="0 0 64 64">
		<defs>
			<linearGradient id="ch-wall" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0" stop-color="#2a1610" />
				<stop offset="1" stop-color="#120907" />
			</linearGradient>
			<linearGradient id="ch-win" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0" stop-color="#0d1530" />
				<stop offset="1" stop-color="#2a3b66" />
			</linearGradient>
			<linearGradient id="ch-ivory" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0" stop-color="#fffaf0" />
				<stop offset="0.6" stop-color="#e6d6b4" />
				<stop offset="1" stop-color="#a8916a" />
			</linearGradient>
			<linearGradient id="ch-ebony" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0" stop-color="#6b5648" />
				<stop offset="0.5" stop-color="#2d221c" />
				<stop offset="1" stop-color="#0f0b09" />
			</linearGradient>
			<radialGradient id="ch-candle" cx="0.5" cy="0.5" r="0.5">
				<stop offset="0" stop-color="#ffd58a" stop-opacity="0.8" />
				<stop offset="1" stop-color="#ffb050" stop-opacity="0" />
			</radialGradient>
		</defs>
		<rect x="2" y="2" width="60" height="60" rx="13" fill="url(#ch-wall)" />
		<path d="M20 44 V22 A12 12 0 0 1 44 22 V44 Z" fill="url(#ch-win)" />
		<path d="M32 10 V44 M20 30 H44" stroke="#120907" stroke-width="1.4" />
		<circle cx="37" cy="19" r="3" fill="#f2ecd6" opacity="0.85" />
		<g class="rain" stroke="#a9b8d8" stroke-width="0.6" opacity="0.45">
			<path d="M23 16 l-1 4 M27 26 l-1 4 M40 28 l-1 4 M35 36 l-1 4 M24 34 l-1 4" />
		</g>
		<path d="M20 44 V22 A12 12 0 0 1 44 22 V44 Z" fill="none" stroke="#c9a25a" stroke-width="1.6" />
		<circle class="glow" cx="11" cy="15" r="9" fill="url(#ch-candle)" />
		<circle class="glow" cx="53" cy="15" r="9" fill="url(#ch-candle)" />
		<path d="M2 48 H62 V49 C62 56 57 62 50 62 H14 C7 62 2 56 2 49 Z" fill="#1d2b26" />
		<path d="M2 48 H62" stroke="#c9a25a" stroke-width="1" opacity="0.6" />
		<g transform="translate(13 15) scale(0.36)">
			<path
				d="M30 79 L71 79 C72 66 68 56 67 44 C66 30 60 21 50 17 L48 8 L41 16 C34 18 28 26 24 35 C20 41 20 47 24 50 C28 53 33 51 37 48 C41 46 45 46 47 49 C42 57 33 66 30 79 Z M24 84 H76 V93 H24 Z"
				fill="url(#ch-ebony)"
				stroke="#050302"
				stroke-width="4"
				stroke-linejoin="round"
			/>
		</g>
		<g transform="translate(23 10) scale(0.44)">
			<path
				d="M31 79 C36 66 42 58 42 48 L58 48 C58 58 64 66 69 79 Z M37 42 C32 33 38 26 50 26 C62 26 68 33 63 42 Z M36 42 H64 V48 H36 Z M47 7 H53 V28 H47 Z M41 12.5 H59 V18 H41 Z M20 84 H80 V93 H20 Z M26 78 H74 V85 H26 Z"
				fill="url(#ch-ivory)"
				stroke="#3a2614"
				stroke-width="3.5"
				stroke-linejoin="round"
			/>
			<path d="M47 7 H53 V28 H47 Z M41 12.5 H59 V18 H41 Z" fill="#e2b558" />
		</g>
		<rect x="2" y="2" width="60" height="60" rx="13" fill="none" stroke="#c9a25a" stroke-width="2" />
	</svg>
</span>

<style>
	.icon {
		display: inline-grid;
		place-items: center;
		flex-shrink: 0;
	}

	.icon svg {
		width: 100%;
		height: 100%;
		filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.45));
	}

	.hud {
		width: 40px;
		height: 40px;
	}

	.hero {
		width: 92px;
		height: 92px;
	}

	.chip {
		width: 26px;
		height: 26px;
	}

	.glow {
		animation: flicker 2.4s ease-in-out infinite;
	}

	.glow + .glow {
		animation-delay: -1.1s;
	}

	.rain {
		animation: rain 1.4s linear infinite;
	}

	@keyframes flicker {
		0%,
		100% {
			opacity: 1;
		}
		40% {
			opacity: 0.7;
		}
		60% {
			opacity: 0.9;
		}
	}

	@keyframes rain {
		from {
			translate: 0 -2px;
		}
		to {
			translate: -0.5px 2px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.glow,
		.rain {
			animation: none;
		}
	}
</style>
