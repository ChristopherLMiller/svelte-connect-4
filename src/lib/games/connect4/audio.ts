import {
	connectSfx,
	getAudioContext,
	getMusicBus,
	isMusicOn,
	sfxContext
} from '$lib/audio/core';

let musicStarted = false;
let schedulerId: number | null = null;
let nextStepTime = 0;
let stepIndex = 0;
let sectionIndex = 0;
let trackIndex = 0;
let stem: GainNode | null = null;
let liveSources: Array<OscillatorNode | AudioBufferSourceNode> = [];
let drumOut: GainNode | null = null;
let bassOut: GainNode | null = null;
let leadOut: GainNode | null = null;
let chordOut: GainNode | null = null;
let noise1: AudioBuffer | null = null;
const TRACK_EVENT = 'connect4-music-track';

function sfx(): AudioContext | null {
	return sfxContext();
}

function env(audio: AudioContext, start: number, peak: number, attack: number, release: number) {
	const gain = audio.createGain();
	gain.gain.setValueAtTime(0.0001, start);
	gain.gain.exponentialRampToValueAtTime(peak, start + attack);
	gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + release);
	return gain;
}

function out(node: AudioNode) {
	connectSfx(node);
}

type Kit = {
	kick: string;
	snare: string;
	hat: string;
};

type Phrase = {
	kit: Kit;
	bass: number[];
	lead: number[];
	chords: Array<[number, number[]]>;
};

type TrackDef = {
	name: string;
	bpm: number;
	root: number;
	scale: number[];
	swing: number;
	delay: number;
	feedback: number;
	bassCut: number;
	verse: Phrase;
	chorus: Phrase;
};

