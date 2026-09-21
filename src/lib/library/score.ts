import { getAudioContext, getMusicBus, isMusicOn } from '$lib/audio/core';

let running = false;
let timer: number | null = null;
let stem: GainNode | null = null;
let drums: GainNode | null = null;
let bassBus: GainNode | null = null;
let arpBus: GainNode | null = null;
let leadBus: GainNode | null = null;
let live: Array<OscillatorNode | AudioBufferSourceNode> = [];
let graph: AudioNode[] = [];
let step = 0;
let nextAt = 0;
let noiseCache: AudioBuffer | null = null;

const BPM = 150;
const SIXTEENTH = 60 / BPM / 4;
const LOOP = 128;

const KICK = 'x---x---x---x---'.repeat(8);
const SNARE = '----x-------x---'.repeat(8);
const HAT = 'x-x-x-x-x-x-x-x-'.repeat(8);
const OPEN = '--------------x-'.repeat(8);

const BASS = [
	110, 110, 220, 110, 164.81, 110, 220, 110,
	98, 98, 196, 98, 146.83, 98, 196, 98,
	87.31, 87.31, 174.61, 87.31, 130.81, 87.31, 174.61, 87.31,
	82.41, 82.41, 164.81, 103.83, 123.47, 82.41, 164.81, 82.41
];

const CHORDS: number[][] = [
	[220, 261.63, 329.63],
	[196, 246.94, 293.66],
	[174.61, 220, 261.63],
	[164.81, 207.65, 246.94]
];

const LEAD = [
	659.25, 0, 783.99, 0, 880, 0, 1046.5, 0, 880, 0, 783.99, 0, 659.25, 0, 587.33, 0,
	493.88, 0, 587.33, 0, 783.99, 0, 880, 0, 783.99, 0, 587.33, 0, 493.88, 0, 587.33, 0,
	1046.5, 0, 880, 0, 698.46, 0, 783.99, 0, 880, 0, 698.46, 0, 659.25, 0, 587.33, 0,
	659.25, 0, 830.61, 0, 987.77, 0, 1318.5, 0, 1174.7, 0, 987.77, 0, 830.61, 0, 659.25, 0
];

function hit(pattern: string, at: number) {
	return pattern[at % pattern.length] === 'x';
}

function noiseBuffer(audio: AudioContext) {
	if (noiseCache) return noiseCache;
	const length = Math.floor(audio.sampleRate * 0.45);
	const buffer = audio.createBuffer(1, length, audio.sampleRate);
	const data = buffer.getChannelData(0);
	for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
	noiseCache = buffer;
	return buffer;
}

function env(audio: AudioContext, start: number, peak: number, attack: number, release: number) {
	const gain = audio.createGain();
	gain.gain.setValueAtTime(0.0001, start);
	gain.gain.exponentialRampToValueAtTime(peak, start + Math.max(0.001, attack));
	gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + release);
	return gain;
}

function burst(audio: AudioContext, t: number, dur = 0.28) {
	const src = audio.createBufferSource();
	src.buffer = noiseBuffer(audio);
	src.start(t);
	src.stop(t + dur);
	live.push(src);
	return src;
}

function playKick(audio: AudioContext, t: number) {
	if (!drums) return;
	const osc = audio.createOscillator();
	osc.type = 'sine';
	osc.frequency.setValueAtTime(168, t);
	osc.frequency.exponentialRampToValueAtTime(48, t + 0.09);
	const body = env(audio, t, 0.26, 0.002, 0.16);
	osc.connect(body).connect(drums);
	osc.start(t);
	osc.stop(t + 0.2);
	live.push(osc);

	const click = burst(audio, t, 0.04);
	const hp = audio.createBiquadFilter();
	hp.type = 'highpass';
	hp.frequency.value = 2200;
	click.connect(hp).connect(env(audio, t, 0.05, 0.001, 0.016)).connect(drums);
}

