<script lang="ts">
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
			radial-gradient(40% 30% at 72% 14%, rgba(255, 253, 240, 0.95), transparent 70%),
			radial-gradient(30% 10% at 20% 18%, rgba(255, 255, 255, 0.5), transparent 70%),
			radial-gradient(36% 9% at 88% 30%, rgba(255, 255, 255, 0.4), transparent 70%),
			linear-gradient(180deg, #86aecb 0%, #a9c6d8 26%, #d8dfdc 50%, #e9e0cf 64%, #d7cbb8 100%);
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
		left: 72%;
		top: 2%;
		width: 26%;
		aspect-ratio: 1;
		translate: -50% 0;
		background: repeating-conic-gradient(rgba(255, 253, 240, 0.22) 0 4deg, transparent 4deg 18deg);
		border-radius: 50%;
		-webkit-mask-image: radial-gradient(circle, #000 20%, transparent 70%);
		mask-image: radial-gradient(circle, #000 20%, transparent 70%);
	}

	.sun b {
		position: absolute;
		inset: 18%;
		border-radius: 50%;
		inset: 36%;
		background: radial-gradient(circle at 40% 36%, #ffffff, #fff6d8);
		box-shadow: 0 0 24px 8px rgba(255, 252, 240, 0.9);
	}

	.tree {
		bottom: 18%;
		width: 5%;
		height: 46%;
		background: linear-gradient(180deg, #4a6a5a, #2a4438);
		clip-path: polygon(50% 0, 78% 40%, 88% 100%, 12% 100%, 22% 40%);
	}

	.tree.a {
		left: 7%;
	}

	.tree.b {
		right: 6%;
		height: 52%;
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

	.slab {
		position: absolute;
		left: 50%;
		top: 50%;
		height: 78%;
		width: auto;
		aspect-ratio: 1;
		translate: -50% -50%;
		padding: 3.6%;
		border-radius: 3.5cqh;
		background: linear-gradient(180deg, #4e4440, #2e2724);
		box-sizing: border-box;
		z-index: 1;
		box-shadow:
			inset 0 0 0 1px rgba(255, 255, 255, 0.12),
			inset 0 0 0 0.9cqh rgba(0, 0, 0, 0.18),
			0 12px 24px rgba(42, 34, 28, 0.32);
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
		background:
			url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Cpath d='M0 13 L9 11 L15 16 L24 12 M15 16 L13 27 L4 31 M13 27 L22 30 L28 40 M24 12 L31 4 M24 12 L33 19 L40 17 M33 19 L30 30 L22 30' fill='none' stroke='%237a6e62' stroke-opacity='0.35' stroke-width='0.7'/%3E%3C/svg%3E") center / 100% 100%,
			linear-gradient(145deg, #fdfbf7, #f1ece3 58%, #e2dbd0);
	}



	.cell.dark {
		background:
			linear-gradient(#262120, #262120) center / 74% 74% no-repeat,
			linear-gradient(rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.07)) center / 80% 80% no-repeat,
			linear-gradient(160deg, #3a342f, #2a2421 62%, #1e1a17);
	}

	.cell i {
		width: 74%;
		aspect-ratio: 1;
		height: auto;
		border-radius: 50%;
		display: block;
	}

	.ember {
		background:
			radial-gradient(circle at 50% 50%, rgba(255, 214, 218, 0.85) 0 15%, transparent 30%),
			radial-gradient(circle at 42% 36%, #e45a68, #b82a3a 45%, #7a1420 85%);
		box-shadow:
			inset 0 0 0 1px rgba(255, 200, 205, 0.3),
			0 2px 3px rgba(0, 0, 0, 0.45);
	}

	.bone {
		background:
			radial-gradient(circle at 50% 50%, transparent 0 33%, rgba(160, 156, 146, 0.55) 35%, transparent 39%),
			radial-gradient(circle at 36% 30%, #ffffff, #f7f4ee 46%, #e6e0d4 80%, #c8c2b6);
		box-shadow:
			inset 0 0 0 1px rgba(255, 255, 255, 0.6),
			0 2px 3px rgba(0, 0, 0, 0.4);
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

	@media (prefers-reduced-motion: reduce) {
		.line span,
		.stack em {
			animation: none;
		}
	}
</style>
