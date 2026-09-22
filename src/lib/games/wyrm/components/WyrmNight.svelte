<script lang="ts">
	let { mood = 'menu' }: { mood?: 'menu' | 'play' | 'dim' | 'won' } = $props();

	const stars = Array.from({ length: 32 }, (_, i) => ({
		id: i,
		x: (i * 37 + 11) % 100,
		y: (i * 17 + 6) % 44,
		s: 0.35 + (i % 6) * 0.16,
		d: (i % 8) * 0.35
	}));

	const skyLanterns = [
		{ id: 'a', x: 6, y: 11, s: 1, d: 0, hue: 'gold', hang: 22 },
		{ id: 'b', x: 16, y: 24, s: 0.72, d: 1.1, hue: 'red', hang: 16 },
		{ id: 'c', x: 28, y: 8, s: 0.58, d: 0.4, hue: 'jade', hang: 28 },
		{ id: 'd', x: 72, y: 10, s: 0.86, d: 0.7, hue: 'rose', hang: 20 },
		{ id: 'e', x: 84, y: 20, s: 1.05, d: 1.6, hue: 'gold', hang: 14 },
		{ id: 'f', x: 93, y: 32, s: 0.62, d: 2, hue: 'red', hang: 18 },
		{ id: 'g', x: 8, y: 58, s: 0.7, d: 0.9, hue: 'rose', hang: 12 },
		{ id: 'h', x: 90, y: 56, s: 0.78, d: 1.4, hue: 'jade', hang: 16 }
	];

	const CORD = 'M0 7 Q 12.5 12.5 25 7 T 50 7 T 75 7 T 100 7';

	function cordY(x: number) {
		const seg = Math.min(3, Math.max(0, Math.floor(x / 25)));
		const t = (x - seg * 25) / 25;
		const dip = 11 * t * (1 - t);
		return seg % 2 === 0 ? 7 + dip : 7 - dip;
	}

	const festoons = Array.from({ length: 13 }, (_, i) => {
		const x = 5 + i * 7.5;
		return {
			id: i,
			hue: (['gold', 'red', 'jade', 'rose'] as const)[i % 4] ?? 'gold',
			x,
			y: (cordY(x) / 14) * 100,
			d: (i % 2) * 1.2
		};
	});

	const motes = Array.from({ length: 16 }, (_, i) => ({
		id: i,
		x: 6 + ((i * 13) % 88),
		d: i * 0.7,
		dur: 11 + (i % 6)
	}));

	const stalls = [
		{
			id: 'west',
			left: -2,
			width: 28,
			lift: 10,
			hue: 'gold',
			sign: 'Tea',
			hangs: [18, 48, 78]
		},
		{
			id: 'mid',
			left: 35,
			width: 32,
			lift: 4,
			hue: 'red',
			sign: 'Silk',
			hangs: [16, 50, 82]
		},
		{
			id: 'east',
			left: 72,
			width: 30,
			lift: 12,
			hue: 'jade',
			sign: 'Lamps',
			hangs: [22, 62]
		}
	];

	const risers = Array.from({ length: 10 }, (_, i) => ({
		id: i,
		x: 10 + i * 9,
		d: i * 0.18,
		hue: (['gold', 'red', 'jade', 'rose'] as const)[i % 4] ?? 'gold'
	}));

</script>

