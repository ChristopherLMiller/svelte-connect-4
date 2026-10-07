<script lang="ts">
	import GuideShell from '$lib/components/GuideShell.svelte';
	import { apoGuide, closeApoGuide } from '../settings.svelte';
	import { REAGENTS, valueOf } from '../types';

	const ladder = REAGENTS.slice(1, 12).map((r, i) => ({ ...r, tier: i + 1 }));

	const controls = [
		['Swipe', 'Tip the rack: every vial slides that way'],
		['← ↑ → ↓ / WASD', 'Tip the rack with the keyboard'],
		['U / Z / Backspace', 'Undo the last pour, if a stopper is left'],
		['N', 'Start a new brew'],
		['Enter', 'Start or resume from the title; keep brewing past the Stone'],
		['?', 'Open this guide'],
		['Esc', 'Close a panel, then back to the title']
	];
</script>

<GuideShell open={apoGuide.open} onclose={closeApoGuide} tone="brew" kicker="From the alchemist's notebook">
	<div class="goal">
		<svg class="sample" viewBox="0 0 120 50" aria-hidden="true">
			<g stroke="#d6aa5c" stroke-width="1.2" fill="rgba(20,28,24,0.9)">
				<rect x="10" y="12" width="12" height="30" rx="6" />
				<rect x="34" y="12" width="12" height="30" rx="6" />
			</g>
			<rect x="11.5" y="24" width="9" height="16.5" rx="4.5" fill="#cfe3d6" />
			<rect x="35.5" y="24" width="9" height="16.5" rx="4.5" fill="#cfe3d6" />
			<path d="M54 27 H70 M64 21 L70 27 L64 33" fill="none" stroke="#e0b25c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
			<circle cx="96" cy="31" r="14" fill="rgba(20,28,24,0.9)" stroke="#d6aa5c" stroke-width="1.2" />
			<rect x="92" y="9" width="8" height="10" fill="rgba(20,28,24,0.9)" stroke="#d6aa5c" stroke-width="1.2" />
			<path d="M84 33 Q96 29 108 33 Q106 43 96 44 Q86 43 84 33 Z" fill="#e8c63a" />
		</svg>
		<p>
			Every pour tips the whole rack. Two vials of the <strong>same reagent</strong> that bump together pour into one of
			the next, rarer kind. Climb the ladder to {valueOf(11)}, the Philosopher's Stone.
		</p>
	</div>

	<div class="cols">
		<div>
			<p class="sub">Pouring</p>
			<ul>
				<li>Swipe or press an arrow: every vial slides as far as it can that way.</li>
				<li>Matching vials that meet pour together. Each vial pours only once per tip.</li>
				<li>After every tip that moves something, a fresh vial appears: rainwater (2) nine times in ten, otherwise brine (4).</li>
				<li>The brew ends when the rack is full and no two neighbours match.</li>
			</ul>

			<p class="sub">Stoppers</p>
			<ul>
				<li>You start with three stoppers. Each one takes back a single pour, even after the rack fills.</li>
				<li>Distil a new reagent of {valueOf(8)} or more and you get a stopper back (up to three).</li>
				<li>Undo restores the same next vial, so the brew of the day stays fair.</li>
			</ul>

			<p class="sub">Benches</p>
			<ul>
				<li><strong>The bench</strong> — the classic four by four.</li>
				<li><strong>The grand cabinet</strong> — five by five, more forgiving and much longer.</li>
				<li><strong>Brew of the day</strong> — four by four, the same vials for everyone today.</li>
			</ul>
		</div>

		<div>
			<p class="sub">The ladder</p>
			<ol class="ladder">
				{#each ladder as r (r.tier)}
					<li style:--c={r.color}><i></i><b>{valueOf(r.tier)}</b><span>{r.name}</span></li>
				{/each}
			</ol>
			<p class="sub">Tips</p>
			<ul>
				<li>Keep your rarest vial in a corner and build toward it along one edge.</li>
				<li>Avoid tipping away from that corner unless you must.</li>
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
		width: 132px;
		height: 55px;
		padding: 4px;
		border-radius: 8px;
		background: linear-gradient(160deg, #2a1a10, #1a100a);
		box-shadow: inset 0 0 0 1px rgba(214, 170, 92, 0.4);
	}

	.ladder {
		list-style: none;
		margin: 0 0 8px;
		padding: 0;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 4px 12px;
	}

	.ladder li {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.9rem;
	}

	.ladder i {
		width: 11px;
		height: 11px;
		border-radius: 50%;
		flex-shrink: 0;
		background: var(--c);
		box-shadow: 0 0 6px color-mix(in srgb, var(--c) 60%, transparent);
	}

	.ladder b {
		min-width: 2.6em;
		text-align: right;
		font-family: Cinzel, Georgia, serif;
	}
</style>
