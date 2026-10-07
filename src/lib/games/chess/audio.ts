import { connectSfx, getAudioContext, getMusicBus, isLayeredScoreOn, sfxContext } from '$lib/audio/core';
import { createAmbientLayers } from '$lib/audio/ambientLayers';

/** One eighth of a slow 6/8 nocturne. */
const STEP = 0.36;
const BAR = 6;

const mtof = (m: number) => 440 * 2 ** ((m - 69) / 12);

type Kind = 'maj' | 'min' | 'dom';
type Note = [midi: number, at: number, len: number];
type Bar = { root: number; kind: Kind; tune: Note[] };

/** Left-hand spread under each harmony: root, fifth, tenth, twelfth and back. */
const SPREAD: Record<Kind, number[]> = {
	maj: [0, 7, 16, 19, 16, 7],
	min: [0, 7, 15, 19, 15, 7],
	dom: [0, 7, 16, 22, 16, 7]
};

/** E-flat major, eight bars that sing and come home. */
const A: Bar[] = [
	{ root: 39, kind: 'maj', tune: [[70, 0, 3], [75, 3, 2], [74, 5, 1]] },
	{ root: 36, kind: 'min', tune: [[72, 0, 4], [70, 4, 1], [67, 5, 1]] },
	{ root: 44, kind: 'maj', tune: [[68, 0, 2], [72, 2, 1], [75, 3, 3]] },
	{ root: 46, kind: 'dom', tune: [[74, 0, 3], [72, 3, 1], [70, 4, 2]] },
	{ root: 39, kind: 'maj', tune: [[70, 0, 2], [79, 2, 1], [77, 3, 2], [75, 5, 1]] },
	{ root: 43, kind: 'min', tune: [[74, 0, 3], [70, 3, 3]] },
	{ root: 41, kind: 'min', tune: [[72, 0, 2], [68, 2, 1], [77, 3, 2], [75, 5, 1]] },
	{ root: 46, kind: 'dom', tune: [[74, 0, 4], [70, 4, 2]] }
];

/** The C minor middle, darker, reaching higher before it turns home. */
const B: Bar[] = [
	{ root: 36, kind: 'min', tune: [[79, 0, 3], [75, 3, 2], [72, 5, 1]] },
	{ root: 43, kind: 'dom', tune: [[71, 0, 3], [74, 3, 2], [77, 5, 1]] },
	{ root: 36, kind: 'min', tune: [[75, 0, 4], [74, 4, 1], [72, 5, 1]] },
	{ root: 44, kind: 'maj', tune: [[72, 0, 2], [75, 2, 1], [80, 3, 3]] },
	{ root: 41, kind: 'min', tune: [[80, 0, 2], [79, 2, 1], [77, 3, 3]] },
	{ root: 46, kind: 'dom', tune: [[77, 0, 2], [75, 2, 1], [74, 3, 2], [72, 5, 1]] },
	{ root: 39, kind: 'maj', tune: [[70, 0, 3], [79, 3, 3]] },
	{ root: 46, kind: 'dom', tune: [[77, 0, 3], [74, 3, 2], [70, 5, 1]] }
];

/** Theme, theme an octave up and softer, the minor middle, theme. */
const FORM: Array<{ bars: Bar[]; lift: number; vel: number }> = [
	{ bars: A, lift: 0, vel: 0.62 },
	{ bars: A, lift: 12, vel: 0.46 },
	{ bars: B, lift: 0, vel: 0.6 },
	{ bars: A, lift: 0, vel: 0.56 }
];

const E_FLAT = [63, 65, 67, 68, 70, 72, 74, 75, 77];

const layers = createAmbientLayers('chess', STEP, E_FLAT.map(mtof));

let running = false;
let timer: number | null = null;
let stem: GainNode | null = null;
let step = 0;
let nextAt = 0;

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

const PARTIALS = [1, 0.42, 0.22, 0.12, 0.07, 0.035];

