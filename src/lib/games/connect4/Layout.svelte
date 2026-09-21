<script lang="ts">
	import Atmosphere from './components/Atmosphere.svelte';
	import SettingsPanel from './components/SettingsPanel.svelte';
	import { setMusicStation } from '$lib/audio/station';
	import { primeAudio, hydrateSettings } from './settings.svelte';

	let { children } = $props();

	$effect(() => {
		setMusicStation('connect4');
		let stop: (() => void) | undefined;
		void hydrateSettings().then((cleanup) => {
			stop = cleanup;
		});
		return () => stop?.();
	});
</script>

<svelte:window onpointerdown={primeAudio} />

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Sora:wght@400;500;600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="chamber">
	<Atmosphere />
	<div class="shell">
		{@render children()}
	</div>
	<SettingsPanel />
</div>

<style>
	.chamber {
		color-scheme: dark;
		--void: #07060d;
		--void-2: #110d1c;
		--glass: rgba(16, 18, 36, 0.62);
		--line: rgba(255, 255, 255, 0.12);
		--text: #f4f1ff;
		--muted: #b7b0d0;
		--crimson: #ff335c;
		--crimson-deep: #c4123d;
		--gold: #f5c24b;
		--gold-deep: #c88814;
		--cyan: #5ce1e6;
		--violet: #8b7cff;
		--board: #1d4ed8;
		--board-deep: #1236a8;
		--font-display: 'Orbitron', sans-serif;
		--font-body: 'Sora', sans-serif;
		--shadow: 0 30px 80px rgba(0, 0, 0, 0.45);
		min-height: 100dvh;
		height: 100dvh;
		position: relative;
		display: grid;
		place-items: center;
		padding: 16px 20px 28px;
		background: var(--void);
		color: var(--text);
		font-family: var(--font-body);
	}

	.chamber :focus-visible {
		outline: 2px solid var(--cyan);
		outline-offset: 3px;
	}

	.chamber ::selection {
		background: color-mix(in srgb, var(--cyan) 40%, transparent);
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
