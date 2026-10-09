import { RANK_LABEL, card, rankOf, type Card } from '../../kit/cards/deck';
import { stack } from '../../kit/cards/layout';
import { shownRanks } from '../bots/gofish';
import { RANK_PLURAL } from '../coach/gofish';
import { ranksIn, targetsFor, totalBooks, type FishAsk, type GoFishState } from '../rules/gofish';
import { plural } from './shared';
import type { GameView } from './types';

const byRank = (list: Card[]) => list.slice().sort((a, b) => rankOf(a) - rankOf(b) || a - b);

function told(e: FishAsk, names: string[]) {
	const ask = `**${names[e.seat]}** asked ${names[e.target]} for ${RANK_PLURAL[e.rank]}`;
	if (e.got) return `${ask} and got ${e.got === 1 ? 'one' : e.got}${e.book !== null ? `. A book of ${RANK_PLURAL[e.book]}!` : ''}`;
	return `${ask}: go fish${e.lucky ? `, and drew one. Lucky!` : ''}${!e.lucky && e.book !== null ? `. A book of ${RANK_PLURAL[e.book]}!` : ''}`;
}

export const GO_FISH_VIEW: GameView<GoFishState> = {
	glyph: { glyph: '><>', red: false },
	tips: [
		'When someone asks for a rank, they’re holding at least one. Remember it.',
		'If a player says “go fish” for a rank, don’t ask them for it again until they’ve drawn.',
		'Ask the player with the most cards when you’ve nothing better to go on.',
		'Asking for a rank tells everyone you have it, so the rank you hold three of is the one to ask about.'
	],
	lesson: {
		seed: 1,
		concepts: [
			{
				id: 'goal',
				title: 'Collect books',
				body: [
					'Go Fish is about collecting **books**: all four cards of one rank, like four sevens. Whoever lays down the most books wins.',
					'I’m Rosie. I’ll pick each move for this game and tell you why. Whatever I suggest glows teal.'
				],
				example: [card(0, 5), card(1, 5), card(2, 5), card(3, 5)],
				when: ({ s }) => s.kind === 'gofish'
			},
			{
				id: 'ask',
				title: 'Asking',
				body: [
					'On your turn, ask another player for a rank you already hold. Tap one of those cards, then choose who to ask.',
					'If they have any, they must hand over every one, and you ask again.'
				],
				when: ({ s, viewer }) => s.kind === 'gofish' && s.phase === 'ask' && s.turn === viewer && !s.log.some((e) => e.seat === viewer)
			},
			{
				id: 'fish',
				title: 'Go fish!',
				body: [
					'They had none, so you “go fish”: draw a card from the pond in the middle.',
					'If you happen to draw the rank you asked for, you ask again. Otherwise the turn moves on.'
				],
				when: ({ s, viewer }) => s.kind === 'gofish' && s.log.at(-1)?.seat === viewer && s.log.at(-1)!.fished
			},
			{
				id: 'got',
				title: 'A catch',
				body: ['They had to hand them over. Any time you get what you asked for, you go again.'],
				when: ({ s, viewer }) => s.kind === 'gofish' && s.log.at(-1)?.seat === viewer && s.log.at(-1)!.got > 0
			},
			{
				id: 'memory',
				title: 'Listen to the table',
				body: ({ s, names, viewer }) => {
					if (s.kind !== 'gofish') return [];
					const shown = shownRanks(s);
					const mine = ranksIn(s.hands[viewer]);
					const seat = [1, 2, 3].find((i) => mine.some((r) => shown[i].has(r))) ?? 1;
					const r = mine.find((x) => shown[seat].has(x)) ?? 0;
					return [`${names[seat]} asked for ${RANK_PLURAL[r]} earlier, so they’re holding at least one. You have one too.`, 'Asking them is a sure catch. Remembering who asked for what is the whole skill of Go Fish.'];
				},
				when: ({ s, viewer }) => {
					if (s.kind !== 'gofish' || s.phase !== 'ask' || s.turn !== viewer) return false;
					const shown = shownRanks(s);
					return ranksIn(s.hands[viewer]).some((r) => [1, 2, 3].some((i) => i !== viewer && shown[i].has(r)));
				}
			},
			{
				id: 'book',
				title: 'A book',
				body: ['All four of a rank: that’s a book. It goes down on the table in front of you and counts at the end.', 'If your hand ever runs out, you draw from the pond and carry on.'],
				when: ({ s, viewer }) => s.kind === 'gofish' && s.books[viewer].length > 0
			}
		],
		done: (s) => s.kind === 'gofish' && (s.phase === 'over' || totalBooks(s) >= 6),
		wrap: {
			title: 'You’ve got the hang of Go Fish!',
			body: ['You’ve asked, fished and made a book. The game runs until all thirteen books are down.', 'Keep playing this game with me watching, or head back to the bar and deal a real one.']
		}
	},

	layout(s, k) {
		const last = s.log.at(-1);
		for (let seat = 0; seat < 4; seat++) {
			const list = s.hands[seat];
			const shown = k.input.reveal(seat);
			k.hand(seat, list, {
				order: shown ? byRank(list) : list,
				glow: (c) => {
					if (!shown || !last || last.seat !== seat) return null;
					if (c === s.drawn) return k.colours.green;
					return last.got && rankOf(c) === last.rank ? k.colours.gold : null;
				}
			});
		}
		stack(s.stock.length, k.cx, k.cy, k.cw).forEach((p, i) => k.put(s.stock[i], { ...p, rot: k.jitter(s.stock[i], 30), face: false, z: 10 + i, scale: 0.8 }));
		k.marks.push({ x: k.cx, y: k.cy + k.ch * 0.55, text: s.stock.length ? `Pond · ${s.stock.length}` : 'The pond is empty', kind: 'label' });
		for (let seat = 0; seat < 4; seat++) {
			const spot = k.pileSpot(k.input.place(seat));
			s.books[seat].forEach((r, t) => {
				for (let i = 0; i < 4; i++) {
					k.put(card(i as 0 | 1 | 2 | 3, r), { x: spot.x + (t % 7) * k.cw * 0.26 + i * 2, y: spot.y + Math.floor(t / 7) * k.ch * 0.3 - i * 2, rot: 0, face: true, z: 40 + t * 5 + i, scale: k.pileScale });
				}
			});
		}
	},

	plate(s, seat) {
		const n = s.hands[seat].length;
		const tags = !n && !s.stock.length && s.phase !== 'over' ? ['Out'] : [];
		return { score: plural(s.books[seat].length, 'book'), sub: plural(n, 'card'), tags };
	},

	prompt(s, p) {
		const last = s.log.at(-1);
		const recap = last ? told(last, p.names) : '';
		if (p.my && s.phase === 'ask') {
			const rank = p.selected.length ? rankOf(p.selected[0]) : null;
			return {
				kind: 'line',
				text: rank === null ? `${recap ? `${recap} · ` : ''}Tap a card to choose what to ask for` : `Ask for **${RANK_PLURAL[rank]}**. Who has them?`,
				buttons: targetsFor(s, p.viewer).map((t) => ({
					id: `ask-${t}`,
					label: `Ask ${p.names[t]}`,
					look: 'soft' as const,
					sub: plural(s.hands[t].length, 'card'),
					disabled: rank === null,
					do: { type: 'ask' as const, target: t, rank: rank ?? 0 }
				}))
			};
		}
		return { kind: 'line', text: recap ? `${recap} · ${p.waiting}` : p.waiting, muted: true };
	},

	ledger(s, v) {
		return {
			rows: [0, 1, 2, 3].map((seat) => ({ label: v.names[seat], value: `${s.books[seat].length}`, seat, tag: s.books[seat].map((r) => RANK_LABEL[r]).join(' ') })),
			notes: [`${plural(13 - totalBooks(s), 'book')} still out · ${plural(s.stock.length, 'card')} in the pond`, 'Most books when all thirteen are down wins']
		};
	},

	result(s, v) {
		const most = s.books[s.winners[0]].length;
		const who = s.winners.map((seat) => v.names[seat]).join(' & ');
		const shared = s.winners.length > 1;
		const kicker = 'All thirteen books are down';
		if (v.humans.filter(Boolean).length === 1)
			return v.won
				? { kicker, title: shared ? 'A shared win' : 'You win at Go Fish', body: `You laid down ${plural(s.books[0].length, 'book')}, the most at the table.` }
				: { kicker, title: `${who} ${shared ? 'share' : 'wins'} it`, body: `They made ${plural(most, 'book')}. You made ${s.books[0].length}.` };
		return { kicker, title: `${who} ${shared ? 'share' : 'wins'} it`, body: `${plural(most, 'book')}.` };
	},

	guide: {
		intro: 'Four players, five cards each, the rest face down in the middle as **the pond**. Collect **books** (all four of a rank). Most books wins.',
		cols: [
			{
				title: 'Your turn',
				items: [
					'Tap a card, then ask a player for that rank. You must already hold one.',
					'If they have any, they hand over all of them and you **ask again**.',
					'If not: **go fish**. Draw from the pond. Drawing the rank you asked for earns another turn.'
				]
			},
			{
				title: 'Books and the end',
				items: ['Four of a kind is laid down at once as a book.', 'Run out of cards and you draw one from the pond. Once the pond is empty, you’re out.', 'When all thirteen books are down, the most books wins.']
			}
		]
	},

	legal: (s, seat) => (s.phase === 'ask' && s.turn === seat ? s.hands[seat] : []),
	tap: () => 'select',
	selectMax: () => 1,

	react(_prev, next, action, seat, fx) {
		if (action.type !== 'ask') return;
		const e = next.log.at(-1);
		if (!e) return;
		fx.say(seat, `Any ${RANK_PLURAL[e.rank]}?`, 'call');
		if (e.got) {
			fx.say(e.target, e.got === 1 ? 'Here you go' : `${e.got} of them`, 'plain');
			fx.sound('card', fx.pan(e.target));
		} else {
			fx.say(e.target, 'Go fish!', 'plain');
			fx.sound('pass', fx.pan(seat));
			if (e.lucky) fx.say(seat, 'Lucky!', 'score');
		}
		if (e.book !== null) {
			fx.say(seat, `Book of ${RANK_PLURAL[e.book]}!`, 'score');
			fx.stir();
		}
		if (next.phase === 'over') fx.cheer();
	}
};