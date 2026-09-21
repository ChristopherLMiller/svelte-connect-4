import { connectSfx, sfxContext } from '$lib/audio/core';

function env(audio: AudioContext, start: number, peak: number, attack: number, release: number) {
	const gain = audio.createGain();
	gain.gain.setValueAtTime(0.0001, start);
	gain.gain.exponentialRampToValueAtTime(peak, start + attack);
	gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + release);
	return gain;
}

export function playLibraryHover() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const osc = audio.createOscillator();
	const gain = env(audio, t, 0.034, 0.004, 0.07);
	osc.type = 'square';
	osc.frequency.setValueAtTime(880, t);
	osc.frequency.exponentialRampToValueAtTime(1320, t + 0.06);
	osc.connect(gain);
	connectSfx(gain);
	osc.start(t);
	osc.stop(t + 0.09);
}

export function playLibrarySelect() {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	const coin = audio.createOscillator();
	const ping = audio.createOscillator();
	const gain = env(audio, t, 0.07, 0.004, 0.22);
	coin.type = 'square';
	ping.type = 'sine';
	coin.frequency.setValueAtTime(980, t);
	coin.frequency.exponentialRampToValueAtTime(1960, t + 0.08);
	ping.frequency.setValueAtTime(1568, t);
	ping.frequency.exponentialRampToValueAtTime(2480, t + 0.12);
	coin.connect(gain);
	ping.connect(gain);
	connectSfx(gain);
	coin.start(t);
	ping.start(t + 0.04);
	coin.stop(t + 0.16);
	ping.stop(t + 0.22);
}

export function playHallPoke(kind: 'soft' | 'coin' | 'mew' | 'buzz' | 'pop' = 'soft') {
	const audio = sfxContext();
	if (!audio) return;
	const t = audio.currentTime;
	if (kind === 'coin') {
		playLibrarySelect();
		return;
	}
	const osc = audio.createOscillator();
	const gain = env(audio, t, kind === 'pop' ? 0.05 : 0.04, 0.004, kind === 'buzz' ? 0.12 : 0.18);
	if (kind === 'mew') {
		osc.type = 'triangle';
		osc.frequency.setValueAtTime(720, t);
		osc.frequency.exponentialRampToValueAtTime(420, t + 0.16);
	} else if (kind === 'buzz') {
		osc.type = 'square';
		osc.frequency.setValueAtTime(1480, t);
		osc.frequency.exponentialRampToValueAtTime(2100, t + 0.08);
	} else if (kind === 'pop') {
		osc.type = 'sine';
		osc.frequency.setValueAtTime(280, t);
		osc.frequency.exponentialRampToValueAtTime(90, t + 0.12);
	} else {
		osc.type = 'sine';
		osc.frequency.setValueAtTime(520, t);
		osc.frequency.exponentialRampToValueAtTime(340, t + 0.14);
	}
	osc.connect(gain);
	connectSfx(gain);
	osc.start(t);
	osc.stop(t + 0.22);
}

