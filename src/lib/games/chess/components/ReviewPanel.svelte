<script lang="ts">
	import { MATE } from '../ai';
	import { Position, START_FEN } from '../engine';
	import type { ChessSession, Mark } from '../session.svelte';

	let { session }: { session: ChessSession } = $props();

	const W = 300;
	const H = 72;

	const review = $derived(session.review!);
	const n = $derived(session.records.length);
	const analysing = $derived(review.done < review.total);

	const chance = (cp: number) => {
		if (Math.abs(cp) > MATE - 1000) return cp > 0 ? 1 : 0;
		return 1 / (1 + Math.exp(-Math.max(-1500, Math.min(1500, cp)) / 250));
	};
	const x = (i: number) => (n ? (i / n) * W : 0);
	const y = (cp: number) => H - chance(cp) * H;

	const area = $derived.by(() => {
		const pts: string[] = [];
		let lastI = -1;
		review.scores.forEach((s, i) => {
			if (s === null) return;
			pts.push(`${x(i).toFixed(1)},${y(s).toFixed(1)}`);
			lastI = i;
		});
		if (!pts.length) return '';
		return `M0,${H} L${pts.join(' L')} L${x(lastI).toFixed(1)},${H} Z`;
	});

	const dots = $derived(
		review.marks
			.map((mark, i) => ({ mark, i: i + 1, s: review.scores[i + 1] }))
			.filter((d): d is { mark: Mark; i: number; s: number } => (d.mark === 'mistake' || d.mark === 'blunder') && d.s !== null)
	);

	const current = $derived.by(() => {
		const k = review.index;
		if (k === 0) return null;
		const rec = session.records[k - 1];
		const mark = review.marks[k - 1];
		const bestUci = review.best[k - 1];
		let best: string | null = null;
		if (bestUci && bestUci !== rec.uci && mark && mark !== 'book' && mark !== 'best' && mark !== 'good') {
			const p = new Position(START_FEN);
			for (const r of session.records.slice(0, k - 1)) p.make(p.moveFromUci(r.uci));
			const m = p.moveFromUci(bestUci);
			if (m) best = p.san(m);
		}
		const num = `${Math.ceil(k / 2)}${rec.side === 'w' ? '.' : '…'}`;
		return { num, san: rec.san, mark, best, side: rec.side };
	});

	const WORD: Record<Mark, string> = {
		book: 'Book move',
		best: 'Best move',
		good: 'Good move',
		inaccuracy: 'Inaccuracy',
		mistake: 'Mistake',
		blunder: 'Blunder'
	};

	function pick(event: PointerEvent) {
		const svg = event.currentTarget as SVGSVGElement;
		const rect = svg.getBoundingClientRect();
		const t = (event.clientX - rect.left) / rect.width;
		session.reviewGoto(Math.round(t * n));
	}

	const summary = $derived(session.reviewSummary);
</script>

