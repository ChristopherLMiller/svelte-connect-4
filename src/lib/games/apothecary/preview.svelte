<script lang="ts">
	import { MARGIN } from './render';
	import { REAGENTS } from './types';

	const uid = $props.id();
	const N = 4;
	const VIAL = 1.07;
	const SIDE = N + MARGIN * 2;
	const RACK = [
		[3, 1, 2, 0],
		[3, 4, 0, 2],
		[1, 6, 3, 0],
		[1, 2, 8, 10]
	];

	/** Glass family per tier, as in the vial shader: tube, round flask, conical, oval, hex. */
	const family = (tier: number) => (tier <= 3 ? 0 : tier <= 6 ? 1 : tier <= 9 ? 2 : tier <= 11 ? 3 : 4);

	type Shape = { glass: string; level: number; label: number; lh: number; top: number; bottom: number };
	const rr = (cx: number, cy: number, hx: number, hy: number, r: number) =>
		`M${cx - hx + r} ${cy - hy} H${cx + hx - r} A${r} ${r} 0 0 1 ${cx + hx} ${cy - hy + r} V${cy + hy - r} A${r} ${r} 0 0 1 ${cx + hx - r} ${cy + hy} H${cx - hx + r} A${r} ${r} 0 0 1 ${cx - hx} ${cy + hy - r} V${cy - hy + r} A${r} ${r} 0 0 1 ${cx - hx + r} ${cy - hy} Z`;
	const circle = (cx: number, cy: number, rx: number, ry = rx) =>
		`M${cx - rx} ${cy} A${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
	const hex = (cx: number, cy: number, r: number) => {
		const R = r / Math.cos(Math.PI / 6);
		return `M${[0, 1, 2, 3, 4, 5].map((k) => `${cx + R * Math.cos((k * Math.PI) / 3)} ${cy + R * Math.sin((k * Math.PI) / 3)}`).join(' L')} Z`;
	};

	const SHAPES: Shape[] = [
		{ glass: rr(0, -0.03, 0.15, 0.34, 0.15) + rr(0, 0.3, 0.18, 0.028, 0.02), level: 0.12, label: -0.1, lh: 0.125, top: 0.328, bottom: -0.37 },
		{ glass: circle(0, -0.13, 0.285) + rr(0, 0.17, 0.085, 0.15, 0.02) + rr(0, 0.31, 0.115, 0.026, 0.02), level: 0, label: -0.15, lh: 0.115, top: 0.336, bottom: -0.415 },
		{
			glass: 'M-0.37 -0.4 Q-0.37 -0.42 -0.33 -0.42 H0.33 Q0.37 -0.42 0.37 -0.4 L0.11 0.06 H-0.11 Z' + rr(0, 0.16, 0.08, 0.14, 0.02) + rr(0, 0.31, 0.11, 0.026, 0.02),
			level: -0.04,
			label: -0.22,
			lh: 0.108,
			top: 0.336,
			bottom: -0.42
		},
		{ glass: circle(0, -0.11, 0.33, 0.277) + rr(0, 0.2, 0.07, 0.12, 0.02) + rr(0, 0.31, 0.1, 0.026, 0.02), level: 0.04, label: -0.13, lh: 0.104, top: 0.336, bottom: -0.39 },
		{ glass: hex(0, -0.1, 0.31) + rr(0, 0.24, 0.06, 0.09, 0.02) + rr(0, 0.32, 0.095, 0.024, 0.02), level: 0.1, label: -0.1, lh: 0.098, top: 0.344, bottom: -0.44 }
	];

	const wells = RACK.flatMap((row, r) =>
		row.map((tier, c) => ({ key: r * N + c, tier, x: MARGIN + c + 0.5, y: MARGIN + r + 0.5, f: family(tier), color: REAGENTS[tier]?.color ?? '#fff' }))
	);
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&display=swap" rel="stylesheet" />
</svelte:head>

<div class="shot" aria-hidden="true">
	<div class="shelf a"></div>
	<div class="shelf b"></div>
	<div class="window"></div>
	<div class="candle"><b></b></div>
	<div class="burner"></div>
	<svg class="rack" viewBox="0 0 {SIDE} {SIDE}">
		<defs>
			<linearGradient id="{uid}-wood" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0" stop-color="#5c3418" />
				<stop offset="0.5" stop-color="#47270f" />
				<stop offset="1" stop-color="#2c170a" />
			</linearGradient>
			<pattern id="{uid}-grain" width={SIDE} height="0.09" patternUnits="userSpaceOnUse">
				<path d="M0 0.03 Q{SIDE / 3} 0.06 {SIDE / 2} 0.025 T{SIDE} 0.04" fill="none" stroke="rgba(20, 8, 2, 0.35)" stroke-width="0.012" />
			</pattern>
			<radialGradient id="{uid}-hole">
				<stop offset="0.2" stop-color="#1c120b" />
				<stop offset="1" stop-color="#090605" />
			</radialGradient>
			<linearGradient id="{uid}-brass" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0" stop-color="#f2c066" />
				<stop offset="0.5" stop-color="#b8843a" />
				<stop offset="1" stop-color="#6a4618" />
			</linearGradient>
			<linearGradient id="{uid}-cyl" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0" stop-color="#000" stop-opacity="0.45" />
				<stop offset="0.4" stop-color="#000" stop-opacity="0" />
				<stop offset="0.7" stop-color="#fff" stop-opacity="0.08" />
				<stop offset="1" stop-color="#000" stop-opacity="0.45" />
			</linearGradient>
			{#each SHAPES as shape, i (i)}
				<clipPath id="{uid}-in{i}"><path d={shape.glass} transform="scale(0.9)" /></clipPath>
			{/each}
		</defs>
		<rect x="0.03" y="0.03" width={SIDE - 0.06} height={SIDE - 0.06} rx="0.24" fill="url(#{uid}-wood)" />
		<rect x="0.03" y="0.03" width={SIDE - 0.06} height={SIDE - 0.06} rx="0.24" fill="url(#{uid}-grain)" />
		<rect x="0.03" y="0.03" width={SIDE - 0.06} height={SIDE - 0.06} rx="0.24" fill="none" stroke="rgba(255, 190, 120, 0.18)" stroke-width="0.02" />
		{#each wells as w (w.key)}
			<circle cx={w.x} cy={w.y} r="0.452" fill="url(#{uid}-hole)" />
			<circle cx={w.x} cy={w.y} r="0.462" fill="none" stroke="url(#{uid}-brass)" stroke-width="0.026" />
		{/each}
		{#each wells as w (`v${w.key}`)}
			{#if w.tier}
				{@const shape = SHAPES[w.f]!}
				{@const label = String(2 ** w.tier)}
				{@const lw = label.length * 0.062 + 0.06}
				<g transform="translate({w.x} {w.y}) scale({VIAL} -{VIAL})">
					{#if w.tier >= 8}
						<path d={shape.glass} fill="none" stroke={w.color} stroke-width="0.06" opacity="0.35" />
					{/if}
					<path d={shape.glass} fill="rgba(180, 205, 215, 0.1)" />
					<g clip-path="url(#{uid}-in{w.f})">
						<rect x="-0.5" y={shape.bottom - 0.05} width="1" height={shape.level - shape.bottom + 0.05} fill={w.color} />
						<rect x="-0.5" y={shape.bottom - 0.05} width="1" height={shape.level - shape.bottom + 0.05} fill="url(#{uid}-cyl)" />
						<rect x="-0.5" y={shape.level - 0.02} width="1" height="0.022" fill="#fff" opacity="0.4" />
					</g>
					<path d={shape.glass} fill="none" stroke="rgba(230, 242, 255, 0.4)" stroke-width="0.016" />
					<path d={shape.glass} fill="none" stroke="rgba(4, 6, 8, 0.6)" stroke-width="0.006" />
					<rect x={w.f === 0 ? -0.1 : -0.17} y={shape.bottom + 0.12} width="0.03" height={shape.top - shape.bottom - 0.28} rx="0.015" fill="#fff" opacity="0.22" />
					{#if w.f <= 2}
						<path d="M-0.08 {shape.top + 0.005} H0.08 L0.07 {shape.top + 0.11} H-0.07 Z" fill="#8c6038" />
					{:else if w.f === 3}
						<rect x="-0.08" y={shape.top - 0.008} width="0.16" height="0.036" rx="0.01" fill="#c08c34" />
						<circle cx="0" cy={shape.top + 0.07} r="0.06" fill="#e8c060" />
					{:else}
						<path d={hex(0, shape.top + 0.08, 0.055)} fill={w.color} />
					{/if}
					<rect x={-lw} y={shape.label - shape.lh * 0.62} width={lw * 2} height={shape.lh * 1.24} rx="0.018" fill={w.tier >= 11 ? '#f6d888' : '#ecdfbc'} />
				</g>
				<text x={w.x} y={w.y - shape.label * VIAL + 0.045} class="tag" class:rare={w.tier >= 11}>{label}</text>
			{/if}
		{/each}
	</svg>
</div>

<style>
	.shot {
		position: relative;
		height: 100%;
		overflow: hidden;
		container-type: size;
		background:
			repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.45) 0 1px, transparent 1px 9%),
			repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.3) 0 1px, transparent 1px 14%),
			radial-gradient(60% 50% at 12% 90%, rgba(255, 140, 60, 0.3), transparent 70%),
			radial-gradient(40% 40% at 88% 70%, rgba(255, 190, 110, 0.22), transparent 70%),
			linear-gradient(180deg, #2a2420, #15110e);
	}

	.shelf {
		position: absolute;
		height: 1.6cqh;
		background: linear-gradient(180deg, #6a4224, #3a2210);
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.5);
	}

	.shelf.a {
		left: 0;
		top: 24%;
		width: 22%;
	}

	.shelf.b {
		right: 0;
		top: 50%;
		width: 20%;
	}

	.shelf.a::before {
		content: '';
		position: absolute;
		left: 18%;
		bottom: 100%;
		width: 50%;
		height: 9cqh;
		background:
			linear-gradient(90deg, transparent 0 4%, #8a2a2a 4% 18%, transparent 18% 40%, #2a4a7a 40% 54%, transparent 54% 74%, #3a7a4a 74% 92%, transparent 92%);
		opacity: 0.75;
	}

	.window {
		position: absolute;
		right: 4%;
		top: 6%;
		width: 16%;
		height: 38%;
		border-radius: 50% 50% 0 0 / 30% 30% 0 0;
		background:
			linear-gradient(90deg, transparent 47%, #1a1210 47% 53%, transparent 53%),
			linear-gradient(0deg, transparent 47%, #1a1210 47% 53%, transparent 53%),
			radial-gradient(circle at 38% 34%, #f4f0e0 0 9%, transparent 11%),
			linear-gradient(180deg, #1a2a6a, #2a3a8a);
		box-shadow: 0 0 0 3px #2a1a12;
		opacity: 0.85;
	}

	.candle {
		position: absolute;
		right: 7%;
		bottom: 12%;
		width: 2.4cqh;
		height: 9cqh;
		background: linear-gradient(90deg, #d8c8a8, #f4ead4 50%, #c8b898);
		border-radius: 2px;
	}

	.candle b {
		position: absolute;
		left: 50%;
		bottom: 100%;
		width: 1.6cqh;
		height: 3cqh;
		translate: -50% 0;
		border-radius: 50% 50% 45% 45% / 70% 70% 30% 30%;
		background: radial-gradient(circle at 50% 70%, #fff8dc, #ffc060 50%, transparent 72%);
		box-shadow: 0 0 12px 4px rgba(255, 180, 80, 0.45);
		animation: lick 1.3s ease-in-out infinite;
	}

	.burner {
		position: absolute;
		left: 10%;
		bottom: 6%;
		width: 6cqh;
		height: 10cqh;
		border-radius: 50% 50% 45% 45% / 70% 70% 30% 30%;
		background: radial-gradient(circle at 50% 75%, #9fd0ff, #3a6cff 40%, #ff9a3c 75%, transparent 80%);
		filter: blur(0.5px);
		animation: lick 1.6s ease-in-out infinite;
	}

	.rack {
		position: absolute;
		left: 50%;
		top: 50%;
		height: 90%;
		aspect-ratio: 1;
		translate: -50% -50%;
		filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.6));
	}

	.tag {
		font-family: Cinzel, Georgia, serif;
		font-weight: 700;
		font-size: 0.14px;
		fill: #2b1a0f;
		text-anchor: middle;
	}

	.tag.rare {
		fill: #731019;
	}

	@keyframes lick {
		50% {
			scale: 0.9 1.1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.burner,
		.candle b {
			animation: none;
		}
	}
</style>
