import { persistAudio, audioSettings, primeAudio, syncAudio } from '$lib/audio/prefs.svelte';
import { restoreMusicTrack } from './audio';
import {
	hydratePrefs,
	onPrefs,
	onPrefsLifecycle,
	peekPrefs,
	writePrefs,
	type Prefs,
	type SavedGame,
	type Skin
} from './persist';

export type BoardSkin = Skin;
export { audioSettings, primeAudio, syncAudio };

const boot = peekPrefs();

export const panel = $state({
	open: false
});

export const lookSettings = $state({
	skin: boot.skin,
	pieces: boot.pieces,
	threatAlerts: boot.threatAlerts
});

export const playSettings = $state({
	mode: boot.mode,
	difficulty: boot.difficulty
});

export const scoreboard = $state({
	local: { 1: boot.scores.local[1], 2: boot.scores.local[2] },
	ai: {
		easy: { 1: boot.scores.ai.easy[1], 2: boot.scores.ai.easy[2] },
		medium: { 1: boot.scores.ai.medium[1], 2: boot.scores.ai.medium[2] },
		hard: { 1: boot.scores.ai.hard[1], 2: boot.scores.ai.hard[2] }
	}
});

export const matchSave = $state({
	game: boot.savedGame as SavedGame | null
});

function copyScores(prefs: Prefs) {
	scoreboard.local = { 1: prefs.scores.local[1], 2: prefs.scores.local[2] };
	scoreboard.ai.easy = { 1: prefs.scores.ai.easy[1], 2: prefs.scores.ai.easy[2] };
	scoreboard.ai.medium = { 1: prefs.scores.ai.medium[1], 2: prefs.scores.ai.medium[2] };
	scoreboard.ai.hard = { 1: prefs.scores.ai.hard[1], 2: prefs.scores.ai.hard[2] };
	matchSave.game = prefs.savedGame;
}

function snapshotPrefs() {
	return {
		sfxOn: audioSettings.sfxOn,
		musicOn: audioSettings.musicOn,
		sfxVolume: audioSettings.sfxVolume,
		musicVolume: audioSettings.musicVolume,
		skin: lookSettings.skin,
		pieces: lookSettings.pieces,
		threatAlerts: lookSettings.threatAlerts,
		mode: playSettings.mode,
		difficulty: playSettings.difficulty
	};
}

export function persistSettings(extra: Parameters<typeof writePrefs>[0] = {}) {
	persistAudio();
	writePrefs({ ...snapshotPrefs(), ...extra });
}

export function setBoardSkin(skin: BoardSkin) {
	lookSettings.skin = skin;
	persistSettings();
}

export function setPieceStyle(pieces: BoardSkin) {
	lookSettings.pieces = pieces;
	persistSettings();
}

export function setThreatAlerts(on: boolean) {
	lookSettings.threatAlerts = on;
	persistSettings();
}

export function openSettings() {
	guide.open = false;
	panel.open = true;
}

export function closeSettings() {
	panel.open = false;
}

export function toggleSettings() {
	if (panel.open) closeSettings();
	else openSettings();
}

export const guide = $state({
	open: false
});

export function openGuide() {
	panel.open = false;
	guide.open = true;
}

export function closeGuide() {
	guide.open = false;
}

let lifecycleBound = false;

export async function hydrateSettings() {
	const prefs = await hydratePrefs();
	lookSettings.skin = prefs.skin;
	lookSettings.pieces = prefs.pieces;
	lookSettings.threatAlerts = prefs.threatAlerts;
	playSettings.mode = prefs.mode;
	playSettings.difficulty = prefs.difficulty;
	copyScores(prefs);
	restoreMusicTrack(prefs.musicTrack);
	if (lifecycleBound) return () => undefined;
	lifecycleBound = true;
	const stopLife = onPrefsLifecycle();
	const stopWatch = onPrefs(copyScores);
	return () => {
		stopLife();
		stopWatch();
	};
}
