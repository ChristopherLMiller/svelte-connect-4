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
	distant: string;
	nebulae: Cloud[];
	wisps: Cloud[];
	planets: Planet[];
	galaxy: { x: number; y: number; size: number; spin: number } | null;
	galaxyB: { x: number; y: number; size: number; spin: number } | null;
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
const DISTANT: Array<[number, number, number]> = [
	[255, 210, 160],
	[140, 210, 230],
	[200, 170, 255],
	[255, 120, 110],
	[180, 230, 190],
	[255, 227, 138],
	[210, 230, 255]
];

export const SECTOR_SPAN = 1.2;

export type FieldSize = { w: number; h: number };

function viewportSize(): FieldSize {
	if (typeof window === 'undefined') return { w: 1920, h: 1080 };
	return {
		w: Math.max(320, Math.ceil(window.innerWidth)),
		h: Math.max(320, Math.ceil(window.innerHeight))
	};
}

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

function specks(
	rand: () => number,
	count: number,
	palette: Array<[number, number, number]>,
	blur: [number, number],
	w: number,
	h: number,
	spreadMax = 0
) {
	return Array.from({ length: count }, () => {
		const x = Math.round(rand() * w);
		const y = Math.round(rand() * h);
		const c = pick(rand, palette);
		const a = (0.12 + rand() * 0.6).toFixed(2);
		const glow = blur[0] + rand() * (blur[1] - blur[0]);
		const spread = spreadMax > 0 ? Math.round(rand() * spreadMax) : rand() > 0.86 ? 1 : 0;
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

export function generateSector(
	voyageSeed: number,
	index: number,
	timeSeed: number,
	origin: number,
	size: FieldSize = viewportSize()
): Sector {
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
	const fieldW = Math.max(960, Math.ceil(size.w * 1.08));
	const fieldH = Math.max(720, Math.round(size.h * 1.4));
	const area = fieldW * fieldH;

	const planetCount = 10 + Math.floor(rand() * 13);
	const planets: Planet[] = [];
	for (let i = 0; i < planetCount; i += 1) {
		const kind = pick(rand, KINDS);
		const roll = rand();
		const sizePx =
			kind === 'gas'
				? 72 + roll * 110
				: kind === 'ice'
					? 36 + roll * 54
					: kind === 'rock'
						? 22 + roll * 36
						: 14 + roll * 28;
		const spinBase = kind === 'gas' ? 54 : kind === 'ember' ? 18 : kind === 'ice' ? 36 : 28;
		const ringed = kind === 'gas' ? rand() > 0.22 : kind !== 'ember' && rand() > 0.62;
		planets.push({
			id: `${index}-p-${i}`,
			kind,
			x: rand() * 92,
			y: 4 + rand() * 88,
			size: sizePx,
			moon: (kind === 'gas' && rand() > 0.4) || (kind === 'ice' && rand() > 0.7) || rand() > 0.92,
			spin: spinBase + rand() * spinBase * 0.9,
			bob: 8 + rand() * 10,
			phase: rand() * 9,
			axial: -22 + rand() * 44,
			wobble: 5 + rand() * 14,
			retro: rand() > 0.78,
			storm: kind === 'gas' && rand() > 0.48,
			cities: (kind === 'rock' || kind === 'ice' || kind === 'dwarf') && rand() > 0.84,
			ringed,
			orbit: 11 + rand() * 10
		});
	}

	const nebulaCount = 3 + Math.floor(rand() * 4);
	const nebulae = Array.from({ length: nebulaCount }, (_, i) => {
		const pair = pick(rand, NEBULA);
		return {
			id: `${index}-n-${i}`,
			x: -8 + rand() * 88,
			y: -8 + rand() * 78,
			w: 18 + rand() * 42,
			h: 12 + rand() * 28,
			a: pair[0],
			b: pair[1],
			tilt: -24 + rand() * 48,
			opacity: 0.45 + rand() * 0.4
		};
	});

	const wisps = Array.from({ length: 2 + Math.floor(rand() * 4) }, (_, i) => {
		const pair = pick(rand, NEBULA);
		return {
			id: `${index}-w-${i}`,
			x: rand() * 88,
			y: 6 + rand() * 78,
			w: 12 + rand() * 22,
			h: 4 + rand() * 7,
			a: pair[0],
			b: 'transparent',
			tilt: -22 + rand() * 44,
			opacity: 0.3 + rand() * 0.35
		};
	});

	const headings = [18, 32, 148, 162, -20, 200, 44, 172];
	const cometCount = 3 + Math.floor(rand() * 4);
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
	const eggChance = index < 3 ? 0.12 : 0.28;
	if (rand() < eggChance) {
		const tier = rand();
		const kind =
			tier > 0.93 ? pick(rand, EGG_ULTRA) : tier > 0.62 ? pick(rand, EGG_RARE) : pick(rand, EGG_COMMON);
		eggs.push(makeEgg(`${index}-egg`, kind, rand));
	}
	if (rand() < 0.08) {
		eggs.push(makeEgg(`${index}-egg-b`, pick(rand, EGG_COMMON), rand));
	}

	const dustN = Math.min(720, Math.max(220, Math.round(area / 7000)));
	const glowN = Math.min(260, Math.max(80, Math.round(area / 18000)));
	const distantN = Math.min(1200, Math.max(320, Math.round(area / 4500)));
	const rockN = 18 + Math.floor(rand() * 22);

	const makeGalaxy = () => ({
		x: rand() * 88,
		y: 6 + rand() * 78,
		size: 140 + rand() * 220,
		spin: 70 + rand() * 50
	});

	return {
		id: index,
		origin,
		dust: specks(rand, dustN, ice, [0, 0.4], fieldW, fieldH),
		glow: specks(rand, glowN, glow, [1, 4.2], fieldW, fieldH),
		distant: specks(rand, distantN, DISTANT, [0.4, 2.2], fieldW, fieldH, 3),
		nebulae,
		wisps,
		planets,
		galaxy: rand() > 0.28 ? makeGalaxy() : null,
		galaxyB: rand() > 0.72 ? makeGalaxy() : null,
		craft: rand() > 0.55 ? { x: rand() * 86, y: 8 + rand() * 55 } : null,
		rocks: Array.from({ length: rockN }, (_, i) => ({
			id: `${index}-r-${i}`,
			x: rand() * 96,
			y: rand() * 92,
			w: 4 + rand() * 16,
			h: 3 + rand() * 12,
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

export function createStarfield(seed = 9041, size: FieldSize = viewportSize()) {
	const rand = mulberry32(mix(seed, 11, size.w));
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
	const w = Math.max(960, Math.ceil(size.w * 1.08));
	const h = Math.max(720, Math.round(size.h * 1.5));
	const area = w * h;
	return {
		far: specks(rand, Math.min(900, Math.max(240, Math.round(area / 5200))), ice, [0, 0.35], w, h),
		mid: specks(rand, Math.min(320, Math.max(90, Math.round(area / 14000))), glow, [0.5, 3.2], w, h),
		deep: specks(rand, Math.min(700, Math.max(180, Math.round(area / 8000))), DISTANT, [0.2, 1.6], w, h, 2)
	};
}

export function createVoyage(
	now = Date.now(),
	size: FieldSize = viewportSize()
) {
	const span = Math.max(320, size.h) * SECTOR_SPAN;
	return {
		seed: now,
		nextIndex: 3,
		span,
		sectors: [0, 1, 2].map((index) =>
			generateSector(now, index, now + index * 917, -index * span, size)
		)
	};
}
