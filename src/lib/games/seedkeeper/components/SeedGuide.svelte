<script lang="ts">
	import GuideShell from '$lib/components/GuideShell.svelte';
	import { closeSeedGuide, seedGuide } from '../settings.svelte';

	const controls = [
		['Click / tap', 'Sow from a pit on your row; hold to see where the seeds will fall'],
		['← → / A D', 'Walk along your row (↑ ↓ when the board stands on its side)'],
		['Enter / Space', 'Sow from the lit pit'],
		['Enter', 'Start or resume from the title; new game after a round'],
		['?', 'Open this guide'],
		['Esc', 'Close a panel, then back to the title']
	];
</script>

<GuideShell open={seedGuide.open} onclose={closeSeedGuide} tone="moss" kicker="The keeper's rules">
	<div class="goal">
		<svg class="sample" viewBox="0 0 120 56" aria-hidden="true">
			<rect x="2" y="2" width="116" height="52" rx="14" fill="#5f685c" />
			<rect x="6" y="10" width="14" height="36" rx="7" fill="#1a1e16" />
			<rect x="100" y="10" width="14" height="36" rx="7" fill="#1a1e16" />
			{#each [0, 1, 2, 3, 4] as k (k)}
				<circle cx={32 + k * 14} cy="18" r="6" fill="#1a1e16" />
				<circle cx={32 + k * 14} cy="38" r="6" fill="#1a1e16" />
			{/each}
			<path d="M46 38 Q60 30 74 38 Q81 42 88 38" fill="none" stroke="#f6c453" stroke-width="1.6" stroke-dasharray="3 3" />
			<circle cx="60" cy="38" r="2.4" fill="#e2a03c" />
			<circle cx="74" cy="38" r="2.4" fill="#4fae80" />
			<circle cx="88" cy="38" r="2.4" fill="#e293a6" />
			<circle cx="88" cy="38" r="8" fill="none" stroke="#f6c453" stroke-width="1.2" />
			<circle cx="107" cy="28" r="2.4" fill="#7ea6cf" />
			<circle cx="104" cy="22" r="2.4" fill="#e4d8b8" />
		</svg>
		<p>
			Mancala, Kalah rules. Sow seeds around the stone toward your store on the right. <strong>Most seeds in your store</strong>
			when a row runs dry wins.
		</p>
	</div>

	<div class="cols">
		<div>
			<p class="sub">Sowing</p>
			<ul>
				<li>Pick one of your pits. Lift every seed and drop them one at a time into the next pits, counterclockwise.</li>
				<li>Your own store gets a seed as you pass it. Your rival's store is skipped.</li>
				<li><strong>Last seed in your store?</strong> Sow again.</li>
				<li>
					<strong>Last seed in an empty pit on your side?</strong> If the pit across has seeds, capture them all, plus your
					seed.
				</li>
				<li>When either row is empty, each side keeps whatever is left on its own row, and the game ends.</li>
			</ul>

			<p class="sub">Modes</p>
			<ul>
				<li><strong>Two by the river</strong>: hotseat. Firefly sows from the near row, Heron from the far one. Who opens alternates.</li>
				<li>
					<strong>Old Heron</strong>: you are Firefly. Fledgling grabs what it sees, Wader plans a few turns ahead, and Elder
					reads the stones deep.
				</li>
			</ul>
		</div>

		<div>
			<p class="sub">Tips</p>
			<ul>
				<li>Chain extra turns: sow the pit whose seeds exactly reach your store, nearest the store first.</li>
				<li>Keep an eye on your empty pits. They are capture traps for you, and the pits across from them are at risk.</li>
				<li>Hoarding seeds in your rightmost pits keeps them away from your rival late in the game.</li>
				<li>Hold a pit (or hover it) to see every pit it reaches. A red ring means a capture.</li>
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
		width: 140px;
		height: 66px;
		padding: 4px;
		border-radius: 10px;
		background: linear-gradient(160deg, #1e2c1c, #0f170e);
		box-shadow: inset 0 0 0 1px rgba(184, 240, 106, 0.25);
	}
</style>
