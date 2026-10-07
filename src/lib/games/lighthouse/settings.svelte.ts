import { createGamePanels } from '../kit/panels.svelte';
import { lightPrefs, readView, writeView, type LightView } from './persist';

const panels = createGamePanels(lightPrefs);

export const lightPlay = panels.play;
export const lightScores = panels.scores;
export const lightPanel = panels.panel;
export const lightGuide = panels.guide;
export const lightPanels = panels;

export const recordLightScore = panels.recordScore;
export const persistLightPlay = panels.persistPlay;
export const openLightSettings = panels.openSettings;
export const closeLightSettings = panels.closeSettings;
export const openLightGuide = panels.openGuide;
export const closeLightGuide = panels.closeGuide;

export const lightView = $state<LightView>(readView());

export function hydrateLight() {
	panels.hydrate();
	Object.assign(lightView, readView());
}

export function persistLightView() {
	writeView({ ...lightView });
}
