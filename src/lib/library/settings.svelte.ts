import { persistAudio, audioSettings, syncAudio } from '$lib/audio/prefs.svelte';
import { unlockAudio } from '$lib/audio/core';

export const libraryPanel = $state({
	open: false
});

export function openLibrarySettings() {
	libraryPanel.open = true;
	unlockAudio();
}

export function closeLibrarySettings() {
	libraryPanel.open = false;
}

export function setLibrarySfxVolume(value: number) {
	audioSettings.sfxVolume = value;
	if (value > 0) audioSettings.sfxOn = true;
	syncAudio();
}

export function setLibraryMusicVolume(value: number) {
	audioSettings.musicVolume = value;
	if (value > 0) audioSettings.musicOn = true;
	syncAudio();
}

export { audioSettings, persistAudio, syncAudio };
