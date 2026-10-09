import { euchreDeck, fullDeck, seededRandom, type Card } from '../src/lib/games/kit/cards/deck';
import { chooseAction, type PubState } from '../src/lib/games/pub/ai';
import { actorOf, applyAction, isOver, startGame } from '../src/lib/games/pub/rules';
import { layoutTable, type TableInput } from '../src/lib/games/pub/table';
import { VARIANTS, type Variant } from '../src/lib/games/pub/types';
import { viewOf } from '../src/lib/games/pub/views';

const players: Record<string, number> = {};

function deckOf(s: PubState): Card[] {
	return viewOf(s)?.deck?.(s) ?? (s.kind === 'euchre' ? euchreDeck() : fullDeck());
}

function input(s: PubState, n: number): TableInput {
	return {
		state: s,
		viewer: 0,
		players: n,
		place: (seat) => (n === 2 ? (seat === 0 ? 0 : 2) : seat),
		playable: [],
		selected: [],
		hints: false,
		stage: 'live',
		reveal: (seat) => seat === 0,
		myTurn: false,
		knocking: false,
		suggested: [],
		suggestedSpot: null
	};
}

const report = new Map<string, number>();

for (const v of VARIANTS as readonly Variant[]) for (const seed of [7, 8, 9, 10, 11]) {
	const random = seededRandom(seed);
	let s = startGame(v, { euchreTarget: 10, stick: true, difficulty: 'easy' }, random) as PubState;
	const n = 'hands' in s && Array.isArray(s.hands) ? s.hands.length : 1;
	players[v] = n;
	let prev: Set<Card> | null = null;
	for (let step = 0; step < 400 && !isOver(s); step++) {
		const ids = new Set(layoutTable(input(s, Math.max(2, n)), 1200, 800).cards.map((c) => c.id));
		const missing = deckOf(s).filter((c) => !ids.has(c)).length;
		if (prev) {
			let back = 0;
			for (const c of ids) if (!prev.has(c)) back++;
			let gone = 0;
			for (const c of prev) if (!ids.has(c)) gone++;
			const phase = 'phase' in s ? String(s.phase) : '?';
			if (back) report.set(`${v} ${phase}: appear`, (report.get(`${v} ${phase}: appear`) ?? 0) + back);
			if (gone && process.env.WHY) console.log(v, phase, [...prev].filter((c) => !ids.has(c)).join(','), 'result' in s ? JSON.stringify(s.result) : '');
			if (gone) report.set(`${v} ${phase}: vanish`, (report.get(`${v} ${phase}: vanish`) ?? 0) + gone);
		}
		if (missing && step === 0) report.set(`${v}: missing at start`, missing);
		prev = ids;
		const actor = actorOf(s);
		const action = actor === null ? { type: 'next' } : chooseAction({ state: s, seat: actor, difficulty: 'easy', seed: step });
		const next = applyAction(s, action as never, random);
		if (next === s) break;
		s = next;
	}
}

for (const [k, n] of [...report].sort()) console.log(k.padEnd(40), n);
