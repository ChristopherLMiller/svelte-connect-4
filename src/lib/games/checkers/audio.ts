import { connectSfx, getAudioContext, getMusicBus, isMusicOn, sfxContext } from '$lib/audio/core';
import type { Player } from './types';

let running = false;
let timer: number | null = null;
let stem: GainNode | null = null;
let live: Array<OscillatorNode | AudioBufferSourceNode> = [];
let step = 0;
let nextAt = 0;

const PAD = [110, 146.83, 164.81, 196];
const PLUCK = [220, 246.94, 293.66, 329.63, 392, 329.63, 277.18, 246.94];
const BASS = [55, 73.42, 82.41, 61.74];

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

function playGlass(audio: AudioContext, freq: number, t: number) {
	if (!stem) return;
	const fund = audio.createOscillator();
	const over = audio.createOscillator();
	fund.type = 'sine';
	over.type = 'sine';
	fund.frequency.setValueAtTime(freq * 2, t);
	over.frequency.setValueAtTime(freq * 3, t);
	fund.frequency.exponentialRampToValueAtTime(freq * 1.97, t + 1.1);
	const gain = env(audio, t, 0.055, 0.008, 1.85);
	const filter = audio.createBiquadFilter();
	filter.type = 'lowpass';
	filter.frequency.setValueAtTime(4200, t);
	filter.frequency.exponentialRampToValueAtTime(1600, t + 1.2);
	fund.connect(gain);
	over.connect(gain);
	gain.connect(filter).connect(stem);
	fund.start(t);
	over.start(t);
	fund.stop(t + 2);
	over.stop(t + 2);
	live.push(fund, over);
}

function playBass(audio: AudioContext, freq: number, t: number) {
	if (!stem) return;
	const osc = audio.createOscillator();
	osc.type = 'sine';
	osc.frequency.setValueAtTime(freq, t);
	const gain = env(audio, t, 0.11, 0.06, 2.1);
	osc.connect(gain).connect(stem);
	osc.start(t);
	osc.stop(t + 2.2);
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
		playGlass(audio, PLUCK[step % PLUCK.length], nextAt);
		if (step % 4 === 0) playBass(audio, BASS[(step / 4) % BASS.length], nextAt);
		nextAt += 1.78;
		step += 1;
	}
	timer = window.setTimeout(schedule, 140);
}

export function startAshcourtMusic() {
	if (running || !isMusicOn()) return;
	const audio = getAudioContext();
	const bus = getMusicBus();
	if (!audio || !bus) return;
	running = true;
	step = 0;

	stem = audio.createGain();
	stem.gain.setValueAtTime(0.0001, audio.currentTime);
	stem.gain.exponentialRampToValueAtTime(1, audio.currentTime + 1.8);
	stem.connect(bus);

	const padGain = audio.createGain();
	padGain.gain.value = 0.16;
	const filter = audio.createBiquadFilter();
	filter.type = 'lowpass';
	filter.frequency.value = 780;
	filter.Q.value = 0.55;
	padGain.connect(filter).connect(stem);

	for (const freq of PAD) {
		for (const detune of [-11, 8]) {
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
	lfo.frequency.value = 0.04;
	lfoGain.gain.value = 70;
	lfo.connect(lfoGain).connect(filter.frequency);
	lfo.start();
	live.push(lfo);

	const kiln = audio.createBufferSource();
	kiln.buffer = noiseBuffer(audio, 3.2, 0.18);
	kiln.loop = true;
	const kilnFilter = audio.createBiquadFilter();
	kilnFilter.type = 'bandpass';
	kilnFilter.frequency.value = 420;
	kilnFilter.Q.value = 0.7;
	const kilnGain = audio.createGain();
	kilnGain.gain.value = 0.018;
	kiln.connect(kilnFilter).connect(kilnGain).connect(stem);
	kiln.start();
	live.push(kiln);

	nextAt = audio.currentTime + 0.45;
	schedule();
}

export function stopAshcourtMusic() {
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

export function playSelect() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const osc = audio.createOscillator();
	const gain = env(audio, t, 0.028, 0.005, 0.09);
	osc.type = 'sine';
	osc.frequency.setValueAtTime(698.46, t);
	osc.frequency.exponentialRampToValueAtTime(523.25, t + 0.08);
	osc.connect(gain);
	connectSfx(gain);
	osc.start(t);
	osc.stop(t + 0.11);
}

export function playStep(player: Player) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const thud = audio.createOscillator();
	thud.type = 'sine';
	thud.frequency.setValueAtTime(player === 1 ? 140 : 210, t);
	thud.frequency.exponentialRampToValueAtTime(player === 1 ? 70 : 120, t + 0.12);
	const body = env(audio, t, player === 1 ? 0.16 : 0.12, 0.006, 0.18);
	thud.connect(body);
	connectSfx(body);
	thud.start(t);
	thud.stop(t + 0.22);

	const grit = audio.createBufferSource();
	grit.buffer = noiseBuffer(audio, 0.2, player === 1 ? 0.35 : 0.55);
	const filter = audio.createBiquadFilter();
	filter.type = 'bandpass';
	filter.frequency.setValueAtTime(player === 1 ? 480 : 1100, t);
	filter.Q.value = 1.1;
	const dust = env(audio, t, 0.1, 0.004, 0.12);
	grit.connect(filter).connect(dust);
	connectSfx(dust);
	grit.start(t);
	grit.stop(t + 0.16);
}

export function playFall(player: Player) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const whoosh = audio.createBufferSource();
	whoosh.buffer = noiseBuffer(audio, 0.6, 0.22);
	const filter = audio.createBiquadFilter();
	filter.type = 'lowpass';
	filter.frequency.setValueAtTime(2400, t);
	filter.frequency.exponentialRampToValueAtTime(280, t + 0.38);
	const air = env(audio, t, 0.2, 0.02, 0.42);
	whoosh.connect(filter).connect(air);
	connectSfx(air);
	whoosh.start(t);
	whoosh.stop(t + 0.5);

	const drop = audio.createOscillator();
	drop.type = 'triangle';
	drop.frequency.setValueAtTime(player === 1 ? 420 : 310, t);
	drop.frequency.exponentialRampToValueAtTime(70, t + 0.4);
	const pit = env(audio, t, 0.11, 0.01, 0.4);
	drop.connect(pit);
	connectSfx(pit);
	drop.start(t);
	drop.stop(t + 0.48);
}