function playSnare(audio: AudioContext, t: number, hot = false) {
	if (!drums) return;
	const noiseSrc = burst(audio, t, 0.16);
	const bp = audio.createBiquadFilter();
	bp.type = 'bandpass';
	bp.frequency.value = 1900;
	bp.Q.value = 1.2;
	noiseSrc.connect(bp).connect(env(audio, t, hot ? 0.14 : 0.1, 0.002, 0.1)).connect(drums);

	const tone = audio.createOscillator();
	tone.type = 'triangle';
	tone.frequency.setValueAtTime(210, t);
	tone.frequency.exponentialRampToValueAtTime(132, t + 0.07);
	tone.connect(env(audio, t, 0.055, 0.002, 0.08)).connect(drums);
	tone.start(t);
	tone.stop(t + 0.12);
	live.push(tone);
}

function playHat(audio: AudioContext, t: number, open: boolean) {
	if (!drums) return;
	const src = burst(audio, t, open ? 0.18 : 0.05);
	const hp = audio.createBiquadFilter();
	hp.type = 'highpass';
	hp.frequency.value = open ? 6200 : 9800;
	src.connect(hp).connect(env(audio, t, open ? 0.034 : 0.028, 0.001, open ? 0.12 : 0.028)).connect(drums);
}

function playCrash(audio: AudioContext, t: number) {
	if (!drums) return;
	const src = burst(audio, t, 0.4);
	const hp = audio.createBiquadFilter();
	hp.type = 'highpass';
	hp.frequency.value = 4800;
	src.connect(hp).connect(env(audio, t, 0.045, 0.004, 0.55)).connect(drums);
}

function playBass(audio: AudioContext, freq: number, t: number) {
	if (!bassBus || freq <= 0) return;
	const pulse = audio.createOscillator();
	const sub = audio.createOscillator();
	pulse.type = 'square';
	sub.type = 'triangle';
	pulse.frequency.setValueAtTime(freq * 1.06, t);
	pulse.frequency.exponentialRampToValueAtTime(freq, t + 0.03);
	sub.frequency.setValueAtTime(freq / 2, t);
	const filter = audio.createBiquadFilter();
	filter.type = 'lowpass';
	filter.frequency.setValueAtTime(920, t);
	filter.frequency.exponentialRampToValueAtTime(420, t + 0.12);
	const gain = env(audio, t, 0.09, 0.006, 0.16);
	pulse.connect(filter);
	sub.connect(filter);
	filter.connect(gain).connect(bassBus);
	pulse.start(t);
	sub.start(t);
	pulse.stop(t + 0.2);
	sub.stop(t + 0.2);
	live.push(pulse, sub);
}

function playArp(audio: AudioContext, freq: number, t: number) {
	if (!arpBus) return;
	const osc = audio.createOscillator();
	osc.type = 'square';
	osc.frequency.setValueAtTime(freq, t);
	const filter = audio.createBiquadFilter();
	filter.type = 'lowpass';
	filter.frequency.setValueAtTime(2800, t);
	filter.frequency.exponentialRampToValueAtTime(1100, t + 0.08);
	osc.connect(filter).connect(env(audio, t, 0.02, 0.004, 0.09)).connect(arpBus);
	osc.start(t);
	osc.stop(t + 0.12);
	live.push(osc);
}

function playStab(audio: AudioContext, chord: number[], t: number) {
	if (!arpBus) return;
	for (const freq of chord) {
		const osc = audio.createOscillator();
		osc.type = 'sawtooth';
		osc.frequency.setValueAtTime(freq * 2, t);
		const filter = audio.createBiquadFilter();
		filter.type = 'lowpass';
		filter.Q.value = 6;
		filter.frequency.setValueAtTime(2400, t);
		filter.frequency.exponentialRampToValueAtTime(700, t + 0.14);
		osc.connect(filter).connect(env(audio, t, 0.028, 0.006, 0.18)).connect(arpBus);
		osc.start(t);
		osc.stop(t + 0.22);
		live.push(osc);
	}
}

