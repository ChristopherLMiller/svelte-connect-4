import { connectSfx, getAudioContext, getMusicBus, isLayeredScoreOn, sfxContext } from '$lib/audio/core';
import { createAmbientLayers } from '$lib/audio/ambientLayers';

/** One eighth of a slow air in 3/4. */
const STEP = 0.32;
const BAR = 6;

const mtof = (m: number) => 440 * 2 ** ((m - 69) / 12);

type Kind = 'maj' | 'min' | 'dom';
type Note = [midi: number, at: number, len: number];
type Bar = { root: number; kind: Kind; tune: Note[] };

/** Fingerpicked guitar under each chord: bass, then the chord rolled up and back. */
const PICK: Record<Kind, number[]> = {
	maj: [0, 12, 16, 19, 24, 19],
	min: [0, 12, 15, 19, 24, 19],
	dom: [0, 12, 16, 22, 24, 19]
};

/** D major: the tune everyone in the snug half knows. */
const A: Bar[] = [
	{ root: 50, kind: 'maj', tune: [[66, 0, 2], [69, 2, 2], [74, 4, 2]] },
	{ root: 43, kind: 'maj', tune: [[71, 0, 3], [69, 3, 1], [67, 4, 2]] },
	{ root: 50, kind: 'maj', tune: [[66, 0, 2], [64, 2, 1], [62, 3, 1], [66, 4, 2]] },
	{ root: 45, kind: 'maj', tune: [[64, 0, 4], [61, 4, 2]] },
	{ root: 50, kind: 'maj', tune: [[66, 0, 2], [69, 2, 2], [74, 4, 2]] },
	{ root: 43, kind: 'maj', tune: [[76, 0, 2], [74, 2, 1], [71, 3, 1], [67, 4, 2]] },
	{ root: 45, kind: 'dom', tune: [[69, 0, 2], [73, 2, 2], [76, 4, 2]] },
	{ root: 50, kind: 'maj', tune: [[74, 0, 6]] }
];

/** The turn: up to B minor and a little higher before it settles. */
const B: Bar[] = [
	{ root: 47, kind: 'min', tune: [[74, 0, 2], [78, 2, 2], [76, 4, 2]] },
	{ root: 43, kind: 'maj', tune: [[74, 0, 3], [71, 3, 1], [67, 4, 2]] },
	{ root: 50, kind: 'maj', tune: [[69, 0, 2], [74, 2, 2], [78, 4, 2]] },
	{ root: 45, kind: 'maj', tune: [[76, 0, 4], [73, 4, 2]] },
	{ root: 47, kind: 'min', tune: [[71, 0, 2], [74, 2, 1], [76, 3, 1], [78, 4, 2]] },
	{ root: 43, kind: 'maj', tune: [[79, 0, 2], [78, 2, 1], [76, 3, 1], [74, 4, 2]] },
	{ root: 45, kind: 'dom', tune: [[73, 0, 2], [71, 2, 1], [69, 3, 1], [67, 4, 2]] },
	{ root: 50, kind: 'maj', tune: [[66, 0, 4], [62, 4, 2]] }
];

type Lead = 'fiddle' | 'concertina';
const FORM: Array<{ bars: Bar[]; lead: Lead; vel: number; drum: boolean; squeeze: boolean }> = [
	{ bars: A, lead: 'fiddle', vel: 0.6, drum: false, squeeze: false },
	{ bars: A, lead: 'concertina', vel: 0.55, drum: false, squeeze: false },
	{ bars: B, lead: 'fiddle', vel: 0.62, drum: true, squeeze: true },
	{ bars: A, lead: 'fiddle', vel: 0.56, drum: true, squeeze: true }
];

const D_MAJOR = [62, 64, 66, 67, 69, 71, 73, 74, 76];

const layers = createAmbientLayers('pub', STEP, D_MAJOR.map(mtof));

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

