<script lang="ts">
	import GuideShell from '$lib/components/GuideShell.svelte';
	import OpponentSeal from './OpponentSeal.svelte';
	import { chessGuide, chessPanels } from '../settings.svelte';
	import { OPPONENTS } from '../types';

	const controls = [
		['Tap / click', 'Lift a piece, then tap where it should go'],
		['Drag', 'Carry a piece to its square'],
		['Arrows / WASD', 'Move the gold cursor'],
		['Enter / Space', 'Lift or place at the cursor'],
		[', .', 'Step back and forward through the moves (← → once the game is over)'],
		['F', 'Flip the board'],
		['E', 'Show or hide the evaluation bar'],
		['?', 'Open this guide'],
		['Esc', 'Put a piece down, close a panel, then back to the title']
	];

	const LIGHT = '#e9dcc4';
	const DARK = '#4f6b5c';
	const squares = Array.from({ length: 16 }, (_, i) => i);
</script>

<GuideShell open={chessGuide.open} onclose={chessPanels.closeGuide} tone="regal" kicker="The rules of the hall">
	<div class="goal">
		<svg class="sample" viewBox="0 0 64 64" aria-hidden="true">
			{#each squares as i (i)}
				<rect x={(i % 4) * 16} y={Math.floor(i / 4) * 16} width="16" height="16" fill={(i + Math.floor(i / 4)) % 2 ? DARK : LIGHT} />
			{/each}
			<g transform="translate(17 0) scale(0.3)" fill="#fffaf0" stroke="#3a2614" stroke-width="4">
				<path d="M31 79 C36 66 42 58 42 48 L58 48 C58 58 64 66 69 79 Z M37 42 C32 33 38 26 50 26 C62 26 68 33 63 42 Z M36 42 H64 V48 H36 Z M47 7 H53 V28 H47 Z M41 12.5 H59 V18 H41 Z M20 84 H80 V93 H20 Z" />
			</g>
			<g transform="translate(33 33) scale(0.3)" fill="#2d221c" stroke="#050302" stroke-width="4">
				<path d="M31 79 C36 66 42 58 42 48 L58 48 C58 58 64 66 69 79 Z M37 42 C32 33 38 26 50 26 C62 26 68 33 63 42 Z M36 42 H64 V48 H36 Z M47 7 H53 V28 H47 Z M41 12.5 H59 V18 H41 Z M20 84 H80 V93 H20 Z" />
			</g>
			<rect x="32" y="32" width="16" height="16" fill="none" stroke="#e0505a" stroke-width="1.6" />
		</svg>
		<p>
			Standard chess under the official rules. Move in turn, White first.
			<strong>Checkmate the enemy king: attack it so that no move escapes.</strong>
		</p>
	</div>

	<div class="cols">
		<div>
			<p class="sub">Special moves</p>
			<ul>
				<li>
					<strong>Castling</strong>: king two squares toward a rook, the rook hops over. Neither may have moved, the squares between must be
					empty, and the king may not be in check, cross an attacked square, or land in check.
				</li>
				<li>
					<strong>En passant</strong>: a pawn that advances two squares past an enemy pawn may be taken as if it moved one, but only on the
					very next move.
				</li>
				<li><strong>Promotion</strong>: a pawn reaching the far rank becomes a queen, rook, bishop or knight of your choice.</li>
			</ul>

			<p class="sub">Endings</p>
			<ul>
				<li><strong>Checkmate</strong> wins. <strong>Stalemate</strong> (no legal move, not in check) is a draw.</li>
				<li>
					<strong>Draws you may claim</strong>: the same position three times with the same player to move, or fifty moves each with no
					capture or pawn move. A <em>Claim draw</em> button appears when you can.
				</li>
				<li>
					<strong>Automatic draws</strong>: fivefold repetition, seventy-five moves without a capture or pawn move, or too little material
					left for anyone to mate.
				</li>
				<li>You may offer a draw or resign at any time.</li>
				<li>On the clock, running out of time loses, unless your opponent has too little left to ever mate you. Then it's a draw.</li>
			</ul>
		</div>

		<div>
			<p class="sub">The ladder</p>
			<ul class="ladder">
				{#each OPPONENTS as o (o.id)}
					<li>
						<OpponentSeal opponent={o} size={24} />
						<span><strong>{o.name}</strong> {o.title} · <em>{o.rating}</em></span>
					</li>
				{/each}
			</ul>
			<p class="note">
				Each plays openings from their own repertoire and makes the kind of mistakes a player of that strength makes. After a game, the Count
				will review it and mark every inaccuracy, mistake and blunder.
			</p>

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
		background: linear-gradient(160deg, #5a3a22, #2a160c);
		box-shadow: inset 0 0 0 1px rgba(217, 178, 94, 0.4);
	}

	.ladder {
		list-style: none;
		padding: 0;
	}

	.ladder li {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 3px 0;
	}

	.ladder em {
		font-style: normal;
		opacity: 0.7;
	}

	.note {
		margin: 6px 0 0;
		opacity: 0.85;
		line-height: 1.45;
	}
</style>
