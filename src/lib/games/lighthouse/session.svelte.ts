import { chooseShotAsync } from './aiClient';
import { playHorn, playLose, playNudge, playPlace, playRotate, playSelect, playStart, playWin } from './audio';
import {
	afloat,
	clampBow,
	cloneWaters,
	createWaters,
	fire,
	fits,
	nextAfter,
	randomFleet,
	replay,
	shipCells,
	type Placement,
	type ShotResult,
	type Waters
} from './engine';
import { peekSaved, scoresFor, writeSaved } from './persist';
import { lightPlay, lightView, persistLightPlay, persistLightView, recordLightScore } from './settings.svelte';
import {
	NORTH,
	SEA_INFO,
	SOUTH,
	lengthsOf,
	opponent,
	type Difficulty,
	type GameMode,
	type GameStatus,
	type Player,
	type Screen,
	type Sea
} from './types';

export type LightEvent =
	| { type: 'load' }
	| {
			type: 'shot';
			owner: Player;
			index: number;
			result: ShotResult;
			reduced: boolean;
	  };

/** Beam finds the cell, the shell flies, and the water answers; play waits for all of it. */
export const SHOT_MS = { impact: 760, miss: 1150, hit: 1350, sunk: 2300 };

export type Curtain = { for: Player; reason: 'setup' | 'turn' };

export class LightSession {
	screen = $state<Screen>('menu');
	mode = $state<GameMode>(lightPlay.mode);
	difficulty = $state<Difficulty>(lightPlay.difficulty);
	sea = $state<Sea>(lightView.sea);
	chain = $state(lightView.chain);
	first = $state<Player>(NORTH);

	/** Whose fleet is being laid out during setup. */
	setupFor = $state<Player>(NORTH);
	placing = $state.raw<Array<Placement | null>>([]);
	selected = $state(0);
	vertical = $state(false);
	private fleets: Record<Player, Placement[] | null> = { 1: null, 2: null };
	private lastFleets: Record<Player, Placement[] | null> = { 1: null, 2: null };

	waters = $state.raw<Record<Player, Waters> | null>(null);
	shots = $state.raw<Array<[Player, number]>>([]);
	current = $state<Player>(NORTH);
	/** Whose eyes are on the screen: their own fleet below, the rival's fog above. */
	viewer = $state<Player>(NORTH);
	status = $state<GameStatus>({ type: 'playing' });
	scores = $state({ 1: 0, 2: 0 });
	curtain = $state<Curtain | null>(null);
	aiThinking = $state(false);
	animating = $state(false);
	hover = $state(-1);
	cursor = $state(0);
	showCursor = $state(false);
	/** Bumps on every hit; lightning answers in the backdrop. */
	flash = $state(0);
	/** Bumps on every sinking. */
	wreck = $state(0);
	/** The last shot's outcome, for the HUD. */
	report = $state<{
		by: Player;
		kind: ShotResult['kind'];
		ship: number;
	} | null>(null);

	private token = 0;
	private listeners = new Set<(event: LightEvent) => void>();

	size = $derived(SEA_INFO[this.sea].size);
	lengths = $derived(lengthsOf(this.sea));
	ships = $derived(SEA_INFO[this.sea].ships);
	aiTurn = $derived(this.screen === 'play' && this.mode === 'ai' && this.current === SOUTH && this.status.type === 'playing');
	ended = $derived(this.status.type !== 'playing');
	busy = $derived(this.animating || this.aiThinking || this.ended || this.screen !== 'play' || this.curtain !== null);
	ready = $derived(this.placing.length > 0 && this.placing.every(Boolean));
	afloatOf = $derived.by(() => {
		const w = this.waters;
		return { 1: w ? afloat(w[1]) : 0, 2: w ? afloat(w[2]) : 0 };
	});
	/** 0–1: how much of both fleets has gone down; the storm builds with it. */
	tension = $derived.by(() => {
		const w = this.waters;
		if (!w) return 0;
		const total = w[1].lengths.reduce((a, b) => a + b, 0) * 2;
		const hit = w[1].hits.reduce((a, b) => a + b, 0) + w[2].hits.reduce((a, b) => a + b, 0);
		return Math.min(1, hit / total);
	});

	listen(fn: (event: LightEvent) => void) {
		this.listeners.add(fn);
		return () => this.listeners.delete(fn);
	}

	private emit(event: LightEvent) {
		for (const fn of this.listeners) fn(event);
	}

