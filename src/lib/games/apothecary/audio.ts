import { connectSfx, getAudioContext, getMusicBus, isLayeredScoreOn, sfxContext } from '$lib/audio/core';
import { createAmbientLayers } from '$lib/audio/ambientLayers';
import type { Dir } from './types';

const STEP = 0.42;

/** A harmonic minor: the raised seventh gives the bench its sense of secrets. */
const SCALE = [220, 246.94, 261.63, 293.66, 329.63, 349.23, 415.3];

const CHORDS: Array<{ root: number; tones: number[] }> = [
	{ root: 55, tones: [220, 261.63, 329.63] },
	{ root: 43.65, tones: [220, 261.63, 349.23] },
	{ root: 36.71, tones: [220, 293.66, 349.23] },
	{ root: 41.2, tones: [207.65, 246.94, 329.63] },
	{ root: 55, tones: [220, 261.63, 329.63] },
	{ root: 49, tones: [246.94, 293.66, 392] },
	{ root: 43.65, tones: [220, 261.63, 349.23] },
	{ root: 41.2, tones: [207.65, 293.66, 329.63] }
];

const layers = createAmbientLayers('apothecary', STEP, SCALE);

let running = false;
let timer: number | null = null;
let stem: GainNode | null = null;
let drone: { stop(t: number): void } | null = null;
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

/** Glass harmonica: wet fingers on spinning bowls, a slow bloom and a shimmer of beating partials. */
function harmonica(audio: AudioContext, dest: AudioNode, freq: number, t: number, dur: number, peak: number) {
	const gain = audio.createGain();
	gain.gain.setValueAtTime(0.0001, t);
	gain.gain.exponentialRampToValueAtTime(peak, t + 0.18);
	gain.gain.setValueAtTime(peak * 0.8, t + Math.max(0.2, dur - 0.1));
	gain.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.9);
	gain.connect(dest);
	for (const [ratio, level, detune] of [
		[1, 1, 0],
		[1, 0.5, 7],
		[2, 0.18, -4],
		[3, 0.05, 3]
	]) {
		const osc = audio.createOscillator();
		osc.type = 'sine';
		osc.frequency.setValueAtTime(freq * ratio, t);
		osc.detune.value = detune;
		const g = audio.createGain();
		g.gain.value = level;
		osc.connect(g).connect(gain);
		osc.start(t);
		osc.stop(t + dur + 1);
	}
}

/** Celesta: a struck steel bar, a bright clang that melts into a sine. */
function celesta(audio: AudioContext, dest: AudioNode, freq: number, t: number, peak: number, decay = 1.2) {
	const carrier = audio.createOscillator();
	carrier.type = 'sine';
	carrier.frequency.setValueAtTime(freq, t);
	const mod = audio.createOscillator();
	mod.type = 'sine';
	mod.frequency.setValueAtTime(freq * 4, t);
	const depth = audio.createGain();
	depth.gain.setValueAtTime(freq * 1.6, t);
	depth.gain.exponentialRampToValueAtTime(freq * 0.02, t + 0.25);
	mod.connect(depth).connect(carrier.frequency);
	const gain = env(audio, t, peak, 0.003, decay);
	carrier.connect(gain).connect(dest);
	for (const osc of [carrier, mod]) {
		osc.start(t);
		osc.stop(t + decay + 0.1);
	}
}

/** One bubble breaking the surface: a sine that chirps upward as the cavity shrinks. */
function bubble(audio: AudioContext, dest: AudioNode, t: number, size: number, peak: number) {
	const osc = audio.createOscillator();
	osc.type = 'sine';
	const f = 380 + (1 - size) * 900;
	osc.frequency.setValueAtTime(f, t);
	osc.frequency.exponentialRampToValueAtTime(f * 2.4, t + 0.05 + size * 0.03);
	const gain = env(audio, t, peak, 0.004, 0.05 + size * 0.04);
	osc.connect(gain).connect(dest);
	osc.start(t);
	osc.stop(t + 0.14);
}

