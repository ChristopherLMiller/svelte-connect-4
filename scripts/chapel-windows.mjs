#!/usr/bin/env node
/**
 * Chapel Glass windows: generates the procedural chapters and validates every chapter file.
 *
 *   node scripts/chapel-windows.mjs          regenerate the chapters in CHAPTERS, then check all
 *   node scripts/chapel-windows.mjs --check  check every file in the windows folder
 *
 * Chapters not listed in CHAPTERS (e.g. 01-the-nave.json) are hand-made and never rewritten.
 * Generation is seeded by file name, so reruns produce the same windows.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'src/lib/games/breakout/windows';
const COLS = 13;
const ROWS = 13;
const MID = 6;
const PER_CHAPTER = 12;

const CHAPTERS = [
	{ file: '02-the-lady-chapel', chapter: 'The Lady Chapel', blurb: 'Blue glass and quiet light, kept for the Virgin.', hues: 'bov', d: [0.04, 0.14] },
	{ file: '03-the-chapter-house', chapter: 'The Chapter House', blurb: 'Where the brothers met: amber, green and argument.', hues: 'agr', d: [0.1, 0.22] },
	{ file: '04-the-north-transept', chapter: 'The North Transept', blurb: 'The cold side of the church, cobalt and frost.', hues: 'bgo', d: [0.18, 0.3] },
	{ file: '05-the-south-transept', chapter: 'The South Transept', blurb: 'Facing the sun: ruby, gold and violet.', hues: 'rav', d: [0.26, 0.38] },
	{ file: '06-the-choir', chapter: 'The Choir', blurb: 'Above the stalls, windows that sing in violet and gold.', hues: 'vao', d: [0.34, 0.46] },
	{ file: '07-the-crypt', chapter: 'The Crypt', blurb: 'Iron and ember under the floor. Mind the tracery.', hues: 'arv', d: [0.42, 0.56], lead: 1.5 },
	{ file: '08-the-cloister', chapter: 'The Cloister', blurb: 'Green garth, pale stone, glass like leaves.', hues: 'gao', d: [0.5, 0.64] },
	{ file: '09-the-bell-tower', chapter: 'The Bell Tower', blurb: 'High and narrow, blue as the hour bell.', hues: 'bvo', d: [0.58, 0.74] },
	{ file: '10-the-ambulatory', chapter: 'The Ambulatory', blurb: 'The walk behind the altar, every colour in procession.', hues: 'oagbrv', d: [0.68, 0.86] },
	{ file: '11-the-great-west-front', chapter: 'The Great West Front', blurb: 'The last and greatest wall of glass.', hues: 'oagbrv', d: [0.8, 1], lead: 1.2 }
];

const ADJECTIVES = [
	'Ember', 'Vesper', 'Lantern', "Pilgrim's", 'Morning', 'Evensong', 'Winter', 'Midsummer', 'Weeping',
	'Crowned', 'Sleeping', 'Hidden', 'Golden', 'Drowned', 'Silent', 'Burning', "Shepherd's", "Mariner's",
	"Weaver's", "Mason's", "Saint Agnes'", "Saint Brigid's", "Saint Columba's", "Saint Hild's", "Saint Aidan's",
	"Saint Cuthbert's", "Saint Clare's", "Saint Jerome's", "Saint Lucy's", "Saint Martin's", "Saint Ninian's",
	"Saint Oswald's", "Saint Bede's", "Saint David's", "Saint Kevin's", "Saint Mungo's", 'Gloaming', 'Moonlit',
	'Starlit', 'Ashen', 'Verdant', 'Sapphire', 'Scarlet', 'Pale', 'Last', 'First', 'Twelfth', 'Seventh', 'Hollow',
	'Broken', 'Mended', 'Wandering', 'Bright', 'Quiet', 'Lost', 'Thorned', 'Feathered', 'Lily', 'Ivy', 'Rowan',
	'Hawthorn', 'Juniper', 'Bramble', 'Thistle', 'Harvest', 'Lenten', 'Advent', 'Candlemas', 'Michaelmas',
	'Lammas', 'Whitsun', 'Easter', 'Hallow', 'Matins', 'Lauds', 'Compline', 'Abbot\'s', "Bishop's", "Anchoress'",
	"Bellringer's", "Glazier's", "Cantor's", 'Northern', 'Southern', 'Eastern', 'Western', 'Copper', 'Iron',
	'Silver', 'Salt', 'Rain', 'Snow', 'Ashlar', 'Owl', 'Raven', 'Wren', 'Heron', 'Lamb', 'Lion', 'Stag'
];

const MASKS = {
	full: { nouns: ['Wall', 'Tapestry', 'Field', 'Mosaic'], test: () => true },
	rose: {
		nouns: ['Rose', 'Wheel', 'Oculus', 'Sun'],
		test: (r, dx, H) => (dx / 6.6) ** 2 + ((r - (H - 1) / 2) / (H / 2)) ** 2 <= 1
	},
	arch: {
		nouns: ['Arch', 'Lancet', 'Gate', 'Doorway'],
		test: (r, dx, H) => {
			const v = r / (H - 1);
			return v >= 0.42 || dx / 6.5 <= (v / 0.42) ** 0.8 * 0.95 + 0.05;
		}
	},
	lozenge: {
		nouns: ['Lozenge', 'Mandorla', 'Seal', 'Diamond'],
		test: (r, dx, H) => dx / 6.6 + Math.abs(r - (H - 1) / 2) / (H / 2) <= 1.05
	},
	lancets: {
		nouns: ['Lancets', 'Three Lights', 'Sisters'],
		test: (r, dx) => dx !== 2 && dx !== 6 && (r > 0 || dx === 0 || dx === 4)
	},
	twin: {
		nouns: ['Twin Lights', 'Pair', 'Brothers'],
		test: (r, dx) => dx !== 0 && dx !== 6 && (r > 1 || dx === 3 || (r === 1 && dx >= 2 && dx <= 4))
	},
	hourglass: {
		nouns: ['Hourglass', 'Vigil', 'Tide'],
		test: (r, dx, H) => dx / 6.6 <= Math.abs(r - (H - 1) / 2) / ((H - 1) / 2) + 0.2
	},
	gable: { nouns: ['Gable', 'Tent', 'Mountain'], test: (r, dx, H) => dx <= Math.ceil(((r + 1) * 6.6) / H) },
	spire: { nouns: ['Spire', 'Arrow', 'Steeple'], test: (r, dx, H) => dx <= Math.ceil(((H - r) * 6.6) / H) },
	rood: {
		nouns: ['Rood', 'Cross', 'Crossing'],
		test: (r, dx, H) => dx <= 1 || Math.abs(r - Math.floor(H * 0.35)) <= 1
	},
	cloister: {
		nouns: ['Cloister', 'Border', 'Garth'],
		test: (r, dx, H) => dx >= 4 || r <= 1 || r >= H - 2 || (dx <= 1 && Math.abs(r - (H - 1) / 2) <= 1)
	},
	chalice: {
		nouns: ['Chalice', 'Grail', 'Cup'],
		test: (r, dx, H) => {
			const v = r / (H - 1);
			if (v < 0.45) return dx <= 6 - Math.floor(v * 10);
			if (v < 0.8) return dx === 0 || (v > 0.7 && dx <= 1);
			return dx <= 4;
		}
	},
	terrace: { nouns: ['Ladder', 'Stair', 'Terraces'], test: (r) => r % 3 !== 2 },
	lattice: { nouns: ['Lattice', 'Trellis', 'Net'], test: (r, dx) => (r + dx) % 2 === 0 || r % 4 === 0 },
	wings: {
		nouns: ['Wings', 'Moth', 'Dove'],
		test: (r, dx, H) => dx >= 1 && (dx - 1) / 5.6 + Math.abs(r - (H - 1) / 2) / (H / 2) <= 1.15
	},
	crown: {
		nouns: ['Crown', 'Coronet', 'Diadem'],
		test: (r, dx) => r >= 3 || dx % 3 === 0 || (r === 2 && dx % 3 !== 2)
	}
};

const PATTERNS = {
	rings: (r, dx, H, n) => Math.floor(Math.sqrt((dx / 6.6) ** 2 + ((r - (H - 1) / 2) / (H / 2)) ** 2) * n),
	diamonds: (r, dx, H, n) => Math.floor((dx / 6.6 + Math.abs(r - (H - 1) / 2) / (H / 2)) * n * 0.6),
	squares: (r, dx, H, n) => Math.floor(Math.max(dx / 6.6, Math.abs(r - (H - 1) / 2) / (H / 2)) * n),
	rows: (r, dx, H, n) => Math.floor(r / Math.max(1, Math.round(H / n))),
	columns: (r, dx) => Math.floor(dx / 2),
	chevrons: (r, dx) => Math.floor((r + dx) / 2),
	arrows: (r, dx) => Math.floor((r - dx + 12) / 2),
	checker: (r, dx) => (r + dx) % 2,
	spokes: (r, dx, H) => Math.floor((Math.atan2(r - (H - 1) / 2, dx * 2.1 + 0.01) / Math.PI + 0.5) * 6),
	bricks: (r, dx) => (r % 2 ? Math.floor((dx + 1) / 2) : Math.floor(dx / 2)) + r,
	mosaic: (r, dx, H, n, noise) => noise[r * 7 + dx]
};

function seeded(text) {
	let h = 2166136261;
	for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
	let a = h >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const pick = (rand, list) => list[Math.floor(rand() * list.length)];

function shuffle(rand, list) {
	const out = [...list];
	for (let i = out.length - 1; i > 0; i -= 1) {
		const j = Math.floor(rand() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

const isPane = (ch) => /[a-zA-Z]/.test(ch);

/** Cells the light can reach from below the window. Open air and glass let it through; iron does not. */
function reachable(grid) {
	const H = grid.length;
	const seen = new Set();
	const stack = [];
	for (let c = 0; c < COLS; c += 1) if (grid[H - 1][c] !== '#') stack.push([H - 1, c]);
	while (stack.length) {
		const [r, c] = stack.pop();
		if (r < 0 || c < 0 || r >= H || c >= COLS || grid[r][c] === '#') continue;
		const key = r * COLS + c;
		if (seen.has(key)) continue;
		seen.add(key);
		stack.push([r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]);
	}
	return seen;
}