/**
 * A felted grand: slightly stretched sine partials, the upper ones dying first, a hammer
 * brightness that mellows as the note rings, and a damper that falls after `hold` seconds.
 */
function piano(audio: AudioContext, dest: AudioNode, midi: number, t: number, vel: number, hold: number) {
	const f = mtof(midi);
	const ring = Math.max(1.4, Math.min(6, 6.5 - (midi - 36) * 0.085));
	const end = Math.min(t + hold, t + ring);
	const tone = audio.createBiquadFilter();
	tone.type = 'lowpass';
	tone.frequency.setValueAtTime(Math.min(11000, f * (5 + vel * 9)), t);
	tone.frequency.exponentialRampToValueAtTime(Math.max(700, f * 2.2), t + Math.min(ring, 1.6));
	const damper = audio.createGain();
	damper.gain.setValueAtTime(1, t);
	damper.gain.setTargetAtTime(0.0001, end, 0.11);
	tone.connect(damper).connect(dest);
	const partials = midi < 50 ? 4 : PARTIALS.length;
	for (let n = 1; n <= partials; n += 1) {
		const freq = f * n * Math.sqrt(1 + 0.00035 * n * n);
		if (freq > 12000) break;
		const amp = PARTIALS[n - 1] * vel * 0.05;
		const g = audio.createGain();
		g.gain.setValueAtTime(0.0001, t);
		g.gain.exponentialRampToValueAtTime(amp, t + 0.005);
		g.gain.setTargetAtTime(0.0001, t + 0.005, ring / (5 + n * 2.4));
		g.connect(tone);
		const strings = n === 1 ? [-1.4, 1.4] : [0];
		for (const cents of strings) {
			const osc = audio.createOscillator();
			osc.frequency.value = freq;
			osc.detune.value = cents;
			const og = audio.createGain();
			og.gain.value = 1 / strings.length;
			osc.connect(og).connect(g);
			osc.start(t);
			osc.stop(end + 0.8);
		}
	}
}

function schedule() {
	if (!running) return;
	const audio = getAudioContext();
	if (!audio || !isLayeredScoreOn() || !stem) {
		timer = window.setTimeout(schedule, 120);
		return;
	}
	while (nextAt < audio.currentTime + 0.4) {
		const t = nextAt;
		const barIndex = Math.floor(step / BAR);
		const beat = step % BAR;
		const part = FORM[Math.floor(barIndex / 8) % FORM.length];
		const inPart = barIndex % 8;
		const bar = part.bars[inPart];
		const human = () => (Math.random() - 0.5) * 0.016;

		const lh = bar.root + SPREAD[bar.kind][beat];
		const pedal = (BAR - beat) * STEP + 0.25;
		piano(audio, panned(audio, -0.25, stem), lh, t + human(), beat === 0 ? 0.42 : 0.26 + Math.random() * 0.05, pedal);
		if (beat === 0) {
			piano(audio, panned(audio, -0.3, stem), bar.root - 12, t, 0.3, pedal);
			layers.bass(mtof(bar.root), t);
		}

		for (const [midi, at, len] of bar.tune) {
			if (at !== beat) continue;
			const note = midi + part.lift;
			const vel = part.vel * (at === 0 ? 1 : 0.86) + (Math.random() - 0.5) * 0.06;
			if (len >= 3 && Math.random() < 0.3) piano(audio, panned(audio, 0.2, stem), note + 2, t - 0.08, vel * 0.45, 0.1);
			piano(audio, panned(audio, 0.2, stem), note, t + human(), vel, len * STEP + 0.35);
			if (part.lift === 0 && inPart >= 6 && at === 0) piano(audio, panned(audio, 0.25, stem), note - 12, t + 0.01, vel * 0.4, len * STEP + 0.3);
			layers.note(mtof(note - 12 - part.lift), t, step);
		}

		const cadence = inPart === 7 && beat >= 3;
		nextAt += STEP * (cadence ? 1.22 : beat === 0 ? 1.04 : 1);
		step += 1;
	}
	timer = window.setTimeout(schedule, 150);
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
	layers.start(audio, 3);
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
				/* already stopped */
			}
		}, 900);
	}
}