function playLead(audio: AudioContext, freq: number, t: number) {
	if (!leadBus || freq <= 0) return;
	const square = audio.createOscillator();
	const twin = audio.createOscillator();
	const bell = audio.createOscillator();
	const lfo = audio.createOscillator();
	const lfoGain = audio.createGain();
	square.type = 'square';
	twin.type = 'square';
	bell.type = 'sine';
	lfo.type = 'sine';
	square.frequency.setValueAtTime(freq * 0.96, t);
	square.frequency.exponentialRampToValueAtTime(freq, t + 0.028);
	twin.frequency.setValueAtTime(freq * 1.007, t);
	bell.frequency.setValueAtTime(freq * 2, t);
	lfo.frequency.value = 5.8;
	lfoGain.gain.value = 9;
	lfo.connect(lfoGain);
	lfoGain.connect(square.frequency);
	lfoGain.connect(twin.frequency);

	const filter = audio.createBiquadFilter();
	filter.type = 'lowpass';
	filter.frequency.setValueAtTime(3800, t);
	filter.frequency.exponentialRampToValueAtTime(1400, t + 0.16);
	const gain = env(audio, t, 0.046, 0.008, 0.2);
	square.connect(filter);
	twin.connect(filter);
	bell.connect(env(audio, t, 0.012, 0.004, 0.1)).connect(leadBus);
	filter.connect(gain).connect(leadBus);
	square.start(t);
	twin.start(t);
	bell.start(t);
	lfo.start(t);
	square.stop(t + 0.24);
	twin.stop(t + 0.24);
	bell.stop(t + 0.16);
	lfo.stop(t + 0.24);
	live.push(square, twin, bell, lfo);
}

function schedule() {
	if (!running) return;
	const audio = getAudioContext();
	if (!audio || !isMusicOn()) {
		timer = window.setTimeout(schedule, 80);
		return;
	}
	while (nextAt < audio.currentTime + 0.24) {
		const at = step % LOOP;
		const bar = Math.floor(at / 16) % 4;
		if (hit(KICK, at)) playKick(audio, nextAt);
		if (hit(SNARE, at) || (at === 126 || at === 127)) playSnare(audio, nextAt, at >= 126);
		if (hit(HAT, at) && !hit(OPEN, at)) playHat(audio, nextAt, false);
		if (hit(OPEN, at)) playHat(audio, nextAt, true);
		if (at === 0 || at === 64) playCrash(audio, nextAt);
		if (at % 16 === 0) playStab(audio, CHORDS[bar], nextAt);
		if (at % 2 === 0) playBass(audio, BASS[(at / 2) % BASS.length], nextAt);
		if (at < 64 && at % 2 === 0) playArp(audio, CHORDS[bar][(at / 2) % 3] * 2, nextAt);
		if (at >= 64) playLead(audio, LEAD[at - 64], nextAt);
		nextAt += SIXTEENTH;
		step += 1;
		if (live.length > 240) live = live.slice(-120);
	}
	timer = window.setTimeout(schedule, 90);
}

export function startLibraryScore() {
	if (running || !isMusicOn()) return;
	const audio = getAudioContext();
	const bus = getMusicBus();
	if (!audio || !bus) return;
	running = true;
	step = 0;

	stem = audio.createGain();
	stem.gain.setValueAtTime(0.0001, audio.currentTime);
	stem.gain.exponentialRampToValueAtTime(1, audio.currentTime + 0.45);
	stem.connect(bus);

	drums = audio.createGain();
	drums.gain.value = 1;
	bassBus = audio.createGain();
	bassBus.gain.value = 1;
	arpBus = audio.createGain();
	arpBus.gain.value = 1;
	leadBus = audio.createGain();
	leadBus.gain.value = 1;
	drums.connect(stem);
	bassBus.connect(stem);
	arpBus.connect(stem);

	const delay = audio.createDelay(0.6);
	delay.delayTime.value = SIXTEENTH * 3;
	const feedback = audio.createGain();
	feedback.gain.value = 0.28;
	const wet = audio.createGain();
	wet.gain.value = 0.38;
	leadBus.connect(stem);
	leadBus.connect(delay);
	delay.connect(wet).connect(stem);
	delay.connect(feedback).connect(delay);
	graph.push(delay, feedback, wet, drums, bassBus, arpBus, leadBus);

	nextAt = audio.currentTime + 0.08;
	schedule();
}

export function stopLibraryScore() {
	running = false;
	if (timer != null) {
		clearTimeout(timer);
		timer = null;
	}
	const audio = getAudioContext();
	const dying = live.slice();
	const oldGraph = graph.slice();
	const old = stem;
	live = [];
	graph = [];
	stem = null;
	drums = null;
	bassBus = null;
	arpBus = null;
	leadBus = null;
	if (old && audio) {
		old.gain.setTargetAtTime(0.0001, audio.currentTime, 0.08);
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
			for (const node of oldGraph) {
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
		}, 500);
	}
}
