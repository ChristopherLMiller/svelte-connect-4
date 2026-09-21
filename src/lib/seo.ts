export const SITE_NAME = 'Arcade Protocol';
export const SITE_TITLE = 'Arcade Protocol — Game Launcher';
export const SITE_DESCRIPTION =
	'A flashy sci-fi arcade floor. Launch Connect 4 and more — gravity drops, bounce physics, shared volumes, and a living background score.';
export const SITE_TAGLINE = 'Pick a cabinet. Dial the volumes. Claim the grid.';
export const CONNECT4_TITLE = 'Connect 4 — Arcade Protocol';
export const CONNECT4_DESCRIPTION =
	'A luminous sci-fi Connect 4 arena with gravity drops, bounce physics, hotseat duels, and a minimax neural core.';
export const THEME_COLOR = '#07060d';
export const OG_IMAGE = '/og.png';
export const OG_IMAGE_ALT =
	'Arcade Protocol title screen: neon arcade branding over a starfield with crimson, gold, and cyan accents.';
export const OG_IMAGE_FALLBACK =
	'https://raw.githubusercontent.com/ChristopherLMiller/svelte-connect-4/main/static/og.png';

export function siteTitleFor(pathname: string) {
	if (pathname === '/connect4' || pathname.startsWith('/connect4/')) return CONNECT4_TITLE;
	return SITE_TITLE;
}

export function absoluteUrl(origin: string, path: string) {
	if (/^https?:\/\//i.test(path)) return path;
	return `${origin.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}
