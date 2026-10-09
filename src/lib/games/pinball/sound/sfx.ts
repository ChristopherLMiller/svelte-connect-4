import { connectSfx, sfxContext } from '$lib/audio/core';
import type { GameEvent } from '../engine/game';
import { bell, chime, drum, hz, lead, sweep, swell, tine, type Out, type Voice } from './synth';

export type Kit = Out & { t: number; key: number; minor: boolean; voice: Voice };

/**
 * How a table sounds. The kit plays everything; the palette picks the bumper voice, the key the
 * fanfares run in, and the table's own sounds for its ramps, toys and drains.
 */
export type Palette = {
	key: number;
	minor: boolean;
	/** The voice fanfares and jackpot runs are played on. */
	voice: Voice;
	bumper: 'bell' | 'chime' | 'zap' | 'clank' | 'bubble' | 'gong' | 'pop';
	bumperNotes: number[];
	ramp: 'rattle' | 'whoosh' | 'rise' | 'gallop' | 'bubbles' | 'roar';
	drain: 'slide' | 'sink' | 'fall' | 'boom';
	toy: 'moan' | 'creak' | 'bubble' | 'roar' | 'clang' | 'zap' | 'moo';
	/** Table cues, and any kit cue the table wants to sound its own way. */
	cues?: Record<string, (k: Kit, n?: number) => void>;
	/** Spoken callouts for the big messages. */
	speech?: { pitch: number; rate: number };
	/** Old-style score chimes: tens, hundreds and thousands each ring their own bar. */
	chimes?: boolean;
};

function bus(audio: AudioContext, pan = 0) {
	const out = audio.createGain();
	if (pan) {
		const p = audio.createStereoPanner();
		p.pan.value = Math.max(-0.8, Math.min(0.8, pan));
		out.connect(p);
		connectSfx(p);
	} else connectSfx(out);
	return out;
}

function kit(p: Palette, pan = 0): Kit | null {
	const audio = sfxContext();
	if (!audio) return null;
	return { audio, dest: bus(audio, pan), track: () => {}, t: audio.currentTime, key: p.key, minor: p.minor, voice: p.voice };
}

/** A triad arpeggio up from the key: the fanfare every table can play in its own voice. */
export function run(k: Kit, steps: number, t: number, gap: number, peak: number, from = 0, voice = k.voice) {
	const third = k.minor ? 3 : 4;
	const shape = [0, third, 7];
	for (let i = 0; i < steps; i += 1) {
		const n = k.key + 12 + from + shape[i % 3]! + 12 * Math.floor(i / 3);
		lead(k, voice, n, t + i * gap, gap * 1.4, peak);
	}
}

const thump = (k: Kit, t: number, peak = 0.1, low = 60) => sweep(k, 'sine', low * 2.6, low, t, peak, 0.002, 0.07);
const click = (k: Kit, t: number, peak = 0.03, f = 900) => sweep(k, 'triangle', f, f / 3, t, peak, 0.001, 0.025);

let bumperRun = 0;
let bumperAt = 0;
const playBumper = (p: Palette, k: Kit, i: number) => {
	// Hits in quick succession climb, so a busy pop-bumper nest rings up a scale.
	bumperRun = k.t - bumperAt < 0.6 ? Math.min(6, bumperRun + 1) : 0;
	bumperAt = k.t;
	const n = p.bumperNotes[i % p.bumperNotes.length]! + [0, 2, 4, 5, 7, 9, 12][bumperRun]!;
	const t = k.t;
	thump(k, t, 0.1, 90);
	click(k, t, 0.035, 1100);
	switch (p.bumper) {
		case 'bell':
			bell(k, hz(n), t + 0.004, 0.045, 0.4);
			break;
		case 'chime':
			chime(k, n, t + 0.004, 0.07, 1.4);
			break;
		case 'zap':
			sweep(k, 'square', hz(n + 12), hz(n - 12), t, 0.025, 0.002, 0.12);
			sweep(k, 'sine', hz(n), hz(n + 24), t + 0.02, 0.03, 0.002, 0.08);
			break;
		case 'clank':
			sweep(k, 'triangle', hz(n), hz(n) * 0.97, t, 0.05, 0.001, 0.18);
			sweep(k, 'sine', hz(n) * 2.7, hz(n) * 2.6, t, 0.02, 0.001, 0.1);
			break;
		case 'bubble':
			sweep(k, 'sine', hz(n - 5), hz(n + 7), t, 0.06, 0.004, 0.09);
			sweep(k, 'sine', hz(n), hz(n + 12), t + 0.07, 0.035, 0.004, 0.07);
			break;
		case 'gong':
			bell(k, hz(n - 12), t + 0.004, 0.05, 0.9);
			break;
		case 'pop':
			sweep(k, 'sine', hz(n + 12), hz(n), t, 0.06, 0.002, 0.06);
			break;
	}
};

