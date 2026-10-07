import { connectSfx, getAudioContext, getMusicBus, isLayeredScoreOn, sfxContext } from '$lib/audio/core';
import { createAmbientLayers } from '$lib/audio/ambientLayers';
import type { Player } from './types';

const STEP = 0.42;

/** D yo scale (D E G A B): the bright Japanese pentatonic, kind to every pairing. */
const SCALE = [146.83, 164.81, 196, 220, 246.94, 293.66, 329.63, 392, 440, 493.88, 587.33, 659.25, 783.99];

const CHORDS: Array<{ root: number; tones: number[] }> = [
	{ root: 73.42, tones: [293.66, 440, 587.33] },
	{ root: 65.41, tones: [261.63, 392, 493.88] },
	{ root: 98, tones: [293.66, 392, 493.88] },
	{ root: 82.41, tones: [329.63, 440, 493.88] },
	{ root: 73.42, tones: [293.66, 440, 587.33] },
	{ root: 110, tones: [329.63, 440, 659.25] },
	{ root: 98, tones: [293.66, 392, 587.33] },
	{ root: 73.42, tones: [220, 293.66, 440] }
];

const layers = createAmbientLayers('zengarden', STEP, SCALE.slice(0, 7));

let running = false;
let timer: number | null = null;
let stem: GainNode | null = null;
let water: { src: AudioBufferSourceNode; lfo: OscillatorNode } | null = null;
let step = 0;
let nextAt = 0;
let lastNote = 7;
let phrase: Array<{ n: number; len: number }> = [];

function env(audio: BaseAudioContext, start: number, peak: number, attack: number, release: number) {
	const gain = audio.createGain();
	gain.gain.setValueAtTime(0.0001, start);
	gain.gain.exponentialRampToValueAtTime(peak, start + attack);
	gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + release);
	return gain;
}

const noiseCache = new Map<string, AudioBuffer>();

function noiseBuffer(audio: BaseAudioContext, seconds = 1, color = 1) {
	const key = `${audio.sampleRate}:${seconds}:${color}`;
	const hit = noiseCache.get(key);
	if (hit) return hit;
	const length = Math.floor(audio.sampleRate * seconds);
	const buffer = audio.createBuffer(1, length, audio.sampleRate);
	const data = buffer.getChannelData(0);
	let last = 0;
	for (let i = 0; i < length; i += 1) {
		last = last * (1 - color) + (Math.random() * 2 - 1) * color;
		data[i] = last;
	}
	noiseCache.set(key, buffer);
	return buffer;
}

function panned(audio: AudioContext, pan: number, dest: AudioNode) {
	const p = audio.createStereoPanner();
	p.pan.value = Math.max(-1, Math.min(1, pan));
	p.connect(dest);
	return p;
}

/** Koto string: a bright pluck that darkens as it rings, with a little press-bend into pitch. */
function koto(audio: AudioContext, dest: AudioNode, freq: number, t: number, peak: number, decay = 1.6, bend = 0) {
	const filter = audio.createBiquadFilter();
	filter.type = 'lowpass';
	filter.Q.value = 2;
	filter.frequency.setValueAtTime(Math.min(9000, freq * 9), t);
	filter.frequency.exponentialRampToValueAtTime(Math.max(300, freq * 1.6), t + decay * 0.6);
	const gain = env(audio, t, peak, 0.003, decay);
	filter.connect(gain).connect(dest);
	for (const [type, mult, level] of [
		['sawtooth', 1, 0.6],
		['triangle', 2, 0.4]
	] as const) {
		const osc = audio.createOscillator();
		osc.type = type;
		osc.frequency.setValueAtTime(freq * mult * (bend ? 0.97 : 1), t);
		if (bend) osc.frequency.exponentialRampToValueAtTime(freq * mult, t + bend);
		const g = audio.createGain();
		g.gain.value = level;
		osc.connect(g).connect(filter);
		osc.start(t);
		osc.stop(t + decay + 0.1);
	}
	const pick = audio.createBufferSource();
	pick.buffer = noiseBuffer(audio, 0.06, 1);
	const hp = audio.createBiquadFilter();
	hp.type = 'highpass';
	hp.frequency.value = 3000;
	const pg = env(audio, t, peak * 0.3, 0.001, 0.015);
	pick.connect(hp).connect(pg).connect(dest);
	pick.start(t, Math.random() * 0.03);
	pick.stop(t + 0.03);
}

