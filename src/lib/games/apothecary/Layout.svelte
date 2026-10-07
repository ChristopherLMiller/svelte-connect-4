<script lang="ts">
	import { setMusicStation } from '$lib/audio/station';
	import { primeAudio } from '$lib/audio/prefs.svelte';
	import { hydrateApothecary } from './settings.svelte';

	let { children } = $props();

	$effect(() => {
		hydrateApothecary();
		setMusicStation('apothecary');
	});
</script>

<svelte:window onpointerdown={primeAudio} />

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Spectral:wght@400;600;700&display=swap" rel="stylesheet" />
</svelte:head>

<div class="apothecary">
	{@render children()}
</div>

<style>
	.apothecary {
		min-height: 100dvh;
		height: 100dvh;
		position: relative;
		overflow: hidden;
		background: #141110;
		color: #f1e6c8;
		font-family: Spectral, Georgia, serif;
	}

	.apothecary :global(:focus-visible) {
		outline: 2px solid #6fe3b0;
		outline-offset: 3px;
	}

	.apothecary :global(::selection) {
		background: color-mix(in srgb, #ff5a78 45%, transparent);
	}
</style>
