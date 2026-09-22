<script lang="ts">
	let { size = 'hud' }: { size?: 'hud' | 'hero' | 'chip' } = $props();
	const uid = $props.id();
</script>

<svg class={['icon', size]} viewBox="0 0 64 64" aria-hidden="true">
	<defs>
		<linearGradient id="{uid}-sky" x1="8" y1="0" x2="56" y2="64" gradientUnits="userSpaceOnUse">
			<stop offset="0" stop-color="#1c1640" />
			<stop offset="1" stop-color="#0b1024" />
		</linearGradient>
		<linearGradient id="{uid}-silk" x1="10" y1="20" x2="56" y2="48" gradientUnits="userSpaceOnUse">
			<stop offset="0" stop-color="#fff1c4" />
			<stop offset="0.45" stop-color="#f0c45c" />
			<stop offset="1" stop-color="#e24a3d" />
		</linearGradient>
	</defs>
	<rect width="64" height="64" rx="16" fill="url(#{uid}-sky)" />
	<circle cx="18" cy="16" r="2" fill="#f7ead2" opacity=".7" />
	<circle cx="48" cy="12" r="1.4" fill="#f7ead2" opacity=".5" />
	<path
		d="M10 40 C16 28 22 46 30 34 C36 26 38 22 46 24 C52 26 54 32 50 38 C46 44 38 46 32 42 C24 36 20 48 12 46"
		fill="none"
		stroke="url(#{uid}-silk)"
		stroke-width="6.2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<path d="M50 26 Q 58 18 61 14" fill="none" stroke="#fff1c4" stroke-width="0.9" />
	<path d="M50 28 Q 58 34 61 38" fill="none" stroke="#fff1c4" stroke-width="0.9" />
	<circle cx="50" cy="26" r="4.2" fill="#fff6d8" />
	<circle cx="51.2" cy="24.8" r="1.15" fill="#1a1230" />
	<path d="M28 18 L32 10 L36 18 Z" fill="#e24a3d" />
	<rect x="29.2" y="18" width="5.6" height="6.5" rx="1.2" fill="#f0c45c" />
	<path d="M32 24.5 L32 28" stroke="#e24a3d" stroke-width="1.2" stroke-linecap="round" />
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
		filter: drop-shadow(0 10px 18px rgba(226, 74, 61, 0.28));
	}

	.chip {
		width: 1.15em;
		height: 1.15em;
	}
</style>