const TRACKS: TrackDef[] = [
	{
		name: 'Floor Lights',
		bpm: 108,
		root: 38,
		scale: [0, 2, 3, 5, 7, 8, 10],
		swing: 0.1,
		delay: 0.21,
		feedback: 0.17,
		bassCut: 400,
		verse: {
			kit: { kick: 'x---x---x---x---', snare: '----x-------x---', hat: 'x-x-x-x-x-x-x-x-' },
			bass: [0, -1, -1, 0, 3, -1, 0, -1, 5, -1, -1, 3, 0, -1, 7, -1],
			lead: [0, -1, 3, 5, 7, -1, 5, 3, 0, 2, 3, -1, 5, 7, 5, -1, 8, 7, 5, 3, 5, -1, 3, 0, 3, 5, 7, 8, 7, 5, 3, -1],
			chords: [
				[0, [0, 2, 4]],
				[8, [3, 5, 0]]
			]
		},
		chorus: {
			kit: { kick: 'x---x-x-x---x---', snare: '----x-------x--x', hat: 'x-xxx-x-x-xxx-x-' },
			bass: [0, 0, -1, 5, -1, 0, 3, -1, 7, 7, -1, 5, 3, -1, 0, 0],
			lead: [7, -1, 5, 3, 0, 3, 5, 7, 10, 8, 7, 5, 7, -1, 5, 3, 8, 7, 5, -1, 7, 5, 3, 0, 3, 5, 7, 10, 8, 7, 5, -1],
			chords: [
				[0, [0, 2, 4]],
				[4, [5, 0, 2]],
				[10, [3, 5, 0]]
			]
		}
	},
	{
		name: 'Pulse Grid',
		bpm: 116,
		root: 45,
		scale: [0, 2, 3, 5, 7, 8, 10],
		swing: 0.08,
		delay: 0.19,
		feedback: 0.16,
		bassCut: 420,
		verse: {
			kit: { kick: 'x---x---x---x---', snare: '----x-------x---', hat: 'x-x-x-x-x-x-x-x-' },
			bass: [0, -1, -1, 0, 0, -1, 7, -1, 0, -1, -1, 3, 5, -1, 0, -1],
			lead: [4, -1, 2, -1, 0, -1, -1, 2, 4, 7, 4, -1, 2, 0, -1, -1, 7, -1, 4, -1, 2, 4, 2, 0, 4, -1, 2, 0, -1, 2, 4, -1],
			chords: [
				[0, [0, 2, 4]],
				[8, [5, 0, 2]]
			]
		},
		chorus: {
			kit: { kick: 'x---x---x---x-x-', snare: '----x-------x--x', hat: 'x-xxx-x-x-xxx-x-' },
			bass: [0, 0, -1, 7, -1, 0, 5, -1, 3, 3, -1, 0, 5, -1, 7, 0],
			lead: [7, -1, 4, 5, 7, -1, 9, 7, 5, 4, 2, 0, 2, 4, 7, -1, 9, 7, 4, -1, 7, 5, 4, 2, 0, 2, 4, 7, 5, 4, 2, 0],
			chords: [
				[0, [0, 2, 4]],
				[6, [3, 5, 0]],
				[12, [5, 0, 2]]
			]
		}
	},
	{
		name: 'Helios Run',
		bpm: 100,
		root: 42,
		scale: [0, 2, 4, 6, 7, 9, 11],
		swing: 0.12,
		delay: 0.22,
		feedback: 0.18,
		bassCut: 380,
		verse: {
			kit: { kick: 'x---x---x-x-x---', snare: '----x-------x---', hat: '--x---x---x---x-' },
			bass: [0, -1, 4, -1, 0, -1, 7, -1, 2, -1, 4, -1, 0, 4, 7, -1],
			lead: [4, -1, 6, -1, 7, -1, 9, -1, 7, -1, 6, 4, 2, -1, 4, -1, 7, -1, 9, 11, 9, 7, 6, 4, 2, 4, 6, 7, 4, -1, 0, -1],
			chords: [
				[0, [0, 2, 4]],
				[8, [4, 6, 1]]
			]
		},
		chorus: {
			kit: { kick: 'x--x--x---x--x--', snare: '----x--x----x---', hat: 'x-x-x-x-x-x-x-xx' },
			bass: [0, 4, -1, 7, 0, -1, 6, 4, 2, 2, -1, 4, 7, -1, 4, 0],
			lead: [7, -1, 9, 11, 9, 7, 6, 4, 11, 9, 7, -1, 9, 7, 4, 2, 4, 6, 7, 9, 7, 4, 2, 0, 6, 7, 9, 11, 9, 7, 4, -1],
			chords: [
				[0, [0, 2, 4]],
				[4, [2, 4, 6]],
				[10, [4, 6, 1]]
			]
		}
	},
	{
		name: 'Ion Chase',
		bpm: 126,
		root: 40,
		scale: [0, 1, 3, 5, 7, 8, 10],
		swing: 0.04,
		delay: 0.16,
		feedback: 0.14,
		bassCut: 460,
		verse: {
			kit: { kick: 'x---x-x-x---x-x-', snare: '----x-------x--x', hat: 'x-x-x-x-x-x-x-x-' },
			bass: [0, -1, 0, 1, 0, -1, 3, -1, 0, 0, -1, 5, 3, -1, 1, 0],
			lead: [0, 1, 3, -1, 5, 3, 1, 0, 7, -1, 5, 3, 5, -1, 3, 1, 0, -1, 1, 3, 5, 7, 5, 3, 8, 7, 5, 3, 1, 0, 1, 3],
			chords: [
				[0, [0, 2, 4]],
				[10, [1, 3, 5]]
			]
		},
		chorus: {
			kit: { kick: 'x-x-x---x-x-x-x-', snare: '----x--x----x-x-', hat: 'xxxxxxxxxxxxxxxx' },
			bass: [0, 0, 1, -1, 0, 3, -1, 5, 0, -1, 1, 0, 3, 5, 3, 0],
			lead: [7, 5, 3, 1, 0, 1, 3, 5, 8, 7, 5, -1, 7, 5, 3, 1, 5, 7, 8, 10, 8, 7, 5, 3, 0, 1, 3, 5, 3, 1, 0, -1],
			chords: [
				[0, [0, 2, 4]],
				[4, [1, 3, 5]],
				[8, [3, 5, 0]],
				[12, [0, 2, 4]]
			]
		}
	},
	{
		name: 'Nova Line',
		bpm: 104,
		root: 36,
		scale: [0, 2, 4, 7, 9],
		swing: 0.14,
		delay: 0.24,
		feedback: 0.2,
		bassCut: 340,
		verse: {
			kit: { kick: 'x-----x-x-------', snare: '----x-------x---', hat: 'x-x---x-x-x---x-' },
			bass: [0, -1, -1, -1, 4, -1, -1, 0, 7, -1, 4, -1, 0, -1, 2, 0],
			lead: [4, -1, -1, 2, 4, 7, -1, 4, 9, -1, 7, 4, 2, -1, 0, -1, 7, -1, 4, 7, 9, 11, 9, 7, 4, 2, 0, 2, 4, -1, -1, -1],
			chords: [
				[0, [0, 2, 4]],
				[8, [2, 4, 1]]
			]
		},
		chorus: {
			kit: { kick: 'x---x---x---x---', snare: '----x-------x---', hat: '--x-x-x---x-x-x-' },
			bass: [0, -1, 2, 0, 4, -1, 7, 4, 0, 0, -1, 4, 7, -1, 4, 0],
			lead: [7, -1, 4, -1, 9, 7, 4, 2, 11, 9, 7, 4, 9, -1, 7, -1, 4, 7, 9, 11, 9, 7, 4, 2, 0, 2, 4, 7, 4, 2, 0, -1],
			chords: [
				[0, [0, 2, 4]],
				[6, [4, 1, 3]],
				[12, [2, 4, 1]]
			]
		}
	}
];