/** Pipe organ: stacked flue ranks, slow to speak. */
function organ(audio: AudioContext, dest: AudioNode, freqs: number[], t: number, len: number, peak: number) {
	const filter = audio.createBiquadFilter();
	filter.type = 'lowpass';
	filter.frequency.value = 2200;
	const gain = audio.createGain();
	gain.gain.setValueAtTime(0.0001, t);
	gain.gain.exponentialRampToValueAtTime(peak, t + 0.18);
	gain.gain.setValueAtTime(peak, t + len);
	gain.gain.exponentialRampToValueAtTime(0.0001, t + len + 1.4);
	filter.connect(gain).connect(dest);
	for (const freq of freqs) {
		for (const [ratio, level, type] of [
			[0.5, 0.5, 'sine'],
			[1, 0.6, 'triangle'],
			[2, 0.3, 'square'],
			[3, 0.12, 'sine']
		] as const) {
			const osc = audio.createOscillator();
			osc.type = type;
			osc.frequency.value = freq * ratio;
			osc.detune.value = (Math.random() - 0.5) * 6;
			const og = audio.createGain();
			og.gain.value = (level * 0.22) / freqs.length;
			osc.connect(og).connect(filter);
			osc.start(t);
			osc.stop(t + len + 1.5);
		}
	}
}

function chime(audio: AudioContext, dest: AudioNode, t: number, peak: number, base: number) {
	for (const [ratio, level, len] of [
		[1, 1, 1.8],
		[2.76, 0.4, 0.9],
		[5.4, 0.18, 0.4]
	] as const) {
		const osc = audio.createOscillator();
		osc.type = 'sine';
		osc.frequency.value = base * ratio;
		const g = env(audio, t, peak * level, 0.002, len);
		osc.connect(g).connect(dest);
		osc.start(t);
		osc.stop(t + len + 0.1);
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

/** A weighted boxwood piece set down on marble. */
function thock(audio: AudioContext, out: AudioNode, t: number, peak: number, pitch = 1) {
	const osc = audio.createOscillator();
	osc.type = 'sine';
	osc.frequency.setValueAtTime(240 * pitch, t);
	osc.frequency.exponentialRampToValueAtTime(110 * pitch, t + 0.06);
	const g = env(audio, t, peak, 0.002, 0.09);
	osc.connect(g).connect(out);
	osc.start(t);
	osc.stop(t + 0.12);
	const src = audio.createBufferSource();
	src.buffer = noiseBuffer(audio, 0.06, 1);
	const band = audio.createBiquadFilter();
	band.type = 'bandpass';
	band.frequency.value = 1900 * pitch;
	band.Q.value = 2.5;
	const ng = env(audio, t, peak * 0.7, 0.001, 0.04);
	src.connect(band).connect(ng).connect(out);
	src.start(t);
	src.stop(t + 0.06);
}

export function playMove(pan = 0) {
	const audio = sfxContext();
	if (!audio) return;
	thock(audio, sfxOut(audio, pan * 0.4), audio.currentTime, 0.2, 0.95 + Math.random() * 0.1);
}

export function playCapture(pan = 0) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = sfxOut(audio, pan * 0.4);
	thock(audio, out, t, 0.24, 0.85);
	thock(audio, out, t + 0.05, 0.12, 1.25);
}

export function playCastle() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = sfxOut(audio, 0);
	thock(audio, out, t, 0.18, 0.9);
	thock(audio, out, t + 0.14, 0.16, 1.05);
}

export function playCheck() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime + 0.05;
	const out = sfxOut(audio, 0);
	chime(audio, out, t, 0.05, 880);
	chime(audio, out, t + 0.16, 0.04, 1174.66);
}

