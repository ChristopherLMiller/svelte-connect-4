<script lang="ts">
	import { setMusicStation } from '$lib/audio/station';
	import { primeAudio } from '$lib/audio/prefs.svelte';
	import { hydrateReef } from './settings.svelte';

	let { children } = $props();

	$effect(() => {
		hydrateReef();
		setMusicStation('reef');
	});
</script>

<svelte:window onpointerdown={primeAudio} />

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Outfit:wght@400;500;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="reef">
	{@render children()}
</div>

<style>
	.reef {
		min-height: 100dvh;
		height: 100dvh;
		position: relative;
		overflow: hidden;
		background: #02060f;
		color: #d8f4ff;
		font-family: Outfit, ui-sans-serif, system-ui, sans-serif;
	}

	.reef :global(:focus-visible) {
		outline: 2px solid #3fe9ff;
		outline-offset: 3px;
	}

	.reef :global(::selection) {
		background: color-mix(in srgb, #ff4fd8 40%, transparent);
	}
</style>
