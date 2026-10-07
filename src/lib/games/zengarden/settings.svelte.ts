import { createGamePanels } from '../kit/panels.svelte';
import { readView, writeView, zenPrefs, type ZenView } from './persist';

const panels = createGamePanels(zenPrefs);

export const zenPlay = panels.play;
export const zenScores = panels.scores;
export const zenPanel = panels.panel;
export const zenGuide = panels.guide;
export const zenPanels = panels;

export const recordZenScore = panels.recordScore;
export const persistZenPlay = panels.persistPlay;
export const openZenSettings = panels.openSettings;
export const closeZenSettings = panels.closeSettings;
export const openZenGuide = panels.openGuide;
export const closeZenGuide = panels.closeGuide;

export const zenView = $state<ZenView>(readView());

export function hydrateZen() {
	panels.hydrate();
	Object.assign(zenView, readView());
}

export function persistZenView() {
	writeView({ ...zenView });
}
