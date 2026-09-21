import { peekTtt, writeScores, writeTtt, type TttPrefs } from './persist';
import type { Difficulty, GameMode } from './types';

const boot = peekTtt();

export const tttPlay = $state({
	mode: boot.mode as GameMode,
	difficulty: boot.difficulty as Difficulty
});

export const tttScores = $state({
	local: { 1: boot.scores.local[1], 2: boot.scores.local[2] },
	ai: {
		easy: { 1: boot.scores.ai.easy[1], 2: boot.scores.ai.easy[2] },
		medium: { 1: boot.scores.ai.medium[1], 2: boot.scores.ai.medium[2] },
		hard: { 1: boot.scores.ai.hard[1], 2: boot.scores.ai.hard[2] }
	}
});

export const tttPanel = $state({
	open: false
});

export function hydrateTtt() {
	const prefs = peekTtt();
	tttPlay.mode = prefs.mode;
	tttPlay.difficulty = prefs.difficulty;
	copyScores(prefs);
}

function copyScores(prefs: TttPrefs) {
	tttScores.local = { 1: prefs.scores.local[1], 2: prefs.scores.local[2] };
	tttScores.ai.easy = { 1: prefs.scores.ai.easy[1], 2: prefs.scores.ai.easy[2] };
	tttScores.ai.medium = { 1: prefs.scores.ai.medium[1], 2: prefs.scores.ai.medium[2] };
	tttScores.ai.hard = { 1: prefs.scores.ai.hard[1], 2: prefs.scores.ai.hard[2] };
}

export function recordTttScore(mode: GameMode, difficulty: Difficulty, scores: { 1: number; 2: number }) {
	writeScores(mode, difficulty, scores);
	if (mode === 'ai') tttScores.ai[difficulty] = { 1: scores[1], 2: scores[2] };
	else tttScores.local = { 1: scores[1], 2: scores[2] };
}

export function persistTttPlay() {
	writeTtt({ mode: tttPlay.mode, difficulty: tttPlay.difficulty });
}

export function openTttSettings() {
	tttPanel.open = true;
}

export function closeTttSettings() {
	tttPanel.open = false;
}
