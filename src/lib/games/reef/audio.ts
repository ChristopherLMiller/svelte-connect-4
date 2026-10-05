import { connectSfx, getAudioContext, getMusicBus, isLayeredScoreOn, sfxContext } from '$lib/audio/core';
import { createAmbientLayers } from '$lib/audio/ambientLayers';
import type { ClearInfo } from './engine';
import { COLS } from './types';

/** Eighth-note length at the surface and at the deepest pace. */
const SLOW = 0.36;
const FAST = 0.19;

/** i – VI – iv – v in D minor, voiced wide and low like something heard through water. */
const CHORDS: number[][] = [
	[50, 57, 62, 65, 69],
	[46, 53, 58, 62, 65],
	[43, 50, 55, 58, 62],
	[45, 52, 57, 60, 64],
	[50, 57, 62, 65, 69],
	[46, 53, 58, 62, 69],
	[48, 55, 60, 64, 67],
	[45, 52, 57, 61, 64]
];
const ROOTS = [38, 34, 31, 33, 38, 34, 36, 33];
/** Whale phrases: pairs of [from, to] slides; 0 is a breath. */
const CALLS: Array<[number, number]> = [
	[62, 69],
	[69, 65],
	[0, 0],
	[57, 62],
	[65, 74],
	[74, 69],
	[0, 0],
	[62, 57]
];
const GLINTS = [74, 77, 81, 84, 86, 89, 93, 96, 98];

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

let running = false;
let timer: number | null = null;
let stem: GainNode | null = null;
let live: AudioScheduledSourceNode[] = [];
let step = 0;
let nextAt = 0;
let eighth = SLOW;
let pace = 0;

const layers = createAmbientLayers(
	'reef',
	SLOW * 8,
	CHORDS.flatMap((chord) => chord.map((n) => hz(n + 12)))
);

/** Deeper dives quicken the pulse; the curve flattens so level 15 is urgent, not frantic. */
export function setDivePace(level: number) {
	pace = Math.min(1, Math.max(0, (level - 1) / 14));
	eighth = SLOW - (SLOW - FAST) * Math.sqrt(pace);
}

function env(audio: AudioContext, start: number, peak: number, attack: number, release: number) {
	const gain = audio.createGain();
	gain.gain.setValueAtTime(0.0001, start);
	gain.gain.exponentialRampToValueAtTime(peak, start + attack);
	gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + release);
	return gain;
}

function hold(audio: AudioContext, start: number, peak: number, attack: number, length: number, release: number) {
	const gain = audio.createGain();
	gain.gain.setValueAtTime(0.0001, start);
	gain.gain.exponentialRampToValueAtTime(peak, start + attack);
	gain.gain.setValueAtTime(peak, start + Math.max(attack, length));
	gain.gain.exponentialRampToValueAtTime(0.0001, start + Math.max(attack, length) + release);
	return gain;
}

const noiseCache = new Map<string, AudioBuffer>();

