<script lang="ts">
	import GuideShell from '$lib/components/GuideShell.svelte';
	import { closeZenGuide, zenGuide } from '../settings.svelte';

	const controls = [
		['Click / tap', 'Set a stone where the lines cross; on small gardens a touch aims first, a second tap places'],
		['Arrows / WASD', 'Walk the cursor over the gravel'],
		['Enter / Space', 'Place a stone at the cursor'],
		['Enter', 'Start or resume from the title; new game after a round'],
		['?', 'Open this guide'],
		['Esc', 'Close a panel, then back to the title']
	];

	const line: Array<[number, number, 1 | 2]> = [
		[1, 1, 1],
		[2, 2, 1],
		[3, 3, 1],
		[4, 4, 1],
		[5, 5, 1],
		[2, 1, 2],
		[3, 2, 2],
		[1, 3, 2],
		[4, 3, 2]
	];
</script>

<GuideShell open={zenGuide.open} onclose={closeZenGuide} tone="zen" kicker="The gardener's rules">
	<div class="goal">
		<svg class="sample" viewBox="0 0 76 76" aria-hidden="true">
			<rect x="2" y="2" width="72" height="72" rx="4" fill="#5a3a24" />
			<rect x="6" y="6" width="64" height="64" rx="2" fill="#e4ddcc" />
			{#each Array.from({ length: 7 }, (_, k) => k) as k (k)}
				<line x1="11" y1={11 + k * 9} x2="65" y2={11 + k * 9} stroke="#b4a78f" stroke-width="0.8" />
				<line y1="11" x1={11 + k * 9} y2="65" x2={11 + k * 9} stroke="#b4a78f" stroke-width="0.8" />
			{/each}
			{#each line as [r, c, p], k (k)}
				<circle cx={11 + c * 9} cy={11 + r * 9} r="3.8" fill={p === 1 ? '#2d3238' : '#f6f1e6'} stroke={p === 1 ? '#0b0d10' : '#a89d88'} stroke-width="0.6" />
			{/each}
			<path d="M16 16 L60 60" stroke="#c8321f" stroke-width="3.4" stroke-linecap="round" opacity="0.8" />
		</svg>
		<p>
			Gomoku, freestyle. Take turns setting one stone on any empty crossing. <strong>Five or more in an unbroken line</strong>, across,
			down or diagonal, wins. Stones never move and are never taken.
		</p>
	</div>

	<div class="cols">
		<div>
			<p class="sub">Playing</p>
			<ul>
				<li>Slate opens the first game. After that, whoever didn't open last time goes first.</li>
				<li>Place on any empty crossing, anywhere on the bed.</li>
				<li>A line of six or more counts as five.</li>
				<li>If every crossing fills without a five, the game is a draw.</li>
				<li><strong>Rake back</strong> takes back the last turn (your stone and the Monk's reply against the AI).</li>
			</ul>

			<p class="sub">Modes</p>
			<ul>
				<li><strong>Two at the bench</strong>: hotseat, slate against quartz.</li>
				<li>
					<strong>The Monk</strong>: you play slate. Novice plays by feel, Adept reads a couple of moves ahead, and Master hunts for
					forced wins built from fours.
				</li>
			</ul>
		</div>

		<div>
			<p class="sub">Tips</p>
			<ul>
				<li>An <strong>open three</strong> (three with both ends free) must be blocked now, or it grows into an open four.</li>
				<li>A <strong>four</strong> must always be answered. Chain fours to force your rival's hand.</li>
				<li>Win by making two threats with one stone: a four and an open three, or two open threes.</li>
				<li>Turn on "Point out fours" to see red rings where you must block and gold where you can win.</li>
			</ul>

			<p class="sub">Controls</p>
			<dl>
				{#each controls as [key, action] (key + action)}
					<dt><kbd>{key}</kbd></dt>
					<dd>{action}</dd>
				{/each}
			</dl>
		</div>
	</div>
</GuideShell>

<style>
	.sample {
		width: 96px;
		height: 96px;
		padding: 4px;
		border-radius: 8px;
		background: linear-gradient(160deg, #f4ede0, #e4d8c2);
		box-shadow: inset 0 0 0 1px rgba(60, 40, 25, 0.2);
	}
</style>
