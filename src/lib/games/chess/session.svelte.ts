import { MATE } from './ai';
import { askAnalyst, askOpponent } from './aiClient';
import {
	playCapture,
	playCastle,
	playCheck,
	playDraw,
	playFlag,
	playLose,
	playMove,
	playNudge,
	playOffer,
	playPromote,
	playSelect,
	playStart,
	playTick,
	playWin
} from './audio';
import { bookMoves, openingName } from './book';
import {
	FLAG_CAPTURE,
	FLAG_CASTLE,
	FLAG_EP,
	FLAG_PROMO,
	PAWN,
	Position,
	START_FEN,
	automaticOutcome,
	claimable,
	squareName,
	uciOf,
	type Color,
	type Outcome
} from './engine';
import { peekSaved, writeSaved } from './persist';
import { chessView, persistChessView } from './settings.svelte';
import { TIME_INFO, opponentById, type Mode, type OpponentId, type Screen, type Side, type TimeControl } from './types';

export type MoveRecord = {
	uci: string;
	san: string;
	from: number;
	to: number;
	/** Signed piece that moved (before promotion). */
	piece: number;
	/** Signed piece taken, if any. */
	captured: number;
	/** Square the captured piece stood on (differs from `to` en passant). */
	capturedAt: number;
	promo: number;
	castle: boolean;
	check: boolean;
	side: Side;
	book: boolean;
	/** Mover's clock after the move and its increment, if timed. */
	clock: number | null;
};

export type Mark = 'book' | 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

export type Review = {
	index: number;
	/** White-view centipawns per position, 0..moves. */
	scores: Array<number | null>;
	best: Array<string | null>;
	marks: Array<Mark | null>;
	done: number;
	total: number;
};

export type ChessEvent =
	| { type: 'load' }
	| { type: 'move'; record: MoveRecord; reduced: boolean }
	| { type: 'end'; outcome: Outcome; reduced: boolean };

export const REASON_TEXT: Record<Outcome['reason'], string> = {
	checkmate: 'Checkmate',
	stalemate: 'Stalemate',
	insufficient: 'Insufficient material',
	fivefold: 'Fivefold repetition',
	seventyfive: 'Seventy-five move rule',
	threefold: 'Threefold repetition',
	fifty: 'Fifty-move rule',
	agreement: 'Draw agreed',
	resign: 'Resignation',
	timeout: 'Time forfeit',
	'timeout-draw': 'Flag fell — no mating material'
};

const colorOf = (side: Side): Color => (side === 'w' ? 1 : -1);
const sideOf = (color: Color): Side => (color === 1 ? 'w' : 'b');
const other = (side: Side): Side => (side === 'w' ? 'b' : 'w');

/** Win chance for a white-view score, for grading review moves. */
function winChance(cp: number) {
	const clamped = Math.max(-1500, Math.min(1500, cp));
	return 1 / (1 + Math.exp(-clamped / 250));
}

export class ChessSession {
	screen = $state<Screen>('menu');
	mode = $state<Mode>(chessView.mode);
	opponentId = $state<OpponentId>(chessView.opponent);
	human = $state<Side>('w');
	time = $state<TimeControl>(chessView.time);

	records = $state.raw<MoveRecord[]>([]);
	board = $state.raw<Int8Array>(new Position(START_FEN).board.slice());
	turn = $state<Side>('w');
	outcome = $state<Outcome | null>(null);
	selected = $state(-1);
	targets = $state.raw<number[]>([]);
	promotion = $state<{ from: number; to: number } | null>(null);
	clocks = $state({ w: 0, b: 0 });
	aiThinking = $state(false);
	opening = $state<string | null>(null);
	claim = $state<'threefold' | 'fifty' | null>(null);
	/** A standing draw offer, by the side that made it. */
	offer = $state<Side | null>(null);
	note = $state<string | null>(null);
	evalScore = $state<number | null>(null);
	viewPly = $state<number | null>(null);
	review = $state<Review | null>(null);
	flipped = $state(false);
	cursor = $state(0x14);
	showCursor = $state(false);
	/** Bumps on each check and on mate; the hall's lightning answers. */
	flash = $state(0);

