<script lang="ts">
	import { setMusicStation } from '$lib/audio/station';
	import { primeAudio } from '$lib/audio/prefs.svelte';
	import { hydrateSeedkeeper } from './settings.svelte';

	let { children } = $props();

	$effect(() => {
		hydrateSeedkeeper();
		setMusicStation('seedkeeper');
	});
</script>

<svelte:window onpointerdown={primeAudio} />

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,700;1,9..144,600&family=Nunito:wght@400;600;700;800&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="seedkeeper">
	{@render children()}
</div>

<style>
	.seedkeeper {
		min-height: 100dvh;
		height: 100dvh;
		position: relative;
		overflow: hidden;
		background: #0c140d;
		color: #f3ecd6;
		font-family: Nunito, ui-sans-serif, system-ui, sans-serif;
	}

	.seedkeeper :global(:focus-visible) {
		outline: 2px solid #f6c453;
		outline-offset: 3px;
	}

	.seedkeeper :global(::selection) {
		background: color-mix(in srgb, #f6c453 35%, transparent);
	}
</style>
