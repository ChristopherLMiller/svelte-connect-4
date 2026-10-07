<script lang="ts">
	import TttMark from './components/TttMark.svelte';
	import { scratchGrid } from './scratch';
	import type { Cell } from './types';

	const SNAPSHOT: Cell[][] = [
		[1, 0, 2],
		[0, 1, 2],
		[1, 0, 0]
	];

	const LINES = scratchGrid(814229);
	const SEEDS = [41, 0, 88, 0, 17, 203, 64, 0, 0];
	const FRONDS = [12, 34, 58, 80].map((deg) => {
		const a = (deg * Math.PI) / 180;
		const [dx, dy] = [Math.cos(a), Math.sin(a)];
		const [nx, ny] = [-dy, dx];
		const at = (t: number) => [dx * t * 96 + nx * t * t * 14, dy * t * 96 + ny * t * t * 14];
		let d = `M0 0 Q ${at(0.5).join(' ')} ${at(1).join(' ')}`;
		for (let t = 0.12; t < 0.96; t += 0.06) {
			const [x, y] = at(t);
			const len = 22 * (1 - t * 0.7);
			for (const side of [1, -1]) {
				d += ` M${x} ${y} l${(nx * side * 0.9 + dx * 0.5) * len} ${(ny * side * 0.9 + dy * 0.5) * len}`;
			}
		}
		return d;
	});
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,600&family=Nunito:wght@400;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="shot" aria-hidden="true">
	<div class="glare"></div>
	<svg class="frond left" viewBox="0 0 100 100">
		{#each FRONDS as d, i (i)}
			<path {d} />
		{/each}
	</svg>
	<svg class="frond right" viewBox="0 0 100 100">
		{#each FRONDS as d, i (i)}
			<path {d} />
		{/each}
	</svg>
	<div class="gull a"></div>
	<div class="gull b"></div>
	<div class="wood"></div>
	<div class="shell a"></div>
	<div class="shell b"></div>
	<div class="print a"></div>
	<div class="print b"></div>
	<div class="grid">
		<svg class="grooves" viewBox="0 0 300 300">
			<g class="ridge">
				{#each LINES as d (`r-${d.slice(0, 22)}`)}
					<path {d} />
				{/each}
			</g>
			<g class="trough">
				{#each LINES as d (`t-${d.slice(0, 22)}`)}
					<path {d} />
				{/each}
			</g>
			<g class="wet">
				{#each LINES as d (`w-${d.slice(0, 22)}`)}
					<path {d} />
				{/each}
			</g>
		</svg>
		{#each SNAPSHOT as row, r (r)}
			{#each row as cell, c (`${r}-${c}`)}
				<span class="cell">
					{#if cell !== 0}
						<TttMark player={cell === 2 ? 2 : 1} seed={SEEDS[r * 3 + c]} />
					{/if}
				</span>
			{/each}
		{/each}
	</div>
	<div class="sea">
		<div class="swell"></div>
		<div class="foam"></div>
	</div>
</div>

<style>
	.shot {
		position: relative;
		height: 100%;
		overflow: hidden;
		container-type: size;
		background:
			radial-gradient(900px 420px at 38% 18%, rgba(255, 244, 220, 0.42), transparent 58%),
			radial-gradient(420px 280px at 92% 28%, rgba(176, 122, 78, 0.28), transparent 50%),
			linear-gradient(180deg, #d9b887 0%, #c19a72 48%, #a97b58 78%, #8d6248 100%);
	}

	.glare {
		position: absolute;
		inset: 0;
		background: radial-gradient(ellipse at 36% 28%, rgba(255, 240, 210, 0.28), transparent 48%);
		pointer-events: none;
	}

	.gull,
	.wood,
	.shell,
	.print {
		position: absolute;
		pointer-events: none;
	}

	.gull {
		width: 14px;
		height: 6px;
		border: 1.4px solid rgba(90, 64, 42, 0.45);
		border-bottom: 0;
		border-radius: 14px 14px 0 0;
		opacity: 0.55;
	}

	.gull.a {
		left: 12%;
		top: 16%;
		rotate: -12deg;
		animation: drift 7s ease-in-out infinite;
	}

	.gull.b {
		right: 14%;
		top: 12%;
		width: 11px;
		rotate: 18deg;
		animation: drift 9s ease-in-out infinite reverse;
	}

	.wood {
		left: 6%;
		bottom: 28%;
		width: 18%;
		height: 4px;
		border-radius: 4px;
		background: linear-gradient(90deg, #6a4228, #c49a6a);
		rotate: -18deg;
		opacity: 0.7;
	}

	.shell {
		width: 10px;
		height: 8px;
		border-radius: 70% 70% 40% 40%;
		background: radial-gradient(circle at 40% 30%, #f4e4cc, #c49a72);
		opacity: 0.8;
	}

	.shell.a {
		left: 10%;
		bottom: 36%;
		rotate: -20deg;
	}

	.shell.b {
		right: 8%;
		bottom: 40%;
		rotate: 30deg;
	}

	.print {
		width: 9px;
		height: 6px;
		border: 1px solid rgba(90, 64, 42, 0.28);
		border-radius: 50%;
		opacity: 0.45;
	}

	.print.a {
		left: 22%;
		bottom: 34%;
	}

	.print.b {
		left: 28%;
		bottom: 31%;
	}

	.frond {
		position: absolute;
		top: -4%;
		width: 34cqh;
		height: 34cqh;
		overflow: visible;
		pointer-events: none;
		opacity: 0.22;
		animation: sway 6s ease-in-out infinite;
	}

	.frond path {
		fill: none;
		stroke: #4a3220;
		stroke-width: 2.4;
		stroke-linecap: round;
	}

	.frond.left {
		left: -2%;
		transform-origin: 0 0;
	}

	.frond.right {
		right: -2%;
		scale: -1 1;
		animation-delay: -2.4s;
	}

	.grid {
		position: absolute;
		left: 50%;
		top: 10%;
		height: 58%;
		width: auto;
		aspect-ratio: 1;
		translate: -50% 0;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		grid-template-rows: repeat(3, 1fr);
		z-index: 1;
	}

	.grooves {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		overflow: visible;
		pointer-events: none;
	}

	.grooves path {
		fill: none;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.ridge {
		transform: translate(0.6px, -0.8px);
	}

	.ridge path {
		stroke: #e8d4b4;
		stroke-width: 8.2;
		opacity: 0.42;
	}

	.trough path {
		stroke: #7a4f36;
		stroke-width: 5.2;
		opacity: 0.86;
	}

	.wet path {
		stroke: #5c3a28;
		stroke-width: 2;
		opacity: 0.45;
	}

	.cell {
		display: grid;
		place-items: center;
	}

	.sea {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 24%;
		overflow: hidden;
		background:
			repeating-radial-gradient(ellipse 18% 9% at 30% 60%, transparent 0 40%, rgba(230, 255, 255, 0.22) 46%, transparent 52%),
			repeating-radial-gradient(ellipse 14% 8% at 74% 40%, transparent 0 40%, rgba(230, 255, 255, 0.18) 46%, transparent 52%),
			linear-gradient(180deg, transparent 0%, rgba(120, 200, 210, 0.45) 18%, #5cb0c2 42%, #3e93ab 72%, #6cb6c8 100%);
		-webkit-mask-image: linear-gradient(180deg, transparent 0%, #000 28%, #000 100%);
		mask-image: linear-gradient(180deg, transparent 0%, #000 28%, #000 100%);
		z-index: 1;
	}

	.swell {
		position: absolute;
		left: -14%;
		right: -14%;
		top: -10%;
		height: 62%;
		border-radius: 50%;
		background: linear-gradient(180deg, rgba(214, 246, 250, 0.35), #2b8aa3);
		animation: swell 5.4s ease-in-out infinite;
	}

	.foam {
		position: absolute;
		left: 0;
		right: 0;
		top: 10%;
		height: 14px;
		background:
			radial-gradient(12px 8px at 18% 50%, rgba(255, 255, 255, 0.45), transparent 70%),
			radial-gradient(16px 8px at 52% 40%, rgba(255, 255, 255, 0.35), transparent 70%),
			radial-gradient(12px 8px at 82% 60%, rgba(255, 255, 255, 0.4), transparent 70%);
		opacity: 0.65;
	}

	@keyframes sway {
		50% {
			rotate: 3deg;
		}
	}

	@keyframes drift {
		50% {
			translate: 8px -6px;
		}
	}

	@keyframes swell {
		50% {
			translate: 0 8%;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.gull,
		.frond,
		.swell {
			animation: none;
		}
	}
</style>
