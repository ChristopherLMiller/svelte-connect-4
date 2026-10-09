<script lang="ts">
	import CardLayer from '../../kit/cards/CardLayer.svelte';
	import Chips from './Chips.svelte';
	import { SUIT_GLYPH, type Card, type Suit } from '../../kit/cards/deck';
	import { PUB_BACK } from '../back';
	import { layoutTable, type TableInput } from '../table';
	import { pubView } from '../settings.svelte';
	import { deadwoodOf } from '../rules/gin';
	import { sitsOut, teamOf } from '../rules/euchre';
	import { SEAT_GLOW } from '../types';
	import { viewOf } from '../views';
	import type { PubSession } from '../session.svelte';

	let { session }: { session: PubSession } = $props();

	let w = $state(0);
	let h = $state(0);

	const lone = $derived(session.humans.filter(Boolean).length === 1);

	const view = $derived.by(() => {
		const s = session.state;
		if (!s || !w || !h) return null;
		const input: TableInput = {
			state: s,
			viewer: session.viewer,
			players: session.players,
			place: (seat) => session.place(seat),
			playable: session.playable,
			selected: session.selected,
			hints: pubView.hints,
			stage: session.stage,
			reveal: (seat) => (session.curtain ? false : lone ? session.humans[seat] : seat === session.viewer),
			myTurn: session.myTurn,
			knocking: session.knocking,
			suggested: session.coaching && !(session.advice?.button === 'knock' && !session.knocking) ? (session.advice?.cards ?? []) : [],
			suggestedSpot: session.coaching ? (session.advice?.spot ?? null) : null
		};
		return layoutTable(input, w, h);
	});

	function plateInfo(seat: number): { score: string; sub: string; tags: string[] } {
		const s = session.state!;
		const tags: string[] = [];
		switch (s.kind) {
			case 'cribbage':
				if (s.dealer === seat) tags.push('Dealer');
				return { score: `${s.scores[seat]}`, sub: 'of 121', tags };
			case 'gin': {
				if (s.dealer === seat) tags.push('Dealer');
				const mine = session.place(seat) === 0 && !session.curtain && (lone ? session.humans[seat] : seat === session.viewer);
				return { score: `${s.scores[seat]}`, sub: mine && s.hands[seat].length ? `deadwood ${deadwoodOf(s.hands[seat])}` : `${s.boxes[seat]} won`, tags };
			}
			case 'hearts':
				return { score: `${s.scores[seat]}`, sub: s.taking[seat] ? `+${s.taking[seat]} this hand` : 'points', tags };
			case 'euchre': {
				if (s.dealer === seat) tags.push('Dealer');
				if (s.maker === seat) tags.push(`Called ${SUIT_GLYPH[s.trump!]}${s.alone ? ' · alone' : ''}`);
				if (s.defender === seat) tags.push('Defending alone');
				if (sitsOut(s, seat)) tags.push('Sitting out');
				const team = teamOf(seat);
				return { score: `${s.tricks[seat]}`, sub: `trick${s.tricks[seat] === 1 ? '' : 's'} · team ${team === teamOf(session.viewer) ? 'us' : 'them'}`, tags };
			}
			case 'spades': {
				if (s.dealer === seat) tags.push('Dealer');
				const bid = s.bids[seat];
				if (bid === 0) tags.push(s.tricks[seat] ? 'Nil broken' : 'Nil');
				const side = seat % 2 === session.viewer % 2 ? 'us' : 'them';
				return { score: `${s.tricks[seat]}`, sub: bid === null ? `trick${s.tricks[seat] === 1 ? '' : 's'} · ${side}` : bid === 0 ? `bid nil · ${side}` : `of ${bid} bid · ${side}`, tags };
			}
			default:
				return viewOf(s)!.plate(s, seat, session.viewCtx);
		}
	}

	const SPOT_LABEL: Record<string, string> = { draw: 'Draw from the stock', take: 'Take the discard', cut: 'Cut the deck' };
	const hinted = $derived(session.coaching && session.myTurn ? (session.advice?.spot ?? null) : null);

	function trumpGlyph(text: string) {
		return SUIT_GLYPH[Number(text) as Suit];
	}

	const red = (text: string) => text === '1' || text === '3';