const STEPS_PER_SECTION = 128;
const SECTIONS_PER_TRACK = 8;

type SectionPatch = {
	drop: boolean;
	lift: boolean;
};

let section: SectionPatch = { drop: true, lift: false };

function midiHz(midi: number) {
	return 440 * 2 ** ((midi - 69) / 12);
}

function degreeHz(track: TrackDef, degree: number, oct = 0) {
	const n = track.scale.length;
	const wrapped = ((degree % n) + n) % n;
	const rise = Math.floor(degree / n) + oct;
	return midiHz(track.root + track.scale[wrapped] + rise * 12);
}

function emitTrack() {
	if (typeof window === 'undefined') return;
	window.dispatchEvent(new CustomEvent(TRACK_EVENT, { detail: TRACKS[trackIndex].name }));
}

export function getMusicTrackName() {
	return TRACKS[trackIndex].name;
}

export function getMusicTrackIndex() {
	return trackIndex;
}

export function restoreMusicTrack(index: number) {
	const next = ((index % TRACKS.length) + TRACKS.length) % TRACKS.length;
	if (musicStarted) switchTrack(next);
	else {
		trackIndex = next;
		emitTrack();
	}
}

export function onMusicTrack(listener: (name: string) => void) {
	if (typeof window === 'undefined') return () => undefined;
	const handler = (event: Event) => listener((event as CustomEvent<string>).detail);
	window.addEventListener(TRACK_EVENT, handler);
	return () => window.removeEventListener(TRACK_EVENT, handler);
}

export function cycleMusicTrack() {
	const next = (trackIndex + 1) % TRACKS.length;
	if (musicStarted) switchTrack(next);
	else {
		trackIndex = next;
		emitTrack();
	}
	return TRACKS[trackIndex].name;
}

function makeSection(index: number): SectionPatch {
	return {
		drop: index % 4 !== 3,
		lift: index % 2 === 1
	};
}

function noiseBuf(audio: AudioContext) {
	if (!noise1) {
		noise1 = audio.createBuffer(1, Math.floor(audio.sampleRate * 0.4), audio.sampleRate);
		const data = noise1.getChannelData(0);
		for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
	}
	return noise1;
}

function envGain(audio: AudioContext, t: number, peak: number, attack: number, release: number) {
	const gain = audio.createGain();
	gain.gain.setValueAtTime(0.0001, t);
	gain.gain.exponentialRampToValueAtTime(peak, t + Math.max(0.001, attack));
	gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
	return gain;
}

function burst(audio: AudioContext, t: number) {
	const src = audio.createBufferSource();
	src.buffer = noiseBuf(audio);
	src.start(t);
	src.stop(t + 0.35);
	return src;
}

function startKick(audio: AudioContext, t: number, dest: AudioNode) {
	const osc = audio.createOscillator();
	osc.type = 'sine';
	osc.frequency.setValueAtTime(150, t);
	osc.frequency.exponentialRampToValueAtTime(46, t + 0.08);
	const body = envGain(audio, t, 0.32, 0.002, 0.16);
	osc.connect(body).connect(dest);
	osc.start(t);
	osc.stop(t + 0.2);

	const click = burst(audio, t);
	const hp = audio.createBiquadFilter();
	hp.type = 'highpass';
	hp.frequency.value = 1800;
	const snap = envGain(audio, t, 0.07, 0.001, 0.018);
	click.connect(hp).connect(snap).connect(dest);
}

