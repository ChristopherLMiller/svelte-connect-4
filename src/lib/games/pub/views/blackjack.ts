import { card, type Card } from '../../kit/cards/deck';
import { stack } from '../../kit/cards/layout';
import { playerMove, upValue } from '../bots/blackjack';
import { BJ_BETS, BJ_HANDS, BJ_START, canDouble, canSplit, cardValue, handLabel, total, type BjResult, type BlackjackState } from '../rules/blackjack';
import { plural } from './shared';
import type { GameView, PromptButton } from './types';

const RESULT_WORD: Record<BjResult, string> = { blackjack: 'Blackjack!', win: 'Win', push: 'Push', lose: 'Lose', bust: 'Bust' };
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
const upName = (v: number) => (v === 11 ? 'ace' : v === 10 ? 'ten' : `${v}`);
const payoutText = (p: number) => (p === 1.5 ? '3:2' : '6:5');

export const BLACKJACK_VIEW: GameView<BlackjackState> = {
	glyph: { glyph: '21', red: true },
	tips: [
		'Stand on 12 to 16 when the dealer shows 2 to 6. Let them bust.',
		'Always split aces and eights. Never split tens or fives.',
		'Double down on 11 against anything but an ace.',
		'A soft hand can’t bust on the next card, so it’s a free chance to improve.',
		'No betting system beats the house. Keep your bets steady.'
	],
	lesson: {
		seed: 5,
		difficulty: 'easy',
		concepts: [
			{
				id: 'goal',
				title: 'Twenty-one',
				body: [
					'Blackjack is you against the dealer, Bert. Get closer to 21 than he does without going over.',
					'Number cards count their number, jacks, queens and kings count 10, and an ace is 1 or 11, whichever helps. An ace and a ten-card dealt together is a **blackjack**.',
					'I’m Rosie. I’ll make every call this time and tell you why. Whatever I suggest glows teal.'
				],
				example: [card(3, 12), card(2, 11)],
				when: ({ s }) => s.kind === 'blackjack'
			},
			{
				id: 'bet',
				title: 'Betting',
				body: [`You start with ${BJ_START} chips and play ${BJ_HANDS} hands. Bet before each deal: win and you’re paid even money, a blackjack pays more.`, 'Finish above where you started and you’ve beaten the house.'],
				when: ({ s }) => s.kind === 'blackjack' && s.phase === 'bet'
			},
			{
				id: 'hit',
				title: 'Hit or stand',
				body: ({ s }) => {
					if (s.kind !== 'blackjack' || !s.hands.length) return [];
					return [
						`You have ${handLabel(s.hands[s.active].cards)}. **Hit** to take another card, or **stand** to stop.`,
						`Bert’s face-up card matters most. He shows a ${upName(upValue(s))}. Weak cards (2 to 6) often lead him to bust, so you can stand on less. Against a 7 or higher, you need a real hand.`
					];
				},
				when: ({ s, viewer }) => s.kind === 'blackjack' && s.phase === 'play' && viewer === 0
			},
			{
				id: 'soft',
				title: 'Soft hands',
				body: ['Your ace is counting as 11. That’s a **soft** hand: if the next card would take you over 21, the ace just drops to 1.', 'So a soft hand can’t bust on one card. That makes hitting (or doubling) much safer.'],
				when: ({ s }) => s.kind === 'blackjack' && s.phase === 'play' && total(s.hands[s.active].cards).soft
			},
			{
				id: 'double',
				title: 'Doubling down',
				body: ['When you’re likely to win, **double down**: double your bet and take exactly one more card.', 'It’s best on 10 or 11, when a ten-card would give you 20 or 21.'],
				when: ({ s }) => s.kind === 'blackjack' && s.phase === 'play' && canDouble(s) && playerMove(s).move === 'double'
			},
			{
				id: 'split',
				title: 'Splitting',
				body: ['Two cards of the same value can be **split** into two hands, each with its own bet. Each gets a second card and is played on its own.', 'Always split aces and eights. Never split tens: 20 is too good to break up.'],
				when: ({ s }) => s.kind === 'blackjack' && canSplit(s)
			},
			{
				id: 'dealer',
				title: 'Bert’s rule',
				body: ({ s }) => {
					if (s.kind !== 'blackjack') return [];
					return [`Bert has no choices. He must draw until he reaches 17, and ${s.rules.hitSoft17 ? 'he draws on a soft 17 too' : 'he stands on any 17, even a soft one'}.`, 'That’s why his face-up card tells you so much about where he’ll end up.'];
				},
				when: ({ s }) => s.kind === 'blackjack' && (s.phase === 'dealer' || (s.phase === 'handOver' && s.dealer.length > 2))
			}
		],
		done: (s) => s.kind === 'blackjack' && (s.phase === 'over' || s.handNo > 4),
		wrap: {
			title: 'That’s Blackjack!',
			body: ['You’ve bet, hit, stood and watched Bert follow his rule. Play out the ten hands and see if you can finish ahead.', 'Keep playing this game with me watching, or head back to the bar and deal a real one.']
		}
	},

	cardWidth: (w, h) => Math.max(40, Math.min(w / 6.4, h / 5, 118)),
	deck: () => Array.from({ length: 104 }, (_, i) => i),

	layout(s, k) {
		const shoeAt = { x: k.w - k.cw * 0.8, y: k.cy - k.ch * 0.8 };
		const usedAt = { x: k.cw * 0.8, y: k.cy - k.ch * 0.8 };
		stack(Math.min(s.shoe.length, 30), shoeAt.x, shoeAt.y, k.cw).forEach((p, i, arr) => {
			for (let j = Math.floor((i * s.shoe.length) / arr.length); j < Math.floor(((i + 1) * s.shoe.length) / arr.length); j++) k.put(s.shoe[j], { ...p, face: false, z: 10 + i, scale: 0.8 });
		});
		s.used.forEach((c, i) => k.put(c, { x: usedAt.x + k.jitter(c, 6), y: usedAt.y + k.jitter(c + 3, 6), rot: 90 + k.jitter(c, 8), face: false, z: 10 + Math.min(i, 60), scale: 0.8 }));
		k.marks.push({ x: shoeAt.x, y: shoeAt.y + k.ch * 0.52, text: `Shoe · ${s.shoe.length}`, kind: 'label' });

		const step = k.cw * 0.36;
		const row = (cards: Card[], x: number, y: number, z: number, faceOf: (i: number) => boolean, glow: string | null) => {
			const x0 = x - ((cards.length - 1) * step) / 2;
			cards.forEach((c, i) => k.put(c, { x: x0 + i * step, y: y - i * 2, rot: 0, face: faceOf(i), z: z + i, glow }));
		};

		const dealerY = k.cy - k.ch * 0.75;
		row(s.dealer, k.cx, dealerY, 60, (i) => i === 0 || s.holeShown, null);
		if (s.dealer.length) {
			const shown = s.holeShown ? handLabel(s.dealer) : `Shows ${upName(cardValue(s.dealer[0]))}`;
			k.marks.push({ x: k.cx, y: dealerY + k.ch * 0.62, text: shown, kind: 'count' });
		}

		const playerY = k.cy + k.ch * 0.65;
		const gap = k.cw * 2.2;
		const chipD = Math.max(20, k.cw * 0.34);
		const you = { x: k.cx + k.cw * 0.6, y: k.h + chipD };
		const house = { x: k.cx, y: -chipD };
		const tower = (id: string, amount: number, x: number, y: number, under: number, from: { x: number; y: number }, lost: boolean, delay = 0) => {
			chipsFor(amount).forEach((value, j) => {
				const level = under + j;
				k.chips.push({
					id: `${id}${j}`,
					value,
					x: lost ? house.x + k.jitter(level, chipD) : x,
					y: lost ? house.y + chipD * 1.6 : y - level * chipD * 0.13,
					z: 10 + level,
					from,
					to: lost ? house : you,
					gone: lost,
					delay: (lost ? 700 : delay) + j * 40
				});
			});
			return under + chipsFor(amount).length;
		};
		s.hands.forEach((h, i) => {
			const x = k.cx + (i - (s.hands.length - 1) / 2) * gap;
			const result = s.summary?.results[i];
			const lost = result === 'lose' || result === 'bust';
			const at = { x: x - k.cw * 0.95, y: playerY + k.ch * 0.62 + 12 };
			const stake = h.doubled ? h.bet / 2 : h.bet;
			const top = tower(`h${i}b`, stake, at.x, at.y, 0, you, lost);
			if (h.doubled) tower(`h${i}d`, stake, at.x, at.y, top, you, lost);
			if (result === 'win' || result === 'blackjack') {
				const paid = result === 'blackjack' ? Math.floor(h.bet * s.rules.payout) : h.bet;
				tower(`h${i}p`, paid, at.x - chipD * 1.1, at.y, 0, house, false, 260);
			}
			const glow = result ? (result === 'win' || result === 'blackjack' ? k.colours.green : result === 'push' ? null : k.colours.red) : s.phase === 'play' && s.hands.length > 1 && i === s.active ? k.colours.gold : null;
			row(h.cards, x, playerY, 120 + i * 20, () => true, glow);
			k.marks.push({ x, y: playerY + k.ch * 0.62, text: handLabel(h.cards, h.split), kind: 'count' });
			k.marks.push({ x, y: playerY + k.ch * 0.62 + 30, text: `Bet ${h.bet}${h.doubled ? ' · doubled' : ''}${result ? ` · ${RESULT_WORD[result]}` : ''}`, kind: 'label' });
		});
	},

	plate(s, seat) {
		if (seat === 1) return { score: 'House', sub: `${s.rules.hitSoft17 ? 'hits' : 'stands on'} soft 17 · ${payoutText(s.rules.payout)}`, tags: ['Dealer'] };
		const diff = s.chips - BJ_START;
		return { score: `${s.chips}`, sub: 'chips', tags: diff > 0 ? [`Up ${diff}`] : diff < 0 ? [`Down ${-diff}`] : [] };
	},

	prompt(s, p) {
		if (s.phase === 'handOver' && s.summary) {
			const sm = s.summary;
			const head = sm.results.includes('blackjack') ? `**Blackjack!** ${signed(sm.net)}` : sm.net > 0 ? `**You win** ${signed(sm.net)}` : sm.net < 0 ? `**Bert wins** ${signed(sm.net)}` : '**Push**: nobody wins';
			const items = s.hands.map((h, i) => ({ label: s.hands.length > 1 ? `Hand ${i + 1}` : 'You', value: RESULT_WORD[sm.results[i]], note: `${handLabel(h.cards, h.split)} · bet ${h.bet}` }));
			items.push({ label: 'Bert', value: sm.dealerBust ? 'Bust' : handLabel(s.dealer), note: `${s.chips} chips left` });
			return { kind: 'summary', head, items, buttons: [{ id: 'next', label: s.handNo >= BJ_HANDS || s.chips < BJ_BETS[0] ? 'See the result' : 'Next hand', look: 'go', do: 'next' }] };
		}
		if (p.my && s.phase === 'bet') {
			return {
				kind: 'line',
				text: `Hand **${s.handNo}** of ${BJ_HANDS} · **${s.chips}** chips. Place your bet`,
				buttons: BJ_BETS.map((b): PromptButton => ({ id: `bet-${b}`, label: `${b}`, look: 'chip', aria: `Bet ${b}`, do: { type: 'bet', amount: b }, disabled: b > s.chips }))
			};
		}
		if (p.my && s.phase === 'play') {
			const h = s.hands[s.active];
			const which = s.hands.length > 1 ? `Hand ${s.active + 1}: ` : '';
			return {
				kind: 'line',
				text: `${which}**${handLabel(h.cards, h.split)}** against Bert’s **${upName(upValue(s))}**`,
				buttons: [
					{ id: 'hit', label: 'Hit', look: 'go', do: { type: 'hit' } },
					{ id: 'stand', label: 'Stand', look: 'soft', do: { type: 'stand' } },
					{ id: 'double', label: 'Double', look: 'gold', do: { type: 'double' }, disabled: !canDouble(s) },
					{ id: 'split', label: 'Split', look: 'gold', do: { type: 'split' }, disabled: !canSplit(s) }
				]
			};
		}
		return { kind: 'line', text: s.phase === 'dealer' ? 'Bert draws to 17…' : p.waiting, muted: true };
	},

	ledger(s) {
		return {
			rows: s.history.map((net, i) => ({ label: `Hand ${i + 1}`, value: signed(net), tag: `${s.totals[i]} chips` })),
			notes: [
				`Dealer ${s.rules.hitSoft17 ? 'hits' : 'stands on'} soft 17 · blackjack pays ${payoutText(s.rules.payout)} · two decks`,
				`Finish ${BJ_HANDS} hands above ${BJ_START} chips to beat the house`
			]
		};
	},

	result(s, v) {
		const diff = s.chips - BJ_START;
		const kicker = s.chips < BJ_BETS[0] ? 'Out of chips' : `After ${BJ_HANDS} hands`;
		if (v.won) return { kicker, title: 'You beat the house', body: `You walk away with ${s.chips} chips, ${diff} up. Bert polishes a glass and says nothing.` };
		if (diff === 0) return { kicker, title: 'Dead level', body: `You finish on exactly ${BJ_START}. Bert counts that as a win for the house.` };
		return { kicker, title: 'The house wins', body: `You finish on ${s.chips} chips, ${plural(-diff, 'chip')} down. It always does in the end.` };
	},

	guide: {
		intro: `You against Bert the dealer. Get closer to **21** than he does without going over. ${BJ_HANDS} hands, ${BJ_START} chips: finish ahead to beat the house.`,
		cols: [
			{
				title: 'Your hand',
				items: [
					'Cards count their number; jacks, queens and kings 10; aces 1 or 11.',
					'**Hit** for another card, **stand** to stop. Over 21 is a bust and loses at once.',
					'**Double**: double your bet on your first two cards and take exactly one more.',
					'**Split** a pair into two hands, each with its own bet. Split aces get one card each.'
				]
			},
			{
				title: 'The house',
				items: [
					'Bert draws until he reaches 17. On Easy he stands on soft 17; on Medium and Hard he hits it.',
					'Wins pay even money. A blackjack (ace and ten-card) pays 3:2, or 6:5 on Hard.',
					'If Bert has blackjack, he shows it at once and takes every bet that isn’t a blackjack.'
				]
			}
		]
	},

	legal: () => [],
	tap: () => null,

	react(prev, next, action, seat, fx) {
		if (action.type === 'bet') {
			fx.sound('chips', chipsFor(action.amount).length);
			fx.sound('deal');
		}
		if (action.type === 'double' || action.type === 'split') fx.sound('chips', chipsFor(prev.hands[prev.active].bet).length);
		if (next.phase === 'handOver' && prev.phase !== 'handOver' && next.summary?.results.some((r) => r !== 'push')) fx.sound('chips', 4);
		if (action.type === 'hit' || action.type === 'double' || action.type === 'split') fx.sound('card', fx.pan(seat));
		if (action.type === 'double') fx.say(0, 'Double!', 'call');
		if (action.type === 'split') fx.say(0, 'Split them', 'call');
		if (seat === 0 && action.type === 'hit') {
			const h = next.hands[prev.active];
			if (h && total(h.cards).sum > 21) fx.say(0, 'Bust!', 'plain');
		}
		if (seat === 1 && action.type === 'hit' && total(next.dealer).sum > 21) fx.say(1, 'Bust', 'plain');
		if (next.phase === 'handOver' && prev.phase !== 'handOver' && next.summary) {
			const sm = next.summary;
			if (sm.results.includes('blackjack')) {
				fx.say(0, 'Blackjack!', 'score');
				fx.cheer();
			} else if (sm.net > 0) {
				fx.say(1, 'Pays you', 'plain');
				fx.stir();
			} else if (sm.net < 0) fx.say(1, isDealerBj(next) ? 'Blackjack' : 'House wins', 'plain');
		}
	}
};

const isDealerBj = (s: BlackjackState) => s.dealer.length === 2 && total(s.dealer).sum === 21;

const DENOMS = [50, 25, 10, 5, 1];

/** Fewest chips that make up an amount, biggest at the bottom of the stack. */
function chipsFor(amount: number) {
	const out: number[] = [];
	let left = amount;
	for (const d of DENOMS) {
		while (left >= d) {
			out.push(d);
			left -= d;
		}
	}
	return out;
}
