import { connectSfx, getAudioContext, getMusicBus, isLayeredScoreOn, sfxContext } from '$lib/audio/core';
import { createAmbientLayers } from '$lib/audio/ambientLayers';
import type { Player } from './types';

const STEP = 0.36;

/** G major pentatonic: no semitones, so any two tines sound kind together. */
const SCALE = [196, 220, 246.94, 293.66, 329.63, 392, 440, 493.88, 587.33, 659.25, 783.99, 880];

const CHORDS: Array<{ root: number; tones: number[] }> = [
	{ root: 98, tones: [392, 493.88, 587.33] },
	{ root: 82.41, tones: [329.63, 392, 493.88] },
	{ root: 65.41, tones: [329.63, 392, 523.25] },
	{ root: 73.42, tones: [293.66, 440, 587.33] },
	{ root: 98, tones: [392, 493.88, 587.33] },
	{ root: 61.74, tones: [293.66, 392, 493.88] },
	{ root: 65.41, tones: [329.63, 392, 523.25] },
	{ root: 73.42, tones: [293.66, 369.99, 440] }
];

const layers = createAmbientLayers('seedkeeper', STEP, SCALE.slice(0, 7));

let running = false;
let timer: number | null = null;
let stem: GainNode | null = null;
let brook: { src: AudioBufferSourceNode; lfo: OscillatorNode; gain: GainNode } | null = null;
let step = 0;
let nextAt = 0;
let lastNote = 5;
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
	p.pan.value = Math.max(-1, Math.min(1, pan));
	p.connect(dest);
	return p;
}

/** Kalimba tine: a sine body, a bright inharmonic overtone that dies fast, and a thumb click. */
function tine(audio: AudioContext, dest: AudioNode, freq: number, t: number, peak: number, decay = 1.4) {
	const body = audio.createOscillator();
	body.type = 'sine';
	body.frequency.setValueAtTime(freq, t);
	const bodyGain = env(audio, t, peak, 0.003, decay);
	body.connect(bodyGain).connect(dest);
	const over = audio.createOscillator();
	over.type = 'sine';
	over.frequency.setValueAtTime(freq * 5.4, t);
	const overGain = env(audio, t, peak * 0.35, 0.002, decay * 0.12);
	over.connect(overGain).connect(dest);
	const second = audio.createOscillator();
	second.type = 'triangle';
	second.frequency.setValueAtTime(freq * 2.01, t);
	const secondGain = env(audio, t, peak * 0.12, 0.003, decay * 0.4);
	second.connect(secondGain).connect(dest);
	for (const osc of [body, over, second]) {
		osc.start(t);
		osc.stop(t + decay + 0.1);
	}
	const click = audio.createBufferSource();
	click.buffer = noiseBuffer(audio, 0.1, 1);
	const band = audio.createBiquadFilter();
	band.type = 'bandpass';
	band.frequency.value = 2400;
	band.Q.value = 1.2;
	const clickGain = env(audio, t, peak * 0.25, 0.001, 0.012);
	click.connect(band).connect(clickGain).connect(dest);
	click.start(t, Math.random() * 0.05);
	click.stop(t + 0.04);
}

/** Udu-like hand drum: a thump whose pitch falls, with a breath of skin. */
function drum(audio: AudioContext, dest: AudioNode, t: number, peak: number, pitch = 90) {
	const osc = audio.createOscillator();
	osc.type = 'sine';
	osc.frequency.setValueAtTime(pitch * 1.8, t);
	osc.frequency.exponentialRampToValueAtTime(pitch, t + 0.08);
	const gain = env(audio, t, peak, 0.004, 0.32);
	osc.connect(gain).connect(dest);
	osc.start(t);
	osc.stop(t + 0.4);
	const skin = audio.createBufferSource();
	skin.buffer = noiseBuffer(audio, 0.2, 0.5);
	const lp = audio.createBiquadFilter();
	lp.type = 'lowpass';
	lp.frequency.value = 900;
	const sg = env(audio, t, peak * 0.3, 0.002, 0.05);
	skin.connect(lp).connect(sg).connect(dest);
	skin.start(t);
	skin.stop(t + 0.1);
}