const playRamp = (p: Palette, k: Kit) => {
	const t = k.t;
	switch (p.ramp) {
		case 'rattle':
			for (let i = 0; i < 7; i += 1) {
				const at = t + i * Math.max(0.09, 0.2 - i * 0.018);
				thump(k, at, 0.07, 60);
				click(k, at + 0.02, 0.01, 1400);
			}
			break;
		case 'whoosh':
			swell(k, 'sine', 220, 880, t, 0.04, 0.5, 0.02, 11);
			swell(k, 'triangle', 330, 1320, t + 0.05, 0.015, 0.45);
			break;
		case 'rise':
			run(k, 5, t, 0.06, 0.03);
			break;
		case 'gallop':
			for (let i = 0; i < 8; i += 1) drum(k, 'block', t + i * 0.09 + (i % 2) * 0.03, 0.12, i % 2 ? 5 : 0);
			break;
		case 'bubbles':
			for (let i = 0; i < 6; i += 1) sweep(k, 'sine', hz(k.key + 12 + i * 3), hz(k.key + 24 + i * 3), t + i * 0.06, 0.03, 0.004, 0.07);
			break;
		case 'roar':
			swell(k, 'sawtooth', 70, 50, t, 0.05, 0.7, 0.08, 13);
			swell(k, 'sine', 110, 70, t, 0.06, 0.7, 0.05, 9);
			break;
	}
};

const playToy = (p: Palette, k: Kit, n: number) => {
	const t = k.t;
	switch (p.toy) {
		case 'moan': {
			const base = 420 + Math.min(8, n) * 22;
			swell(k, 'sine', base * 1.3, base * 0.7, t, 0.05, 0.55, 0.03, 7);
			thump(k, t, 0.06, 80);
			break;
		}
		case 'creak':
			swell(k, 'triangle', 90, 70, t, 0.04, 0.4, 0.15, 23);
			thump(k, t, 0.08, 70);
			break;
		case 'bubble':
			for (let i = 0; i < 4; i += 1) sweep(k, 'sine', hz(k.key + 7 + i * 5), hz(k.key + 19 + i * 5), t + i * 0.05, 0.035, 0.004, 0.06);
			break;
		case 'roar':
			swell(k, 'sawtooth', 120, 60, t, 0.05, 0.6, 0.1, 17);
			thump(k, t, 0.1, 50);
			break;
		case 'clang':
			sweep(k, 'triangle', 620, 600, t, 0.05, 0.001, 0.4);
			sweep(k, 'sine', 1690, 1650, t, 0.02, 0.001, 0.3);
			break;
		case 'zap':
			sweep(k, 'square', 1800, 120, t, 0.03, 0.002, 0.25);
			break;
		case 'moo':
			swell(k, 'sawtooth', 160, 120, t, 0.03, 0.6, 0.02, 4);
			break;
	}
};