function startDrone(audio: AudioContext, dest: AudioNode) {
	const filter = audio.createBiquadFilter();
	filter.type = 'lowpass';
	filter.frequency.value = 340;
	filter.Q.value = 0.7;
	const gain = audio.createGain();
	gain.gain.setValueAtTime(0.0001, audio.currentTime);
	gain.gain.exponentialRampToValueAtTime(0.05, audio.currentTime + 4);
	filter.connect(gain).connect(dest);
	const lfo = audio.createOscillator();
	lfo.frequency.value = 0.07;
	const lfoDepth = audio.createGain();
	lfoDepth.gain.value = 120;
	lfo.connect(lfoDepth).connect(filter.frequency);
	const oscs = [55, 55.3, 82.4].map((f, i) => {
		const osc = audio.createOscillator();
		osc.type = i === 2 ? 'triangle' : 'sawtooth';
		osc.frequency.value = f;
		osc.connect(filter);
		return osc;
	});
	for (const osc of [...oscs, lfo]) osc.start();
	return {
		stop(t: number) {
			gain.gain.setTargetAtTime(0.0001, t, 0.4);
			for (const osc of [...oscs, lfo]) osc.stop(t + 2);
		}
	};
}

function nextPhrase() {
	const out: number[] = [];
	let n = lastNote;
	for (let k = 0; k < 8; k += 1) {
		const move = [-2, -1, -1, 1, 1, 2, 0, -3][Math.floor(Math.random() * 8)];
		n = Math.max(0, Math.min(SCALE.length + 4, n + move));
		out.push(k % 2 === 1 || Math.random() < 0.3 ? -1 : n);
	}
	out[6] = Math.random() < 0.5 ? 0 : 4;
	lastNote = out[6];
	return out;
}

function noteFreq(index: number) {
	return SCALE[index % SCALE.length] * 2 ** Math.floor(index / SCALE.length);
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
			harmonica(audio, panned(audio, -0.2, stem), chord.root * 4, t, STEP * 7, 0.03);
			harmonica(audio, panned(audio, 0.2, stem), chord.tones[2], t + 0.05, STEP * 7, 0.016);
			layers.bass(chord.root * 2, t);
		}
		const arp = [0, 1, 2, 1, 2, 0, 1, 2];
		if (beat % 2 === 0 || Math.random() < 0.35) {
			celesta(audio, panned(audio, 0.35, stem), chord.tones[arp[beat]] * 2, t, 0.016, 1.1);
		}
		const section = Math.floor(bar / 4) % 3;
		if (section !== 0) {
			if (beat === 0) phrase = nextPhrase();
			const n = phrase[beat];
			if (n >= 0) {
				const freq = noteFreq(n) * 2;
				harmonica(audio, panned(audio, -0.05, stem), freq, t, STEP * 1.6, 0.03);
				layers.note(freq / 2, t, step);
			}
		}
		if (Math.random() < 0.22) {
			const out = panned(audio, -0.75 + Math.random() * 0.4, stem);
			const count = 1 + Math.floor(Math.random() * 4);
			for (let k = 0; k < count; k += 1) bubble(audio, out, t + Math.random() * STEP, Math.random(), 0.012 + Math.random() * 0.012);
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
	drone = startDrone(audio, stem);
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
	if (audio) drone?.stop(audio.currentTime);
	drone = null;
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
		}, 2400);
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

function slosh(audio: AudioContext, dest: AudioNode, t: number, peak: number, dur = 0.18) {
	const src = audio.createBufferSource();
	src.buffer = noiseBuffer(audio, 0.6, 0.25);
	const band = audio.createBiquadFilter();
	band.type = 'bandpass';
	band.frequency.setValueAtTime(500, t);
	band.frequency.exponentialRampToValueAtTime(1400, t + dur * 0.5);
	band.frequency.exponentialRampToValueAtTime(600, t + dur);
	band.Q.value = 3;
	const gain = env(audio, t, peak, 0.03, dur);
	src.connect(band).connect(gain).connect(dest);
	src.start(t, Math.random() * 0.3);
	src.stop(t + dur + 0.1);
}

function clink(audio: AudioContext, dest: AudioNode, t: number, freq: number, peak: number) {
	for (const [ratio, level, decay] of [
		[1, 1, 0.25],
		[2.76, 0.5, 0.12],
		[5.4, 0.25, 0.06]
	]) {
		const osc = audio.createOscillator();
		osc.type = 'sine';
		osc.frequency.value = freq * ratio;
		const gain = env(audio, t, peak * level, 0.002, decay);
		osc.connect(gain).connect(dest);
		osc.start(t);
		osc.stop(t + decay + 0.05);
	}
}

