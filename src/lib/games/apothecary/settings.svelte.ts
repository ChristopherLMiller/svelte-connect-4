import { peekApo, writeApo, type DailyRecord } from './persist';
import { todayKey, type Bench, type Board } from './types';

const boot = peekApo();

export const apoPrefs = $state({ bench: boot.bench as Bench });

export const apoStats = $state({
	best: { ...boot.best },
	top: { ...boot.top },
	played: { ...boot.played },
	stones: boot.stones,
	discovered: boot.discovered,
	daily: { ...boot.daily } as DailyRecord
});

export const apoPanel = $state({ open: false });
export const apoGuide = $state({ open: false });

function mirrorStats() {
	const prefs = peekApo();
	apoStats.best = { ...prefs.best };
	apoStats.top = { ...prefs.top };
	apoStats.played = { ...prefs.played };
	apoStats.stones = prefs.stones;
	apoStats.discovered = prefs.discovered;
	apoStats.daily = { ...prefs.daily };
}

export function hydrateApothecary() {
	apoPrefs.bench = peekApo().bench;
	mirrorStats();
}

export function persistApoPrefs() {
	writeApo({ bench: apoPrefs.bench });
}

export function todaysBrew(today = todayKey()): DailyRecord {
	return apoStats.daily.date === today ? apoStats.daily : { date: today, score: 0, top: 0, tries: 0 };
}

export function recordStart(board: Board, date: string) {
	const prefs = peekApo();
	if (board === 'daily') {
		const daily = prefs.daily.date === date ? prefs.daily : { date, score: 0, top: 0, tries: 0 };
		writeApo({ daily: { ...daily, tries: daily.tries + 1 } });
	} else {
		writeApo({ played: { ...prefs.played, [board]: prefs.played[board] + 1 } });
	}
	mirrorStats();
}

/** Called after every pour; returns true while the score is the best for that board. */
export function recordProgress(board: Board, date: string, score: number, top: number) {
	const prefs = peekApo();
	const discovered = Math.max(prefs.discovered, top);
	let better: boolean;
	if (board === 'daily') {
		const daily = prefs.daily.date === date ? prefs.daily : { date, score: 0, top: 0, tries: 1 };
		better = score > 0 && score >= daily.score;
		if (score > daily.score || top > daily.top || discovered !== prefs.discovered) {
			writeApo({ daily: { ...daily, score: Math.max(daily.score, score), top: Math.max(daily.top, top) }, discovered });
			mirrorStats();
		}
	} else {
		better = score > 0 && score >= prefs.best[board];
		if (score > prefs.best[board] || top > prefs.top[board] || discovered !== prefs.discovered) {
			writeApo({
				best: { ...prefs.best, [board]: Math.max(prefs.best[board], score) },
				top: { ...prefs.top, [board]: Math.max(prefs.top[board], top) },
				discovered
			});
			mirrorStats();
		}
	}
	return better;
}

export function recordStone() {
	writeApo({ stones: peekApo().stones + 1 });
	mirrorStats();
}

export function openApoSettings() {
	apoGuide.open = false;
	apoPanel.open = true;
}

export function closeApoSettings() {
	apoPanel.open = false;
}

export function openApoGuide() {
	apoPanel.open = false;
	apoGuide.open = true;
}

export function closeApoGuide() {
	apoGuide.open = false;
}
