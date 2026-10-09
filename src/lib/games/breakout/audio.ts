import { connectSfx, getAudioContext, getMusicBus, isLayeredScoreOn, sfxContext } from '$lib/audio/core';
import { createAmbientLayers } from '$lib/audio/ambientLayers';
import type { RelicKind } from './types';

const EIGHTH = 0.2;
const BAR = EIGHTH * 8;

/** i – VI – III – VII, then i – VI – iv – V: A minor rolling under the vault. */
const CHORDS: number[][] = [
	[57, 60, 64, 69],
	[57, 60, 65, 69],
	[55, 60, 64, 67],
	[55, 59, 62, 67],
	[57, 60, 64, 69],
	[57, 60, 65, 69],
	[57, 62, 65, 69],
	[56, 59, 64, 68]
];
const PEDAL = [45, 41, 36, 43, 45, 41, 38, 40];
const ROLL_A = [0, 1, 2, 0, 1, 2, 3, 2];
const ROLL_B = [0, 2, 1, 3, 0, 2, 1, 3];
/** A slow plainchant line, two notes a bar; 0 rests. */
const CHANT = [76, 74, 72, 0, 74, 76, 77, 76, 79, 77, 76, 74, 72, 74, 71, 0];
const CHIMES = [69, 72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96];

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

let running = false;
let timer: number | null = null;
let stem: GainNode | null = null;
let live: AudioScheduledSourceNode[] = [];
let step = 0;
let nextAt = 0;

const layers = createAmbientLayers(
	'breakout',
	BAR,
	CHORDS.flatMap((chord) => chord.map((n) => hz(n + 12)))
);

function env(audio: AudioContext, start: number, peak: number, attack: number, release: number) {
	const gain = audio.createGain();
	gain.gain.setValueAtTime(0.0001, start);
	gain.gain.exponentialRampToValueAtTime(peak, start + attack);
	gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + release);
	return gain;
}

/** Organ-style envelope: speaks quickly, holds, and lets go. */
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

function organ(audio: AudioContext, midi: number, t: number, length: number, peak: number) {
	if (!stem) return;
	const f = hz(midi);
	const out = hold(audio, t, peak, 0.012, length * 0.86, 0.07);
	const tone = audio.createBiquadFilter();
	tone.type = 'lowpass';
	tone.frequency.value = 3400;
	out.connect(tone).connect(stem);
	const stops: Array<[OscillatorType, number, number]> = [
		['sine', 1, 1],
		['triangle', 2, 0.42],
		['sine', 4, 0.16]
	];
	for (const [type, ratio, level] of stops) {
		const osc = audio.createOscillator();
		osc.type = type;
		osc.frequency.value = f * ratio;
		const g = audio.createGain();
		g.gain.value = level;
		osc.connect(g).connect(out);
		osc.start(t);
		osc.stop(t + length + 0.12);
		track(osc);
	}
}

function pedal(audio: AudioContext, midi: number, t: number) {
	if (!stem) return;
	const f = hz(midi);
	const out = hold(audio, t, 0.13, 0.06, BAR * 0.92, 0.35);
	const tone = audio.createBiquadFilter();
	tone.type = 'lowpass';
	tone.frequency.value = 520;
	out.connect(tone).connect(stem);
	for (const [type, ratio, level] of [
		['sine', 1, 1],
		['triangle', 2, 0.35]
	] as Array<[OscillatorType, number, number]>) {
		const osc = audio.createOscillator();
		osc.type = type;
		osc.frequency.value = f * ratio;
		const g = audio.createGain();
		g.gain.value = level;
		osc.connect(g).connect(out);
		osc.start(t);
		osc.stop(t + BAR + 0.4);
		track(osc);
	}
}