/** Vials skid along the rack and land with it: a scrape, a wooden knock and a rattle of glass. */
export function playLand(dir: Dir, moved: number, merged: number, delay: number) {
	const audio = sfxContext();
	if (!audio || !moved) return;
	const now = audio.currentTime;
	const t = now + delay;
	const pan = dir === 'left' ? -0.45 : dir === 'right' ? 0.45 : 0;
	const out = sfxOut(audio, pan);
	const k = Math.min(1, 0.45 + moved * 0.08 + merged * 0.12);

	const scrape = audio.createBufferSource();
	scrape.buffer = noiseBuffer(audio, 0.5, 0.6);
	const band = audio.createBiquadFilter();
	band.type = 'bandpass';
	band.frequency.setValueAtTime(dir === 'down' ? 1800 : 2600, now);
	band.frequency.linearRampToValueAtTime(dir === 'up' ? 3400 : 2000, t);
	band.Q.value = 1.4;
	const sg = audio.createGain();
	sg.gain.setValueAtTime(0.0001, now);
	sg.gain.exponentialRampToValueAtTime(0.012 * k, now + delay * 0.6);
	sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);
	scrape.connect(band).connect(sg).connect(out);
	scrape.start(now, Math.random() * 0.2);
	scrape.stop(t + 0.05);

	const knock = audio.createOscillator();
	knock.type = 'triangle';
	knock.frequency.setValueAtTime(150 + Math.random() * 20, t);
	knock.frequency.exponentialRampToValueAtTime(72, t + 0.09);
	const kg = env(audio, t, 0.075 * k, 0.003, 0.12);
	knock.connect(kg).connect(out);
	knock.start(t);
	knock.stop(t + 0.18);

	const thud = audio.createBufferSource();
	thud.buffer = noiseBuffer(audio, 0.2, 0.9);
	const low = audio.createBiquadFilter();
	low.type = 'lowpass';
	low.frequency.value = 700;
	const tg = env(audio, t, 0.05 * k, 0.002, 0.05);
	thud.connect(low).connect(tg).connect(out);
	thud.start(t);
	thud.stop(t + 0.1);

	const rattle = Math.min(6, moved);
	for (let i = 0; i < rattle; i += 1) {
		const at = t + 0.004 + i * 0.016 + Math.random() * 0.012;
		clink(audio, out, at, 2100 + Math.random() * 1500, (0.016 + Math.random() * 0.008) * (1 - i * 0.08));
	}
	clink(audio, out, t + 0.11 + Math.random() * 0.03, 2600 + Math.random() * 900, 0.008 * k);
}

/** Vials sliding along the rack with nothing to mix. */
export function playSlide() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = sfxOut(audio, (Math.random() - 0.5) * 0.4);
	slosh(audio, out, t, 0.05);
}

/** Two vials poured together: a glug, then a chime that climbs with the tier. */
export function playPour(count: number, tier: number) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime + 0.08;
	const out = sfxOut(audio, 0);
	slosh(audio, out, t - 0.08, 0.06, 0.22);
	for (let k = 0; k < 3; k += 1) {
		const at = t + 0.04 + k * 0.055;
		const osc = audio.createOscillator();
		osc.type = 'sine';
		const f = 210 + k * 30 + Math.random() * 30;
		osc.frequency.setValueAtTime(f * 1.6, at);
		osc.frequency.exponentialRampToValueAtTime(f, at + 0.05);
		const gain = env(audio, at, 0.06, 0.006, 0.06);
		osc.connect(gain).connect(out);
		osc.start(at);
		osc.stop(at + 0.1);
	}
	const idx = Math.max(0, tier - 2);
	celesta(audio, out, noteFreq(idx) * 2, t + 0.13, 0.05, 1.2);
	if (count > 1) celesta(audio, out, noteFreq(idx + 2) * 2, t + 0.2, 0.035, 1.1);
	if (tier >= 8) harmonica(audio, out, noteFreq(idx) * 2, t + 0.13, 0.5, 0.025);
}

export function playNewTier(tier: number) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime + 0.3;
	const out = sfxOut(audio, 0);
	const base = Math.max(0, tier - 3);
	[0, 2, 4, 7].forEach((k, i) => celesta(audio, out, noteFreq(base + k) * 2, t + i * 0.08, 0.035, 1.4));
	for (let k = 0; k < 6; k += 1) bubble(audio, out, t + 0.1 + k * 0.06, Math.random() * 0.6, 0.015);
}