function noiseBuffer(audio: AudioContext, seconds = 1, color = 1) {
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

function track(...nodes: AudioScheduledSourceNode[]) {
	live.push(...nodes);
	if (live.length > 240) live = live.slice(-160);
}

/** A sonar ping: a pure tone that rings, with a fainter return off the far wall. */
function ping(audio: AudioContext, dest: AudioNode, midi: number, t: number, peak: number, echo = 0.42) {
	const f = hz(midi);
	for (const [delay, level] of [
		[0, 1],
		[echo, 0.32],
		[echo * 2, 0.1]
	] as Array<[number, number]>) {
		const at = t + delay;
		const osc = audio.createOscillator();
		osc.type = 'sine';
		osc.frequency.setValueAtTime(f, at);
		osc.frequency.exponentialRampToValueAtTime(f * 0.985, at + 1.4);
		const g = env(audio, at, peak * level, 0.004, 1.4);
		const over = audio.createOscillator();
		over.type = 'sine';
		over.frequency.value = f * 2.01;
		const og = env(audio, at, peak * level * 0.12, 0.003, 0.3);
		osc.connect(g).connect(dest);
		over.connect(og).connect(dest);
		osc.start(at);
		osc.stop(at + 1.5);
		over.start(at);
		over.stop(at + 0.4);
		track(osc, over);
	}
}

/** Whale song: a slow slide between two notes through a vowel-ish formant, with a wobble. */
function call(audio: AudioContext, dest: AudioNode, from: number, to: number, t: number, length: number, peak: number) {
	const out = hold(audio, t, peak, length * 0.3, length * 0.6, length * 0.5);
	const formant = audio.createBiquadFilter();
	formant.type = 'bandpass';
	formant.frequency.setValueAtTime(600, t);
	formant.frequency.linearRampToValueAtTime(1100, t + length * 0.6);
	formant.frequency.linearRampToValueAtTime(500, t + length * 1.2);
	formant.Q.value = 2.2;
	const body = audio.createBiquadFilter();
	body.type = 'lowpass';
	body.frequency.value = 1800;
	formant.connect(body).connect(out);
	out.connect(dest);
	const osc = audio.createOscillator();
	osc.type = 'sawtooth';
	osc.frequency.setValueAtTime(hz(from), t);
	osc.frequency.exponentialRampToValueAtTime(hz(to), t + length * 0.8);
	const sine = audio.createOscillator();
	sine.type = 'sine';
	sine.frequency.setValueAtTime(hz(from), t);
	sine.frequency.exponentialRampToValueAtTime(hz(to), t + length * 0.8);
	const sineGain = audio.createGain();
	sineGain.gain.value = 0.8;
	const vib = audio.createOscillator();
	vib.frequency.value = 4.2;
	const vibDepth = audio.createGain();
	vibDepth.gain.value = 18;
	vib.connect(vibDepth);
	vibDepth.connect(osc.detune);
	vibDepth.connect(sine.detune);
	osc.connect(formant);
	sine.connect(sineGain).connect(out);
	const end = t + length * 1.4;
	for (const node of [osc, sine, vib]) {
		node.start(t);
		node.stop(end);
	}
	track(osc, sine, vib);
}

/** A wide pad: detuned saws under a slowly opening filter. */
function pad(audio: AudioContext, notes: number[], t: number, length: number, peak: number) {
	if (!stem) return;
	const out = hold(audio, t, peak, length * 0.35, length * 0.8, length * 0.45);
	const filter = audio.createBiquadFilter();
	filter.type = 'lowpass';
	filter.Q.value = 0.8;
	filter.frequency.setValueAtTime(260, t);
	filter.frequency.linearRampToValueAtTime(720 + pace * 600, t + length * 0.5);
	filter.frequency.linearRampToValueAtTime(320, t + length * 1.2);
	filter.connect(out).connect(stem);
	for (const n of notes) {
		for (const detune of [-9, 9]) {
			const osc = audio.createOscillator();
			osc.type = 'sawtooth';
			osc.frequency.value = hz(n);
			osc.detune.value += detune;
			osc.connect(filter);
			osc.start(t);
			osc.stop(t + length * 1.3);
			track(osc);
		}
	}
}

/** The pulse: a muffled heartbeat that the music leans on as the dive deepens. */
function thump(audio: AudioContext, midi: number, t: number, peak: number) {
	if (!stem) return;
	const osc = audio.createOscillator();
	osc.type = 'sine';
	osc.frequency.setValueAtTime(hz(midi) * 2, t);
	osc.frequency.exponentialRampToValueAtTime(hz(midi), t + 0.08);
	const g = env(audio, t, peak, 0.006, 0.32);
	osc.connect(g).connect(stem);
	osc.start(t);
	osc.stop(t + 0.4);
	track(osc);
}

function droplet(audio: AudioContext, midi: number, t: number, peak: number) {
	if (!stem) return;
	const f = hz(midi);
	const osc = audio.createOscillator();
	osc.type = 'triangle';
	osc.frequency.value = f;
	const g = env(audio, t, peak, 0.003, 0.5);
	const tone = audio.createBiquadFilter();
	tone.type = 'lowpass';
	tone.frequency.value = 2600;
	osc.connect(tone).connect(g).connect(stem);
	osc.start(t);
	osc.stop(t + 0.6);
	track(osc);
}

function schedule() {
	if (!running) return;
	const audio = getAudioContext();
	if (!audio || !isLayeredScoreOn()) {
		timer = window.setTimeout(schedule, 120);
		return;
	}
	while (nextAt < audio.currentTime + 0.3) {
		const bar = Math.floor(step / 8);
		const pos = step % 8;
		const chordIndex = Math.floor(bar / 2) % CHORDS.length;
		const chord = CHORDS[chordIndex]!;
		const root = ROOTS[chordIndex]!;
		const section = Math.floor(bar / 16) % 3;
		const span = eighth * 16;

		if (pos === 0 && bar % 2 === 0) {
			pad(audio, chord.slice(0, 4), nextAt, span, 0.018);
			layers.bass(hz(root), nextAt);
		}

		if (pos === 0 && bar % 2 === 0 && stem) {
			ping(audio, stem, bar % 4 === 0 ? 86 : 81, nextAt, 0.035, Math.max(0.24, eighth * 1.2));
		}

		// Two beats a bar at the surface, four once the water presses in.
		if (pos === 0 || pos === 4 || (pace > 0.35 && pos % 2 === 0)) {
			thump(audio, root, nextAt, pos === 0 ? 0.13 : 0.06 + pace * 0.04);
		}

		if (section > 0 && pos === 2 && bar % 2 === 1 && stem) {
			const [from, to] = CALLS[(bar >> 1) % CALLS.length]!;
			if (from) {
				call(audio, stem, from - 12, to - 12, nextAt, eighth * 9, 0.022);
				layers.note(hz(to), nextAt + eighth * 6, bar);
			}
		}

		if (section !== 1 && (pos === 3 || pos === 6) && (pace > 0.2 || (bar + pos) % 3 === 0)) {
			const pick = chord[(bar + pos) % chord.length]! + 12;
			droplet(audio, pick, nextAt, 0.028);
		}

		if (section === 1 && pos === 0) layers.note(hz(chord[3]! + 12), nextAt, bar);

		nextAt += eighth;
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
	stem.gain.exponentialRampToValueAtTime(1, audio.currentTime + 2.5);
	stem.connect(bus);
	layers.start(audio, 2.5);

	// The hush of deep water: brown noise, barely moving.
	const water = audio.createBufferSource();
	water.buffer = noiseBuffer(audio, 4, 0.02);
	water.loop = true;
	const waterTone = audio.createBiquadFilter();
	waterTone.type = 'lowpass';
	waterTone.frequency.value = 280;
	const waterGain = audio.createGain();
	waterGain.gain.value = 0.06;
	const swell = audio.createOscillator();
	swell.frequency.value = 0.045;
	const swellDepth = audio.createGain();
	swellDepth.gain.value = 90;
	swell.connect(swellDepth).connect(waterTone.frequency);
	water.connect(waterTone).connect(waterGain).connect(stem);
	water.start();
	swell.start();
	live.push(water, swell);

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
	layers.stop(audio, 1.4);
	const dying = live.slice();
	const old = stem;
	live = [];
	stem = null;
	if (old && audio) {
		old.gain.setTargetAtTime(0.0001, audio.currentTime, 0.25);
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
		}, 1200);
	}
}

