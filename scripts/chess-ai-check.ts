import { MATE, think } from '../src/lib/games/chess/ai';
import { openingName, verifyBook } from '../src/lib/games/chess/book';
import { Position, START_FEN } from '../src/lib/games/chess/engine';
import { OPPONENTS } from '../src/lib/games/chess/types';

function assert(ok: unknown, message: string) {
	if (!ok) {
		console.error('FAIL', message);
		process.exit(1);
	}
}

const book = verifyBook();
console.log('book', book);

{
	const pos = new Position(START_FEN);
	for (const san of 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6'.split(' ')) pos.make(pos.moveFromSan(san));
	assert(openingName(pos)?.includes('Najdorf'), `najdorf named ${openingName(pos)}`);
}

const analyse = (fen: string, timeMs = 1500) => think({ kind: 'analyse', fen, moves: [], timeMs });

{
	const t0 = performance.now();
	const r = analyse('r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3', 2000);
	const ms = performance.now() - t0;
	console.log(`italian: depth ${r.depth}, ${r.nodes} nodes, ${Math.round(r.nodes / (ms / 1000))} nps, best ${r.best} score ${r.score}`);
}
{
	const r = analyse('6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1');
	assert(r.best === 'a1a8' && r.score >= MATE - 10, `mate in one ${r.best} ${r.score}`);
}
{
	const r = analyse('r1b1kb1r/pppp1ppp/5q2/4n3/3KP3/2N3PN/PPP4P/R1BQ1B1R b kq - 0 1', 3000);
	console.log('mate hunt', r.best, r.score, r.pv.join(' '));
	assert(r.score <= -(MATE - 20), `black mates ${r.score}`);
}
{
	const r = analyse('2r3k1/5ppp/8/8/8/8/5PPP/1R4K1 w - - 0 1');
	console.log('even rook ending', r.best, r.score);
}

const hanging = '4k3/8/8/3q4/8/8/3R4/4K3 w - - 0 1';
const longShot = 'rn1qkbnr/ppp2ppp/3p4/4p3/2B1P1b1/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4';
for (const o of OPPONENTS) {
	let took = 0;
	let tookLong = 0;
	const tries = o.strength.depth > 5 ? 4 : 20;
	for (let i = 0; i < tries; i += 1) {
		const r = think({ kind: 'move', fen: hanging, moves: [], opponent: o.id, seed: i * 7919 + 1 });
		if (r.move === 'd2d5') took += 1;
		const r2 = think({ kind: 'move', fen: longShot, moves: [], opponent: o.id, seed: i * 104729 + 3 });
		if (r2.move === 'c4f7') tookLong += 1;
	}
	console.log(`${o.name.padEnd(16)} grabs hanging queen ${took}/${tries}, Bxf7+ ${tookLong}/${tries}`);
}

console.log('chess ai ok');