<div class={['night', mood]} aria-hidden="true">
	<div class="scene">
	<div class="sky"></div>
	<div class="stars">
		{#each stars as star (star.id)}
			<i
				class="star"
				style:left="{star.x}%"
				style:top="{star.y}%"
				style:--s={star.s}
				style:--d="{star.d}s"
			></i>
		{/each}
	</div>
	<div class="moon">
		<b></b>
		<i></i>
		<i class="crater a"></i>
		<i class="crater b"></i>
	</div>
	<div class="haze"></div>
	<div class="cord">
		<svg viewBox="0 0 100 14" preserveAspectRatio="none">
			<path d={CORD} fill="none" stroke="rgba(40, 24, 16, 0.55)" stroke-width="1.1" />
			<path d={CORD} fill="none" stroke="rgba(240,196,92,0.7)" stroke-width="0.45" />
		</svg>
		{#each festoons as lamp (lamp.id)}
			<span
				class={['festoon', lamp.hue]}
				style:left="{lamp.x}%"
				style:top="{lamp.y}%"
				style:--d="{lamp.d}s"
			>
				<em></em>
				<b></b>
			</span>
		{/each}
	</div>
	<div class="grain"></div>
	<div class="smoke">
		<i></i>
		<i></i>
		<i></i>
	</div>
	<div class="motes">
		{#each motes as mote (mote.id)}
			<i
				class="mote"
				style:left="{mote.x}%"
				style:--d="{mote.d}s"
				style:--dur="{mote.dur}s"
			></i>
		{/each}
	</div>
	{#each skyLanterns as lamp (lamp.id)}
		<span
			class={['lamp', lamp.hue]}
			style:left="{lamp.x}%"
			style:top="{lamp.y}%"
			style:--s={lamp.s}
			style:--d="{lamp.d}s"
			style:--hang="{lamp.hang}px"
		>
			<em></em>
			<b></b>
			<i></i>
		</span>
	{/each}
	<div class="ridge"></div>
	<div class="stalls">
		{#each stalls as stall (stall.id)}
			<article
				class={['stall', stall.id]}
				style:left="{stall.left}%"
				style:width="{stall.width}%"
				style:--lift="{stall.lift}%"
			>
				<div class="roof"></div>
				<div class="eave"></div>
				<div class="front">
					<span class="sign">{stall.sign}</span>
					<span class="panes">
						<b></b>
						<b></b>
						<b></b>
					</span>
				</div>
				{#each stall.hangs as hang, hi (`${stall.id}-${hi}`)}
					<span class={['hang', stall.hue]} style:left="{hang}%" style:--d="{(hi + 1) * 0.35}s">
						<em></em>
						<b></b>
						<i></i>
					</span>
				{/each}
			</article>
		{/each}
	</div>
	{#if mood === 'won'}
		<div class="risers">
			{#each risers as lamp (lamp.id)}
				<span
					class={['riser', lamp.hue]}
					style:left="{lamp.x}%"
					style:--d="{lamp.d}s"
				>
					<b></b>
				</span>
			{/each}
		</div>
	{/if}
	</div>
</div>

<style>
	.night {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
		z-index: 0;
		contain: layout paint;
		transform: translateZ(0);
	}

	.scene {
		position: absolute;
		inset: 0;
		isolation: isolate;
		transform: translateZ(0);
	}

	.sky,
	.haze,
	.grain,
	.ridge,
	.stars,
	.smoke,
	.motes,
	.stalls,
	.risers {
		position: absolute;
		inset: 0;
	}

	.sky {
		background:
			radial-gradient(1100px 520px at 50% -12%, rgba(240, 196, 92, 0.2), transparent 58%),
			radial-gradient(520px 360px at 88% 8%, rgba(255, 236, 190, 0.14), transparent 46%),
			radial-gradient(700px 420px at 8% 82%, rgba(226, 74, 61, 0.18), transparent 50%),
			radial-gradient(640px 380px at 94% 72%, rgba(90, 180, 150, 0.12), transparent 52%),
			linear-gradient(180deg, #12102c 0%, #0a0e22 46%, #160c1c 100%);
	}

	.star {
		position: absolute;
		width: 3px;
		height: 3px;
		border-radius: 50%;
		background: #fff6d8;
		opacity: 0.45;
		scale: var(--s);
		box-shadow: 0 0 6px rgba(255, 246, 216, 0.7);
		animation: twinkle 3.6s ease-in-out infinite;
		animation-delay: var(--d);
	}

	.moon {
		position: absolute;
		top: 7%;
		right: 9%;
		width: 58px;
		height: 58px;
	}

	.moon b {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		background:
			radial-gradient(circle at 34% 32%, #fff8e4, #f0c45c 62%, #c4892a);
		box-shadow:
			0 0 28px rgba(240, 196, 92, 0.45),
			0 0 80px rgba(240, 196, 92, 0.18);
	}

	.moon > i:first-of-type {
		position: absolute;
		inset: -10px;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(255, 236, 180, 0.2), transparent 68%);
	}

	.crater {
		position: absolute;
		border-radius: 50%;
		background: rgba(180, 130, 50, 0.28);
	}

	.crater.a {
		width: 10px;
		height: 10px;
		left: 34%;
		top: 28%;
	}

	.crater.b {
		width: 6px;
		height: 6px;
		left: 58%;
		top: 52%;
	}

	.haze {
		background:
			radial-gradient(ellipse at 50% 28%, rgba(255, 214, 140, 0.14), transparent 48%),
			radial-gradient(ellipse at 70% 80%, rgba(226, 74, 61, 0.1), transparent 42%);
		mix-blend-mode: screen;
		animation: breathe 8s ease-in-out infinite;
	}

	.won .haze {
		background:
			radial-gradient(ellipse at 50% 38%, rgba(255, 220, 150, 0.28), transparent 48%),
			radial-gradient(ellipse at 50% 80%, rgba(226, 74, 61, 0.18), transparent 46%);
	}

	.dim .haze {
		opacity: 0.45;
		filter: saturate(0.65);
	}

	.cord {
		position: absolute;
		left: -2%;
		width: 104%;
		top: 4%;
		height: 36px;
		overflow: visible;
		pointer-events: none;
	}

	.cord svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		overflow: visible;
	}

	.festoon {
		position: absolute;
		width: 12px;
		translate: -50% 0;
		transform-origin: 50% 0;
		animation: sway 3.4s ease-in-out infinite;
		animation-delay: var(--d);
	}

	.festoon b {
		display: block;
		width: 11px;
		height: 14px;
		border-radius: 40% 40% 36% 36%;
		box-shadow:
			0 0 12px currentColor,
			inset 0 1px 0 rgba(255, 255, 255, 0.55);
	}

	.festoon em {
		display: block;
		width: 1px;
		height: 6px;
		margin: -1px auto 0;
		background: currentColor;
		opacity: 0.65;
	}

	.grain {
		opacity: 0.12;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E");
	}

	.smoke i {
		position: absolute;
		bottom: 18%;
		width: 180px;
		height: 220px;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(255, 230, 180, 0.1), transparent 68%);
		animation: incense 9s ease-in-out infinite;
	}

	.smoke i:nth-child(1) {
		left: 8%;
	}

	.smoke i:nth-child(2) {
		left: 42%;
		animation-delay: -3s;
		width: 220px;
	}

	.smoke i:nth-child(3) {
		right: 6%;
		animation-delay: -5.5s;
	}

	.mote {
		position: absolute;
		bottom: -8%;
		width: 4px;
		height: 6px;
		border-radius: 50%;
		background: #ffd97a;
		opacity: 0;
		animation: lift var(--dur) linear infinite;
		animation-delay: var(--d);
		box-shadow: 0 0 8px #f0c45c;
	}

	.lamp,
	.hang,
	.riser {
		position: absolute;
		translate: -50% 0;
	}

	.lamp {
		width: 18px;
		scale: var(--s);
		animation: drift 6.4s ease-in-out infinite;
		animation-delay: var(--d);
	}

	.lamp em,
	.hang em {
		display: block;
		width: 1px;
		margin: 0 auto;
		background: linear-gradient(#f0c45c, rgba(240, 196, 92, 0.1));
	}

	.lamp em {
		height: var(--hang);
	}

	.lamp b,
	.hang b,
	.riser b,
	.festoon.gold b,
	.lamp.gold b,
	.hang b {
		display: block;
		border-radius: 40% 40% 36% 36%;
		box-shadow:
			0 0 16px currentColor,
			inset 0 1px 0 rgba(255, 255, 255, 0.5);
	}

	.lamp b {
		width: 16px;
		height: 18px;
		margin: 0 auto;
	}

	.lamp i,
	.hang i {
		display: block;
		width: 1px;
		height: 8px;
		margin: 0 auto;
		background: currentColor;
		opacity: 0.7;
	}

	.gold {
		color: #f0c45c;
	}

	.gold b {
		background: radial-gradient(circle at 35% 30%, #fff4c8, #f0c45c 58%, #c4892a);
	}

	.red {
		color: #e24a3d;
	}

	.red b {
		background: radial-gradient(circle at 35% 30%, #ffd0c4, #e24a3d 58%, #8a1820);
	}

	.jade {
		color: #7dffc2;
	}

	.jade b {
		background: radial-gradient(circle at 35% 30%, #e8fff4, #7dffc2 58%, #1f8a68);
	}

	.rose {
		color: #ff9bb8;
	}

	.rose b {
		background: radial-gradient(circle at 35% 30%, #ffe4ee, #ff9bb8 58%, #c45a78);
	}

	.ridge {
		top: auto;
		height: 32%;
		background: linear-gradient(180deg, transparent, rgba(6, 8, 18, 0.78) 42%, #07060f);
	}

	.stalls {
		top: auto;
		height: 30%;
		opacity: 0.85;
	}

	.stall {
		position: absolute;
		bottom: var(--lift);
		height: 86%;
	}

	.roof {
		position: absolute;
		left: -6%;
		right: -6%;
		top: 0;
		height: 34%;
		background:
			linear-gradient(180deg, #5a3040, #2a1420 70%, #140c16);
		clip-path: polygon(0 42%, 8% 0, 92% 0, 100% 42%, 94% 100%, 6% 100%);
		box-shadow: inset 0 1px 0 rgba(240, 196, 92, 0.35);
	}

	.stall.west .roof {
		background: linear-gradient(180deg, #6a4030, #2a1814 70%, #140c12);
	}

	.stall.east .roof {
		background: linear-gradient(180deg, #204838, #10241c 70%, #0c1412);
	}

	.eave {
		position: absolute;
		left: -8%;
		right: -8%;
		top: 28%;
		height: 8px;
		border-radius: 4px;
		background: linear-gradient(180deg, #f0c45c, #c4892a);
		opacity: 0.72;
	}

	.front {
		position: absolute;
		left: 8%;
		right: 8%;
		top: 38%;
		bottom: 0;
		background: linear-gradient(180deg, #1c1424, #0c0a14);
		border: 1px solid rgba(240, 196, 92, 0.16);
		border-top: 0;
	}

	.sign {
		position: absolute;
		left: 50%;
		top: 8%;
		translate: -50% 0;
		padding: 2px 8px;
		border-radius: 4px;
		font-family: Cinzel, Palatino, serif;
		font-size: 0.55rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: #f7ead2;
		background: rgba(226, 74, 61, 0.72);
		white-space: nowrap;
	}

	.panes {
		position: absolute;
		left: 10%;
		right: 10%;
		top: 38%;
		height: 38%;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 6%;
	}

	.panes b {
		display: block;
		border-radius: 2px 2px 0 0;
		background: linear-gradient(180deg, #ffe08a, #e24a3d 80%);
		opacity: 0.72;
		box-shadow: 0 0 12px rgba(240, 196, 92, 0.35);
		animation: pane 4.8s ease-in-out infinite;
	}

	.panes b:nth-child(2) {
		animation-delay: -1.6s;
	}

	.panes b:nth-child(3) {
		animation-delay: -3.2s;
	}

	.hang {
		top: 26%;
		width: 12px;
		animation: sway 3.8s ease-in-out infinite;
		animation-delay: var(--d);
	}

	.hang em {
		height: 14px;
	}

	.hang b {
		width: 11px;
		height: 13px;
		margin: 0 auto;
	}

	.riser {
		bottom: 12%;
		width: 14px;
		animation: rise 2.8s ease-out infinite;
		animation-delay: var(--d);
	}

	.riser b {
		width: 12px;
		height: 16px;
		margin: 0 auto;
	}

	@keyframes breathe {
		50% {
			opacity: 0.7;
		}
	}

	@keyframes twinkle {
		0%,
		100% {
			opacity: 0.25;
		}
		50% {
			opacity: 0.9;
		}
	}

	@keyframes drift {
		0%,
		100% {
			translate: -50% 0;
		}
		50% {
			translate: calc(-50% + 8px) -12px;
		}
	}

	@keyframes sway {
		0%,
		100% {
			rotate: -8deg;
		}
		50% {
			rotate: 8deg;
		}
	}

	@keyframes incense {
		0%,
		100% {
			opacity: 0.35;
			translate: 0 10px;
		}
		50% {
			opacity: 0.7;
			translate: 12px -18px;
		}
	}

	@keyframes lift {
		0% {
			opacity: 0;
			translate: 0 0;
		}
		12% {
			opacity: 0.8;
		}
		100% {
			opacity: 0;
			translate: 18px -110vh;
		}
	}

	@keyframes pane {
		50% {
			opacity: 0.4;
		}
	}

	@keyframes rise {
		0% {
			opacity: 0;
			translate: -50% 40px;
		}
		18% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			translate: -50% -70vh;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.haze,
		.star,
		.lamp,
		.festoon,
		.hang,
		.mote,
		.smoke i,
		.riser,
		.panes b {
			animation: none;
		}

		.mote,
		.riser {
			opacity: 0;
		}
	}
</style>