function sfxOut(audio: AudioContext, node: AudioNode, pan = 0) {
	if (!pan) {
		connectSfx(node);
		return;
	}
	const panner = audio.createStereoPanner();
	panner.pan.value = Math.max(-0.8, Math.min(0.8, pan));
	node.connect(panner);
	connectSfx(panner);
}

function sfxBus(audio: AudioContext) {
	const out = audio.createGain();
	out.gain.value = 1;
	connectSfx(out);
	return out;
}

function noiseHit(audio: AudioContext, t: number, type: BiquadFilterType, freq: number, q: number, peak: number, length: number, pan = 0) {
	const src = audio.createBufferSource();
	src.buffer = noiseBuffer(audio, 0.6, 1);
	const filter = audio.createBiquadFilter();
	filter.type = type;
	filter.frequency.value = freq;
	filter.Q.value = q;
	const g = env(audio, t, peak, 0.002, length);
	src.connect(filter).connect(g);
	sfxOut(audio, g, pan);
	src.start(t, Math.random() * 0.3);
	src.stop(t + length + 0.05);
}

function tone(audio: AudioContext, t: number, type: OscillatorType, from: number, to: number, peak: number, attack: number, length: number, pan = 0) {
	const osc = audio.createOscillator();
	osc.type = type;
	osc.frequency.setValueAtTime(from, t);
	if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t + length);
	const g = env(audio, t, peak, attack, length);
	osc.connect(g);
	sfxOut(audio, g, pan);
	osc.start(t);
	osc.stop(t + attack + length + 0.05);
}

/** A bubble: a sine that rises as it pops. */
function bubble(audio: AudioContext, t: number, f: number, peak: number, pan = 0) {
	tone(audio, t, 'sine', f, f * 1.9, peak, 0.002, 0.06, pan);
}

const panFor = (x: number) => (x / (COLS - 1)) * 1.2 - 0.6;

let lastMove = 0;

export function playMove() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	if (t - lastMove < 0.02) return;
	lastMove = t;
	bubble(audio, t, 700 + Math.random() * 120, 0.018);
}

export function playRotate(kick: number) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	bubble(audio, t, 520 + kick * 60, 0.03);
	bubble(audio, t + 0.035, 860 + kick * 80, 0.018);
}

export function playLand() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	tone(audio, t, 'sine', 160, 110, 0.035, 0.003, 0.08);
}

export function playLock(x: number) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const pan = panFor(x);
	tone(audio, t, 'triangle', 330, 300, 0.04, 0.002, 0.12, pan);
	tone(audio, t, 'sine', 1320, 1310, 0.012, 0.002, 0.18, pan);
	noiseHit(audio, t, 'bandpass', 1800, 3, 0.025, 0.04, pan);
}