/** Two detuned saws through "ah" formants: a distant choir. */
function choirVoice(audio: AudioContext, dest: AudioNode, midi: number, t: number, length: number, peak: number) {
	const f = hz(midi);
	const out = hold(audio, t, peak, 0.5, length, 0.9);
	const f1 = audio.createBiquadFilter();
	f1.type = 'bandpass';
	f1.frequency.value = 730;
	f1.Q.value = 5;
	const f2 = audio.createBiquadFilter();
	f2.type = 'bandpass';
	f2.frequency.value = 1090;
	f2.Q.value = 7;
	const f2g = audio.createGain();
	f2g.gain.value = 0.6;
	const sum = audio.createGain();
	sum.connect(f1).connect(out);
	sum.connect(f2).connect(f2g).connect(out);
	out.connect(dest);
	for (const detune of [-7, 7]) {
		const osc = audio.createOscillator();
		osc.type = 'sawtooth';
		osc.frequency.value = f;
		osc.detune.value += detune;
		osc.connect(sum);
		osc.start(t);
		osc.stop(t + length + 1);
		track(osc);
	}
}

function chant(audio: AudioContext, midi: number, t: number, length: number) {
	if (!stem) return;
	const f = hz(midi);
	const out = hold(audio, t, 0.05, 0.09, length * 0.9, 0.35);
	out.connect(stem);
	const osc = audio.createOscillator();
	osc.type = 'sine';
	osc.frequency.value = f;
	const vib = audio.createOscillator();
	vib.frequency.value = 5.2;
	const depth = audio.createGain();
	depth.gain.value = f * 0.004;
	vib.connect(depth).connect(osc.frequency);
	const body = audio.createOscillator();
	body.type = 'triangle';
	body.frequency.value = f / 2;
	const bodyGain = audio.createGain();
	bodyGain.gain.value = 0.25;
	osc.connect(out);
	body.connect(bodyGain).connect(out);
	for (const node of [osc, vib, body]) {
		node.start(t);
		node.stop(t + length + 0.5);
	}
	track(osc, vib, body);
}

/** Tubular bell: inharmonic partials that die at different rates. */
function bell(audio: AudioContext, dest: AudioNode, midi: number, t: number, peak: number, length = 3.2) {
	const f = hz(midi);
	const partials: Array<[number, number, number]> = [
		[1, 1, 1],
		[2, 0.5, 0.7],
		[2.76, 0.36, 0.5],
		[5.4, 0.18, 0.28],
		[8.93, 0.08, 0.16]
	];
	for (const [ratio, level, life] of partials) {
		const osc = audio.createOscillator();
		osc.type = 'sine';
		osc.frequency.value = f * ratio;
		const g = env(audio, t, peak * level, 0.004, length * life);
		osc.connect(g).connect(dest);
		osc.start(t);
		osc.stop(t + length * life + 0.1);
		track(osc);
	}
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
		const chordIndex = bar % CHORDS.length;
		const chord = CHORDS[chordIndex]!;
		const section = Math.floor(bar / 8) % 4;
		const roll = section === 2 ? ROLL_B : ROLL_A;
		const thin = section === 3;

		if (!thin || pos % 2 === 0) {
			const accent = pos === 0 || pos === 3 || pos === 6 ? 1 : 0.72;
			organ(audio, chord[roll[pos]!]!, nextAt, thin ? EIGHTH * 2 : EIGHTH, 0.05 * accent);
		}

		if (pos === 0) {
			const root = PEDAL[chordIndex]!;
			pedal(audio, root, nextAt);
			layers.bass(hz(root), nextAt);
			if (section === 1 || section === 2 || section === 3) {
				for (const n of chord.slice(0, 3)) if (stem) choirVoice(audio, stem, n, nextAt, BAR * 0.95, 0.03);
			}
			if ((section === 0 || section === 3) && bar % 4 === 0 && stem) {
				bell(audio, stem, root + 24, nextAt, 0.045);
			}
		}

		if (pos === 0 || pos === 4) {
			const line = CHANT[(bar * 2 + pos / 4) % CHANT.length]!;
			if ((section === 2 || section === 3) && line) {
				chant(audio, line, nextAt, EIGHTH * 4);
				layers.note(hz(line), nextAt, bar);
			} else if (pos === 0) {
				layers.note(hz(chord[3]! + 12), nextAt, bar);
			}
		}

		nextAt += EIGHTH;
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
	layers.start(audio, 2);

	// Wind through the broken tracery.
	const wind = audio.createBufferSource();
	wind.buffer = noiseBuffer(audio, 3.4, 0.05);
	wind.loop = true;
	const windTone = audio.createBiquadFilter();
	windTone.type = 'bandpass';
	windTone.frequency.value = 420;
	windTone.Q.value = 0.7;
	const windGain = audio.createGain();
	windGain.gain.value = 0.035;
	const gust = audio.createOscillator();
	gust.frequency.value = 0.06;
	const gustDepth = audio.createGain();
	gustDepth.gain.value = 180;
	gust.connect(gustDepth).connect(windTone.frequency);
	wind.connect(windTone).connect(windGain).connect(stem);
	wind.start();
	gust.start();
	live.push(wind, gust);

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
	layers.stop(audio, 1.2);
	const dying = live.slice();
	const old = stem;
	live = [];
	stem = null;
	if (old && audio) {
		old.gain.setTargetAtTime(0.0001, audio.currentTime, 0.2);
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
		}, 1000);
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

