export type AudioPrefs = {
	sfxOn: boolean;
	musicOn: boolean;
	sfxVolume: number;
	musicVolume: number;
};

let ctx: AudioContext | null = null;
let sfxBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let visBound = false;

let prefs: AudioPrefs = {
	sfxOn: true,
	musicOn: true,
	sfxVolume: 0.78,
	musicVolume: 0.42
};

type MusicHooks = {
	start: () => void;
	stop: () => void;
};

let musicHooks: MusicHooks | null = null;

export function bindMusicEngine(hooks: MusicHooks) {
	musicHooks = hooks;
}

export function getAudioPrefs(): AudioPrefs {
	return { ...prefs };
}

export function isMusicOn() {
	return prefs.musicOn;
}

function AudioCtor() {
	return (
		window.AudioContext ||
		(window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
	);
}

function bindVisibility(audio: AudioContext) {
	if (visBound || typeof document === 'undefined') return;
	visBound = true;
	document.addEventListener('visibilitychange', () => {
		if (document.hidden) void audio.suspend();
		else void audio.resume();
	});
}

export function getAudioContext(): AudioContext | null {
	if (typeof window === 'undefined') return null;
	const Ctor = AudioCtor();
	if (!Ctor) return null;
	ctx ??= new Ctor();
	bindVisibility(ctx);
	if (ctx.state === 'suspended' && !document.hidden) void ctx.resume();
	if (!sfxBus) {
		sfxBus = ctx.createGain();
		sfxBus.gain.value = prefs.sfxOn ? prefs.sfxVolume : 0;
		sfxBus.connect(ctx.destination);
	}
	if (!musicBus) {
		musicBus = ctx.createGain();
		musicBus.gain.value = prefs.musicOn ? prefs.musicVolume * 0.34 : 0;
		musicBus.connect(ctx.destination);
	}
	return ctx;
}

export function getMusicBus(): GainNode | null {
	getAudioContext();
	return musicBus;
}

export function sfxContext(): AudioContext | null {
	const audio = getAudioContext();
	if (!audio || !prefs.sfxOn || prefs.sfxVolume <= 0.001) return null;
	return audio;
}

export function connectSfx(node: AudioNode) {
	if (sfxBus) node.connect(sfxBus);
}

function clamp(value: number) {
	return Math.min(1, Math.max(0, value));
}

export function applyAudioPrefs(next: Partial<AudioPrefs>) {
	prefs = {
		...prefs,
		...next,
		sfxVolume: clamp(next.sfxVolume ?? prefs.sfxVolume),
		musicVolume: clamp(next.musicVolume ?? prefs.musicVolume)
	};
	const audio = getAudioContext();
	if (!audio || !sfxBus || !musicBus) return;
	sfxBus.gain.setTargetAtTime(prefs.sfxOn ? prefs.sfxVolume : 0, audio.currentTime, 0.04);
	musicBus.gain.setTargetAtTime(prefs.musicOn ? prefs.musicVolume * 0.34 : 0, audio.currentTime, 0.08);
	if (prefs.musicOn) musicHooks?.start();
	else musicHooks?.stop();
}

export function unlockAudio() {
	const audio = getAudioContext();
	if (prefs.musicOn) musicHooks?.start();
	return audio;
}
