import type { Card } from '../../kit/cards/deck';
import type { Placement } from '../../kit/cards/layout';
import type { PubAction, PubState } from '../ai';
import type { Lesson } from '../lessons';
import type { Mark, Plate, Spot, TableInput } from '../table';
import type { Difficulty, Mode } from '../types';

/** Who is looking at the table, and how seats map onto it. */
export type ViewCtx = {
	viewer: number;
	names: string[];
	humans: boolean[];
	mode: Mode;
	difficulty: Difficulty;
	place: (seat: number) => number;
	/** The viewer can see this seat's cards. */
	mine: (seat: number) => boolean;
};

export type PlateInfo = { score: string; sub: string; tags: string[] };

/** Prompt text: plain strings, with `**bold**` for the key words. */
export type Rich = string;

export type PromptDo = PubAction | 'next' | 'confirm' | { spot: string };

export type PromptButton = {
	/** Matches the coach's button id so Rosie's suggestion glows. */
	id: string;
	label: string;
	look?: 'go' | 'soft' | 'gold' | 'num' | 'suit' | 'chip';
	red?: boolean;
	aria?: string;
	do: PromptDo;
	disabled?: boolean;
	sub?: string;
};

export type PromptModel =
	| { kind: 'line'; text: Rich; muted?: boolean; buttons?: PromptButton[] }
	| { kind: 'summary'; head: Rich; items: Array<{ label: string; value?: string; note?: string }>; buttons?: PromptButton[] };

export type PromptCtx = ViewCtx & {
	my: boolean;
	/** "Waiting for Fergus" and friends, for when it isn't the viewer's move. */
	waiting: string;
	selected: Card[];
};

export type LedgerModel = {
	table?: {
		head: Array<{ text: string; seat?: number }>;
		rows: string[][];
		foot?: Array<{ text: string; sub?: string; best?: boolean }>;
		empty?: string;
	};
	rows?: Array<{ label: string; value: string; seat?: number; tag?: string }>;
	notes: string[];
};

export type ResultCopy = { kicker: string; title: string; body: string };

export type GuideModel = { intro: Rich; cols: Array<{ title: string; items: Rich[] }> };

/** Hooks for speech bubbles, sounds and the room's mood. */
export type Fx = {
	say: (seat: number, text: string, tone?: 'score' | 'call' | 'plain') => void;
	cheer: () => void;
	hush: () => void;
	stir: () => void;
	sound: (kind: 'card' | 'pass' | 'knock' | 'deal' | 'peg', arg?: number) => void;
	pan: (seat: number) => number;
};

export type TableKit = {
	input: TableInput;
	put: (id: Card, p: Omit<Placement, 'id'>) => void;
	hand: (seat: number, list: Card[], options?: { order?: Card[]; glow?: (c: Card) => string | null; faceUp?: boolean; live?: (c: Card) => boolean }) => void;
	trickSpot: (pos: number) => { x: number; y: number; rot: number };
	pileSpot: (pos: number) => { x: number; y: number };
	/** Where a seat's hand sits, for things laid in front of it. */
	seatSpot: (pos: number) => { x: number; y: number };
	jitter: (c: Card, amount: number) => number;
	plates: Plate[];
	marks: Mark[];
	spots: Spot[];
	cw: number;
	ch: number;
	cx: number;
	cy: number;
	w: number;
	h: number;
	small: number;
	pileScale: number;
	dealing: boolean;
	colours: { gold: string; green: string; red: string; teal: string };
};

export type GameView<S extends PubState = PubState> = {
	glyph: { glyph: string; red: boolean };
	tips: string[];
	lesson: Lesson;
	/** All card ids the game uses, gathered into a deck between hands. */
	deck?: (s: S) => Card[];
	cardWidth?: (w: number, h: number) => number;
	/** No name plates on the felt (patience games). */
	noPlates?: boolean;
	layout: (s: S, k: TableKit) => void;
	plate: (s: S, seat: number, v: ViewCtx) => PlateInfo;
	prompt: (s: S, p: PromptCtx) => PromptModel;
	ledger: (s: S, v: ViewCtx) => LedgerModel;
	result: (s: S, v: ViewCtx & { won: boolean; winners: number[] }) => ResultCopy;
	guide: GuideModel;
	/** Cards the seat may tap right now. */
	legal: (s: S, seat: number) => Card[];
	/** What tapping one of those cards does: an action, or 'select' to toggle it in the selection. */
	tap: (s: S, card: Card, seat: number, selected: Card[]) => PubAction | 'select' | null;
	/** Most cards that can be selected at once (defaults to 1). */
	selectMax?: (s: S) => number;
	/** Tapping a spot on the felt (a pile, the stock, an empty column). */
	spot?: (s: S, id: string, seat: number, selected: Card[]) => PubAction | null;
	react?: (prev: S, next: S, action: PubAction, seat: number, fx: Fx) => void;
	/** The table moves on by itself in this state (a finished trick on show). */
	auto?: (s: S) => boolean;
};
