<script lang="ts">
	import PegBoard from './PegBoard.svelte';
	import SixFour from './SixFour.svelte';
	import { SUIT_GLYPH, SUIT_NAME } from '../../kit/cards/deck';
	import { PASS_NAMES, passDir } from '../rules/hearts';
	import { teamOf } from '../rules/euchre';
	import { SEAT_GLOW, VARIANT_INFO } from '../types';
	import type { PubSession } from '../session.svelte';

	let { session }: { session: PubSession } = $props();

	const s = $derived(session.state);
	const names = $derived(session.names);
	const us = $derived(teamOf(session.viewer));

	const KIND = { knock: 'knock', gin: 'gin', bigGin: 'big gin', undercut: 'undercut', void: 'void' } as const;

	const teamName = (team: number) => `${names[team]} & ${names[team + 2]}`;
</script>

{#if s}
	<aside class="ledger" aria-label="Score">
		<p class="title">{VARIANT_INFO[s.kind].title}<small>{VARIANT_INFO[s.kind].chalk}</small></p>

		{#if s.kind === 'cribbage'}
			<PegBoard scores={s.scores} prev={s.prev} {names} />
			<ul class="lanes">
				{#each [0, 1] as seat (seat)}
					<li style:--glow={SEAT_GLOW[seat]}>
						<i></i><b>{names[seat]}</b><span>{s.scores[seat]}</span>
						{#if s.dealer === seat}<em>crib</em>{/if}
					</li>
				{/each}
			</ul>
			<p class="note">Hand {s.handNo} · the leader needs {121 - Math.max(...s.scores)} more</p>
		{:else if s.kind === 'euchre'}
			<div class="counters">
				<SixFour score={s.scores[us]} red={true} label={teamName(us)} />
				<SixFour score={s.scores[1 - us]} red={false} label={teamName(1 - us)} />
			</div>
			<p class="note">
				Game to {s.target}{#if s.target > 10} · the counters show up to ten{/if}
			</p>
			{#if s.trump !== null && s.maker !== null}
				<p class="call">
					<span class={['glyph', (s.trump === 1 || s.trump === 3) && 'red']}>{SUIT_GLYPH[s.trump]}</span>
					{names[s.maker]} called {SUIT_NAME[s.trump]}{s.alone ? ', alone' : ''}
				</p>
			{/if}
			<p class="note">Stick the dealer {s.stick ? 'on' : 'off'} · farmer's hands and Canadian loners in play</p>
		{:else if s.kind === 'hearts'}
			<div class="chalk">
				<table>
					<thead>
						<tr>
							<th>#</th>
							{#each names as name, seat (seat)}<th style:color={SEAT_GLOW[seat]}>{name}</th>{/each}
						</tr>
					</thead>
					<tbody>
						{#each s.history.slice(-8) as row, i (i)}
							<tr>
								<td class="n">{Math.max(0, s.history.length - 8) + i + 1}</td>
								{#each row as pts, seat (seat)}<td class:moon={pts === 26 && row.filter((p) => p === 26).length === 3}>{pts || '–'}</td>{/each}
							</tr>
						{:else}
							<tr><td colspan="5" class="empty">No hands yet</td></tr>
						{/each}
					</tbody>
					<tfoot>
						<tr>
							<td></td>
							{#each s.scores as total, seat (seat)}<td class:low={total === Math.min(...s.scores) && s.history.length}>{total}</td>{/each}
						</tr>
					</tfoot>
				</table>
			</div>
			<p class="note">
				Lowest wins once someone reaches {s.target}{#if s.phase !== 'over'} · hand {s.handNo} passes {PASS_NAMES[passDir(s.handNo)]}{/if}
			</p>
		{:else if s.kind === 'gin'}
			<div class="chalk">
				<table>
					<thead>
						<tr>
							<th>#</th>
							{#each names as name, seat (seat)}<th style:color={SEAT_GLOW[seat]}>{name}</th>{/each}
						</tr>
					</thead>
					<tbody>
						{#each s.history.slice(-8) as row, i (i)}
							<tr>
								<td class="n">{Math.max(0, s.history.length - 8) + i + 1}</td>
								{#each [0, 1] as seat (seat)}
									<td>{row.winner === seat ? `${row.points}` : '–'}{#if row.winner === seat}<small>{KIND[row.kind]}</small>{/if}</td>
								{/each}
							</tr>
						{:else}
							<tr><td colspan="3" class="empty">No hands yet</td></tr>
						{/each}
					</tbody>
					<tfoot>
						<tr>
							<td></td>
							{#each s.scores as total, seat (seat)}<td>{total}<small>{s.boxes[seat]} box{s.boxes[seat] === 1 ? '' : 'es'}</small></td>{/each}
						</tr>
					</tfoot>
				</table>
			</div>
			{#if s.final}
				<p class="note">
					Game {s.final.game}{s.final.shutout ? ' (shutout, doubled)' : ''} · boxes {s.final.boxes[0]} / {s.final.boxes[1]} · totals {s.final.totals[0]} – {s.final.totals[1]}
				</p>
			{:else}
				<p class="note">First to {s.target}. Each hand won is a box worth 25 at the end</p>
			{/if}
		{/if}
	</aside>
{/if}

<style>
	.ledger {
		display: grid;
		align-content: start;
		gap: 12px;
		padding: 14px;
		border-radius: 18px;
		background: linear-gradient(180deg, rgba(42, 28, 16, 0.94), rgba(18, 12, 7, 0.97));
		border: 1px solid rgba(224, 165, 72, 0.22);
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
		color: #f4e6c8;
		min-width: 0;
	}

	.title {
		margin: 0;
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 10px;
		font: 700 1.25rem 'Playfair Display SC', Georgia, serif;
		color: #ffc46a;
	}

	.title small {
		font: 400 0.95rem 'Cabin Sketch', Spectral, serif;
		color: #bfa985;
	}

	.lanes {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 6px;
	}

	.lanes li {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.95rem;
	}

	.lanes i {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--glow);
		box-shadow: 0 0 8px var(--glow);
	}

	.lanes b {
		font-family: 'Playfair Display SC', Georgia, serif;
	}

	.lanes span {
		margin-left: auto;
		font: 700 1.2rem 'Playfair Display SC', Georgia, serif;
	}

	.lanes em {
		font-style: normal;
		padding: 1px 7px;
		border-radius: 999px;
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		background: rgba(224, 165, 72, 0.16);
		color: #f0c47a;
	}

	.note {
		margin: 0;
		font-size: 0.8rem;
		color: #bfa985;
		line-height: 1.4;
	}

	.counters {
		display: grid;
		gap: 12px;
	}

	.call {
		margin: 0;
		display: flex;
		align-items: center;
		gap: 8px;
		font-family: Spectral, Georgia, serif;
	}

	.glyph {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		background: radial-gradient(circle at 40% 35%, #fbf3e0, #dccaa4);
		color: #1d1a18;
		font-size: 1.1rem;
		box-shadow: 0 0 0 2px #b8873a;
	}

	.glyph.red {
		color: #b3262e;
	}

	.chalk {
		padding: 10px 12px;
		border-radius: 8px;
		background:
			radial-gradient(ellipse at 30% 20%, rgba(255, 255, 255, 0.06), transparent 60%),
			linear-gradient(160deg, #2b302c, #1c201d);
		box-shadow:
			inset 0 0 0 5px #5a3a1f,
			inset 0 0 0 6px #2a170a,
			inset 0 0 24px rgba(0, 0, 0, 0.6);
		padding: 14px;
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-family: 'Cabin Sketch', Spectral, serif;
		color: rgba(240, 236, 226, 0.88);
		text-align: center;
	}

	th {
		font-weight: 400;
		font-size: 0.82rem;
		padding: 2px 4px 6px;
		border-bottom: 1px solid rgba(240, 236, 226, 0.35);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 70px;
	}

	td {
		padding: 3px 4px;
		font-size: 1rem;
	}

	td small {
		display: block;
		font-size: 0.62rem;
		opacity: 0.6;
		margin-top: -2px;
	}

	td.n {
		opacity: 0.45;
		font-size: 0.8rem;
	}

	td.empty {
		opacity: 0.5;
		padding: 10px;
	}

	td.moon {
		color: #ffd48a;
	}

	tfoot td {
		border-top: 1px solid rgba(240, 236, 226, 0.35);
		padding-top: 6px;
		font-size: 1.2rem;
	}

	tfoot td.low {
		color: #b9f08a;
		text-decoration: underline wavy rgba(185, 240, 138, 0.5);
		text-underline-offset: 4px;
	}
</style>
