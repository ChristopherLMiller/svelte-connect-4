<script lang="ts">
	import { page } from '$app/state';
	import Atmosphere from '$lib/components/Atmosphere.svelte';
	import SettingsPanel from '$lib/components/SettingsPanel.svelte';
	import { hydrateSettings, primeAudio } from '$lib/game/settings.svelte';
	import {
		absoluteUrl,
		CONNECT4_DESCRIPTION,
		OG_IMAGE,
		OG_IMAGE_ALT,
		OG_IMAGE_FALLBACK,
		SITE_DESCRIPTION,
		SITE_NAME,
		siteTitleFor
	} from '$lib/seo';
	import '../app.css';

	let { children } = $props();
	const origin = $derived(page.url.origin);
	const path = $derived(page.url.pathname);
	const onArcade = $derived(path === '/');
	const title = $derived(siteTitleFor(path));
	const description = $derived(
		path === '/connect4' || path.startsWith('/connect4/') ? CONNECT4_DESCRIPTION : SITE_DESCRIPTION
	);
	const canonical = $derived(`${origin}${path === '/' ? '/' : path}`);
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
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonical} />
	<meta property="og:url" content={canonical} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
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

<main class:arcade={onArcade}>
	<Atmosphere />
	<div class="shell" class:hall={onArcade}>
		{@render children()}
	</div>
	<SettingsPanel scope={onArcade ? 'arcade' : 'connect4'} />
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

	main.arcade {
		padding: 18px 18px 24px;
		align-items: stretch;
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

	.shell.hall {
		width: min(1180px, 100%);
		justify-content: stretch;
		overflow: auto;
	}
</style>