/** Shaker of dried seeds. */
function shaker(audio: AudioContext, dest: AudioNode, t: number, peak: number) {
	const src = audio.createBufferSource();
	src.buffer = noiseBuffer(audio, 0.3, 1);
	const hp = audio.createBiquadFilter();
	hp.type = 'highpass';
	hp.frequency.value = 5200;
	const gain = env(audio, t, peak, 0.012, 0.06);
	src.connect(hp).connect(gain).connect(dest);
	src.start(t, Math.random() * 0.2);
	src.stop(t + 0.1);
}

function cricket(audio: AudioContext, dest: AudioNode, t: number) {
	const freq = 4300 + Math.random() * 600;
	const pulses = 3 + Math.floor(Math.random() * 3);
	for (let k = 0; k < pulses; k += 1) {
		const at = t + k * 0.055;
		const osc = audio.createOscillator();
		osc.type = 'sine';
		osc.frequency.setValueAtTime(freq, at);
		const g = env(audio, at, 0.006, 0.006, 0.03);
		osc.connect(g).connect(dest);
		osc.start(at);
		osc.stop(at + 0.05);
	}
}

/** A frog somewhere in the reeds: a low buzzy croak. */
function croak(audio: AudioContext, dest: AudioNode, t: number) {
	const count = 1 + Math.floor(Math.random() * 2);
	for (let k = 0; k < count; k += 1) {
		const at = t + k * 0.32;
		const osc = audio.createOscillator();
		osc.type = 'sawtooth';
		osc.frequency.setValueAtTime(115 + Math.random() * 20, at);
		osc.frequency.linearRampToValueAtTime(90, at + 0.18);
		const am = audio.createOscillator();
		am.frequency.value = 38;
		const amDepth = audio.createGain();
		amDepth.gain.value = 0.5;
		const lp = audio.createBiquadFilter();
		lp.type = 'lowpass';
		lp.frequency.value = 700;
		const gain = env(audio, at, 0.02, 0.03, 0.18);
		am.connect(amDepth).connect(gain.gain);
		osc.connect(lp).connect(gain).connect(dest);
		for (const node of [osc, am]) {
			node.start(at);
			node.stop(at + 0.26);
		}
	}
}

function startBrook(audio: AudioContext, dest: AudioNode) {
	const src = audio.createBufferSource();
	src.buffer = noiseBuffer(audio, 4, 0.18);
	src.loop = true;
	const band = audio.createBiquadFilter();
	band.type = 'bandpass';
	band.frequency.value = 900;
	band.Q.value = 0.6;
	const lfo = audio.createOscillator();
	lfo.frequency.value = 0.13;
	const lfoDepth = audio.createGain();
	lfoDepth.gain.value = 380;
	lfo.connect(lfoDepth).connect(band.frequency);
	const gain = audio.createGain();
	gain.gain.setValueAtTime(0.0001, audio.currentTime);
	gain.gain.exponentialRampToValueAtTime(0.05, audio.currentTime + 3);
	src.connect(band).connect(gain).connect(dest);
	src.start();
	lfo.start();
	return { src, lfo, gain };
}

