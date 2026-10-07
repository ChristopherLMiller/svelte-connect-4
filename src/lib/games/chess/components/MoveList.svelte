<script lang="ts">
	import { tick } from 'svelte';
	import type { ChessSession, Mark } from '../session.svelte';

	let { session }: { session: ChessSession } = $props();

	let list = $state<HTMLOListElement | null>(null);
	let copied = $state(false);

	const rows = $derived.by(() => {
		const out: Array<{ n: number; w: number; b: number }> = [];
		for (let i = 0; i < session.records.length; i += 2) out.push({ n: i / 2 + 1, w: i, b: i + 1 < session.records.length ? i + 1 : -1 });
		return out;
	});
	const active = $derived(session.shownPly - 1);
	const marks = $derived(session.review?.marks ?? null);
	const atEnd = $derived(session.shownPly >= session.records.length);

	const SYMBOL: Record<Mark, string> = { book: '', best: '!', good: '', inaccuracy: '?!', mistake: '?', blunder: '??' };

	$effect(() => {
		void active;
		void rows.length;
		void tick().then(() => {
			const el = list?.querySelector<HTMLElement>('.on') ?? (atEnd ? list?.lastElementChild : null);
			el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
		});
	});

	async function copy() {
		try {
			await navigator.clipboard.writeText(session.pgn());
			copied = true;
			window.setTimeout(() => (copied = false), 1600);
		} catch {
			copied = false;
		}
	}

	function last() {
		if (session.review) session.reviewGoto(session.records.length);
		else session.viewAt(null);
	}
</script>

<div class="moves">
	{#if rows.length}
		<ol bind:this={list}>
			{#each rows as row (row.n)}
				<li>
					<span class="n">{row.n}.</span>
					{#each [row.w, row.b] as i (i)}
						{#if i >= 0}
							{@const mark = marks?.[i] ?? null}
							<button class="mv {mark ?? ''}" class:on={i === active} onclick={() => session.viewAt(i + 1)}>
								{session.records[i].san}{#if mark && SYMBOL[mark]}<sup>{SYMBOL[mark]}</sup>{/if}
							</button>
						{:else}
							<span></span>
						{/if}
					{/each}
				</li>
			{/each}
		</ol>
	{:else}
		<p class="empty">The pieces are set. White moves first.</p>
	{/if}
	<div class="nav">
		<button aria-label="First position" disabled={session.shownPly === 0} onclick={() => session.viewAt(0)}>⏮</button>
		<button aria-label="Previous move" disabled={session.shownPly === 0} onclick={() => session.step(-1)}>◀</button>
		<button aria-label="Next move" disabled={atEnd} onclick={() => session.step(1)}>▶</button>
		<button aria-label="Latest move" disabled={atEnd} onclick={last}>⏭</button>
		<button class="pgn" disabled={!rows.length} onclick={copy}>{copied ? 'Copied' : 'Copy PGN'}</button>
	</div>
</div>

<style>
	.moves {
		display: grid;
		grid-template-rows: minmax(0, 1fr) auto;
		min-height: 0;
		border-radius: 10px;
		border: 1px solid rgba(217, 178, 94, 0.2);
		background: linear-gradient(180deg, rgba(30, 16, 11, 0.92), rgba(14, 8, 6, 0.94));
		box-shadow: 0 8px 18px rgba(0, 0, 0, 0.4);
		overflow: hidden;
	}

	ol {
		list-style: none;
		margin: 0;
		padding: 6px;
		overflow-y: auto;
		min-height: 0;
		scrollbar-width: thin;
		scrollbar-color: rgba(217, 178, 94, 0.35) transparent;
	}

	li {
		display: grid;
		grid-template-columns: 2.4em 1fr 1fr;
		align-items: center;
		gap: 2px;
		border-radius: 5px;
	}

	li:nth-child(odd) {
		background: rgba(255, 230, 180, 0.03);
	}

	.n {
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-size: 0.7rem;
		color: #8a7a62;
		text-align: right;
		padding-right: 6px;
	}

	.mv {
		appearance: none;
		border: 0;
		background: none;
		color: #f3e7cf;
		font: inherit;
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-weight: 700;
		font-size: 1.08rem;
		text-align: left;
		padding: 2px 8px;
		border-radius: 5px;
		cursor: pointer;
		white-space: nowrap;
	}

	.mv.on {
		background: linear-gradient(180deg, #ecc874, #b8862e);
		color: #1c1107;
	}

	.mv sup {
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-size: 0.66rem;
		margin-left: 1px;
	}

	.mv.book:not(.on) {
		color: #c9b28a;
		font-style: italic;
	}

	.mv.best:not(.on) {
		color: #8fd89a;
	}

	.mv.inaccuracy:not(.on) {
		color: #ead36a;
	}

	.mv.mistake:not(.on) {
		color: #f0a050;
	}

	.mv.blunder:not(.on) {
		color: #ff7a6e;
	}

	@media (hover: hover) {
		.mv:not(.on):hover {
			background: rgba(255, 230, 180, 0.1);
		}

		.nav button:not(:disabled):hover {
			border-color: #d9b25e;
		}
	}

	.empty {
		margin: 0;
		padding: 14px;
		color: #bba88a;
		font-style: italic;
		align-self: center;
		text-align: center;
	}

	.nav {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr)) auto;
		gap: 4px;
		padding: 6px;
		border-top: 1px solid rgba(217, 178, 94, 0.15);
	}

	.nav button {
		appearance: none;
		border: 1px solid rgba(217, 178, 94, 0.22);
		background: rgba(0, 0, 0, 0.25);
		color: #f3e7cf;
		border-radius: 6px;
		padding: 5px 6px;
		font: inherit;
		font-size: 0.82rem;
		cursor: pointer;
	}

	.nav .pgn {
		padding-inline: 10px;
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-size: 0.66rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.nav button:disabled {
		opacity: 0.35;
		cursor: default;
	}
</style>
