import { connectSfx, getAudioContext, getMusicBus, isLayeredScoreOn, sfxContext } from '$lib/audio/core';
import { createAmbientLayers } from '$lib/audio/ambientLayers';
import { lightView } from './settings.svelte';

/** One eighth of a slow 6/8 lilt. */
const STEP = 0.3;

/** D Dorian, the old sea-song mode. */
const SCALE = [146.83, 164.81, 174.61, 196, 220, 246.94, 261.63, 293.66, 329.63, 349.23, 392, 440, 493.88, 523.25, 587.33];

const CHORDS: Array<{ root: number; tones: number[] }> = [
	{ root: 73.42, tones: [293.66, 349.23, 440] },
	{ root: 65.41, tones: [261.63, 329.63, 392] },
	{ root: 73.42, tones: [293.66, 349.23, 440] },
	{ root: 98, tones: [246.94, 293.66, 392] },
	{ root: 87.31, tones: [261.63, 349.23, 440] },
	{ root: 65.41, tones: [261.63, 329.63, 392] },
	{ root: 110, tones: [261.63, 329.63, 440] },
	{ root: 73.42, tones: [293.66, 349.23, 440] }
];

const layers = createAmbientLayers('lighthouse', STEP, SCALE.slice(4, 11));

let running = false;
let timer: number | null = null;
let stem: GainNode | null = null;
let surf: {
	src: AudioBufferSourceNode;
	lfo: OscillatorNode;
	rain: AudioBufferSourceNode;
} | null = null;
let step = 0;
let nextAt = 0;
let lastNote = 9;
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

/** Concertina: two detuned reeds breathing in through the bellows. */
function concertina(audio: AudioContext, dest: AudioNode, freqs: number[], t: number, len: number, peak: number) {
	const filter = audio.createBiquadFilter();
	filter.type = 'lowpass';
	filter.frequency.value = 1500;
	filter.Q.value = 0.7;
	const gain = audio.createGain();
	gain.gain.setValueAtTime(0.0001, t);
	gain.gain.exponentialRampToValueAtTime(peak, t + 0.12);
	gain.gain.setValueAtTime(peak, t + len * 0.7);
	gain.gain.exponentialRampToValueAtTime(0.0001, t + len);
	const swell = audio.createOscillator();
	swell.frequency.value = 1 / len;
	const sd = audio.createGain();
	sd.gain.value = peak * 0.3;
	swell.connect(sd).connect(gain.gain);
	filter.connect(gain).connect(dest);
	for (const freq of freqs) {
		for (const detune of [-7, 6]) {
			const osc = audio.createOscillator();
			osc.type = 'square';
			osc.frequency.value = freq;
			osc.detune.value = detune;
			const g = audio.createGain();
			g.gain.value = 0.18 / freqs.length;
			osc.connect(g).connect(filter);
			osc.start(t);
			osc.stop(t + len + 0.05);
		}
	}
	swell.start(t);
	swell.stop(t + len + 0.05);
}

/** Fiddle: a bowed saw that leans into pitch and warms into vibrato. */
function fiddle(audio: AudioContext, dest: AudioNode, freq: number, t: number, len: number, peak: number) {
	const osc = audio.createOscillator();
	osc.type = 'sawtooth';
	osc.frequency.setValueAtTime(freq * 0.985, t);
	osc.frequency.exponentialRampToValueAtTime(freq, t + 0.08);
	const vib = audio.createOscillator();
	vib.frequency.value = 5.6;
	const vd = audio.createGain();
	vd.gain.setValueAtTime(0, t);
	vd.gain.linearRampToValueAtTime(freq * 0.01, t + len * 0.6);
	vib.connect(vd).connect(osc.frequency);
	const body = audio.createBiquadFilter();
	body.type = 'bandpass';
	body.frequency.value = Math.min(3200, freq * 2.5);
	body.Q.value = 0.9;
	const top = audio.createBiquadFilter();
	top.type = 'lowpass';
	top.frequency.value = 2600;
	const gain = audio.createGain();
	gain.gain.setValueAtTime(0.0001, t);
	gain.gain.exponentialRampToValueAtTime(peak, t + 0.14);
	gain.gain.setValueAtTime(peak, t + len * 0.75);
	gain.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.3);
	osc.connect(body).connect(top).connect(gain).connect(dest);
	for (const node of [osc, vib]) {
		node.start(t);
		node.stop(t + len + 0.4);
	}
}

