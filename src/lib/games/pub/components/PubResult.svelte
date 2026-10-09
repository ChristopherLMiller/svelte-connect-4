<script lang="ts">
	import { fade, fly, scale } from 'svelte/transition';
	import { teamOf } from '../rules/euchre';
	import { viewOf } from '../views';
	import type { PubSession } from '../session.svelte';

	let { session }: { session: PubSession } = $props();

	let shown = $state(false);

	$effect(() => {
		const over = session.screen === 'play' && session.over;
		if (!over) {
			shown = false;
			session.resultHidden = false;
			return;
		}
		const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
		const timer = window.setTimeout(() => (shown = true), reduced ? 250 : 1400);
		return () => window.clearTimeout(timer);
	});

	const lone = $derived(session.humans.filter(Boolean).length === 1);

	const copy = $derived.by(() => {
		const s = session.state;
		if (!s) return { kicker: '', title: '', body: '' };
		const names = session.names;
		const w = session.winners;
		const won = session.won;
		const who = w.map((seat) => names[seat]).join(' & ');
		switch (s.kind) {
			case 'cribbage': {
				const winner = s.winner!;
				const loser = 1 - winner;
				const behind = s.scores[winner] - s.scores[loser];
				const skunk = s.scores[loser] < 61 ? ' A double skunk!' : s.scores[loser] < 91 ? ' A skunk, too.' : '';
				if (lone)
					return won
						? { kicker: 'Pegged out', title: 'You win the board', body: `Home at 121, ${behind} holes clear of ${names[loser]}.${skunk} Old Tom slides his pint across.` }
						: { kicker: 'Pegged out', title: `${names[winner]} wins`, body: `Old Tom pegs home ${behind} holes ahead.${skunk} He taps the board twice for luck.` };
				return { kicker: 'Pegged out', title: `${names[winner]} wins`, body: `${behind} holes clear at the finish.${skunk}` };
			}
			case 'hearts': {
				const scores = w.map((seat) => s.scores[seat]).join(', ');
				if (lone)
					return won
						? { kicker: 'Lowest at the table', title: w.length > 1 ? 'A shared win' : 'You take the night', body: `You finish on ${s.scores[0]}. The black lady stayed out of your pocket.` }
						: { kicker: 'Someone passed 100', title: `${who} ${w.length > 1 ? 'share' : 'takes'} it`, body: `They finish on ${scores}. You end on ${s.scores[0]}.` };
				return { kicker: 'Lowest at the table', title: `${who} ${w.length > 1 ? 'share' : 'takes'} it`, body: `Finishing on ${scores} after ${s.handNo} hands.` };
			}
			case 'gin': {
				const f = s.final!;
				const winner = s.winner!;
				const line = `Game ${f.game}${f.shutout ? ' (a shutout)' : ''}, boxes ${f.boxes[winner]}, total ${f.totals[winner]} to ${f.totals[1 - winner]}.`;
				if (lone)
					return won
						? { kicker: 'Game', title: 'You win at gin', body: `${line} Maggie shakes her head and shuffles.` }
						: { kicker: 'Game', title: 'Maggie wins at gin', body: `${line} She has been playing this table since before you were born.` };
				return { kicker: 'Game', title: `${names[winner]} wins at gin`, body: line };
			}
			case 'euchre': {
				const team = s.winner!;
				const line = `${s.scores[team]} to ${s.scores[1 - team]}.`;
				if (lone)
					return team === teamOf(0)
						? { kicker: 'Game', title: 'You and Nell win', body: `${line} Nell raises her glass across the table.` }
						: { kicker: 'Game', title: 'Fergus and Bert win', body: `${line} Bert won't stop talking about that last hand.` };
				return { kicker: 'Game', title: `${who} win`, body: line };
			}
			case 'spades': {
				const team = s.winner!;
				const line = `${s.scores[team]} to ${s.scores[1 - team]} after ${s.handNo} hand${s.handNo === 1 ? '' : 's'}.`;
				const kicker = s.scores[1 - team] <= -200 ? 'Sunk below −200' : `First to ${s.target}`;
				if (lone)
					return team === 0
						? { kicker, title: 'You and Nell win', body: `${line} Nell taps the table: “Never doubted the bid.”` }
						: { kicker, title: 'Fergus and Bert win', body: `${line} Fergus is already counting the bags he didn’t take.` };
				return { kicker, title: `${who} win`, body: line };
			}
			default:
				return viewOf(s)!.result(s, { ...session.viewCtx, won, winners: w });
		}
	});
