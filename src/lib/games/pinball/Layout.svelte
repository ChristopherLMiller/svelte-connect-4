<script lang="ts">
	import { setMusicStation } from '$lib/audio/station';
	import { primeAudio } from '$lib/audio/prefs.svelte';
	import { hydratePinball } from './settings.svelte';

	let { children } = $props();

	$effect(() => {
		hydratePinball();
		setMusicStation('pinball');
	});
</script>

<svelte:window onpointerdown={primeAudio} />

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Cinzel:wght@600;800&family=Creepster&family=Lobster&family=Orbitron:wght@600;800&family=Pirata+One&family=Righteous&family=Rye&family=Uncial+Antiqua&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="silverball">
	{@render children()}
</div>

<style>
	.silverball {
		min-height: 100dvh;
		height: 100dvh;
		position: relative;
		overflow: hidden;
		background: #120a1c;
		color: #fff2dc;
		font-family: 'Barlow Condensed', ui-sans-serif, system-ui, sans-serif;
		font-weight: 500;
	}

	.silverball :global(:focus-visible) {
		outline: 2px solid var(--sb-accent, #ffc24a);
		outline-offset: 3px;
	}

	.silverball :global(::selection) {
		background: color-mix(in srgb, var(--sb-hot, #ff4b5c) 40%, transparent);
	}
</style>
