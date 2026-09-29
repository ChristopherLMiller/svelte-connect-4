import { createGamePanels } from '../kit/panels.svelte';
import { checkersPrefs } from './persist';

const panels = createGamePanels(checkersPrefs);

export const ashPlay = panels.play;
export const ashScores = panels.scores;
export const ashPanel = panels.panel;
export const ashGuide = panels.guide;
export const ashPanels = panels;

export const hydrateAshcourt = panels.hydrate;
export const recordAshScore = panels.recordScore;
export const persistAshPlay = panels.persistPlay;
export const openAshSettings = panels.openSettings;
export const closeAshSettings = panels.closeSettings;
export const openAshGuide = panels.openGuide;
export const closeAshGuide = panels.closeGuide;