/** Shakuhachi: a breathy sine that swells, slides up from below and blooms into vibrato. */
function flute(audio: AudioContext, dest: AudioNode, freq: number, t: number, len: number, peak: number) {
	const osc = audio.createOscillator();
	osc.type = 'sine';
	osc.frequency.setValueAtTime(freq * 0.94, t);
	osc.frequency.exponentialRampToValueAtTime(freq, t + 0.18);
	const vib = audio.createOscillator();
	vib.frequency.value = 5.2;
	const vibDepth = audio.createGain();
	vibDepth.gain.setValueAtTime(0, t);
	vibDepth.gain.linearRampToValueAtTime(freq * 0.012, t + len * 0.8);
	vib.connect(vibDepth).connect(osc.frequency);
	const over = audio.createOscillator();
	over.type = 'triangle';
	over.frequency.setValueAtTime(freq * 2, t);
	const og = audio.createGain();
	og.gain.value = 0.12;
	over.connect(og);
	const gain = audio.createGain();
	gain.gain.setValueAtTime(0.0001, t);
	gain.gain.exponentialRampToValueAtTime(peak, t + 0.22);
	gain.gain.setValueAtTime(peak, t + len * 0.6);
	gain.gain.exponentialRampToValueAtTime(peak * 1.3, t + len * 0.8);
	gain.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.5);
	osc.connect(gain);
	og.connect(gain);
	gain.connect(dest);
	const breath = audio.createBufferSource();
	breath.buffer = noiseBuffer(audio, 2, 0.6);
	const band = audio.createBiquadFilter();
	band.type = 'bandpass';
	band.frequency.value = freq * 2;
	band.Q.value = 3;
	const bg = audio.createGain();
	bg.gain.setValueAtTime(0.0001, t);
	bg.gain.exponentialRampToValueAtTime(peak * 0.9, t + 0.06);
	bg.gain.exponentialRampToValueAtTime(peak * 0.25, t + 0.3);
	bg.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.4);
	breath.connect(band).connect(bg).connect(dest);
	for (const node of [osc, vib, over]) {
		node.start(t);
		node.stop(t + len + 0.6);
	}
	breath.start(t, Math.random());
	breath.stop(t + len + 0.5);
}

/** Singing bowl: inharmonic partials that hum on long after the strike. */
function bowl(audio: AudioContext, dest: AudioNode, freq: number, t: number, peak: number, decay = 5) {
	for (const [ratio, level, len] of [
		[1, 1, 1],
		[2.71, 0.45, 0.6],
		[5.18, 0.2, 0.35],
		[8.4, 0.08, 0.2]
	] as const) {
		const osc = audio.createOscillator();
		osc.type = 'sine';
		osc.frequency.setValueAtTime(freq * ratio, t);
		const beat = audio.createOscillator();
		beat.frequency.value = 0.8 + ratio * 0.3;
		const bd = audio.createGain();
		bd.gain.value = 0.3;
		const g = env(audio, t, peak * level, 0.004, decay * len);
		const am = audio.createGain();
		am.gain.value = 0.8;
		beat.connect(bd).connect(am.gain);
		osc.connect(am).connect(g).connect(dest);
		for (const node of [osc, beat]) {
			node.start(t);
			node.stop(t + decay * len + 0.1);
		}
	}
}

/** A single drop into the basin under the bamboo spout. */
function drip(audio: AudioContext, dest: AudioNode, t: number, peak: number) {
	const osc = audio.createOscillator();
	osc.type = 'sine';
	const f = 900 + Math.random() * 900;
	osc.frequency.setValueAtTime(f, t);
	osc.frequency.exponentialRampToValueAtTime(f * 2.2, t + 0.05);
	const g = env(audio, t, peak, 0.002, 0.07);
	osc.connect(g).connect(dest);
	osc.start(t);
	osc.stop(t + 0.1);
}

