export type PlanetKind = 'gas' | 'ice' | 'rock' | 'dwarf' | 'ember';

export type Planet = {
	id: string;
	kind: PlanetKind;
	x: number;
	y: number;
	size: number;
	moon: boolean;
	spin: number;
	bob: number;
	phase: number;
	axial: number;
	wobble: number;
	retro: boolean;
	storm: boolean;
	cities: boolean;
	ringed: boolean;
	orbit: number;
};

export type EasterKind =
	| 'whale'
	| 'station'
	| 'monolith'
	| 'ufo'
	| 'pulsar'
	| 'wormhole'
	| 'four'
	| 'probe'
	| 'beacon'
	| 'starman'
	| 'ark';

export type EasterEgg = {
	id: string;
	kind: EasterKind;
	x: number;
	y: number;
	scale: number;
	dur: number;
	delay: number;
	tilt: number;
};

export type Sighting = EasterEgg & {
	born: number;
	life: number;
};

export type Cloud = {
	id: string;
	x: number;
	y: number;
	w: number;
	h: number;
	a: string;
	b: string;
	tilt: number;
	opacity: number;
};

export type Rock = {
	id: string;
	x: number;
	y: number;
	w: number;
	h: number;
	rot: number;
};

export type Comet = {
	id: string;
	x: number;
	y: number;
	angle: number;
	travel: number;
	dur: number;
	delay: number;
	len: number;
	thick: number;
	color: string;
};

export type Sector = {
	id: number;
	origin: number;
	dust: string;
	glow: string;
	nebulae: Cloud[];
	wisps: Cloud[];
	planets: Planet[];
	galaxy: { x: number; y: number; size: number; spin: number } | null;
	craft: { x: number; y: number } | null;
	rocks: Rock[];
	comets: Comet[];
	eggs: EasterEgg[];
	tint: string;
	lane: { x: number; y: number; tilt: number; opacity: number };
};

const KINDS: PlanetKind[] = ['gas', 'ice', 'rock', 'dwarf', 'ember'];
const COMET_COLORS = ['#5ce1e6', '#8b7cff', '#ffe38a', '#ff6b8a', '#ffffff'];
const EGG_COMMON: EasterKind[] = ['ufo', 'probe', 'beacon', 'pulsar', 'station'];
const EGG_RARE: EasterKind[] = ['whale', 'wormhole', 'monolith', 'ark'];
const EGG_ULTRA: EasterKind[] = ['four', 'starman'];
const NEBULA = [
	['rgba(139, 124, 255, 0.42)', 'rgba(255, 160, 220, 0.22)'],
	['rgba(255, 51, 92, 0.28)', 'rgba(255, 180, 140, 0.16)'],
	['rgba(92, 225, 230, 0.24)', 'rgba(180, 255, 230, 0.14)'],
	['rgba(160, 120, 255, 0.26)', 'rgba(255, 227, 138, 0.12)'],
	['rgba(255, 90, 150, 0.2)', 'rgba(120, 180, 255, 0.16)']
];

export const SECTOR_SPAN = 1.2;

