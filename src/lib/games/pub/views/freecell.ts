import { SUIT_GLYPH, card, label, suitOf, type Card } from '../../kit/cards/deck';
import { freeCellHint } from '../bots/freecell';
import { canAutoFC, locateFC, maxRun, targetsFC, type FreeCellAction, type FreeCellState } from '../rules/freecell';
import { lowRank, pileOf } from '../rules/patience';
import { cardLook, columnsX, layColumn, patienceButtons, tableauY, topRowY } from './patience';
import type { GameView } from './types';

const home = (s: FreeCellState) => s.foundations.reduce((t, f) => t + f.length, 0);

export const FREECELL_VIEW: GameView<FreeCellState> = {
	glyph: { glyph: 'F♣', red: false },
	tips: [
		'An empty column is worth more than a free cell: it doubles how many cards you can move at once.',
		'Before you park a card in a cell, know how it’s getting out again.',
		'Dig out the aces and twos first; they’re usually buried.',
		'Almost every deal can be won, so Undo is your friend.'
	],
	noPlates: true,
	lesson: {
		seed: 1,
		difficulty: 'easy',
		concepts: [
			{
				id: 'goal',
				title: 'FreeCell',
				body: [
					'FreeCell is the solitaire where every card is face up from the start. Get all 52 onto the four **foundations** at the top right, ace up to king in each suit.',
					'I’m Rosie. I’ll show you the move I’d make each time and tell you why. Whatever I suggest glows teal.'
				],
				when: ({ s }) => s.kind === 'freecell'
			},
			{
				id: 'build',
				title: 'Building down',
				body: ['In the eight columns, cards go down in **alternating colours**: a red 9 on a black 10.', 'Tap a card to move it. If it could go to more than one place, tap where.'],
				example: [card(2, 7), card(1, 6), card(0, 5)],
				when: ({ s }) => {
					if (s.kind !== 'freecell') return false;
					const h = freeCellHint(s);
					return h.kind === 'move' && h.to.startsWith('t');
				}
			},
			{
				id: 'cells',
				title: 'Free cells',
				body: ['The spaces at the top left are **free cells**. Each holds one card while you dig underneath.', 'They fill up fast, so only park a card when you can see how it gets out.'],
				when: ({ s }) => {
					if (s.kind !== 'freecell') return false;
					const h = freeCellHint(s);
					return h.kind === 'move' && h.to.startsWith('c');
				}
			},
			{
				id: 'runs',
				title: 'Moving runs',
				body: ({ s }) => (s.kind === 'freecell' ? [`You can move a whole run at once if there’s room to shuffle it through: one card per free cell, plus one, doubled for each empty column.`, `Right now that’s **${maxRun(s, false)}** cards.`] : []),
				when: ({ s }) => {
					if (s.kind !== 'freecell') return false;
					const h = freeCellHint(s);
					if (h.kind !== 'move') return false;
					const at = locateFC(s, h.card);
					return !!at && at.pile.startsWith('t') && s.tableau[pileOf(at.pile).i].length - at.index > 1;
				}
			},
			{
				id: 'home',
				title: 'Going home',
				body: ['Cards go home automatically once nothing on the table could need them.', 'Others you send up yourself when they’re next in their suit.'],
				when: ({ s }) => {
					if (s.kind !== 'freecell') return false;
					const h = freeCellHint(s);
					return h.kind === 'move' && h.to.startsWith('f');
				}
			},
			{
				id: 'empty',
				title: 'An empty column',
				body: ['A column is empty. Any card or run can go there, and it doubles how much you can move at once. Don’t fill it without a good reason.'],
				when: ({ s }) => s.kind === 'freecell' && s.tableau.some((c) => !c.length)
			}
		],
		done: (s) => s.kind === 'freecell' && (s.phase === 'over' || s.moves >= 40),
		wrap: {
			title: 'That’s FreeCell!',
			body: ['You’ve built down, used the cells and sent cards home. Nearly every deal can be solved, so if you get stuck, Undo and look again.', 'Keep playing this one with me watching, or head back to the bar.']
		}
	},

	cardWidth: (w, h) => Math.max(34, Math.min(w / 9.4, h / 5.6, 100)),

	layout(s, k) {
		const xs = columnsX(k, 8);
		const y0 = topRowY(k);
		const sel = k.input.selected[0];
		const targets = sel !== undefined && k.input.myTurn ? targetsFC(s, sel) : [];
		const spot = (to: string, x: number, y: number) => {
			if (targets.includes(to)) k.spots.push({ x: x - k.cw / 2, y: y - k.ch / 2, w: k.cw, h: k.ch, action: `to-${to}`, label: `Move it to ${to.startsWith('f') ? 'the foundation' : to.startsWith('c') ? 'a free cell' : `column ${Number(to.slice(1)) + 1}`}`, target: true });
		};

		const slots = s.cells.length + 4;
		const top = (i: number) => xs[0] + (i * (xs[7] - xs[0])) / (slots - 1);
		s.cells.forEach((c, i) => {
			const x = top(i);
			if (c === null) k.marks.push({ x, y: y0, text: '', kind: 'slot', w: k.cw, h: k.ch });
			else k.put(c, { x, y: y0, rot: 0, face: true, z: 40 + i, ...cardLook(k, c) });
			spot(`c${i}`, x, y0);
		});

		s.foundations.forEach((f, i) => {
			const x = top(s.cells.length + i);
			if (!f.length) k.marks.push({ x, y: y0, text: SUIT_GLYPH[i], kind: 'slot', w: k.cw, h: k.ch });
			f.forEach((c, j) => k.put(c, { x, y: y0, rot: 0, face: true, z: 60 + j, ...(j === f.length - 1 ? cardLook(k, c) : {}) }));
			spot(`f${i}`, x, y0);
		});

		const ty = tableauY(k);
		s.tableau.forEach((col, i) => {
			if (!col.length) k.marks.push({ x: xs[i], y: ty, text: '', kind: 'slot', w: k.cw, h: k.ch });
			const next = layColumn(k, col, 0, xs[i], ty, 100 + i * 30, (c) => cardLook(k, c));
			spot(`t${i}`, xs[i], col.length ? Math.min(next, k.h - k.ch / 2) : ty);
		});
	},

	plate: () => ({ score: '', sub: '', tags: [] }),

	prompt(s, p) {
		const sel = p.selected[0];
		const text = sel !== undefined ? `Tap where the **${label(sel)}** goes` : `**${home(s)}** of 52 home · ${s.moves} moves · move up to ${maxRun(s, false)} at once`;
		if (canAutoFC(s)) return { kind: 'line', text: `Every column runs high to low. **Sending them home** · ${home(s)} of 52`, muted: true };
		return { kind: 'line', text, buttons: p.my ? patienceButtons(s.past.length > 0) : [] };
	},

	ledger(s) {
		return {
			rows: [
				{ label: 'Cards home', value: `${home(s)} of 52` },
				{ label: 'Moves', value: `${s.moves}` },
				{ label: 'Free cells', value: `${s.cells.filter((c) => c === null).length} of ${s.cells.length} empty` }
			],
			notes: [`${s.cells.length} free cells`, 'Build down in alternating colours; foundations go up by suit from the ace']
		};
	},

	result(s) {
		if (s.solved) return { kicker: 'FreeCell', title: 'Solved!', body: `All 52 cards home in ${s.moves} moves.` };
		return { kicker: 'FreeCell', title: 'Not out this time', body: `${home(s)} of 52 cards made it home. Nearly every deal can be won, so try another.` };
	},

	guide: {
		intro: 'Every card is dealt face up. Get all 52 onto the four **foundations**, one per suit, from ace up to king.',
		cols: [
			{
				title: 'The table',
				items: [
					'Build the eight columns **down in alternating colours**.',
					'Each **free cell** holds one card. Any card can fill an empty column.',
					'You can move a run of cards at once: one per empty free cell, plus one, doubled for each empty column.',
					'Tap a card to move it. If it could go to more than one place, tap where.'
				]
			},
			{
				title: 'Levels',
				items: [
					'Easy has five free cells, medium four, hard three.',
					'Cards nothing could need any more go home on their own. Double-tap a card to send it home yourself.',
					'**Undo** takes back a move. Once every column runs high to low, the rest go home on their own.'
				]
			}
		]
	},

	legal: (s) => {
		if (s.phase !== 'play') return [];
		const out: Card[] = [];
		const consider = (c: Card | null | undefined) => c !== null && c !== undefined && targetsFC(s, c).length && out.push(c);
		s.cells.forEach(consider);
		s.tableau.forEach((col) => col.forEach(consider));
		return out;
	},

	tap: (s, c) => {
		const t = targetsFC(s, c);
		if (t.length === 1) return { type: 'move', card: c, to: t[0] };
		const up = t.find((x) => x.startsWith('f'));
		if (up && t.every((x) => x.startsWith('f') || x.startsWith('c'))) return { type: 'move', card: c, to: up };
		return t.length ? 'select' : null;
	},

	double: (s, c) => {
		const up = targetsFC(s, c).find((t) => t.startsWith('f'));
		return up ? { type: 'move', card: c, to: up } : null;
	},

	autoStep: (s) => {
		if (!canAutoFC(s) || s.phase !== 'play') return null;
		const tops = [...s.cells, ...s.tableau.map((col) => col[col.length - 1])].filter((c): c is Card => c !== null && c !== undefined);
		const next = tops.sort((a, b) => lowRank(a) - lowRank(b)).find((c) => targetsFC(s, c).some((t) => t.startsWith('f')));
		return next === undefined ? null : { type: 'move', card: next, to: `f${suitOf(next)}` };
	},

	spot: (_s, id, _seat, selected): FreeCellAction | null => {
		if (!id.startsWith('to-') || selected[0] === undefined) return null;
		return { type: 'move', card: selected[0], to: id.slice(3) };
	},

	react(prev, next, act, _seat, fx) {
		const action = act as FreeCellAction;
		if (action.type === 'move' || action.type === 'undo') fx.sound('card');
		if (action.type === 'auto') fx.sound('deal');
		if (next.foundations.some((f, i) => f.length === 13 && prev.foundations[i].length < 13)) fx.stir();
		if (next.solved && !prev.solved) fx.cheer();
	}
};
