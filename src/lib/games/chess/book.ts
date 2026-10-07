import { Position, START_FEN, uciOf } from './engine';

/**
 * Opening lines as `[name, moves]`. A `|` marks where the variation earns its name; without one the
 * name lands on the final position. Lines may share prefixes; later, deeper names win.
 */
const LINES: [string, string][] = [
	["King's Pawn Opening", 'e4'],
	["Queen's Pawn Opening", 'd4'],
	["King's Pawn Game", 'e4 e5'],
	["King's Knight Opening", 'e4 e5 Nf3'],
	["Queen's Pawn Game", 'd4 d5'],
	['Indian Defence', 'd4 Nf6'],
	["Queen's Gambit", 'd4 d5 c4'],

	['Italian Game', 'e4 e5 Nf3 Nc6 Bc4'],
	['Italian Game: Giuoco Piano', 'e4 e5 Nf3 Nc6 Bc4 Bc5 | c3 Nf6 d3 d6 O-O O-O Re1 a6 a4 Ba7 h3'],
	['Italian Game: Giuoco Pianissimo', 'e4 e5 Nf3 Nc6 Bc4 Bc5 d3 | Nf6 c3 d6 O-O a6 a4 O-O Re1 Ba7'],
	['Two Knights Defence', 'e4 e5 Nf3 Nc6 Bc4 Nf6 | d3 Be7 O-O O-O Re1 d6 c3 Na5 Bb5 a6 Ba4 b5 Bc2'],
	['Two Knights Defence: Fried Liver Attack', 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7 | Kxf7 Qf3+ Ke6 Nc3 Nb4 a3'],
	['Two Knights Defence: Knight Attack', 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 | d5 exd5 Na5 Bb5+ c6 dxc6 bxc6 Be2 h6 Nf3 e4 Ne5 Bd6'],
	['Evans Gambit', 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 | Bxb4 c3 Ba5 d4 exd4 O-O d6 cxd4 Bb6'],
	['Danish Gambit', 'e4 e5 d4 exd4 c3 | dxc3 Bc4 cxb2 Bxb2 d5 Bxd5 Nf6 Bxf7+ Kxf7 Qxd8'],

	['Ruy Lopez', 'e4 e5 Nf3 Nc6 Bb5'],
	['Ruy Lopez: Morphy Defence', 'e4 e5 Nf3 Nc6 Bb5 a6 | Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3'],
	['Ruy Lopez: Closed, Chigorin Variation', 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Na5 | Bc2 c5 d4 Qc7 Nbd2'],
	['Ruy Lopez: Closed, Breyer Variation', 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Nb8 | d4 Nbd7 Nbd2 Bb7 Bc2 Re8'],
	['Ruy Lopez: Marshall Attack', 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5 | exd5 Nxd5 Nxe5 Nxe5 Rxe5 c6 d4 Bd6 Re1 Qh4 g3 Qh3'],
	['Ruy Lopez: Berlin Defence', 'e4 e5 Nf3 Nc6 Bb5 Nf6 | O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8 Nc3 Ke8'],
	['Ruy Lopez: Exchange Variation', 'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 | dxc6 O-O f6 d4 exd4 Nxd4 c5 Nb3 Qxd1 Rxd1'],
	['Ruy Lopez: Open Variation', 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4 | d4 b5 Bb3 d5 dxe5 Be6 c3 Bc5'],

	['Scotch Game', 'e4 e5 Nf3 Nc6 d4 | exd4 Nxd4 Nf6 Nxc6 bxc6 e5 Qe7 Qe2 Nd5 c4 Ba6'],
	['Scotch Game: Classical Variation', 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 | Be3 Qf6 c3 Nge7 Bc4 O-O O-O'],
	["Petrov's Defence", 'e4 e5 Nf3 Nf6 | Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3 Nc6 O-O Be7 c4 Nb4'],
	['Four Knights Game', 'e4 e5 Nf3 Nc6 Nc3 Nf6 | Bb5 Bb4 O-O O-O d3 d6 Bg5 Bxc3 bxc3'],
	["King's Gambit Accepted", "e4 e5 f4 exf4 | Nf3 g5 h4 g4 Ne5 Nf6 Bc4 d5 exd5 Bd6"],
	["King's Gambit Accepted: Fischer Defence", 'e4 e5 f4 exf4 Nf3 d6 | d4 g5 h4 g4 Ng1 Nf6'],
	["King's Gambit Declined", 'e4 e5 f4 Bc5 | Nf3 d6 c3 Nf6 d4 exd4 cxd4 Bb4+'],
	['Vienna Game', 'e4 e5 Nc3 | Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7 d3 Nxc3 bxc3 O-O'],
	['Vienna Game: Mieses', 'e4 e5 Nc3 Nf6 g3 | d5 exd5 Nxd5 Bg2 Nxc3 bxc3 Bd6'],
	['Philidor Defence', 'e4 e5 Nf3 d6 | d4 Nf6 Nc3 Nbd7 Bc4 Be7 O-O O-O Re1 c6 a4'],

	['Sicilian Defence', 'e4 c5'],
	['Sicilian Defence: Open', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3'],
	['Sicilian Defence: Najdorf Variation', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 | Be3 e5 Nb3 Be6 f3 Be7 Qd2 O-O O-O-O Nbd7 g4'],
	['Sicilian Defence: Najdorf, 6.Bg5', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 | e6 f4 Be7 Qf3 Qc7 O-O-O Nbd7 g4 b5'],
	['Sicilian Defence: Najdorf, English Attack', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e6 | f3 b5 Qd2 Nbd7 g4 h6 O-O-O Bb7'],
	['Sicilian Defence: Dragon Variation', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 | Be3 Bg7 f3 O-O Qd2 Nc6 Bc4 Bd7 O-O-O Rc8 Bb3 Ne5 h4'],
	['Sicilian Defence: Classical Variation', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 Nc6 | Bg5 e6 Qd2 Be7 O-O-O O-O f4 h6'],
	['Sicilian Defence: Scheveningen', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 e6 | Be2 Be7 O-O O-O f4 Nc6 Be3 a6 a4'],
	['Sicilian Defence: Sveshnikov', 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 | Ndb5 d6 Bg5 a6 Na3 b5 Bxf6 gxf6 Nd5 f5'],
	['Sicilian Defence: Taimanov', 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6 | Nc3 Qc7 Be2 a6 O-O Nf6 Be3 Bb4'],
	['Sicilian Defence: Kan', 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6 | Bd3 Nf6 O-O Qc7 Qe2 d6 c4 g6'],
	['Sicilian Defence: Alapin', 'e4 c5 c3 | Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6 cxd4 d6 Bc4 Nb6 Bb5'],
	['Sicilian Defence: Closed', 'e4 c5 Nc3 | Nc6 g3 g6 Bg2 Bg7 d3 d6 Be3 e6 Qd2 Rb8'],
	['Sicilian Defence: Rossolimo', 'e4 c5 Nf3 Nc6 Bb5 | g6 O-O Bg7 Re1 Nf6 c3 O-O d4 cxd4 cxd4 d5 e5 Ne4'],
	['Sicilian Defence: Smith-Morra Gambit', 'e4 c5 d4 cxd4 c3 | dxc3 Nxc3 Nc6 Nf3 d6 Bc4 e6 O-O Nf6 Qe2 Be7 Rd1'],
	['Sicilian Defence: Moscow Variation', 'e4 c5 Nf3 d6 Bb5+ | Bd7 Bxd7+ Qxd7 O-O Nc6 c3 Nf6 Re1 e6 d4'],

	['French Defence', 'e4 e6 | d4 d5'],
	['French Defence: Winawer', 'e4 e6 d4 d5 Nc3 Bb4 | e5 c5 a3 Bxc3+ bxc3 Ne7 Qg4 Qc7 Qxg7 Rg8 Qxh7 cxd4'],
	['French Defence: Classical', 'e4 e6 d4 d5 Nc3 Nf6 | Bg5 Be7 e5 Nfd7 Bxe7 Qxe7 f4 O-O Nf3 c5'],
	['French Defence: Advance Variation', 'e4 e6 d4 d5 e5 | c5 c3 Nc6 Nf3 Qb6 a3 c4 Nbd2 Na5'],
	['French Defence: Tarrasch', 'e4 e6 d4 d5 Nd2 | Nf6 e5 Nfd7 Bd3 c5 c3 Nc6 Ne2 cxd4 cxd4 f6'],
	['French Defence: Exchange Variation', 'e4 e6 d4 d5 exd5 | exd5 Bd3 Nc6 c3 Bd6 Nf3 Nge7 O-O Bg4'],
	['French Defence: Rubinstein', 'e4 e6 d4 d5 Nc3 dxe4 | Nxe4 Nd7 Nf3 Ngf6 Nxf6+ Nxf6 c3 c5'],

	['Caro-Kann Defence', 'e4 c6 | d4 d5'],
	['Caro-Kann Defence: Classical', 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 | Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7 Bd3 Bxd3 Qxd3 e6'],
	['Caro-Kann Defence: Advance Variation', 'e4 c6 d4 d5 e5 | Bf5 Nf3 e6 Be2 c5 Be3 Nd7 O-O Ne7'],
	['Caro-Kann Defence: Exchange Variation', 'e4 c6 d4 d5 exd5 cxd5 Bd3 | Nc6 c3 Nf6 Bf4 Bg4 Qb3 Qd7'],
	['Caro-Kann Defence: Panov Attack', 'e4 c6 d4 d5 exd5 cxd5 c4 | Nf6 Nc3 e6 Nf3 Be7 cxd5 Nxd5'],
	['Caro-Kann Defence: Two Knights', 'e4 c6 Nc3 d5 Nf3 | Bg4 h3 Bxf3 Qxf3 e6 d4 Nf6'],

	['Pirc Defence', 'e4 d6 d4 Nf6 Nc3 g6 | Nf3 Bg7 Be2 O-O O-O c6 a4'],
	['Pirc Defence: Austrian Attack', 'e4 d6 d4 Nf6 Nc3 g6 f4 | Bg7 Nf3 O-O Bd3 Na6 O-O c5'],
	['Modern Defence', 'e4 g6 | d4 Bg7 Nc3 d6 Be3 a6 Qd2 b5'],
	['Scandinavian Defence', 'e4 d5 | exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 Bf5 Bc4 e6 Bd2 c6'],
	['Scandinavian Defence: Modern Variation', 'e4 d5 exd5 Nf6 | d4 Nxd5 Nf3 g6 c4 Nb6 Nc3 Bg7'],
	["Alekhine's Defence", 'e4 Nf6 | e5 Nd5 d4 d6 Nf3 Bg4 Be2 e6 O-O Be7 c4 Nb6'],

	["Queen's Gambit Declined", 'd4 d5 c4 e6 | Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7 Rc1 c6 Bd3 dxc4 Bxc4'],
	["Queen's Gambit Declined: Tartakower", 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6 | cxd5 Nxd5 Bxe7 Qxe7'],
	["Queen's Gambit Declined: Exchange Variation", 'd4 d5 c4 e6 Nc3 Nf6 cxd5 | exd5 Bg5 c6 e3 Be7 Bd3 Nbd7 Qc2 O-O Nge2 Re8'],
	["Queen's Gambit Declined: Ragozin", 'd4 d5 c4 e6 Nc3 Nf6 Nf3 Bb4 | Bg5 h6 Bxf6 Qxf6 e3 O-O Rc1 dxc4'],
	["Queen's Gambit Accepted", 'd4 d5 c4 dxc4 | Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 a4 Nc6'],
	['Slav Defence', 'd4 d5 c4 c6 | Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4 O-O O-O Qe2'],
	['Semi-Slav Defence: Meran', 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3 dxc4 Bxc4 b5 | Bd3 Bb7 O-O a6 e4 c5'],
	['Semi-Slav Defence: Botvinnik', 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 Bg5 dxc4 | e4 b5 e5 h6 Bh4 g5 Nxg5 hxg5 Bxg5 Nbd7'],
	['Catalan Opening', 'd4 Nf6 c4 e6 g3 | d5 Bg2 Be7 Nf3 O-O O-O dxc4 Qc2 a6 Qxc4 b5 Qc2 Bb7'],
	['Nimzo-Indian Defence', 'd4 Nf6 c4 e6 Nc3 Bb4 | e3 O-O Bd3 d5 Nf3 c5 O-O Nc6 a3 Bxc3 bxc3'],
	['Nimzo-Indian Defence: Classical', 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 | O-O a3 Bxc3+ Qxc3 b6 Bg5 Bb7 e3 d6'],
	["Queen's Indian Defence", 'd4 Nf6 c4 e6 Nf3 b6 | g3 Ba6 b3 Bb4+ Bd2 Be7 Bg2 c6 Bc3 d5'],
	["King's Indian Defence", 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 | Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7 Ne1 Nd7 Nd3 f5'],
	["King's Indian Defence: Sämisch", 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 | O-O Be3 e5 d5 Nh5 Qd2 f5 O-O-O'],
	["King's Indian Defence: Fianchetto", 'd4 Nf6 c4 g6 Nf3 Bg7 g3 | O-O Bg2 d6 O-O Nbd7 Nc3 e5 e4 c6 h3'],
	['Grünfeld Defence', 'd4 Nf6 c4 g6 Nc3 d5 | cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Nf3 c5 Be3 Qa5 Qd2 O-O Rc1'],
	['Grünfeld Defence: Russian System', 'd4 Nf6 c4 g6 Nc3 d5 Nf3 Bg7 Qb3 | dxc4 Qxc4 O-O e4 Bg4 Be3 Nfd7'],
	['Benoni Defence', 'd4 Nf6 c4 c5 d5 e6 | Nc3 exd5 cxd5 d6 e4 g6 Nf3 Bg7 Be2 O-O O-O Re8'],
	['Benko Gambit', 'd4 Nf6 c4 c5 d5 b5 | cxb5 a6 bxa6 Bxa6 Nc3 d6 e4 Bxf1 Kxf1 g6 g3 Bg7 Kg2 O-O'],
	['Dutch Defence', 'd4 f5 | g3 Nf6 Bg2 e6 Nf3 Be7 O-O O-O c4 d6 Nc3 Qe8'],
	['Dutch Defence: Leningrad', 'd4 f5 g3 Nf6 Bg2 g6 | Nf3 Bg7 O-O O-O c4 d6 Nc3 Qe8'],
	['London System', 'd4 d5 Bf4 | Nf6 e3 e6 Nf3 c5 c3 Nc6 Nbd2 Bd6 Bg3 O-O Bd3'],
	['London System', 'd4 Nf6 Bf4 | g6 e3 Bg7 Nf3 O-O Be2 d6 h3 c5 c3'],
	['London System', 'd4 Nf6 Nf3 e6 Bf4 | c5 e3 Nc6 c3 d5 Nbd2 Bd6 Bg3 O-O'],
	['Colle System', 'd4 d5 Nf3 Nf6 e3 | e6 Bd3 c5 c3 Nc6 Nbd2 Bd6 O-O O-O dxc5 Bxc5 e4'],
	['Trompowsky Attack', 'd4 Nf6 Bg5 | Ne4 Bf4 c5 f3 Qa5+ c3 Nf6 d5 Qb6'],

	['English Opening', 'c4 | e5 Nc3 Nf6 Nf3 Nc6 g3 d5 cxd5 Nxd5 Bg2 Nb6 O-O Be7 d3 O-O'],
	['English Opening: Symmetrical', 'c4 c5 | Nf3 Nc6 Nc3 g6 g3 Bg7 Bg2 Nf6 O-O O-O d4 cxd4 Nxd4'],
	['English Opening: Anglo-Indian', 'c4 Nf6 | Nc3 e6 e4 d5 e5 d4 exf6 dxc3 bxc3 Qxf6 d4'],
	['Réti Opening', 'Nf3 d5 c4 | e6 g3 Nf6 Bg2 Be7 O-O O-O b3 c5 Bb2 Nc6'],
	["King's Indian Attack", 'Nf3 d5 g3 | Nf6 Bg2 c6 O-O Bg4 d3 Nbd7 Nbd2 e5 e4'],
	["Bird's Opening", 'f4 | d5 Nf3 Nf6 e3 g6 Be2 Bg7 O-O O-O d3 c5']
];

export type BookEntry = { uci: string; weight: number; names: string[] };

/** Position key → the book moves seen there, and position key → opening name. */
const moves = new Map<string, Map<string, BookEntry>>();
const names = new Map<string, { name: string; depth: number }>();
let built = false;

function build() {
	if (built) return;
	built = true;
	for (const [name, line] of LINES) {
		const tokens = line.split(/\s+/).filter(Boolean);
		const marker = tokens.indexOf('|');
		const sans = tokens.filter((t) => t !== '|');
		const nameAt = marker < 0 ? sans.length : marker;
		const pos = new Position(START_FEN);
		for (let i = 0; i < sans.length; i += 1) {
			const key = pos.key();
			const m = pos.moveFromSan(sans[i]);
			if (!m) throw new Error(`book: ${name} — illegal ${sans[i]}`);
			const uci = uciOf(m);
			let here = moves.get(key);
			if (!here) moves.set(key, (here = new Map()));
			const entry = here.get(uci) ?? { uci, weight: 0, names: [] };
			entry.weight += 1;
			if (!entry.names.includes(name)) entry.names.push(name);
			here.set(uci, entry);
			pos.make(m);
			if (i + 1 >= nameAt) {
				const prev = names.get(pos.key());
				if (!prev || prev.depth <= nameAt) names.set(pos.key(), { name, depth: nameAt });
			}
		}
	}
}

export function bookMoves(pos: Position): BookEntry[] {
	build();
	return [...(moves.get(pos.key())?.values() ?? [])];
}

export function openingName(pos: Position): string | null {
	build();
	return names.get(pos.key())?.name ?? null;
}

/** Plays each book line through; throws on any illegal move. */
export function verifyBook() {
	build();
	return { positions: moves.size, named: names.size, lines: LINES.length };
}
