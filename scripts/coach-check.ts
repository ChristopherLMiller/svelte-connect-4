import { seededRandom, suitOf, rankOf, CLUBS, HEARTS, SPADES, QUEEN, type Card } from '../src/lib/games/kit/cards/deck';
import { chooseAction, strength, type PubAction, type PubState } from '../src/lib/games/pub/ai';
import { advise, followed, review } from '../src/lib/games/pub/coach';
import { actorOf, applyAction, isOver, startGame } from '../src/lib/games/pub/rules';
import { bestMelding } from '../src/lib/games/pub/rules/gin';
import { LESSONS, conceptBody } from '../src/lib/games/pub/lessons';
import { REGULARS, VARIANTS, type Variant } from '../src/lib/games/pub/types';

function assert(ok: unknown, message: string) {
	if (!ok) {
		console.error('FAIL', message);
		process.exit(1);
	}
}

const games = Number(process.argv[2] ?? 6);
const show = process.argv.includes('--show');
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7).split(',');
const level = (process.argv.find((a) => a.startsWith('--level='))?.slice(8) ?? 'medium') as 'easy' | 'medium' | 'hard';
const bad = /undefined|NaN|null|\[object/;
const variants = VARIANTS.filter((v) => !only || only.includes(v));

for (const variant of variants) {
	const names = REGULARS[variant];
	let advised = 0;
	let notes = 0;
	let slowest = 0;
	const seen = new Set<string>();
	for (let g = 0; g < games; g++) {
		const random = seededRandom(1000 + g);
		let s: PubState = startGame(variant, { euchreTarget: 5, stick: true, difficulty: level }, random);
		let steps = 0;
		while (!isOver(s) && steps++ < 6000) {
			const actor = actorOf(s);
			if (actor === null) {
				s = applyAction(s, { type: 'next' }, random);
				continue;
			}
			let action: PubAction;
			if (actor === 0) {
				const t = performance.now();
				const a = advise({ state: s, seat: 0, names, seed: Math.floor(random() * 1e9) });
				slowest = Math.max(slowest, performance.now() - t);
				advised++;
				assert(a.title && a.why, `${variant}: empty advice ${JSON.stringify(a.action)}`);
				assert(!bad.test(a.title + a.why), `${variant}: bad text "${a.title} / ${a.why}"`);
				assert(applyAction(s, a.action, seededRandom(1)) !== s, `${variant}: advice is illegal ${JSON.stringify(a.action)}`);
				const key = a.why.slice(0, 40);
				if (show && !seen.has(key) && seen.size < 40) {
					seen.add(key);
					console.log(`  [${variant}] ${a.title} — ${a.why}`);
				}
				const alt = chooseAction({ state: s, seat: 0, difficulty: 'easy', seed: Math.floor(random() * 1e9) });
				const note = followed(alt, a) ? null : review(s, 0, alt, a, names);
				if (note) {
					notes++;
					assert(!bad.test(note), `${variant}: bad note "${note}"`);
					if (show && notes < 8) console.log(`  [${variant} note] ${note}`);
				}
				action = random() < 0.5 ? a.action : alt;
			} else action = chooseAction({ state: s, seat: actor, difficulty: 'medium', seed: Math.floor(random() * 1e9) });
			const next = applyAction(s, action, random);
			assert(next !== s, `${variant}: stuck on ${JSON.stringify(action)}`);
			s = next;
		}
		assert(isOver(s), `${variant}: game ${g} did not finish`);
	}
	console.log(`${variant}: ${advised} pieces of advice, ${notes} notes, slowest ${slowest.toFixed(0)} ms`);
}

// Every lesson concept renders text for the states it fires on.
for (const variant of variants) {
	const lesson = LESSONS[variant];
	const names = REGULARS[variant];
	const random = seededRandom(lesson.seed);
	let s: PubState = startGame(variant, { euchreTarget: 10, stick: true, difficulty: lesson.difficulty ?? 'medium' }, random);
	const fired: string[] = [];
	let steps = 0;
	while (steps++ < 1500) {
		for (const c of lesson.concepts) {
			if (fired.includes(c.id) || !c.when({ s, viewer: 0, names })) continue;
			fired.push(c.id);
			const body = conceptBody(c, { s, viewer: 0, names });
			assert(body.length && body.every((p) => p && !bad.test(p)), `${variant} lesson ${c.id}: bad body`);
		}
		if (lesson.done(s)) break;
		const actor = actorOf(s);
		if (actor === null) {
			s = applyAction(s, { type: 'next' }, random);
			continue;
		}
		const action = actor === 0 ? advise({ state: s, seat: 0, names, seed: Math.floor(random() * 1e9) }).action : chooseAction({ state: s, seat: actor, difficulty: 'medium', seed: Math.floor(random() * 1e9) });
		s = applyAction(s, action, random);
	}
	assert(lesson.done(s), `${variant} lesson never finished`);
	const missed = lesson.concepts.filter((c) => !fired.includes(c.id)).map((c) => c.id);
	console.log(`${variant} lesson (seed ${lesson.seed}): ${fired.join(', ')}${missed.length ? `  (never shown: ${missed.join(', ')})` : ''}`);
}

/** Lesson seed search: the first seed whose guided hand shows every concept. */
if (process.argv.includes('--lesson-seeds')) {
	for (const variant of variants) {
		const lesson = LESSONS[variant];
		const names = REGULARS[variant];
		let found = -1;
		let bestSeed = -1;
		let bestCount = 0;
		for (let seed = 1; seed < 160 && found < 0; seed++) {
			const random = seededRandom(seed);
			let s: PubState = startGame(variant, { euchreTarget: 10, stick: true, difficulty: lesson.difficulty ?? 'medium' }, random);
			const fired = new Set<string>();
			let steps = 0;
			while (steps++ < 1500) {
				for (const c of lesson.concepts) if (!fired.has(c.id) && c.when({ s, viewer: 0, names })) fired.add(c.id);
				if (lesson.done(s)) break;
				const actor = actorOf(s);
				if (actor === null) {
					s = applyAction(s, { type: 'next' }, random);
					continue;
				}
				const action = actor === 0 ? advise({ state: s, seat: 0, names, seed: Math.floor(random() * 1e9) }).action : chooseAction({ state: s, seat: actor, difficulty: 'medium', seed: Math.floor(random() * 1e9) });
				s = applyAction(s, action, random);
			}
			if (fired.size > bestCount) {
				bestCount = fired.size;
				bestSeed = seed;
			}
			if (fired.size === lesson.concepts.length) found = seed;
		}
		console.log(`${variant} lesson seed: ${found >= 0 ? found : `none (best ${bestSeed} with ${bestCount}/${lesson.concepts.length})`}`);
	}
}

if (process.argv.includes('--seeds')) {
	const pick = (variant: Variant, good: (s: PubState) => boolean) => {
		for (let seed = 1; seed < 5000; seed++) {
			const s = startGame(variant, { euchreTarget: 10, stick: true }, seededRandom(seed));
			if (good(s)) return seed;
		}
		return -1;
	};
	console.log(
		'cribbage seed',
		pick('cribbage', (s) => {
			if (s.kind !== 'cribbage' || s.dealer !== 1) return false;
			const a = advise({ state: s, seat: 0, names: REGULARS.cribbage, seed: 1 });
			return a.why.includes('already scores') && a.why.includes('fifteen') && (a.why.includes('run') || a.why.includes('pair'));
		})
	);
	console.log(
		'hearts seed',
		pick('hearts', (s) => {
			if (s.kind !== 'hearts') return false;
			const h = s.hands[0];
			return h.includes(4 * 0) && h.includes(SPADES * 13 + QUEEN) && h.filter((c) => suitOf(c) === HEARTS && rankOf(c) >= 9).length >= 1 && h.filter((c) => suitOf(c) === CLUBS).length <= 2;
		})
	);
	console.log(
		'gin seed',
		pick('gin', (s) => {
			if (s.kind !== 'gin' || s.dealer !== 1) return false;
			const up = s.discard[0];
			const m = bestMelding([...s.hands[0], up]);
			return m.melds.some((x) => x.includes(up)) && m.melds.length >= 2;
		})
	);
	console.log(
		'euchre seed',
		pick('euchre', (s) => {
			if (s.kind !== 'euchre' || s.phase !== 'bid1' || s.turn !== 0 || s.dealer !== 3) return false;
			const trump = suitOf(s.upcard);
			return strength(s.hands[0], trump) >= 7.6 && strength(s.hands[0], trump) < 10 && s.hands[0].some((c: Card) => rankOf(c) === 9 && suitOf(c) === trump);
		})
	);
	for (let seed = 1; seed < 400; seed++) {
		const lesson = { ...LESSONS.spades, seed };
		const random = seededRandom(seed);
		let s: PubState = startGame('spades', { euchreTarget: 10, stick: true }, random);
		if (s.kind !== 'spades' || s.dealer !== 1) continue;
		const h = s.hands[0];
		const spades = h.filter((c) => suitOf(c) === SPADES).length;
		const short = [0, 1, 3].some((suit) => h.filter((c) => suitOf(c) === suit).length <= 1);
		if (spades < 3 || spades > 5 || !short) continue;
		const fired = new Set<string>();
		let steps = 0;
		while (!lesson.done(s) && steps++ < 400) {
			for (const c of lesson.concepts) if (c.when({ s, viewer: 0, names: REGULARS.spades })) fired.add(c.id);
			const actor = actorOf(s);
			const action = actor === null ? { type: 'next' as const } : actor === 0 ? advise({ state: s, seat: 0, names: REGULARS.spades, seed: Math.floor(random() * 1e9) }).action : chooseAction({ state: s, seat: actor, difficulty: 'medium', seed: Math.floor(random() * 1e9) });
			s = applyAction(s, action, random);
		}
		for (const c of lesson.concepts) if (c.when({ s, viewer: 0, names: REGULARS.spades })) fired.add(c.id);
		const want = ['bid', 'void', 'broken', 'bags', 'tally'];
		if (want.every((id) => fired.has(id))) {
			console.log('spades seed', seed, [...fired].join(', '));
			break;
		}
	}
}
