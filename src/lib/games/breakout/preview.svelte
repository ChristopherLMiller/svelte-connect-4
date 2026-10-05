<script lang="ts">
	import ChapelIcon from './components/ChapelIcon.svelte';

	const MAP = ['.vvrrrvv.', 'vrabbbarv', 'rab.o.bar', '.ab...ba.', '..b...b..'];
	const HUE: Record<string, string> = { v: 'violet', r: 'ruby', a: 'amber', b: 'cobalt', o: 'opal' };
	const cells = MAP.flatMap((row, r) => row.split('').map((ch, c) => ({ key: `${r}-${c}`, hue: HUE[ch] ?? '' })));
	const shafts = [
		{ x: 46, hue: 'ruby', d: 0 },
		{ x: 50, hue: 'opal', d: 0.6 },
		{ x: 36, hue: 'cobalt', d: 1.2 },
		{ x: 60, hue: 'amber', d: 1.8 }
	];
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=IM+Fell+English+SC&family=Alegreya+Sans:wght@400;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="shot" aria-hidden="true">
	<div class="arches">
		<span class="arch a"></span>
		<span class="arch b"></span>
		<span class="arch c"></span>
	</div>
	<div class="hud">
		<div class="brand">
			<ChapelIcon size="chip" />
			<div>
				<p>Chapel Glass</p>
				<small>the rose</small>
			</div>
		</div>
		<div class="call"><b>A chain of 6 · ×2</b></div>
		<div class="score">4,280<span class="candle"></span><span class="candle"></span></div>
	</div>
	<div class="frame">
		<div class="field">
			{#each shafts as shaft (shaft.x)}
				<i class={['shaft', shaft.hue]} style:left="{shaft.x}%" style:--d="{shaft.d}s"></i>
			{/each}
			<div class="grid">
				{#each cells as cell (cell.key)}
					<span class={['pane', cell.hue]}></span>
				{/each}
			</div>
			<span class="light"></span>
			<span class="beam"></span>
			<span class="floor"></span>
		</div>
	</div>
</div>

<style>
	.shot {
		position: relative;
		height: 100%;
		overflow: hidden;
		container-type: size;
		background:
			radial-gradient(50% 40% at 50% 30%, rgba(147, 179, 255, 0.12), transparent 70%),
			radial-gradient(60% 30% at 50% 100%, rgba(255, 200, 120, 0.1), transparent 70%),
			linear-gradient(180deg, #14141d 0%, #0d0d14 65%, #08080c 100%);
		font-family: 'Alegreya Sans', ui-sans-serif, system-ui, sans-serif;
		color: #f4e8d0;
	}

	.arches {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.arch {
		position: absolute;
		bottom: 18%;
		width: 9cqw;
		height: 40cqh;
		background: linear-gradient(180deg, rgba(203, 163, 255, 0.28), rgba(147, 179, 255, 0.12));
		clip-path: polygon(0 100%, 0 35%, 50% 0, 100% 35%, 100% 100%);
		opacity: 0.6;
	}

	.arch.a {
		left: 8%;
	}

	.arch.b {
		right: 8%;
	}

	.arch.c {
		left: 50%;
		translate: -50% 0;
		width: 12cqw;
		height: 50cqh;
		opacity: 0.3;
	}

	.hud {
		position: relative;
		z-index: 2;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		gap: 5px;
		padding: 5% 5% 0;
	}

	.brand,
	.call,
	.score {
		border: 1px solid rgba(242, 196, 107, 0.28);
		background: rgba(18, 17, 24, 0.86);
		border-radius: 9px;
		padding: 4px 7px;
		min-width: 0;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 8px 4px 4px;
	}

	.brand :global(.icon) {
		width: 18px;
		height: 18px;
	}

	.brand p {
		margin: 0;
		font-family: 'IM Fell English SC', Georgia, serif;
		font-size: 0.66rem;
		line-height: 1;
		white-space: nowrap;
	}

	.brand small {
		display: block;
		font-size: 0.4rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #f2c46b;
	}

	.call {
		display: grid;
		place-items: center;
	}

	.call b {
		font-family: 'IM Fell English SC', Georgia, serif;
		font-weight: 400;
		font-size: clamp(0.5rem, 3.4cqw, 0.78rem);
		white-space: nowrap;
	}

	.score {
		display: flex;
		align-items: center;
		gap: 4px;
		font-family: 'IM Fell English SC', Georgia, serif;
		font-size: 0.6rem;
		color: #ffe2a0;
	}

	.candle {
		width: 3px;
		height: 8px;
		border-radius: 1px;
		background: #f4e8d0;
		box-shadow: 0 -4px 4px -1px #ffb44a;
	}

	.frame {
		position: absolute;
		left: 50%;
		top: 23%;
		height: 74%;
		aspect-ratio: 1.15;
		translate: -50% 0;
		padding: 2.6%;
		box-sizing: border-box;
		border-radius: 8px;
		background: linear-gradient(180deg, #34323e, #17161d);
		box-shadow: 0 12px 28px rgba(0, 0, 0, 0.6);
	}

	.field {
		position: relative;
		height: 100%;
		border-radius: 4px;
		overflow: hidden;
		background: linear-gradient(180deg, #121a3c 0%, #15141b 45%, #121118 85%, #1c1b22 85%);
	}

	.grid {
		position: absolute;
		left: 6%;
		right: 6%;
		top: 6%;
		display: grid;
		grid-template-columns: repeat(9, 1fr);
		gap: 2px;
	}

	.pane {
		aspect-ratio: 2.1;
		border-radius: 1.5px;
		box-shadow: inset 0 0 0 1px #0f0d13;
	}

	.violet {
		--c: 203, 163, 255;
		background: linear-gradient(160deg, #cba3ff, #7b3dcc);
	}

	.ruby {
		--c: 255, 140, 156;
		background: linear-gradient(160deg, #ff8c9c, #c8243c);
	}

	.amber {
		--c: 255, 217, 138;
		background: linear-gradient(160deg, #ffd98a, #e8a23a);
	}

	.cobalt {
		--c: 147, 179, 255;
		background: linear-gradient(160deg, #93b3ff, #2b5ad0);
	}

	.opal {
		--c: 244, 248, 255;
		background: linear-gradient(160deg, #fff, #cdd8e6);
	}

	.shaft {
		position: absolute;
		top: 22%;
		width: 9%;
		height: 66%;
		background: linear-gradient(180deg, rgba(var(--c), 0.28), rgba(var(--c), 0.08) 70%, rgba(var(--c), 0.2));
		clip-path: polygon(30% 0, 70% 0, 130% 100%, -30% 100%);
		transform: skewX(-12deg);
		transform-origin: top;
		mix-blend-mode: screen;
		animation: breathe 4s ease-in-out infinite;
		animation-delay: var(--d);
	}

	.light {
		position: absolute;
		left: 56%;
		top: 58%;
		width: 3.6%;
		aspect-ratio: 1;
		border-radius: 50%;
		background: #fff0c8;
		box-shadow:
			0 0 8px 3px rgba(255, 214, 140, 0.7),
			0 0 22px 8px rgba(255, 190, 110, 0.25);
	}

	.beam {
		position: absolute;
		left: 40%;
		bottom: 18%;
		width: 22%;
		height: 2.4%;
		border-radius: 3px;
		background: linear-gradient(90deg, #c08d34 0 10%, #8a5a30 10% 90%, #c08d34 90%);
	}

	.floor {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 15%;
		background:
			radial-gradient(18% 40% at 52% 40%, rgba(255, 140, 156, 0.35), transparent 70%),
			radial-gradient(16% 40% at 40% 50%, rgba(147, 179, 255, 0.3), transparent 70%),
			radial-gradient(16% 40% at 64% 50%, rgba(255, 217, 138, 0.3), transparent 70%);
	}

	@keyframes breathe {
		50% {
			opacity: 0.6;
		}
	}

	@container (max-width: 220px) {
		.brand small,
		.score {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.shaft {
			animation: none;
		}
	}
</style>
