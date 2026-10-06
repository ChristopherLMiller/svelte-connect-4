import { peekFrost, writeFrost, type Board, type DailyRecord } from './persist';
import { todayKey, type Level } from './types';

const boot = peekFrost();

export const frostPrefs = $state({
	level: boot.level as Level,
	sure: boot.sure,
	holdFlag: boot.holdFlag
});

export const frostStats = $state({
	best: { ...boot.best },
	played: { ...boot.played },
	won: { ...boot.won },
	daily: { ...boot.daily } as DailyRecord,
	streak: boot.streak,
	lastDaily: boot.lastDaily
});

export const frostPanel = $state({ open: false });
export const frostGuide = $state({ open: false });

function mirrorStats() {
	const prefs = peekFrost();
	frostStats.best = { ...prefs.best };
	frostStats.played = { ...prefs.played };
	frostStats.won = { ...prefs.won };
	frostStats.daily = { ...prefs.daily };
	frostStats.streak = prefs.streak;
	frostStats.lastDaily = prefs.lastDaily;
}

export function hydrateFrost() {
	const prefs = peekFrost();
	frostPrefs.level = prefs.level;
	frostPrefs.sure = prefs.sure;
	frostPrefs.holdFlag = prefs.holdFlag;
	mirrorStats();
}

export function persistFrostPrefs() {
	writeFrost({ ...frostPrefs });
}

function dayBefore(key: string) {
	const [y, m, d] = key.split('-').map(Number);
	return todayKey(new Date(y, m - 1, d - 1));
}

/** The streak still counts while its last clear was today or yesterday. */
export function liveStreak(today = todayKey()) {
	const last = frostStats.lastDaily;
	return last === today || last === dayBefore(today) ? frostStats.streak : 0;
}

/** The daily record for today, or an empty one when the stored record is from another day. */
export function todaysDaily(today = todayKey()): DailyRecord {
	return frostStats.daily.date === today ? frostStats.daily : { date: today, ms: 0, won: false, tries: 0 };
}

export function recordStart(board: Board, date: string) {
	const prefs = peekFrost();
	if (board === 'daily') {
		const daily = prefs.daily.date === date ? prefs.daily : { date, ms: 0, won: false, tries: 0 };
		writeFrost({ daily: { ...daily, tries: daily.tries + 1 } });
	} else {
		writeFrost({ played: { ...prefs.played, [board]: prefs.played[board] + 1 } });
	}
	mirrorStats();
}

/** Returns true when the time is a new best for that board. */
export function recordWin(board: Board, date: string, ms: number) {
	const prefs = peekFrost();
	let better = false;
	if (board === 'daily') {
		const daily = prefs.daily.date === date ? prefs.daily : { date, ms: 0, won: false, tries: 1 };
		better = !daily.won || ms < daily.ms;
		const streak = prefs.lastDaily === date ? prefs.streak : prefs.lastDaily === dayBefore(date) ? prefs.streak + 1 : 1;
		writeFrost({
			daily: { ...daily, won: true, ms: better ? ms : daily.ms },
			streak,
			lastDaily: date
		});
	} else {
		better = !prefs.best[board] || ms < prefs.best[board];
		writeFrost({
			best: better ? { ...prefs.best, [board]: ms } : prefs.best,
			won: { ...prefs.won, [board]: prefs.won[board] + 1 }
		});
	}
	mirrorStats();
	return better;
}

export function openFrostSettings() {
	frostGuide.open = false;
	frostPanel.open = true;
}

export function closeFrostSettings() {
	frostPanel.open = false;
}

export function openFrostGuide() {
	frostPanel.open = false;
	frostGuide.open = true;
}

export function closeFrostGuide() {
	frostGuide.open = false;
}