function sealed(grid) {
	const seen = reachable(grid);
	const out = [];
	for (let r = 0; r < grid.length; r += 1)
		for (let c = 0; c < COLS; c += 1) if (isPane(grid[r][c]) && !seen.has(r * COLS + c)) out.push([r, c]);
	return out;
}

/** Turns iron next to sealed glass into glass, mirrored, until every pane can be reached. */
function unseal(grid) {
	for (let guard = 0; guard < 200; guard += 1) {
		const trapped = sealed(grid);
		if (!trapped.length) return;
		const seen = reachable(grid);
		let best = null;
		for (const [r, c] of trapped) {
			for (const [nr, nc] of [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]]) {
				if (nr < 0 || nc < 0 || nr >= grid.length || nc >= COLS || grid[nr][nc] !== '#') continue;
				const opens = [[nr + 1, nc], [nr - 1, nc], [nr, nc + 1], [nr, nc - 1]].some(([a, b]) => seen.has(a * COLS + b));
				const score = (opens ? 2 : 1) + nr / 100;
				if (!best || score > best.score) best = { r: nr, c: nc, hue: grid[r][c].toLowerCase(), score };
			}
		}
		if (!best) return;
		grid[best.r][best.c] = best.hue;
		grid[best.r][COLS - 1 - best.c] = best.hue;
	}
}

