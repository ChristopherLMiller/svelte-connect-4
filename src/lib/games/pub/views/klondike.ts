import { SUIT_GLYPH, card, label, suitOf, type Card } from '../../kit/cards/deck';
import { stack } from '../../kit/cards/layout';
import { klondikeHint } from '../bots/klondike';
import { canAuto, canDrawK, canRecycle, locate, targetsK, type KlondikeAction, type KlondikeState } from '../rules/klondike';
import { lowRank, pileOf } from '../rules/patience';
import { cardLook, columnsX, layColumn, patienceButtons, tableauY, topRowY } from './patience';
import type { GameView } from './types';

const home = (s: KlondikeState) => s.foundations.reduce((t, f) => t + f.length, 0);

export const KLONDIKE_VIEW: GameView<KlondikeState> = {
	glyph: { glyph: 'K♥', red: true },
	tips: [
		'Turning over face-down cards matters more than anything else.',
		'Don’t rush cards up to the foundations if the table might still need them to build on.',
		'Only a king can fill an empty column, so don’t empty one without a king ready.',
		'Use the table before turning the stock.'
	],
	noPlates: true,
	lesson: {
		seed: 9,
		difficulty: 'easy',
		concepts: [
			{
				id: 'goal',
				title: 'Patience',
				body: [
					'Klondike is the classic solitaire. The goal is to get all 52 cards onto the four **foundations** at the top right, one per suit, from ace up to king.',
					'I’m Rosie. I’ll show you the move I’d make each time and tell you why. Whatever I suggest glows teal.'
				],
				when: ({ s }) => s.kind === 'klondike'
			},
			{
				id: 'build',
				title: 'Building down',
				body: ['In the seven columns, cards go down in **alternating colours**: a red 9 on a black 10, a black 4 on a red 5.', 'You can move a card along with everything stacked on it. Tap it; if it could go to more than one place, tap where.'],
				example: [card(2, 7), card(1, 6), card(0, 5)],
				when: ({ s }) => {
					if (s.kind !== 'klondike') return false;
					const h = klondikeHint(s);
					return 'to' in h && h.to.startsWith('t');
				}
			},
			{
				id: 'reveal',
				title: 'Uncover the hidden cards',
				body: ['Every column has face-down cards under it. Moving the face-up cards off turns the next one over.', 'Uncovering them is the heart of the game: the card you need is usually hiding.'],
				when: ({ s }) => s.kind === 'klondike' && klondikeHint(s).kind === 'reveal'
			},
			{
				id: 'home',
				title: 'The foundations',
				body: ['Aces start the foundations, then each suit builds up: 2, 3, all the way to the king.', 'Low cards are safe to send home. With higher ones, check the table doesn’t still need them.'],
				when: ({ s }) => {
					if (s.kind !== 'klondike') return false;
					const h = klondikeHint(s);
					return 'to' in h && h.to.startsWith('f');
				}
			},
			{
				id: 'stock',
				title: 'The stock',
				body: ({ s }) => (s.kind === 'klondike' ? [`When the table has nothing useful, tap the stock at the top left to turn ${s.draw === 1 ? 'a card' : 'three cards'} over. The top card of the waste can be played.`, 'When the stock runs out, tap it again to turn the waste back over.'] : []),
				when: ({ s }) => s.kind === 'klondike' && klondikeHint(s).kind === 'draw'
			},
			{
				id: 'king',
				title: 'An empty column',
				body: ['A column is empty. Only a king (with anything stacked on it) can start a new column there.'],
				when: ({ s }) => s.kind === 'klondike' && s.tableau.some((c) => !c.length)
			}
		],
		done: (s) => s.kind === 'klondike' && (s.phase === 'over' || s.moves >= 45),
		wrap: {
			title: 'That’s Klondike!',
			body: ['You’ve built down, uncovered cards and sent some home. Not every deal can be won, so don’t be shy with Undo.', 'Keep playing this one with me watching, or head back to the bar.']
		}
	},

	cardWidth: (w, h) => Math.max(36, Math.min(w / 7.8, h / 5.4, 108)),

	layout(s, k) {
		const xs = columnsX(k, 7);
		const y0 = topRowY(k);
		const sel = k.input.selected[0];
		const targets = sel !== undefined && k.input.myTurn ? targetsK(s, sel) : [];
		const spot = (to: string, x: number, y: number) => {
			if (targets.includes(to)) k.spots.push({ x: x - k.cw / 2, y: y - k.ch / 2, w: k.cw, h: k.ch, action: `to-${to}`, label: `Move it to ${to.startsWith('f') ? 'the foundation' : `column ${Number(to.slice(1)) + 1}`}`, target: true });
		};

		stack(s.stock.length, xs[0], y0, k.cw).forEach((p, i) => k.put(s.stock[i], { ...p, face: false, z: 10 + i }));
		if (!s.stock.length) k.marks.push({ x: xs[0], y: y0, text: canRecycle(s) ? '↻' : '', kind: 'slot', w: k.cw, h: k.ch });
		if (k.input.myTurn && canDrawK(s)) k.spots.push({ x: xs[0] - k.cw / 2, y: y0 - k.ch / 2, w: k.cw, h: k.ch, action: 'draw', label: s.stock.length ? 'Turn the stock' : 'Turn the waste back over' });

		const fan = s.waste.slice(-s.draw);
		s.waste.forEach((c, i) => {
			const j = i - (s.waste.length - fan.length);
			const top = i === s.waste.length - 1;
			k.put(c, { x: xs[1] + Math.max(0, j) * k.cw * 0.22, y: y0, rot: 0, face: true, z: 40 + i, ...(top ? cardLook(k, c) : {}) });
		});

		s.foundations.forEach((f, i) => {
			const x = xs[3 + i];
			if (!f.length) k.marks.push({ x, y: y0, text: SUIT_GLYPH[i], kind: 'slot', w: k.cw, h: k.ch });
			f.forEach((c, j) => k.put(c, { x, y: y0, rot: 0, face: true, z: 60 + j, ...(j === f.length - 1 ? cardLook(k, c) : {}) }));
			spot(`f${i}`, x, y0);
		});

		const ty = tableauY(k);
		s.tableau.forEach((col, i) => {
			if (!col.length) k.marks.push({ x: xs[i], y: ty, text: 'K', kind: 'slot', w: k.cw, h: k.ch });
			const next = layColumn(k, col, s.down[i], xs[i], ty, 100 + i * 30, (c) => cardLook(k, c));
			spot(`t${i}`, xs[i], col.length ? Math.min(next, k.h - k.ch / 2) : ty);
		});
	},

	plate: () => ({ score: '', sub: '', tags: [] }),

	prompt(s, p) {
		const passes = s.redeals !== null ? ` · pass ${s.passes + 1} of ${s.redeals + 1}` : '';
		const sel = p.selected[0];
		const text = sel !== undefined ? `Tap where the **${label(sel)}** goes` : `**${home(s)}** of 52 home · ${s.moves} moves${passes}`;
		if (canAuto(s)) return { kind: 'line', text: `Every card is face up. **Sending them home** · ${home(s)} of 52`, muted: true };
		return { kind: 'line', text, buttons: p.my ? patienceButtons(s.past.length > 0) : [] };
	},

	ledger(s) {
		return {
			rows: [
				{ label: 'Cards home', value: `${home(s)} of 52` },
				{ label: 'Moves', value: `${s.moves}` },
				{ label: 'Face-down cards', value: `${s.down.reduce((t, d) => t + d, 0)}` }
			],
			notes: [`Turn ${s.draw === 1 ? 'one card' : 'three cards'} at a time${s.redeals !== null ? `, ${s.redeals + 1} passes through the stock` : ''}`, 'Build down in alternating colours; foundations go up by suit from the ace']
		};
	},

	result(s) {
		if (s.solved) return { kicker: 'Klondike', title: 'Solved!', body: `All 52 cards home in ${s.moves} moves.` };
		return { kicker: 'Klondike', title: 'Not out this time', body: `${home(s)} of 52 cards made it home. Some deals just won’t come out.` };
	},

	guide: {
		intro: 'Get all 52 cards onto the four **foundations**, one per suit, from ace up to king.',
		cols: [
			{
				title: 'The table',
				items: [
					'Build the seven columns **down in alternating colours**. A card moves with everything stacked on it.',
					'Moving cards off a face-down card turns it over.',
					'Only a **king** can fill an empty column.',
					'Tap a card to move it. If it could go to more than one place, tap where.'
				]
			},
			{
				title: 'Stock and levels',
				items: [
					'Tap the stock to turn cards onto the waste; the top waste card can be played. When it’s empty, tap to turn the waste over.',
					'Easy turns one card at a time. Medium turns three. Hard turns three and allows only three passes.',
					'Double-tap a card to send it straight to its foundation.',
					'**Undo** takes back a move. Once every card is face up, the rest go home on their own.'
				]
			}
		]
	},

	legal: (s) => {
		if (s.phase !== 'play') return [];
		const out: Card[] = [];
		const consider = (c: Card | undefined) => c !== undefined && targetsK(s, c).length && out.push(c);
		consider(s.waste[s.waste.length - 1]);
		for (const f of s.foundations) consider(f[f.length - 1]);
		s.tableau.forEach((col, i) => col.slice(s.down[i]).forEach(consider));
		return out;
	},

	tap: (s, c) => {
		const t = targetsK(s, c);
		if (t.length === 1) return { type: 'move', card: c, to: t[0] };
		return t.length ? 'select' : null;
	},

	double: (s, c) => {
		const up = targetsK(s, c).find((t) => t.startsWith('f'));
		return up ? { type: 'move', card: c, to: up } : null;
	},

	autoStep: (s) => {
		if (!canAuto(s)) return null;
		const tops = s.tableau.map((col) => col[col.length - 1]).filter((c): c is Card => c !== undefined);
		const next = tops.sort((a, b) => lowRank(a) - lowRank(b)).find((c) => targetsK(s, c).some((t) => t.startsWith('f')));
		return next === undefined ? null : { type: 'move', card: next, to: `f${suitOf(next)}` };
	},

	spot: (s, id, _seat, selected): KlondikeAction | null => {
		if (id === 'draw') return canDrawK(s) ? { type: 'draw' } : null;
		if (!id.startsWith('to-') || selected[0] === undefined) return null;
		return { type: 'move', card: selected[0], to: id.slice(3) };
	},

	react(prev, next, act, _seat, fx) {
		const action = act as KlondikeAction;
		if (action.type === 'draw') fx.sound('deal');
		if (action.type === 'move' || action.type === 'undo') fx.sound('card');
		if (action.type === 'auto') fx.sound('deal');
		if (action.type === 'move' && pileOf(action.to).kind === 'f' && locate(next, action.card)) {
			if (next.foundations.some((f, i) => f.length === 13 && prev.foundations[i].length < 13)) fx.stir();
		}
		if (next.solved && !prev.solved) fx.cheer();
	}
};
