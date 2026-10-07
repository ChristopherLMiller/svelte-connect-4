<script lang="ts">
	let { size = 'hud' }: { size?: 'hud' | 'hero' | 'chip' } = $props();
	const uid = $props.id();
</script>

<svg class={['icon', size]} viewBox="0 0 64 64" aria-hidden="true">
	<defs>
		<radialGradient id="{uid}-brew" cx="40%" cy="40%" r="70%">
			<stop offset="0" stop-color="#ff7a92" />
			<stop offset="0.55" stop-color="#ff2450" />
			<stop offset="1" stop-color="#7a0a24" />
		</radialGradient>
		<linearGradient id="{uid}-glass" x1="0" x2="1">
			<stop offset="0" stop-color="#ffffff" stop-opacity="0.35" />
			<stop offset="0.3" stop-color="#ffffff" stop-opacity="0.08" />
			<stop offset="1" stop-color="#ffffff" stop-opacity="0.18" />
		</linearGradient>
	</defs>
	<path d="M32 4 C30 8 34 9 32 12 C30 15 34 16 32 19" fill="none" stroke="#ffd0dc" stroke-width="1.6" stroke-linecap="round" opacity="0.6" />
	<rect x="26" y="17" width="12" height="7" rx="2" fill="#b98a4a" stroke="#4a2e14" stroke-width="1" />
	<path d="M27 24 H37 V31 C46 34 52 41 52 47 C52 56 43 61 32 61 C21 61 12 56 12 47 C12 41 18 34 27 31 Z" fill="#1d2a24" stroke="#d6aa5c" stroke-width="1.6" />
	<path d="M15 46 Q32 40 49 46 C50 54 42 58 32 58 C22 58 14 54 15 46 Z" fill="url(#{uid}-brew)" />
	<circle cx="25" cy="51" r="1.6" fill="#fff" opacity="0.6" />
	<circle cx="36" cy="49" r="1.1" fill="#fff" opacity="0.5" />
	<path d="M27 24 H37 V31 C46 34 52 41 52 47 C52 56 43 61 32 61 C21 61 12 56 12 47 C12 41 18 34 27 31 Z" fill="url(#{uid}-glass)" />
	<path d="M18 40 C20 36 24 34 26 33" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity="0.5" />
</svg>

<style>
	.icon {
		display: block;
		flex-shrink: 0;
		overflow: visible;
	}

	.hud {
		width: 42px;
		height: 42px;
	}

	.hero {
		width: 92px;
		height: 92px;
		filter: drop-shadow(0 0 26px rgba(255, 60, 100, 0.4)) drop-shadow(0 12px 18px rgba(0, 0, 0, 0.5));
	}

	.chip {
		width: 1.15em;
		height: 1.15em;
	}
</style>
