export type GameManifest = {
	id: string;
	title: string;
	genre: string;
	players: string;
	tagline: string;
	blurb: string;
	description: string;
	href: string;
	accent: string;
	glow: string;
	cabinet: string;
	order?: number;
	theme?: string;
	favicon?: string;
	keywords?: string[];
};

function folderFrom(path: string) {
	const parts = path.split('/');
	return parts.at(-2) ?? path;
}

const files = import.meta.glob<GameManifest>('./*/game.json', {
	eager: true,
	import: 'default'
});

export const GAME_MANIFESTS: GameManifest[] = Object.entries(files)
	.map(([path, manifest]) => {
		const id = manifest.id || folderFrom(path);
		return {
			...manifest,
			id,
			href: manifest.href || `/${id}`
		};
	})
	.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title));

export function manifestById(id: string | undefined) {
	if (!id) return undefined;
	return GAME_MANIFESTS.find((game) => game.id === id);
}

export function manifestForPath(pathname: string) {
	return GAME_MANIFESTS.find(
		(game) => pathname === game.href || pathname.startsWith(`${game.href}/`)
	);
}
