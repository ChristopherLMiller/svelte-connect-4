import type { Game, TableRules } from '../engine/game';
import type { TableArt } from '../engine/art';
import type { Score } from '../sound/score';
import type { Palette } from '../sound/sfx';
import type { TableId } from '../types';

/** Colours for the page around a table: menus, HUD, dialogs. */
export type Skin = {
	bg: string;
	panel: string;
	ink: string;
	muted: string;
	accent: string;
	hot: string;
	/** CSS font stack for headings. */
	display: string;
	/** Google Fonts family parameter for the display font. */
	font: string;
	/** Headings set in capitals and spaced, for fonts that want it. */
	caps?: boolean;
};

export type TableMeta = {
	id: TableId;
	name: string;
	/** The era or style, shown over the name. */
	kicker: string;
	/** One line on the menu card. */
	lede: string;
	year: string;
	skin: Skin;
	/** Words on the ready and over screens. */
	words: { ready: string; over: string; paused: string };
	guide: { how: string[]; tips: string[] };
	/**
	 * GLSL defining `vec3 scene(vec2 s, float aspect, float t, float lights, float hot)` and any helpers
	 * it needs; s is centred and scaled by height. hash21, noise, fbm and segment are already defined.
	 */
	backdrop: string;
	/** Show the score on rolling reels, like an electro-mechanical backbox. */
	reels?: boolean;
};

export type TableSpec<S = never> = {
	meta: TableMeta;
	rules: TableRules<S>;
	art: TableArt<S>;
	score: Score;
	sfx: Palette;
	/** When the backdrop and music run hot: multiball, a wizard mode. */
	hot: (g: Game<S>) => boolean;
	/** The stat kept alongside the best score, e.g. jackpots. */
	feat: { label: string; of: (g: Game<S>) => number };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnySpec = TableSpec<any>;
