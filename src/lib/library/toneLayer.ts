import { jitter, type Tone } from '$lib/audio/tone';

/**
 * Optional chip-channel players for the hall's attract loop. They stay in the
 * score's square-and-pulse palette and never change what the score plays.
 */
export type HallRig = {
	chord(freqs: number[], t: number, hold: number): void;
	arp(freq: number, t: number, step: number): void;
	lead(freq: number, t: number, dur: number): void;
	kick(t: number): void;
	setActive(on: boolean, t: number): void;
	dispose(): void;
};

export function buildHallRig(tone: Tone, dest: AudioNode): HallRig {
	const audio = dest.context as AudioContext;
	let active = true;

	const out = audio.createGain();
	out.gain.value = 1;
	out.connect(dest);

	// Pulse-width pad holding each bar's chord, pumped by the kick.
	const pad = new tone.PolySynth(tone.Synth, {
		volume: -21,
		oscillator: { type: 'pwm', modulationFrequency: 0.45 },
		envelope: { attack: 0.08, decay: 0.6, sustain: 0.35, release: 0.5 }
	});
	pad.maxPolyphony = 6;
	const padTone = new tone.Filter({ type: 'lowpass', frequency: 1500, rolloff: -12 });
	const duck = audio.createGain();
	pad.connect(padTone);
	padTone.connect(duck);
	duck.connect(out);

	// Echo canon: a thin pulse repeats the lead an octave down, one step late, off to one side.
	const canon = new tone.Synth({
		volume: -21,
		oscillator: { type: 'pulse', width: 0.25 },
		envelope: { attack: 0.004, decay: 0.12, sustain: 0.2, release: 0.06 }
	});
	const canonPan = new tone.Panner(0.35);
	canon.connect(canonPan);
	canonPan.connect(out);

	// Narrow 12.5% pulse arpeggio for the half where the score's own arp rests.
	const arpSynth = new tone.Synth({
		volume: -23,
		oscillator: { type: 'pulse', width: 0.125 },
		envelope: { attack: 0.002, decay: 0.06, sustain: 0, release: 0.04 }
	});
	const arpPan = new tone.Panner(0);
	arpSynth.connect(arpPan);
	arpPan.connect(out);

	const nodes = [pad, padTone, canon, canonPan, arpSynth, arpPan];

	return {
		chord(freqs, t, hold) {
			if (!active) return;
			pad.triggerAttackRelease(freqs, hold, t, 0.55 + jitter(0.08));
		},
		arp(freq, t, step) {
			if (!active) return;
			arpPan.pan.setValueAtTime(step % 4 === 0 ? -0.35 : 0.35, t);
			arpSynth.triggerAttackRelease(freq, 0.07, t, 0.6 + jitter(0.15));
		},
		lead(freq, t, dur) {
			if (!active) return;
			canon.triggerAttackRelease(freq / 2, dur, t, 0.55 + jitter(0.1));
		},
		kick(t) {
			duck.gain.cancelScheduledValues(t);
			duck.gain.setValueAtTime(0.4, t);
			duck.gain.setTargetAtTime(1, t + 0.01, 0.07);
		},
		setActive(on, t) {
			active = on;
			out.gain.cancelScheduledValues(t);
			out.gain.setTargetAtTime(on ? 1 : 0, t, 0.15);
		},
		dispose() {
			for (const node of nodes) node.dispose();
			for (const node of [out, duck]) node.disconnect();
		}
	};
}
