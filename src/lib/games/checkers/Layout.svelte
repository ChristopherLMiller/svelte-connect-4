<script lang="ts">
	import { setMusicStation } from '$lib/audio/station';
	import { primeAudio } from '$lib/audio/prefs.svelte';
	import { hydrateAshcourt } from './settings.svelte';

	let { children } = $props();

	$effect(() => {
		hydrateAshcourt();
		setMusicStation('checkers');
	});
</script>

<svelte:window onpointerdown={primeAudio} />

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600;1,700&family=Outfit:wght@400;600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="court">
	{@render children()}
</div>

<style>
	.court {
		min-height: 100dvh;
		height: 100dvh;
		position: relative;
		overflow: hidden;
		background: #efe6d6;
		color: #2a221c;
		font-family: Outfit, ui-sans-serif, system-ui, sans-serif;
	}

	.court :global(:focus-visible) {
		outline: 2px solid #9e1b2a;
		outline-offset: 3px;
	}

	.court :global(::selection) {
		background: color-mix(in srgb, #9e1b2a 35%, transparent);
	}
</style>