/** Frame drum: a soft skin thump with a little slap. */
function drum(audio: AudioContext, dest: AudioNode, t: number, peak: number, low = true) {
	const osc = audio.createOscillator();
	osc.type = 'sine';
	osc.frequency.setValueAtTime(low ? 110 : 180, t);
	osc.frequency.exponentialRampToValueAtTime(low ? 52 : 90, t + 0.18);
	const g = env(audio, t, peak, 0.004, low ? 0.32 : 0.16);
	osc.connect(g).connect(dest);
	osc.start(t);
	osc.stop(t + 0.4);
	const slap = audio.createBufferSource();
	slap.buffer = noiseBuffer(audio, 0.08, 0.6);
	const lp = audio.createBiquadFilter();
	lp.type = 'lowpass';
	lp.frequency.value = 1200;
	const sg = env(audio, t, peak * 0.4, 0.002, 0.05);
	slap.connect(lp).connect(sg).connect(dest);
	slap.start(t);
	slap.stop(t + 0.08);
}

/** A bell buoy rocking on the swell: inharmonic partials, two strikes. */
function bell(audio: AudioContext, dest: AudioNode, t: number, peak: number, base = 392) {
	for (const at of [0, 0.42 + Math.random() * 0.2]) {
		for (const [ratio, level, len] of [
			[1, 1, 2.6],
			[2.32, 0.5, 1.5],
			[4.1, 0.25, 0.8],
			[5.4, 0.12, 0.5]
		] as const) {
			const osc = audio.createOscillator();
			osc.type = 'sine';
			osc.frequency.value = base * ratio;
			const g = env(audio, t + at, peak * level * (at ? 0.7 : 1), 0.002, len);
			osc.connect(g).connect(dest);
			osc.start(t + at);
			osc.stop(t + at + len + 0.1);
		}
	}
}

/** Two-tone diaphone foghorn, far out across the water. */
function foghorn(audio: AudioContext, dest: AudioNode, t: number, peak: number, len = 1.8) {
	const lp = audio.createBiquadFilter();
	lp.type = 'lowpass';
	lp.frequency.value = 420;
	const gain = audio.createGain();
	gain.gain.setValueAtTime(0.0001, t);
	gain.gain.exponentialRampToValueAtTime(peak, t + 0.25);
	gain.gain.setValueAtTime(peak, t + len * 0.75);
	gain.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.6);
	lp.connect(gain).connect(dest);
	for (const [freq, from] of [
		[82.41, 0],
		[73.42, len * 0.62]
	] as const) {
		for (const detune of [-5, 5]) {
			const osc = audio.createOscillator();
			osc.type = 'sawtooth';
			osc.frequency.value = freq;
			osc.detune.value = detune;
			const g = audio.createGain();
			g.gain.setValueAtTime(from ? 0 : 0.5, t);
			if (from) g.gain.setValueAtTime(0.5, t + from);
			else g.gain.setValueAtTime(0, t + len * 0.62);
			osc.connect(g).connect(lp);
			osc.start(t);
			osc.stop(t + len + 0.7);
		}
	}
}

function creak(audio: AudioContext, dest: AudioNode, t: number, peak: number) {
	const src = audio.createBufferSource();
	src.buffer = noiseBuffer(audio, 1, 1);
	const band = audio.createBiquadFilter();
	band.type = 'bandpass';
	band.Q.value = 18;
	band.frequency.setValueAtTime(380, t);
	band.frequency.linearRampToValueAtTime(520, t + 0.5);
	band.frequency.linearRampToValueAtTime(410, t + 0.8);
	const g = audio.createGain();
	g.gain.setValueAtTime(0.0001, t);
	g.gain.exponentialRampToValueAtTime(peak, t + 0.2);
	g.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
	src.connect(band).connect(g).connect(dest);
	src.start(t, Math.random() * 0.2);
	src.stop(t + 0.9);
}

