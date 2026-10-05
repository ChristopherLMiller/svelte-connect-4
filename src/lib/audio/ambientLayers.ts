import { getLayersBus, isLayersOn, watchLayers } from './core';
import { jitter, loadTone, peekTone, type Tone } from './tone';

/**
 * Synth layers for the slow generative scores (Eclipse, Lantern Wyrm, Tide & Cross,
 * Ashcourt, Chapel Glass, Lumen Reef). Each game's score calls `note` and `bass` as it plays; the layers answer,
 * drone, and ornament around those calls without changing the score itself.
 */

type Voice = 'bell' | 'glass' | 'keys' | 'marimba' | 'flute' | 'pluck';

type Arrangement = {
	echo: { steps: number; feedback: number; level: number; cutoff: number };
	answer: { voice: Voice; ratio: number; delay: number; every: number; volume: number; decay: number };
	drone: { osc: 'fattriangle' | 'fatsawtooth'; ratios: number[]; cutoff: number; volume: number; attack: number; holdSteps: number };
	glints: { voice: Voice; octave: number; chance: number; volume: number };
};

const ARRANGEMENTS: Record<string, Arrangement> = {
	/** Observatory: bell answers an octave up, a soft open-fifth choir, stray star glints. */
	reversi: {
		echo: { steps: 0.75, feedback: 0.35, level: 0.35, cutoff: 4000 },
		answer: { voice: 'bell', ratio: 2, delay: 0.5, every: 1, volume: -21, decay: 1.6 },
		drone: { osc: 'fattriangle', ratios: [2, 3, 4], cutoff: 900, volume: -19, attack: 2, holdSteps: 6 },
		glints: { voice: 'bell', octave: 2, chance: 0.25, volume: -25 }
	},
	/** Lantern festival: a breathy flute answers, a bowed drone, koto plucks between steps. */
	wyrm: {
		echo: { steps: 0.5, feedback: 0.3, level: 0.3, cutoff: 3200 },
		answer: { voice: 'flute', ratio: 2, delay: 0.5, every: 2, volume: -22, decay: 0.7 },
		drone: { osc: 'fattriangle', ratios: [2, 3], cutoff: 700, volume: -22, attack: 1.5, holdSteps: 4 },
		glints: { voice: 'pluck', octave: 2, chance: 0.3, volume: -18 }
	},
	/** Seaside: electric-piano keys echo the melody, swelling string tides, soft marimba. */
	tictactoe: {
		echo: { steps: 0.5, feedback: 0.32, level: 0.32, cutoff: 3000 },
		answer: { voice: 'keys', ratio: 2, delay: 0.33, every: 1, volume: -22, decay: 1.4 },
		drone: { osc: 'fattriangle', ratios: [2, 3, 4], cutoff: 800, volume: -23, attack: 2.5, holdSteps: 4 },
		glints: { voice: 'marimba', octave: 2, chance: 0.35, volume: -24 }
	},
	/** Kiln-lit court: glass a fifth above, a dark cello drone, rare low embers. */
	checkers: {
		echo: { steps: 0.66, feedback: 0.38, level: 0.3, cutoff: 2600 },
		answer: { voice: 'glass', ratio: 1.5, delay: 0.5, every: 2, volume: -23, decay: 2 },
		drone: { osc: 'fatsawtooth', ratios: [2, 3], cutoff: 420, volume: -18, attack: 2, holdSteps: 4 },
		glints: { voice: 'bell', octave: 1, chance: 0.15, volume: -25 }
	},
	/** Ruined cathedral: glass answers an octave up, a reed-organ drone, high bell glints. */
	breakout: {
		echo: { steps: 0.375, feedback: 0.36, level: 0.3, cutoff: 3600 },
		answer: { voice: 'glass', ratio: 2, delay: 0.5, every: 1, volume: -24, decay: 2.2 },
		drone: { osc: 'fatsawtooth', ratios: [1, 1.5, 2], cutoff: 760, volume: -24, attack: 1.2, holdSteps: 1 },
		glints: { voice: 'bell', octave: 1, chance: 0.3, volume: -28 }
	},
	/** Midnight zone: keys answer a fifth up through long echoes, a low swell, rare glass glints. */
	reef: {
		echo: { steps: 0.75, feedback: 0.42, level: 0.34, cutoff: 2400 },
		answer: { voice: 'keys', ratio: 1.5, delay: 0.75, every: 2, volume: -24, decay: 2 },
		drone: { osc: 'fattriangle', ratios: [1, 1.5], cutoff: 520, volume: -21, attack: 3, holdSteps: 2 },
		glints: { voice: 'glass', octave: 2, chance: 0.2, volume: -27 }
	}
};

