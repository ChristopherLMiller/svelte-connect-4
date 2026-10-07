import { connectSfx, getAudioContext, getMusicBus, isLayeredScoreOn, sfxContext } from '$lib/audio/core';
import { createAmbientLayers } from '$lib/audio/ambientLayers';
import type { Player } from './types';

const STEP = 0.4;

/** D Dorian: the raised sixth keeps the old modal colour from turning mournful. */
const SCALE = [293.66, 329.63, 349.23, 392, 440, 493.88, 523.25];

const CHORDS: Array<{ root: number; tones: number[] }> = [
	{ root: 73.42, tones: [293.66, 349.23, 440] },
	{ root: 65.41, tones: [261.63, 329.63, 392] },
	{ root: 98, tones: [293.66, 392, 493.88] },
	{ root: 73.42, tones: [293.66, 349.23, 440] },
	{ root: 87.31, tones: [261.63, 349.23, 440] },
	{ root: 65.41, tones: [261.63, 329.63, 392] },
	{ root: 110, tones: [277.18, 329.63, 440] },
	{ root: 73.42, tones: [293.66, 349.23, 440] }
];

const layers = createAmbientLayers('cartographer', STEP, SCALE);

let running = false;
let timer: number | null = null;
let stem: GainNode | null = null;
let step = 0;
let nextAt = 0;
let lastNote = 4;
let phrase: number[] = [];

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
	p.pan.value = pan;
	p.connect(dest);
	return p;
}

/** Plucked string: a bright wave through a filter that closes as the note dies. */
function pluck(audio: AudioContext, dest: AudioNode, freq: number, t: number, peak: number, decay: number, kind: 'harpsichord' | 'lute') {
	const nodes: OscillatorNode[] = [];
	const filter = audio.createBiquadFilter();
	filter.type = 'lowpass';
	const bright = kind === 'harpsichord' ? 7 : 3.2;
	filter.frequency.setValueAtTime(Math.min(12000, freq * bright), t);
	filter.frequency.exponentialRampToValueAtTime(Math.max(200, freq * 1.1), t + decay * 0.7);
	filter.Q.value = kind === 'harpsichord' ? 2 : 0.8;
	const gain = env(audio, t, peak, 0.002, decay);
	filter.connect(gain).connect(dest);
	const voices: Array<[OscillatorType, number, number]> =
		kind === 'harpsichord'
			? [
					['sawtooth', 1, 1],
					['square', 2, 0.35]
				]
			: [
					['triangle', 1, 1],
					['sawtooth', 1, 0.25]
				];
	for (const [type, ratio, level] of voices) {
		const osc = audio.createOscillator();
		osc.type = type;
		osc.frequency.setValueAtTime(freq * ratio, t);
		osc.detune.setValueAtTime((Math.random() - 0.5) * 6, t);
		const g = audio.createGain();
		g.gain.value = level;
		osc.connect(g).connect(filter);
		osc.start(t);
		osc.stop(t + decay + 0.05);
		nodes.push(osc);
	}
	return nodes;
}

/** Recorder: a near-sine with a breath of noise and vibrato that arrives late. */
function recorder(audio: AudioContext, dest: AudioNode, freq: number, t: number, dur: number, peak: number) {
	const osc = audio.createOscillator();
	osc.type = 'sine';
	osc.frequency.setValueAtTime(freq, t);
	const over = audio.createOscillator();
	over.type = 'sine';
	over.frequency.setValueAtTime(freq * 2, t);
	const overGain = audio.createGain();
	overGain.gain.value = 0.12;
	const vib = audio.createOscillator();
	vib.frequency.value = 5.2;
	const vibDepth = audio.createGain();
	vibDepth.gain.setValueAtTime(0, t);
	vibDepth.gain.linearRampToValueAtTime(freq * 0.006, t + Math.min(dur, 0.5));
	vib.connect(vibDepth).connect(osc.frequency);
	const gain = audio.createGain();
	gain.gain.setValueAtTime(0.0001, t);
	gain.gain.exponentialRampToValueAtTime(peak, t + 0.06);
	gain.gain.setValueAtTime(peak * 0.85, t + Math.max(0.07, dur - 0.08));
	gain.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);
	osc.connect(gain);
	over.connect(overGain).connect(gain);
	const breath = audio.createBufferSource();
	breath.buffer = noiseBuffer(audio, 1, 0.8);
	const band = audio.createBiquadFilter();
	band.type = 'bandpass';
	band.frequency.value = freq * 3;
	band.Q.value = 2;
	const breathGain = env(audio, t, peak * 0.1, 0.03, 0.12);
	breath.connect(band).connect(breathGain).connect(dest);
	gain.connect(dest);
	for (const node of [osc, over, vib]) {
		node.start(t);
		node.stop(t + dur + 0.2);
	}
	breath.start(t, Math.random() * 0.5);
	breath.stop(t + 0.2);
}

