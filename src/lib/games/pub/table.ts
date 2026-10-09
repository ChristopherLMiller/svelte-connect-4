import { CARD_RATIO } from '../kit/cards/faces';
import { fan, stack, type Placement } from '../kit/cards/layout';
import { SUITS, euchreDeck, fullDeck, sortHand, type Card, type Suit } from '../kit/cards/deck';
import type { PubState } from './ai';
import { showOf } from './rules/cribbage';
import { effSuit, power, sitsOut, type EuchreState } from './rules/euchre';
import { bestMelding } from './rules/gin';
import { powerS } from './rules/spades';
import type { Stage } from './session.svelte';
import { viewOf } from './views';

export type TableInput = {
	state: PubState;
	viewer: number;
	players: number;
	place: (seat: number) => number;
	playable: Card[];
	selected: Card[];
	hints: boolean;
	stage: Stage;
	/** Every hand shows face up (only the regulars are hidden from a lone human). */
	reveal: (seat: number) => boolean;
	myTurn: boolean;
	knocking: boolean;
	/** Rosie's suggested cards, glowing in the viewer's hand. */
	suggested: Card[];
	suggestedSpot: string | null;
};

export type Plate = { seat: number; pos: number; x: number; y: number; anchor: 'left' | 'right' | 'center' };
/** `slot` is an empty pile outline (w/h in px); `trump` text is a suit number. */
export type Mark = { x: number; y: number; text: string; kind: 'count' | 'label' | 'trump' | 'slot'; w?: number; h?: number; caption?: string };
/** A tappable place on the felt. `target` outlines it as somewhere a chosen card can go. */
export type Spot = { x: number; y: number; w: number; h: number; action: string; label?: string; target?: boolean };

export type TableView = { cards: Placement[]; plates: Plate[]; marks: Mark[]; spots: Spot[]; cw: number; ch: number };

const GOLD = 'rgba(255, 196, 92, 0.85)';
const GREEN = 'rgba(140, 230, 140, 0.85)';
const RED = 'rgba(255, 110, 90, 0.85)';
const TEAL = 'rgba(80, 230, 215, 0.95)';

export function cardWidth(w: number, h: number, players: number) {
	const portrait = w < h * 0.8;
	const byW = w / (players === 4 ? (portrait ? 6.2 : 9.2) : portrait ? 5.2 : 8);
	const byH = h / (players === 4 ? 6.2 : 5.6);
	return Math.max(34, Math.min(byW, byH, 132));
}

function jitter(c: Card, amount: number) {
	const x = Math.sin(c * 91.7) * 43758.5;
	return (x - Math.floor(x) - 0.5) * amount;
}