	start(mode: GameMode, difficulty: Difficulty, sea: Sea) {
		this.token += 1;
		this.mode = mode;
		this.difficulty = difficulty;
		this.sea = sea;
		this.chain = lightView.chain;
		this.scores = scoresFor(mode, difficulty);
		this.first = NORTH;
		this.lastFleets = { 1: null, 2: null };
		writeSaved(null);
		this.beginSetup();
		playStart();
	}

	resume() {
		const saved = peekSaved();
		if (!saved) return false;
		const battle = replay(SEA_INFO[saved.sea].size, lengthsOf(saved.sea), saved.fleets, saved.shots, saved.first, saved.chain);
		if (!battle || battle.status.type !== 'playing') {
			writeSaved(null);
			return false;
		}
		this.token += 1;
		this.mode = saved.mode;
		this.difficulty = saved.difficulty;
		this.sea = saved.sea;
		this.chain = saved.chain;
		this.first = saved.first;
		this.scores = scoresFor(saved.mode, saved.difficulty);
		this.fleets = { 1: saved.fleets[1], 2: saved.fleets[2] };
		this.lastFleets = { ...this.fleets };
		this.waters = battle.waters;
		this.shots = saved.shots;
		this.current = battle.next;
		this.viewer = this.mode === 'ai' ? NORTH : battle.next;
		this.status = { type: 'playing' };
		this.report = null;
		this.reset();
		this.screen = 'play';
		this.curtain = this.mode === 'local' ? { for: battle.next, reason: 'turn' } : null;
		lightPlay.mode = saved.mode;
		lightPlay.difficulty = saved.difficulty;
		persistLightPlay();
		this.emit({ type: 'load' });
		playStart();
		if (this.aiTurn) void this.runAi();
		return true;
	}

	backToMenu() {
		this.token += 1;
		this.aiThinking = false;
		this.animating = false;
		if (this.screen === 'play' && this.status.type === 'playing') this.save();
		this.curtain = null;
		this.screen = 'menu';
	}

	/** Another battle: the opener swaps and each side may keep or reshuffle their last layout. */
	rematch() {
		if (this.screen !== 'play') return;
		this.token += 1;
		this.first = opponent(this.first);
		this.chain = lightView.chain;
		this.beginSetup();
		playStart();
	}

	private reset() {
		this.aiThinking = false;
		this.animating = false;
		this.hover = -1;
		this.showCursor = false;
		this.cursor = Math.floor(this.size / 2) * this.size + Math.floor(this.size / 2);
	}

	private beginSetup() {
		this.screen = 'setup';
		this.waters = null;
		this.shots = [];
		this.status = { type: 'playing' };
		this.report = null;
		this.fleets = { 1: null, 2: null };
		this.reset();
		this.curtain = null;
		this.layOut(NORTH);
		if (this.mode === 'local') this.curtain = { for: NORTH, reason: 'setup' };
	}

	private layOut(player: Player) {
		this.setupFor = player;
		this.viewer = player;
		const last = this.lastFleets[player];
		this.placing = last ? last.map((p) => ({ ...p })) : this.lengths.map(() => null);
		this.selected = last ? -1 : 0;
		this.vertical = false;
	}

	// ── Setup ────────────────────────────────────────────────────────────

	selectShip(ship: number) {
		if (this.screen !== 'setup') return;
		this.selected = this.selected === ship ? -1 : ship;
		playSelect();
	}

	private nextUnplaced(from: number) {
		for (let k = 0; k < this.lengths.length; k += 1) {
			const ship = (from + k) % this.lengths.length;
			if (!this.placing[ship]) return ship;
		}
		return -1;
	}

	/** Bow position for the selected ship if laid from `index` with the current heading. */
	previewAt(index: number): {
		ship: number;
		at: number;
		vertical: boolean;
		ok: boolean;
		cells: number[];
	} | null {
		const ship = this.selected;
		if (ship < 0 || index < 0) return null;
		const vertical = this.vertical;
		const at = clampBow(this.size, this.lengths[ship], index, vertical);
		const cells = shipCells(this.size, this.lengths[ship], { at, vertical }) ?? [];
		return {
			ship,
			at,
			vertical,
			ok: fits(this.size, this.lengths, this.placing, ship, { at, vertical }),
			cells
		};
	}

