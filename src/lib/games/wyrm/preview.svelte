<script lang="ts">
	import { COLS, ROWS } from './types';

	const uid = $props.id();
	const CELL = 20;
	const W = COLS * CELL;
	const H = ROWS * CELL;
	const BODY = [
		[2, 10], [3, 10], [4, 10], [5, 10], [6, 10], [7, 10], [7, 9], [7, 8], [7, 7], [8, 7], [9, 7], [10, 7],
		[10, 8], [10, 9], [11, 9], [12, 9], [13, 9], [13, 8], [13, 7], [13, 6], [13, 5], [12, 5], [11, 5]
	] as const;
	const PATH = `M ${BODY.map(([x, y]) => `${x * CELL + CELL / 2},${y * CELL + CELL / 2}`).join(' L ')}`;
	const HEAD = { x: 11 * CELL + CELL / 2, y: 5 * CELL + CELL / 2 };
	const FOOD = { x: 5, y: 4 };
	const CORD = 'M0 7 Q 12.5 12.5 25 7 T 50 7 T 75 7 T 100 7';
	const lamps = [8, 20, 32, 44, 56, 68, 80, 92];
	const stalls = [
		{ id: 'tea', left: 2, sign: 'Tea', hue: '#f0c45c' },
		{ id: 'silk', left: 36, sign: 'Silk', hue: '#e24a3d' },
		{ id: 'lamps', left: 70, sign: 'Lamps', hue: '#5ab496' }
	];
	const stars = Array.from({ length: 18 }, (_, i) => ({
		i,
		x: (i * 37 + 11) % 100,
		y: (i * 17 + 6) % 38,
		s: 0.4 + (i % 5) * 0.18
	}));
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600&family=Figtree:wght@400;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="shot" aria-hidden="true">
	<div class="sky"></div>
	{#each stars as star (star.i)}
		<i class="star" style:left="{star.x}%" style:top="{star.y}%" style:--s={star.s}></i>
	{/each}
	<div class="moon">
		<b></b>
		<i class="crater"></i>
	</div>
	<div class="cord">
		<svg viewBox="0 0 100 14" preserveAspectRatio="none">
			<path d={CORD} fill="none" stroke="rgba(40, 24, 16, 0.55)" stroke-width="1.1" />
			<path d={CORD} fill="none" stroke="rgba(240,196,92,0.7)" stroke-width="0.45" />
		</svg>
		{#each lamps as x, i (`f${i}`)}
			<span class="festoon" style:left="{x}%">
				<em></em>
				<b></b>
			</span>
		{/each}
	</div>
	<div class="market">
		{#each stalls as stall (stall.id)}
			<div class="stall" style:left="{stall.left}%" style:--hue={stall.hue}>
				<span class="roof"></span>
				<span class="sign">{stall.sign}</span>
			</div>
		{/each}
	</div>
	<div class="well">
		<div class="frame">
			<i class="vine top"></i>
			<i class="vine bottom"></i>
			<i class="corner tl"></i>
			<i class="corner tr"></i>
			<i class="corner bl"></i>
			<i class="corner br"></i>
			<span class="peg tl"><b></b></span>
			<span class="peg tr"><b></b></span>
			<span class="peg bl"><b></b></span>
			<span class="peg br"><b></b></span>
			<div class="play">
				<svg class="board" viewBox="0 0 {W} {H}">
					<defs>
						<linearGradient id="{uid}-silk" x1="0" y1="0" x2={W} y2={H} gradientUnits="userSpaceOnUse">
							<stop offset="0" stop-color="#fff6d2" />
							<stop offset="0.35" stop-color="#f0c45c" />
							<stop offset="0.78" stop-color="#e24a3d" />
							<stop offset="1" stop-color="#8a1820" />
						</linearGradient>
						<pattern id="{uid}-paper" width={CELL} height={CELL} patternUnits="userSpaceOnUse">
							<rect width={CELL} height={CELL} fill="rgba(240, 196, 92, 0.04)" />
							<path d="M {CELL} 0 L 0 0 0 {CELL}" fill="none" stroke="rgba(240, 196, 92, 0.11)" stroke-width="1" />
						</pattern>
					</defs>
					<rect width={W} height={H} fill="url(#{uid}-paper)" />
					<path d={PATH} fill="none" stroke="#140c16" stroke-width="16.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.45" />
					<path d={PATH} fill="none" stroke="url(#{uid}-silk)" stroke-width="13.8" stroke-linecap="round" stroke-linejoin="round" />
					<path d={PATH} fill="none" stroke="#fff6d8" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.38" />
					<path
						class="scales"
						d={PATH}
						fill="none"
						stroke="rgba(26, 18, 48, 0.28)"
						stroke-width="2.2"
						stroke-linecap="round"
						stroke-dasharray="4 10"
					/>
					<g transform="translate({HEAD.x} {HEAD.y}) rotate(180)">
						<ellipse rx="13" ry="10" fill="rgba(255, 241, 196, 0.34)" />
						<path d="M 7 0 Q 16 -7 22 -11" fill="none" stroke="#fff1c4" stroke-width="0.9" />
						<path d="M 7 2 Q 16 9 22 12" fill="none" stroke="#fff1c4" stroke-width="0.9" />
						<path d="M -9 -1 Q -15 -8 -7 -11 Q -4 -4 0 -3 Z" fill="#e24a3d" />
						<ellipse cx="1" cy="0" rx="8.1" ry="6.5" fill="#fff1c4" />
						<ellipse cx="8.1" cy="1.1" rx="4.4" ry="3.4" fill="#ffe7b0" />
						<path d="M 0 -6 L 2.6 -13.2 L 4.6 -5.8 Z" fill="#e24a3d" />
						<ellipse cx="5.2" cy="-1.7" rx="1.45" ry="1.65" fill="#1a1230" />
						<ellipse cx="8.6" cy="-1.4" rx="1.2" ry="1.4" fill="#1a1230" />
						<circle cx="5.6" cy="-2.15" r="0.42" fill="#fff" />
						<circle cx="9" cy="-1.85" r="0.38" fill="#fff" />
					</g>
				</svg>
				<div class="lamp" style:left="{((FOOD.x + 0.5) / COLS) * 100}%" style:top="{((FOOD.y + 0.5) / ROWS) * 100}%">
					<i class="glow"></i>
					<em class="string"></em>
					<span class="paper">
						<b class="crown"></b>
						<b class="bulb"></b>
						<i class="tail"></i>
					</span>
				</div>
			</div>
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
			radial-gradient(900px 420px at 50% -10%, rgba(240, 196, 92, 0.2), transparent 58%),
			radial-gradient(280px 180px at 88% 10%, rgba(255, 236, 190, 0.16), transparent 50%),
			linear-gradient(180deg, #12102c 0%, #0a0e22 46%, #160c1c 100%);
		color: #f7ead2;
		font-family: Figtree, ui-sans-serif, system-ui, sans-serif;
	}

	.sky,
	.star,
	.moon,
	.cord,
	.market {
		position: absolute;
		pointer-events: none;
	}

	.star {
		width: 2px;
		height: 2px;
		border-radius: 50%;
		background: #fff6d8;
		opacity: 0.5;
		scale: var(--s);
		box-shadow: 0 0 5px rgba(255, 246, 216, 0.7);
	}

	.moon {
		top: 7%;
		right: 7%;
		width: 16px;
		height: 16px;
	}

	.moon b {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		background: radial-gradient(circle at 34% 32%, #fff8e4, #f0c45c 62%, #c4892a);
		box-shadow: 0 0 14px rgba(240, 196, 92, 0.5);
	}

	.moon .crater {
		position: absolute;
		left: 55%;
		top: 42%;
		width: 4px;
		height: 3px;
		border-radius: 50%;
		background: rgba(160, 110, 40, 0.35);
	}

	.cord {
		left: 4%;
		right: 4%;
		top: 3%;
		height: 22px;
		z-index: 3;
	}

	.cord svg {
		width: 100%;
		height: 100%;
		overflow: visible;
	}

	.festoon {
		position: absolute;
		top: 40%;
		width: 9px;
		translate: -50% 0;
	}

	.festoon em {
		display: block;
		width: 1px;
		height: 6px;
		margin: 0 auto;
		background: rgba(40, 24, 16, 0.55);
	}

	.festoon b {
		display: block;
		width: 9px;
		height: 12px;
		border-radius: 40% 40% 36% 36%;
		background: radial-gradient(circle at 35% 30%, #fff4c8, #f0c45c 58%, #e24a3d);
		box-shadow: 0 0 10px #f0c45c;
		animation: wiggle 2.8s ease-in-out infinite;
	}

	.festoon:nth-child(odd) b {
		animation-delay: -1.1s;
		background: radial-gradient(circle at 35% 30%, #ffd4c8, #e24a3d 62%, #8a1820);
	}

	.market {
		left: 0;
		right: 0;
		bottom: 0;
		height: 26%;
		z-index: 1;
	}

	.stall {
		position: absolute;
		bottom: 0;
		width: 28%;
		height: 100%;
	}

	.roof {
		position: absolute;
		left: 4%;
		right: 4%;
		top: 0;
		height: 38%;
		background: linear-gradient(180deg, color-mix(in srgb, var(--hue) 80%, #140c16), #140c16);
		clip-path: polygon(8% 100%, 50% 0, 92% 100%);
	}

	.sign {
		position: absolute;
		left: 18%;
		right: 18%;
		bottom: 8%;
		text-align: center;
		font-family: Cinzel, Palatino, serif;
		font-size: 0.42rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--hue);
		opacity: 0.85;
	}

	.well {
		position: absolute;
		inset: 12% 6% 6%;
		z-index: 2;
		display: grid;
		place-items: center;
	}

	.frame {
		position: relative;
		height: 100%;
		max-width: 100%;
		aspect-ratio: 18 / 14;
		padding: 3.2cqh;
		box-sizing: border-box;
		border-radius: 3.6cqh;
		background:
			linear-gradient(180deg, rgba(240, 196, 92, 0.2), rgba(18, 12, 28, 0.28)),
			repeating-linear-gradient(135deg, rgba(240, 196, 92, 0.08) 0 1.4cqh, transparent 1.4cqh 2.8cqh),
			rgba(10, 8, 22, 0.94);
		border: 1px solid rgba(240, 196, 92, 0.38);
		box-shadow:
			inset 0 1px 0 rgba(255, 244, 210, 0.2),
			0 2.4cqh 5cqh rgba(0, 0, 0, 0.32);
	}

	.vine {
		position: absolute;
		left: 4cqh;
		right: 4cqh;
		height: 2px;
		background: linear-gradient(90deg, transparent, #f0c45c 12%, #e24a3d 50%, #f0c45c 88%, transparent);
		opacity: 0.55;
	}

	.vine.top {
		top: 1.8cqh;
	}

	.vine.bottom {
		bottom: 1.8cqh;
	}

	.corner {
		position: absolute;
		width: 3cqh;
		height: 3cqh;
		border: 1.5px solid #f0c45c;
	}

	.corner.tl {
		top: 1.3cqh;
		left: 1.3cqh;
		border-right: 0;
		border-bottom: 0;
	}

	.corner.tr {
		top: 1.3cqh;
		right: 1.3cqh;
		border-left: 0;
		border-bottom: 0;
	}

	.corner.bl {
		bottom: 1.3cqh;
		left: 1.3cqh;
		border-right: 0;
		border-top: 0;
	}

	.corner.br {
		bottom: 1.3cqh;
		right: 1.3cqh;
		border-left: 0;
		border-top: 0;
	}

	.peg {
		position: absolute;
		z-index: 1;
		width: 1.8cqh;
		animation: wiggle 2.8s ease-in-out infinite;
	}

	.peg.tl {
		top: 0;
		left: 5cqh;
	}

	.peg.tr {
		top: 0;
		right: 5cqh;
		animation-delay: -0.8s;
	}

	.peg.bl {
		bottom: 0.4cqh;
		left: 5cqh;
		animation-delay: -1.4s;
	}

	.peg.br {
		bottom: 0.4cqh;
		right: 5cqh;
		animation-delay: -2s;
	}

	.peg b {
		display: block;
		width: 1.6cqh;
		height: 2.1cqh;
		margin: 1cqh auto 0;
		border-radius: 40% 40% 36% 36%;
		background: radial-gradient(circle at 35% 30%, #fff4c8, #f0c45c 58%, #e24a3d);
		box-shadow: 0 0 1.6cqh #f0c45c;
	}

	.play {
		position: relative;
		height: 100%;
	}

	.board {
		display: block;
		width: 100%;
		height: 100%;
		border-radius: 2cqh;
		background:
			radial-gradient(ellipse at 50% 0%, rgba(240, 196, 92, 0.12), transparent 46%),
			linear-gradient(180deg, rgba(40, 28, 52, 0.65), rgba(12, 10, 24, 0.92));
	}

	.lamp {
		position: absolute;
		width: calc(100% / 18 * 1.9);
		height: calc(100% / 14 * 2.35);
		translate: -50% -58%;
	}

	.lamp .glow {
		position: absolute;
		inset: 8% -12% -8%;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(255, 210, 90, 0.55), transparent 70%);
	}

	.lamp .string {
		position: absolute;
		left: 50%;
		top: 0;
		width: 1px;
		height: 20%;
		translate: -50% 0;
		background: linear-gradient(#f0c45c, rgba(240, 196, 92, 0.2));
	}

	.lamp .paper {
		position: absolute;
		inset: 18% 10% 0;
		transform-origin: 50% 0;
		animation: wiggle 2.4s ease-in-out infinite;
	}

	.lamp .crown,
	.lamp .bulb,
	.lamp .tail {
		position: absolute;
		left: 50%;
		translate: -50% 0;
		display: block;
	}

	.lamp .crown {
		top: 0;
		width: 42%;
		height: 12%;
		border-radius: 1px;
		background: #fff1c4;
		box-shadow: 0 0 4px rgba(255, 241, 196, 0.7);
	}

	.lamp .bulb {
		top: 12%;
		width: 78%;
		height: 58%;
		border-radius: 42% 42% 38% 38%;
		background: radial-gradient(circle at 34% 28%, #fff8e4, #ffbe4a 46%, #e24a3d 88%);
		box-shadow: 0 0 2.4cqh rgba(255, 180, 70, 0.75);
	}

	.lamp .tail {
		top: 72%;
		width: 1px;
		height: 22%;
		background: #e24a3d;
	}

	.lamp .tail::after {
		content: '';
		position: absolute;
		left: 50%;
		bottom: -0.6cqh;
		width: 1.1cqh;
		height: 1.1cqh;
		translate: -50% 0;
		border-radius: 50%;
		background: #e24a3d;
	}

	.scales {
		animation: crawl 1.1s linear infinite;
	}

	@keyframes crawl {
		to {
			stroke-dashoffset: -14;
		}
	}

	@keyframes wiggle {
		0%,
		100% {
			rotate: -8deg;
		}
		50% {
			rotate: 9deg;
		}
	}

	@container (max-width: 220px) {
		.sign {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.festoon b,
		.peg,
		.lamp .paper,
		.scales {
			animation: none;
		}
	}
</style>