function crackle(audio: AudioContext, dest: AudioNode, t: number, peak: number) {
	const src = audio.createBufferSource();
	src.buffer = noiseBuffer(audio, 0.2, 1);
	const band = audio.createBiquadFilter();
	band.type = 'bandpass';
	band.frequency.value = 1800 + Math.random() * 2600;
	band.Q.value = 1.5;
	const gain = env(audio, t, peak, 0.001, 0.008 + Math.random() * 0.02);
	src.connect(band).connect(gain).connect(dest);
	src.start(t, Math.random() * 0.15);
	src.stop(t + 0.05);
}

function nextPhrase() {
	const out: number[] = [];
	let n = lastNote;
	for (let k = 0; k < 8; k += 1) {
		const move = [-2, -1, -1, 1, 1, 2, 0, 3][Math.floor(Math.random() * 8)];
		n = Math.max(0, Math.min(SCALE.length + 3, n + move));
		out.push(k % 2 === 1 && Math.random() < 0.4 ? -1 : n);
	}
	out[7] = Math.random() < 0.5 ? 0 : 4;
	lastNote = out[7];
	return out;
}

function noteFreq(index: number) {
	return SCALE[index % SCALE.length] * (index >= SCALE.length ? 2 : 1);
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
		const bar = Math.floor(step / 8);
		const beat = step % 8;
		const chord = CHORDS[bar % CHORDS.length];
		if (beat === 0) {
			pluck(audio, panned(audio, -0.25, stem), chord.root * 2, t, 0.09, 2.6, 'lute');
			pluck(audio, panned(audio, -0.25, stem), chord.root * 3, t + 0.02, 0.035, 2.2, 'lute');
			layers.bass(chord.root, t);
		}
		if (beat === 4) pluck(audio, panned(audio, -0.25, stem), chord.root * 2, t, 0.05, 1.6, 'lute');
		const arp = [0, 1, 2, 1];
		const tone = chord.tones[arp[beat % 4]] * (beat % 4 === 2 ? 2 : 1);
		pluck(audio, panned(audio, 0.3, stem), tone, t, 0.022, 0.9, 'harpsichord');
		if (Math.random() < 0.5) pluck(audio, panned(audio, 0.35, stem), chord.tones[(beat + 1) % 3] * 2, t + STEP / 2, 0.014, 0.7, 'harpsichord');

		const section = Math.floor(bar / 4) % 3;
		if (section !== 2) {
			if (beat === 0) phrase = nextPhrase();
			const n = phrase[beat];
			if (n >= 0 && (beat % 2 === 0 || Math.random() < 0.7)) {
				const long = beat === 7 || phrase[beat + 1] === -1;
				const freq = noteFreq(n) * 2;
				recorder(audio, panned(audio, 0.05, stem), freq, t, STEP * (long ? 1.8 : 0.9), 0.045);
				layers.note(freq / 2, t, step);
			}
		}
		if (Math.random() < 0.08) {
			const out = panned(audio, -0.7 + Math.random() * 0.3, stem);
			const bursts = 1 + Math.floor(Math.random() * 3);
			for (let k = 0; k < bursts; k += 1) crackle(audio, out, t + Math.random() * STEP, 0.02 + Math.random() * 0.02);
		}
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
	stem = null;
	if (old && audio) {
		old.gain.setTargetAtTime(0.0001, audio.currentTime, 0.18);
		window.setTimeout(() => {
			try {
				old.disconnect();
			} catch {
				/* already disconnected */
			}
		}, 900);
	}
}

function sfxOut(audio: AudioContext, pan = 0) {
	const gain = audio.createGain();
	const p = audio.createStereoPanner();
	p.pan.value = pan;
	gain.connect(p);
	connectSfx(p);
	return gain;
}