function startSnare(audio: AudioContext, t: number, dest: AudioNode, hot = false) {
	const noise = burst(audio, t);
	const bp = audio.createBiquadFilter();
	bp.type = 'bandpass';
	bp.frequency.value = 1800;
	bp.Q.value = 1.1;
	const air = envGain(audio, t, hot ? 0.16 : 0.12, 0.002, 0.09);
	noise.connect(bp).connect(air).connect(dest);

	const tone = audio.createOscillator();
	tone.type = 'triangle';
	tone.frequency.setValueAtTime(196, t);
	tone.frequency.exponentialRampToValueAtTime(128, t + 0.08);
	const thud = envGain(audio, t, 0.06, 0.002, 0.08);
	tone.connect(thud).connect(dest);
	tone.start(t);
	tone.stop(t + 0.12);
}

function startHat(audio: AudioContext, t: number, dest: AudioNode, open: boolean, busy: boolean) {
	const noise = burst(audio, t);
	const hp = audio.createBiquadFilter();
	hp.type = 'highpass';
	hp.frequency.value = open ? 6500 : 9000;
	const peak = busy ? 0.02 : open ? 0.038 : 0.046;
	const hat = envGain(audio, t, peak, 0.001, open ? 0.09 : 0.028);
	noise.connect(hp).connect(hat).connect(dest);
}

function startBass(audio: AudioContext, freq: number, t: number, dur: number, dest: AudioNode, cut: number) {
	const osc = audio.createOscillator();
	osc.type = 'sawtooth';
	osc.frequency.setValueAtTime(freq, t);
	const lp = audio.createBiquadFilter();
	lp.type = 'lowpass';
	lp.frequency.setValueAtTime(cut, t);
	lp.frequency.exponentialRampToValueAtTime(Math.max(90, cut * 0.45), t + dur);
	lp.Q.value = 1.4;
	const gain = envGain(audio, t, 0.16, 0.006, dur);
	osc.connect(lp).connect(gain).connect(dest);
	osc.start(t);
	osc.stop(t + dur + 0.04);
}

function startLead(audio: AudioContext, freq: number, t: number, dur: number, dest: AudioNode, oct = 0) {
	const a = audio.createOscillator();
	const b = audio.createOscillator();
	a.type = 'triangle';
	b.type = 'square';
	a.frequency.setValueAtTime(freq, t);
	b.frequency.setValueAtTime(freq * 1.004, t);
	const mix = audio.createGain();
	mix.gain.value = 1;
	const quiet = audio.createGain();
	quiet.gain.value = 0.22;
	const lp = audio.createBiquadFilter();
	lp.type = 'lowpass';
	lp.frequency.value = 2400 + oct * 400;
	const gain = envGain(audio, t, 0.08, 0.01, dur);
	a.connect(mix);
	b.connect(quiet).connect(mix);
	mix.connect(lp).connect(gain).connect(dest);
	a.start(t);
	b.start(t);
	a.stop(t + dur + 0.05);
	b.stop(t + dur + 0.05);
}

function startChord(audio: AudioContext, freqs: number[], t: number, dest: AudioNode) {
	for (const freq of freqs) {
		const osc = audio.createOscillator();
		osc.type = 'sine';
		osc.frequency.setValueAtTime(freq, t);
		const gain = envGain(audio, t, 0.038, 0.012, 0.42);
		osc.connect(gain).connect(dest);
		osc.start(t);
		osc.stop(t + 0.48);
	}
}

function hit(pat: string, step: number) {
	return pat[step % 16] === 'x';
}

function phraseOf(track: TrackDef, lift: boolean): Phrase {
	return lift ? track.chorus : track.verse;
}

function noteDur(pat: number[], i: number, sixteenth: number) {
	return pat[(i + 1) % pat.length] < 0 ? sixteenth * 2.4 : sixteenth * 0.92;
}

