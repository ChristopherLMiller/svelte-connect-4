import { connectSfx, getAudioContext, getMusicBus, isLayeredScoreOn, sfxContext } from '$lib/audio/core';
import { createAmbientLayers } from '$lib/audio/ambientLayers';
import { BURST, COL, MOON, ROW, type Special } from './match';
import type { Kind } from './types';

const EIGHTH = 0.3;

/** G major, gently: G6/9 – Em7 – Cmaj9 – Dsus, voiced open. */
const CHORDS: number[][] = [
	[55, 59, 62, 64, 69],
	[52, 55, 59, 62, 66],
	[48, 55, 59, 62, 64],
	[50, 55, 57, 62, 64]
];
const ROOTS = [43, 40, 36, 38];
/** The hang's notes: G major pentatonic across two octaves. */
const SCALE = [62, 64, 67, 69, 71, 74, 76, 79, 81, 83];
/** Where in a two-bar phrase the hang plays; the rests leave room for the water. */
const RHYTHMS = [
	[0, 3, 4, 6, 10, 12],
	[0, 2, 5, 8, 11],
	[0, 4, 6, 7, 12, 14],
	[0, 3, 8, 10]
];

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

let running = false;
let timer: number | null = null;
let stem: GainNode | null = null;
let live: AudioScheduledSourceNode[] = [];
let step = 0;
let nextAt = 0;
let walk = 4;

const layers = createAmbientLayers(
	'koi',
	EIGHTH * 8,
	CHORDS.flatMap((chord) => chord.map((n) => hz(n + 12)))
);

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

function track(...nodes: AudioScheduledSourceNode[]) {
	live.push(...nodes);
	if (live.length > 240) live = live.slice(-160);
}

/** Hang drum: a soft sine with its octave and a quiet twelfth, slow to fade. */
function hang(audio: AudioContext, dest: AudioNode, midi: number, t: number, peak: number, length = 1.8) {
	const f = hz(midi);
	const out: AudioScheduledSourceNode[] = [];
	for (const [ratio, level, decay] of [
		[1, 1, length],
		[2, 0.32, length * 0.5],
		[3.01, 0.08, length * 0.25]
	] as Array<[number, number, number]>) {
		const osc = audio.createOscillator();
		osc.type = 'sine';
		osc.frequency.value = f * ratio;
		const g = env(audio, t, peak * level, 0.008, decay);
		osc.connect(g).connect(dest);
		osc.start(t);
		osc.stop(t + decay + 0.05);
		out.push(osc);
	}
	track(...out);
}

/** Soft keys: a warm triangle chord that swells under a closed filter. */
function keys(audio: AudioContext, notes: number[], t: number, length: number, peak: number) {
	if (!stem) return;
	const out = hold(audio, t, peak, length * 0.25, length * 0.7, length * 0.5);
	const filter = audio.createBiquadFilter();
	filter.type = 'lowpass';
	filter.frequency.value = 1300;
	filter.Q.value = 0.5;
	filter.connect(out).connect(stem);
	for (const n of notes) {
		for (const detune of [-5, 5]) {
			const osc = audio.createOscillator();
			osc.type = 'triangle';
			osc.frequency.value = hz(n);
			osc.detune.value = detune;
			osc.connect(filter);
			osc.start(t);
			osc.stop(t + length * 1.3);
			track(osc);
		}
	}
}

function bass(audio: AudioContext, midi: number, t: number, peak: number) {
	if (!stem) return;
	const osc = audio.createOscillator();
	osc.type = 'sine';
	osc.frequency.value = hz(midi);
	const g = env(audio, t, peak, 0.02, 0.9);
	osc.connect(g).connect(stem);
	osc.start(t);
	osc.stop(t + 1);
	track(osc);
}

