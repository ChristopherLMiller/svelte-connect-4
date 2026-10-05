import type * as ToneLib from 'tone';

export type Tone = typeof ToneLib;

let lib: Tone | null = null;
let loading: Promise<Tone | null> | null = null;

export function peekTone() {
	return lib;
}

/** Loads Tone.js on demand and points it at the arcade's shared context. */
export function loadTone(audio: AudioContext) {
	if (lib) return Promise.resolve(lib);
	(globalThis as { TONE_SILENCE_LOGGING?: boolean }).TONE_SILENCE_LOGGING = true;
	loading ??= import('tone')
		.then((mod) => {
			mod.setContext(audio);
			lib = mod;
			return mod;
		})
		.catch(() => {
			loading = null;
			return null;
		});
	return loading;
}

export const jitter = (amount: number) => (Math.random() * 2 - 1) * amount;
