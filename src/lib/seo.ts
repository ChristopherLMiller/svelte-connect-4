export const SITE_NAME = 'Arcade Protocol';
export const SITE_TITLE = 'Connect 4 — Arcade Protocol';
export const SITE_DESCRIPTION =
	'A luminous sci-fi Connect 4 arena with gravity drops, bounce physics, hotseat duels, and a minimax neural core.';
export const SITE_TAGLINE = 'Drop with gravity. Bounce with restitution. Claim four in a line.';
export const THEME_COLOR = '#07060d';
export const OG_IMAGE = '/og.png';
export const OG_IMAGE_ALT =
	'Arcade Protocol title screen: CONNECT 4 in neon type over a starfield, with crimson, gold, and cyan orbs.';
export const OG_IMAGE_FALLBACK =
	'https://raw.githubusercontent.com/ChristopherLMiller/svelte-connect-4/main/static/og.png';

export function absoluteUrl(origin: string, path: string) {
	if (/^https?:\/\//i.test(path)) return path;
	return `${origin.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}
