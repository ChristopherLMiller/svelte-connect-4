import { LIBRARY_GAMES } from '$lib/games/catalog';

export const prerender = true;

export function entries() {
	return LIBRARY_GAMES.map((game) => ({ game: game.id }));
}