export function playHardDrop(rows: number) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const src = audio.createBufferSource();
	src.buffer = noiseBuffer(audio, 0.6, 1);
	const filter = audio.createBiquadFilter();
	filter.type = 'bandpass';
	filter.Q.value = 1.4;
	filter.frequency.setValueAtTime(2400, t);
	filter.frequency.exponentialRampToValueAtTime(320, t + 0.14);
	const g = env(audio, t, 0.02 + Math.min(rows, 18) * 0.002, 0.004, 0.14);
	src.connect(filter).connect(g);
	connectSfx(g);
	src.start(t);
	src.stop(t + 0.2);
	tone(audio, t + 0.06, 'sine', 120, 60, 0.11, 0.003, 0.18);
}

export function playHold() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	tone(audio, t, 'sine', 660, 990, 0.025, 0.01, 0.12);
	tone(audio, t + 0.07, 'sine', 990, 660, 0.02, 0.01, 0.14);
}

/** Plankton rising: a cloud of tiny bright notes, more of them for bigger clears. */
function bloom(audio: AudioContext, t: number, count: number, peak: number) {
	const n = 4 + count * 4;
	for (let i = 0; i < n; i += 1) {
		const midi = GLINTS[Math.min(GLINTS.length - 1, Math.floor((i / n) * (count + 4)) + Math.floor(Math.random() * 3))]!;
		const f = hz(midi);
		tone(audio, t + i * 0.035 + Math.random() * 0.02, 'sine', f, f * 1.01, peak, 0.004, 0.5 + Math.random() * 0.4, Math.random() * 1.2 - 0.6);
	}
}

export function playWhale() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = sfxBus(audio);
	call(audio, out, 45, 52, t + 0.1, 1.4, 0.05);
	call(audio, out, 52, 47, t + 1.3, 1.6, 0.045);
	call(audio, out, 57, 64, t + 2.6, 1.2, 0.03);
}

export function playClear(info: ClearInfo) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = sfxBus(audio);
	noiseHit(audio, t, 'highpass', 3200, 0.8, 0.03 + info.count * 0.008, 0.3 + info.count * 0.08);
	tone(audio, t, 'sine', 220, 440, 0.04, 0.02, 0.4);
	bloom(audio, t + 0.04, info.count, 0.016);
	ping(audio, out, info.count === 4 ? 74 : 81 + info.count, t, 0.03, 0.3);
	if (info.count === 4) playWhale();
	if (info.combo >= 1) {
		const f = hz(GLINTS[Math.min(GLINTS.length - 1, info.combo)]! - 12);
		tone(audio, t + 0.12, 'triangle', f, f, 0.025, 0.004, 0.3);
	}
	if (info.perfect) {
		[74, 78, 81, 86, 90, 93].forEach((n, i) => ping(audio, out, n, t + 0.3 + i * 0.12, 0.025, 0.36));
	}
}

export function playTspin(mini: boolean) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const notes = mini ? [69, 76] : [69, 73, 76, 81];
	notes.forEach((n, i) => {
		const f = hz(n);
		tone(audio, t + i * 0.04, 'sine', f, f, 0.025, 0.004, 0.6, (i - 1.5) * 0.3);
	});
	noiseHit(audio, t, 'bandpass', 4200, 4, 0.02, 0.2);
}

export function playLevel(level: number) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = sfxBus(audio);
	ping(audio, out, 74, t, 0.05, 0.5);
	ping(audio, out, 62, t + 0.28, 0.045, 0.5);
	tone(audio, t, 'sine', 55, 41 - Math.min(level, 15) * 0.4, 0.1, 0.3, 1.6);
}

export function playOver() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = sfxBus(audio);
	ping(audio, out, 69, t, 0.05, 0.7);
	ping(audio, out, 62, t + 0.9, 0.04, 0.8);
	ping(audio, out, 57, t + 1.9, 0.035, 0.9);
	call(audio, out, 40, 33, t + 0.4, 2.6, 0.04);
	tone(audio, t, 'sine', 80, 40, 0.09, 0.4, 2.4);
}

export function playDone() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = sfxBus(audio);
	[62, 69, 74, 77, 81, 86].forEach((n, i) => ping(audio, out, n, t + i * 0.11, 0.035, 0.4));
	call(audio, out, 50, 57, t + 0.5, 1.6, 0.035);
	bloom(audio, t + 0.2, 4, 0.014);
}

export function playReady() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	ping(audio, sfxBus(audio), 81, t, 0.03, 0.36);
}

export function playPause() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	tone(audio, t, 'sine', 523, 392, 0.03, 0.01, 0.22);
}

export function playSelect() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	bubble(audio, t, 620, 0.03);
	tone(audio, t, 'sine', 1175, 1175, 0.015, 0.003, 0.3);
}
