import { chord, createDaily, createField, plant, restore, reveal, serialise, toggleFlag, type Field, type Step } from './engine';
import { peekSaved, writeFrost, type Board } from './persist';
import { frostPrefs, persistFrostPrefs, recordStart, recordWin } from './settings.svelte';
import { playCrack, playFlag, playNudge, playOpen, playPause, playStart, playThaw } from './audio';
import { DAILY, HIDDEN, LEVEL_INFO, OPEN, todayKey, type Screen, type Spec, type Status } from './types';

export type FieldEvent =
	| { type: 'load' }
	| { type: 'open'; step: Extract<Step, { kind: 'open' }> }
	| { type: 'boom'; step: Extract<Step, { kind: 'boom' }> }
	| { type: 'flag'; cell: number; on: boolean }
	| { type: 'nudge'; cell: number }
	| { type: 'won' };

export type FieldListener = (event: FieldEvent) => void;

function specOf(board: Board): Spec {
	return board === 'daily' ? DAILY : LEVEL_INFO[board];
}

function freshSeed() {
	if (typeof crypto !== 'undefined' && crypto.getRandomValues) return crypto.getRandomValues(new Uint32Array(1))[0];
	return (Math.random() * 2 ** 32) >>> 0;
}

export class FrostSession {
	screen = $state<Screen>('menu');
	board = $state<Board>(frostPrefs.level);
	date = $state('');
	status = $state<Status>({ type: 'ready' });
	time = $state(0);
	flags = $state(0);
	opened = $state(0);
	mines = $state(10);
	safe = $state(71);
	cursor = $state(-1);
	/** The marker only shows while the keyboard is steering. */
	showCursor = $state(false);
	flagMode = $state(false);
	newBest = $state(false);
	guessFree = $state(false);
	/** Bumps on every opening; the backdrop warms a little each time. */
	melt = $state(0);
	/** Bumps when the ice gives way. */
	crack = $state(0);

	/** Plain object on purpose: the renderer reads it every frame. */
	field: Field = createField(LEVEL_INFO.shore);

	private listeners = new Set<FieldListener>();
	private ticker = 0;
	private clockFrom = 0;

	left = $derived(this.mines - this.flags);
	progress = $derived(this.safe ? this.opened / this.safe : 0);
	ended = $derived(this.status.type === 'won' || this.status.type === 'lost');

	start(board: Board = this.board) {
		this.board = board;
		if (board !== 'daily') {
			frostPrefs.level = board;
			persistFrostPrefs();
		}
		const date = board === 'daily' ? todayKey() : '';
		const field = board === 'daily' ? createDaily(DAILY, date) : createField(LEVEL_INFO[board]);
		this.load(field, date, 0);
		recordStart(board, date);
		writeFrost({ saved: null });
		playStart();
	}

	/** Picks up the saved survey; a daily from an earlier day is dropped. */
	resume() {
		const saved = peekSaved();
		if (!saved) return false;
		if (saved.board === 'daily' && saved.date !== todayKey()) {
			writeFrost({ saved: null });
			return false;
		}
		const field = restore(specOf(saved.board), { mines: saved.mines, state: saved.state }, saved.start, saved.guessFree);
		if (!field) {
			writeFrost({ saved: null });
			return false;
		}
		this.board = saved.board;
		if (saved.board !== 'daily') {
			frostPrefs.level = saved.board;
			persistFrostPrefs();
		}
		this.load(field, saved.date, saved.time);
		this.status = { type: 'paused' };
		playStart();
		return true;
	}

	restart() {
		if (this.screen !== 'play') return;
		this.start(this.board);
	}

	backToMenu() {
		this.stash();
		this.stopClock();
		this.screen = 'menu';
	}

	togglePause() {
		if (this.screen !== 'play') return;
		const type = this.status.type;
		if (type === 'paused') {
			this.status = { type: this.time > 0 ? 'playing' : 'ready' };
			if (this.status.type === 'playing') this.runClock();
			playPause(false);
			return;
		}
		if (type !== 'playing' && type !== 'ready') return;
		if (type === 'ready' && !this.field.planted) return;
		this.stopClock();
		this.status = { type: 'paused' };
		this.stash();
		playPause(true);
	}

	hide() {
		if (this.status.type === 'playing') this.togglePause();
		this.stash();
	}

	/** The main action on a cell: dig, or flag it when flag mode is on. */
	strike(cell: number) {
		if (this.flagMode && this.field.state[cell] !== OPEN && this.status.type !== 'paused') this.mark(cell);
		else this.dig(cell);
	}