/** Bush warbler: a long held whistle that jumps into a quick flourish. */
function warbler(audio: AudioContext, dest: AudioNode, t: number) {
	const osc = audio.createOscillator();
	osc.type = 'sine';
	osc.frequency.setValueAtTime(1500, t);
	osc.frequency.linearRampToValueAtTime(1700, t + 0.6);
	osc.frequency.setValueAtTime(2600, t + 0.75);
	osc.frequency.exponentialRampToValueAtTime(1900, t + 0.85);
	osc.frequency.setValueAtTime(2900, t + 0.9);
	osc.frequency.exponentialRampToValueAtTime(2100, t + 1.05);
	const g = audio.createGain();
	g.gain.setValueAtTime(0.0001, t);
	g.gain.exponentialRampToValueAtTime(0.012, t + 0.15);
	g.gain.setValueAtTime(0.012, t + 0.6);
	g.gain.exponentialRampToValueAtTime(0.0005, t + 0.7);
	g.gain.exponentialRampToValueAtTime(0.014, t + 0.76);
	g.gain.exponentialRampToValueAtTime(0.0001, t + 1.15);
	osc.connect(g).connect(dest);
	osc.start(t);
	osc.stop(t + 1.2);
}

function startWater(audio: AudioContext, dest: AudioNode) {
	const src = audio.createBufferSource();
	src.buffer = noiseBuffer(audio, 4, 0.25);
	src.loop = true;
	const band = audio.createBiquadFilter();
	band.type = 'bandpass';
	band.frequency.value = 1800;
	band.Q.value = 0.9;
	const lfo = audio.createOscillator();
	lfo.frequency.value = 0.21;
	const depth = audio.createGain();
	depth.gain.value = 500;
	lfo.connect(depth).connect(band.frequency);
	const gain = audio.createGain();
	gain.gain.setValueAtTime(0.0001, audio.currentTime);
	gain.gain.exponentialRampToValueAtTime(0.022, audio.currentTime + 3);
	src.connect(band).connect(gain).connect(dest);
	src.start();
	lfo.start();
	return { src, lfo };
}

function nextPhrase() {
	const out: Array<{ n: number; len: number }> = [];
	let n = lastNote;
	for (let k = 0; k < 4; k += 1) {
		n = Math.max(4, Math.min(SCALE.length - 1, n + [-2, -1, 1, 2, -1, 0][Math.floor(Math.random() * 6)]));
		out.push({ n, len: [2, 3, 4, 6][Math.floor(Math.random() * 4)] });
	}
	lastNote = n;
	return out;
}

function schedule() {
	if (!running) return;
	const audio = getAudioContext();
	if (!audio || !isLayeredScoreOn() || !stem) {
		timer = window.setTimeout(schedule, 120);
		return;
	}
	while (nextAt < audio.currentTime + 0.3) {
		const t = nextAt;
		const bar = Math.floor(step / 16);
		const beat = step % 16;
		const chord = CHORDS[bar % CHORDS.length];
		const section = Math.floor(bar / 4) % 4;

		if (beat === 0) {
			koto(audio, panned(audio, -0.3, stem), chord.root * 2, t, 0.05, 3, 0.12);
			layers.bass(chord.root, t);
			if (bar % 8 === 0) bowl(audio, panned(audio, 0.2, stem), 196, t + 0.05, 0.03, 7);
		}
		if (beat % 4 === 0 || (beat % 2 === 0 && Math.random() < 0.3)) {
			const tones = chord.tones;
			const pick = beat % 8 === 0 ? 0 : Math.floor(Math.random() * tones.length);
			koto(audio, panned(audio, 0.3, stem), tones[pick], t, section === 0 ? 0.018 : 0.024, 1.4, Math.random() < 0.2 ? 0.1 : 0);
		}
		if (section === 1 || section === 3) {
			if (beat === 0) phrase = nextPhrase();
			let at = 0;
			for (const note of phrase) {
				if (at === beat && Math.random() < 0.85) {
					const freq = SCALE[note.n];
					flute(audio, panned(audio, 0, stem), freq, t, note.len * STEP * 0.9, 0.03);
					layers.note(freq, t, step);
				}
				at += note.len;
			}
		} else if (section === 2 && beat % 2 === 0 && Math.random() < 0.45) {
			const freq = SCALE[5 + Math.floor(Math.random() * 7)];
			koto(audio, panned(audio, -0.1 + Math.random() * 0.2, stem), freq, t + (Math.random() < 0.3 ? STEP * 0.5 : 0), 0.022, 1.2);
			layers.note(freq / 2, t, step);
		}
		if (Math.random() < 0.05) drip(audio, panned(audio, -0.6 + Math.random() * 0.4, stem), t + Math.random() * STEP, 0.008);
		if (Math.random() < 0.004) warbler(audio, panned(audio, 0.5 + Math.random() * 0.4, stem), t);
		nextAt += STEP;
		step += 1;
	}
	timer = window.setTimeout(schedule, 140);
}

