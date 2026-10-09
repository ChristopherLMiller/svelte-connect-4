import { getAudioContext, getMusicBus, isLayeredScoreOn } from '$lib/audio/core';
import { createAmbientLayers } from '$lib/audio/ambientLayers';
import { bass, comp, drum, hz, lead, type BassVoice, type CompVoice, type Drum, type Out, type Voice } from './synth';

/** One bar: the chord, its bass root, and the tune a step at a time (null holds the last note, 0 rests). */
export type Bar = { chord: number[]; root: number; tune: Array<number | null> };

export type Section = { bars: Bar[]; lead?: Voice; octave?: number; quiet?: boolean; drums?: boolean };

/**
 * A table's music. Patterns are strings with one character per step:
 * bass `R` root, `5` fifth, `O` octave, `3` the chord's middle note, `W` a walking note toward the next bar;
 * comp and drums `x` hit, `-` soft hit; `.` is silence everywhere.
 */
export type Score = {
	layers: string;
	step: number;
	steps: number;
	sections: Section[];
	lead: { voice: Voice; level: number; octave?: number };
	bass: { voice: BassVoice; level: number; pattern: string };
	comp?: { voice: CompVoice; level: number; pattern: string; octave?: number };
	drums?: { level: number } & Partial<Record<Drum, string>>;
	/** Delays every other step by this fraction of a step. */
	swing?: number;
	/** Chord tones sprinkled between the tune's notes. */
	sparkle?: { voice: Voice; chance: number; level: number; octave: number };
	scale: number[];
};

const at = (pattern: string, i: number) => pattern[i % pattern.length] ?? '.';

