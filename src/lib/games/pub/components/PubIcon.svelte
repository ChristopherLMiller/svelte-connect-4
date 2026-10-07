<script lang="ts">
	let { size = 'hud' }: { size?: 'hud' | 'hero' } = $props();
</script>

<svg class={['icon', size]} viewBox="0 0 64 64" aria-hidden="true">
	<defs>
		<radialGradient id="pub-icon-glow" cx="0.5" cy="0.38" r="0.6">
			<stop offset="0" stop-color="#ffd27a" stop-opacity="0.9" />
			<stop offset="1" stop-color="#ffd27a" stop-opacity="0" />
		</radialGradient>
		<linearGradient id="pub-icon-brass" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0" stop-color="#f6d08a" />
			<stop offset="0.5" stop-color="#c98d34" />
			<stop offset="1" stop-color="#7a4e18" />
		</linearGradient>
	</defs>
	<circle cx="32" cy="32" r="30" fill="#1f140b" stroke="#c98d34" stroke-width="2" />
	<circle cx="32" cy="26" r="24" fill="url(#pub-icon-glow)" class="glow" />
	<g transform="rotate(-24 32 50)">
		<rect x="22" y="22" width="18" height="26" rx="2.5" fill="#f6ecd4" stroke="#6b4524" stroke-width="1" />
		<text x="25" y="31" font-size="7" font-family="Georgia" fill="#1d1a18">♠</text>
	</g>
	<g transform="rotate(20 32 50)">
		<rect x="24" y="22" width="18" height="26" rx="2.5" fill="#f6ecd4" stroke="#6b4524" stroke-width="1" />
		<text x="27" y="31" font-size="7" font-family="Georgia" fill="#b3262e">♥</text>
	</g>
	<path d="M27 46 Q32 36 37 46 Z" fill="url(#pub-icon-brass)" />
	<path d="M24 48 h16 l-2 5 h-12 Z" fill="url(#pub-icon-brass)" stroke="#5a3712" stroke-width="0.8" />
	<path d="M29.5 36 C28 31 31 27 32 23 C33 27 36 31 34.5 36 Z" fill="#ffcf6a" class="flame" />
	<path d="M30.8 35 C30.4 32 31.6 30 32 28 C32.4 30 33.6 32 33.2 35 Z" fill="#fff4cf" class="flame" />
</svg>

<style>
	.icon {
		display: block;
		width: 40px;
		height: 40px;
		flex-shrink: 0;
	}

	.icon.hero {
		width: 92px;
		height: 92px;
		filter: drop-shadow(0 10px 24px rgba(255, 180, 80, 0.35));
	}

	.flame {
		transform-origin: 32px 36px;
		animation: flame 2.4s ease-in-out infinite;
	}

	.glow {
		animation: glow 3.2s ease-in-out infinite;
	}

	@keyframes flame {
		30% {
			scale: 0.94 1.06;
		}
		60% {
			scale: 1.04 0.96;
			rotate: 2deg;
		}
	}

	@keyframes glow {
		50% {
			opacity: 0.75;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.flame,
		.glow {
			animation: none;
		}
	}
</style>