</script>

<div class="felt" bind:clientWidth={w} bind:clientHeight={h}>
	<div class="rail"></div>
	<div class="lamp"></div>
	{#if view}
		{#each view.marks as mark, i (i)}
			{#if mark.kind === 'trump'}
				<div class="trump" class:red={red(mark.text)} class:bold={!!mark.caption} style:left="{mark.x}px" style:top="{mark.y}px" aria-label={mark.caption ?? 'Trump'}>
					<small>{mark.caption ?? 'Trump'}</small>{trumpGlyph(mark.text)}
				</div>
			{:else if mark.kind === 'slot'}
				<div class="slot" style:left="{mark.x}px" style:top="{mark.y}px" style:width="{mark.w}px" style:height="{mark.h}px">{mark.text}</div>
			{:else}
				<div class={['mark', mark.kind]} style:left="{mark.x}px" style:top="{mark.y}px">{mark.text}</div>
			{/if}
		{/each}

		<CardLayer
			cards={view.cards}
			width={view.cw}
			back={PUB_BACK}
			lift={pubView.lift}
			onpick={(id: Card) => session.pick(id)}
			ondrop={(id: Card) => session.pick(id)}
			ondouble={(id: Card) => session.double(id)}
		/>

		{#if view.chips?.length || session.state?.kind === 'blackjack'}
			<Chips chips={view.chips ?? []} size={Math.max(20, view.cw * 0.34)} />
		{/if}

		{#each view.spots as spot (spot.action)}
			<button
				class="spot"
				class:target={spot.target}
				class:hint={hinted === spot.action}
				style:left="{spot.x}px"
				style:top="{spot.y}px"
				style:width="{spot.w}px"
				style:height="{spot.h}px"
				onclick={() => session.spot(spot.action)}
				aria-label={spot.label ?? SPOT_LABEL[spot.action] ?? spot.action}
			></button>
		{/each}

		{#each view.plates as plate (plate.seat)}
			{@const info = plateInfo(plate.seat)}
			{@const bubble = session.bubbles.find((b) => b.seat === plate.seat)}
			<div
				class={['plate', plate.anchor, `p${plate.pos}`]}
				class:turn={session.actor === plate.seat && !session.over}
				style:left="{plate.x}px"
				style:top="{plate.y}px"
				style:--glow={SEAT_GLOW[plate.seat]}
			>
				<div class="name">
					<b>{session.names[plate.seat]}</b>
					{#if session.thinking === plate.seat}<span class="dots" aria-label="thinking"><i></i><i></i><i></i></span>{/if}
				</div>
				<div class="score"><strong>{info.score}</strong><small>{info.sub}</small></div>
				{#if info.tags.length}
					<div class="tags">
						{#each info.tags as tag (tag)}<span>{tag}</span>{/each}
					</div>
				{/if}
				{#if bubble}
					{#key bubble.id}
						<div class={['bubble', bubble.tone]} role="status">{bubble.text}</div>
					{/key}
				{/if}
			</div>
		{/each}
	{/if}
</div>

<style>
	.felt {
		position: relative;
		width: 100%;
		height: 100%;
		border-radius: 28px;
		background:
			radial-gradient(ellipse 70% 60% at 50% 42%, rgba(255, 214, 140, 0.16), transparent 70%),
			radial-gradient(ellipse 120% 90% at 50% 50%, #24603f 0%, #184631 55%, #0e2b1e 100%);
		box-shadow:
			inset 0 0 0 10px #3a2414,
			inset 0 0 0 12px #6b4524,
			inset 0 0 0 14px #2a180c,
			inset 0 0 60px 20px rgba(0, 0, 0, 0.55),
			0 30px 60px rgba(0, 0, 0, 0.5);
		overflow: hidden;
		touch-action: manipulation;
	}

	.felt::before {
		content: '';
		position: absolute;
		inset: 0;
		background-image: repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.012) 0 2px, transparent 2px 4px), repeating-linear-gradient(-45deg, rgba(0, 0, 0, 0.03) 0 2px, transparent 2px 5px);
		pointer-events: none;
	}

	.rail {
		position: absolute;
		inset: 0;
		border-radius: 28px;
		box-shadow: inset 0 2px 0 14px rgba(255, 200, 140, 0.05);
		pointer-events: none;
	}

	.lamp {
		position: absolute;
		left: 50%;
		top: 40%;
		width: 70%;
		height: 70%;
		translate: -50% -50%;
		background: radial-gradient(closest-side, rgba(255, 200, 110, 0.12), transparent);
		animation: flicker 5s ease-in-out infinite;
		pointer-events: none;
	}

	@keyframes flicker {
		0%,
		100% {
			opacity: 1;
		}
		40% {
			opacity: 0.86;
		}
		43% {
			opacity: 0.97;
		}
		70% {
			opacity: 0.9;
		}
	}

	.mark {
		position: absolute;
		translate: -50% -50%;
		pointer-events: none;
		white-space: nowrap;
		font-family: 'Cabin Sketch', 'Spectral', serif;
		color: rgba(244, 230, 200, 0.6);
		font-size: 0.82rem;
		letter-spacing: 0.06em;
		z-index: 1;
	}

	.mark.count {
		z-index: 300;
		padding: 4px 14px;
		border-radius: 999px;
		background: rgba(14, 10, 6, 0.72);
		border: 1px solid rgba(224, 165, 72, 0.5);
		color: #f4e6c8;
		font-size: 1.05rem;
		font-family: 'Playfair Display SC', Georgia, serif;
	}

	.trump {
		position: absolute;
		translate: -50% -50%;
		z-index: 2;
		display: grid;
		place-items: center;
		width: 64px;
		height: 64px;
		border-radius: 50%;
		background: radial-gradient(circle at 40% 35%, #fbf3e0, #dccaa4);
		box-shadow:
			0 0 0 3px #b8873a,
			0 6px 16px rgba(0, 0, 0, 0.45);
		color: #1d1a18;
		font-size: 1.8rem;
		line-height: 1;
		opacity: 0.32;
		pointer-events: none;
	}

	.trump small {
		font-size: 0.5rem;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		margin-bottom: -10px;
	}

	.trump.red {
		color: #b3262e;
	}

	.trump.bold {
		opacity: 0.92;
	}

	.spot {
		position: absolute;
		z-index: 350;
		border: 0;
		background: transparent;
		border-radius: 10px;
		cursor: pointer;
	}

	.spot:focus-visible {
		outline: 2px solid #e0a548;
	}

	.spot.target {
		outline: 2px dashed rgba(255, 212, 138, 0.75);
		outline-offset: 2px;
		background: rgba(255, 212, 138, 0.08);
	}

	.spot.hint {
		outline: 2px solid rgba(80, 230, 215, 0.95);
		outline-offset: 2px;
		box-shadow: 0 0 18px rgba(80, 230, 215, 0.55);
		background: rgba(80, 230, 215, 0.08);
		animation: spot-hint 1.6s ease-in-out infinite;
	}

	@keyframes spot-hint {
		50% {
			box-shadow: 0 0 28px rgba(80, 230, 215, 0.8);
		}
	}

	.slot {
		position: absolute;
		translate: -50% -50%;
		box-sizing: border-box;
		display: grid;
		place-items: center;
		border-radius: 7%;
		border: 2px dashed rgba(244, 230, 200, 0.22);
		background: rgba(0, 0, 0, 0.12);
		color: rgba(244, 230, 200, 0.4);
		font: 700 0.9rem 'Playfair Display SC', Georgia, serif;
		text-align: center;
		pointer-events: none;
		z-index: 1;
	}

	.plate {
		position: absolute;
		z-index: 320;
		min-width: 128px;
		padding: 7px 12px 8px;
		border-radius: 14px;
		background: linear-gradient(180deg, rgba(40, 26, 15, 0.9), rgba(18, 12, 7, 0.92));
		border: 1px solid rgba(224, 165, 72, 0.3);
		color: #f4e6c8;
		box-shadow: 0 8px 18px rgba(0, 0, 0, 0.45);
		transition:
			border-color 240ms ease,
			box-shadow 240ms ease;
		pointer-events: none;
	}

	.plate.right {
		translate: -100% 0;
	}

	.plate.turn {
		border-color: var(--glow);
		box-shadow:
			0 8px 18px rgba(0, 0, 0, 0.45),
			0 0 18px color-mix(in srgb, var(--glow) 45%, transparent);
	}

	.name {
		display: flex;
		align-items: center;
		gap: 8px;
		font-family: 'Playfair Display SC', Georgia, serif;
		font-size: 0.95rem;
	}

	.name b {
		font-weight: 700;
		color: var(--glow);
	}

	.score {
		display: flex;
		align-items: baseline;
		gap: 6px;
		white-space: nowrap;
	}

	.score strong {
		font-family: 'Playfair Display SC', Georgia, serif;
		font-size: 1.3rem;
	}

	.score small {
		font-size: 0.72rem;
		color: #bfa985;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		margin-top: 4px;
	}

	.tags span {
		padding: 1px 7px;
		border-radius: 999px;
		font-size: 0.64rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		background: rgba(224, 165, 72, 0.16);
		color: #f0c47a;
	}

	.dots {
		display: inline-flex;
		gap: 3px;
	}

	.dots i {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--glow);
		animation: dot 1s ease-in-out infinite;
	}

	.dots i:nth-child(2) {
		animation-delay: 0.15s;
	}

	.dots i:nth-child(3) {
		animation-delay: 0.3s;
	}

	@keyframes dot {
		50% {
			opacity: 0.25;
			translate: 0 -2px;
		}
	}

	.bubble {
		position: absolute;
		left: 12px;
		bottom: calc(100% + 10px);
		padding: 7px 13px;
		border-radius: 14px;
		background: #fbf3e0;
		color: #2a1c10;
		font-family: Spectral, Georgia, serif;
		font-weight: 600;
		font-size: 0.92rem;
		white-space: nowrap;
		box-shadow: 0 8px 18px rgba(0, 0, 0, 0.4);
		animation: pop 2.2s ease forwards;
	}

	.bubble::after {
		content: '';
		position: absolute;
		left: 18px;
		top: 100%;
		border: 7px solid transparent;
		border-top-color: #fbf3e0;
	}

	.p2 .bubble,
	.p3 .bubble {
		bottom: auto;
		top: calc(100% + 10px);
	}

	.p2 .bubble::after,
	.p3 .bubble::after {
		top: auto;
		bottom: 100%;
		border-top-color: transparent;
		border-bottom-color: #fbf3e0;
	}

	.right .bubble {
		left: auto;
		right: 12px;
	}

	.right .bubble::after {
		left: auto;
		right: 18px;
	}

	.bubble.score {
		background: #ffe2a0;
	}

	.bubble.call {
		background: #f4c56a;
		font-family: 'Playfair Display SC', Georgia, serif;
	}

	@keyframes pop {
		0% {
			opacity: 0;
			scale: 0.8;
		}
		8% {
			opacity: 1;
			scale: 1.04;
		}
		14% {
			scale: 1;
		}
		85% {
			opacity: 1;
		}
		100% {
			opacity: 0;
		}
	}

	@media (max-width: 640px) {
		.plate {
			min-width: 0;
			padding: 5px 9px 6px;
		}

		.name {
			font-size: 0.8rem;
		}

		.score strong {
			font-size: 1.05rem;
		}

		.felt {
			border-radius: 18px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.lamp,
		.dots i,
		.spot.hint {
			animation: none;
		}

		.bubble {
			animation: fade 2.2s linear forwards;
		}

		@keyframes fade {
			85% {
				opacity: 1;
			}
			100% {
				opacity: 0;
			}
		}
	}
</style>
