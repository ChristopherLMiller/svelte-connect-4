<script lang="ts">
	import GuideShell from '$lib/components/GuideShell.svelte';
	import { cartGuide, closeCartGuide } from '../settings.svelte';

	const controls = [
		['Click / tap', 'Ink the nearest line; slide before letting go to adjust'],
		['← ↑ → ↓ / WASD', 'Move between lines'],
		['Enter / Space', 'Ink the line under the cursor'],
		['Enter', 'Start or resume from the title; new sheet after a round'],
		['?', 'Open this guide'],
		['Esc', 'Close a panel, then back to the title']
	];
</script>

<GuideShell open={cartGuide.open} onclose={closeCartGuide} tone="ink" kicker="The guild's rules">
	<div class="goal">
		<svg class="sample" viewBox="0 0 96 64" aria-hidden="true">
			<rect x="34" y="6" width="26" height="26" fill="#b3311d" opacity="0.14" />
			<path d="M41 24 L47 13 L53 24 Z" fill="#f1e4c4" stroke="#b3311d" stroke-width="1.6" stroke-linejoin="round" />
			<g stroke-linecap="round" stroke-width="3">
				<path d="M8 6 H34" stroke="#26407f" />
				<path d="M34 6 H60" stroke="#b3311d" />
				<path d="M34 6 V32" stroke="#26407f" />
				<path d="M60 6 V32" stroke="#b3311d" />
				<path d="M34 32 H60" stroke="#b3311d" />
				<path d="M60 32 H86" stroke="#26407f" />
				<path d="M8 32 V58" stroke="#b3311d" />
			</g>
			<path d="M60 32 V58" stroke="#26407f" stroke-width="3" stroke-dasharray="4 4" stroke-linecap="round" opacity="0.6" />
			<g fill="#3b2a1a">
				{#each [8, 34, 60, 86] as x (x)}
					{#each [6, 32, 58] as y (y)}
						<circle cx={x} cy={y} r="2.6" />
					{/each}
				{/each}
			</g>
		</svg>
		<p>
			Dots and boxes on a hidden map. Ink lines between dots; <strong>close a square and it's yours</strong>, painted in
			with whatever land lies beneath. Most squares wins.
		</p>
	</div>

	<div class="cols">
		<div>
			<p class="sub">Turns</p>
			<ul>
				<li>On your turn, ink one line between two neighbouring dots.</li>
				<li>
					If your line closes the fourth side of a square, you claim it <strong>and must ink again</strong>. One line can close
					two squares at once.
				</li>
				<li>If your line closes nothing, the quill passes. The round ends when every square is claimed.</li>
			</ul>

			<p class="sub">Modes</p>
			<ul>
				<li><strong>Two quills</strong> — hotseat. Vermilion against Indigo; who opens alternates each sheet.</li>
				<li>
					<strong>Mercator</strong> — you are Vermilion against the guild's old master. Apprentice grabs what he can,
					Journeyman plays safe, and Master knows chains cold.
				</li>
			</ul>
		</div>

		<div>
			<p class="sub">Tips</p>
			<ul>
				<li>Avoid drawing the third side of a square; your rival simply takes it. The red warning mark shows those lines.</li>
				<li>
					Late on, the sheet splits into <strong>chains</strong>. Whoever is forced to open the long ones usually loses.
				</li>
				<li>
					The <strong>double-cross</strong>: take a chain but leave its last two squares with one line across them. Your rival
					gets two, then has to open the next chain for you.
				</li>
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
		width: 112px;
		height: 75px;
		padding: 6px;
		border-radius: 4px;
		background: linear-gradient(160deg, #f6ead0, #e2c896);
		box-shadow: inset 0 0 0 1px rgba(107, 72, 36, 0.4);
	}
</style>