	private pos = new Position(START_FEN);
	private snapshots: Int8Array[] = [];
	private repKeys: string[] = [];
	private token = 0;
	private evalToken = 0;
	private listeners = new Set<(event: ChessEvent) => void>();
	private clockTimer: number | null = null;
	private lastTick = 0;
	private lastBotScore = 0;
	private noteTimer: number | null = null;

	opponent = $derived(opponentById(this.opponentId));
	ended = $derived(this.outcome !== null);
	aiTurn = $derived(this.screen === 'play' && this.mode === 'ai' && !this.outcome && this.turn !== this.human);
	shownPly = $derived(this.review ? this.review.index : (this.viewPly ?? this.records.length));
	live = $derived(!this.review && this.viewPly === null);
	canInput = $derived(this.screen === 'play' && !this.outcome && !this.aiTurn && this.live && !this.promotion);
	shownTurn = $derived<Side>(this.shownPly % 2 === 0 ? 'w' : 'b');
	bottom = $derived.by<Side>(() => {
		const base = this.mode === 'ai' ? this.human : chessView.autoFlip && !this.outcome ? this.turn : 'w';
		return this.flipped ? other(base) : base;
	});
	lastMove = $derived(this.shownPly > 0 ? this.records[this.shownPly - 1] : null);
	timed = $derived(this.time !== 'none');
	shownBoard = $derived.by(() => {
		if (this.shownPly === this.records.length) return this.board;
		return this.snapshots[this.shownPly] ?? this.board;
	});
	checkSquare = $derived.by(() => {
		const rec = this.lastMove;
		if (!rec || !rec.check) return -1;
		const b = this.shownBoard;
		const king = rec.side === 'w' ? -6 : 6;
		for (let sq = 0; sq < 128; sq += 1) if (!(sq & 0x88) && b[sq] === king) return sq;
		return -1;
	});
	/** Pieces each side has taken so far, and the material balance (white's view). */
	captures = $derived.by(() => {
		const w: number[] = [];
		const b: number[] = [];
		let balance = 0;
		const VAL = [0, 1, 3, 3, 5, 9, 0];
		for (let i = 0; i < this.shownPly; i += 1) {
			const r = this.records[i];
			if (r.captured) {
				(r.side === 'w' ? w : b).push(Math.abs(r.captured));
				balance += VAL[Math.abs(r.captured)] * (r.side === 'w' ? 1 : -1);
			}
			if (r.promo) balance += (VAL[r.promo] - 1) * (r.side === 'w' ? 1 : -1);
		}
		w.sort((a, c) => c - a);
		b.sort((a, c) => c - a);
		return { w, b, balance };
	});

	listen(fn: (event: ChessEvent) => void) {
		this.listeners.add(fn);
		return () => this.listeners.delete(fn);
	}

	private emit(event: ChessEvent) {
		for (const fn of this.listeners) fn(event);
	}

	nameOf(side: Side) {
		if (this.mode === 'hotseat') return side === 'w' ? 'White' : 'Black';
		return side === this.human ? 'You' : this.opponent.name;
	}

	// ── Lifecycle ────────────────────────────────────────────────────────

	start(mode: Mode, opponent: OpponentId, side: Side, time: TimeControl) {
		this.mode = mode;
		this.opponentId = opponent;
		this.human = side;
		this.time = time;
		writeSaved(null);
		this.setup([], null);
		this.screen = 'play';
		this.emit({ type: 'load' });
		playStart();
		this.save();
		this.afterTurn();
	}

	resume() {
		const saved = peekSaved();
		if (!saved) return false;
		this.mode = saved.mode;
		this.opponentId = saved.opponent;
		this.human = saved.human;
		this.time = saved.time;
		this.setup(saved.moves, saved.clocks);
		this.screen = 'play';
		this.emit({ type: 'load' });
		playStart();
		this.afterTurn();
		return true;
	}

	rematch() {
		if (this.screen !== 'play') return;
		const side = this.mode === 'ai' ? other(this.human) : 'w';
		this.start(this.mode, this.opponentId, side, this.time);
	}

	backToMenu() {
		this.token += 1;
		this.stopClock();
		this.aiThinking = false;
		this.promotion = null;
		if (this.screen === 'play' && !this.outcome) this.save();
		this.review = null;
		this.viewPly = null;
		this.screen = 'menu';
	}

