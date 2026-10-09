import { card, label, sortHand, type Card } from '../../kit/cards/deck';
import { stack } from '../../kit/cards/layout';
import { PILE_NAME } from '../coach/kings';
import { CORNERS, KINGS_TARGET, SIDES, canMove, fits, legalKings, type KingsAction, type KingsState } from '../rules/kings';
import { plural, seatTable } from './shared';
import type { GameView } from './types';

/** Where each pile sits, as multiples of card width/height from the centre, and which way it grows. */
const PILE_AT = [
	{ x: 0, y: -1.12, dx: 0, dy: -1 },
	{ x: 1.3, y: 0, dx: 1, dy: 0 },
	{ x: 0, y: 1.12, dx: 0, dy: 1 },
	{ x: -1.3, y: 0, dx: -1, dy: 0 },
	{ x: 1.3, y: -1.12, dx: 0.7, dy: -0.7 },
	{ x: 1.3, y: 1.12, dx: 0.7, dy: 0.7 },
	{ x: -1.3, y: 1.12, dx: -0.7, dy: 0.7 },
	{ x: -1.3, y: -1.12, dx: -0.7, dy: -0.7 }
];

const baseOf = (s: KingsState, c: Card) => SIDES.find((p) => s.piles[p][0] === c);

function choicesFor(s: KingsState, c: Card, seat: number): KingsAction[] {
	const from = baseOf(s, c);
	return legalKings(s, seat).filter((a) => (a.type === 'play' && a.card === c) || (a.type === 'move' && from !== undefined && a.from === from));
}

