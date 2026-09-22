import { connectSfx, getAudioContext, getMusicBus, isMusicOn, sfxContext } from '$lib/audio/core';

let running = false;
let timer: number | null = null;
let stem: GainNode | null = null;
let live: Array<OscillatorNode | AudioBufferSourceNode> = [];
let step = 0;
let nextAt = 0;

const PAD = [164.81, 196, 246.94, 293.66];
const PLUCK = [392, 440, 493.88, 587.33, 659.25, 587.33, 493.88, 440];
const BASS = [82.41, 98, 110, 98];

function env(audio: AudioContext, start: number, peak: number, attack: number, release: number) {
	const gain = audio.createGain();
	gain.gain.setValueAtTime(0.0001, start);
	gain.gain.exponentialRampToValueAtTime(peak, start + attack);
	gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + release);
	return gain;
}

const noiseCache = new Map<string, AudioBuffer>();

function noiseBuffer(audio: AudioContext, seconds = 2, color = 1) {
	const key = `${audio.sampleRate}:${seconds}:${color}`;
	const hit = noiseCache.get(key);
	if (hit) return hit;
	const length = Math.floor(audio.sampleRate * seconds);
	const buffer = audio.createBuffer(1, length, audio.sampleRate);
	const data = buffer.getChannelData(0);
	let last = 0;
	for (let i = 0; i < length; i += 1) {
		const white = Math.random() * 2 - 1;
		last = last * (1 - color) + white * color;
		data[i] = last;
	}
	noiseCache.set(key, buffer);
	return buffer;
}

function playPluck(audio: AudioContext, freq: number, t: number) {
	if (!stem) return;
	const osc = audio.createOscillator();
	const body = audio.createOscillator();
	osc.type = 'triangle';
	body.type = 'sine';
	osc.frequency.setValueAtTime(freq, t);
	body.frequency.setValueAtTime(freq / 2, t);
	osc.frequency.exponentialRampToValueAtTime(freq * 0.97, t + 0.5);
	const gain = env(audio, t, 0.11, 0.008, 1.1);
	const filter = audio.createBiquadFilter();
	filter.type = 'lowpass';
	filter.frequency.setValueAtTime(2800, t);
	filter.frequency.exponentialRampToValueAtTime(900, t + 0.45);
	osc.connect(gain);
	body.connect(gain);
	gain.connect(filter).connect(stem);
	osc.start(t);
	body.start(t);
	osc.stop(t + 1.3);
	body.stop(t + 1.3);
	live.push(osc, body);
}

function playGong(audio: AudioContext, t: number) {
	if (!stem) return;
	const osc = audio.createOscillator();
	osc.type = 'sine';
	osc.frequency.setValueAtTime(110, t);
	osc.frequency.exponentialRampToValueAtTime(82, t + 1.8);
	const gain = env(audio, t, 0.14, 0.02, 2.1);
	const metal = audio.createOscillator();
	metal.type = 'triangle';
	metal.frequency.setValueAtTime(330, t);
	metal.frequency.exponentialRampToValueAtTime(220, t + 1.4);
	const sheen = env(audio, t, 0.045, 0.01, 1.6);
	osc.connect(gain).connect(stem);
	metal.connect(sheen).connect(stem);
	osc.start(t);
	metal.start(t);
	osc.stop(t + 2.2);
	metal.stop(t + 1.8);
	live.push(osc, metal);
}

function playWood(audio: AudioContext, t: number) {
	if (!stem) return;
	const tap = audio.createBufferSource();
	tap.buffer = noiseBuffer(audio, 0.12, 0.7);
	const filter = audio.createBiquadFilter();
	filter.type = 'bandpass';
	filter.frequency.setValueAtTime(980, t);
	filter.Q.value = 2.4;
	const gain = env(audio, t, 0.08, 0.002, 0.08);
	tap.connect(filter).connect(gain).connect(stem);
	tap.start(t);
	tap.stop(t + 0.1);
	live.push(tap);
}

function playBass(audio: AudioContext, freq: number, t: number) {
	if (!stem) return;
	const osc = audio.createOscillator();
	osc.type = 'sine';
	osc.frequency.setValueAtTime(freq, t);
	const gain = env(audio, t, 0.13, 0.04, 1.5);
	osc.connect(gain).connect(stem);
	osc.start(t);
	osc.stop(t + 1.7);
	live.push(osc);
}

function schedule() {
	if (!running) return;
	const audio = getAudioContext();
	if (!audio || !isMusicOn()) {
		timer = window.setTimeout(schedule, 120);
		return;
	}
	while (nextAt < audio.currentTime + 0.28) {
		playPluck(audio, PLUCK[step % PLUCK.length], nextAt);
		if (step % 2 === 1) playWood(audio, nextAt + 0.18);
		if (step % 4 === 0) playBass(audio, BASS[(step / 4) % BASS.length], nextAt);
		if (step % 16 === 0) playGong(audio, nextAt);
		nextAt += 0.92;
		step += 1;
	}
	timer = window.setTimeout(schedule, 140);
}

