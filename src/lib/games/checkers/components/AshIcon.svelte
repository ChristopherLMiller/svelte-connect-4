<script lang="ts">
	let { size = 'hud' }: { size?: 'hud' | 'hero' | 'chip' } = $props();
	const uid = $props.id();
</script>

<svg class={['icon', size]} viewBox="0 0 64 64" aria-hidden="true">
	<defs>
		<linearGradient id="{uid}-yard" x1="8" y1="0" x2="56" y2="64" gradientUnits="userSpaceOnUse">
			<stop offset="0" stop-color="#e7eef0" />
			<stop offset="1" stop-color="#d7cbb8" />
		</linearGradient>
		<radialGradient id="{uid}-ember" cx="38%" cy="32%" r="70%">
			<stop offset="0" stop-color="#f4c4c8" />
			<stop offset="0.45" stop-color="#9e1b2a" />
			<stop offset="1" stop-color="#4a1018" />
		</radialGradient>
		<linearGradient id="{uid}-bone" x1="20" y1="12" x2="44" y2="40" gradientUnits="userSpaceOnUse">
			<stop offset="0" stop-color="#ffffff" />
			<stop offset="1" stop-color="#b7c9be" />
		</linearGradient>
	</defs>
	<rect width="64" height="64" rx="16" fill="url(#{uid}-yard)" />
	<circle cx="46" cy="14" r="7" fill="#fff8e8" />
	<rect x="10" y="20" width="20" height="20" fill="#2a2420" />
	<rect x="30" y="20" width="20" height="20" fill="#f4efe6" />
	<rect x="10" y="40" width="20" height="20" fill="#f4efe6" />
	<rect x="30" y="40" width="20" height="20" fill="#2a2420" />
	<circle cx="40" cy="30" r="7.2" fill="url(#{uid}-bone)" />
	<circle cx="20" cy="50" r="7.4" fill="url(#{uid}-ember)" />
	<path d="M8 64 L14 38 L20 64 Z" fill="#2f4a3c" />
	<path d="M0 54 C16 48 30 60 44 52 C54 46 60 54 64 50 V64 H0 Z" fill="#c4b49a" />
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
		filter: drop-shadow(0 10px 18px rgba(70, 50, 30, 0.22));
	}

	.chip {
		width: 1.15em;
		height: 1.15em;
	}
</style>