function nextPhrase() {
	const out: number[] = [];
	let n = lastNote;
	for (let k = 0; k < 8; k += 1) {
		const move = [-2, -1, -1, 1, 1, 2, 0, -3][Math.floor(Math.random() * 8)];
		n = Math.max(2, Math.min(SCALE.length - 1, n + move));
		out.push(k % 2 === 1 && Math.random() < 0.45 ? -1 : n);
	}
	out[7] = Math.random() < 0.5 ? 5 : 3;
	lastNote = out[7];
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
		const bar = Math.floor(step / 8);
		const beat = step % 8;
		const chord = CHORDS[bar % CHORDS.length];
		const section = Math.floor(bar / 4) % 4;

		if (beat === 0) {
			tine(audio, panned(audio, -0.2, stem), chord.root * 2, t, 0.06, 2.4);
			layers.bass(chord.root, t);
		}
		if (section !== 0) {
			if (beat === 0 || beat === 3 || beat === 6) drum(audio, panned(audio, -0.35, stem), t, beat === 0 ? 0.08 : 0.05, beat === 0 ? 80 : 110);
			if (beat % 2 === 1) shaker(audio, panned(audio, 0.4, stem), t, 0.012 + Math.random() * 0.008);
		}
		const arp = [0, 2, 1, 2];
		if (beat % 2 === 0 || Math.random() < 0.35) {
			tine(audio, panned(audio, 0.25, stem), chord.tones[arp[beat % 4]], t + (beat % 2 ? STEP * 0.5 : 0), 0.024, 1.2);
		}
		if (section === 1 || section === 2) {
			if (beat === 0) phrase = nextPhrase();
			const n = phrase[beat];
			if (n >= 0 && (beat % 2 === 0 || Math.random() < 0.7)) {
				const freq = SCALE[n] * 2;
				tine(audio, panned(audio, 0.05, stem), freq, t, 0.035, 1.6);
				layers.note(freq / 2, t, step);
			}
		}
		if (Math.random() < 0.06) cricket(audio, panned(audio, -0.8 + Math.random() * 1.6, stem), t + Math.random() * STEP);
		if (Math.random() < 0.012) croak(audio, panned(audio, 0.6 + Math.random() * 0.3, stem), t);
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
	brook = startBrook(audio, stem);
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
	const oldBrook = brook;
	stem = null;
	brook = null;
	if (old && audio) {
		old.gain.setTargetAtTime(0.0001, audio.currentTime, 0.18);
		window.setTimeout(() => {
			try {
				oldBrook?.src.stop();
				oldBrook?.lfo.stop();
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

/** A seed touching down: a stone clack, then a tine that climbs with each seed in the sowing. */
export function playLand(k: number, store: boolean, pan: number) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = sfxOut(audio, pan * 0.6);
	const src = audio.createBufferSource();
	src.buffer = noiseBuffer(audio, 0.1, 1);
	const band = audio.createBiquadFilter();
	band.type = 'bandpass';
	band.frequency.value = store ? 1300 : 2600 + Math.random() * 900;
	band.Q.value = store ? 3 : 4.5;
	const gain = env(audio, t, store ? 0.16 : 0.12, 0.001, store ? 0.05 : 0.025);
	src.connect(band).connect(gain).connect(out);
	src.start(t, Math.random() * 0.05);
	src.stop(t + 0.08);
	const tok = audio.createOscillator();
	tok.type = 'sine';
	const base = store ? 330 : 900 + Math.random() * 120;
	tok.frequency.setValueAtTime(base * 1.4, t);
	tok.frequency.exponentialRampToValueAtTime(base, t + 0.02);
	const tg = env(audio, t, store ? 0.07 : 0.035, 0.001, store ? 0.12 : 0.05);
	tok.connect(tg).connect(out);
	tok.start(t);
	tok.stop(t + 0.15);
	tine(audio, out, SCALE[Math.min(SCALE.length - 1, k)] * (store ? 1 : 2), t + 0.005, store ? 0.04 : 0.022, store ? 1.4 : 0.7);
}

/** Seeds scooped out of a pit: a little rattle. */
export function playLift(count: number, pan: number) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = sfxOut(audio, pan * 0.6);
	const clicks = Math.min(12, count + 2);
	for (let k = 0; k < clicks; k += 1) {
		const at = t + Math.random() * 0.22;
		const src = audio.createBufferSource();
		src.buffer = noiseBuffer(audio, 0.05, 1);
		const band = audio.createBiquadFilter();
		band.type = 'bandpass';
		band.frequency.value = 2200 + Math.random() * 2400;
		band.Q.value = 5;
		const g = env(audio, at, 0.04 + Math.random() * 0.03, 0.001, 0.015);
		src.connect(band).connect(g).connect(out);
		src.start(at);
		src.stop(at + 0.03);
	}
}

/** Light rippling across water, and a run of tines for every seed taken. */
export function playCapture(taken: number) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = sfxOut(audio, 0);
	const bloop = audio.createOscillator();
	bloop.type = 'sine';
	bloop.frequency.setValueAtTime(240, t);
	bloop.frequency.exponentialRampToValueAtTime(720, t + 0.12);
	const bg = env(audio, t, 0.09, 0.01, 0.2);
	bloop.connect(bg).connect(out);
	bloop.start(t);
	bloop.stop(t + 0.3);
	const notes = Math.min(9, 3 + taken);
	for (let k = 0; k < notes; k += 1) {
		tine(audio, sfxOut(audio, -0.5 + k / notes), SCALE[Math.min(SCALE.length - 1, 3 + k)] * 2, t + 0.08 + k * 0.06, 0.03, 1.4);
	}
	const wash = audio.createBufferSource();
	wash.buffer = noiseBuffer(audio, 1, 0.3);
	const band = audio.createBiquadFilter();
	band.type = 'bandpass';
	band.frequency.setValueAtTime(500, t);
	band.frequency.exponentialRampToValueAtTime(2200, t + 0.6);
	const wg = env(audio, t, 0.04, 0.15, 0.5);
	wash.connect(band).connect(wg).connect(out);
	wash.start(t);
	wash.stop(t + 0.8);
}

/** Last seed home in your own store: sow again. */
export function playAgain(chain: number) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime + 0.05;
	const lift = Math.min(4, chain - 1);
	tine(audio, sfxOut(audio, 0), SCALE[5 + lift] * 2, t, 0.05, 1.2);
	tine(audio, sfxOut(audio, 0.1), SCALE[7 + lift] * 2, t + 0.1, 0.045, 1.6);
}

export function playTurn(player: Player) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime + 0.05;
	tine(audio, sfxOut(audio, player === 1 ? -0.3 : 0.3), player === 1 ? 392 : 293.66, t, 0.03, 0.9);
}

