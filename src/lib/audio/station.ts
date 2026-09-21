import { bindMusicEngine, isMusicOn } from '$lib/audio/core';

export type MusicStation = 'none' | 'library' | string;

type MusicPack = {
	startMusic?: () => void;
	stopMusic?: () => void;
};

const loaders = import.meta.glob<MusicPack>('../games/*/audio.ts');
const loaded = new Map<string, MusicPack>();

let station: MusicStation = 'none';
let bound = false;
let library: typeof import('$lib/library/score') | null = null;
let token = 0;

function idFrom(path: string) {
	return path.match(/\/games\/([^/]+)\/audio\.ts$/)?.[1];
}

function loaderFor(id: string) {
	const hit = Object.entries(loaders).find(([path]) => idFrom(path) === id);
	return hit?.[1];
}

async function packFor(id: string) {
	const cached = loaded.get(id);
	if (cached) return cached;
	const load = loaderFor(id);
	if (!load) return undefined;
	const pack = await load();
	loaded.set(id, pack);
	return pack;
}

function stopAll() {
	library?.stopLibraryScore();
	for (const pack of loaded.values()) pack.stopMusic?.();
}

async function startActive(expected: number) {
	if (!isMusicOn() || expected !== token) return;
	if (station === 'library') {
		library ??= await import('$lib/library/score');
		if (expected !== token) return;
		library.startLibraryScore();
		return;
	}
	if (station === 'none') return;
	const pack = await packFor(station);
	if (expected !== token) return;
	pack?.startMusic?.();
}

function ensureBound() {
	if (bound) return;
	bound = true;
	bindMusicEngine({
		start: () => {
			const expected = ++token;
			void startActive(expected);
		},
		stop: stopAll
	});
}

export function setMusicStation(next: MusicStation) {
	ensureBound();
	if (station === next) {
		const expected = ++token;
		void startActive(expected);
		return;
	}
	token += 1;
	stopAll();
	station = next;
	const expected = token;
	void startActive(expected);
}

export function getMusicStation() {
	return station;
}
