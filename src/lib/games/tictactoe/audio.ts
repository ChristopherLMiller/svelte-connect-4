import { getAudioContext, getMusicBus, isMusicOn, sfxContext, connectSfx } from '$lib/audio/core';
import type { Player } from './types';

let running = false;
let timer: number | null = null;
let stem: GainNode | null = null;
let live: Array<OscillatorNode | AudioBufferSourceNode> = [];
let step = 0;
let nextAt = 0;

const PAD = [130.81, 164.81, 196, 246.94];
const PLUCK = [261.63, 329.63, 392, 440, 392, 329.63, 293.66, 261.63];
const BASS = [65.41, 82.41, 98, 73.42];

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
	osc.frequency.exponentialRampToValueAtTime(freq * 0.985, t + 0.4);
	const gain = env(audio, t, 0.07, 0.01, 1.4);
	const filter = audio.createBiquadFilter();
	filter.type = 'lowpass';
	filter.frequency.setValueAtTime(2400, t);
	filter.frequency.exponentialRampToValueAtTime(900, t + 0.5);
	osc.connect(gain);
	body.connect(gain);
	gain.connect(filter).connect(stem);
	osc.start(t);
	body.start(t);
	osc.stop(t + 1.6);
	body.stop(t + 1.6);
	live.push(osc, body);
}

function playBass(audio: AudioContext, freq: number, t: number) {
	if (!stem) return;
	const osc = audio.createOscillator();
	osc.type = 'sine';
	osc.frequency.setValueAtTime(freq, t);
	const gain = env(audio, t, 0.09, 0.05, 1.8);
	osc.connect(gain).connect(stem);
	osc.start(t);
	osc.stop(t + 2);
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
		if (step % 4 === 0) playBass(audio, BASS[(step / 4) % BASS.length], nextAt);
		nextAt += 1.62;
		step += 1;
	}
	timer = window.setTimeout(schedule, 140);
}

export function startTicTacToeMusic() {
	if (running || !isMusicOn()) return;
	const audio = getAudioContext();
	const bus = getMusicBus();
	if (!audio || !bus) return;
	running = true;
	step = 0;

	stem = audio.createGain();
	stem.gain.setValueAtTime(0.0001, audio.currentTime);
	stem.gain.exponentialRampToValueAtTime(1, audio.currentTime + 1.6);
	stem.connect(bus);

	const padGain = audio.createGain();
	padGain.gain.value = 0.14;
	const filter = audio.createBiquadFilter();
	filter.type = 'lowpass';
	filter.frequency.value = 620;
	filter.Q.value = 0.5;
	padGain.connect(filter).connect(stem);

	for (const freq of PAD) {
		for (const detune of [-9, 7]) {
			const osc = audio.createOscillator();
			osc.type = 'sine';
			osc.frequency.value = freq;
			osc.detune.value = detune;
			const g = audio.createGain();
			g.gain.value = 0.2;
			osc.connect(g).connect(padGain);
			osc.start();
			live.push(osc);
		}
	}

	const lfo = audio.createOscillator();
	const lfoGain = audio.createGain();
	lfo.type = 'sine';
	lfo.frequency.value = 0.05;
	lfoGain.gain.value = 90;
	lfo.connect(lfoGain).connect(filter.frequency);
	lfo.start();
	live.push(lfo);

	const surf = audio.createBufferSource();
	surf.buffer = noiseBuffer(audio, 3, 0.12);
	surf.loop = true;
	const surfFilter = audio.createBiquadFilter();
	surfFilter.type = 'lowpass';
	surfFilter.frequency.value = 780;
	const surfGain = audio.createGain();
	surfGain.gain.value = 0.046;
	surf.connect(surfFilter).connect(surfGain).connect(stem);
	surf.start();
	live.push(surf);

	nextAt = audio.currentTime + 0.4;
	schedule();
}

export function stopTicTacToeMusic() {
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
		old.gain.setTargetAtTime(0.0001, audio.currentTime, 0.14);
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
		}, 720);
	}
}