export function startMusic() {
	if (running || !isLayeredScoreOn()) return;
	const audio = getAudioContext();
	const bus = getMusicBus();
	if (!audio || !bus) return;
	running = true;
	step = 0;
	stem = audio.createGain();
	stem.gain.setValueAtTime(0.0001, audio.currentTime);
	stem.gain.exponentialRampToValueAtTime(1, audio.currentTime + 2);
	stem.connect(bus);
	water = startWater(audio, stem);
	layers.start(audio, 2);
	nextAt = audio.currentTime + 0.4;
	schedule();
}

export function stopMusic() {
	running = false;
	if (timer != null) {
		clearTimeout(timer);
		timer = null;
	}
	const audio = getAudioContext();
	layers.stop(audio, 1);
	const old = stem;
	const oldWater = water;
	stem = null;
	water = null;
	if (old && audio) {
		old.gain.setTargetAtTime(0.0001, audio.currentTime, 0.18);
		window.setTimeout(() => {
			try {
				oldWater?.src.stop();
				oldWater?.lfo.stop();
				old.disconnect();
			} catch {
				/* already stopped */
			}
		}, 900);
	}
}

function sfxOut(audio: AudioContext, pan = 0) {
	const gain = audio.createGain();
	const p = audio.createStereoPanner();
	p.pan.value = Math.max(-1, Math.min(1, pan));
	gain.connect(p);
	connectSfx(p);
	return gain;
}

function crunch(audio: AudioContext, out: AudioNode, t: number, grains: number, peak: number, spread: number) {
	for (let k = 0; k < grains; k += 1) {
		const at = t + Math.pow(Math.random(), 1.6) * spread;
		const src = audio.createBufferSource();
		src.buffer = noiseBuffer(audio, 0.05, 1);
		const band = audio.createBiquadFilter();
		band.type = 'bandpass';
		band.frequency.value = 1600 + Math.random() * 3600;
		band.Q.value = 3 + Math.random() * 3;
		const g = env(audio, at, peak * (0.4 + Math.random() * 0.6), 0.001, 0.012 + Math.random() * 0.02);
		src.connect(band).connect(g).connect(out);
		src.start(at, Math.random() * 0.03);
		src.stop(at + 0.04);
	}
}

/** A stone set into the gravel: a crunch of grit, a stone knock, and a soft string above it. */
export function playPlace(player: Player, pan: number, moveNo: number) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = sfxOut(audio, pan * 0.6);
	crunch(audio, out, t, 9, 0.07, 0.09);
	const knock = audio.createOscillator();
	knock.type = 'sine';
	const base = player === 1 ? 380 : 620;
	knock.frequency.setValueAtTime(base * 1.6, t);
	knock.frequency.exponentialRampToValueAtTime(base, t + 0.025);
	const kg = env(audio, t, 0.12, 0.001, player === 1 ? 0.09 : 0.06);
	knock.connect(kg).connect(out);
	knock.start(t);
	knock.stop(t + 0.15);
	const thud = audio.createOscillator();
	thud.type = 'sine';
	thud.frequency.setValueAtTime(140, t);
	thud.frequency.exponentialRampToValueAtTime(70, t + 0.08);
	const tg = env(audio, t, 0.08, 0.002, 0.1);
	thud.connect(tg).connect(out);
	thud.start(t);
	thud.stop(t + 0.14);
	const note = SCALE[4 + ((moveNo * 3) % 8)] * (player === 1 ? 1 : 2);
	koto(audio, out, note, t + 0.02, 0.016, 0.9);
}

/** The rake drawn back across the bed: stones lifted for an undo. */
export function playLift() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = sfxOut(audio, 0);
	rake(audio, out, t, 0.45, 2600, 700, 0.05);
}

