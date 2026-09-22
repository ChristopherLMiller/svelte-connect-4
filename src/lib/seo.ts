import { GAME_MANIFESTS, manifestForPath, type GameManifest } from '$lib/games/manifests';

export const SITE_NAME = 'AI Arcade';
export const SITE_TITLE = 'AI Arcade — play the house';
export const SITE_DESCRIPTION =
	'AI Arcade. Live cabinets. Each title is its own world, and the house thinks back.';
export const SITE_TAGLINE = 'Drop a coin. The machines are waiting.';
export const THEME_COLOR = '#070014';
export const OG_IMAGE = '/arcade-og.png';
export const OG_STATIC_ROOT =
	'https://raw.githubusercontent.com/ChristopherLMiller/svelte-connect-4/main/static';

export type PageSeo = {
	title: string;
	description: string;
	keywords: string;
	theme: string;
	favicon: string;
	canonicalPath: string;
	ogAlt: string;
	image: string;
	jsonLd: Record<string, unknown>;
};

export function absoluteUrl(origin: string, path: string) {
	if (/^https?:\/\//i.test(path)) return path;
	return `${origin.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

export function shareImageFor(origin: string, imagePath = OG_IMAGE) {
	const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
	// Prerender origin is not public. Point crawlers at the committed static file.
	// Leave localhost alone so local inspection shows the real arcade art, not GitHub's old Connect 4 card.
	if (origin.startsWith('http://sveltekit-prerender')) {
		return `${OG_STATIC_ROOT}${path}`;
	}
	return absoluteUrl(origin, path);
}

export function namedList(items: string[]) {
	if (items.length === 0) return '';
	if (items.length === 1) return items[0];
	if (items.length === 2) return `${items[0]} and ${items[1]}`;
	return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`;
}

function unique(values: string[]) {
	const seen = new Set<string>();
	const next: string[] = [];
	for (const value of values) {
		const key = value.trim().toLowerCase();
		if (!key || seen.has(key)) continue;
		seen.add(key);
		next.push(value.trim());
	}
	return next;
}

function libraryDescription() {
	const titles = GAME_MANIFESTS.map((game) => game.title);
	if (!titles.length) return SITE_DESCRIPTION;
	return `AI Arcade. Live cabinets for ${namedList(titles)} — each title is its own world, and the house thinks back.`;
}

function libraryKeywords() {
	const fromGames = GAME_MANIFESTS.flatMap((game) => [game.title, game.genre, ...(game.keywords ?? [])]);
	return unique([SITE_NAME, 'arcade', 'web game', 'browser game', 'local multiplayer', ...fromGames]).join(
		', '
	);
}

function videoGameJson(game: GameManifest, origin?: string) {
	return {
		'@type': 'VideoGame',
		name: game.title,
		description: game.description,
		genre: game.genre,
		applicationCategory: 'GameApplication',
		playMode: ['SinglePlayer', 'MultiPlayer'],
		operatingSystem: 'Any',
		offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
		...(origin ? { url: absoluteUrl(origin, game.href) } : {})
	};
}

function librarySeo(): PageSeo {
	const titles = GAME_MANIFESTS.map((game) => game.title);
	const description = libraryDescription();
	return {
		title: SITE_TITLE,
		description,
		keywords: libraryKeywords(),
		theme: THEME_COLOR,
		favicon: '/favicon.svg',
		canonicalPath: '/',
		ogAlt: titles.length
			? `AI Arcade marquee over live game cabinets for ${namedList(titles)}.`
			: 'AI Arcade marquee over live game cabinets.',
		image: OG_IMAGE,
		jsonLd: {
			'@context': 'https://schema.org',
			'@type': 'WebApplication',
			name: SITE_NAME,
			alternateName: SITE_NAME,
			description,
			applicationCategory: 'GameApplication',
			operatingSystem: 'Any',
			offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
			hasPart: GAME_MANIFESTS.map((game) => videoGameJson(game))
		}
	};
}

function gameSeo(game: GameManifest): PageSeo {
	return {
		title: `${game.title} — ${SITE_NAME}`,
		description: game.description,
		keywords: unique([
			game.title,
			game.genre,
			SITE_NAME,
			'arcade',
			'web game',
			...(game.keywords ?? [])
		]).join(', '),
		theme: game.theme || THEME_COLOR,
		favicon: game.favicon || '/favicon.svg',
		canonicalPath: game.href,
		ogAlt: `${game.title} on AI Arcade. ${game.tagline}`,
		image: game.og || OG_IMAGE,
		jsonLd: {
			'@context': 'https://schema.org',
			...videoGameJson(game),
			isPartOf: {
				'@type': 'WebApplication',
				name: SITE_NAME,
				description: libraryDescription()
			}
		}
	};
}

export function seoForPath(pathname: string): PageSeo {
	const game = manifestForPath(pathname);
	return game ? gameSeo(game) : librarySeo();
}

export function siteTitleFor(pathname: string) {
	return seoForPath(pathname).title;
}

export function siteDescriptionFor(pathname: string) {
	return seoForPath(pathname).description;
}

function withAbsoluteJsonLd(data: Record<string, unknown>, origin: string, canonicalPath: string) {
	const payload: Record<string, unknown> = {
		...data,
		url: absoluteUrl(origin, canonicalPath)
	};
	if (payload.isPartOf && typeof payload.isPartOf === 'object') {
		payload.isPartOf = {
			...(payload.isPartOf as Record<string, unknown>),
			url: absoluteUrl(origin, '/')
		};
	}
	if (Array.isArray(payload.hasPart)) {
		payload.hasPart = GAME_MANIFESTS.map((game) => videoGameJson(game, origin));
	}
	return payload;
}

export function jsonLdPayload(seo: PageSeo, origin: string) {
	const payload = withAbsoluteJsonLd(seo.jsonLd, origin, seo.canonicalPath);
	return JSON.stringify(payload).replace(/</g, '\\u003c');
}

export function jsonLdScript(seo: PageSeo, origin: string) {
	return `<script id="arcade-json-ld" type="application/ld+json">${jsonLdPayload(seo, origin)}</script>`;
}

function escapeAttr(value: string) {
	return value
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

function upsertMeta(html: string, attr: 'name' | 'property', key: string, content: string) {
	const tag = `<meta ${attr}="${key}" content="${escapeAttr(content)}" />`;
	const pattern = new RegExp(`<meta\\s+${attr}="${key}"[^>]*>`, 'i');
	if (pattern.test(html)) return html.replace(pattern, tag);
	return html.replace(/<\/head>/i, `\t${tag}\n\t</head>`);
}

function upsertLink(html: string, rel: string, href: string, extra = '') {
	const tag = `<link rel="${rel}" href="${escapeAttr(href)}"${extra} />`;
	const pattern = new RegExp(`<link\\s+rel="${rel}"[^>]*>`, 'i');
	if (pattern.test(html)) return html.replace(pattern, tag);
	return html.replace(/<\/head>/i, `\t${tag}\n\t</head>`);
}

export function stampHtmlSeo(html: string, seo: PageSeo, origin: string) {
	const canonical = absoluteUrl(origin, seo.canonicalPath === '/' ? '/' : seo.canonicalPath);
	const image = shareImageFor(origin, seo.image);
	let next = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeAttr(seo.title)}</title>`);
	if (!/<title>/i.test(next)) {
		next = next.replace(/<\/head>/i, `\t<title>${escapeAttr(seo.title)}</title>\n\t</head>`);
	}
	next = upsertMeta(next, 'name', 'description', seo.description);
	next = upsertMeta(next, 'name', 'keywords', seo.keywords);
	next = upsertMeta(next, 'name', 'theme-color', seo.theme);
	next = upsertMeta(next, 'name', 'application-name', SITE_NAME);
	next = upsertMeta(next, 'name', 'apple-mobile-web-app-title', seo.title);
	next = upsertMeta(next, 'property', 'og:site_name', SITE_NAME);
	next = upsertMeta(next, 'property', 'og:title', seo.title);
	next = upsertMeta(next, 'property', 'og:description', seo.description);
	next = upsertMeta(next, 'property', 'og:url', canonical);
	next = upsertMeta(next, 'property', 'og:image', image);
	next = upsertMeta(next, 'property', 'og:image:alt', seo.ogAlt);
	next = upsertMeta(next, 'name', 'twitter:title', seo.title);
	next = upsertMeta(next, 'name', 'twitter:description', seo.description);
	next = upsertMeta(next, 'name', 'twitter:image', image);
	next = upsertMeta(next, 'name', 'twitter:image:alt', seo.ogAlt);
	next = upsertLink(next, 'canonical', canonical);
	next = upsertLink(next, 'icon', seo.favicon, ' type="image/svg+xml"');
	const script = jsonLdScript(seo, origin);
	if (/<script id="arcade-json-ld"[^>]*>[\s\S]*?<\/script>/i.test(next)) {
		return next.replace(/<script id="arcade-json-ld"[^>]*>[\s\S]*?<\/script>/i, script);
	}
	if (/<script type="application\/ld\+json">[\s\S]*?<\/script>/i.test(next)) {
		return next.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/i, script);
	}
	return next.replace(/<\/head>/i, `\t${script}\n\t</head>`);
}
