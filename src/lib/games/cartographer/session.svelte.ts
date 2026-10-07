import { chooseAiMoveAsync } from './aiClient';
import { playClaim, playDraw, playScratch, playSelect, playStart, playTurn, playWin } from './audio';
import { createGrid, edgeEnds, play, statusOf, tally, topology, type Grid } from './engine';
import { peekSaved, scoresFor, writeSaved } from './persist';
import { cartPlay, cartView, persistCartPlay, persistCartView, recordCartScore } from './settings.svelte';
import { CHART_INFO, INDIGO, VERMILION, opponent, type Chart, type Difficulty, type GameMode, type GameStatus, type Player, type Screen } from './types';

export type InkEvent =
	| { type: 'load' }
	| { type: 'line'; edge: number; player: Player; closed: number[]; streak: number }
	| { type: 'done'; status: GameStatus };

export class CartSession {
	screen = $state<Screen>('menu');
	mode = $state<GameMode>(cartPlay.mode);
	difficulty = $state<Difficulty>(cartPlay.difficulty);
	chart = $state<Chart>(cartView.chart);
	seed = $state(1);
	grid = $state.raw<Grid>(createGrid(CHART_INFO[cartView.chart].size));
	current = $state<Player>(VERMILION);
	status = $state<GameStatus>({ type: 'playing' });
	scores = $state({ 1: 0, 2: 0 });
	aiThinking = $state(false);
	hover = $state(-1);
	cursor = $state(0);
	showCursor = $state(false);
	lastEdge = $state(-1);
	/** Boxes closed so far this turn; climbs the chime. */
	streak = $state(0);
	turnPulse = $state(0);
	/** Bumps on every box closed, for the candle. */
	flare = $state(0);
	strokes = $state(0);
	private opener: Player = VERMILION;
	private token = 0;
	private listeners = new Set<(event: InkEvent) => void>();

	n = $derived(this.grid.n);
	count = $derived(tally(this.grid));
	aiTurn = $derived(this.mode === 'ai' && this.current === INDIGO);
	busy = $derived(this.aiThinking || this.status.type !== 'playing' || this.screen !== 'play');
	/** Share of the chart inked into boxes, 0..1. */
	progress = $derived((this.count[1] + this.count[2]) / Math.max(1, this.grid.boxes.length));
	inked = $derived(this.grid.edges.reduce((k, v) => k + (v ? 1 : 0), 0) / Math.max(1, this.grid.edges.length));
	ended = $derived(this.status.type !== 'playing');

	listen(fn: (event: InkEvent) => void) {
		this.listeners.add(fn);
		return () => this.listeners.delete(fn);
	}

	private emit(event: InkEvent) {
		for (const fn of this.listeners) fn(event);
	}

	start(mode: GameMode, difficulty: Difficulty, chart: Chart) {
		this.mode = mode;
		this.difficulty = difficulty;
		this.chart = chart;
		this.scores = scoresFor(mode, difficulty);
		this.opener = VERMILION;
		this.screen = 'play';
		writeSaved(null);
		this.fresh();
	}

	resume() {
		const saved = peekSaved();
		if (!saved) return false;
		const n = CHART_INFO[saved.chart].size;
		const grid: Grid = { n, edges: Int8Array.from(saved.edges), boxes: Int8Array.from(saved.boxes) };
		if (statusOf(grid).type !== 'playing') {
			writeSaved(null);
			return false;
		}
		this.token += 1;
		this.mode = saved.mode;
		this.difficulty = saved.difficulty;
		this.chart = saved.chart;
		this.seed = saved.seed;
		this.scores = scoresFor(saved.mode, saved.difficulty);
		this.grid = grid;
		this.current = saved.current;
		this.status = { type: 'playing' };
		this.aiThinking = false;
		this.hover = -1;
		this.lastEdge = -1;
		this.streak = 0;
		this.cursor = 0;
		this.screen = 'play';
		cartPlay.mode = saved.mode;
		cartPlay.difficulty = saved.difficulty;
		persistCartPlay();
		this.emit({ type: 'load' });
		playStart();
		if (this.aiTurn) void this.runAi();
		return true;
	}

	backToMenu() {
		this.token += 1;
		this.aiThinking = false;
		if (this.screen === 'play' && this.status.type === 'playing') this.save();
		this.screen = 'menu';
	}

	rematch() {
		if (this.screen !== 'play') return;
		this.opener = opponent(this.opener);
		this.fresh();
	}