function chime(audio: AudioContext, t: number, midi: number, peak: number, pan = 0) {
	const f = hz(midi);
	tone(audio, t, 'sine', f, f, peak, 0.003, 0.7, pan);
	tone(audio, t, 'sine', f * 2.76, f * 2.76, peak * 0.22, 0.003, 0.25, pan);
	tone(audio, t, 'sine', f * 5.4, f * 5.4, peak * 0.08, 0.002, 0.12, pan);
}

const panFor = (x: number) => (x / 832) * 1.4 - 0.7;

let lastGlass = 0;

export function playPane(combo: number, x: number) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	if (t - lastGlass < 0.025) return;
	lastGlass = t;
	const pan = panFor(x);
	noiseHit(audio, t, 'highpass', 2600, 0.7, 0.07, 0.16, pan);
	noiseHit(audio, t + 0.012, 'bandpass', 5200, 3, 0.04, 0.09, -pan);
	for (let i = 0; i < 3; i += 1) {
		const f = 2600 + Math.random() * 3600;
		tone(audio, t + 0.01 + Math.random() * 0.07, 'sine', f, f * 0.98, 0.012, 0.002, 0.12 + Math.random() * 0.22, pan);
	}
	chime(audio, t, CHIMES[Math.min(CHIMES.length - 1, Math.max(0, combo - 1))]!, 0.05, pan);
}

export function playCrack(x: number) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const pan = panFor(x);
	noiseHit(audio, t, 'bandpass', 3800, 2.5, 0.06, 0.06, pan);
	tone(audio, t, 'sine', 3100, 2900, 0.025, 0.002, 0.1, pan);
	tone(audio, t, 'triangle', 980, 880, 0.03, 0.002, 0.12, pan);
}

export function playLead(x: number) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const pan = panFor(x);
	tone(audio, t, 'square', 196, 180, 0.018, 0.002, 0.1, pan);
	tone(audio, t, 'sine', 1240, 1236, 0.02, 0.002, 0.42, pan);
	tone(audio, t, 'sine', 1870, 1866, 0.01, 0.002, 0.3, pan);
	noiseHit(audio, t, 'bandpass', 2200, 4, 0.03, 0.05, pan);
}

let lastWall = 0;

export function playWall(x: number, y = 400) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	if (t - lastWall < 0.04) return;
	lastWall = t;
	const pan = panFor(x);
	const f = y < 40 ? 740 : 620;
	tone(audio, t, 'triangle', f, f * 0.82, 0.11, 0.002, 0.08, pan);
	tone(audio, t, 'sine', f * 2.4, f * 2.3, 0.035, 0.002, 0.05, pan);
	tone(audio, t, 'sine', 210, 160, 0.06, 0.002, 0.06, pan);
}

