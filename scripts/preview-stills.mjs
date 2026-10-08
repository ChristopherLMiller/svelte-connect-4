/**
 * Rebuild static/previews/<id>.jpg from each game's live preview.
 * Needs the dev server and playwright-core (not a project dependency):
 *   npm run dev
 *   node scripts/preview-stills.mjs
 */
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
let chromium;
try {
	({ chromium } = require('playwright-core'));
} catch {
	console.error('Install playwright-core where Node can see it, then run this again.');
	process.exit(1);
}

const chrome =
	process.env.CHROME ??
	join(
		process.env.HOME ?? '',
		'Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
	);
const origin = process.env.STILL_ORIGIN ?? 'http://127.0.0.1:5173';
const ids = readdirSync('src/lib/games').filter((name) =>
	existsSync(join('src/lib/games', name, 'preview.svelte'))
);

if (!existsSync(chrome)) {
	console.error(`Chrome not found at ${chrome}`);
	process.exit(1);
}

mkdirSync('static/previews', { recursive: true });

const browser = await chromium.launch({ executablePath: chrome, headless: true });
const page = await browser.newPage({ viewport: { width: 960, height: 720 }, deviceScaleFactor: 2 });

for (const id of ids) {
	await page.goto(`${origin}/preview-still?game=${id}`, { waitUntil: 'networkidle' });
	await page.waitForFunction(() => document.querySelector('.sheet')?.dataset.ready === '1', null, {
		timeout: 20000
	});
	await page.evaluate(() => document.fonts.ready);
	await page.waitForTimeout(700);
	await page.locator('section.cell').screenshot({
		path: join('static/previews', `${id}.jpg`),
		type: 'jpeg',
		quality: 84
	});
	console.log(id);
}

await browser.close();
