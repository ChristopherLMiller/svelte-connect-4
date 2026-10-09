import { peekKoi, writeKoi, type Aim } from './persist';
import type { Mode } from './types';

const boot = peekKoi();

export const koiPrefs = $state({
	mode: boot.mode as Mode,
	aim: boot.aim as Aim,
	hints: boot.hints
});

export const koiBest = $state({
	ripples: { ...boot.ripples },
	currents: { ...boot.currents }
});

export const koiPanel = $state({ open: false });
export const koiGuide = $state({ open: false });

export function hydrateKoi() {
	const prefs = peekKoi();
	koiPrefs.mode = prefs.mode;
	koiPrefs.aim = prefs.aim;
	koiPrefs.hints = prefs.hints;
	koiBest.ripples = { ...prefs.ripples };
	koiBest.currents = { ...prefs.currents };
}

export function persistKoiPrefs() {
	writeKoi({ ...koiPrefs });
}

/** Returns true when the score is a new best for the mode. */
export function recordRun(mode: Mode, score: number, stage: number, chain = 0) {
	const prefs = peekKoi();
	if (mode === 'ripples') {
		const better = score > prefs.ripples.score;
		writeKoi({ ripples: { score: Math.max(prefs.ripples.score, score), stage: Math.max(prefs.ripples.stage, stage) } });
		koiBest.ripples = { ...peekKoi().ripples };
		return better;
	}
	const better = score > prefs.currents.score;
	writeKoi({
		currents: {
			score: Math.max(prefs.currents.score, score),
			stage: Math.max(prefs.currents.stage, stage),
			chain: Math.max(prefs.currents.chain, chain)
		}
	});
	koiBest.currents = { ...peekKoi().currents };
	return better;
}

export function openKoiSettings() {
	koiGuide.open = false;
	koiPanel.open = true;
}

export function closeKoiSettings() {
	koiPanel.open = false;
}

export function openKoiGuide() {
	koiPanel.open = false;
	koiGuide.open = true;
}

export function closeKoiGuide() {
	koiGuide.open = false;
}
