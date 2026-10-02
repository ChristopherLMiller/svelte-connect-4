import { connectSfx, getAudioContext, getMusicBus, isMusicOn, sfxContext } from '$lib/audio/core';
import { MOON, type Player } from './types';

let running = false;
let timer: number | null = null;
let stem: GainNode | null = null;
let live: Array<OscillatorNode | AudioBufferSourceNode> = [];
let step = 0;
let nextAt = 0;

// D lydian: a bright, suspended colour for a sky that never quite resolves.
const PAD = [73.42, 110, 164.81, 207.65];
const CELESTA = [587.33, 659.25, 830.61, 880, 739.99, 659.25, 587.33, 493.88, 554.37, 659.25, 739.99, 880];
const BASS = [36.71, 41.2, 36.71, 30.87];
// Pentatonic ladder the flip chimes climb, one rung per disc.
const LADDER = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2, 9 / 4, 5 / 2, 3, 10 / 3, 4];

function env(audio: AudioContext, start: number, peak: number, attack: number, release: number) {
	const gain = audio.createGain();
	gain.gain.setValueAtTime(0.0001, start);
	gain.gain.exponentialRampToValueAtTime(peak, start + attack);
	gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + release);
	return gain;
}

const noiseCache = new Map<string, AudioBuffer>();

function noiseBuffer(audio: AudioContext, seconds = 1, color = 1) {
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

/** A struck bell: inharmonic partials that decay at different rates. */
function bell(audio: AudioContext, out: AudioNode, freq: number, t: number, peak: number, length: number, warm: boolean) {
	const partials = warm ? [1, 2, 2.76, 4.07] : [1, 2.4, 3.01, 5.4];
	const nodes: OscillatorNode[] = [];
	for (const [i, ratio] of partials.entries()) {
		const osc = audio.createOscillator();
		osc.type = warm && i === 0 ? 'triangle' : 'sine';
		osc.frequency.setValueAtTime(freq * ratio, t);
		const gain = env(audio, t, peak / (1 + i * 1.6), 0.004, length / (1 + i * 0.7));
		osc.connect(gain).connect(out);
		osc.start(t);
		osc.stop(t + length + 0.1);
		nodes.push(osc);
	}
	return nodes;
}

function schedule() {
	if (!running) return;
	const audio = getAudioContext();
	if (!audio || !isMusicOn() || !stem) {
		timer = window.setTimeout(schedule, 120);
		return;
	}
	while (nextAt < audio.currentTime + 0.3) {
		if (step % 3 !== 2) live.push(...bell(audio, stem, CELESTA[step % CELESTA.length], nextAt, 0.035, 2.6, false));
		if (step % 6 === 0) {
			const osc = audio.createOscillator();
			osc.type = 'sine';
			osc.frequency.setValueAtTime(BASS[(step / 6) % BASS.length], nextAt);
			const gain = env(audio, nextAt, 0.12, 0.5, 4.5);
			osc.connect(gain).connect(stem);
			osc.start(nextAt);
			osc.stop(nextAt + 5.2);
			live.push(osc);
		}
		nextAt += 1.15;
		step += 1;
	}
	live = live.slice(-80);
	timer = window.setTimeout(schedule, 140);
}

export function startEclipseMusic() {
	if (running || !isMusicOn()) return;
	const audio = getAudioContext();
	const bus = getMusicBus();
	if (!audio || !bus) return;
	running = true;
	step = 0;

	stem = audio.createGain();
	stem.gain.setValueAtTime(0.0001, audio.currentTime);
	stem.gain.exponentialRampToValueAtTime(1, audio.currentTime + 2.4);
	stem.connect(bus);

	const padGain = audio.createGain();
	padGain.gain.value = 0.13;
	const filter = audio.createBiquadFilter();
	filter.type = 'lowpass';
	filter.frequency.value = 900;
	filter.Q.value = 0.4;
	padGain.connect(filter).connect(stem);
	for (const freq of PAD) {
		for (const detune of [-7, 6]) {
			const osc = audio.createOscillator();
			osc.type = 'sine';
			osc.frequency.value = freq;
			osc.detune.value = detune;
			const g = audio.createGain();
			g.gain.value = 0.22;
			osc.connect(g).connect(padGain);
			osc.start();
			live.push(osc);
		}
	}

	const lfo = audio.createOscillator();
	const lfoGain = audio.createGain();
	lfo.frequency.value = 0.03;
	lfoGain.gain.value = 260;
	lfo.connect(lfoGain).connect(filter.frequency);
	lfo.start();
	live.push(lfo);

	// Faint night air through the dome's open slit.
	const air = audio.createBufferSource();
	air.buffer = noiseBuffer(audio, 3, 0.08);
	air.loop = true;
	const airFilter = audio.createBiquadFilter();
	airFilter.type = 'bandpass';
	airFilter.frequency.value = 900;
	airFilter.Q.value = 0.5;
	const airGain = audio.createGain();
	airGain.gain.value = 0.012;
	air.connect(airFilter).connect(airGain).connect(stem);
	air.start();
	live.push(air);

	nextAt = audio.currentTime + 0.6;
	schedule();
}

export function stopEclipseMusic() {
	running = false;
	if (timer != null) {
		clearTimeout(timer);
		timer = null;
	}
	const audio = getAudioContext();
	const dying = live.slice();
	const old = stem;
	live = [];
	stem = null;
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

export function playSelect() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const osc = audio.createOscillator();
	const gain = env(audio, t, 0.022, 0.004, 0.08);
	osc.type = 'sine';
	osc.frequency.setValueAtTime(1318.5, t);
	osc.connect(gain);
	connectSfx(gain);
	osc.start(t);
	osc.stop(t + 0.1);
}

/** Clockwork tick as the disc seats into its brass socket. */
export function playPlace(player: Player) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const click = audio.createBufferSource();
	click.buffer = noiseBuffer(audio, 0.08, 0.9);
	const hp = audio.createBiquadFilter();
	hp.type = 'bandpass';
	hp.frequency.value = 3200;
	hp.Q.value = 2.5;
	const g = env(audio, t, 0.16, 0.001, 0.05);
	click.connect(hp).connect(g);
	connectSfx(g);
	click.start(t);
	click.stop(t + 0.08);

	const thunk = audio.createOscillator();
	thunk.type = 'sine';
	thunk.frequency.setValueAtTime(player === MOON ? 240 : 300, t);
	thunk.frequency.exponentialRampToValueAtTime(player === MOON ? 120 : 150, t + 0.1);
	const body = env(audio, t, 0.12, 0.003, 0.14);
	thunk.connect(body);
	connectSfx(body);
	thunk.start(t);
	thunk.stop(t + 0.18);
}

