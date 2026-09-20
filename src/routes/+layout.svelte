<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import Atmosphere from '$lib/components/Atmosphere.svelte';
	import SettingsPanel from '$lib/components/SettingsPanel.svelte';
	import { hydrateSettings, primeAudio } from '$lib/game/settings.svelte';
	import '../app.css';

	let { children } = $props();

	$effect(() => {
		let stop: (() => void) | undefined;
		void hydrateSettings().then((cleanup) => {
			stop = cleanup;
		});
		return () => stop?.();
	});
</script>

<svelte:window onpointerdown={primeAudio} />

<svelte:head>
	<title>Connect 4 — Arcade Protocol</title>
	<meta
		name="description"
		content="A luminous Connect 4 arena with gravity drops, bounce physics, local duels, and a minimax AI."
	/>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Sora:wght@400;500;600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<main>
	<Atmosphere />
	<div class="shell">
		{@render children()}
	</div>
	<SettingsPanel />
</main>

<style>
	main {
		min-height: 100dvh;
		height: 100dvh;
		position: relative;
		display: grid;
		place-items: center;
		padding: 16px 20px 28px;
	}

	.shell {
		width: min(1320px, 100%);
		height: 100%;
		min-height: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}
</style>
