<script lang="ts">
	import { setMusicStation } from '$lib/audio/station';
	import { primeAudio } from '$lib/audio/prefs.svelte';
	import { hydratePub } from './settings.svelte';

	let { children } = $props();

	$effect(() => {
		hydratePub();
		setMusicStation('pub');
	});
</script>

<svelte:window onpointerdown={primeAudio} />

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Cabin+Sketch:wght@400;700&family=Playfair+Display+SC:wght@400;700&family=Spectral:wght@400;600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="pub">
	{@render children()}
</div>

<style>
	.pub {
		min-height: 100dvh;
		height: 100dvh;
		position: relative;
		overflow: hidden;
		background: #140b05;
		color: #f4e6c8;
		font-family: Spectral, Georgia, serif;
	}

	.pub :global(:focus-visible) {
		outline: 2px solid #e0a548;
		outline-offset: 3px;
	}

	.pub :global(::selection) {
		background: color-mix(in srgb, #e0a548 35%, transparent);
	}
</style>
