<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { closeGuide, guide } from '../settings.svelte';
	import { COLS, ROWS } from '../types';

	// A small position with a finished diagonal for crimson (1) and a few gold (2) replies.
	const SAMPLE = [
		[0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 1, 0, 0],
		[0, 0, 0, 1, 2, 0, 0],
		[0, 0, 1, 2, 2, 0, 0],
		[0, 1, 2, 1, 1, 2, 0]
	];
	const WIN = new Set(['5-1', '4-2', '3-3', '2-4']);

	const controls = [
		['Click / tap', 'Drop into that column'],
		['1 – 7', 'Drop into a column by number'],
		['← →', 'Aim the drop'],
		['Enter / Space', 'Drop where you are aiming'],
		['Enter', 'Start or resume from the title screen'],
		['?', 'Open this guide'],
		['Esc', 'Close a panel, then back to the title']
	];
</script>

{#if guide.open}
	<div class="veil" transition:fade={{ duration: 160 }}>
		<button class="scrim" onclick={closeGuide} aria-label="Close how to play"></button>
		<div
			class="panel"
			transition:scale={{ start: 0.94, duration: 180 }}
			role="dialog"
			aria-modal="true"
			aria-labelledby="guide-title"
		>
			<p class="kicker">Field manual</p>
			<h2 id="guide-title">How to play</h2>

			<div class="goal">
				<div class="sample" style:--cols={COLS} style:--rows={ROWS} aria-hidden="true">
					{#each SAMPLE as row, r (r)}
						{#each row as cell, c (c)}
							<i class:p1={cell === 1} class:p2={cell === 2} class:win={WIN.has(`${r}-${c}`)}></i>
						{/each}
					{/each}
				</div>
				<p>
					Line up <strong>four of your discs</strong> in a row — across, up and down, or on a
					diagonal — before your opponent does.
				</p>
			</div>

			<div class="cols">
			<div>
			<section>
				<p class="kicker sub">Turns</p>
				<ul>
					<li>Players take turns dropping one disc into any column that still has room.</li>
					<li>The disc falls to the lowest empty space in that column.</li>
					<li><span class="chip p1"></span>Crimson opens the first round; each rematch swaps who goes first.</li>
					<li>If all 42 spaces fill with no four in a row, the round is a draw.</li>
				</ul>
			</section>

			<section>
				<p class="kicker sub">Modes</p>
				<ul>
					<li><strong>Human Duel</strong> — two players share one screen, crimson against gold.</li>
					<li>
						<strong>Neural Core</strong> — you play crimson against the AI. Pick easy, medium, or hard on
						the title screen.
					</li>
				</ul>
			</section>
			</div>

			<div>
			<section>
				<p class="kicker sub">Tips</p>
				<ul>
					<li>The centre column is part of the most possible fours — claim it early.</li>
					<li>Build two threats at once; your opponent can only block one.</li>
					<li>Turn on <em>Threat detection</em> in Settings to get warned about open fours.</li>
				</ul>
			</section>

			<section>
				<p class="kicker sub">Controls</p>
				<dl>
					{#each controls as [key, action] (key + action)}
						<dt><kbd>{key}</kbd></dt>
						<dd>{action}</dd>
					{/each}
				</dl>
			</section>
			</div>
			</div>

			<button class="done" onclick={closeGuide}>Got it</button>
		</div>
	</div>
{/if}

<style>
	.veil {
		position: fixed;
		inset: 0;
		z-index: 20;
		display: grid;
		place-items: center;
		padding: 20px;
	}

	.scrim {
		position: absolute;
		inset: 0;
		border: 0;
		background: rgba(4, 3, 10, 0.55);
		cursor: pointer;
	}

	.panel {
		position: relative;
		width: min(820px, 100%);
		max-height: calc(100dvh - 40px);
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 28px 24px 22px;
		border-radius: 24px;
		background: rgba(14, 12, 24, 0.96);
		border: 1px solid var(--line);
		box-shadow: var(--shadow);
		text-align: left;
	}

	.kicker {
		margin: 0 0 6px;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		font-size: 0.7rem;
		color: var(--cyan);
		font-family: var(--font-display);
	}

	.kicker.sub {
		margin: 18px 0 8px;
	}

	h2 {
		margin: 0 0 16px;
		font-family: var(--font-display);
		font-size: 1.7rem;
	}

	.cols {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0 28px;
	}

	.goal {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 16px;
		align-items: center;
	}

	.goal p {
		margin: 0;
		line-height: 1.5;
	}

	.sample {
		display: grid;
		grid-template-columns: repeat(var(--cols), 14px);
		grid-template-rows: repeat(var(--rows), 14px);
		gap: 3px;
		padding: 6px;
		border-radius: 10px;
		background: linear-gradient(180deg, var(--board), var(--board-deep));
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
	}

	.sample i {
		border-radius: 50%;
		background: rgba(4, 3, 10, 0.75);
	}

	.sample i.p1,
	.chip.p1 {
		background: radial-gradient(circle at 35% 30%, #ff8aa2, var(--crimson) 60%, var(--crimson-deep));
	}

	.sample i.p2 {
		background: radial-gradient(circle at 35% 30%, #ffe9a8, var(--gold) 60%, var(--gold-deep));
	}

	.sample i.win {
		box-shadow:
			0 0 0 2px #fff,
			0 0 10px var(--crimson);
	}

	ul {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 8px;
	}

	li {
		position: relative;
		padding-left: 16px;
		color: var(--muted);
		font-size: 0.9rem;
		line-height: 1.45;
	}

	li::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0.6em;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--cyan);
	}

	li strong,
	li em {
		color: var(--text);
		font-style: normal;
	}

	.chip {
		display: inline-block;
		width: 10px;
		height: 10px;
		margin-right: 6px;
		border-radius: 50%;
		vertical-align: -1px;
	}

	dl {
		margin: 0;
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: 8px 14px;
		align-items: center;
	}

	dt,
	dd {
		margin: 0;
	}

	dd {
		color: var(--muted);
		font-size: 0.88rem;
	}

	kbd {
		display: inline-block;
		min-width: 1.6em;
		padding: 3px 8px;
		border-radius: 8px;
		border: 1px solid var(--line);
		border-bottom-width: 2px;
		background: rgba(255, 255, 255, 0.05);
		font-family: var(--font-display);
		font-size: 0.72rem;
		letter-spacing: 0.06em;
		text-align: center;
		color: var(--text);
	}

	.done {
		margin-top: 22px;
		width: 100%;
		border: 0;
		border-radius: 999px;
		padding: 11px 16px;
		cursor: pointer;
		font-family: var(--font-display);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		background: linear-gradient(180deg, #ffe38a, #f5c24b 50%, #e08a1a);
		color: #2a1600;
	}

	@media (max-width: 700px) {
		.panel {
			width: min(480px, 100%);
		}

		.cols {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 420px) {
		.goal {
			grid-template-columns: 1fr;
			justify-items: center;
			text-align: center;
		}
	}
</style>