<section class="review" aria-label="Game review">
	<header>
		<strong>Review</strong>
		{#if analysing}
			<span class="progress"><i style:--p={review.done / review.total}></i></span>
			<small>The Count is studying… {Math.round((review.done / review.total) * 100)}%</small>
		{:else}
			<small>Analysed by the Count</small>
		{/if}
		<button onclick={() => session.exitReview()}>Done</button>
	</header>

	<svg viewBox="0 0 {W} {H}" preserveAspectRatio="none" onpointerdown={pick} role="slider" aria-label="Evaluation graph" aria-valuemin={0} aria-valuemax={n} aria-valuenow={review.index} tabindex="-1">
		<rect width={W} height={H} class="bg" />
		<line x1="0" x2={W} y1={H / 2} y2={H / 2} class="mid" />
		{#if area}<path d={area} class="area" />{/if}
		{#each dots as d (d.i)}
			<circle cx={x(d.i)} cy={y(d.s)} r="3" class={d.mark} />
		{/each}
		<line x1={x(review.index)} x2={x(review.index)} y1="0" y2={H} class="now" />
	</svg>

	<p class="current">
		{#if current}
			<b>{current.num} {current.san}</b>
			{#if current.mark}
				<span class="tag {current.mark}">{WORD[current.mark]}</span>
			{:else}
				<span class="tag">…</span>
			{/if}
			{#if current.best}
				<span class="best">Better was <b>{current.best}</b></span>
			{/if}
		{:else}
			<span class="best">Starting position. Step through with ◀ ▶ or tap the graph.</span>
		{/if}
	</p>

	<table>
		<thead>
			<tr><th></th><th>White</th><th>Black</th></tr>
		</thead>
		<tbody>
			{#each [['inaccuracy', 'Inaccuracies'], ['mistake', 'Mistakes'], ['blunder', 'Blunders']] as const as [k, label] (k)}
				<tr class={k}>
					<th>{label}</th>
					<td>{summary.w[k]}</td>
					<td>{summary.b[k]}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</section>

<style>
	.review {
		display: grid;
		gap: 8px;
		padding: 10px;
		border-radius: 10px;
		border: 1px solid rgba(217, 178, 94, 0.3);
		background: linear-gradient(180deg, rgba(36, 20, 15, 0.94), rgba(16, 9, 6, 0.95));
		box-shadow: 0 8px 18px rgba(0, 0, 0, 0.4);
		color: #f3e7cf;
	}

	header {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		grid-template-areas: 'title note done' 'bar bar bar';
		align-items: center;
		gap: 4px 10px;
	}

	header strong {
		grid-area: title;
		font-family: 'Cinzel', Georgia, serif;
		font-weight: 600;
		letter-spacing: 0.08em;
	}

	header small {
		grid-area: note;
		color: #bba88a;
		font-style: italic;
		font-size: 0.9rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	header button {
		grid-area: done;
		appearance: none;
		border: 1px solid rgba(217, 178, 94, 0.3);
		background: rgba(0, 0, 0, 0.3);
		color: inherit;
		border-radius: 999px;
		padding: 4px 12px;
		font: inherit;
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-size: 0.64rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		cursor: pointer;
	}

	.progress {
		grid-area: bar;
		height: 3px;
		border-radius: 2px;
		background: rgba(255, 230, 180, 0.1);
		overflow: hidden;
	}

	.progress i {
		display: block;
		height: 100%;
		width: calc(var(--p) * 100%);
		background: linear-gradient(90deg, #b8862e, #ecc874);
		transition: width 200ms linear;
	}

	svg {
		width: 100%;
		height: 72px;
		border-radius: 6px;
		cursor: pointer;
		touch-action: none;
	}

	.bg {
		fill: #2a1d16;
	}

	.mid {
		stroke: rgba(217, 178, 94, 0.3);
		stroke-dasharray: 3 3;
		vector-effect: non-scaling-stroke;
	}

	.area {
		fill: #efe3c8;
	}

	.now {
		stroke: #ecc874;
		stroke-width: 2;
		vector-effect: non-scaling-stroke;
	}

	circle {
		stroke: #1c1107;
		stroke-width: 1;
		vector-effect: non-scaling-stroke;
	}

	circle.mistake {
		fill: #f0a050;
	}

	circle.blunder {
		fill: #ff5a4e;
	}

	.current {
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 4px 8px;
		min-height: 1.6em;
		font-size: 1.04rem;
	}

	.current b {
		font-family: 'Cormorant Garamond', Georgia, serif;
	}

	.tag {
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		padding: 2px 7px;
		border-radius: 999px;
		background: rgba(255, 230, 180, 0.1);
		color: #bba88a;
	}

	.tag.best {
		background: rgba(110, 200, 130, 0.18);
		color: #8fd89a;
	}

	.tag.book {
		color: #c9b28a;
	}

	.tag.inaccuracy {
		background: rgba(234, 211, 106, 0.16);
		color: #ead36a;
	}

	.tag.mistake {
		background: rgba(240, 160, 80, 0.18);
		color: #f0a050;
	}

	.tag.blunder {
		background: rgba(255, 90, 78, 0.2);
		color: #ff7a6e;
	}

	.best {
		color: #bba88a;
		font-style: italic;
	}

	.best b {
		color: #8fd89a;
		font-style: normal;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.86rem;
	}

	th,
	td {
		padding: 2px 6px;
		text-align: center;
		font-weight: 600;
	}

	thead th {
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-size: 0.58rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #d9b25e;
	}

	tbody th {
		text-align: left;
		font-weight: 500;
		color: #bba88a;
	}

	tr.inaccuracy td {
		color: #ead36a;
	}

	tr.mistake td {
		color: #f0a050;
	}

	tr.blunder td {
		color: #ff7a6e;
	}

	@media (prefers-reduced-motion: reduce) {
		.progress i {
			transition: none;
		}
	}
</style>
