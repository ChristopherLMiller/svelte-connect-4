export type Variant =
	| 'cribbage'
	| 'hearts'
	| 'gin'
	| 'euchre'
	| 'spades'
	| 'ohhell'
	| 'eights'
	| 'gofish'
	| 'oldmaid'
	| 'blackjack'
	| 'kings'
	| 'rummy'
	| 'pinochle'
	| 'klondike'
	| 'freecell'
	| 'spider';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Mode = 'ai' | 'local';
/** 0 = bottom, then clockwise: 1 left, 2 top, 3 right. Two-player games use 0 and 1. */
export type Seat = number;

export const VARIANTS: Variant[] = ['cribbage', 'hearts', 'gin', 'euchre', 'spades', 'ohhell', 'eights', 'gofish', 'oldmaid', 'blackjack', 'kings', 'rummy', 'pinochle', 'klondike', 'freecell', 'spider'];
/** Partnership games: seats 0 and 2 against 1 and 3. */
export const PARTNERED: Variant[] = ['euchre', 'spades', 'pinochle'];
/** Games against the house or the deck: no pass-and-play. */
export const SOLO: Variant[] = ['blackjack', 'klondike', 'freecell', 'spider'];
/** One deal is the whole game, so there's no hand count. */
export const ONE_DEAL: Variant[] = ['gofish', 'oldmaid', 'klondike', 'freecell', 'spider'];
export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

export type Shelf = 'duel' | 'table' | 'partners' | 'solo';
export const SHELVES: Array<{ id: Shelf; title: string }> = [
	{ id: 'duel', title: 'Head to head' },
	{ id: 'table', title: 'Round the table' },
	{ id: 'partners', title: 'With a partner' },
	{ id: 'solo', title: 'On your own' }
];

export const VARIANT_INFO: Record<Variant, { title: string; players: number; line: string; chalk: string; shelf: Shelf }> = {
	cribbage: { title: 'Cribbage', players: 2, line: 'Fifteen-two, fifteen-four. Peg your way round the board to 121.', chalk: 'Peg to 121', shelf: 'duel' },
	gin: { title: 'Gin Rummy', players: 2, line: 'Draw, meld and knock before your deadwood drags you under.', chalk: 'First to 100', shelf: 'duel' },
	rummy: { title: 'Rummy 500', players: 2, line: 'Dig deep in the discard pile, lay your melds down and race to 500.', chalk: 'First to 500', shelf: 'duel' },
	kings: { title: 'Kings Corner', players: 2, line: 'Build down round the deck, kings in the corners, and empty your hand.', chalk: 'Best of five', shelf: 'duel' },
	hearts: { title: 'Hearts', players: 4, line: 'Duck every heart and dodge the black lady, or shoot the moon.', chalk: 'Lowest at 100 wins', shelf: 'table' },
	ohhell: { title: 'Oh Hell', players: 4, line: 'Bid exactly what you’ll take. Not one trick more, not one less.', chalk: '7 hands · most points', shelf: 'table' },
	eights: { title: 'Crazy Eights', players: 4, line: 'Match the suit or the number, and slam down an eight to change it.', chalk: 'Lowest at 100', shelf: 'table' },
	gofish: { title: 'Go Fish', players: 4, line: 'Ask for the cards you want, remember who has what, and collect books.', chalk: 'Most books', shelf: 'table' },
	oldmaid: { title: 'Old Maid', players: 4, line: 'Pair off your cards and don’t get left holding the lonely queen.', chalk: 'Don’t be last', shelf: 'table' },
	euchre: { title: 'Euchre', players: 4, line: 'Partners across the table, bowers high, and a loner for the brave.', chalk: 'Partners · to 10', shelf: 'partners' },
	spades: { title: 'Spades', players: 4, line: 'Bid your tricks with your partner, mind the bags, and dare a nil.', chalk: 'Partners · to 300', shelf: 'partners' },
	pinochle: { title: 'Pinochle', players: 4, line: 'A double deck, marriages and runs, and partners racing to 150.', chalk: 'Partners · to 150', shelf: 'partners' },
	blackjack: { title: 'Blackjack', players: 2, line: 'Twenty-one against Bert behind the bar. Know when to hit.', chalk: '10 hands · beat the house', shelf: 'solo' },
	klondike: { title: 'Klondike', players: 1, line: 'The classic patience: build down in alternating colours, up by suit.', chalk: 'Solitaire', shelf: 'solo' },
	freecell: { title: 'FreeCell', players: 1, line: 'Every card face up and four spare cells. Almost every deal can be won.', chalk: 'Solitaire', shelf: 'solo' },
	spider: { title: 'Spider', players: 1, line: 'Two decks, ten columns. Build full suits from king down to ace.', chalk: 'Solitaire', shelf: 'solo' }
};