export function playPromote() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime + 0.05;
	const out = sfxOut(audio, 0);
	[63, 67, 70, 75, 79, 82].forEach((m, i) => piano(audio, out, m, t + i * 0.06, 0.9, 1.4));
	chime(audio, out, t + 0.4, 0.03, 1760);
}

export function playSelect() {
	const audio = sfxContext();
	if (!audio) return;
	thock(audio, sfxOut(audio, 0), audio.currentTime, 0.05, 1.6);
}

export function playNudge() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = sfxOut(audio, 0);
	for (const at of [0, 0.09]) thock(audio, out, t + at, 0.08, 0.6);
}

/** The long-case clock in the corner, when a flag is near falling. */
export function playTick(urgent = false) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = sfxOut(audio, 0.3);
	const osc = audio.createOscillator();
	osc.type = 'sine';
	osc.frequency.value = urgent ? 1800 : 1300;
	const g = env(audio, t, urgent ? 0.1 : 0.06, 0.001, 0.035);
	osc.connect(g).connect(out);
	osc.start(t);
	osc.stop(t + 0.05);
}

export function playOffer() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = sfxOut(audio, 0);
	chime(audio, out, t, 0.03, 659.25);
	chime(audio, out, t + 0.2, 0.03, 587.33);
}

/** The host at the piano: a rolled E-flat chord as you take your seat. */
export function playStart() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime + 0.05;
	const out = sfxOut(audio, 0);
	[39, 51, 58, 63, 67, 70, 75].forEach((m, i) => piano(audio, out, m, t + i * 0.05, 0.8, 2.4));
}

export function playWin() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime + 0.3;
	const out = sfxOut(audio, 0);
	organ(audio, out, [146.83, 220, 293.66, 369.99], t, 1.2, 0.12);
	organ(audio, out, [146.83, 220, 293.66, 369.99, 440], t + 1.3, 1.8, 0.13);
	for (const [at, f] of [
		[1.3, 1174.66],
		[1.5, 1479.98],
		[1.7, 1760]
	] as const)
		chime(audio, sfxOut(audio, 0.3), t + at, 0.03, f);
}

export function playLose() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime + 0.3;
	const out = sfxOut(audio, 0);
	organ(audio, out, [146.83, 220, 293.66, 349.23], t, 1.4, 0.11);
	organ(audio, out, [138.59, 220, 277.18, 329.63], t + 1.5, 1, 0.09);
	organ(audio, out, [73.42, 146.83, 220, 293.66, 349.23], t + 2.6, 2, 0.1);
}

export function playDraw() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime + 0.2;
	const out = sfxOut(audio, 0);
	organ(audio, out, [146.83, 220, 293.66, 392], t, 1.1, 0.09);
	organ(audio, out, [146.83, 220, 293.66, 369.99], t + 1.2, 1.6, 0.09);
}

/** The flag falls: a single deep stroke of the hall clock. */
export function playFlag() {
	const audio = sfxContext();
	if (!audio) return;
	chime(audio, sfxOut(audio, 0), audio.currentTime + 0.05, 0.08, 196);
}

export function playThunder(strength: number) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime + 0.3 + (1 - strength) * 0.8;
	const out = sfxOut(audio, -0.6 + Math.random() * 1.2);
	const src = audio.createBufferSource();
	src.buffer = noiseBuffer(audio, 4, 0.04);
	const lp = audio.createBiquadFilter();
	lp.type = 'lowpass';
	lp.frequency.setValueAtTime(600 * strength + 160, t);
	lp.frequency.exponentialRampToValueAtTime(100, t + 2.6);
	const g = audio.createGain();
	g.gain.setValueAtTime(0.0001, t);
	g.gain.exponentialRampToValueAtTime(0.32 * strength, t + 0.12);
	g.gain.exponentialRampToValueAtTime(0.12 * strength, t + 0.7);
	g.gain.exponentialRampToValueAtTime(0.0001, t + 3);
	src.connect(lp).connect(g).connect(out);
	src.start(t, Math.random());
	src.stop(t + 3.2);
}
