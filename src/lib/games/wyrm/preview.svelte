<script lang="ts">
	import WyrmIcon from './components/WyrmIcon.svelte';

	const uid = $props.id();
	const PATH = 'M 24,78 L 48,78 L 72,78 L 96,78 L 118,66 L 136,48 L 152,34 L 172,26 L 196,26 L 218,36 L 236,54';
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
	<div class="hud">
		<div class="brand">
			<WyrmIcon size="chip" />
			<div>
				<p>Lantern Wyrm</p>
				<small>night market coil</small>
			</div>
		</div>
		<div class="score">Lanterns <em>12</em></div>
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
			<i class="vine bot"></i>
			<span class="peg a"><b></b></span>
			<span class="peg b"><b></b></span>
			<svg class="board" viewBox="0 0 260 100">
				<defs>
					<linearGradient id="{uid}-silk" x1="0" y1="1" x2="1" y2="0">
						<stop offset="0" stop-color="#fff6d2" />
						<stop offset="0.4" stop-color="#f0c45c" />
						<stop offset="1" stop-color="#e24a3d" />
					</linearGradient>
					<pattern id="{uid}-paper" width="18" height="18" patternUnits="userSpaceOnUse">
						<rect width="18" height="18" fill="rgba(240, 196, 92, 0.05)" />
						<path
							d="M 18 0 L 0 0 0 18"
							fill="none"
							stroke="rgba(240, 196, 92, 0.22)"
							stroke-width="1"
						/>
					</pattern>
				</defs>
				<rect width="260" height="100" fill="url(#{uid}-paper)" />
				<path
					d={PATH}
					fill="none"
					stroke="#140c16"
					stroke-width="18"
					stroke-linecap="round"
					stroke-linejoin="round"
					opacity=".4"
				/>
				<path
					d={PATH}
					fill="none"
					stroke="url(#{uid}-silk)"
					stroke-width="14"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
				<g transform="translate(236 54)">
					<ellipse rx="11" ry="10" fill="#fff1c4" />
					<path d="M 7 0 Q 16 -7 22 -12" fill="none" stroke="#fff1c4" stroke-width="1.3" />
					<path d="M 7 2 Q 16 9 22 13" fill="none" stroke="#fff1c4" stroke-width="1.3" />
					<circle cx="2" cy="-2" r="1.8" fill="#1a1230" />
					<circle cx="6" cy="-2" r="1.8" fill="#1a1230" />
					<path d="M -2 -7 L 2 -15 L 6 -7" fill="#e24a3d" />
				</g>
			</svg>
			<span class="lamp">
				<em></em>
				<b></b>
			</span>
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

	.hud {
		position: relative;
		z-index: 2;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 6px;
		padding: 16% 5% 0;
	}

	.brand,
	.score {
		border: 1px solid rgba(240, 196, 92, 0.22);
		background: rgba(12, 10, 28, 0.62);
		border-radius: 10px;
		padding: 5px 8px;
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
		font-family: Cinzel, Palatino, serif;
		font-size: 0.62rem;
		line-height: 1;
		white-space: nowrap;
	}

	.brand small {
		letter-spacing: 0.08em;
		text-transform: uppercase;
		font-size: 0.38rem;
	}

	.score {
		display: grid;
		place-items: center;
		justify-self: end;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		font-size: 0.38rem;
	}

	.score em {
		font-style: normal;
		font-weight: 700;
		color: #ffd97a;
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
		left: 8%;
		right: 8%;
		top: 30%;
		bottom: 16%;
		z-index: 2;
	}

	.frame {
		position: relative;
		height: 100%;
		padding: 6%;
		box-sizing: border-box;
		border-radius: 12px;
		background:
			linear-gradient(180deg, rgba(240, 196, 92, 0.2), rgba(18, 12, 28, 0.28)),
			rgba(10, 8, 22, 0.94);
		border: 1px solid rgba(240, 196, 92, 0.38);
		box-shadow: inset 0 1px 0 rgba(255, 244, 210, 0.2);
	}

	.vine {
		position: absolute;
		left: 10%;
		right: 10%;
		height: 2px;
		background: linear-gradient(90deg, transparent, #f0c45c 12%, #e24a3d 50%, #f0c45c 88%, transparent);
		opacity: 0.55;
	}

	.vine.top {
		top: 5%;
	}

	.vine.bot {
		bottom: 5%;
	}

	.peg {
		position: absolute;
		top: 1%;
		width: 8px;
	}

	.peg.a {
		left: 12%;
	}

	.peg.b {
		right: 12%;
	}

	.peg b {
		display: block;
		width: 7px;
		height: 9px;
		margin: 4px auto 0;
		border-radius: 40% 40% 36% 36%;
		background: radial-gradient(circle at 35% 30%, #fff4c8, #f0c45c 58%, #e24a3d);
		box-shadow: 0 0 8px #f0c45c;
		animation: wiggle 2.6s ease-in-out infinite;
	}

	.board {
		display: block;
		width: 100%;
		height: 100%;
		border-radius: 8px;
		background:
			radial-gradient(ellipse at 50% 0%, rgba(240, 196, 92, 0.12), transparent 46%),
			linear-gradient(180deg, rgba(40, 28, 52, 0.65), rgba(12, 10, 24, 0.92));
	}

	.lamp {
		position: absolute;
		left: 78%;
		top: 22%;
		width: 18px;
		translate: -50% -50%;
	}

	.lamp em {
		position: absolute;
		inset: -30% -40%;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(255, 190, 74, 0.45), transparent 70%);
	}

	.lamp b {
		display: block;
		width: 10px;
		height: 13px;
		margin: 0 auto;
		border-radius: 40% 40% 36% 36%;
		background: radial-gradient(circle at 35% 28%, #fff4c8, #ffbe4a 55%, #e24a3d);
		box-shadow: 0 0 10px #f0c45c;
		animation: wiggle 2.2s ease-in-out infinite;
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
		.brand small,
		.sign {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.festoon b,
		.peg b,
		.lamp b {
			animation: none;
		}
	}
</style>
