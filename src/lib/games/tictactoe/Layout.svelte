<script lang="ts">
	import { setMusicStation } from '$lib/audio/station';
	import { primeAudio } from '$lib/audio/prefs.svelte';
	import { hydrateTtt } from './settings.svelte';

	let { children } = $props();

	$effect(() => {
		hydrateTtt();
		setMusicStation('tictactoe');
	});
</script>

<svelte:window onpointerdown={primeAudio} />

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;1,9..144,500;1,9..144,600;1,9..144,700&family=Nunito:wght@400;600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="strand">
	{@render children()}
</div>

<style>
	.strand {
		min-height: 100dvh;
		height: 100dvh;
		position: relative;
		overflow: hidden;
		background: #c19a72;
		color: #3b2a1c;
		font-family: Nunito, ui-sans-serif, system-ui, sans-serif;
	}
</style>
