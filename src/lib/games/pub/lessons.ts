import { CLUBS, DIAMONDS, HEARTS, SPADES, SUIT_NAME, card, type Card } from '../kit/cards/deck';
import type { PubState } from './ai';
import { PASS_NAMES, QUEEN_OF_SPADES, ledSuit, passDir, passTarget } from './rules/hearts';
import { canKnockWith } from './rules/gin';
import { effSuit, ledSuitE } from './rules/euchre';
import { contractOf, ledSuitS, teamTricks } from './rules/spades';
import type { ExtraKind } from './rules/registry';
import type { Difficulty, Variant } from './types';
import { extraLessons } from './views';

export type LessonContext = { s: PubState; viewer: number; names: string[] };

export type Concept = {
	id: string;
	title: string;
	body: string[] | ((ctx: LessonContext) => string[]);
	/** Cards to show as a small example row. */
	example?: Card[];
	when: (ctx: LessonContext) => boolean;
};

export type Lesson = {
	/** Fixed deal so the first hand shows off the ideas. */
	seed: number;
	/** For games where the level changes the rules (patience, blackjack). */
	difficulty?: Difficulty;
	concepts: Concept[];
	/** The guided hand is over. */
	done: (s: PubState) => boolean;
	wrap: { title: string; body: string[] };
};

const c = card;

