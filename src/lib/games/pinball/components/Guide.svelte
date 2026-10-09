<script lang="ts">
	import GuideShell from '$lib/components/GuideShell.svelte';
	import { closePinballGuide, pinballGuide } from '../settings.svelte';
	import type { AnySpec } from '../tables/spec';

	let { spec }: { spec: AnySpec } = $props();

	const keys = [
		['Z · ← · Left Shift', 'Left flippers'],
		['/ · → · Right Shift', 'Right flippers'],
		['Space · ↓ (hold)', 'Draw the plunger; let go to shoot'],
		['↑ · N', 'Nudge the table'],
		['X · .', 'Nudge from the left or right'],
		['Esc / P', 'Pause and resume'],
		['Enter', 'Start, or play again'],
		['?', 'This guide']
	];

	const touch = [
		['Left half', 'Left flippers (hold to cradle the ball)'],
		['Right half', 'Right flippers'],
		['Flick up', 'Nudge the table'],
		['Hold anywhere', 'When a ball waits in the shooter lane: draw the plunger, let go to shoot']
	];
</script>

<GuideShell open={pinballGuide.open} onclose={closePinballGuide} tone="silverball" kicker={spec.meta.kicker}>
	<div class="goal">
		<p>
			<strong>{spec.meta.name}</strong>: {spec.rules.balls} balls to score as much as you can. Most switches add to the
			<strong>{spec.rules.bonusName}</strong>, and each ball ends by paying {spec.rules.bonusValue.toLocaleString()} for each, times the bonus multiplier.
			Every ball starts with a ball saver; nudge too hard and the table tilts.
		</p>
	</div>

	<div class="cols">
		<div>
			<p class="sub">This table</p>
			<ul>
				{#each spec.meta.guide.how as line, i (i)}
					<li>{line}</li>
				{/each}
			</ul>

			<p class="sub">Tips</p>
			<ul>
				{#each spec.meta.guide.tips as line, i (i)}
					<li>{line}</li>
				{/each}
				{#if spec.rules.skill}
					<li>The plunger's strength decides where the ball falls: drop it through the flashing lane for a skill shot.</li>
				{/if}
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
