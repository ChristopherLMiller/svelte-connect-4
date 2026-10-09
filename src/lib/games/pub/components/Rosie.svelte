<script lang="ts">
	let { size = 44 }: { size?: number } = $props();
	const uid = $props.id();
</script>

<svg class="rosie" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
	<defs>
		<radialGradient id="{uid}-bg" cx="50%" cy="35%" r="70%">
			<stop offset="0" stop-color="#5a3a1e" />
			<stop offset="1" stop-color="#21140a" />
		</radialGradient>
		<radialGradient id="{uid}-skin" cx="45%" cy="40%" r="60%">
			<stop offset="0" stop-color="#ffe0c4" />
			<stop offset="1" stop-color="#e9b48e" />
		</radialGradient>
		<clipPath id="{uid}-clip"><circle cx="32" cy="32" r="30" /></clipPath>
	</defs>
	<circle cx="32" cy="32" r="31" fill="url(#{uid}-bg)" stroke="#e0a548" stroke-width="2" />
	<g clip-path="url(#{uid}-clip)">
		<circle cx="32" cy="12" r="8" fill="#a6432a" />
		<path d="M14 34c0-12 8-20 18-20s18 8 18 20c0 6-2 10-4 13H18c-2-3-4-7-4-13z" fill="#b24c2e" />
		<ellipse cx="32" cy="34" rx="12" ry="14" fill="url(#{uid}-skin)" />
		<path d="M20 30c2-8 7-12 12-12s10 4 12 12c-4-5-8-6-12-6s-8 1-12 6z" fill="#b24c2e" />
		<circle cx="27" cy="34" r="1.6" fill="#3a2414" />
		<circle cx="37" cy="34" r="1.6" fill="#3a2414" />
		<circle cx="24.5" cy="39" r="2.6" fill="#f08a7a" opacity="0.55" />
		<circle cx="39.5" cy="39" r="2.6" fill="#f08a7a" opacity="0.55" />
		<path d="M28 41.5c2.4 2 5.6 2 8 0" fill="none" stroke="#8a3a2a" stroke-width="1.6" stroke-linecap="round" />
		<path d="M10 64c2-10 10-15 22-15s20 5 22 15z" fill="#2f5b4a" />
		<path d="M24 50l8 7 8-7" fill="none" stroke="#f4e6c8" stroke-width="2" stroke-linejoin="round" />
	</g>
</svg>

<style>
	.rosie {
		flex: none;
		display: block;
		filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.4));
	}
</style>
