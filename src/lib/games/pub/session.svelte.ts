import { SPADES, SUIT_NAME, label, newSeed, seededRandom, type Card } from '../kit/cards/deck';
import { adviseAsync, chooseActionAsync } from './aiClient';
import type { PubAction, PubState } from './ai';
import { playCard, playCheer, playDeal, playHush, playKnock, playLose, playPass, playPeg, playSelect, playTurn, playWin } from './audio';
import { followed, review, type Advice } from './coach';
import { LESSONS, type Concept } from './lessons';
import { actorOf, applyAction, autoPhase, isOver, startGame, winnersOf } from './rules';
import { legalPegs, showOf, total } from './rules/cribbage';
import { legalEuchre } from './rules/euchre';
import { canKnockWith } from './rules/gin';
import { QUEEN_OF_SPADES, legalHearts, pointsOf } from './rules/hearts';
import { legalSpades } from './rules/spades';
import { persistPubView, persistRecord, pubRecords, pubView } from './settings.svelte';
import { SOLO, VARIANT_INFO, humanSeats, seatName, type Difficulty, type Mode, type Variant } from './types';
import { viewOf } from './views';
import type { ViewCtx } from './views/types';

export type Stage = 'gather' | 'deal' | 'live';
export type Bubble = { seat: number; text: string; id: number; tone?: 'score' | 'call' | 'plain' };

const PACE = {
	brisk: { think: [380, 700], trick: 750 },
	easy: { think: [650, 1250], trick: 1100 },
	slow: { think: [1000, 1900], trick: 1500 }
} as const;

export class PubSession {
	screen = $state<'menu' | 'play'>('menu');
	variant = $state<Variant>('cribbage');
	mode = $state<Mode>('ai');
	difficulty = $state<Difficulty>('medium');
	humans = $state<boolean[]>([true, false]);
	state = $state.raw<PubState | null>(null);
	viewer = $state(0);
	stage = $state<Stage>('live');
	curtain = $state<{ for: number } | null>(null);
	selected = $state<Card[]>([]);
	thinking = $state<number | null>(null);
	bubbles = $state<Bubble[]>([]);
	/** Bumps on big moments: a 29, a moon, gin, a march or a euchre. */
	cheer = $state(0);
	/** Bumps when someone goes alone or a loner is defended. */
	hush = $state(0);
	/** Bumps whenever points go on the board. */
	stir = $state(0);
	/** The final result card is tucked away to look at the table. */
	resultHidden = $state(false);
	/** Gin: the next card tapped is thrown face down to knock. */
	knocking = $state(false);
	/** Rosie's suggestion for the move in front of the viewer. */
	advice = $state.raw<Advice | null>(null);
	/** Rosie's comment on the viewer's last move. */
	note = $state<string | null>(null);
	/** A guided lesson: concept cards pause play, and only Rosie's move is allowed until the wrap. */
	lesson = $state<{ variant: Variant; seen: string[]; card: string | null; wrap: boolean; finished: boolean } | null>(null);

	#token = 0;
	#timer: ReturnType<typeof setTimeout> | null = null;
	#bubbleId = 0;
	#random = seededRandom(newSeed());
	#lastHand = -1;
	#asked: PubState | null = null;

	get players() {
		return VARIANT_INFO[this.variant].players;
	}

	get names() {
		return Array.from({ length: this.players }, (_, i) => seatName(this.variant, i, this.humans));
	}

	get actor(): number | null {
		return this.state ? actorOf(this.state) : null;
	}

	get over() {
		return !!this.state && isOver(this.state);
	}

	/** It's a person's move, they're the one looking, and nothing is animating. */
	get myTurn() {
		const a = this.actor;
		return a !== null && a === this.viewer && this.humans[a] && !this.curtain && this.stage === 'live' && !this.over && !this.teaching;
	}

	get coaching() {
		return !!this.lesson || pubView.coach;
	}

	/** Moves are limited to Rosie's suggestion. */
	get guided() {
		return !!this.lesson && !this.lesson.finished;
	}