function startSurf(audio: AudioContext, dest: AudioNode) {
	const src = audio.createBufferSource();
	src.buffer = noiseBuffer(audio, 4, 0.12);
	src.loop = true;
	const lp = audio.createBiquadFilter();
	lp.type = 'lowpass';
	lp.frequency.value = 700;
	const lfo = audio.createOscillator();
	lfo.frequency.value = 0.11;
	const depth = audio.createGain();
	depth.gain.value = 420;
	lfo.connect(depth).connect(lp.frequency);
	const swell = audio.createGain();
	swell.gain.setValueAtTime(0.0001, audio.currentTime);
	swell.gain.exponentialRampToValueAtTime(0.09, audio.currentTime + 3);
	const sw = audio.createGain();
	sw.gain.value = 0.05;
	lfo.connect(sw).connect(swell.gain);
	src.connect(lp).connect(swell).connect(dest);

	const rain = audio.createBufferSource();
	rain.buffer = noiseBuffer(audio, 3, 1);
	rain.loop = true;
	const hp = audio.createBiquadFilter();
	hp.type = 'highpass';
	hp.frequency.value = 3500;
	const rg = audio.createGain();
	rg.gain.setValueAtTime(0.0001, audio.currentTime);
	rg.gain.exponentialRampToValueAtTime(lightView.weather === 'storm' ? 0.014 : 0.0003, audio.currentTime + 3);
	rain.connect(hp).connect(rg).connect(dest);

	src.start();
	lfo.start();
	rain.start();
	return { src, lfo, rain };
}