/** A nib dragged across rag paper: a few gritty grains with a little squeak. */
export function playScratch(player: Player) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = sfxOut(audio, player === 1 ? -0.2 : 0.2);
	const src = audio.createBufferSource();
	src.buffer = noiseBuffer(audio, 0.5, 1);
	const band = audio.createBiquadFilter();
	band.type = 'bandpass';
	const centre = player === 1 ? 3400 : 2900;
	band.frequency.setValueAtTime(centre, t);
	band.frequency.linearRampToValueAtTime(centre * 1.25, t + 0.16);
	band.Q.value = 2.4;
	const gain = audio.createGain();
	gain.gain.setValueAtTime(0.0001, t);
	const grains = 6;
	for (let k = 0; k < grains; k += 1) {
		const at = t + k * 0.026 + Math.random() * 0.008;
		gain.gain.setTargetAtTime(0.09 * (0.6 + Math.random() * 0.5) * (1 - k / (grains + 2)), at, 0.004);
		gain.gain.setTargetAtTime(0.012, at + 0.012, 0.006);
	}
	gain.gain.setTargetAtTime(0.0001, t + grains * 0.026, 0.02);
	src.connect(band).connect(gain).connect(out);
	src.start(t, Math.random() * 0.3);
	src.stop(t + 0.3);
	const squeak = audio.createOscillator();
	squeak.type = 'sine';
	squeak.frequency.setValueAtTime(5200 + Math.random() * 800, t + 0.04);
	squeak.frequency.linearRampToValueAtTime(6100, t + 0.12);
	const sg = env(audio, t + 0.04, 0.004, 0.02, 0.08);
	squeak.connect(sg).connect(out);
	squeak.start(t + 0.04);
	squeak.stop(t + 0.16);
}

/** Each square in a run plucks one step higher up the mode. */
export function playClaim(streak: number, count: number) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime + 0.12;
	const out = sfxOut(audio, 0);
	const idx = Math.min(SCALE.length * 2 - 1, streak - 1);
	const freq = noteFreq(idx) * 2;
	pluck(audio, out, freq, t, 0.08, 1.4, 'harpsichord');
	pluck(audio, out, freq / 2, t, 0.06, 1.8, 'lute');
	if (count > 1) pluck(audio, out, noteFreq(Math.min(SCALE.length * 2 - 1, idx + 2)) * 2, t + 0.09, 0.07, 1.4, 'harpsichord');
	if (streak >= 4) recorder(audio, out, freq * 2, t + 0.05, 0.25, 0.025);
}

export function playTurn(player: Player) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime + 0.18;
	pluck(audio, sfxOut(audio, player === 1 ? -0.3 : 0.3), player === 1 ? 146.83 : 110, t, 0.022, 0.5, 'lute');
}

export function playWin(good: boolean) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime + 0.35;
	const line = good ? [293.66, 349.23, 440, 523.25, 587.33] : [440, 392, 349.23, 329.63, 293.66];
	line.forEach((freq, i) => {
		const out = sfxOut(audio, -0.4 + i * 0.2);
		pluck(audio, out, freq, t + i * 0.14, 0.07, 1.6, 'harpsichord');
		if (i === line.length - 1) {
			recorder(audio, out, freq * 2, t + i * 0.14, 1.2, 0.04);
			for (const tone of good ? [146.83, 220, 293.66] : [146.83, 174.61, 220]) pluck(audio, out, tone, t + i * 0.14, 0.06, 2.6, 'lute');
		}
	});
}

export function playDraw() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime + 0.35;
	const out = sfxOut(audio, 0);
	for (const [i, freq] of [261.63, 329.63, 392, 293.66, 349.23, 440].entries()) {
		pluck(audio, out, freq, t + (i < 3 ? 0 : 0.6) + (i % 3) * 0.04, 0.05, 1.6, i < 3 ? 'harpsichord' : 'lute');
	}
}

/** Parchment unrolled across the desk, then a single plucked note. */
export function playStart() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const src = audio.createBufferSource();
	src.buffer = noiseBuffer(audio, 1, 0.35);
	const band = audio.createBiquadFilter();
	band.type = 'bandpass';
	band.frequency.setValueAtTime(700, t);
	band.frequency.exponentialRampToValueAtTime(2600, t + 0.4);
	band.Q.value = 0.9;
	const gain = env(audio, t, 0.08, 0.12, 0.4);
	const flutter = audio.createOscillator();
	const depth = audio.createGain();
	flutter.frequency.value = 26;
	depth.gain.value = 0.03;
	flutter.connect(depth).connect(gain.gain);
	src.connect(band).connect(gain);
	connectSfx(gain);
	src.start(t);
	src.stop(t + 0.6);
	flutter.start(t);
	flutter.stop(t + 0.6);
	pluck(audio, sfxOut(audio, 0), 293.66, t + 0.32, 0.06, 1.4, 'lute');
	pluck(audio, sfxOut(audio, 0), 440, t + 0.4, 0.04, 1.2, 'harpsichord');
}

export function playSelect() {
	const audio = sfxContext();
	if (!audio) return;
	pluck(audio, sfxOut(audio, 0), 587.33, audio.currentTime, 0.035, 0.4, 'harpsichord');
}
