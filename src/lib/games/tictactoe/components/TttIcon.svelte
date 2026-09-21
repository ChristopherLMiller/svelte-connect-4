<script lang="ts">
	let { size = 'hud' }: { size?: 'hud' | 'hero' | 'chip' } = $props();
	const uid = $props.id();
</script>

<svg
	class={['icon', size]}
	viewBox="0 0 64 64"
	aria-hidden="true"
>
	<defs>
		<linearGradient id="{uid}-sand" x1="10" y1="0" x2="54" y2="64" gradientUnits="userSpaceOnUse">
			<stop offset="0" stop-color="#f0d7b0" />
			<stop offset="1" stop-color="#c39262" />
		</linearGradient>
		<linearGradient id="{uid}-tide" x1="0" y1="40" x2="64" y2="64" gradientUnits="userSpaceOnUse">
			<stop offset="0" stop-color="#3aa0b8" />
			<stop offset="1" stop-color="#0c3a4c" />
		</linearGradient>
	</defs>
	<rect width="64" height="64" rx="16" fill="url(#{uid}-sand)" />
	<path
		d="M16 16 L30 36"
		fill="none"
		stroke="#5c3a28"
		stroke-width="5.2"
		stroke-linecap="round"
	/>
	<path
		d="M30 16 L15 37"
		fill="none"
		stroke="#5c3a28"
		stroke-width="5.2"
		stroke-linecap="round"
	/>
	<circle cx="46" cy="24" r="9.5" fill="none" stroke="#5c3a28" stroke-width="4.2" />
	<path d="M0 44 C14 36 22 52 34 44 C46 36 54 52 64 42 V64 H0 Z" fill="url(#{uid}-tide)" />
	<path
		d="M0 47 C16 41 24 55 36 47 C48 39 56 54 64 46"
		fill="none"
		stroke="#e8f8fb"
		stroke-width="2.2"
		stroke-linecap="round"
		opacity=".75"
	/>
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
		filter: drop-shadow(0 10px 18px rgba(62, 40, 22, 0.22));
	}

	.chip {
		width: 1.15em;
		height: 1.15em;
	}
</style>
