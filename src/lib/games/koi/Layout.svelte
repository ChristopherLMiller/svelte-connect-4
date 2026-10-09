<script lang="ts">
	import { setMusicStation } from '$lib/audio/station';
	import { primeAudio } from '$lib/audio/prefs.svelte';
	import { hydrateKoi } from './settings.svelte';

	let { children } = $props();

	$effect(() => {
		hydrateKoi();
		setMusicStation('koi');
	});
</script>

<svelte:window onpointerdown={primeAudio} />

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Kaisei+Decol:wght@500;700&family=Quicksand:wght@500;600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="koi">
	{@render children()}
</div>

<style>
	.koi {
		min-height: 100dvh;
		height: 100dvh;
		position: relative;
		overflow: hidden;
		background: #145650;
		color: #f6f1e4;
		font-family: Quicksand, ui-sans-serif, system-ui, sans-serif;
		font-weight: 500;
	}

	.koi :global(:focus-visible) {
		outline: 2px solid #ffb347;
		outline-offset: 3px;
	}

	.koi :global(::selection) {
		background: color-mix(in srgb, #ff6f9f 40%, transparent);
	}
</style>
