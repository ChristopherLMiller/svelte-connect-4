import { SUIT_GLYPH, SUIT_NAME, SUIT_SINGULAR, card, label, rankOf, sortHand, type Suit } from '../../kit/cards/deck';
import { stack } from '../../kit/cards/layout';
import { EIGHT, EIGHTS_TARGET, canDraw, isEight, legalEights, top, type EightsAction, type EightsState } from '../rules/eights';
import { seatTable } from './shared';
import type { GameView } from './types';

export const EIGHTS_VIEW: GameView<EightsState> = {
	glyph: { glyph: '8', red: false },
	tips: [
		'Eights are wild: save them for when nothing else matches.',
		'Shed your court cards early. Anything left in your hand counts against you, and an eight costs 50.',
		'When someone draws, remember the suit: they probably can’t follow it.',
		'If the next player is nearly out, change the suit to one they’ve drawn on.',
		'Matching by number switches the suit, which can dig you out of a suit you don’t hold.'
	],
	lesson: {
		seed: 2,
		concepts: [
			{
				id: 'goal',
				title: 'Empty your hand',
				body: [
					'Crazy Eights is a race to get rid of your cards. Each turn you play one card onto the discard pile, if it matches.',
					'When someone goes out, everyone else counts up the cards still in their hand as penalty points. When anyone reaches 100, the lowest score wins.',
					'I’m Rosie. I’ll pick each move for this hand and tell you why. Whatever I suggest glows teal.'
				],
				when: ({ s }) => s.kind === 'eights'
			},
			{
				id: 'match',
				title: 'Matching',
				body: ({ s }) => {
					if (s.kind !== 'eights') return [];
					return [
						`The top card is the ${label(top(s))}. You can play any ${SUIT_SINGULAR[s.suit]}, or any card with the same number in another suit.`,
						'Matching by number changes the suit for everyone after you.'
					];
				},
				example: [card(3, 5), card(3, 10), card(0, 5)],
				when: ({ s, viewer }) => s.kind === 'eights' && s.phase === 'play' && s.turn === viewer
			},
			{
				id: 'eights',
				title: 'Crazy eights',
				body: [
					'Any eight can be played on anything. Whoever plays it names the next suit.',
					'That makes eights your escape hatch, so most players save them for when nothing else fits. Careful, though: an eight left in your hand at the end costs 50.'
				],
				example: [card(0, 6), card(1, 6), card(2, 6), card(3, 6)],
				when: ({ s }) => s.kind === 'eights' && (s.phase === 'suit' || s.discard.some((c, i) => i > 0 && isEight(c)) || s.hands.some((h, i) => i === 0 && h.some(isEight)))
			},
			{
				id: 'draw',
				title: 'Nothing to play',
				body: [
					'If you can’t (or don’t want to) play, draw from the stock. Keep drawing until you get a card you can play.',
					'If the stock runs out, the discard pile is shuffled to make a new one.'
				],
				when: ({ s, viewer }) => s.kind === 'eights' && s.phase === 'play' && s.turn === viewer && legalEights(s, viewer).length === 0
			},
			{
				id: 'memory',
				title: 'Watch who draws',
				body: ({ s, names }) => {
					if (s.kind !== 'eights') return [];
					const seat = s.shy.findIndex((x, i) => i !== 0 && x.length > 0);
					const suit = seat >= 0 ? s.shy[seat][0] : 0;
					return [
						seat >= 0 ? `${names[seat]} had to draw when ${SUIT_NAME[suit]} were wanted, so they’re probably out of ${SUIT_NAME[suit]}.` : 'When someone has to draw, they couldn’t match the suit.',
						'Leaving that suit on top when it’s their turn can make them draw again.'
					];
				},
				when: ({ s }) => s.kind === 'eights' && s.phase === 'play' && s.shy.some((x, i) => i !== 0 && x.length > 0)
			},
			{
				id: 'tally',
				title: 'Counting up',
				body: [
					'Everyone still holding cards scores penalty points: 50 for an eight, 10 for a king, queen or jack, 1 for an ace, and the number for anything else.',
					'Penalties add up hand after hand. When anyone reaches 100, the lowest total wins.'
				],
				when: ({ s }) => s.kind === 'eights' && s.phase === 'handOver'
			}
		],
		done: (s) => s.kind === 'eights' && (s.phase === 'handOver' || s.handNo > 1),
		wrap: {
			title: 'That’s a hand of Crazy Eights!',
			body: ['You’ve matched, drawn and gone through a full hand. Keep dealing until someone reaches 100.', 'Keep playing this game with me watching, or head back to the bar and deal a real one.']
		}
	},

	layout(s, k) {
		const eightsLast = (c: number) => (rankOf(c) === EIGHT ? 99 : rankOf(c));
		for (let seat = 0; seat < 4; seat++) {
			const list = s.hands[seat];
			k.hand(seat, list, { order: k.input.reveal(seat) ? sortHand(list, { key: eightsLast }) : list });
		}
		const stockAt = { x: k.cx - k.cw * 0.72, y: k.cy };
		const discardAt = { x: k.cx + k.cw * 0.72, y: k.cy };
		const drawing = k.input.myTurn && s.phase === 'play' && canDraw(s);
		stack(s.stock.length, stockAt.x, stockAt.y, k.cw).forEach((p, i) => k.put(s.stock[i], { ...p, face: false, z: 10 + i }));
		s.discard.forEach((c, i) => {
			const last = i === s.discard.length - 1;
			k.put(c, { x: discardAt.x + k.jitter(c, k.cw * 0.08), y: discardAt.y + k.jitter(c + 7, k.cw * 0.08), rot: k.jitter(c, 14), face: true, z: 60 + i, glow: last && isEight(c) ? k.colours.gold : null });
		});
		k.marks.push({ x: stockAt.x, y: stockAt.y + k.ch * 0.62, text: `Stock · ${s.stock.length}`, kind: 'label' });
		if (s.discard.length && isEight(top(s)) && s.phase !== 'suit') k.marks.push({ x: discardAt.x + k.cw * 1.25, y: discardAt.y, text: String(s.suit), kind: 'trump', caption: 'Called' });
		if (drawing) k.spots.push({ x: stockAt.x - k.cw / 2, y: stockAt.y - k.ch / 2, w: k.cw, h: k.ch, action: 'draw', label: 'Draw a card' });
	},

	plate(s, seat) {
		const tags: string[] = [];
		if (s.dealer === seat) tags.push('Dealer');
		if (s.hands[seat].length === 1 && s.phase !== 'handOver') tags.push('Last card');
		const n = s.hands[seat].length;
		return { score: `${s.scores[seat]}`, sub: `${n} card${n === 1 ? '' : 's'} left`, tags };
	},

	prompt(s, p) {
		if (s.phase === 'handOver' && s.summary) {
			const sm = s.summary;
			return {
				kind: 'summary',
				head: sm.out !== null ? `**${p.names[sm.out]}** ${sm.out === p.viewer && p.names[sm.out] === 'You' ? 'go' : 'goes'} out!` : 'Nobody can move. The hand is blocked',
				items: [0, 1, 2, 3].map((seat) => ({ label: p.names[seat], value: sm.points[seat] ? `+${sm.points[seat]}` : '0', note: `→ ${s.scores[seat]}` })),
				buttons: [{ id: 'next', label: s.winners.length ? 'See the result' : 'Deal again', look: 'go', do: 'next' }]
			};
		}
		if (p.my && s.phase === 'suit') {
			return {
				kind: 'line',
				text: 'Eights are wild. **Name the next suit**',
				buttons: ([0, 1, 2, 3] as Suit[]).map((suit) => ({ id: `suit-${suit}`, label: SUIT_GLYPH[suit], look: 'suit', red: suit === 1 || suit === 3, aria: `Name ${SUIT_NAME[suit]}`, do: { type: 'suit', suit } }))
			};
		}
		if (p.my && s.phase === 'play') {
			const t = top(s);
			const want = isEight(t) ? `the called **${SUIT_NAME[s.suit]}**` : `the **${label(t)}**`;
			const legal = legalEights(s, p.viewer).length;
			const draw = canDraw(s);
			return {
				kind: 'line',
				text: `${legal ? `Match ${want} or play an eight` : `Nothing matches ${want}`}${s.drew ? ` · drawn ${s.drew}` : ''}`,
				buttons: draw ? [{ id: 'draw', label: 'Draw', look: legal ? 'soft' : 'go', do: { type: 'draw' } }] : legal ? [] : [{ id: 'pass', label: 'Pass', look: 'soft', do: { type: 'pass' } }]
			};
		}
		return { kind: 'line', text: p.waiting, muted: true };
	},

	ledger(s, v) {
		return {
			table: seatTable(v, s.history, s.scores, 'low'),
			notes: [`Penalties add up. When anyone reaches ${EIGHTS_TARGET}, the lowest total wins`, 'Eights 50 · court cards 10 · aces 1 · others their number']
		};
	},

	result(s, v) {
		const low = s.scores[s.winners[0]];
		const who = s.winners.map((seat) => v.names[seat]).join(' & ');
		const shared = s.winners.length > 1;
		const kicker = `Someone passed ${EIGHTS_TARGET}`;
		if (v.humans.filter(Boolean).length === 1)
			return v.won
				? { kicker, title: shared ? 'A shared win' : 'You win at eights', body: `You finish on ${s.scores[0]}, the lowest at the table. Pip demands a rematch.` }
				: { kicker, title: `${who} ${shared ? 'share' : 'wins'} it`, body: `They finish on ${low}. You end on ${s.scores[0]}.` };
		return { kicker, title: `${who} ${shared ? 'share' : 'wins'} it`, body: `Lowest total: ${low}.` };
	},

	guide: {
		intro: 'Four players, five cards each. Play one card per turn onto the discard pile, matching its **suit** or its **number**. First to empty their hand ends the hand.',
		cols: [
			{
				title: 'Playing',
				items: [
					'**Eights are wild**: play one on anything and name the next suit.',
					'Can’t or won’t play? Draw from the stock until you can. If the stock runs out, the discard pile is reshuffled.',
					'If nobody can play or draw, the hand is blocked and ends.'
				]
			},
			{
				title: 'Scoring',
				items: ['Cards left in hand are penalty points: eights **50**, court cards 10, aces 1, others their number.', `Totals carry over. When anyone reaches **${EIGHTS_TARGET}**, the lowest total wins.`]
			}
		]
	},

	legal: (s, seat) => legalEights(s, seat),
	tap: (_, card): EightsAction => ({ type: 'play', card }),
	spot: (s, id) => (id === 'draw' && canDraw(s) ? { type: 'draw' } : null),

	react(prev, next, action, seat, fx) {
		if (action.type === 'play') {
			fx.sound('card', fx.pan(seat));
			if (isEight(action.card)) fx.say(seat, 'Crazy eight!', 'call');
			else if (next.hands[seat].length === 1) fx.say(seat, 'Last card!', 'call');
		}
		if (action.type === 'suit') {
			fx.say(seat, `${SUIT_NAME[action.suit][0].toUpperCase()}${SUIT_NAME[action.suit].slice(1)}`, 'call');
			fx.sound('knock');
		}
		if (action.type === 'draw') {
			fx.sound('pass');
			if (next.drew === 3) fx.say(seat, 'Come on…');
		}
		if (action.type === 'pass') fx.say(seat, 'Pass');
		if (next.phase === 'handOver' && prev.phase !== 'handOver' && next.summary) {
			fx.stir();
			if (next.summary.out !== null) fx.say(next.summary.out, 'Out!', 'score');
			if (Math.max(...next.summary.points) >= 50) fx.cheer();
		}
	}
};
