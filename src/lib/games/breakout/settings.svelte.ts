import { CHAPTERS } from './levels';
import { peekChapel, writeBest, writeChapel } from './persist';
import type { Difficulty } from './types';

const boot = peekChapel();

export const chapelPlay = $state({ difficulty: boot.difficulty as Difficulty, chapter: null as number | null });

/** Chapters open at this hour: the first, plus every one whose first window has been reached. */
export function openChapters(difficulty: Difficulty) {
	return Math.max(1, CHAPTERS.filter((chapter) => chapter.start <= chapelReached[difficulty]).length);
}

/** The chapter a new run begins in: the player's pick, else the furthest open one. */
export function chosenChapter(difficulty: Difficulty) {
	const open = openChapters(difficulty);
	return Math.min(chapelPlay.chapter ?? open - 1, open - 1);
}

export const chapelBest = $state({ ...boot.best });
export const chapelReached = $state({ ...boot.reached });

export const chapelPanel = $state({ open: false });
export const chapelGuide = $state({ open: false });

export function hydrateChapel() {
	const prefs = peekChapel();
	chapelPlay.difficulty = prefs.difficulty;
	Object.assign(chapelBest, prefs.best);
	Object.assign(chapelReached, prefs.reached);
}

/** `unlocked` is the first window not yet lit on this run. */
export function recordChapelRun(difficulty: Difficulty, score: number, unlocked: number) {
	writeBest(difficulty, score, unlocked);
	chapelBest[difficulty] = peekChapel().best[difficulty];
	chapelReached[difficulty] = peekChapel().reached[difficulty];
}

export function persistChapelPlay() {
	writeChapel({ difficulty: chapelPlay.difficulty });
}

export function openChapelSettings() {
	chapelGuide.open = false;
	chapelPanel.open = true;
}

export function closeChapelSettings() {
	chapelPanel.open = false;
}

export function openChapelGuide() {
	chapelPanel.open = false;
	chapelGuide.open = true;
}

export function closeChapelGuide() {
	chapelGuide.open = false;
}
