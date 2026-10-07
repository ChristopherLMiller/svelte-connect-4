import { createGamePanels } from '../kit/panels.svelte';
import { cartographerPrefs, readView, writeView, type CartView } from './persist';

const panels = createGamePanels(cartographerPrefs);

export const cartPlay = panels.play;
export const cartScores = panels.scores;
export const cartPanel = panels.panel;
export const cartGuide = panels.guide;
export const cartPanels = panels;

export const recordCartScore = panels.recordScore;
export const persistCartPlay = panels.persistPlay;
export const openCartSettings = panels.openSettings;
export const closeCartSettings = panels.closeSettings;
export const openCartGuide = panels.openGuide;
export const closeCartGuide = panels.closeGuide;

export const cartView = $state<CartView>(readView());

export function hydrateCartographer() {
	panels.hydrate();
	Object.assign(cartView, readView());
}

export function persistCartView() {
	writeView({ ...cartView });
}
