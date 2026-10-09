import { SUIT_NAME, SUITS, sortHand, suitOf } from '../../kit/cards/deck';
import { OH_HELL_HANDS, bidOptions, handSize, hookBid, legalOhHell, powerO, trumpOf, type OhHellAction, type OhHellState } from '../rules/ohhell';
import { layTrick, layWonTricks, numberButtons, plural, seatTable } from './shared';
import type { GameView } from './types';

export const OH_HELL_VIEW: GameView<OhHellState> = {
	glyph: { glyph: '7', red: true },
	tips: [
		'Only an exact bid scores, so a bid of zero you make beats a bid of three you miss.',
		'Once you have your tricks, get rid of your high cards on tricks someone else is already winning.',
		'Watch the dealer: they bid last and can never make the bids add up.',
		'A small trump is a trick waiting to happen once a suit runs out.',
		'In the one-card hand, an ace or a high trump is about the only sure trick.'
	],
	lesson: {
		seed: 1,
		concepts: [
			{
				id: 'goal',
				title: 'Exactly right',
				body: [
					'Oh Hell is a trick-taking game where the trick is precision. Each hand, everyone bids exactly how many tricks they’ll win.',
					'Make your bid exactly and you score 10 plus the bid. One trick too many or too few and you score nothing.',
					'I’m Rosie. For this hand I’ll pick each move and tell you why. Whatever I suggest glows teal.'
				],
				when: ({ s }) => s.kind === 'ohhell'
			},
			{
				id: 'trump',
				title: 'The turned-up card',
				body: ({ s }) => {
					if (s.kind !== 'ohhell') return [];
					return [
						`After the deal, the next card is turned face up. It’s a ${SUIT_NAME[trumpOf(s)]} card, so ${SUIT_NAME[trumpOf(s)]} are trump this hand: any of them beats any card of another suit.`,
						`The hands get smaller as the night goes on: seven cards now, then six, down to a single card in the last hand.`
					];
				},
				when: ({ s }) => s.kind === 'ohhell' && s.phase === 'bid'
			},
			{
				id: 'bid',
				title: 'Bidding',
				body: [
					'Count the cards likely to win a trick: aces, high trumps, and small trumps for when a suit runs out.',
					'Then bid that many. A careful zero is a fine bid: you just have to duck every trick.',
					'Tap the glowing number below.'
				],
				when: ({ s, viewer }) => s.kind === 'ohhell' && s.phase === 'bid' && s.turn === viewer
			},
			{
				id: 'hook',
				title: 'The hook',
				body: ({ s, names, viewer }) => {
					if (s.kind !== 'ohhell') return [];
					const hook = hookBid(s);
					const who = s.dealer === viewer ? 'You’re' : `${names[s.dealer]} is`;
					return [
						`${who} the dealer, so bids last, with one restriction: the bids can’t add up to the number of tricks.${hook !== null ? ` That rules out a bid of ${hook} this time.` : ''}`,
						'That way somebody at the table is always going to miss. Oh hell!'
					];
				},
				when: ({ s }) => s.kind === 'ohhell' && s.phase === 'bid' && s.turn === s.dealer
			},
			{
				id: 'lead',
				title: 'The play',
				body: [
					'The player left of the dealer leads. Everyone must follow the suit led if they can.',
					'The highest card of that suit wins, unless someone who has run out plays a trump. The winner leads the next trick.'
				],
				when: ({ s }) => s.kind === 'ohhell' && s.phase === 'play' && s.trickNo === 0
			},
			{
				id: 'void',
				title: 'Out of a suit',
				body: [
					'You can’t follow suit, so you may play anything. A trump would win the trick, if nobody plays a higher one.',
					'Whether you want the trick depends on your bid: if you still need tricks, trump it. If you don’t, throw away something you’d rather not win with later.'
				],
				when: ({ s, viewer }) => {
					if (s.kind !== 'ohhell' || s.phase !== 'play' || s.turn !== viewer) return false;
					const lead = s.trick[s.leader];
					if (lead === null) return false;
					return !s.hands[viewer].some((c) => suitOf(c) === suitOf(lead));
				}
			},
			{
				id: 'made',
				title: 'You’ve made it',
				body: [
					'You’ve won exactly the tricks you bid. Now every trick you win spoils it.',
					'So switch to ducking: play under the winning card, and throw away your highest cards whenever you can’t follow suit.'
				],
				when: ({ s, viewer }) => s.kind === 'ohhell' && s.phase === 'play' && s.bids[viewer] !== null && s.tricks[viewer] === s.bids[viewer] && s.trickNo < handSize(s.handNo)
			},
			{
				id: 'tally',
				title: 'Scoring',
				body: ['Everyone who took exactly their bid scores 10 plus the bid. Everyone else scores nothing this hand.', 'After seven hands, the highest total wins.'],
				when: ({ s }) => s.kind === 'ohhell' && s.phase === 'handOver'
			}
		],
		done: (s) => s.kind === 'ohhell' && (s.phase === 'handOver' || s.handNo > 1),
		wrap: {
			title: 'That’s a hand of Oh Hell!',
			body: ['You’ve bid, played and scored a hand. Six more to go, each one card shorter.', 'Keep playing this game with me watching, or head back to the bar and deal a real one.']
		}
	},

	layout(s, k) {
		const trump = trumpOf(s);
		const order = [trump, ...SUITS.filter((x) => x !== trump)];
		for (let seat = 0; seat < 4; seat++) {
			const list = s.hands[seat];
			k.hand(seat, list, { order: k.input.reveal(seat) ? sortHand(list, { suitOrder: order }) : list });
		}
		layTrick(k, s);
		layWonTricks(k, s.played, s.trickNo, (c, led) => powerO(c, led, trump));
		const up = { x: k.cx + k.cw * 1.7, y: k.cy };
		k.put(s.upcard, { ...up, rot: 6, face: true, z: 30, scale: 0.7, glow: s.phase === 'bid' ? 'rgba(255, 196, 92, 0.6)' : null });
		k.marks.push({ x: up.x, y: up.y + k.ch * 0.45, text: `Trump · ${SUIT_NAME[trump]}`, kind: 'label' });
	},

	deck: () => Array.from({ length: 52 }, (_, i) => i),

	plate(s, seat) {
		const tags: string[] = [];
		if (s.dealer === seat) tags.push('Dealer');
		const bid = s.bids[seat];
		if (bid !== null && s.phase !== 'bid' && s.tricks[seat] > bid) tags.push('Over');
		else if (bid !== null && s.phase !== 'bid' && s.tricks[seat] === bid) tags.push('Spot on');
		return { score: `${s.scores[seat]}`, sub: bid === null ? 'points' : `took ${s.tricks[seat]} of ${bid}`, tags };
	},

	prompt(s, p) {
		if (s.phase === 'handOver' && s.summary) {
			const sm = s.summary;
			return {
				kind: 'summary',
				head: `Hand ${s.handNo} of ${OH_HELL_HANDS} is in`,
				items: [0, 1, 2, 3].map((seat) => ({
					label: p.names[seat],
					value: sm.made[seat] ? `+${sm.points[seat]}` : '0',
					note: `${s.tricks[seat]} of ${s.bids[seat]} → ${s.scores[seat]}`
				})),
				buttons: [{ id: 'next', label: s.winners.length ? 'See the result' : 'Deal again', look: 'go', do: 'next' }]
			};
		}
		if (p.my && s.phase === 'bid') {
			const n = handSize(s.handNo);
			const hook = hookBid(s);
			const sum = s.bids.reduce<number>((t, b) => t + (b ?? 0), 0);
			const table = s.bids.some((b) => b !== null) ? ` · bids so far add to **${sum}**` : '';
			return {
				kind: 'line',
				text: `**${plural(n, 'card')}** each, ${SUIT_NAME[trumpOf(s)]} are trump. How many tricks will you take?${table}${hook !== null ? ` · as dealer you can't bid **${hook}**` : ''}`,
				buttons: numberButtons(bidOptions(s), n)
			};
		}
		if (p.my && s.phase === 'play') {
			const lead = s.trick.every((c) => c === null);
			return { kind: 'line', text: `${lead ? 'Your lead' : 'Follow suit if you can'} · you have **${s.tricks[p.viewer]}** of **${s.bids[p.viewer]}**` };
		}
		return { kind: 'line', text: p.waiting, muted: true };
	},

	ledger(s, v) {
		return {
			table: seatTable(v, s.history, s.scores, 'high'),
			notes: [
				s.phase === 'over' ? 'All seven hands played' : `Hand ${s.handNo} of ${OH_HELL_HANDS} · ${plural(handSize(s.handNo), 'card')} each · ${SUIT_NAME[trumpOf(s)]} trump`,
				'Make your bid exactly for 10 plus the bid. Miss by any amount and score nothing'
			]
		};
	},

	result(s, v) {
		const top = s.scores[s.winners[0]];
		const who = s.winners.map((seat) => v.names[seat]).join(' & ');
		const kicker = `After ${OH_HELL_HANDS} hands`;
		const shared = s.winners.length > 1;
		if (v.humans.filter(Boolean).length === 1)
			return v.won
				? { kicker, title: shared ? 'A shared win' : 'You take the night', body: `You finish on ${s.scores[0]}${shared ? `, level with ${s.winners.filter((x) => x !== 0).map((x) => v.names[x]).join(' and ')}` : ''}. Fergus swears he’ll never bid two again.` }
				: { kicker, title: `${who} ${shared ? 'share' : 'takes'} it`, body: `They finish on ${top}. You end on ${s.scores[0]}.` };
		return { kicker, title: `${who} ${shared ? 'share' : 'takes'} it`, body: `Top score ${top}.` };
	},

	guide: {
		intro: 'Four players, each for themselves, over **seven hands**: seven cards each, then six, down to one. Bid exactly how many tricks you’ll take. **Only an exact bid scores.**',
		cols: [
			{
				title: 'Bidding and play',
				items: [
					'After the deal the next card is turned up: its suit is **trump** for the hand.',
					'Everyone bids once, starting left of the dealer. The dealer bids last and may not make the bids add up to the number of tricks (**the hook**), so someone must miss.',
					'Follow suit if you can; otherwise play anything. The highest trump wins, or the highest card of the suit led.'
				]
			},
			{
				title: 'Scoring',
				items: ['Take exactly your bid: **10 plus the bid**. A zero bid made scores 10.', 'Take more or fewer: nothing.', 'Highest total after seven hands wins.']
			}
		]
	},

	legal: (s, seat) => (s.phase === 'play' ? legalOhHell(s, seat) : []),
	tap: (_, card): OhHellAction => ({ type: 'play', card }),

	react(prev, next, action, seat, fx) {
		if (action.type === 'bid') {
			fx.say(seat, `${action.bid}`, 'call');
			fx.sound('knock');
		}
		if (action.type === 'play') fx.sound('card', fx.pan(seat));
		if (next.phase === 'trick' && prev.phase === 'play') {
			const w = next.lastWinner!;
			const led = suitOf(next.trick[next.leader]!);
			const trump = trumpOf(next);
			if (suitOf(next.trick[w]!) === trump && led !== trump) fx.say(w, 'Trumped!', 'score');
			if (next.tricks[w] === next.bids[w]) fx.say(w, 'Oh hell, one too many', 'plain');
		}
		if (next.phase === 'handOver' && prev.phase === 'trick' && next.summary) {
			fx.stir();
			next.summary.made.forEach((made, seat) => made && fx.say(seat, 'Spot on!', 'score'));
			if (next.summary.made.filter(Boolean).length >= 3) fx.cheer();
		}
	}
};