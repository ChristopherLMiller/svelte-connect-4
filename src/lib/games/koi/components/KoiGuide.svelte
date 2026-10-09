<script lang="ts">
	import GuideShell from '$lib/components/GuideShell.svelte';
	import KoiBloom from './KoiBloom.svelte';
	import { closeKoiGuide, koiGuide } from '../settings.svelte';
	import { BLOOMS, KINDS } from '../types';

	const keys = [
		['← →', 'Ripples: aim'],
		['Space', 'Ripples: flick the bloom'],
		['X / Tab', 'Ripples: swap in the next bloom'],
		['Arrows', 'Currents: move; after picking, swap that way'],
		['Space / Enter', 'Currents: pick a bloom'],
		['Esc / P', 'Pause and resume'],
		['Enter', 'Start, or play again'],
		['?', 'This guide']
	];

	const touch = [
		['Drag, let go', 'Ripples: aim, then flick. Let go below the lily pad to call it off'],
		['Tap the small pad', 'Ripples: swap in the next bloom'],
		['Drag a bloom', 'Currents: swap it with its neighbour'],
		['Tap, tap', 'Currents: swap two neighbours']
	];
</script>

<GuideShell open={koiGuide.open} onclose={closeKoiGuide} tone="pond" kicker="High summer">
	<div class="goal">
		<div class="blooms" aria-hidden="true">
			{#each KINDS as kind (kind)}
				<span><KoiBloom {kind} size={38} /></span>
			{/each}
		</div>
		<p>
			Six kinds of bloom float on the pond, each with its own emblem as well as its colour. Clear them in two ways:
			<strong>Ripples</strong> flicks blooms up into a cluster, and <strong>Currents</strong> swaps them into rows.
			Play well enough and the golden koi leaps.
		</p>
	</div>

	<div class="cols">
		<div>
			<p class="sub">Ripples</p>
			<ul>
				<li>Aim from the lily pad and flick. Blooms bounce off the side banks and stick where they touch.</li>
				<li><strong>Three or more</strong> of a kind touching pop. Anything left hanging from nothing drifts away and scores much more.</li>
				<li>Each shot that pops nothing uses up a miss. When the misses run out, <strong>the far bank creeps down</strong> a row.</li>
				<li>Clear every bloom for a stage bonus. Later ponds have more rows, more kinds and fewer misses. If a bloom crosses the reed line, the game ends.</li>
				<li>Your next bloom only comes in kinds still on the pond. Swap it in when it fits better.</li>
			</ul>

			<p class="sub">Currents</p>
			<ul>
				<li>Swap two neighbouring blooms to make a row of three or more. Anything above falls into the gap, and new blooms float in from the top.</li>
				<li>A row of <strong>four</strong> leaves a current that clears its whole row or column. An <strong>L or T</strong> leaves a burst that clears the blooms around it.</li>
				<li>A row of <strong>five</strong> leaves the <strong>moon</strong>. Swap it with any bloom to clear every bloom of that kind.</li>
				<li>Swapping two specials sets both off. Matches that set off more matches score more with each step of the chain.</li>
				<li>Reach the stage score within 22 moves. Moves left over pay 60 each.</li>
			</ul>

			<p class="sub">The blooms</p>
			<ul class="names">
				{#each KINDS as kind (kind)}
					<li style:--c={BLOOMS[kind].base}>{BLOOMS[kind].name}</li>
				{/each}
			</ul>
		</div>

		<div>
			<p class="sub">Keys</p>
			<dl>
				{#each keys as [key, action] (key)}
					<dt><kbd>{key}</kbd></dt>
					<dd>{action}</dd>
				{/each}
			</dl>

			<p class="sub">Touch and mouse</p>
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
	.blooms {
		display: grid;
		grid-template-columns: repeat(3, auto);
		gap: 10px 12px;
		align-items: center;
		justify-items: center;
		padding: 12px;
		border-radius: 12px;
		background: radial-gradient(circle at 50% 30%, #2a7a6c, #0f4a43);
		box-shadow: inset 0 0 0 1px rgba(255, 179, 71, 0.25);
	}

	.names {
		grid-template-columns: 1fr 1fr;
	}

	.names li::before {
		background: var(--c);
	}
</style>
