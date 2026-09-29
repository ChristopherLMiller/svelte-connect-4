export type GameMode = 'local' | 'ai';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type ScorePair = { 1: number; 2: number };

export type ScoreTable = {
	local: ScorePair;
	ai: Record<Difficulty, ScorePair>;
};

export type GamePrefs<Saved> = {
	mode: GameMode;
	difficulty: Difficulty;
	scores: ScoreTable;
	saved: Saved | null;
};

export type GamePrefsStore<Saved> = {
	peek(): GamePrefs<Saved>;
	write(patch: Partial<GamePrefs<Saved>>): void;
	scoresFor(mode: GameMode, difficulty: Difficulty): ScorePair;
	writeScores(mode: GameMode, difficulty: Difficulty, scores: ScorePair): void;
	writeSaved(saved: Saved | null): void;
	peekSaved(): Saved | null;
};

const pair = (): ScorePair => ({ 1: 0, 2: 0 });

export function asMode(value: unknown): GameMode {
	return value === 'ai' ? 'ai' : 'local';
}

export function asDifficulty(value: unknown): Difficulty {
	return value === 'easy' || value === 'hard' ? value : 'medium';
}

export function asPlayer(value: unknown): 1 | 2 | null {
	return value === 1 || value === 2 ? value : null;
}

export function asPair(value: unknown): ScorePair {
	if (!value || typeof value !== 'object') return pair();
	const row = value as Partial<ScorePair>;
	return { 1: Number(row[1]) || 0, 2: Number(row[2]) || 0 };
}

function asScores(value: unknown): ScoreTable {
	const src = (value && typeof value === 'object' ? value : {}) as Partial<ScoreTable>;
	const ai = (src.ai && typeof src.ai === 'object' ? src.ai : {}) as Partial<Record<Difficulty, ScorePair>>;
	return {
		local: asPair(src.local),
		ai: { easy: asPair(ai.easy), medium: asPair(ai.medium), hard: asPair(ai.hard) }
	};
}

/**
 * One localStorage record per game: mode, difficulty, a score table per mode and difficulty,
 * and an optional saved match. `normalizeSaved` must reject anything malformed; `cloneSaved`
 * hands out copies so callers can't mutate the cache.
 */
export function createGamePrefs<Saved>(options: {
	key: string;
	normalizeSaved: (raw: unknown) => Saved | null;
	cloneSaved?: (saved: Saved) => Saved;
}): GamePrefsStore<Saved> {
	const { key, normalizeSaved } = options;
	const cloneSaved = options.cloneSaved ?? ((saved: Saved) => structuredClone(saved));

	const fresh = (): GamePrefs<Saved> => ({
		mode: 'local',
		difficulty: 'medium',
		scores: asScores(null),
		saved: null
	});

	const normalize = (raw: unknown): GamePrefs<Saved> => {
		if (!raw || typeof raw !== 'object') return fresh();
		const src = raw as Partial<Record<keyof GamePrefs<Saved>, unknown>>;
		return {
			mode: asMode(src.mode),
			difficulty: asDifficulty(src.difficulty),
			scores: asScores(src.scores),
			saved: normalizeSaved(src.saved)
		};
	};

	const read = (): GamePrefs<Saved> => {
		if (typeof localStorage === 'undefined') return fresh();
		try {
			return normalize(JSON.parse(localStorage.getItem(key) ?? 'null'));
		} catch {
			return fresh();
		}
	};

	let cache = read();

	const write = (patch: Partial<GamePrefs<Saved>>) => {
		cache = {
			...cache,
			...patch,
			scores: patch.scores ?? cache.scores,
			saved: patch.saved === undefined ? cache.saved : patch.saved
		};
		if (typeof localStorage === 'undefined') return;
		try {
			localStorage.setItem(key, JSON.stringify(cache));
		} catch {
			// Storage full or blocked: keep playing from memory.
		}
	};

	return {
		peek: () => cache,
		write,
		scoresFor(mode, difficulty) {
			const src = mode === 'ai' ? cache.scores.ai[difficulty] : cache.scores.local;
			return { 1: src[1], 2: src[2] };
		},
		writeScores(mode, difficulty, scores) {
			const next = structuredClone(cache.scores);
			if (mode === 'ai') next.ai[difficulty] = { 1: scores[1], 2: scores[2] };
			else next.local = { 1: scores[1], 2: scores[2] };
			write({ scores: next });
		},
		writeSaved(saved) {
			write({ saved });
		},
		peekSaved() {
			return cache.saved ? cloneSaved(cache.saved) : null;
		}
	};
}
