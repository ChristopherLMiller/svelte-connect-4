import { Position, START_FEN, automaticOutcome, claimable, uciOf } from '../src/lib/games/chess/engine';

function assert(ok: unknown, message: string) {
	if (!ok) {
		console.error('FAIL', message);
		process.exit(1);
	}
}

const PERFT: [string, string, number[]][] = [
	['start', START_FEN, [20, 400, 8902, 197281, 4865609]],
	['kiwipete', 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', [48, 2039, 97862, 4085603]],
	['position 3', '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', [14, 191, 2812, 43238, 674624]],
	['position 4', 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', [6, 264, 9467, 422333]],
	['position 5', 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', [44, 1486, 62379, 2103487]],
	['position 6', 'r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10', [46, 2079, 89890, 3894594]]
];

for (const [name, fen, counts] of PERFT) {
	const pos = new Position(fen);
	const startKey = pos.key();
	const t0 = performance.now();
	counts.forEach((want, i) => {
		const got = pos.perft(i + 1);
		assert(got === want, `perft ${name} depth ${i + 1}: ${got} != ${want}`);
	});
	assert(pos.key() === startKey && pos.fen() === new Position(fen).fen(), `${name} restored after perft`);
	console.log(`perft ${name} ok (${Math.round(performance.now() - t0)}ms)`);
}

function play(fen: string, sans: string) {
	const pos = new Position(fen);
	for (const san of sans.split(/\s+/).filter(Boolean)) {
		const m = pos.moveFromSan(san);
		assert(m, `illegal ${san} in ${pos.fen()}`);
		const legal = pos.legalMoves();
		assert(pos.san(m, legal).replace(/[+#]/g, '') === san.replace(/[+#]/g, ''), `san round trip ${san}`);
		pos.make(m);
	}
	return pos;
}

{
	const pos = play(START_FEN, 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7');
	assert(pos.fen() === 'r1bqk2r/1pppbppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 4 6', `ruy fen ${pos.fen()}`);
}
{
	const pos = new Position('6k1/5ppp/8/8/8/8/8/R3K2R w KQ - 0 1');
	const legal = pos.legalMoves();
	const sans = legal.map((m) => pos.san(m, legal));
	assert(sans.includes('O-O') && sans.includes('O-O-O'), 'both castles');
	assert(sans.includes('Ra8#') && sans.includes('Rh7') === false, `rook mate ${sans.join(' ')}`);
	assert(sans.includes('Rxh7'), 'captures marked');
}
{
	const pos = new Position('4k3/8/8/8/8/8/4K3/R6R w - - 0 1');
	const legal = pos.legalMoves();
	const sans = legal.map((m) => pos.san(m, legal));
	assert(sans.includes('Rad1') && sans.includes('Rhd1'), `file disambiguation ${sans.join(' ')}`);
}
{
	const pos = new Position('4k3/8/8/R7/8/8/8/R3K3 w Q - 0 1');
	const legal = pos.legalMoves();
	const sans = legal.map((m) => pos.san(m, legal));
	assert(sans.includes('R5a3') && sans.includes('R1a3'), `rank disambiguation ${sans.join(' ')}`);
}
{
	const pos = new Position('r3k2r/8/8/8/8/8/8/R3K1r1 w Qkq - 0 1');
	const sans = pos.legalMoves().map((m) => uciOf(m));
	assert(!sans.includes('e1c1'), 'no castling while in check');
	const pos2 = new Position('r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1');
	pos2.make(pos2.moveFromSan('Rxa1')!);
	assert(!(pos2.castling & 2), 'captured rook loses castling right');
	const pos3 = new Position('4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1');
	const pos3b = new Position('3rk3/8/8/8/8/8/8/R3K2R w KQ - 0 1');
	assert(pos3.moveFromSan('O-O-O') && !pos3b.moveFromSan('O-O-O'), 'cannot castle through check');
	const pos3c = new Position('1r2k3/8/8/8/8/8/8/R3K2R w KQ - 0 1');
	assert(pos3c.moveFromSan('O-O-O'), 'b1 may be attacked when castling long');
}
{
	const pos = play(START_FEN, 'e4 Nf6 e5 d5');
	assert(pos.fen().split(' ')[3] === 'd6', 'en passant square set');
	const ep = pos.moveFromSan('exd6');
	assert(ep, 'en passant capture legal');
	pos.make(ep);
	assert(pos.board[0x43] === 0 && pos.fen().startsWith('rnbqkb1r/ppp1pppp/3P1n2/8'), `ep removes pawn ${pos.fen()}`);
	const quiet = play(START_FEN, 'e4');
	assert(quiet.fen().split(' ')[3] === '-', 'no ep square without a capturer');
	const pinned = new Position('8/8/8/K2Pp2r/8/8/8/7k w - e6 0 1');
	assert(!pinned.moveFromSan('dxe6'), 'horizontally pinned en passant refused');
}
{
	const pos = new Position('8/P7/8/8/8/8/8/k6K w - - 0 1');
	const sans = pos.legalMoves().map((m) => pos.san(m));
	assert(['a8=Q+', 'a8=R+', 'a8=B', 'a8=N'].every((s) => sans.includes(s)), `promotions ${sans.join(' ')}`);
}
{
	const mate = play(START_FEN, 'f3 e5 g4 Qh4#');
	assert(automaticOutcome(mate, 1)?.reason === 'checkmate' && automaticOutcome(mate, 1)?.winner === -1, 'fool mate');
	const stale = new Position('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
	assert(automaticOutcome(stale, 1)?.reason === 'stalemate', 'stalemate');
	for (const fen of ['8/8/8/4k3/8/8/8/4K3 w - - 0 1', '8/8/8/4k3/8/8/8/3BK3 w - - 0 1', '8/8/8/4k3/8/8/8/3NK3 w - - 0 1', '8/8/2b5/4k3/8/8/8/3BK3 w - - 0 1'])
		assert(new Position(fen).insufficientMaterial(), `insufficient ${fen}`);
	for (const fen of ['8/8/8/4k3/8/8/8/2NNK3 w - - 0 1', '8/8/1b6/4k3/8/8/8/3BK3 w - - 0 1', '8/8/8/4k3/8/8/4P3/4K3 w - - 0 1', '8/8/8/4k3/8/8/8/2BNK3 w - - 0 1'])
		assert(!new Position(fen).insufficientMaterial(), `sufficient ${fen}`);
	assert(!new Position('8/8/8/4k3/8/8/8/3NK3 w - - 0 1').canMate(1), 'lone knight cannot mate');
	assert(new Position('8/8/8/4k3/8/8/4P3/4K3 w - - 0 1').canMate(1), 'pawn can mate');
}
{
	const pos = new Position(START_FEN);
	const keys = [pos.repetitionKey()];
	for (let i = 0; i < 8; i += 1) {
		pos.make(pos.moveFromSan(['Nf3', 'Nf6', 'Ng1', 'Ng8'][i % 4])!);
		keys.push(pos.repetitionKey());
	}
	const count = keys.filter((k) => k === keys[keys.length - 1]).length;
	assert(count === 3 && pos.repetitions() === 3, 'threefold counted');
	assert(claimable(pos, count) === 'threefold', 'threefold claimable');
	const fifty = new Position('8/8/8/4k3/8/8/4R3/4K3 w - - 100 80');
	assert(claimable(fifty, 1) === 'fifty', 'fifty-move claimable');
	assert(automaticOutcome(new Position('8/8/8/4k3/8/8/4R3/4K3 w - - 150 120'), 1)?.reason === 'seventyfive', 'seventy-five move');
	assert(automaticOutcome(pos, 5)?.reason === 'fivefold', 'fivefold');
}

console.log('chess rules ok');
