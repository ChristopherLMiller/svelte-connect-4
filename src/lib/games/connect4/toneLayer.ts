import { jitter, type Tone } from '$lib/audio/tone';

export { loadTone, peekTone } from '$lib/audio/tone';

/**
 * Extra players that follow the hand-written score; they never change what it plays.
 * Each transmission gets its own arrangement in the track's palette, and the busier
 * parts mostly wait for the lifted choruses.
 */
export type ToneRig = {
	lead(freq: number, t: number, dur: number, lift: boolean): void;
	chord(freqs: number[], t: number, hold: number, lift: boolean): void;
	arp(step: number, t: number, lift: boolean, drop: boolean): void;
	kick(t: number): void;
	setActive(on: boolean, t: number): void;
	dispose(): void;
};

type FatOsc = 'fatsawtooth' | 'fattriangle' | 'fatsquare';
type ArpPattern = 'updown' | 'up' | 'octaves' | 'random';

type Arrangement = {
	echo: { sixteenths: number; feedback: number; level: number; cutoff: number };
	pad: {
		osc: FatOsc;
		spread: number;
		volume: number;
		cutoff: number;
		sweep: number;
		attack: number;
		release: number;
		duck: number;
		/** Re-strike the chord every N sixteenths instead of holding it. */
		gate?: number;
		verse?: boolean;
	} | null;
	shadow: { osc: 'pulse' | 'triangle' | 'square'; ratio: number; volume: number; decay: number } | null;
	arp: {
		osc: 'square' | 'sawtooth' | 'triangle' | 'pulse';
		pattern: ArpPattern;
		every: 1 | 2;
		octave: number;
		volume: number;
		cutoff: number;
		q: number;
		decay: number;
		verse?: boolean;
	} | null;
};

/** Nightclub pump: hard-ducked saw pad, up-down arp, pulse octave over the lead. */
const FLOOR_LIGHTS: Arrangement = {
	echo: { sixteenths: 3, feedback: 0.22, level: 0.3, cutoff: 2800 },
	pad: { osc: 'fatsawtooth', spread: 14, volume: -18, cutoff: 520, sweep: 1.2, attack: 0.2, release: 0.8, duck: 0.35 },
	shadow: { osc: 'pulse', ratio: 2, volume: -21, decay: 0.12 },
	arp: { osc: 'square', pattern: 'updown', every: 2, octave: 1, volume: -20, cutoff: 600, q: 1, decay: 0.08 }
};

/** Driving grid: trance-gated pad, straight sixteenth arp, eighth-note echo. */
const PULSE_GRID: Arrangement = {
	echo: { sixteenths: 2, feedback: 0.2, level: 0.24, cutoff: 3200 },
	pad: { osc: 'fatsquare', spread: 10, volume: -18, cutoff: 900, sweep: 0.6, attack: 0.005, release: 0.06, duck: 0.6, gate: 2 },
	shadow: null,
	arp: { osc: 'square', pattern: 'up', every: 1, octave: 2, volume: -21, cutoff: 900, q: 2, decay: 0.05 }
};

/** Sunlit lydian: shimmering triangle pad, a fifth riding the lead, rolling two-octave arp. */
const HELIOS_RUN: Arrangement = {
	echo: { sixteenths: 4, feedback: 0.28, level: 0.28, cutoff: 3600 },
	pad: { osc: 'fattriangle', spread: 22, volume: -16, cutoff: 1400, sweep: 1, attack: 0.3, release: 1.2, duck: 0.7 },
	shadow: { osc: 'triangle', ratio: 1.5, volume: -22, decay: 0.2 },
	arp: { osc: 'triangle', pattern: 'octaves', every: 2, octave: 2, volume: -19, cutoff: 2400, q: 0.7, decay: 0.12 }
};