export function createScore(score: Score) {
	let running = false;
	let hot = false;
	let timer: number | null = null;
	let stem: GainNode | null = null;
	let live: AudioScheduledSourceNode[] = [];
	let step = 0;
	let nextAt = 0;
	const barLen = score.step * score.steps;
	const layers = createAmbientLayers(score.layers, barLen / 2, score.scale.map(hz));
	const totalBars = score.sections.reduce((n, s) => n + s.bars.length, 0);

	const out = (): Out | null => {
		const audio = getAudioContext();
		if (!audio || !stem) return null;
		return {
			audio,
			dest: stem,
			track: (...nodes) => {
				live.push(...nodes);
				if (live.length > 400) live = live.slice(-280);
			}
		};
	};

	function locate(barIndex: number) {
		let i = barIndex % totalBars;
		for (const section of score.sections) {
			if (i < section.bars.length) return { section, bar: section.bars[i]!, next: section.bars[(i + 1) % section.bars.length]! };
			i -= section.bars.length;
		}
		const s = score.sections[0]!;
		return { section: s, bar: s.bars[0]!, next: s.bars[0]! };
	}

	function play(o: Out, s: number, t: number) {
		const beat = s % score.steps;
		const barIndex = Math.floor(s / score.steps);
		const { section, bar, next } = locate(barIndex);
		const quiet = section.quiet && !hot;
		const lift = hot ? 1.25 : 1;

		const b = at(score.bass.pattern, s);
		if (b !== '.') {
			let n = bar.root;
			if (b === '5') n = bar.root + 7;
			else if (b === 'O') n = bar.root + 12;
			else if (b === '3') n = (bar.chord[1] ?? bar.root + 16) - 24;
			else if (b === 'W') n = next.root + (Math.random() < 0.5 ? -1 : 2);
			let len = 1;
			while (beat + len < score.steps && at(score.bass.pattern, s + len) === '.') len += 1;
			bass(o, score.bass.voice, n, t, len * score.step, score.bass.level * (quiet ? 0.6 : 1));
			if (beat === 0) layers.bass(hz(bar.root + 12), t);
		}

		if (score.comp && !quiet) {
			const c = at(score.comp.pattern, s);
			if (c !== '.') {
				const chord = bar.chord.map((n) => n + 12 * (score.comp!.octave ?? 0));
				const level = score.comp.level * (c === '-' ? 0.6 : 1) * lift;
				if (score.comp.voice === 'arp') lead(o, 'harp', chord[beat % chord.length]! + 12, t, score.step, level);
				else {
					let len = 1;
					while (beat + len < score.steps && at(score.comp.pattern, s + len) === '.') len += 1;
					comp(o, score.comp.voice, chord, t, len * score.step, level);
				}
			}
		}

		const note = bar.tune[beat];
		if (note) {
			let len = 1;
			while (beat + len < score.steps && bar.tune[beat + len] === null) len += 1;
			const voice = section.lead ?? score.lead.voice;
			const level = score.lead.level * (quiet ? 0.7 : 1) * (hot ? 1.15 : 1);
			lead(o, voice, note + 12 * (section.octave ?? score.lead.octave ?? 0), t, len * score.step, level);
			if (beat === 0 || beat === score.steps / 2) layers.note(hz(note), t, barIndex);
		}

		const drums = score.drums;
		if (drums && (section.drums !== false || hot) && !quiet) {
			for (const kind of ['kick', 'snap', 'tick', 'tom', 'block'] as Drum[]) {
				const p = drums[kind];
				if (!p) continue;
				const c = at(p, s);
				if (c === '.') continue;
				drum(o, kind, t, drums.level * (c === '-' ? 0.5 : 1) * lift, kind === 'tom' ? (beat % 3) * 3 : kind === 'block' ? (beat % 2) * 5 : 0);
			}
		} else if (hot && beat % Math.max(1, score.steps / 4) === 0) drum(o, 'kick', t, 0.12, 0);

		const sparkle = score.sparkle;
		if (sparkle && !note && !quiet && Math.random() < sparkle.chance) {
			const n = bar.chord[Math.floor(Math.random() * bar.chord.length)]! + 12 * sparkle.octave;
			lead(o, sparkle.voice, n, t + score.step * 0.5, score.step, sparkle.level);
		}
	}

	function schedule() {
		if (!running) return;
		const audio = getAudioContext();
		if (!audio || !isLayeredScoreOn()) {
			timer = window.setTimeout(schedule, 120);
			return;
		}
		const o = out();
		while (o && nextAt < audio.currentTime + 0.3) {
			const swing = step % 2 === 1 ? (score.swing ?? 0) * score.step : 0;
			play(o, step, nextAt + swing);
			nextAt += score.step;
			step += 1;
		}
		timer = window.setTimeout(schedule, 140);
	}

	return {
		start() {
			if (running || !isLayeredScoreOn()) return;
			const audio = getAudioContext();
			const bus = getMusicBus();
			if (!audio || !bus) return;
			running = true;
			step = 0;
			stem = audio.createGain();
			stem.gain.setValueAtTime(0.0001, audio.currentTime);
			stem.gain.exponentialRampToValueAtTime(1, audio.currentTime + 1.6);
			stem.connect(bus);
			layers.start(audio, 1.6);
			nextAt = audio.currentTime + 0.4;
			schedule();
		},
		stop() {
			running = false;
			if (timer != null) {
				clearTimeout(timer);
				timer = null;
			}
			const audio = getAudioContext();
			layers.stop(audio, 1.2);
			const dying = live.slice();
			const old = stem;
			live = [];
			stem = null;
			if (!old || !audio) return;
			old.gain.setTargetAtTime(0.0001, audio.currentTime, 0.2);
			window.setTimeout(() => {
				for (const node of dying) {
					try {
						node.stop();
						node.disconnect();
					} catch {
						/* already stopped */
					}
				}
				old.disconnect();
			}, 1100);
		},
		setHot(on: boolean) {
			hot = on;
		},
		get running() {
			return running;
		}
	};
}

export type ScorePlayer = ReturnType<typeof createScore>;
