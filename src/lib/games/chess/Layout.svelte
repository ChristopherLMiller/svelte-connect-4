<script lang="ts">
	import { setMusicStation } from '$lib/audio/station';
	import { primeAudio } from '$lib/audio/prefs.svelte';
	import { hydrateChess } from './settings.svelte';

	let { children } = $props();

	$effect(() => {
		hydrateChess();
		setMusicStation('chess');
	});
</script>

<svelte:window onpointerdown={primeAudio} />

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="chess">
	{@render children()}
</div>

<style>
	.chess {
		min-height: 100dvh;
		height: 100dvh;
		position: relative;
		overflow: hidden;
		background: #0d0806;
		color: #f3e7cf;
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-weight: 500;
	}

	.chess :global(:focus-visible) {
		outline: 2px solid #d9b25e;
		outline-offset: 3px;
	}

	.chess :global(::selection) {
		background: color-mix(in srgb, #d9b25e 35%, transparent);
	}
</style>