</script>

{#if shown}
	{#if session.resultHidden}
		<button class="pill" transition:fly={{ y: 20, duration: 220 }} onclick={() => (session.resultHidden = false)}>
			<i aria-hidden="true">★</i>{copy.title}
		</button>
	{:else}
		<div class="overlay" transition:fade={{ duration: 300 }}>
			<div class="panel" class:won={session.won || session.mode === 'local'} transition:scale={{ start: 0.92, duration: 340, delay: 80 }}>
				<div class="seal" aria-hidden="true">{session.won || session.mode === 'local' ? '★' : '☾'}</div>
				<p>{copy.kicker}</p>
				<h2>{copy.title}</h2>
				<span>{copy.body}</span>
				<div class="actions">
					<button type="button" class="primary" onclick={() => session.rematch()}>Deal another game</button>
					<button type="button" onclick={() => (session.resultHidden = true)}>See the table</button>
					<button type="button" onclick={() => session.backToMenu()}>Back to the bar</button>
				</div>
			</div>
		</div>
	{/if}
{/if}

<style>
	.overlay {
		position: absolute;
		inset: 0;
		z-index: 9;
		display: grid;
		place-items: center;
		padding: 16px;
		background: radial-gradient(ellipse at center, rgba(20, 10, 4, 0.4), rgba(10, 5, 2, 0.75));
	}

	.panel {
		position: relative;
		width: min(470px, 100%);
		padding: 34px 24px 22px;
		border-radius: 20px;
		text-align: center;
		color: #f4e6c8;
		background: linear-gradient(180deg, rgba(50, 33, 18, 0.97), rgba(20, 13, 7, 0.98));
		border: 1px solid rgba(224, 165, 72, 0.45);
		box-shadow:
			0 24px 60px rgba(0, 0, 0, 0.6),
			inset 0 1px 0 rgba(255, 220, 160, 0.2);
	}

	.panel.won {
		box-shadow:
			0 24px 60px rgba(0, 0, 0, 0.6),
			0 0 60px rgba(255, 196, 106, 0.25),
			inset 0 1px 0 rgba(255, 220, 160, 0.2);
	}

	.seal {
		width: 62px;
		height: 62px;
		margin: -66px auto 10px;
		display: grid;
		place-items: center;
		border-radius: 50%;
		font-size: 1.8rem;
		color: #2a170a;
		background: radial-gradient(circle at 35% 30%, #ffe2a0, #c98d34 70%, #7a4e18);
		box-shadow:
			0 0 0 3px #2a170a,
			0 0 0 5px #c98d34,
			0 10px 24px rgba(0, 0, 0, 0.5);
		animation: stamp 600ms cubic-bezier(0.2, 1.5, 0.4, 1) both 150ms;
	}

	.panel p {
		margin: 0;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		font-size: 0.68rem;
		font-weight: 700;
		color: #e0a548;
	}

	h2 {
		margin: 6px 0 8px;
		font: 700 clamp(1.6rem, 4.6vw, 2.3rem) 'Playfair Display SC', Georgia, serif;
		line-height: 1.1;
		color: #ffd48a;
	}

	.panel span {
		display: block;
		color: #d8c6a2;
		line-height: 1.5;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 8px;
		margin-top: 18px;
	}

	.actions button,
	.pill {
		appearance: none;
		border: 1px solid rgba(224, 165, 72, 0.45);
		background: rgba(244, 230, 200, 0.06);
		color: #f4e6c8;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
		padding: 10px 18px;
		border-radius: 999px;
		font-size: 0.9rem;
	}

	.actions .primary {
		border-color: transparent;
		color: #1c1107;
		background: linear-gradient(180deg, #f6c873, #c88a2e);
	}

	.pill {
		position: absolute;
		z-index: 9;
		left: 50%;
		bottom: max(16px, env(safe-area-inset-bottom));
		translate: -50% 0;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		background: linear-gradient(180deg, rgba(50, 33, 18, 0.97), rgba(20, 13, 7, 0.98));
		box-shadow: 0 10px 24px rgba(0, 0, 0, 0.45);
		white-space: nowrap;
	}

	.pill i {
		font-style: normal;
		color: #ffc46a;
	}

	@keyframes stamp {
		from {
			scale: 1.8;
			opacity: 0;
		}
		to {
			scale: 1;
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.seal {
			animation: none;
		}
	}
</style>
