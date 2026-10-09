/** Oscillator instruments shared by every table's score and effects. All tone, no noise. */

export const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

export type Out = { audio: AudioContext; dest: AudioNode; track: (...nodes: AudioScheduledSourceNode[]) => void };

export function env(audio: AudioContext, start: number, peak: number, attack: number, release: number) {
	const gain = audio.createGain();
	gain.gain.setValueAtTime(0.0001, start);
	gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + attack);
	gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + release);
	return gain;
}

export function hold(audio: AudioContext, start: number, peak: number, attack: number, length: number, release: number) {
	const gain = audio.createGain();
	const top = Math.max(0.0002, peak);
	gain.gain.setValueAtTime(0.0001, start);
	gain.gain.exponentialRampToValueAtTime(top, start + attack);
	gain.gain.setValueAtTime(top, start + Math.max(attack, length));
	gain.gain.exponentialRampToValueAtTime(0.0001, start + Math.max(attack, length) + release);
	return gain;
}

function osc(o: Out, type: OscillatorType, f: number, t: number, stop: number, dest: AudioNode, detune = 0) {
	const n = o.audio.createOscillator();
	n.type = type;
	n.frequency.value = f;
	if (detune) n.detune.value = detune;
	n.connect(dest);
	n.start(t);
	n.stop(stop);
	o.track(n);
	return n;
}

function lowpass(audio: AudioContext, f: number, q = 0.7) {
	const filter = audio.createBiquadFilter();
	filter.type = 'lowpass';
	filter.frequency.value = f;
	filter.Q.value = q;
	return filter;
}

function vibrato(o: Out, t: number, stop: number, rate: number, depth: number, delay = 0) {
	const lfo = o.audio.createOscillator();
	lfo.frequency.value = rate;
	const g = o.audio.createGain();
	g.gain.setValueAtTime(0, t);
	g.gain.linearRampToValueAtTime(depth, t + delay + 0.05);
	lfo.connect(g);
	lfo.start(t);
	lfo.stop(stop);
	o.track(lfo);
	return g;
}

export type Voice = 'calliope' | 'tine' | 'vibes' | 'square' | 'reed' | 'whistle' | 'horn' | 'harp' | 'organ' | 'glass' | 'chime' | 'bell';

