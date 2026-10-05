<script lang="ts">
	import GuideShell from '$lib/components/GuideShell.svelte';
	import ReefPiece from './ReefPiece.svelte';
	import { closeReefGuide, reefGuide } from '../settings.svelte';
	import { KINDS, SPECIES } from '../types';

	const controls = [
		['← → / A D', 'Move; hold to slide'],
		['↑ / X / W', 'Turn clockwise'],
		['Z / Ctrl', 'Turn anticlockwise'],
		['↓ / S', 'Soft drop'],
		['Space', 'Hard drop'],
		['C / Shift', 'Hold the piece for later'],
		['P', 'Pause and resume'],
		['Enter', 'Start, or dive again'],
		['Esc', 'Close a panel, then back to the title']
	];

	const touch = [
		['Drag sideways', 'Move a column at a time'],
		['Tap', 'Turn clockwise'],
		['Drag down', 'Soft drop'],
		['Flick down', 'Hard drop'],
		['Flick up', 'Hold']
	];
</script>

<GuideShell open={reefGuide.open} onclose={closeReefGuide} tone="reef" kicker="The midnight zone">
	<div class="goal">
		<div class="species" aria-hidden="true">
			{#each KINDS as kind (kind)}
				<span><ReefPiece {kind} /></span>
			{/each}
		</div>
		<p>
			Seven species of glowing coral drift down into the well. Turn and place them so they <strong>fill whole rows</strong>:
			a full row dissolves into a plankton bloom and everything above settles down. Let the coral pile up to the rim and
			the reef closes over.
		</p>
	</div>

	<div class="cols">
		<div>
			<p class="sub">Rules</p>
			<ul>
				<li>Pieces come in shuffled sets of seven, so a drought never lasts long. The next five are always shown.</li>
				<li><strong>Hold</strong> one piece for later, once per drop. The <strong>ghost</strong> shows where it will land.</li>
				<li>A piece that touches down still has half a second to slide or turn before it sets.</li>
				<li>Four rows at once is a <strong>Lumen</strong>, and a whale glides past to hear it.</li>
				<li><strong>T-spins</strong>, back-to-back Lumens, chains of clears and a perfect clear all pay extra.</li>
			</ul>

			<p class="sub">Modes</p>
			<ul>
				<li><strong>Marathon</strong>: every ten lines is a level and 250 metres deeper. The pieces fall faster and the coral glows brighter.</li>
				<li><strong>Sprint</strong>: clear forty lines as fast as you can.</li>
			</ul>

			<p class="sub">The species</p>
			<ul class="names">
				{#each KINDS as kind (kind)}
					<li style:--c={SPECIES[kind].base}>{SPECIES[kind].creature}</li>
				{/each}
			</ul>
		</div>

		<div>
			<p class="sub">Keys</p>
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
	.species {
		--m: 13px;
		display: grid;
		grid-template-columns: repeat(4, auto);
		gap: 10px 12px;
		align-items: center;
		justify-items: center;
		padding: 12px;
		border-radius: 12px;
		background: radial-gradient(circle at 50% 30%, #0c2c48, #020814);
		box-shadow: inset 0 0 0 1px rgba(63, 233, 255, 0.25);
	}

	.names {
		grid-template-columns: 1fr 1fr;
	}

	.names li::before {
		background: var(--c);
		box-shadow: 0 0 6px var(--c);
	}
</style>
