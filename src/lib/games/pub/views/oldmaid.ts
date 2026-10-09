import { QUEEN, card, rankOf, type Card } from '../../kit/cards/deck';
import { sourceOf, type OldMaidAction, type OldMaidState } from '../rules/oldmaid';
import { plural } from './shared';
import type { GameView } from './types';

const byRank = (list: Card[]) => list.slice().sort((a, b) => rankOf(a) - rankOf(b) || a - b);

export const OLD_MAID_VIEW: GameView<OldMaidState> = {
	glyph: { glyph: 'Q', red: false },
	tips: [
		'Old Maid is all luck, so enjoy it. The only skill is a straight face.',
		'Whoever holds the odd queen wants you to draw it. Watch for a hopeful look.',
		'Running out early is safe: once your hand is empty, you can’t lose.'
	],
	lesson: {
		seed: 1,
		concepts: [
			{
				id: 'goal',
				title: 'Don’t be the old maid',
				body: [
					'One queen has been taken out of the deck, so one of the other three queens can never be paired. That’s the **old maid**.',
					'Everyone pairs off their cards and tries to run out. Whoever is left holding the odd queen at the end loses.',
					'I’m Rosie. I’ll pick each card for this game and tell you why. Whatever I suggest glows teal.'
				],
				example: [card(1, QUEEN), card(2, QUEEN), card(3, QUEEN)],
				when: ({ s }) => s.kind === 'oldmaid'
			},
			{
				id: 'pairs',
				title: 'Pairs go down',
				body: ['After the deal, everyone puts down any pairs they hold: two cards of the same rank, any suits.', 'What’s left in your hand are singles, each waiting for its partner.'],
				when: ({ s }) => s.kind === 'oldmaid' && s.phase === 'draw'
			},
			{
				id: 'draw',
				title: 'Drawing',
				body: ({ s, names, viewer }) => {
					if (s.kind !== 'oldmaid') return [];
					return [`On your turn, take one face-down card from ${names[sourceOf(s, viewer)]}, the next player round the table. Tap one of their cards.`, 'If it matches one of yours, the pair goes down. If not, it joins your hand.'];
				},
				when: ({ s, viewer }) => s.kind === 'oldmaid' && s.phase === 'draw' && s.turn === viewer
			},
			{
				id: 'pair',
				title: 'A match',
				body: ['That card matched one of yours, so the pair went straight down. One card closer to safety.'],
				when: ({ s, viewer }) => s.kind === 'oldmaid' && s.last?.seat === viewer && s.last.paired
			},
			{
				id: 'queen',
				title: 'Holding a queen',
				body: [
					'You’ve got a queen. If its partner is still out there, it’ll pair. If not, it’s the old maid.',
					'Either way, keep a straight face. You want the player after you to draw it.'
				],
				when: ({ s, viewer }) => s.kind === 'oldmaid' && s.hands[viewer].some((c) => rankOf(c) === QUEEN)
			},
			{
				id: 'out',
				title: 'Out and safe',
				body: ({ s, names }) => {
					if (s.kind !== 'oldmaid') return [];
					return [`${names[s.out[0]]} has run out of cards, so they’re safe. Play goes on without them.`, 'The last player left holding a card is holding the old maid.'];
				},
				when: ({ s }) => s.kind === 'oldmaid' && s.out.length > 0
			}
		],
		done: (s) => s.kind === 'oldmaid' && (s.phase === 'over' || s.out.length >= 2),
		wrap: {
			title: 'That’s Old Maid!',
			body: ['You’ve drawn, paired off and watched players run out. The game goes on until only the old maid is left.', 'Keep playing this game with me watching, or head back to the bar and deal a real one.']
		}
	},

	layout(s, k) {
		const from = sourceOf(s);
		const drawing = k.input.myTurn && s.phase === 'draw';
		for (let seat = 0; seat < 4; seat++) {
			const list = s.hands[seat];
			const shown = k.input.reveal(seat);
			const target = drawing && seat === from;
			k.hand(seat, list, {
				order: shown ? byRank(list) : list,
				live: target ? () => true : undefined,
				faceUp: s.phase === 'over' ? true : undefined,
				glow: (c) => {
					if (target && k.input.suggested.includes(c)) return k.colours.teal;
					if (s.phase === 'over' && seat === s.loser) return k.colours.red;
					return shown && c === s.drawn && s.last?.seat === seat ? k.colours.green : null;
				}
			});
		}
		for (let seat = 0; seat < 4; seat++) {
			const spot = k.pileSpot(k.input.place(seat));
			s.pairs[seat].forEach((c, i) => {
				const t = Math.floor(i / 2);
				k.put(c, { x: spot.x + (i % 2) * k.cw * 0.12 + Math.min(t, 10) * 2, y: spot.y - Math.min(t, 10) * 2, rot: k.jitter(c, 16), face: true, z: 40 + i, scale: k.pileScale });
			});
		}
		if (drawing) k.marks.push({ x: k.cx, y: k.cy, text: 'Take a card', kind: 'label' });
	},

	deck: () => Array.from({ length: 52 }, (_, i) => i).filter((c) => c !== card(0, QUEEN)),

	plate(s, seat) {
		const n = s.hands[seat].length;
		const tags = s.loser === seat ? ['Old maid'] : s.out.includes(seat) ? ['Safe'] : [];
		return { score: plural(s.pairs[seat].length / 2, 'pair'), sub: n ? plural(n, 'card') : 'out', tags };
	},

	prompt(s, p) {
		const l = s.last;
		const recap = l ? `**${p.names[l.seat]}** drew from ${p.names[l.from]}${l.paired ? ' and made a pair' : ''}${l.out.length ? ` · ${l.out.map((i) => p.names[i]).join(' and ')} ${l.out.length > 1 ? 'are' : 'is'} out` : ''}` : '';
		if (p.my && s.phase === 'draw') return { kind: 'line', text: `${recap ? `${recap} · ` : ''}Take a card from **${p.names[sourceOf(s, p.viewer)]}**` };
		return { kind: 'line', text: recap ? `${recap} · ${p.waiting}` : p.waiting, muted: true };
	},

	ledger(s, v) {
		return {
			rows: [0, 1, 2, 3].map((seat) => ({ label: v.names[seat], value: s.hands[seat].length ? plural(s.hands[seat].length, 'card') : 'out', seat, tag: s.out.includes(seat) ? `${['1st', '2nd', '3rd'][s.out.indexOf(seat)] ?? ''} out` : '' })),
			notes: ['Pair off your cards and run out. Whoever is left with the odd queen loses']
		};
	},

	result(s, v) {
		const loser = s.loser ?? 0;
		const kicker = 'Only the old maid is left';
		if (v.humans.filter(Boolean).length === 1)
			return v.won
				? { kicker, title: 'You’re safe', body: `${v.names[loser]} is left holding the queen. ${s.out[0] === 0 ? 'You were first out, too.' : 'Better them than you.'}` }
				: { kicker, title: 'You’re the old maid', body: 'You’re left holding the lonely queen. Pip can’t stop laughing.' };
		return { kicker, title: `${v.names[loser]} is the old maid`, body: 'Everyone else is safe.' };
	},

	guide: {
		intro: 'One queen is taken out of the deck and the rest dealt out. Pair off your cards and run out. Whoever is left holding the **odd queen** loses.',
		cols: [
			{
				title: 'Playing',
				items: ['Pairs (two cards of a rank) go down straight away.', 'On your turn, tap one of the face-down cards of the next player who still has cards, and take it.', 'If it pairs, it goes down. If not, it joins your hand, which is shuffled so nobody can follow it.']
			},
			{
				title: 'The end',
				items: ['Run out of cards and you’re safe.', 'The last player holding a card has the old maid and loses.']
			}
		]
	},

	legal: (s, seat) => (s.phase === 'draw' && s.turn === seat ? s.hands[sourceOf(s)] : []),
	tap: (_, card): OldMaidAction => ({ type: 'draw', card }),

	react(_prev, next, action, seat, fx) {
		if (action.type !== 'draw' || !next.last) return;
		fx.sound('card', fx.pan(next.last.from));
		if (next.last.paired) fx.say(seat, 'Pair!', 'score');
		for (const o of next.last.out) if (next.phase !== 'over') fx.say(o, 'I’m out!', 'score');
		if (next.phase === 'over' && next.loser !== null) {
			fx.say(next.loser, 'Oh, not again', 'plain');
			fx.cheer();
		}
	}
};