/** A water drop: a sine that leaps upward and dies at once. */
function plop(audio: AudioContext, dest: AudioNode, f: number, t: number, peak: number, pan = 0) {
	const osc = audio.createOscillator();
	osc.type = 'sine';
	osc.frequency.setValueAtTime(f, t);
	osc.frequency.exponentialRampToValueAtTime(f * 2.6, t + 0.05);
	const g = env(audio, t, peak, 0.002, 0.07);
	let out: AudioNode = g;
	if (pan) {
		const p = audio.createStereoPanner();
		p.pan.value = Math.max(-0.8, Math.min(0.8, pan));
		g.connect(p);
		out = p;
	}
	osc.connect(g);
	out.connect(dest);
	osc.start(t);
	osc.stop(t + 0.12);
	return osc;
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
		const phrasePos = step % 16;
		const chordIndex = Math.floor(bar / 2) % CHORDS.length;
		const chord = CHORDS[chordIndex]!;
		const root = ROOTS[chordIndex]!;
		const section = Math.floor(bar / 8) % 4;

		if (phrasePos === 0) {
			keys(audio, chord.slice(0, 4), nextAt, EIGHTH * 16, 0.016);
			layers.bass(hz(root), nextAt);
		}
		if (pos === 0 || pos === 5) bass(audio, pos === 0 ? root : root + 7, nextAt, pos === 0 ? 0.07 : 0.04);

		// The hang wanders the pentatonic, landing on a chord tone at the top of each phrase.
		const rhythm = RHYTHMS[(Math.floor(step / 16) + section) % RHYTHMS.length]!;
		if (section !== 3 && rhythm.includes(phrasePos) && stem) {
			if (phrasePos === 0) {
				const target = chord[1]! + 12;
				walk = SCALE.reduce((best, n, i) => (Math.abs(n - target) < Math.abs(SCALE[best]! - target) ? i : best), 0);
			} else {
				const move = [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)]!;
				walk = Math.max(1, Math.min(SCALE.length - 2, walk + move));
			}
			const midi = SCALE[walk]!;
			hang(audio, stem, midi, nextAt, phrasePos === 0 ? 0.05 : 0.036);
			if (phrasePos === 0) layers.note(hz(midi), nextAt, bar);
		}
		// In the quiet section the hang rests and the drops take the tune.
		if (section === 3 && (pos === 0 || pos === 3 || pos === 6) && stem) {
			const n = chord[(bar + pos) % chord.length]! + 12;
			hang(audio, stem, n, nextAt, 0.026, 2.4);
		}
		if (stem && (pos === 2 || pos === 7) && Math.random() < 0.45) {
			const n = SCALE[5 + Math.floor(Math.random() * 5)]!;
			track(plop(audio, stem, hz(n) * 0.5, nextAt + Math.random() * 0.05, 0.018, Math.random() * 1.2 - 0.6));
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
	walk = 4;
	stem = audio.createGain();
	stem.gain.setValueAtTime(0.0001, audio.currentTime);
	stem.gain.exponentialRampToValueAtTime(1, audio.currentTime + 2.2);
	stem.connect(bus);
	layers.start(audio, 2.2);
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

function sfxBus(audio: AudioContext) {
	const out = audio.createGain();
	out.gain.value = 1;
	connectSfx(out);
	return out;
}

function tone(audio: AudioContext, t: number, type: OscillatorType, from: number, to: number, peak: number, attack: number, length: number) {
	const osc = audio.createOscillator();
	osc.type = type;
	osc.frequency.setValueAtTime(from, t);
	if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t + length);
	const g = env(audio, t, peak, attack, length);
	osc.connect(g);
	connectSfx(g);
	osc.start(t);
	osc.stop(t + attack + length + 0.05);
}

const sfxScale = (i: number) => SCALE[Math.max(0, Math.min(SCALE.length - 1, i))]!;

export function playShoot() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	tone(audio, t, 'sine', 320, 720, 0.04, 0.004, 0.09);
	tone(audio, t, 'triangle', 1500, 1300, 0.01, 0.002, 0.04);
}

export function playBounce() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	tone(audio, t, 'triangle', 1250, 1050, 0.022, 0.002, 0.05);
}

