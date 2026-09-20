export type PlanetKind = 'gas' | 'ice' | 'rock' | 'dwarf' | 'ember' | 'ocean' | 'toxic' | 'dust';
export type AtmoKind = 'none' | 'haze' | 'ion' | 'aurora' | 'burn';

export type Planet = {
	id: string;
	kind: PlanetKind;
	x: number;
	y: number;
	size: number;
	moon: boolean;
	spin: number;
	phase: number;
	axial: number;
	dx: string;
	dy: string;
	cruise: number;
	retro: boolean;
	storm: boolean;
	cities: boolean;
	ringed: boolean;
	orbit: number;
	hi: string;
	mid: string;
	lo: string;
	halo: string;
	ring: string;
	haze: string;
	atmo: AtmoKind;
	moonTint: string;
	className: string;
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

export const SECTOR_SPAN = 1;

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

function wrapHue(value: number) {
	return ((value % 360) + 360) % 360;
}

function hsl(h: number, s: number, l: number) {
	return `hsl(${Math.round(wrapHue(h))} ${Math.round(s)}% ${Math.round(l)}%)`;
}

function hsla(h: number, s: number, l: number, a: number) {
	return `hsl(${Math.round(wrapHue(h))} ${Math.round(s)}% ${Math.round(l)}% / ${a.toFixed(2)})`;
}

function pickKind(rand: () => number): PlanetKind {
	const roll = rand();
	if (roll < 0.18) return 'gas';
	if (roll < 0.32) return 'ice';
	if (roll < 0.5) return 'rock';
	if (roll < 0.62) return 'ocean';
	if (roll < 0.72) return 'dwarf';
	if (roll < 0.82) return 'ember';
	if (roll < 0.91) return 'toxic';
	return 'dust';
}

function hueFor(kind: PlanetKind, rand: () => number) {
	switch (kind) {
		case 'gas': {
			const band = rand();
			if (band < 0.22) return 16 + rand() * 34;
			if (band < 0.44) return 188 + rand() * 42;
			if (band < 0.62) return 152 + rand() * 26;
			if (band < 0.8) return 318 + rand() * 28;
			return 252 + rand() * 28;
		}
		case 'ice':
			return 168 + rand() * 88;
		case 'rock':
			return 6 + rand() * 40;
		case 'dwarf':
			return 238 + rand() * 86;
		case 'ember':
			return rand() < 0.72 ? rand() * 34 : 328 + rand() * 28;
		case 'ocean':
			return 172 + rand() * 48;
		case 'toxic':
			return 68 + rand() * 52;
		default:
			return 20 + rand() * 30;
	}
}

function pickAtmo(kind: PlanetKind, rand: () => number): AtmoKind {
	const roll = rand();
	if (kind === 'ember') return roll < 0.22 ? 'haze' : 'burn';
	if (kind === 'ice') {
		if (roll < 0.28) return 'none';
		if (roll < 0.58) return 'aurora';
		return roll < 0.82 ? 'ion' : 'haze';
	}
	if (kind === 'ocean' || kind === 'dwarf') {
		if (roll < 0.22) return 'none';
		return roll < 0.62 ? 'haze' : 'ion';
	}
	if (kind === 'toxic') return roll < 0.2 ? 'none' : 'haze';
	if (kind === 'dust') return roll < 0.55 ? 'none' : 'haze';
	if (roll < 0.28) return 'none';
	if (roll < 0.78) return 'haze';
	return 'ion';
}

function makePlanet(id: string, rand: () => number, slot: number, band: number): Planet {
	const kind = pickKind(rand);
	const hue = hueFor(kind, rand);
	const sat =
		kind === 'dust' ? 16 + rand() * 28 : kind === 'ice' ? 32 + rand() * 42 : 40 + rand() * 50;
	const midL = kind === 'ember' ? 40 + rand() * 18 : 30 + rand() * 24;
	const spinBase = kind === 'gas' ? 54 : kind === 'ember' ? 18 : kind === 'ice' ? 36 : 28;
	const size =
		kind === 'gas'
			? 88 + rand() * 70
			: kind === 'ocean' || kind === 'ice'
				? 48 + rand() * 42
				: kind === 'rock' || kind === 'toxic'
					? 34 + rand() * 32
					: 20 + rand() * 26;

	const heading = rand() * Math.PI * 2;
	const reach = 14 + rand() * 28;
	const retro = rand() > 0.78;
	const ringed = kind === 'ember' ? false : kind === 'gas' ? rand() > 0.6 : rand() > 0.86;
	const atmo = pickAtmo(kind, rand);

	return {
		id,
		kind,
		x: 8 + ((slot + band) % 2) * 40 + rand() * 26,
		y: (slot === 0 ? 20 : 54) + rand() * 14,
		size,
		moon: (kind === 'gas' && rand() > 0.48) || rand() > 0.84,
		spin: spinBase + rand() * spinBase * 0.9,
		phase: rand() * 9,
		axial: -22 + rand() * 44,
		dx: `${(Math.cos(heading) * reach).toFixed(1)}vw`,
		dy: `${(Math.sin(heading) * reach).toFixed(1)}vh`,
		cruise: 36 + rand() * 48,
		retro,
		storm: kind === 'gas' && rand() > 0.55,
		cities: (kind === 'rock' || kind === 'ocean' || kind === 'dwarf') && rand() > 0.86,
		ringed,
		orbit: 11 + rand() * 10,
		hi: hsl(hue + (rand() - 0.5) * 16, Math.min(96, sat + 10), Math.min(92, midL + 26 + rand() * 12)),
		mid: hsl(hue, sat, midL),
		lo: hsl(hue + (rand() - 0.5) * 12, sat * 0.72, midL * 0.36),
		halo: hsla(hue, Math.min(90, sat + 8), 62, 0.16 + rand() * 0.16),
		ring: hsla(hue + (rand() - 0.5) * 24, Math.min(80, sat), 72, 0.28 + rand() * 0.16),
		haze: hsla(hue, Math.min(85, sat), 58, 0.12 + rand() * 0.1),
		atmo,
		moonTint: hsl(hue + rand() * 50, 10 + rand() * 22, 68 + rand() * 18),
		className: [
			'world',
			kind,
			retro && 'retro',
			ringed && 'ringed',
			atmo !== 'none' && `atmo-${atmo}`
		]
			.filter(Boolean)
			.join(' ')
	};
}

function specks(
	rand: () => number,
	count: number,
	palette: Array<[number, number, number]>,
	blur: [number, number],
	w: number,
	h: number
) {
	return Array.from({ length: count }, () => {
		const x = Math.round(rand() * w);
		const y = Math.round(rand() * h);
		const c = pick(rand, palette);
		const a = (0.14 + rand() * 0.5).toFixed(2);
		const glow = blur[0] + rand() * (blur[1] - blur[0]);
		const spread = rand() > 0.9 ? 1 : 0;
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
	const planetCount = 2;

	const nebulaCount = 2 + Math.floor(rand() * 3);
	const nebulae = Array.from({ length: nebulaCount }, (_, i) => {
		const pair = pick(rand, NEBULA);
		return {
			id: `${index}-n-${i}`,
			x: -10 + rand() * 86,
			y: -8 + rand() * 72,
			w: 20 + rand() * 36,
			h: 12 + rand() * 24,
			a: pair[0],
			b: pair[1],
			tilt: -24 + rand() * 48,
			opacity: 0.42 + rand() * 0.35
		};
	});

	const wisps = Array.from({ length: 1 + Math.floor(rand() * 3) }, (_, i) => {
		const pair = pick(rand, NEBULA);
		return {
			id: `${index}-w-${i}`,
			x: rand() * 84,
			y: 8 + rand() * 72,
			w: 12 + rand() * 20,
			h: 4 + rand() * 7,
			a: pair[0],
			b: 'transparent',
			tilt: -22 + rand() * 44,
			opacity: 0.3 + rand() * 0.32
		};
	});

	const headings = [18, 32, 148, 162, -20, 200, 44, 172];
	const comets = Array.from({ length: 2 + Math.floor(rand() * 3) }, (_, i) => ({
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
	if (rand() < (index < 3 ? 0.12 : 0.28)) {
		const tier = rand();
		const kind =
			tier > 0.93 ? pick(rand, EGG_ULTRA) : tier > 0.62 ? pick(rand, EGG_RARE) : pick(rand, EGG_COMMON);
		eggs.push(makeEgg(`${index}-egg`, kind, rand));
	}
	if (rand() < 0.08) {
		eggs.push(makeEgg(`${index}-egg-b`, pick(rand, EGG_COMMON), rand));
	}

	const makeGalaxy = () => ({
		x: rand() * 86,
		y: 6 + rand() * 76,
		size: 150 + rand() * 200,
		spin: 70 + rand() * 50
	});

	return {
		id: index,
		origin,
		dust: specks(rand, Math.min(120, Math.max(70, Math.round(area / 22000))), ice, [0, 0.35], fieldW, fieldH),
		glow: specks(rand, Math.min(44, Math.max(22, Math.round(area / 55000))), glow, [0.8, 3.4], fieldW, fieldH),
		distant: specks(rand, Math.min(16, Math.max(8, Math.round(area / 90000))), DISTANT, [0.3, 1.4], fieldW, fieldH),
		nebulae,
		wisps,
		planets: Array.from({ length: planetCount }, (_, i) => makePlanet(`${index}-p-${i}`, rand, i, index)),
		galaxy: rand() > 0.38 ? makeGalaxy() : null,
		galaxyB: rand() > 0.72 ? makeGalaxy() : null,
		craft: rand() > 0.55 ? { x: rand() * 86, y: 8 + rand() * 55 } : null,
		rocks: Array.from({ length: 6 + Math.floor(rand() * 8) }, (_, i) => ({
			id: `${index}-r-${i}`,
			x: rand() * 96,
			y: rand() * 92,
			w: 4 + rand() * 14,
			h: 3 + rand() * 11,
			rot: rand() * 360
		})),
		comets,
		eggs,
		tint: pick(rand, ['139,124,255', '255,51,92', '92,225,230', '245,194,75', '160,120,255']),
		lane: {
			x: -20 + rand() * 40,
			y: 10 + rand() * 55,
			tilt: -38 + rand() * 76,
			opacity: 0.18 + rand() * 0.2
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
		far: specks(rand, Math.min(180, Math.max(100, Math.round(area / 18000))), ice, [0, 0.32], w, h),
		mid: specks(rand, Math.min(70, Math.max(40, Math.round(area / 45000))), glow, [0.5, 2.8], w, h),
		deep: specks(rand, Math.min(90, Math.max(48, Math.round(area / 35000))), DISTANT, [0.2, 1.3], w, h)
	};
}

export function createVoyage(now = Date.now(), size: FieldSize = viewportSize()) {
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