	placeAt(index: number) {
		const preview = this.previewAt(index);
		if (!preview) return false;
		if (!preview.ok) {
			playNudge();
			return false;
		}
		const next = [...this.placing];
		next[preview.ship] = { at: preview.at, vertical: preview.vertical };
		this.placing = next;
		this.selected = this.nextUnplaced(preview.ship + 1);
		playPlace(this.lengths[preview.ship]);
		return true;
	}

	shipAt(index: number) {
		for (let k = 0; k < this.placing.length; k += 1) {
			const p = this.placing[k];
			if (p && shipCells(this.size, this.lengths[k], p)?.includes(index)) return k;
		}
		return -1;
	}

	moveShip(ship: number, at: number, vertical = this.placing[ship]?.vertical ?? false) {
		const bow = clampBow(this.size, this.lengths[ship], at, vertical);
		if (!fits(this.size, this.lengths, this.placing, ship, { at: bow, vertical })) {
			playNudge();
			return false;
		}
		const next = [...this.placing];
		next[ship] = { at: bow, vertical };
		this.placing = next;
		playPlace(this.lengths[ship]);
		return true;
	}

	/** Turn a laid hull about its bow, sliding it back inside the sea if it would hang off. */
	rotateShip(ship: number) {
		const p = this.placing[ship];
		if (!p) return false;
		const vertical = !p.vertical;
		const bow = clampBow(this.size, this.lengths[ship], p.at, vertical);
		if (!fits(this.size, this.lengths, this.placing, ship, { at: bow, vertical })) {
			playNudge();
			return false;
		}
		const next = [...this.placing];
		next[ship] = { at: bow, vertical };
		this.placing = next;
		playRotate();
		return true;
	}

	turn() {
		if (this.screen !== 'setup') return;
		if (this.selected >= 0 && this.placing[this.selected]) {
			this.rotateShip(this.selected);
			return;
		}
		this.vertical = !this.vertical;
		playRotate();
	}

	scatter() {
		if (this.screen !== 'setup') return;
		this.placing = randomFleet(this.size, this.lengths);
		this.selected = -1;
		playPlace(5);
	}

	clearFleet() {
		if (this.screen !== 'setup') return;
		this.placing = this.lengths.map(() => null);
		this.selected = 0;
		playRotate();
	}

	confirmSetup() {
		if (this.screen !== 'setup' || !this.ready || this.curtain) return;
		const fleet = this.placing.map((p) => ({ ...(p as Placement) }));
		this.fleets[this.setupFor] = fleet;
		this.lastFleets[this.setupFor] = fleet;
		if (this.mode === 'ai') {
			this.fleets[SOUTH] = randomFleet(this.size, this.lengths, this.difficulty === 'hard');
			this.beginBattle();
			return;
		}
		if (this.setupFor === NORTH) {
			this.curtain = { for: SOUTH, reason: 'setup' };
			playHorn();
			return;
		}
		this.beginBattle();
	}

	private beginBattle() {
		const f1 = this.fleets[1];
		const f2 = this.fleets[2];
		if (!f1 || !f2) return;
		this.waters = {
			1: createWaters(this.size, this.lengths, f1),
			2: createWaters(this.size, this.lengths, f2)
		};
		this.shots = [];
		this.current = this.first;
		this.status = { type: 'playing' };
		this.report = null;
		this.reset();
		this.screen = 'play';
		this.viewer = this.mode === 'ai' ? NORTH : this.first;
		this.curtain = this.mode === 'local' ? { for: this.first, reason: 'turn' } : null;
		this.emit({ type: 'load' });
		playHorn();
		if (this.aiTurn) void this.runAi();
	}

	/** The next keeper has the spyglass; show their waters. */
	liftCurtain() {
		const c = this.curtain;
		if (!c) return;
		this.curtain = null;
		if (c.reason === 'setup') {
			if (this.screen === 'setup' && c.for === SOUTH) this.layOut(SOUTH);
			playSelect();
			return;
		}
		this.viewer = c.for;
		this.reset();
		this.emit({ type: 'load' });
		playSelect();
	}

	// ── Battle ───────────────────────────────────────────────────────────

	canFire(index: number) {
		const w = this.waters;
		if (!w || this.busy || this.aiTurn || this.current !== this.viewer) return false;
		const target = w[opponent(this.current)];
		return index >= 0 && index < target.shots.length && target.shots[index] === 0;
	}

