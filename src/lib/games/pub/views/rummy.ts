import { card, label, sortHand } from '../../kit/cards/deck';
import { stack } from '../../kit/cards/layout';
import { meldsIn } from '../bots/rummy';
import { RUMMY_TARGET, canDiscard, canTake, fitsMeld, meldKind, orderMeld, type RummyAction, type RummyState } from '../rules/rummy';
import { plural, seatTable } from './shared';
import type { GameView } from './types';

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

function meldOk(s: RummyState, cards: number[]) {
	if (!meldKind(cards)) return false;
	return s.must === null || cards.includes(s.must);
}

export const RUMMY_VIEW: GameView<RummyState> = {
	glyph: { glyph: '500', red: false },
	tips: [
		'You can take deep into the discard pile, but the bottom card you take must be melded that turn.',
		'Lay off on your opponent’s melds too: the points still go to you.',
		'Cards left in your hand count against you when someone goes out. Meld early.',
		'Aces are worth 15, unless they sit low in an A-2-3 run.',
		'Watch what your opponent picks up from the pile. Don’t feed their melds.'
	],
	lesson: {
		seed: 1,
		concepts: [
			{
				id: 'goal',
				title: 'Points on the table',
				body: [
					'Rummy 500 is about laying down **melds**: sets of three or four of a rank, or runs of three or more in one suit.',
					`Cards you put down score for you; cards left in your hand when the hand ends count against you. First to ${RUMMY_TARGET} wins.`,
					'I’m Rosie. I’ll pick each move for this hand and tell you why. Whatever I suggest glows teal.'
				],
				example: [card(3, 4), card(3, 5), card(3, 6)],
				when: ({ s }) => s.kind === 'rummy'
			},
			{
				id: 'draw',
				title: 'Drawing',
				body: ['Start your turn by drawing: a fresh card from the stock, or one from the discard pile.'],
				when: ({ s, viewer }) => s.kind === 'rummy' && s.phase === 'draw' && s.turn === viewer
			},
			{
				id: 'deep',
				title: 'Digging in the pile',
				body: [
					'Unlike most rummy games, you can take a card from anywhere in the discard pile, as long as you take every card above it too.',
					'The catch: the deepest card you take must go down in a meld (or on one) that same turn.'
				],
				when: ({ s, viewer }) => s.kind === 'rummy' && s.phase === 'draw' && s.turn === viewer && s.discard.some((_, i) => i < s.discard.length - 1 && canTake(s, i))
			},
			{
				id: 'meld',
				title: 'Laying down',
				body: ['You have a meld. Select its cards and tap **Meld**. Its cards score their value: aces 15, tens and court cards 10, everything else 5.'],
				when: ({ s, viewer }) => s.kind === 'rummy' && s.phase === 'meld' && s.turn === viewer && meldsIn(s.hands[viewer]).length > 0
			},
			{
				id: 'layoff',
				title: 'Laying off',
				body: ['A card that extends a meld on the table can be **laid off** there, on anyone’s meld. Select it, then tap the meld. The points go to you.'],
				when: ({ s, viewer }) => s.kind === 'rummy' && s.phase === 'meld' && s.turn === viewer && s.hands[viewer].some((c) => s.melds.some((m) => fitsMeld(m, c)))
			},
			{
				id: 'discard',
				title: 'Discarding',
				body: ['End your turn by discarding one card onto the pile. Throw the card least likely to become part of a meld, especially a high one that would cost you.'],
				when: ({ s, viewer }) => s.kind === 'rummy' && s.phase === 'meld' && s.turn === viewer && s.must === null && meldsIn(s.hands[viewer]).length === 0
			},
			{
				id: 'score',
				title: 'Scoring',
				body: ['Each player adds up the cards they put on the table and subtracts the cards still in their hand.', `Scores carry over. First to ${RUMMY_TARGET} wins.`],
				when: ({ s }) => s.kind === 'rummy' && s.phase === 'handOver'
			}
		],
		done: (s) => s.kind === 'rummy' && (s.phase === 'handOver' || s.phase === 'over' || s.handNo > 1),
		wrap: {
			title: 'That’s Rummy 500!',
			body: ['You’ve drawn, melded, laid off and scored a hand. Keep going until someone reaches 500.', 'Keep playing this game with me watching, or head back to the bar and deal a real one.']
		}
	},

	cardWidth: (w, h) => Math.max(34, Math.min(w / 9.5, h / 7.6, 92)),

	layout(s, k) {
		for (let seat = 0; seat < 2; seat++) {
			const list = s.hands[seat];
			k.hand(seat, list, {
				order: k.input.reveal(seat) ? sortHand(list) : list,
				glow: (c) => (k.input.reveal(seat) && k.input.place(seat) === 0 && s.turn === seat && s.taken.includes(c) && !k.input.suggested.includes(c) ? k.colours.gold : null)
			});
		}
		const my = k.input.myTurn;
		const stockAt = { x: 18 + k.cw * 0.6, y: k.cy };
		stack(s.stock.length, stockAt.x, stockAt.y, k.cw).forEach((p, i) => k.put(s.stock[i], { ...p, face: false, z: 10 + i }));
		k.marks.push({ x: stockAt.x, y: stockAt.y + k.ch * 0.6, text: `Stock · ${s.stock.length}`, kind: 'label' });
		if (my && s.phase === 'draw' && s.stock.length) k.spots.push({ x: stockAt.x - k.cw / 2, y: stockAt.y - k.ch / 2, w: k.cw, h: k.ch, action: 'draw', label: 'Draw from the stock' });

		const x0 = stockAt.x + k.cw * 1.25;
		const n = s.discard.length;
		const step = n > 1 ? Math.min(k.cw * 0.42, (k.w - x0 - k.cw * 0.7) / (n - 1)) : 0;
		s.discard.forEach((c, i) => {
			const live = my && s.phase === 'draw' && canTake(s, i);
			k.put(c, { x: x0 + i * step, y: k.cy, rot: 0, face: true, z: 50 + i, live, glow: live && k.input.suggested.includes(c) ? k.colours.teal : null });
		});

		const scale = 0.62;
		const mw = k.cw * scale;
		const mstep = mw * 0.36;
		const cursor = [18 + mw / 2, 18 + mw / 2];
		const rows = [0, 0];
		const sel = my && s.phase === 'meld' && k.input.selected.length === 1 ? k.input.selected[0] : null;
		s.melds.forEach((m, i) => {
			const side = k.input.place(m.owner) === 0 ? 0 : 1;
			const width = mw + mstep * (m.cards.length - 1);
			if (cursor[side] + width > k.w - 18) {
				cursor[side] = 18 + mw / 2;
				rows[side]++;
			}
			const dir = side === 0 ? 1 : -1;
			const y = k.cy + dir * (k.ch * 0.95 + rows[side] * k.ch * scale * 0.6);
			const x = cursor[side];
			orderMeld(m.cards).forEach((c, j) => k.put(c, { x: x + j * mstep, y, rot: 0, face: true, z: 80 + i * 14 + j, scale }));
			if (sel !== null && fitsMeld(m, sel) && (s.must === null || s.must === sel)) {
				k.spots.push({ x: x - mw / 2 - 4, y: y - (k.ch * scale) / 2 - 4, w: width + 8, h: k.ch * scale + 8, action: `meld-${i}`, label: `Lay off on the ${m.kind} ${orderMeld(m.cards).map(label).join(' ')}`, target: true });
			}
			cursor[side] += width + mw * 0.3;
		});
	},

	plate(s, seat) {
		const n = s.hands[seat].length;
		return { score: `${s.scores[seat]}`, sub: plural(n, 'card'), tags: s.dealer === seat ? ['Dealer'] : [] };
	},

	prompt(s, p) {
		if (s.phase === 'handOver' && s.summary) {
			const sm = s.summary;
			const head = sm.out !== null ? `**${p.names[sm.out]}** ${p.names[sm.out] === 'You' ? 'go' : 'goes'} out!` : 'The stock has run out';
			return {
				kind: 'summary',
				head,
				items: [0, 1].map((seat) => ({ label: p.names[seat], value: signed(sm.table[seat] - sm.hand[seat]), note: `${sm.table[seat]} down − ${sm.hand[seat]} in hand → ${s.scores[seat]}` })),
				buttons: [{ id: 'next', label: s.winners.length ? 'See the result' : 'Deal again', look: 'go', do: 'next' }]
			};
		}
		if (p.my && s.phase === 'draw') {
			const deep = s.discard.some((_, i) => i < s.discard.length - 1 && canTake(s, i));
			return {
				kind: 'line',
				text: `Draw from the stock, or take from the discard pile${deep ? ' (tap any card to take it and everything above it)' : ''}`,
				buttons: s.stock.length ? [{ id: 'draw', label: 'Draw', look: 'go', do: { type: 'draw' } }] : []
			};
		}
		if (p.my && s.phase === 'meld') {
			const sel = p.selected;
			const valid = meldOk(s, sel);
			const one = sel.length === 1 ? sel[0] : null;
			const lays = one !== null && s.melds.some((m) => fitsMeld(m, one));
			let text: string;
			if (s.must !== null) text = `The **${label(s.must)}** must go down this turn`;
			else if (valid) text = `**${meldKind(sel) === 'set' ? 'A set' : 'A run'}**: tap Meld to lay it down`;
			else if (lays) text = 'Tap a meld to lay it off, or discard it';
			else if (sel.length) text = sel.length === 1 ? 'Discard it, or pick more cards to meld' : 'That isn’t a meld yet';
			else text = 'Select cards to meld, or one card to discard';
			return {
				kind: 'line',
				text,
				buttons: [
					{ id: 'meld', label: 'Meld', look: 'go', do: { type: 'meld', cards: sel }, disabled: !valid },
					{ id: 'discard', label: 'Discard', look: 'soft', do: { type: 'discard', card: one ?? -1 }, disabled: one === null || !canDiscard(s, one) }
				]
			};
		}
		return { kind: 'line', text: p.waiting, muted: true };
	},

	ledger(s, v) {
		return { table: seatTable(v, s.history, s.scores, 'high', 2), notes: [`First to ${RUMMY_TARGET} wins`, 'Aces 15 (5 low in A-2-3) · tens and court cards 10 · others 5. Cards in hand count against you'] };
	},

	result(s, v) {
		const w = s.winners[0];
		const kicker = `First to ${RUMMY_TARGET}`;
		const other = s.scores[1 - w];
		if (v.humans.filter(Boolean).length === 1)
			return v.won ? { kicker, title: 'You win at Rummy 500', body: `${s.scores[0]} to ${s.scores[1]}. Maggie says she let you have that last pile.` } : { kicker, title: `${v.names[w]} wins it`, body: `${s.scores[w]} to ${other}.` };
		return { kicker, title: `${v.names[w]} wins it`, body: `${s.scores[w]} to ${other}.` };
	},

	guide: {
		intro: `Two players, thirteen cards each. Lay down **melds** (sets of a rank, runs in a suit) for points. Cards left in your hand count against you. First to **${RUMMY_TARGET}**.`,
		cols: [
			{
				title: 'Your turn',
				items: [
					'**Draw** from the stock, or take from the discard pile. You can take **any** card in the pile, along with everything above it, but that card must be melded this turn.',
					'**Meld**: select three or more cards and tap Meld.',
					'**Lay off**: select one card, then tap any meld it extends (yours or theirs).',
					'**Discard** one card to end your turn. Go out by melding or discarding your last card.'
				]
			},
			{
				title: 'Scoring',
				items: ['Aces 15 (or 5 when low in A-2-3), tens and court cards 10, the rest 5.', 'Each hand: your cards on the table minus the cards in your hand.', 'The hand also ends when the stock runs out.']
			}
		]
	},

	legal: (s, seat) => {
		if (s.turn !== seat) return [];
		if (s.phase === 'draw') return s.discard.filter((_, i) => canTake(s, i));
		return s.phase === 'meld' ? s.hands[seat] : [];
	},

	tap: (s, c): RummyAction | 'select' | null => {
		if (s.phase === 'draw') {
			const i = s.discard.indexOf(c);
			return i >= 0 ? { type: 'take', index: i } : null;
		}
		return 'select';
	},
	selectMax: () => 13,

	spot: (s, id, _seat, selected) => {
		if (id === 'draw') return s.phase === 'draw' && s.stock.length ? { type: 'draw' } : null;
		const i = Number(id.replace('meld-', ''));
		if (!id.startsWith('meld-') || selected.length !== 1 || !s.melds[i]) return null;
		return { type: 'layoff', card: selected[0], meld: i };
	},

	react(prev, next, act, seat, fx) {
		const action = act as RummyAction;
		if (action.type === 'draw') fx.sound('pass', fx.pan(seat));
		if (action.type === 'take') {
			fx.sound('card', fx.pan(seat));
			const n = prev.discard.length - action.index;
			if (n > 1) fx.say(seat, `I’ll take ${n}`, 'call');
		}
		if (action.type === 'meld') {
			fx.sound('card', fx.pan(seat));
			fx.say(seat, meldKind(action.cards) === 'set' ? 'A set' : 'A run', 'call');
		}
		if (action.type === 'layoff' || action.type === 'discard') fx.sound('card', fx.pan(seat));
		if (next.phase === 'handOver' && prev.phase !== 'handOver' && next.summary) {
			fx.stir();
			if (next.summary.out !== null) fx.say(next.summary.out, 'Out!', 'score');
			if (next.winners.length) fx.cheer();
		}
	}
};