function panned(audio: AudioContext, pan: number, dest: AudioNode) {
	const p = audio.createStereoPanner();
	p.pan.value = Math.max(-1, Math.min(1, pan));
	p.connect(dest);
	return p;
}

/** A bowed fiddle: a soft saw through a wooden body, vibrato that blooms after the attack. */
function fiddle(audio: AudioContext, dest: AudioNode, midi: number, t: number, len: number, vel: number) {
	const f = mtof(midi);
	const end = t + len;
	const body = audio.createBiquadFilter();
	body.type = 'lowpass';
	body.frequency.value = Math.min(4200, f * 6);
	body.Q.value = 0.7;
	const formant = audio.createBiquadFilter();
	formant.type = 'peaking';
	formant.frequency.value = 2800;
	formant.gain.value = 4;
	formant.Q.value = 1.4;
	const g = audio.createGain();
	const peak = 0.05 * vel;
	g.gain.setValueAtTime(0.0001, t);
	g.gain.exponentialRampToValueAtTime(peak, t + 0.09);
	g.gain.setTargetAtTime(peak * 0.78, t + 0.12, 0.2);
	g.gain.setTargetAtTime(0.0001, end, 0.09);
	body.connect(formant).connect(g).connect(dest);
	const vib = audio.createOscillator();
	vib.frequency.value = 5.4;
	const depth = audio.createGain();
	depth.gain.setValueAtTime(0, t);
	depth.gain.linearRampToValueAtTime(0, t + 0.18);
	depth.gain.linearRampToValueAtTime(len > 0.5 ? 14 : 6, t + 0.5);
	vib.connect(depth);
	for (const cents of [-4, 4]) {
		const osc = audio.createOscillator();
		osc.type = 'sawtooth';
		osc.frequency.value = f;
		osc.detune.value = cents;
		depth.connect(osc.detune);
		const og = audio.createGain();
		og.gain.value = 0.5;
		osc.connect(og).connect(body);
		osc.start(t);
		osc.stop(end + 0.5);
	}
	vib.start(t);
	vib.stop(end + 0.5);
}

/** A concertina: two slightly beating reeds, quick to speak, a little nasal. */
function concertina(audio: AudioContext, dest: AudioNode, midis: number[], t: number, len: number, vel: number) {
	const end = t + len;
	const filter = audio.createBiquadFilter();
	filter.type = 'lowpass';
	filter.frequency.value = 1900;
	const g = audio.createGain();
	const peak = (0.045 * vel) / Math.sqrt(midis.length);
	g.gain.setValueAtTime(0.0001, t);
	g.gain.exponentialRampToValueAtTime(peak, t + 0.04);
	g.gain.setTargetAtTime(peak * 0.85, t + 0.06, 0.3);
	g.gain.setTargetAtTime(0.0001, end, 0.06);
	filter.connect(g).connect(dest);
	for (const m of midis) {
		for (const [type, cents, level] of [
			['square', -6, 0.35],
			['triangle', 6, 0.65]
		] as const) {
			const osc = audio.createOscillator();
			osc.type = type;
			osc.frequency.value = mtof(m);
			osc.detune.value = cents;
			const og = audio.createGain();
			og.gain.value = level;
			osc.connect(og).connect(filter);
			osc.start(t);
			osc.stop(end + 0.4);
		}
	}
}

/** A nylon-strung pluck: bright for an instant, then warm and quick to fade. */
function guitar(audio: AudioContext, dest: AudioNode, midi: number, t: number, vel: number) {
	const f = mtof(midi);
	const ring = midi < 52 ? 1.6 : 1.1;
	const tone = audio.createBiquadFilter();
	tone.type = 'lowpass';
	tone.frequency.setValueAtTime(Math.min(7000, f * 8), t);
	tone.frequency.exponentialRampToValueAtTime(Math.max(500, f * 1.6), t + 0.4);
	tone.connect(dest);
	for (const [n, amp] of [
		[1, 1],
		[2, 0.5],
		[3, 0.28],
		[4, 0.14]
	] as const) {
		const osc = audio.createOscillator();
		osc.type = n === 1 ? 'triangle' : 'sine';
		osc.frequency.value = f * n;
		const g = env(audio, t, amp * vel * 0.05, 0.004, ring / n);
		osc.connect(g).connect(tone);
		osc.start(t);
		osc.stop(t + ring + 0.1);
	}
}

