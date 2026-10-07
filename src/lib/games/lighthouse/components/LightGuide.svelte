<script lang="ts">
	import GuideShell from '$lib/components/GuideShell.svelte';
	import { closeLightGuide, lightGuide } from '../settings.svelte';

	const controls = [
		['Click / tap', 'Fire on a square in their waters; on big seas a touch aims first, a second tap fires'],
		['Tap a ship', 'While laying out, turn it about its bow'],
		['Drag a ship', 'Move it to new water'],
		['Arrows / WASD', 'Move the brass cursor'],
		['Enter / Space', 'Lay a ship or fire at the cursor; set sail when the fleet is ready'],
		['R', 'Turn the ship you are laying'],
		['?', 'Open this guide'],
		['Esc', 'Close a panel, then back to the title']
	];

	const hull = [12, 13, 14];
	const misses = [3, 9, 20, 30];
	const hits = [22, 23];
</script>

<GuideShell open={lightGuide.open} onclose={closeLightGuide} tone="beacon" kicker="The keeper's log">
	<div class="goal">
		<svg class="sample" viewBox="0 0 76 76" aria-hidden="true">
			<rect x="2" y="2" width="72" height="72" rx="4" fill="#6b4a2a" />
			<rect x="6" y="6" width="64" height="64" rx="2" fill="#0f2a3c" />
			{#each Array.from({ length: 7 }, (_, k) => k) as k (k)}
				<line x1="6" y1={6 + (k + 1) * 9.14} x2="70" y2={6 + (k + 1) * 9.14} stroke="#2c5570" stroke-width="0.6" />
				<line y1="6" x1={6 + (k + 1) * 9.14} y2="70" x2={6 + (k + 1) * 9.14} stroke="#2c5570" stroke-width="0.6" />
			{/each}
			{#each hull as i, k (k)}
				<rect x={6 + (i % 7) * 9.14 + 1} y={6 + Math.floor(i / 7) * 9.14 + 2.4} width="7.1" height="4.4" rx="1.6" fill="#2a2a2a" />
			{/each}
			{#each misses as i (i)}
				<circle cx={6 + (i % 7) * 9.14 + 4.57} cy={6 + Math.floor(i / 7) * 9.14 + 4.57} r="1.8" fill="#e6eef2" opacity="0.85" />
			{/each}
			{#each hits as i (i)}
				<circle cx={6 + (i % 7) * 9.14 + 4.57} cy={6 + Math.floor(i / 7) * 9.14 + 4.57} r="3" fill="#ff7a2c" />
				<circle cx={6 + (i % 7) * 9.14 + 4.57} cy={6 + Math.floor(i / 7) * 9.14 + 4.57} r="1.4" fill="#ffe08a" />
			{/each}
			<path d="M70 6 L30 40 L70 60 Z" fill="#ffd27a" opacity="0.14" />
		</svg>
		<p>
			Battleship in the fog. Each keeper hides a fleet on their own chart, then you take turns firing at squares in the rival's waters.
			<strong>Sink every hull before yours go down.</strong>
		</p>
	</div>

	<div class="cols">
		<div>
			<p class="sub">Playing</p>
			<ul>
				<li>Lay out your ships across or down. They can't overlap or hang off the chart, but they may touch.</li>
				<li>Call one square per shot. A white buoy marks a miss; fire marks a hit.</li>
				<li>When every square of a ship is hit, she sinks and is shown to both sides.</li>
				<li>With <strong>Fire again on a hit</strong> (in Settings), you keep the gun while you keep hitting.</li>
				<li>Whoever fired second last battle fires first in the next.</li>
			</ul>

			<p class="sub">Waters</p>
			<ul>
				<li><strong>Smugglers' cove</strong>: 8 × 8, four ships.</li>
				<li><strong>The channel</strong>: 10 × 10, five ships, the classic game.</li>
				<li><strong>Open sea</strong>: 12 × 12, six ships.</li>
			</ul>

			<p class="sub">Modes</p>
			<ul>
				<li>
					<strong>Two keepers, one glass</strong>: pass the device. A curtain hides the charts between turns so neither keeper sees the
					other's fleet.
				</li>
				<li>
					<strong>False lights on the rocks</strong>: against the Wrecker. The Deckhand fires half blind, the Bosun hunts in lines, and
					the Captain keeps a chart of every place a ship could still be hiding.
				</li>
			</ul>
		</div>

		<div>
			<p class="sub">Tips</p>
			<ul>
				<li>Search every other square, like the dark squares of a chessboard. No ship can slip between them.</li>
				<li>After a hit, try the four squares around it. Once you hit two in a row, follow the line.</li>
				<li>Big empty stretches of sea are where the long hulls hide.</li>
				<li>Against the Captain, ships pressed against each other or against the edge are harder to read.</li>
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
		background: linear-gradient(160deg, #1a2e40, #0a1520);
		box-shadow: inset 0 0 0 1px rgba(232, 176, 90, 0.25);
	}
</style>
