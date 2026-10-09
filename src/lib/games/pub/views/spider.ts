import { card, label, type Card } from '../../kit/cards/deck';
import { stack } from '../../kit/cards/layout';
import { spiderHint } from '../bots/spider';
import { canDealS, spiderDeck, suitedFrom, targetsS, type SpiderAction, type SpiderState } from '../rules/spider';
import { cardLook, columnsX, layColumn, patienceButtons, tableauY, topRowY } from './patience';
import type { GameView } from './types';

const SUIT_TEXT = { 1: 'one suit', 2: 'two suits', 4: 'all four suits' } as const;

export const SPIDER_VIEW: GameView<SpiderState> = {
	glyph: { glyph: '♠♠', red: false },
	tips: [
		'Turning over face-down cards matters most; an empty column comes next.',
		'Build in the same suit whenever you can. Mixed-suit stacks can’t move as one.',
		'Use the table before dealing: a new row covers every column.',
		'An empty column is precious. Use it to untangle runs, not as a parking space.'
	],
	noPlates: true,
	deck: (s) => spiderDeck(s.suits),
	lesson: {
		seed: 1,
		difficulty: 'easy',
		concepts: [
			{
				id: 'goal',
				title: 'Spider',
				body: [
					'Spider uses two decks and ten columns. The goal is to build eight complete runs, **king down to ace in one suit**. Each finished run lifts off the table by itself.',
					'I’m Rosie. I’ll show you the move I’d make each time and tell you why. Whatever I suggest glows teal.'
				],
				when: ({ s }) => s.kind === 'spider'
			},
			{
				id: 'build',
				title: 'Building down',
				body: ['Any card can go on one a rank higher, whatever the suit. But only a run in **one suit** can be picked up and moved together.', 'Tap a card to move it with everything on it. If it could go to more than one place, tap where.'],
				example: [card(2, 7), card(2, 6), card(2, 5)],
				when: ({ s }) => {
					if (s.kind !== 'spider') return false;
					const h = spiderHint(s);
					return h.kind === 'link' || h.kind === 'reveal';
				}
			},
			{
				id: 'reveal',
				title: 'Uncover the hidden cards',
				body: ['Moving the face-up cards off a column turns the next one over. That’s how you find what you need.'],
				when: ({ s }) => {
					if (s.kind !== 'spider') return false;
					const h = spiderHint(s);
					return h.kind === 'reveal' && !h.empties;
				}
			},
			{
				id: 'deal',
				title: 'Dealing',
				body: ['When the table has nothing useful left, tap the stock at the top left. It deals one card onto every column.', 'You can only deal when no column is empty.'],
				when: ({ s }) => s.kind === 'spider' && spiderHint(s).kind === 'deal'
			},
			{
				id: 'empty',
				title: 'An empty column',
				body: ['A column is empty. Any card or same-suit run can go there, which makes it the best tool on the table for sorting things out.'],
				when: ({ s }) => s.kind === 'spider' && s.tableau.some((c) => !c.length)
			}
		],
		done: (s) => s.kind === 'spider' && (s.phase === 'over' || s.moves >= 45),
		wrap: {
			title: 'That’s Spider!',
			body: ['You’ve built runs, turned cards over and dealt new rows. One suit is the friendliest; try two or four once it clicks.', 'Keep playing this one with me watching, or head back to the bar.']
		}
	},

	cardWidth: (w, h) => Math.max(30, Math.min(w / 11.2, h / 5.8, 96)),

	layout(s, k) {
		const xs = columnsX(k, 10);
		const y0 = topRowY(k);
		const sel = k.input.selected[0];
		const targets = sel !== undefined && k.input.myTurn ? targetsS(s, sel) : [];

		s.stock.forEach((c, i) => {
			const pile = Math.floor(i / 10);
			const p = stack(10, xs[0] + pile * k.cw * 0.16, y0, k.cw)[i % 10];
			k.put(c, { ...p, face: false, z: 10 + i });
		});
		if (!s.stock.length) k.marks.push({ x: xs[0], y: y0, text: '', kind: 'slot', w: k.cw, h: k.ch });
		if (k.input.myTurn && canDealS(s)) k.spots.push({ x: xs[0] - k.cw / 2, y: y0 - k.ch / 2, w: k.cw * (1 + 0.16 * (s.stock.length / 10 - 1)), h: k.ch, action: 'deal', label: 'Deal a row' });

		for (let i = 0; i < 8; i++) {
			const x = xs[2 + i];
			const run = s.done[i];
			if (!run) k.marks.push({ x, y: y0, text: '', kind: 'slot', w: k.cw, h: k.ch });
			else run.forEach((c, j) => k.put(c, { x, y: y0, rot: 0, face: true, z: 60 + i * 13 + (12 - j) }));
		}

		const ty = tableauY(k);
		s.tableau.forEach((col, i) => {
			if (!col.length) k.marks.push({ x: xs[i], y: ty, text: '', kind: 'slot', w: k.cw, h: k.ch });
			const next = layColumn(k, col, s.down[i], xs[i], ty, 200 + i * 40, (c) => cardLook(k, c));
			if (targets.includes(`t${i}`)) {
				const y = col.length ? Math.min(next, k.h - k.ch / 2) : ty;
				k.spots.push({ x: xs[i] - k.cw / 2, y: y - k.ch / 2, w: k.cw, h: k.ch, action: `to-t${i}`, label: `Move it to column ${i + 1}`, target: true });
			}
		});
	},

	plate: () => ({ score: '', sub: '', tags: [] }),

	prompt(s, p) {
		const sel = p.selected[0];
		const text = sel !== undefined ? `Tap where the **${label(sel)}** goes` : `**${s.done.length}** of 8 runs · ${s.moves} moves · ${s.stock.length / 10} deal${s.stock.length === 10 ? '' : 's'} left`;
		return { kind: 'line', text, buttons: p.my ? patienceButtons(s.past.length > 0) : [] };
	},

	ledger(s) {
		return {
			rows: [
				{ label: 'Runs finished', value: `${s.done.length} of 8` },
				{ label: 'Moves', value: `${s.moves}` },
				{ label: 'Deals left', value: `${s.stock.length / 10}` },
				{ label: 'Face-down cards', value: `${s.down.reduce((t, d) => t + d, 0)}` }
			],
			notes: [`Two decks, ${SUIT_TEXT[s.suits]}`, 'Build down; only same-suit runs move together']
		};
	},

	result(s) {
		if (s.solved) return { kicker: 'Spider', title: 'Solved!', body: `All eight runs home in ${s.moves} moves.` };
		return { kicker: 'Spider', title: 'Not out this time', body: `${s.done.length} of 8 runs finished. Spider is tough; Undo is there for a reason.` };
	},

	guide: {
		intro: 'Two decks, ten columns. Build eight runs from **king down to ace in one suit**; each finished run lifts off by itself.',
		cols: [
			{
				title: 'The table',
				items: [
					'Any card can go on one **a rank higher**, whatever the suit.',
					'Only a run in **one suit** moves together. Tap its lowest card you want to take.',
					'Any card or run can fill an empty column.',
					'Moving cards off a face-down card turns it over.'
				]
			},
			{
				title: 'Dealing and levels',
				items: ['Tap the stock to deal one card onto every column. No column may be empty when you deal.', 'Easy uses one suit, medium two, hard all four.', '**Undo** takes back a move.']
			}
		]
	},

	legal: (s) => {
		if (s.phase !== 'play') return [];
		const out: Card[] = [];
		s.tableau.forEach((col, i) => {
			for (let at = s.down[i]; at < col.length; at++) if (suitedFrom(col, at) && targetsS(s, col[at]).length) out.push(col[at]);
		});
		return out;
	},

	tap: (s, c) => {
		const t = targetsS(s, c);
		if (t.length === 1) return { type: 'move', card: c, to: t[0] };
		return t.length ? 'select' : null;
	},

	spot: (s, id, _seat, selected): SpiderAction | null => {
		if (id === 'deal') return canDealS(s) ? { type: 'deal' } : null;
		if (!id.startsWith('to-') || selected[0] === undefined) return null;
		return { type: 'move', card: selected[0], to: id.slice(3) };
	},

	react(prev, next, act, _seat, fx) {
		const action = act as SpiderAction;
		if (action.type === 'deal') fx.sound('deal');
		if (action.type === 'move' || action.type === 'undo') fx.sound('card');
		if (next.done.length > prev.done.length && action.type !== 'undo') fx.stir();
		if (next.solved && !prev.solved) fx.cheer();
	}
};
