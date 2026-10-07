import { buildMaster, type Master } from './master';

export type AudioPrefs = {
	sfxOn: boolean;
	musicOn: boolean;
	sfxVolume: number;
	musicVolume: number;
	layersOn: boolean;
	layersVolume: number;
};

/** Layers at full volume sit about where the score does at its default level. */
const LAYERS_SCALE = 0.5;

let ctx: AudioContext | null = null;
let sfxBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let layersBus: GainNode | null = null;
let master: Master | null = null;
let station = 'library';
let visBound = false;

let prefs: AudioPrefs = {
	sfxOn: true,
	musicOn: true,
	sfxVolume: 0.78,
	musicVolume: 0.42,
	layersOn: true,
	layersVolume: 0.7
};

const layerWatchers = new Set<(on: boolean) => void>();

/** Whether the optional synth layers a score can add over itself should play. */
export function isLayersOn() {
	return prefs.layersOn && prefs.layersVolume > 0.001;
}

/** A score with synth layers keeps running for them even while its own music is muted. */
export function isLayeredScoreOn() {
	return prefs.musicOn || isLayersOn();
}

export function watchLayers(listener: (on: boolean) => void) {
	layerWatchers.add(listener);
	return () => {
		layerWatchers.delete(listener);
	};
}

/** Picks the room and polish that suit the music now playing. */
export function setEnhanceStation(next: string) {
	if (next === 'none') return;
	station = next;
	master?.setStation(next);
}

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
	// Safari only resumes a suspended context inside a click or key press, so the context stays
	// running while hidden and the score stops instead; restarting it on return also keeps the
	// schedulers from bursting out the notes their throttled timers missed.
	document.addEventListener('visibilitychange', () => {
		if (document.hidden) {
			musicHooks?.stop();
			return;
		}
		if (audio.state !== 'running') audio.resume().catch(() => {});
		if (isLayeredScoreOn()) musicHooks?.start();
	});
}

function layersGain() {
	return prefs.layersOn ? prefs.layersVolume * LAYERS_SCALE : 0;
}

export function getAudioContext(): AudioContext | null {
	if (typeof window === 'undefined') return null;
	const Ctor = AudioCtor();
	if (!Ctor) return null;
	ctx ??= new Ctor();
	bindVisibility(ctx);
	if (ctx.state === 'suspended' && !document.hidden) void ctx.resume();
	if (!sfxBus || !musicBus || !layersBus) {
		master = buildMaster(ctx, station);
		sfxBus = ctx.createGain();
		sfxBus.gain.value = prefs.sfxOn ? prefs.sfxVolume : 0;
		sfxBus.connect(master.sfxIn);
		musicBus = ctx.createGain();
		musicBus.gain.value = prefs.musicOn ? prefs.musicVolume : 0;
		musicBus.connect(master.musicIn);
		layersBus = ctx.createGain();
		layersBus.gain.value = layersGain();
		layersBus.connect(master.musicIn);
	}
	return ctx;
}

export function getMusicBus(): GainNode | null {
	getAudioContext();
	return musicBus;
}

export function getLayersBus(): GainNode | null {
	getAudioContext();
	return layersBus;
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
		musicVolume: clamp(next.musicVolume ?? prefs.musicVolume),
		layersVolume: clamp(next.layersVolume ?? prefs.layersVolume)
	};
	const audio = getAudioContext();
	if (!audio || !sfxBus || !musicBus || !layersBus) return;
	sfxBus.gain.setTargetAtTime(prefs.sfxOn ? prefs.sfxVolume : 0, audio.currentTime, 0.04);
	musicBus.gain.setTargetAtTime(prefs.musicOn ? prefs.musicVolume : 0, audio.currentTime, 0.08);
	layersBus.gain.setTargetAtTime(layersGain(), audio.currentTime, 0.08);
	const layers = isLayersOn();
	for (const watcher of layerWatchers) watcher(layers);
	if (isLayeredScoreOn()) musicHooks?.start();
	else musicHooks?.stop();
}

export function unlockAudio() {
	const audio = getAudioContext();
	if (isLayeredScoreOn()) musicHooks?.start();
	return audio;
}