function makeWindow(rand, spec, d, recent) {
	const H = Math.min(ROWS, 8 + Math.floor(rand() * 3) + Math.round(d * 3));
	const maskKeys = Object.keys(MASKS).filter((k) => !recent.includes(k));
	const maskKey = pick(rand, maskKeys);
	const mask = MASKS[maskKey];
	const patternKey = pick(rand, Object.keys(PATTERNS));
	const bands = 2 + Math.floor(rand() * 3);
	const palette = shuffle(rand, spec.hues.split('')).slice(0, Math.min(spec.hues.length, 2 + Math.floor(rand() * 3)));
	if (rand() < 0.3 && !palette.includes('o')) palette.push('o');
	const noise = Array.from({ length: ROWS * 7 }, () => Math.floor(rand() * bands));

	const grid = Array.from({ length: H }, () => Array(COLS).fill('.'));
	const band = Array.from({ length: H }, () => Array(COLS).fill(-1));
	for (let r = 0; r < H; r += 1) {
		for (let dx = 0; dx <= MID; dx += 1) {
			if (!mask.test(r, dx, H)) continue;
			const b = Math.abs(PATTERNS[patternKey](r, dx, H, bands, noise)) % 12;
			const hue = palette[b % palette.length];
			for (const c of new Set([MID - dx, MID + dx])) {
				grid[r][c] = hue;
				band[r][c] = b;
			}
		}
	}

	const thickChance = 0.15 + d * 0.75;
	if (rand() < thickChance) {
		const rule = pick(rand, ['band', 'core', 'rim', 'scatter', 'rows']);
		const target = Math.floor(rand() * bands);
		const density = 0.25 + d * 0.5;
		const keep = Array.from({ length: H * 7 }, () => rand() < density);
		for (let r = 0; r < H; r += 1) {
			for (let c = 0; c < COLS; c += 1) {
				if (!isPane(grid[r][c])) continue;
				const dx = Math.abs(c - MID);
				const edge = [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]].some(
					([a, b]) => a < 0 || b < 0 || a >= H || b >= COLS || grid[a][b] === '.'
				);
				const thick =
					rule === 'band' ? band[r][c] === target
					: rule === 'core' ? dx <= 1 + Math.round(d * 2) && Math.abs(r - (H - 1) / 2) <= 1 + d * 2
					: rule === 'rim' ? edge
					: rule === 'rows' ? r % 3 === 0
					: keep[r * 7 + dx];
				if (thick && (rule === 'scatter' || keep[r * 7 + dx] || d > 0.6)) grid[r][c] = grid[r][c].toUpperCase();
			}
		}
	}

	const leadChance = Math.min(0.92, (0.1 + d * 0.7) * (spec.lead ?? 1));
	if (rand() < leadChance) {
		const rule = pick(rand, ['mullion', 'transom', 'ring', 'diagonal', 'studs', 'crown']);
		const target = Math.floor(rand() * bands);
		const mid = Math.floor(H / 2);
		for (let r = 0; r < H; r += 1) {
			for (let dx = 0; dx <= MID; dx += 1) {
				const c = MID - dx;
				if (grid[r][c] === '.') continue;
				const iron =
					rule === 'mullion' ? dx === 0 && r % 4 !== 3
					: rule === 'transom' ? r === mid && dx % 3 !== 2
					: rule === 'ring' ? band[r][c] === target && (r + dx) % 3 !== 0
					: rule === 'diagonal' ? r === dx + Math.floor(H / 4) || r === H - 1 - dx - Math.floor(H / 4)
					: rule === 'crown' ? r === 0 || (r === 1 && dx % 2 === 0)
					: rand() < 0.06 + d * 0.06;
				if (iron) {
					grid[r][c] = '#';
					grid[r][MID + dx] = '#';
				}
			}
		}
		unseal(grid);
	}

	while (grid.length && grid[0].every((ch) => ch === '.')) grid.shift();
	while (grid.length && grid[grid.length - 1].every((ch) => ch === '.')) grid.pop();
	const map = grid.map((row) => row.join(''));
	const panes = map.join('').split('').filter(isPane).length;
	const lead = map.join('').split('#').length - 1;
	return { maskKey, map, panes, lead, thick: map.join('').replace(/[^A-Z]/g, '').length };
}

