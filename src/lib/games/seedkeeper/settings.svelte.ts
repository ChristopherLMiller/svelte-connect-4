import { createGamePanels } from '../kit/panels.svelte';
import { readView, seedkeeperPrefs, writeView, type SeedView } from './persist';

const panels = createGamePanels(seedkeeperPrefs);

export const seedPlay = panels.play;
export const seedScores = panels.scores;
export const seedPanel = panels.panel;
export const seedGuide = panels.guide;
export const seedPanels = panels;

export const recordSeedScore = panels.recordScore;
export const persistSeedPlay = panels.persistPlay;
export const openSeedSettings = panels.openSettings;
export const closeSeedSettings = panels.closeSettings;
export const openSeedGuide = panels.openGuide;
export const closeSeedGuide = panels.closeGuide;

export const seedView = $state<SeedView>(readView());

export function hydrateSeedkeeper() {
	panels.hydrate();
	Object.assign(seedView, readView());
}

export function persistSeedView() {
	writeView({ ...seedView });
}