	private setup(moves: string[], clocks: { w: number; b: number } | null) {
		this.token += 1;
		this.stopClock();
		this.pos = new Position(START_FEN);
		this.snapshots = [this.pos.board.slice()];
		this.repKeys = [this.pos.repetitionKey()];
		const recs: MoveRecord[] = [];
		for (const uci of moves) {
			const m = this.pos.moveFromUci(uci);
			if (!m) break;
			recs.push(this.makeRecord(m, null));
		}
		this.records = recs;
		const base = TIME_INFO[this.time].base;
		this.clocks = clocks ? { ...clocks } : { w: base, b: base };
		this.board = this.pos.board.slice();
		this.turn = sideOf(this.pos.side);
		this.outcome = null;
		this.selected = -1;
		this.targets = [];
		this.promotion = null;
		this.aiThinking = false;
		this.offer = null;
		this.note = null;
		this.review = null;
		this.viewPly = null;
		this.flipped = false;
		this.evalScore = null;
		this.lastBotScore = 0;
		this.showCursor = false;
		this.cursor = this.human === 'b' && this.mode === 'ai' ? 0x64 : 0x14;
		this.refreshOpening();
		this.claim = claimable(this.pos, this.repetitions());
	}

	/** Plays `m` on the live position and returns its record. */
	private makeRecord(m: number, clock: number | null): MoveRecord {
		const pos = this.pos;
		const from = m & 127;
		const to = (m >> 7) & 127;
		const flags = m >>> 17;
		const book = bookMoves(pos).some((e) => e.uci === uciOf(m));
		const san = pos.san(m);
		const piece = pos.board[from];
		const capturedAt = flags & FLAG_EP ? to - 16 * pos.side : to;
		const captured = flags & FLAG_CAPTURE ? pos.board[capturedAt] : 0;
		const side = sideOf(pos.side);
		pos.make(m);
		this.snapshots.push(pos.board.slice());
		this.repKeys.push(pos.repetitionKey());
		return {
			uci: uciOf(m),
			san,
			from,
			to,
			piece,
			captured,
			capturedAt,
			promo: flags & FLAG_PROMO ? (m >> 14) & 7 : 0,
			castle: !!(flags & FLAG_CASTLE),
			check: pos.inCheck(),
			side,
			book,
			clock
		};
	}

	private repetitions() {
		const key = this.repKeys[this.repKeys.length - 1];
		return this.repKeys.filter((k) => k === key).length;
	}

	private refreshOpening() {
		const probe = new Position(START_FEN);
		let name: string | null = null;
		for (const r of this.records) {
			const m = probe.moveFromUci(r.uci);
			if (!m) break;
			probe.make(m);
			name = openingName(probe) ?? name;
		}
		this.opening = name;
	}

	// ── Input ────────────────────────────────────────────────────────────

	private legalFrom(sq: number) {
		return this.pos.legalMoves().filter((m) => (m & 127) === sq);
	}

	/** Tap or click on a square: pick up, retarget, or play. */
	tap(sq: number) {
		if (!this.canInput) {
			if (!this.live && this.screen === 'play' && !this.review) this.viewPly = null;
			return;
		}
		if (this.selected >= 0 && this.targets.includes(sq)) {
			this.tryMove(this.selected, sq);
			return;
		}
		const piece = this.board[sq];
		if (piece && sideOf(piece > 0 ? 1 : -1) === this.turn) {
			if (this.selected === sq) {
				this.deselect();
				return;
			}
			this.selected = sq;
			this.targets = this.legalFrom(sq).map((m) => (m >> 7) & 127);
			playSelect();
			return;
		}
		if (this.selected >= 0) playNudge();
		this.deselect();
	}

	/** Start of a drag: select without the click sound if already selected. */
	grab(sq: number) {
		if (!this.canInput) return false;
		const piece = this.board[sq];
		if (!piece || sideOf(piece > 0 ? 1 : -1) !== this.turn) return false;
		if (this.selected !== sq) {
			this.selected = sq;
			this.targets = this.legalFrom(sq).map((m) => (m >> 7) & 127);
		}
		return true;
	}