/** A melodic note on one of the lead voices. */
export function lead(o: Out, voice: Voice, midi: number, t: number, length: number, peak: number) {
	const { audio } = o;
	const f = hz(midi);
	switch (voice) {
		case 'calliope': {
			const out = hold(audio, t, peak, 0.03, length * 0.85, 0.09);
			out.connect(o.dest);
			const stop = t + length + 0.15;
			const wob = vibrato(o, t, stop, 5.6 + Math.random() * 0.8, f * 0.006);
			for (const [ratio, level, type] of [
				[1, 1, 'sine'],
				[2, 0.28, 'triangle'],
				[3, 0.07, 'sine']
			] as Array<[number, number, OscillatorType]>) {
				const g = audio.createGain();
				g.gain.value = level;
				g.connect(out);
				const n = osc(o, type, f * ratio, t, stop, g, (Math.random() - 0.5) * 8);
				wob.connect(n.frequency);
			}
			return;
		}
		case 'tine':
			tine(o, midi, t, peak, Math.max(0.8, length * 1.6));
			return;
		case 'bell':
			bell(o, f, t, peak, Math.max(0.6, length * 1.5));
			return;
		case 'chime':
			chime(o, midi, t, peak, Math.max(1, length * 2));
			return;
		case 'vibes': {
			const stop = t + length + 1.2;
			const out = env(audio, t, peak, 0.004, length + 0.9);
			const trem = audio.createGain();
			trem.gain.value = 0.75;
			const lfo = vibrato(o, t, stop, 5.2, 0.25);
			lfo.connect(trem.gain);
			trem.connect(out).connect(o.dest);
			osc(o, 'sine', f, t, stop, trem);
			const g = audio.createGain();
			g.gain.value = 0.12;
			g.connect(trem);
			osc(o, 'sine', f * 4, t, stop, g);
			return;
		}
		case 'square': {
			const stop = t + length + 0.2;
			const out = hold(audio, t, peak * 0.7, 0.008, length * 0.9, 0.08);
			const filter = lowpass(audio, Math.min(5200, f * 6), 1.2);
			filter.connect(out).connect(o.dest);
			osc(o, 'square', f, t, stop, filter);
			osc(o, 'square', f, t, stop, filter, 9);
			return;
		}
		case 'reed': {
			const stop = t + length + 0.2;
			const out = hold(audio, t, peak * 0.75, 0.04, length * 0.9, 0.1);
			const filter = lowpass(audio, 2200, 0.8);
			filter.connect(out).connect(o.dest);
			osc(o, 'square', f, t, stop, filter, -6);
			osc(o, 'sawtooth', f, t, stop, filter, 7);
			return;
		}
		case 'whistle': {
			const stop = t + length + 0.25;
			const out = hold(audio, t, peak * 1.1, 0.05, length * 0.9, 0.16);
			out.connect(o.dest);
			const n = osc(o, 'sine', f, t, stop, out);
			n.frequency.setValueAtTime(f * 0.97, t);
			n.frequency.exponentialRampToValueAtTime(f, t + 0.06);
			vibrato(o, t, stop, 5.4, f * 0.014, Math.min(0.25, length * 0.4)).connect(n.frequency);
			return;
		}
		case 'horn': {
			const stop = t + length + 0.3;
			const out = hold(audio, t, peak * 0.85, 0.07, length * 0.9, 0.18);
			const filter = lowpass(audio, f * 2, 0.9);
			filter.frequency.setValueAtTime(f * 1.2, t);
			filter.frequency.linearRampToValueAtTime(f * 4, t + 0.12);
			filter.connect(out).connect(o.dest);
			osc(o, 'sawtooth', f, t, stop, filter);
			osc(o, 'sawtooth', f, t, stop, filter, 8);
			return;
		}
		case 'harp': {
			const stop = t + 1.6;
			const out = env(audio, t, peak * 1.2, 0.003, 1.3);
			out.connect(o.dest);
			osc(o, 'triangle', f, t, stop, out);
			const g = env(audio, t, peak * 0.4, 0.002, 0.25);
			g.connect(o.dest);
			osc(o, 'sine', f * 2, t, t + 0.4, g);
			return;
		}
		case 'organ': {
			const stop = t + length + 0.2;
			const out = hold(audio, t, peak * 0.6, 0.02, length * 0.92, 0.08);
			out.connect(o.dest);
			for (const [ratio, level] of [
				[0.5, 0.5],
				[1, 1],
				[2, 0.5],
				[3, 0.25],
				[4, 0.2]
			] as Array<[number, number]>) {
				const g = audio.createGain();
				g.gain.value = level;
				g.connect(out);
				osc(o, 'sine', f * ratio, t, stop, g);
			}
			return;
		}
		case 'glass': {
			const stop = t + length + 1.4;
			const out = env(audio, t, peak, 0.01, length + 1.2);
			out.connect(o.dest);
			osc(o, 'sine', f, t, stop, out);
			const g = audio.createGain();
			g.gain.value = 0.2;
			g.connect(out);
			osc(o, 'sine', f * 3.5, t, stop, g);
			return;
		}
	}
}

/** Music box tine: a bright sine with a quiet inharmonic partial. */
export function tine(o: Out, midi: number, t: number, peak: number, length = 1.1) {
	for (const [ratio, level, decay] of [
		[1, 1, length],
		[4.07, 0.18, length * 0.25]
	] as Array<[number, number, number]>) {
		const g = env(o.audio, t, peak * level, 0.003, decay);
		g.connect(o.dest);
		osc(o, 'sine', hz(midi) * ratio, t, t + decay + 0.05, g);
	}
}

