/**
 * Shared finishing chain for every game: the synth voices stay as written, but they
 * play in a room, drift like analog oscillators, and are glued and softly limited.
 * Each station picks a profile so the space suits its music.
 */

const AMOUNT = 0.6;

type Profile = {
	musicSpace: number;
	sfxSpace: number;
	chorus: number;
	drift: number;
	rt60: number;
	seconds: number;
	brightness: number;
};

/** Punchy chiptune and synthwave: a small bright room, barely any wobble. */
const ARCADE: Profile = {
	musicSpace: 0.1,
	sfxSpace: 0.07,
	chorus: 0.05,
	drift: 1.5,
	rt60: 0.7,
	seconds: 1,
	brightness: 9000
};

/** Slow pads and bells: a wider, darker space with gentle ensemble movement. */
const AMBIENT: Profile = {
	musicSpace: 0.24,
	sfxSpace: 0.13,
	chorus: 0.16,
	drift: 4,
	rt60: 1.8,
	seconds: 2.4,
	brightness: 6500
};

/** Stone vault: a long, dark tail for organ and choir; effects stay drier so play reads. */
const CATHEDRAL: Profile = {
	musicSpace: 0.36,
	sfxSpace: 0.14,
	chorus: 0.08,
	drift: 2.5,
	rt60: 3.4,
	seconds: 3.8,
	brightness: 5600
};

/** Open water: an enormous soft tail, dark and slow-moving, so pings carry and fade. */
const ABYSS: Profile = {
	musicSpace: 0.42,
	sfxSpace: 0.12,
	chorus: 0.2,
	drift: 3.5,
	rt60: 4.2,
	seconds: 4.6,
	brightness: 4200
};

/** Cold open air over a lake: bright and clear, with a long thin echo off the far shore. */
const FROZEN: Profile = {
	musicSpace: 0.3,
	sfxSpace: 0.1,
	chorus: 0.12,
	drift: 2,
	rt60: 2.8,
	seconds: 3.2,
	brightness: 8200
};

/** A small panelled study: warm and close, wood soaking up the highs, a short tail. */
const STUDY: Profile = {
	musicSpace: 0.18,
	sfxSpace: 0.08,
	chorus: 0.1,
	drift: 3,
	rt60: 1.2,
	seconds: 1.6,
	brightness: 5200
};

/** A vaulted stone cellar: a mid-length dark tail, glass ringing a little longer than wood would let it. */
const CELLAR: Profile = {
	musicSpace: 0.28,
	sfxSpace: 0.12,
	chorus: 0.14,
	drift: 2.5,
	rt60: 2.2,
	seconds: 2.6,
	brightness: 4600
};

/** Open air by slow water: soft and natural, a short diffuse tail off the far bank. */
const RIVERBANK: Profile = {
	musicSpace: 0.22,
	sfxSpace: 0.07,
	chorus: 0.1,
	drift: 2,
	rt60: 1.6,
	seconds: 2,
	brightness: 6400
};

/** A walled temple garden: open sky, but plaster and cedar send back a soft mid-length bloom. */
const TEMPLE: Profile = {
	musicSpace: 0.27,
	sfxSpace: 0.09,
	chorus: 0.12,
	drift: 2.5,
	rt60: 2.3,
	seconds: 2.6,
	brightness: 6000
};

/** A rocky headland at night: cannon and surf roll off the cliffs in a long, dark echo. */
const HEADLAND: Profile = {
	musicSpace: 0.24,
	sfxSpace: 0.12,
	chorus: 0.1,
	drift: 3,
	rt60: 2.8,
	seconds: 3,
	brightness: 4800
};

/** A marble hall at night: a tall, warm bloom off stone and panelling; wood on marble stays crisp. */
const GRAND_HALL: Profile = {
	musicSpace: 0.3,
	sfxSpace: 0.1,
	chorus: 0.09,
	drift: 2,
	rt60: 2.6,
	seconds: 3,
	brightness: 6200
};

/** A low-beamed snug: warm and close, plaster and oak taking the edge off, a short tail. */
const SNUG: Profile = {
	musicSpace: 0.2,
	sfxSpace: 0.07,
	chorus: 0.1,
	drift: 2.5,
	rt60: 1.3,
	seconds: 1.7,
	brightness: 5400
};

/** A sunlit garden pond: open air, bright and soft, a short shimmer off the water. */
const POND: Profile = {
	musicSpace: 0.22,
	sfxSpace: 0.08,
	chorus: 0.12,
	drift: 2.5,
	rt60: 1.8,
	seconds: 2.2,
	brightness: 7200
};

/** A pinball parlour after hours: a lively room with a hollow mid-length echo, so each table's music and chimes carry. */
const PARLOUR: Profile = {
	musicSpace: 0.26,
	sfxSpace: 0.08,
	chorus: 0.14,
	drift: 3.5,
	rt60: 2.2,
	seconds: 2.6,
	brightness: 6000
};

const PROFILES: Record<string, Profile> = {
	library: ARCADE,
	connect4: ARCADE,
	breakout: CATHEDRAL,
	reef: ABYSS,
	frost: FROZEN,
	cartographer: STUDY,
	apothecary: CELLAR,
	seedkeeper: RIVERBANK,
	zengarden: TEMPLE,
	lighthouse: HEADLAND,
	chess: GRAND_HALL,
	pub: SNUG,
	koi: POND,
	pinball: PARLOUR
};

export type Master = {
	sfxIn: AudioNode;
	musicIn: AudioNode;
	setStation: (station: string) => void;
};