	/** A lesson card or the wrap-up is open over the table. */
	get teaching() {
		return !!this.lesson && (this.lesson.card !== null || this.lesson.wrap);
	}

	get concept(): Concept | null {
		const l = this.lesson;
		return l?.card ? (LESSONS[l.variant].concepts.find((c) => c.id === l.card) ?? null) : null;
	}

	get winners() {
		return this.state ? winnersOf(this.state) : [];
	}

	/** Seat names and visibility, for the view modules. */
	get viewCtx(): ViewCtx {
		const lone = this.humans.filter(Boolean).length === 1;
		return {
			viewer: this.viewer,
			names: this.names,
			humans: this.humans,
			mode: this.mode,
			difficulty: this.difficulty,
			place: (seat) => this.place(seat),
			mine: (seat) => !this.curtain && (lone ? this.humans[seat] : seat === this.viewer)
		};
	}

	/** Did the person at the bottom win (team games count partners)? */
	get won() {
		return this.winners.includes(this.viewer) || (this.mode === 'ai' && this.winners.includes(0));
	}

	/** Table position of a seat: 0 bottom, then clockwise (1 left, 2 top, 3 right). Two-player games use bottom and top. */
	place(seat: number) {
		if (this.players === 2) return seat === this.viewer ? 0 : 2;
		return (seat - this.viewer + 4) % 4;
	}

	/** Cards the viewer may tap right now. */
	get playable(): Card[] {
		const cards = this.#legal();
		if (!this.guided) return cards;
		const a = this.advice;
		if (!a || (a.button === 'knock' && !this.knocking)) return [];
		return cards.filter((c) => a.cards.includes(c));
	}

