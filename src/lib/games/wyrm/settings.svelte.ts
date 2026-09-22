import { peekWyrm, writeBest, writeWyrm, type WyrmPrefs } from './persist';
import type { Difficulty } from './types';

const boot = peekWyrm();

export const wyrmPlay = $state({
	difficulty: boot.difficulty as Difficulty
});

export const wyrmBest = $state({
	easy: boot.best.easy,
	medium: boot.best.medium,
	hard: boot.best.hard
});

export const wyrmPanel = $state({
	open: false
});

export function hydrateWyrm() {
	const prefs = peekWyrm();
	wyrmPlay.difficulty = prefs.difficulty;
	copyBest(prefs);
}

function copyBest(prefs: WyrmPrefs) {
	wyrmBest.easy = prefs.best.easy;
	wyrmBest.medium = prefs.best.medium;
	wyrmBest.hard = prefs.best.hard;
}

export function recordWyrmScore(difficulty: Difficulty, score: number) {
	writeBest(difficulty, score);
	if (score > wyrmBest[difficulty]) wyrmBest[difficulty] = score;
}

export function persistWyrmPlay() {
	writeWyrm({ difficulty: wyrmPlay.difficulty });
}

export function openWyrmSettings() {
	wyrmPanel.open = true;
}

export function closeWyrmSettings() {
	wyrmPanel.open = false;
}
