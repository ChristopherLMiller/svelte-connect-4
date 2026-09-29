<script lang="ts">
	import GuideShell from '$lib/components/GuideShell.svelte';
	import { ashGuide, closeAshGuide } from '../settings.svelte';

	// Ember (1) on the bottom-left is about to hop Bone (2) and land on the ring.
	const SAMPLE = [
		[0, 0, 0, 3],
		[0, 0, 2, 0],
		[0, 1, 0, 0],
		[0, 0, 0, 0]
	];

	const controls = [
		['Click / tap', 'Pick up a piece, then tap where it lands'],
		['← ↑ → ↓ / WASD', 'Move the cursor'],
		['Enter / Space', 'Pick up or set down at the cursor'],
		['Enter', 'Start or resume from the title; rematch after a round'],
		['?', 'Open this guide'],
		['Esc', 'Close a panel, then back to the title']
	];
</script>

<GuideShell open={ashGuide.open} onclose={closeAshGuide} tone="ash" kicker="Rules of the yard">
	<div class="goal">
		<div class="sample" aria-hidden="true">
			{#each SAMPLE as row, r (r)}
				{#each row as cell, c (c)}
					<i class:dark={(r + c) % 2 === 1}>
						{#if cell === 1}<b class="ember"></b>{/if}
						{#if cell === 2}<b class="bone"></b>{/if}
						{#if cell === 3}<b class="land"></b>{/if}
					</i>
				{/each}
			{/each}
		</div>
		<p>
			English draughts. <strong>Take every opposing piece</strong>, or leave your opponent with no legal
			move, to win the round.
		</p>
	</div>

	<div class="cols">
		<div>
			<p class="sub">Moves</p>
			<ul>
				<li>Ember (oxblood) always moves first. Pieces only ever stand on the dark squares.</li>
				<li>A man steps one square diagonally forward.</li>
				<li>
					Hop diagonally over an adjacent enemy into the empty square beyond to take it.
					<strong>If a take is available, you must take.</strong>
				</li>
				<li>If the landing square offers another take, keep hopping in the same turn.</li>
				<li>
					Reach the far row to <strong>crown</strong>. Kings move and take backwards too. Crowning ends
					the turn.
				</li>
				<li>Forty moves each with only kings moving and nothing taken is a draw.</li>
			</ul>
		</div>

		<div>
			<p class="sub">Modes</p>
			<ul>
				<li><strong>Yard duel</strong> — hotseat. Ember hops up the board, Bone hops down.</li>
				<li>
					<strong>Play the clay</strong> — you play Ember against the yard. Pick easy, medium, or hard on the
					title screen.
				</li>
			</ul>

			<p class="sub">Tips</p>
			<ul>
				<li>Keep your back row home as long as you can; it stops enemy men from crowning.</li>
				<li>Pieces on the edge cannot be hopped from the side.</li>
				<li>Forced takes cut both ways — offer one piece to pull an enemy into a double hop.</li>
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
		grid-template-columns: repeat(4, 24px);
		grid-template-rows: repeat(4, 24px);
		padding: 5px;
		border-radius: 10px;
		background: linear-gradient(180deg, #5a5048, #2a2420);
	}

	.sample i {
		display: grid;
		place-items: center;
		background: #f4ede2;
	}

	.sample i.dark {
		background: #2e2823;
	}

	.sample b {
		width: 72%;
		height: 72%;
		border-radius: 50%;
	}

	.ember {
		background: radial-gradient(circle at 32% 26%, #f8d4d6, #c43b4a 36%, #6a141e);
	}

	.bone {
		background: radial-gradient(circle at 34% 26%, #ffffff, #efe8dc 50%, #b7c9be);
	}

	.land {
		border: 2px dashed #7fb09f;
		box-sizing: border-box;
	}
</style>