function mulberry32(seed: number) {
	let s = seed | 0;
	return () => {
		s = (s + 0x6d2b79f5) | 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function mix(a: number, b: number, c = 0) {
	return (Math.imul(a, 374761393) ^ Math.imul(b, 668265263) ^ Math.imul(c, 1597334677)) >>> 0;
}

function pick<T>(rand: () => number, list: T[]) {
	return list[Math.floor(rand() * list.length) % list.length];
}

function specks(rand: () => number, count: number, palette: Array<[number, number, number]>, blur: [number, number]) {
	return Array.from({ length: count }, () => {
		const x = Math.round(rand() * 1600);
		const y = Math.round(rand() * 1400);
		const c = pick(rand, palette);
		const a = (0.12 + rand() * 0.6).toFixed(2);
		const glow = blur[0] + rand() * (blur[1] - blur[0]);
		const spread = rand() > 0.86 ? 1 : 0;
		return `${x}px ${y}px ${glow.toFixed(1)}px ${spread}px rgba(${c[0]},${c[1]},${c[2]},${a})`;
	}).join(',');
}

function makeEgg(id: string, kind: EasterKind, rand: () => number): EasterEgg {
	return {
		id,
		kind,
		x: 6 + rand() * 82,
		y: 8 + rand() * 72,
		scale: 0.72 + rand() * 0.7,
		dur: 16 + rand() * 22,
		delay: rand() * 4,
		tilt: -18 + rand() * 36
	};
}

export function createSighting(now = Date.now()): Sighting {
	const rand = mulberry32(mix(now, 9049, now >>> 3));
	const tier = rand();
	const kind =
		tier > 0.9 ? pick(rand, EGG_ULTRA) : tier > 0.55 ? pick(rand, EGG_RARE) : pick(rand, EGG_COMMON);
	const egg = makeEgg(`fly-${now}`, kind, rand);
	egg.x = -8 + rand() * 12;
	egg.y = 12 + rand() * 60;
	egg.dur = 14 + rand() * 10;
	return { ...egg, born: now, life: (egg.dur + egg.delay) * 1000 + 800 };
}

export function generateSector(voyageSeed: number, index: number, timeSeed: number, origin: number): Sector {
	const rand = mulberry32(mix(voyageSeed, index + 1, timeSeed));
	const ice: Array<[number, number, number]> = [
		[255, 255, 255],
		[210, 230, 255],
		[180, 210, 255]
	];
	const glow: Array<[number, number, number]> = [
		[180, 160, 255],
		[255, 130, 170],
		[92, 225, 230],
		[255, 227, 138],
		[255, 255, 255]
	];

	const planetCount = 1 + Math.floor(rand() * 3);
	const usedKinds = new Set<PlanetKind>();
	const planets: Planet[] = [];
	for (let i = 0; i < planetCount; i += 1) {
		let kind = pick(rand, KINDS);
		if (usedKinds.has(kind) && rand() > 0.35) kind = pick(rand, KINDS);
		usedKinds.add(kind);
		const size =
			kind === 'gas' ? 140 + rand() * 90 : kind === 'ice' ? 70 + rand() * 50 : kind === 'rock' ? 44 + rand() * 28 : 28 + rand() * 22;
		const spinBase = kind === 'gas' ? 54 : kind === 'ember' ? 18 : kind === 'ice' ? 36 : 28;
		planets.push({
			id: `${index}-p-${i}`,
			kind,
			x: 4 + rand() * 78,
			y: 8 + rand() * 74,
			size,
			moon: (kind === 'gas' && rand() > 0.35) || (kind === 'ice' && rand() > 0.88),
			spin: spinBase + rand() * spinBase * 0.9,
			bob: 8 + rand() * 10,
			phase: rand() * 9,
			axial: -22 + rand() * 44,
			wobble: 5 + rand() * 14,
			retro: rand() > 0.78,
			storm: kind === 'gas' && rand() > 0.48,
			cities: (kind === 'rock' || kind === 'ice' || kind === 'dwarf') && rand() > 0.84,
			ringed: kind !== 'gas' && kind !== 'ember' && rand() > 0.9,
			orbit: 11 + rand() * 10
		});
	}

	const nebulaCount = 2 + Math.floor(rand() * 3);
	const nebulae = Array.from({ length: nebulaCount }, (_, i) => {
		const pair = pick(rand, NEBULA);
		return {
			id: `${index}-n-${i}`,
			x: -12 + rand() * 70,
			y: -8 + rand() * 70,
			w: 28 + rand() * 36,
			h: 18 + rand() * 26,
			a: pair[0],
			b: pair[1],
			tilt: -24 + rand() * 48,
			opacity: 0.55 + rand() * 0.35
		};
	});

	const wisps = Array.from({ length: 1 + Math.floor(rand() * 3) }, (_, i) => {
		const pair = pick(rand, NEBULA);
		return {
			id: `${index}-w-${i}`,
			x: rand() * 80,
			y: 10 + rand() * 70,
			w: 16 + rand() * 18,
			h: 5 + rand() * 5,
			a: pair[0],
			b: 'transparent',
			tilt: -22 + rand() * 44,
			opacity: 0.35 + rand() * 0.3
		};
	});

	const headings = [18, 32, 148, 162, -20, 200, 44, 172];
	const cometCount = 2 + Math.floor(rand() * 3);
	const comets = Array.from({ length: cometCount }, (_, i) => ({
		id: `${index}-c-${i}`,
		x: -20 + rand() * 120,
		y: -10 + rand() * 90,
		angle: pick(rand, headings) + (rand() - 0.5) * 22,
		travel: 100 + rand() * 70,
		dur: 5 + rand() * 8,
		delay: rand() * 9,
		len: 60 + rand() * 90,
		thick: 1.3 + rand() * 1.8,
		color: pick(rand, COMET_COLORS)
	}));

	const eggs: EasterEgg[] = [];
	const eggRoll = rand();
	const eggChance = index < 3 ? 0.07 : 0.2;
	if (eggRoll < eggChance) {
		const tier = rand();
		const kind =
			tier > 0.93 ? pick(rand, EGG_ULTRA) : tier > 0.62 ? pick(rand, EGG_RARE) : pick(rand, EGG_COMMON);
		eggs.push(makeEgg(`${index}-egg`, kind, rand));
	}

	return {
		id: index,
		origin,
		dust: specks(rand, 90, ice, [0, 0.4]),
		glow: specks(rand, 40, glow, [1, 4.5]),
		nebulae,
		wisps,
		planets,
		galaxy:
			rand() > 0.42
				? { x: 6 + rand() * 78, y: 10 + rand() * 70, size: 180 + rand() * 180, spin: 70 + rand() * 50 }
				: null,
		craft: rand() > 0.62 ? { x: rand() * 80, y: 8 + rand() * 50 } : null,
		rocks: Array.from({ length: Math.floor(rand() * 6) }, (_, i) => ({
			id: `${index}-r-${i}`,
			x: rand() * 90,
			y: 40 + rand() * 50,
			w: 6 + rand() * 14,
			h: 4 + rand() * 10,
			rot: rand() * 360
		})),
		comets,
		eggs,
		tint: pick(rand, ['139,124,255', '255,51,92', '92,225,230', '245,194,75', '160,120,255']),
		lane: {
			x: -20 + rand() * 40,
			y: 10 + rand() * 55,
			tilt: -38 + rand() * 76,
			opacity: 0.18 + rand() * 0.22
		}
	};
}

export function createStarfield(seed = 9041) {
	const rand = mulberry32(mix(seed, 11, 22));
	const ice: Array<[number, number, number]> = [
		[255, 255, 255],
		[210, 230, 255],
		[180, 210, 255]
	];
	const glow: Array<[number, number, number]> = [
		[180, 160, 255],
		[255, 130, 170],
		[92, 225, 230],
		[255, 227, 138],
		[255, 255, 255]
	];
	return {
		far: specks(rand, 88, ice, [0, 0.35]),
		mid: specks(rand, 40, glow, [0.5, 3.2])
	};
}

export function createVoyage(now = Date.now(), height = typeof window === 'undefined' ? 900 : window.innerHeight) {
	const span = Math.max(320, height) * SECTOR_SPAN;
	return {
		seed: now,
		nextIndex: 3,
		span,
		sectors: [0, 1, 2].map((index) => generateSector(now, index, now + index * 917, -index * span))
	};
}