export function startMusic() {
	if (running || !isMusicOn()) return;
	const audio = getAudioContext();
	const bus = getMusicBus();
	if (!audio || !bus) return;
	running = true;
	step = 0;

	stem = audio.createGain();
	stem.gain.setValueAtTime(0.0001, audio.currentTime);
	stem.gain.exponentialRampToValueAtTime(1, audio.currentTime + 1.4);
	stem.connect(bus);

	const padGain = audio.createGain();
	padGain.gain.value = 0.2;
	const filter = audio.createBiquadFilter();
	filter.type = 'lowpass';
	filter.frequency.value = 540;
	filter.Q.value = 0.4;
	padGain.connect(filter).connect(stem);

	for (const freq of PAD) {
		for (const detune of [-7, 6]) {
			const osc = audio.createOscillator();
			osc.type = 'sine';
			osc.frequency.value = freq;
			osc.detune.value = detune;
			const g = audio.createGain();
			g.gain.value = 0.22;
			osc.connect(g).connect(padGain);
			osc.start();
			live.push(osc);
		}
	}

	const lfo = audio.createOscillator();
	const lfoGain = audio.createGain();
	lfo.type = 'sine';
	lfo.frequency.value = 0.04;
	lfoGain.gain.value = 70;
	lfo.connect(lfoGain).connect(filter.frequency);
	lfo.start();
	live.push(lfo);

	const hush = audio.createBufferSource();
	hush.buffer = noiseBuffer(audio, 3.2, 0.08);
	hush.loop = true;
	const hushFilter = audio.createBiquadFilter();
	hushFilter.type = 'lowpass';
	hushFilter.frequency.value = 620;
	const hushGain = audio.createGain();
	hushGain.gain.value = 0.05;
	hush.connect(hushFilter).connect(hushGain).connect(stem);
	hush.start();
	live.push(hush);

	nextAt = audio.currentTime + 0.35;
	schedule();
}

export function stopMusic() {
	running = false;
	if (timer != null) {
		clearTimeout(timer);
		timer = null;
	}
	const audio = getAudioContext();
	const dying = live.slice();
	const old = stem;
	live = [];
	stem = null;
	if (old && audio) {
		old.gain.setTargetAtTime(0.0001, audio.currentTime, 0.16);
		window.setTimeout(() => {
			for (const node of dying) {
				try {
					node.stop();
				} catch {
					/* already stopped */
				}
				try {
					node.disconnect();
				} catch {
					/* already disconnected */
				}
			}
			try {
				old.disconnect();
			} catch {
				/* already disconnected */
			}
		}, 760);
	}
}

export function playTurn() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const osc = audio.createOscillator();
	osc.type = 'triangle';
	osc.frequency.setValueAtTime(620, t);
	osc.frequency.exponentialRampToValueAtTime(380, t + 0.08);
	const gain = env(audio, t, 0.035, 0.004, 0.09);
	osc.connect(gain);
	connectSfx(gain);
	osc.start(t);
	osc.stop(t + 0.11);
}

export function playEat() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const osc = audio.createOscillator();
	osc.type = 'sine';
	osc.frequency.setValueAtTime(659.25, t);
	osc.frequency.exponentialRampToValueAtTime(880, t + 0.12);
	const gain = env(audio, t, 0.08, 0.006, 0.22);
	osc.connect(gain);
	connectSfx(gain);
	osc.start(t);
	osc.stop(t + 0.28);
}

export function playCrash() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const osc = audio.createOscillator();
	osc.type = 'sine';
	osc.frequency.setValueAtTime(98, t);
	osc.frequency.exponentialRampToValueAtTime(46, t + 0.7);
	const gain = env(audio, t, 0.14, 0.01, 0.85);
	osc.connect(gain);
	connectSfx(gain);
	osc.start(t);
	osc.stop(t + 0.95);
	const scrape = audio.createBufferSource();
	scrape.buffer = noiseBuffer(audio, 0.5, 0.22);
	const filter = audio.createBiquadFilter();
	filter.type = 'lowpass';
	filter.frequency.setValueAtTime(900, t);
	filter.frequency.exponentialRampToValueAtTime(180, t + 0.45);
	const hush = env(audio, t, 0.16, 0.02, 0.5);
	scrape.connect(filter).connect(hush);
	connectSfx(hush);
	scrape.start(t);
	scrape.stop(t + 0.55);
}

export function playPause() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const osc = audio.createOscillator();
	osc.type = 'sine';
	osc.frequency.setValueAtTime(330, t);
	osc.frequency.exponentialRampToValueAtTime(220, t + 0.16);
	const gain = env(audio, t, 0.04, 0.01, 0.18);
	osc.connect(gain);
	connectSfx(gain);
	osc.start(t);
	osc.stop(t + 0.22);
}

export function playStart() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const osc = audio.createOscillator();
	osc.type = 'sine';
	osc.frequency.setValueAtTime(196, t);
	osc.frequency.exponentialRampToValueAtTime(147, t + 0.9);
	const gain = env(audio, t, 0.08, 0.02, 1.1);
	osc.connect(gain);
	connectSfx(gain);
	osc.start(t);
	osc.stop(t + 1.2);
	const sparkle = audio.createOscillator();
	sparkle.type = 'triangle';
	sparkle.frequency.setValueAtTime(784, t + 0.08);
	const shine = env(audio, t + 0.08, 0.045, 0.02, 0.4);
	sparkle.connect(shine);
	connectSfx(shine);
	sparkle.start(t + 0.08);
	sparkle.stop(t + 0.52);
}

export function playSelect() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const osc = audio.createOscillator();
	osc.type = 'sine';
	osc.frequency.setValueAtTime(494, t);
	const gain = env(audio, t, 0.03, 0.006, 0.1);
	osc.connect(gain);
	connectSfx(gain);
	osc.start(t);
	osc.stop(t + 0.12);
}