type Player = { play(freq: number, dur: number, t: number, velocity: number): void; node: { connect(dest: unknown): unknown; dispose(): unknown }; extra: Array<{ dispose(): unknown }> };

function makeVoice(tone: Tone, voice: Voice, volume: number, decay: number): Player {
	switch (voice) {
		case 'bell':
		case 'glass': {
			const synth = new tone.PolySynth(tone.FMSynth, {
				volume,
				harmonicity: voice === 'bell' ? 3.01 : 2.5,
				modulationIndex: voice === 'bell' ? 6 : 3,
				envelope: { attack: 0.004, decay, sustain: 0, release: decay * 0.6 },
				modulationEnvelope: { attack: 0.004, decay: decay * 0.3, sustain: 0, release: 0.3 }
			});
			synth.maxPolyphony = 6;
			return { play: (f, d, t, v) => synth.triggerAttackRelease(f, d, t, v), node: synth, extra: [] };
		}
		case 'keys': {
			const synth = new tone.PolySynth(tone.FMSynth, {
				volume,
				harmonicity: 1,
				modulationIndex: 2.5,
				envelope: { attack: 0.006, decay, sustain: 0, release: 0.8 },
				modulationEnvelope: { attack: 0.006, decay: 0.5, sustain: 0, release: 0.4 }
			});
			synth.maxPolyphony = 6;
			return { play: (f, d, t, v) => synth.triggerAttackRelease(f, d, t, v), node: synth, extra: [] };
		}
		case 'marimba': {
			const synth = new tone.PolySynth(tone.FMSynth, {
				volume,
				harmonicity: 4,
				modulationIndex: 1.5,
				envelope: { attack: 0.002, decay: 0.45, sustain: 0, release: 0.3 },
				modulationEnvelope: { attack: 0.002, decay: 0.08, sustain: 0, release: 0.1 }
			});
			synth.maxPolyphony = 4;
			return { play: (f, d, t, v) => synth.triggerAttackRelease(f, d, t, v), node: synth, extra: [] };
		}
		case 'flute': {
			const synth = new tone.Synth({
				volume,
				oscillator: { type: 'sine' },
				envelope: { attack: 0.09, decay: 0.2, sustain: 0.6, release: 0.5 }
			});
			const vibrato = new tone.Vibrato({ frequency: 5, depth: 0.08 });
			synth.connect(vibrato);
			return { play: (f, d, t, v) => synth.triggerAttackRelease(f, Math.max(d, decay), t, v), node: vibrato, extra: [synth] };
		}
		case 'pluck': {
			const synth = new tone.PluckSynth({ volume, attackNoise: 0.8, dampening: 3200, resonance: 0.94, release: 0.9 });
			return { play: (f, _d, t) => synth.triggerAttack(f, t), node: synth, extra: [] };
		}
	}
}

type AmbientRig = {
	note(freq: number, t: number, step: number): void;
	bass(freq: number, t: number): void;
	setActive(on: boolean, t: number): void;
	dispose(): void;
};

