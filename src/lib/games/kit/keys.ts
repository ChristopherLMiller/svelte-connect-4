import { primeAudio } from '$lib/audio/prefs.svelte';

type Panels = {
	panel: { open: boolean };
	guide: { open: boolean };
	openGuide(): void;
	closeGuide(): void;
	closeSettings(): void;
};

export type BoardKeyOptions = {
	panels: Panels;
	/** Current screen; menu keys only start or resume. */
	screen(): 'menu' | 'play';
	/** Enter on the menu. */
	startFromMenu(): void;
	/** Escape during play. */
	backToMenu(): void;
	/** Round over and ready to go again (Enter or Space). */
	canRematch(): boolean;
	rematch(): void;
	/** Input locked (animating, AI thinking). */
	busy(): boolean;
	nudge(dr: number, dc: number): void;
	/** Enter or Space on the cursor. */
	play(): void;
	/** Arrow keys only; skip WASD for games that bind letters. */
	wasd?: boolean;
	/** Anything the shared keys don't handle. */
	extra?(event: KeyboardEvent): void;
};

const ARROWS: Record<string, [number, number]> = {
	ArrowLeft: [0, -1],
	ArrowRight: [0, 1],
	ArrowUp: [-1, 0],
	ArrowDown: [1, 0]
};

const LETTERS: Record<string, [number, number]> = {
	a: [0, -1],
	d: [0, 1],
	w: [-1, 0],
	s: [1, 0]
};

/** Keyboard handling for a grid game page: panels, menu, rematch, cursor and play. */
export function boardKeys(options: BoardKeyOptions) {
	const { panels } = options;
	return (event: KeyboardEvent) => {
		primeAudio();
		if (event.key === 'Escape' && panels.guide.open) {
			panels.closeGuide();
			return;
		}
		if (event.key === 'Escape' && panels.panel.open) {
			panels.closeSettings();
			return;
		}
		if (panels.guide.open || panels.panel.open) return;

		if (event.key === '?') {
			panels.openGuide();
			return;
		}

		if (options.screen() === 'menu') {
			if (event.key === 'Enter') options.startFromMenu();
			return;
		}

		if (event.key === 'Escape') {
			options.backToMenu();
			return;
		}

		if (options.canRematch() && (event.key === 'Enter' || event.key === ' ')) {
			event.preventDefault();
			options.rematch();
			return;
		}

		if (options.busy()) return;

		const step = ARROWS[event.key] ?? (options.wasd === false ? undefined : LETTERS[event.key.toLowerCase()]);
		if (step) {
			event.preventDefault();
			options.nudge(step[0], step[1]);
			return;
		}

		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			options.play();
			return;
		}

		options.extra?.(event);
	};
}