const BASE_LESSONS: Record<Exclude<Variant, ExtraKind>, Lesson> = {
	cribbage: {
		seed: 1,
		concepts: [
			{
				id: 'goal',
				title: 'Welcome to cribbage',
				body: [
					'Cribbage is a race round the peg board to 121. You score by finding combinations in your cards, at three moments in every hand: the throw, the play and the show.',
					'I’m Rosie. For this hand I’ll pick each move and tell you why. The cards I suggest glow teal: just tap them.'
				],
				when: ({ s }) => s.kind === 'cribbage'
			},
			{
				id: 'values',
				title: 'What scores',
				body: [
					'Fifteen: any cards that add up to 15 score 2. Aces count 1, and jacks, queens and kings count 10.',
					'A pair scores 2. A run of three or more in a row scores 1 per card. Four cards of one suit is a flush, worth 4.',
					'A jack in your hand matching the suit of the starter card is “his nobs”, worth 1.'
				],
				example: [c(HEARTS, 3), c(SPADES, 8), c(CLUBS, 5), c(DIAMONDS, 6), c(SPADES, 7)],
				when: ({ s }) => s.kind === 'cribbage' && s.phase === 'discard'
			},
			{
				id: 'crib',
				title: 'The throw',
				body: ({ s, viewer, names }) => {
					if (s.kind !== 'cribbage') return [];
					const mine = s.dealer === viewer;
					return [
						'You’re dealt six cards. Keep the best four and throw two face down into the crib.',
						`The crib is a bonus hand that belongs to the dealer. ${mine ? 'This hand you’re dealing, so throw cards that still score together' : `This hand ${names[s.dealer]} is dealing, so throw cards that won’t help each other`}.`,
						'Tap the two glowing cards, then Throw to the crib.'
					];
				},
				when: ({ s }) => s.kind === 'cribbage' && s.phase === 'discard'
			},
			{
				id: 'cut',
				title: 'The starter',
				body: [
					'The non-dealer cuts the deck and the dealer turns up the starter card.',
					'The starter counts as a fifth card in both hands and in the crib, so it can turn a weak hand into a good one. If it’s a jack, the dealer pegs 2 for “his heels”.'
				],
				when: ({ s }) => s.kind === 'cribbage' && (s.phase === 'cut' || (s.phase === 'peg' && s.pegged.length === 0))
			},
			{
				id: 'peg',
				title: 'The play',
				body: [
					'Now you take turns laying one card face up and adding it to a running count.',
					'Hit exactly 15 or 31 for 2 points. Playing a card that pairs the last one scores 2, and the last three or more cards forming a run score 1 each.',
					'The count can’t go over 31. If you can’t play, you say “Go” and the other player scores 1 for the last card.'
				],
				when: ({ s }) => s.kind === 'cribbage' && s.phase === 'peg'
			},
			{
				id: 'go',
				title: 'Go!',
				body: ({ s, names }) => {
					if (s.kind !== 'cribbage' || s.go === null) return [];
					return [
						`${names[s.go]} couldn’t play without passing 31, so they said Go.`,
						'The other player lays any cards they still can, then pegs 1 for the last card. The count starts again from zero.'
					];
				},
				when: ({ s }) => s.kind === 'cribbage' && s.go !== null
			},
			{
				id: 'show',
				title: 'The show',
				body: [
					'Everyone now counts their four cards plus the starter, using the scores you learned: fifteens, pairs, runs, flushes and his nobs.',
					'The non-dealer counts first, then the dealer, and the dealer counts the crib last. The breakdown appears under the table. Tap Next count to move on.'
				],
				when: ({ s }) => s.kind === 'cribbage' && s.phase === 'show'
			}
		],
		done: (s) => s.kind === 'cribbage' && (s.handNo > 1 || s.winner !== null),
		wrap: {
			title: 'That’s a full hand!',
			body: [
				'You’ve thrown, pegged and counted a whole hand of cribbage. A game is just more of the same, alternating the deal, until someone reaches 121.',
				'Keep playing this game with me watching, or head back to the bar and deal a real one.'
			]
		}
	},
	hearts: {
		seed: 8,
		concepts: [
			{
				id: 'goal',
				title: 'Points are bad',
				body: [
					'Hearts is about avoiding points. Every heart you win costs you 1 point, and the queen of spades costs 13.',
					'When anyone reaches 100, the lowest score wins.',
					'I’m Rosie. For this hand I’ll pick each move and tell you why. The cards I suggest glow teal.'
				],
				example: [c(HEARTS, 12), c(HEARTS, 5), QUEEN_OF_SPADES],
				when: ({ s }) => s.kind === 'hearts'
			},
			{
				id: 'tricks',
				title: 'Tricks',
				body: [
					'Each trick, everyone plays one card. You must follow the suit that was led if you can.',
					'The highest card of the led suit wins the trick and takes every card in it, points and all. Cards of other suits can never win.'
				],
				when: ({ s }) => s.kind === 'hearts'
			},
			{
				id: 'pass',
				title: 'The pass',
				body: ({ s, viewer, names }) => {
					if (s.kind !== 'hearts') return [];
					const dir = passDir(s.handNo);
					return [
						`Before play, everyone passes three cards. This hand they go ${PASS_NAMES[dir]} to ${names[passTarget(viewer, dir)]}.`,
						'Pass your danger: the queen of spades, the ace and king of spades, and high hearts. Tap the three glowing cards, then Pass them.'
					];
				},
				when: ({ s }) => s.kind === 'hearts' && s.phase === 'pass'
			},
			{
				id: 'first',
				title: 'The first trick',
				body: ['Whoever holds the two of clubs leads it. Nobody may throw points on the first trick, so it’s a safe one for everybody.'],
				when: ({ s }) => s.kind === 'hearts' && s.phase === 'play' && s.trickNo === 0
			},
			{
				id: 'void',
				title: 'Out of a suit',
				body: ({ s }) => {
					if (s.kind !== 'hearts') return [];
					const led = ledSuit(s);
					return [
						`You have no ${led === null ? 'cards of that suit' : SUIT_NAME[led]}, so you may play any card at all.`,
						'This is your chance to get rid of the queen of spades or a high heart on someone else’s trick.'
					];
				},
				when: ({ s, viewer }) => {
					if (s.kind !== 'hearts' || s.phase !== 'play' || s.turn !== viewer) return false;
					const led = ledSuit(s);
					return led !== null && !s.hands[viewer].some((x) => Math.floor(x / 13) === led);
				}
			},
			{
				id: 'broken',
				title: 'Hearts are broken',
				body: ['Someone has thrown a heart, so from now on hearts may be led. Until that happens, nobody may lead one.'],
				when: ({ s }) => s.kind === 'hearts' && s.phase === 'play' && s.heartsBroken
			},
			{
				id: 'queen',
				title: 'The black lady',
				body: ['The queen of spades has fallen. Whoever won that trick takes her 13 points.'],
				when: ({ s }) => s.kind === 'hearts' && s.played.some((p) => p.card === QUEEN_OF_SPADES)
			},
			{
				id: 'tally',
				title: 'Counting up',
				body: [
					'After all 13 tricks, everyone adds up the points in the tricks they won.',
					'Shooting the moon: if one player takes every heart and the queen, they score 0 and everyone else gets 26. A big gamble.'
				],
				when: ({ s }) => s.kind === 'hearts' && s.phase === 'handOver'
			}
		],
		done: (s) => s.kind === 'hearts' && (s.phase === 'handOver' || s.handNo > 1),
		wrap: {
			title: 'That’s a full hand!',
			body: [
				'You’ve passed, ducked and dumped your way through a hand of Hearts. Keep going until someone passes 100; lowest score wins.',
				'Keep playing this game with me watching, or head back to the bar and deal a real one.'
			]
		}
	},
	gin: {
		seed: 182,
		concepts: [
			{
				id: 'goal',
				title: 'Melds and deadwood',
				body: [
					'Gin rummy is about arranging your ten cards into melds. A set is three or four of the same rank. A run is three or more in a row of the same suit, with aces low.',
					'Anything not in a meld is deadwood. Face cards count 10, aces 1, and the rest their number. You want as little deadwood as possible.',
					'I’m Rosie. For this hand I’ll pick each move and tell you why. Whatever I suggest glows teal.'
				],
				example: [c(CLUBS, 5), c(DIAMONDS, 5), c(SPADES, 5), c(HEARTS, 2), c(HEARTS, 3), c(HEARTS, 4)],
				when: ({ s }) => s.kind === 'gin'
			},
			{
				id: 'grouping',
				title: 'Your hand',
				body: ['Your melds are grouped at the left of your hand, with the loose cards after them. Your deadwood total shows on your name plate.'],
				when: ({ s }) => s.kind === 'gin'
			},
			{
				id: 'upcard',
				title: 'The first upcard',
				body: ['One card starts the discard pile. The non-dealer may take it first, then the dealer. If both pass, the non-dealer draws from the stock instead.'],
				when: ({ s }) => s.kind === 'gin' && s.phase === 'firstUp'
			},
			{
				id: 'turn',
				title: 'Each turn',
				body: [
					'Draw one card: the top of the face-down stock, or the top discard (everyone sees you take that).',
					'Then throw one card face up onto the discard pile. You can’t throw straight back a card you just took from it.'
				],
				when: ({ s }) => s.kind === 'gin' && s.phase === 'draw'
			},
			{
				id: 'throw',
				title: 'Throwing',
				body: ['Throw a card that doesn’t fit your melds. High cards first, so you aren’t caught holding lots of points.'],
				when: ({ s, viewer }) => s.kind === 'gin' && s.phase === 'discard' && s.turn === viewer
			},
			{
				id: 'knock',
				title: 'Knocking',
				body: [
					'When your deadwood is 10 or less, you may knock: end the hand by throwing your last card face down.',
					'Your opponent shows their melds and may add their loose cards to yours. If they still have more deadwood, you score the difference. If they tie or beat you, it’s an undercut and they get a 25 bonus.',
					'No deadwood at all is gin: a 25-point bonus, and no laying off.'
				],
				when: ({ s, viewer }) => s.kind === 'gin' && s.phase === 'discard' && s.turn === viewer && s.hands[viewer].some((x) => canKnockWith(s, x))
			},
			{
				id: 'tally',
				title: 'Scoring',
				body: ['A hand is worth the difference in deadwood plus any bonus. First to 100 wins the game, with extra bonuses for every hand won.'],
				when: ({ s }) => s.kind === 'gin' && s.phase === 'handOver'
			}
		],
		done: (s) => s.kind === 'gin' && (s.phase === 'handOver' || s.phase === 'over' || s.handNo > 1),
		wrap: {
			title: 'That’s a full hand!',
			body: [
				'You’ve drawn, melded and finished a hand of gin rummy. A game keeps going until someone reaches 100.',
				'Keep playing this game with me watching, or head back to the bar and deal a real one.'
			]
		}
	},
	euchre: {
		seed: 89,
		concepts: [
			{
				id: 'goal',
				title: 'Partners and tricks',
				body: ({ names, viewer }) => [
					`Euchre is played in two teams of two. ${names[(viewer + 2) % 4]} sits across from you and is your partner.`,
					'Only nines, tens, jacks, queens, kings and aces are used. Each hand is five tricks, and the team that picks trump needs at least three.',
					'I’m Rosie. For this hand I’ll pick each move and tell you why. Whatever I suggest glows teal.'
				],
				when: ({ s }) => s.kind === 'euchre'
			},
			{
				id: 'trump',
				title: 'Trump and the bowers',
				body: [
					'The trump suit beats every other suit. Its highest card is the jack of trump, the right bower. Next is the other jack of the same colour, the left bower, which counts as trump.',
					'After them come the ace, king, queen, ten and nine of trump. Here, with hearts as trump: right bower, left bower, ace.'
				],
				example: [c(HEARTS, 9), c(DIAMONDS, 9), c(HEARTS, 12)],
				when: ({ s }) => s.kind === 'euchre'
			},
			{
				id: 'farmer',
				title: 'Farmer’s hand',
				body: ['House rule: with three or more nines and tens, you may swap three of them for the three hidden kitty cards before bidding starts.'],
				when: ({ s, viewer }) => s.kind === 'euchre' && s.phase === 'farmer' && s.turn === viewer
			},
			{
				id: 'bid1',
				title: 'Bidding, round one',
				body: [
					'The top kitty card is turned up. Going round the table, each player may order it up, making that suit trump; the dealer adds the card to their hand and buries one.',
					'Order up when you’d hold about three trumps, or two with a bower and an ace. Otherwise, pass.'
				],
				when: ({ s }) => s.kind === 'euchre' && s.phase === 'bid1'
			},
			{
				id: 'bid2',
				title: 'Round two',
				body: ({ s }) => [
					'Everyone passed, so the upcard is turned down. Now anyone may name a different suit as trump, or pass again.',
					s.kind === 'euchre' && s.stick ? 'If it comes back round to the dealer, they’re stuck and must name one.' : 'If everyone passes again, the hand is thrown in.'
				],
				when: ({ s }) => s.kind === 'euchre' && s.phase === 'bid2'
			},
			{
				id: 'alone',
				title: 'Going alone',
				body: ({ s, names }) => [
					`${s.kind === 'euchre' && s.maker !== null ? names[s.maker] : 'The maker'} is going alone, so their partner sits out.`,
					'A loner who takes all five tricks scores 4. Three or four still scores 1. If they’re euchred, the other side scores 2.'
				],
				when: ({ s }) => s.kind === 'euchre' && s.alone
			},
			{
				id: 'play',
				title: 'The play',
				body: [
					'Follow the suit led if you can; remember, the left bower counts as trump, not its own suit. If you can’t follow, you may trump in or throw anything.',
					'The highest trump wins the trick. With no trump played, the highest card of the led suit wins.'
				],
				when: ({ s }) => s.kind === 'euchre' && s.phase === 'play'
			},
			{
				id: 'lead',
				title: 'Following trump',
				body: ({ s }) => {
					if (s.kind !== 'euchre' || s.trump === null) return [];
					return [`Trump was led, so everyone must play a ${SUIT_NAME[s.trump].slice(0, -1)} if they can, and the left bower counts as one.`];
				},
				when: ({ s }) => s.kind === 'euchre' && s.phase === 'play' && s.trump !== null && ledSuitE(s) === s.trump && s.trick.some((x) => x !== null && effSuit(x, s.trump) === s.trump)
			},
			{
				id: 'tally',
				title: 'Scoring',
				body: ({ s }) => [
					'Makers who take three or four tricks score 1, and all five (a march) scores 2. If the makers take fewer than three, they’re euchred and the defenders score 2.',
					`The first team to ${s.kind === 'euchre' ? s.target : 10} wins.`
				],
				when: ({ s }) => s.kind === 'euchre' && s.phase === 'handOver'
			}
		],
		done: (s) => s.kind === 'euchre' && (s.phase === 'handOver' || s.handNo > 1),
		wrap: {
			title: 'That’s a full hand!',
			body: [
				'You’ve bid, followed suit and scored a hand of euchre with your partner. Keep dealing until a team reaches the target.',
				'Keep playing this game with me watching, or head back to the bar and deal a real one.'
			]
		}
	},
	spades: {
		seed: 1,
		concepts: [
			{
				id: 'goal',
				title: 'Partners and tricks',
				body: ({ names, viewer }) => [
					`Spades is played in two teams of two. ${names[(viewer + 2) % 4]} sits across from you and is your partner.`,
					'Everyone gets 13 cards and plays one card to each of 13 tricks. Before play, each team promises how many tricks it will take, then tries to take exactly that many.',
					'I’m Rosie. For this hand I’ll pick each move and tell you why. Whatever I suggest glows teal.'
				],
				when: ({ s }) => s.kind === 'spades'
			},
			{
				id: 'trump',
				title: 'Spades are trump',
				body: [
					'Follow the suit that was led if you can. The highest card of that suit wins the trick.',
					'But spades are always trump: any spade beats any card of another suit. Here the little two of spades beats the ace of hearts.'
				],
				example: [c(HEARTS, 12), c(HEARTS, 9), c(SPADES, 0)],
				when: ({ s }) => s.kind === 'spades'
			},
			{
				id: 'bid',
				title: 'Bidding',
				body: ({ s, viewer, names }) => [
					'Each player bids the number of tricks they expect to win. Your bid and your partner’s add up to your side’s contract.',
					'Count aces and kings in short suits, high spades, extra spades beyond three, and suits you have none of (you can trump those).',
					s.kind === 'spades' && s.bids[(viewer + 2) % 4] !== null ? `${names[(viewer + 2) % 4]} has already bid ${s.bids[(viewer + 2) % 4]}. Tap the glowing number below.` : 'Tap the glowing number below.'
				],
				when: ({ s, viewer }) => s.kind === 'spades' && s.phase === 'bid' && s.turn === viewer
			},
			{
				id: 'nil',
				title: 'Nil',
				body: ({ s, names }) => {
					if (s.kind !== 'spades') return [];
					const who = s.bids.findIndex((b) => b === 0);
					return [
						`${names[who]} bid nil: a promise to take no tricks at all. It scores 100 if they manage it, and costs 100 if they take even one.`,
						who % 2 === 0 ? 'When your partner bids nil, help them: win tricks so they can play low safely.' : 'When an opponent bids nil, try to leave them winning a trick: play low under their cards.'
					];
				},
				when: ({ s }) => s.kind === 'spades' && s.bids.some((b) => b === 0)
			},
			{
				id: 'lead',
				title: 'The play',
				body: ({ s, names }) => [
					`${s.kind === 'spades' ? names[s.leader] : 'The player left of the dealer'} leads the first trick. After that, whoever wins a trick leads the next.`,
					'Nobody may lead a spade until a spade has been played on another suit (spades are “broken”), unless they hold nothing but spades.'
				],
				when: ({ s }) => s.kind === 'spades' && s.phase === 'play' && s.trickNo === 0
			},
			{
				id: 'void',
				title: 'Trumping in',
				body: ({ s }) => {
					if (s.kind !== 'spades') return [];
					const led = ledSuitS(s);
					return [
						`You have no ${led === null ? 'cards of that suit' : SUIT_NAME[led]}, so you may play anything. A spade will win the trick, unless someone plays a higher spade.`,
						'If your side doesn’t need the trick, throw away a low card from another suit instead.'
					];
				},
				when: ({ s, viewer }) => {
					if (s.kind !== 'spades' || s.phase !== 'play' || s.turn !== viewer) return false;
					const led = ledSuitS(s);
					return led !== null && led !== SPADES && !s.hands[viewer].some((x) => Math.floor(x / 13) === led) && s.hands[viewer].some((x) => Math.floor(x / 13) === SPADES);
				}
			},
			{
				id: 'broken',
				title: 'Spades are broken',
				body: ['Someone has trumped with a spade, so from now on spades may be led too.'],
				when: ({ s }) => s.kind === 'spades' && s.phase === 'play' && s.spadesBroken
			},
			{
				id: 'bags',
				title: 'Bags',
				body: [
					'Your side has taken enough tricks to make its contract. Every extra trick from here is a “bag”: it scores 1 point now, but every ten bags you collect cost 100.',
					'So now you’re trying to lose tricks: play low and let the others win.'
				],
				when: ({ s, viewer }) => s.kind === 'spades' && s.phase === 'play' && contractOf(s, viewer % 2) > 0 && teamTricks(s, viewer % 2) >= contractOf(s, viewer % 2) && s.trickNo < 13
			},
			{
				id: 'tally',
				title: 'Scoring',
				body: ({ s }) => [
					'Make your contract and you score 10 per trick bid, plus 1 per bag. Fall short and you lose 10 per trick bid.',
					`A made nil is worth 100, a broken one costs 100. The first side to ${s.kind === 'spades' ? s.target : 300} wins.`
				],
				when: ({ s }) => s.kind === 'spades' && s.phase === 'handOver'
			}
		],
		done: (s) => s.kind === 'spades' && (s.phase === 'handOver' || s.handNo > 1),
		wrap: {
			title: 'That’s a full hand!',
			body: [
				'You’ve bid, trumped and scored a hand of spades with your partner. Keep dealing until a side reaches 300.',
				'Keep playing this game with me watching, or head back to the bar and deal a real one.'
			]
		}
	}
};

export const LESSONS: Record<Variant, Lesson> = { ...BASE_LESSONS, ...extraLessons() };

export function conceptBody(concept: Concept, ctx: LessonContext) {
	return typeof concept.body === 'function' ? concept.body(ctx) : concept.body;
}
