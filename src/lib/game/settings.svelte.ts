import { applyAudioPrefs, restoreMusicTrack, unlockAudio } from './audio';
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

const boot = peekPrefs();

export const audioSettings = $state({
	sfxOn: boot.sfxOn,
	musicOn: boot.musicOn,
	sfxVolume: boot.sfxVolume,
	musicVolume: boot.musicVolume,
	open: false
});

export const lookSettings = $state({
	skin: boot.skin,
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
		threatAlerts: lookSettings.threatAlerts,
		mode: playSettings.mode,
		difficulty: playSettings.difficulty
	};
}

export function persistSettings(extra: Parameters<typeof writePrefs>[0] = {}) {
	writePrefs({ ...snapshotPrefs(), ...extra });
}

export function setBoardSkin(skin: BoardSkin) {
	lookSettings.skin = skin;
	persistSettings();
}

export function setThreatAlerts(on: boolean) {
	lookSettings.threatAlerts = on;
	persistSettings();
}

export function syncAudio() {
	applyAudioPrefs({
		sfxOn: audioSettings.sfxOn,
		musicOn: audioSettings.musicOn,
		sfxVolume: audioSettings.sfxVolume,
		musicVolume: audioSettings.musicVolume
	});
	persistSettings();
}

export function openSettings() {
	audioSettings.open = true;
	unlockAudio();
}

export function closeSettings() {
	audioSettings.open = false;
}

export function toggleSettings() {
	if (audioSettings.open) closeSettings();
	else openSettings();
}

export function primeAudio() {
	unlockAudio();
	applyAudioPrefs({
		sfxOn: audioSettings.sfxOn,
		musicOn: audioSettings.musicOn,
		sfxVolume: audioSettings.sfxVolume,
		musicVolume: audioSettings.musicVolume
	});
}

let lifecycleBound = false;

export async function hydrateSettings() {
	const prefs = await hydratePrefs();
	audioSettings.sfxOn = prefs.sfxOn;
	audioSettings.musicOn = prefs.musicOn;
	audioSettings.sfxVolume = prefs.sfxVolume;
	audioSettings.musicVolume = prefs.musicVolume;
	lookSettings.skin = prefs.skin;
	lookSettings.threatAlerts = prefs.threatAlerts;
	playSettings.mode = prefs.mode;
	playSettings.difficulty = prefs.difficulty;
	copyScores(prefs);
	restoreMusicTrack(prefs.musicTrack);
	applyAudioPrefs({
		sfxOn: prefs.sfxOn,
		musicOn: prefs.musicOn,
		sfxVolume: prefs.sfxVolume,
		musicVolume: prefs.musicVolume
	});
	if (lifecycleBound) return () => undefined;
	lifecycleBound = true;
	const stopLife = onPrefsLifecycle();
	const stopWatch = onPrefs(copyScores);
	return () => {
		stopLife();
		stopWatch();
	};
}