export function playCrown(player: Player) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const notes = player === 1 ? [392, 523.25, 659.25, 784] : [349.23, 440, 554.37, 698.46];
	for (const [i, freq] of notes.entries()) {
		const osc = audio.createOscillator();
		osc.type = 'sine';
		osc.frequency.setValueAtTime(freq, t + i * 0.07);
		const gain = env(audio, t + i * 0.07, 0.07, 0.015, 0.55);
		osc.connect(gain);
		connectSfx(gain);
		osc.start(t + i * 0.07);
		osc.stop(t + i * 0.07 + 0.7);
	}
	const hiss = audio.createBufferSource();
	hiss.buffer = noiseBuffer(audio, 0.5, 0.4);
	const spark = audio.createBiquadFilter();
	spark.type = 'highpass';
	spark.frequency.setValueAtTime(1800, t);
	const sheen = env(audio, t, 0.06, 0.02, 0.4);
	hiss.connect(spark).connect(sheen);
	connectSfx(sheen);
	hiss.start(t);
	hiss.stop(t + 0.45);
}

export function playMust() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const osc = audio.createOscillator();
	osc.type = 'square';
	osc.frequency.setValueAtTime(180, t);
	osc.frequency.exponentialRampToValueAtTime(120, t + 0.12);
	const gain = env(audio, t, 0.04, 0.004, 0.12);
	const filter = audio.createBiquadFilter();
	filter.type = 'lowpass';
	filter.frequency.value = 700;
	osc.connect(filter).connect(gain);
	connectSfx(gain);
	osc.start(t);
	osc.stop(t + 0.16);
}

export function playWin(winner: Player) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const notes = winner === 1 ? [196, 246.94, 329.63, 392, 523.25] : [174.61, 220, 261.63, 349.23, 440];
	for (const [i, freq] of notes.entries()) {
		const osc = audio.createOscillator();
		osc.type = 'triangle';
		osc.frequency.setValueAtTime(freq, t + i * 0.1);
		const gain = env(audio, t + i * 0.1, 0.1, 0.02, 0.85);
		osc.connect(gain);
		connectSfx(gain);
		osc.start(t + i * 0.1);
		osc.stop(t + i * 0.1 + 1);
	}
	const roar = audio.createBufferSource();
	roar.buffer = noiseBuffer(audio, 1.4, 0.12);
	const filter = audio.createBiquadFilter();
	filter.type = 'lowpass';
	filter.frequency.setValueAtTime(900, t);
	filter.frequency.exponentialRampToValueAtTime(280, t + 1.1);
	const bloom = env(audio, t, 0.14, 0.08, 1.1);
	roar.connect(filter).connect(bloom);
	connectSfx(bloom);
	roar.start(t);
	roar.stop(t + 1.3);
}

export function playDraw() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const osc = audio.createOscillator();
	osc.type = 'sine';
	osc.frequency.setValueAtTime(196, t);
	osc.frequency.exponentialRampToValueAtTime(130.81, t + 0.7);
	const gain = env(audio, t, 0.07, 0.04, 0.7);
	osc.connect(gain);
	connectSfx(gain);
	osc.start(t);
	osc.stop(t + 0.85);
}

export { startAshcourtMusic as startMusic, stopAshcourtMusic as stopMusic };
