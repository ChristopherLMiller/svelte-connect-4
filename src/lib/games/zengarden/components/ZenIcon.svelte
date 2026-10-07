<script lang="ts">
	let { size = 'hud' }: { size?: 'hud' | 'hero' | 'chip' } = $props();
	const uid = $props.id();
</script>

<svg class={['icon', size]} viewBox="0 0 64 64" aria-hidden="true">
	<defs>
		<radialGradient id="{uid}-slate" cx="35%" cy="30%" r="75%">
			<stop offset="0" stop-color="#8a95a2" />
			<stop offset="0.45" stop-color="#3b424b" />
			<stop offset="1" stop-color="#0b0d10" />
		</radialGradient>
		<radialGradient id="{uid}-quartz" cx="35%" cy="30%" r="75%">
			<stop offset="0" stop-color="#ffffff" />
			<stop offset="0.5" stop-color="#efe8da" />
			<stop offset="1" stop-color="#b3a892" />
		</radialGradient>
		<clipPath id="{uid}-bed">
			<rect x="7" y="7" width="50" height="50" rx="3" />
		</clipPath>
	</defs>
	<rect x="3" y="3" width="58" height="58" rx="7" fill="#5a3a24" />
	<rect x="7" y="7" width="50" height="50" rx="3" fill="#e2dccd" />
	<g clip-path="url(#{uid}-bed)" fill="none" stroke-linecap="round">
		{#each [12, 18, 24, 30, 36, 42, 48, 54] as y (y)}
			<path d="M4 {y} Q20 {y - 1.5} 34 {y} T66 {y}" stroke="#a89c86" stroke-width="1.2" />
		{/each}
		<circle cx="25" cy="34" r="12" fill="#e2dccd" stroke="#a89c86" stroke-width="1.2" />
		<circle cx="25" cy="34" r="16" stroke="#a89c86" stroke-width="1.2" />
		<circle cx="43" cy="22" r="9" fill="#e2dccd" stroke="#a89c86" stroke-width="1.2" />
	</g>
	<ellipse cx="26.5" cy="36.5" rx="8" ry="6" fill="rgba(40, 25, 10, 0.3)" />
	<circle cx="25" cy="34" r="7.5" fill="url(#{uid}-slate)" />
	<ellipse cx="44.2" cy="24" rx="5.6" ry="4.4" fill="rgba(40, 25, 10, 0.3)" />
	<circle cx="43" cy="22" r="5.4" fill="url(#{uid}-quartz)" />
	<path class="petal" d="M50 44 q4 -1 5 3 q-4 2 -5 -3 z" fill="#f3a9bf" />
	<circle cx="25" cy="34" r="1.4" fill="#d6402a" />
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
		filter: drop-shadow(0 12px 18px rgba(40, 25, 10, 0.35));
	}

	.chip {
		width: 1.15em;
		height: 1.15em;
	}
</style>