	#legal(): Card[] {
		const s = this.state;
		if (!s || !this.myTurn) return [];
		const me = this.viewer;
		switch (s.kind) {
			case 'cribbage':
				if (s.phase === 'discard') return s.hands[me];
				if (s.phase === 'peg') return legalPegs(s);
				return [];
			case 'hearts':
				if (s.phase === 'pass') return s.hands[me];
				if (s.phase === 'play') return legalHearts(s, me);
				return [];
			case 'gin':
				if (s.phase === 'discard') return s.hands[me].filter((c) => c !== s.tookUp);
				return [];
			case 'euchre':
				if (s.phase === 'discard') return s.hands[me];
				if (s.phase === 'play') return legalEuchre(s, me);
				return [];
			case 'spades':
				return s.phase === 'play' ? legalSpades(s, me) : [];
			default:
				return viewOf(s)!.legal(s, me);
		}
	}

	/** How many cards the viewer must choose before confirming (0 = a tap plays at once). */
	get choose(): number {
		const s = this.state;
		if (!s || !this.myTurn) return 0;
		if (s.kind === 'cribbage' && s.phase === 'discard') return 2;
		if (s.kind === 'hearts' && s.phase === 'pass') return 3;
		return 0;
	}

	open(variant: Variant) {
		this.variant = variant;
		pubView.variant = variant;
		persistPubView();
	}

	start() {
		this.#stop();
		this.lesson = null;
		const variant = pubView.variant;
		this.variant = variant;
		this.mode = SOLO.includes(variant) ? 'ai' : pubView.mode;
		this.difficulty = pubView.difficulty;
		this.humans = humanSeats(variant, this.mode, pubView.heartsPlayers, pubView.euchreSeats);
		this.#random = seededRandom(newSeed());
		const state = startGame(variant, { euchreTarget: pubView.euchreTarget, stick: pubView.stick, difficulty: this.difficulty }, this.#random);
		this.#enter(state);
	}

	resume(): boolean {
		const saved = pubRecords[pubView.variant].saved;
		if (!saved) return false;
		this.#stop();
		this.lesson = null;
		this.variant = pubView.variant;
		this.mode = saved.mode;
		this.difficulty = saved.difficulty;
		this.humans = saved.humans.slice();
		this.#random = seededRandom(newSeed());
		this.#enter($state.snapshot(saved.state) as PubState);
		return true;
	}

	/** One guided hand with Rosie on a fixed deal. Lesson games never touch records or the saved table. */
	startLesson(variant: Variant) {
		this.#stop();
		this.open(variant);
		this.mode = 'ai';
		this.difficulty = LESSONS[variant].difficulty ?? 'medium';
		this.humans = humanSeats(variant, 'ai', 4, 'partners');
		this.#random = seededRandom(LESSONS[variant].seed);
		const state = startGame(variant, { euchreTarget: 10, stick: true, difficulty: this.difficulty }, this.#random);
		this.lesson = { variant, seen: [], card: null, wrap: false, finished: false };
		this.#enter(state);
	}

	/** Close the open lesson card and carry on. */
	understood() {
		const l = this.lesson;
		if (!l?.card) return;
		l.seen = [...l.seen, l.card];
		l.card = null;
		playSelect();
		this.#settle();
	}

	/** After the guided hand: keep playing with Rosie watching, or leave. */
	endLesson(keepPlaying: boolean) {
		const l = this.lesson;
		if (!l) return;
		if (!keepPlaying) {
			this.backToMenu();
			return;
		}
		l.wrap = false;
		l.finished = true;
		this.#settle();
	}

	toggleCoach() {
		pubView.coach = !pubView.coach;
		persistPubView();
		if (!this.coaching) {
			this.advice = null;
			this.note = null;
		} else if (this.myTurn && this.state) this.#advise(this.state);
	}

	#enter(state: PubState) {
		this.screen = 'play';
		this.state = state;
		this.viewer = this.humans.indexOf(true);
		this.curtain = null;
		this.selected = [];
		this.bubbles = [];
		this.advice = null;
		this.note = null;
		this.resultHidden = false;
		this.#lastHand = -1;
		this.#settle();
	}

	rematch() {
		this.start();
	}

	backToMenu() {
		this.#stop();
		this.lesson = null;
		this.advice = null;
		this.note = null;
		this.screen = 'menu';
		this.curtain = null;
		this.thinking = null;
	}

	dispose() {
		this.#stop();
	}

	liftCurtain() {
		if (!this.curtain) return;
		this.viewer = this.curtain.for;
		this.curtain = null;
		playTurn();
		if (this.myTurn) this.#advise(this.state!);
	}

	/** A tap on a card in the viewer's hand. */
	pick(card: Card) {
		if (!this.playable.includes(card)) return;
		const need = this.choose;
		if (need) {
			playSelect();
			this.selected = this.selected.includes(card) ? this.selected.filter((c) => c !== card) : [...this.selected, card].slice(-need);
			return;
		}
		const s = this.state!;
		const view = viewOf(s);
		if (view) {
			const result = view.tap(s, card, this.viewer, this.selected);
			if (result === 'select') {
				playSelect();
				const max = view.selectMax?.(s) ?? 1;
				this.selected = this.selected.includes(card) ? this.selected.filter((c) => c !== card) : [...this.selected, card].slice(-max);
			} else if (result) this.act(result);
			return;
		}
		if (s.kind === 'gin') {
			if (this.knocking) {
				this.knocking = false;
				this.knock(card);
			} else this.act({ type: 'discard', card });
			return;
		}
		if (s.kind === 'euchre' && s.phase === 'discard') {
			this.act({ type: 'discard', card });
			return;
		}
		this.act({ type: 'play', card });
	}

	/** Confirm a two-card crib throw or a three-card pass. */
	confirm() {
		const s = this.state;
		if (!s || this.selected.length !== this.choose) return;
		if (s.kind === 'cribbage') this.act({ type: 'discard', seat: this.viewer, cards: this.selected });
		else if (s.kind === 'hearts') this.act({ type: 'pass', seat: this.viewer, cards: this.selected });
	}

	knock(card: Card) {
		const s = this.state;
		if (s?.kind !== 'gin' || !canKnockWith(s, card)) return;
		this.act({ type: 'knock', card });
	}

	/** Continue past a show, a hand summary or the end of the game. */
	next() {
		const s = this.state;
		if (!s || this.actor !== null || this.stage !== 'live' || this.over || this.teaching) return;
		if (autoPhase(s)) return;
		this.#commit(applyAction(s, { type: 'next' }, this.#random), { type: 'next' }, -1);
	}

	act(action: PubAction) {
		const s = this.state;
		if (!s || !this.myTurn) return;
		const advice = this.advice;
		if (this.guided && (!advice || !followed(action, advice))) return;
		const next = applyAction(s, action, this.#random);
		if (next === s) return;
		if (this.coaching && advice) this.note = followed(action, advice) ? null : review(s, this.viewer, action, advice, this.names);
		this.#commit(next, action, this.viewer);
	}

	/** A tap on a place on the felt: the stock, the discard pile, the deck, a column. */
	spot(action: string) {
		const s = this.state;
		if (!s || !this.myTurn) return;
		const view = viewOf(s);
		if (view) {
			const result = view.spot?.(s, action, this.viewer, this.selected);
			if (result) this.act(result);
			return;
		}
		if (action === 'cut' && s.kind === 'cribbage') this.act({ type: 'cut' });
		if (s.kind === 'gin') {
			if (action === 'take') this.act({ type: 'take' });
			if (action === 'draw') this.act({ type: 'draw' });
		}
	}

	#commit(next: PubState, action: PubAction, seat: number) {
		const prev = this.state!;
		this.selected = [];
		this.knocking = false;
		this.advice = null;
		this.#react(prev, next, action, seat);
		this.state = next;
		this.#save();
		this.#settle();
	}

	#stop() {
		this.#token++;
		if (this.#timer) clearTimeout(this.#timer);
		this.#timer = null;
		this.thinking = null;
	}

	#later(ms: number, run: () => void) {
		if (this.#timer) clearTimeout(this.#timer);
		const token = this.#token;
		this.#timer = setTimeout(() => {
			this.#timer = null;
			if (token === this.#token) run();
		}, ms);
	}

	#handNo(s: PubState) {
		return s.handNo;
	}

	/** Decide what happens next: deal animation, auto pause, curtain, or a regular's move. */
	#settle() {
		this.#stop();
		const s = this.state;
		if (!s) return;
		if (this.#handNo(s) !== this.#lastHand && !isOver(s)) {
			this.#lastHand = this.#handNo(s);
			this.stage = 'gather';
			this.#later(380, () => {
				this.stage = 'deal';
				playDeal(this.players === 4 ? 20 : 12);
				this.#later(this.players === 4 ? 1500 : 1100, () => {
					this.stage = 'live';
					this.#settle();
				});
			});
			return;
		}
		if (this.lesson && this.#teach(s)) return;
		if (isOver(s)) {
			this.#finish();
			return;
		}
		const actor = actorOf(s);
		if (actor === null) {
			if (autoPhase(s)) {
				this.#later(PACE[pubView.pace].trick, () => {
					if (this.state === s) this.#commit(applyAction(s, { type: 'next' }, this.#random), { type: 'next' }, -1);
				});
			}
			return;
		}
		if (this.humans[actor]) {
			if (actor !== this.viewer) {
				if (this.humans.filter(Boolean).length > 1) this.curtain = { for: actor };
				else this.viewer = actor;
			} else playTurn();
			if (this.myTurn) this.#advise(s);
			return;
		}
		this.thinking = actor;
		const token = this.#token;
		const [lo, hi] = PACE[pubView.pace].think;
		const started = performance.now();
		const wait = lo + this.#random() * (hi - lo);
		chooseActionAsync({ state: s, seat: actor, difficulty: this.difficulty, seed: Math.floor(this.#random() * 1e9) }).then((action) => {
			if (token !== this.#token || this.state !== s) return;
			this.#later(Math.max(0, wait - (performance.now() - started)), () => {
				this.thinking = null;
				const next = applyAction(s, action, this.#random);
				if (next === s) return;
				this.#commit(next, action, actor);
			});
		});
	}

	/** Show the next lesson card that applies, or the wrap-up once the guided hand is over. */
	#teach(s: PubState): boolean {
		const l = this.lesson!;
		if (l.card || l.wrap) return true;
		if (l.finished) return false;
		const lesson = LESSONS[l.variant];
		const ctx = { s, viewer: this.viewer, names: this.names };
		const next = lesson.concepts.find((c) => !l.seen.includes(c.id) && c.when(ctx));
		if (next) {
			l.card = next.id;
			return true;
		}
		if (lesson.done(s)) {
			l.wrap = true;
			return true;
		}
		return false;
	}

	/** Ask Rosie about the current move if nobody has yet (the coach was just switched on). */
	ensureAdvice() {
		if (this.coaching && this.myTurn && this.state && this.#asked !== this.state) this.#advise(this.state);
	}

	#advise(s: PubState) {
		this.advice = null;
		this.#asked = s;
		if (!this.coaching) return;
		const token = this.#token;
		const request = { state: s, seat: this.viewer, names: this.names, seed: Math.floor(this.#random() * 1e9) };
		adviseAsync(request).then((advice) => {
			if (token === this.#token && this.state === s) this.advice = advice;
		});
	}

	#finish() {
		const s = this.state!;
		if (this.lesson) {
			if (this.won) playWin();
			else playLose();
			return;
		}
		const record = pubRecords[this.variant];
		record.saved = null;
		if (this.mode === 'ai') {
			const row = record.ai[this.difficulty];
			if (winnersOf(s).includes(0)) row.w++;
			else row.l++;
		} else record.local++;
		persistRecord(this.variant);
		if (this.won || this.mode === 'local') playWin();
		else playLose();
	}

	#save() {
		const s = this.state;
		if (!s || this.lesson) return;
		pubRecords[this.variant].saved = isOver(s) ? null : { mode: this.mode, difficulty: this.difficulty, humans: this.humans.slice(), state: s };
		persistRecord(this.variant);
	}

	say(seat: number, text: string, tone: Bubble['tone'] = 'plain') {
		const id = ++this.#bubbleId;
		this.bubbles = [...this.bubbles.filter((b) => b.seat !== seat), { seat, text, id, tone }];
		setTimeout(() => {
			this.bubbles = this.bubbles.filter((b) => b.id !== id);
		}, 2200);
	}

	/** Speech, sound and backdrop cues for one step of play. */
	#react(prev: PubState, next: PubState, action: PubAction, seat: number) {
		const pan = (s: number) => [0, -0.6, 0, 0.6][this.place(s)] ?? 0;
		const view = viewOf(prev);
		if (view) {
			view.react?.(prev, next as typeof prev, action, seat, {
				say: (who, text, tone) => this.say(who, text, tone),
				cheer: () => {
					this.cheer++;
					playCheer();
				},
				hush: () => {
					this.hush++;
					playHush();
				},
				stir: () => this.stir++,
				sound: (kind, arg) => {
					if (kind === 'card') playCard(arg ?? 0);
					else if (kind === 'pass') playPass();
					else if (kind === 'knock') playKnock();
					else if (kind === 'deal') playDeal(arg ?? 4);
					else playPeg(arg ?? 1);
				},
				pan
			});
			return;
		}
		if (action.type === 'play') playCard(pan(seat));
		if (prev.kind === 'cribbage' && next.kind === 'cribbage') {
			if (action.type === 'discard') playPass();
			if (action.type === 'cut' && next.lastPeg?.why[0]?.startsWith('his heels')) {
				this.say(next.dealer, 'His heels for 2', 'score');
				playPeg(2);
				this.stir++;
			}
			if (action.type === 'play' && next.lastPeg) {
				const p = next.lastPeg;
				const text = p.points ? `${p.count === 31 ? '31' : p.count} · ${p.why.join(', ')}` : `${p.count}`;
				this.say(seat, text, p.points ? 'score' : 'plain');
				if (p.points) {
					playPeg(p.points);
					this.stir++;
				}
			}
			if (next.go !== null && next.go !== prev.go) this.say(next.go, 'Go');
			if (action.type === 'next') {
				const shown = showOf(prev);
				if (shown) {
					const pts = total(shown.items);
					if (pts) {
						playPeg(pts);
						this.stir++;
					}
					if (pts >= 16) {
						this.cheer++;
						playCheer();
					}
				}
			}
		}
		if (prev.kind === 'hearts' && next.kind === 'hearts') {
			if (action.type === 'pass') playPass();
			if (next.phase === 'trick' && prev.phase === 'play') {
				const pts = (next.trick as Card[]).reduce((t, c) => t + pointsOf(c), 0);
				if (next.trick.includes(QUEEN_OF_SPADES)) {
					this.say(next.lastWinner!, 'The black lady!', 'score');
					this.stir++;
				} else if (pts >= 3) this.stir++;
			}
			if (next.phase === 'handOver' && next.summary?.moon !== null && next.summary?.moon !== undefined) {
				this.say(next.summary.moon, 'Shot the moon!', 'score');
				this.cheer++;
				playCheer();
			}
		}
		if (prev.kind === 'gin' && next.kind === 'gin') {
			if (action.type === 'take') {
				this.say(seat, `Takes the ${label(prev.discard[prev.discard.length - 1])}`);
				playPass();
			}
			if (action.type === 'pass') this.say(seat, 'Pass');
			if (action.type === 'draw') playPass();
			if (action.type === 'discard') playCard(pan(seat));
			if (action.type === 'knock' || action.type === 'bigGin') {
				playKnock();
				const r = next.result;
				this.say(seat, r?.kind === 'gin' ? 'Gin!' : r?.kind === 'bigGin' ? 'Big gin!' : 'Knock', 'call');
				if (r && (r.kind === 'gin' || r.kind === 'bigGin' || r.kind === 'undercut')) {
					this.cheer++;
					playCheer();
				}
				this.stir++;
			}
		}
		if (prev.kind === 'euchre' && next.kind === 'euchre') {
			if (action.type === 'pass') this.say(seat, 'Pass');
			if (action.type === 'farmer' && action.swap) this.say(seat, "Farmer's hand, swapping");
			if (action.type === 'order') {
				const dealerSelf = seat === prev.dealer;
				this.say(seat, action.alone ? 'Alone!' : dealerSelf ? 'I’ll pick it up' : 'Pick it up', 'call');
				playKnock();
			}
			if (action.type === 'call') {
				this.say(seat, `${SUIT_NAME[action.suit][0].toUpperCase()}${SUIT_NAME[action.suit].slice(1)}${action.alone ? ', alone!' : ''}`, 'call');
				playKnock();
			}
			if ((action.type === 'order' || action.type === 'call') && action.alone) {
				this.hush++;
				playHush();
			}
			if (action.type === 'defend' && action.alone) {
				this.say(seat, 'I’ll defend alone', 'call');
				this.hush++;
				playHush();
			}
			if (action.type === 'discard') playPass();
			if (next.phase === 'handOver' && next.summary) {
				const sm = next.summary;
				playPeg(sm.points);
				this.stir++;
				if (sm.points >= 2) {
					this.cheer++;
					playCheer();
				}
			}
			if (next.thrownIn && !prev.thrownIn) this.say(prev.dealer, 'Thrown in. New deal');
		}
		if (prev.kind === 'spades' && next.kind === 'spades') {
			if (action.type === 'bid') {
				this.say(seat, action.bid === 0 ? 'Nil!' : `${action.bid}`, 'call');
				if (action.bid === 0) {
					this.hush++;
					playHush();
				} else playKnock();
			}
			if (next.phase === 'trick' && prev.phase === 'play') {
				const led = prev.trick[prev.leader] ?? next.trick[next.leader]!;
				const w = next.lastWinner!;
				const broke = next.bids[w] === 0 && next.tricks[w] === 0;
				if (broke) this.say(w, 'Nil broken!', 'score');
				else if (Math.floor(next.trick[w]! / 13) === SPADES && Math.floor(led / 13) !== SPADES) this.say(w, 'Trumped!', 'score');
				if (broke) this.stir++;
			}
			if (next.phase === 'handOver' && next.summary) {
				this.stir++;
				const big = next.summary.some((t) => t.nils.some((n) => n.made)) || next.summary.some((t) => t.bid > 0 && !t.made);
				if (big) {
					this.cheer++;
					playCheer();
				}
			}
		}
	}
}