const playDrain = (p: Palette, k: Kit, last: boolean) => {
	const t = k.t;
	const length = last ? 0.9 : 0.45;
	switch (p.drain) {
		case 'slide':
			swell(k, 'sine', last ? 900 : 700, last ? 160 : 300, t, last ? 0.05 : 0.025, length, 0.025, 9);
			break;
		case 'sink':
			for (let i = 0; i < (last ? 6 : 3); i += 1) sweep(k, 'sine', 500 - i * 60, 200 - i * 20, t + i * 0.12, 0.03, 0.004, 0.1);
			break;
		case 'fall':
			sweep(k, 'square', last ? 1200 : 900, 80, t, 0.025, 0.004, length);
			break;
		case 'boom':
			sweep(k, 'sine', 120, 35, t, last ? 0.14 : 0.08, 0.004, length);
			break;
	}
	if (last) lead(k, k.voice, k.key, t + length, 0.8, 0.035);
};

let speaking = false;
function speak(p: Palette, text: string, voiceOn: boolean) {
	if (!voiceOn || !p.speech || typeof speechSynthesis === 'undefined') return;
	if (speaking) speechSynthesis.cancel();
	const u = new SpeechSynthesisUtterance(text);
	u.pitch = p.speech.pitch;
	u.rate = p.speech.rate;
	u.volume = 0.9;
	u.onend = () => (speaking = false);
	speaking = true;
	speechSynthesis.speak(u);
}

export function stopSpeech() {
	if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
	speaking = false;
}

