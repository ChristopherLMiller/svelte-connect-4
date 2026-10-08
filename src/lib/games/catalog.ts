import type { Component } from 'svelte';
import { GAME_MANIFESTS, type GameManifest } from './manifests';

export type { GameManifest };
export { GAME_MANIFESTS, manifestById, manifestForPath } from './manifests';

export type LibraryGame = GameManifest & {
	/** Loads the cabinet's attract preview. Split out so the hall does not boot every game at once. */
	preview: () => Promise<{ default: Component }>;
};

type SvelteModule = { default: Component };

const previews = import.meta.glob<SvelteModule>('./*/preview.svelte');

const previewCache = new Map<string, Promise<Component>>();

export function takePreview(game: LibraryGame) {
	let pending = previewCache.get(game.id);
	if (!pending) {
		pending = game.preview().then((mod) => mod.default);
		previewCache.set(game.id, pending);
	}
	return pending;
}

const pages = import.meta.glob<SvelteModule>('./*/Page.svelte');
const layouts = import.meta.glob<SvelteModule>('./*/Layout.svelte');

export const LIBRARY_GAMES: LibraryGame[] = GAME_MANIFESTS.flatMap((manifest) => {
	const preview = previews[`./${manifest.id}/preview.svelte`];
	if (!preview) return [];
	return [{ ...manifest, preview }];
});

export function gameById(id: string | undefined) {
	if (!id) return undefined;
	return LIBRARY_GAMES.find((game) => game.id === id);
}

export function gameForPath(pathname: string) {
	return LIBRARY_GAMES.find(
		(game) => pathname === game.href || pathname.startsWith(`${game.href}/`)
	);
}

export function pageLoader(id: string | undefined) {
	if (!id) return undefined;
	return pages[`./${id}/Page.svelte`];
}

export function layoutLoader(id: string | undefined) {
	if (!id) return undefined;
	return layouts[`./${id}/Layout.svelte`];
}

export function tickerCopy() {
	const titles = LIBRARY_GAMES.map((game) => game.title.toUpperCase());
	return [
		'FREE PLAY',
		...titles,
		'PLAYER 1 GET READY',
		'INSERT COIN',
		`${LIBRARY_GAMES.length} CABINETS ONLINE`,
		'THE HOUSE THINKS BACK'
	].join(' ★ ') + ' ★ ';
}
