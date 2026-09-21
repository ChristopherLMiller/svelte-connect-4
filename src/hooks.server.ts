import type { Handle } from '@sveltejs/kit';
import { seoForPath, stampHtmlSeo } from '$lib/seo';

export const handle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.endsWith('.xml')) return resolve(event);
	const seo = seoForPath(event.url.pathname);
	return resolve(event, {
		transformPageChunk: ({ html }) =>
			html.includes('</head>') ? stampHtmlSeo(html, seo, event.url.origin) : html
	});
};