function teardownStem(when: number) {
	const old = stem;
	const dying = liveSources.slice();
	liveSources = [];
	drumOut = bassOut = leadOut = chordOut = null;
	stem = null;
	if (old) {
		old.gain.setTargetAtTime(0.0001, when, 0.06);
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
		}, 400);
	}
}

export function stopMusic() {
	musicStarted = false;
	if (schedulerId != null) {
		clearTimeout(schedulerId);
		schedulerId = null;
	}
	const audio = getAudioContext();
	if (audio) teardownStem(audio.currentTime);
}

export function startConnect4Music() {
	startMusic();
}

export function stopConnect4Music() {
	stopMusic();
}

function switchTrack(index: number) {
	const audio = getAudioContext();
	if (!audio || !getMusicBus()) return;
	teardownStem(audio.currentTime);
	trackIndex = index;
	sectionIndex = 0;
	stepIndex = 0;
	section = makeSection(0);
	bootGraph(audio);
	nextStepTime = audio.currentTime + 0.06;
	emitTrack();
}

function bootGraph(audio: AudioContext) {
	const bus = getMusicBus();
	if (!bus) return;
	const track = TRACKS[trackIndex];
	const t = audio.currentTime;
	stem = audio.createGain();
	stem.gain.setValueAtTime(0.0001, t);
	stem.gain.exponentialRampToValueAtTime(1, t + 0.05);

	const comp = audio.createDynamicsCompressor();
	comp.threshold.value = -16;
	comp.knee.value = 10;
	comp.ratio.value = 3.4;
	comp.attack.value = 0.004;
	comp.release.value = 0.11;

	drumOut = audio.createGain();
	drumOut.gain.value = 1;
	bassOut = audio.createGain();
	bassOut.gain.value = 1;
	leadOut = audio.createGain();
	leadOut.gain.value = 0.95;
	chordOut = audio.createGain();
	chordOut.gain.value = 0.8;

	const delay = audio.createDelay(1);
	delay.delayTime.value = track.delay;
	const feedback = audio.createGain();
	feedback.gain.value = track.feedback;
	const delayMix = audio.createGain();
	delayMix.gain.value = 0.16;
	delay.connect(feedback).connect(delay);
	delay.connect(delayMix).connect(comp);

	drumOut.connect(comp);
	bassOut.connect(comp);
	leadOut.connect(comp);
	leadOut.connect(delay);
	chordOut.connect(comp);
	chordOut.connect(delay);
	comp.connect(stem);
	stem.connect(bus);
}

function scheduleStep(audio: AudioContext, step: number, t: number) {
	if (!drumOut || !bassOut || !leadOut || !chordOut) return;
	const track = TRACKS[trackIndex];
	const phrase = phraseOf(track, section.lift);
	const sixteenth = 15 / track.bpm;
	const i = step % 16;
	const leadI = step % phrase.lead.length;
	const bar = Math.floor(step / 16) % 8;
	const fill = bar === 7 && i >= 12;
	const busyHats = phrase.kit.hat === 'xxxxxxxxxxxxxxxx';

	if (section.drop) {
		if (hit(phrase.kit.kick, i) || (fill && i % 2 === 0)) {
			startKick(audio, t, drumOut);
			bassOut.gain.cancelScheduledValues(t);
			bassOut.gain.setValueAtTime(0.42, t);
			bassOut.gain.exponentialRampToValueAtTime(1, t + 0.09);
		}
		if (hit(phrase.kit.snare, i) || (fill && i >= 12)) {
			startSnare(audio, t, drumOut, fill);
		}
	}

	if (hit(phrase.kit.hat, i) || (section.lift && i % 2 === 1 && !busyHats)) {
		startHat(audio, t, drumOut, i === 14 || (section.lift && i === 6), busyHats);
	}

	const bassDeg = phrase.bass[i];
	if (bassDeg >= 0 && (section.drop || i % 4 === 0)) {
		startBass(
			audio,
			degreeHz(track, bassDeg, -1),
			t,
			noteDur(phrase.bass, i, sixteenth),
			bassOut,
			track.bassCut
		);
	}

	const leadDeg = phrase.lead[leadI];
	if (leadDeg >= 0) {
		startLead(
			audio,
			degreeHz(track, leadDeg, section.lift ? 2 : 1),
			t,
			noteDur(phrase.lead, leadI, sixteenth),
			leadOut,
			section.lift ? 1 : 0
		);
	}

	for (const [when, degrees] of phrase.chords) {
		if (when === i && (bar % 2 === 0 || section.lift)) {
			startChord(
				audio,
				degrees.map((deg) => degreeHz(track, deg, 1)),
				t,
				chordOut
			);
		}
	}
}

