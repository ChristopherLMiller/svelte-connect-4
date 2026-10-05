<script lang="ts">
	let { size = 'hud' }: { size?: 'hud' | 'hero' | 'chip' } = $props();
	const uid = $props.id();
</script>

<svg class={['icon', size]} viewBox="0 0 64 64" aria-hidden="true">
	<defs>
		<linearGradient id="{uid}-sea" x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
			<stop offset="0" stop-color="#0c2c48" />
			<stop offset="1" stop-color="#020814" />
		</linearGradient>
		<radialGradient id="{uid}-glow">
			<stop offset="0" stop-color="#3fe9ff" stop-opacity=".5" />
			<stop offset="1" stop-color="#3fe9ff" stop-opacity="0" />
		</radialGradient>
	</defs>
	<rect width="64" height="64" rx="16" fill="url(#{uid}-sea)" />
	<circle cx="32" cy="38" r="24" fill="url(#{uid}-glow)" />
	<g stroke-width="1.6">
		<rect x="13" y="40" width="9.5" height="9.5" rx="2.6" fill="#ff4fd8" stroke="#ffc6f3" />
		<rect x="22.5" y="40" width="9.5" height="9.5" rx="2.6" fill="#ff4fd8" stroke="#ffc6f3" />
		<rect x="32" y="40" width="9.5" height="9.5" rx="2.6" fill="#ff4fd8" stroke="#ffc6f3" />
		<rect x="22.5" y="30.5" width="9.5" height="9.5" rx="2.6" fill="#ff4fd8" stroke="#ffc6f3" />
		<rect x="41.5" y="40" width="9.5" height="9.5" rx="2.6" fill="#ffd34d" stroke="#fff1b8" />
		<rect x="41.5" y="30.5" width="9.5" height="9.5" rx="2.6" fill="#ffd34d" stroke="#fff1b8" />
		<rect x="32" y="21" width="9.5" height="9.5" rx="2.6" fill="#3fe9ff" stroke="#c8fbff" opacity=".55" stroke-dasharray="2 1.6" fill-opacity=".2" />
	</g>
	<path d="M16 22 C16 14 26 14 26 22 Z" fill="#7ff3ff" opacity=".75" />
	<path d="M18 22 C18 26 17 29 18 32 M21 22 C21 27 22 29 21 33 M24 22 C24 26 25 28 24 31" fill="none" stroke="#7ff3ff" stroke-width="1" opacity=".6" />
	<circle cx="48" cy="16" r="1.4" fill="#c8fbff" />
	<circle cx="54" cy="24" r="1" fill="#c8fbff" opacity=".7" />
	<circle cx="44" cy="10" r=".9" fill="#c8fbff" opacity=".6" />
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
		width: 76px;
		height: 76px;
		filter: drop-shadow(0 10px 22px rgba(63, 233, 255, 0.25)) drop-shadow(0 0 30px rgba(255, 79, 216, 0.15));
	}

	.chip {
		width: 1.15em;
		height: 1.15em;
	}
</style>
