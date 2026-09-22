<script lang="ts">
	import { page } from '$app/state';
	import { primeAudio, hydrateAudio } from '$lib/audio/prefs.svelte';
	import { jsonLdPayload, seoForPath, shareImageFor, SITE_NAME } from '$lib/seo';
	import '../app.css';

	let { children } = $props();
	const origin = $derived(page.url.origin);
	const path = $derived(page.url.pathname);
	const seo = $derived(seoForPath(path));
	const canonical = $derived(`${origin}${seo.canonicalPath === '/' ? '/' : seo.canonicalPath}`);
	const shareImage = $derived(shareImageFor(origin, seo.image));

	$effect(() => {
		hydrateAudio();
	});

	$effect(() => {
		const payload = jsonLdPayload(seo, origin);
		let node = document.getElementById('arcade-json-ld');
		if (!node) {
			node = document.createElement('script');
			node.id = 'arcade-json-ld';
			node.setAttribute('type', 'application/ld+json');
			document.head.appendChild(node);
		}
		node.textContent = payload;
	});
</script>

<svelte:window onpointerdown={primeAudio} />

<svelte:head>
	<title>{seo.title}</title>
	<meta name="description" content={seo.description} />
	<meta name="keywords" content={seo.keywords} />
	<meta name="theme-color" content={seo.theme} />
	<meta name="application-name" content={SITE_NAME} />
	<meta name="apple-mobile-web-app-title" content={seo.title} />
	<link rel="canonical" href={canonical} />
	<meta property="og:url" content={canonical} />
	<meta property="og:title" content={seo.title} />
	<meta property="og:description" content={seo.description} />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:image" content={shareImage} />
	<meta property="og:image:alt" content={seo.ogAlt} />
	<meta name="twitter:image" content={shareImage} />
	<meta name="twitter:image:alt" content={seo.ogAlt} />
	<meta name="twitter:title" content={seo.title} />
	<meta name="twitter:description" content={seo.description} />
	<link rel="icon" href={seo.favicon} type="image/svg+xml" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
</svelte:head>

{@render children()}
