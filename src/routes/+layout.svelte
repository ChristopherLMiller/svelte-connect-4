<script lang="ts">
	import { page } from '$app/state';
	import Atmosphere from '$lib/components/Atmosphere.svelte';
	import SettingsPanel from '$lib/components/SettingsPanel.svelte';
	import { hydrateSettings, primeAudio } from '$lib/game/settings.svelte';
	import {
		absoluteUrl,
		OG_IMAGE,
		OG_IMAGE_ALT,
		OG_IMAGE_FALLBACK,
		SITE_DESCRIPTION,
		SITE_NAME,
		SITE_TITLE
	} from '$lib/seo';
	import '../app.css';

	let { children } = $props();
	const origin = $derived(page.url.origin);
	const canonical = $derived(`${origin}${page.url.pathname}`);
	const shareImage = $derived(
		origin.startsWith('http://sveltekit-prerender') || origin.startsWith('http://localhost')
			? OG_IMAGE_FALLBACK
			: absoluteUrl(origin, OG_IMAGE)
	);

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
	<title>{SITE_TITLE}</title>
	<meta name="description" content={SITE_DESCRIPTION} />
	<link rel="canonical" href={canonical} />
	<meta property="og:url" content={canonical} />
	<meta property="og:title" content={SITE_TITLE} />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:image" content={shareImage} />
	<meta property="og:image:alt" content={OG_IMAGE_ALT} />
	<meta name="twitter:image" content={shareImage} />
	<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
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