function buildAmbientRig(tone: Tone, dest: AudioNode, plan: Arrangement, stepSeconds: number, scale: number[]): AmbientRig {
	const audio = dest.context as AudioContext;
	let active = true;
	let notes = 0;

	const out = audio.createGain();
	out.connect(dest);

	const echo = new tone.PingPongDelay({ delayTime: stepSeconds * plan.echo.steps, feedback: plan.echo.feedback, wet: 1 });
	const echoTone = new tone.Filter({ type: 'lowpass', frequency: plan.echo.cutoff, rolloff: -12 });
	const echoLevel = audio.createGain();
	echoLevel.gain.value = plan.echo.level;
	echo.connect(echoTone);
	echoTone.connect(echoLevel);
	echoLevel.connect(out);

	const answer = makeVoice(tone, plan.answer.voice, plan.answer.volume, plan.answer.decay);
	answer.node.connect(out);
	answer.node.connect(echo);

	const glints = makeVoice(tone, plan.glints.voice, plan.glints.volume, 1.2);
	const glintPan = new tone.Panner(0);
	glints.node.connect(glintPan);
	glintPan.connect(out);
	glintPan.connect(echo);

	const drone = new tone.PolySynth(tone.Synth, {
		volume: plan.drone.volume,
		oscillator: { type: plan.drone.osc, count: 2, spread: 18 },
		envelope: { attack: plan.drone.attack, decay: 1, sustain: 0.7, release: plan.drone.attack * 1.5 }
	});
	drone.maxPolyphony = 8;
	const droneTone = new tone.Filter({ type: 'lowpass', frequency: plan.drone.cutoff, rolloff: -24, Q: 0.6 });
	const droneWidth = new tone.Chorus({ frequency: 0.25, delayTime: 4, depth: 0.4, spread: 140, wet: 0.35 }).start();
	drone.chain(droneTone, droneWidth);
	droneWidth.connect(out);

	const disposables = [echo, echoTone, answer.node, ...answer.extra, glints.node, ...glints.extra, glintPan, drone, droneTone, droneWidth];

	return {
		note(freq, t, step) {
			if (!active) return;
			notes += 1;
			if (notes % plan.answer.every === 0) {
				const at = t + stepSeconds * plan.answer.delay + Math.abs(jitter(0.01));
				answer.play(freq * plan.answer.ratio, stepSeconds * 0.4, at, 0.55 + jitter(0.12));
			}
			if (Math.random() < plan.glints.chance) {
				const pick = scale[Math.floor(Math.random() * scale.length)] * plan.glints.octave;
				const at = t + stepSeconds * (0.25 + Math.random() * 0.5);
				glintPan.pan.setValueAtTime(step % 2 === 0 ? -0.5 : 0.5, at);
				glints.play(pick, 0.2, at, 0.45 + jitter(0.15));
			}
		},
		bass(freq, t) {
			if (!active) return;
			const chord = plan.drone.ratios.map((r) => freq * r);
			drone.triggerAttackRelease(chord, stepSeconds * plan.drone.holdSteps, t, 0.5 + jitter(0.08));
		},
		setActive(on, t) {
			active = on;
			out.gain.cancelScheduledValues(t);
			out.gain.setTargetAtTime(on ? 1 : 0, t, 0.3);
		},
		dispose() {
			for (const node of disposables) node.dispose();
			for (const node of [out, echoLevel]) node.disconnect();
		}
	};
}

/**
 * Owns the layer rig for one game's score: builds it when the score starts (loading
 * Tone.js on first use), follows the global toggle, and fades it out with the score.
 */
export function createAmbientLayers(id: string, stepSeconds: number, scale: number[]) {
	const plan = ARRANGEMENTS[id];
	let rig: AmbientRig | null = null;
	let bus: GainNode | null = null;
	let running = false;
	let session = 0;

	function attach(audio: AudioContext) {
		if (!isLayersOn() || rig || !bus || !plan) return;
		const tone = peekTone();
		if (tone) {
			rig = buildAmbientRig(tone, bus, plan, stepSeconds, scale);
			return;
		}
		const expected = session;
		void loadTone(audio).then((loaded) => {
			if (loaded && expected === session && running) attach(audio);
		});
	}

	watchLayers((on) => {
		if (!running || !bus) return;
		const audio = bus.context as AudioContext;
		if (rig) rig.setActive(on, audio.currentTime);
		else if (on) attach(audio);
	});

	return {
		start(audio: AudioContext, fadeIn: number) {
			running = true;
			session += 1;
			bus = audio.createGain();
			bus.gain.setValueAtTime(0.0001, audio.currentTime);
			bus.gain.exponentialRampToValueAtTime(1, audio.currentTime + fadeIn);
			const layers = getLayersBus();
			if (layers) bus.connect(layers);
			attach(audio);
		},
		stop(audio: AudioContext | null, fadeOut: number) {
			running = false;
			session += 1;
			const oldRig = rig;
			const oldBus = bus;
			rig = null;
			bus = null;
			if (!oldBus) return;
			if (audio) oldBus.gain.setTargetAtTime(0.0001, audio.currentTime, fadeOut / 4);
			window.setTimeout(() => {
				oldRig?.dispose();
				oldBus.disconnect();
			}, fadeOut * 1000 + 200);
		},
		note(freq: number, t: number, step: number) {
			rig?.note(freq, t, step);
		},
		bass(freq: number, t: number) {
			rig?.bass(freq, t);
		}
	};
}