export function playSelect() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const osc = audio.createOscillator();
	const gain = env(audio, t, 0.03, 0.006, 0.1);
	osc.type = 'sine';
	osc.frequency.setValueAtTime(523.25, t);
	osc.connect(gain);
	connectSfx(gain);
	osc.start(t);
	osc.stop(t + 0.12);
}

export function playMark(player: Player) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const scratch = audio.createBufferSource();
	scratch.buffer = noiseBuffer(audio, 0.35, 0.55);
	const filter = audio.createBiquadFilter();
	filter.type = 'bandpass';
	filter.frequency.setValueAtTime(player === 1 ? 1400 : 900, t);
	filter.Q.value = 1.2;
	const gain = env(audio, t, 0.16, 0.01, player === 1 ? 0.22 : 0.32);
	scratch.connect(filter).connect(gain);
	connectSfx(gain);
	scratch.start(t);
	scratch.stop(t + 0.4);
}

export function playWin() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	for (const [i, freq] of [329.63, 392, 523.25, 659.25].entries()) {
		const osc = audio.createOscillator();
		osc.type = 'triangle';
		osc.frequency.setValueAtTime(freq, t + i * 0.09);
		const gain = env(audio, t + i * 0.09, 0.09, 0.02, 0.72);
		osc.connect(gain);
		connectSfx(gain);
		osc.start(t + i * 0.09);
		osc.stop(t + i * 0.09 + 0.85);
	}
	const sparkle = audio.createOscillator();
	sparkle.type = 'sine';
	sparkle.frequency.setValueAtTime(1046.5, t + 0.28);
	sparkle.frequency.exponentialRampToValueAtTime(1568, t + 0.9);
	const shine = env(audio, t + 0.28, 0.05, 0.04, 0.7);
	sparkle.connect(shine);
	connectSfx(shine);
	sparkle.start(t + 0.28);
	sparkle.stop(t + 1.05);
}

export function playPoke() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const tap = audio.createBufferSource();
	tap.buffer = noiseBuffer(audio, 0.18, 0.4);
	const filter = audio.createBiquadFilter();
	filter.type = 'bandpass';
	filter.frequency.setValueAtTime(720, t);
	filter.Q.value = 0.8;
	const gain = env(audio, t, 0.12, 0.005, 0.16);
	tap.connect(filter).connect(gain);
	connectSfx(gain);
	tap.start(t);
	tap.stop(t + 0.2);
	const clink = audio.createOscillator();
	clink.type = 'sine';
	clink.frequency.setValueAtTime(980, t);
	clink.frequency.exponentialRampToValueAtTime(420, t + 0.12);
	const ping = env(audio, t, 0.04, 0.005, 0.14);
	clink.connect(ping);
	connectSfx(ping);
	clink.start(t);
	clink.stop(t + 0.16);
}

export function playDraw() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const osc = audio.createOscillator();
	osc.type = 'sine';
	osc.frequency.setValueAtTime(196, t);
	osc.frequency.exponentialRampToValueAtTime(147, t + 0.5);
	const gain = env(audio, t, 0.06, 0.03, 0.55);
	osc.connect(gain);
	connectSfx(gain);
	osc.start(t);
	osc.stop(t + 0.7);
}

export function playWash() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const surf = audio.createBufferSource();
	surf.buffer = noiseBuffer(audio, 2.4, 0.08);
	const filter = audio.createBiquadFilter();
	filter.type = 'lowpass';
	filter.frequency.setValueAtTime(420, t);
	filter.frequency.exponentialRampToValueAtTime(2200, t + 0.7);
	filter.frequency.exponentialRampToValueAtTime(500, t + 2);
	const gain = audio.createGain();
	gain.gain.setValueAtTime(0.0001, t);
	gain.gain.exponentialRampToValueAtTime(0.22, t + 0.35);
	gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.1);
	surf.connect(filter).connect(gain);
	connectSfx(gain);
	surf.start(t);
	surf.stop(t + 2.2);
}

export { startTicTacToeMusic as startMusic, stopTicTacToeMusic as stopMusic };
