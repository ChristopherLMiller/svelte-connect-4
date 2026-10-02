import { createGamePanels } from '../kit/panels.svelte';
import { eclipsePrefs, readHints, readPieces, writeHints, writePieces, type PieceStyle } from './persist';

const panels = createGamePanels(eclipsePrefs);

export const eclPlay = panels.play;
export const eclScores = panels.scores;
export const eclPanel = panels.panel;
export const eclGuide = panels.guide;
export const eclPanels = panels;

export const recordEclScore = panels.recordScore;
export const persistEclPlay = panels.persistPlay;
export const openEclSettings = panels.openSettings;
export const closeEclSettings = panels.closeSettings;
export const openEclGuide = panels.openGuide;
export const closeEclGuide = panels.closeGuide;

/** `hints`: engraved rings on the squares the current player may take. */
export const eclView = $state<{ hints: boolean; pieces: PieceStyle }>({
	hints: readHints(),
	pieces: readPieces()
});

export function hydrateEclipse() {
	panels.hydrate();
	eclView.hints = readHints();
	eclView.pieces = readPieces();
}

export function setEclHints(on: boolean) {
	eclView.hints = on;
	writeHints(on);
}

export function setEclPieces(style: PieceStyle) {
	eclView.pieces = style;
	writePieces(style);
}
