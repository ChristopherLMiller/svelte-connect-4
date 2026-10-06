<script lang="ts">
	let { size = 'hud' }: { size?: 'hud' | 'hero' | 'chip' } = $props();
	const uid = $props.id();
</script>

<svg class={['icon', size]} viewBox="0 0 64 64" aria-hidden="true">
	<defs>
		<linearGradient id="{uid}-sky" x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
			<stop offset="0" stop-color="#2a3566" />
			<stop offset="0.45" stop-color="#c47a92" />
			<stop offset="0.62" stop-color="#ffc49a" />
			<stop offset="0.62" stop-color="#cfe6f5" />
			<stop offset="1" stop-color="#8fb8d8" />
		</linearGradient>
		<radialGradient id="{uid}-sun" cx="0.5" cy="0.5" r="0.5">
			<stop offset="0" stop-color="#fff4d8" />
			<stop offset="0.4" stop-color="#ffd9a0" />
			<stop offset="1" stop-color="#ff9a6e" stop-opacity="0" />
		</radialGradient>
	</defs>
	<rect width="64" height="64" rx="16" fill="url(#{uid}-sky)" />
	<circle cx="40" cy="39.5" r="13" fill="url(#{uid}-sun)" />
	<path d="M4 40 L10 33 L13 37 L17 30 L21 36 L25 31 L29 38 L33 35 L36 40 Z" fill="#3a3f66" opacity=".75" />
	<path
		d="M14 52 L24 47 L31 50 M24 47 L26 42 M31 50 L40 46 L48 49 M40 46 L42 43 M31 50 L29 57"
		fill="none"
		stroke="#ffffff"
		stroke-width="1.4"
		stroke-linecap="round"
		opacity=".9"
	/>
	<path d="M48 25 L48 50" stroke="#6b4a2f" stroke-width="2" stroke-linecap="round" />
	<path d="M48.8 25 L58 28.5 L48.8 32 Z" fill="#ff6a3d" />
	<path d="M43 50 L53 50" stroke="#6b4a2f" stroke-width="2" stroke-linecap="round" />
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
		filter: drop-shadow(0 10px 22px rgba(30, 40, 80, 0.3)) drop-shadow(0 0 30px rgba(255, 170, 130, 0.35));
	}

	.chip {
		width: 1.15em;
		height: 1.15em;
	}
</style>
