import { SUIT_GLYPH, SUIT_NAME, SUITS, card, sortHand, suitOf, type Suit } from '../../kit/cards/deck';
import { PINOCHLE_DECK, PINOCHLE_TARGET, bidOptionsP, isCounter, legalPinochle, meldPoints, mustBid, powerP, rankP, teamOf, type PinochleAction, type PinochleState } from '../rules/pinochle';
import { layTrick, layWonTricks } from './shared';
import type { GameView, PromptButton, ViewCtx } from './types';

const teamName = (v: { names: string[] }, t: number) => `${v.names[t]} & ${v.names[t + 2]}`;
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
const meldCards = (s: PinochleState, seat: number) => [...new Set(s.melds[seat].flatMap((i) => i.cards))];

export const PINOCHLE_VIEW: GameView<PinochleState> = {
	glyph: { glyph: 'Q♠J♦', red: false },
	tips: [
		'Aces, tens and kings are counters: a point each, plus one for the last trick.',
		'Give your partner a counter when they’re sure to win the trick.',
		'You must beat the winning card when you can. Lead aces before they get trumped.',
		'Count your meld, add a few for your tricks and about twelve for your partner. That’s your bid.',
		'Your meld only counts if your side wins at least one trick.'
	],
	lesson: {
		seed: 1,
		concepts: [
			{
				id: 'goal',
				title: 'Partners and a double deck',
				body: [
					'Pinochle is played with partners sitting opposite. The deck is nines up to aces, two of each, 48 cards in all.',
					`Points come from **meld** (combinations in your hand) and **counters** you win in tricks. First side to ${PINOCHLE_TARGET} wins.`,
					'I’m Rosie. I’ll pick each move for this hand and tell you why. Whatever I suggest glows teal.'
				],
				example: [card(3, 12), card(3, 8), card(3, 11), card(3, 10), card(3, 9), card(3, 7)],
				when: ({ s }) => s.kind === 'pinochle'
			},
			{
				id: 'bid',
				title: 'Bidding',
				body: [
					'Everyone bids for the right to name trump. Bids start at 20, and once you pass you’re out of the auction.',
					'The bid is a promise: your side’s meld plus counters must reach it, or you lose the whole bid.'
				],
				when: ({ s, viewer }) => s.kind === 'pinochle' && s.phase === 'bid' && s.turn === viewer
			},
			{
				id: 'trump',
				title: 'Naming trump',
				body: ['You won the bid, so you name trump. Pick the suit that gives the most meld and the longest trump suit.'],
				when: ({ s, viewer }) => s.kind === 'pinochle' && s.phase === 'trump' && s.turn === viewer
			},
			{
				id: 'meld',
				title: 'Meld',
				body: [
					'Everyone shows their meld: a **run** (A-10-K-Q-J of trump) is 15, a **marriage** (K-Q of a suit) 2, or 4 in trump. The **pinochle** (Q♠ and J♦) is 4.',
					'Four aces of different suits score 10, kings 8, queens 6, jacks 4. The nine of trump (the **dix**) is 1.'
				],
				example: [card(2, 10), card(1, 9)],
				when: ({ s }) => s.kind === 'pinochle' && s.phase === 'meld'
			},
			{
				id: 'counters',
				title: 'Counters',
				body: ['Now the tricks. Every ace, ten and king you win is a **counter**, worth a point. The last trick is worth one more.', 'Tens rank just below aces here: A, 10, K, Q, J, 9.'],
				when: ({ s }) => s.kind === 'pinochle' && s.phase === 'play' && s.trickNo === 0
			},
			{
				id: 'head',
				title: 'You must head the trick',
				body: ['Pinochle is strict. Follow suit if you can, **and beat the winning card** if you can. If you can’t follow, you must trump.', 'Only the cards you’re allowed to play are lit.'],
				when: ({ s, viewer }) => s.kind === 'pinochle' && s.phase === 'play' && s.turn === viewer && s.trick[s.leader] !== null && legalPinochle(s, viewer).length < s.hands[viewer].length
			},
			{
				id: 'smear',
				title: 'Feeding your partner',
				body: ({ s, names, viewer }) => (s.kind === 'pinochle' ? [`${names[(viewer + 2) % 4]} is winning this trick. Throw them a counter (an ace, ten or king) to add a point for your side.`] : []),
				when: ({ s, viewer }) => {
					if (s.kind !== 'pinochle' || s.phase !== 'play' || s.turn !== viewer || s.trick[s.leader] === null) return false;
					const lead = s.trick[s.leader]!;
					let w = s.leader;
					for (let i = 0; i < 4; i++) {
						const c = s.trick[i];
						if (c !== null && powerP(c, suitOf(lead), s.trump) > powerP(s.trick[w]!, suitOf(lead), s.trump)) w = i;
					}
					return teamOf(w) === teamOf(viewer) && legalPinochle(s, viewer).some(isCounter);
				}
			},
			{
				id: 'tally',
				title: 'Scoring',
				body: ['Each side adds its meld and counters. The bidding side must reach its bid or lose the bid instead.', 'Meld only counts for a side that won at least one trick.'],
				when: ({ s }) => s.kind === 'pinochle' && s.phase === 'handOver'
			}
		],
		done: (s) => s.kind === 'pinochle' && (s.phase === 'handOver' || s.handNo > 1),
		wrap: {
			title: 'That’s a hand of Pinochle!',
			body: [`You’ve bid, melded and played out the tricks. First side to ${PINOCHLE_TARGET} wins.`, 'Keep playing this game with me watching, or head back to the bar and deal a real one.']
		}
	},

	deck: () => PINOCHLE_DECK,

	layout(s, k) {
		const trump = s.trump;
		const order = trump === null ? SUITS : [trump, ...SUITS.filter((x) => x !== trump)];
		const showMeld = s.phase === 'meld';
		for (let seat = 0; seat < 4; seat++) {
			const shown = showMeld ? meldCards(s, seat) : [];
			const list = s.hands[seat].filter((c) => !shown.includes(c));
			k.hand(seat, list, { order: k.input.reveal(seat) ? sortHand(list, { suitOrder: order, key: rankP }) : list });
			if (shown.length) {
				const spot = k.trickSpot(k.input.place(seat));
				const ordered = sortHand(shown, { suitOrder: order, key: rankP });
				const step = k.cw * 0.55 * 0.4;
				const x0 = spot.x - ((ordered.length - 1) * step) / 2;
				ordered.forEach((c, i) => k.put(c, { x: x0 + i * step, y: spot.y, rot: 0, face: true, z: 200 + i, scale: 0.55, glow: k.colours.gold }));
			}
		}
		layTrick(k, s);
		layWonTricks(k, s.played, s.trickNo, (c, led) => powerP(c, led, trump));
		if (trump !== null && !showMeld) k.marks.push({ x: k.cx, y: k.cy, text: String(trump), kind: 'trump' });
	},

	plate(s, seat) {
		const t = teamOf(seat);
		const tags: string[] = [];
		if (s.dealer === seat) tags.push('Dealer');
		if (s.bidder === seat) tags.push(`Bid ${s.high}`);
		const bid = s.bids[seat];
		const sub = s.phase === 'bid' ? (bid === 'pass' ? 'passed' : bid === null ? 'to bid' : `bid ${bid}`) : s.trump !== null ? `meld ${meldPoints(s.melds[seat])}` : 'points';
		return { score: `${s.scores[t]}`, sub, tags };
	},

	prompt(s, p) {
		if (s.phase === 'handOver' && s.summary) {
			const sm = s.summary;
			const bt = teamOf(s.bidder!);
			return {
				kind: 'summary',
				head: `${teamName(p, bt)} ${sm.made ? 'made' : 'went set on'} ${s.high}`,
				items: [0, 1].map((t) => ({ label: teamName(p, t), value: signed(sm.points[t]), note: `meld ${sm.meld[t]} + counters ${sm.counters[t]} → ${s.scores[t]}` })),
				buttons: [{ id: 'next', label: s.winners.length ? 'See the result' : 'Deal again', look: 'go', do: 'next' }]
			};
		}
		if (s.phase === 'meld') {
			return {
				kind: 'summary',
				head: `**${SUIT_NAME[s.trump!]}** are trump · ${p.names[s.bidder!]} bid ${s.high}`,
				items: [0, 1, 2, 3].map((seat) => ({ label: p.names[seat], value: `${meldPoints(s.melds[seat])}`, note: s.melds[seat].map((i) => i.name).join(', ') || 'no meld' })),
				buttons: [{ id: 'next', label: 'Play', look: 'go', do: 'next' }]
			};
		}
		if (p.my && s.phase === 'bid') {
			const forced = mustBid(s);
			const buttons: PromptButton[] = bidOptionsP(s).map((n) => ({ id: `bid-${n}`, label: `${n}`, look: 'num', do: { type: 'bid', bid: n } }));
			if (!forced) buttons.unshift({ id: 'pass', label: 'Pass', look: 'soft', do: { type: 'pass' } });
			return { kind: 'line', text: forced ? 'Everyone passed, so you must bid' : s.high === null ? 'Open the bidding at **20** or more, or pass' : `High bid **${s.high}** (${p.names[s.bids.findIndex((b) => b === s.high)]}). Raise it or pass`, buttons };
		}
		if (p.my && s.phase === 'trump') {
			return {
				kind: 'line',
				text: `You won the bid at **${s.high}**. Name trump`,
				buttons: ([0, 1, 2, 3] as Suit[]).map((suit) => ({ id: `trump-${suit}`, label: SUIT_GLYPH[suit], look: 'suit', red: suit === 1 || suit === 3, aria: `${SUIT_NAME[suit]} trump`, do: { type: 'trump', suit } }))
			};
		}
		if (p.my && s.phase === 'play') {
			const lead = s.trick.every((c) => c === null);
			return { kind: 'line', text: `${lead ? 'Your lead' : 'Follow suit and beat the winning card if you can'} · **${SUIT_NAME[s.trump!]}** trump · ${p.names[s.bidder!]} bid ${s.high}` };
		}
		return { kind: 'line', text: p.waiting, muted: true };
	},

	ledger(s, v: ViewCtx) {
		return {
			table: {
				head: [0, 1].map((t) => ({ text: teamName(v, t), seat: t })),
				rows: s.history.slice(-8).map((row) => row.map(signed)),
				foot: s.scores.map((t) => ({ text: `${t}`, best: s.history.length > 0 && t === Math.max(...s.scores) })),
				empty: 'No hands yet'
			},
			notes: [`First side to ${PINOCHLE_TARGET}`, 'Counters: aces, tens and kings 1 each, last trick 1. The bidding side must make its bid or lose it']
		};
	},

	result(s, v) {
		const w = teamOf(s.winners[0]);
		const kicker = `First to ${PINOCHLE_TARGET}`;
		if (v.humans.filter(Boolean).length === 1) {
			const mine = teamOf(0) === w;
			return mine ? { kicker, title: 'You and Maggie win', body: `${s.scores[w]} to ${s.scores[1 - w]}. Old Tom grumbles about the cards.` } : { kicker, title: `${teamName(v, w)} win it`, body: `${s.scores[w]} to ${s.scores[1 - w]}.` };
		}
		return { kicker, title: `${teamName(v, w)} win it`, body: `${s.scores[w]} to ${s.scores[1 - w]}.` };
	},

	guide: {
		intro: `Partners sit opposite. A 48-card deck: nines to aces, two of each. Bid, show your **meld**, then win **counters** in tricks. First side to **${PINOCHLE_TARGET}**.`,
		cols: [
			{
				title: 'Bid and meld',
				items: [
					'Bid from 20 up, or pass for the rest of the auction. High bidder names trump.',
					'Meld: run (A-10-K-Q-J of trump) **15**, royal marriage 4, marriage 2, pinochle (Q♠ J♦) 4, dix (9 of trump) 1.',
					'Aces around 10, kings 8, queens 6, jacks 4. Doubled: 100, 80, 60, 40. Double run 150, double pinochle 30.'
				]
			},
			{
				title: 'Tricks and scoring',
				items: [
					'Cards rank A, 10, K, Q, J, 9. Of two identical cards, the first played wins.',
					'Follow suit and **beat the winning card** if you can; if you can’t follow, you must trump.',
					'Aces, tens and kings are 1 point each; last trick 1. The bidding side must reach its bid or lose it.'
				]
			}
		]
	},

	legal: (s, seat) => legalPinochle(s, seat),
	tap: (_, c): PinochleAction => ({ type: 'play', card: c }),

	react(prev, next, act, seat, fx) {
		const action = act as PinochleAction;
		if (action.type === 'bid') {
			fx.say(seat, `${action.bid}`, 'call');
			fx.sound('knock');
		}
		if (action.type === 'pass') fx.say(seat, 'Pass');
		if (action.type === 'trump') fx.say(seat, `${SUIT_NAME[action.suit][0].toUpperCase()}${SUIT_NAME[action.suit].slice(1)}`, 'call');
		if (action.type === 'play') fx.sound('card', fx.pan(seat));
		if (next.phase === 'meld' && prev.phase === 'trump') {
			for (let i = 0; i < 4; i++) {
				const m = meldPoints(next.melds[i]);
				if (m >= 15) fx.say(i, `${m} meld`, 'score');
			}
		}
		if (next.phase === 'handOver' && prev.phase === 'trick' && next.summary) {
			fx.stir();
			if (next.winners.length) fx.cheer();
		}
	}
};