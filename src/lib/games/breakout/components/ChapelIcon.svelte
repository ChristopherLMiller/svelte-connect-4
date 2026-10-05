<script lang="ts">
	let { size = 'hud' }: { size?: 'hud' | 'hero' | 'chip' } = $props();
	const uid = $props.id();
</script>

<svg class={['icon', size]} viewBox="0 0 64 64" aria-hidden="true">
	<defs>
		<linearGradient id="{uid}-stone" x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
			<stop offset="0" stop-color="#2c2a36" />
			<stop offset="1" stop-color="#121118" />
		</linearGradient>
		<clipPath id="{uid}-arch">
			<path d="M20 56 V30 C20 20 26 13 32 9 C38 13 44 20 44 30 V56 Z" />
		</clipPath>
	</defs>
	<rect width="64" height="64" rx="16" fill="url(#{uid}-stone)" />
	<g clip-path="url(#{uid}-arch)">
		<rect x="18" y="8" width="28" height="50" fill="#0f0d13" />
		<rect x="20.5" y="8" width="10" height="12" fill="#cba3ff" />
		<rect x="33.5" y="8" width="10" height="12" fill="#cba3ff" />
		<rect x="20.5" y="22" width="10" height="9" fill="#c8243c" />
		<rect x="33.5" y="22" width="10" height="9" fill="#2b5ad0" />
		<rect x="20.5" y="33" width="10" height="9" fill="#e8a23a" />
		<rect x="33.5" y="33" width="10" height="9" fill="#1f9a5c" />
		<rect x="20.5" y="44" width="10" height="12" fill="#2b5ad0" />
		<rect x="33.5" y="44" width="10" height="12" fill="#c8243c" />
		<path d="M22 31 L29 22" stroke="#fff" stroke-width="1.4" opacity=".35" />
		<path d="M35 42 L42 33" stroke="#fff" stroke-width="1.4" opacity=".3" />
	</g>
	<path d="M20 56 V30 C20 20 26 13 32 9 C38 13 44 20 44 30 V56" fill="none" stroke="#5a5666" stroke-width="2.4" />
	<path d="M32 9 V56" stroke="#0f0d13" stroke-width="2" />
	<path d="M14 58 L32 50 L50 58" fill="none" stroke="#f2c46b" stroke-width="1.4" opacity=".5" />
	<circle cx="32" cy="58" r="2.6" fill="#fff0c8" />
	<circle cx="32" cy="58" r="6" fill="#ffd98a" opacity=".22" />
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
		filter: drop-shadow(0 10px 22px rgba(203, 163, 255, 0.25)) drop-shadow(0 0 30px rgba(242, 196, 107, 0.18));
	}

	.chip {
		width: 1.15em;
		height: 1.15em;
	}
</style>