/** A bodhrán, played with the hand, felt more than heard. */
function bodhran(audio: AudioContext, dest: AudioNode, t: number, vel: number) {
	const osc = audio.createOscillator();
	osc.type = 'sine';
	osc.frequency.setValueAtTime(110, t);
	osc.frequency.exponentialRampToValueAtTime(52, t + 0.18);
	const g = env(audio, t, 0.12 * vel, 0.004, 0.28);
	osc.connect(g).connect(dest);
	osc.start(t);
	osc.stop(t + 0.35);
}

function chordOf(bar: Bar) {
	const third = bar.kind === 'min' ? 3 : 4;
	const top = bar.kind === 'dom' ? 10 : 7;
	const base = bar.root + 12;
	return [base, base + third, base + top].map((m) => (m < 55 ? m + 12 : m));
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
		const human = () => (Math.random() - 0.5) * 0.018;

		guitar(audio, panned(audio, -0.3, stem), bar.root + PICK[bar.kind][beat], t + human(), beat === 0 ? 0.7 : 0.42 + Math.random() * 0.08);
		if (beat === 0) {
			layers.bass(mtof(bar.root), t);
			if (part.squeeze) concertina(audio, panned(audio, 0.35, stem), chordOf(bar), t + 0.02, BAR * STEP - 0.1, 0.32);
		}
		if (part.drum && (beat === 0 || beat === 3)) bodhran(audio, panned(audio, 0.1, stem), t, beat === 0 ? 0.8 : 0.5);

		for (const [midi, at, len] of bar.tune) {
			if (at !== beat) continue;
			const vel = part.vel * (at === 0 ? 1 : 0.88) + (Math.random() - 0.5) * 0.05;
			const dur = len * STEP * 0.96;
			if (part.lead === 'fiddle') {
				if (len >= 2 && Math.random() < 0.25) fiddle(audio, panned(audio, 0.15, stem), midi + 2, t - 0.06, 0.07, vel * 0.6);
				fiddle(audio, panned(audio, 0.15, stem), midi, t + human(), dur, vel);
			} else concertina(audio, panned(audio, 0.25, stem), [midi], t + human(), dur, vel * 1.1);
			layers.note(mtof(midi - 12), t, step);
		}

		const cadence = inPart === 7 && beat >= 3;
		nextAt += STEP * (cadence ? 1.18 : 1);
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

function sfxOut(audio: AudioContext, pan = 0) {
	const gain = audio.createGain();
	const p = audio.createStereoPanner();
	p.pan.value = Math.max(-1, Math.min(1, pan));
	gain.connect(p);
	connectSfx(p);
	return gain;
}

/** Pasteboard on baize: a soft papery snap with a low pat underneath, no hiss. */
function snap(audio: AudioContext, out: AudioNode, t: number, peak: number) {
	const click = audio.createOscillator();
	click.type = 'triangle';
	click.frequency.setValueAtTime(2400 + Math.random() * 500, t);
	click.frequency.exponentialRampToValueAtTime(900, t + 0.02);
	const cg = env(audio, t, peak * 0.35, 0.001, 0.025);
	click.connect(cg).connect(out);
	click.start(t);
	click.stop(t + 0.05);
	const pat = audio.createOscillator();
	pat.type = 'sine';
	pat.frequency.setValueAtTime(190, t);
	pat.frequency.exponentialRampToValueAtTime(90, t + 0.06);
	const pg = env(audio, t, peak, 0.002, 0.07);
	pat.connect(pg).connect(out);
	pat.start(t);
	pat.stop(t + 0.1);
}

/** Wood on wood: a peg pressed home, a knuckle on the table. */
function tock(audio: AudioContext, out: AudioNode, t: number, peak: number, pitch = 1) {
	for (const [ratio, level, len] of [
		[1, 1, 0.07],
		[2.7, 0.35, 0.03]
	] as const) {
		const osc = audio.createOscillator();
		osc.type = 'sine';
		osc.frequency.setValueAtTime(520 * pitch * ratio, t);
		osc.frequency.exponentialRampToValueAtTime(380 * pitch * ratio, t + len);
		const g = env(audio, t, peak * level, 0.001, len);
		osc.connect(g).connect(out);
		osc.start(t);
		osc.stop(t + len + 0.05);
	}
}

export function playCard(pan = 0) {
	const audio = sfxContext();
	if (!audio) return;
	snap(audio, sfxOut(audio, pan * 0.5), audio.currentTime, 0.16);
}

export function playDeal(cards: number) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	for (let i = 0; i < cards; i++) snap(audio, sfxOut(audio, (i % 4) * 0.3 - 0.45), t + 0.06 + i * 0.058, 0.07);
}

