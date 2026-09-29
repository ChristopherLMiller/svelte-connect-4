<script lang="ts">
	import GuideShell from '$lib/components/GuideShell.svelte';
	import { closeTttGuide, tttGuide } from '../settings.svelte';

	// Cross (1) has finished the diagonal; Loop (2) blocked twice.
	const SAMPLE = [
		[1, 2, 0],
		[0, 1, 2],
		[0, 0, 1]
	];

	const controls = [
		['Click / tap', 'Scratch your mark in that square'],
		['1 – 9', 'Squares left to right, top to bottom'],
		['← ↑ → ↓', 'Move the stick'],
		['Enter / Space', 'Scratch where the stick is'],
		['Enter', 'Start or resume from the title screen'],
		['?', 'Open this guide'],
		['Esc', 'Close a panel, then back to the title']
	];
</script>

<GuideShell open={tttGuide.open} onclose={closeTttGuide} tone="shore" kicker="Written in the sand">
	<div class="goal">
		<div class="sample" aria-hidden="true">
			{#each SAMPLE as row, r (r)}
				{#each row as cell, c (c)}
					<i class:win={cell === 1 && r === c}>{cell === 1 ? '✕' : cell === 2 ? '◯' : ''}</i>
				{/each}
			{/each}
		</div>
		<p>
			Scratch <strong>three of your marks in a line</strong> — across, down, or corner to corner —
			before the other side does.
		</p>
	</div>

	<div class="cols">
		<div>
			<p class="sub">Turns</p>
			<ul>
				<li>Cross and Loop take turns scratching one mark into an empty square.</li>
				<li>Cross opens the first round; each new round swaps who starts.</li>
				<li>Nine marks and no line is a draw. Either way, the tide washes the sand clean for the next round.</li>
			</ul>

			<p class="sub">Modes</p>
			<ul>
				<li><strong>Shore duel</strong> — two players pass the stick on one screen.</li>
				<li>
					<strong>Play the water</strong> — you play Cross against the tide. Pick easy, medium, or hard on
					the title screen.
				</li>
			</ul>
		</div>

		<div>
			<p class="sub">Tips</p>
			<ul>
				<li>The centre sits on four lines and each corner on three — they are the strongest openings.</li>
				<li>Always block two-in-a-row before building your own.</li>
				<li>Set up a fork: two lines that each need one more mark. Only one can be blocked.</li>
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
		grid-template-columns: repeat(3, 26px);
		grid-template-rows: repeat(3, 26px);
		gap: 3px;
		padding: 6px;
		border-radius: 10px;
		background: linear-gradient(180deg, #d9b887, #b88c62);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
	}

	.sample i {
		display: grid;
		place-items: center;
		border-radius: 4px;
		background: rgba(255, 244, 222, 0.35);
		font-style: normal;
		font-weight: 800;
		font-size: 0.95rem;
		color: #4a3222;
	}

	.sample i.win {
		color: #1d6d86;
		background: rgba(29, 109, 134, 0.18);
	}
</style>