	private fresh() {
		this.token += 1;
		this.seed = (Math.random() * 2 ** 32) >>> 0;
		this.grid = createGrid(CHART_INFO[this.chart].size);
		this.current = this.opener;
		this.status = { type: 'playing' };
		this.aiThinking = false;
		this.hover = -1;
		this.lastEdge = -1;
		this.streak = 0;
		this.cursor = 0;
		this.showCursor = false;
		this.emit({ type: 'load' });
		playStart();
		if (this.aiTurn) void this.runAi();
	}

	setHover(edge: number) {
		this.hover = this.busy || this.aiTurn ? -1 : edge;
	}

	/** A line chosen by a person, by pointer or keyboard. */
	ink(edge: number) {
		if (this.busy || this.aiTurn || this.grid.edges[edge]) return;
		this.commit(edge, this.current);
	}

	inkCursor() {
		if (!this.showCursor) {
			this.showCursor = true;
			return;
		}
		this.ink(this.cursor);
	}

	moveCursor(dx: number, dy: number) {
		if (this.busy) return;
		const topo = topology(this.n);
		if (!this.showCursor) {
			this.showCursor = true;
			return;
		}
		const mid = (e: number) => {
			const [x0, y0, x1, y1] = edgeEnds(topo, e);
			return [(x0 + x1) / 2, (y0 + y1) / 2];
		};
		const [x, y] = mid(this.cursor);
		let best = -1;
		let bestScore = Infinity;
		for (let e = 0; e < topo.E; e += 1) {
			if (e === this.cursor) continue;
			const [ex, ey] = mid(e);
			const along = (ex - x) * dx + (ey - y) * dy;
			if (along < 0.25) continue;
			const side = Math.abs((ex - x) * dy - (ey - y) * dx);
			const score = along + side * 2.2 + (this.grid.edges[e] ? 0.3 : 0);
			if (score < bestScore) {
				bestScore = score;
				best = e;
			}
		}
		if (best >= 0) {
			this.cursor = best;
			playSelect();
		}
	}

	private commit(edge: number, player: Player) {
		const result = play(this.grid, edge, player);
		if (!result) return;
		this.grid = result.grid;
		this.lastEdge = edge;
		this.hover = -1;
		this.strokes += 1;
		if (result.closed.length) {
			this.streak += result.closed.length;
			this.flare += 1;
		} else {
			this.streak = 0;
		}
		this.emit({ type: 'line', edge, player, closed: result.closed, streak: this.streak });
		playScratch(player);
		if (result.closed.length) playClaim(this.streak, result.closed.length);

		const status = statusOf(result.grid);
		if (status.type !== 'playing') {
			this.finish(status);
			return;
		}
		if (!result.closed.length) {
			this.current = opponent(player);
			this.turnPulse += 1;
			this.streak = 0;
			playTurn(this.current);
		}
		this.save();
		if (this.aiTurn && !this.aiThinking) void this.runAi();
	}

	private async runAi() {
		const token = this.token;
		this.aiThinking = true;
		const reduced = prefersReduced();
		let first = true;
		while (token === this.token && this.aiTurn && this.status.type === 'playing' && this.screen === 'play') {
			const started = performance.now();
			const edge = await chooseAiMoveAsync(this.n, this.grid.edges, this.difficulty);
			if (token !== this.token || this.screen !== 'play') return;
			const pause = reduced ? 120 : first ? 620 + Math.random() * 380 : this.streak ? 230 : 480;
			const left = pause - (performance.now() - started);
			if (left > 0) await wait(left);
			if (token !== this.token || this.screen !== 'play') return;
			if (edge < 0 || this.grid.edges[edge]) break;
			first = false;
			this.commit(edge, INDIGO);
		}
		if (token === this.token) this.aiThinking = false;
	}

	private finish(status: GameStatus) {
		this.status = status;
		this.aiThinking = false;
		writeSaved(null);
		cartView.charted += 1;
		persistCartView();
		if (status.type === 'won') {
			this.scores[status.winner] += 1;
			recordCartScore(this.mode, this.difficulty, { 1: this.scores[1], 2: this.scores[2] });
			playWin(status.winner === VERMILION || this.mode === 'local');
		} else {
			playDraw();
		}
		this.emit({ type: 'done', status });
	}

	private save() {
		if (this.status.type !== 'playing') return;
		writeSaved({
			mode: this.mode,
			difficulty: this.difficulty,
			chart: this.chart,
			seed: this.seed,
			edges: Array.from(this.grid.edges),
			boxes: Array.from(this.grid.boxes),
			current: this.current
		});
	}
}

function prefersReduced() {
	return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function wait(ms: number) {
	return new Promise((resolve) => window.setTimeout(resolve, ms));
}