function nextPhrase() {
	const out: Array<{ n: number; len: number }> = [];
	let n = lastNote;
	for (let k = 0; k < 4; k += 1) {
		n = Math.max(5, Math.min(SCALE.length - 2, n + [-2, -1, 1, 2, -1, 1, 0][Math.floor(Math.random() * 7)]));
		out.push({ n, len: [2, 3, 3, 4, 6][Math.floor(Math.random() * 5)] });
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
		const bar = Math.floor(step / 6);
		const beat = step % 6;
		const chord = CHORDS[bar % CHORDS.length];
		const section = Math.floor(bar / 8) % 4;

		if (beat === 0) {
			concertina(audio, panned(audio, -0.25, stem), [chord.root * 2, ...chord.tones.slice(0, 2)], t, STEP * 6, 0.045);
			layers.bass(chord.root, t);
			if (section > 0) drum(audio, panned(audio, 0.1, stem), t, 0.07);
		}
		if (section > 0 && beat === 3) drum(audio, panned(audio, 0.1, stem), t, 0.035, false);
		if (section > 0 && beat === 5 && Math.random() < 0.4) drum(audio, panned(audio, 0.1, stem), t, 0.02, false);
		if (section === 1 || section === 2) {
			if (beat === 0 && bar % 2 === 0) phrase = nextPhrase();
			let at = 0;
			for (const note of phrase) {
				if (at === beat + (bar % 2) * 6 && Math.random() < 0.9) {
					const freq = SCALE[note.n];
					fiddle(audio, panned(audio, 0.2, stem), freq, t, note.len * STEP * 0.95, 0.03);
					layers.note(freq, t, step);
				}
				at += note.len;
			}
		} else if (section === 3 && (beat === 0 || beat === 3) && Math.random() < 0.7) {
			const tone = chord.tones[Math.floor(Math.random() * 3)];
			fiddle(audio, panned(audio, 0.3, stem), tone, t, STEP * 2.6, 0.022);
			layers.note(tone, t, step);
		}
		if (Math.random() < 0.006) bell(audio, panned(audio, 0.6, stem), t, 0.012, 392 + Math.random() * 30);
		if (lightView.weather === 'fog' && step % 96 === 40) foghorn(audio, panned(audio, -0.5, stem), t, 0.05);
		if (Math.random() < 0.004) creak(audio, panned(audio, -0.3 + Math.random() * 0.6, stem), t, 0.02);
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
	surf = startSurf(audio, stem);
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
	const oldSurf = surf;
	stem = null;
	surf = null;
	if (old && audio) {
		old.gain.setTargetAtTime(0.0001, audio.currentTime, 0.18);
		window.setTimeout(() => {
			try {
				oldSurf?.src.stop();
				oldSurf?.lfo.stop();
				oldSurf?.rain.stop();
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

function boom(audio: AudioContext, out: AudioNode, t: number, peak: number, low = 70, len = 0.6) {
	const osc = audio.createOscillator();
	osc.type = 'sine';
	osc.frequency.setValueAtTime(low * 2.2, t);
	osc.frequency.exponentialRampToValueAtTime(low * 0.6, t + len * 0.6);
	const g = env(audio, t, peak, 0.004, len);
	osc.connect(g).connect(out);
	osc.start(t);
	osc.stop(t + len + 0.1);
	const src = audio.createBufferSource();
	src.buffer = noiseBuffer(audio, 1.5, 0.5);
	const lp = audio.createBiquadFilter();
	lp.type = 'lowpass';
	lp.frequency.setValueAtTime(2400, t);
	lp.frequency.exponentialRampToValueAtTime(180, t + len);
	const ng = env(audio, t, peak * 0.9, 0.003, len * 1.2);
	src.connect(lp).connect(ng).connect(out);
	src.start(t, Math.random() * 0.3);
	src.stop(t + len * 1.3);
}

function splashNoise(audio: AudioContext, out: AudioNode, t: number, peak: number, len = 0.5) {
	const src = audio.createBufferSource();
	src.buffer = noiseBuffer(audio, 1, 1);
	const band = audio.createBiquadFilter();
	band.type = 'bandpass';
	band.Q.value = 0.8;
	band.frequency.setValueAtTime(3400, t);
	band.frequency.exponentialRampToValueAtTime(700, t + len);
	const g = env(audio, t, peak, 0.006, len);
	src.connect(band).connect(g).connect(out);
	src.start(t, Math.random() * 0.4);
	src.stop(t + len + 0.05);
}

/** The keeper's cannon from the cliff, and the shell's whistle out over the water. */
export function playFire(pan: number) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime + 0.32;
	boom(audio, sfxOut(audio, pan * 0.3), t, 0.22, 60, 0.5);
	const whistle = audio.createOscillator();
	whistle.type = 'sine';
	whistle.frequency.setValueAtTime(1900, t + 0.06);
	whistle.frequency.exponentialRampToValueAtTime(700, t + 0.42);
	const wg = audio.createGain();
	wg.gain.setValueAtTime(0.0001, t + 0.05);
	wg.gain.exponentialRampToValueAtTime(0.018, t + 0.12);
	wg.gain.exponentialRampToValueAtTime(0.0001, t + 0.44);
	whistle.connect(wg).connect(sfxOut(audio, pan));
	whistle.start(t + 0.05);
	whistle.stop(t + 0.46);
}

export function playSplash(pan: number) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = sfxOut(audio, pan);
	splashNoise(audio, out, t, 0.14, 0.55);
	const plop = audio.createOscillator();
	plop.type = 'sine';
	plop.frequency.setValueAtTime(260, t);
	plop.frequency.exponentialRampToValueAtTime(90, t + 0.15);
	const pg = env(audio, t, 0.08, 0.003, 0.16);
	plop.connect(pg).connect(out);
	plop.start(t);
	plop.stop(t + 0.2);
}

/** Timber splinters and fire catches. */
export function playHit(pan: number) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = sfxOut(audio, pan);
	boom(audio, out, t, 0.24, 80, 0.7);
	for (let k = 0; k < 7; k += 1) {
		const at = t + 0.02 + Math.random() * 0.25;
		const src = audio.createBufferSource();
		src.buffer = noiseBuffer(audio, 0.05, 1);
		const band = audio.createBiquadFilter();
		band.type = 'bandpass';
		band.frequency.value = 900 + Math.random() * 2200;
		band.Q.value = 6;
		const g = env(audio, at, 0.08, 0.001, 0.03);
		src.connect(band).connect(g).connect(out);
		src.start(at);
		src.stop(at + 0.05);
	}
	const crackle = audio.createBufferSource();
	crackle.buffer = noiseBuffer(audio, 1.5, 1);
	const hp = audio.createBiquadFilter();
	hp.type = 'highpass';
	hp.frequency.value = 2500;
	const cg = env(audio, t + 0.15, 0.03, 0.1, 1.2);
	crackle.connect(hp).connect(cg).connect(out);
	crackle.start(t + 0.15);
	crackle.stop(t + 1.5);
}

/** A hull goes down: a groan of timber, the gurgle of water, and the bell. */
export function playSink(pan: number) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime + 0.25;
	const out = sfxOut(audio, pan);
	creak(audio, out, t, 0.12);
	creak(audio, out, t + 0.5, 0.08);
	for (let k = 0; k < 14; k += 1) {
		const at = t + 0.4 + Math.random() * 1.2;
		const osc = audio.createOscillator();
		osc.type = 'sine';
		const f = 160 + Math.random() * 260;
		osc.frequency.setValueAtTime(f, at);
		osc.frequency.exponentialRampToValueAtTime(f * 1.8, at + 0.06);
		const g = env(audio, at, 0.05, 0.003, 0.07);
		osc.connect(g).connect(out);
		osc.start(at);
		osc.stop(at + 0.1);
	}
	const rumble = audio.createOscillator();
	rumble.type = 'sine';
	rumble.frequency.setValueAtTime(70, t);
	rumble.frequency.exponentialRampToValueAtTime(36, t + 1.6);
	const rg = env(audio, t, 0.14, 0.2, 1.5);
	rumble.connect(rg).connect(out);
	rumble.start(t);
	rumble.stop(t + 1.8);
	bell(audio, sfxOut(audio, 0), t + 1, 0.05, 293.66);
}

export function playThunder(strength: number) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime + 0.15 + (1 - strength) * 0.6;
	const out = sfxOut(audio, -0.4 + Math.random() * 0.8);
	const src = audio.createBufferSource();
	src.buffer = noiseBuffer(audio, 4, 0.04);
	const lp = audio.createBiquadFilter();
	lp.type = 'lowpass';
	lp.frequency.setValueAtTime(900 * strength + 200, t);
	lp.frequency.exponentialRampToValueAtTime(120, t + 2.4);
	const g = audio.createGain();
	g.gain.setValueAtTime(0.0001, t);
	g.gain.exponentialRampToValueAtTime(0.5 * strength, t + 0.08);
	g.gain.exponentialRampToValueAtTime(0.18 * strength, t + 0.6);
	g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
	src.connect(lp).connect(g).connect(out);
	src.start(t, Math.random());
	src.stop(t + 3);
}

/** The foghorn calls the next keeper to the glass. */
export function playHorn() {
	const audio = sfxContext();
	if (!audio) return;
	foghorn(audio, sfxOut(audio, 0), audio.currentTime + 0.05, 0.09, 1.1);
}

export function playPlace(length: number) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = sfxOut(audio, 0);
	drum(audio, out, t, 0.12 + length * 0.01);
	splashNoise(audio, out, t + 0.02, 0.05, 0.3);
}

