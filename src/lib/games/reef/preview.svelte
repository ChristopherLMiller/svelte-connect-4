<script lang="ts">
	import { createGame } from './engine';
	import { WellRenderer } from './render';
	import { COLS, HIDDEN, I, J, L, O, S, T, Z, type Kind } from './types';

	const KIND: Record<string, Kind> = { i: I, o: O, t: T, s: S, z: Z, j: J, l: L };
	const MAP = [
		'..........',
		'..........',
		'..........',
		'..........',
		'..........',
		'..........',
		'..........',
		'..........',
		'..........',
		'..........',
		'..........',
		'..........',
		'..........',
		'l.........',
		'l.oo.....j',
		'llooss..jj',
		'zzjss.iiii',
		'jzzjjjllol',
		'izztlllool',
		'ozzttjjj.l'
	];

	function staged() {
		const game = createGame('marathon', 1);
		game.board.fill(0);
		MAP.forEach((line, r) => {
			for (let c = 0; c < COLS; c += 1) {
				const kind = KIND[line[c]!];
				if (kind) game.board[(r + HIDDEN) * COLS + c] = kind;
			}
		});
		game.piece = { kind: T, rot: 2, x: 4, y: HIDDEN + 3 };
		game.clearing = null;
		return game;
	}

	const GAME = staged();

	function well(canvas: HTMLCanvasElement) {
		const renderer = new WellRenderer(canvas);
		const paint = () => {
			const w = canvas.clientWidth;
			if (!w) return;
			renderer.resize(w, canvas.clientHeight);
			renderer.draw(GAME, 0, { ghost: true, motion: false, active: true });
		};
		const observer = new ResizeObserver(paint);
		observer.observe(canvas);
		paint();
		return () => observer.disconnect();
	}

	const specks = Array.from({ length: 22 }, (_, i) => ({
		i,
		x: (i * 37 + 7) % 100,
		y: 55 + ((i * 23) % 45),
		c: ['#3fe9ff', '#ff4fd8', '#4dff8f', '#ffd34d', '#5f7dff'][i % 5]!,
		d: (i * 0.37) % 3
	}));
	const kelp = [4, 9, 14, 82, 88, 94];
</script>

<div class="shot" aria-hidden="true">
	<i class="ribbon a"></i>
	<i class="ribbon b"></i>
	{#each kelp as x, i (x)}
		<i class="kelp" style:left="{x}%" style:--h="{22 + (i % 3) * 9}%" style:--d="{i * -0.8}s"></i>
	{/each}
	{#each specks as speck (speck.i)}
		<i class="speck" style:left="{speck.x}%" style:top="{speck.y}%" style:--c={speck.c} style:--d="{speck.d}s"></i>
	{/each}
	<div class="jelly">
		<b></b>
		<span></span>
		<span></span>
		<span></span>
	</div>
	<div class="basin">
		<div class="well">
			<canvas {@attach well}></canvas>
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
			radial-gradient(60% 40% at 50% 0%, rgba(40, 120, 170, 0.28), transparent 70%),
			radial-gradient(50% 30% at 50% 100%, rgba(20, 60, 50, 0.4), transparent 70%),
			linear-gradient(180deg, #0a2236 0%, #061524 50%, #030a12 100%);
	}

	.ribbon {
		position: absolute;
		left: -10%;
		right: -10%;
		height: 1px;
		background: linear-gradient(90deg, transparent, rgba(120, 200, 255, 0.35), transparent);
		rotate: -6deg;
	}

	.ribbon.a {
		top: 30%;
	}

	.ribbon.b {
		top: 62%;
		rotate: 8deg;
		background: linear-gradient(90deg, transparent, rgba(255, 79, 216, 0.25), transparent);
	}

	.kelp {
		position: absolute;
		bottom: 0;
		width: 1.2%;
		height: var(--h);
		border-radius: 50% 50% 0 0;
		background: linear-gradient(180deg, rgba(77, 255, 143, 0.5), rgba(20, 90, 60, 0.25) 40%, transparent);
		transform-origin: 50% 100%;
		animation: sway 5s ease-in-out infinite;
		animation-delay: var(--d);
	}

	.speck {
		position: absolute;
		width: 2px;
		height: 2px;
		border-radius: 50%;
		background: var(--c);
		box-shadow: 0 0 4px var(--c);
		opacity: 0.7;
		animation: blink 3s ease-in-out infinite;
		animation-delay: var(--d);
	}

	.jelly {
		position: absolute;
		left: 12%;
		top: 52%;
		width: 13cqh;
		animation: bob 7s ease-in-out infinite;
	}

	.jelly b {
		display: block;
		height: 6cqh;
		border-radius: 50% 50% 18% 18% / 90% 90% 18% 18%;
		background: radial-gradient(120% 100% at 50% 100%, rgba(130, 110, 230, 0.15), rgba(150, 130, 255, 0.4));
		box-shadow: inset 0 1px 0 rgba(200, 190, 255, 0.5);
	}

	.jelly span {
		position: absolute;
		top: 5.5cqh;
		width: 1.4cqh;
		height: 9cqh;
		border-left: 1px solid rgba(160, 140, 255, 0.4);
		border-radius: 50%;
	}

	.jelly span:nth-of-type(1) {
		left: 22%;
	}

	.jelly span:nth-of-type(2) {
		left: 45%;
		scale: -1 1;
	}

	.jelly span:nth-of-type(3) {
		left: 66%;
	}

	.basin {
		position: absolute;
		left: 50%;
		top: 50%;
		height: 92%;
		aspect-ratio: 10.6 / 20.6;
		translate: -50% -50%;
		padding: 1.5cqh;
		box-sizing: border-box;
		border-radius: 2.4cqh;
		background:
			radial-gradient(120% 60% at 50% 0%, rgba(63, 233, 255, 0.08), transparent 60%),
			linear-gradient(180deg, #13202c, #0a121b 60%, #070c12);
		box-shadow:
			inset 0 1px 0 rgba(160, 240, 255, 0.12),
			inset 0 0 0 1px rgba(160, 240, 255, 0.06),
			0 0 40px rgba(63, 233, 255, 0.08),
			0 12px 30px rgba(0, 0, 0, 0.6);
	}

	.well {
		height: 100%;
		border-radius: 1cqh;
		overflow: hidden;
		background:
			linear-gradient(180deg, rgba(2, 14, 28, 0.55), rgba(1, 6, 14, 0.78)),
			repeating-linear-gradient(0deg, rgba(120, 200, 255, 0.03) 0 1px, transparent 1px 5%);
		box-shadow:
			inset 0 0 0 1px rgba(0, 0, 0, 0.6),
			inset 0 0 6cqh rgba(0, 0, 0, 0.6);
	}

	canvas {
		display: block;
		width: 100%;
		height: 100%;
	}

	@keyframes sway {
		50% {
			rotate: 5deg;
		}
	}

	@keyframes blink {
		50% {
			opacity: 0.2;
		}
	}

	@keyframes bob {
		50% {
			translate: 3% -10%;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.kelp,
		.speck,
		.jelly {
			animation: none;
		}
	}
</style>
