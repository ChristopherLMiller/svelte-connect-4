import { applyAudioPrefs, unlockAudio } from './core';

export type AudioState = {
	sfxOn: boolean;
	musicOn: boolean;
	sfxVolume: number;
	musicVolume: number;
};

const KEY = 'ai-arcade-audio';
const LEGACY_CACHE = 'connect4-prefs';

function defaults(): AudioState {
	return {
		sfxOn: true,
		musicOn: true,
		sfxVolume: 0.78,
		musicVolume: 0.42
	};
}

function clamp(value: number) {
	return Math.min(1, Math.max(0, value));
}

function normalize(raw: unknown): AudioState {
	const src = raw && typeof raw === 'object' ? (raw as Partial<AudioState>) : {};
	return {
		sfxOn: src.sfxOn !== false,
		musicOn: src.musicOn !== false,
		sfxVolume: clamp(src.sfxVolume ?? 0.78),
		musicVolume: clamp(src.musicVolume ?? 0.42)
	};
}

function readStored(): AudioState {
	if (typeof localStorage === 'undefined') return defaults();
	try {
		const raw = localStorage.getItem(KEY);
		if (raw) return normalize(JSON.parse(raw));
	} catch {
		/* ignore */
	}
	try {
		const legacy = localStorage.getItem(LEGACY_CACHE);
		if (legacy) return normalize(JSON.parse(legacy));
	} catch {
		/* ignore */
	}
	return defaults();
}

export const audioSettings = $state<AudioState>(readStored());

export function persistAudio() {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(
			KEY,
			JSON.stringify({
				sfxOn: audioSettings.sfxOn,
				musicOn: audioSettings.musicOn,
				sfxVolume: audioSettings.sfxVolume,
				musicVolume: audioSettings.musicVolume
			})
		);
	} catch {
		/* quota / private mode */
	}
}

export function syncAudio() {
	applyAudioPrefs({
		sfxOn: audioSettings.sfxOn,
		musicOn: audioSettings.musicOn,
		sfxVolume: audioSettings.sfxVolume,
		musicVolume: audioSettings.musicVolume
	});
	persistAudio();
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

export function hydrateAudio() {
	const next = readStored();
	audioSettings.sfxOn = next.sfxOn;
	audioSettings.musicOn = next.musicOn;
	audioSettings.sfxVolume = next.sfxVolume;
	audioSettings.musicVolume = next.musicVolume;
	applyAudioPrefs(next);
}