export function playWin(good: boolean) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime + 0.3;
	const line = good ? [392, 493.88, 587.33, 783.99, 987.77] : [587.33, 493.88, 440, 392, 329.63];
	line.forEach((freq, i) => {
		const out = sfxOut(audio, -0.4 + i * 0.2);
		tine(audio, out, freq, t + i * 0.13, 0.06, 1.8);
		if (i === line.length - 1) {
			for (const tone of good ? [196, 293.66, 392] : [164.81, 246.94, 329.63]) tine(audio, out, tone, t + i * 0.13 + 0.02, 0.05, 2.6);
			drum(audio, out, t + i * 0.13, 0.1, 75);
		}
	});
}

export function playDraw() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime + 0.3;
	const out = sfxOut(audio, 0);
	for (const [i, freq] of [293.66, 392, 493.88, 329.63, 440, 587.33].entries()) {
		tine(audio, out, freq, t + (i < 3 ? 0 : 0.5) + (i % 3) * 0.05, 0.045, 1.8);
	}
}

/** Seeds poured into the pits from a gourd, then a soft chord. */
export function playStart(seeds: number) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = sfxOut(audio, 0);
	const clicks = 14 + seeds * 3;
	for (let k = 0; k < clicks; k += 1) {
		const at = t + Math.pow(Math.random(), 0.8) * 0.7;
		const src = audio.createBufferSource();
		src.buffer = noiseBuffer(audio, 0.05, 1);
		const band = audio.createBiquadFilter();
		band.type = 'bandpass';
		band.frequency.value = 2000 + Math.random() * 3000;
		band.Q.value = 5;
		const g = env(audio, at, 0.025 + Math.random() * 0.03, 0.001, 0.02);
		const p = panned(audio, -0.7 + Math.random() * 1.4, out);
		src.connect(band).connect(g).connect(p);
		src.start(at);
		src.stop(at + 0.03);
	}
	for (const [i, freq] of [196, 293.66, 392, 493.88].entries()) tine(audio, out, freq, t + 0.55 + i * 0.07, 0.035, 1.8);
}

export function playSelect() {
	const audio = sfxContext();
	if (!audio) return;
	tine(audio, sfxOut(audio, 0), 783.99, audio.currentTime, 0.022, 0.4);
}
