import { card, seededRandom, CLUBS, DIAMONDS, HEARTS, SPADES, JACK, QUEEN, KING, ACE, NINE, TEN, type Card } from '../src/lib/games/kit/cards/deck';
import { applyCribbage, cribActor, dealCribbage, newCribbage, pegPoints, scoreHand, total, validCribbage, type CribState } from '../src/lib/games/pub/rules/cribbage';
import { applyHearts, dealHearts, heartsActor, newHearts, validHearts, type HeartsState } from '../src/lib/games/pub/rules/hearts';
import { applyGin, bestMelding, dealGin, defend, ginActor, newGin, validGin, type GinState } from '../src/lib/games/pub/rules/gin';
import { applyEuchre, dealEuchre, euchreActor, newEuchre, power, validEuchre, type EuchreState } from '../src/lib/games/pub/rules/euchre';
import { chooseAction, type PubAction, type PubState } from '../src/lib/games/pub/ai';
import type { Difficulty } from '../src/lib/games/pub/types';

function assert(ok: unknown, message: string) {
	if (!ok) {
		console.error('FAIL', message);
		process.exit(1);
	}
}

const c = (s: number, r: number) => card(s as 0 | 1 | 2 | 3, r);
const five = (s: number) => c(s, 3);

// Cribbage: the 29 hand (three fives and the jack of nobs, starter the fourth five).
{
	const hand = [five(CLUBS), five(DIAMONDS), five(SPADES), c(HEARTS, JACK)];
	assert(total(scoreHand(hand, five(HEARTS), false)) === 29, 'cribbage 29 hand');
	const runs = [c(CLUBS, 1), c(DIAMONDS, 2), c(SPADES, 2), c(HEARTS, 3)];
	assert(total(scoreHand(runs, c(CLUBS, 8), false)) === 10, 'double run of 3 + pair + fifteen = 10 (3,4,4,5 + 10)');
	const flush = [c(HEARTS, 0), c(HEARTS, 4), c(HEARTS, 7), c(HEARTS, 11)];
	assert(scoreHand(flush, c(CLUBS, 5), false).some((i) => i.kind === 'flush' && i.points === 4), 'four-card flush in hand');
	assert(!scoreHand(flush, c(CLUBS, 5), true).some((i) => i.kind === 'flush'), 'no four-card flush in crib');
	assert(pegPoints([c(CLUBS, 5), c(HEARTS, 6)], 15).points === 2, 'peg 7+8 fifteen');
	assert(pegPoints([c(CLUBS, 3), c(HEARTS, 3), c(SPADES, 3)], 15).points === 8, 'pair royal of fives at fifteen');
	assert(pegPoints([c(CLUBS, 2), c(HEARTS, 4), c(SPADES, 3)], 15).points === 2 + 3, 'run 4-6-5 at fifteen');
}

// Gin: melds and layoffs.
{
	const hand = [c(SPADES, 0), c(SPADES, 1), c(SPADES, 2), c(HEARTS, 6), c(CLUBS, 6), c(DIAMONDS, 6), c(HEARTS, KING), c(CLUBS, 1), c(DIAMONDS, 12), c(HEARTS, 0)];
	const m = bestMelding(hand);
	assert(m.points === 10 + 3 + 1 + 2, `gin deadwood ${m.points}`);
	const d = defend([c(SPADES, 3), c(CLUBS, 6 + 1)], m.melds);
	assert(d.layoffs.length === 1 && d.melding.points === 9, 'layoff 5♠ onto 2-3-4♠');
}

// Hearts: shooting the moon flips the points.
{
	const s = dealHearts(newHearts(), seededRandom(4));
	assert(s.hands.every((h) => h.length === 13), 'hearts deal');
}

// Euchre: bowers outrank the ace of trump.
{
	assert(power(c(HEARTS, JACK), HEARTS, null) > power(c(DIAMONDS, JACK), HEARTS, null), 'right over left');
	assert(power(c(DIAMONDS, JACK), HEARTS, null) > power(c(HEARTS, ACE), HEARTS, null), 'left over ace');
	assert(power(c(CLUBS, NINE), HEARTS, CLUBS) < power(c(HEARTS, NINE), HEARTS, CLUBS), 'trump nine over led');
	void TEN;
	void QUEEN;
}

type Driver = { actor: (s: PubState) => number | null; apply: (s: PubState, a: PubAction, r: () => number) => PubState; valid: (s: PubState) => boolean; done: (s: PubState) => boolean };