const BEAM_NOTES = [69, 72, 74, 76, 79];

export function playBeam(rel: number, x: number) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const pan = panFor(x);
	tone(audio, t, 'sine', 330, 190, 0.14, 0.002, 0.11, pan);
	tone(audio, t, 'triangle', 760, 520, 0.05, 0.002, 0.06, pan);
	const note = BEAM_NOTES[Math.min(BEAM_NOTES.length - 1, Math.round(Math.abs(rel) * (BEAM_NOTES.length - 1)))]!;
	chime(audio, t + 0.005, note + 12, 0.045, pan);
}

export function playServe() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const src = audio.createBufferSource();
	src.buffer = noiseBuffer(audio, 0.6, 1);
	const filter = audio.createBiquadFilter();
	filter.type = 'bandpass';
	filter.Q.value = 3;
	filter.frequency.setValueAtTime(420, t);
	filter.frequency.exponentialRampToValueAtTime(2200, t + 0.3);
	const g = env(audio, t, 0.035, 0.08, 0.26);
	src.connect(filter).connect(g);
	connectSfx(g);
	src.start(t);
	src.stop(t + 0.4);
	tone(audio, t, 'sine', 440, 660, 0.03, 0.02, 0.24);
}

const RELIC_NOTES: Record<RelicKind, number[]> = {
	lantern: [69, 73, 76],
	triptych: [69, 76, 81],
	halo: [81, 76, 73],
	sunburst: [69, 73, 76, 81],
	candle: [76, 81, 85]
};

export function playRelic(kind: RelicKind) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	RELIC_NOTES[kind].forEach((n, i) => chime(audio, t + i * 0.07, n + 12, 0.045, (i - 1) * 0.3));
}

export function playDrop() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	tone(audio, t, 'sine', 1760, 1760, 0.012, 0.004, 0.3);
}

export function playExpire() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	chime(audio, t, 81, 0.025);
	chime(audio, t + 0.12, 76, 0.02);
}

export function playFizzle() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	tone(audio, t, 'sine', 620, 200, 0.03, 0.01, 0.3);
}

export function playLost() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = audio.createGain();
	out.gain.value = 1;
	connectSfx(out);
	bell(audio, out, 45, t, 0.1, 3.4);
	tone(audio, t, 'sine', 110, 55, 0.08, 0.04, 1.2);
	noiseHit(audio, t, 'lowpass', 500, 0.7, 0.05, 0.6);
}

function chord(audio: AudioContext, notes: number[], t: number, peak: number, length: number) {
	const out = audio.createGain();
	out.gain.value = 1;
	connectSfx(out);
	for (const n of notes) choirVoice(audio, out, n, t, length, peak);
	return out;
}

export function playLit() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = chord(audio, [57, 61, 64, 69, 73], t, 0.035, 1.8);
	[81, 85, 88, 93].forEach((n, i) => bell(audio, out, n, t + 0.1 + i * 0.16, 0.04, 2.4));
}

export function playOver() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = audio.createGain();
	out.gain.value = 1;
	connectSfx(out);
	bell(audio, out, 45, t, 0.11, 4);
	bell(audio, out, 40, t + 1.1, 0.1, 4.4);
}

export function playWon() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = chord(audio, [57, 61, 64, 69, 73, 76], t, 0.035, 3);
	const peal = [93, 91, 89, 88, 86, 85, 83, 81];
	for (let round = 0; round < 2; round += 1) {
		peal.forEach((n, i) => bell(audio, out, n - 12, t + 0.2 + (round * 8 + i) * 0.22, 0.035, 2));
	}
}

export function playPause() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	tone(audio, t, 'sine', 440, 330, 0.035, 0.01, 0.2);
}

export function playSelect() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	chime(audio, t, 81, 0.025);
}