/** Dark phrygian chase: low filtered saw pad, resonant acid arp an octave down, tight slap echo. */
const ION_CHASE: Arrangement = {
	echo: { sixteenths: 1.5, feedback: 0.14, level: 0.2, cutoff: 2200 },
	pad: { osc: 'fatsawtooth', spread: 18, volume: -17, cutoff: 360, sweep: 0.9, attack: 0.12, release: 0.5, duck: 0.4 },
	shadow: null,
	arp: { osc: 'sawtooth', pattern: 'updown', every: 1, octave: 0.5, volume: -20, cutoff: 380, q: 6, decay: 0.07 }
};

/** Mellow pentatonic: warm pad even in verses, slow wandering arp, long dotted-quarter echo. */
const NOVA_LINE: Arrangement = {
	echo: { sixteenths: 6, feedback: 0.3, level: 0.26, cutoff: 2600 },
	pad: { osc: 'fattriangle', spread: 16, volume: -19, cutoff: 900, sweep: 0.8, attack: 0.4, release: 1.4, duck: 0.8, verse: true },
	shadow: { osc: 'triangle', ratio: 2, volume: -23, decay: 0.18 },
	arp: { osc: 'pulse', pattern: 'random', every: 2, octave: 2, volume: -23, cutoff: 1800, q: 0.7, decay: 0.16, verse: true }
};

const ARRANGEMENTS: Record<string, Arrangement> = {
	'Floor Lights': FLOOR_LIGHTS,
	'Pulse Grid': PULSE_GRID,
	'Helios Run': HELIOS_RUN,
	'Ion Chase': ION_CHASE,
	'Nova Line': NOVA_LINE
};

function arpNote(pattern: ArpPattern, chord: number[], index: number) {
	switch (pattern) {
		case 'up':
			return [...chord, ...chord.map((f) => f * 2)][index % (chord.length * 2)];
		case 'octaves':
			return chord.flatMap((f) => [f, f * 2])[index % (chord.length * 2)];
		case 'random':
			return chord[Math.floor(Math.random() * chord.length)] * (Math.random() < 0.3 ? 2 : 1);
		default: {
			const ladder = [...chord, ...chord.slice(1, -1).reverse()];
			return ladder[index % ladder.length];
		}
	}
}