function nameFor(rand, maskKey, used) {
	for (let i = 0; i < 400; i += 1) {
		const adj = pick(rand, ADJECTIVES);
		const noun = pick(rand, MASKS[maskKey].nouns);
		const name = /'s?$/.test(adj) ? `${adj} ${noun}` : `The ${adj} ${noun}`;
		if (!used.has(name)) {
			used.add(name);
			return name;
		}
	}
	throw new Error(`ran out of names for ${maskKey}`);
}

function generate() {
	const used = new Set();
	const shapes = new Set();
	for (const file of readdirSync(DIR)) {
		if (CHAPTERS.some((spec) => `${spec.file}.json` === file)) continue;
		for (const win of JSON.parse(readFileSync(join(DIR, file), 'utf8')).windows) {
			used.add(win.name);
			shapes.add(win.map.join('/'));
		}
	}
	for (const spec of CHAPTERS) {
		const rand = seeded(spec.file);
		const windows = [];
		const recent = [];
		while (windows.length < PER_CHAPTER) {
			const t = windows.length / (PER_CHAPTER - 1);
			const d = spec.d[0] + (spec.d[1] - spec.d[0]) * t;
			const win = makeWindow(rand, spec, d, recent);
			const key = win.map.join('/');
			if (win.panes < 32 || win.panes > 150 || win.lead > win.panes * 0.5 || shapes.has(key)) continue;
			if (sealed(win.map.map((row) => row.split(''))).length) continue;
			shapes.add(key);
			recent.push(win.maskKey);
			if (recent.length > 3) recent.shift();
			windows.push({ ...win, weight: win.panes + win.thick * 1.2 + win.lead * 0.4 });
		}
		windows.sort((a, b) => a.weight - b.weight);
		const out = {
			chapter: spec.chapter,
			blurb: spec.blurb,
			windows: windows.map((win) => ({ name: nameFor(rand, win.maskKey, used), map: win.map }))
		};
		writeFileSync(join(DIR, `${spec.file}.json`), `${JSON.stringify(out, null, '\t')}\n`);
	}
}

