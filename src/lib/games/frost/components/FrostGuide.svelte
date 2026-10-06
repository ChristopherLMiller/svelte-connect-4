<script lang="ts">
	import GuideShell from '$lib/components/GuideShell.svelte';
	import { closeFrostGuide, frostGuide } from '../settings.svelte';
	import { CRACK_HUE, LEVEL_INFO, LEVELS } from '../types';

	const controls = [
		['Click', 'Step through the frost'],
		['Hold the click', 'Plant or lift a flag'],
		['Right-click / Ctrl-click', 'Flag at once'],
		['Click a number', 'Open its other neighbours once its flags are placed'],
		['Arrows / WASD', 'Move the marker'],
		['Space / Enter', 'Step at the marker'],
		['F / E', 'Flag the tile under the pointer or marker'],
		['P', 'Pause; snow covers the lake'],
		['N / R', 'A new lake'],
		['Esc', 'Close a panel, then back to shore']
	];

	const touch = [
		['Tap', 'Step (or flag, in flag mode)'],
		['Long press', 'Flag (or step, in flag mode)'],
		['Tap a number', 'Open around it'],
		['Digging / Flagging', 'Switch what a tap does']
	];

	const sample = [
		[0, 1, 9],
		[1, 3, 2],
		[9, 2, 9]
	];
</script>

<GuideShell open={frostGuide.open} onclose={closeFrostGuide} tone="frost" kicker="Reading the ice">
	<div class="goal">
		<div class="lake" aria-hidden="true">
			{#each sample as row, r (r)}
				{#each row as n, c (c)}
					{#if n === 9}
						<span class="frost"><i class="flag"></i></span>
					{:else}
						<span class="clear" style:--c={CRACK_HUE[n]}>{n || ''}</span>
					{/if}
				{/each}
			{/each}
		</div>
		<p>
			Open every patch of <strong>safe ice</strong> on the lake. Each cleared tile shows a crack number: how many of its eight
			neighbours are <strong>thin ice</strong>. Step on thin ice and the lake takes you. Flags are optional; they just keep
			you from stepping where you know the water is.
		</p>
	</div>

	<div class="cols">
		<div>
			<p class="sub">Rules</p>
			<ul>
				<li>Your <strong>first step is always safe</strong> and opens a little clearing.</li>
				<li>A blank tile has no thin ice around it, so its neighbours open by themselves and the frost melts outward.</li>
				<li>When a number already has all its flags, <strong>click it</strong> to open the rest of its neighbours.</li>
				<li><strong>Sure footing</strong> deals only lakes that can be solved by reading alone, never by guessing.</li>
				<li>The <strong>Dawn survey</strong> is one lake for everyone each day, started from a drilled hole. Clear it on consecutive days for a streak.</li>
			</ul>

			<p class="sub">Lakes</p>
			<ul>
				{#each LEVELS as level (level)}
					<li><strong>{LEVEL_INFO[level].name}</strong>: {LEVEL_INFO[level].w}×{LEVEL_INFO[level].h}, {LEVEL_INFO[level].mines} thin patches</li>
				{/each}
			</ul>
		</div>

		<div>
			<p class="sub">Mouse and keys</p>
			<dl>
				{#each controls as [key, action] (key)}
					<dt><kbd>{key}</kbd></dt>
					<dd>{action}</dd>
				{/each}
			</dl>

			<p class="sub">Touch</p>
			<dl>
				{#each touch as [key, action] (key)}
					<dt><kbd>{key}</kbd></dt>
					<dd>{action}</dd>
				{/each}
			</dl>
		</div>
	</div>
</GuideShell>

<style>
	.lake {
		display: grid;
		grid-template-columns: repeat(3, 34px);
		grid-auto-rows: 34px;
		gap: 3px;
		padding: 6px;
		border-radius: 12px;
		background: #0e2234;
		box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.85);
	}

	.lake span {
		display: grid;
		place-items: center;
		border-radius: 6px;
		font-family: 'Josefin Sans', ui-sans-serif, system-ui, sans-serif;
		font-weight: 700;
		font-size: 1.1rem;
	}

	.clear {
		background: linear-gradient(170deg, #2b5875, #163348);
		color: var(--c);
		text-shadow: 0 0 6px var(--c);
	}

	.frost {
		position: relative;
		background: linear-gradient(135deg, #f6fbff, #bcd5e8);
	}

	.flag {
		position: absolute;
		left: 50%;
		top: 18%;
		width: 2px;
		height: 62%;
		background: #3b2a1d;
	}

	.flag::after {
		content: '';
		position: absolute;
		left: 2px;
		top: 0;
		border-style: solid;
		border-width: 5px 0 5px 10px;
		border-color: transparent transparent transparent #ff6a3d;
	}
</style>
