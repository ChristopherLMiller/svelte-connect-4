<script lang="ts">
	import { setMusicStation } from '$lib/audio/station';
	import { primeAudio } from '$lib/audio/prefs.svelte';
	import { hydrateLight } from './settings.svelte';

	let { children } = $props();

	$effect(() => {
		hydrateLight();
		setMusicStation('lighthouse');
	});
</script>

<svelte:window onpointerdown={primeAudio} />

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=Alegreya+Sans:wght@400;500;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="lighthouse">
	{@render children()}
</div>

<style>
	.lighthouse {
		min-height: 100dvh;
		height: 100dvh;
		position: relative;
		overflow: hidden;
		background: #060b11;
		color: #f2e8d5;
		font-family: 'Alegreya Sans', ui-sans-serif, system-ui, sans-serif;
	}

	.lighthouse :global(:focus-visible) {
		outline: 2px solid #e8b05a;
		outline-offset: 3px;
	}

	.lighthouse :global(::selection) {
		background: color-mix(in srgb, #e8b05a 35%, transparent);
	}
</style>
