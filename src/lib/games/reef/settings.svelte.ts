import { peekReef, writeReef, type Handling } from './persist';
import { depthOf, type Mode } from './types';

const boot = peekReef();

export const reefPrefs = $state({
	mode: boot.mode as Mode,
	startLevel: boot.startLevel,
	ghost: boot.ghost,
	handling: boot.handling as Handling
});

export const reefBest = $state({
	score: boot.bestScore,
	lines: boot.bestLines,
	depth: boot.bestDepth,
	sprint: boot.bestSprint
});

export const reefPanel = $state({ open: false });
export const reefGuide = $state({ open: false });

/** Delayed auto shift and auto repeat rate, in milliseconds. */
export const HANDLING: Record<Handling, { das: number; arr: number; label: string }> = {
	gentle: { das: 210, arr: 50, label: 'Gentle' },
	standard: { das: 160, arr: 33, label: 'Standard' },
	swift: { das: 115, arr: 0, label: 'Swift' }
};

export function hydrateReef() {
	const prefs = peekReef();
	reefPrefs.mode = prefs.mode;
	reefPrefs.startLevel = prefs.startLevel;
	reefPrefs.ghost = prefs.ghost;
	reefPrefs.handling = prefs.handling;
	reefBest.score = prefs.bestScore;
	reefBest.lines = prefs.bestLines;
	reefBest.depth = prefs.bestDepth;
	reefBest.sprint = prefs.bestSprint;
}

export function persistReefPrefs() {
	writeReef({ ...reefPrefs });
}

export function recordMarathon(score: number, lines: number, level: number) {
	const prefs = peekReef();
	const depth = depthOf(level);
	writeReef({
		bestScore: Math.max(prefs.bestScore, score),
		bestLines: Math.max(prefs.bestLines, lines),
		bestDepth: Math.max(prefs.bestDepth, depth)
	});
	reefBest.score = peekReef().bestScore;
	reefBest.lines = peekReef().bestLines;
	reefBest.depth = peekReef().bestDepth;
}

/** Returns true when the time is a new best. */
export function recordSprint(ms: number) {
	const prefs = peekReef();
	const better = !prefs.bestSprint || ms < prefs.bestSprint;
	if (better) writeReef({ bestSprint: ms });
	reefBest.sprint = peekReef().bestSprint;
	return better;
}

export function openReefSettings() {
	reefGuide.open = false;
	reefPanel.open = true;
}

export function closeReefSettings() {
	reefPanel.open = false;
}

export function openReefGuide() {
	reefPanel.open = false;
	reefGuide.open = true;
}

export function closeReefGuide() {
	reefGuide.open = false;
}

export function formatTime(seconds: number) {
	const total = Math.max(0, seconds);
	const m = Math.floor(total / 60);
	const s = total - m * 60;
	return `${m}:${s < 10 ? '0' : ''}${s.toFixed(2)}`;
}
