export type Side = 'w' | 'b';
export type Mode = 'ai' | 'hotseat';
export type Screen = 'menu' | 'play';
export type SideChoice = 'w' | 'b' | 'random';
export type TimeControl = 'none' | '10+0' | '5+3' | '3+2' | '1+0';

export const TIME_CONTROLS: TimeControl[] = ['none', '10+0', '5+3', '3+2', '1+0'];

export const TIME_INFO: Record<TimeControl, { label: string; name: string; base: number; inc: number }> = {
	none: { label: 'Untimed', name: 'No clock', base: 0, inc: 0 },
	'10+0': { label: '10 min', name: 'Rapid', base: 600_000, inc: 0 },
	'5+3': { label: '5 | 3', name: 'Blitz', base: 300_000, inc: 3000 },
	'3+2': { label: '3 | 2', name: 'Blitz', base: 180_000, inc: 2000 },
	'1+0': { label: '1 min', name: 'Bullet', base: 60_000, inc: 0 }
};

/** How an opponent weighs the board; 1 is neutral. */
export type StyleWeights = {
	mobility: number;
	kingAttack: number;
	kingSafety: number;
	pawns: number;
	passed: number;
	bishops: number;
	development: number;
	trade: number;
	/** Centipawns a draw costs them; negative means they welcome one. */
	contempt: number;
};

export type Strength = {
	depth: number;
	timeMs: number;
	/** How many captures deep they follow an exchange before trusting the board. */
	qDepth: number;
	/** Moves within this many centipawns of their best stay in consideration. */
	margin: number;
	temperature: number;
	/** Chance per move of tunnel vision: long-range captures and retreats go unseen. */
	blind: number;
	/** Plies of opening theory they know. */
	book: number;
	/** 0–1: how much they lean toward natural-looking moves. */
	human: number;
	/** Pretend thinking time range, so quick moves still feel considered. */
	think: [number, number];
	resigns: boolean;
};

export type OpponentId = 'pip' | 'bartholomew' | 'wren' | 'anselm' | 'hale' | 'dowager' | 'vellum' | 'count';

export type Opponent = {
	id: OpponentId;
	name: string;
	title: string;
	rating: number;
	blurb: string;
	style: StyleWeights;
	strength: Strength;
	/** Opening names (matched by prefix) they favour, and how strongly. */
	white: Record<string, number>;
	black: Record<string, number>;
	/** Portrait seal colours. */
	hue: string;
	glyph: 'page' | 'footman' | 'wren' | 'monk' | 'captain' | 'dowager' | 'archivist' | 'count';
};

const NEUTRAL: StyleWeights = {
	mobility: 1,
	kingAttack: 1,
	kingSafety: 1,
	pawns: 1,
	passed: 1,
	bishops: 1,
	development: 1,
	trade: 1,
	contempt: 0
};