/** Sound one game event on a table. */
export function sound(p: Palette, e: GameEvent, opts: { voice: boolean; lastBall: boolean }) {
	const side = (x: number) => (x - 9.3) / 9.3;
	switch (e.type) {
		case 'bumper': {
			const k = kit(p, side(e.ball.x) * 0.6);
			if (k) playBumper(p, k, e.i);
			return;
		}
		case 'sling': {
			const k = kit(p, e.side === 'left' ? -0.5 : 0.5);
			if (!k) return;
			thump(k, k.t, 0.1, 110);
			click(k, k.t, 0.04, 700);
			sweep(k, 'triangle', hz(p.key + 24), hz(p.key + 19), k.t + 0.01, 0.022, 0.002, 0.07);
			return;
		}
		case 'drop': {
			const k = kit(p, side(e.ball.x) * 0.6);
			if (!k) return;
			sweep(k, 'triangle', 320, 110, k.t, 0.06, 0.002, 0.08);
			lead(k, p.bumper === 'chime' ? 'chime' : 'bell', p.key + 24 + [0, p.minor ? 3 : 4, 7, 12][e.i % 4]!, k.t + 0.03, 0.2, 0.025);
			return;
		}
		case 'standup': {
			const k = kit(p, side(e.ball.x) * 0.6);
			if (!k) return;
			thump(k, k.t, 0.07, 120);
			click(k, k.t, 0.03, 1200);
			return;
		}
		case 'spin': {
			const k = kit(p, side(e.ball.x) * 0.6);
			if (!k) return;
			const count = Math.min(14, e.spins);
			for (let i = 0; i < count; i += 1) drum(k, 'tick', k.t + i * (0.035 + i * 0.006), 0.18, i);
			return;
		}
		case 'hole': {
			const k = kit(p, side(e.ball.x) * 0.6);
			if (k) sweep(k, 'sine', 320, 70, k.t, 0.1, 0.004, 0.24);
			return;
		}
		case 'eject': {
			const k = kit(p);
			if (!k) return;
			thump(k, k.t, 0.12, 60);
			click(k, k.t, 0.03, 500);
			return;
		}
		case 'rampBack': {
			const k = kit(p);
			if (k) sweep(k, 'triangle', 300, 120, k.t, 0.02, 0.01, 0.3);
			return;
		}
		case 'ramp': {
			const k = kit(p, side(e.ball.x) * 0.5);
			if (k) playRamp(p, k);
			return;
		}
		case 'mover': {
			const k = kit(p, side(e.ball.x) * 0.5);
			if (k) playToy(p, k, Math.round(e.speed));
			return;
		}
		case 'captive': {
			const k = kit(p, side(e.ball.x) * 0.5);
			if (!k) return;
			thump(k, k.t, 0.09, 140);
			click(k, k.t, 0.04, 1500);
			lead(k, p.bumper === 'chime' ? 'chime' : 'bell', p.key + 31, k.t + 0.02, 0.3, 0.03);
			return;
		}
		case 'flip': {
			const k = kit(p, e.side === 'left' ? -0.35 : 0.35);
			if (k) click(k, k.t, Math.min(0.04, 0.01 + e.speed * 0.001), 600);
			return;
		}
		case 'knock': {
			const k = kit(p);
			if (k) sweep(k, 'triangle', 200, 120, k.t, Math.min(0.05, 0.008 + e.speed * 0.0012), 0.001, 0.045);
			return;
		}
		case 'clack': {
			const k = kit(p);
			if (k) sweep(k, 'triangle', 2300, 1900, k.t, Math.min(0.02, 0.004 + e.speed * 0.0005), 0.001, 0.02);
			return;
		}
		case 'enter': {
			const k = kit(p, side(e.ball.x) * 0.5);
			if (!k) return;
			const ring = p.bumper === 'chime' ? 'chime' : 'bell';
			if (e.id.startsWith('lane')) lead(k, ring, p.key + 24 + [7, 12, 16, 19][Number(e.id.slice(4)) % 4]!, k.t, 0.2, 0.025);
			else if (e.id === 'inL' || e.id === 'inR') {
				lead(k, ring, p.key + 24, k.t, 0.12, 0.018);
				lead(k, ring, p.key + 31, k.t + 0.06, 0.16, 0.018);
			} else if (e.id === 'outL' || e.id === 'outR') {
				sweep(k, 'triangle', hz(p.key + 19), hz(p.key + 7), k.t, 0.03, 0.005, 0.3);
				sweep(k, 'sine', hz(p.key + 12), hz(p.key), k.t + 0.08, 0.03, 0.005, 0.35);
			} else if (e.id.startsWith('orbit')) {
				swell(k, 'sine', hz(p.key + 19), hz(p.key + 31), k.t, 0.03, 0.28, 0.02, 14);
				lead(k, k.voice, p.key + 24 + (e.id.endsWith('R') ? 7 : 0), k.t + 0.12, 0.18, 0.025);
			} else {
				let h = 0;
				for (const ch of e.id) h = (h * 31 + ch.charCodeAt(0)) % 997;
				const n = p.key + 24 + [0, 3, 5, 7, 10, 12][h % 6]!;
				sweep(k, 'triangle', hz(n), hz(n + 5), k.t, 0.025, 0.003, 0.08);
				click(k, k.t, 0.015, 1500);
			}
			return;
		}
		case 'rampEnter': {
			const k = kit(p, side(e.ball.x) * 0.5);
			if (k) swell(k, 'triangle', hz(p.key + 7), hz(p.key + 19), k.t, 0.02, 0.4, 0.03, 18);
			return;
		}
		case 'rideEnd': {
			const k = kit(p, side(e.ball.x) * 0.6);
			if (!k) return;
			for (let i = 0; i < 3; i += 1) click(k, k.t + i * 0.035, 0.025, 2200 - i * 300);
			thump(k, k.t + 0.1, 0.08, 80);
			return;
		}
		case 'serve': {
			const k = kit(p);
			if (k) run(k, 3, k.t + 0.1, 0.09, 0.03);
			return;
		}
		case 'multiball': {
			const k = kit(p);
			if (!k) return;
			if (e.on) {
				for (let i = 0; i < 8; i += 1) sweep(k, 'triangle', hz(p.key + (i % 2 ? 31 : 24)), hz(p.key + (i % 2 ? 31 : 24)), k.t + 0.5 + i * 0.16, 0.022, 0.01, 0.14);
			} else [12, 7, 3, 0].forEach((d, i) => lead(k, k.voice, p.key + 12 + d, k.t + i * 0.12, 0.16, 0.025));
			return;
		}
		case 'lane': {
			if (!e.done) return;
			const k = kit(p);
			if (k) run(k, 4, k.t + 0.1, 0.1, 0.035);
			return;
		}
		case 'launch': {
			const k = kit(p, 0.6);
			if (!k) return;
			sweep(k, 'sine', 160, 300 + e.power * 500, k.t, 0.07, 0.002, 0.12);
			click(k, k.t, 0.02, 1200);
			return;
		}
		case 'drain': {
			const k = kit(p);
			if (k) playDrain(p, k, opts.lastBall);
			return;
		}
		case 'ballOver': {
			const k = kit(p);
			if (!k || e.tilted) return;
			const ticks = Math.min(18, Math.max(3, Math.round(e.count / 2)));
			for (let i = 0; i < ticks; i += 1) sweep(k, 'triangle', hz(p.key + 12 + (i % 12)), hz(p.key + 12 + (i % 12)), k.t + 0.4 + i * 0.07, 0.02, 0.002, 0.05);
			const end = k.t + 0.5 + ticks * 0.07;
			for (let i = 0; i < Math.min(5, e.mult - 1); i += 1) bell(k, hz(p.key + 24 + i * 2), end + i * 0.14, 0.035, 0.6);
			return;
		}
		case 'over': {
			const k = kit(p);
			if (!k) return;
			[12, 11, 10, 9, 8, 7].forEach((d, i) => lead(k, p.voice, p.key + d, k.t + i * 0.22, 0.2, 0.035));
			bell(k, hz(p.key - 12), k.t + 1.4, 0.06, 2.6);
			return;
		}
		case 'message':
			if (e.big) speak(p, e.text, opts.voice);
			return;
		case 'score': {
			if (!p.chimes) {
				if (e.points < 4000 || e.points >= 50000) return;
				const k = kit(p, side(e.x) * 0.4);
				if (!k) return;
				const step = Math.min(4, Math.floor(Math.log10(e.points / 4000) * 3));
				tine(k, p.key + 24 + [0, p.minor ? 3 : 4, 7, 12, 16][step]!, k.t + 0.04, 0.022, 0.5);
				if (e.points >= 15000) tine(k, p.key + 31 + [0, p.minor ? 3 : 4, 7, 12, 16][step]!, k.t + 0.11, 0.02, 0.6);
				return;
			}
			const k = kit(p);
			if (!k) return;
			const digits = String(Math.round(e.points));
			const tier = Math.min(2, Math.max(0, digits.length - 2));
			const rings = Math.min(3, Number(digits[0]) || 1);
			for (let i = 0; i < rings; i += 1) chime(k, p.key + [31, 28, 24][tier]!, k.t + i * 0.13, 0.05, 1.3);
			return;
		}
		case 'cue': {
			const k = kit(p);
			if (!k) return;
			const own = p.cues?.[e.cue];
			if (own) {
				own(k, e.n);
				return;
			}
			cueSound(k, e.cue, e.n);
			return;
		}
	}
}

