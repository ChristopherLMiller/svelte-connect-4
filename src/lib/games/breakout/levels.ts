import { AMBER, COBALT, COLS, EMERALD, LEAD, OPAL, ROWS, RUBY, VIOLET } from './types';

/**
 * Windows live in `windows/*.json`, one chapter per file, played in file-name order.
 * Maps are 13 columns wide and up to 13 rows deep. Lowercase is a single pane, uppercase a
 * thick double pane that takes two strikes, `#` is iron tracery, `.` is open air.
 * o opal · a amber · g emerald · b cobalt · r ruby · v violet
 * `node scripts/chapel-windows.mjs --check` validates every file (widths, glyphs, no sealed glass).
 */
export type Window = { name: string; map: string[] };
export type Chapter = { name: string; blurb: string; start: number; count: number };

type ChapterFile = { chapter: string; blurb?: string; windows: Window[] };

const files = import.meta.glob<ChapterFile>('./windows/*.json', { eager: true, import: 'default' });

export const WINDOWS: Window[] = [];
export const CHAPTERS: Chapter[] = [];

for (const path of Object.keys(files).sort()) {
	const file = files[path]!;
	const windows = (file.windows ?? []).filter((w) => Array.isArray(w.map) && w.map.length);
	if (!windows.length) continue;
	CHAPTERS.push({ name: file.chapter, blurb: file.blurb ?? '', start: WINDOWS.length, count: windows.length });
	WINDOWS.push(...windows);
}

export function chapterOf(level: number) {
	let index = 0;
	for (let i = 0; i < CHAPTERS.length; i += 1) if (CHAPTERS[i]!.start <= level) index = i;
	return index;
}

const GLYPHS: Record<string, number> = {
	o: OPAL,
	a: AMBER,
	g: EMERALD,
	b: COBALT,
	r: RUBY,
	v: VIOLET
};

/** Kind and strength per cell, row-major over the full COLS × ROWS grid. */
export function parseWindow(index: number) {
	const kind = new Uint8Array(COLS * ROWS);
	const hp = new Uint8Array(COLS * ROWS);
	const source = WINDOWS[index]?.map ?? [];
	for (let r = 0; r < Math.min(ROWS, source.length); r += 1) {
		const line = source[r]!;
		for (let c = 0; c < COLS; c += 1) {
			const ch = line[c] ?? '.';
			const i = r * COLS + c;
			if (ch === '#') {
				kind[i] = LEAD;
				continue;
			}
			const hue = GLYPHS[ch.toLowerCase()];
			if (!hue) continue;
			kind[i] = hue;
			hp[i] = ch === ch.toUpperCase() ? 2 : 1;
		}
	}
	return { kind, hp };
}

export function romanNumeral(n: number) {
	const table: Array<[number, string]> = [
		[1000, 'M'],
		[900, 'CM'],
		[500, 'D'],
		[400, 'CD'],
		[100, 'C'],
		[90, 'XC'],
		[50, 'L'],
		[40, 'XL'],
		[10, 'X'],
		[9, 'IX'],
		[5, 'V'],
		[4, 'IV'],
		[1, 'I']
	];
	let out = '';
	let rest = n;
	for (const [value, glyph] of table) {
		while (rest >= value) {
			out += glyph;
			rest -= value;
		}
	}
	return out;
}
