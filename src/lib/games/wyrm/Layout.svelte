<script lang="ts">
	import { setMusicStation } from '$lib/audio/station';
	import { primeAudio } from '$lib/audio/prefs.svelte';
	import { hydrateWyrm } from './settings.svelte';

	let { children } = $props();

	$effect(() => {
		hydrateWyrm();
		setMusicStation('wyrm');
	});
</script>

<svelte:window onpointerdown={primeAudio} />

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Figtree:wght@400;600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="market">
	{@render children()}
</div>

<style>
	.market {
		min-height: 100dvh;
		height: 100dvh;
		position: relative;
		overflow: hidden;
		background: #0b1024;
		color: #f7ead2;
		font-family: Figtree, ui-sans-serif, system-ui, sans-serif;
	}

	.market :global(:focus-visible) {
		outline: 2px solid #f0c45c;
		outline-offset: 3px;
	}

	.market :global(::selection) {
		background: color-mix(in srgb, #e24a3d 45%, transparent);
	}
</style>