export function layoutTable(input: TableInput, w: number, h: number): TableView {
	const { state: s, players } = input;
	const view = viewOf(s);
	const cw = view?.cardWidth?.(w, h) ?? cardWidth(w, h, players);
	const ch = cw / CARD_RATIO;
	const cx = w / 2;
	const cy = h * (players === 4 ? 0.46 : 0.47);
	const cards = new Map<Card, Placement>();
	const deckCards = view?.deck?.(s) ?? (s.kind === 'euchre' ? euchreDeck() : fullDeck());
	const small = 0.7;
	const pileScale = 0.5;

	const put = (id: Card, p: Omit<Placement, 'id'>) => cards.set(id, { id, ...p });

	const RAIL = 18;
	const box = (pts: Array<{ x: number; y: number; rot: number }>, scale: number) => {
		const hw = (cw * scale) / 2;
		const hh = (ch * scale) / 2;
		let left = Infinity;
		let right = -Infinity;
		let top = Infinity;
		let bottom = -Infinity;
		for (const p of pts) {
			const a = (p.rot * Math.PI) / 180;
			const ex = hw * Math.abs(Math.cos(a)) + hh * Math.abs(Math.sin(a));
			const ey = hw * Math.abs(Math.sin(a)) + hh * Math.abs(Math.cos(a));
			left = Math.min(left, p.x - ex);
			right = Math.max(right, p.x + ex);
			top = Math.min(top, p.y - ey);
			bottom = Math.max(bottom, p.y + ey);
		}
		return { left, right, top, bottom };
	};
	/** Shift a whole fan so every rotated card stays inside the felt's rail. */
	const fit = (pts: Array<{ x: number; y: number; rot: number }>, scale: number) => {
		if (!pts.length) return pts;
		const { left, right, top, bottom } = box(pts, scale);
		const dx = left < RAIL ? RAIL - left : right > w - RAIL ? w - RAIL - right : 0;
		const dy = top < RAIL ? RAIL - top : bottom > h - RAIL ? h - RAIL - bottom : 0;
		return pts.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy }));
	};

	/** Fan geometry by table position. */
	const handFan = (pos: number, count: number, own: boolean) => {
		const scale = own ? 1 : small;
		const cwS = cw * scale;
		if (pos === 0) return { pts: fit(fan(count, { cx, cy: h - ch * 0.56, w: cwS, span: Math.min(w - RAIL * 2 - cwS * 0.3, cwS * (count * 0.66 + 0.6)), arc: 2.2, gap: 0.66 }), scale), scale };
		if (pos === 2) return { pts: fit(fan(count, { cx, cy: ch * 0.36, w: cwS, span: Math.min(w * 0.5, cwS * (count * 0.4 + 0.8)), arc: 2.4, turn: 180, gap: 0.4 }), scale), scale };
		const x = pos === 1 ? cw * 0.42 : w - cw * 0.42;
		return { pts: fit(fan(count, { cx: x, cy, w: cwS, span: Math.min(h * 0.5, cwS * (count * 0.36 + 0.8)), arc: 2.4, turn: pos === 1 ? 90 : -90, gap: 0.36 }), scale), scale };
	};

	const hand = (seat: number, list: Card[], options: { order?: Card[]; glow?: (c: Card) => string | null; dim?: boolean; faceUp?: boolean; live?: (c: Card) => boolean } = {}) => {
		const pos = input.place(seat);
		const own = pos === 0 && input.reveal(seat);
		const face = options.faceUp ?? input.reveal(seat);
		const ordered = options.order ?? (face ? sortHand(list) : list);
		const { pts, scale } = handFan(pos, ordered.length, own);
		ordered.forEach((c, i) => {
			const live = options.live ? options.live(c) : own && input.myTurn && input.playable.includes(c);
			put(c, {
				...pts[i],
				face,
				z: 100 + i,
				scale,
				live,
				raised: own && input.selected.includes(c),
				dim: own && input.hints && input.myTurn && input.playable.length > 0 && !input.playable.includes(c),
				glow: options.glow?.(c) ?? (own && input.myTurn && input.suggested.includes(c) ? TEAL : live && input.knocking ? RED : null),
				delay: input.stage === 'deal' ? 60 * i * (players === 4 ? 4 : 2) + seat * 60 : 0
			});
		});
	};

	const dir = [
		[0, 1],
		[-1, 0],
		[0, -1],
		[1, 0]
	];

	const trickSpot = (pos: number) => {
		const [dx, dy] = dir[pos];
		return { x: cx + dx * cw * 0.78, y: cy + dy * ch * 0.4, rot: dx * 6 + dy * -3 };
	};

	const pileSpot = (pos: number) => {
		const spots = [
			{ x: cx - cw * 2.1, y: cy + ch * 0.9 },
			{ x: cx - cw * 2.7, y: cy - ch * 0.6 },
			{ x: cx + cw * 2.1, y: cy - ch * 0.9 },
			{ x: cx + cw * 2.7, y: cy + ch * 0.6 }
		];
		return spots[pos];
	};

	const plates: Plate[] = [];
	for (let seat = 0; seat < (view?.noPlates ? 0 : players); seat++) {
		const pos = input.place(seat);
		if (pos === 0) plates.push({ seat, pos, x: w - 10, y: box(handFan(0, players === 4 ? 13 : 11, true).pts, 1).top - ch * 0.22 - 58, anchor: 'right' });
		else if (pos === 2) plates.push({ seat, pos, x: Math.min(cx + Math.min(w * 0.25, cw * small * 3.6) + 14, w - 124), y: 8, anchor: 'left' });
		else if (pos === 1) plates.push({ seat, pos, x: 8, y: cy + Math.min(h * 0.25, cw * small * 3) + 14, anchor: 'left' });
		else plates.push({ seat, pos, x: w - 8, y: cy - Math.min(h * 0.25, cw * small * 3) - 70, anchor: 'right' });
	}

	const marks: Mark[] = [];
	const spots: Spot[] = [];

	if (input.stage === 'gather') {
		stack(deckCards.length, cx, cy, cw).forEach((p, i) => put(deckCards[i], { ...p, face: false, z: i }));
		return { cards: [...cards.values()], plates, marks, spots, cw, ch };
	}

	if (view) {
		const seatSpot = (pos: number) =>
			[
				{ x: cx, y: h - ch * 0.56 },
				{ x: cw * 0.42, y: cy },
				{ x: cx, y: ch * 0.36 },
				{ x: w - cw * 0.42, y: cy }
			][pos];
		view.layout(s, {
			input,
			put,
			hand,
			trickSpot,
			pileSpot,
			seatSpot,
			jitter,
			plates,
			marks,
			spots,
			cw,
			ch,
			cx,
			cy,
			w,
			h,
			small,
			pileScale,
			dealing: input.stage === 'deal',
			colours: { gold: GOLD, green: GREEN, red: RED, teal: TEAL }
		});
		return { cards: [...cards.values()], plates, marks, spots, cw, ch };
	}

	if (s.kind === 'cribbage') {
		const deckAt = { x: Math.max(cw * 0.9, cx - cw * 3.4), y: cy };
		const cribAt = { x: Math.min(w - cw * 0.9, cx + cw * 3.4), y: cy + (input.place(s.dealer) === 0 ? ch * 0.45 : -ch * 0.45) };
		const cutHint = s.phase === 'cut' && input.myTurn && input.suggestedSpot === 'cut';
		stack(s.stock.length, deckAt.x, deckAt.y, cw).forEach((p, i) => put(s.stock[i], { ...p, face: false, z: 10 + i, glow: cutHint && i === s.stock.length - 1 ? TEAL : null }));
		marks.push({ x: deckAt.x, y: deckAt.y + ch * 0.62, text: 'Deck', kind: 'label' });
		marks.push({ x: cribAt.x, y: cribAt.y + ch * 0.62, text: `${s.dealer === input.viewer ? 'Your' : 'Their'} crib`, kind: 'label' });
		if (s.phase === 'cut' && input.myTurn) spots.push({ x: deckAt.x - cw / 2, y: deckAt.y - ch / 2, w: cw, h: ch, action: 'cut' });
		const show = s.phase === 'show' ? showOf(s) : null;
		const starterAt = show ? null : { x: deckAt.x + cw * 0.18, y: deckAt.y - ch * 0.08 };
		if (s.starter !== null && starterAt) put(s.starter, { x: starterAt.x, y: starterAt.y, rot: 8, face: true, z: 80, glow: s.phase === 'peg' && s.lastPeg?.why[0]?.startsWith('his heels') ? GOLD : null });
		const cribFace = show?.crib === true;
		if (!cribFace) {
			const crib = s.phase === 'discard' ? [...(s.thrown[0] ?? []), ...(s.thrown[1] ?? [])] : s.crib;
			stack(crib.length, cribAt.x, cribAt.y, cw).forEach((p, i) => put(crib[i], { ...p, rot: 90, face: false, z: 20 + i, scale: 0.8 }));
		}
		if (s.phase === 'discard' || s.phase === 'cut') {
			for (let seat = 0; seat < 2; seat++) hand(seat, s.hands[seat]);
		} else if (s.phase === 'peg' || (s.phase === 'over' && !show)) {
			for (let seat = 0; seat < 2; seat++) hand(seat, s.hands[seat]);
			const current = s.pegged.filter((p) => p.run === s.run);
			const gap = cw * 0.5;
			current.forEach((p, i) => {
				const x = cx - ((current.length - 1) * gap) / 2 + i * gap;
				const fromMe = input.place(p.seat) === 0;
				put(p.card, { x, y: cy + (fromMe ? ch * 0.14 : -ch * 0.14), rot: jitter(p.card, 8), face: true, z: 200 + i, glow: i === current.length - 1 && s.lastPeg?.points ? GOLD : null });
			});
			const old = s.pegged.filter((p) => p.run !== s.run);
			for (let seat = 0; seat < 2; seat++) {
				const mine = old.filter((p) => p.seat === seat);
				const pos = input.place(seat);
				const y = pos === 0 ? h - ch * 1.5 : ch * 1.25;
				mine.forEach((p, i) => put(p.card, { x: cx + cw * 2.2 + i * cw * 0.16, y, rot: 90, face: false, z: 60 + i, scale: 0.6 }));
			}
			if (s.phase === 'peg') marks.push({ x: cx, y: cy + ch * 0.82, text: `Count ${s.count}`, kind: 'count' });
		} else if (show || s.phase === 'over') {
			const shownSet = new Set(show ? [...show.cards, s.starter!] : []);
			for (let seat = 0; seat < 2; seat++) {
				const kept = s.kept[seat].filter((c) => !shownSet.has(c));
				hand(seat, kept, { faceUp: true });
			}
			if (show) {
				const row = [...sortHand(show.cards, { aceLow: true }), s.starter!];
				const gap = cw * 1.06;
				row.forEach((c, i) => {
					const x = cx - ((row.length - 1) * gap) / 2 + i * gap + (i === row.length - 1 ? cw * 0.2 : 0);
					put(c, { x, y: cy, rot: i === row.length - 1 ? 4 : 0, face: true, z: 220 + i, glow: i === row.length - 1 ? GOLD : null });
				});
				if (!show.crib) {
					const cribCards = s.crib;
					stack(cribCards.length, cribAt.x, cribAt.y, cw).forEach((p, i) => put(cribCards[i], { ...p, rot: 90, face: false, z: 20 + i, scale: 0.8 }));
				}
			}
		}
		return { cards: [...cards.values()], plates, marks, spots, cw, ch };
	}

	if (s.kind === 'hearts') {
		const firstTrick = s.trickNo === 0 && s.trick.every((c) => c === null);
		for (let seat = 0; seat < 4; seat++) {
			const received = s.received[seat];
			hand(seat, s.hands[seat], { glow: (c) => (firstTrick && received.includes(c) && input.reveal(seat) ? GREEN : null) });
		}
		const order = [0, 1, 2, 3].map((i) => (s.leader + i) % 4);
		order.forEach((seat, i) => {
			const c = s.trick[seat];
			if (c === null) return;
			const spot = trickSpot(input.place(seat));
			put(c, { ...spot, rot: spot.rot + jitter(c, 6), face: true, z: 200 + i, glow: s.phase === 'trick' && s.lastWinner === seat ? GOLD : null });
		});
		for (let seat = 0; seat < 4; seat++) {
			const spot = pileSpot(input.place(seat));
			s.won[seat].forEach((c, i) => put(c, { x: spot.x + Math.floor(i / 4) * 3, y: spot.y - Math.floor(i / 4) * 3, rot: 90 + jitter(c, 10), face: false, z: 40 + i, scale: pileScale }));
		}
		return { cards: [...cards.values()], plates, marks, spots, cw, ch };
	}

	if (s.kind === 'spades') {
		for (let seat = 0; seat < 4; seat++) hand(seat, s.hands[seat]);
		const order = [0, 1, 2, 3].map((i) => (s.leader + i) % 4);
		order.forEach((seat, i) => {
			const c = s.trick[seat];
			if (c === null) return;
			const spot = trickSpot(input.place(seat));
			put(c, { ...spot, rot: spot.rot + jitter(c, 6), face: true, z: 200 + i, glow: s.phase === 'trick' && s.lastWinner === seat ? GOLD : null });
		});
		const taken = new Map<number, Card[][]>();
		for (let t = 0; t < s.trickNo; t++) {
			const plays = s.played.filter((p) => p.trick === t);
			if (plays.length < 4) continue;
			const led = plays[0].led;
			const best = plays.reduce((a, b) => (powerS(b.card, led) > powerS(a.card, led) ? b : a));
			taken.set(best.seat, [...(taken.get(best.seat) ?? []), plays.map((p) => p.card)]);
		}
		for (const [seat, tricks] of taken) {
			const spot = pileSpot(input.place(seat));
			tricks.forEach((trick, t) =>
				trick.forEach((c, i) => put(c, { x: spot.x + (t % 7) * cw * 0.14, y: spot.y + Math.floor(t / 7) * ch * 0.18 + i * 1.5, rot: t % 2 ? 90 : 0, face: false, z: 40 + t * 5 + i, scale: pileScale }))
			);
		}
		marks.push({ x: cx, y: cy, text: '2', kind: 'trump' });
		return { cards: [...cards.values()], plates, marks, spots, cw, ch };
	}

	if (s.kind === 'gin') {
		const stockAt = { x: cx - cw * 0.72, y: cy };
		const discardAt = { x: cx + cw * 0.72, y: cy };
		const drawing = input.myTurn && (s.phase === 'draw' || s.phase === 'firstUp');
		stack(s.stock.length, stockAt.x, stockAt.y, cw).forEach((p, i) => {
			const top = i === s.stock.length - 1;
			put(s.stock[i], { ...p, face: false, z: 10 + i, glow: top && drawing && s.phase === 'draw' ? (input.suggestedSpot === 'draw' ? TEAL : GOLD) : null });
		});
		s.discard.forEach((c, i) => {
			const top = i === s.discard.length - 1;
			put(c, { x: discardAt.x + jitter(c, cw * 0.06), y: discardAt.y + jitter(c + 7, cw * 0.06), rot: jitter(c, 10), face: true, z: 70 + i, glow: top && drawing ? (input.suggestedSpot === 'take' ? TEAL : GOLD) : null });
		});
		marks.push({ x: stockAt.x, y: stockAt.y + ch * 0.62, text: `Stock · ${s.stock.length}`, kind: 'label' });
		marks.push({ x: discardAt.x, y: discardAt.y + ch * 0.62, text: 'Discard', kind: 'label' });
		if (drawing) {
			if (s.phase === 'draw') spots.push({ x: stockAt.x - cw / 2, y: stockAt.y - ch / 2, w: cw, h: ch, action: 'draw' });
			if (s.discard.length) spots.push({ x: discardAt.x - cw / 2, y: discardAt.y - ch / 2, w: cw, h: ch, action: 'take' });
		}
		const grouped = (list: Card[]) => {
			const m = bestMelding(list);
			return { order: [...m.melds.flat(), ...sortHand(m.deadwood, { aceLow: true })], melded: new Set(m.melds.flat()) };
		};
		const r = s.phase === 'handOver' || s.phase === 'over' ? s.result : null;
		const shown = (seat: number, order: Card[], glow?: (c: Card) => string | null) => {
			if (input.place(seat) === 0) {
				hand(seat, order, { order, faceUp: true, glow });
				return;
			}
			const sc = 0.78;
			const step = Math.min(cw * sc * 0.62, (w * 0.86 - cw * sc) / Math.max(1, order.length - 1));
			const x0 = cx - (step * (order.length - 1)) / 2;
			order.forEach((c, i) => put(c, { x: x0 + i * step, y: ch * sc * 0.5 + 16, rot: 0, face: true, z: 100 + i, scale: sc, glow: glow?.(c) ?? null }));
		};
		for (let seat = 0; seat < 2; seat++) {
			const list = s.hands[seat];
			if (r && r.kind !== 'void' && r.knocker !== null) {
				const isKnocker = seat === r.knocker;
				const meld = isKnocker ? r.knockerMeld! : r.defenderMeld!;
				const melds = isKnocker ? r.extended : meld.melds;
				const order = [...melds.flat(), ...sortHand(meld.deadwood, { aceLow: true })];
				const lay = new Set(r.layoffs);
				const dead = new Set(meld.deadwood);
				shown(seat, order, (c) => (lay.has(c) ? GOLD : dead.has(c) ? RED : GREEN));
			} else if (r) {
				shown(seat, grouped(list).order);
			} else if (input.reveal(seat) && input.place(seat) === 0) {
				const g = grouped(list);
				hand(seat, list, { order: g.order, glow: (c) => (c === s.tookUp ? GOLD : null) });
			} else hand(seat, list);
		}
		return { cards: [...cards.values()], plates, marks, spots, cw, ch };
	}

	if (s.kind !== 'euchre') return { cards: [...cards.values()], plates, marks, spots, cw, ch };
	return euchreLayout(s, input, { put, hand, trickSpot, pileSpot, cards, plates, marks, spots, cw, ch, cx, cy, w, h, pileScale });
}