function roomImpulse(audio: AudioContext, seconds: number, rt60: number) {
	const rate = audio.sampleRate;
	const length = Math.floor(rate * seconds);
	const buffer = audio.createBuffer(2, length, rate);
	const fadeIn = Math.floor(rate * 0.004);
	for (let ch = 0; ch < 2; ch += 1) {
		const data = buffer.getChannelData(ch);
		let lp = 0;
		for (let i = 0; i < length; i += 1) {
			const t = i / rate;
			// High frequencies die first, like air and soft walls absorbing them.
			const damp = 0.85 * Math.exp(-t * 2.6) + 0.06;
			lp += damp * (Math.random() * 2 - 1 - lp);
			const tail = Math.exp((-6.9 * t) / rt60);
			data[i] = lp * tail * (i < fadeIn ? i / fadeIn : 1);
		}
		// A few sparse early reflections, offset per ear so the room reads as wide.
		for (let r = 0; r < 7; r += 1) {
			const at = Math.floor(rate * (0.007 + r * 0.0085 + Math.random() * 0.004 + ch * 0.0023));
			if (at < length) data[at] += (Math.random() < 0.5 ? -1 : 1) * 0.5 * Math.exp(-r * 0.35);
		}
	}
	return buffer;
}

function softClipCurve(drive: number) {
	const curve = new Float32Array(2048);
	for (let i = 0; i < curve.length; i += 1) {
		const x = (i / (curve.length - 1)) * 2 - 1;
		curve[i] = Math.tanh(drive * x) / drive;
	}
	return curve;
}

function chorusVoice(audio: AudioContext, input: AudioNode, output: AudioNode, base: number, depth: number, rate: number, pan: number) {
	const delay = audio.createDelay(0.05);
	delay.delayTime.value = base;
	const lfo = audio.createOscillator();
	lfo.frequency.value = rate;
	const lfoDepth = audio.createGain();
	lfoDepth.gain.value = depth;
	lfo.connect(lfoDepth).connect(delay.delayTime);
	lfo.start();
	const panner = audio.createStereoPanner();
	panner.pan.value = pan;
	input.connect(delay).connect(panner).connect(output);
}

export function buildMaster(audio: AudioContext, initialStation: string): Master {
	let profile = PROFILES[initialStation] ?? AMBIENT;
	let swapTimer: number | null = null;
	const impulses = new Map<Profile, AudioBuffer>();

	const glue = audio.createDynamicsCompressor();
	glue.threshold.value = -10;
	glue.knee.value = 14;
	glue.ratio.value = 1.8;
	glue.attack.value = 0.015;
	glue.release.value = 0.25;

	const clip = audio.createWaveShaper();
	clip.curve = softClipCurve(1.1);
	clip.oversample = '2x';

	glue.connect(clip).connect(audio.destination);

	const preDelay = audio.createDelay(0.1);
	preDelay.delayTime.value = 0.014;
	const room = audio.createConvolver();
	// Keep low end out of the tail so kicks and bass stay tight.
	const wetLow = audio.createBiquadFilter();
	wetLow.type = 'highpass';
	wetLow.frequency.value = 240;
	const wetHigh = audio.createBiquadFilter();
	wetHigh.type = 'lowpass';
	preDelay.connect(room).connect(wetLow).connect(wetHigh).connect(glue);

	const sfxIn = audio.createGain();
	const sfxSend = audio.createGain();
	sfxIn.connect(glue);
	sfxIn.connect(sfxSend).connect(preDelay);

	const musicIn = audio.createGain();
	const musicSend = audio.createGain();
	musicIn.connect(glue);
	musicIn.connect(musicSend).connect(preDelay);

	const chorusFeed = audio.createBiquadFilter();
	chorusFeed.type = 'highpass';
	chorusFeed.frequency.value = 260;
	const chorusOut = audio.createGain();
	musicIn.connect(chorusFeed);
	chorusVoice(audio, chorusFeed, chorusOut, 0.017, 0.0024, 0.27, -0.75);
	chorusVoice(audio, chorusFeed, chorusOut, 0.023, 0.003, 0.19, 0.75);
	chorusOut.connect(glue);

	// Every oscillator lands a few cents off true pitch, so stacked notes beat and breathe.
	const create = audio.createOscillator.bind(audio);
	audio.createOscillator = () => {
		const osc = create();
		osc.detune.value = (Math.random() * 2 - 1) * profile.drift * AMOUNT;
		return osc;
	};

	function impulseFor(next: Profile) {
		let buffer = impulses.get(next);
		if (!buffer) {
			buffer = roomImpulse(audio, next.seconds, next.rt60);
			impulses.set(next, buffer);
		}
		return buffer;
	}

	function applyLevels(glide = 0.06) {
		const t = audio.currentTime;
		sfxSend.gain.setTargetAtTime(profile.sfxSpace * AMOUNT, t, glide);
		musicSend.gain.setTargetAtTime(profile.musicSpace * AMOUNT, t, glide);
		chorusOut.gain.setTargetAtTime(profile.chorus * AMOUNT, t, glide);
		wetHigh.frequency.setTargetAtTime(profile.brightness, t, glide);
	}

	room.buffer = impulseFor(profile);
	applyLevels(0.001);

	return {
		sfxIn,
		musicIn,
		setStation(station) {
			const next = PROFILES[station] ?? AMBIENT;
			if (next === profile) return;
			profile = next;
			// Fade the sends out before swapping rooms so the old tail never clicks.
			const t = audio.currentTime;
			sfxSend.gain.setTargetAtTime(0, t, 0.03);
			musicSend.gain.setTargetAtTime(0, t, 0.03);
			if (swapTimer != null) clearTimeout(swapTimer);
			swapTimer = window.setTimeout(() => {
				swapTimer = null;
				room.buffer = impulseFor(profile);
				applyLevels();
			}, 160);
		}
	};
}
