<script lang="ts">
	let { size = 'hud' }: { size?: 'hud' | 'hero' | 'chip' } = $props();
	const uid = $props.id();
</script>

<svg class={['icon', size]} viewBox="0 0 64 64" aria-hidden="true">
	<defs>
		<linearGradient id="{uid}-sky" x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
			<stop offset="0" stop-color="#0b0e26" />
			<stop offset="1" stop-color="#2e1e44" />
		</linearGradient>
		<radialGradient id="{uid}-corona" cx="50%" cy="50%" r="50%">
			<stop offset="0.45" stop-color="#ffe2a0" stop-opacity="0.95" />
			<stop offset="0.7" stop-color="#e8b85a" stop-opacity="0.35" />
			<stop offset="1" stop-color="#e8b85a" stop-opacity="0" />
		</radialGradient>
		<radialGradient id="{uid}-sun" cx="40%" cy="34%" r="70%">
			<stop offset="0" stop-color="#fff6d2" />
			<stop offset="0.5" stop-color="#f0c060" />
			<stop offset="1" stop-color="#9a6420" />
		</radialGradient>
		<radialGradient id="{uid}-moon" cx="38%" cy="32%" r="75%">
			<stop offset="0" stop-color="#2a3058" />
			<stop offset="1" stop-color="#0c0f24" />
		</radialGradient>
	</defs>
	<rect width="64" height="64" rx="16" fill="url(#{uid}-sky)" />
	<circle cx="12" cy="13" r="0.9" fill="#fff" opacity="0.8" />
	<circle cx="52" cy="10" r="0.7" fill="#fff" opacity="0.7" />
	<circle cx="55" cy="44" r="0.8" fill="#fff" opacity="0.6" />
	<circle cx="9" cy="48" r="0.6" fill="#fff" opacity="0.6" />
	<ellipse cx="32" cy="34" rx="27" ry="9" fill="none" stroke="#e8b85a" stroke-width="1.4" opacity="0.7" transform="rotate(-10 32 34)" />
	<circle cx="32" cy="31" r="21" fill="url(#{uid}-corona)" />
	<circle cx="32" cy="31" r="12.5" fill="url(#{uid}-sun)" />
	<circle cx="36.5" cy="28.5" r="11.5" fill="url(#{uid}-moon)" />
	<path d="M25.2 38.2 A11.5 11.5 0 0 1 28 19.5" fill="none" stroke="#dfe6f6" stroke-width="0.9" opacity="0.65" />
	<circle cx="56" cy="31" r="2.6" fill="#c8d2ec" />
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
		width: 82px;
		height: 82px;
		filter: drop-shadow(0 0 22px rgba(232, 184, 90, 0.35)) drop-shadow(0 12px 18px rgba(0, 0, 0, 0.4));
	}

	.chip {
		width: 1.15em;
		height: 1.15em;
	}
</style>
