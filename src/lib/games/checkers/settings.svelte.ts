import { peekCheckers, writeCheckers, writeScores, type CheckersPrefs } from './persist';
import type { Difficulty, GameMode } from './types';

const boot = peekCheckers();

export const ashPlay = $state({
	mode: boot.mode as GameMode,
	difficulty: boot.difficulty as Difficulty
});

export const ashScores = $state({
	local: { 1: boot.scores.local[1], 2: boot.scores.local[2] },
	ai: {
		easy: { 1: boot.scores.ai.easy[1], 2: boot.scores.ai.easy[2] },
		medium: { 1: boot.scores.ai.medium[1], 2: boot.scores.ai.medium[2] },
		hard: { 1: boot.scores.ai.hard[1], 2: boot.scores.ai.hard[2] }
	}
});

export const ashPanel = $state({
	open: false
});

export function hydrateAshcourt() {
	const prefs = peekCheckers();
	ashPlay.mode = prefs.mode;
	ashPlay.difficulty = prefs.difficulty;
	copyScores(prefs);
}

function copyScores(prefs: CheckersPrefs) {
	ashScores.local = { 1: prefs.scores.local[1], 2: prefs.scores.local[2] };
	ashScores.ai.easy = { 1: prefs.scores.ai.easy[1], 2: prefs.scores.ai.easy[2] };
	ashScores.ai.medium = { 1: prefs.scores.ai.medium[1], 2: prefs.scores.ai.medium[2] };
	ashScores.ai.hard = { 1: prefs.scores.ai.hard[1], 2: prefs.scores.ai.hard[2] };
}

export function recordAshScore(mode: GameMode, difficulty: Difficulty, scores: { 1: number; 2: number }) {
	writeScores(mode, difficulty, scores);
	if (mode === 'ai') ashScores.ai[difficulty] = { 1: scores[1], 2: scores[2] };
	else ashScores.local = { 1: scores[1], 2: scores[2] };
}

export function persistAshPlay() {
	writeCheckers({ mode: ashPlay.mode, difficulty: ashPlay.difficulty });
}

export function openAshSettings() {
	ashPanel.open = true;
}

export function closeAshSettings() {
	ashPanel.open = false;
}