/** A bloom finding its place: a plip when it sticks, chimes and plops when it pops. */
export function playLand(kind: Kind, popped: number, dropped: number, streak: number) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = sfxBus(audio);
	if (!popped) {
		plop(audio, out, 330 + kind * 20, t, 0.05);
		tone(audio, t, 'sine', 180, 140, 0.025, 0.003, 0.08);
		return;
	}
	const base = Math.min(4, streak);
	const n = Math.min(6, popped);
	for (let i = 0; i < n; i += 1) {
		hang(audio, out, sfxScale(base + i), t + i * 0.045, 0.04, 0.9);
		plop(audio, out, 420 + i * 70, t + i * 0.04, 0.04, (i / n) * 1 - 0.5);
	}
	const falls = Math.min(12, dropped);
	for (let i = 0; i < falls; i += 1) {
		plop(audio, out, 260 + Math.random() * 260, t + 0.18 + i * 0.06 + Math.random() * 0.03, 0.045, Math.random() * 1.4 - 0.7);
	}
	if (dropped >= 4) hang(audio, out, sfxScale(base + n + 1), t + 0.18 + falls * 0.06, 0.04, 1.4);
}

export function playDescend() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	tone(audio, t + 0.1, 'sine', 140, 80, 0.08, 0.01, 0.4);
	tone(audio, t + 0.1, 'triangle', 280, 200, 0.02, 0.005, 0.25);
}

export function playSwapNext() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	tone(audio, t, 'sine', 700, 900, 0.025, 0.004, 0.06);
	tone(audio, t + 0.06, 'sine', 900, 700, 0.02, 0.004, 0.06);
}

export function playSelect() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	tone(audio, t, 'triangle', 980, 960, 0.02, 0.003, 0.08);
}

export function playSwap() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	tone(audio, t, 'sine', 520, 640, 0.035, 0.004, 0.08);
	tone(audio, t + 0.07, 'sine', 640, 760, 0.025, 0.004, 0.08);
}

export function playBonk() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	tone(audio, t, 'triangle', 240, 190, 0.04, 0.004, 0.09);
	tone(audio, t + 0.16, 'triangle', 200, 160, 0.03, 0.004, 0.09);
}

/** A wave of matches: plops for each piece, a chime that climbs with the chain. */
export function playStep(chain: number, count: number) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = sfxBus(audio);
	const n = Math.min(8, count);
	for (let i = 0; i < n; i += 1) plop(audio, out, 380 + Math.random() * 300, t + i * 0.025, 0.035, Math.random() * 1.2 - 0.6);
	hang(audio, out, sfxScale(1 + chain), t, 0.05, 1.1);
	if (chain >= 2) hang(audio, out, sfxScale(3 + chain), t + 0.08, 0.035, 1.1);
}

export function playSpecial(s: Special) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = sfxBus(audio);
	if (s === ROW || s === COL) {
		for (let i = 0; i < 6; i += 1) hang(audio, out, sfxScale(2 + i), t + i * 0.03, 0.025, 0.6);
	} else if (s === BURST) {
		tone(audio, t, 'sine', 160, 70, 0.1, 0.004, 0.4);
		hang(audio, out, 74, t + 0.02, 0.04, 1.2);
	} else if (s === MOON) {
		SCALE.forEach((n, i) => hang(audio, out, n, t + i * 0.05, 0.03, 1.4));
	}
}

/** The golden koi: a splash of drops and a rising run on the hang. */
export function playLeap() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = sfxBus(audio);
	[67, 71, 74, 79, 83].forEach((n, i) => hang(audio, out, n, t + i * 0.09, 0.035, 1.6));
	for (let i = 0; i < 9; i += 1) plop(audio, out, 300 + Math.random() * 400, t + 0.7 + i * 0.05 + Math.random() * 0.03, 0.04, Math.random() * 1.4 - 0.7);
	hang(audio, out, 55, t + 0.7, 0.05, 2.4);
}

export function playStage() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = sfxBus(audio);
	[67, 71, 74, 76, 79, 83, 86].forEach((n, i) => hang(audio, out, n, t + i * 0.08, 0.04, 1.6));
	hang(audio, out, 55, t, 0.05, 2.4);
}

export function playOver() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = sfxBus(audio);
	[74, 71, 67, 64, 62].forEach((n, i) => hang(audio, out, n, t + i * 0.28, 0.045, 2));
	hang(audio, out, 43, t + 1.2, 0.05, 3);
}

export function playReady() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	hang(audio, sfxBus(audio), 74, t, 0.04, 1.2);
}

export function playPause() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	tone(audio, t, 'sine', 523, 392, 0.03, 0.01, 0.22);
}
