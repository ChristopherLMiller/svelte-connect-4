import type { Difficulty, GameMode, GamePrefsStore, ScorePair } from './prefs';

type Scores = {
	local: ScorePair;
	ai: Record<Difficulty, ScorePair>;
};

/** Reactive menu state shared by a game's menu, HUD, settings panel and guide. */
export function createGamePanels<Saved>(prefs: GamePrefsStore<Saved>) {
	const boot = prefs.peek();

	const play = $state({
		mode: boot.mode as GameMode,
		difficulty: boot.difficulty as Difficulty
	});

	const scores = $state<Scores>(copy(boot.scores));
	const panel = $state({ open: false });
	const guide = $state({ open: false });

	function copy(src: Scores): Scores {
		return {
			local: { 1: src.local[1], 2: src.local[2] },
			ai: {
				easy: { 1: src.ai.easy[1], 2: src.ai.easy[2] },
				medium: { 1: src.ai.medium[1], 2: src.ai.medium[2] },
				hard: { 1: src.ai.hard[1], 2: src.ai.hard[2] }
			}
		};
	}

	return {
		play,
		scores,
		panel,
		guide,
		hydrate() {
			const next = prefs.peek();
			play.mode = next.mode;
			play.difficulty = next.difficulty;
			const fresh = copy(next.scores);
			scores.local = fresh.local;
			scores.ai.easy = fresh.ai.easy;
			scores.ai.medium = fresh.ai.medium;
			scores.ai.hard = fresh.ai.hard;
		},
		recordScore(mode: GameMode, difficulty: Difficulty, next: ScorePair) {
			prefs.writeScores(mode, difficulty, next);
			if (mode === 'ai') scores.ai[difficulty] = { 1: next[1], 2: next[2] };
			else scores.local = { 1: next[1], 2: next[2] };
		},
		persistPlay() {
			prefs.write({ mode: play.mode, difficulty: play.difficulty });
		},
		openSettings() {
			guide.open = false;
			panel.open = true;
		},
		closeSettings() {
			panel.open = false;
		},
		openGuide() {
			panel.open = false;
			guide.open = true;
		},
		closeGuide() {
			guide.open = false;
		}
	};
}
