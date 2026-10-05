<script lang="ts">
	import { setMusicStation } from '$lib/audio/station';
	import { primeAudio } from '$lib/audio/prefs.svelte';
	import { hydrateChapel } from './settings.svelte';

	let { children } = $props();

	$effect(() => {
		hydrateChapel();
		setMusicStation('breakout');
	});
</script>

<svelte:window onpointerdown={primeAudio} />

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=IM+Fell+English+SC&family=Alegreya+Sans:wght@400;500;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="nave">
	{@render children()}
</div>

<style>
	.nave {
		min-height: 100dvh;
		height: 100dvh;
		position: relative;
		overflow: hidden;
		background: #0c0c12;
		color: #f4e8d0;
		font-family: 'Alegreya Sans', ui-sans-serif, system-ui, sans-serif;
	}

	.nave :global(:focus-visible) {
		outline: 2px solid #f2c46b;
		outline-offset: 3px;
	}

	.nave :global(::selection) {
		background: color-mix(in srgb, #cba3ff 40%, transparent);
	}
</style>