export function playPass() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = sfxOut(audio, 0);
	snap(audio, out, t, 0.08);
	snap(audio, out, t + 0.07, 0.06);
}

export function playSelect() {
	const audio = sfxContext();
	if (!audio) return;
	tock(audio, sfxOut(audio, 0), audio.currentTime, 0.05, 1.5);
}

/** Pegs hop along the cribbage board, one tock a hole up to a handful. */
export function playPeg(points: number) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime + 0.05;
	const out = sfxOut(audio, 0.2);
	const hops = Math.min(6, Math.max(1, points));
	for (let i = 0; i < hops; i++) tock(audio, out, t + i * 0.07, 0.09, 0.95 + i * 0.03);
}

/** Your turn: two soft notes on the concertina. */
export function playTurn() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime + 0.02;
	const out = sfxOut(audio, 0);
	concertina(audio, out, [74], t, 0.12, 0.5);
	concertina(audio, out, [78], t + 0.12, 0.22, 0.45);
}

export function playKnock() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = sfxOut(audio, 0);
	tock(audio, out, t, 0.2, 0.42);
	tock(audio, out, t + 0.13, 0.18, 0.4);
}

/** The fiddler tears off a run and someone thumps the table. */
export function playCheer() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime + 0.1;
	const out = sfxOut(audio, 0.15);
	[74, 76, 78, 79, 81, 83, 85, 86].forEach((m, i) => fiddle(audio, out, m, t + i * 0.07, 0.1, 0.8));
	fiddle(audio, out, 86, t + 0.56, 0.5, 0.75);
	const thumps = sfxOut(audio, -0.2);
	for (const at of [0.05, 0.3, 0.55]) tock(audio, thumps, t + at, 0.16, 0.36);
}

/** Someone goes alone: the room goes quiet under one low concertina chord. */
export function playHush() {
	const audio = sfxContext();
	if (!audio) return;
	concertina(audio, sfxOut(audio, 0), [50, 57, 62, 65], audio.currentTime + 0.05, 1.4, 0.6);
}

export function playWin() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime + 0.25;
	const out = sfxOut(audio, 0);
	concertina(audio, out, [62, 66, 69], t, 1.6, 0.6);
	[74, 78, 81, 86].forEach((m, i) => fiddle(audio, out, m, t + i * 0.16, i === 3 ? 1.1 : 0.16, 0.8));
	for (const [m, at] of [
		[50, 0],
		[57, 0.08],
		[62, 0.16],
		[66, 0.24]
	] as const)
		guitar(audio, out, m, t + 0.6 + at, 0.9);
}

export function playLose() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime + 0.25;
	const out = sfxOut(audio, 0);
	[71, 69, 66, 64, 62].forEach((m, i) => fiddle(audio, out, m, t + i * 0.26, i === 4 ? 1.2 : 0.26, 0.6));
	concertina(audio, out, [47, 54, 59, 62], t + 1, 1.8, 0.4);
}