export function buildRig(
	tone: Tone,
	leadSource: AudioNode,
	dest: AudioNode,
	track: { name: string; bpm: number }
): ToneRig {
	const audio = dest.context as AudioContext;
	const plan = ARRANGEMENTS[track.name] ?? FLOOR_LIGHTS;
	const sixteenth = 15 / track.bpm;
	let lastChord: number[] = [];
	let active = true;

	const out = audio.createGain();
	out.gain.value = 1;
	out.connect(dest);
	const disposables: Array<{ dispose(): unknown }> = [];
	const natives: AudioNode[] = [out];

	const echo = new tone.PingPongDelay({ delayTime: sixteenth * plan.echo.sixteenths, feedback: plan.echo.feedback, wet: 1 });
	const echoTone = new tone.Filter({ type: 'lowpass', frequency: plan.echo.cutoff, rolloff: -12 });
	const echoLevel = audio.createGain();
	echoLevel.gain.value = plan.echo.level;
	tone.connect(leadSource, echo);
	echo.connect(echoTone);
	echoTone.connect(echoLevel);
	echoLevel.connect(out);
	disposables.push(echo, echoTone);
	natives.push(echoLevel);

	let pad: InstanceType<Tone['PolySynth']> | null = null;
	const duck = audio.createGain();
	duck.connect(out);
	natives.push(duck);
	if (plan.pad) {
		pad = new tone.PolySynth(tone.Synth, {
			volume: plan.pad.volume,
			oscillator: { type: plan.pad.osc, count: 2, spread: plan.pad.spread },
			envelope: { attack: plan.pad.attack, decay: 0.5, sustain: 0.4, release: plan.pad.release }
		});
		pad.maxPolyphony = 8;
		const sweep = new tone.AutoFilter({
			frequency: 1 / (sixteenth * 64),
			baseFrequency: plan.pad.cutoff,
			octaves: plan.pad.sweep,
			depth: 0.4,
			filter: { type: 'lowpass', rolloff: -24, Q: 0.8 }
		}).start();
		const width = new tone.Chorus({ frequency: 0.4, delayTime: 3, depth: 0.3, spread: 120, wet: 0.2 }).start();
		pad.chain(sweep, width);
		width.connect(duck);
		disposables.push(pad, sweep, width);
	}

	let shadow: InstanceType<Tone['PolySynth']> | null = null;
	if (plan.shadow) {
		shadow = new tone.PolySynth(tone.Synth, {
			volume: plan.shadow.volume,
			oscillator: plan.shadow.osc === 'pulse' ? { type: 'pulse', width: 0.25 } : { type: plan.shadow.osc },
			envelope: { attack: 0.003, decay: plan.shadow.decay, sustain: 0, release: 0.08 }
		});
		shadow.maxPolyphony = 4;
		shadow.connect(out);
		disposables.push(shadow);
	}

	let arpSynth: InstanceType<Tone['MonoSynth']> | null = null;
	const arpPan = new tone.Panner(0);
	arpPan.connect(out);
	disposables.push(arpPan);
	if (plan.arp) {
		arpSynth = new tone.MonoSynth({
			volume: plan.arp.volume,
			oscillator: plan.arp.osc === 'pulse' ? { type: 'pulse', width: 0.25 } : { type: plan.arp.osc },
			filter: { type: 'lowpass', Q: plan.arp.q, rolloff: -12 },
			envelope: { attack: 0.002, decay: plan.arp.decay, sustain: 0, release: 0.05 },
			filterEnvelope: {
				attack: 0.002,
				decay: plan.arp.decay * 0.9,
				sustain: 0,
				release: 0.05,
				baseFrequency: plan.arp.cutoff,
				octaves: 2.2
			}
		});
		arpSynth.connect(arpPan);
		disposables.push(arpSynth);
	}

	return {
		lead(freq, t, dur, lift) {
			if (!lift || !active || !shadow || !plan.shadow) return;
			shadow.triggerAttackRelease(freq * plan.shadow.ratio, Math.min(dur, 0.16), t + Math.abs(jitter(0.004)), 0.6 + jitter(0.15));
		},
		chord(freqs, t, hold, lift) {
			lastChord = [...freqs].sort((a, b) => a - b);
			if (!active || !pad || !plan.pad || !(lift || plan.pad.verse)) return;
			const gate = plan.pad.gate;
			if (!gate) {
				pad.triggerAttackRelease(freqs, hold, t, 0.55 + jitter(0.08));
				return;
			}
			const strikes = Math.max(1, Math.round(hold / (sixteenth * gate)));
			for (let k = 0; k < strikes; k += 1) {
				pad.triggerAttackRelease(freqs, sixteenth * gate * 0.5, t + k * sixteenth * gate, 0.5 + jitter(0.08));
			}
		},
		arp(step, t, lift, drop) {
			if (!active || !arpSynth || !plan.arp || !drop || lastChord.length === 0) return;
			if (!(lift || plan.arp.verse) || step % plan.arp.every !== 0) return;
			const index = step / plan.arp.every;
			const freq = arpNote(plan.arp.pattern, lastChord, index) * plan.arp.octave;
			arpPan.pan.setValueAtTime(index % 2 === 0 ? -0.3 : 0.3, t);
			arpSynth.triggerAttackRelease(freq, sixteenth * plan.arp.every * 0.8, t, 0.6 + jitter(0.15));
		},
		kick(t) {
			const depth = plan.pad?.duck ?? 1;
			duck.gain.cancelScheduledValues(t);
			duck.gain.setValueAtTime(depth, t);
			duck.gain.setTargetAtTime(1, t + 0.01, 0.08);
		},
		setActive(on, t) {
			active = on;
			out.gain.cancelScheduledValues(t);
			out.gain.setTargetAtTime(on ? 1 : 0, t, 0.15);
		},
		dispose() {
			for (const node of disposables) node.dispose();
			for (const node of natives) node.disconnect();
		}
	};
}
