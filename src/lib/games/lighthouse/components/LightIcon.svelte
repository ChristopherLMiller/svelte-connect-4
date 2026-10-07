<script lang="ts">
	let { size = 'hud' }: { size?: 'hud' | 'hero' | 'chip' } = $props();
</script>

<span class="icon {size}" aria-hidden="true">
	<svg viewBox="0 0 64 64">
		<defs>
			<linearGradient id="lh-sky" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0" stop-color="#0b1622" />
				<stop offset="1" stop-color="#1d3346" />
			</linearGradient>
			<linearGradient id="lh-beam" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0" stop-color="#ffe7a8" stop-opacity="0.9" />
				<stop offset="1" stop-color="#ffe7a8" stop-opacity="0" />
			</linearGradient>
		</defs>
		<rect x="2" y="2" width="60" height="60" rx="13" fill="url(#lh-sky)" />
		<rect x="2" y="2" width="60" height="60" rx="13" fill="none" stroke="#c89a4e" stroke-width="2" />
		<g class="beam">
			<path d="M33 19 L62 11 L62 25 Z" fill="url(#lh-beam)" />
		</g>
		<path d="M2 46 Q14 42 24 46 T46 46 T62 45 V62 H2 Z" fill="#0d2232" />
		<path d="M4 50 Q14 47 22 50" stroke="#7fb4c4" stroke-width="1.3" fill="none" opacity="0.6" />
		<path d="M38 53 Q48 50 58 53" stroke="#7fb4c4" stroke-width="1.3" fill="none" opacity="0.5" />
		<path d="M18 50 L48 50 L44 44 L22 44 Z" fill="#2a2420" />
		<path d="M27 44 L29 22 L37 22 L39 44 Z" fill="#efe6d4" />
		<path d="M27.6 37 L38.4 37 L38.9 41 L27.2 41 Z M28.6 27 L37.4 27 L37.8 31 L28.2 31 Z" fill="#b8261a" />
		<rect x="26" y="20.5" width="14" height="2" rx="0.6" fill="#1e1a17" />
		<rect x="29.5" y="14.5" width="7" height="6" rx="1" fill="#ffd27a" />
		<path d="M28.5 14.8 Q33 9.5 37.5 14.8 Z" fill="#7a1e14" />
		<circle cx="33" cy="17.5" r="5" fill="#ffd27a" opacity="0.35" />
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

	.beam {
		transform-origin: 33px 18px;
		animation: sweep 5s ease-in-out infinite;
	}

	@keyframes sweep {
		0%,
		100% {
			rotate: -6deg;
			opacity: 0.9;
		}
		50% {
			rotate: 8deg;
			opacity: 0.6;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.beam {
			animation: none;
		}
	}
</style>
