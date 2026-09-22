<script lang="ts">
	import AshIcon from './components/AshIcon.svelte';
	import { playable } from './types';

	const cells = Array.from({ length: 64 }, (_, i) => {
		const r = Math.floor(i / 8);
		const c = i % 8;
		const dark = playable(r, c);
		const side = dark ? (r < 3 ? 2 : r > 4 ? 1 : 0) : 0;
		return { i, r, c, dark, side };
	});
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,700&family=Outfit:wght@400;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="shot" aria-hidden="true">
	<div class="sky"></div>
	<div class="sun"><b></b></div>
	<div class="tree a"></div>
	<div class="tree b"></div>
	<div class="wall w"></div>
	<div class="wall e"></div>
	<div class="line">
		<span></span>
		<span></span>
		<span></span>
	</div>
	<div class="stack">
		<i></i>
		<em></em>
	</div>
	<div class="floor"></div>
	<div class="hud">
		<div class="brand">
			<AshIcon size="chip" />
			<div>
				<p>Ashcourt</p>
				<small>raku draughts</small>
			</div>
		</div>
		<div class="call"><b>Ember to hop</b></div>
		<div class="score">You <em>0</em> · Yard <em>0</em></div>
	</div>
	<div class="slab">
		<div class="grid">
			{#each cells as cell (cell.i)}
				<span class={['cell', cell.dark ? 'dark' : 'light']}>
					{#if cell.side === 1}
						<i class="ember"></i>
					{:else if cell.side === 2}
						<i class="bone"></i>
					{/if}
				</span>
			{/each}
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
			radial-gradient(720px 280px at 70% -8%, #fffdf6, transparent 55%),
			linear-gradient(180deg, #e7eef0 0%, #efe6d6 48%, #d7cbb8 100%);
		font-family: Outfit, ui-sans-serif, system-ui, sans-serif;
	}

	.sky,
	.sun,
	.tree,
	.wall,
	.line,
	.stack,
	.floor {
		position: absolute;
		pointer-events: none;
	}

	.sun {
		left: 50%;
		top: 4%;
		width: 22%;
		aspect-ratio: 1;
		translate: -50% 0;
	}

	.sun b {
		position: absolute;
		inset: 18%;
		border-radius: 50%;
		background: radial-gradient(circle at 40% 36%, #fffdf6, #f4e4b8);
		box-shadow: 0 0 24px rgba(255, 252, 240, 0.85);
	}

	.tree {
		bottom: 18%;
		width: 7%;
		height: 28%;
		background: linear-gradient(180deg, #3d6b5c, #2a4a40);
		clip-path: polygon(50% 0, 86% 100%, 14% 100%);
	}

	.tree.a {
		left: 4%;
		height: 34%;
	}

	.tree.b {
		right: 2%;
		height: 22%;
		opacity: 0.7;
	}

	.wall {
		bottom: 16%;
		width: 18%;
		height: 28%;
		background: linear-gradient(180deg, #f4efe6, #d8ccbc);
		box-shadow: inset 0 0 0 1px rgba(90, 64, 42, 0.12);
	}

	.wall.w {
		left: 10%;
		border-radius: 4px 10px 0 0;
	}

	.wall.e {
		right: 3%;
		height: 20%;
		width: 12%;
		border-radius: 8px 4px 0 0;
	}

	.line {
		left: 8%;
		bottom: 34%;
		display: flex;
		gap: 4px;
		width: 16%;
		height: 10%;
	}

	.line span {
		flex: 1;
		background: linear-gradient(180deg, #fbf8f2, #e8dcc8);
		border: 1px solid rgba(158, 27, 42, 0.12);
		transform-origin: 50% 0;
		animation: linen 4.8s ease-in-out infinite;
	}

	.line span:nth-child(2) {
		animation-delay: -1.4s;
	}

	.stack {
		right: 14%;
		bottom: 30%;
		width: 5%;
		height: 18%;
	}

	.stack i {
		position: absolute;
		inset: 30% 20% 0;
		background: #5a5048;
		border-radius: 2px 2px 0 0;
	}

	.stack em {
		position: absolute;
		left: 30%;
		right: 30%;
		bottom: 70%;
		height: 70%;
		border-radius: 50%;
		background: rgba(180, 180, 180, 0.35);
		animation: smoke 3.6s ease-in-out infinite;
	}

	.floor {
		left: 0;
		right: 0;
		bottom: 0;
		height: 18%;
		background:
			repeating-linear-gradient(90deg, rgba(90, 70, 50, 0.08) 0 8px, transparent 8px 16px),
			linear-gradient(180deg, #d2c4ae, #c2b49a);
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
		border: 1px solid rgba(158, 27, 42, 0.22);
		background: rgba(255, 250, 242, 0.82);
		border-radius: 10px;
		padding: 4px 7px;
		color: #2a221c;
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
		flex-shrink: 0;
	}

	.brand p {
		margin: 0;
		font-family: 'Cormorant Garamond', Palatino, serif;
		font-style: italic;
		font-size: 0.64rem;
		line-height: 1;
		white-space: nowrap;
	}

	.brand small,
	.score {
		letter-spacing: 0.08em;
		text-transform: uppercase;
		font-size: 0.38rem;
		display: flex;
		align-items: center;
	}

	.call {
		display: grid;
		place-items: center;
	}

	.call b {
		font-family: 'Cormorant Garamond', Palatino, serif;
		font-style: italic;
		font-size: clamp(0.5rem, 3.4cqw, 0.78rem);
		white-space: nowrap;
	}

	.score em {
		font-style: normal;
		font-weight: 700;
		color: #9e1b2a;
		margin: 0 2px;
	}

	.slab {
		position: absolute;
		left: 50%;
		top: 24%;
		height: 62%;
		width: auto;
		aspect-ratio: 1;
		translate: -50% 0;
		padding: 5%;
		border-radius: 12px;
		background: linear-gradient(180deg, #5a5048, #2a2420);
		box-sizing: border-box;
		z-index: 1;
		box-shadow: 0 12px 24px rgba(42, 34, 28, 0.28);
	}

	.grid {
		display: grid;
		width: 100%;
		height: 100%;
		grid-template-columns: repeat(8, 1fr);
		grid-template-rows: repeat(8, 1fr);
		border-radius: 4px;
		overflow: hidden;
	}

	.cell {
		display: grid;
		place-items: center;
		background: linear-gradient(145deg, #fbf8f2, #ece4d6 58%, #d8ccbc);
	}

	.cell.dark {
		background: linear-gradient(160deg, #3a342e, #2a2420 62%, #1c1814);
	}

	.cell i {
		width: 68%;
		aspect-ratio: 1;
		height: auto;
		border-radius: 50%;
		display: block;
	}

	.ember {
		background: radial-gradient(circle at 32% 26%, #f8d4d6, #c43b4a 28%, #9e1b2a 62%, #4a1018);
		box-shadow: inset 0 2px 0 rgba(255, 230, 230, 0.45);
	}

	.bone {
		background: radial-gradient(circle at 34% 26%, #ffffff, #f7f4ee 42%, #e6e0d4 78%, #b7c9be);
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.55);
	}

	@keyframes linen {
		50% {
			rotate: 6deg;
		}
	}

	@keyframes smoke {
		0%,
		100% {
			opacity: 0.2;
			translate: 0 0;
			scale: 1;
		}
		50% {
			opacity: 0.55;
			translate: 20% -30%;
			scale: 1.35;
		}
	}

	@container (max-width: 220px) {
		.brand small,
		.score {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.line span,
		.stack em {
			animation: none;
		}
	}
</style>
