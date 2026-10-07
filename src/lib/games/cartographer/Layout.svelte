<script lang="ts">
	import { setMusicStation } from '$lib/audio/station';
	import { primeAudio } from '$lib/audio/prefs.svelte';
	import { hydrateCartographer } from './settings.svelte';

	let { children } = $props();

	$effect(() => {
		hydrateCartographer();
		setMusicStation('cartographer');
	});
</script>

<svelte:window onpointerdown={primeAudio} />

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Almendra:wght@400;700&family=EB+Garamond:wght@400;500;600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="cartographer">
	{@render children()}
</div>

<style>
	.cartographer {
		min-height: 100dvh;
		height: 100dvh;
		position: relative;
		overflow: hidden;
		background: #1c0f07;
		color: #2e2014;
		font-family: 'EB Garamond', Georgia, serif;
	}

	.cartographer :global(:focus-visible) {
		outline: 2px solid #ff9a4a;
		outline-offset: 3px;
	}

	.cartographer :global(::selection) {
		background: color-mix(in srgb, #b3311d 35%, transparent);
	}
</style>