function rake(audio: AudioContext, out: AudioNode, t: number, len: number, from: number, to: number, peak: number) {
	const src = audio.createBufferSource();
	src.buffer = noiseBuffer(audio, 1, 0.7);
	const band = audio.createBiquadFilter();
	band.type = 'bandpass';
	band.Q.value = 1.4;
	band.frequency.setValueAtTime(from, t);
	band.frequency.exponentialRampToValueAtTime(to, t + len);
	const g = audio.createGain();
	g.gain.setValueAtTime(0.0001, t);
	g.gain.exponentialRampToValueAtTime(peak, t + len * 0.3);
	g.gain.exponentialRampToValueAtTime(0.0001, t + len);
	src.connect(band).connect(g).connect(out);
	src.start(t, Math.random() * 0.3);
	src.stop(t + len + 0.05);
	crunch(audio, out, t, 14, peak * 0.5, len);
}

/** Wooden clappers: someone has four in a row. */
export function playThreat(player: Player) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime + 0.05;
	const out = sfxOut(audio, player === 1 ? -0.2 : 0.2);
	for (const [k, at] of [0, 0.13].entries()) {
		const src = audio.createBufferSource();
		src.buffer = noiseBuffer(audio, 0.05, 1);
		const band = audio.createBiquadFilter();
		band.type = 'bandpass';
		band.frequency.value = k ? 1900 : 1700;
		band.Q.value = 9;
		const g = env(audio, t + at, 0.35, 0.001, 0.06);
		src.connect(band).connect(g).connect(out);
		src.start(t + at);
		src.stop(t + at + 0.08);
	}
}

export function playTurn(player: Player) {
	const audio = sfxContext();
	if (!audio) return;
	koto(audio, sfxOut(audio, player === 1 ? -0.3 : 0.3), player === 1 ? 293.66 : 440, audio.currentTime + 0.06, 0.014, 0.8);
}

/** Bamboo deer-scarer: a hollow knock as the tube tips and strikes the stone. */
export function playClack() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = sfxOut(audio, -0.5);
	const src = audio.createBufferSource();
	src.buffer = noiseBuffer(audio, 0.1, 1);
	const band = audio.createBiquadFilter();
	band.type = 'bandpass';
	band.frequency.value = 820;
	band.Q.value = 10;
	const g = env(audio, t, 0.5, 0.001, 0.12);
	src.connect(band).connect(g).connect(out);
	src.start(t);
	src.stop(t + 0.15);
	const body = audio.createOscillator();
	body.type = 'sine';
	body.frequency.setValueAtTime(420, t);
	body.frequency.exponentialRampToValueAtTime(330, t + 0.12);
	const bg = env(audio, t, 0.06, 0.001, 0.18);
	body.connect(bg).connect(out);
	body.start(t);
	body.stop(t + 0.22);
	for (let k = 0; k < 6; k += 1) drip(audio, out, t + 0.12 + Math.random() * 0.5, 0.012);
}

export function playWin(good: boolean) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime + 0.25;
	const out = sfxOut(audio, 0);
	rake(audio, out, t - 0.2, 0.7, 900, 3200, 0.04);
	const run = good ? [5, 6, 7, 8, 9, 10, 11, 12] : [10, 9, 8, 7, 6, 5];
	run.forEach((n, i) => koto(audio, sfxOut(audio, -0.5 + i / run.length), SCALE[n], t + i * 0.075, 0.035, 1.8));
	bowl(audio, out, good ? 293.66 : 220, t + run.length * 0.075, 0.06, 6);
	if (good) bowl(audio, out, 440, t + run.length * 0.075 + 0.6, 0.035, 5);
}

export function playDraw() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime + 0.25;
	const out = sfxOut(audio, 0);
	bowl(audio, out, 246.94, t, 0.05, 5);
	bowl(audio, out, 246.94 * 1.5, t + 0.7, 0.04, 5);
}

/** Fresh lines raked into the bed, and a bowl to begin. */
export function playStart() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = sfxOut(audio, 0);
	rake(audio, sfxOut(audio, -0.4), t, 0.5, 700, 2400, 0.04);
	rake(audio, sfxOut(audio, 0.4), t + 0.45, 0.5, 700, 2400, 0.035);
	bowl(audio, out, 293.66, t + 0.9, 0.035, 5);
}

export function playSelect() {
	const audio = sfxContext();
	if (!audio) return;
	koto(audio, sfxOut(audio, 0), 783.99, audio.currentTime, 0.014, 0.4);
}
