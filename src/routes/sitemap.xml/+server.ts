import { GAME_MANIFESTS } from '$lib/games/manifests';

export const prerender = true;

export function GET({ url }) {
	const origin = url.origin.replace(/\/$/, '');
	const paths = ['/', ...GAME_MANIFESTS.map((game) => game.href)];
	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths
	.map(
		(path) => `	<url>
		<loc>${origin}${path === '/' ? '/' : path}</loc>
		<changefreq>weekly</changefreq>
	</url>`
	)
	.join('\n')}
</urlset>
`;
	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8'
		}
	});
}