function scheduler() {
	const audio = getAudioContext();
	if (!audio || !musicStarted || !isMusicOn()) {
		schedulerId = null;
		return;
	}
	const track = TRACKS[trackIndex];
	const stepDt = 15 / track.bpm;
	const horizon = audio.currentTime + 0.18;
	while (nextStepTime < horizon) {
		const swung = nextStepTime + (stepIndex % 2 === 1 ? track.swing * stepDt : 0);
		scheduleStep(audio, stepIndex, swung);
		stepIndex += 1;
		nextStepTime += stepDt;
		if (stepIndex > 0 && stepIndex % STEPS_PER_SECTION === 0) {
			sectionIndex += 1;
			if (sectionIndex >= SECTIONS_PER_TRACK) {
				switchTrack((trackIndex + 1) % TRACKS.length);
				break;
			}
			section = makeSection(sectionIndex);
		}
	}
	schedulerId = window.setTimeout(scheduler, 25);
}

export function startMusic() {
	const audio = getAudioContext();
	if (!audio || !getMusicBus() || musicStarted || !isMusicOn()) return;
	musicStarted = true;
	sectionIndex = 0;
	stepIndex = 0;
	section = makeSection(0);
	bootGraph(audio);
	nextStepTime = audio.currentTime + 0.04;
	emitTrack();
	scheduler();
}

export function playHover() {
	const audio = sfx();
	if (!audio) return;
	const t = audio.currentTime;
	const osc = audio.createOscillator();
	const gain = env(audio, t, 0.03, 0.01, 0.06);
	osc.type = 'triangle';
	osc.frequency.setValueAtTime(740, t);
	osc.connect(gain);
	out(gain);
	osc.start(t);
	osc.stop(t + 0.08);
}

export function playSelect() {
	const audio = sfx();
	if (!audio) return;
	const t = audio.currentTime;
	const osc = audio.createOscillator();
	const gain = env(audio, t, 0.05, 0.008, 0.12);
	osc.type = 'sine';
	osc.frequency.setValueAtTime(420, t);
	osc.frequency.exponentialRampToValueAtTime(680, t + 0.08);
	osc.connect(gain);
	out(gain);
	osc.start(t);
	osc.stop(t + 0.14);
}

export function playDrop() {
	const audio = sfx();
	if (!audio) return;
	const t = audio.currentTime;
	const osc = audio.createOscillator();
	const filter = audio.createBiquadFilter();
	const gain = env(audio, t, 0.045, 0.02, 0.22);
	osc.type = 'sawtooth';
	osc.frequency.setValueAtTime(220, t);
	osc.frequency.exponentialRampToValueAtTime(90, t + 0.2);
	filter.type = 'lowpass';
	filter.frequency.setValueAtTime(900, t);
	filter.frequency.exponentialRampToValueAtTime(220, t + 0.22);
	osc.connect(filter).connect(gain);
	out(gain);
	osc.start(t);
	osc.stop(t + 0.24);
}

export function playBounce(impact: number) {
	const audio = sfx();
	if (!audio) return;
	const t = audio.currentTime;
	const osc = audio.createOscillator();
	const noise = audio.createBufferSource();
	const buffer = audio.createBuffer(1, audio.sampleRate * 0.12, audio.sampleRate);
	const data = buffer.getChannelData(0);
	for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
	noise.buffer = buffer;
	const filter = audio.createBiquadFilter();
	filter.type = 'lowpass';
	filter.frequency.value = 380 + impact * 420;
	const thud = env(audio, t, 0.09 + impact * 0.12, 0.004, 0.14);
	osc.type = 'sine';
	osc.frequency.setValueAtTime(140 + impact * 40, t);
	osc.frequency.exponentialRampToValueAtTime(70, t + 0.12);
	osc.connect(thud);
	noise.connect(filter).connect(thud);
	out(thud);
	osc.start(t);
	noise.start(t);
	osc.stop(t + 0.16);
	noise.stop(t + 0.12);
}