	drop(from: number, to: number) {
		if (!this.canInput || from === to) return false;
		if (!this.legalFrom(from).some((m) => ((m >> 7) & 127) === to)) {
			playNudge();
			return false;
		}
		this.tryMove(from, to);
		return true;
	}

	deselect() {
		this.selected = -1;
		this.targets = [];
	}

	tryMove(from: number, to: number) {
		const options = this.legalFrom(from).filter((m) => ((m >> 7) & 127) === to);
		if (!options.length) {
			playNudge();
			return;
		}
		if (options.length > 1) {
			this.promotion = { from, to };
			return;
		}
		this.play(options[0]);
	}

	choosePromotion(type: number) {
		const p = this.promotion;
		if (!p) return;
		this.promotion = null;
		const m = this.legalFrom(p.from).find((x) => ((x >> 7) & 127) === p.to && ((x >> 14) & 7) === type);
		if (m) this.play(m);
	}

	cancelPromotion() {
		this.promotion = null;
		this.deselect();
	}

	moveCursor(dr: number, dc: number) {
		if (this.screen !== 'play') return;
		if (!this.showCursor) {
			this.showCursor = true;
			return;
		}
		const sign = this.bottom === 'w' ? 1 : -1;
		const file = Math.max(0, Math.min(7, (this.cursor & 7) + dc * sign));
		const rank = Math.max(0, Math.min(7, (this.cursor >> 4) - dr * sign));
		this.cursor = rank * 16 + file;
	}

	pressCursor() {
		if (!this.showCursor) {
			this.showCursor = true;
			return;
		}
		this.tap(this.cursor);
	}

	// ── Playing moves ────────────────────────────────────────────────────

	private play(m: number) {
		if (this.outcome) return;
		this.tickClock();
		const mover = this.turn;
		const inc = TIME_INFO[this.time].inc;
		if (this.timed) this.clocks[mover] += inc;
		const record = this.makeRecord(m, this.timed ? this.clocks[mover] : null);
		this.records = [...this.records, record];
		this.board = this.pos.board.slice();
		this.turn = sideOf(this.pos.side);
		this.deselect();
		this.viewPly = null;
		if (this.offer && this.offer !== mover) {
			this.offer = null;
			this.say(this.mode === 'ai' ? 'Draw offer declined by playing on.' : 'Offer declined.');
		}
		this.refreshOpening();
		const reduced = prefersReduced();
		this.emit({ type: 'move', record, reduced });
		if (record.promo) playPromote();
		else if (record.castle) playCastle();
		else if (record.captured) playCapture(((record.to & 7) - 3.5) / 3.5);
		else playMove(((record.to & 7) - 3.5) / 3.5);
		if (record.check) {
			this.flash += 1;
			window.setTimeout(playCheck, 120);
		}
		const out = automaticOutcome(this.pos, this.repetitions());
		if (out) {
			this.finish(out);
			return;
		}
		this.claim = claimable(this.pos, this.repetitions());
		this.save();
		this.afterTurn();
	}

	private afterTurn() {
		if (this.outcome || this.screen !== 'play') return;
		this.startClock();
		this.requestEval();
		if (this.aiTurn) void this.runAi();
	}

	private async runAi() {
		const token = this.token;
		this.aiThinking = true;
		const started = performance.now();
		const botSide = this.turn;
		const botColor = colorOf(botSide);
		const opponent = this.opponent;
		const claimNow = claimable(this.pos, this.repetitions());
		if (claimNow && this.lastBotScore * botColor <= -opponent.style.contempt) {
			await wait(700);
			if (token !== this.token) return;
			this.aiThinking = false;
			this.say(`${opponent.name} claims the draw.`);
			this.finish({ winner: 0, reason: claimNow });
			return;
		}
		const result = await askOpponent({
			kind: 'move',
			fen: START_FEN,
			moves: this.records.map((r) => r.uci),
			opponent: opponent.id,
			clock: this.timed ? { left: this.clocks[botSide], inc: TIME_INFO[this.time].inc } : undefined,
			seed: (Math.random() * 2 ** 31) | 0
		});
		if (token !== this.token || this.screen !== 'play' || this.outcome) return;
		if (!result.book) this.lastBotScore = result.score;
		const [lo, hi] = opponent.strength.think;
		let pause = result.book ? 350 + Math.random() * 600 : lo + Math.random() * (hi - lo);
		if (this.timed) pause *= Math.min(1, this.clocks[botSide] / 120_000);
		const remaining = pause - (performance.now() - started);
		if (remaining > 0) await wait(remaining);
		if (token !== this.token || this.screen !== 'play' || this.outcome) return;
		this.aiThinking = false;
		if (result.resign) {
			this.say(`${opponent.name} tips over the king.`);
			this.finish({ winner: colorOf(this.human), reason: 'resign' });
			return;
		}
		const m = result.move ? this.pos.moveFromUci(result.move) : 0;
		if (!m) return;
		this.play(m);
	}

