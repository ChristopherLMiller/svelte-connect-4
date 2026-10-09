import { peekPinball, writePinball, type Bests } from './persist';
import type { Difficulty, TableId } from './types';

const boot = peekPinball();

export const pinballPrefs = $state({
	table: boot.table as TableId,
	difficulty: boot.difficulty as Difficulty,
	rumble: boot.rumble,
	voice: boot.voice
});

export const pinballBest = $state<Bests>(structuredClone(boot.best));

export const pinballPanel = $state({ open: false });
export const pinballGuide = $state({ open: false });

export function hydratePinball() {
	const prefs = peekPinball();
	pinballPrefs.table = prefs.table;
	pinballPrefs.difficulty = prefs.difficulty;
	pinballPrefs.rumble = prefs.rumble;
	pinballPrefs.voice = prefs.voice;
	for (const id in prefs.best) pinballBest[id as TableId] = structuredClone(prefs.best[id as TableId]);
}

export function persistPinballPrefs() {
	writePinball({ table: pinballPrefs.table, difficulty: pinballPrefs.difficulty, rumble: pinballPrefs.rumble, voice: pinballPrefs.voice });
}

/** Returns true when the score is a new best for the table and difficulty. */
export function recordGame(table: TableId, difficulty: Difficulty, score: number, feat: number) {
	const prefs = peekPinball();
	const old = prefs.best[table][difficulty];
	const better = score > old.score;
	const best = { score: Math.max(old.score, score), feat: Math.max(old.feat, feat) };
	const all = { ...prefs.best, [table]: { ...prefs.best[table], [difficulty]: best } };
	writePinball({ best: all, played: prefs.played + 1 });
	pinballBest[table][difficulty] = { ...best };
	return better;
}

export function openPinballSettings() {
	pinballGuide.open = false;
	pinballPanel.open = true;
}

export function closePinballSettings() {
	pinballPanel.open = false;
}

export function openPinballGuide() {
	pinballPanel.open = false;
	pinballGuide.open = true;
}

export function closePinballGuide() {
	pinballGuide.open = false;
}
