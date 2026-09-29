<script lang="ts">
	import GuideShell from '$lib/components/GuideShell.svelte';
	import { closeWyrmGuide, wyrmGuide } from '../settings.svelte';
	import { COLS, ROWS } from '../types';

	const W = 7;
	const H = 5;
	// Head first; the wyrm is heading right toward the lantern.
	const BODY = ['1:3', '1:2', '2:2', '3:2', '3:1', '4:1'];
	const LANTERN = '1:5';

	const controls = [
		['← ↑ → ↓ / WASD', 'Steer — up to two turns queue ahead'],
		['Swipe', 'Steer on touch screens'],
		['Space / P', 'Pause and resume'],
		['Enter / Space', 'Run again after the wyrm falls'],
		['Enter', 'Start or resume from the title screen'],
		['?', 'Open this guide'],
		['Esc', 'Close a panel, then back to the title']
	];
</script>

<GuideShell open={wyrmGuide.open} onclose={closeWyrmGuide} tone="night" kicker="Market lore">
	<div class="goal">
		<div class="sample" style:--w={W} style:--h={H} aria-hidden="true">
			{#each Array.from({ length: H }, (_, r) => r) as r (r)}
				{#each Array.from({ length: W }, (_, c) => c) as c (c)}
					{@const key = `${r}:${c}`}
					<i class:head={key === BODY[0]} class:body={BODY.includes(key)} class:lamp={key === LANTERN}></i>
				{/each}
			{/each}
		</div>
		<p>
			Steer the silk wyrm through the night market and <strong>swallow every lantern</strong>. Each one
			adds a length of silk and a point.
		</p>
	</div>

	<div class="cols">
		<div>
			<p class="sub">Rules</p>
			<ul>
				<li>The wyrm never stops moving; you only choose where it turns.</li>
				<li>Striking the market wall or your own tail ends the run. You cannot turn straight back on yourself.</li>
				<li>The more you eat, the faster the wyrm moves.</li>
				<li>Fill all {COLS * ROWS} squares of the market to win outright.</li>
			</ul>

			<p class="sub">Nights</p>
			<ul>
				<li><strong>Dusk stroll</strong> — slow and forgiving.</li>
				<li><strong>Night market</strong> — the proper pace.</li>
				<li><strong>Lantern fever</strong> — fast from the first lantern.</li>
				<li>Each night keeps its own best score.</li>
			</ul>
		</div>

		<div>
			<p class="sub">Tips</p>
			<ul>
				<li>Sweep in long lanes and keep open space ahead of your head.</li>
				<li>Tap two turns in quick succession to make a tight U-turn.</li>
				<li>As you grow, follow your tail — the space it leaves is always safe.</li>
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
		display: grid;
		grid-template-columns: repeat(var(--w), 16px);
		grid-template-rows: repeat(var(--h), 16px);
		gap: 2px;
		padding: 6px;
		border-radius: 10px;
		background: #0b1024;
		box-shadow: inset 0 0 0 1px rgba(240, 196, 92, 0.3);
	}

	.sample i {
		border-radius: 4px;
		background: rgba(240, 196, 92, 0.06);
	}

	.sample i.body {
		background: linear-gradient(180deg, #f0c45c, #c4892a);
	}

	.sample i.head {
		background: radial-gradient(circle at 40% 35%, #fff6d2, #e24a3d);
		box-shadow: 0 0 8px rgba(226, 74, 61, 0.7);
	}

	.sample i.lamp {
		border-radius: 40% 40% 36% 36%;
		background: radial-gradient(circle at 35% 30%, #ffd0c4, #e24a3d 58%, #8a1820);
		box-shadow: 0 0 10px rgba(226, 74, 61, 0.8);
	}
</style>