	// ── Clocks ───────────────────────────────────────────────────────────

	private startClock() {
		this.stopClock();
		if (!this.timed || this.outcome || this.records.length < 2) return;
		this.lastTick = performance.now();
		this.clockTimer = window.setInterval(() => this.tickClock(), 100);
	}

	private stopClock() {
		if (this.clockTimer !== null) window.clearInterval(this.clockTimer);
		this.clockTimer = null;
	}

	private tickClock() {
		if (this.clockTimer === null || !this.timed || this.outcome) return;
		const now = performance.now();
		const side = this.turn;
		const before = this.clocks[side];
		const left = Math.max(0, before - (now - this.lastTick));
		this.lastTick = now;
		this.clocks[side] = left;
		const watched = this.mode === 'hotseat' || side === this.human;
		if (watched && left < 10_000 && Math.ceil(left / 1000) !== Math.ceil(before / 1000)) playTick(left < 5000);
		if (left <= 0) this.flagFall(side);
	}

	private flagFall(side: Side) {
		this.stopClock();
		playFlag();
		const winner = colorOf(other(side));
		if (this.pos.canMate(winner)) this.finish({ winner, reason: 'timeout' });
		else this.finish({ winner: 0, reason: 'timeout-draw' });
	}

	// ── Draws and resignation ────────────────────────────────────────────

	claimDraw() {
		if (!this.canInput || !this.claim) return;
		this.finish({ winner: 0, reason: this.claim });
	}

	offerDraw() {
		if (this.screen !== 'play' || this.outcome || this.offer) return;
		const by = this.mode === 'ai' ? this.human : this.turn;
		this.offer = by;
		playOffer();
		if (this.mode === 'hotseat') {
			this.say(`${this.nameOf(by)} offers a draw.`);
			return;
		}
		const token = this.token;
		const opponent = this.opponent;
		this.say(`You offer ${opponent.name} a draw…`);
		window.setTimeout(() => {
			if (token !== this.token || this.outcome || this.offer !== by) return;
			const botView = this.lastBotScore * colorOf(other(this.human));
			const late = this.records.length >= 60;
			const accept = botView + opponent.style.contempt < -90 || (late && Math.abs(botView) < 25 && opponent.style.contempt <= 0);
			if (accept) {
				this.say(`${opponent.name} accepts.`);
				this.finish({ winner: 0, reason: 'agreement' });
			} else {
				this.offer = null;
				this.say(`${opponent.name} declines and plays on.`);
			}
		}, 1100);
	}

	/** Hotseat only: the side the offer was made to answers it. */
	answerOffer(accept: boolean) {
		if (!this.offer || this.mode !== 'hotseat' || this.outcome) return;
		if (accept) this.finish({ winner: 0, reason: 'agreement' });
		else {
			this.offer = null;
			this.say('Offer declined.');
		}
	}

	resign() {
		if (this.screen !== 'play' || this.outcome) return;
		const loser = this.mode === 'ai' ? this.human : this.turn;
		this.finish({ winner: colorOf(other(loser)), reason: 'resign' });
	}

	private say(text: string) {
		this.note = text;
		if (this.noteTimer !== null) window.clearTimeout(this.noteTimer);
		this.noteTimer = window.setTimeout(() => {
			if (this.note === text) this.note = null;
		}, 3600);
	}

	// ── Ending ───────────────────────────────────────────────────────────