export const OPPONENTS: Opponent[] = [
	{
		id: 'pip',
		name: 'Pip',
		title: 'the Page',
		rating: 400,
		blurb: 'Knows how the pieces move and is thrilled to be asked. Loves a capture, rarely asks why it was offered.',
		style: { ...NEUTRAL, mobility: 0.5, kingAttack: 0.6, kingSafety: 0.4, pawns: 0.3, development: 0.3, bishops: 0.5 },
		strength: { depth: 1, timeMs: 250, qDepth: 0, margin: 520, temperature: 150, blind: 0.55, book: 2, human: 1, think: [700, 1500], resigns: false },
		white: { 'Italian Game': 2, "King's Pawn": 1 },
		black: { 'Italian Game': 2, 'Philidor Defence': 1, 'Scandinavian Defence': 1, "Queen's Gambit Declined": 1 },
		hue: '#9fc48a',
		glyph: 'page'
	},
	{
		id: 'bartholomew',
		name: 'Bartholomew',
		title: 'the Footman',
		rating: 700,
		blurb: 'Has watched a great many games from beside the door. Develops his knights, then improvises.',
		style: { ...NEUTRAL, mobility: 0.7, kingSafety: 0.7, pawns: 0.6, development: 0.8 },
		strength: { depth: 2, timeMs: 400, qDepth: 1, margin: 320, temperature: 95, blind: 0.4, book: 4, human: 0.9, think: [800, 1700], resigns: false },
		white: { 'Italian Game': 2, 'Scotch Game': 1, 'Four Knights Game': 2 },
		black: { 'Four Knights Game': 2, 'Italian Game': 1, 'Philidor Defence': 1, "Queen's Gambit Declined": 1 },
		hue: '#c9b27a',
		glyph: 'footman'
	},
	{
		id: 'wren',
		name: 'Lady Wren',
		title: 'the Gambiteer',
		rating: 1000,
		blurb: 'Throws pawns at you before the soup is served. Wants open lines and your king, in that order.',
		style: { ...NEUTRAL, mobility: 1.3, kingAttack: 1.5, kingSafety: 0.8, pawns: 0.6, development: 1.4, trade: 0.6, contempt: 25 },
		strength: { depth: 2, timeMs: 550, qDepth: 3, margin: 190, temperature: 55, blind: 0.26, book: 8, human: 0.8, think: [800, 1800], resigns: false },
		white: { "King's Gambit": 3, 'Evans Gambit': 2, 'Sicilian Defence: Smith-Morra Gambit': 2, 'Two Knights Defence: Fried Liver': 2, 'Danish Gambit': 2 },
		black: { 'Benko Gambit': 3, 'Two Knights Defence': 2, 'Scandinavian Defence': 1, 'Sicilian Defence: Dragon': 1, 'Ruy Lopez: Marshall': 2 },
		hue: '#e08a9a',
		glyph: 'wren'
	},
	{
		id: 'anselm',
		name: 'Brother Anselm',
		title: 'the Patient',
		rating: 1200,
		blurb: 'Builds walls, trades into endgames and grinds. Considers a draw a perfectly respectable evening.',
		style: { ...NEUTRAL, kingAttack: 0.8, kingSafety: 1.4, pawns: 1.3, passed: 1.4, trade: 1.5, development: 1.1, contempt: -15 },
		strength: { depth: 3, timeMs: 650, qDepth: 4, margin: 130, temperature: 42, blind: 0.2, book: 10, human: 0.7, think: [900, 2000], resigns: true },
		white: { 'London System': 3, 'Colle System': 2, "Queen's Gambit Declined: Exchange": 1 },
		black: { 'Caro-Kann Defence': 3, "Queen's Gambit Declined": 2, 'Slav Defence': 2, "Petrov's Defence": 1 },
		hue: '#8f9a7a',
		glyph: 'monk'
	},
	{
		id: 'hale',
		name: 'Captain Hale',
		title: 'of the Guard',
		rating: 1450,
		blurb: 'Castles opposite and storms. Counts attackers around your king the way other men count coins.',
		style: { ...NEUTRAL, mobility: 1.2, kingAttack: 1.7, kingSafety: 0.8, development: 1.2, trade: 0.7, contempt: 30 },
		strength: { depth: 4, timeMs: 850, qDepth: 6, margin: 80, temperature: 28, blind: 0.12, book: 12, human: 0.6, think: [900, 2200], resigns: true },
		white: { 'Sicilian Defence: Dragon': 3, 'Vienna Game': 2, "King's Gambit": 1, 'Ruy Lopez': 1, "King's Indian Defence: Sämisch": 2 },
		black: { "King's Indian Defence": 3, 'Sicilian Defence: Dragon': 3, 'Dutch Defence: Leningrad': 1, "Alekhine's Defence": 1 },
		hue: '#c8604a',
		glyph: 'captain'
	},
	{
		id: 'dowager',
		name: 'The Dowager',
		title: 'Countess of Ashby',
		rating: 1700,
		blurb: 'Squeezes. Every pawn in its proper place, every bishop on its long diagonal, every guest slowly suffocated.',
		style: { ...NEUTRAL, pawns: 1.4, bishops: 1.3, mobility: 1.15, kingSafety: 1.2, passed: 1.2 },
		strength: { depth: 5, timeMs: 1100, qDepth: 8, margin: 45, temperature: 18, blind: 0.05, book: 16, human: 0.45, think: [1000, 2400], resigns: true },
		white: { 'Catalan Opening': 3, 'English Opening': 2, 'Réti Opening': 2, "Queen's Gambit Declined": 2 },
		black: { 'Nimzo-Indian Defence': 3, "Queen's Indian Defence": 2, 'French Defence': 2, 'Ruy Lopez: Berlin': 2, 'Caro-Kann Defence': 1 },
		hue: '#a58fc8',
		glyph: 'dowager'
	},
	{
		id: 'vellum',
		name: 'Master Vellum',
		title: 'the Archivist',
		rating: 1950,
		blurb: 'Has read every opening in the library twice. Plays theory twenty moves deep and remembers who lost with it.',
		style: { ...NEUTRAL, mobility: 1.1, development: 1.1 },
		strength: { depth: 7, timeMs: 1600, qDepth: 12, margin: 22, temperature: 9, blind: 0.02, book: 24, human: 0.3, think: [1000, 2600], resigns: true },
		white: { 'Ruy Lopez': 3, "Queen's Gambit": 2, 'Sicilian Defence: Najdorf': 2, 'Italian Game': 1, 'English Opening': 1 },
		black: { 'Sicilian Defence: Najdorf': 3, 'Grünfeld Defence': 2, 'Ruy Lopez: Marshall': 1, 'Semi-Slav Defence': 2 },
		hue: '#6f9ac8',
		glyph: 'archivist'
	},
	{
		id: 'count',
		name: 'The Count',
		title: 'Master of the Hall',
		rating: 2200,
		blurb: 'Your host. Plays without hurry and without mercy, and has not been seen to blunder in living memory.',
		style: { ...NEUTRAL, contempt: 15 },
		strength: { depth: 40, timeMs: 2600, qDepth: 40, margin: 0, temperature: 0, blind: 0, book: 24, human: 0, think: [900, 2000], resigns: true },
		white: { 'Ruy Lopez': 2, 'Catalan Opening': 2, 'Italian Game': 1, "Queen's Gambit Declined": 1 },
		black: { 'Sicilian Defence: Najdorf': 2, 'Ruy Lopez: Berlin': 2, 'Nimzo-Indian Defence': 2, 'Grünfeld Defence': 1 },
		hue: '#d6b45a',
		glyph: 'count'
	}
];

export const ANALYST: Opponent = {
	...OPPONENTS[7],
	style: NEUTRAL,
	strength: { ...OPPONENTS[7].strength, book: 0 }
};

export function opponentById(id: string): Opponent {
	return OPPONENTS.find((o) => o.id === id) ?? OPPONENTS[2];
}

export type Record3 = { w: number; d: number; l: number };
