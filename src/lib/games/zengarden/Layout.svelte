<script lang="ts">
	import { setMusicStation } from '$lib/audio/station';
	import { primeAudio } from '$lib/audio/prefs.svelte';
	import { hydrateZen } from './settings.svelte';

	let { children } = $props();

	$effect(() => {
		hydrateZen();
		setMusicStation('zengarden');
	});
</script>

<svelte:window onpointerdown={primeAudio} />

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;700;800&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="zengarden">
	{@render children()}
</div>

<style>
	.zengarden {
		min-height: 100dvh;
		height: 100dvh;
		position: relative;
		overflow: hidden;
		background: #1e1a16;
		color: #2b2622;
		font-family: 'Zen Kaku Gothic New', ui-sans-serif, system-ui, sans-serif;
	}

	.zengarden :global(:focus-visible) {
		outline: 2px solid #c8321f;
		outline-offset: 3px;
	}

	.zengarden :global(::selection) {
		background: color-mix(in srgb, #c8321f 30%, transparent);
	}
</style>
