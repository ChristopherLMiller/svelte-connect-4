<script lang="ts">
	let { size = 'hud' }: { size?: 'hud' | 'hero' | 'chip' } = $props();
	const uid = $props.id();
</script>

<svg class={['icon', size]} viewBox="0 0 64 64" aria-hidden="true">
	<defs>
		<linearGradient id="{uid}-stone" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0" stop-color="#8a9283" />
			<stop offset="1" stop-color="#3f473d" />
		</linearGradient>
		<radialGradient id="{uid}-pit" cx="40%" cy="35%" r="70%">
			<stop offset="0" stop-color="#2d3229" />
			<stop offset="1" stop-color="#10130d" />
		</radialGradient>
		<radialGradient id="{uid}-fly" cx="50%" cy="50%" r="50%">
			<stop offset="0" stop-color="#f4ffb0" />
			<stop offset="0.3" stop-color="#c8f06a" stop-opacity="0.7" />
			<stop offset="1" stop-color="#9ad04a" stop-opacity="0" />
		</radialGradient>
	</defs>
	<rect x="3" y="12" width="58" height="40" rx="14" fill="url(#{uid}-stone)" stroke="#1d2a18" stroke-width="1.4" />
	<path d="M6 46 Q12 50 20 49 M44 50 Q54 50 58 44" stroke="#5b8a33" stroke-width="3" stroke-linecap="round" fill="none" />
	<circle cx="21" cy="32" r="10" fill="url(#{uid}-pit)" />
	<circle cx="43" cy="32" r="10" fill="url(#{uid}-pit)" />
	<ellipse cx="18" cy="31" rx="3.4" ry="2.7" fill="#4fae80" />
	<ellipse cx="23.5" cy="34" rx="3.4" ry="2.7" fill="#e2a03c" />
	<ellipse cx="22" cy="28.5" rx="3.4" ry="2.7" fill="#e293a6" />
	<ellipse cx="42" cy="34" rx="3.4" ry="2.7" fill="#7ea6cf" />
	<ellipse cx="45.5" cy="30" rx="3.4" ry="2.7" fill="#e4d8b8" />
	<g fill="#fff" opacity="0.6">
		<circle cx="17" cy="30" r="0.9" />
		<circle cx="22.5" cy="33" r="0.9" />
		<circle cx="21" cy="27.5" r="0.9" />
		<circle cx="41" cy="33" r="0.9" />
		<circle cx="44.5" cy="29" r="0.9" />
	</g>
	<circle cx="52" cy="10" r="9" fill="url(#{uid}-fly)" />
	<circle cx="52" cy="10" r="2" fill="#f8ffd0" />
	<circle cx="9" cy="8" r="5" fill="url(#{uid}-fly)" opacity="0.7" />
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
		filter: drop-shadow(0 0 26px rgba(200, 240, 106, 0.35)) drop-shadow(0 12px 18px rgba(0, 0, 0, 0.5));
	}

	.chip {
		width: 1.15em;
		height: 1.15em;
	}
</style>