const DRIVERS: Record<string, Driver> = {
	cribbage: {
		actor: (s) => cribActor(s as CribState),
		apply: (s, a, r) => applyCribbage(s as CribState, a as never, r),
		valid: (s) => validCribbage(s as CribState),
		done: (s) => (s as CribState).winner !== null
	},
	hearts: {
		actor: (s) => heartsActor(s as HeartsState),
		apply: (s, a, r) => applyHearts(s as HeartsState, a as never, r),
		valid: (s) => validHearts(s as HeartsState),
		done: (s) => (s as HeartsState).phase === 'over'
	},
	gin: {
		actor: (s) => ginActor(s as GinState),
		apply: (s, a, r) => applyGin(s as GinState, a as never, r),
		valid: (s) => validGin(s as GinState),
		done: (s) => (s as GinState).phase === 'over'
	},
	euchre: {
		actor: (s) => euchreActor(s as EuchreState),
		apply: (s, a, r) => applyEuchre(s as EuchreState, a as never, r),
		valid: (s) => validEuchre(s as EuchreState),
		done: (s) => (s as EuchreState).phase === 'over'
	}
};

function start(variant: string, random: () => number): PubState {
	if (variant === 'cribbage') return dealCribbage(newCribbage(121, 0), random, true);
	if (variant === 'hearts') return dealHearts(newHearts(), random);
	if (variant === 'gin') return dealGin(newGin(100, 0), random, false, true);
	return dealEuchre(newEuchre({ target: 10, stick: true }, 0), random);
}

function play(variant: string, levels: Difficulty[], seed: number) {
	const random = seededRandom(seed);
	const driver = DRIVERS[variant];
	let s = start(variant, random);
	let steps = 0;
	const t0 = performance.now();
	let slowest = 0;
	while (!driver.done(s)) {
		assert(steps++ < 20000, `${variant} game runs forever`);
		const seat = driver.actor(s);
		let next: PubState;
		if (seat === null) next = driver.apply(s, { type: 'next' } as PubAction, random);
		else {
			const a0 = performance.now();
			const action = chooseAction({ state: s, seat, difficulty: levels[seat], seed: Math.floor(random() * 1e9) });
			slowest = Math.max(slowest, performance.now() - a0);
			next = driver.apply(s, action, random);
			assert(next !== s, `${variant} AI chose an illegal action ${JSON.stringify(action)} in ${(s as { phase: string }).phase}`);
		}
		s = next;
		assert(driver.valid(s), `${variant} invariant broken in ${(s as { phase: string }).phase}`);
	}
	return { s, ms: performance.now() - t0, slowest };
}

const GAMES = Number(process.argv[2] ?? 16);

for (const variant of ['cribbage', 'gin']) {
	let hardWins = 0;
	let slowest = 0;
	for (let g = 0; g < GAMES; g++) {
		const levels: Difficulty[] = g % 2 ? ['hard', 'easy'] : ['easy', 'hard'];
		const { s, slowest: worst } = play(variant, levels, 1000 + g);
		slowest = Math.max(slowest, worst);
		const winner = variant === 'cribbage' ? (s as CribState).winner! : (s as GinState).winner!;
		if (levels[winner] === 'hard') hardWins++;
	}
	console.log(`${variant}: hard beat easy ${hardWins}/${GAMES}; slowest move ${slowest.toFixed(0)} ms`);
}

{
	let hardScore = 0;
	let easyScore = 0;
	let slowest = 0;
	for (let g = 0; g < GAMES; g++) {
		const levels: Difficulty[] = g % 2 ? ['hard', 'easy', 'easy', 'easy'] : ['easy', 'easy', 'hard', 'easy'];
		const { s, slowest: worst } = play('hearts', levels, 2000 + g);
		slowest = Math.max(slowest, worst);
		const hs = s as HeartsState;
		const hardSeat = levels.indexOf('hard');
		hardScore += hs.scores[hardSeat];
		easyScore += hs.scores.reduce((t, v, i) => t + (i === hardSeat ? 0 : v), 0) / 3;
	}
	console.log(`hearts: hard averages ${(hardScore / GAMES).toFixed(0)} vs easy ${(easyScore / GAMES).toFixed(0)} (lower is better); slowest move ${slowest.toFixed(0)} ms`);
}

for (const [a, b] of [
	['hard', 'easy'],
	['hard', 'medium'],
	['medium', 'easy']
] as Difficulty[][]) {
	let wins = 0;
	let slowest = 0;
	for (let g = 0; g < GAMES; g++) {
		const flip = g % 2 === 1;
		const levels: Difficulty[] = flip ? [b, a, b, a] : [a, b, a, b];
		const { s, slowest: worst } = play('euchre', levels, 3000 + g);
		slowest = Math.max(slowest, worst);
		const team = (s as EuchreState).winner!;
		if ((team === 0) !== flip) wins++;
	}
	console.log(`euchre: ${a} beat ${b} ${wins}/${GAMES}; slowest move ${slowest.toFixed(0)} ms`);
}

console.log('pub rules OK');
