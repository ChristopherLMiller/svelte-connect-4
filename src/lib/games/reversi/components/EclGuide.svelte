<script lang="ts">
	import GuideShell from '$lib/components/GuideShell.svelte';
	import { eclGuide, closeEclGuide } from '../settings.svelte';

	// Moon (1) drops on the ring and traps the two suns between itself and the moon on the far side.
	const SAMPLE = [
		[0, 0, 0, 0],
		[3, 2, 2, 1],
		[0, 1, 2, 0],
		[0, 0, 0, 0]
	];

	const controls = [
		['Click / tap', 'Place a disc on a legal square'],
		['← ↑ → ↓ / WASD', 'Move the cursor'],
		['Enter / Space', 'Place at the cursor'],
		['Enter', 'Start or resume from the title; rematch after a round'],
		['?', 'Open this guide'],
		['Esc', 'Close a panel, then back to the title']
	];
</script>

<GuideShell open={eclGuide.open} onclose={closeEclGuide} tone="orrery" kicker="Laws of the heavens">
	<div class="goal">
		<div class="sample" aria-hidden="true">
			{#each SAMPLE as row, r (r)}
				{#each row as cell, c (c)}
					<i>
						{#if cell === 1}<b class="moon"></b>{/if}
						{#if cell === 2}<b class="sun"></b>{/if}
						{#if cell === 3}<b class="land"></b>{/if}
					</i>
				{/each}
			{/each}
		</div>
		<p>
			Reversi on an 8×8 star chart. When no one can move, <strong>whoever shows more discs wins</strong>.
		</p>
	</div>

	<div class="cols">
		<div>
			<p class="sub">Moves</p>
			<ul>
				<li>The Moon (silver) always moves first, then the Sun (gold).</li>
				<li>
					Place a disc so that one or more straight lines of enemy discs sit
					<strong>between your new disc and another of yours</strong> — across, down, or diagonal.
				</li>
				<li>Every trapped disc flips to your side. One placement can flip in several directions at once.</li>
				<li>If you have no legal square, your turn passes. When neither side can move, the round ends.</li>
			</ul>

			<p class="sub">Modes</p>
			<ul>
				<li><strong>Night and day</strong> — hotseat. Pass the board between Moon and Sun.</li>
				<li>
					<strong>Play the heavens</strong> — you are the Moon against the orrery. Pick easy, medium, or hard
					on the title screen.
				</li>
			</ul>
		</div>

		<div>
			<p class="sub">Tips</p>
			<ul>
				<li><strong>Corners can never be flipped.</strong> Claim them and build outward along the edges.</li>
				<li>
					Avoid the squares touching an empty corner — they hand your opponent the way in.
				</li>
				<li>More discs early is often worse. Keep your moves plentiful and theirs scarce.</li>
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
		gap: 2px;
		padding: 4px;
		border-radius: 10px;
		background: linear-gradient(180deg, #c9a256, #7a5420);
	}

	.sample i {
		display: grid;
		place-items: center;
		background: #18183a;
		border-radius: 3px;
	}

	.sample b {
		width: 74%;
		height: 74%;
		border-radius: 50%;
	}

	.moon {
		background: radial-gradient(circle at 35% 30%, #fff, #b8c2d8 55%, #5b6582);
	}

	.sun {
		background: radial-gradient(circle at 35% 30%, #fff6d2, #f0c060 50%, #8a5a1c);
	}

	.land {
		border: 2px dashed #e8b85a;
		box-sizing: border-box;
	}
</style>
