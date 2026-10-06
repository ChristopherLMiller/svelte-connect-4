<script lang="ts">
	import { setMusicStation } from '$lib/audio/station';
	import { primeAudio } from '$lib/audio/prefs.svelte';
	import { hydrateFrost } from './settings.svelte';

	let { children } = $props();

	$effect(() => {
		hydrateFrost();
		setMusicStation('frost');
	});
</script>

<svelte:window onpointerdown={primeAudio} />

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@300;400;600;700&family=Manrope:wght@400;600;700;800&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="frost">
	{@render children()}
</div>

<style>
	.frost {
		min-height: 100dvh;
		height: 100dvh;
		position: relative;
		overflow: hidden;
		background: #1a2340;
		color: #1d2b47;
		font-family: Manrope, ui-sans-serif, system-ui, sans-serif;
	}

	.frost :global(:focus-visible) {
		outline: 2px solid #ff8a6a;
		outline-offset: 3px;
	}

	.frost :global(::selection) {
		background: color-mix(in srgb, #9fdcff 50%, transparent);
	}
</style>
