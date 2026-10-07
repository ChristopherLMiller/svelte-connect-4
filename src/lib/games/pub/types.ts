export type Variant = 'cribbage' | 'hearts' | 'gin' | 'euchre';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Mode = 'ai' | 'local';
/** 0 = bottom, then clockwise: 1 left, 2 top, 3 right. Two-player games use 0 and 1. */
export type Seat = number;

export const VARIANTS: Variant[] = ['cribbage', 'hearts', 'gin', 'euchre'];
export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

export const VARIANT_INFO: Record<Variant, { title: string; players: number; line: string; chalk: string }> = {
	cribbage: {
		title: 'Cribbage',
		players: 2,
		line: 'Fifteen-two, fifteen-four. Peg your way round the board to 121.',
		chalk: 'Peg to 121'
	},
	hearts: {
		title: 'Hearts',
		players: 4,
		line: 'Duck every heart and dodge the black lady, or shoot the moon.',
		chalk: 'Lowest at 100 wins'
	},
	gin: {
		title: 'Gin Rummy',
		players: 2,
		line: 'Draw, meld and knock before your deadwood drags you under.',
		chalk: 'First to 100'
	},
	euchre: {
		title: 'Euchre',
		players: 4,
		line: 'Partners across the table, bowers high, and a loner for the brave.',
		chalk: 'Partners · to 10'
	}
};

export const DIFFICULTY_INFO: Record<Difficulty, { title: string; line: string }> = {
	easy: { title: 'Easy', line: 'The Sunday crowd' },
	medium: { title: 'Medium', line: 'The regulars' },
	hard: { title: 'Hard', line: 'The card sharps' }
};

/** The regulars who sit in with you. Index by seat; seat 0 is you. */
export const REGULARS: Record<Variant, string[]> = {
	cribbage: ['You', 'Old Tom'],
	gin: ['You', 'Maggie'],
	hearts: ['You', 'Fergus', 'Maggie', 'Old Tom'],
	euchre: ['You', 'Fergus', 'Nell', 'Bert']
};

export type HotseatHearts = 2 | 3 | 4;
export type HotseatEuchre = 'partners' | 'rivals' | 'four';

export function humanSeats(variant: Variant, mode: Mode, hearts: HotseatHearts, euchre: HotseatEuchre): boolean[] {
	if (mode === 'ai') return VARIANT_INFO[variant].players === 2 ? [true, false] : [true, false, false, false];
	if (variant === 'cribbage' || variant === 'gin') return [true, true];
	if (variant === 'hearts') {
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
