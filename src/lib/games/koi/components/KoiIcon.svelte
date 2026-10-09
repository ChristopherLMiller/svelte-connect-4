<script lang="ts">
	let { size = 'hud' }: { size?: 'hud' | 'hero' | 'chip' } = $props();
	const uid = $props.id();
</script>

<svg class={['icon', size]} viewBox="0 0 64 64" aria-hidden="true">
	<defs>
		<radialGradient id="{uid}-water" cx="0.4" cy="0.35" r="0.8">
			<stop offset="0" stop-color="#3fa596" />
			<stop offset="1" stop-color="#0f4a43" />
		</radialGradient>
	</defs>
	<rect width="64" height="64" rx="16" fill="url(#{uid}-water)" />
	<path d="M52 44 L44 50 A13 13 0 1 1 52 44 Z" fill="#4fa64a" transform="translate(-30 -22)" opacity="0.9" />
	<g>
		<path d="M18 40 C22 28 34 22 44 24 C40 26 38 28 37 31 C33 30 26 33 22 40 Z" fill="#fff4e6" />
		<path d="M26 31 C29 29 32 28 35 28 C33 31 30 32 27 33 Z" fill="#ff6a2b" />
		<path d="M44 24 L52 19 L50 26 L53 31 Z" fill="#fff4e6" opacity="0.9" />
		<path d="M46 40 C42 52 30 58 20 56 C24 54 26 52 27 49 C31 50 38 47 42 40 Z" fill="#ffc93c" />
		<path d="M20 56 L12 61 L14 54 L11 49 Z" fill="#ffc93c" opacity="0.9" />
		<circle cx="20" cy="38" r="1.2" fill="#2a1600" />
		<circle cx="44" cy="42" r="1.2" fill="#2a1600" />
	</g>
	<circle cx="50" cy="12" r="5" fill="none" stroke="#e6fff6" stroke-width="1" opacity="0.6" />
	<circle cx="50" cy="12" r="9" fill="none" stroke="#e6fff6" stroke-width="0.7" opacity="0.3" />
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
		width: 80px;
		height: 80px;
		filter: drop-shadow(0 10px 22px rgba(0, 40, 30, 0.35)) drop-shadow(0 0 26px rgba(255, 179, 71, 0.3));
	}

	.chip {
		width: 1.15em;
		height: 1.15em;
	}
</style>
