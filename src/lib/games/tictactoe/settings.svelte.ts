import { createGamePanels } from '../kit/panels.svelte';
import { tttPrefs } from './persist';

const panels = createGamePanels(tttPrefs);

export const tttPlay = panels.play;
export const tttScores = panels.scores;
export const tttPanel = panels.panel;
export const tttGuide = panels.guide;
export const tttPanels = panels;

export const hydrateTtt = panels.hydrate;
export const recordTttScore = panels.recordScore;
export const persistTttPlay = panels.persistPlay;
export const openTttSettings = panels.openSettings;
export const closeTttSettings = panels.closeSettings;
export const openTttGuide = panels.openGuide;
export const closeTttGuide = panels.closeGuide;