/** One chime per turned disc, climbing as the eclipse travels down the line. */
export function playFlip(player: Player, rung: number, delaySec: number) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime + delaySec;
	const base = player === MOON ? 659.25 : 523.25;
	const freq = base * LADDER[Math.min(rung, LADDER.length - 1)];
	const out = audio.createGain();
	out.gain.value = 1;
	connectSfx(out);
	bell(audio, out, freq, t, 0.045, 0.9, player !== MOON);
}

export function playPass() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = audio.createGain();
	connectSfx(out);
	bell(audio, out, 98, t, 0.12, 2.4, true);
}

export function playCorner(player: Player) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = audio.createGain();
	connectSfx(out);
	const notes = player === MOON ? [880, 1108.73, 1318.51, 1760] : [783.99, 987.77, 1174.66, 1567.98];
	notes.forEach((freq, i) => bell(audio, out, freq, t + i * 0.06, 0.04, 1.4, player !== MOON));
	const shimmer = audio.createBufferSource();
	shimmer.buffer = noiseBuffer(audio, 0.8, 0.5);
	const hp = audio.createBiquadFilter();
	hp.type = 'highpass';
	hp.frequency.value = 5000;
	const g = env(audio, t, 0.04, 0.05, 0.7);
	shimmer.connect(hp).connect(g);
	connectSfx(g);
	shimmer.start(t);
	shimmer.stop(t + 0.8);
}

export function playWin(winner: Player) {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = audio.createGain();
	connectSfx(out);
	const notes = winner === MOON ? [293.66, 440, 554.37, 659.25, 880] : [261.63, 392, 493.88, 587.33, 783.99];
	notes.forEach((freq, i) => bell(audio, out, freq, t + i * 0.12, 0.08, 2.2, winner !== MOON));
}

export function playDraw() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const out = audio.createGain();
	connectSfx(out);
	bell(audio, out, 293.66, t, 0.06, 1.8, false);
	bell(audio, out, 261.63, t + 0.05, 0.06, 1.8, true);
}

export { startEclipseMusic as startMusic, stopEclipseMusic as stopMusic };