	private finish(outcome: Outcome) {
		this.tickClock();
		this.stopClock();
		this.token += 1;
		this.aiThinking = false;
		this.promotion = null;
		this.offer = null;
		this.outcome = outcome;
		this.deselect();
		writeSaved(null);
		if (this.mode === 'ai') {
			const rec = chessView.records[this.opponentId];
			if (outcome.winner === 0) rec.d += 1;
			else if (outcome.winner === colorOf(this.human)) rec.w += 1;
			else rec.l += 1;
		} else {
			if (outcome.winner === 1) chessView.hotseat.w += 1;
			else if (outcome.winner === -1) chessView.hotseat.b += 1;
			else chessView.hotseat.d += 1;
		}
		persistChessView();
		if (outcome.reason === 'checkmate') this.flash += 1;
		if (outcome.winner === 1) this.evalScore = MATE;
		else if (outcome.winner === -1) this.evalScore = -MATE;
		else this.evalScore = 0;
		this.emit({ type: 'end', outcome, reduced: prefersReduced() });
		if (outcome.winner === 0) playDraw();
		else if (this.mode === 'hotseat' || outcome.winner === colorOf(this.human)) playWin();
		else playLose();
	}

	/** From the human's seat: won, lost or drawn (hotseat counts as a win for the victor). */
	verdict = $derived.by<'won' | 'lost' | 'draw' | null>(() => {
		const o = this.outcome;
		if (!o) return null;
		if (o.winner === 0) return 'draw';
		if (this.mode === 'hotseat') return 'won';
		return o.winner === colorOf(this.human) ? 'won' : 'lost';
	});

	private save() {
		if (this.screen !== 'play' || this.outcome || !this.records.length) {
			if (!this.records.length && !this.outcome) writeSaved(null);
			return;
		}
		writeSaved({
			mode: this.mode,
			opponent: this.opponentId,
			human: this.human,
			time: this.time,
			moves: this.records.map((r) => r.uci),
			clocks: this.timed ? { ...this.clocks } : null
		});
	}

	// ── Board view ───────────────────────────────────────────────────────

	flip() {
		this.flipped = !this.flipped;
		playSelect();
	}

	/** Look back at an earlier position during play; `null` returns to the live board. */
	viewAt(ply: number | null) {
		if (this.review) {
			if (ply !== null) this.reviewGoto(ply);
			return;
		}
		if (ply === null || ply >= this.records.length) this.viewPly = null;
		else this.viewPly = Math.max(0, ply);
		this.deselect();
		this.emit({ type: 'load' });
	}

	step(delta: number) {
		if (this.review) {
			this.reviewGoto(this.review.index + delta);
			return;
		}
		const at = (this.viewPly ?? this.records.length) + delta;
		if (delta === 1 && this.viewPly !== null && at <= this.records.length) {
			const rec = this.records[at - 1];
			this.viewPly = at >= this.records.length ? null : at;
			this.emit({ type: 'move', record: rec, reduced: prefersReduced() });
			playMove();
			return;
		}
		this.viewAt(Math.max(0, Math.min(this.records.length, at)));
	}

	// ── Analysis ─────────────────────────────────────────────────────────

	requestEval() {
		if (!chessView.evalBar || this.screen !== 'play' || this.outcome) return;
		const id = ++this.evalToken;
		const moves = this.records.map((r) => r.uci);
		void askAnalyst({ kind: 'analyse', fen: START_FEN, moves, timeMs: 450 }).then((r) => {
			if (id === this.evalToken && !this.outcome) this.evalScore = r.score;
		});
	}

	async startReview() {
		if (!this.outcome || this.review) return;
		const n = this.records.length;
		this.review = {
			index: n,
			scores: Array(n + 1).fill(null),
			best: Array(n + 1).fill(null),
			marks: Array(n).fill(null),
			done: 0,
			total: n + 1
		};
		this.viewPly = null;
		this.emit({ type: 'load' });
		const token = this.token;
		const per = Math.max(120, Math.min(320, 26_000 / (n + 1)));
		const moves = this.records.map((r) => r.uci);
		for (let i = 0; i <= n; i += 1) {
			const r = await askAnalyst({ kind: 'analyse', fen: START_FEN, moves: moves.slice(0, i), timeMs: per });
			if (token !== this.token || !this.review) return;
			const review = this.review;
			review.scores[i] = r.score;
			review.best[i] = r.best;
			review.done += 1;
			if (i > 0) review.marks[i - 1] = this.grade(i - 1);
		}
	}