type EuchreKit = {
	put: (id: Card, p: Omit<Placement, 'id'>) => void;
	hand: (seat: number, list: Card[], options?: { order?: Card[]; glow?: (c: Card) => string | null; faceUp?: boolean }) => void;
	trickSpot: (pos: number) => { x: number; y: number; rot: number };
	pileSpot: (pos: number) => { x: number; y: number };
	cards: Map<Card, Placement>;
	plates: Plate[];
	marks: Mark[];
	spots: Spot[];
	cw: number;
	ch: number;
	cx: number;
	cy: number;
	w: number;
	h: number;
	pileScale: number;
};

function euchreOrder(list: Card[], trump: Suit | null) {
	if (trump === null) return sortHand(list);
	const suits: Suit[] = [trump, ...SUITS.filter((x) => x !== trump)];
	return list.slice().sort((a, b) => {
		const sa = suits.indexOf(effSuit(a, trump));
		const sb = suits.indexOf(effSuit(b, trump));
		return sa - sb || power(a, trump, null) - power(b, trump, null);
	});
}

function euchreLayout(s: EuchreState, input: TableInput, k: EuchreKit): TableView {
	const { put, hand, trickSpot, pileSpot, cards, plates, marks, spots, cw, ch, cx, cy } = k;
	for (let seat = 0; seat < 4; seat++) {
		const out = sitsOut(s, seat);
		hand(seat, s.hands[seat], {
			order: input.reveal(seat) ? euchreOrder(s.hands[seat], s.trump) : s.hands[seat],
			glow: (c) => (!out && s.phase === 'discard' && c === s.upcard && input.reveal(seat) ? GOLD : null)
		});
		if (out) {
			for (const c of s.hands[seat]) {
				const p = cards.get(c);
				if (p) cards.set(c, { ...p, dim: true, face: false });
			}
		}
	}
	const dealerPos = input.place(s.dealer);
	const toward = [
		[0, 1],
		[-1, 0],
		[0, -1],
		[1, 0]
	][dealerPos];
	const bidding = s.phase === 'farmer' || s.phase === 'bid1' || s.phase === 'bid2';
	const kittyAt = bidding ? { x: cx + toward[0] * cw * 1.1 + (toward[1] !== 0 ? cw * 1.6 : 0), y: cy + toward[1] * ch * 0.55 + (toward[0] !== 0 ? ch * 0.5 : 0) } : { x: cx + cw * 3.2 * (dealerPos === 1 ? -1 : 1), y: cy + (dealerPos === 0 ? ch * 0.9 : dealerPos === 2 ? -ch * 0.9 : ch * 0.9) };
	const hidden = s.kitty.filter((c) => c !== s.upcard);
	const upVisible = s.kitty.includes(s.upcard);
	stack(hidden.length, kittyAt.x, kittyAt.y, cw).forEach((p, i) => put(hidden[i], { ...p, face: false, z: 20 + i, scale: bidding ? 1 : 0.55, rot: bidding ? 0 : 90 }));
	if (upVisible) {
		put(s.upcard, { x: kittyAt.x + cw * 0.08, y: kittyAt.y - ch * 0.06, rot: bidding ? 5 : 90, face: s.phase === 'bid1' || s.phase === 'farmer', z: 30, scale: bidding ? 1 : 0.55, glow: s.phase === 'bid1' ? 'rgba(255, 196, 92, 0.6)' : null });
	}
	if (bidding) marks.push({ x: kittyAt.x, y: kittyAt.y + ch * 0.66, text: s.phase === 'bid2' ? 'Turned down' : 'Kitty', kind: 'label' });

	const order = [0, 1, 2, 3].map((i) => (s.leader + i) % 4);
	order.forEach((seat, i) => {
		const c = s.trick[seat];
		if (c === null) return;
		const spot = trickSpot(input.place(seat));
		put(c, { ...spot, face: true, z: 200 + i, glow: s.phase === 'trick' && s.lastWinner === seat ? 'rgba(255, 196, 92, 0.85)' : null });
	});

	const done = s.played.filter((p) => p.trick < s.trickNo);
	const tricksBySeat = new Map<number, Card[][]>();
	for (let t = 0; t < s.trickNo; t++) {
		const plays = done.filter((p) => p.trick === t);
		if (!plays.length) continue;
		const led = plays[0].led;
		let best = plays[0];
		for (const p of plays) if (power(p.card, s.trump, led) > power(best.card, s.trump, led)) best = p;
		const list = tricksBySeat.get(best.seat) ?? [];
		list.push(plays.map((p) => p.card));
		tricksBySeat.set(best.seat, list);
	}
	for (const [seat, tricks] of tricksBySeat) {
		const spot = pileSpot(input.place(seat));
		tricks.forEach((trick, t) =>
			trick.forEach((c, i) => put(c, { x: spot.x + t * cw * 0.2, y: spot.y + i * 1.5, rot: t % 2 ? 90 : 0, face: false, z: 40 + t * 5 + i, scale: k.pileScale }))
		);
	}
	if (s.trump !== null) marks.push({ x: cx, y: cy, text: String(s.trump), kind: 'trump' });
	return { cards: [...cards.values()], plates, marks, spots, cw, ch };
}