export function playStone() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime + 0.35;
	const out = sfxOut(audio, 0);
	const boom = audio.createOscillator();
	boom.type = 'sine';
	boom.frequency.setValueAtTime(110, t);
	boom.frequency.exponentialRampToValueAtTime(40, t + 1.2);
	const bg = env(audio, t, 0.2, 0.01, 1.4);
	boom.connect(bg).connect(out);
	boom.start(t);
	boom.stop(t + 1.6);
	for (const f of [220, 261.63, 329.63, 440]) harmonica(audio, out, f, t + 0.1, 2.4, 0.03);
	[0, 2, 4, 7, 9, 11, 14].forEach((k, i) => celesta(audio, sfxOut(audio, -0.5 + i * 0.16), noteFreq(k) * 2, t + 0.2 + i * 0.09, 0.04, 1.8));
}

export function playOver() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime + 0.25;
	const out = sfxOut(audio, 0);
	const src = audio.createBufferSource();
	src.buffer = noiseBuffer(audio, 1.5, 0.9);
	const hp = audio.createBiquadFilter();
	hp.type = 'highpass';
	hp.frequency.setValueAtTime(5000, t);
	hp.frequency.exponentialRampToValueAtTime(1200, t + 1.2);
	const gain = env(audio, t, 0.04, 0.05, 1.2);
	src.connect(hp).connect(gain).connect(out);
	src.start(t);
	src.stop(t + 1.4);
	[4, 3, 1, 0].forEach((k, i) => harmonica(audio, out, noteFreq(k), t + i * 0.28, 0.5, 0.028));
}

export function playUndo() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = sfxOut(audio, 0);
	const src = audio.createBufferSource();
	src.buffer = noiseBuffer(audio, 0.5, 0.4);
	const band = audio.createBiquadFilter();
	band.type = 'bandpass';
	band.frequency.setValueAtTime(400, t);
	band.frequency.exponentialRampToValueAtTime(2400, t + 0.25);
	band.Q.value = 2;
	const gain = audio.createGain();
	gain.gain.setValueAtTime(0.0001, t);
	gain.gain.exponentialRampToValueAtTime(0.06, t + 0.22);
	gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
	src.connect(band).connect(gain).connect(out);
	src.start(t);
	src.stop(t + 0.35);
	celesta(audio, out, 659.25, t + 0.24, 0.03, 0.6);
	celesta(audio, out, 440, t + 0.32, 0.03, 0.8);
}

/** Nothing would move: a dull knock on the rack. */
export function playNudge() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const osc = audio.createOscillator();
	osc.type = 'triangle';
	osc.frequency.setValueAtTime(180, t);
	osc.frequency.exponentialRampToValueAtTime(90, t + 0.08);
	const gain = env(audio, t, 0.06, 0.003, 0.1);
	osc.connect(gain).connect(sfxOut(audio, 0));
	osc.start(t);
	osc.stop(t + 0.15);
}

/** A cork drawn, then the bench starts to bubble. */
export function playStart() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = sfxOut(audio, 0);
	const pop = audio.createOscillator();
	pop.type = 'sine';
	pop.frequency.setValueAtTime(900, t);
	pop.frequency.exponentialRampToValueAtTime(220, t + 0.05);
	const pg = env(audio, t, 0.14, 0.002, 0.06);
	pop.connect(pg).connect(out);
	pop.start(t);
	pop.stop(t + 0.1);
	const src = audio.createBufferSource();
	src.buffer = noiseBuffer(audio, 0.2, 1);
	const ng = env(audio, t, 0.05, 0.001, 0.03);
	src.connect(ng).connect(out);
	src.start(t);
	src.stop(t + 0.06);
	for (let k = 0; k < 8; k += 1) bubble(audio, out, t + 0.15 + k * 0.05 + Math.random() * 0.03, Math.random(), 0.02);
	celesta(audio, out, 440, t + 0.3, 0.035, 1.2);
}

export function playSelect() {
	const audio = sfxContext();
	if (!audio) return;
	celesta(audio, sfxOut(audio, 0), 880, audio.currentTime, 0.025, 0.5);
}