function cueSound(k: Kit, cue: string, n = 0) {
	const t = k.t;
	switch (cue) {
		case 'jackpot':
			run(k, 4, t, 0.08, 0.04, 7);
			bell(k, hz(k.key + 31), t + 0.32, 0.05, 1.4);
			thump(k, t, 0.1, 55);
			return;
		case 'superJackpot':
			run(k, 8, t, 0.08, 0.045);
			bell(k, hz(k.key + 24), t + 0.64, 0.06, 2);
			thump(k, t, 0.12, 50);
			return;
		case 'multiball':
			for (let i = 0; i < 6; i += 1) bell(k, hz(k.key - 12), t + i * 0.3, 0.06, 1.6);
			run(k, 7, t + 1.9, 0.09, 0.04);
			return;
		case 'wizard':
			for (let r = 0; r < 3; r += 1) run(k, 6, t + r * 0.7, 0.07, 0.04, r * 5);
			bell(k, hz(k.key), t + 2.2, 0.07, 3);
			return;
		case 'lock':
			for (let i = 0; i < Math.max(1, n); i += 1) bell(k, hz(k.key + 7), t + 0.2 + i * 0.5, 0.06, 1.6);
			return;
		case 'lit':
			[0, 7, 12].forEach((d, i) => tine(k, k.key + 24 + d, t + i * 0.07, 0.03, 0.9));
			return;
		case 'modeStart':
			run(k, 3, t, 0.12, 0.045);
			thump(k, t, 0.1, 60);
			return;
		case 'modeHit':
			lead(k, k.voice, k.key + 12 + [0, 4, 7, 12, 16, 19][Math.min(5, n - 1)]!, t, 0.25, 0.04);
			thump(k, t, 0.08, 70);
			return;
		case 'modeDone':
			run(k, 6, t, 0.07, 0.045, 0);
			bell(k, hz(k.key + 36), t + 0.45, 0.04, 1.2);
			return;
		case 'modeOver':
			[7, 5, 3, 0].forEach((d, i) => lead(k, k.voice, k.key + 12 + d, t + i * 0.14, 0.18, 0.03));
			return;
		case 'extraBall':
			sweep(k, 'sine', 110, 45, t, 0.2, 0.002, 0.18);
			click(k, t, 0.05, 600);
			run(k, 5, t + 0.25, 0.08, 0.035, 12, 'bell');
			return;
		case 'kickback':
			sweep(k, 'sine', 90, 45, t, 0.16, 0.002, 0.12);
			sweep(k, 'triangle', 300, 900, t, 0.03, 0.002, 0.15);
			return;
		case 'kickbackLit':
			tine(k, k.key + 31, t, 0.03, 0.8);
			return;
		case 'saved':
			[0, 4, 7, 12].forEach((d, i) => tine(k, k.key + 24 + d, t + i * 0.07, 0.03, 1));
			return;
		case 'skill':
			run(k, 4, t, 0.07, 0.04, 12);
			return;
		case 'mult':
			bell(k, hz(k.key + 24 + n * 2), t, 0.04, 0.8);
			return;
		case 'combo':
			lead(k, k.voice, k.key + 19 + n * 2, t, 0.18, 0.035);
			return;
		case 'tiltWarn':
			sweep(k, 'square', 220, 200, t, 0.03, 0.005, 0.25);
			return;
		case 'tilt':
			sweep(k, 'square', 330, 80, t, 0.05, 0.005, 1.2);
			return;
		case 'nudge':
			thump(k, t, 0.12, 45);
			return;
		case 'hurry':
			sweep(k, 'square', hz(k.key + 24 + (5 - n) * 2), hz(k.key + 24 + (5 - n) * 2), t, 0.018, 0.004, 0.09);
			sweep(k, 'square', hz(k.key + 24 + (5 - n) * 2), hz(k.key + 24 + (5 - n) * 2), t + 0.16, 0.014, 0.004, 0.07);
			return;
	}
}

export function flipperSound(p: Palette, side: 'left' | 'right', on: boolean) {
	const k = kit(p, side === 'left' ? -0.35 : 0.35);
	if (!k) return;
	if (on) {
		sweep(k, 'sine', 150, 60, k.t, 0.12, 0.002, 0.06);
		sweep(k, 'triangle', 900, 300, k.t, 0.035, 0.001, 0.025);
	} else sweep(k, 'sine', 110, 70, k.t, 0.04, 0.002, 0.04);
}

/** Small UI sounds in the table's key. */
export function uiSound(p: Palette, kind: 'ready' | 'pause' | 'select' | 'pull') {
	const k = kit(p, kind === 'pull' ? 0.6 : 0);
	if (!k) return;
	if (kind === 'ready') lead(k, 'bell', p.key + 31, k.t, 0.3, 0.025);
	else if (kind === 'select') lead(k, 'bell', p.key + 36, k.t, 0.2, 0.02);
	else if (kind === 'pause') sweep(k, 'sine', hz(p.key + 24), hz(p.key + 19), k.t, 0.03, 0.01, 0.22);
	else swell(k, 'triangle', 140, 230, k.t, 0.014, 0.95);
}