export const DIFFICULTY_INFO: Record<Difficulty, { title: string; line: string }> = {
	easy: { title: 'Easy', line: 'The Sunday crowd' },
	medium: { title: 'Medium', line: 'The regulars' },
	hard: { title: 'Hard', line: 'The card sharps' }
};

/** Games where the levels change the rules rather than the opponents. */
export const DIFFICULTY_LINES: Partial<Record<Variant, Record<Difficulty, { title: string; line: string }>>> = {
	blackjack: {
		easy: { title: 'Easy', line: 'Dealer stands on soft 17' },
		medium: { title: 'Medium', line: 'Dealer hits soft 17' },
		hard: { title: 'Hard', line: 'Hits soft 17, pays 6:5' }
	},
	klondike: {
		easy: { title: 'Easy', line: 'Turn one card' },
		medium: { title: 'Medium', line: 'Turn three cards' },
		hard: { title: 'Hard', line: 'Three cards, three passes' }
	},
	freecell: {
		easy: { title: 'Easy', line: 'Five free cells' },
		medium: { title: 'Medium', line: 'Four free cells' },
		hard: { title: 'Hard', line: 'Three free cells' }
	},
	spider: {
		easy: { title: 'Easy', line: 'One suit' },
		medium: { title: 'Medium', line: 'Two suits' },
		hard: { title: 'Hard', line: 'All four suits' }
	}
};

export function difficultyInfo(variant: Variant, level: Difficulty) {
	return DIFFICULTY_LINES[variant]?.[level] ?? DIFFICULTY_INFO[level];
}

/** The regulars who sit in with you. Index by seat; seat 0 is you. */
export const REGULARS: Record<Variant, string[]> = {
	cribbage: ['You', 'Old Tom'],
	gin: ['You', 'Maggie'],
	rummy: ['You', 'Maggie'],
	kings: ['You', 'Old Tom'],
	hearts: ['You', 'Fergus', 'Maggie', 'Old Tom'],
	ohhell: ['You', 'Fergus', 'Maggie', 'Old Tom'],
	eights: ['You', 'Pip', 'Nell', 'Fergus'],
	gofish: ['You', 'Pip', 'Nell', 'Old Tom'],
	oldmaid: ['You', 'Pip', 'Maggie', 'Bert'],
	euchre: ['You', 'Fergus', 'Nell', 'Bert'],
	spades: ['You', 'Fergus', 'Nell', 'Bert'],
	pinochle: ['You', 'Old Tom', 'Maggie', 'Fergus'],
	blackjack: ['You', 'Bert'],
	klondike: ['You'],
	freecell: ['You'],
	spider: ['You']
};

export type HotseatHearts = 2 | 3 | 4;
export type HotseatEuchre = 'partners' | 'rivals' | 'four';

export function humanSeats(variant: Variant, mode: Mode, hearts: HotseatHearts, euchre: HotseatEuchre): boolean[] {
	const players = VARIANT_INFO[variant].players;
	if (players === 1) return [true];
	if (mode === 'ai' || SOLO.includes(variant)) return players === 2 ? [true, false] : [true, false, false, false];
	if (players === 2) return [true, true];
	if (!PARTNERED.includes(variant)) {
		if (hearts === 2) return [true, false, true, false];
		if (hearts === 3) return [true, true, true, false];
		return [true, true, true, true];
	}
	if (euchre === 'partners') return [true, false, true, false];
	if (euchre === 'rivals') return [true, true, false, false];
	return [true, true, true, true];
}

export function seatName(variant: Variant, seat: Seat, humans: boolean[]): string {
	const humanCount = humans.filter(Boolean).length;
	if (humans[seat]) {
		if (humanCount === 1) return 'You';
		return `Player ${humans.slice(0, seat + 1).filter(Boolean).length}`;
	}
	return REGULARS[variant][seat];
}

export const SEAT_GLOW = ['#ffc46a', '#8fd0ff', '#ff8f7a', '#b9f08a'];