	private grade(k: number): Mark | null {
		const review = this.review;
		if (!review) return null;
		const before = review.scores[k];
		const after = review.scores[k + 1];
		if (before === null || after === null) return null;
		const rec = this.records[k];
		if (rec.book) return 'book';
		if (rec.uci === review.best[k]) return 'best';
		const sign = rec.side === 'w' ? 1 : -1;
		const loss = winChance(before * sign) - winChance(after * sign);
		if (loss >= 0.2) return 'blunder';
		if (loss >= 0.1) return 'mistake';
		if (loss >= 0.05) return 'inaccuracy';
		return 'good';
	}

	reviewGoto(index: number) {
		const review = this.review;
		if (!review) return;
		const next = Math.max(0, Math.min(this.records.length, index));
		if (next === review.index) return;
		if (next === review.index + 1) {
			this.review = { ...review, index: next };
			this.emit({ type: 'move', record: this.records[next - 1], reduced: prefersReduced() });
			playMove();
			return;
		}
		this.review = { ...review, index: next };
		this.emit({ type: 'load' });
	}

	exitReview() {
		this.review = null;
		this.emit({ type: 'load' });
	}

	/** Tally of review grades per side. */
	reviewSummary = $derived.by(() => {
		const r = this.review;
		const blank = () => ({ inaccuracy: 0, mistake: 0, blunder: 0, best: 0, book: 0, good: 0 });
		const out = { w: blank(), b: blank() };
		if (!r) return out;
		r.marks.forEach((mark, i) => {
			if (mark) out[this.records[i].side][mark] += 1;
		});
		return out;
	});

	// ── Export ───────────────────────────────────────────────────────────

	pgn() {
		const date = new Date();
		const pad = (n: number) => String(n).padStart(2, '0');
		const result = !this.outcome ? '*' : this.outcome.winner === 1 ? '1-0' : this.outcome.winner === -1 ? '0-1' : '1/2-1/2';
		const opp = this.opponent;
		const white = this.mode === 'hotseat' ? 'White' : this.human === 'w' ? 'You' : `${opp.name} ${opp.title}`;
		const black = this.mode === 'hotseat' ? 'Black' : this.human === 'b' ? 'You' : `${opp.name} ${opp.title}`;
		const info = TIME_INFO[this.time];
		const tags: Array<[string, string]> = [
			['Event', this.mode === 'hotseat' ? 'Grand Hall, hotseat' : 'Grand Hall'],
			['Site', 'The Grand Hall'],
			['Date', `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`],
			['Round', '-'],
			['White', white],
			['Black', black],
			['Result', result]
		];
		if (this.mode === 'ai') tags.push([this.human === 'w' ? 'BlackElo' : 'WhiteElo', String(opp.rating)]);
		tags.push(['TimeControl', this.time === 'none' ? '-' : `${info.base / 1000}+${info.inc / 1000}`]);
		if (this.opening) tags.push(['Opening', this.opening]);
		if (this.outcome) tags.push(['Termination', REASON_TEXT[this.outcome.reason]]);
		const tokens: string[] = [];
		this.records.forEach((r, i) => {
			if (i % 2 === 0) tokens.push(`${i / 2 + 1}.`);
			tokens.push(r.san);
		});
		tokens.push(result);
		const lines: string[] = [];
		let line = '';
		for (const t of tokens) {
			if (line && line.length + 1 + t.length > 80) {
				lines.push(line);
				line = t;
			} else line = line ? `${line} ${t}` : t;
		}
		if (line) lines.push(line);
		return `${tags.map(([k, v]) => `[${k} "${v.replace(/"/g, "'")}"]`).join('\n')}\n\n${lines.join('\n')}\n`;
	}

	squareLabel(sq: number) {
		return squareName(sq);
	}

	pieceAt(sq: number) {
		return this.shownBoard[sq];
	}

	isPawn(sq: number) {
		return Math.abs(this.board[sq]) === PAWN;
	}

	dispose() {
		this.token += 1;
		this.stopClock();
	}
}

function prefersReduced() {
	return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function wait(ms: number) {
	return new Promise((resolve) => window.setTimeout(resolve, ms));
}