/** A struck bell with a few inharmonic partials. */
export function bell(o: Out, f: number, t: number, peak: number, length: number) {
	for (const [ratio, level, decay] of [
		[1, 1, 1],
		[2, 0.5, 0.7],
		[2.4, 0.35, 0.5],
		[3, 0.25, 0.4],
		[4.2, 0.15, 0.25]
	] as Array<[number, number, number]>) {
		const g = env(o.audio, t, peak * level, 0.004, length * decay);
		g.connect(o.dest);
		osc(o, 'sine', f * ratio, t, t + length * decay + 0.05, g);
	}
}

/** An electro-mechanical chime: a rod struck by a plunger, round and long. */
export function chime(o: Out, midi: number, t: number, peak: number, length = 2) {
	for (const [ratio, level, decay] of [
		[1, 1, 1],
		[2.76, 0.3, 0.45],
		[5.4, 0.12, 0.2]
	] as Array<[number, number, number]>) {
		const g = env(o.audio, t, peak * level, 0.002, length * decay);
		g.connect(o.dest);
		osc(o, 'sine', hz(midi) * ratio, t, t + length * decay + 0.05, g);
	}
}

export type BassVoice = 'oom' | 'pluck' | 'synth' | 'sub' | 'upright';

export function bass(o: Out, voice: BassVoice, midi: number, t: number, length: number, peak: number) {
	const { audio } = o;
	const f = hz(midi);
	switch (voice) {
		case 'oom': {
			const filter = lowpass(audio, 420);
			const g = env(audio, t, peak, 0.015, Math.min(0.5, length));
			filter.connect(g).connect(o.dest);
			osc(o, 'sawtooth', f, t, t + 0.6, filter);
			osc(o, 'sine', f * 0.5, t, t + 0.6, filter);
			return;
		}
		case 'pluck': {
			const g = env(audio, t, peak, 0.004, Math.min(0.6, length * 1.2));
			const filter = lowpass(audio, 900);
			filter.connect(g).connect(o.dest);
			osc(o, 'triangle', f, t, t + 0.7, filter);
			osc(o, 'square', f, t, t + 0.12, filter);
			return;
		}
		case 'synth': {
			const g = hold(audio, t, peak * 0.8, 0.005, length * 0.7, 0.06);
			const filter = lowpass(audio, 300, 4);
			filter.frequency.setValueAtTime(1600, t);
			filter.frequency.exponentialRampToValueAtTime(260, t + 0.18);
			filter.connect(g).connect(o.dest);
			osc(o, 'sawtooth', f, t, t + length + 0.1, filter);
			osc(o, 'square', f * 0.5, t, t + length + 0.1, filter);
			return;
		}
		case 'sub': {
			const g = hold(audio, t, peak, 0.08, length * 0.8, 0.4);
			g.connect(o.dest);
			osc(o, 'sine', f, t, t + length + 0.5, g);
			return;
		}
		case 'upright': {
			const g = env(audio, t, peak, 0.01, Math.min(0.9, length * 1.1));
			g.connect(o.dest);
			osc(o, 'sine', f, t, t + 1, g);
			const h = env(audio, t, peak * 0.3, 0.005, 0.12);
			h.connect(o.dest);
			osc(o, 'triangle', f * 2, t, t + 0.2, h);
			return;
		}
	}
}

export type CompVoice = 'pah' | 'strum' | 'organ' | 'pad' | 'stab' | 'arp';

