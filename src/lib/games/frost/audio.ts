import { connectSfx, getAudioContext, getMusicBus, isLayeredScoreOn, sfxContext } from '$lib/audio/core';
import { createAmbientLayers } from '$lib/audio/ambientLayers';

const STEP = 0.78;

/** D Lydian, the raised fourth gives the morning its cold shimmer. */
const SCALE = [293.66, 329.63, 369.99, 415.3, 440, 493.88, 554.37];

const CHORDS: Array<{ root: number; tones: number[] }> = [
	{ root: 73.42, tones: [293.66, 369.99, 440, 554.37] },
	{ root: 61.74, tones: [246.94, 293.66, 369.99, 554.37] },
	{ root: 98, tones: [293.66, 392, 493.88, 554.37] },
	{ root: 82.41, tones: [329.63, 415.3, 493.88, 587.33] }
];

const layers = createAmbientLayers('frost', STEP, SCALE);

let running = false;
let timer: number | null = null;
let stem: GainNode | null = null;
let padBus: GainNode | null = null;
let live: Array<OscillatorNode | AudioBufferSourceNode> = [];
let step = 0;
let nextAt = 0;
let lastNote = 2;
let nextSong = 12;

function env(audio: BaseAudioContext, start: number, peak: number, attack: number, release: number) {
	const gain = audio.createGain();
	gain.gain.setValueAtTime(0.0001, start);
	gain.gain.exponentialRampToValueAtTime(peak, start + attack);
	gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + release);
	return gain;
}

const noiseCache = new Map<string, AudioBuffer>();