export const KINGS_VIEW: GameView<KingsState> = {
	glyph: { glyph: 'K', red: true },
	tips: [
		'Kings go only in the corners. Get them out of your hand as soon as a corner is free.',
		'Moving a whole pile onto another frees a side spot for any card you like.',
		'Fill an empty side with a high card: it leaves the most room to build down.',
		'Play everything you can before ending your turn. Every card left in hand slows you down.'
	],
	lesson: {
		seed: 1,
		concepts: [
			{
				id: 'goal',
				title: 'Empty your hand',
				body: [
					'Kings Corner is a race to get rid of your cards. Four piles sit around the stock, with space in the corners for kings.',
					`First to play out every card wins the hand. Win ${KINGS_TARGET} hands to win the game.`,
					'I’m Rosie. I’ll pick each move for this hand and tell you why. Whatever I suggest glows teal.'
				],
				when: ({ s }) => s.kind === 'kings'
			},
			{
				id: 'build',
				title: 'Building down',
				body: ['A card can go on a pile if it’s one lower and the other colour: a red 6 on a black 7, a black jack on a red queen.', 'You draw a card at the start of every turn, then play as many as you can. Tap a card, and if it could go in more than one place, tap where.'],
				example: [card(2, 5), card(3, 4), card(0, 3)],
				when: ({ s, viewer }) => s.kind === 'kings' && s.phase === 'play' && s.turn === viewer
			},
			{
				id: 'corner',
				title: 'Kings in the corners',
				body: ['Kings can only start a new pile in an empty corner. Once one is there, you build down on it just like the others.'],
				when: ({ s, viewer }) => s.kind === 'kings' && s.phase === 'play' && s.turn === viewer && legalKings(s, viewer).some((a) => a.type === 'play' && CORNERS.includes(a.pile))
			},
			{
				id: 'move',
				title: 'Moving a pile',
				body: ['If the bottom card of a side pile fits on another pile, the whole pile can move across. Tap its bottom card.', 'That leaves an empty side spot, and any card can go there.'],
				when: ({ s, viewer }) => s.kind === 'kings' && s.phase === 'play' && s.turn === viewer && legalKings(s, viewer).some((a) => a.type === 'move')
			},
			{
				id: 'empty',
				title: 'An empty side',
				body: ['A side spot is empty, so any card from your hand can start a pile there. A high card leaves the most room to build.'],
				when: ({ s, viewer }) => s.kind === 'kings' && s.phase === 'play' && s.turn === viewer && SIDES.some((p) => !s.piles[p].length)
			},
			{
				id: 'end',
				title: 'Ending your turn',
				body: ['When nothing else fits, end your turn. Your opponent draws and plays, then it’s back to you with a fresh card.'],
				when: ({ s, viewer }) => s.kind === 'kings' && s.phase === 'play' && s.turn === viewer && legalKings(s, viewer).length === 0
			}
		],
		done: (s) => s.kind === 'kings' && (s.phase !== 'play' || s.handNo > 1),
		wrap: {
			title: 'That’s Kings Corner!',
			body: [`You’ve built down, filled the corners and played out a hand. First to win ${KINGS_TARGET} hands takes the game.`, 'Keep playing this game with me watching, or head back to the bar and deal a real one.']
		}
	},

	cardWidth: (w, h) => Math.max(36, Math.min(w / 7.5, h / 7, 100)),

	layout(s, k) {
		for (let seat = 0; seat < 2; seat++) {
			const list = s.hands[seat];
			k.hand(seat, list, { order: k.input.reveal(seat) ? sortHand(list, { aceLow: true }) : list, glow: (c) => (c === s.drawn && k.input.reveal(seat) && k.input.place(seat) === 0 && s.turn === seat && s.phase === 'play' && !k.input.suggested.includes(c) ? k.colours.green : null) });
		}
		stack(s.stock.length, k.cx, k.cy, k.cw).forEach((p, i) => k.put(s.stock[i], { ...p, face: false, z: 10 + i, scale: 0.85 }));
		if (s.stock.length) k.marks.push({ x: k.cx, y: k.cy + k.ch * 0.5, text: `${s.stock.length}`, kind: 'label' });

		const my = k.input.myTurn && s.phase === 'play';
		const sel = my ? k.input.selected[0] : undefined;
		const tops: Array<{ x: number; y: number }> = [];
		s.piles.forEach((pile, p) => {
			const at = PILE_AT[p];
			const x0 = k.cx + at.x * k.cw;
			const y0 = k.cy + at.y * k.ch;
			const step = Math.min(0.16, 0.7 / Math.max(1, pile.length - 1));
			pile.forEach((c, i) => {
				const base = i === 0 && SIDES.includes(p);
				const movable = my && base && legalKings(s, s.turn).some((a) => a.type === 'move' && a.from === p);
				k.put(c, {
					x: x0 + at.dx * i * step * k.cw * 1.3,
					y: y0 + at.dy * i * step * k.ch,
					rot: 0,
					face: true,
					z: 30 + p * 20 + i,
					scale: 0.85,
					live: movable,
					raised: sel === c,
					glow: movable && k.input.suggested.includes(c) ? k.colours.teal : null
				});
			});
			const n = Math.max(0, pile.length - 1);
			tops.push({ x: x0 + at.dx * n * step * k.cw * 1.3, y: y0 + at.dy * n * step * k.ch });
			if (!pile.length) k.marks.push({ x: x0, y: y0, text: CORNERS.includes(p) ? 'K' : '', kind: 'slot', w: k.cw * 0.85, h: k.ch * 0.85 });
		});

		if (sel === undefined) return;
		const from = baseOf(s, sel);
		for (let p = 0; p < 8; p++) {
			const ok = from !== undefined ? canMove(s, from, p) : fits(s, sel, p);
			if (!ok) continue;
			const t = tops[p];
			k.spots.push({ x: t.x - (k.cw * 0.85) / 2, y: t.y - (k.ch * 0.85) / 2, w: k.cw * 0.85, h: k.ch * 0.85, action: `pile-${p}`, label: `Put it on ${PILE_NAME[p]}`, target: true });
		}
	},

	plate(s, seat) {
		return { score: `${s.wins[seat]}`, sub: `hands won · ${plural(s.hands[seat].length, 'card')}`, tags: s.dealer === seat ? ['Dealer'] : [] };
	},

	prompt(s, p) {
		if (s.phase === 'handOver' && s.summary) {
			const sm = s.summary;
			const head = sm.winner === null ? 'The table is blocked, and it’s a tie' : sm.left[sm.winner] === 0 ? `**${p.names[sm.winner]}** ${p.names[sm.winner] === 'You' ? 'go' : 'goes'} out!` : `Blocked. **${p.names[sm.winner]}** ${p.names[sm.winner] === 'You' ? 'have' : 'has'} fewer cards`;
			return {
				kind: 'summary',
				head,
				items: [0, 1].map((seat) => ({ label: p.names[seat], value: seat === sm.winner ? 'Wins' : `${plural(sm.left[seat], 'card')} left`, note: `${s.wins[seat]} of ${KINGS_TARGET}` })),
				buttons: [{ id: 'next', label: s.winners.length ? 'See the result' : 'Deal again', look: 'go', do: 'next' }]
			};
		}
		if (p.my && s.phase === 'play') {
			const moves = legalKings(s, p.viewer).length;
			const text = p.selected.length
				? `Tap where the **${label(p.selected[0])}** goes`
				: moves
					? `${s.drawn !== null && s.moves === 0 ? `You drew the **${label(s.drawn)}**. ` : ''}Build down in alternating colours`
					: 'Nothing fits. **End your turn**';
			return { kind: 'line', text, buttons: [{ id: 'end', label: 'End turn', look: moves ? 'soft' : 'go', do: { type: 'end' } }] };
		}
		return { kind: 'line', text: p.waiting, muted: true };
	},

	ledger(s, v) {
		return { table: seatTable(v, s.history, s.wins, 'high', 2), notes: [`First to win ${KINGS_TARGET} hands`, `${plural(s.stock.length, 'card')} left in the stock`] };
	},

	result(s, v) {
		const w = s.winners[0];
		const kicker = `First to ${KINGS_TARGET} hands`;
		if (v.humans.filter(Boolean).length === 1)
			return v.won ? { kicker, title: 'You win at Kings Corner', body: `${s.wins[0]} hands to ${s.wins[1]}. Old Tom tips his cap.` } : { kicker, title: `${v.names[w]} wins it`, body: `${s.wins[w]} hands to ${s.wins[1 - w]}.` };
		return { kicker, title: `${v.names[w]} wins it`, body: `${s.wins[w]} hands to ${s.wins[1 - w]}.` };
	},

	guide: {
		intro: `Two players, seven cards each. Four cards are turned up around the stock, with the corners kept for kings. Empty your hand first to win the hand; **first to ${KINGS_TARGET} hands** wins.`,
		cols: [
			{
				title: 'Your turn',
				items: [
					'Draw a card (it happens for you), then play as many as you like.',
					'Build down in **alternating colours**: a red 6 on a black 7. Aces are low.',
					'**Kings** can start a pile only in an empty corner.',
					'Tap a card; if it could go in more than one place, tap where.'
				]
			},
			{
				title: 'Moves',
				items: [
					'If a side pile’s bottom card fits on another pile, tap it to move the **whole pile**. Any card can fill the empty side.',
					'Tap **End turn** when you’re done.',
					'If the stock is empty and nobody can move, the fewer cards in hand wins.'
				]
			}
		]
	},

	legal: (s, seat) => {
		const acts = legalKings(s, seat);
		const cards = new Set<Card>();
		for (const a of acts) {
			if (a.type === 'play') cards.add(a.card);
			if (a.type === 'move') cards.add(s.piles[a.from][0]);
		}
		return [...cards];
	},

	tap: (s, c, seat) => {
		const choices = choicesFor(s, c, seat);
		if (choices.length === 1) return choices[0];
		return choices.length ? 'select' : null;
	},

	spot: (s, id, seat, selected) => {
		const pile = Number(id.replace('pile-', ''));
		const sel = selected[0];
		if (sel === undefined || !Number.isInteger(pile)) return null;
		const from = baseOf(s, sel);
		if (from !== undefined) return canMove(s, from, pile) ? { type: 'move', from, to: pile } : null;
		return s.hands[seat].includes(sel) && fits(s, sel, pile) ? { type: 'play', card: sel, pile } : null;
	},

	react(prev, next, act, seat, fx) {
		const action = act as KingsAction;
		if (action.type === 'play') {
			fx.sound('card', fx.pan(seat));
			if (CORNERS.includes(action.pile) && !prev.piles[action.pile].length) fx.say(seat, 'King in the corner', 'call');
		}
		if (action.type === 'move') {
			fx.sound('pass', fx.pan(seat));
			fx.say(seat, 'Move the lot', 'plain');
		}
		if (action.type === 'end' && next.phase === 'play') fx.sound('deal');
		if (next.phase === 'handOver' && prev.phase === 'play' && next.summary) {
			const w = next.summary.winner;
			if (w !== null) fx.say(w, next.summary.left[w] === 0 ? 'Out!' : 'Fewer cards', 'score');
			fx.stir();
			if (next.winners.length) fx.cheer();
		}
	}
};
