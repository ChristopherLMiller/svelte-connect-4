import type { ExtraKind } from '../rules/registry';
import type { Variant } from '../types';
import { extraTips } from '../views';

/** Things Rosie mentions while someone else is playing. */
const BASE_TIPS: Record<Exclude<Variant, ExtraKind>, string[]> = {
	cribbage: [
		'Watch the count: leaving it at 5 or 21 hands your opponent an easy 2.',
		'Fives are gold in cribbage, because so many cards are worth ten.',
		'Cards close in rank stay together well: runs score a point per card.',
		'When it’s not your crib, don’t throw it fives or pairs.',
		'In the play, pairing the last card scores 2, and three of a kind scores 6.',
		'The non-dealer counts first at the show, which can win a close game.'
	],
	hearts: [
		'Watch who runs out of a suit: they can dump points on you when it’s led.',
		'Once the queen of spades has fallen, high spades are safe to hold.',
		'Low cards let you duck under tricks. Save a few for the end of the hand.',
		'A trick with no points in it is harmless to win, and gives you the lead.',
		'If someone is taking every heart, take one yourself to stop them shooting the moon.'
	],
	gin: [
		'Every card your opponent takes from the discard pile tells you what they’re collecting.',
		'Throw high deadwood early: the longer you hold a king, the more it can cost you.',
		'A card your opponent just threw is usually safe to throw too.',
		'Knocking early with a few points often beats waiting for gin.',
		'Cards that could join two different melds are worth keeping.'
	],
	euchre: [
		'There are only seven trumps in play: count them as they fall.',
		'If your partner is already winning a trick, don’t spend a good card on it.',
		'The left bower is the jack the same colour as trump, and it counts as trump.',
		'As the maker, leading trump pulls the other team’s trumps out early.',
		'An ace outside trump is a good lead early in the hand, before anyone runs out of the suit.'
	],
	spades: [
		'Spades are always trump: even the two of spades beats an ace of another suit.',
		'Count your bid from aces, high spades and empty suits you can trump.',
		'Once your side has made its bid, duck: every extra trick is a bag, and ten bags cost 100.',
		'If an opponent bid nil, play low under them and leave them stuck winning the trick.',
		'If your partner bid nil, win tricks for them: play high so they can play low safely.',
		'Spades can’t be led until someone has trumped with one, unless you hold nothing else.'
	]
};

export const TIPS: Record<Variant, string[]> = { ...BASE_TIPS, ...extraTips() };