	/** Opens a cell, or chords a number whose flags are all placed. */
	dig(cell: number) {
		if (this.screen !== 'play' || cell < 0 || cell >= this.field.total) return;
		const type = this.status.type;
		if (type === 'paused') {
			this.togglePause();
			return;
		}
		if (type !== 'playing' && type !== 'ready') return;
		this.cursor = cell;
		const field = this.field;
		if (field.state[cell] === OPEN) {
			this.chordAt(cell);
			return;
		}
		if (field.state[cell] !== HIDDEN) return;
		if (!field.planted) {
			plant(field, cell, freshSeed(), frostPrefs.sure);
			this.guessFree = field.guessFree;
		}
		this.begin();
		const step = reveal(field, cell);
		if (step) this.apply(step);
	}

	/** Plants or lifts a tip-up flag. Marking a number chords it, as a second button would. */
	mark(cell: number) {
		if (this.screen !== 'play' || cell < 0 || cell >= this.field.total) return;
		const type = this.status.type;
		if (type !== 'playing' && type !== 'ready') return;
		this.cursor = cell;
		if (this.field.state[cell] === OPEN) {
			this.chordAt(cell);
			return;
		}
		const next = toggleFlag(this.field, cell);
		if (next == null) return;
		this.flags = this.field.flags;
		playFlag(next !== HIDDEN);
		this.emit({ type: 'flag', cell, on: next !== HIDDEN });
	}

	moveCursor(dx: number, dy: number) {
		if (this.screen !== 'play') return;
		const { w, h } = this.field;
		this.showCursor = true;
		if (this.cursor < 0) {
			this.cursor = Math.floor(h / 2) * w + Math.floor(w / 2);
			return;
		}
		const x = Math.min(w - 1, Math.max(0, (this.cursor % w) + dx));
		const y = Math.min(h - 1, Math.max(0, Math.floor(this.cursor / w) + dy));
		this.cursor = y * w + x;
	}

	toggleFlagMode() {
		this.flagMode = !this.flagMode;
	}

	listen(listener: FieldListener) {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	stash() {
		if (this.screen !== 'play') return;
		const field = this.field;
		if (field.over !== 'live' || !field.planted || (this.board !== 'daily' && field.opened === 0)) {
			if (field.over !== 'live') writeFrost({ saved: null });
			return;
		}
		this.syncClock();
		const core = serialise(field);
		writeFrost({
			saved: {
				board: this.board,
				date: this.date,
				mines: core.mines,
				state: core.state,
				time: this.time,
				start: field.start,
				guessFree: field.guessFree
			}
		});
	}

	private chordAt(cell: number) {
		const step = chord(this.field, cell);
		if (!step) {
			this.emit({ type: 'nudge', cell });
			playNudge();
			return;
		}
		this.begin();
		this.apply(step);
	}

	private begin() {
		if (this.status.type === 'ready') {
			this.status = { type: 'playing' };
			this.runClock();
		}
	}

	private apply(step: Step) {
		const field = this.field;
		this.opened = field.opened;
		this.flags = field.flags;
		if (step.kind === 'boom') {
			this.stopClock();
			this.status = { type: 'lost' };
			this.crack += 1;
			playCrack();
			this.emit({ type: 'boom', step });
			writeFrost({ saved: null });
			return;
		}
		this.melt += 1;
		playOpen(step.cells.length, step.cells.length ? Math.max(...step.dist) : 0);
		this.emit({ type: 'open', step });
		if (field.over === 'won') {
			this.stopClock();
			this.status = { type: 'won' };
			this.newBest = recordWin(this.board, this.date, Math.round(this.time));
			playThaw();
			this.emit({ type: 'won' });
			writeFrost({ saved: null });
		}
	}

	private load(field: Field, date: string, time: number) {
		this.stopClock();
		this.field = field;
		this.date = date;
		this.screen = 'play';
		this.status = { type: 'ready' };
		this.time = time;
		this.flags = field.flags;
		this.opened = field.opened;
		this.mines = field.mines;
		this.safe = field.total - field.mines;
		this.guessFree = field.guessFree;
		this.newBest = false;
		this.cursor = -1;
		this.showCursor = false;
		this.flagMode = false;
		this.emit({ type: 'load' });
	}

	private emit(event: FieldEvent) {
		for (const listener of this.listeners) listener(event);
	}

	private syncClock() {
		if (this.ticker) this.time = performance.now() - this.clockFrom;
	}

	private runClock() {
		if (this.ticker || typeof window === 'undefined') return;
		this.clockFrom = performance.now() - this.time;
		this.ticker = window.setInterval(() => this.syncClock(), 100);
	}

	private stopClock() {
		this.syncClock();
		if (this.ticker) clearInterval(this.ticker);
		this.ticker = 0;
	}
}