export function comp(o: Out, voice: CompVoice, chord: number[], t: number, length: number, peak: number) {
	const { audio } = o;
	switch (voice) {
		case 'pah': {
			const g = env(audio, t, peak, 0.01, 0.16);
			const filter = lowpass(audio, 1500);
			filter.connect(g).connect(o.dest);
			for (const n of chord) osc(o, 'triangle', hz(n), t, t + 0.22, filter);
			return;
		}
		case 'strum':
			chord.forEach((n, i) => lead(o, 'harp', n, t + i * 0.018, length, peak * 0.8));
			return;
		case 'organ':
			for (const n of chord) lead(o, 'organ', n, t, length, peak * 0.6);
			return;
		case 'pad': {
			const g = hold(audio, t, peak, Math.min(0.6, length * 0.3), length * 0.8, length * 0.4);
			const filter = lowpass(audio, 1100);
			filter.connect(g).connect(o.dest);
			for (const n of chord) {
				osc(o, 'triangle', hz(n), t, t + length * 1.3, filter, -7);
				osc(o, 'triangle', hz(n), t, t + length * 1.3, filter, 7);
			}
			return;
		}
		case 'stab': {
			const g = env(audio, t, peak, 0.006, 0.14);
			const filter = lowpass(audio, 2400, 1.5);
			filter.connect(g).connect(o.dest);
			for (const n of chord) osc(o, 'sawtooth', hz(n), t, t + 0.2, filter);
			return;
		}
		case 'arp':
			return;
	}
}

export type Drum = 'kick' | 'snap' | 'tick' | 'tom' | 'block';

/** Pitched percussion: falling sines and short clicks rather than noise. */
export function drum(o: Out, kind: Drum, t: number, peak: number, pitch = 0) {
	const { audio } = o;
	switch (kind) {
		case 'kick': {
			const g = env(audio, t, peak, 0.002, 0.22);
			g.connect(o.dest);
			const n = osc(o, 'sine', 150, t, t + 0.3, g);
			n.frequency.setValueAtTime(150, t);
			n.frequency.exponentialRampToValueAtTime(42, t + 0.16);
			return;
		}
		case 'tom': {
			const f = 110 * Math.pow(2, pitch / 12);
			const g = env(audio, t, peak, 0.002, 0.3);
			g.connect(o.dest);
			const n = osc(o, 'sine', f * 1.6, t, t + 0.4, g);
			n.frequency.exponentialRampToValueAtTime(f, t + 0.12);
			return;
		}
		case 'snap': {
			const g = env(audio, t, peak * 0.5, 0.001, 0.09);
			g.connect(o.dest);
			const n = osc(o, 'triangle', 380, t, t + 0.12, g);
			n.frequency.exponentialRampToValueAtTime(190, t + 0.08);
			const h = env(audio, t, peak * 0.35, 0.001, 0.03);
			h.connect(o.dest);
			osc(o, 'square', 1900, t, t + 0.05, h);
			return;
		}
		case 'tick': {
			const g = env(audio, t, peak * 0.3, 0.001, 0.02);
			g.connect(o.dest);
			osc(o, 'triangle', 3200 + pitch * 100, t, t + 0.04, g);
			return;
		}
		case 'block': {
			const g = env(audio, t, peak * 0.5, 0.001, 0.06);
			g.connect(o.dest);
			osc(o, 'sine', 900 * Math.pow(2, pitch / 12), t, t + 0.09, g);
			return;
		}
	}
}

/** A pitch sweep: the building block of most effects. */
export function sweep(o: Out, type: OscillatorType, from: number, to: number, t: number, peak: number, attack: number, length: number) {
	const g = env(o.audio, t, peak, attack, length);
	g.connect(o.dest);
	const n = osc(o, type, from, t, t + attack + length + 0.05, g);
	if (to !== from) n.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + attack + length);
	return n;
}

/** A held tone with an optional wobble: moans, whistles, engines. */
export function swell(o: Out, type: OscillatorType, from: number, to: number, t: number, peak: number, length: number, wobble = 0, rate = 7) {
	const g = hold(o.audio, t, peak, Math.min(0.08, length * 0.2), length * 0.75, length * 0.25);
	g.connect(o.dest);
	const n = osc(o, type, from, t, t + length + 0.1, g);
	if (to !== from) n.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + length);
	if (wobble) vibrato(o, t, t + length + 0.1, rate, from * wobble).connect(n.frequency);
	return n;
}