function noiseBuffer(audio: BaseAudioContext, seconds = 2, color = 1) {
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

function panned(audio: AudioContext, pan: number, dest: AudioNode) {
	const p = audio.createStereoPanner();
	p.pan.value = pan;
	p.connect(dest);
	return p;
}

/** Glassy bell: a sine with an inharmonic FM shimmer that fades faster than the tone. */
function bell(audio: AudioContext, dest: AudioNode, freq: number, t: number, peak: number, decay: number) {
	const carrier = audio.createOscillator();
	carrier.type = 'sine';
	carrier.frequency.setValueAtTime(freq, t);
	const mod = audio.createOscillator();
	mod.type = 'sine';
	mod.frequency.setValueAtTime(freq * 3.51, t);
	const depth = audio.createGain();
	depth.gain.setValueAtTime(freq * 1.4, t);
	depth.gain.exponentialRampToValueAtTime(freq * 0.02, t + decay * 0.5);
	mod.connect(depth).connect(carrier.frequency);
	const gain = env(audio, t, peak, 0.004, decay);
	carrier.connect(gain).connect(dest);
	carrier.start(t);
	mod.start(t);
	carrier.stop(t + decay + 0.05);
	mod.stop(t + decay + 0.05);
	return [carrier, mod];
}

/**
 * The sound big lake ice makes as it shifts: a dispersive chirp that falls from a whistle
 * to a hum, with a few delayed copies that make it ring like a struck wire.
 */
function sing(audio: AudioContext, dest: AudioNode, t: number, peak: number, up = false) {
	const nodes: OscillatorNode[] = [];
	for (let k = 0; k < 3; k += 1) {
		const at = t + k * 0.09;
		const osc = audio.createOscillator();
		osc.type = 'sine';
		const hi = 3200 - k * 500;
		const lo = 260 + k * 60;
		osc.frequency.setValueAtTime(up ? lo : hi, at);
		osc.frequency.exponentialRampToValueAtTime(up ? hi : lo, at + 0.55 + k * 0.12);
		const gain = env(audio, at, peak * (1 - k * 0.28), 0.01, 0.6 + k * 0.15);
		osc.connect(gain).connect(dest);
		osc.start(at);
		osc.stop(at + 0.8 + k * 0.15);
		nodes.push(osc);
	}
	return nodes;
}

function playMelody(audio: AudioContext, t: number) {
	if (!stem) return;
	const chord = CHORDS[Math.floor(step / 8) % CHORDS.length];
	const beat = step % 8;
	if (beat === 1 || beat === 5 || (beat === 3 && Math.random() < 0.6) || (beat === 6 && Math.random() < 0.35)) {
		const move = [-2, -1, 1, 2, 3][Math.floor(Math.random() * 5)];
		lastNote = Math.max(0, Math.min(SCALE.length * 2 - 1, lastNote + move));
		let freq = SCALE[lastNote % SCALE.length] * (lastNote >= SCALE.length ? 2 : 1);
		if (beat === 1) freq = chord.tones[Math.floor(Math.random() * chord.tones.length)] * 2;
		const out = panned(audio, (Math.random() - 0.5) * 0.7, stem);
		bell(audio, out, freq, t, 0.06, 2.4);
		layers.note(freq, t, step);
	}
	if (beat === 0) {
		for (const [i, tone] of chord.tones.entries()) {
			const at = t + i * 0.11;
			const out = panned(audio, -0.4 + i * 0.27, stem);
			bell(audio, out, tone, at, 0.024, 1.8);
		}
	}
}

function playChord(audio: AudioContext, t: number) {
	if (!padBus || !stem) return;
	const chord = CHORDS[Math.floor(step / 8) % CHORDS.length];
	const length = STEP * 8;
	for (const freq of chord.tones) {
		for (const detune of [-6, 5]) {
			const osc = audio.createOscillator();
			osc.type = 'triangle';
			osc.frequency.setValueAtTime(freq / 2, t);
			osc.detune.setValueAtTime(detune, t);
			const gain = audio.createGain();
			gain.gain.setValueAtTime(0.0001, t);
			gain.gain.exponentialRampToValueAtTime(0.05, t + 2.2);
			gain.gain.setTargetAtTime(0.0001, t + length - 0.6, 0.6);
			osc.connect(gain).connect(padBus);
			osc.start(t);
			osc.stop(t + length + 2.6);
		}
	}
	const bass = audio.createOscillator();
	bass.type = 'sine';
	bass.frequency.setValueAtTime(chord.root, t);
	const low = env(audio, t, 0.12, 0.6, length);
	bass.connect(low).connect(stem);
	bass.start(t);
	bass.stop(t + length + 0.8);
	layers.bass(chord.root, t);
}

function schedule() {
	if (!running) return;
	const audio = getAudioContext();
	if (!audio || !isLayeredScoreOn()) {
		timer = window.setTimeout(schedule, 120);
		return;
	}
	while (nextAt < audio.currentTime + 0.28) {
		if (step % 8 === 0) playChord(audio, nextAt);
		playMelody(audio, nextAt);
		if (step >= nextSong && stem) {
			const out = panned(audio, Math.random() < 0.5 ? -0.75 : 0.75, stem);
			sing(audio, out, nextAt + Math.random() * STEP, 0.018);
			nextSong = step + 14 + Math.floor(Math.random() * 18);
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
	nextSong = 10;

	stem = audio.createGain();
	stem.gain.setValueAtTime(0.0001, audio.currentTime);
	stem.gain.exponentialRampToValueAtTime(1, audio.currentTime + 2);
	stem.connect(bus);
	layers.start(audio, 2);

	padBus = audio.createGain();
	padBus.gain.value = 0.9;
	const padTone = audio.createBiquadFilter();
	padTone.type = 'lowpass';
	padTone.frequency.value = 900;
	padTone.Q.value = 0.5;
	padBus.connect(padTone).connect(stem);
	const lfo = audio.createOscillator();
	const lfoGain = audio.createGain();
	lfo.frequency.value = 0.05;
	lfoGain.gain.value = 260;
	lfo.connect(lfoGain).connect(padTone.frequency);
	lfo.start();
	live.push(lfo);

	const wind = audio.createBufferSource();
	wind.buffer = noiseBuffer(audio, 4, 0.05);
	wind.loop = true;
	const windTone = audio.createBiquadFilter();
	windTone.type = 'bandpass';
	windTone.frequency.value = 700;
	windTone.Q.value = 0.7;
	const windGain = audio.createGain();
	windGain.gain.value = 0.05;
	const gust = audio.createOscillator();
	const gustDepth = audio.createGain();
	gust.frequency.value = 0.07;
	gustDepth.gain.value = 0.035;
	gust.connect(gustDepth).connect(windGain.gain);
	const sweep = audio.createOscillator();
	const sweepDepth = audio.createGain();
	sweep.frequency.value = 0.031;
	sweepDepth.gain.value = 320;
	sweep.connect(sweepDepth).connect(windTone.frequency);
	wind.connect(windTone).connect(windGain).connect(stem);
	wind.start();
	gust.start();
	sweep.start();
	live.push(wind, gust, sweep);

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
	const dying = live.slice();
	const old = stem;
	live = [];
	stem = null;
	padBus = null;
	if (old && audio) {
		old.gain.setTargetAtTime(0.0001, audio.currentTime, 0.18);
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

function crunch(audio: AudioContext, t: number, peak: number, centre = 2600) {
	const src = audio.createBufferSource();
	src.buffer = noiseBuffer(audio, 0.3, 0.9);
	const band = audio.createBiquadFilter();
	band.type = 'bandpass';
	band.frequency.setValueAtTime(centre, t);
	band.frequency.exponentialRampToValueAtTime(centre * 0.5, t + 0.12);
	band.Q.value = 1.2;
	const gain = env(audio, t, peak, 0.003, 0.11);
	src.connect(band).connect(gain);
	connectSfx(gain);
	src.start(t, Math.random() * 0.15);
	src.stop(t + 0.16);
}

const TINKLE = [1174.66, 1318.51, 1479.98, 1760, 1975.53, 2217.46, 2349.32, 2637.02];

/** A boot through the frost, then glass tinkles that follow the melt as it spreads. */
export function playOpen(cells: number, rings: number) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	crunch(audio, t, 0.11);
	crunch(audio, t + 0.035, 0.05, 1800);
	if (cells <= 1) {
		const out = sfxOut(audio, (Math.random() - 0.5) * 0.4);
		bell(audio, out, TINKLE[Math.floor(Math.random() * 3)], t + 0.01, 0.03, 0.5);
		return;
	}
	const voices = Math.min(14, 2 + Math.round(Math.log2(cells) * 2));
	const span = Math.min(1.4, rings * 0.028 + 0.08);
	for (let k = 0; k < voices; k += 1) {
		const at = t + 0.02 + (k / voices) * span + Math.random() * 0.03;
		const out = sfxOut(audio, (Math.random() - 0.5) * 1.2);
		const pick = TINKLE[Math.min(TINKLE.length - 1, Math.floor((k / voices) * TINKLE.length * 0.8 + Math.random() * 2))];
		bell(audio, out, pick, at, 0.028 * (1 - (k / voices) * 0.5), 0.7);
	}
	if (cells >= 24) {
		const swell = audio.createBufferSource();
		swell.buffer = noiseBuffer(audio, 1.6, 0.4);
		const hp = audio.createBiquadFilter();
		hp.type = 'highpass';
		hp.frequency.setValueAtTime(3000, t);
		hp.frequency.exponentialRampToValueAtTime(6500, t + span + 0.3);
		const gain = env(audio, t, 0.03, span * 0.5 + 0.05, span + 0.4);
		swell.connect(hp).connect(gain);
		connectSfx(gain);
		swell.start(t);
		swell.stop(t + span + 0.5);
	}
}

/** A tip-up flag springing up: a wooden knock, a flap of cloth and its little bell. */
export function playFlag(on: boolean) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const knock = audio.createBufferSource();
	knock.buffer = noiseBuffer(audio, 0.1, 0.6);
	const body = audio.createBiquadFilter();
	body.type = 'bandpass';
	body.frequency.value = on ? 1050 : 760;
	body.Q.value = 4;
	const kg = env(audio, t, 0.12, 0.002, 0.06);
	knock.connect(body).connect(kg);
	connectSfx(kg);
	knock.start(t);
	knock.stop(t + 0.09);
	if (!on) return;
	const flap = audio.createBufferSource();
	flap.buffer = noiseBuffer(audio, 0.3, 0.5);
	const flapTone = audio.createBiquadFilter();
	flapTone.type = 'bandpass';
	flapTone.frequency.value = 1600;
	flapTone.Q.value = 0.8;
	const flapGain = env(audio, t + 0.02, 0.05, 0.01, 0.16);
	const flutter = audio.createOscillator();
	const flutterDepth = audio.createGain();
	flutter.frequency.value = 22;
	flutterDepth.gain.value = 0.03;
	flutter.connect(flutterDepth).connect(flapGain.gain);
	flap.connect(flapTone).connect(flapGain);
	connectSfx(flapGain);
	flap.start(t + 0.02);
	flap.stop(t + 0.22);
	flutter.start(t + 0.02);
	flutter.stop(t + 0.22);
	const out = sfxOut(audio, 0.1);
	bell(audio, out, 2793.83, t + 0.05, 0.022, 0.5);
}

export function playNudge() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const osc = audio.createOscillator();
	osc.type = 'sine';
	osc.frequency.setValueAtTime(240, t);
	osc.frequency.exponentialRampToValueAtTime(150, t + 0.08);
	const gain = env(audio, t, 0.05, 0.003, 0.09);
	osc.connect(gain);
	connectSfx(gain);
	osc.start(t);
	osc.stop(t + 0.12);
	crunch(audio, t, 0.03, 1400);
}

/** The ice gives way: a rifle-shot crack, the lake singing, a groan, the plunge and bubbles. */
export function playCrack() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const snap = audio.createBufferSource();
	snap.buffer = noiseBuffer(audio, 0.4, 1);
	const hp = audio.createBiquadFilter();
	hp.type = 'highpass';
	hp.frequency.value = 1400;
	const sg = env(audio, t, 0.38, 0.001, 0.09);
	snap.connect(hp).connect(sg);
	connectSfx(sg);
	snap.start(t);
	snap.stop(t + 0.14);

	for (let k = 0; k < 5; k += 1) crunch(audio, t + 0.05 + k * 0.045 + Math.random() * 0.02, 0.09 - k * 0.012, 3200 - k * 300);

	sing(audio, sfxOut(audio, -0.5), t + 0.08, 0.05);
	sing(audio, sfxOut(audio, 0.6), t + 0.42, 0.035);

	const groan = audio.createOscillator();
	groan.type = 'sawtooth';
	groan.frequency.setValueAtTime(70, t + 0.05);
	groan.frequency.exponentialRampToValueAtTime(38, t + 1.3);
	const groanTone = audio.createBiquadFilter();
	groanTone.type = 'lowpass';
	groanTone.frequency.value = 240;
	const gg = env(audio, t + 0.05, 0.12, 0.08, 1.3);
	groan.connect(groanTone).connect(gg);
	connectSfx(gg);
	groan.start(t + 0.05);
	groan.stop(t + 1.5);

	const plunge = audio.createBufferSource();
	plunge.buffer = noiseBuffer(audio, 1.2, 0.25);
	const pl = audio.createBiquadFilter();
	pl.type = 'lowpass';
	pl.frequency.setValueAtTime(2600, t + 0.28);
	pl.frequency.exponentialRampToValueAtTime(260, t + 1.1);
	const pg = env(audio, t + 0.28, 0.22, 0.02, 0.9);
	plunge.connect(pl).connect(pg);
	connectSfx(pg);
	plunge.start(t + 0.28);
	plunge.stop(t + 1.3);

	for (let k = 0; k < 9; k += 1) {
		const at = t + 0.5 + k * 0.09 + Math.random() * 0.08;
		const osc = audio.createOscillator();
		osc.type = 'sine';
		const f = 380 + Math.random() * 520;
		osc.frequency.setValueAtTime(f, at);
		osc.frequency.exponentialRampToValueAtTime(f * 1.9, at + 0.06);
		const g = env(audio, at, 0.04 * (1 - k / 11), 0.004, 0.05);
		osc.connect(g);
		connectSfx(g);
		osc.start(at);
		osc.stop(at + 0.08);
	}
}

/** The last safe ice opens: the sun clears the trees. */
export function playThaw() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime + 0.25;
	const chord = [293.66, 369.99, 440, 554.37, 659.25];
	for (const [i, freq] of chord.entries()) {
		const osc = audio.createOscillator();
		osc.type = 'triangle';
		osc.frequency.value = freq / 2;
		const tone = audio.createBiquadFilter();
		tone.type = 'lowpass';
		tone.frequency.setValueAtTime(400, t);
		tone.frequency.exponentialRampToValueAtTime(2400, t + 1.6);
		const gain = env(audio, t, 0.05, 1.2, 2.4);
		osc.connect(tone).connect(gain);
		connectSfx(gain);
		osc.start(t);
		osc.stop(t + 3.8);
		const out = sfxOut(audio, -0.6 + i * 0.3);
		bell(audio, out, freq * 2, t + 0.1 + i * 0.13, 0.05, 2);
		bell(audio, out, freq * 4, t + 0.9 + i * 0.09, 0.022, 1.4);
	}
	sing(audio, sfxOut(audio, 0), t + 0.6, 0.025, true);
}

export function playStart() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const gust = audio.createBufferSource();
	gust.buffer = noiseBuffer(audio, 1.2, 0.2);
	const band = audio.createBiquadFilter();
	band.type = 'bandpass';
	band.frequency.setValueAtTime(500, t);
	band.frequency.exponentialRampToValueAtTime(1800, t + 0.7);
	band.Q.value = 0.8;
	const gain = env(audio, t, 0.07, 0.3, 0.7);
	gust.connect(band).connect(gain);
	connectSfx(gain);
	gust.start(t);
	gust.stop(t + 1.1);
	const out = sfxOut(audio, 0);
	bell(audio, out, 880, t + 0.2, 0.04, 1.4);
	bell(audio, out, 1318.51, t + 0.34, 0.03, 1.4);
}

export function playPause(on: boolean) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = sfxOut(audio, 0);
	bell(audio, out, on ? 880 : 659.25, t, 0.03, 0.5);
	bell(audio, out, on ? 659.25 : 880, t + 0.09, 0.03, 0.6);
}

export function playSelect() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	crunch(audio, t, 0.04, 3000);
	bell(audio, sfxOut(audio, 0), 1760, t, 0.02, 0.3);
}