function check() {
	const names = new Set();
	let total = 0;
	let failed = false;
	const files = readdirSync(DIR).filter((f) => f.endsWith('.json')).sort();
	for (const file of files) {
		const data = JSON.parse(readFileSync(join(DIR, file), 'utf8'));
		const problems = [];
		if (typeof data.chapter !== 'string' || !Array.isArray(data.windows) || !data.windows.length) {
			problems.push('needs "chapter" and a non-empty "windows" list');
		}
		for (const [i, win] of (data.windows ?? []).entries()) {
			const where = `#${i + 1} ${win.name}`;
			if (!win.name || names.has(win.name)) problems.push(`${where}: missing or duplicate name`);
			names.add(win.name);
			if (!Array.isArray(win.map) || !win.map.length || win.map.length > ROWS) {
				problems.push(`${where}: map needs 1–${ROWS} rows`);
				continue;
			}
			win.map.forEach((row, r) => {
				if (row.length !== COLS) problems.push(`${where}: row ${r + 1} is ${row.length} wide, not ${COLS}`);
				if (/[^.#oagbrvOAGBRV]/.test(row)) problems.push(`${where}: row ${r + 1} has an unknown glyph`);
			});
			if (!win.map.join('').split('').some(isPane)) problems.push(`${where}: no glass to break`);
			const trapped = sealed(win.map.map((row) => row.padEnd(COLS, '.').split('')));
			if (trapped.length) problems.push(`${where}: iron seals in ${trapped.map(([r, c]) => `${r + 1}:${c + 1}`).join(' ')}`);
		}
		total += data.windows?.length ?? 0;
		console.log(`${problems.length ? '✗' : '✓'} ${file} — ${data.windows?.length ?? 0} windows`);
		for (const p of problems) console.log(`    ${p}`);
		if (problems.length) failed = true;
	}
	console.log(`${total} windows in ${files.length} chapters`);
	if (failed) process.exit(1);
}

if (!process.argv.includes('--check')) generate();
check();