export function playRotate() {
	const audio = sfxContext();
	if (!audio) return;
	creak(audio, sfxOut(audio, 0), audio.currentTime, 0.08);
}

export function playNudge() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = sfxOut(audio, 0);
	for (const at of [0, 0.09]) drum(audio, out, t + at, 0.08, false);
}

export function playSelect() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const osc = audio.createOscillator();
	osc.type = 'triangle';
	osc.frequency.value = 880;
	const g = env(audio, t, 0.03, 0.002, 0.12);
	osc.connect(g).connect(sfxOut(audio, 0));
	osc.start(t);
	osc.stop(t + 0.15);
}

/** Ship's bell rung for a new watch, and the surf rolling in. */
export function playStart() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = sfxOut(audio, 0);
	splashNoise(audio, sfxOut(audio, -0.5), t, 0.05, 1.2);
	for (const at of [0.2, 0.55]) bell(audio, out, t + at, 0.04, 587.33);
}

export function playWin() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime + 0.4;
	const out = sfxOut(audio, 0);
	[7, 9, 11, 14].forEach((n, i) => fiddle(audio, sfxOut(audio, -0.3 + i * 0.2), SCALE[n], t + i * 0.18, 0.5 + i * 0.15, 0.05));
	concertina(audio, out, [146.83, 293.66, 369.99, 440], t + 0.7, 2.2, 0.06);
	for (const at of [0.7, 1.05, 1.4]) bell(audio, out, t + at, 0.035, 587.33);
}

export function playLose() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime + 0.4;
	const out = sfxOut(audio, 0);
	[11, 9, 7, 5].forEach((n, i) => fiddle(audio, out, SCALE[n], t + i * 0.32, 0.6, 0.04));
	foghorn(audio, out, t + 1.3, 0.07, 1.6);
}
