<script lang="ts">
	import GuideShell from '$lib/components/GuideShell.svelte';
	import { closeChapelGuide, chapelGuide } from '../settings.svelte';
	import { CHAPTERS, WINDOWS } from '../levels';

	const SAMPLE = ['.aaa.', 'rbRbr', 'r#g#r', 'bbobb'];
	const HUE: Record<string, string> = { a: 'amber', r: 'ruby', b: 'cobalt', g: 'emerald', o: 'opal' };

	const relics = [
		['lantern', 'Lantern', 'Widens the oak beam for a while.'],
		['triptych', 'Triptych', 'The light splits into three.'],
		['halo', 'Halo', 'Slows the light so you can breathe.'],
		['sunburst', 'Sunburst', 'The light burns straight through glass.'],
		['candle', 'Candle', 'One more candle on the altar.']
	] as const;

	const controls = [
		['Mouse / drag', 'Move the oak beam'],
		['← → / A D', 'Move the beam from the keyboard'],
		['Click / tap / Space', 'Serve the light'],
		['Space / P', 'Pause and resume once the light is in flight'],
		['Enter', 'Start, resume, or go again after the last candle'],
		['?', 'Open this guide'],
		['Esc', 'Close a panel, then back to the title']
	];
</script>

<GuideShell open={chapelGuide.open} onclose={closeChapelGuide} tone="chapel" kicker="The rubric">
	<div class="goal">
		<div class="sample" aria-hidden="true">
			{#each SAMPLE as row, r (r)}
				{#each row.split('') as ch, c (`${r}-${c}`)}
					<i
						class={[ch === '#' ? 'lead' : HUE[ch.toLowerCase()], ch !== ch.toLowerCase() && 'thick']}
						class:gone={ch === '.'}
					></i>
				{/each}
			{/each}
			<b class="beam"></b>
			<em class="light"></em>
		</div>
		<p>
			Keep the mote of candlelight in the air with the oak beam and <strong>knock out every stone</strong> bricking up the
			window. Behind each one is stained glass, and once it is uncovered its colour falls to the floor as light. There are {WINDOWS.length} windows in {CHAPTERS.length} chapters; light the last window of a chapter and the next
			one opens, so a new run can begin there.
		</p>
	</div>

	<div class="cols">
		<div>
			<p class="sub">Rules</p>
			<ul>
				<li>Where the light strikes the beam sets its angle: near the ends sends it wide.</li>
				<li>Gilded stones take two strikes. <strong>Stone tracery</strong> never breaks.</li>
				<li>Stones broken without touching the beam build a <strong>chain</strong> that multiplies their worth.</li>
				<li>Let the light fall past the beam and a candle goes out. When the last one gutters, the vigil ends.</li>
				<li>Lighting a window pays a bonus for the window and every candle still burning.</li>
			</ul>

			<p class="sub">Hours</p>
			<ul>
				<li><strong>Vespers</strong> — a broad beam, four candles, generous relics.</li>
				<li><strong>Compline</strong> — the proper pace.</li>
				<li><strong>Nocturns</strong> — narrow, fast and sparing.</li>
			</ul>
		</div>

		<div>
			<p class="sub">Relics</p>
			<ul class="relics">
				{#each relics as [id, name, body] (id)}
					<li><i class={['relic', id]}></i><strong>{name}</strong> — {body}</li>
				{/each}
			</ul>

			<p class="sub">Controls</p>
			<dl>
				{#each controls as [key, action] (key)}
					<dt><kbd>{key}</kbd></dt>
					<dd>{action}</dd>
				{/each}
			</dl>
		</div>
	</div>
</GuideShell>

<style>
	.sample {
		position: relative;
		display: grid;
		grid-template-columns: repeat(5, 22px);
		grid-auto-rows: 11px;
		gap: 2px;
		padding: 8px 8px 46px;
		border-radius: 10px;
		background: linear-gradient(180deg, #121a3c, #15141b 60%, #1c1b22);
		box-shadow: inset 0 0 0 1px rgba(242, 196, 107, 0.3);
	}

	.sample i {
		border-radius: 2px;
		box-shadow: inset 0 0 0 1px #0f0d13;
	}

	.sample i.gone {
		visibility: hidden;
	}

	.sample i.thick {
		background-image: linear-gradient(90deg, transparent 47%, #0f0d13 47% 53%, transparent 53%) !important;
		background-color: #c8243c;
	}

	.amber {
		background: linear-gradient(160deg, #ffd98a, #e8a23a);
	}

	.ruby {
		background: linear-gradient(160deg, #ff8c9c, #c8243c);
	}

	.cobalt {
		background: linear-gradient(160deg, #93b3ff, #2b5ad0);
	}

	.emerald {
		background: linear-gradient(160deg, #7ff0b0, #1f9a5c);
	}

	.opal {
		background: linear-gradient(160deg, #fff, #cdd8e6);
	}

	.lead {
		background: linear-gradient(180deg, #3c3a46, #141319);
	}

	.beam {
		position: absolute;
		left: 40px;
		bottom: 10px;
		width: 44px;
		height: 7px;
		border-radius: 4px;
		background: linear-gradient(90deg, #c08d34 0 6px, #8a5a30 6px calc(100% - 6px), #c08d34 calc(100% - 6px));
	}

	.light {
		position: absolute;
		left: 74px;
		bottom: 30px;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #fff0c8;
		box-shadow: 0 0 10px 3px rgba(255, 214, 140, 0.7);
	}

	.relics li {
		padding-left: 30px;
	}

	.relics li::before {
		display: none;
	}

	.relic {
		position: absolute;
		left: 0;
		top: 0.05em;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: #16131e;
		border: 2px solid currentColor;
		box-shadow: 0 0 10px currentColor;
	}

	.relic.lantern {
		color: #ffd98a;
	}

	.relic.triptych {
		color: #93b3ff;
	}

	.relic.halo {
		color: #f4f8ff;
	}

	.relic.sunburst {
		color: #ff9a7a;
	}

	.relic.candle {
		color: #cba3ff;
	}
</style>