	setHover(index: number) {
		this.hover = this.screen === 'setup' || this.canFire(index) ? index : -1;
	}

	fireAt(index: number) {
		if (!this.canFire(index)) return;
		void this.shoot(this.current, index);
	}

	fireCursor() {
		if (!this.showCursor) {
			this.showCursor = true;
			return;
		}
		if (this.screen === 'setup') this.placeAt(this.cursor);
		else this.fireAt(this.cursor);
	}

	moveCursor(dr: number, dc: number) {
		if (this.screen === 'play' && (this.busy || this.aiTurn)) return;
		if (this.curtain) return;
		if (!this.showCursor) {
			this.showCursor = true;
			playSelect();
			return;
		}
		const r = Math.max(0, Math.min(this.size - 1, Math.floor(this.cursor / this.size) + dr));
		const c = Math.max(0, Math.min(this.size - 1, (this.cursor % this.size) + dc));
		const next = r * this.size + c;
		if (next !== this.cursor) {
			this.cursor = next;
			playSelect();
		}
	}

	private async shoot(player: Player, index: number) {
		const w = this.waters;
		if (!w) return;
		const token = this.token;
		const owner = opponent(player);
		const next = cloneWaters(w[owner]);
		const result = fire(next, index);
		if (!result) return;
		this.animating = true;
		this.hover = -1;
		if (this.showCursor && player === this.viewer) this.cursor = index;
		const reduced = prefersReduced();
		this.emit({ type: 'shot', owner, index, result, reduced });
		await wait(reduced ? 160 : SHOT_MS.impact);
		if (token !== this.token) return;
		this.waters = { ...w, [owner]: next } as Record<Player, Waters>;
		this.shots = [...this.shots, [player, index]];
		this.report = { by: player, kind: result.kind, ship: result.ship };
		if (result.kind !== 'miss') this.flash += 1;
		if (result.kind === 'sunk') {
			this.wreck += 1;
			lightView.wrecks += 1;
			persistLightView();
		}
		const settle = reduced ? 240 : SHOT_MS[result.kind] - SHOT_MS.impact;
		await wait(settle);
		if (token !== this.token) return;
		this.animating = false;

		if (result.won) {
			this.finish(player);
			return;
		}
		const after = nextAfter(player, result, this.chain);
		this.current = after;
		this.save();
		if (this.mode === 'local' && after !== player) {
			await wait(reduced ? 200 : 650);
			if (token !== this.token) return;
			this.curtain = { for: after, reason: 'turn' };
			playHorn();
			return;
		}
		if (this.aiTurn) void this.runAi();
	}

	private async runAi() {
		const w = this.waters;
		if (!w) return;
		const token = this.token;
		this.aiThinking = true;
		const started = performance.now();
		const target = w[NORTH];
		const index = await chooseShotAsync({
			size: this.size,
			shots: target.shots,
			afloat: target.lengths.filter((_, k) => !target.sunk[k]),
			difficulty: this.difficulty
		});
		if (token !== this.token || this.screen !== 'play') return;
		const pause = (prefersReduced() ? 200 : 650 + Math.random() * 450) - (performance.now() - started);
		if (pause > 0) await wait(pause);
		if (token !== this.token || this.screen !== 'play') return;
		this.aiThinking = false;
		if (index < 0) return;
		void this.shoot(SOUTH, index);
	}

	private finish(winner: Player) {
		this.status = { type: 'won', winner };
		this.aiThinking = false;
		writeSaved(null);
		lightView.fought += 1;
		persistLightView();
		this.scores[winner] += 1;
		recordLightScore(this.mode, this.difficulty, {
			1: this.scores[1],
			2: this.scores[2]
		});
		if (this.mode === 'local') this.viewer = winner;
		this.emit({ type: 'load' });
		if (this.mode === 'local' || winner === NORTH) playWin();
		else playLose();
	}

	private save() {
		const f1 = this.fleets[1];
		const f2 = this.fleets[2];
		if (this.screen !== 'play' || this.status.type !== 'playing' || !f1 || !f2) return;
		writeSaved({
			mode: this.mode,
			difficulty: this.difficulty,
			sea: this.sea,
			first: this.first,
			chain: this.chain,
			fleets: { 1: f1, 2: f2 },
			shots: [...this.shots]
		});
	}
}

function prefersReduced() {
	return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function wait(ms: number) {
	return new Promise((resolve) => window.setTimeout(resolve, ms));
}
