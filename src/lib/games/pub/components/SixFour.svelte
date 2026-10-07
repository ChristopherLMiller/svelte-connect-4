<script lang="ts">
	import { PUB_BACK } from '../back';
	import { backUrl } from '../../kit/cards/faces';

	let { score, red, label }: { score: number; red: boolean; label: string } = $props();

	/** Pips counted down the left column, then the right. */
	const CARDS = [
		{ rank: 6, rows: 3, from: 0 },
		{ rank: 4, rows: 2, from: 6 }
	];

	const glyph = $derived(red ? '♥' : '♠');
	const back = $derived(backUrl(PUB_BACK));

	/** The face-down card covers whatever hasn't been counted yet: an L-shape over the lower left and the right column. */
	function cover(rows: number, shown: number) {
		const span = 84 / rows;
		const left = 8 + span * Math.min(shown, rows);
		const right = 8 + span * Math.max(0, Math.min(rows, shown - rows));
		return `polygon(0% ${left}%, 50% ${left}%, 50% ${right}%, 100% ${right}%, 100% 100%, 0% 100%)`;
	}
</script>

<div class="counter" class:red role="img" aria-label="{label}: {score}">
	{#each CARDS as c (c.rank)}
		{@const shown = Math.max(0, Math.min(c.rows * 2, score - c.from))}
		<div class="card">
			<span class="corner">{c.rank}</span>
			{#each Array.from({ length: c.rows * 2 }, (_, i) => i) as i (i)}
				<span class="pip" style:left="{i < c.rows ? 30 : 70}%" style:top="{8 + (84 / c.rows) * ((i % c.rows) + 0.5)}%">{glyph}</span>
			{/each}
			<i class="cover" style:background-image="url({back})" style:clip-path={cover(c.rows, shown)}></i>
		</div>
	{/each}
	<p><b>{score}</b><small>{label}</small></p>
</div>

<style>
	.counter {
		display: grid;
		grid-template-columns: 46px 46px minmax(0, 1fr);
		align-items: center;
		gap: 8px;
	}

	.card {
		position: relative;
		width: 46px;
		height: 64px;
		border-radius: 5px;
		overflow: hidden;
		background: linear-gradient(180deg, #fbf3e0, #ead9b8);
		box-shadow:
			0 4px 10px rgba(0, 0, 0, 0.4),
			inset 0 0 0 1px rgba(80, 60, 40, 0.3);
		color: #1d1a18;
	}

	.red .card {
		color: #b3262e;
	}

	.corner {
		position: absolute;
		left: 4px;
		top: 2px;
		font: 700 0.62rem Georgia, serif;
	}

	.pip {
		position: absolute;
		translate: -50% -50%;
		font-size: 0.95rem;
		line-height: 1;
	}

	.cover {
		position: absolute;
		inset: 0;
		background-size: cover;
		background-position: center;
		filter: drop-shadow(0 -2px 2px rgba(0, 0, 0, 0.4));
		transition: clip-path 500ms cubic-bezier(0.3, 1.2, 0.5, 1);
	}

	p {
		margin: 0;
		display: grid;
		justify-items: start;
		line-height: 1.05;
		min-width: 0;
	}

	p b {
		font: 700 1.6rem 'Playfair Display SC', Georgia, serif;
		color: #f4e6c8;
	}

	p small {
		font-size: 0.66rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #bfa985;
	}

	@media (prefers-reduced-motion: reduce) {
		.cover {
			transition: none;
		}
	}
</style>
