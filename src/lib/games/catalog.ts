import type { Component } from 'svelte';
import { GAME_MANIFESTS, type GameManifest } from './manifests';

export type { GameManifest };
export { GAME_MANIFESTS, manifestById, manifestForPath } from './manifests';

export type LibraryGame = GameManifest & {
	Preview: Component;
};

type SvelteModule = { default: Component };

const previews = import.meta.glob<SvelteModule>('./*/preview.svelte', {
	eager: true
});

const pages = import.meta.glob<SvelteModule>('./*/Page.svelte');
const layouts = import.meta.glob<SvelteModule>('./*/Layout.svelte');

export const LIBRARY_GAMES: LibraryGame[] = GAME_MANIFESTS.flatMap((manifest) => {
	const Preview = previews[`./${manifest.id}/preview.svelte`]?.default;
	if (!Preview) return [];
	return [{ ...manifest, Preview }];
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