export function playInvalid() {
	const audio = sfx();
	if (!audio) return;
	const t = audio.currentTime;
	const osc = audio.createOscillator();
	const gain = env(audio, t, 0.05, 0.01, 0.16);
	osc.type = 'square';
	osc.frequency.setValueAtTime(180, t);
	osc.frequency.linearRampToValueAtTime(120, t + 0.14);
	osc.connect(gain);
	out(gain);
	osc.start(t);
	osc.stop(t + 0.18);
}

export function playBlock() {
	const audio = sfx();
	if (!audio) return;
	const t = audio.currentTime;
	const bang = audio.createOscillator();
	const noise = audio.createBufferSource();
	const buffer = audio.createBuffer(1, audio.sampleRate * 0.22, audio.sampleRate);
	const data = buffer.getChannelData(0);
	for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
	noise.buffer = buffer;
	const filter = audio.createBiquadFilter();
	filter.type = 'bandpass';
	filter.frequency.setValueAtTime(420, t);
	filter.frequency.exponentialRampToValueAtTime(90, t + 0.2);
	const boom = env(audio, t, 0.22, 0.004, 0.28);
	bang.type = 'sawtooth';
	bang.frequency.setValueAtTime(90, t);
	bang.frequency.exponentialRampToValueAtTime(38, t + 0.22);
	bang.connect(boom);
	noise.connect(filter).connect(boom);
	out(boom);
	bang.start(t);
	noise.start(t);
	bang.stop(t + 0.28);
	noise.stop(t + 0.22);
	[740, 980, 1240].forEach((freq, i) => {
		const spark = audio.createOscillator();
		const gain = env(audio, t + 0.02 + i * 0.03, 0.05, 0.004, 0.12);
		spark.type = 'square';
		spark.frequency.value = freq;
		spark.connect(gain);
		out(gain);
		spark.start(t + 0.02 + i * 0.03);
		spark.stop(t + 0.16 + i * 0.03);
	});
}

export function playThreat() {
	const audio = sfx();
	if (!audio) return;
	const t = audio.currentTime;
	[620, 420].forEach((freq, i) => {
		const osc = audio.createOscillator();
		const gain = env(audio, t + i * 0.09, 0.055, 0.008, 0.16);
		osc.type = 'square';
		osc.frequency.setValueAtTime(freq, t + i * 0.09);
		osc.frequency.exponentialRampToValueAtTime(freq * 0.72, t + i * 0.09 + 0.14);
		osc.connect(gain);
		out(gain);
		osc.start(t + i * 0.09);
		osc.stop(t + i * 0.09 + 0.2);
	});
}

export function playLock() {
	const audio = sfx();
	if (!audio) return;
	const t = audio.currentTime;
	[880, 1175, 1568].forEach((freq, i) => {
		const osc = audio.createOscillator();
		const gain = env(audio, t + i * 0.045, 0.045, 0.006, 0.14);
		osc.type = 'triangle';
		osc.frequency.value = freq;
		osc.connect(gain);
		out(gain);
		osc.start(t + i * 0.045);
		osc.stop(t + i * 0.045 + 0.18);
	});
}

export function playWin() {
	const audio = sfx();
	if (!audio) return;
	const t = audio.currentTime;
	const notes = [523.25, 659.25, 783.99, 1046.5];
	notes.forEach((freq, i) => {
		const osc = audio.createOscillator();
		const gain = env(audio, t + i * 0.09, 0.07, 0.02, 0.32);
		osc.type = 'triangle';
		osc.frequency.value = freq;
		osc.connect(gain);
		out(gain);
		osc.start(t + i * 0.09);
		osc.stop(t + i * 0.09 + 0.38);
	});
}

export function playDraw() {
	const audio = sfx();
	if (!audio) return;
	const t = audio.currentTime;
	const osc = audio.createOscillator();
	const gain = env(audio, t, 0.04, 0.03, 0.4);
	osc.type = 'triangle';
	osc.frequency.setValueAtTime(330, t);
	osc.frequency.linearRampToValueAtTime(220, t + 0.4);
	osc.connect(gain);
	out(gain);
	osc.start(t);
	osc.stop(t + 0.45);
}
